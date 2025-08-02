/**
 * Enhanced VIS API Error Handling Utilities
 * 
 * This module provides sophisticated error categorization, logging, and fallback
 * mechanisms for VIS API interactions. It resolves the production issue:
 * "Error: Failed to fetch tournament MQUI2025: 401 Unauthorized"
 * 
 * Key Features:
 * - Error categorization for better debugging and monitoring
 * - Proper handling of expected 401 authentication errors
 * - Comprehensive fallback mechanisms
 * - Production-ready error logging with sanitization
 * - Network connectivity detection and retry logic
 */

import { VISApiError } from './types'

export type VISApiErrorType = 'network' | 'authentication' | 'authorization' | 'data' | 'parsing' | 'timeout' | 'unknown'
export type VISApiEndpoint = 'GetBeachTournamentList' | 'GetBeachTournament' | 'GetBeachMatchList' | 'GetBeachMatch' | 'GetBeachTournamentRanking' | 'Unknown'

export interface VISApiErrorCategory {
  type: VISApiErrorType
  endpoint: VISApiEndpoint
  recoverable: boolean
  requiresFallback: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface EnhancedVISApiError extends VISApiError {
  category: VISApiErrorCategory
  context: {
    tournamentCode?: string
    tournamentNumber?: string
    attempt?: number
    originalRequest?: string
    fallbackAttempted?: boolean
    userAgent?: string
    timestamp: string
  }
  sanitizedForLogging: boolean
}

export interface FallbackResult<T> {
  data: T
  fallbackUsed: boolean
  errorEncountered?: EnhancedVISApiError
  dataCompleteness: 'full' | 'partial' | 'minimal'
  source: 'primary' | 'fallback' | 'cache'
}

/**
 * Type guard to check if an error is an EnhancedVISApiError
 */
export function isEnhancedVISApiError(error: unknown): error is EnhancedVISApiError {
  return error instanceof VISApiError && 
         'category' in error && 
         'context' in error && 
         'sanitizedForLogging' in error &&
         error.category !== undefined &&
         error.context !== undefined &&
         typeof error.sanitizedForLogging === 'boolean'
}

/**
 * Categorizes VIS API errors for proper handling and logging
 */
export function categorizeVISApiError(
  error: unknown,
  endpoint: VISApiEndpoint = 'Unknown',
  context: Partial<EnhancedVISApiError['context']> = {}
): EnhancedVISApiError {
  const timestamp = new Date().toISOString()
  
  let category: VISApiErrorCategory
  let enhancedError: EnhancedVISApiError

  if (error instanceof VISApiError) {
    // Categorize based on status code and endpoint
    if (error.statusCode === 401) {
      category = {
        type: 'authentication',
        endpoint,
        recoverable: true,
        requiresFallback: true,
        severity: endpoint === 'GetBeachTournament' ? 'low' : 'high' // 401 on GetBeachTournament is expected
      }
    } else if (error.statusCode === 403) {
      category = {
        type: 'authorization',
        endpoint,
        recoverable: false,
        requiresFallback: true,
        severity: 'medium'
      }
    } else if (error.statusCode === 404) {
      category = {
        type: 'data',
        endpoint,
        recoverable: false,
        requiresFallback: false,
        severity: 'medium'
      }
    } else if (error.statusCode && error.statusCode >= 500) {
      category = {
        type: 'network',
        endpoint,
        recoverable: true,
        requiresFallback: true,
        severity: 'high'
      }
    } else {
      category = {
        type: 'unknown',
        endpoint,
        recoverable: true,
        requiresFallback: true,
        severity: 'medium'
      }
    }

    enhancedError = Object.assign(error, {
      category,
      context: {
        timestamp,
        ...context
      },
      sanitizedForLogging: false
    }) as EnhancedVISApiError

  } else if (error instanceof TypeError && error.message.includes('fetch')) {
    // Network connectivity issues
    category = {
      type: 'network',
      endpoint,
      recoverable: true,
      requiresFallback: true,
      severity: 'high'
    }

    enhancedError = Object.assign(new VISApiError('Network connectivity error', undefined, error), {
      category,
      context: {
        timestamp,
        ...context
      },
      sanitizedForLogging: false
    }) as EnhancedVISApiError

  } else if (error instanceof Error && error.name === 'AbortError') {
    // Request timeout
    category = {
      type: 'timeout',
      endpoint,
      recoverable: true,
      requiresFallback: true,
      severity: 'medium'
    }

    enhancedError = Object.assign(new VISApiError('Request timeout', undefined, error), {
      category,
      context: {
        timestamp,
        ...context
      },
      sanitizedForLogging: false
    }) as EnhancedVISApiError

  } else {
    // Unknown error type
    category = {
      type: 'unknown',
      endpoint,
      recoverable: true,
      requiresFallback: true,
      severity: 'high'
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    enhancedError = Object.assign(new VISApiError(`Unknown error: ${errorMessage}`, undefined, error), {
      category,
      context: {
        timestamp,
        ...context
      },
      sanitizedForLogging: false
    }) as EnhancedVISApiError
  }

  return enhancedError
}

/**
 * Determines if an error is retryable based on its category and context
 * Overloaded to handle both unknown and EnhancedVISApiError types
 */
export function isRetryableError(error: unknown, attempt?: number, maxRetries?: number): boolean
export function isRetryableError(error: EnhancedVISApiError, attempt?: number, maxRetries?: number): boolean
export function isRetryableError(error: unknown | EnhancedVISApiError, attempt: number = 0, maxRetries: number = 3): boolean {
  // Never retry beyond max attempts
  if (attempt >= maxRetries) {
    return false
  }

  // If error is not enhanced, convert it first
  let enhancedError: EnhancedVISApiError
  if (isEnhancedVISApiError(error)) {
    enhancedError = error
  } else {
    enhancedError = categorizeVISApiError(error)
  }

  // Don't retry client errors (4xx) except for timeouts and rate limits
  if (enhancedError.statusCode && enhancedError.statusCode >= 400 && enhancedError.statusCode < 500) {
    if (enhancedError.statusCode === 408 || enhancedError.statusCode === 429) {
      return true // Timeout or rate limit - retryable
    }
    return false // Other 4xx errors are not retryable
  }

  // Retry server errors (5xx) and network issues
  if (enhancedError.category.type === 'network' || enhancedError.category.type === 'timeout') {
    return true
  }

  // Don't retry authentication/authorization errors - they need fallback
  if (enhancedError.category.type === 'authentication' || enhancedError.category.type === 'authorization') {
    return false
  }

  // Don't retry parsing errors - they indicate a fundamental issue
  if (enhancedError.category.type === 'parsing') {
    return false
  }

  // Retry unknown errors cautiously
  return enhancedError.category.type === 'unknown' && attempt < 2
}

/**
 * Determines if an error requires fallback to alternative data source
 */
export function requiresFallback(error: EnhancedVISApiError): boolean {
  return error.category.requiresFallback
}

/**
 * Sanitizes error data for production logging (removes sensitive information)
 */
export function sanitizeErrorForLogging(error: EnhancedVISApiError): EnhancedVISApiError {
  if (error.sanitizedForLogging) {
    return error
  }

  // Create a sanitized copy
  const sanitized = { ...error }
  
  // Remove or mask sensitive data
  if (sanitized.context.originalRequest) {
    // Mask any potential credentials in XML requests
    sanitized.context.originalRequest = sanitized.context.originalRequest
      .replace(/password="[^"]*"/gi, 'password="***"')
      .replace(/token="[^"]*"/gi, 'token="***"')
      .replace(/key="[^"]*"/gi, 'key="***"')
  }

  // Limit error message length for logging
  if (sanitized.message && sanitized.message.length > 500) {
    sanitized.message = sanitized.message.substring(0, 500) + '... (truncated)'
  }

  // Mark as sanitized
  sanitized.sanitizedForLogging = true

  return sanitized
}

/**
 * Calculates exponential backoff delay for retries
 */
export function calculateRetryDelay(attempt: number, baseDelay: number = 1000, maxDelay: number = 10000): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay
  return Math.floor(delay + jitter)
}

/**
 * Creates a standardized fallback result wrapper
 */
export function createFallbackResult<T>(
  data: T,
  fallbackUsed: boolean,
  error?: EnhancedVISApiError,
  dataCompleteness: FallbackResult<T>['dataCompleteness'] = 'full',
  source: FallbackResult<T>['source'] = 'primary'
): FallbackResult<T> {
  return {
    data,
    fallbackUsed,
    errorEncountered: error,
    dataCompleteness,
    source
  }
}

/**
 * Detects network connectivity issues
 */
export async function detectNetworkConnectivity(): Promise<boolean> {
  try {
    // Try to fetch a reliable endpoint with minimal data
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch('https://httpbin.org/get', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store'
    })

    clearTimeout(timeoutId)
    return response.ok
  } catch {
    return false
  }
}

/**
 * Utility to create context for error tracking
 */
export function createErrorContext(
  tournamentCode?: string,
  tournamentNumber?: string,
  attempt?: number,
  originalRequest?: string,
  userAgent?: string
): Partial<EnhancedVISApiError['context']> {
  return {
    tournamentCode,
    tournamentNumber,
    attempt,
    originalRequest,
    userAgent: userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Server-Side'),
    fallbackAttempted: false
  }
}