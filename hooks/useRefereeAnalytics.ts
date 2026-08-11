import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { AnalyticsService } from '../services/AnalyticsService';
import RefereeAnalyticsExportService, { ExportFormat, ExportConfig } from '../services/RefereeAnalyticsExportService';
import { queryKeys, createQueryOptions } from '../lib/queryClient';
import { queryPerformanceMonitor } from '../lib/queryPerformance';
import { ErrorLogger } from '../services/ErrorLogger';

/**
 * Referee Analytics Filters Interface
 * Following existing hook patterns from useReferees
 */
export interface RefereeAnalyticsFilters {
  refereeIds?: string[];
  tournamentCodes?: string[];
  dateRange?: { start: string; end: string };
  performanceThreshold?: number;
  roleTypes?: ('FIRST' | 'SECOND' | 'CHALLENGE')[];
  federationCode?: string;
  includeTrends?: boolean;
}

/**
 * Analytics Configuration Interface
 * Following established configuration patterns
 */
export interface AnalyticsConfig {
  enablePerformanceMonitoring?: boolean;
  enableRealTimeUpdates?: boolean;
  cacheStrategy?: 'live' | 'historical' | 'static';
  refreshInterval?: number;
  enablePerformanceScoring?: boolean;
  includeGeographicData?: boolean;
}

/**
 * Referee Performance Metrics Interface
 * Based on Story 4.1 AnalyticsAggregation and Epic 4 requirements
 */
export interface RefereePerformanceMetrics {
  referee_id: string;
  referee_name: string;
  federation_code: string;
  total_assignments: number;
  first_referee_count: number;
  second_referee_count: number;
  challenge_referee_count: number;
  completion_rate: number;
  tournaments_worked: string[];
  performance_score: number;
  workload_trend: 'increasing' | 'stable' | 'decreasing';
  geographic_coverage: string[];
  avg_matches_per_day: number;
}

/**
 * Enhanced query result interface with analytics-specific methods
 */
export interface RefereeAnalyticsQueryResult extends UseQueryResult<RefereePerformanceMetrics[]> {
  source: 'database' | 'cache';
  performance: { queryTime: number };
  aggregatePerformance: (refereeIds: string[]) => Promise<void>;
  exportAnalytics: (format: ExportFormat, config?: ExportConfig) => Promise<Blob>;
  calculateTrends: () => void;
  refreshAnalytics: () => Promise<void>;
  getAvailableTemplates: () => Record<string, any>;
}

/**
 * useRefereeAnalytics Hook
 * Comprehensive referee performance analytics with real-time updates and caching
 * Following TanStack Query patterns established in useReferees
 */
export function useRefereeAnalytics(
  filters?: RefereeAnalyticsFilters,
  config: AnalyticsConfig = {}
): RefereeAnalyticsQueryResult {
  const [currentConfig, setCurrentConfig] = useState<AnalyticsConfig>({
    enablePerformanceMonitoring: true,
    enableRealTimeUpdates: true,
    cacheStrategy: 'live',
    refreshInterval: 300000, // 5 minutes for analytics data
    enablePerformanceScoring: true,
    includeGeographicData: true,
    ...config
  });

  const [queryMetadata, setQueryMetadata] = useState<{
    source: 'database' | 'cache';
    performance: { queryTime: number };
  }>({
    source: 'database',
    performance: { queryTime: 0 }
  });

  const analyticsService = AnalyticsService.getInstance({
    enablePerformanceMonitoring: currentConfig.enablePerformanceMonitoring
  });
  const exportService = RefereeAnalyticsExportService.getInstance();
  const errorLogger = ErrorLogger.getInstance();

  // Set default date range if not provided (last 30 days)
  const effectiveFilters: RefereeAnalyticsFilters = {
    ...(filters || {}),
    dateRange: filters?.dateRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    }
  };

  // Create query key using TanStack Query key factory
  const queryKey = queryKeys.analytics.refereePerformance(effectiveFilters);

  // Main query function with performance metrics calculation
  const queryFn = async (): Promise<RefereePerformanceMetrics[]> => {
    const startTime = Date.now();

    try {
      // Get aggregated referee analytics from AnalyticsService
      const aggregations = await analyticsService.aggregateRefereeAnalytics(
        effectiveFilters.dateRange!.start,
        effectiveFilters.dateRange!.end,
        effectiveFilters.refereeIds
      );

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      // Update query metadata
      setQueryMetadata({
        source: 'database',
        performance: { queryTime }
      });

      // Transform aggregations to RefereePerformanceMetrics format
      const performanceMetrics = await Promise.all(
        aggregations.map(async (agg) => {
          let performanceScore = 0;
          
          if (currentConfig.enablePerformanceScoring) {
            try {
              performanceScore = await analyticsService.calculatePerformanceScore(
                agg.referee_id,
                effectiveFilters.dateRange!
              );
            } catch (error) {
              // Log error but don't fail the entire query
              await errorLogger.logError({
                entity_type: 'referee_analytics_hook',
                error: error as Error,
                context: { referee_id: agg.referee_id, operation: 'calculate_performance_score' }
              });
              performanceScore = 0;
            }
          }

          // Calculate completion rate (assume 100% for now, will be enhanced with match status data)
          const completionRate = agg.total_assignments > 0 ? 100 : 0;
          
          // Calculate workload trend (simplified - actual implementation would compare periods)
          const workloadTrend: 'increasing' | 'stable' | 'decreasing' = 
            agg.total_assignments > 5 ? 'increasing' : 
            agg.total_assignments > 2 ? 'stable' : 'decreasing';

          // Calculate average matches per day
          const dateRange = effectiveFilters.dateRange!;
          const startDate = new Date(dateRange.start);
          const endDate = new Date(dateRange.end);
          const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
          const avgMatchesPerDay = agg.total_assignments / daysDiff;

          return {
            referee_id: agg.referee_id,
            referee_name: `Referee ${agg.referee_id}`, // Will be enhanced with actual referee name lookup
            federation_code: effectiveFilters.federationCode || 'Unknown',
            total_assignments: agg.total_assignments,
            first_referee_count: agg.first_referee_count,
            second_referee_count: agg.second_referee_count,
            challenge_referee_count: agg.challenge_referee_count,
            completion_rate: completionRate,
            // `?? []` e non un passaggio diretto: `RefereePerformanceMetrics`
            // dichiara `tournaments_worked: string[]`, ma la colonna del
            // database e' `text[]` ANNULLABILE. Un null che arriva qui non
            // viola solo il tipo — lo viola in silenzio, perche' il valore
            // arriva da una riga non tipizzata e TypeScript non ha modo di
            // accorgersene. A rompersi e' il primo consumatore che fa `.map()`
            // o `.length`, lontano da qui.
            tournaments_worked: agg.tournaments_worked ?? [],
            performance_score: performanceScore,
            workload_trend: workloadTrend,
            geographic_coverage: currentConfig.includeGeographicData
              ? (agg.tournaments_worked ?? [])
              : [],
            avg_matches_per_day: Math.round(avgMatchesPerDay * 100) / 100
          };
        })
      );

      // Apply filters
      let filteredMetrics = performanceMetrics;

      if (effectiveFilters.performanceThreshold !== undefined) {
        filteredMetrics = filteredMetrics.filter(m => m.performance_score >= effectiveFilters.performanceThreshold!);
      }

      if (effectiveFilters.roleTypes && effectiveFilters.roleTypes.length > 0) {
        filteredMetrics = filteredMetrics.filter(m => {
          return effectiveFilters.roleTypes!.some(role => {
            switch (role) {
              case 'FIRST': return m.first_referee_count > 0;
              case 'SECOND': return m.second_referee_count > 0;
              case 'CHALLENGE': return m.challenge_referee_count > 0;
              default: return false;
            }
          });
        });
      }

      // Track performance with TanStack Query performance monitor
      if (currentConfig.enablePerformanceMonitoring) {
        queryPerformanceMonitor.trackQuery(
          queryKey,
          startTime,
          endTime,
          filteredMetrics,
          undefined
        );
      }

      return filteredMetrics;
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

      // Log error
      await errorLogger.logError({
        entity_type: 'referee_analytics_hook',
        error: error as Error,
        context: { filters: effectiveFilters, operation: 'query_referee_analytics' }
      });
      
      throw error;
    }
  };

  // Determine cache strategy based on configuration
  const cacheStrategy = currentConfig.cacheStrategy || 'live';

  // Create query options with intelligent cache strategy
  const queryOptions = createQueryOptions.adaptive(
    queryKey,
    queryFn,
    cacheStrategy
  );

  // Configure real-time updates for live analytics
  if (cacheStrategy === 'live' && currentConfig.enableRealTimeUpdates) {
    queryOptions.refetchInterval = currentConfig.refreshInterval || 300000; // 5 minutes default
    queryOptions.refetchIntervalInBackground = false;
    queryOptions.refetchOnWindowFocus = true;
  }

  const query = useQuery({
    ...queryOptions,
    retry: (failureCount, error) => {
      // Conservative retries for analytics queries
      const maxRetries = 2;
      if (failureCount >= maxRetries) return false;
      
      // Don't retry on configuration errors
      if (error.message.includes('not configured')) return false;
      
      return true;
    },
    retryDelay: (attemptIndex) => {
      // Standard retry delay for analytics queries
      const baseDelay = 2000; // Slightly longer than referee queries
      return Math.min(baseDelay * 2 ** attemptIndex, 30000);
    },
    networkMode: 'always'
  });

  // Aggregate performance function for batch processing
  const aggregatePerformance = useCallback(async (refereeIds: string[]): Promise<void> => {
    try {
      const dateRange = effectiveFilters.dateRange!;
      await analyticsService.aggregateRefereeAnalytics(
        dateRange.start,
        dateRange.end,
        refereeIds
      );
      // Invalidate query to refresh data
      await query.refetch();
    } catch (error) {
      await errorLogger.logError({
        entity_type: 'referee_analytics_hook',
        error: error as Error,
        context: { refereeIds, operation: 'aggregate_performance' }
      });
      throw error;
    }
  }, [effectiveFilters.dateRange, query]);

  // Enhanced export analytics function using the dedicated service
  const exportAnalytics = useCallback(async (format: ExportFormat, config?: ExportConfig): Promise<Blob> => {
    try {
      const data = query.data || [];
      
      // Use the dedicated export service for enhanced functionality
      return await exportService.exportAnalytics(data, format, {
        ...config,
        metadata: {
          title: 'Referee Performance Analytics Report',
          description: `Analytics data for ${data.length} referees`,
          generatedBy: 'BeachRef Analytics System',
          generatedAt: new Date().toISOString(),
          ...config?.metadata,
        },
      });
    } catch (error) {
      await errorLogger.logError({
        entity_type: 'referee_analytics_hook',
        error: error as Error,
        context: { format, config, operation: 'export_analytics' }
      });
      throw error;
    }
  }, [query.data, exportService]);

  // Calculate trends function (placeholder for future enhancement)
  const calculateTrends = useCallback(() => {
    // Future implementation would calculate trend analysis
    // For now, just trigger a refetch to update trend calculations
    query.refetch();
  }, [query]);

  // Refresh analytics function
  const refreshAnalytics = useCallback(async (): Promise<void> => {
    await query.refetch();
  }, [query]);

  // Get available report templates
  const getAvailableTemplates = useCallback(() => {
    return exportService.getAvailableTemplates();
  }, [exportService]);

  return {
    ...query,
    source: queryMetadata.source,
    performance: queryMetadata.performance,
    aggregatePerformance,
    exportAnalytics,
    calculateTrends,
    refreshAnalytics,
    getAvailableTemplates
  };
}

export default useRefereeAnalytics;