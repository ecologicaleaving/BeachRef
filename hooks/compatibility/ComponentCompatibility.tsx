/**
 * Component Compatibility Layer
 * Provides React components and hooks that maintain existing component APIs
 * while enabling gradual migration to new hook-based system
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { featureFlags } from './FeatureFlags';
import useTournaments from '../useTournaments';
import useMatches from '../useMatches';
import useReferees from '../useReferees';
import useOfflineSync from '../useOfflineSync';
import { CacheServiceCompatibility } from './CacheServiceCompatibility';
import { FilterOptions } from '../../types/cache';

// Context for compatibility layer
interface CompatibilityContextValue {
  useMigration: boolean;
  recordPerformance: (component: string, oldTime: number, newTime: number) => Promise<void>;
  recordError: (component: string, error: string) => Promise<void>;
}

const CompatibilityContext = createContext<CompatibilityContextValue>({
  useMigration: false,
  recordPerformance: async () => {},
  recordError: async () => {},
});

/**
 * Compatibility Provider - wrap your app with this to enable gradual migration
 */
export const CompatibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [useMigration, setUseMigration] = useState(false);

  useEffect(() => {
    // Check if any migration flags are enabled
    const checkMigrationStatus = async () => {
      const usingTournaments = featureFlags.getFlag('useNewTournamentsHook');
      const usingMatches = featureFlags.getFlag('useNewMatchesHook');
      const usingReferees = featureFlags.getFlag('useNewRefereesHook');
      const usingSync = featureFlags.getFlag('useNewOfflineSyncHook');
      
      setUseMigration(Boolean(usingTournaments || usingMatches || usingReferees || usingSync));
    };

    checkMigrationStatus();
  }, []);

  const recordPerformance = async (component: string, oldTime: number, newTime: number) => {
    await featureFlags.recordPerformanceComparison(component, oldTime, newTime);
  };

  const recordError = async (component: string, error: string) => {
    await featureFlags.recordError(component, error);
  };

  return (
    <CompatibilityContext.Provider value={{ useMigration, recordPerformance, recordError }}>
      {children}
    </CompatibilityContext.Provider>
  );
};

/**
 * Hook for accessing compatibility context
 */
export const useCompatibility = () => useContext(CompatibilityContext);

/**
 * Compatibility wrapper for tournament data fetching
 * Maintains existing component usage patterns while enabling new hook system
 */
export function useCompatibleTournaments(filters?: FilterOptions) {
  const { recordPerformance, recordError } = useCompatibility();
  const componentName = 'TournamentList';
  
  const shouldUseNewHook = featureFlags.shouldUseNewHook(componentName, 'tournaments');
  
  // New hook system
  const newHookResult = useTournaments(
    filters ? {
      season: filters.year,
      gender: filters.gender,
      country: filters.country,
      status: filters.status === 'active' ? 'ACTIVE' : 
              filters.status === 'completed' ? 'COMPLETED' : 
              filters.status === 'upcoming' ? 'UPCOMING' : undefined,
    } : undefined,
    { 
      readStrategy: 'db_first',
      enablePerformanceMonitoring: true,
    }
  );
  
  // Legacy result structure
  const [legacyResult, setLegacyResult] = useState<{
    data: any[] | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    source?: string;
    cached?: boolean;
  }>({
    data: null,
    loading: true,
    error: null,
    refetch: async () => {},
  });

  useEffect(() => {
    if (shouldUseNewHook) {
      // Use new hook system
      try {
        setLegacyResult({
          data: newHookResult.data || null,
          loading: newHookResult.isLoading || newHookResult.isFetching,
          error: newHookResult.error?.message || null,
          refetch: newHookResult.forceRefresh,
          source: newHookResult.source,
          cached: newHookResult.source !== 'api',
        });

        // Record performance if successful
        if (newHookResult.performance.queryTime > 0) {
          recordPerformance(componentName, 300, newHookResult.performance.queryTime);
        }
      } catch (error) {
        recordError(componentName, error instanceof Error ? error.message : 'Unknown error');
        setLegacyResult(prev => ({ ...prev, error: 'Hook migration error' }));
      }
    } else {
      // Use legacy CacheService
      const fetchLegacyData = async () => {
        try {
          setLegacyResult(prev => ({ ...prev, loading: true, error: null }));
          const startTime = Date.now();
          
          const result = await CacheServiceCompatibility.getTournaments(filters);
          const endTime = Date.now();
          
          setLegacyResult({
            data: result.data,
            loading: false,
            error: null,
            refetch: fetchLegacyData,
            source: result.source,
            cached: result.cached,
          });

          // Record legacy performance
          recordPerformance(componentName, endTime - startTime, newHookResult.performance.queryTime);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setLegacyResult(prev => ({ 
            ...prev, 
            loading: false, 
            error: errorMessage 
          }));
          recordError(componentName, errorMessage);
        }
      };

      fetchLegacyData();
    }
  }, [shouldUseNewHook, filters, newHookResult, recordPerformance, recordError]);

  return legacyResult;
}

/**
 * Compatibility wrapper for match data fetching
 */
export function useCompatibleMatches(tournamentNo: string) {
  const { recordPerformance, recordError } = useCompatibility();
  const componentName = 'MatchList';
  
  const shouldUseNewHook = featureFlags.shouldUseNewHook(componentName, 'matches');
  const normalizedTournamentNo = `${tournamentNo || ''}`.trim();
  const numericTournamentNo = /^\d+$/.test(normalizedTournamentNo)
    ? Number(normalizedTournamentNo)
    : undefined;
  
  // New hook system
  const newHookResult = useMatches(
    numericTournamentNo !== undefined
      ? { eventId: numericTournamentNo }
      : { tournamentCode: normalizedTournamentNo },
    { 
      readStrategy: 'db_first',
      enablePerformanceMonitoring: true,
      enableRealTimeUpdates: true,
    }
  );
  
  // Legacy result structure
  const [legacyResult, setLegacyResult] = useState<{
    data: any[] | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    source?: string;
    cached?: boolean;
  }>({
    data: null,
    loading: true,
    error: null,
    refetch: async () => {},
  });

  useEffect(() => {
    if (shouldUseNewHook) {
      // Use new hook system
      try {
        setLegacyResult({
          data: newHookResult.data || null,
          loading: newHookResult.isLoading || newHookResult.isFetching,
          error: newHookResult.error?.message || null,
          refetch: newHookResult.forceRefresh,
          source: newHookResult.source,
          cached: newHookResult.source !== 'api',
        });

        // Record performance if successful
        if (newHookResult.performance.queryTime > 0) {
          recordPerformance(componentName, 400, newHookResult.performance.queryTime);
        }
      } catch (error) {
        recordError(componentName, error instanceof Error ? error.message : 'Unknown error');
        setLegacyResult(prev => ({ ...prev, error: 'Hook migration error' }));
      }
    } else {
      // Use legacy CacheService
      const fetchLegacyData = async () => {
        try {
          setLegacyResult(prev => ({ ...prev, loading: true, error: null }));
          const startTime = Date.now();
          
          const result = await CacheServiceCompatibility.getMatches(tournamentNo);
          const endTime = Date.now();
          
          setLegacyResult({
            data: result.data,
            loading: false,
            error: null,
            refetch: fetchLegacyData,
            source: result.source,
            cached: result.cached,
          });

          // Record legacy performance
          recordPerformance(componentName, endTime - startTime, newHookResult.performance.queryTime);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setLegacyResult(prev => ({ 
            ...prev, 
            loading: false, 
            error: errorMessage 
          }));
          recordError(componentName, errorMessage);
        }
      };

      fetchLegacyData();
    }
  }, [shouldUseNewHook, tournamentNo, newHookResult, recordPerformance, recordError]);

  return legacyResult;
}

/**
 * Compatibility wrapper for referee data fetching
 */
export function useCompatibleReferees(tournamentNo: string) {
  const { recordPerformance, recordError } = useCompatibility();
  const componentName = 'RefereeCard';
  
  const shouldUseNewHook = featureFlags.shouldUseNewHook(componentName, 'referees');
  
  // New hook system
  const newHookResult = useReferees(
    { 
      tournamentCodes: [tournamentNo],
      includeAssignments: true,
    },
    { 
      readStrategy: 'db_first',
      enablePerformanceMonitoring: true,
      enableRealTimeUpdates: true,
    }
  );
  
  // Legacy result structure
  const [legacyResult, setLegacyResult] = useState<{
    data: any | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    assignmentCounts?: {
      assigned: number;
      available: number;
      online: number;
    };
  }>({
    data: null,
    loading: true,
    error: null,
    refetch: async () => {},
  });

  useEffect(() => {
    if (shouldUseNewHook) {
      // Use new hook system
      try {
        setLegacyResult({
          data: newHookResult.data?.[0] || null, // Take first referee for legacy compatibility
          loading: newHookResult.isLoading || newHookResult.isFetching,
          error: newHookResult.error?.message || null,
          refetch: newHookResult.forceRefresh,
          assignmentCounts: {
            assigned: newHookResult.assignmentCounts.assigned,
            available: newHookResult.assignmentCounts.available,
            online: newHookResult.assignmentCounts.online,
          },
        });

        // Record performance if successful
        if (newHookResult.performance.queryTime > 0) {
          recordPerformance(componentName, 200, newHookResult.performance.queryTime);
        }
      } catch (error) {
        recordError(componentName, error instanceof Error ? error.message : 'Unknown error');
        setLegacyResult(prev => ({ ...prev, error: 'Hook migration error' }));
      }
    } else {
      // Use legacy CacheService
      const fetchLegacyData = async () => {
        try {
          setLegacyResult(prev => ({ ...prev, loading: true, error: null }));
          const startTime = Date.now();
          
          const result = await CacheServiceCompatibility.getRefereeData(tournamentNo);
          const endTime = Date.now();
          
          setLegacyResult({
            data: result.data,
            loading: false,
            error: null,
            refetch: fetchLegacyData,
            assignmentCounts: {
              assigned: result.data?.referees?.length || 0,
              available: 0, // Legacy doesn't track this
              online: 0, // Legacy doesn't track this
            },
          });

          // Record legacy performance
          recordPerformance(componentName, endTime - startTime, newHookResult.performance.queryTime);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setLegacyResult(prev => ({ 
            ...prev, 
            loading: false, 
            error: errorMessage 
          }));
          recordError(componentName, errorMessage);
        }
      };

      fetchLegacyData();
    }
  }, [shouldUseNewHook, tournamentNo, newHookResult, recordPerformance, recordError]);

  return legacyResult;
}

/**
 * Compatibility wrapper for offline sync
 */
export function useCompatibleOfflineSync() {
  const { recordPerformance, recordError } = useCompatibility();
  const componentName = 'OfflineSync';
  
  const shouldUseNewHook = featureFlags.shouldUseNewHook(componentName, 'offlineSync');
  
  // New hook system
  const newHookResult = useOfflineSync({
    enableAutoSync: true,
    enablePerformanceTracking: true,
    enableVisualIndicators: true,
  });

  if (shouldUseNewHook) {
    try {
      // Return new hook interface directly - it's already comprehensive
      return {
        ...newHookResult,
        // Add legacy compatibility methods
        isOnline: newHookResult.syncStatus.isOnline,
        isSyncing: newHookResult.syncStatus.isSyncing,
        syncMessage: newHookResult.syncMessage,
        sync: newHookResult.actions.forceSync,
        clearQueue: newHookResult.actions.clearSyncQueue,
      };
    } catch (error) {
      recordError(componentName, error instanceof Error ? error.message : 'Unknown error');
      
      // Return minimal fallback
      return {
        syncStatus: { isOnline: true, isSyncing: false, pendingTasks: 0, connectionQuality: 'good' as const, syncErrors: [] },
        actions: { 
          forceSync: async () => {}, 
          queueSync: () => {},
          clearSyncQueue: () => {},
          retryFailedTasks: async () => {},
          enableAutoSync: () => {},
          disableAutoSync: () => {},
          refreshNetworkStatus: async () => {},
        },
        isOnline: true,
        isSyncing: false,
        syncMessage: null,
        sync: async () => {},
        clearQueue: () => {},
      };
    }
  }

  // Legacy fallback (minimal implementation)
  return {
    syncStatus: { isOnline: true, isSyncing: false, pendingTasks: 0, connectionQuality: 'good' as const, syncErrors: [] },
    actions: { 
      forceSync: async () => {}, 
      queueSync: () => {},
      clearSyncQueue: () => {},
      retryFailedTasks: async () => {},
      enableAutoSync: () => {},
      disableAutoSync: () => {},
      refreshNetworkStatus: async () => {},
    },
    isOnline: true,
    isSyncing: false,
    syncMessage: null,
    sync: async () => {},
    clearQueue: () => {},
  };
}

/**
 * Migration utilities for components
 */
export const MigrationUtils = {
  /**
   * Enable new hook for specific component
   */
  enableNewHook: async (component: string, hookType: 'tournaments' | 'matches' | 'referees' | 'offlineSync') => {
    await featureFlags.enableNewHookForComponent(component, hookType);
  },

  /**
   * Disable new hook for specific component
   */
  disableNewHook: async (component: string, hookType: 'tournaments' | 'matches' | 'referees' | 'offlineSync', reason?: string) => {
    await featureFlags.disableNewHookForComponent(component, hookType, reason);
  },

  /**
   * Get migration status for component
   */
  getMigrationStatus: (component: string) => {
    return featureFlags.getMigrationStatus(component);
  },

  /**
   * Get all migration statuses
   */
  getAllMigrationStatuses: () => {
    return featureFlags.getAllMigrationStatuses();
  },

  /**
   * Reset error count for component
   */
  resetErrorCount: async (component: string) => {
    await featureFlags.resetErrorCount(component);
  },
};
