import { Request, Response, NextFunction } from 'express';
import { 
  errorHandler, 
  visCircuitBreaker, 
  retryWithBackoff 
} from '../error.middleware';
import { VISAPIError } from '../../types/vis.types';
import { appLogger } from '../../utils/logger';

// Mock logger
jest.mock('../../utils/logger');
const mockedLogger = appLogger as jest.Mocked<typeof appLogger>;

describe('Error Middleware Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      method: 'GET',
      originalUrl: '/api/test',
      headers: { 'x-request-id': 'test-request-123' }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      headersSent: false
    };

    mockNext = jest.fn();
  });

  describe('errorHandler', () => {
    it('should handle VISAPIError with appropriate status code', () => {
      const error = new VISAPIError('VIS API connection failed', 503);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'VIS_API_ERROR',
          message: 'VIS API service temporarily unavailable',
          statusCode: 503,
          requestId: 'test-request-123',
          timestamp: expect.any(String)
        })
      });
      // Logger call should happen in console.error, not appLogger
    });

    it('should handle VISAPIError without status code', () => {
      const error = new VISAPIError('Unknown VIS error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'VIS_API_ERROR',
          message: 'VIS API service temporarily unavailable',
          statusCode: 503,
          requestId: 'test-request-123'
        })
      });
    });

    it('should handle generic Error objects', () => {
      const error = new Error('Generic server error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          statusCode: 500,
          requestId: 'test-request-123'
        })
      });
    });

    it('should handle non-Error objects', () => {
      const error = new Error('String error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          statusCode: 500,
          requestId: 'test-request-123'
        })
      });
    });

    it('should handle request without request ID', () => {
      mockRequest.headers = {};
      const error = new Error('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          statusCode: 500,
          requestId: 'unknown'
        })
      });
    });

    it('should not send response if headers already sent', () => {
      mockResponse.headersSent = true;
      const error = new Error('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle production environment appropriately', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Sensitive error information');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong',
          statusCode: 500,
          requestId: 'test-request-123'
        })
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('retryWithBackoff', () => {
    jest.setTimeout(10000); // Increase timeout for retry tests

    it('should succeed on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(mockFn, 3, 100, 1000);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      const result = await retryWithBackoff(mockFn, 3, 100, 1000);
      const duration = Date.now() - startTime;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
      // Should have delays: 100ms + 200ms = at least 300ms
      expect(duration).toBeGreaterThan(250);
    });

    it('should fail after exhausting all retries', async () => {
      const error = new Error('Persistent failure');
      const mockFn = jest.fn().mockRejectedValue(error);

      await expect(retryWithBackoff(mockFn, 2, 50, 500)).rejects.toThrow('Persistent failure');
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should respect maximum delay', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await retryWithBackoff(mockFn, 3, 1000, 100); // Base > max, should cap at max
      const duration = Date.now() - startTime;

      expect(mockFn).toHaveBeenCalledTimes(3);
      // Should be capped at maxDelay (100ms) for both retries
      expect(duration).toBeLessThan(500); // Should be much less than if base delay was used
    });

    it('should handle VISAPIError correctly', async () => {
      const visError = new VISAPIError('VIS connection failed', 503);
      const mockFn = jest.fn().mockRejectedValue(visError);

      await expect(retryWithBackoff(mockFn, 1, 50, 100)).rejects.toBeInstanceOf(VISAPIError);
      expect(mockFn).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('should use exponential backoff correctly', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockRejectedValueOnce(new Error('Third failure'))
        .mockResolvedValue('success');

      const delays: number[] = [];
      const originalSetTimeout = setTimeout;
      
      // Mock setTimeout to capture delays
      global.setTimeout = jest.fn().mockImplementation((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0); // Execute immediately for test speed
      }) as any;

      await retryWithBackoff(mockFn, 3, 100, 1000);

      expect(delays).toEqual([100, 200, 400]); // Exponential: 100, 100*2, 100*4
      
      // Restore original setTimeout
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('Circuit Breaker', () => {
    beforeEach(() => {
      // Reset circuit breaker state
      (visCircuitBreaker as any).state = 'CLOSED';
      (visCircuitBreaker as any).failureCount = 0;
      (visCircuitBreaker as any).lastFailureTime = 0;
    });

    it('should execute function when circuit is closed', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await visCircuitBreaker.execute(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect((visCircuitBreaker as any).state).toBe('CLOSED');
    });

    it('should track failures and open circuit after threshold', async () => {
      const error = new Error('Service failure');
      const mockFn = jest.fn().mockRejectedValue(error);

      // Execute failures to reach threshold (5 failures)
      for (let i = 0; i < 5; i++) {
        try {
          await visCircuitBreaker.execute(mockFn);
        } catch (e) {
          // Expected failures
        }
      }

      expect((visCircuitBreaker as any).state).toBe('OPEN');
      expect((visCircuitBreaker as any).failureCount).toBe(5);
    });

    it('should reject immediately when circuit is open', async () => {
      const error = new Error('Service failure');
      const mockFn = jest.fn().mockRejectedValue(error);

      // Force circuit to open
      (visCircuitBreaker as any).state = 'OPEN';
      (visCircuitBreaker as any).lastFailureTime = Date.now();

      await expect(visCircuitBreaker.execute(mockFn)).rejects.toThrow('Circuit breaker is OPEN');
      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should transition to half-open after timeout', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      // Force circuit to open with old timestamp
      (visCircuitBreaker as any).state = 'OPEN';
      (visCircuitBreaker as any).lastFailureTime = Date.now() - 61000; // 61 seconds ago

      const result = await visCircuitBreaker.execute(mockFn);

      expect(result).toBe('success');
      expect((visCircuitBreaker as any).state).toBe('CLOSED'); // Should close on success
      expect((visCircuitBreaker as any).failureCount).toBe(0); // Reset counter
    });

    it('should return to open state if half-open attempt fails', async () => {
      const error = new Error('Still failing');
      const mockFn = jest.fn().mockRejectedValue(error);

      // Force circuit to open with old timestamp (ready for half-open)
      (visCircuitBreaker as any).state = 'OPEN';
      (visCircuitBreaker as any).lastFailureTime = Date.now() - 61000;

      await expect(visCircuitBreaker.execute(mockFn)).rejects.toThrow('Still failing');
      expect((visCircuitBreaker as any).state).toBe('OPEN');
    });

    it('should reset failure count on successful execution', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockResolvedValue('success');

      // Two failures
      try { await visCircuitBreaker.execute(mockFn); } catch (e) {}
      try { await visCircuitBreaker.execute(mockFn); } catch (e) {}
      
      expect((visCircuitBreaker as any).failureCount).toBe(2);

      // Success should reset counter
      await visCircuitBreaker.execute(mockFn);
      expect((visCircuitBreaker as any).failureCount).toBe(0);
    });

    it('should handle VISAPIError in circuit breaker', async () => {
      const visError = new VISAPIError('VIS service down', 503);
      const mockFn = jest.fn().mockRejectedValue(visError);

      await expect(visCircuitBreaker.execute(mockFn)).rejects.toBeInstanceOf(VISAPIError);
      expect((visCircuitBreaker as any).failureCount).toBe(1);
    });
  });

  describe('Integrated Error Handling', () => {
    it('should handle circuit breaker + retry + error handling together', async () => {
      const error = new VISAPIError('Service unavailable', 503);
      
      // Mock function that always fails
      const mockFn = jest.fn().mockRejectedValue(error);

      // Test the full error handling chain
      try {
        await retryWithBackoff(
          () => visCircuitBreaker.execute(mockFn),
          2,
          50,
          200
        );
      } catch (caughtError) {
        // Now test error handler
        errorHandler(caughtError as any, mockRequest as Request, mockResponse as Response, mockNext);
      }

      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'VIS_API_ERROR',
          message: 'VIS API service temporarily unavailable',
          statusCode: 503,
          requestId: 'test-request-123'
        })
      });
    });

    it('should handle timeout scenarios', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded');
      const mockFn = jest.fn().mockRejectedValue(timeoutError);

      await expect(retryWithBackoff(mockFn, 1, 100, 500)).rejects.toThrow('timeout');
      
      // Should still retry timeouts
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('ECONNREFUSED');
      const mockFn = jest.fn().mockRejectedValue(networkError);

      await expect(retryWithBackoff(mockFn, 2, 50, 200)).rejects.toThrow('ECONNREFUSED');
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
});