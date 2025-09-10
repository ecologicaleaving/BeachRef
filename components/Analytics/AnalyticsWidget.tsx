import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { Button } from '../Foundation/Button';
import type { RefereePerformanceMetrics } from '../../hooks/useRefereeAnalytics';

/**
 * Analytics Widget Props Interface
 * Following Story 4.3 component specifications
 */
export interface AnalyticsWidgetProps {
  type: 'tournament' | 'referee' | 'performance' | 'overview';
  data: any;
  loading?: boolean;
  onRefresh?: () => void;
  onDrillDown?: (data: any) => void;
  expanded?: boolean;
}

/**
 * Analytics Widget Component
 * Displays different types of analytics data in widget format
 * Following existing component patterns from RefereeAnalytics
 */
export function AnalyticsWidget({
  type,
  data,
  loading = false,
  onRefresh,
  onDrillDown,
  expanded = false,
}: AnalyticsWidgetProps) {
  const renderTournamentWidget = () => {
    if (!data) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Tournament analytics coming soon</Text>
          <Text style={styles.emptySubtext}>
            Tournament analytics will be available when Story 4.1 infrastructure is complete
          </Text>
        </View>
      );
    }

    // Placeholder for tournament analytics rendering
    return (
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Tournament Analytics</Text>
        <Text style={styles.subtitle}>Participation trends and performance insights</Text>
      </View>
    );
  };

  const renderRefereeWidget = () => {
    const refereeData = data as RefereePerformanceMetrics[];
    
    if (!refereeData || refereeData.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No referee data available</Text>
          <Text style={styles.emptySubtext}>
            Check your date range and filters
          </Text>
        </View>
      );
    }

    const totalReferees = refereeData.length;
    const avgPerformanceScore = refereeData.reduce((sum, ref) => sum + ref.performance_score, 0) / totalReferees;
    const totalAssignments = refereeData.reduce((sum, ref) => sum + ref.total_assignments, 0);
    const avgCompletionRate = refereeData.reduce((sum, ref) => sum + ref.completion_rate, 0) / totalReferees;

    return (
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Referee Performance</Text>
        <View style={styles.metricsContainer}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{totalReferees}</Text>
            <Text style={styles.metricLabel}>Active Referees</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{totalAssignments}</Text>
            <Text style={styles.metricLabel}>Total Assignments</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{Math.round(avgPerformanceScore * 10) / 10}</Text>
            <Text style={styles.metricLabel}>Avg Performance</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{Math.round(avgCompletionRate)}%</Text>
            <Text style={styles.metricLabel}>Completion Rate</Text>
          </View>
        </View>

        {expanded && (
          <View style={styles.expandedContent}>
            <Text style={styles.sectionTitle}>Top Performers</Text>
            {refereeData
              .sort((a, b) => b.performance_score - a.performance_score)
              .slice(0, 5)
              .map((referee, index) => (
                <View key={referee.referee_id} style={styles.refereeItem}>
                  <Text style={styles.refereeName}>
                    #{index + 1} {referee.referee_name}
                  </Text>
                  <View style={styles.refereeStats}>
                    <Text style={styles.refereeScore}>
                      Score: {Math.round(referee.performance_score * 10) / 10}
                    </Text>
                    <Text style={styles.refereeAssignments}>
                      {referee.total_assignments} assignments
                    </Text>
                  </View>
                </View>
              ))
            }
          </View>
        )}
      </View>
    );
  };

  const renderPerformanceWidget = () => {
    if (!data || !data.performance) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Performance data unavailable</Text>
        </View>
      );
    }

    const { performance, source, lastUpdated } = data;
    const queryTime = performance.queryTime || 0;

    return (
      <View style={styles.contentContainer}>
        <Text style={styles.title}>System Performance</Text>
        <View style={styles.metricsContainer}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{queryTime}ms</Text>
            <Text style={styles.metricLabel}>Query Time</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[
              styles.metricValue,
              { color: source === 'database' ? '#4caf50' : '#ff9800' }
            ]}>
              {source}
            </Text>
            <Text style={styles.metricLabel}>Data Source</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[
              styles.metricValue,
              { color: queryTime < 500 ? '#4caf50' : queryTime < 1000 ? '#ff9800' : '#f44336' }
            ]}>
              {queryTime < 500 ? 'Excellent' : queryTime < 1000 ? 'Good' : 'Slow'}
            </Text>
            <Text style={styles.metricLabel}>Performance</Text>
          </View>
        </View>
        
        {expanded && (
          <View style={styles.expandedContent}>
            <Text style={styles.sectionTitle}>Performance Details</Text>
            <Text style={styles.performanceDetail}>
              Last Updated: {new Date(lastUpdated).toLocaleTimeString()}
            </Text>
            <Text style={styles.performanceDetail}>
              Target: &lt; 500ms query time
            </Text>
            <Text style={styles.performanceDetail}>
              Status: {queryTime < 500 ? '✅ Meeting target' : '⚠️ Above target'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderOverviewWidget = () => {
    return (
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Analytics Overview</Text>
        <Text style={styles.subtitle}>
          Real-time analytics dashboard demonstrating new architecture capabilities
        </Text>
        
        <View style={styles.overviewStats}>
          <Text style={styles.overviewText}>
            📊 Referee Analytics: {data?.refereeAnalytics?.length || 0} referees tracked
          </Text>
          <Text style={styles.overviewText}>
            🏆 Tournament Analytics: Coming soon
          </Text>
          <Text style={styles.overviewText}>
            ⚡ Real-time Updates: 30-second refresh cycle
          </Text>
          <Text style={styles.overviewText}>
            🎯 Performance Target: &lt; 2 second dashboard load
          </Text>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (loading && !data) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading {type} analytics...</Text>
        </View>
      );
    }

    switch (type) {
      case 'tournament':
        return renderTournamentWidget();
      case 'referee':
        return renderRefereeWidget();
      case 'performance':
        return renderPerformanceWidget();
      case 'overview':
        return renderOverviewWidget();
      default:
        return <Text>Unknown widget type</Text>;
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onDrillDown}
      activeOpacity={onDrillDown ? 0.7 : 1}
      disabled={!onDrillDown}
    >
      <View style={styles.header}>
        {loading && (
          <ActivityIndicator size="small" color="#007AFF" style={styles.headerIndicator} />
        )}
        {onRefresh && (
          <Button
            title="↻"
            onPress={onRefresh}
            style={styles.refreshButton}
            disabled={loading}
          />
        )}
      </View>
      
      {renderContent()}
      
      {onDrillDown && !expanded && (
        <View style={styles.drillDownIndicator}>
          <Text style={styles.drillDownText}>Tap to expand</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerIndicator: {
    marginRight: 8,
  },
  refreshButton: {
    padding: 4,
    backgroundColor: 'transparent',
    minWidth: 30,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    minWidth: '45%',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  refereeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  refereeName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  refereeStats: {
    alignItems: 'flex-end',
  },
  refereeScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  refereeAssignments: {
    fontSize: 12,
    color: '#666',
  },
  performanceDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  overviewStats: {
    marginTop: 12,
  },
  overviewText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  drillDownIndicator: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'center',
  },
  drillDownText: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
  },
});