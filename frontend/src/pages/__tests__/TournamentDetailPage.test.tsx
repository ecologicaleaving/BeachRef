import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TournamentDetailPage } from '../TournamentDetailPage';
import { useTournamentDetail } from '@/hooks/useTournamentDetail';
import { TournamentDetailResponse } from '@/types/tournament.types';

// Mock the hook
jest.mock('@/hooks/useTournamentDetail');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: 'tournament-1' }),
  useNavigate: () => jest.fn()
}));

const mockUseTournamentDetail = useTournamentDetail as jest.MockedFunction<typeof useTournamentDetail>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const mockTournamentDetail: TournamentDetailResponse = {
  tournament: {
    id: 'tournament-1',
    name: 'FIVB Beach Volleyball World Championships',
    dates: {
      start: new Date('2024-01-15'),
      end: new Date('2024-01-20')
    },
    location: {
      city: 'Miami',
      country: 'USA',
      venue: 'South Beach Arena'
    },
    level: 'World Tour',
    status: 'Live',
    matchCount: 32,
    prizeMoney: 50000,
    surface: 'Sand',
    gender: 'Men'
  },
  matches: [
    {
      id: 'match-1',
      tournamentId: 'tournament-1',
      teams: {
        team1: {
          player1: 'John Doe',
          player2: 'Jane Smith',
          country: 'USA'
        },
        team2: {
          player1: 'Mike Johnson',
          player2: 'Sarah Wilson',
          country: 'BRA'
        }
      },
      score: {
        set1: { team1: 21, team2: 19 }
      },
      status: 'Completed',
      scheduledTime: new Date('2024-01-15T10:00:00Z'),
      round: 'Quarterfinal',
      court: 'Center Court',
      winner: 'team1'
    }
  ],
  statistics: {
    totalMatches: 32,
    completedMatches: 16,
    upcomingMatches: 14,
    liveMatches: 2
  }
};

describe('TournamentDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset document title
    document.title = 'VisConnect';
  });

  it('should render loading state', () => {
    mockUseTournamentDetail.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
      isError: false,
      isSuccess: false,
      isFetching: false,
      isPending: true,
      isRefetching: false,
      isStale: false,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'fetching',
      isFetched: false,
      isFetchedAfterMount: false,
      isInitialLoading: true,
      isLoadingError: false,
      isPaused: false,
      isPlaceholderData: false,
      isRefetchError: false,
      status: 'pending'
    });

    render(<TournamentDetailPage />, { wrapper: createWrapper() });

    // Should show skeleton loading elements
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('should render tournament detail when data is loaded', () => {
    mockUseTournamentDetail.mockReturnValue({
      data: mockTournamentDetail,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isError: false,
      isSuccess: true,
      isFetching: false,
      isPending: false,
      isRefetching: false,
      isStale: false,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle',
      isFetched: true,
      isFetchedAfterMount: true,
      isInitialLoading: false,
      isLoadingError: false,
      isPaused: false,
      isPlaceholderData: false,
      isRefetchError: false,
      status: 'success'
    });

    render(<TournamentDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('FIVB Beach Volleyball World Championships')).toBeInTheDocument();
    expect(screen.getByText('Back to Tournaments')).toBeInTheDocument();
  });

  it('should set page title when tournament loads', async () => {
    mockUseTournamentDetail.mockReturnValue({
      data: mockTournamentDetail,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isError: false,
      isSuccess: true,
      isFetching: false,
      isPending: false,
      isRefetching: false,
      isStale: false,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle',
      isFetched: true,
      isFetchedAfterMount: true,
      isInitialLoading: false,
      isLoadingError: false,
      isPaused: false,
      isPlaceholderData: false,
      isRefetchError: false,
      status: 'success'
    });

    render(<TournamentDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(document.title).toBe('FIVB Beach Volleyball World Championships - VisConnect');
    });
  });

  it('should render error state for not found error', () => {
    const notFoundError = new Error('Tournament not found');
    mockUseTournamentDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: notFoundError,
      refetch: jest.fn(),
      isError: true,
      isSuccess: false,
      isFetching: false,
      isPending: false,
      isRefetching: false,
      isStale: false,
      dataUpdatedAt: 0,
      errorUpdatedAt: Date.now(),
      failureCount: 1,
      failureReason: notFoundError,
      fetchStatus: 'idle',
      isFetched: true,
      isFetchedAfterMount: true,
      isInitialLoading: false,
      isLoadingError: false,
      isPaused: false,
      isPlaceholderData: false,
      isRefetchError: false,
      status: 'error'
    });

    render(<TournamentDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Tournament not found. Please check the URL and try again.')).toBeInTheDocument();
    expect(screen.getByText('Back to Tournaments')).toBeInTheDocument();
  });

  it('should render error state for general error', () => {
    const generalError = new Error('Failed to load data');
    mockUseTournamentDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: generalError,
      refetch: jest.fn(),
      isError: true,
      isSuccess: false,
      isFetching: false,
      isPending: false,
      isRefetching: false,
      isStale: false,
      dataUpdatedAt: 0,
      errorUpdatedAt: Date.now(),
      failureCount: 1,
      failureReason: generalError,
      fetchStatus: 'idle',
      isFetched: true,
      isFetchedAfterMount: true,
      isInitialLoading: false,
      isLoadingError: false,
      isPaused: false,
      isPlaceholderData: false,
      isRefetchError: false,
      status: 'error'
    });

    render(<TournamentDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Failed to load tournament details. Please try again.')).toBeInTheDocument();
  });

  it('should render breadcrumb navigation', () => {
    mockUseTournamentDetail.mockReturnValue({
      data: mockTournamentDetail,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isError: false,
      isSuccess: true,
      isFetching: false,
      isPending: false,
      isRefetching: false,
      isStale: false,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle',
      isFetched: true,
      isFetchedAfterMount: true,
      isInitialLoading: false,
      isLoadingError: false,
      isPaused: false,
      isPlaceholderData: false,
      isRefetchError: false,
      status: 'success'
    });

    render(<TournamentDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Tournaments')).toBeInTheDocument();
    expect(screen.getByText('FIVB Beach Volleyball World Championships')).toBeInTheDocument();
  });

  it('should handle null data state', () => {
    mockUseTournamentDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isError: false,
      isSuccess: true,
      isFetching: false,
      isPending: false,
      isRefetching: false,
      isStale: false,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle',
      isFetched: true,
      isFetchedAfterMount: true,
      isInitialLoading: false,
      isLoadingError: false,
      isPaused: false,
      isPlaceholderData: false,
      isRefetchError: false,
      status: 'success'
    });

    render(<TournamentDetailPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Tournament not found.')).toBeInTheDocument();
  });
});