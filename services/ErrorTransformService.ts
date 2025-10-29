/**
 * Error Transform Service
 * Transforms technical API errors into user-friendly messages
 * Integrates with fetch API for centralized error handling
 */

import { APIErrorState, API_ERROR_MESSAGES, createApiError } from '../types';

/**
 * Fetch-like error interface for compatibility
 */
interface FetchError extends Error {
  code?: string;
  response?: {
    status: number;
    statusText: string;
  };
}

/**
 * HTTP status code ranges for error categorization
 */
const HTTP_STATUS = {
  CLIENT_ERROR_START: 400,
  CLIENT_ERROR_END: 499,
  SERVER_ERROR_START: 500,
  SERVER_ERROR_END: 599,
  TIMEOUT: 408,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Network error codes from Axios/fetch
 */
const NETWORK_ERROR_CODES = ['ECONNABORTED', 'ENOTFOUND', 'ENETUNREACH', 'ETIMEDOUT'] as const;

/**
 * Error Transform Service
 * Singleton service for transforming technical errors into user-friendly messages
 */
export class ErrorTransformService {
  private static instance: ErrorTransformService;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ErrorTransformService {
    if (!ErrorTransformService.instance) {
      ErrorTransformService.instance = new ErrorTransformService();
    }
    return ErrorTransformService.instance;
  }

  /**
   * Transform any error into user-friendly APIErrorState
   * @param error - Error from API call (FetchError, Error, or unknown)
   * @returns User-friendly error state
   */
  public transformError(error: unknown): APIErrorState {
    // Handle fetch errors
    if (this.isFetchError(error)) {
      return this.transformFetchError(error);
    }

    // Handle generic Error objects
    if (error instanceof Error) {
      return this.transformGenericError(error);
    }

    // Handle unknown error types
    return createApiError(API_ERROR_MESSAGES.UNKNOWN);
  }

  /**
   * Transform fetch-specific errors
   */
  private transformFetchError(error: FetchError): APIErrorState {
    // No response - network error
    if (!error.response) {
      return this.transformNetworkError(error);
    }

    const statusCode = error.response.status;

    // Timeout errors
    if (statusCode === HTTP_STATUS.TIMEOUT || error.code === 'ECONNABORTED') {
      return createApiError(API_ERROR_MESSAGES.REQUEST_TIMEOUT, 5000);
    }

    // Service unavailable (VIS API down)
    if (statusCode === HTTP_STATUS.SERVICE_UNAVAILABLE) {
      return createApiError(API_ERROR_MESSAGES.VIS_UNAVAILABLE, 60000);
    }

    // Server errors (5xx)
    if (statusCode >= HTTP_STATUS.SERVER_ERROR_START && statusCode <= HTTP_STATUS.SERVER_ERROR_END) {
      return createApiError(API_ERROR_MESSAGES.VIS_UNAVAILABLE, 30000);
    }

    // Client errors (4xx) - treat as API unavailable
    if (statusCode >= HTTP_STATUS.CLIENT_ERROR_START && statusCode <= HTTP_STATUS.CLIENT_ERROR_END) {
      return createApiError(API_ERROR_MESSAGES.VIS_UNAVAILABLE, 10000);
    }

    // Default for unhandled status codes
    return createApiError(API_ERROR_MESSAGES.UNKNOWN);
  }

  /**
   * Transform network-related errors (no response from server)
   */
  private transformNetworkError(error: FetchError): APIErrorState {
    const errorCode = error.code;

    // Check if error code indicates network issue
    if (errorCode && NETWORK_ERROR_CODES.includes(errorCode as typeof NETWORK_ERROR_CODES[number])) {
      return createApiError(API_ERROR_MESSAGES.NETWORK_OFFLINE, 5000);
    }

    // Timeout without response
    if (errorCode === 'ECONNABORTED') {
      return createApiError(API_ERROR_MESSAGES.REQUEST_TIMEOUT, 5000);
    }

    // Generic network error
    return createApiError(API_ERROR_MESSAGES.NETWORK_OFFLINE, 10000);
  }

  /**
   * Transform generic Error objects
   */
  private transformGenericError(error: Error): APIErrorState {
    // Check error message for network-related keywords
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('offline') || message.includes('connection')) {
      return createApiError(API_ERROR_MESSAGES.NETWORK_OFFLINE, 5000);
    }

    if (message.includes('timeout')) {
      return createApiError(API_ERROR_MESSAGES.REQUEST_TIMEOUT, 5000);
    }

    // Default to unknown error
    return createApiError(API_ERROR_MESSAGES.UNKNOWN);
  }

  /**
   * Type guard for FetchError
   */
  private isFetchError(error: unknown): error is FetchError {
    return (
      typeof error === 'object' &&
      error !== null &&
      error instanceof Error &&
      ('response' in error || 'code' in error)
    );
  }

  /**
   * Check if error should trigger immediate retry
   * @param error - APIErrorState to check
   * @returns True if retry is recommended
   */
  public shouldRetry(error: APIErrorState): boolean {
    return error.canRetry && (error.retryAfter ?? 0) < 30000;
  }

  /**
   * Get retry delay in milliseconds
   * @param error - APIErrorState to check
   * @returns Milliseconds to wait before retry, or null if no retry
   */
  public getRetryDelay(error: APIErrorState): number | null {
    if (!error.canRetry) {
      return null;
    }
    return error.retryAfter ?? 5000;
  }
}

/**
 * Singleton export for convenience
 */
export const errorTransformService = ErrorTransformService.getInstance();
