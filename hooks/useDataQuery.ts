/**
 * Consolidated Data Query Hook
 * Part of State Management Hooks Consolidation Refactoring
 * Replaces multiple data fetching hooks with a unified, configurable solution
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { ErrorReportingService } from '../services/error/ErrorReportingService';

// ================================
// Configuration Types
// ================================

export type DataSource = 'database' | 'api' | 'hybrid' | 'unknown';

export type ReadStrategy =
  | 'database-first'    // Try database first, fallback to API
  | 'api-first'        // Try API first, fallback to database
  | 'hybrid'           // Use DualReadService for parallel reads
  | 'cache-first'      // Use cache, fallback to preferred source
  | 'fresh-only';      // Always fetch from source, skip cache

export type CacheStrategy =
  | 'live'            // Frequently changing data (matches, assignments)
  | 'historical'      // Rarely changing data (completed tournaments)
  | 'static'          // Almost never changing (tournament metadata)
  | 'user-preference' // User-specific cached data
  | 'session';        // Session-scoped data

export interface DataQueryConfig<T> {
  // Read strategy configuration
  readStrategy: ReadStrategy;
  cacheStrategy: CacheStrategy;

  // Data source functions
  databaseQuery?: () => Promise<T>;
  apiQuery?: () => Promise<T>;
  hybridQuery?: () => Promise<T>;

  // Fallback configuration
  enableFallback: boolean;
  fallbackDelay: number;

  // Retry configuration
  maxRetries: number;
  retryDelay: number;
  retryDelayMultiplier: number;

  // Cache configuration
  staleTime: number;
  cacheTime: number;
  refetchOnWindowFocus: boolean;
  refetchInterval?: number;

  // Performance monitoring
  enablePerformanceTracking: boolean;
  enableFallbackLogging: boolean;

  // Context for error reporting
  queryContext?: Record<string, any>;
}

export interface QueryMetadata {
  source: DataSource;
  performance: {
    queryTime: number;
    fallbackUsed: boolean;
    retryCount: number;
    cacheHit: boolean;
  };
  lastExecuted: string;
  config: Partial<DataQueryConfig<any>>;
}

export interface DataQueryResult<T> extends QueryMetadata {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
  isFetching: boolean;
  isRefetching: boolean;
  forceRefresh: () => Promise<void>;
  updateConfig: (newConfig: Partial<DataQueryConfig<T>>) => void;
}

// ================================
// Default Configurations
// ================================

const DEFAULT_CONFIG: DataQueryConfig<any> = {
  readStrategy: 'database-first',
  cacheStrategy: 'live',
  enableFallback: true,
  fallbackDelay: 2000,
  maxRetries: 3,
  retryDelay: 1000,
  retryDelayMultiplier: 1.5,
  staleTime: 5 * 60 * 1000,  // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: true,
  enablePerformanceTracking: true,
  enableFallbackLogging: true
};

const CACHE_STRATEGY_CONFIGS: Record<CacheStrategy, Partial<DataQueryConfig<any>>> = {
  live: {
    staleTime: 30 * 1000,      // 30 seconds
    cacheTime: 2 * 60 * 1000,  // 2 minutes
    refetchInterval: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true
  },
  historical: {
    staleTime: 60 * 60 * 1000,  // 1 hour
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false
  },
  static: {
    staleTime: 24 * 60 * 60 * 1000,  // 24 hours
    cacheTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    refetchOnWindowFocus: false
  },
  'user-preference': {
    staleTime: 10 * 60 * 1000,  // 10 minutes
    cacheTime: 60 * 60 * 1000,  // 1 hour
    refetchOnWindowFocus: true
  },
  session: {
    staleTime: 5 * 60 * 1000,   // 5 minutes
    cacheTime: 30 * 60 * 1000,  // 30 minutes
    refetchOnWindowFocus: true
  }
};

// ================================
// Main Hook
// ================================

export function useDataQuery<T>(
  queryKey: string | (string | number)[],
  config: Partial<DataQueryConfig<T>>,
  options?: Partial<UseQueryOptions<T>>
): DataQueryResult<T> {
  const errorReporting = ErrorReportingService.getInstance();

  // Merge configuration with defaults
  const mergedConfig = useMemo(() => {
    const baseConfig = { ...DEFAULT_CONFIG, ...config };
    const cacheConfig = CACHE_STRATEGY_CONFIGS[baseConfig.cacheStrategy];
    return { ...baseConfig, ...cacheConfig, ...config };
  }, [config]);

  // Mutable config state for runtime updates
  const [currentConfig, setCurrentConfig] = useState(mergedConfig);

  // Query metadata state
  const [queryMetadata, setQueryMetadata] = useState<QueryMetadata>({
    source: 'unknown',
    performance: {
      queryTime: 0,
      fallbackUsed: false,
      retryCount: 0,
      cacheHit: false
    },
    lastExecuted: new Date().toISOString(),
    config: currentConfig
  });

  // Main query function with unified logic
  const queryFunction = useCallback(async (): Promise<T> => {
    const startTime = Date.now();
    let fallbackUsed = false;
    let retryCount = 0;
    let source: DataSource = 'unknown';

    const executeQuery = async (
      queryFn: () => Promise<T>,
      sourceName: DataSource,
      isRetry = false
    ): Promise<T> => {
      try {
        if (!isRetry) {
          source = sourceName;
        }

        const result = await queryFn();

        // Update metadata on success
        const queryTime = Date.now() - startTime;
        setQueryMetadata(prev => ({
          ...prev,
          source: sourceName,
          performance: {
            ...prev.performance,
            queryTime,
            fallbackUsed,
            retryCount,
            cacheHit: false // Will be updated by TanStack Query if cache hit
          },
          lastExecuted: new Date().toISOString()
        }));

        return result;
      } catch (error) {
        // Report error for monitoring
        await errorReporting.reportError(error as Error, {
          queryKey: Array.isArray(queryKey) ? queryKey.join('-') : queryKey,
          source: sourceName,
          retryCount,
          ...currentConfig.queryContext
        });

        throw error;
      }
    };

    // Execute based on read strategy
    try {
      switch (currentConfig.readStrategy) {
        case 'database-first':
          if (currentConfig.databaseQuery) {
            try {
              return await executeQuery(currentConfig.databaseQuery, 'database');
            } catch (error) {
              if (currentConfig.enableFallback && currentConfig.apiQuery) {
                fallbackUsed = true;
                if (currentConfig.enableFallbackLogging) {
                  console.warn(`Database query failed, falling back to API:`, error);
                }
                // Add fallback delay
                await new Promise(resolve => setTimeout(resolve, currentConfig.fallbackDelay));
                return await executeQuery(currentConfig.apiQuery, 'api');
              }
              throw error;
            }
          }
          break;

        case 'api-first':
          if (currentConfig.apiQuery) {
            try {
              return await executeQuery(currentConfig.apiQuery, 'api');
            } catch (error) {
              if (currentConfig.enableFallback && currentConfig.databaseQuery) {
                fallbackUsed = true;
                if (currentConfig.enableFallbackLogging) {
                  console.warn(`API query failed, falling back to database:`, error);
                }
                await new Promise(resolve => setTimeout(resolve, currentConfig.fallbackDelay));
                return await executeQuery(currentConfig.databaseQuery, 'database');
              }
              throw error;
            }
          }
          break;

        case 'hybrid':
          if (currentConfig.hybridQuery) {
            return await executeQuery(currentConfig.hybridQuery, 'hybrid');
          }
          break;

        case 'cache-first':
          // TanStack Query handles cache-first automatically
          const preferredQuery = currentConfig.databaseQuery || currentConfig.apiQuery;
          if (preferredQuery) {
            source = currentConfig.databaseQuery ? 'database' : 'api';
            return await executeQuery(preferredQuery, source);
          }
          break;

        case 'fresh-only':
          const freshQuery = currentConfig.apiQuery || currentConfig.databaseQuery;
          if (freshQuery) {
            source = currentConfig.apiQuery ? 'api' : 'database';
            return await executeQuery(freshQuery, source);
          }
          break;
      }

      throw new Error(`No query function available for strategy: ${currentConfig.readStrategy}`);

    } catch (error) {
      // Handle retries
      if (retryCount < currentConfig.maxRetries) {
        retryCount++;
        const delay = currentConfig.retryDelay * Math.pow(currentConfig.retryDelayMultiplier, retryCount - 1);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Retry with the same strategy
        return queryFunction();
      }

      // Final error - update metadata
      setQueryMetadata(prev => ({
        ...prev,
        source,
        performance: {
          ...prev.performance,
          queryTime: Date.now() - startTime,
          fallbackUsed,
          retryCount
        },
        lastExecuted: new Date().toISOString()
      }));

      throw error;
    }
  }, [currentConfig, queryKey, errorReporting]);

  // TanStack Query integration
  const queryResult = useQuery({
    queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
    queryFn: queryFunction,
    staleTime: currentConfig.staleTime,
    cacheTime: currentConfig.cacheTime,
    refetchOnWindowFocus: currentConfig.refetchOnWindowFocus,
    refetchInterval: currentConfig.refetchInterval,
    retry: false, // We handle retries internally
    ...options
  });

  // Update metadata when query comes from cache
  const wasCacheHit = queryResult.isFetched && !queryResult.isFetching && queryResult.isSuccess;
  if (wasCacheHit && !queryMetadata.performance.cacheHit) {
    setQueryMetadata(prev => ({
      ...prev,
      performance: {
        ...prev.performance,
        cacheHit: true,
        queryTime: 0
      }
    }));
  }

  // Force refresh function
  const forceRefresh = useCallback(async () => {
    setQueryMetadata(prev => ({
      ...prev,
      performance: { ...prev.performance, cacheHit: false }
    }));
    await queryResult.refetch();
  }, [queryResult]);

  // Config update function
  const updateConfig = useCallback((newConfig: Partial<DataQueryConfig<T>>) => {
    setCurrentConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // Return consolidated result
  return {
    // Data and loading states from TanStack Query
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    error: queryResult.error,
    isSuccess: queryResult.isSuccess,
    isFetching: queryResult.isFetching,
    isRefetching: queryResult.isRefetching,

    // Enhanced metadata
    ...queryMetadata,

    // Control functions
    forceRefresh,
    updateConfig
  };
}

// ================================
// Specialized Hook Factories
// ================================

/**
 * Create a tournament-specific data query hook
 */
export function useTournamentsQuery(
  databaseQuery?: () => Promise<any[]>,
  apiQuery?: () => Promise<any[]>,
  options?: Partial<DataQueryConfig<any[]>>
) {
  return useDataQuery(
    ['tournaments', options?.queryContext?.filters],
    {
      readStrategy: 'database-first',
      cacheStrategy: 'historical',
      databaseQuery,
      apiQuery,
      queryContext: { entity: 'tournaments' },
      ...options
    }
  );
}

/**
 * Create a match-specific data query hook
 */
export function useMatchesQuery(
  tournamentId: string | number,
  databaseQuery?: () => Promise<any[]>,
  apiQuery?: () => Promise<any[]>,
  options?: Partial<DataQueryConfig<any[]>>
) {
  return useDataQuery(
    ['matches', tournamentId, options?.queryContext?.dateRange],
    {
      readStrategy: 'api-first',
      cacheStrategy: 'live',
      databaseQuery,
      apiQuery,
      queryContext: { entity: 'matches', tournamentId },
      ...options
    }
  );
}

/**
 * Create a referee-specific data query hook
 */
export function useRefereesQuery(
  databaseQuery?: () => Promise<any[]>,
  apiQuery?: () => Promise<any[]>,
  options?: Partial<DataQueryConfig<any[]>>
) {
  return useDataQuery(
    ['referees', options?.queryContext?.federation],
    {
      readStrategy: 'database-first',
      cacheStrategy: 'user-preference',
      databaseQuery,
      apiQuery,
      queryContext: { entity: 'referees' },
      maxRetries: 3, // Conservative for referee data
      ...options
    }
  );
}

// ================================
// Hook Performance Utilities
// ================================

/**
 * Get performance statistics for all queries
 */
export function useQueryPerformanceStats() {
  const [stats] = useState<Record<string, {
    averageQueryTime: number;
    fallbackRate: number;
    cacheHitRate: number;
    errorRate: number;
    totalQueries: number;
  }>>({});

  // This would integrate with a global query performance tracker
  // For now, returns empty stats
  return stats;
}

/**
 * Debug hook for monitoring query behavior
 */
export function useQueryDebugger(_queryKey: string | (string | number)[]) {
  const [debugInfo] = useState({
    lastQuery: null as any,
    queryHistory: [] as any[],
    configHistory: [] as any[]
  });

  // Development-only debugging information
  // TODO: Use _queryKey to track specific query debugging
  if (process.env.NODE_ENV === 'development') {
    return debugInfo;
  }

  return null;
}