/**
 * Sync Status Indicator Component
 * Story 2.2: Match Result Card Optimization
 * 
 * Real-time sync status indicators using Epic 1 status system
 */

import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Animated,
  StyleSheet, 
  _ViewStyle, 
  TextStyle 
} from 'react-native';
import { EnhancedMatchResult} from '../../types/MatchResults';
import { needsSync} from '../../utils/matchResults';
import { designTokens } from '../../theme/tokens';
import { StatusIcons, ActionIcons, UtilityIcons } from '../Icons/IconLibrary';

interface SyncStatusIndicatorProps {
  matchResult: EnhancedMatchResult;
  variant?: 'compact' | 'detailed' | 'banner';
  showRetryButton?: boolean;
  onRetrySync?: () => void;
  onViewDetails?: () => void;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = React.memo(({
  matchResult,
  variant = 'compact',
  showRetryButton = true,
  onRetrySync,
  onViewDetails
}) => {
  const [pulseAnimation] = useState(new Animated.Value(1));
  const [rotationAnimation] = useState(new Animated.Value(0));
  
  const styles = getStyles(variant);
  const syncNeeded = needsSync(matchResult);

  // Pulse animation for pending sync
  useEffect(() => {
    if (matchResult.syncPending) {
      const pulseLoop = () => {
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start(() => pulseLoop());
      };
      pulseLoop();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [matchResult.syncPending]);

  // Rotation animation for syncing
  useEffect(() => {
    if (matchResult.resultStatus === 'submitted') {
      const rotateLoop = () => {
        Animated.timing(rotationAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }).start(() => {
          rotationAnimation.setValue(0);
          rotateLoop();
        });
      };
      rotateLoop();
    } else {
      rotationAnimation.setValue(0);
    }
  }, [matchResult.resultStatus]);

  const getSyncStatusConfig = () => {
    const isOffline = matchResult.isOffline;
    const syncPending = matchResult.syncPending;
    const resultStatus = matchResult.resultStatus;

    if (isOffline) {
      return {
        icon: 'Offline',
        color: designTokens.colors.warning,
        text: 'Offline - Will sync when connected',
        description: 'Result saved locally and will sync automatically when network is available',
        actionLabel: 'View Details',
        severity: 'warning' as const,
      };
    }

    switch (resultStatus) {
      case 'draft':
        return {
          icon: 'Draft',
          color: designTokens.colors.textSecondary,
          text: 'Draft',
          description: 'Result not yet submitted',
          actionLabel: null,
          severity: 'info' as const,
        };
      
      case 'submitted':
        return {
          icon: 'Sync',
          color: designTokens.colors.primary,
          text: 'Syncing...',
          description: 'Uploading result to tournament system',
          actionLabel: null,
          severity: 'info' as const,
        };
      
      case 'confirmed':
        return {
          icon: 'Confirmed',
          color: designTokens.colors.statusColors.upcoming,
          text: 'Confirmed',
          description: 'Result confirmed by tournament system',
          actionLabel: 'View Details',
          severity: 'success' as const,
        };
      
      case 'synced':
        return {
          icon: 'Synced',
          color: designTokens.colors.statusColors.completed,
          text: 'Synced',
          description: 'Result successfully synced with all systems',
          actionLabel: 'View Details',
          severity: 'success' as const,
        };
      
      case 'error':
        return {
          icon: 'Error',
          color: designTokens.colors.error,
          text: 'Sync Error',
          description: 'Failed to sync result. Will retry automatically.',
          actionLabel: 'Retry Now',
          severity: 'error' as const,
        };
      
      default:
        return {
          icon: 'Unknown',
          color: designTokens.colors.textSecondary,
          text: 'Unknown Status',
          description: 'Result status unclear',
          actionLabel: 'Check Status',
          severity: 'warning' as const,
        };
    }
  };

  const renderIcon = (iconName: string, color: string) => {
    const IconComponent = StatusIcons[iconName as keyof typeof StatusIcons] || StatusIcons.Unknown;
    
    const iconStyle = matchResult.syncPending 
      ? { transform: [{ scale: pulseAnimation }] }
      : matchResult.resultStatus === 'submitted'
      ? { 
          transform: [{ 
            rotate: rotationAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg']
            })
          }]
        }
      : {};

    return (
      <Animated.View style={iconStyle}>
        <IconComponent 
          width={variant === 'banner' ? 24 : 20} 
          height={variant === 'banner' ? 24 : 20} 
          fill={color} 
        />
      </Animated.View>
    );
  };

  if (!syncNeeded && matchResult.resultStatus === 'synced' && variant === 'compact') {
    // Don't show indicator for fully synced results in compact mode
    return null;
  }

  const statusConfig = getSyncStatusConfig();

  const renderCompactView = () => (
    <TouchableOpacity
      style={[
        styles.compactContainer,
        statusConfig.severity === 'error' && styles.compactContainerError,
        statusConfig.severity === 'warning' && styles.compactContainerWarning,
      ]}
      onPress={onViewDetails}
      testID="sync-status-compact"
      accessible={true}
      accessibilityLabel={`Sync status: ${statusConfig.text}`}
    >
      {renderIcon(statusConfig.icon, statusConfig.color)}
      <Text style={[styles.compactText, { color: statusConfig.color }]}>
        {statusConfig.text}
      </Text>
    </TouchableOpacity>
  );

  const renderDetailedView = () => (
    <View style={[
      styles.detailedContainer,
      statusConfig.severity === 'error' && styles.detailedContainerError,
      statusConfig.severity === 'warning' && styles.detailedContainerWarning,
    ]}>
      <View style={styles.detailedHeader}>
        {renderIcon(statusConfig.icon, statusConfig.color)}
        <View style={styles.detailedContent}>
          <Text style={[styles.detailedTitle, { color: statusConfig.color }]}>
            {statusConfig.text}
          </Text>
          <Text style={styles.detailedDescription}>
            {statusConfig.description}
          </Text>
        </View>
      </View>

      {statusConfig.actionLabel && (
        <TouchableOpacity
          style={[
            styles.actionButton,
            statusConfig.severity === 'error' && styles.actionButtonError,
          ]}
          onPress={statusConfig.actionLabel === 'Retry Now' ? onRetrySync : onViewDetails}
          testID={statusConfig.actionLabel === 'Retry Now' ? 'retry-sync' : 'view-sync-details'}
          accessible={true}
          accessibilityLabel={statusConfig.actionLabel}
        >
          {statusConfig.actionLabel === 'Retry Now' ? (
            <ActionIcons.Refresh width={16} height={16} fill={designTokens.colors.error} />
          ) : (
            <UtilityIcons.Info width={16} height={16} fill={statusConfig.color} />
          )}
          <Text style={[
            styles.actionButtonText,
            statusConfig.severity === 'error' && styles.actionButtonTextError,
          ]}>
            {statusConfig.actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderBannerView = () => (
    <View style={[
      styles.bannerContainer,
      statusConfig.severity === 'error' && styles.bannerContainerError,
      statusConfig.severity === 'warning' && styles.bannerContainerWarning,
      statusConfig.severity === 'success' && styles.bannerContainerSuccess,
    ]}>
      <View style={styles.bannerContent}>
        {renderIcon(statusConfig.icon, statusConfig.color)}
        <View style={styles.bannerTextContainer}>
          <Text style={[styles.bannerTitle, { color: statusConfig.color }]}>
            {statusConfig.text}
          </Text>
          <Text style={styles.bannerDescription}>
            {statusConfig.description}
          </Text>
        </View>
      </View>

      {statusConfig.actionLabel && showRetryButton && (
        <TouchableOpacity
          style={styles.bannerAction}
          onPress={statusConfig.actionLabel === 'Retry Now' ? onRetrySync : onViewDetails}
          testID={statusConfig.actionLabel === 'Retry Now' ? 'banner-retry-sync' : 'banner-view-details'}
        >
          <Text style={[styles.bannerActionText, { color: statusConfig.color }]}>
            {statusConfig.actionLabel}
          </Text>
          <ActionIcons.ChevronRight width={16} height={16} fill={statusConfig.color} />
        </TouchableOpacity>
      )}
    </View>
  );

  switch (variant) {
    case 'compact':
      return renderCompactView();
    case 'detailed':
      return renderDetailedView();
    case 'banner':
      return renderBannerView();
    default:
      return renderCompactView();
  }
});

const getStyles = (variant: string) => {
  return StyleSheet.create({
    // Compact variant styles
    compactContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: designTokens.spacing.small,
      paddingVertical: designTokens.spacing.extraSmall,
      borderRadius: designTokens.spacing.borderRadius / 2,
      backgroundColor: designTokens.colors.surfaceSecondary,
      minHeight: 32,
    },
    compactContainerError: {
      backgroundColor: `${designTokens.colors.error}15`,
    },
    compactContainerWarning: {
      backgroundColor: `${designTokens.colors.warning}15`,
    },
    compactText: {
      ...designTokens.typography.caption,
      fontWeight: '600',
      marginLeft: designTokens.spacing.extraSmall,
    },

    // Detailed variant styles
    detailedContainer: {
      backgroundColor: designTokens.colors.surfaceSecondary,
      borderRadius: designTokens.spacing.borderRadius,
      padding: designTokens.spacing.medium,
      borderLeftWidth: 4,
      borderLeftColor: designTokens.colors.textSecondary,
    },
    detailedContainerError: {
      borderLeftColor: designTokens.colors.error,
      backgroundColor: `${designTokens.colors.error}10`,
    },
    detailedContainerWarning: {
      borderLeftColor: designTokens.colors.warning,
      backgroundColor: `${designTokens.colors.warning}10`,
    },
    detailedHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    detailedContent: {
      flex: 1,
      marginLeft: designTokens.spacing.small,
    },
    detailedTitle: {
      ...designTokens.typography.bodySmall,
      fontWeight: '600',
      marginBottom: 2,
    },
    detailedDescription: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: designTokens.colors.surfacePrimary,
      borderRadius: designTokens.spacing.borderRadius / 2,
      paddingHorizontal: designTokens.spacing.medium,
      paddingVertical: designTokens.spacing.small,
      marginTop: designTokens.spacing.small,
      alignSelf: 'flex-start',
      minHeight: 36,
    },
    actionButtonError: {
      borderWidth: 1,
      borderColor: designTokens.colors.error,
    },
    actionButtonText: {
      ...designTokens.typography.caption,
      fontWeight: '600',
      color: designTokens.colors.textPrimary,
      marginLeft: designTokens.spacing.extraSmall,
    },
    actionButtonTextError: {
      color: designTokens.colors.error,
    },

    // Banner variant styles
    bannerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: designTokens.colors.surfaceSecondary,
      borderRadius: designTokens.spacing.borderRadius,
      padding: designTokens.spacing.medium,
      marginVertical: designTokens.spacing.small,
    },
    bannerContainerError: {
      backgroundColor: `${designTokens.colors.error}15`,
      borderColor: designTokens.colors.error,
      borderWidth: 1,
    },
    bannerContainerWarning: {
      backgroundColor: `${designTokens.colors.warning}15`,
      borderColor: designTokens.colors.warning,
      borderWidth: 1,
    },
    bannerContainerSuccess: {
      backgroundColor: `${designTokens.colors.statusColors.completed}15`,
      borderColor: designTokens.colors.statusColors.completed,
      borderWidth: 1,
    },
    bannerContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    bannerTextContainer: {
      flex: 1,
      marginLeft: designTokens.spacing.small,
    },
    bannerTitle: {
      ...designTokens.typography.body,
      fontWeight: '600',
      marginBottom: 2,
    },
    bannerDescription: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.textSecondary,
    },
    bannerAction: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: designTokens.spacing.medium,
    },
    bannerActionText: {
      ...designTokens.typography.bodySmall,
      fontWeight: '600',
      marginRight: designTokens.spacing.extraSmall,
    },
  });
};

export default SyncStatusIndicator;