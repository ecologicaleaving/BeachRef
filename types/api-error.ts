/**
 * API Error State Management
 * User-friendly error information when VIS API is unavailable or returns errors
 * All technical errors (HTTP codes, stack traces) transformed into this format
 */

/**
 * User-friendly API error state.
 * All technical errors (HTTP codes, stack traces) transformed into this format.
 */
export interface APIErrorState {
  readonly message: string;           // User-facing error message (always user-friendly)
  readonly isApiError: boolean;       // True if error originated from VIS API
  readonly canRetry: boolean;         // True if retry might succeed
  readonly timestamp: number;         // When error occurred (milliseconds)
  readonly retryAfter?: number;       // Optional: Suggested retry delay (milliseconds)
}

/**
 * Predefined user-friendly error messages.
 */
export const API_ERROR_MESSAGES = {
  VIS_UNAVAILABLE: "The VIS API is currently not available, please retry in few minutes",
  NETWORK_OFFLINE: "You appear to be offline. Please check your connection and try again.",
  REQUEST_TIMEOUT: "The request took too long. Please try again.",
  UNKNOWN: "An error occurred. Please try again later."
} as const;

/**
 * Factory for creating API error states.
 */
export const createApiError = (
  message: string = API_ERROR_MESSAGES.VIS_UNAVAILABLE,
  retryAfter?: number
): APIErrorState => ({
  message,
  isApiError: true,
  canRetry: true,
  timestamp: Date.now(),
  ...(retryAfter !== undefined && { retryAfter })
});

/**
 * Check if error is recent (within last 30 seconds).
 */
export const isRecentError = (error: APIErrorState): boolean => {
  return (Date.now() - error.timestamp) < 30000;
};
