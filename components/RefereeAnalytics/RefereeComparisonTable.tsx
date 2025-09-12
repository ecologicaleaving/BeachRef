import React, { useMemo, useState } from 'react';
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
 * Comparison metric types
 */
export type ComparisonMetric = 'performance_score' | 'total_assignments' | 'completion_rate' | 
                              'avg_matches_per_day' | 'tournaments_worked' | 'role_diversity';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Props interface for RefereeComparisonTable
 */
export interface RefereeComparisonTableProps {
  data: RefereePerformanceMetrics[];
  onRefereePress?: (referee: RefereePerformanceMetrics) => void;
  enableRanking?: boolean;
  enableBenchmarking?: boolean;
  compact?: boolean;
  maxReferees?: number;
}

/**
 * Extended referee data with ranking information
 */
interface RankedReferee extends RefereePerformanceMetrics {
  ranking: {
    overall: number;
    performance: number;
    workload: number;
    experience: number;
  };
  benchmarkComparison: {
    performance: 'above' | 'at' | 'below';
    workload: 'above' | 'at' | 'below';
    experience: 'above' | 'at' | 'below';
  };
}

/**
 * RefereeComparisonTable Component
 * Provides comprehensive comparison and ranking of referee performance
 * Includes performance benchmarking and peer comparison features
 */
export const RefereeComparisonTable: React.FC<RefereeComparisonTableProps> = ({
  data,
  onRefereePress,
  enableRanking = true,
  enableBenchmarking = true,
  compact = false,
  maxReferees = 20,
}) => {
  const [sortMetric, setSortMetric] = useState<ComparisonMetric>('performance_score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Calculate benchmarks and rankings
  const rankedData = useMemo(() => {
    if (data.length === 0) return [];

    // Calculate benchmark values
    const benchmarks = {
      performance: data.reduce((sum, r) => sum + r.performance_score, 0) / data.length,
      workload: data.reduce((sum, r) => sum + r.avg_matches_per_day, 0) / data.length,
      experience: data.reduce((sum, r) => sum + r.tournaments_worked.length, 0) / data.length,
    };

    // Sort data for ranking calculations
    const performanceRanked = [...data].sort((a, b) => b.performance_score - a.performance_score);
    const workloadRanked = [...data].sort((a, b) => b.avg_matches_per_day - a.avg_matches_per_day);
    const experienceRanked = [...data].sort((a, b) => b.tournaments_worked.length - a.tournaments_worked.length);

    // Create ranked referee data
    const rankedReferees: RankedReferee[] = data.map(referee => {
      const performanceRank = performanceRanked.findIndex(r => r.referee_id === referee.referee_id) + 1;
      const workloadRank = workloadRanked.findIndex(r => r.referee_id === referee.referee_id) + 1;
      const experienceRank = experienceRanked.findIndex(r => r.referee_id === referee.referee_id) + 1;

      // Calculate overall rank as weighted average
      const overallRank = Math.round(
        (performanceRank * 0.5) + (workloadRank * 0.3) + (experienceRank * 0.2)
      );

      return {
        ...referee,
        ranking: {
          overall: overallRank,
          performance: performanceRank,
          workload: workloadRank,
          experience: experienceRank,
        },
        benchmarkComparison: {
          performance: referee.performance_score > benchmarks.performance * 1.1 ? 'above' :
                      referee.performance_score < benchmarks.performance * 0.9 ? 'below' : 'at',
          workload: referee.avg_matches_per_day > benchmarks.workload * 1.1 ? 'above' :
                   referee.avg_matches_per_day < benchmarks.workload * 0.9 ? 'below' : 'at',
          experience: referee.tournaments_worked.length > benchmarks.experience * 1.1 ? 'above' :
                     referee.tournaments_worked.length < benchmarks.experience * 0.9 ? 'below' : 'at',
        },
      };
    });

    return rankedReferees;
  }, [data]);

  // Sort data based on current sort settings
  const sortedData = useMemo(() => {
    if (rankedData.length === 0) return [];

    return [...rankedData].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortMetric) {
        case 'performance_score':
          aValue = a.performance_score;
          bValue = b.performance_score;
          break;
        case 'total_assignments':
          aValue = a.total_assignments;
          bValue = b.total_assignments;
          break;
        case 'completion_rate':
          aValue = a.completion_rate;
          bValue = b.completion_rate;
          break;
        case 'avg_matches_per_day':
          aValue = a.avg_matches_per_day;
          bValue = b.avg_matches_per_day;
          break;
        case 'tournaments_worked':
          aValue = a.tournaments_worked.length;
          bValue = b.tournaments_worked.length;
          break;
        case 'role_diversity':
          aValue = [a.first_referee_count > 0, a.second_referee_count > 0, a.challenge_referee_count > 0]
            .filter(Boolean).length;
          bValue = [b.first_referee_count > 0, b.second_referee_count > 0, b.challenge_referee_count > 0]
            .filter(Boolean).length;
          break;
        default:
          aValue = a.performance_score;
          bValue = b.performance_score;
      }

      return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
    }).slice(0, maxReferees);
  }, [rankedData, sortMetric, sortDirection, maxReferees]);

  // Handle header press for sorting
  const handleHeaderPress = (metric: ComparisonMetric) => {
    if (sortMetric === metric) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortMetric(metric);
      setSortDirection('desc');
    }
  };

  // Handle referee press
  const handleRefereePress = (referee: RankedReferee) => {
    if (onRefereePress) {
      onRefereePress(referee);
    }
  };

  // Get benchmark indicator color
  const getBenchmarkColor = (comparison: 'above' | 'at' | 'below') => {
    switch (comparison) {
      case 'above': return designTokens.colors.success;
      case 'below': return designTokens.colors.error;
      case 'at': return designTokens.colors.warning;
      default: return designTokens.colors.textSecondary;
    }
  };

  // Get benchmark indicator text
  const getBenchmarkIndicator = (comparison: 'above' | 'at' | 'below') => {
    switch (comparison) {
      case 'above': return '▲';
      case 'below': return '▼';
      case 'at': return '=';
      default: return '';
    }
  };

  // Get rank badge style
  const getRankBadgeStyle = (rank: number) => {
    if (rank === 1) return { backgroundColor: '#FFD700', color: '#000' }; // Gold
    if (rank === 2) return { backgroundColor: '#C0C0C0', color: '#000' }; // Silver
    if (rank === 3) return { backgroundColor: '#CD7F32', color: '#FFF' }; // Bronze
    if (rank <= 5) return { backgroundColor: designTokens.colors.success, color: designTokens.colors.background };
    if (rank <= 10) return { backgroundColor: designTokens.colors.primary, color: designTokens.colors.background };
    return { backgroundColor: designTokens.colors.textSecondary, color: designTokens.colors.background };
  };

  if (sortedData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No referee data available for comparison</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Referee Comparison & Ranking</Text>
        <Text style={styles.subtitle}>
          Showing {sortedData.length} referees • Sorted by {sortMetric.replace('_', ' ')} {sortDirection === 'desc' ? '↓' : '↑'}
        </Text>
      </View>

      {/* Table header */}
      <View style={styles.tableHeader}>
        <View style={[styles.headerCell, styles.nameColumn]}>
          <Text style={styles.headerText}>Referee</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.headerCell, styles.scoreColumn]}
          onPress={() => handleHeaderPress('performance_score')}
        >
          <Text style={[styles.headerText, sortMetric === 'performance_score' && styles.activeHeader]}>
            Score {sortMetric === 'performance_score' && (sortDirection === 'desc' ? '↓' : '↑')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.headerCell, styles.assignmentColumn]}
          onPress={() => handleHeaderPress('total_assignments')}
        >
          <Text style={[styles.headerText, sortMetric === 'total_assignments' && styles.activeHeader]}>
            Assignments {sortMetric === 'total_assignments' && (sortDirection === 'desc' ? '↓' : '↑')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.headerCell, styles.workloadColumn]}
          onPress={() => handleHeaderPress('avg_matches_per_day')}
        >
          <Text style={[styles.headerText, sortMetric === 'avg_matches_per_day' && styles.activeHeader]}>
            Workload {sortMetric === 'avg_matches_per_day' && (sortDirection === 'desc' ? '↓' : '↑')}
          </Text>
        </TouchableOpacity>

        {enableRanking && (
          <View style={[styles.headerCell, styles.rankColumn]}>
            <Text style={styles.headerText}>Rank</Text>
          </View>
        )}
      </View>

      {/* Table body */}
      <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
        {sortedData.map((referee, index) => {
          const isTopPerformer = index < 3;
          const roleCount = [
            referee.first_referee_count > 0,
            referee.second_referee_count > 0,
            referee.challenge_referee_count > 0
          ].filter(Boolean).length;

          return (
            <TouchableOpacity
              key={referee.referee_id}
              style={[
                styles.tableRow,
                isTopPerformer && styles.topPerformerRow,
                index % 2 === 0 && styles.evenRow
              ]}
              onPress={() => handleRefereePress(referee)}
            >
              {/* Name column */}
              <View style={[styles.cell, styles.nameColumn]}>
                <Text style={[styles.refereeName, isTopPerformer && styles.topPerformerName]}>
                  {referee.referee_name}
                  {index === 0 && ' 🥇'}
                  {index === 1 && ' 🥈'}
                  {index === 2 && ' 🥉'}
                </Text>
                <Text style={styles.federationCode}>{referee.federation_code}</Text>
                {enableBenchmarking && (
                  <View style={styles.benchmarkIndicators}>
                    <Text 
                      style={[
                        styles.benchmarkIndicator,
                        { color: getBenchmarkColor(referee.benchmarkComparison.performance) }
                      ]}
                    >
                      P{getBenchmarkIndicator(referee.benchmarkComparison.performance)}
                    </Text>
                    <Text 
                      style={[
                        styles.benchmarkIndicator,
                        { color: getBenchmarkColor(referee.benchmarkComparison.workload) }
                      ]}
                    >
                      W{getBenchmarkIndicator(referee.benchmarkComparison.workload)}
                    </Text>
                    <Text 
                      style={[
                        styles.benchmarkIndicator,
                        { color: getBenchmarkColor(referee.benchmarkComparison.experience) }
                      ]}
                    >
                      E{getBenchmarkIndicator(referee.benchmarkComparison.experience)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Score column */}
              <View style={[styles.cell, styles.scoreColumn]}>
                <Text style={[styles.scoreText, isTopPerformer && styles.topPerformerScore]}>
                  {referee.performance_score}%
                </Text>
                <View style={styles.scoreBar}>
                  <View 
                    style={[
                      styles.scoreBarFill,
                      { 
                        width: `${referee.performance_score}%`,
                        backgroundColor: referee.performance_score >= 80 ? designTokens.colors.success :
                                       referee.performance_score >= 60 ? designTokens.colors.primary :
                                       designTokens.colors.warning
                      }
                    ]}
                  />
                </View>
              </View>

              {/* Assignments column */}
              <View style={[styles.cell, styles.assignmentColumn]}>
                <Text style={styles.assignmentText}>{referee.total_assignments}</Text>
                <Text style={styles.roleText}>
                  {referee.first_referee_count}F • {referee.second_referee_count}S • {referee.challenge_referee_count}C
                </Text>
                <Text style={styles.diversityText}>
                  {roleCount} role{roleCount !== 1 ? 's' : ''}
                </Text>
              </View>

              {/* Workload column */}
              <View style={[styles.cell, styles.workloadColumn]}>
                <Text style={styles.workloadText}>
                  {referee.avg_matches_per_day.toFixed(1)}/day
                </Text>
                <Text style={styles.trendText}>
                  {referee.workload_trend === 'increasing' ? '📈' : 
                   referee.workload_trend === 'decreasing' ? '📉' : '➡️'} {referee.workload_trend}
                </Text>
                <Text style={styles.tournamentText}>
                  {referee.tournaments_worked.length} tournaments
                </Text>
              </View>

              {/* Rank column */}
              {enableRanking && (
                <View style={[styles.cell, styles.rankColumn]}>
                  <View 
                    style={[
                      styles.rankBadge,
                      getRankBadgeStyle(referee.ranking.overall)
                    ]}
                  >
                    <Text 
                      style={[
                        styles.rankText,
                        { color: getRankBadgeStyle(referee.ranking.overall).color }
                      ]}
                    >
                      #{referee.ranking.overall}
                    </Text>
                  </View>
                  <View style={styles.rankBreakdown}>
                    <Text style={styles.rankBreakdownText}>
                      P:{referee.ranking.performance} W:{referee.ranking.workload} E:{referee.ranking.experience}
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
    padding: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.brandColors.primaryLight,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
    marginTop: 4,
  },

  // Table structure
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: designTokens.brandColors.primaryLight,
    paddingVertical: designTokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.textSecondary + '30',
  },
  headerCell: {
    paddingHorizontal: designTokens.spacing.xs,
    justifyContent: 'center',
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget * 0.8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: designTokens.colors.textSecondary,
    textTransform: 'uppercase',
  },
  activeHeader: {
    color: designTokens.colors.primary,
  },

  // Column widths
  nameColumn: { flex: 2.5 },
  scoreColumn: { flex: 1.5 },
  assignmentColumn: { flex: 2 },
  workloadColumn: { flex: 2 },
  rankColumn: { flex: 1.5 },

  // Table body
  tableBody: {
    maxHeight: 400,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: designTokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.brandColors.primaryLight,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
  },
  topPerformerRow: {
    backgroundColor: designTokens.colors.success + '10',
  },
  evenRow: {
    backgroundColor: designTokens.brandColors.primaryLight + '50',
  },
  cell: {
    paddingHorizontal: designTokens.spacing.xs,
    justifyContent: 'center',
  },

  // Name column styles
  refereeName: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
  },
  topPerformerName: {
    color: designTokens.colors.success,
    fontWeight: 'bold',
  },
  federationCode: {
    fontSize: 11,
    color: designTokens.colors.textSecondary,
    marginTop: 2,
  },
  benchmarkIndicators: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  benchmarkIndicator: {
    fontSize: 8,
    fontWeight: '600',
  },

  // Score column styles
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
  },
  topPerformerScore: {
    color: designTokens.colors.success,
  },
  scoreBar: {
    width: '100%',
    height: 3,
    backgroundColor: designTokens.brandColors.primaryLight,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    minWidth: 3,
  },

  // Assignment column styles
  assignmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
  },
  roleText: {
    fontSize: 10,
    color: designTokens.colors.textSecondary,
    marginTop: 2,
  },
  diversityText: {
    fontSize: 9,
    color: designTokens.colors.primary,
    marginTop: 2,
    fontWeight: '600',
  },

  // Workload column styles
  workloadText: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
  },
  trendText: {
    fontSize: 10,
    color: designTokens.colors.textSecondary,
    marginTop: 2,
  },
  tournamentText: {
    fontSize: 9,
    color: designTokens.colors.textSecondary,
    marginTop: 2,
  },

  // Rank column styles
  rankBadge: {
    alignSelf: 'center',
    paddingHorizontal: designTokens.spacing.xs,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  rankBreakdown: {
    marginTop: 4,
  },
  rankBreakdownText: {
    fontSize: 8,
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
  },
});

export default RefereeComparisonTable;