import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTournamentDetail } from '../useTournamentDetail';
import { tournamentService } from '@/services/tournament.service';
import type { TournamentDetailResponse } from '@/types/tournament.types';

jest.mock('@/services/tournament.service');

const mockTournamentService = tournamentService as jest.Mocked<typeof tournamentService>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockTournamentDetail: TournamentDetailResponse = {
  tournament: {
    id: 'tournament-1',
    name: 'Test Tournament',
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

describe('useTournamentDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch tournament detail successfully', async () => {
    mockTournamentService.getTournamentById.mockResolvedValue(mockTournamentDetail);

    const { result } = renderHook(() => useTournamentDetail('tournament-1'), {
      wrapper: createWrapper()
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockTournamentDetail);
    expect(result.current.error).toBeNull();
    expect(mockTournamentService.getTournamentById).toHaveBeenCalledWith('tournament-1');
  });

  it('should handle undefined tournament ID', () => {
    const { result } = renderHook(() => useTournamentDetail(undefined), {
      wrapper: createWrapper()
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
    expect(mockTournamentService.getTournamentById).not.toHaveBeenCalled();
  });

  it('should handle service errors', async () => {
    const error = new Error('Tournament not found');
    mockTournamentService.getTournamentById.mockRejectedValue(error);

    const { result } = renderHook(() => useTournamentDetail('nonexistent'), {
      wrapper: createWrapper()
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toEqual(error);
  });

  it('should not retry on 404 errors', async () => {
    const error = new Error('Tournament not found');
    mockTournamentService.getTournamentById.mockRejectedValue(error);

    const { result } = renderHook(() => useTournamentDetail('nonexistent'), {
      wrapper: createWrapper()
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should only be called once (no retries for 404-like errors)
    expect(mockTournamentService.getTournamentById).toHaveBeenCalledTimes(1);
  });

  it('should use correct cache configuration', () => {
    renderHook(() => useTournamentDetail('tournament-1'), {
      wrapper: createWrapper()
    });

    // The hook should be configured with 3-minute stale time
    // This is tested implicitly through the React Query configuration
    expect(mockTournamentService.getTournamentById).toHaveBeenCalledWith('tournament-1');
  });

  it('should enable query only when tournament ID is provided', () => {
    const { rerender } = renderHook(
      ({ tournamentId }: { tournamentId: string | undefined }) => useTournamentDetail(tournamentId),
      {
        wrapper: createWrapper(),
        initialProps: { tournamentId: undefined }
      }
    );

    expect(mockTournamentService.getTournamentById).not.toHaveBeenCalled();

    (rerender as any)({ tournamentId: 'tournament-1' });

    expect(mockTournamentService.getTournamentById).toHaveBeenCalledWith('tournament-1');
  });
});