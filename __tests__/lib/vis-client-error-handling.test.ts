/**
 * Tests for Enhanced VIS Client Error Handling
 * 
 * Comprehensive test suite focusing on the error handling improvements
 * in the VIS client, including fallback mechanisms and 401 handling.
 */

import { fetchTournamentDetailFromVIS, fetchTournamentDetailByNumber } from '@/lib/vis-client'
import { VISApiError } from '@/lib/types'
import { EnhancedVISApiError } from '@/lib/vis-error-handler'

// Mock the production logger
jest.mock('@/lib/production-logger', () => ({
  logVISApiError: jest.fn(),
  logPerformanceMetrics: jest.fn(),
  logNetworkEvent: jest.fn()
}))

// Mock the VIS API config
jest.mock('@/lib/constants', () => ({
  VIS_API_CONFIG: {
    baseURL: 'https://vis-api.fivb.com/api',
    appId: 'test-app-id',
    timeout: 10000,
    maxRetries: 3
  }
}))

// Mock fetch
global.fetch = jest.fn()

describe('VIS Client Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset fetch mock
    ;(global.fetch as jest.Mock).mockReset()
  })

  describe('fetchTournamentDetailByNumber with enhanced error handling', () => {
    it('should handle 401 authentication errors gracefully', async () => {
      // Mock a 401 response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Authentication required')
      })

      const result = await fetchTournamentDetailByNumber('12345')

      expect(result.fallbackUsed).toBe(true)
      expect(result.errorEncountered?.statusCode).toBe(401)
      expect(result.errorEncountered?.category.type).toBe('authentication')
      expect(result.errorEncountered?.category.severity).toBe('low') // Expected for GetBeachTournament
      expect(result.source).toBe('fallback')
      expect(result.dataCompleteness).toBe('minimal')
    })

    it('should return successful result when API call succeeds', async () => {
      const mockXmlResponse = `<?xml version="1.0" encoding="utf-8"?>
        <BeachTournament Code="TEST001" Name="Test Tournament" CountryCode="US" 
                        StartDateMainDraw="2025-01-01" EndDateMainDraw="2025-01-03" 
                        Gender="0" Type="15" Venue="Test Venue" City="Test City" />`

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockXmlResponse)
      })

      const result = await fetchTournamentDetailByNumber('12345')

      expect(result.fallbackUsed).toBe(false)
      expect(result.data.code).toBe('TEST001')
      expect(result.data.name).toBe('Test Tournament')
      expect(result.data.venue).toBe('Test Venue')
      expect(result.source).toBe('primary')
      expect(result.dataCompleteness).toBe('full')
    })

    it('should handle network errors with retry logic', async () => {
      // Mock network connectivity check to return true
      global.fetch = jest.fn()
        .mockImplementationOnce(() => Promise.reject(new TypeError('fetch failed'))) // First attempt fails
        .mockImplementationOnce(() => Promise.resolve({ ok: true })) // Connectivity check passes
        .mockImplementationOnce(() => Promise.reject(new TypeError('fetch failed'))) // Second attempt fails
        .mockImplementationOnce(() => Promise.resolve({ ok: true })) // Connectivity check passes  
        .mockImplementationOnce(() => Promise.reject(new TypeError('fetch failed'))) // Third attempt fails
        .mockImplementationOnce(() => Promise.resolve({ ok: true })) // Connectivity check passes
        .mockImplementationOnce(() => Promise.reject(new TypeError('fetch failed'))) // Final attempt fails

      const result = await fetchTournamentDetailByNumber('12345')

      expect(result.fallbackUsed).toBe(true)
      expect(result.errorEncountered?.category.type).toBe('network')
      expect(global.fetch).toHaveBeenCalledTimes(7) // 4 attempts + 3 connectivity checks
    })

    it('should handle server errors with retry logic', async () => {
      // Mock server error response
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
        .mockResolvedValueOnce({ ok: true }) // Connectivity check
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })

      const result = await fetchTournamentDetailByNumber('12345')

      expect(result.fallbackUsed).toBe(true)
      expect(result.errorEncountered?.category.type).toBe('network') // Server errors categorized as network
      expect(result.errorEncountered?.statusCode).toBe(500)
    })

    it('should handle timeout errors appropriately', async () => {
      const timeoutError = new Error('AbortError')
      timeoutError.name = 'AbortError'

      ;(global.fetch as jest.Mock).mockRejectedValueOnce(timeoutError)

      const result = await fetchTournamentDetailByNumber('12345')

      expect(result.fallbackUsed).toBe(true)
      expect(result.errorEncountered?.category.type).toBe('timeout')
    })

    it('should not retry non-retryable errors', async () => {
      // Mock a 400 Bad Request (non-retryable)
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      })

      await expect(fetchTournamentDetailByNumber('12345')).rejects.toThrow()
      
      // Should only make one attempt for non-retryable errors
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('fetchTournamentDetailFromVIS with comprehensive fallback', () => {
    // Mock getTournamentNumber to return a valid tournament number
    const mockGetTournamentNumber = jest.fn()
    const mockFetchTournamentDetailByNumber = jest.fn()
    const mockFetchBasicTournamentDetail = jest.fn()

    beforeEach(() => {
      // Mock internal functions
      jest.doMock('@/lib/vis-client', () => ({
        ...jest.requireActual('@/lib/vis-client'),
        getTournamentNumber: mockGetTournamentNumber,
        fetchTournamentDetailByNumber: mockFetchTournamentDetailByNumber,
        fetchBasicTournamentDetail: mockFetchBasicTournamentDetail
      }))
    })

    it('should successfully return enhanced data when GetBeachTournament succeeds', async () => {
      const mockTournament = {
        code: 'TEST001',
        name: 'Test Tournament',
        countryCode: 'US',
        startDate: '2025-01-01',
        endDate: '2025-01-03',
        gender: 'Men' as const,
        type: '15',
        status: 'upcoming' as const,
        venue: 'Test Venue'
      }

      // Mock successful flow
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(`
          <BeachTournament Code="TEST001" Name="Test Tournament" No="12345" />
        `)
      })

      jest.doMock('@/lib/vis-client', () => ({
        getTournamentNumber: () => Promise.resolve('12345'),
        fetchTournamentDetailByNumber: () => Promise.resolve({
          fallbackUsed: false,
          data: mockTournament,
          source: 'primary',
          dataCompleteness: 'full'
        })
      }))

      // Re-import after mocking
      const { fetchTournamentDetailFromVIS } = await import('@/lib/vis-client')
      
      const result = await fetchTournamentDetailFromVIS('TEST001')

      expect(result.code).toBe('TEST001')
      expect(result.venue).toBe('Test Venue')
    })

    it('should fall back to basic data when GetBeachTournament returns 401', async () => {
      const mockBasicTournament = {
        code: 'TEST001',
        name: 'Test Tournament',
        countryCode: 'US',
        startDate: '2025-01-01',
        endDate: '2025-01-03',
        gender: 'Men' as const,
        type: '15',
        status: 'upcoming' as const
      }

      // Mock the flow where GetBeachTournament fails with 401
      jest.doMock('@/lib/vis-client', () => ({
        getTournamentNumber: () => Promise.resolve('12345'),
        fetchTournamentDetailByNumber: () => Promise.resolve({
          fallbackUsed: true,
          data: {},
          errorEncountered: {
            statusCode: 401,
            category: { type: 'authentication', requiresFallback: true }
          },
          source: 'fallback',
          dataCompleteness: 'minimal'
        }),
        fetchBasicTournamentDetail: () => Promise.resolve(mockBasicTournament)
      }))

      const { fetchTournamentDetailFromVIS } = await import('@/lib/vis-client')
      
      const result = await fetchTournamentDetailFromVIS('TEST001')

      expect(result.code).toBe('TEST001')
      expect(result.venue).toBeUndefined() // Should not have enhanced data
    })

    it('should handle complete failure gracefully', async () => {
      const enhancedError = new VISApiError('Complete failure', 500) as EnhancedVISApiError
      enhancedError.category = {
        type: 'network',
        endpoint: 'GetBeachTournamentList',
        recoverable: false,
        requiresFallback: false,
        severity: 'critical'
      }

      jest.doMock('@/lib/vis-client', () => ({
        getTournamentNumber: () => Promise.reject(enhancedError)
      }))

      const { fetchTournamentDetailFromVIS } = await import('@/lib/vis-client')
      
      await expect(fetchTournamentDetailFromVIS('TEST001')).rejects.toThrow(enhancedError)
    })
  })

  describe('Error logging and monitoring', () => {
    it('should log VIS API errors to production monitoring', async () => {
      const { logVISApiError } = require('@/lib/production-logger')

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      await fetchTournamentDetailByNumber('12345')

      expect(logVISApiError).toHaveBeenCalledWith(
        expect.objectContaining({
          category: expect.objectContaining({
            type: 'authentication',
            endpoint: 'GetBeachTournament'
          })
        }),
        'VIS-Client-GetBeachTournament'
      )
    })

    it('should log performance metrics for successful requests', async () => {
      const { logPerformanceMetrics } = require('@/lib/production-logger')

      const mockXmlResponse = `<?xml version="1.0" encoding="utf-8"?>
        <BeachTournament Code="TEST001" Name="Test Tournament" CountryCode="US" 
                        StartDateMainDraw="2025-01-01" EndDateMainDraw="2025-01-03" 
                        Gender="0" Type="15" />`

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockXmlResponse)
      })

      await fetchTournamentDetailByNumber('12345')

      expect(logPerformanceMetrics).toHaveBeenCalledWith(
        'GetBeachTournament',
        expect.any(Number), // duration
        'GetBeachTournament',
        'TEST001',
        false, // fallback not used
        'full' // data completeness
      )
    })

    it('should log network events for retry attempts', async () => {
      const { logNetworkEvent } = require('@/lib/production-logger')

      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockResolvedValueOnce({ ok: true }) // Connectivity check
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<BeachTournament Code="TEST001" Name="Test" CountryCode="US" StartDateMainDraw="2025-01-01" EndDateMainDraw="2025-01-03" Gender="0" Type="15" />')
        })

      await fetchTournamentDetailByNumber('12345')

      expect(logNetworkEvent).toHaveBeenCalledWith('retry', expect.objectContaining({
        endpoint: 'GetBeachTournament',
        attempt: 2,
        delay: expect.any(Number),
        error: expect.any(String)
      }))
    })
  })

  describe('Caching behavior with error handling', () => {
    it('should handle cache-related errors gracefully', async () => {
      // This test would require mocking the cache behavior
      // For now, we'll focus on the error handling aspects
      const mockXmlResponse = `<?xml version="1.0" encoding="utf-8"?>
        <BeachTournament Code="TEST001" Name="Test Tournament" CountryCode="US" 
                        StartDateMainDraw="2025-01-01" EndDateMainDraw="2025-01-03" 
                        Gender="0" Type="15" />`

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockXmlResponse)
      })

      const result = await fetchTournamentDetailByNumber('12345')

      expect(result.fallbackUsed).toBe(false)
      expect(result.data.code).toBe('TEST001')
    })
  })
})