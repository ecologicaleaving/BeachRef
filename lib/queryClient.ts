import { QueryClient } from '@tanstack/react-query';

// Cache strategy configuration for different data types
export const cacheStrategies = {
  // Live data (today/yesterday, active tournaments/matches)
  live: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes  
    refetchInterval: 30 * 1000, // 30 seconds
    refetchIntervalInBackground: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
  },
  
  // Historical data (completed tournaments/matches)
  historical: {
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  },
  
  // Static reference data (referee info, tournament metadata)
  static: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  },
  
  // Default strategy for mixed data
  default: {
    staleTime: 30 * 1000, // 30s for live data
    gcTime: 60 * 60 * 1000, // 1h garbage collection
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
  }
} as const;

// QueryClient configuration matching current cache patterns
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      ...cacheStrategies.default,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
  },
});

// Query key patterns aligned with current cache service patterns
export const queryKeys = {
  tournaments: {
    all: ['tournaments'] as const,
    lists: () => ['tournaments', 'list'] as const,
    list: (params?: { season?: number; gender?: 'M' | 'W' }) => ['tournaments', 'list', params] as const,
    details: () => ['tournaments', 'detail'] as const,
    detail: (id: string) => ['tournaments', 'detail', id] as const,
  },
  matches: {
    all: ['matches'] as const,
    lists: () => ['matches', 'list'] as const,
    list: (params?: { tournamentCode?: string; eventId?: number }) => ['matches', 'list', params] as const,
    details: () => ['matches', 'detail'] as const,
    detail: (id: string) => ['matches', 'detail', id] as const,
    byTournament: (tournamentId: string) => ['matches', 'tournament', tournamentId] as const,
  },
  referees: {
    all: ['referees'] as const,
    lists: () => ['referees', 'list'] as const,
    list: (params?: { 
      tournamentCodes?: string[];
      federationCode?: string;
      status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'RESTRICTED';
      assignmentStatus?: 'assigned' | 'available' | 'all';
    }) => ['referees', 'list', params] as const,
    details: () => ['referees', 'detail'] as const,
    detail: (id: string) => ['referees', 'detail', id] as const,
    assignments: () => ['referees', 'assignments'] as const,
    assignment: (params?: { tournamentCode?: string }) => ['referees', 'assignments', params] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    dashboard: (params?: { 
      timeRange?: { start: string; end: string }; 
      config?: any 
    }) => ['analytics', 'dashboard', params] as const,
    tournaments: () => ['analytics', 'tournaments'] as const,
    tournamentMetrics: (params?: { 
      tournamentCodes?: string[]; 
      dateRange?: { start: string; end: string } 
    }) => ['analytics', 'tournaments', 'metrics', params] as const,
    referees: () => ['analytics', 'referees'] as const,
    refereePerformance: (params?: {
      refereeIds?: string[];
      tournamentCodes?: string[];
      dateRange?: { start: string; end: string };
      performanceThreshold?: number;
      roleTypes?: ('FIRST' | 'SECOND' | 'CHALLENGE')[];
      federationCode?: string;
      includeTrends?: boolean;
    }) => ['analytics', 'referees', 'performance', params] as const,
    workload: (params?: { tournamentCode?: string; dateRange?: { start: string; end: string } }) => 
      ['analytics', 'referees', 'workload', params] as const,
  },
} as const;

// Query options factory for intelligent cache strategies
export const createQueryOptions = {
  /**
   * Creates query options for live/active data
   */
  live: <T>(queryKey: unknown[], queryFn: () => Promise<T>) => ({
    queryKey,
    queryFn,
    ...cacheStrategies.live,
  }),
  
  /**
   * Creates query options for historical/completed data
   */
  historical: <T>(queryKey: unknown[], queryFn: () => Promise<T>) => ({
    queryKey,
    queryFn,
    ...cacheStrategies.historical,
  }),
  
  /**
   * Creates query options for static reference data
   */
  static: <T>(queryKey: unknown[], queryFn: () => Promise<T>) => ({
    queryKey,
    queryFn,
    ...cacheStrategies.static,
  }),

  /**
   * Creates adaptive query options based on data characteristics
   */
  adaptive: <T>(
    queryKey: unknown[], 
    queryFn: () => Promise<T>,
    dataType: 'live' | 'historical' | 'static' = 'live'
  ) => ({
    queryKey,
    queryFn,
    ...cacheStrategies[dataType],
  }),
};

// Background refetch management
export const backgroundRefetch = {
  /**
   * Enable background refetch for active tournaments
   */
  enableForActiveTournaments: (tournamentIds: string[]) => {
    tournamentIds.forEach(id => {
      queryClient.refetchQueries({
        queryKey: queryKeys.tournaments.detail(id),
      });
    });
  },

  /**
   * Enable background refetch for live matches
   */
  enableForLiveMatches: (matchIds: string[]) => {
    matchIds.forEach(id => {
      queryClient.refetchQueries({
        queryKey: queryKeys.matches.detail(id),
      });
    });
  },

  /**
   * Disable background refetch for completed events
   */
  disableForCompleted: (queryKey: unknown[]) => {
    queryClient.setQueriesData(
      { queryKey },
      (oldData) => oldData
    );
  },
};

// Cache invalidation helpers
export const invalidateQueries = {
  tournaments: () => queryClient.invalidateQueries({ queryKey: ['tournaments'] }),
  matches: () => queryClient.invalidateQueries({ queryKey: ['matches'] }),
  referees: () => queryClient.invalidateQueries({ queryKey: ['referees'] }),
  analytics: () => queryClient.invalidateQueries({ queryKey: ['analytics'] }),
  all: () => queryClient.invalidateQueries(),
};

// Intelligent cache garbage collection
export const cacheGarbageCollection = {
  /**
   * Remove old completed tournament data
   */
  removeOldTournaments: (olderThanDays: number = 7) => {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    queryClient.getQueryCache().getAll().forEach(query => {
      if (query.queryKey[0] === 'tournaments' && 
          query.state.dataUpdatedAt < cutoffTime) {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });
  },

  /**
   * Remove old historical match data
   */
  removeOldMatches: (olderThanDays: number = 3) => {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    queryClient.getQueryCache().getAll().forEach(query => {
      if (query.queryKey[0] === 'matches' && 
          query.state.dataUpdatedAt < cutoffTime) {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });
  },

  /**
   * Perform comprehensive cache cleanup
   */
  performCleanup: () => {
    cacheGarbageCollection.removeOldTournaments(7);
    cacheGarbageCollection.removeOldMatches(3);
    queryClient.getQueryCache().clear();
  },
};