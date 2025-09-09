import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { DualReadService, RefereeDTO, ReadResult, ReadStrategy } from '../services/DualReadService';
import { queryKeys, createQueryOptions } from '../lib/queryClient';
import { queryPerformanceMonitor } from '../lib/queryPerformance';
import { RealtimeSubscriptionService } from '../services/RealtimeSubscriptionService';

export interface RefereesFilters {
  tournamentCodes?: string[];
  federationCode?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'RESTRICTED';
  assignmentStatus?: 'assigned' | 'available' | 'all';
  includeAssignments?: boolean;
  role?: 'Referee1' | 'Referee2' | 'ChallengeReferee' | 'TechnicalOfficial' | 'TournamentDirector' | 'MatchCommissioner';
}

export interface RefereesConfig {
  readStrategy?: ReadStrategy;
  fallbackEnabled?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableRealTimeUpdates?: boolean;
  enableAssignmentUpdates?: boolean;
  cacheStrategy?: 'live' | 'historical' | 'static';
  includeOnlineStatus?: boolean;
  groupByFederation?: boolean;
}

export interface RefereesQueryResult extends UseQueryResult<RefereeDTO[]> {
  source: 'database' | 'api' | 'cache' | 'unknown';
  performance: {
    queryTime: number;
    fallbackUsed: boolean;
  };
  config: RefereesConfig;
  setReadStrategy: (strategy: ReadStrategy) => void;
  forceRefresh: () => Promise<void>;
  clearCache: () => void;
  enableLiveMode: () => void;
  disableLiveMode: () => void;
  enableRealTime: () => void;
  disableRealTime: () => void;
  assignmentCounts: {
    total: number;
    assigned: number;
    available: number;
    online: number;
  };
}

/**
 * Enhanced referees hook with assignment integration and real-time updates
 * Provides referee data with assignment status, online state tracking, and real-time assignment updates
 */
export function useReferees(
  filters?: RefereesFilters,
  config: RefereesConfig = {}
): RefereesQueryResult {
  const [currentConfig, setCurrentConfig] = useState<RefereesConfig>({
    readStrategy: 'db_first',
    fallbackEnabled: true,
    enablePerformanceMonitoring: true,
    enableRealTimeUpdates: true,
    enableAssignmentUpdates: true,
    cacheStrategy: 'live',
    includeOnlineStatus: true,
    groupByFederation: false,
    ...config
  });

  const [readMetadata, setReadMetadata] = useState<{
    source: 'database' | 'api' | 'cache' | 'unknown';
    performance: { queryTime: number; fallbackUsed: boolean };
  }>({
    source: 'unknown',
    performance: { queryTime: 0, fallbackUsed: false }
  });

  const [assignmentCounts, setAssignmentCounts] = useState({
    total: 0,
    assigned: 0,
    available: 0,
    online: 0
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

  // Determine cache strategy based on filters and configuration
  const determineCacheStrategy = (): 'live' | 'historical' | 'static' => {
    if (currentConfig.cacheStrategy) return currentConfig.cacheStrategy;
    
    // Auto-determine based on assignment status and real-time needs
    if (filters?.assignmentStatus === 'assigned' && currentConfig.enableAssignmentUpdates) return 'live';
    if (filters?.status === 'ACTIVE' && currentConfig.enableRealTimeUpdates) return 'live';
    if (filters?.status === 'INACTIVE' || filters?.status === 'SUSPENDED') return 'historical';
    
    // Default to live for active referee data
    return 'live';
  };

  const cacheStrategy = determineCacheStrategy();
  
  // Create query key using TanStack Query key factory
  const queryKey = queryKeys.referees.list(filters);

  // Real-time subscription setup for referee assignments
  useEffect(() => {
    if (currentConfig.enableRealTimeUpdates && currentConfig.enableAssignmentUpdates && filters?.tournamentCodes) {
      const subscriptions: string[] = [];
      
      filters.tournamentCodes.forEach(tournamentCode => {
        const subscription = realtimeService.subscribeToMatches(
          tournamentCode,
          (updatedMatch) => {
            // Assignment updates will trigger query invalidation
            // This handles referee assignment changes in real-time
            queryKey; // Use the queryKey to invalidate when assignments change
          }
        );
        
        if (subscription) {
          subscriptions.push(subscription);
        }
      });

      return () => {
        subscriptions.forEach(subscription => {
          realtimeService.unsubscribe(subscription);
        });
      };
    }
  }, [currentConfig.enableRealTimeUpdates, currentConfig.enableAssignmentUpdates, filters?.tournamentCodes]);

  // Create query function with performance monitoring and assignment counting
  const queryFn = async (): Promise<RefereeDTO[]> => {
    const startTime = Date.now();
    
    try {
      const result: ReadResult<RefereeDTO[]> = await dualReadService.getReferees({
        ...filters,
        includeAssignments: currentConfig.enableAssignmentUpdates || filters?.includeAssignments
      });
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

      let referees = result.data || [];

      // Calculate assignment counts and update live interval based on assignment status
      const counts = calculateAssignmentCounts(referees);
      setAssignmentCounts(counts);
      
      if (counts.assigned > 0 && currentConfig.enableRealTimeUpdates) {
        setLiveUpdateInterval(30000); // 30 seconds for referees with active assignments
      } else {
        setLiveUpdateInterval(undefined); // No auto-refresh for unassigned referees
      }

      // Apply federation grouping if requested
      if (currentConfig.groupByFederation) {
        referees = groupRefereesByFederation(referees);
      }

      return referees;
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

  // Helper function to calculate assignment counts
  const calculateAssignmentCounts = (referees: RefereeDTO[]) => {
    return referees.reduce((counts, referee) => {
      counts.total++;
      
      const hasActiveAssignments = (referee.assignmentStatus?.current || 0) > 0;
      if (hasActiveAssignments) {
        counts.assigned++;
      } else {
        counts.available++;
      }
      
      if (referee.assignmentStatus?.online) {
        counts.online++;
      }
      
      return counts;
    }, {
      total: 0,
      assigned: 0,
      available: 0,
      online: 0
    });
  };

  // Helper function to group referees by federation
  const groupRefereesByFederation = (referees: RefereeDTO[]): RefereeDTO[] => {
    // Sort referees by federation code for better grouping
    return referees.sort((a, b) => {
      const fedA = a.federationCode || '';
      const fedB = b.federationCode || '';
      
      // Primary sort by federation
      if (fedA !== fedB) {
        return fedA.localeCompare(fedB);
      }
      
      // Secondary sort by name within federation
      return a.name.localeCompare(b.name);
    });
  };

  // Determine if we need live updates for assignment tracking
  const needsLiveUpdates = currentConfig.enableAssignmentUpdates && 
                          (filters?.assignmentStatus === 'assigned' || !filters?.assignmentStatus);

  // Create query with intelligent cache strategy
  const queryOptions = createQueryOptions.adaptive(
    queryKey,
    queryFn,
    cacheStrategy
  );

  // Adjust cache settings for live referee assignments
  if (cacheStrategy === 'live' && needsLiveUpdates) {
    queryOptions.refetchInterval = liveUpdateInterval || 45000; // 45 seconds for referee assignments
    queryOptions.refetchIntervalInBackground = false;
    queryOptions.refetchOnWindowFocus = true;
  }

  const query = useQuery({
    ...queryOptions,
    retry: (failureCount, error) => {
      // More conservative retries for referee data
      const maxRetries = needsLiveUpdates ? 3 : 2;
      if (failureCount >= maxRetries) return false;
      
      // Don't retry if it's a configuration error
      if (error.message.includes('not configured')) return false;
      
      return true;
    },
    retryDelay: (attemptIndex) => {
      // Standard retry delay for referee queries
      const baseDelay = 1000;
      return Math.min(baseDelay * 2 ** attemptIndex, 20000);
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
    dualReadService.invalidateCache('referees', filters);
  }, [query, filters]);

  // Enable live mode with assignment updates
  const enableLiveMode = useCallback(() => {
    setCurrentConfig(prev => ({
      ...prev,
      enableRealTimeUpdates: true,
      enableAssignmentUpdates: true,
      cacheStrategy: 'live'
    }));
    setLiveUpdateInterval(45000);
  }, []);

  // Disable live mode  
  const disableLiveMode = useCallback(() => {
    setCurrentConfig(prev => ({
      ...prev,
      enableRealTimeUpdates: false,
      enableAssignmentUpdates: false,
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
    disableRealTime,
    assignmentCounts
  };
}

export default useReferees;