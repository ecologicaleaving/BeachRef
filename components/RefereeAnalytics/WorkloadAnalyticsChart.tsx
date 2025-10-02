import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { designTokens } from '../../theme/tokens';
import { RefereePerformanceMetrics } from '../../hooks/useRefereeAnalytics';

/**
 * Props interface for WorkloadAnalyticsChart
 */
export interface WorkloadAnalyticsChartProps {
  data: RefereePerformanceMetrics[];
  onRefereePress?: (referee: RefereePerformanceMetrics) => void;
  showBalanceIndicator?: boolean;
  compact?: boolean;
}

/**
 * WorkloadAnalyticsChart Component
 * Specialized component for workload balancing and availability trends analysis
 * Provides visual representation of referee workload distribution
 */
export const WorkloadAnalyticsChart: React.FC<WorkloadAnalyticsChartProps> = ({
  data,
  onRefereePress,
  showBalanceIndicator = true,
  compact = false,
}) => {
  
  // Calculate workload statistics
  const workloadStats = useMemo(() => {
    if (data.length === 0) return null;

    const workloads = data.map(r => r.avg_matches_per_day);
    const totalAssignments = data.reduce((sum, r) => sum + r.total_assignments, 0);
    const avgWorkload = workloads.reduce((sum, w) => sum + w, 0) / workloads.length;
    const maxWorkload = Math.max(...workloads);
    const minWorkload = Math.min(...workloads);
    
    // Calculate workload balance score (1.0 = perfectly balanced, 0 = highly imbalanced)
    const workloadVariance = workloads.reduce((sum, w) => sum + Math.pow(w - avgWorkload, 2), 0) / workloads.length;
    const balanceScore = Math.max(0, 1 - (workloadVariance / (maxWorkload * maxWorkload)));

    // Group referees by workload level
    const highWorkload = data.filter(r => r.avg_matches_per_day > avgWorkload * 1.5);
    const normalWorkload = data.filter(r => r.avg_matches_per_day >= avgWorkload * 0.5 && r.avg_matches_per_day <= avgWorkload * 1.5);
    const lowWorkload = data.filter(r => r.avg_matches_per_day < avgWorkload * 0.5);

    return {
      avgWorkload: Math.round(avgWorkload * 100) / 100,
      maxWorkload: Math.round(maxWorkload * 100) / 100,
      minWorkload: Math.round(minWorkload * 100) / 100,
      balanceScore: Math.round(balanceScore * 100),
      totalAssignments,
      distribution: {
        high: highWorkload,
        normal: normalWorkload,
        low: lowWorkload,
      },
    };
  }, [data]);

  // Get workload level color
  const getWorkloadColor = (workload: number) => {
    if (!workloadStats) return designTokens.colors.textSecondary;
    
    if (workload > workloadStats.avgWorkload * 1.5) return designTokens.colors.error;
    if (workload > workloadStats.avgWorkload * 1.2) return designTokens.colors.warning;
    if (workload < workloadStats.avgWorkload * 0.5) return designTokens.colors.textSecondary;
    return designTokens.colors.success;
  };

  // Get trend indicator
  const getTrendIndicator = (trend: string) => {
    switch (trend) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      case 'stable': return '➡️';
      default: return '➡️';
    }
  };

  // Handle referee press
  const handleRefereePress = (referee: RefereePerformanceMetrics) => {
    if (onRefereePress) {
      onRefereePress(referee);
    }
  };

  if (!workloadStats) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No workload data available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Header with balance indicator */}
      <View style={styles.header}>
        <Text style={styles.title}>Workload Distribution</Text>
        {showBalanceIndicator && (
          <View style={styles.balanceIndicator}>
            <Text style={styles.balanceLabel}>Balance Score</Text>
            <View style={styles.balanceBarContainer}>
              <View 
                style={[
                  styles.balanceBar,
                  { 
                    width: `${workloadStats.balanceScore}%`,
                    backgroundColor: workloadStats.balanceScore >= 70 ? designTokens.colors.success :
                                   workloadStats.balanceScore >= 40 ? designTokens.colors.warning :
                                   designTokens.colors.error
                  }
                ]}
              />
            </View>
            <Text style={styles.balanceScore}>{workloadStats.balanceScore}%</Text>
          </View>
        )}
      </View>

      {/* Summary statistics */}
      <View style={styles.summaryStats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{workloadStats.avgWorkload}</Text>
          <Text style={styles.statLabel}>Avg/Day</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{workloadStats.maxWorkload}</Text>
          <Text style={styles.statLabel}>Max</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{workloadStats.minWorkload}</Text>
          <Text style={styles.statLabel}>Min</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{workloadStats.totalAssignments}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Workload chart */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll} nestedScrollEnabled={true}>
        <View style={styles.chart}>
          {data.slice(0, compact ? 8 : 15).map((referee) => (
            <TouchableOpacity
              key={referee.referee_id}
              style={styles.workloadBar}
              onPress={() => handleRefereePress(referee)}
            >
              <View style={styles.barContainer}>
                {/* Workload bar */}
                <View 
                  style={[
                    styles.bar,
                    { 
                      height: Math.max(20, (referee.avg_matches_per_day / workloadStats.maxWorkload) * 80),
                      backgroundColor: getWorkloadColor(referee.avg_matches_per_day)
                    }
                  ]}
                />
                
                {/* Value label */}
                <Text style={styles.barValue}>
                  {referee.avg_matches_per_day.toFixed(1)}
                </Text>
                
                {/* Trend indicator */}
                <Text style={styles.trendIndicator}>
                  {getTrendIndicator(referee.workload_trend)}
                </Text>
              </View>
              
              {/* Referee name */}
              <Text style={styles.barLabel} numberOfLines={1}>
                {referee.referee_name.replace('Referee ', 'R')}
              </Text>
              
              {/* Assignment details */}
              <Text style={styles.assignmentDetails}>
                {referee.total_assignments} total
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Distribution summary */}
      <View style={styles.distributionSummary}>
        <Text style={styles.distributionTitle}>Distribution</Text>
        <View style={styles.distributionItems}>
          <View style={styles.distributionItem}>
            <View style={[styles.distributionDot, { backgroundColor: designTokens.colors.error }]} />
            <Text style={styles.distributionText}>
              High ({workloadStats.distribution.high.length})
            </Text>
          </View>
          <View style={styles.distributionItem}>
            <View style={[styles.distributionDot, { backgroundColor: designTokens.colors.success }]} />
            <Text style={styles.distributionText}>
              Normal ({workloadStats.distribution.normal.length})
            </Text>
          </View>
          <View style={styles.distributionItem}>
            <View style={[styles.distributionDot, { backgroundColor: designTokens.colors.textSecondary }]} />
            <Text style={styles.distributionText}>
              Low ({workloadStats.distribution.low.length})
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designTokens.brandColors.primaryLight,
    margin: designTokens.spacing.md,
    shadowColor: designTokens.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  containerCompact: {
    margin: designTokens.spacing.sm,
  },

  // Empty state
  emptyContainer: {
    backgroundColor: designTokens.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designTokens.brandColors.primaryLight,
    borderStyle: 'dashed',
    margin: designTokens.spacing.md,
    padding: designTokens.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.brandColors.primaryLight,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
  },

  // Balance indicator
  balanceIndicator: {
    alignItems: 'center',
    minWidth: 80,
  },
  balanceLabel: {
    fontSize: 10,
    color: designTokens.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  balanceBarContainer: {
    width: 60,
    height: 6,
    backgroundColor: designTokens.brandColors.primaryLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  balanceBar: {
    height: '100%',
    borderRadius: 3,
    minWidth: 6,
  },
  balanceScore: {
    fontSize: 12,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
  },

  // Summary stats
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: designTokens.spacing.md,
    backgroundColor: designTokens.brandColors.primaryLight,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: designTokens.colors.primary,
  },
  statLabel: {
    fontSize: 10,
    color: designTokens.colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: designTokens.colors.textSecondary + '30',
  },

  // Chart
  chartScroll: {
    paddingVertical: designTokens.spacing.md,
  },
  chart: {
    flexDirection: 'row',
    paddingHorizontal: designTokens.spacing.md,
    alignItems: 'flex-end',
    minHeight: 120,
  },
  workloadBar: {
    alignItems: 'center',
    marginRight: designTokens.spacing.sm,
    minWidth: 50,
  },
  barContainer: {
    height: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: designTokens.spacing.xs,
  },
  bar: {
    width: 24,
    borderRadius: 4,
    minHeight: 20,
  },
  barValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
    marginTop: 4,
  },
  trendIndicator: {
    fontSize: 12,
    marginTop: 2,
  },
  barLabel: {
    fontSize: 10,
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 50,
    marginBottom: 2,
  },
  assignmentDetails: {
    fontSize: 8,
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
  },

  // Distribution summary
  distributionSummary: {
    padding: designTokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: designTokens.brandColors.primaryLight,
  },
  distributionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.sm,
  },
  distributionItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  distributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distributionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: designTokens.spacing.xs,
  },
  distributionText: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
  },
});

export default WorkloadAnalyticsChart;