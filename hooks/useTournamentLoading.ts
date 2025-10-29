/**
 * Tournament Loading Hook
 * Manages tournament loading state with finite state machine
 * Prevents invalid state combinations (e.g., loading + empty simultaneously)
 */

import { useState, useCallback } from 'react';
import {
  TournamentLoadingState,
  TournamentLoadingContext,
  LoadingStateChecks,
  APIErrorState
} from '../types';

/**
 * Hook return type
 */
export interface UseTournamentLoadingReturn {
  // State
  loadingState: TournamentLoadingState;
  context: TournamentLoadingContext;

  // State checks (convenience)
  isLoading: boolean;
  isEmpty: boolean;
  hasError: boolean;
  hasData: boolean;

  // State transitions
  setLoading: () => void;
  setLoaded: (tournamentCount: number) => void;
  setEmpty: () => void;
  setError: (error: APIErrorState) => void;
  reset: () => void;
}

/**
 * Initial state
 */
const INITIAL_CONTEXT: TournamentLoadingContext = {
  state: 'idle',
  error: null,
  lastFetchTime: null,
  tournamentCount: 0
};

/**
 * Tournament loading state management hook
 *
 * @example
 * ```tsx
 * function TournamentList() {
 *   const {
 *     loadingState,
 *     isLoading,
 *     isEmpty,
 *     hasError,
 *     setLoading,
 *     setLoaded,
 *     setEmpty,
 *     setError
 *   } = useTournamentLoading();
 *
 *   useEffect(() => {
 *     const fetchTournaments = async () => {
 *       setLoading();
 *
 *       try {
 *         const data = await api.getTournaments();
 *
 *         if (data.length === 0) {
 *           setEmpty();
 *         } else {
 *           setLoaded(data.length);
 *         }
 *       } catch (error) {
 *         const apiError = errorTransformService.transformError(error);
 *         setError(apiError);
 *       }
 *     };
 *
 *     fetchTournaments();
 *   }, []);
 *
 *   if (isLoading) return <TournamentLoadingSkeleton />;
 *   if (isEmpty) return <EmptyTournamentState />;
 *   if (hasError) return <ErrorState error={context.error} />;
 *
 *   return <TournamentGrid />;
 * }
 * ```
 */
export function useTournamentLoading(): UseTournamentLoadingReturn {
  const [context, setContext] = useState<TournamentLoadingContext>(INITIAL_CONTEXT);

  /**
   * Transition to 'loading' state
   */
  const setLoading = useCallback(() => {
    setContext(prev => ({
      ...prev,
      state: 'loading',
      error: null
    }));
  }, []);

  /**
   * Transition to 'loaded' state
   * @param tournamentCount - Number of tournaments loaded (must be > 0)
   */
  const setLoaded = useCallback((tournamentCount: number) => {
    if (tournamentCount <= 0) {
      console.warn('[useTournamentLoading] setLoaded called with count <= 0, use setEmpty instead');
      setContext(prev => ({
        ...prev,
        state: 'empty',
        error: null,
        lastFetchTime: Date.now(),
        tournamentCount: 0
      }));
      return;
    }

    setContext(prev => ({
      ...prev,
      state: 'loaded',
      error: null,
      lastFetchTime: Date.now(),
      tournamentCount
    }));
  }, []);

  /**
   * Transition to 'empty' state (no tournaments found)
   */
  const setEmpty = useCallback(() => {
    setContext(prev => ({
      ...prev,
      state: 'empty',
      error: null,
      lastFetchTime: Date.now(),
      tournamentCount: 0
    }));
  }, []);

  /**
   * Transition to 'error' state
   * @param error - User-friendly API error
   */
  const setError = useCallback((error: APIErrorState) => {
    setContext(prev => ({
      ...prev,
      state: 'error',
      error,
      lastFetchTime: null
    }));
  }, []);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setContext(INITIAL_CONTEXT);
  }, []);

  return {
    // State
    loadingState: context.state,
    context,

    // State checks
    isLoading: LoadingStateChecks.isLoading(context.state),
    isEmpty: LoadingStateChecks.isEmpty(context.state),
    hasError: LoadingStateChecks.hasError(context.state),
    hasData: LoadingStateChecks.hasData(context.state),

    // State transitions
    setLoading,
    setLoaded,
    setEmpty,
    setError,
    reset
  };
}
