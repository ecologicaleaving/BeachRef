/**
 * Tests for Enhanced VIS API Error Handling Utilities
 * 
 * Comprehensive test suite covering error categorization, retry logic,
 * fallback mechanisms, and production monitoring integration.
 */

import {
  categorizeVISApiError,
  isRetryableError,
  requiresFallback,
  sanitizeErrorForLogging,
  calculateRetryDelay,
  createFallbackResult,
  createErrorContext,
  detectNetworkConnectivity,
  EnhancedVISApiError,
  VISApiErrorType,
  VISApiEndpoint
} from '@/lib/vis-error-handler'
import { VISApiError } from '@/lib/types'

// Mock fetch for network connectivity tests
global.fetch = jest.fn()

describe('VIS Error Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('categorizeVISApiError', () => {
    it('should categorize 401 authentication errors correctly', () => {
      const originalError = new VISApiError('Unauthorized', 401)
      const enhancedError = categorizeVISApiError(originalError, 'GetBeachTournament', {
        tournamentCode: 'TEST001'
      })

      expect(enhancedError.category.type).toBe('authentication')
      expect(enhancedError.category.endpoint).toBe('GetBeachTournament')
      expect(enhancedError.category.recoverable).toBe(true)
      expect(enhancedError.category.requiresFallback).toBe(true)
      expect(enhancedError.category.severity).toBe('low') // Expected for GetBeachTournament
      expect(enhancedError.context.tournamentCode).toBe('TEST001')
    })

    it('should categorize 404 data errors correctly', () => {
      const originalError = new VISApiError('Not Found', 404)
      const enhancedError = categorizeVISApiError(originalError, 'GetBeachTournamentList')

      expect(enhancedError.category.type).toBe('data')
      expect(enhancedError.category.recoverable).toBe(false)
      expect(enhancedError.category.requiresFallback).toBe(false)
      expect(enhancedError.category.severity).toBe('medium')
    })

    it('should categorize network errors correctly', () => {
      const networkError = new TypeError('fetch failed')
      const enhancedError = categorizeVISApiError(networkError, 'GetBeachTournamentList')

      expect(enhancedError.category.type).toBe('network')
      expect(enhancedError.category.recoverable).toBe(true)
      expect(enhancedError.category.requiresFallback).toBe(true)
      expect(enhancedError.category.severity).toBe('high')
    })

    it('should categorize timeout errors correctly', () => {
      const timeoutError = new Error('AbortError')
      timeoutError.name = 'AbortError'
      const enhancedError = categorizeVISApiError(timeoutError, 'GetBeachTournament')

      expect(enhancedError.category.type).toBe('timeout')
      expect(enhancedError.category.recoverable).toBe(true)
      expect(enhancedError.category.requiresFallback).toBe(true)
      expect(enhancedError.category.severity).toBe('medium')
    })

    it('should categorize 500 server errors correctly', () => {
      const serverError = new VISApiError('Internal Server Error', 500)
      const enhancedError = categorizeVISApiError(serverError, 'GetBeachTournamentList')

      expect(enhancedError.category.type).toBe('network')
      expect(enhancedError.category.recoverable).toBe(true)
      expect(enhancedError.category.requiresFallback).toBe(true)
      expect(enhancedError.category.severity).toBe('high')
    })

    it('should include context information', () => {
      const error = new VISApiError('Test error', 500)
      const context = {
        tournamentCode: 'TEST001',
        tournamentNumber: '12345',
        attempt: 2
      }
      const enhancedError = categorizeVISApiError(error, 'GetBeachTournament', context)

      expect(enhancedError.context.tournamentCode).toBe('TEST001')
      expect(enhancedError.context.tournamentNumber).toBe('12345')
      expect(enhancedError.context.attempt).toBe(2)
      expect(enhancedError.context.timestamp).toBeDefined()
    })
  })

  describe('isRetryableError', () => {
    it('should not retry 401 authentication errors', () => {
      const error = new VISApiError('Unauthorized', 401) as EnhancedVISApiError
      error.category = {
        type: 'authentication',
        endpoint: 'GetBeachTournament',
        recoverable: true,
        requiresFallback: true,
        severity: 'low'
      }
      error.context = { timestamp: new Date().toISOString() }

      expect(isRetryableError(error, 0, 3)).toBe(false)
    })

    it('should not retry beyond max attempts', () => {
      const error = new VISApiError('Server Error', 500) as EnhancedVISApiError
      error.category = {
        type: 'network',
        endpoint: 'GetBeachTournamentList',
        recoverable: true,
        requiresFallback: true,
        severity: 'high'
      }
      error.context = { timestamp: new Date().toISOString() }

      expect(isRetryableError(error, 3, 3)).toBe(false)
    })

    it('should retry network errors within max attempts', () => {
      const error = new VISApiError('Network Error', 500) as EnhancedVISApiError
      error.category = {
        type: 'network',
        endpoint: 'GetBeachTournamentList',
        recoverable: true,
        requiresFallback: true,
        severity: 'high'
      }
      error.context = { timestamp: new Date().toISOString() }

      expect(isRetryableError(error, 1, 3)).toBe(true)
    })

    it('should not retry parsing errors', () => {
      const error = new VISApiError('Parse Error') as EnhancedVISApiError
      error.category = {
        type: 'parsing',
        endpoint: 'GetBeachTournament',
        recoverable: false,
        requiresFallback: false,
        severity: 'high'
      }
      error.context = { timestamp: new Date().toISOString() }

      expect(isRetryableError(error, 0, 3)).toBe(false)
    })
  })

  describe('requiresFallback', () => {
    it('should require fallback for authentication errors', () => {
      const error = {
        category: { requiresFallback: true }
      } as EnhancedVISApiError

      expect(requiresFallback(error)).toBe(true)
    })

    it('should not require fallback for parsing errors', () => {
      const error = {
        category: { requiresFallback: false }
      } as EnhancedVISApiError

      expect(requiresFallback(error)).toBe(false)
    })
  })

  describe('sanitizeErrorForLogging', () => {
    it('should sanitize sensitive data from error context', () => {
      const error = {
        message: 'Test error with sensitive data',
        context: {
          originalRequest: 'password="secret123" token="abc123" key="xyz789"',
          timestamp: '2023-01-01T00:00:00Z'
        },
        sanitizedForLogging: false
      } as EnhancedVISApiError

      const sanitized = sanitizeErrorForLogging(error)

      expect(sanitized.context.originalRequest).toBe('password="***" token="***" key="***"')
      expect(sanitized.sanitizedForLogging).toBe(true)
    })

    it('should truncate long error messages', () => {
      const longMessage = 'A'.repeat(600)
      const error = {
        message: longMessage,
        context: { timestamp: '2023-01-01T00:00:00Z' },
        sanitizedForLogging: false
      } as EnhancedVISApiError

      const sanitized = sanitizeErrorForLogging(error)

      expect(sanitized.message.length).toBeLessThan(550)
      expect(sanitized.message).toContain('... (truncated)')
    })

    it('should not re-sanitize already sanitized errors', () => {
      const error = {
        message: 'Already sanitized',
        context: { timestamp: '2023-01-01T00:00:00Z' },
        sanitizedForLogging: true
      } as EnhancedVISApiError

      const result = sanitizeErrorForLogging(error)

      expect(result).toBe(error) // Should return the same object
    })
  })

  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      expect(calculateRetryDelay(0, 1000, 10000)).toBeGreaterThanOrEqual(1000)
      expect(calculateRetryDelay(0, 1000, 10000)).toBeLessThanOrEqual(1300) // Base + 30% jitter

      expect(calculateRetryDelay(1, 1000, 10000)).toBeGreaterThanOrEqual(2000)
      expect(calculateRetryDelay(1, 1000, 10000)).toBeLessThanOrEqual(2600) // 2000 + 30% jitter
    })

    it('should respect maximum delay', () => {
      const delay = calculateRetryDelay(10, 1000, 5000)
      expect(delay).toBeLessThanOrEqual(6500) // Max delay + 30% jitter
    })

    it('should add jitter to prevent thundering herd', () => {
      const delays = Array.from({ length: 10 }, () => calculateRetryDelay(1, 1000, 10000))
      const uniqueDelays = new Set(delays)
      
      // Should have some variation due to jitter
      expect(uniqueDelays.size).toBeGreaterThan(1)
    })
  })

  describe('createFallbackResult', () => {
    it('should create fallback result with correct structure', () => {
      const data = { tournament: 'test' }
      const error = new VISApiError('Test error') as EnhancedVISApiError
      
      const result = createFallbackResult(data, true, error, 'partial', 'fallback')

      expect(result.data).toBe(data)
      expect(result.fallbackUsed).toBe(true)
      expect(result.errorEncountered).toBe(error)
      expect(result.dataCompleteness).toBe('partial')
      expect(result.source).toBe('fallback')
    })

    it('should create successful result without fallback', () => {
      const data = { tournament: 'test' }
      
      const result = createFallbackResult(data, false)

      expect(result.data).toBe(data)
      expect(result.fallbackUsed).toBe(false)
      expect(result.errorEncountered).toBeUndefined()
      expect(result.dataCompleteness).toBe('full')
      expect(result.source).toBe('primary')
    })
  })

  describe('createErrorContext', () => {
    it('should create error context with provided values', () => {
      const context = createErrorContext('TEST001', '12345', 2, 'request-xml', 'test-agent')

      expect(context.tournamentCode).toBe('TEST001')
      expect(context.tournamentNumber).toBe('12345')
      expect(context.attempt).toBe(2)
      expect(context.originalRequest).toBe('request-xml')
      expect(context.userAgent).toBe('test-agent')
      expect(context.fallbackAttempted).toBe(false)
    })

    it('should handle undefined values gracefully', () => {
      const context = createErrorContext()

      expect(context.tournamentCode).toBeUndefined()
      expect(context.tournamentNumber).toBeUndefined()
      expect(context.attempt).toBeUndefined()
      expect(context.originalRequest).toBeUndefined()
      // In test environment, navigator exists, so it will use navigator.userAgent
      expect(context.userAgent).toBeDefined()
      expect(typeof context.userAgent).toBe('string')
    })
  })

  describe('detectNetworkConnectivity', () => {
    it('should return true when network is available', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true
      })

      const result = await detectNetworkConnectivity()

      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://httpbin.org/get',
        expect.objectContaining({
          method: 'HEAD',
          cache: 'no-store'
        })
      )
    })

    it('should return false when network is unavailable', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const result = await detectNetworkConnectivity()

      expect(result).toBe(false)
    })

    it('should return false when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false
      })

      const result = await detectNetworkConnectivity()

      expect(result).toBe(false)
    })

    it('should handle timeout correctly', async () => {
      // Mock a fetch that takes longer than the timeout
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise((resolve) => setTimeout(resolve, 6000))
      )

      const result = await detectNetworkConnectivity()

      expect(result).toBe(false)
    }, 7000) // Test timeout longer than function timeout
  })
})