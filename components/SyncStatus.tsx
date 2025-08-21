import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSyncManager } from '../hooks/useSyncManager';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface SyncStatusProps {
  compact?: boolean;
  showForceSync?: boolean;
  style?: any;
  onForceSync?: () => void;
}

/**
 * Sync status indicator component
 * Shows current sync state and provides manual sync option
 */
export function SyncStatus({ 
  compact = false, 
  showForceSync = true,
  style,
  onForceSync 
}: SyncStatusProps) {
  const { syncStatus, forceSyncAll, isSyncing, lastSyncTime } = useSyncManager();
  const { isConnected } = useNetworkStatus();

  const handleForceSync = async () => {
    if (onForceSync) {
      onForceSync();
    } else {
      try {
        await forceSyncAll();
      } catch (error) {
        // console.error('Manual sync failed:', error);
      }
    }
  };

  const getStatusText = () => {
    if (!isConnected) {
      return 'Offline';
    }

    if (isSyncing) {
      return `Syncing${syncStatus.queueLength > 0 ? ` (${syncStatus.queueLength})` : ''}`;
    }

    if (syncStatus.queueLength > 0) {
      return `${syncStatus.queueLength} pending`;
    }

    if (lastSyncTime) {
      const now = new Date();
      const diffMs = now.getTime() - lastSyncTime.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      
      if (diffMins < 1) return 'Just synced';
      if (diffMins < 60) return `Synced ${diffMins}m ago`;
      return `Synced ${Math.floor(diffMins / 60)}h ago`;
    }

    return 'Ready to sync';
  };

  const getStatusColor = () => {
    if (!isConnected) return '#FF5722';
    if (isSyncing) return '#2196F3';
    if (syncStatus.queueLength > 0) return '#FF9800';
    return '#4CAF50';
  };

  const getStatusIcon = () => {
    if (!isConnected) return '📵';
    if (isSyncing) return '🔄';
    if (syncStatus.queueLength > 0) return '⏳';
    return '✅';
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={[styles.compactIndicator, { backgroundColor: getStatusColor() }]}>
          {isSyncing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.compactIcon}>{getStatusIcon()}</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.statusContainer}>
        <View style={[styles.indicator, { backgroundColor: getStatusColor() }]}>
          {isSyncing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.icon}>{getStatusIcon()}</Text>
          )}
        </View>
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>
      
      {showForceSync && isConnected && !isSyncing && (
        <TouchableOpacity 
          style={styles.syncButton}
          onPress={handleForceSync}
          accessibilityLabel="Sync now"
        >
          <Text style={styles.syncButtonText}>Sync</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Detailed sync status component with queue information
 */
export function SyncStatusDetailed({ style }: { style?: any }) {
  const { syncStatus, clearQueue, forceSyncAll } = useSyncManager();
  const { isConnected } = useNetworkStatus();

  const handleClearQueue = () => {
    clearQueue();
  };

  const handleForceSync = async () => {
    try {
      await forceSyncAll();
    } catch (error) {
      // console.error('Force sync failed:', error);
    }
  };

  return (
    <View style={[styles.detailedContainer, style]}>
      <Text style={styles.detailedTitle}>Sync Status</Text>
      
      <View style={styles.detailedRow}>
        <Text style={styles.detailedLabel}>Network:</Text>
        <Text style={[
          styles.detailedValue, 
          { color: isConnected ? '#4CAF50' : '#FF5722' }
        ]}>
          {isConnected ? 'Connected' : 'Offline'}
        </Text>
      </View>

      <View style={styles.detailedRow}>
        <Text style={styles.detailedLabel}>Queue:</Text>
        <Text style={styles.detailedValue}>
          {syncStatus.queueLength} task{syncStatus.queueLength !== 1 ? 's' : ''}
        </Text>
      </View>

      <View style={styles.detailedRow}>
        <Text style={styles.detailedLabel}>Status:</Text>
        <Text style={[
          styles.detailedValue,
          { color: syncStatus.isProcessing ? '#2196F3' : '#666' }
        ]}>
          {syncStatus.isProcessing ? 'Processing' : 'Idle'}
        </Text>
      </View>

      {syncStatus.lastSyncAttempt > 0 && (
        <View style={styles.detailedRow}>
          <Text style={styles.detailedLabel}>Last Sync:</Text>
          <Text style={styles.detailedValue}>
            {new Date(syncStatus.lastSyncAttempt).toLocaleTimeString()}
          </Text>
        </View>
      )}

      <View style={styles.detailedActions}>
        {isConnected && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.syncActionButton]}
            onPress={handleForceSync}
            disabled={syncStatus.isProcessing}
          >
            <Text style={styles.actionButtonText}>Force Sync</Text>
          </TouchableOpacity>
        )}
        
        {syncStatus.queueLength > 0 && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.clearActionButton]}
            onPress={handleClearQueue}
          >
            <Text style={styles.actionButtonText}>Clear Queue</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  compactContainer: {
    width: 24,
    height: 24,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  compactIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 12,
  },
  compactIcon: {
    fontSize: 14,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  syncButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  detailedContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  detailedTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  detailedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailedLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailedValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  detailedActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  syncActionButton: {
    backgroundColor: '#2196F3',
  },
  clearActionButton: {
    backgroundColor: '#FF5722',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});