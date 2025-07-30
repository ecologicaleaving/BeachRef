/**
 * @jest-environment jsdom
 */

import { fetchTournamentsFromVIS } from '../../lib/vis-client'
import { VISApiError } from '../../lib/types'

// Mock the constants
jest.mock('../../lib/constants', () => ({
  VIS_API_CONFIG: {
    baseURL: 'https://test.example.com/vis',
    appId: 'test-app-id',
    timeout: 5000,
    maxRetries: 2
  }
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock console methods to avoid noise in tests
const originalConsole = console
beforeAll(() => {
  console.log = jest.fn()
  console.warn = jest.fn()
  console.error = jest.fn()
})

afterAll(() => {
  console.log = originalConsole.log
  console.warn = originalConsole.warn
  console.error = originalConsole.error
})

beforeEach(() => {
  jest.clearAllMocks()
  // Mock setTimeout and clearTimeout to avoid timing issues
  global.setTimeout = jest.fn((fn, delay) => {
    if (delay === 5000) {
      // This is the timeout call, don't execute it
      return 1 as any
    } else {
      // This is a retry delay, execute immediately
      fn()
      return 1 as any
    }
  }) as any
  global.clearTimeout = jest.fn()
})

const mockSuccessfulXMLResponse = `<?xml version="1.0" encoding="utf-8"?>
<VIS>
  <BeachTournament 
    Code="BVB2025-001" 
    Name="World Championships 2025" 
    CountryCode="BR" 
    StartDateMainDraw="2025-05-15" 
    EndDateMainDraw="2025-05-22" 
    Gender="2" 
    Type="World Championship" />
  <BeachTournament 
    Code="BVB2025-002" 
    Name="Elite Cup 2025" 
    CountryCode="US" 
    StartDateMainDraw="2025-03-10" 
    EndDateMainDraw="2025-03-12" 
    Gender="0" 
    Type="Elite Event" />
</VIS>`

const mockEmptyXMLResponse = `<?xml version="1.0" encoding="utf-8"?>
<VIS>
</VIS>`

const mockInvalidXMLResponse = `Not valid XML`

describe('fetchTournamentsFromVIS', () => {
  describe('successful requests', () => {
    test('should return tournaments with correct data structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockSuccessfulXMLResponse
      })

      const result = await fetchTournamentsFromVIS()

      expect(result).toEqual({
        tournaments: [
          {
            code: 'BVB2025-002',
            name: 'Elite Cup 2025',
            countryCode: 'US',
            startDate: '2025-03-10',
            endDate: '2025-03-12',
            gender: 'Men',
            type: 'Elite Event'
          },
          {
            code: 'BVB2025-001',
            name: 'World Championships 2025',
            countryCode: 'BR',
            startDate: '2025-05-15',
            endDate: '2025-05-22',
            gender: 'Mixed',
            type: 'World Championship'
          }
        ],
        totalCount: 2,
        lastUpdated: expect.any(String)
      })
    })

    test('should sort tournaments by start date', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockSuccessfulXMLResponse
      })

      const result = await fetchTournamentsFromVIS()
      
      expect(result.tournaments[0].startDate).toBe('2025-03-10')
      expect(result.tournaments[1].startDate).toBe('2025-05-15')
    })

    test('should handle empty tournament list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockEmptyXMLResponse
      })

      const result = await fetchTournamentsFromVIS()

      expect(result).toEqual({
        tournaments: [],
        totalCount: 0,
        lastUpdated: expect.any(String)
      })
    })

    test('should make correct HTTP request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mockEmptyXMLResponse
      })

      await fetchTournamentsFromVIS()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.example.com/vis',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/xml',
            'X-FIVB-App-ID': 'test-app-id',
            'User-Agent': 'BeachRef-MVP/1.0'
          },
          body: expect.stringContaining('GetBeachTournamentList'),
          signal: expect.any(AbortSignal)
        }
      )
    })
  })

  describe('error handling', () => {
    test('should throw VISApiError for network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      const error = await fetchTournamentsFromVIS().catch(e => e)
      expect(error).toBeInstanceOf(VISApiError)
      expect(error.message).toBe('Network error connecting to VIS API')
    })

    test('should throw VISApiError on all error types', async () => {
      // Test that all errors get converted to VISApiError
      mockFetch.mockRejectedValueOnce(new Error('Some error'))

      const error = await fetchTournamentsFromVIS().catch(e => e)
      expect(error).toBeInstanceOf(VISApiError)
    })
  })

  describe('retry logic', () => {
    let originalSetTimeout: typeof setTimeout

    beforeEach(() => {
      originalSetTimeout = global.setTimeout
      global.setTimeout = jest.fn((fn) => {
        fn() // Execute immediately
        return 1 as any
      }) as any
    })

    afterEach(() => {
      global.setTimeout = originalSetTimeout
    })

    test('should retry on network errors', async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => mockEmptyXMLResponse
        })

      const result = await fetchTournamentsFromVIS()

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(result.tournaments).toEqual([])
    })

    test('should retry on 5xx server errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => mockEmptyXMLResponse
        })

      const result = await fetchTournamentsFromVIS()

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.tournaments).toEqual([])
    })

    test('should not retry on 4xx client errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      await expect(fetchTournamentsFromVIS()).rejects.toThrow(VISApiError)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    test('should implement exponential backoff', async () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout')
      
      mockFetch
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => mockEmptyXMLResponse
        })

      await fetchTournamentsFromVIS()

      expect(mockFetch).toHaveBeenCalledTimes(3)
      
      // Check that setTimeout was called with the correct delays (ignoring timeout calls)
      const retryCalls = setTimeoutSpy.mock.calls.filter(call => call[1] === 1000 || call[1] === 2000)
      expect(retryCalls).toHaveLength(2)
      expect(retryCalls[0][1]).toBe(1000)
      expect(retryCalls[1][1]).toBe(2000)
    })

    test('should fail after max retries', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

      await expect(fetchTournamentsFromVIS()).rejects.toThrow(VISApiError)
      expect(mockFetch).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })
  })

  describe('XML parsing', () => {
    test('should filter out tournaments with missing required fields', async () => {
      const incompleteXML = `<?xml version="1.0" encoding="utf-8"?>
      <VIS>
        <BeachTournament 
          Code="BVB2025-001" 
          Name="Complete Tournament" 
          CountryCode="BR" 
          StartDateMainDraw="2025-05-15" 
          EndDateMainDraw="2025-05-22" 
          Gender="2" 
          Type="World Championship" />
        <BeachTournament 
          Code="BVB2025-002" 
          Name="Incomplete Tournament" 
          CountryCode="US" />
      </VIS>`

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => incompleteXML
      })

      const result = await fetchTournamentsFromVIS()

      expect(result.tournaments).toHaveLength(1)
      expect(result.tournaments[0].code).toBe('BVB2025-001')
    })

    test('should filter out tournaments with invalid gender', async () => {
      const invalidGenderXML = `<?xml version="1.0" encoding="utf-8"?>
      <VIS>
        <BeachTournament 
          Code="BVB2025-001" 
          Name="Valid Tournament" 
          CountryCode="BR" 
          StartDateMainDraw="2025-05-15" 
          EndDateMainDraw="2025-05-22" 
          Gender="2" 
          Type="World Championship" />
        <BeachTournament 
          Code="BVB2025-002" 
          Name="Invalid Gender Tournament" 
          CountryCode="US" 
          StartDateMainDraw="2025-05-15" 
          EndDateMainDraw="2025-05-22" 
          Gender="9" 
          Type="World Championship" />
      </VIS>`

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => invalidGenderXML
      })

      const result = await fetchTournamentsFromVIS()

      expect(result.tournaments).toHaveLength(1)
      expect(result.tournaments[0].gender).toBe('Mixed')
    })

    test('should filter out tournaments with invalid dates', async () => {
      const invalidDateXML = `<?xml version="1.0" encoding="utf-8"?>
      <VIS>
        <BeachTournament 
          Code="BVB2025-001" 
          Name="Valid Tournament" 
          CountryCode="BR" 
          StartDateMainDraw="2025-05-15" 
          EndDateMainDraw="2025-05-22" 
          Gender="2" 
          Type="World Championship" />
        <BeachTournament 
          Code="BVB2025-002" 
          Name="Invalid Date Tournament" 
          CountryCode="US" 
          StartDateMainDraw="invalid-date" 
          EndDateMainDraw="2025-05-22" 
          Gender="0" 
          Type="World Championship" />
      </VIS>`

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => invalidDateXML
      })

      const result = await fetchTournamentsFromVIS()

      expect(result.tournaments).toHaveLength(1)
      expect(result.tournaments[0].code).toBe('BVB2025-001')
    })
  })
})