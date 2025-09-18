import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { designTokens } from '../../theme/tokens';
import { useRefereeAnalytics, RefereeAnalyticsFilters } from '../../hooks/useRefereeAnalytics';
import { RefereePerformanceWidget } from './RefereePerformanceWidget';
import { ErrorLogger } from '../../services/ErrorLogger';

/**
 * Props interface for RefereeAnalyticsDashboard
 */
export interface RefereeAnalyticsDashboardProps {
  refereeId?: string; // Individual view
  filters?: RefereeAnalyticsFilters; // Multi-referee view
  enableComparisons?: boolean;
  enableExport?: boolean;
  onDrillDown?: (refereeId: string) => void;
}

/**
 * RefereeAnalyticsDashboard Component
 * Main analytics dashboard following RefereeDashboardScreen patterns
 * Provides comprehensive referee performance analytics with filtering and visualization
 */
export const RefereeAnalyticsDashboard: React.FC<RefereeAnalyticsDashboardProps> = ({
  refereeId,
  filters = {},
  enableComparisons = true,
  enableExport = true,
  onDrillDown,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'assignments' | 'performance' | 'workload' | 'geographic'>('performance');
  const errorLogger = ErrorLogger.getInstance();

  // Build effective filters based on props
  const effectiveFilters: RefereeAnalyticsFilters = useMemo(() => {
    if (refereeId) {
      return {
        ...filters,
        refereeIds: [refereeId],
      };
    }
    return filters;
  }, [refereeId, filters]);

  // Use the analytics hook
  const {
    data: performanceMetrics,
    isLoading,
    isError,
    error,
    source,
    performance,
    refreshAnalytics,
    exportAnalytics,
  } = useRefereeAnalytics(effectiveFilters, {
    enablePerformanceMonitoring: true,
    enableRealTimeUpdates: true,
    cacheStrategy: 'live',
  });

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!performanceMetrics || performanceMetrics.length === 0) {
      return {
        totalReferees: 0,
        totalAssignments: 0,
        averagePerformance: 0,
        activeReferees: 0,
      };
    }

    return {
      totalReferees: performanceMetrics.length,
      totalAssignments: performanceMetrics.reduce((sum, m) => sum + m.total_assignments, 0),
      averagePerformance: Math.round(
        performanceMetrics.reduce((sum, m) => sum + m.performance_score, 0) / performanceMetrics.length
      ),
      activeReferees: performanceMetrics.filter(m => m.total_assignments > 0).length,
    };
  }, [performanceMetrics]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAnalytics();
    } catch (error) {
      await errorLogger.logError({
        entity_type: 'referee_analytics_dashboard',
        error: error as Error,
        context: { operation: 'refresh', filters: effectiveFilters }
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const blob = await exportAnalytics(format);
      // In a real implementation, this would trigger a download
    } catch (error) {
      await errorLogger.logError({
        entity_type: 'referee_analytics_dashboard',
        error: error as Error,
        context: { operation: 'export', format, filters: effectiveFilters }
      });
    }
  };

  // Handle drill down
  const handleDrillDown = (metric: any) => {
    if (onDrillDown && metric.referee_id) {
      onDrillDown(metric.referee_id);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={designTokens.colors.primary} />
          <Text style={styles.loadingText}>Loading referee analytics...</Text>
          <Text style={styles.loadingSubtext}>
            Aggregating performance data{source === 'database' ? ' from database' : ''}
          </Text>
        </View>
      </View>
    );
  }

  // Render error state
  if (isError) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Analytics Error</Text>
          <Text style={styles.errorMessage}>
            {error?.message || 'Unable to load referee analytics'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render empty state
  if (!performanceMetrics || performanceMetrics.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>No Analytics Data</Text>
          <Text style={styles.emptyMessage}>
            No referee performance data available for the selected filters.
            {refereeId ? ' This referee may not have recent assignments.' : ' Try adjusting your filters or date range.'}
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Text style={styles.refreshButtonText}>Refresh Data</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with summary stats */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {refereeId ? 'Individual Analytics' : 'Referee Analytics'}
        </Text>
        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{summaryStats.totalReferees}</Text>
            <Text style={styles.statLabel}>Referees</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{summaryStats.totalAssignments}</Text>
            <Text style={styles.statLabel}>Assignments</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{summaryStats.averagePerformance}%</Text>
            <Text style={styles.statLabel}>Avg Performance</Text>
          </View>
        </View>

        {/* Performance indicator */}
        <Text style={styles.performanceText}>
          Query: {performance.queryTime}ms • Source: {source}
        </Text>
      </View>

      {/* Metric selector */}
      <View style={styles.metricSelector}>
        {(['assignments', 'performance', 'workload', 'geographic'] as const).map((metric) => (
          <TouchableOpacity
            key={metric}
            style={[
              styles.metricButton,
              selectedMetric === metric && styles.metricButtonActive,
            ]}
            onPress={() => setSelectedMetric(metric)}
          >
            <Text
              style={[
                styles.metricButtonText,
                selectedMetric === metric && styles.metricButtonTextActive,
              ]}
            >
              {metric.charAt(0).toUpperCase() + metric.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Analytics content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[designTokens.colors.primary]}
            tintColor={designTokens.colors.primary}
          />
        }
      >
        {/* Main analytics widget */}
        <RefereePerformanceWidget
          type={selectedMetric}
          data={performanceMetrics}
          onDrillDown={handleDrillDown}
          enableComparisons={enableComparisons}
          compact={false}
        />

        {/* Individual referee breakdown for multi-referee view */}
        {!refereeId && performanceMetrics.length > 1 && (
          <View style={styles.refereeBreakdown}>
            <Text style={styles.breakdownTitle}>Individual Performance</Text>
            {performanceMetrics.slice(0, 10).map((metric) => (
              <TouchableOpacity
                key={metric.referee_id}
                style={styles.refereeItem}
                onPress={() => handleDrillDown(metric)}
              >
                <View style={styles.refereeInfo}>
                  <Text style={styles.refereeName}>{metric.referee_name}</Text>
                  <Text style={styles.refereeFederation}>{metric.federation_code}</Text>
                </View>
                <View style={styles.refereeStats}>
                  <Text style={styles.refereeAssignments}>{metric.total_assignments}</Text>
                  <Text style={styles.refereePerformance}>{metric.performance_score}%</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Export buttons */}
      {enableExport && (
        <View style={styles.exportSection}>
          <TouchableOpacity
            style={[styles.exportButton, styles.exportButtonCSV]}
            onPress={() => handleExport('csv')}
          >
            <Text style={styles.exportButtonText}>Export CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportButton, styles.exportButtonJSON]}
            onPress={() => handleExport('json')}
          >
            <Text style={styles.exportButtonText}>Export JSON</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.background,
  },
  
  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: designTokens.spacing.xl,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
    marginTop: designTokens.spacing.md,
  },
  loadingSubtext: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
    marginTop: designTokens.spacing.xs,
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: designTokens.spacing.xl,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: designTokens.spacing.md,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: designTokens.colors.error,
    marginBottom: designTokens.spacing.sm,
  },
  errorMessage: {
    fontSize: 16,
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: designTokens.spacing.lg,
  },
  retryButton: {
    backgroundColor: designTokens.colors.error,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    borderRadius: 8,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
    justifyContent: 'center',
  },
  retryButtonText: {
    color: designTokens.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: designTokens.spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: designTokens.spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.sm,
  },
  emptyMessage: {
    fontSize: 16,
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: designTokens.spacing.lg,
  },
  refreshButton: {
    backgroundColor: designTokens.colors.secondary,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.md,
    borderRadius: 8,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
    justifyContent: 'center',
  },
  refreshButtonText: {
    color: designTokens.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },

  // Header
  header: {
    backgroundColor: designTokens.colors.background,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.brandColors.primaryLight,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.md,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: designTokens.spacing.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: designTokens.colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: designTokens.brandColors.primaryLight,
  },
  performanceText: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
    marginTop: designTokens.spacing.xs,
  },

  // Metric selector
  metricSelector: {
    flexDirection: 'row',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    backgroundColor: designTokens.brandColors.primaryLight,
    gap: designTokens.spacing.xs,
  },
  metricButton: {
    flex: 1,
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.xs,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
    justifyContent: 'center',
  },
  metricButtonActive: {
    backgroundColor: designTokens.colors.primary,
  },
  metricButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: designTokens.colors.textSecondary,
  },
  metricButtonTextActive: {
    color: designTokens.colors.background,
  },

  // Scroll content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: designTokens.spacing.xl,
  },

  // Referee breakdown
  refereeBreakdown: {
    margin: designTokens.spacing.md,
    backgroundColor: designTokens.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designTokens.brandColors.primaryLight,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
    padding: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.brandColors.primaryLight,
  },
  refereeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.brandColors.primaryLight,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
  },
  refereeInfo: {
    flex: 1,
  },
  refereeName: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
  },
  refereeFederation: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
  },
  refereeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.md,
  },
  refereeAssignments: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
    textAlign: 'right',
  },
  refereePerformance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: designTokens.colors.primary,
    minWidth: 50,
    textAlign: 'right',
  },

  // Export section
  exportSection: {
    flexDirection: 'row',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    backgroundColor: designTokens.brandColors.primaryLight,
    gap: designTokens.spacing.sm,
  },
  exportButton: {
    flex: 1,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
    justifyContent: 'center',
  },
  exportButtonCSV: {
    backgroundColor: designTokens.colors.secondary,
  },
  exportButtonJSON: {
    backgroundColor: designTokens.colors.primary,
  },
  exportButtonText: {
    color: designTokens.colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RefereeAnalyticsDashboard;