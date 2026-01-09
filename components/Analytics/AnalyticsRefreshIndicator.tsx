import React from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { designTokens } from '../../theme/tokens';

/**
 * Analytics Refresh Indicator Props Interface
 * Following Story 4.3 AC6 requirements for sync status indicators
 */
export interface AnalyticsRefreshIndicatorProps {
  lastUpdated: string;
  source: 'database' | 'cache';
  isRefreshing: boolean;
  onRefresh: () => void;
  performance: { queryTime: number };
  showTimestamp?: boolean;
  showDataSource?: boolean;
  showPerformance?: boolean;
}

/**
 * Analytics Refresh Indicator Component
 * Shows analytics data freshness, sync status, and performance metrics
 * Integrates with existing DataFreshness.tsx and SyncStatus.tsx patterns
 */
export function AnalyticsRefreshIndicator({
  lastUpdated,
  source,
  isRefreshing,
  onRefresh,
  performance,
  showTimestamp = true,
  showDataSource = true,
  showPerformance = true,
}: AnalyticsRefreshIndicatorProps) {
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getPerformanceStatus = (queryTime: number): { 
    status: 'excellent' | 'good' | 'slow'; 
    color: string; 
    label: string 
  } => {
    if (queryTime < 500) {
      return { status: 'excellent', color: '#4caf50', label: 'Excellent' };
    } else if (queryTime < 1000) {
      return { status: 'good', color: '#ff9800', label: 'Good' };
    } else {
      return { status: 'slow', color: '#f44336', label: 'Slow' };
    }
  };

  const getDataSourceInfo = (source: 'database' | 'cache'): {
    color: string;
    icon: string;
    label: string;
  } => {
    if (source === 'database') {
      return { color: '#4caf50', icon: '🟢', label: 'Live' };
    } else {
      return { color: '#ff9800', icon: '🟡', label: 'Cached' };
    }
  };

  const performanceInfo = getPerformanceStatus(performance.queryTime);
  const dataSourceInfo = getDataSourceInfo(source);
  const timestampText = formatTimestamp(lastUpdated);

  return (
    <View style={styles.container}>
      <View style={styles.infoContainer}>
        {/* Data freshness timestamp */}
        {showTimestamp && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Updated:</Text>
            <Text style={styles.infoValue}>{timestampText}</Text>
          </View>
        )}

        {/* Data source indicator */}
        {showDataSource && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Source:</Text>
            <View style={styles.sourceContainer}>
              <Text style={styles.sourceIcon}>{dataSourceInfo.icon}</Text>
              <Text style={[styles.infoValue, { color: dataSourceInfo.color }]}>
                {dataSourceInfo.label}
              </Text>
            </View>
          </View>
        )}

        {/* Performance metrics */}
        {showPerformance && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Performance:</Text>
            <View style={styles.performanceContainer}>
              <Text style={[styles.performanceValue, { color: performanceInfo.color }]}>
                {performance.queryTime}ms
              </Text>
              <Text style={[styles.performanceStatus, { color: performanceInfo.color }]}>
                {performanceInfo.label}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Manual refresh button */}
      <TouchableOpacity 
        onPress={onRefresh}
        disabled={isRefreshing}
        style={[styles.refreshButton, isRefreshing && styles.refreshButtonDisabled]}
      >
        {isRefreshing ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <Text style={styles.refreshIcon}>↻</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

/**
 * Compact version of Analytics Refresh Indicator
 * For use in smaller spaces or minimal UI contexts
 */
export function CompactAnalyticsRefreshIndicator({
  lastUpdated,
  source,
  isRefreshing,
  onRefresh,
  performance,
}: AnalyticsRefreshIndicatorProps) {
  const timestampText = formatTimestamp(lastUpdated);
  const dataSourceInfo = getDataSourceInfo(source);

  return (
    <View style={styles.compactContainer}>
      <View style={styles.compactInfo}>
        <Text style={styles.compactText}>
          {timestampText} • {dataSourceInfo.icon} {dataSourceInfo.label} • {performance.queryTime}ms
        </Text>
      </View>
      
      <TouchableOpacity 
        onPress={onRefresh}
        disabled={isRefreshing}
        style={styles.compactRefreshButton}
      >
        {isRefreshing ? (
          <ActivityIndicator size="small" color="#666" />
        ) : (
          <Text style={styles.compactRefreshIcon}>↻</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// Helper functions (duplicated to avoid import issues)
const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return date.toLocaleDateString();
  }
};


const getDataSourceInfo = (source: 'database' | 'cache') => {
  if (source === 'database') {
    return { color: '#4caf50', icon: '🟢', label: 'Live' };
  } else {
    return { color: '#ff9800', icon: '🟡', label: 'Cached' };
  }
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  infoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: designTokens.neutrals.textSecondary,
    marginRight: 4,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '500',
    color: designTokens.neutrals.textPrimary,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceIcon: {
    fontSize: 10,
    marginRight: 2,
  },
  performanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
  },
  performanceStatus: {
    fontSize: 10,
    fontWeight: '400',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshIcon: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#f8f9fa',
  },
  compactInfo: {
    flex: 1,
  },
  compactText: {
    fontSize: 11,
    color: designTokens.neutrals.textSecondary,
  },
  compactRefreshButton: {
    padding: 4,
    marginLeft: 8,
  },
  compactRefreshIcon: {
    fontSize: 12,
    color: designTokens.neutrals.textSecondary,
  },
});