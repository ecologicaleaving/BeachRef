import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useStorageMonitoring, useStorageManager } from '../hooks/useStorageManager';
import { colors } from '../theme/tokens';

interface StorageAlertProps {
  style?: any;
  onManageStorage?: () => void;
  autoShow?: boolean;
  threshold?: number; // 0-1 (e.g., 0.85 for 85%)
}

/**
 * Automatic storage alert component
 * Shows warnings when storage usage gets high
 */
export function StorageAlert({
  style,
  onManageStorage,
  autoShow = true,
  threshold = 0.85
}: StorageAlertProps) {
  const { shouldShowAlert, alertMessage, dismissAlert } = useStorageMonitoring(
    30000, // Check every 30 seconds
    threshold
  );
  const { optimizeStorage, clearOfflineStorage } = useStorageManager();

  if (!autoShow || !shouldShowAlert || !alertMessage) {
    return null;
  }

  const handleOptimize = async () => {
    try {
      const removedCount = await optimizeStorage();
      dismissAlert();
      
      if (removedCount > 0) {
        Alert.alert(
          'Storage Optimized',
          `Freed up space by removing ${removedCount} old cache entries.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'No Cleanup Needed',
          'Storage optimization found no old data to remove. Consider manually clearing offline cache.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Clear Offline Cache',
              onPress: handleClearOfflineCache,
              style: 'destructive'
            }
          ]
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to optimize storage');
    }
  };

  const handleClearOfflineCache = async () => {
    try {
      const success = await clearOfflineStorage();
      if (success) {
        dismissAlert();
        Alert.alert(
          'Cache Cleared',
          'Offline tournament cache has been cleared successfully.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to clear offline cache');
      }
    } catch {
      Alert.alert('Error', 'Failed to clear offline cache');
    }
  };

  const handleManageStorage = () => {
    if (onManageStorage) {
      onManageStorage();
    } else {
      Alert.alert(
        'Storage Management',
        'Would you like to optimize storage automatically or manage it manually?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Auto Optimize', 
            onPress: handleOptimize 
          },
          { 
            text: 'Clear Offline Cache', 
            onPress: handleClearOfflineCache,
            style: 'destructive'
          }
        ]
      );
    }
  };

  return (
    <View style={[styles.alertContainer, style]}>
      <View style={styles.alertContent}>
        <Text style={styles.alertIcon}>⚠️</Text>
        <View style={styles.alertTextContainer}>
          <Text style={styles.alertTitle}>Storage Warning</Text>
          <Text style={styles.alertMessage}>{alertMessage}</Text>
        </View>
      </View>
      
      <View style={styles.alertActions}>
        <TouchableOpacity 
          style={[styles.alertButton, styles.dismissButton]}
          onPress={dismissAlert}
        >
          <Text style={styles.dismissButtonText}>Dismiss</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.alertButton, styles.actionButton]}
          onPress={handleManageStorage}
        >
          <Text style={styles.actionButtonText}>Manage</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Inline storage warning for embedding in other components
 */
export function StorageWarning({
  style,
  onOptimize
}: {
  style?: any;
  onOptimize?: () => void;
}) {
  const { shouldShowAlert, currentUsage } = useStorageMonitoring(60000, 0.7);

  if (!shouldShowAlert) {
    return null;
  }

  return (
    <View style={[styles.warningContainer, style]}>
      <Text style={styles.warningIcon}>💾</Text>
      <Text style={styles.warningText}>
        Storage {currentUsage.toFixed(0)}% full
      </Text>
      {onOptimize && (
        <TouchableOpacity 
          style={styles.warningButton}
          onPress={onOptimize}
        >
          <Text style={styles.warningButtonText}>Optimize</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Storage status indicator with color coding
 */
export function StorageStatusIndicator({
  style,
  showPercentage = true
}: {
  style?: any;
  showPercentage?: boolean;
}) {
  const { currentUsage } = useStorageMonitoring(30000, 0.85);

  const getStatusColor = () => {
    if (currentUsage < 50) return colors.success;
    if (currentUsage < 75) return colors.warning;
    return colors.error;
  };

  const getStatusIcon = () => {
    if (currentUsage < 50) return '✅';
    if (currentUsage < 75) return '⚠️';
    return '🚨';
  };

  return (
    <View style={[styles.statusContainer, style]}>
      <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
      {showPercentage && (
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {currentUsage.toFixed(0)}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  alertContainer: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  alertIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  alertTextContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: '#BF360C',
    lineHeight: 20,
  },
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  alertButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  dismissButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  actionButton: {
    backgroundColor: '#FF9800',
  },
  dismissButtonText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderColor: '#FFC107',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#F57F17',
    fontWeight: '500',
  },
  warningButton: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  warningButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});