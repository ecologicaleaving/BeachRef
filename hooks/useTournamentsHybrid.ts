import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { DualReadService, TournamentDTO, ReadResult, ReadStrategy } from '../services/DualReadService';
import { queryPerformanceMonitor } from '../lib/queryPerformance';
import { isDbReadEnabled } from '../services/flags/DbReadFlags';

export interface TournamentsFilters {
  season?: number;
  gender?: 'M' | 'W';
  country?: string;
  status?: string;
}

export interface TournamentsHybridConfig {
  readStrategy?: ReadStrategy;
  fallbackEnabled?: boolean;
  enablePerformanceMonitoring?: boolean;
  cacheTime?: number;
  staleTime?: number;
  refetchInterval?: number;
}

export interface TournamentsQueryResult extends UseQueryResult<TournamentDTO[]> {
  source: 'database' | 'api' | 'cache' | 'unknown';
  performance: {
    queryTime: number;
    fallbackUsed: boolean;
  };
  config: TournamentsHybridConfig;
  setReadStrategy: (strategy: ReadStrategy) => void;
  forceRefresh: () => Promise<void>;
  clearCache: () => void;
}

/**
 * Hybrid hook for tournaments data using dual-read strategy
 * Automatically switches between database and API based on configuration
 * and availability, with performance monitoring and fallback capabilities
 */
export function useTournamentsHybrid(
  filters?: TournamentsFilters,
  config: TournamentsHybridConfig = {}
): TournamentsQueryResult {
  const [currentConfig, setCurrentConfig] = useState<TournamentsHybridConfig>({
    readStrategy: 'db_first',
    fallbackEnabled: true,
    enablePerformanceMonitoring: true,
    cacheTime: 1000 * 60 * 60, // 1 hour
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchInterval: undefined, // No auto-refetch by default
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
    // Gated by the issue #54 flag: whatever strategy the caller asked for, the
    // database is consulted only when 'tournaments' has been switched on.
    // Otherwise the strategy is forced to 'api_only' — which is what this hook
    // effectively did before, by throwing in the constructor.
    dualReadService.configure({
      readStrategy: isDbReadEnabled('tournaments') ? currentConfig.readStrategy! : 'api_only',
      fallbackEnabled: currentConfig.fallbackEnabled!,
      enablePerformanceMonitoring: currentConfig.enablePerformanceMonitoring!
    });
  }, [currentConfig]);

  // Create stable query key
  const queryKey = [
    'tournaments-hybrid', 
    filters, 
    currentConfig.readStrategy,
    currentConfig.fallbackEnabled
  ];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<TournamentDTO[]> => {
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
    },
    gcTime: currentConfig.cacheTime,
    staleTime: currentConfig.staleTime,
    refetchInterval: currentConfig.refetchInterval,
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

  // Clear cache function
  const clearCache = useCallback(() => {
    // Invalidate React Query cache
    query.remove();
    
    // Clear dual read service cache
    dualReadService.invalidateCache('tournaments', filters);
  }, [query, filters]);

  return {
    ...query,
    source: readMetadata.source,
    performance: readMetadata.performance,
    config: currentConfig,
    setReadStrategy,
    forceRefresh,
    clearCache
  };
}

export default useTournamentsHybrid;