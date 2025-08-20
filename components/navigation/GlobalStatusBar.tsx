/**
 * Global Status Bar Component
 * Persistent status indicator showing current assignment state across all screens
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Vibration } from 'react-native';
import { useAssignmentStatus } from '../../hooks/useAssignmentStatus';
import { designTokens } from '../../theme/tokens';

interface GlobalStatusBarProps {
  onStatusPress?: () => void;
  onExpandPress?: () => void;
  compact?: boolean;
}

interface StatusColors {
  background: string;
  text: string;
  border: string;
}

export const GlobalStatusBar: React.FC<GlobalStatusBarProps> = ({ 
  onStatusPress, 
  onExpandPress,
  compact = false 
}) => {
  const { 
    currentAssignmentStatus, 
    isOnline, 
    syncStatus, 
    pendingSyncCount,
    statusCounts 
  } = useAssignmentStatus();

  const [expanded, setExpanded] = React.useState(false);
  const [pulseAnim] = React.useState(new Animated.Value(1));

  // Calculate urgency for current assignment
  const currentUrgency = React.useMemo(() => {
    if (!currentAssignmentStatus) return 'normal';
    
    const now = new Date();
    const assignmentTime = new Date(currentAssignmentStatus.matchTime);
    const minutesUntil = (assignmentTime.getTime() - now.getTime()) / (1000 * 60);

    if (minutesUntil <= 5 && minutesUntil > 0) {
      return 'critical';
    } else if (minutesUntil <= 15 && minutesUntil > 0) {
      return 'warning';
    }
    return 'normal';
  }, [currentAssignmentStatus]);

  // Status color mapping based on Dev Notes specifications
  const getStatusColors = (status: string, urgency: string): StatusColors => {
    if (urgency === 'critical') {
      return {
        background: designTokens.colors.error,
        text: designTokens.colors.background,
        border: designTokens.colors.error,
      };
    } else if (urgency === 'warning') {
      return {
        background: designTokens.colors.warning,
        text: designTokens.colors.background,
        border: designTokens.colors.warning,
      };
    }

    switch (status) {
      case 'current':
      case 'emergency':
        return {
          background: designTokens.colors.success,
          text: designTokens.colors.background,
          border: designTokens.colors.success,
        };
      case 'upcoming':
        return {
          background: designTokens.colors.secondary,
          text: designTokens.colors.background,
          border: designTokens.colors.secondary,
        };
      default:
        return {
          background: designTokens.brandColors.primaryLight,
          text: designTokens.colors.textPrimary,
          border: designTokens.colors.primary,
        };
    }
  };

  // Urgency indicator animation
  React.useEffect(() => {
    if (currentUrgency === 'critical') {
      // Pulse animation for critical urgency
      const pulse = Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]);
      
      const loop = Animated.loop(pulse);
      loop.start();

      // Vibration feedback for critical status
      Vibration.vibrate([100, 200, 100]);

      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [currentUrgency, pulseAnim]);

  // Format countdown timer
  const formatCountdown = (matchTime: string): string => {
    const now = new Date();
    const assignmentTime = new Date(matchTime);
    const minutesUntil = Math.floor((assignmentTime.getTime() - now.getTime()) / (1000 * 60));

    if (minutesUntil < 0) {
      return 'In Progress';
    } else if (minutesUntil === 0) {
      return 'Now';
    } else if (minutesUntil < 60) {
      return `${minutesUntil}m`;
    } else {
      const hours = Math.floor(minutesUntil / 60);
      const mins = minutesUntil % 60;
      return `${hours}h ${mins}m`;
    }
  };

  // Quick status tap-to-expand functionality
  const handleStatusPress = () => {
    if (onStatusPress) {
      onStatusPress();
    } else {
      setExpanded(!expanded);
      if (onExpandPress) {
        onExpandPress();
      }
    }
  };

  // Handle no current assignment
  if (!currentAssignmentStatus) {
    return (
      <View style={[styles.container, styles.noAssignmentContainer]}>
        <View style={styles.statusIndicator}>
          <Text style={[styles.statusText, { color: designTokens.colors.textSecondary }]}>
            No Active Assignment
          </Text>
          {!isOnline && (
            <Text style={[styles.syncText, { color: designTokens.colors.textSecondary }]}>
              Offline
            </Text>
          )}
        </View>
      </View>
    );
  }

  const statusColors = getStatusColors(currentAssignmentStatus.status, currentUrgency);

  return (
    <Animated.View style={[
      styles.container,
      { 
        backgroundColor: statusColors.background,
        borderColor: statusColors.border,
        transform: [{ scale: pulseAnim }]
      }
    ]}>
      <TouchableOpacity 
        style={styles.touchableContainer}
        onPress={handleStatusPress}
        activeOpacity={0.8}
        testID="status-touchable"
      >
        <View style={styles.statusIndicator}>
          {/* Current Assignment Status Display */}
          <View style={styles.primaryInfo}>
            <Text style={[
              styles.courtNumber,
              { color: statusColors.text }
            ]}>
              Court {currentAssignmentStatus.courtNumber}
            </Text>
            
            {!compact && (
              <Text style={[
                styles.countdown,
                { color: statusColors.text }
              ]}>
                {formatCountdown(currentAssignmentStatus.matchTime)}
              </Text>
            )}
          </View>

          {/* Assignment Urgency Indicators */}
          {currentUrgency !== 'normal' && (
            <View style={[styles.urgencyIndicator, {
              backgroundColor: currentUrgency === 'critical' ? designTokens.colors.error : designTokens.colors.warning
            }]}>
              <Text style={styles.urgencyText}>
                {currentUrgency === 'critical' ? '!' : '⏰'}
              </Text>
            </View>
          )}

          {/* Network and Sync Status */}
          {(!isOnline || syncStatus !== 'synced') && (
            <View style={styles.syncIndicator}>
              <Text style={[styles.syncText, { color: statusColors.text }]}>
                {!isOnline ? 'Offline' : syncStatus === 'syncing' ? 'Syncing...' : `${pendingSyncCount} pending`}
              </Text>
            </View>
          )}
        </View>

        {/* Expanded Status Details */}
        {expanded && !compact && (
          <View style={styles.expandedContent}>
            <Text style={[styles.teamsText, { color: statusColors.text }]}>
              {currentAssignmentStatus.teams.join(' vs ')}
            </Text>
            <Text style={[styles.timeText, { color: statusColors.text }]}>
              {new Date(currentAssignmentStatus.matchTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
            
            {/* Status counts for quick reference */}
            <View style={styles.statusCounts}>
              <Text style={[styles.countText, { color: statusColors.text }]}>
                {statusCounts.upcoming} upcoming • {statusCounts.completed} completed
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
    borderBottomWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    shadowColor: designTokens.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  noAssignmentContainer: {
    backgroundColor: designTokens.brandColors.primaryLight,
    borderColor: designTokens.colors.textSecondary,
  },
  
  touchableContainer: {
    flex: 1,
  },
  
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  primaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  courtNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: designTokens.spacing.sm,
  },
  
  countdown: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  statusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  
  urgencyIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: designTokens.spacing.xs,
  },
  
  urgencyText: {
    fontSize: 12,
  },
  
  syncIndicator: {
    alignItems: 'flex-end',
  },
  
  syncText: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.9,
  },
  
  expandedContent: {
    marginTop: designTokens.spacing.sm,
    paddingTop: designTokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  
  teamsText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  
  timeText: {
    fontSize: 14,
    fontWeight: 'normal',
    marginBottom: designTokens.spacing.xs,
  },
  
  statusCounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  countText: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
  },
});

export default GlobalStatusBar;