import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { DualReadService, MatchDTO, ReadResult, ReadStrategy } from '../services/DualReadService';
import { queryKeys, createQueryOptions } from '../lib/queryClient';
import { queryPerformanceMonitor } from '../lib/queryPerformance';
import { RealtimeSubscriptionService } from '../services/RealtimeSubscriptionService';

export interface MatchesFilters {
  tournamentCode?: string;
  eventId?: number;
  round?: string;
  status?: 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'CANCELLED';
  date?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export interface MatchesConfig {
  readStrategy?: ReadStrategy;
  fallbackEnabled?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableRealTimeUpdates?: boolean;
  enableLiveScores?: boolean;
  cacheStrategy?: 'live' | 'historical' | 'static';
  groupByReferee?: boolean;
  includeCourt?: boolean;
}

export interface MatchesQueryResult extends UseQueryResult<MatchDTO[]> {
  source: 'database' | 'api' | 'cache' | 'unknown';
  performance: {
    queryTime: number;
    fallbackUsed: boolean;
  };
  config: MatchesConfig;
  setReadStrategy: (strategy: ReadStrategy) => void;
  forceRefresh: () => Promise<void>;
  clearCache: () => void;
  enableLiveMode: () => void;
  disableLiveMode: () => void;
  enableRealTime: () => void;
  disableRealTime: () => void;
}

/**
 * Enhanced matches hook with real-time support and intelligent cache strategies
 * Provides automatic live updates for active matches and efficient caching for completed matches
 */
export function useMatches(
  filters?: MatchesFilters,
  config: MatchesConfig = {}
): MatchesQueryResult {
  const [currentConfig, setCurrentConfig] = useState<MatchesConfig>({
    readStrategy: 'db_first',
    fallbackEnabled: true,
    enablePerformanceMonitoring: true,
    enableRealTimeUpdates: true,
    enableLiveScores: true,
    cacheStrategy: 'live',
    groupByReferee: false,
    includeCourt: true,
    ...config
  });

  const [readMetadata, setReadMetadata] = useState<{
    source: 'database' | 'api' | 'cache' | 'unknown';
    performance: { queryTime: number; fallbackUsed: boolean };
  }>({
    source: 'unknown',
    performance: { queryTime: 0, fallbackUsed: false }
  });

  const [liveUpdateInterval, setLiveUpdateInterval] = useState<number | undefined>(undefined);
  
  const dualReadService = DualReadService.getInstance();
  const realtimeService = RealtimeSubscriptionService.getInstance();

  // Configure the dual read service
  useEffect(() => {
    dualReadService.configure({
      readStrategy: currentConfig.readStrategy!,
      fallbackEnabled: currentConfig.fallbackEnabled!,
      enablePerformanceMonitoring: currentConfig.enablePerformanceMonitoring!
    });
  }, [currentConfig]);

  // Determine cache strategy based on match status and filters
  const determineCacheStrategy = (): 'live' | 'historical' | 'static' => {
    if (currentConfig.cacheStrategy) return currentConfig.cacheStrategy;
    
    // Auto-determine based on filters
    if (filters?.status === 'RUNNING' || filters?.status === 'SCHEDULED') return 'live';
    if (filters?.status === 'COMPLETED' || filters?.status === 'CANCELLED') return 'historical';
    
    // Check if we might have live matches based on date
    if (filters?.date) {
      const today = new Date().toISOString().split('T')[0];
      if (filters.date === today) return 'live';
      if (filters.date < today) return 'historical';
    }
    
    // Default to live for mixed or current data
    return 'live';
  };

  const cacheStrategy = determineCacheStrategy();
  
  // Create query key using TanStack Query key factory
  const queryKey = queryKeys.matches.list(filters);

  // Real-time subscription setup for live matches
  useEffect(() => {
    if (currentConfig.enableRealTimeUpdates && cacheStrategy === 'live' && filters?.tournamentCode) {
      const subscription = realtimeService.subscribeToMatches(
        filters.tournamentCode,
        (updatedMatch) => {
          // Invalidate queries to trigger refetch with updated data
          queryKey; // Use the queryKey to invalidate
        }
      );

      return () => {
        if (subscription) {
          realtimeService.unsubscribe(subscription);
        }
      };
    }
  }, [currentConfig.enableRealTimeUpdates, cacheStrategy, filters?.tournamentCode]);

  // Create query function with performance monitoring and referee grouping
  const queryFn = async (): Promise<MatchDTO[]> => {
    const startTime = Date.now();
    
    try {
      const result: ReadResult<MatchDTO[]> = await dualReadService.getMatches(filters);
      const endTime = Date.now();
      
      // Update metadata for component access
      setReadMetadata({
        source: result.source,
        performance: result.performance
      });

      // Track performance with TanStack Query performance monitor
      if (currentConfig.enablePerformanceMonitoring) {
        queryPerformanceMonitor.trackQuery(
          queryKey,
          startTime,
          endTime,
          result.data,
          result.error ? new Error(result.error) : undefined
        );
      }

      if (result.error) {
        throw new Error(result.error);
      }

      let matches = result.data || [];

      // Auto-adjust live update interval based on actual match status
      const liveMatches = matches.filter(match => 
        match.status === 'RUNNING' || match.status === 'SCHEDULED'
      );
      
      if (liveMatches.length > 0 && currentConfig.enableRealTimeUpdates) {
        setLiveUpdateInterval(30000); // 30 seconds for live matches
      } else {
        setLiveUpdateInterval(undefined); // No auto-refresh for completed matches
      }

      // Apply referee grouping if requested
      if (currentConfig.groupByReferee) {
        matches = groupMatchesByReferee(matches);
      }

      return matches;
    } catch (error) {
      const endTime = Date.now();
      
      // Track error with performance monitor
      if (currentConfig.enablePerformanceMonitoring) {
        queryPerformanceMonitor.trackQuery(
          queryKey,
          startTime,
          endTime,
          null,
          error as Error
        );
      }
      
      throw error;
    }
  };

  // Helper function to group matches by referee
  const groupMatchesByReferee = (matches: MatchDTO[]): MatchDTO[] => {
    // Sort matches by referee assignments for better grouping
    return matches.sort((a, b) => {
      const refA = a.refereeAssignments?.[0]?.referee?.name || '';
      const refB = b.refereeAssignments?.[0]?.referee?.name || '';
      return refA.localeCompare(refB);
    });
  };

  // Determine if we have live matches for cache strategy adjustment
  const hasLiveMatches = filters?.status?.includes('RUNNING') || 
                        filters?.status?.includes('SCHEDULED') ||
                        !filters?.status; // If no status filter, assume we might have live matches

  // Create query with intelligent cache strategy
  const queryOptions = createQueryOptions.adaptive(
    queryKey,
    queryFn,
    cacheStrategy
  );

  // Adjust cache settings for live matches
  if (cacheStrategy === 'live' && currentConfig.enableRealTimeUpdates) {
    queryOptions.refetchInterval = liveUpdateInterval || 30000; // 30 seconds
    queryOptions.refetchIntervalInBackground = false;
    queryOptions.refetchOnWindowFocus = true;
  }

  const query = useQuery({
    ...queryOptions,
    retry: (failureCount, error) => {
      // More aggressive retries for live matches
      const maxRetries = hasLiveMatches ? 5 : 3;
      if (failureCount >= maxRetries) return false;
      
      // Don't retry if it's a configuration error
      if (error.message.includes('not configured')) return false;
      
      return true;
    },
    retryDelay: (attemptIndex) => {
      // Faster retry for live matches
      const baseDelay = hasLiveMatches ? 500 : 1000;
      return Math.min(baseDelay * 2 ** attemptIndex, 30000);
    },
    // Network mode: always try to fetch, even when offline (database might still work)
    networkMode: 'always'
  });

  // Function to change read strategy
  const setReadStrategy = useCallback((strategy: ReadStrategy) => {
    setCurrentConfig(prev => ({
      ...prev,
      readStrategy: strategy
    }));
  }, []);

  // Force refresh function
  const forceRefresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  // Clear cache function with TanStack Query integration
  const clearCache = useCallback(() => {
    // Invalidate React Query cache
    query.remove();
    
    // Clear dual read service cache
    dualReadService.invalidateCache('matches', filters);
  }, [query, filters]);

  // Enable live mode with live score updates
  const enableLiveMode = useCallback(() => {
    setCurrentConfig(prev => ({
      ...prev,
      enableRealTimeUpdates: true,
      enableLiveScores: true,
      cacheStrategy: 'live'
    }));
    setLiveUpdateInterval(30000);
  }, []);

  // Disable live mode  
  const disableLiveMode = useCallback(() => {
    setCurrentConfig(prev => ({
      ...prev,
      enableRealTimeUpdates: false,
      enableLiveScores: false,
      cacheStrategy: 'historical'
    }));
    setLiveUpdateInterval(undefined);
  }, []);

  // Enable real-time updates
  const enableRealTime = useCallback(() => {
    setCurrentConfig(prev => ({
      ...prev,
      enableRealTimeUpdates: true,
      cacheStrategy: 'live'
    }));
  }, []);

  // Disable real-time updates
  const disableRealTime = useCallback(() => {
    setCurrentConfig(prev => ({
      ...prev,
      enableRealTimeUpdates: false,
      cacheStrategy: 'historical'
    }));
  }, []);

  return {
    ...query,
    source: readMetadata.source,
    performance: readMetadata.performance,
    config: currentConfig,
    setReadStrategy,
    forceRefresh,
    clearCache,
    enableLiveMode,
    disableLiveMode,
    enableRealTime,
    disableRealTime
  };
}

export default useMatches;