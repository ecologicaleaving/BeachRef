import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ConnectionState } from '../services/RealtimePerformanceMonitor';
import { NetworkState, ConnectionQuality, ConnectionStrategy } from '../services/NetworkStateManager';
import { designTokens } from '../theme/tokens';

interface ConnectionStatusIndicatorProps {
  connectionState: ConnectionState;
  isSubscribed: boolean;
  hasLiveMatches: boolean;
  lastUpdated?: Date | null;
  showDetails?: boolean;
  networkState?: NetworkState | null;
  connectionQuality?: ConnectionQuality | null;
  connectionMode?: ConnectionStrategy;
}

const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  connectionState,
  isSubscribed,
  hasLiveMatches,
  lastUpdated,
  showDetails = false,
  networkState,
  connectionQuality,
  connectionMode,
}) => {
  const getStatusInfo = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        if (hasLiveMatches) {
          return {
            color: '#4CAF50', // Green
            text: 'Live Updates',
            icon: '🔴', // Red dot for live
            description: 'Receiving real-time match updates',
          };
        } else {
          return {
            color: '#2196F3', // Blue
            text: 'Connected',
            icon: '🟢', // Green dot
            description: 'Ready for live updates',
          };
        }
      case ConnectionState.CONNECTING:
        return {
          color: '#FF9800', // Orange
          text: 'Connecting...',
          icon: '🟡', // Yellow dot
          description: 'Establishing real-time connection',
        };
      case ConnectionState.RECONNECTING:
        return {
          color: '#FF9800', // Orange
          text: 'Reconnecting...',
          icon: '🟡', // Yellow dot
          description: 'Attempting to restore connection',
        };
      case ConnectionState.ERROR:
        return {
          color: '#F44336', // Red
          text: 'Connection Error',
          icon: '🔴', // Red dot
          description: 'Real-time updates unavailable',
        };
      case ConnectionState.DISCONNECTED:
      default:
        return {
          color: designTokens.neutrals.textSecondary, // Gray
          text: 'Offline',
          icon: '⚫', // Black dot
          description: 'No real-time connection',
        };
    }
  };

  const statusInfo = getStatusInfo();

  const getConnectionModeText = (strategy?: ConnectionStrategy) => {
    if (!strategy) return null;
    switch (strategy) {
      case ConnectionStrategy.AGGRESSIVE_WEBSOCKET:
        return 'Fast Mode';
      case ConnectionStrategy.CONSERVATIVE_WEBSOCKET:
        return 'Stable Mode';
      case ConnectionStrategy.HYBRID_MODE:
        return 'Hybrid Mode';
      case ConnectionStrategy.POLLING_ONLY:
        return 'Polling Mode';
      case ConnectionStrategy.OFFLINE_MODE:
        return 'Offline Mode';
      default:
        return 'Standard Mode';
    }
  };

  const getNetworkTypeIcon = (type?: string) => {
    if (!type) return null;
    switch (type) {
      case 'wifi':
        return '📶';
      case 'cellular':
        return '📱';
      case 'ethernet':
        return '🔌';
      default:
        return '🌐';
    }
  };

  // Don't show indicator if not subscribed and not connecting
  if (!isSubscribed && connectionState === ConnectionState.DISCONNECTED) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, { backgroundColor: statusInfo.color }]}>
        <Text style={styles.icon}>{statusInfo.icon}</Text>
        <Text style={styles.statusText}>{statusInfo.text}</Text>
        {networkState && (
          <Text style={styles.networkIcon}>{getNetworkTypeIcon(networkState.type)}</Text>
        )}
      </View>
      
      {showDetails && (
        <View style={styles.details}>
          <Text style={styles.descriptionText}>{statusInfo.description}</Text>
          
          {connectionMode && (
            <View style={styles.connectionMode}>
              <Text style={styles.modeLabel}>Mode:</Text>
              <Text style={styles.modeText}>{getConnectionModeText(connectionMode)}</Text>
            </View>
          )}

          {networkState && (
            <View style={styles.networkDetails}>
              <Text style={styles.networkLabel}>Network:</Text>
              <Text style={styles.networkText}>
                {networkState.type.toUpperCase()}
                {networkState.type === 'cellular' && networkState.details.cellularGeneration && (
                  <Text> ({networkState.details.cellularGeneration.toUpperCase()})</Text>
                )}
              </Text>
            </View>
          )}

          {connectionQuality && (
            <View style={styles.qualityDetails}>
              <Text style={styles.qualityLabel}>Quality:</Text>
              <Text style={[styles.qualityText, { color: getQualityColor(connectionQuality.level) }]}>
                {connectionQuality.level.toUpperCase()} ({connectionQuality.score}/100)
              </Text>
            </View>
          )}

          {lastUpdated && (
            <Text style={styles.timestampText}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  function getQualityColor(level: string): string {
    switch (level) {
      case 'excellent':
        return '#4CAF50';
      case 'good':
        return '#8BC34A';
      case 'fair':
        return '#FF9800';
      case 'poor':
        return '#F44336';
      case 'offline':
        return designTokens.neutrals.textSecondary;
      default:
        return designTokens.neutrals.textSecondary;
    }
  }
};

/**
 * Compact version for use in headers or small spaces
 */
export const CompactConnectionIndicator: React.FC<{
  connectionState: ConnectionState;
  hasLiveMatches: boolean;
}> = ({ connectionState, hasLiveMatches }) => {
  const getIndicatorColor = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return hasLiveMatches ? '#F44336' : '#4CAF50'; // Red for live, Green for connected
      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        return '#FF9800'; // Orange
      case ConnectionState.ERROR:
        return '#F44336'; // Red
      default:
        return designTokens.neutrals.textSecondary; // Gray
    }
  };

  return (
    <View style={[styles.compactIndicator, { backgroundColor: getIndicatorColor() }]} />
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  icon: {
    fontSize: 10,
    marginRight: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  networkIcon: {
    fontSize: 10,
    marginLeft: 6,
  },
  details: {
    marginTop: 4,
    paddingHorizontal: 8,
  },
  descriptionText: {
    fontSize: 11,
    color: designTokens.neutrals.textSecondary,
    marginBottom: 2,
  },
  timestampText: {
    fontSize: 10,
    color: designTokens.neutrals.textSecondary,
  },
  connectionMode: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  modeLabel: {
    fontSize: 11,
    color: designTokens.neutrals.textSecondary,
    fontWeight: '600',
    marginRight: 6,
  },
  modeText: {
    fontSize: 11,
    color: designTokens.neutrals.textPrimary,
  },
  networkDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  networkLabel: {
    fontSize: 11,
    color: designTokens.neutrals.textSecondary,
    fontWeight: '600',
    marginRight: 6,
  },
  networkText: {
    fontSize: 11,
    color: designTokens.neutrals.textPrimary,
  },
  qualityDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  qualityLabel: {
    fontSize: 11,
    color: designTokens.neutrals.textSecondary,
    fontWeight: '600',
    marginRight: 6,
  },
  qualityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  compactIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
});

export default ConnectionStatusIndicator;