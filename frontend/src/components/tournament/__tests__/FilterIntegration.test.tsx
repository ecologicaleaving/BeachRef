import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TournamentFilters } from '../TournamentFilters';
import '@testing-library/jest-dom';

// Mock the hooks to simulate real filtering behavior
const mockUpdateFilters = jest.fn();
const mockClearFilters = jest.fn();

jest.mock('../../../hooks/useFilters', () => ({
  useFilters: jest.fn(() => ({
    filters: {
      search: '',
      dateRange: {},
      locations: [],
      types: [],
      surface: undefined,
      gender: undefined,
      statuses: []
    },
    updateFilters: mockUpdateFilters,
    clearFilters: mockClearFilters,
    hasActiveFilters: false,
    activeFilterCount: 0,
    updateSearch: jest.fn(),
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

  it('handles search input changes', async () => {
    const user = userEvent.setup();
    const TestWrapper = createTestWrapper();
    
    render(
      <TestWrapper>
        <TournamentFilters resultCount={25} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('Search tournaments...');
    
    // Use userEvent which is more realistic for user interactions
    await user.clear(searchInput);
    await user.type(searchInput, 'beach volleyball');

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