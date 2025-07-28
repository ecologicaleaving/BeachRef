import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RefereeFilter } from '../RefereeFilter';
import type { RefereeSearchResponse } from '@/types/tournament.types';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock debounce to eliminate delays in tests
jest.mock('@/utils/filter.utils', () => ({
  debounce: (fn: (...args: unknown[]) => unknown) => fn
}));

const mockRefereeSearchResponse: RefereeSearchResponse = {
  referees: [
    { name: 'John Smith', country: 'USA', matchCount: 15 },
    { name: 'Maria Garcia', country: 'ESP', matchCount: 12 },
    { name: 'Hans Mueller', country: 'GER', matchCount: 8 },
    { name: 'Yuki Tanaka', country: 'JPN', matchCount: 5 }
  ]
};

describe('RefereeFilter - Story 1.3', () => {
  const defaultProps = {
    selectedReferees: [],
    onRefereesChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRefereeSearchResponse)
    });
  });

  describe('Initial render', () => {
    it('should render referee filter with default state', () => {
      render(<RefereeFilter {...defaultProps} />);
      
      expect(screen.getByText('Referees')).toBeInTheDocument();
      expect(screen.getByText('Select referees')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveClass('text-muted-foreground');
    });

    it('should show count when referees are selected', () => {
      render(
        <RefereeFilter 
          {...defaultProps} 
          selectedReferees={['John Smith', 'Maria Garcia']} 
        />
      );
      
      expect(screen.getByText('2 referees selected')).toBeInTheDocument();
    });

    it('should display selected referees as badges', () => {
      render(
        <RefereeFilter 
          {...defaultProps} 
          selectedReferees={['John Smith', 'Maria Garcia']} 
        />
      );
      
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('should show search placeholder when popover is opened', async () => {
      const user = userEvent.setup();
      render(<RefereeFilter {...defaultProps} />);
      
      const triggerButton = screen.getByRole('button');
      await user.click(triggerButton);
      
      expect(screen.getByPlaceholderText('Search referees...')).toBeInTheDocument();
    });

    it('should search referees when typing in search input', async () => {
      const user = userEvent.setup();
      render(<RefereeFilter {...defaultProps} />);
      
      const triggerButton = screen.getByRole('button');
      await user.click(triggerButton);
      
      const searchInput = screen.getByPlaceholderText('Search referees...');
      await user.type(searchInput, 'John');
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/referees/search?q=John');
      });
    });

    it('should display search results with referee information', async () => {
      const user = userEvent.setup();
      render(<RefereeFilter {...defaultProps} />);
      
      const triggerButton = screen.getByRole('button');
      await user.click(triggerButton);
      
      const searchInput = screen.getByPlaceholderText('Search referees...');
      await user.type(searchInput, 'Smith');
      
      await waitFor(() => {
        expect(screen.getByText('John Smith (USA)')).toBeInTheDocument();
        expect(screen.getByText('(15 matches)')).toBeInTheDocument();
      });
    });

    it('should display loading state during search', async () => {
      // Mock delayed response
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve(mockRefereeSearchResponse)
          }), 100)
        )
      );

      const user = userEvent.setup();
      render(<RefereeFilter {...defaultProps} />);
      
      const triggerButton = screen.getByRole('button');
      await user.click(triggerButton);
      
      const searchInput = screen.getByPlaceholderText('Search referees...');
      await user.type(searchInput, 'Smith');
      
      expect(screen.getByText('Searching referees...')).toBeInTheDocument();
    });

    it('should handle empty search results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ referees: [] })
      });

      const user = userEvent.setup();
      render(<RefereeFilter {...defaultProps} />);
      
      const triggerButton = screen.getByRole('button');
      await user.click(triggerButton);
      
      const searchInput = screen.getByPlaceholderText('Search referees...');
      await user.type(searchInput, 'NonexistentReferee');
      
      await waitFor(() => {
        expect(screen.getByText('No referees found for "NonexistentReferee"')).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error'
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const user = userEvent.setup();
      render(<RefereeFilter {...defaultProps} />);
      
      const triggerButton = screen.getByRole('button');
      await user.click(triggerButton);
      
      const searchInput = screen.getByPlaceholderText('Search referees...');
      await user.type(searchInput, 'Smith');
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to search referees:', 'Internal Server Error');
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Referee selection', () => {
    it('should select referee when clicked', async () => {
      const mockOnRefereesChange = jest.fn();
      const user = userEvent.setup();
      
      render(<RefereeFilter {...defaultProps} onRefereesChange={mockOnRefereesChange} />);
      
      const triggerButton = screen.getByRole('button');
      await user.click(triggerButton);
      
      const searchInput = screen.getByPlaceholderText('Search referees...');
      await user.type(searchInput, 'Smith');
      
      await waitFor(() => {
        expect(screen.getByText('John Smith (USA)')).toBeInTheDocument();
      });
      
      const refereeOption = screen.getByText('John Smith (USA)').closest('div');
      await user.click(refereeOption!);
      
      expect(mockOnRefereesChange).toHaveBeenCalledWith(['John Smith']);
    });

    it('should deselect referee when already selected', async () => {
      const mockOnRefereesChange = jest.fn();
      const user = userEvent.setup();
      
      render(
        <RefereeFilter 
          {...defaultProps} 
          selectedReferees={['John Smith']}
          onRefereesChange={mockOnRefereesChange} 
        />
      );
      
      const triggerButton = screen.getByRole('button');
      await user.click(triggerButton);
      
      const searchInput = screen.getByPlaceholderText('Search referees...');
      await user.type(searchInput, 'Smith');
      
      await waitFor(() => {
        expect(screen.getByText('John Smith (USA)')).toBeInTheDocument();
      });
      
      const refereeOption = screen.getByText('John Smith (USA)').closest('div');
      await user.click(refereeOption!);
      
      expect(mockOnRefereesChange).toHaveBeenCalledWith([]);
    });

    it('should handle multiple referee selections', async () => {
      const mockOnRefereesChange = jest.fn();
      const user = userEvent.setup();
      
      render(<RefereeFilter {...defaultProps} onRefereesChange={mockOnRefereesChange} />);
      
      const triggerButton = screen.getByRole('button');
      await user.click(triggerButton);
      
      const searchInput = screen.getByPlaceholderText('Search referees...');
      await user.type(searchInput, 'a'); // Search that matches multiple referees
      
      await waitFor(() => {
        expect(screen.getByText('Maria Garcia (ESP)')).toBeInTheDocument();
      });
      
      const mariaOption = screen.getByText('Maria Garcia (ESP)').closest('div');
      await user.click(mariaOption!);
      
      expect(mockOnRefereesChange).toHaveBeenCalledWith(['Maria Garcia']);
    });
  });

  describe('Badge management', () => {
    it('should remove referee when badge close button is clicked', async () => {
      const mockOnRefereesChange = jest.fn();
      const user = userEvent.setup();
      
      render(
        <RefereeFilter 
          {...defaultProps} 
          selectedReferees={['John Smith', 'Maria Garcia']}
          onRefereesChange={mockOnRefereesChange} 
        />
      );
      
      // Find the X button for John Smith badge
      const johnBadge = screen.getByText('John Smith').closest('div');
      const removeButton = johnBadge?.querySelector('button');
      
      await user.click(removeButton!);
      
      expect(mockOnRefereesChange).toHaveBeenCalledWith(['Maria Garcia']);
    });

    it('should display all selected referees as badges', () => {
      render(
        <RefereeFilter 
          {...defaultProps} 
          selectedReferees={['John Smith', 'Maria Garcia', 'Hans Mueller']} 
        />
      );
      
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
      expect(screen.getByText('Hans Mueller')).toBeInTheDocument();
    });
  });

  describe('Clear functionality', () => {
    it('should clear all referees when Clear All button is clicked', async () => {
      const mockOnRefereesChange = jest.fn();
      const user = userEvent.setup();
      
      render(
        <RefereeFilter 
          {...defaultProps} 
          selectedReferees={['John Smith', 'Maria Garcia']}
          onRefereesChange={mockOnRefereesChange} 
        />
      );
      
      const triggerButton = screen.getByRole('button');
      await user.click(triggerButton);
      
      const clearButton = screen.getByText('Clear All');
      await user.click(clearButton);
      
      expect(mockOnRefereesChange).toHaveBeenCalledWith([]);
    });

    it('should disable Clear All button when no referees selected', async () => {
      const user = userEvent.setup();
      render(<RefereeFilter {...defaultProps} />);
      
      const triggerButton = screen.getByRole('button');
      await user.click(triggerButton);
      
      const clearButton = screen.getByText('Clear All');
      expect(clearButton).toBeDisabled();
    });
  });

  describe('Popover management', () => {
    it('should close popover when Done button is clicked', async () => {
      const user = userEvent.setup();
      render(<RefereeFilter {...defaultProps} selectedReferees={['John Smith']} />);
      
      const triggerButton = screen.getByRole('button');
      await user.click(triggerButton);
      
      const doneButton = screen.getByText('Done (1)');
      await user.click(doneButton);
      
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search referees...')).not.toBeInTheDocument();
      });
    });

    it('should show correct count in Done button', async () => {
      const user = userEvent.setup();
      render(<RefereeFilter {...defaultProps} selectedReferees={['John Smith', 'Maria Garcia']} />);
      
      const triggerButton = screen.getByRole('button');
      await user.click(triggerButton);
      
      expect(screen.getByText('Done (2)')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<RefereeFilter {...defaultProps} />);
      
      const label = screen.getByText('Referees');
      expect(label).toBeInTheDocument();
      
      const triggerButton = screen.getByRole('button');
      expect(triggerButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should update aria-expanded when popover opens', async () => {
      const user = userEvent.setup();
      render(<RefereeFilter {...defaultProps} />);
      
      const triggerButton = screen.getByRole('button');
      await user.click(triggerButton);
      
      expect(triggerButton).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Edge cases', () => {
    it('should handle referee without country', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          referees: [{ name: 'Local Referee', matchCount: 3 }]
        })
      });

      const user = userEvent.setup();
      render(<RefereeFilter {...defaultProps} />);
      
      const triggerButton = screen.getByRole('button');
      await user.click(triggerButton);
      
      const searchInput = screen.getByPlaceholderText('Search referees...');
      await user.type(searchInput, 'Local');
      
      await waitFor(() => {
        expect(screen.getByText('Local Referee')).toBeInTheDocument();
        expect(screen.queryByText('Local Referee ()')).not.toBeInTheDocument();
      });
    });

    it('should handle very long referee names', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          referees: [{ 
            name: 'Very Long Referee Name That Might Cause Layout Issues In The Component', 
            country: 'USA',
            matchCount: 1 
          }]
        })
      });

      const user = userEvent.setup();
      render(<RefereeFilter {...defaultProps} />);
      
      const triggerButton = screen.getByRole('button');
      await user.click(triggerButton);
      
      const searchInput = screen.getByPlaceholderText('Search referees...');
      await user.type(searchInput, 'Very Long');
      
      await waitFor(() => {
        expect(screen.getByText('Very Long Referee Name That Might Cause Layout Issues In The Component (USA)')).toBeInTheDocument();
      });
    });
  });
});