import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TournamentFilters } from '../TournamentFilters';
import '@testing-library/jest-dom';

// Mock the hooks to avoid complex router/query dependencies
const mockUpdateSearch = jest.fn();
const mockFilters = { search: '' };

jest.mock('../../../hooks/useFilters', () => ({
  useFilters: jest.fn(() => ({
    filters: mockFilters,
    updateFilters: jest.fn(),
    clearFilters: jest.fn(),
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

// Mock the hooks module  
jest.mock('../../../hooks/useFilters');

describe('TournamentFilters', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders filter panel with basic elements', () => {
    const TestWrapper = createTestWrapper();
    
    render(
      <TestWrapper>
        <TournamentFilters resultCount={10} />
      </TestWrapper>
    );

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search tournaments...')).toBeInTheDocument();
  });

  it('displays result count when provided', () => {
    const TestWrapper = createTestWrapper();
    
    render(
      <TestWrapper>
        <TournamentFilters resultCount={25} />
      </TestWrapper>
    );

    expect(screen.getByText(/25 tournaments/)).toBeInTheDocument();
  });

  it('has search input that can be changed', () => {
    const TestWrapper = createTestWrapper();
    
    render(
      <TestWrapper>
        <TournamentFilters resultCount={10} />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('Search tournaments...');
    expect(searchInput).toBeInTheDocument();
    
    // Test that the input fires the change handler
    fireEvent.change(searchInput, { target: { value: 'volleyball' } });
    expect(mockUpdateSearch).toHaveBeenCalledWith('volleyball');
  });

  it('shows advanced filters button', () => {
    const TestWrapper = createTestWrapper();
    
    render(
      <TestWrapper>
        <TournamentFilters resultCount={10} />
      </TestWrapper>
    );

    expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
  });
});