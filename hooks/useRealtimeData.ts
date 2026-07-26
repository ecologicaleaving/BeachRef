import { useEffect, useState, useCallback, useRef } from 'react';
import { BeachMatch } from '../types/match';
import { VisApiClient, DEFAULT_RETRY_CONFIG } from '../services/api/VisApiClient';
import { CacheServiceCompatibility as CacheService } from './compatibility/CacheServiceCompatibility';
import { useRealtimeSubscription } from './useRealtimeSubscription';

/**
 * Hook that combines data fetching with real-time updates
 * Automatically refreshes data when real-time updates are received
 */
export const useRealtimeMatches = (tournamentNo: string | null, enabled: boolean = true) => {
  const [matches, setMatches] = useState<BeachMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const refreshTimeoutRef = useRef<TimerHandle>();
  
  const visApiClient = new VisApiClient({
    baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
    timeoutMs: 10000,
    maxRetries: 3,
    retryDelayMs: 1000,
    exponentialBackoff: true,
    // No custom headers on purpose: any header outside the CORS safelist makes
    // the POST non-simple, and the VIS preflight is not cacheable — every
    // request would cost two round trips. See VisApiClientConfig.headers (#67).
    enableLogging: true
  }, DEFAULT_RETRY_CONFIG);

  // Use real-time subscription hook
  const {
    connectionState,
    isSubscribed,
    isConnected,
    subscriptionError,
  } = useRealtimeSubscription(tournamentNo, enabled);

  // Fetch matches data
  const fetchMatches = useCallback(async (tournamentNumber: string, force: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      
      // Use CacheService for efficient data fetching
      let matchList: BeachMatch[];
      if (force) {
        // Force refresh from API
        await CacheService.invalidateMatchCache(tournamentNumber);
        matchList = await visApiClient.fetchMatchesForTournament(tournamentNumber);
      } else {
        // Use cached data if available
        matchList = await visApiClient.fetchMatchesForTournament(tournamentNumber);
      }

      setMatches(matchList);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load matches';
      setError(errorMessage);
      // console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced refresh function to prevent excessive API calls
  const debouncedRefresh = useCallback((tournamentNumber: string, delay: number = 2000) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      fetchMatches(tournamentNumber, true);
    }, delay);
  }, [fetchMatches]);

  // Manual refresh function
  const refresh = useCallback(() => {
    if (tournamentNo) {
      fetchMatches(tournamentNo, true);
    }
  }, [tournamentNo, fetchMatches]);

  // Initial load
  useEffect(() => {
    if (tournamentNo && enabled) {
      fetchMatches(tournamentNo);
    }
  }, [tournamentNo, enabled, fetchMatches]);

  // Set up cache invalidation listener for real-time updates
  useEffect(() => {
    if (!tournamentNo || !isConnected) return;

    // Listen for cache invalidation events (triggered by real-time updates)
    // TODO: Implement event listener when event system is available
    // For now, we rely on the real-time service's cache invalidation

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [tournamentNo, isConnected, debouncedRefresh]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Get live matches from the current data
  const liveMatches = matches.filter(match => {
    const status = match.Status?.toLowerCase();
    return status === 'live' || status === 'inprogress' || status === 'running';
  });

  return {
    matches,
    liveMatches,
    loading,
    error: error || subscriptionError,
    lastUpdated,
    connectionState,
    isConnected,
    isSubscribed,
    hasLiveMatches: liveMatches.length > 0,
    refresh,
  };
};

/**
 * Hook for managing real-time tournament data
 */
export const useRealtimeTournament = (tournament: Tournament | null, enabled: boolean = true) => {
  const [tournamentData, setTournamentData] = useState<Tournament | null>(tournament);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tournamentNo = tournament?.No || null;

  // Use real-time subscription
  const {
    connectionState,
    isSubscribed,
    isConnected,
    subscriptionError,
  } = useRealtimeSubscription(tournamentNo, enabled);

  // Fetch tournament details
  const fetchTournamentData = useCallback(async (_tournamentNumber: string) => {
    try {
      setLoading(true);
      setError(null);

      // For now, we'll use the existing tournament data
      // In the future, this could be enhanced to fetch fresh tournament details
      // TODO: Use _tournamentNumber to fetch specific tournament data from API

      setTournamentData(tournament);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tournament';
      setError(errorMessage);
      // console.error('Error fetching tournament:', err);
    } finally {
      setLoading(false);
    }
  }, [tournament]);

  // Refresh tournament data when connected
  useEffect(() => {
    if (tournamentNo && isConnected && enabled) {
      fetchTournamentData(tournamentNo);
    }
  }, [tournamentNo, isConnected, enabled, fetchTournamentData]);

  const refresh = useCallback(() => {
    if (tournamentNo) {
      fetchTournamentData(tournamentNo);
    }
  }, [tournamentNo, fetchTournamentData]);

  return {
    tournament: tournamentData,
    loading,
    error: error || subscriptionError,
    connectionState,
    isConnected,
    isSubscribed,
    refresh,
  };
};

/**
 * Hook for components that need both matches and tournament real-time updates
 */
export const useRealtimeTournamentData = (
  tournament: Tournament | null, 
  enabled: boolean = true
) => {
  const tournamentNo = tournament?.No || null;

  const matchesData = useRealtimeMatches(tournamentNo, enabled);
  const tournamentData = useRealtimeTournament(tournament, enabled);

  return {
    // Matches data
    matches: matchesData.matches,
    liveMatches: matchesData.liveMatches,
    hasLiveMatches: matchesData.hasLiveMatches,
    matchesLoading: matchesData.loading,
    matchesError: matchesData.error,
    lastUpdated: matchesData.lastUpdated,
    
    // Tournament data
    tournamentDetails: tournamentData.tournament,
    tournamentLoading: tournamentData.loading,
    tournamentError: tournamentData.error,
    
    // Real-time connection status
    connectionState: matchesData.connectionState,
    isConnected: matchesData.isConnected,
    isSubscribed: matchesData.isSubscribed,
    
    // Actions
    refreshMatches: matchesData.refresh,
    refreshTournament: tournamentData.refresh,
    refreshAll: () => {
      matchesData.refresh();
      tournamentData.refresh();
    },
  };
};