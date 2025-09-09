import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { DualReadService, MatchDTO, ReadResult, ReadStrategy } from '../services/DualReadService';
import { queryPerformanceMonitor } from '../lib/queryPerformance';

export interface MatchesFilters {
  tournamentCode?: string;
  round?: string;
  eventNo?: number;
  status?: string;
  date?: string;
}

export interface MatchesHybridConfig {
  readStrategy?: ReadStrategy;
  fallbackEnabled?: boolean;
  enablePerformanceMonitoring?: boolean;
  cacheTime?: number;
  staleTime?: number;
  refetchInterval?: number;
  enableLiveUpdates?: boolean;
}

export interface MatchesQueryResult extends UseQueryResult<MatchDTO[]> {
  source: 'database' | 'api' | 'cache' | 'unknown';
  performance: {
    queryTime: number;
    fallbackUsed: boolean;
  };
  config: MatchesHybridConfig;
  setReadStrategy: (strategy: ReadStrategy) => void;
  forceRefresh: () => Promise<void>;
  clearCache: () => void;
  enableLiveMode: () => void;
  disableLiveMode: () => void;
}

/**
 * Hybrid hook for matches data using dual-read strategy
 * Supports live updates for active matches and intelligent caching
 * for completed matches based on status
 */
export function useMatchesHybrid(
  filters?: MatchesFilters,
  config: MatchesHybridConfig = {}
): MatchesQueryResult {
  const [currentConfig, setCurrentConfig] = useState<MatchesHybridConfig>({
    readStrategy: 'db_first',
    fallbackEnabled: true,
    enablePerformanceMonitoring: true,
    cacheTime: 1000 * 60 * 60, // 1 hour for completed matches
    staleTime: 1000 * 30, // 30 seconds for live matches, longer for completed
    refetchInterval: undefined, // Will be set based on match status
    enableLiveUpdates: true,
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

  // Configure the dual read service
  useEffect(() => {
    dualReadService.configure({
      readStrategy: currentConfig.readStrategy!,
      fallbackEnabled: currentConfig.fallbackEnabled!,
      enablePerformanceMonitoring: currentConfig.enablePerformanceMonitoring!
    });
  }, [currentConfig]);

  // Determine if we have live matches based on filters
  const hasLiveMatches = filters?.status?.includes('RUNNING') || 
                        filters?.status?.includes('SCHEDULED') ||
                        !filters?.status; // If no status filter, assume we might have live matches

  // Adjust cache and refetch settings based on match status
  const adjustedStaleTime = hasLiveMatches && currentConfig.enableLiveUpdates ? 
    1000 * 30 : // 30 seconds for live matches
    1000 * 60 * 15; // 15 minutes for completed matches

  const adjustedRefetchInterval = hasLiveMatches && currentConfig.enableLiveUpdates ? 
    liveUpdateInterval || 30000 : // 30 seconds for live matches
    undefined; // No auto-refresh for completed matches

  // Create stable query key
  const queryKey = [
    'matches-hybrid', 
    filters, 
    currentConfig.readStrategy,
    currentConfig.fallbackEnabled,
    currentConfig.enableLiveUpdates
  ];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<MatchDTO[]> => {
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

        const matches = result.data || [];
      
      // Auto-adjust live update interval based on actual match status
      const liveMatches = matches.filter(match => 
        match.status === 'RUNNING' || match.status === 'SCHEDULED'
      );
      
      if (liveMatches.length > 0 && currentConfig.enableLiveUpdates) {
        setLiveUpdateInterval(30000); // 30 seconds for live matches
      } else {
        setLiveUpdateInterval(undefined); // No auto-refresh for completed matches
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
    },
    gcTime: currentConfig.cacheTime,
    staleTime: adjustedStaleTime,
    refetchInterval: adjustedRefetchInterval,
    retry: (failureCount, error) => {
      // More aggressive retries for live matches
      const maxRetries = hasLiveMatches ? 5 : 3;
      if (failureCount >= maxRetries) return false;
      
      // Don't retry configuration errors
      if (error.message.includes('not configured')) return false;
      
      return true;
    },
    retryDelay: (attemptIndex) => {
      // Faster retry for live matches
      const baseDelay = hasLiveMatches ? 500 : 1000;
      return Math.min(baseDelay * 2 ** attemptIndex, 30000);
    },
    networkMode: 'always',
    // Refetch on window focus for live matches
    refetchOnWindowFocus: hasLiveMatches && currentConfig.enableLiveUpdates
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
    query.remove();
    dualReadService.invalidateCache('matches', filters);
  }, [query, filters]);

  // Enable live mode
  const enableLiveMode = useCallback(() => {
    setCurrentConfig(prev => ({
      ...prev,
      enableLiveUpdates: true,
      staleTime: 1000 * 30, // 30 seconds
    }));
    setLiveUpdateInterval(30000);
  }, []);

  // Disable live mode  
  const disableLiveMode = useCallback(() => {
    setCurrentConfig(prev => ({
      ...prev,
      enableLiveUpdates: false,
      staleTime: 1000 * 60 * 15, // 15 minutes
    }));
    setLiveUpdateInterval(undefined);
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
    disableLiveMode
  };
}

export default useMatchesHybrid;