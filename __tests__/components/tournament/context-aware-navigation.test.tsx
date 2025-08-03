/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import TournamentDetailTabs from '@/components/tournament/TournamentDetailTabs'
import { TournamentDetail } from '@/lib/types'

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}))

// Mock the tab performance monitor
jest.mock('@/utils/tabPerformanceMonitoring', () => ({
  tabPerformanceMonitor: {
    startTabSwitch: jest.fn(),
    endTabSwitch: jest.fn().mockReturnValue(100),
    trackTabSwitch: jest.fn(),
    startContentLoad: jest.fn(),
    recordError: jest.fn(),
  }
}))

// Mock the child tab components
jest.mock('@/components/tournament/TournamentOverviewTab', () => {
  return function MockTournamentOverviewTab() {
    return <div data-testid="overview-tab">Overview Content</div>
  }
})

jest.mock('@/components/tournament/TournamentScheduleTab', () => {
  return function MockTournamentScheduleTab() {
    return <div data-testid="schedule-tab">Schedule Content</div>
  }
})

jest.mock('@/components/tournament/TournamentResultsTab', () => {
  return function MockTournamentResultsTab() {
    return <div data-testid="results-tab">Results Content</div>
  }
})

jest.mock('@/components/tournament/TabErrorBoundary', () => {
  return function MockTabErrorBoundary({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>
  }
})

describe('TournamentDetailTabs - Context-Aware Navigation', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
  }

  const mockSearchParams = {
    get: jest.fn(),
    toString: jest.fn().mockReturnValue(''),
  }

  const mockTournament: TournamentDetail = {
    code: 'BEACH2025',
    name: 'Test Beach Tournament',
    countryCode: 'US',
    startDate: '2025-12-01',
    endDate: '2025-12-07',
    gender: 'Mixed',
    type: 'International',
    status: 'upcoming'
  }

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
    ;(usePathname as jest.Mock).mockReturnValue('/tournament/BEACH2025')
    
    mockRouter.push.mockClear()
    mockRouter.replace.mockClear()
    mockSearchParams.get.mockClear()
    
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn().mockReturnValue(null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    }
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    })
  })

  describe('smart default tab selection', () => {
    it('should default to overview tab for tournaments without matches', async () => {
      mockSearchParams.get.mockReturnValue(null)
      
      render(<TournamentDetailTabs tournament={mockTournament} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('overview-tab')).toBeInTheDocument()
      })
      
      // Verify overview tab is active
      const overviewTab = screen.getByRole('tab', { name: /overview/i })
      expect(overviewTab).toHaveAttribute('aria-selected', 'true')
    })

    it('should default to schedule tab for tournaments with matches', async () => {
      const tournamentWithMatches = {
        ...mockTournament,
        matches: [
          { id: '1', date: '2025-07-02', time: '10:00', team1: 'Team A', team2: 'Team B', status: 'scheduled' }
        ]
      } as any
      
      mockSearchParams.get.mockReturnValue(null)
      
      render(<TournamentDetailTabs tournament={tournamentWithMatches} />)
      
      await waitFor(() => {
        const scheduleTab = screen.getByRole('tab', { name: /schedule/i })
        expect(scheduleTab).toHaveAttribute('aria-selected', 'true')
      })
    })

    it('should default to results tab for completed tournaments', async () => {
      const completedTournament = {
        ...mockTournament,
        status: 'completed' as const
      }
      
      mockSearchParams.get.mockReturnValue(null)
      
      render(<TournamentDetailTabs tournament={completedTournament} />)
      
      await waitFor(() => {
        const resultsTab = screen.getByRole('tab', { name: /results/i })
        expect(resultsTab).toHaveAttribute('aria-selected', 'true')
      })
    })
  })

  describe('deep linking compatibility', () => {
    it('should respect explicit tab URL parameter over smart defaults', async () => {
      const tournamentWithMatches = {
        ...mockTournament,
        matches: [{ id: '1' }]
      } as any
      
      // Mock URL parameter for overview tab
      mockSearchParams.get.mockReturnValue('overview')
      
      render(<TournamentDetailTabs tournament={tournamentWithMatches} />)
      
      await waitFor(() => {
        const overviewTab = screen.getByRole('tab', { name: /overview/i })
        expect(overviewTab).toHaveAttribute('aria-selected', 'true')
      })
      
      // Schedule tab should not be selected despite having matches
      const scheduleTab = screen.getByRole('tab', { name: /schedule/i })
      expect(scheduleTab).toHaveAttribute('aria-selected', 'false')
    })

    it('should handle invalid URL tab parameters gracefully', async () => {
      mockSearchParams.get.mockReturnValue('invalid-tab')
      
      render(<TournamentDetailTabs tournament={mockTournament} />)
      
      await waitFor(() => {
        // Should fall back to smart default (overview for no matches)
        const overviewTab = screen.getByRole('tab', { name: /overview/i })
        expect(overviewTab).toHaveAttribute('aria-selected', 'true')
      })
    })
  })

  describe('user preference override', () => {
    it('should use user preference when smart defaults are disabled', async () => {
      // Mock stored user preference for schedule tab
      const localStorageMock = window.localStorage as jest.Mocked<Storage>
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        defaultTab: 'schedule',
        enableSmartDefaults: false,
        lastUpdated: Date.now(),
        version: '1.0'
      }))
      
      mockSearchParams.get.mockReturnValue(null)
      
      render(<TournamentDetailTabs tournament={mockTournament} />)
      
      await waitFor(() => {
        const scheduleTab = screen.getByRole('tab', { name: /schedule/i })
        expect(scheduleTab).toHaveAttribute('aria-selected', 'true')
      })
    })

    it('should use smart defaults when user preferences are enabled', async () => {
      const localStorageMock = window.localStorage as jest.Mocked<Storage>
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        enableSmartDefaults: true,
        lastUpdated: Date.now(),
        version: '1.0'
      }))
      
      const tournamentWithMatches = {
        ...mockTournament,
        matches: [{ id: '1' }]
      } as any
      
      mockSearchParams.get.mockReturnValue(null)
      
      render(<TournamentDetailTabs tournament={tournamentWithMatches} />)
      
      await waitFor(() => {
        const scheduleTab = screen.getByRole('tab', { name: /schedule/i })
        expect(scheduleTab).toHaveAttribute('aria-selected', 'true')
      })
    })
  })

  describe('accessibility enhancements', () => {
    it('should include recommendation in aria-label for recommended tabs', async () => {
      const tournamentWithMatches = {
        ...mockTournament,
        matches: [{ id: '1' }]
      } as any
      
      mockSearchParams.get.mockReturnValue(null)
      
      render(<TournamentDetailTabs tournament={tournamentWithMatches} />)
      
      await waitFor(() => {
        const scheduleTab = screen.getByRole('tab', { name: /schedule.*recommended/i })
        expect(scheduleTab).toBeInTheDocument()
      })
    })

    it('should provide screen reader announcements for smart defaults', async () => {
      const tournamentWithMatches = {
        ...mockTournament,
        matches: [{ id: '1' }]
      } as any
      
      mockSearchParams.get.mockReturnValue(null)
      
      render(<TournamentDetailTabs tournament={tournamentWithMatches} />)
      
      await waitFor(() => {
        const announcement = screen.getByText(/schedule tab recommended due to available matches/i)
        expect(announcement).toHaveClass('sr-only')
        expect(announcement).toHaveAttribute('aria-live', 'polite')
      })
    })

    it('should maintain 48px touch targets', () => {
      render(<TournamentDetailTabs tournament={mockTournament} />)
      
      const tabs = screen.getAllByRole('tab')
      tabs.forEach(tab => {
        expect(tab).toHaveClass('min-h-[48px]')
      })
    })
  })

  describe('keyboard navigation', () => {
    it('should support arrow key navigation', async () => {
      render(<TournamentDetailTabs tournament={mockTournament} />)
      
      const overviewTab = screen.getByRole('tab', { name: /overview/i })
      const scheduleTab = screen.getByRole('tab', { name: /schedule/i })
      
      // Focus overview tab and press right arrow
      overviewTab.focus()
      fireEvent.keyDown(overviewTab, { key: 'ArrowRight' })
      
      await waitFor(() => {
        expect(scheduleTab).toHaveAttribute('aria-selected', 'true')
      })
    })

    it('should support Home/End key navigation', async () => {
      render(<TournamentDetailTabs tournament={mockTournament} />)
      
      const scheduleTab = screen.getByRole('tab', { name: /schedule/i })
      const overviewTab = screen.getByRole('tab', { name: /overview/i })
      const resultsTab = screen.getByRole('tab', { name: /results/i })
      
      // Focus schedule tab and press Home
      scheduleTab.focus()
      fireEvent.keyDown(scheduleTab, { key: 'Home' })
      
      await waitFor(() => {
        expect(overviewTab).toHaveAttribute('aria-selected', 'true')
      })
      
      // Press End to go to last tab
      fireEvent.keyDown(overviewTab, { key: 'End' })
      
      await waitFor(() => {
        expect(resultsTab).toHaveAttribute('aria-selected', 'true')
      })
    })
  })

  describe('development debugging', () => {
    const originalEnv = process.env.NODE_ENV

    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    afterEach(() => {
      process.env.NODE_ENV = originalEnv
    })

    it('should show context indicator in development mode', async () => {
      const tournamentWithMatches = {
        ...mockTournament,
        matches: [{ id: '1' }]
      } as any
      
      render(<TournamentDetailTabs tournament={tournamentWithMatches} />)
      
      await waitFor(() => {
        expect(screen.getByText(/smart default: schedule \(has_matches\)/i)).toBeInTheDocument()
      })
    })

    it('should show loading state during context analysis', () => {
      render(<TournamentDetailTabs tournament={null as any} />)
      
      expect(screen.getByText(/loading tournament details/i)).toBeInTheDocument()
    })
  })

  describe('error handling', () => {
    it('should handle context analysis errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Test with null tournament to trigger fallback
      render(<TournamentDetailTabs tournament={null as any} />)
      
      // Should show loading state
      expect(screen.getByText(/loading tournament details/i)).toBeInTheDocument()
      
      consoleSpy.mockRestore()
    })
  })
})