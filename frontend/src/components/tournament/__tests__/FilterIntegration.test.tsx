import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TournamentFilters } from '../TournamentFilters';
import '@testing-library/jest-dom';

// Mock the hooks to simulate real filtering behavior
const mockUpdateFilters = jest.fn();
const mockClearFilters = jest.fn();
const mockUpdateSearch = jest.fn();

// Create a mutable filters object to simulate state updates
const mockFilters = {
  search: '',
  dateRange: {},
  locations: [],
  types: [],
  surface: undefined,
  gender: undefined,
  statuses: []
};

jest.mock('../../../hooks/useFilters', () => ({
  useFilters: jest.fn(() => ({
    filters: mockFilters,
    updateFilters: mockUpdateFilters,
    clearFilters: mockClearFilters,
    hasActiveFilters: false,
    activeFilterCount: 0,
    updateSearch: mockUpdateSearch,
    updateLocation: jest.fn(),
    updateDateRange: jest.fn(),
    updateLocations: jest.fn(),
    updateTypes: jest.fn(),
    updateSurface: jest.fn(),
    updateGender: jest.fn(),
    updateStatuses: jest.fn(),
    debouncedSearch: '',
    isDebouncing: false
  }))
}));

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );

  return TestWrapper;
};

describe('Filter Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock filters state
    mockFilters.search = '';
    mockFilters.dateRange = {};
    mockFilters.locations = [];
    mockFilters.types = [];
    mockFilters.surface = undefined;
    mockFilters.gender = undefined;
    mockFilters.statuses = [];
  });

  it('renders complete filter panel with all components', () => {
    const TestWrapper = createTestWrapper();
    
    render(
      <TestWrapper>
        <TournamentFilters resultCount={25} />
      </TestWrapper>
    );

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search tournaments...')).toBeInTheDocument();
    expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
    expect(screen.getByText(/25 tournaments/)).toBeInTheDocument();
  });

  it('handles search input changes', () => {
    const TestWrapper = createTestWrapper();
    
    // Mock updateSearch to actually update the filters state
    mockUpdateSearch.mockImplementation((value: string) => {
      mockFilters.search = value;
    });
    
    const { rerender } = render(
      <TestWrapper>
        <TournamentFilters resultCount={25} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('Search tournaments...');
    
    // Use fireEvent to directly change the input value
    fireEvent.change(searchInput, { target: { value: 'beach volleyball' } });

    // Verify updateSearch was called with the correct value
    expect(mockUpdateSearch).toHaveBeenCalledWith('beach volleyball');
    
    // Re-render to reflect the state change
    rerender(
      <TestWrapper>
        <TournamentFilters resultCount={25} />
      </TestWrapper>
    );

    // Check that the input has the expected value
    expect(searchInput).toHaveValue('beach volleyball');
  });

  it('updates result count dynamically', () => {
    const TestWrapper = createTestWrapper();
    
    const { rerender } = render(
      <TestWrapper>
        <TournamentFilters resultCount={25} />
      </TestWrapper>
    );

    expect(screen.getByText(/25 tournaments/)).toBeInTheDocument();

    rerender(
      <TestWrapper>
        <TournamentFilters resultCount={5} />
      </TestWrapper>
    );

    expect(screen.getByText(/5 tournaments/)).toBeInTheDocument();
  });
});