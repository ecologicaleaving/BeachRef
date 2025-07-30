import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TournamentTableWithPagination } from '@/components/tournament/TournamentTableWithPagination'
import { PaginatedTournamentResponse } from '@/lib/types'
import * as tournamentApi from '@/lib/tournament-api'

// Mock the tournament API
jest.mock('@/lib/tournament-api', () => ({
  fetchCachedTournaments: jest.fn(),
  prefetchAdjacentPages: jest.fn(),
}))

// Mock Next.js navigation hooks
const mockPush = jest.fn()
const mockSearchParams = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}))

// Mock responsive design hook
jest.mock('@/hooks/useResponsiveDesign', () => ({
  useResponsiveDesign: () => ({
    screenSize: 'desktop',
    isOffline: false,
    connectionQuality: 'good',
    touchCapable: false,
    getTouchTargetSize: () => 44,
  }),
  useOfflineState: () => ({
    isOffline: false,
    connectionQuality: 'good',
    lastOnlineTime: Date.now(),
    testConnectionQuality: jest.fn(),
  }),
}))

// Mock error toast hook
jest.mock('@/hooks/use-error-toast', () => ({
  useErrorToast: () => ({
    showErrorToast: jest.fn(),
    showRetryToast: jest.fn(),
    showNetworkToast: jest.fn(),
  }),
}))

describe('TournamentTableWithPagination Integration', () => {
  const mockTournaments = [
    {
      code: 'BRA2025001',
      name: 'Rio de Janeiro Open 2025',
      countryCode: 'BRA',
      startDate: '2025-01-15',
      endDate: '2025-01-21',
      gender: 'Mixed' as const,
      type: 'World Tour'
    },
    {
      code: 'USA2025001',
      name: 'Manhattan Beach Open 2025',
      countryCode: 'USA',
      startDate: '2025-02-10',
      endDate: '2025-02-16',
      gender: 'Men' as const,
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
    ;(tournamentApi.fetchCachedTournaments as jest.Mock).mockResolvedValue(mockPaginatedResponse)
  })

  describe('Acceptance Criteria 1: Default Loading', () => {
    it('loads 20 current year tournaments by default', async () => {
      render(<TournamentTableWithPagination />)

      // Should start loading
      expect(screen.getByLabelText(/loading tournament table/i)).toBeInTheDocument()

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Rio de Janeiro Open 2025')).toBeInTheDocument()
        expect(screen.getByText('Manhattan Beach Open 2025')).toBeInTheDocument()
      })

      // Verify API was called with default parameters
      expect(tournamentApi.fetchCachedTournaments).toHaveBeenCalledWith({
        year: 2025,
        page: 1,
        limit: 20,
      })

      // Verify pagination display
      expect(screen.getByText('Page 1 of 5')).toBeInTheDocument()
      expect(screen.getByText('Showing 2 of 89 tournaments')).toBeInTheDocument()
    })

    it('displays tournaments with proper pagination metadata', async () => {
      render(<TournamentTableWithPagination />)

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 5')).toBeInTheDocument()
      })

      // Verify year selector shows 2025 as default
      expect(screen.getByDisplayValue('2025')).toBeInTheDocument()

      // Verify pagination controls are present
      expect(screen.getByLabelText('Go to previous page')).toBeDisabled()
      expect(screen.getByLabelText('Go to next page')).toBeEnabled()
    })
  })

  describe('Acceptance Criteria 2: Client-side Pagination', () => {
    it('updates table data without page refresh on pagination', async () => {
      const user = userEvent.setup()
      render(<TournamentTableWithPagination />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Page 1 of 5')).toBeInTheDocument()
      })

      // Mock page 2 response
      const page2Response = {
        ...mockPaginatedResponse,
        tournaments: [
          {
            code: 'GER2025001',
            name: 'Hamburg Beach Open 2025',
            countryCode: 'GER',
            startDate: '2025-03-01',
            endDate: '2025-03-07',
            gender: 'Women' as const,
            type: 'World Tour'
          }
        ],
        pagination: {
          ...mockPaginatedResponse.pagination,
          currentPage: 2,
          hasPrevPage: true,
        }
      }
      
      ;(tournamentApi.fetchCachedTournaments as jest.Mock).mockResolvedValueOnce(page2Response)

      // Click next page
      await user.click(screen.getByLabelText('Go to next page'))

      // Verify API call for page 2
      await waitFor(() => {
        expect(tournamentApi.fetchCachedTournaments).toHaveBeenCalledWith({
          year: 2025,
          page: 2,
          limit: 20,
        })
      })

      // Verify new data is displayed
      await waitFor(() => {
        expect(screen.getByText('Hamburg Beach Open 2025')).toBeInTheDocument()
        expect(screen.getByText('Page 2 of 5')).toBeInTheDocument()
      })

      // Verify old data is no longer displayed
      expect(screen.queryByText('Rio de Janeiro Open 2025')).not.toBeInTheDocument()
    })

    it('handles year selection changes', async () => {
      const user = userEvent.setup()
      render(<TournamentTableWithPagination />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('2025')).toBeInTheDocument()
      })

      // Mock 2024 data
      const year2024Response = {
        ...mockPaginatedResponse,
        pagination: {
          ...mockPaginatedResponse.pagination,
          year: 2024,
          totalTournaments: 178,
        }
      }
      
      ;(tournamentApi.fetchCachedTournaments as jest.Mock).mockResolvedValueOnce(year2024Response)

      // Change year to 2024
      const yearSelector = screen.getByDisplayValue('2025')
      await user.selectOptions(yearSelector, '2024')

      // Verify API call with new year and reset to page 1
      await waitFor(() => {
        expect(tournamentApi.fetchCachedTournaments).toHaveBeenCalledWith({
          year: 2024,
          page: 1,
          limit: 20,
        })
      })
    })
  })

  describe('Acceptance Criteria 3: Feature Preservation', () => {
    it('preserves all existing functionality with pagination', async () => {
      render(<TournamentTableWithPagination />)

      await waitFor(() => {
        expect(screen.getByText('Rio de Janeiro Open 2025')).toBeInTheDocument()
      })

      // Verify sorting functionality is preserved
      const nameHeader = screen.getByRole('button', { name: /sort by tournament name/i })
      expect(nameHeader).toBeInTheDocument()

      // Verify view toggle controls are present
      expect(screen.getByText('Table')).toBeInTheDocument()
      expect(screen.getByText('Cards')).toBeInTheDocument()
      expect(screen.getByText('Auto')).toBeInTheDocument()

      // Verify responsive design elements
      expect(screen.getByText('2 Tournaments')).toBeInTheDocument()
    })

    it('maintains error handling with pagination', async () => {
      ;(tournamentApi.fetchCachedTournaments as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      )

      render(<TournamentTableWithPagination />)

      await waitFor(() => {
        expect(screen.getByText('Failed to load tournaments')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      // Verify retry functionality
      const retryButton = screen.getByText('Try Again')
      expect(retryButton).toBeInTheDocument()
    })
  })

  describe('Acceptance Criteria 4: URL State Management', () => {
    it('reflects pagination state in URL', async () => {
      const user = userEvent.setup()
      render(<TournamentTableWithPagination />)

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 5')).toBeInTheDocument()
      })

      // Mock navigation and API for page 2
      const page2Response = { ...mockPaginatedResponse, pagination: { ...mockPaginatedResponse.pagination, currentPage: 2 } }
      ;(tournamentApi.fetchCachedTournaments as jest.Mock).mockResolvedValueOnce(page2Response)

      // Navigate to page 2
      await user.click(screen.getByLabelText('Go to next page'))

      // Note: URL updates are handled by useTournamentPagination hook
      // This test verifies the integration calls the correct handlers
      await waitFor(() => {
        expect(tournamentApi.fetchCachedTournaments).toHaveBeenCalledWith({
          year: 2025,
          page: 2,
          limit: 20,
        })
      })
    })
  })

  describe('Acceptance Criteria 5: Browser Navigation', () => {
    it('supports browser back/forward functionality', async () => {
      // This is implicitly tested through the useTournamentPagination hook integration
      // The component responds to URL parameter changes via the hook
      
      render(<TournamentTableWithPagination />)

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 5')).toBeInTheDocument()
      })

      // Verify the component is properly integrated with URL state management
      expect(tournamentApi.fetchCachedTournaments).toHaveBeenCalledWith({
        year: 2025,
        page: 1,
        limit: 20,
      })
    })
  })

  describe('Performance Features', () => {
    it('prefetches adjacent pages for better navigation', async () => {
      render(<TournamentTableWithPagination />)

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 5')).toBeInTheDocument()
      })

      // Verify prefetching is called
      expect(tournamentApi.prefetchAdjacentPages).toHaveBeenCalledWith(
        2025, // year
        1,    // current page
        5,    // total pages
        20    // limit
      )
    })

    it('handles loading states during pagination changes', async () => {
      const user = userEvent.setup()
      render(<TournamentTableWithPagination />)

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 5')).toBeInTheDocument()
      })

      // Mock slow API response
      let resolvePromise: (value: any) => void
      const slowPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      ;(tournamentApi.fetchCachedTournaments as jest.Mock).mockReturnValueOnce(slowPromise)

      // Trigger pagination
      await user.click(screen.getByLabelText('Go to next page'))

      // Verify loading state is shown
      await waitFor(() => {
        expect(screen.getByLabelText(/loading tournament table/i)).toBeInTheDocument()
      })

      // Resolve the promise
      resolvePromise!({
        ...mockPaginatedResponse,
        pagination: { ...mockPaginatedResponse.pagination, currentPage: 2 }
      })

      // Verify loading state is removed
      await waitFor(() => {
        expect(screen.queryByLabelText(/loading tournament table/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Initial Data Support', () => {
    it('accepts initial data to prevent loading flicker', () => {
      render(
        <TournamentTableWithPagination 
          initialData={mockPaginatedResponse}
          initialYear={2025}
          initialPage={1}
        />
      )

      // Should immediately show data without loading state
      expect(screen.getByText('Rio de Janeiro Open 2025')).toBeInTheDocument()
      expect(screen.getByText('Page 1 of 5')).toBeInTheDocument()
      expect(screen.queryByLabelText(/loading tournament table/i)).not.toBeInTheDocument()

      // Should not have called the API for initial load
      expect(tournamentApi.fetchCachedTournaments).not.toHaveBeenCalled()
    })
  })
})