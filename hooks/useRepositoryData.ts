/**
 * @fileoverview Unified Repository Data Access Hook
 * Provides consistent interface for accessing repository data with caching, error handling, and loading states
 * Part of EPIC-007 Data Architecture Restructuration - Story 7.3 Task 1
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Options for repository data fetching
 */
export interface UseRepositoryDataOptions {
  /** Enable caching for the repository method */
  enableCache?: boolean;
  /** Transform data before returning */
  transform?: boolean;
  /** Skip initial fetch on mount */
  skip?: boolean;
  /** Polling interval in milliseconds */
  pollingInterval?: number;
  /** Retry count for failed requests */
  retryCount?: number;
  /** Retry delay in milliseconds */
  retryDelay?: number;
}

/**
 * Repository data response interface
 */
export interface UseRepositoryDataResponse<T> {
  /** The fetched data */
  data: T | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Manual refresh function */
  refresh: () => Promise<void>;
  /** Cache hit indicator */
  cacheHit?: boolean;
  /** Last updated timestamp */
  lastUpdated?: Date;
  /** Retry function for failed requests */
  retry: () => Promise<void>;
}

/**
 * Unified repository data access hook
 * Provides consistent interface for repository methods with caching, error handling, and loading states
 * 
 * @param repositoryMethod - Async function that returns data from repository
 * @param dependencies - Dependency array for useEffect
 * @param options - Configuration options for data fetching
 * @returns Repository data response with loading, error, and refresh capabilities
 */
export const useRepositoryData = <T>(
  repositoryMethod: () => Promise<T>,
  dependencies: any[] = [],
  options: UseRepositoryDataOptions = {}
): UseRepositoryDataResponse<T> => {
  const {
    skip = false,
    pollingInterval,
    retryCount = 3,
    retryDelay = 1000
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!skip);
  const [error, setError] = useState<Error | null>(null);
  const [cacheHit, setCacheHit] = useState<boolean | undefined>(undefined);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);

  const mountedRef = useRef(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Fetch data function with retry logic
  const fetchData = useCallback(async (retryAttempt = 0): Promise<void> => {
    if (!mountedRef.current) return;

    try {
      setLoading(true);
      setError(null);
      
      const startTime = Date.now();
      const result = await repositoryMethod();
      const endTime = Date.now();
      
      if (!mountedRef.current) return;

      setData(result);
      setLastUpdated(new Date());
      
      // Check if result has cache metadata
      const hasCache = result && typeof result === 'object' && 'source' in result;
      setCacheHit(hasCache ? (result as any).source === 'cache' : undefined);
      
      // Log performance metrics
      if (process.env.NODE_ENV === 'development') {
        // console.debug(`Repository data fetch completed in ${endTime - startTime}ms`, {
        //   cacheHit: hasCache ? (result as any).source === 'cache' : false,
        //   dataSize: result ? JSON.stringify(result).length : 0
        // });
      }
      
    } catch (err) {
      if (!mountedRef.current) return;

      const error = err instanceof Error ? err : new Error('Repository fetch failed');
      
      // Retry logic
      if (retryAttempt < retryCount) {
        // console.warn(`Repository fetch failed (attempt ${retryAttempt + 1}/${retryCount + 1}), retrying in ${retryDelay}ms:`, error.message);
        
        retryTimeoutRef.current = setTimeout(() => {
          fetchData(retryAttempt + 1);
        }, retryDelay * Math.pow(2, retryAttempt)); // Exponential backoff
        
        return;
      }
      
      setError(error);
      // console.error('Repository fetch failed after all retries:', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [repositoryMethod, retryCount, retryDelay]);

  // Manual refresh function
  const refresh = useCallback(async (): Promise<void> => {
    cleanup();
    await fetchData();
  }, [fetchData, cleanup]);

  // Retry function
  const retry = useCallback(async (): Promise<void> => {
    setError(null);
    await fetchData();
  }, [fetchData]);

  // Initial fetch effect
  useEffect(() => {
    if (!skip) {
      fetchData();
    }

    return cleanup;
  }, [skip, fetchData, cleanup, dependencies]);

  // Polling effect
  useEffect(() => {
    if (pollingInterval && !skip && !loading) {
      pollingIntervalRef.current = setInterval(() => {
        fetchData();
      }, pollingInterval);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [pollingInterval, skip, loading, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  return {
    data,
    loading,
    error,
    refresh,
    cacheHit,
    lastUpdated,
    retry
  };
};

/**
 * Hook for repository data with automatic refresh on dependency changes
 */
export const useRepositoryDataWithRefresh = <T>(
  repositoryMethod: () => Promise<T>,
  dependencies: any[] = [],
  options: UseRepositoryDataOptions = {}
): UseRepositoryDataResponse<T> => {
  const response = useRepositoryData(repositoryMethod, dependencies, options);
  
  // Auto-refresh when dependencies change
  const prevDepsRef = useRef<any[]>();
  
  useEffect(() => {
    if (prevDepsRef.current && prevDepsRef.current.length > 0) {
      const depsChanged = dependencies.some((dep, index) => 
        dep !== prevDepsRef.current![index]
      );
      
      if (depsChanged && !response.loading) {
        response.refresh();
      }
    }
    prevDepsRef.current = dependencies;
  }, [dependencies, response]);

  return response;
};

/**
 * Hook for repository data with optimistic updates
 */
export const useRepositoryDataWithOptimisticUpdate = <T>(
  repositoryMethod: () => Promise<T>,
  dependencies: any[] = [],
  options: UseRepositoryDataOptions = {}
) => {
  const response = useRepositoryData(repositoryMethod, dependencies, options);
  
  const optimisticUpdate = useCallback((optimisticData: T) => {
    response.data && setData(optimisticData);
  }, [response.data]);
  
  return {
    ...response,
    optimisticUpdate
  };
};

export default useRepositoryData;