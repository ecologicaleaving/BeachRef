/**
 * Loading state management for tournament data fetching
 * Prevents ambiguous state combinations (e.g., loading + empty simultaneously)
 */

/**
 * Represents the loading state of tournament data fetching.
 * Finite state machine with clear transitions.
 */
export type TournamentLoadingState =
  | 'idle'      // Initial state, no fetch attempted
  | 'loading'   // Data fetch in progress
  | 'loaded'    // Data successfully fetched (>0 tournaments)
  | 'empty'     // Data fetch complete, no tournaments found
  | 'error';    // Data fetch failed (API error, timeout, network failure)

/**
 * Container for tournament loading state with error details.
 * Used by useTournamentLoading hook and TournamentService.
 */
export interface TournamentLoadingContext {
  state: TournamentLoadingState;
  error: import('./api-error').APIErrorState | null;
  lastFetchTime: number | null;  // Timestamp of last successful fetch
  tournamentCount: number;        // Number of tournaments loaded
}

/**
 * Helper type guards for type-safe state checks.
 */
export const LoadingStateChecks = {
  isLoading: (state: TournamentLoadingState): boolean => state === 'loading',
  isEmpty: (state: TournamentLoadingState): boolean => state === 'empty',
  hasError: (state: TournamentLoadingState): boolean => state === 'error',
  hasData: (state: TournamentLoadingState): boolean => state === 'loaded'
} as const;
