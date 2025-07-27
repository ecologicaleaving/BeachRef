import { Request, Response, NextFunction } from 'express';
import { VISAPIError } from '../types/vis.types';

export interface APIError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class ApplicationError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = 'ApplicationError';

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApplicationError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

// Circuit Breaker Implementation
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly monitoringPeriod: number = 10000 // 10 seconds
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        console.log('Circuit breaker moving to HALF_OPEN state');
      } else {
        throw new ApplicationError('Circuit breaker is OPEN - service unavailable', 503);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      console.log(`Circuit breaker OPEN after ${this.failures} failures`);
    }
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Retry Logic with Exponential Backoff
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        break;
      }

      // Don't retry on certain errors
      if (error instanceof VISAPIError && error.statusCode && error.statusCode < 500) {
        break;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      console.log(`Retry attempt ${attempt + 1}/${maxRetries + 1} after ${delay}ms delay`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Error Handler Middleware
export function errorHandler(
  error: Error | APIError | VISAPIError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error caught by middleware:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error response
  let statusCode = 500;
  let message = 'Internal server error';
  let errorCode = 'INTERNAL_ERROR';

  // Handle specific error types
  if (error instanceof VISAPIError) {
    statusCode = 503;
    message = 'VIS API service temporarily unavailable';
    errorCode = 'VIS_API_ERROR';
    
    // Add retry-after header for service unavailable
    res.set('Retry-After', '60');
  } else if (error instanceof ValidationError) {
    statusCode = error.statusCode;
    message = error.message;
    errorCode = 'VALIDATION_ERROR';
  } else if (error instanceof NotFoundError) {
    statusCode = error.statusCode;
    message = error.message;
    errorCode = 'NOT_FOUND_ERROR';
  } else if (error instanceof ApplicationError) {
    statusCode = error.statusCode;
    message = error.message;
    errorCode = 'APPLICATION_ERROR';
  } else if ('statusCode' in error && error.statusCode) {
    statusCode = error.statusCode;
    message = error.message;
  }

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Something went wrong';
  }

  const errorResponse = {
    error: {
      code: errorCode,
      message: message,
      statusCode: statusCode,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown'
    },
    ...(process.env.NODE_ENV === 'development' && {
      debug: {
        stack: error.stack,
        originalError: error.message
      }
    })
  };

  res.status(statusCode).json(errorResponse);
}

// Request ID Middleware
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers['x-request-id'] || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  req.headers['x-request-id'] = requestId as string;
  res.set('X-Request-ID', requestId as string);
  
  next();
}

// Async Error Handler Wrapper
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export const visCircuitBreaker = new CircuitBreaker(5, 60000, 10000);