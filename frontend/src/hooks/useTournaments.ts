import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tournamentService } from '@/services/tournament.service';
import type { TournamentQueryParams } from '@/types/tournament.types';


export function useTournaments(params: TournamentQueryParams = {}) {
  return useQuery({
    queryKey: ['tournaments', params],
    queryFn: () => tournamentService.getTournaments(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
    retry: (failureCount, error) => {
      // Retry up to 3 times for network errors, but not for 4xx errors
      if (failureCount >= 3) return false;
      if (error instanceof Error && error.message.includes('40')) return false;
      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useTournament(id: string) {
  return useQuery({
    queryKey: ['tournament', id],
    queryFn: () => tournamentService.getTournamentById(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!id,
    retry: (failureCount, error) => {
      // Don't retry for 404 errors
      if (error instanceof Error && error.message.includes('not found')) return false;
      if (failureCount >= 3) return false;
      if (error instanceof Error && error.message.includes('40')) return false;
      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useTournamentsPrefetch() {
  const queryClient = useQueryClient();

  const prefetchTournaments = (params: TournamentQueryParams = {}) => {
    return queryClient.prefetchQuery({
      queryKey: ['tournaments', params],
      queryFn: () => tournamentService.getTournaments(params),
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchTournament = (id: string) => {
    return queryClient.prefetchQuery({
      queryKey: ['tournament', id],
      queryFn: () => tournamentService.getTournamentById(id),
      staleTime: 5 * 60 * 1000,
    });
  };

  return {
    prefetchTournaments,
    prefetchTournament,
  };
}