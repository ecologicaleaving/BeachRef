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
 * Widget type for different analytics views
 */
export type RefereePerformanceWidgetType = 'assignments' | 'performance' | 'workload' | 'geographic';

/**
 * Props interface for RefereePerformanceWidget
 */
export interface RefereePerformanceWidgetProps {
  type: RefereePerformanceWidgetType;
  data: RefereePerformanceMetrics[];
  onDrillDown?: (referee: RefereePerformanceMetrics) => void;
  enableComparisons?: boolean;
  compact?: boolean;
}

/**
 * RefereePerformanceWidget Component
 * Reusable analytics widgets for different performance metrics
 * Following existing component structure patterns
 */
export const RefereePerformanceWidget: React.FC<RefereePerformanceWidgetProps> = ({
  type,
  data,
  onDrillDown,
  enableComparisons = true,
  compact = false,
}) => {

  // Sort data by performance score for better visualization
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.performance_score - a.performance_score);
  }, [data]);

  // Calculate aggregated statistics
  const statistics = useMemo(() => {
    if (data.length === 0) return null;

    const totalAssignments = data.reduce((sum, d) => sum + d.total_assignments, 0);
    const avgPerformance = data.reduce((sum, d) => sum + d.performance_score, 0) / data.length;
    const avgWorkload = data.reduce((sum, d) => sum + d.avg_matches_per_day, 0) / data.length;
    
    return {
      totalAssignments,
      avgPerformance: Math.round(avgPerformance),
      avgWorkload: Math.round(avgWorkload * 100) / 100,
      topPerformer: sortedData[0],
      activeReferees: data.filter(d => d.total_assignments > 0).length,
    };
  }, [data, sortedData]);

  // Handle referee selection
  const handleRefereePress = (referee: RefereePerformanceMetrics) => {
    if (onDrillDown) {
      onDrillDown(referee);
    }
  };

  // Render assignment frequency visualization
  const renderAssignmentFrequency = () => (
    <View style={styles.widgetContent}>
      <Text style={styles.widgetTitle}>Assignment Frequency</Text>
      {statistics && (
        <View style={styles.statsSummary}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{statistics.totalAssignments}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{statistics.activeReferees}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{Math.round(statistics.totalAssignments / data.length)}</Text>
            <Text style={styles.statLabel}>Avg/Referee</Text>
          </View>
        </View>
      )}
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {sortedData.slice(0, compact ? 5 : 10).map((referee) => (
          <TouchableOpacity
            key={referee.referee_id}
            style={styles.assignmentBar}
            onPress={() => handleRefereePress(referee)}
          >
            <View style={styles.barContainer}>
              <View 
                style={[
                  styles.bar,
                  { 
                    height: Math.max(20, (referee.total_assignments / (statistics?.totalAssignments || 1)) * 100),
                    backgroundColor: referee.total_assignments > (statistics?.avgPerformance || 0) * 0.8 
                      ? designTokens.colors.primary 
                      : designTokens.colors.secondary
                  }
                ]}
              />
              <Text style={styles.barValue}>{referee.total_assignments}</Text>
            </View>
            <Text style={styles.barLabel} numberOfLines={1}>
              {referee.referee_name.replace('Referee ', 'R')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Render performance ratings visualization
  const renderPerformanceRatings = () => (
    <View style={styles.widgetContent}>
      <Text style={styles.widgetTitle}>Performance Ratings</Text>
      {statistics && (
        <View style={styles.performanceHeader}>
          <Text style={styles.avgPerformanceText}>
            Average: {statistics.avgPerformance}%
          </Text>
          <Text style={styles.topPerformerText}>
            Top: {statistics.topPerformer?.referee_name} ({statistics.topPerformer?.performance_score}%)
          </Text>
        </View>
      )}
      
      <View style={styles.performanceList}>
        {sortedData.slice(0, compact ? 3 : 8).map((referee, index) => {
          const isTopPerformer = index === 0;
          const performanceLevel = referee.performance_score >= 80 ? 'excellent' : 
                                 referee.performance_score >= 60 ? 'good' : 'needs-improvement';
          
          return (
            <TouchableOpacity
              key={referee.referee_id}
              style={[
                styles.performanceItem,
                isTopPerformer && styles.topPerformerItem
              ]}
              onPress={() => handleRefereePress(referee)}
            >
              <View style={styles.performanceInfo}>
                <Text style={[styles.refereeName, isTopPerformer && styles.topPerformerName]}>
                  {referee.referee_name}
                  {isTopPerformer && ' 🏆'}
                </Text>
                <Text style={styles.refereeDetails}>
                  {referee.total_assignments} assignments • {referee.federation_code}
                </Text>
              </View>
              <View style={styles.performanceScore}>
                <Text 
                  style={[
                    styles.scoreText,
                    { color: performanceLevel === 'excellent' ? designTokens.colors.success :
                             performanceLevel === 'good' ? designTokens.colors.primary :
                             designTokens.colors.warning }
                  ]}
                >
                  {referee.performance_score}%
                </Text>
                <View style={[styles.performanceBar, { backgroundColor: designTokens.brandColors.primaryLight }]}>
                  <View 
                    style={[
                      styles.performanceBarFill,
                      { 
                        width: `${referee.performance_score}%`,
                        backgroundColor: performanceLevel === 'excellent' ? designTokens.colors.success :
                                       performanceLevel === 'good' ? designTokens.colors.primary :
                                       designTokens.colors.warning
                      }
                    ]}
                  />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // Render workload analysis
  const renderWorkloadAnalysis = () => (
    <View style={styles.widgetContent}>
      <Text style={styles.widgetTitle}>Workload Analysis</Text>
      {statistics && (
        <View style={styles.statsSummary}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{statistics.avgWorkload}</Text>
            <Text style={styles.statLabel}>Avg Matches/Day</Text>
          </View>
        </View>
      )}
      
      <View style={styles.workloadGrid}>
        {sortedData.slice(0, compact ? 4 : 6).map((referee) => {
          const workloadLevel = referee.avg_matches_per_day > 3 ? 'high' :
                               referee.avg_matches_per_day > 1 ? 'medium' : 'low';
          
          return (
            <TouchableOpacity
              key={referee.referee_id}
              style={[styles.workloadCard, { borderLeftColor: workloadLevel === 'high' ? designTokens.colors.error :
                                                                workloadLevel === 'medium' ? designTokens.colors.warning :
                                                                designTokens.colors.success }]}
              onPress={() => handleRefereePress(referee)}
            >
              <Text style={styles.workloadName}>{referee.referee_name}</Text>
              <View style={styles.workloadStats}>
                <Text style={styles.workloadValue}>{referee.avg_matches_per_day}/day</Text>
                <Text style={styles.workloadTrend}>{referee.workload_trend}</Text>
              </View>
              <Text style={styles.workloadRole}>
                {referee.first_referee_count}F • {referee.second_referee_count}S • {referee.challenge_referee_count}C
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // Render geographic distribution
  const renderGeographicDistribution = () => (
    <View style={styles.widgetContent}>
      <Text style={styles.widgetTitle}>Tournament Coverage</Text>
      
      <View style={styles.geographicList}>
        {sortedData.slice(0, compact ? 3 : 6).map((referee) => (
          <TouchableOpacity
            key={referee.referee_id}
            style={styles.geographicItem}
            onPress={() => handleRefereePress(referee)}
          >
            <View style={styles.geographicInfo}>
              <Text style={styles.geographicName}>{referee.referee_name}</Text>
              <Text style={styles.geographicCoverage}>
                {referee.tournaments_worked.length} tournaments
              </Text>
            </View>
            <View style={styles.tournamentBadges}>
              {referee.tournaments_worked.slice(0, 3).map((tournament, index) => (
                <View key={index} style={styles.tournamentBadge}>
                  <Text style={styles.tournamentBadgeText}>
                    {tournament.substring(0, 3).toUpperCase()}
                  </Text>
                </View>
              ))}
              {referee.tournaments_worked.length > 3 && (
                <View style={[styles.tournamentBadge, { backgroundColor: designTokens.colors.textSecondary }]}>
                  <Text style={styles.tournamentBadgeText}>
                    +{referee.tournaments_worked.length - 3}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Main render method
  const renderWidget = () => {
    switch (type) {
      case 'assignments':
        return renderAssignmentFrequency();
      case 'performance':
        return renderPerformanceRatings();
      case 'workload':
        return renderWorkloadAnalysis();
      case 'geographic':
        return renderGeographicDistribution();
      default:
        return renderPerformanceRatings();
    }
  };

  if (data.length === 0) {
    return (
      <View style={styles.emptyWidget}>
        <Text style={styles.emptyText}>No data available for {type} analysis</Text>
      </View>
    );
  }

  return (
    <View style={[styles.widget, compact && styles.widgetCompact]}>
      {renderWidget()}
    </View>
  );
};

const styles = StyleSheet.create({
  widget: {
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
  widgetCompact: {
    margin: designTokens.spacing.sm,
  },
  widgetContent: {
    padding: designTokens.spacing.md,
  },
  widgetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.md,
  },

  // Empty state
  emptyWidget: {
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

  // Stats summary
  statsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    backgroundColor: designTokens.brandColors.primaryLight,
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: designTokens.colors.primary,
  },
  statLabel: {
    fontSize: 10,
    color: designTokens.colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  // Assignment frequency
  horizontalScroll: {
    marginTop: designTokens.spacing.sm,
  },
  assignmentBar: {
    alignItems: 'center',
    marginRight: designTokens.spacing.md,
    minWidth: 50,
  },
  barContainer: {
    height: 120,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: designTokens.spacing.xs,
  },
  bar: {
    width: 30,
    borderRadius: 4,
    minHeight: 20,
  },
  barValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
    marginTop: 4,
  },
  barLabel: {
    fontSize: 10,
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 50,
  },

  // Performance ratings
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.sm,
  },
  avgPerformanceText: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
  },
  topPerformerText: {
    fontSize: 12,
    color: designTokens.colors.success,
    fontWeight: '600',
  },
  performanceList: {
    gap: designTokens.spacing.xs,
  },
  performanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: designTokens.spacing.sm,
    backgroundColor: designTokens.brandColors.primaryLight,
    borderRadius: 8,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
  },
  topPerformerItem: {
    backgroundColor: designTokens.colors.success + '20',
    borderWidth: 1,
    borderColor: designTokens.colors.success,
  },
  performanceInfo: {
    flex: 1,
  },
  refereeName: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
  },
  topPerformerName: {
    color: designTokens.colors.success,
  },
  refereeDetails: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
    marginTop: 2,
  },
  performanceScore: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  performanceBar: {
    width: 60,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  performanceBarFill: {
    height: '100%',
    minWidth: 4,
  },

  // Workload analysis
  workloadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.sm,
    marginTop: designTokens.spacing.sm,
  },
  workloadCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: designTokens.brandColors.primaryLight,
    borderRadius: 8,
    padding: designTokens.spacing.sm,
    borderLeftWidth: 4,
  },
  workloadName: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.xs,
  },
  workloadStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.xs,
  },
  workloadValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: designTokens.colors.primary,
  },
  workloadTrend: {
    fontSize: 10,
    color: designTokens.colors.textSecondary,
    textTransform: 'uppercase',
  },
  workloadRole: {
    fontSize: 10,
    color: designTokens.colors.textSecondary,
  },

  // Geographic distribution
  geographicList: {
    gap: designTokens.spacing.sm,
    marginTop: designTokens.spacing.sm,
  },
  geographicItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: designTokens.spacing.sm,
    backgroundColor: designTokens.brandColors.primaryLight,
    borderRadius: 8,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
  },
  geographicInfo: {
    flex: 1,
  },
  geographicName: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
  },
  geographicCoverage: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
    marginTop: 2,
  },
  tournamentBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  tournamentBadge: {
    backgroundColor: designTokens.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  tournamentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: designTokens.colors.background,
  },
});

export default RefereePerformanceWidget;