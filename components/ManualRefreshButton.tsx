import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { ConnectionState } from '../services/RealtimePerformanceMonitor';
import { BaseComponentProps } from '../types/props';
import { designTokens } from '../theme/tokens';

interface ManualRefreshButtonProps extends BaseComponentProps {
  onRefresh: () => void;
  connectionState: ConnectionState;
  lastUpdated?: Date | null;
  showLastUpdated?: boolean;
  enableDiagnostics?: boolean;
  tournamentId?: string;
}

const ManualRefreshButton: React.FC<ManualRefreshButtonProps> = ({
  onRefresh,
  connectionState,
  lastUpdated,
  disabled = false,
  loading = false,
  showLastUpdated = true,
  enableDiagnostics = false,
  tournamentId,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
  ...restProps
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (disabled || isRefreshing || loading) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      // Add a small delay to prevent rapid successive refreshes
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const shouldShowRefreshButton = () => {
    // Always show refresh button when connection is not working properly
    return (
      connectionState === ConnectionState.ERROR ||
      connectionState === ConnectionState.DISCONNECTED ||
      disabled
    );
  };

  const getRefreshButtonText = () => {
    if (isRefreshing) return 'Refreshing...';
    
    switch (connectionState) {
      case ConnectionState.ERROR:
        return 'Retry Connection';
      case ConnectionState.DISCONNECTED:
        return 'Manual Refresh';
      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        return 'Refresh Data';
      default:
        return 'Refresh';
    }
  };

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 60) {
      return `${diffSec}s ago`;
    } else if (diffMin < 60) {
      return `${diffMin}m ago`;
    } else if (diffHour < 24) {
      return `${diffHour}h ago`;
    } else {
      return date.toLocaleString();
    }
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      {shouldShowRefreshButton() && (
        <TouchableOpacity
          style={[
            styles.refreshButton,
            disabled && styles.disabledButton,
            connectionState === ConnectionState.ERROR && styles.errorButton,
          ]}
          onPress={handleRefresh}
          disabled={disabled || isRefreshing || loading}
          accessibilityLabel={accessibilityLabel || `Refresh data - ${getRefreshButtonText()}`}
          accessibilityHint={accessibilityHint || "Manually refresh tournament data"}
          accessibilityRole="button"
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={styles.spinner} />
          ) : (
            <Text style={styles.refreshIcon}>🔄</Text>
          )}
          <Text style={[
            styles.refreshText,
            disabled && styles.disabledText,
          ]}>
            {getRefreshButtonText()}
          </Text>
        </TouchableOpacity>
      )}
      
      {showLastUpdated && lastUpdated && (
        <Text style={styles.lastUpdatedText}>
          Last updated: {formatLastUpdated(lastUpdated)}
        </Text>
      )}
      
      {connectionState === ConnectionState.CONNECTED && !shouldShowRefreshButton() && (
        <View style={styles.autoRefreshIndicator}>
          <Text style={styles.autoRefreshText}>🔄 Auto-refreshing</Text>
        </View>
      )}
    </View>
  );
};

/**
 * Compact version for use in headers or toolbars
 */
export const CompactRefreshButton: React.FC<{
  onRefresh: () => void;
  connectionState: ConnectionState;
  disabled?: boolean;
}> = ({ onRefresh, connectionState, disabled = false }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (disabled || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  // Only show if connection is not working properly
  if (connectionState === ConnectionState.CONNECTED) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.compactButton, disabled && styles.compactDisabled]}
      onPress={handleRefresh}
      disabled={disabled || isRefreshing}
    >
      {isRefreshing ? (
        <ActivityIndicator size="small" color="#0066cc" />
      ) : (
        <Text style={styles.compactIcon}>🔄</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066cc',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 120,
  },
  errorButton: {
    backgroundColor: '#F44336',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  spinner: {
    marginRight: 8,
  },
  refreshIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  refreshText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledText: {
    color: designTokens.neutrals.textTertiary,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: designTokens.neutrals.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  autoRefreshIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E8F5E8',
    borderRadius: 16,
    marginTop: 4,
  },
  autoRefreshText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  compactButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
  },
  compactDisabled: {
    opacity: 0.5,
  },
  compactIcon: {
    fontSize: 16,
  },
});

export default ManualRefreshButton;