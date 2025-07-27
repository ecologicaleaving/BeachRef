import { useQuery } from '@tanstack/react-query';
import { tournamentService } from '@/services/tournament.service';
import type { TournamentDetailResponse } from '@/types/tournament.types';

export function useTournamentDetail(tournamentId: string | undefined) {
  return useQuery<TournamentDetailResponse, Error>({
    queryKey: ['tournament', tournamentId],
    queryFn: () => {
      if (!tournamentId) {
        throw new Error('Tournament ID is required');
      }
      return tournamentService.getTournamentById(tournamentId);
    },
    enabled: !!tournamentId,
    staleTime: 3 * 60 * 1000, // 3 minutes cache (per story requirements)
    retry: (failureCount, error) => {
      // Don't retry on 404 errors
      if (error.message.includes('not found')) return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}