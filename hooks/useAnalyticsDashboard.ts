import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { useRefereeAnalytics, type RefereeAnalyticsFilters } from './useRefereeAnalytics';
import { queryKeys, createQueryOptions } from '../lib/queryClient';
import { queryPerformanceMonitor } from '../lib/queryPerformance';
import { ErrorLogger } from '../services/ErrorLogger';

/**
 * Analytics Dashboard Configuration Interface
 * Following Story 4.3 real-time update requirements
 */
export interface AnalyticsDashboardConfig {
  enableRealTimeUpdates: boolean;
  refreshInterval: number; // 30 seconds for real-time updates
  enablePerformanceMonitoring: boolean;
  autoRefresh: boolean;
  cacheStrategy: 'live' | 'historical' | 'static';
}

/**
 * Analytics Dashboard Data Interface
 * Combined data from all analytics sources following Story 4.3 specifications
 */
export interface AnalyticsDashboardData {
  tournamentAnalytics: any; // Will be enhanced when tournament analytics are available
  refereeAnalytics: any[];
  lastUpdated: string;
  source: 'database' | 'cache';
  performance: { queryTime: number };
  refreshStatus: 'idle' | 'refreshing' | 'success' | 'error';
  totalQueries: number;
  averageQueryTime: number;
}

/**
 * Analytics Dashboard Hook Result Interface
 * Following TanStack Query patterns with analytics-specific methods
 */
export interface AnalyticsDashboardHookResult {
  data: AnalyticsDashboardData | undefined;
  isLoading: boolean;
  error: Error | null;
  isRefreshing: boolean;
  performance: {
    queryTime: number;
    totalQueries: number;
    averageQueryTime: number;
    lastRefresh: string;
  };
  actions: {
    refresh: () => Promise<void>;
    toggleRealTimeUpdates: () => void;
    updateRefreshInterval: (interval: number) => void;
    clearCache: () => Promise<void>;
  };
  status: {
    isRealTimeEnabled: boolean;
    refreshInterval: number;
    source: 'database' | 'cache';
    lastUpdated: string;
  };
}

/**
 * useAnalyticsDashboard Hook
 * Integrates existing analytics hooks with real-time updates and performance monitoring
 * Following Story 4.3 AC2 and AC5 requirements
 */
export function useAnalyticsDashboard(
  timeRange: { start: string; end: string },
  config: Partial<AnalyticsDashboardConfig> = {}
): AnalyticsDashboardHookResult {
  const queryClient = useQueryClient();
  const errorLogger = ErrorLogger.getInstance();

  // Default configuration following Story 4.3 real-time requirements
  const defaultConfig: AnalyticsDashboardConfig = {
    enableRealTimeUpdates: true,
    refreshInterval: 30000, // 30 seconds for real-time updates per Story 4.3
    enablePerformanceMonitoring: true,
    autoRefresh: true,
    cacheStrategy: 'live',
  };

  const [currentConfig, setCurrentConfig] = useState<AnalyticsDashboardConfig>({
    ...defaultConfig,
    ...config,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    totalQueries: 0,
    averageQueryTime: 0,
    lastRefresh: new Date().toISOString(),
  });

  // Referee analytics filters for dashboard
  const refereeFilters: RefereeAnalyticsFilters = {
    dateRange: timeRange,
    includeTrends: true,
  };

  // Integrate referee analytics with real-time updates
  const {
    data: refereeAnalytics,
    isLoading: refereeLoading,
    error: refereeError,
    performance: refereePerformance,
    source: refereeSource,
    refreshAnalytics: refreshRefereeAnalytics,
  } = useRefereeAnalytics(refereeFilters, {
    enableRealTimeUpdates: currentConfig.enableRealTimeUpdates,
    refreshInterval: currentConfig.refreshInterval,
    cacheStrategy: currentConfig.cacheStrategy,
    enablePerformanceMonitoring: currentConfig.enablePerformanceMonitoring,
  });

  // Dashboard data aggregation query
  const dashboardQuery = useQuery({
    ...createQueryOptions.live(
      queryKeys.analytics.dashboard({ timeRange, config: currentConfig }),
      async (): Promise<AnalyticsDashboardData> => {
        const startTime = Date.now();

        try {
          // Aggregate data from all analytics sources
          const dashboardData: AnalyticsDashboardData = {
            tournamentAnalytics: null, // Will be integrated when Story 4.1 tournament analytics are available
            refereeAnalytics: refereeAnalytics || [],
            lastUpdated: new Date().toISOString(),
            source: refereeSource,
            performance: refereePerformance,
            refreshStatus: 'success',
            totalQueries: performanceMetrics.totalQueries,
            averageQueryTime: performanceMetrics.averageQueryTime,
          };

          const endTime = Date.now();
          const queryTime = endTime - startTime;

          // Update performance metrics
          const newTotalQueries = performanceMetrics.totalQueries + 1;
          const newAverageQueryTime = 
            (performanceMetrics.averageQueryTime * performanceMetrics.totalQueries + queryTime) / 
            newTotalQueries;

          setPerformanceMetrics({
            totalQueries: newTotalQueries,
            averageQueryTime: Math.round(newAverageQueryTime * 100) / 100,
            lastRefresh: new Date().toISOString(),
          });

          // Track performance with TanStack Query performance monitor
          if (currentConfig.enablePerformanceMonitoring) {
            queryPerformanceMonitor.trackQuery(
              queryKeys.analytics.dashboard({ timeRange, config: currentConfig }),
              startTime,
              endTime,
              dashboardData,
              undefined
            );
          }

          return dashboardData;
        } catch (error) {
          await errorLogger.logError({
            entity_type: 'analytics_dashboard_hook',
            error: error as Error,
            context: { timeRange, config: currentConfig, operation: 'aggregate_dashboard_data' }
          });
          throw error;
        }
      }
    ),
    enabled: !!refereeAnalytics, // Only run when referee data is available
    refetchInterval: currentConfig.enableRealTimeUpdates ? currentConfig.refreshInterval : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Manual refresh function integrating all data sources
  const refresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      // Refresh referee analytics first
      await refreshRefereeAnalytics();
      // Then refresh dashboard aggregation
      await dashboardQuery.refetch();
    } catch (error) {
      await errorLogger.logError({
        entity_type: 'analytics_dashboard_hook',
        error: error as Error,
        context: { operation: 'manual_refresh' }
      });
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshRefereeAnalytics, dashboardQuery]);

  // Toggle real-time updates
  const toggleRealTimeUpdates = useCallback(() => {
    setCurrentConfig(prev => ({
      ...prev,
      enableRealTimeUpdates: !prev.enableRealTimeUpdates,
    }));
  }, []);

  // Update refresh interval
  const updateRefreshInterval = useCallback((interval: number) => {
    setCurrentConfig(prev => ({
      ...prev,
      refreshInterval: interval,
    }));
  }, []);

  // Clear analytics cache
  const clearCache = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.analytics.all
    });
  }, [queryClient]);

  // Effect to handle real-time update configuration changes
  useEffect(() => {
    if (currentConfig.enableRealTimeUpdates) {
      dashboardQuery.refetch();
    }
  }, [currentConfig.enableRealTimeUpdates, currentConfig.refreshInterval, dashboardQuery]);

  return {
    data: dashboardQuery.data,
    isLoading: dashboardQuery.isLoading || refereeLoading,
    error: dashboardQuery.error || refereeError,
    isRefreshing,
    performance: {
      queryTime: dashboardQuery.data?.performance.queryTime || 0,
      totalQueries: performanceMetrics.totalQueries,
      averageQueryTime: performanceMetrics.averageQueryTime,
      lastRefresh: performanceMetrics.lastRefresh,
    },
    actions: {
      refresh,
      toggleRealTimeUpdates,
      updateRefreshInterval,
      clearCache,
    },
    status: {
      isRealTimeEnabled: currentConfig.enableRealTimeUpdates,
      refreshInterval: currentConfig.refreshInterval,
      source: dashboardQuery.data?.source || 'cache',
      lastUpdated: dashboardQuery.data?.lastUpdated || new Date().toISOString(),
    },
  };
}

/**
 * Helper function to validate performance against Epic 4 targets
 * Dashboard load time < 2 seconds, Analytics queries < 500ms
 */
export function validateAnalyticsPerformance(
  performance: { queryTime: number; averageQueryTime: number }
): {
  dashboardLoadStatus: 'excellent' | 'good' | 'slow';
  queryPerformanceStatus: 'excellent' | 'good' | 'slow';
  meetingTargets: boolean;
} {
  const dashboardLoadTime = performance.queryTime;
  const avgQueryTime = performance.averageQueryTime;

  const dashboardLoadStatus = 
    dashboardLoadTime < 1000 ? 'excellent' : 
    dashboardLoadTime < 2000 ? 'good' : 'slow';

  const queryPerformanceStatus = 
    avgQueryTime < 200 ? 'excellent' : 
    avgQueryTime < 500 ? 'good' : 'slow';

  const meetingTargets = dashboardLoadTime < 2000 && avgQueryTime < 500;

  return {
    dashboardLoadStatus,
    queryPerformanceStatus,
    meetingTargets,
  };
}

export default useAnalyticsDashboard;