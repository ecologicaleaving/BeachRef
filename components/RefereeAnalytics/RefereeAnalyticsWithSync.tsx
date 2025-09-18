import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { designTokens } from '../../theme/tokens';
import { RefereeAnalyticsDashboard, RefereeAnalyticsDashboardProps } from './RefereeAnalyticsDashboard';
import { useContextualSync } from '../../hooks/useContextualSync';

/**
 * Enhanced Referee Analytics with Contextual Auto-Sync
 * Automatically keeps referee data fresh based on what the user is viewing
 */
export interface RefereeAnalyticsWithSyncProps extends RefereeAnalyticsDashboardProps {
  tournamentCode?: string;
  autoSyncEnabled?: boolean;
  syncIntervalMinutes?: number;
}

export const RefereeAnalyticsWithSync: React.FC<RefereeAnalyticsWithSyncProps> = ({
  refereeId,
  tournamentCode,
  autoSyncEnabled = true,
  syncIntervalMinutes = 5,
  ...dashboardProps
}) => {
  // Set up contextual sync based on current view
  const syncOptions = useMemo(() => ({
    tournamentCode,
    refereeId,
    syncInterval: syncIntervalMinutes,
    enableAutoSync: autoSyncEnabled
  }), [tournamentCode, refereeId, syncIntervalMinutes, autoSyncEnabled]);

  const { syncStatus, triggerSync, isLoading } = useContextualSync(syncOptions);

  const handleManualSync = async () => {
    try {
      await triggerSync();
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
    }
  };

  const formatLastSync = (lastSync: Date | null) => {
    if (!lastSync) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  return (
    <View style={styles.container}>
      {/* Sync Status Header */}
      <View style={styles.syncHeader}>
        <View style={styles.syncInfo}>
          <Text style={styles.syncLabel}>
            {autoSyncEnabled ? '🔄 Auto-sync enabled' : '📊 Manual sync mode'}
          </Text>
          <Text style={styles.lastSyncText}>
            Last updated: {formatLastSync(syncStatus.lastSync)}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.syncButton, isLoading && styles.syncButtonDisabled]}
          onPress={handleManualSync}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={designTokens.colors.background} />
          ) : (
            <Text style={styles.syncButtonText}>Refresh</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Context Info */}
      {(tournamentCode || refereeId) && (
        <View style={styles.contextInfo}>
          <Text style={styles.contextLabel}>Live sync context:</Text>
          {tournamentCode && (
            <Text style={styles.contextItem}>🏆 Tournament: {tournamentCode}</Text>
          )}
          {refereeId && (
            <Text style={styles.contextItem}>👤 Referee: {refereeId}</Text>
          )}
        </View>
      )}

      {/* Error Display */}
      {syncStatus.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            ⚠️ Sync error: {syncStatus.error}
          </Text>
          <TouchableOpacity onPress={handleManualSync} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Analytics Dashboard */}
      <RefereeAnalyticsDashboard
        refereeId={refereeId}
        {...dashboardProps}
      />

      {/* Auto-sync Status Footer */}
      {autoSyncEnabled && (
        <View style={styles.autoSyncFooter}>
          <Text style={styles.autoSyncText}>
            📡 Auto-refreshing every {syncIntervalMinutes} minutes
          </Text>
          {syncStatus.nextSync && (
            <Text style={styles.nextSyncText}>
              Next sync: {syncStatus.nextSync.toLocaleTimeString()}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  syncHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    backgroundColor: designTokens.brandColors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.brandColors.primaryLight,
  },
  syncInfo: {
    flex: 1,
  },
  syncLabel: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: designTokens.typography.caption.fontWeight,
    color: designTokens.colors.textPrimary,
    marginBottom: 2,
  },
  lastSyncText: {
    fontSize: designTokens.typography.caption.fontSize,
    color: designTokens.colors.textSecondary,
  },
  syncButton: {
    backgroundColor: designTokens.colors.primary,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  syncButtonDisabled: {
    backgroundColor: designTokens.colors.textSecondary,
  },
  syncButtonText: {
    color: designTokens.colors.background,
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: designTokens.typography.caption.fontWeight,
  },
  contextInfo: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    backgroundColor: designTokens.brandColors.accentLight,
  },
  contextLabel: {
    fontSize: designTokens.typography.caption.fontSize,
    color: designTokens.colors.textSecondary,
    marginBottom: 4,
  },
  contextItem: {
    fontSize: designTokens.typography.body.fontSize,
    color: designTokens.colors.textPrimary,
    marginBottom: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    backgroundColor: designTokens.colors.error + '20',
  },
  errorText: {
    flex: 1,
    fontSize: designTokens.typography.body.fontSize,
    color: designTokens.colors.textPrimary,
  },
  retryButton: {
    backgroundColor: designTokens.colors.error,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  retryButtonText: {
    color: designTokens.colors.background,
    fontSize: designTokens.typography.caption.fontSize,
  },
  autoSyncFooter: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs,
    backgroundColor: designTokens.brandColors.secondaryLight,
    borderTopWidth: 1,
    borderTopColor: designTokens.brandColors.primaryLight,
  },
  autoSyncText: {
    fontSize: designTokens.typography.caption.fontSize,
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
  },
  nextSyncText: {
    fontSize: designTokens.typography.caption.fontSize,
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
});