import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { TournamentTable } from '@/components/tournament/TournamentTable';
import { Tournament } from '@/lib/types';

// Mock fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Mock window.innerWidth for responsive tests
const mockInnerWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  // Wrap the resize event in act() to avoid warnings
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
};

// Mock tournament data
const mockTournaments: Tournament[] = [
  {
    code: 'TOUR001',
    name: 'Beach Volleyball World Championship',
    countryCode: 'US',
    startDate: '2025-06-15',
    endDate: '2025-06-20',
    gender: 'Mixed',
    type: 'World Championship'
  },
  {
    code: 'TOUR002',
    name: 'European Beach Tour',
    countryCode: 'DE',
    startDate: '2025-07-10',
    endDate: '2025-07-15',
    gender: 'Men',
    type: 'Continental Cup'
  },
  {
    code: 'TOUR003',
    name: 'Pacific Games Beach Volleyball',
    countryCode: 'AU',
    startDate: '2025-05-05',
    endDate: '2025-05-10',
    gender: 'Women',
    type: 'Continental Games'
  }
];

describe('TournamentTable', () => {
  beforeEach(() => {
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
    // Default to desktop view for most tests
    mockInnerWidth(1024);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading States', () => {
    it('displays loading skeleton when loading', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<TournamentTable />);

      expect(screen.getByRole('status', { name: /loading tournament table/i })).toBeInTheDocument();
      expect(screen.getByText('Loading tournament table')).toBeInTheDocument();
    });

    it('does not show loading when initial data is provided', () => {
      render(<TournamentTable initialData={mockTournaments} />);

      expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    it('renders tournament data correctly', () => {
      render(<TournamentTable initialData={mockTournaments} />);

      // Check if tournament names are displayed
      expect(screen.getByText('Beach Volleyball World Championship')).toBeInTheDocument();
      expect(screen.getByText('European Beach Tour')).toBeInTheDocument();
      expect(screen.getByText('Pacific Games Beach Volleyball')).toBeInTheDocument();

      // Check if country information is displayed
      expect(screen.getByText('United States')).toBeInTheDocument();
      expect(screen.getByText('Germany')).toBeInTheDocument();
      expect(screen.getByText('Australia')).toBeInTheDocument();

      // Check if dates are formatted
      expect(screen.getByText('Jun 15, 2025')).toBeInTheDocument();
      expect(screen.getByText('Jul 10, 2025')).toBeInTheDocument();
      expect(screen.getByText('May 5, 2025')).toBeInTheDocument();

      // Check gender badges
      expect(screen.getByText('Mixed')).toBeInTheDocument();
      expect(screen.getByText('Men')).toBeInTheDocument();
      expect(screen.getByText('Women')).toBeInTheDocument();
    });

    it('displays correct tournament count', () => {
      render(<TournamentTable initialData={mockTournaments} />);

      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label', expect.stringContaining('3 tournaments found'));
    });

    it('shows empty state when no tournaments', async () => {
      render(<TournamentTable initialData={[]} />);

      await waitFor(() => {
        expect(screen.getByText('No tournaments found')).toBeInTheDocument();
        expect(screen.getByText('No tournament data is currently available for 2025.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /refresh tournaments/i })).toBeInTheDocument();
      });
    });
  });

  describe('Sorting Functionality', () => {
    beforeEach(() => {
      render(<TournamentTable initialData={mockTournaments} />);
    });

    it('sorts by tournament name', () => {
      const nameHeader = screen.getByRole('button', { name: /sort by tournament name/i });
      
      // Initial order - should be unsorted
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('Beach Volleyball World Championship');

      // Click to sort ascending
      fireEvent.click(nameHeader);
      
      // Check ARIA attribute
      const nameColumnHeader = screen.getByRole('columnheader', { name: /tournament name/i });
      expect(nameColumnHeader).toHaveAttribute('aria-sort', 'ascending');

      // Click again to sort descending
      fireEvent.click(nameHeader);
      expect(nameColumnHeader).toHaveAttribute('aria-sort', 'descending');

      // Click third time to clear sort
      fireEvent.click(nameHeader);
      expect(nameColumnHeader).toHaveAttribute('aria-sort', 'none');
    });

    it('sorts by country', () => {
      const countryHeader = screen.getByRole('button', { name: /sort by country/i });
      fireEvent.click(countryHeader);

      const countryColumnHeader = screen.getByRole('columnheader', { name: /country/i });
      expect(countryColumnHeader).toHaveAttribute('aria-sort', 'ascending');
    });

    it('sorts by start date', () => {
      const dateHeader = screen.getByRole('button', { name: /sort by start date/i });
      fireEvent.click(dateHeader);

      const dateColumnHeader = screen.getByRole('columnheader', { name: /start date/i });
      expect(dateColumnHeader).toHaveAttribute('aria-sort', 'ascending');
    });

    it('displays correct sort icons', () => {
      const nameHeader = screen.getByRole('button', { name: /sort by tournament name/i });
      
      // Should show unsorted icon initially
      expect(nameHeader.querySelector('svg')).toBeInTheDocument();
      
      // Click to sort
      fireEvent.click(nameHeader);
      
      // Should show ascending icon
      expect(nameHeader.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('fetches tournaments from API on mount', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTournaments,
      } as Response);

      render(<TournamentTable />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/tournaments', expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          })
        }));
      });

      // Check if data is displayed after fetch
      await waitFor(() => {
        expect(screen.getByText('Beach Volleyball World Championship')).toBeInTheDocument();
      });
    });

    it('handles API errors gracefully', async () => {
      const errorMessage = 'Failed to fetch tournaments';
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error(errorMessage)
      );

      render(<TournamentTable />);

      await waitFor(() => {
        // The error message "Failed to fetch tournaments" gets mapped to "Connection Error"
        expect(screen.getByText('Connection Error')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reload tournaments/i })).toBeInTheDocument();
      }, { timeout: 2000 }); // Increase timeout for API error handling
    });

    it('handles API HTTP errors', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Server error' })
      } as Response);

      render(<TournamentTable />);

      await waitFor(() => {
        expect(screen.getByText('Error Loading Tournaments')).toBeInTheDocument();
      });
    });

    it('retries API call when retry button is clicked', async () => {
      // First call fails
      (fetch as jest.MockedFunction<typeof fetch>)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTournaments,
        } as Response);

      render(<TournamentTable />);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText('Error Loading Tournaments')).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /reload tournaments/i });
      fireEvent.click(retryButton);

      // Wait for successful retry
      await waitFor(() => {
        expect(screen.getByText('Beach Volleyball World Championship')).toBeInTheDocument();
      });

      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Responsive Design', () => {
    it('shows desktop table on large screens', async () => {
      mockInnerWidth(1024);
      
      render(<TournamentTable initialData={mockTournaments} />);

      // Wait for responsive state to update
      await waitFor(() => {
        // Desktop table should be visible
        expect(screen.getByRole('table')).toBeInTheDocument();
        // Mobile cards should not be present
        expect(screen.queryByText('3 Tournaments')).not.toBeInTheDocument();
      });
    });

    it('shows mobile cards on small screens', async () => {
      mockInnerWidth(768); // Mobile width
      
      render(<TournamentTable initialData={mockTournaments} />);

      // Wait for responsive state to update
      await waitFor(() => {
        // Mobile cards should be present
        expect(screen.getByText('3 Tournaments')).toBeInTheDocument();
        // Desktop table should not be present
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
      });
    });

    it('switches views when window is resized', async () => {
      render(<TournamentTable initialData={mockTournaments} />);

      // Initially desktop
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      // Resize to mobile
      mockInnerWidth(768);
      
      await waitFor(() => {
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
        expect(screen.getByText('3 Tournaments')).toBeInTheDocument();
      });

      // Resize back to desktop
      mockInnerWidth(1024);
      
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.queryByText('3 Tournaments')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      render(<TournamentTable initialData={mockTournaments} />);
    });

    it('has proper ARIA labels', () => {
      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label', expect.stringContaining('Beach volleyball tournaments'));

      // Check column headers have proper roles
      const headers = screen.getAllByRole('columnheader');
      expect(headers).toHaveLength(6); // 6 columns

      // Check all headers have aria-sort attribute
      headers.forEach(header => {
        expect(header).toHaveAttribute('aria-sort');
      });
    });

    it('has keyboard navigation support', async () => {
      const nameHeader = screen.getByRole('button', { name: /sort by tournament name/i });
      
      // Should be focusable
      nameHeader.focus();
      expect(document.activeElement).toBe(nameHeader);

      // Should be activatable with Enter
      fireEvent.keyDown(nameHeader, { key: 'Enter' });
      
      await waitFor(() => {
        expect(nameHeader.closest('th')).toHaveAttribute('aria-sort', 'ascending');
      });

      // Should also work with Space key
      fireEvent.keyDown(nameHeader, { key: ' ' });
      
      await waitFor(() => {
        expect(nameHeader.closest('th')).toHaveAttribute('aria-sort', 'descending');
      });
    });

    it('provides screen reader descriptions', () => {
      // Check for screen reader only descriptions
      expect(screen.getByText('Click to sort tournaments by name')).toBeInTheDocument();
      expect(screen.getByText('Click to sort tournaments by country')).toBeInTheDocument();
      expect(screen.getByText('Click to sort tournaments by start date')).toBeInTheDocument();
    });

    it('has proper focus management', () => {
      const sortButton = screen.getByRole('button', { name: /sort by tournament name/i });
      
      // Test focus styles are applied (through CSS classes)
      expect(sortButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
    });
  });

  describe('Error Boundaries', () => {
    it('handles malformed tournament data gracefully', async () => {
      const malformedData = [
        {
          code: 'INVALID',
          name: 'Invalid Tournament',
          countryCode: 'XX',
          startDate: 'invalid-date',
          endDate: 'invalid-date',
          gender: 'Men' as const,
          type: 'Test'
        }
      ];

      render(<TournamentTable initialData={malformedData} />);

      await waitFor(() => {
        // Component should still render without crashing (only one view at a time)
        expect(screen.getByText('Invalid Tournament')).toBeInTheDocument();
        // Invalid dates should fall back to original string
        expect(screen.getAllByText('invalid-date').length).toBeGreaterThan(0);
      });
    });

    it('handles missing country codes', async () => {
      const dataWithUnknownCountry = [
        {
          code: 'TEST001',
          name: 'Test Tournament',
          countryCode: 'ZZ', // Unknown country code
          startDate: '2025-01-01',
          endDate: '2025-01-05',
          gender: 'Men' as const,
          type: 'Test'
        }
      ];

      render(<TournamentTable initialData={dataWithUnknownCountry} />);

      await waitFor(() => {
        // Should fall back to country code when name is unknown (only desktop view)
        expect(screen.getAllByText('ZZ')).toHaveLength(2); // Shows in both name and code positions
      });
    });

    it('handles missing country codes in mobile view', async () => {
      mockInnerWidth(400); // Mobile view (below 768px)
      
      const dataWithUnknownCountry = [
        {
          code: 'TEST001',
          name: 'Test Tournament',
          countryCode: 'ZZ', // Unknown country code
          startDate: '2025-01-01',
          endDate: '2025-01-05',
          gender: 'Men' as const,
          type: 'Test'
        }
      ];

      render(<TournamentTable initialData={dataWithUnknownCountry} />);

      await waitFor(() => {
        // Should fall back to country code when name is unknown (mobile view)
        expect(screen.getAllByText('ZZ')).toHaveLength(2); // Shows in both name and code positions
        expect(screen.queryByRole('table')).not.toBeInTheDocument(); // Confirm mobile view
      });
    });
  });

  describe('Performance', () => {
    it('memoizes sorted results', () => {
      const { rerender } = render(<TournamentTable initialData={mockTournaments} />);

      // Click sort button
      const nameHeader = screen.getByRole('button', { name: /sort by tournament name/i });
      fireEvent.click(nameHeader);

      // Rerender with same props
      rerender(<TournamentTable initialData={mockTournaments} />);

      // Component should not lose sort state
      const nameColumnHeader = screen.getByRole('columnheader', { name: /tournament name/i });
      expect(nameColumnHeader).toHaveAttribute('aria-sort', 'ascending');
    });
  });
});