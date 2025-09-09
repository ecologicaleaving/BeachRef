import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { DualReadService, TournamentDTO, ReadResult, ReadStrategy } from '../services/DualReadService';
import { queryKeys, createQueryOptions } from '../lib/queryClient';
import { queryPerformanceMonitor } from '../lib/queryPerformance';

export interface TournamentsFilters {
  season?: number;
  gender?: 'M' | 'W';
  country?: string;
  status?: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export interface TournamentsConfig {
  readStrategy?: ReadStrategy;
  fallbackEnabled?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableRealTimeUpdates?: boolean;
  cacheStrategy?: 'live' | 'historical' | 'static';
}

export interface TournamentsQueryResult extends UseQueryResult<TournamentDTO[]> {
  source: 'database' | 'api' | 'cache' | 'unknown';
  performance: {
    queryTime: number;
    fallbackUsed: boolean;
  };
  config: TournamentsConfig;
  setReadStrategy: (strategy: ReadStrategy) => void;
  forceRefresh: () => Promise<void>;
  clearCache: () => void;
  enableRealTime: () => void;
  disableRealTime: () => void;
}

/**
 * Enhanced tournaments hook with TanStack Query integration
 * Provides intelligent cache strategies, performance monitoring, and VIS Adapter integration
 */
export function useTournaments(
  filters?: TournamentsFilters,
  config: TournamentsConfig = {}
): TournamentsQueryResult {
  const [currentConfig, setCurrentConfig] = useState<TournamentsConfig>({
    readStrategy: 'db_first',
    fallbackEnabled: true,
    enablePerformanceMonitoring: true,
    enableRealTimeUpdates: true,
    cacheStrategy: 'live',
    ...config
  });

  const [readMetadata, setReadMetadata] = useState<{
    source: 'database' | 'api' | 'cache' | 'unknown';
    performance: { queryTime: number; fallbackUsed: boolean };
  }>({
    source: 'unknown',
    performance: { queryTime: 0, fallbackUsed: false }
  });

  const dualReadService = DualReadService.getInstance();

  // Configure the dual read service
  useEffect(() => {
    dualReadService.configure({
      readStrategy: currentConfig.readStrategy!,
      fallbackEnabled: currentConfig.fallbackEnabled!,
      enablePerformanceMonitoring: currentConfig.enablePerformanceMonitoring!
    });
  }, [currentConfig]);

  // Determine cache strategy based on tournament status
  const determineCacheStrategy = (): 'live' | 'historical' | 'static' => {
    if (currentConfig.cacheStrategy) return currentConfig.cacheStrategy;
    
    // Auto-determine based on filters
    if (filters?.status === 'ACTIVE') return 'live';
    if (filters?.status === 'COMPLETED') return 'historical';
    if (filters?.status === 'CANCELLED') return 'historical';
    
    // Default to live for mixed or upcoming tournaments
    return 'live';
  };

  const cacheStrategy = determineCacheStrategy();
  
  // Create query key using TanStack Query key factory
  const queryKey = queryKeys.tournaments.list(filters);

  // Create query function with performance monitoring
  const queryFn = async (): Promise<TournamentDTO[]> => {
    const startTime = Date.now();
    
    try {
      const result: ReadResult<TournamentDTO[]> = await dualReadService.getTournaments(filters);
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

      return result.data || [];
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

  // Create query with intelligent cache strategy
  const queryOptions = createQueryOptions.adaptive(
    queryKey,
    queryFn,
    cacheStrategy
  );

  // Add real-time updates for active tournaments
  if (cacheStrategy === 'live' && currentConfig.enableRealTimeUpdates) {
    queryOptions.refetchInterval = 30000; // 30 seconds
    queryOptions.refetchIntervalInBackground = false;
  }

  const query = useQuery({
    ...queryOptions,
    retry: (failureCount, error) => {
      // Retry logic: max 3 retries, exponential backoff
      if (failureCount >= 3) return false;
      
      // Don't retry if it's a configuration error
      if (error.message.includes('not configured')) return false;
      
      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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
    dualReadService.invalidateCache('tournaments', filters);
  }, [query, filters]);

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
    enableRealTime,
    disableRealTime
  };
}

export default useTournaments;