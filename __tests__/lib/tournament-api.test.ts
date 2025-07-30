import { 
  fetchPaginatedTournaments, 
  fetchCachedTournaments, 
  prefetchAdjacentPages,
  clearTournamentCache
} from '@/lib/tournament-api'
import { PaginatedTournamentResponse } from '@/lib/types'

// Mock fetch globally
global.fetch = jest.fn()

describe('Tournament API Client', () => {
  const mockTournaments = [
    {
      code: 'BRA2025001',
      name: 'Rio de Janeiro Open 2025',
      countryCode: 'BRA',
      startDate: '2025-01-15',
      endDate: '2025-01-21',
      gender: 'Mixed' as const,
      type: 'World Tour'
    }
  ]

  const mockPaginatedResponse: PaginatedTournamentResponse = {
    tournaments: mockTournaments,
    pagination: {
      currentPage: 1,
      totalPages: 5,
      totalTournaments: 89,
      hasNextPage: true,
      hasPrevPage: false,
      limit: 20,
      year: 2025,
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    clearTournamentCache()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPaginatedResponse),
    })
  })

  describe('fetchPaginatedTournaments', () => {
    it('fetches tournaments with default parameters', async () => {
      const result = await fetchPaginatedTournaments()

      expect(fetch).toHaveBeenCalledWith('/api/tournaments', {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'max-age=300',
        },
      })

      expect(result).toEqual(mockPaginatedResponse)
    })

    it('builds correct query parameters for non-default values', async () => {
      await fetchPaginatedTournaments({
        year: 2024,
        page: 2,
        limit: 50,
      })

      expect(fetch).toHaveBeenCalledWith(
        '/api/tournaments?year=2024&page=2&limit=50',
        expect.any(Object)
      )
    })

    it('excludes default parameters from URL for cleaner URLs', async () => {
      await fetchPaginatedTournaments({
        year: 2025, // default
        page: 1,    // default
        limit: 20,  // default
      })

      expect(fetch).toHaveBeenCalledWith(
        '/api/tournaments',
        expect.any(Object)
      )
    })

    it('handles server-side requests with base URL', async () => {
      // Mock server-side environment
      const originalWindow = global.window
      delete (global as any).window

      process.env.NEXTAUTH_URL = 'https://example.com'

      await fetchPaginatedTournaments()

      expect(fetch).toHaveBeenCalledWith(
        'https://example.com/api/tournaments',
        expect.any(Object)
      )

      // Restore
      global.window = originalWindow
      delete process.env.NEXTAUTH_URL
    })

    it('handles legacy response format (Tournament[])', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTournaments),
      })

      const result = await fetchPaginatedTournaments({ year: 2024 })

      expect(result).toEqual({
        tournaments: mockTournaments,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalTournaments: 1,
          hasNextPage: false,
          hasPrevPage: false,
          limit: 1,
          year: 2024,
        },
      })
    })

    it('throws error for failed requests', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ message: 'Database connection failed' }),
      })

      await expect(fetchPaginatedTournaments()).rejects.toThrow(
        'Database connection failed'
      )
    })

    it('handles error response without JSON', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(fetchPaginatedTournaments()).rejects.toThrow(
        'Failed to fetch tournaments: 503 Service Unavailable'
      )
    })
  })

  describe('fetchCachedTournaments', () => {
    it('returns cached data on subsequent calls', async () => {
      // First call - should fetch from API
      const result1 = await fetchCachedTournaments({ year: 2025, page: 1 })
      
      // Second call - should return cached data
      const result2 = await fetchCachedTournaments({ year: 2025, page: 1 })

      expect(result1).toEqual(mockPaginatedResponse)
      expect(result2).toEqual(mockPaginatedResponse)
      
      // API should only be called once
      expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('makes separate API calls for different parameters', async () => {
      await fetchCachedTournaments({ year: 2025, page: 1 })
      await fetchCachedTournaments({ year: 2025, page: 2 })

      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('expires cache after TTL', async () => {
      // Mock time to control cache expiration
      const originalNow = Date.now
      const mockTime = 1000000
      Date.now = jest.fn(() => mockTime)

      // First call
      await fetchCachedTournaments({ year: 2025, page: 1 })

      // Advance time beyond TTL (5 minutes = 300000ms)
      Date.now = jest.fn(() => mockTime + 400000)

      // Second call should hit API again
      await fetchCachedTournaments({ year: 2025, page: 1 })

      expect(fetch).toHaveBeenCalledTimes(2)

      // Restore
      Date.now = originalNow
    })
  })

  describe('prefetchAdjacentPages', () => {
    it('prefetches previous and next pages', async () => {
      // Mock successful responses for prefetch calls
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ...mockPaginatedResponse, pagination: { ...mockPaginatedResponse.pagination, currentPage: 2 } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ...mockPaginatedResponse, pagination: { ...mockPaginatedResponse.pagination, currentPage: 4 } }),
        })

      // Prefetch for page 3 (should fetch pages 2 and 4)
      await prefetchAdjacentPages(2025, 3, 5, 20)

      // Should make 2 API calls for adjacent pages
      expect(fetch).toHaveBeenCalledTimes(2)
      expect(fetch).toHaveBeenCalledWith('/api/tournaments?page=2', expect.any(Object))
      expect(fetch).toHaveBeenCalledWith('/api/tournaments?page=4', expect.any(Object))
    })

    it('only prefetches next page when on first page', async () => {
      await prefetchAdjacentPages(2025, 1, 5, 20)

      expect(fetch).toHaveBeenCalledTimes(1)
      expect(fetch).toHaveBeenCalledWith('/api/tournaments?page=2', expect.any(Object))
    })

    it('only prefetches previous page when on last page', async () => {
      await prefetchAdjacentPages(2025, 5, 5, 20)

      expect(fetch).toHaveBeenCalledTimes(1)
      expect(fetch).toHaveBeenCalledWith('/api/tournaments?page=4', expect.any(Object))
    })

    it('does not prefetch when only one page', async () => {
      await prefetchAdjacentPages(2025, 1, 1, 20)

      expect(fetch).not.toHaveBeenCalled()
    })

    it('silently handles prefetch errors', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      // Should not throw error
      await expect(prefetchAdjacentPages(2025, 2, 5, 20)).resolves.toBeUndefined()
    })
  })

  describe('Cache Management', () => {
    it('clears cache when requested', async () => {
      // Populate cache
      await fetchCachedTournaments({ year: 2025, page: 1 })
      expect(fetch).toHaveBeenCalledTimes(1)

      // Clear cache
      clearTournamentCache()

      // Next call should hit API again
      await fetchCachedTournaments({ year: 2025, page: 1 })
      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error Handling', () => {
    it('provides detailed error messages for HTTP errors', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ message: 'Tournament not found' }),
      })

      await expect(fetchPaginatedTournaments()).rejects.toThrow('Tournament not found')
    })

    it('handles network errors', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('fetch failed'))

      await expect(fetchPaginatedTournaments()).rejects.toThrow('fetch failed')
    })

    it('handles malformed JSON responses', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(fetchPaginatedTournaments()).rejects.toThrow('Invalid JSON')
    })
  })
})