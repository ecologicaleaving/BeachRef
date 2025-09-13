import React from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { TournamentStatusEventType } from '../../services/TournamentStatusSubscriptionService';
import { Tournament } from '../../types/tournament';

/**
 * Tournament status indicator props
 */
interface TournamentStatusIndicatorProps {
  tournament: Tournament;
  isRecentlyChanged?: boolean;
  subscriptionActive?: boolean;
  lastEventType?: TournamentStatusEventType;
  onIndicatorPress?: () => void;
  style?: any;
}

/**
 * Get status indicator color and icon based on tournament status
 */
const getStatusIndicator = (status?: string, isRecentlyChanged?: boolean) => {
  if (isRecentlyChanged) {
    return {
      color: '#ff9800', // Orange for recent changes
      icon: '🔄',
      label: 'Updated',
      pulse: true
    };
  }

  switch (status?.toLowerCase()) {
    case 'running':
    case 'live':
      return {
        color: '#4caf50', // Green for active
        icon: '🔴',
        label: 'Live',
        pulse: true
      };
    case 'finished':
    case 'completed':
      return {
        color: '#757575', // Gray for finished
        icon: '✅',
        label: 'Finished',
        pulse: false
      };
    case 'scheduled':
    case 'upcoming':
      return {
        color: '#2196f3', // Blue for scheduled
        icon: '📅',
        label: 'Scheduled',
        pulse: false
      };
    case 'postponed':
      return {
        color: '#ff9800', // Orange for postponed
        icon: '⏸️',
        label: 'Postponed',
        pulse: false
      };
    case 'cancelled':
      return {
        color: '#f44336', // Red for cancelled
        icon: '❌',
        label: 'Cancelled',
        pulse: false
      };
    default:
      return {
        color: '#9e9e9e', // Light gray for unknown
        icon: '⚪',
        label: status || 'Unknown',
        pulse: false
      };
  }
};

/**
 * Get event type priority indicator
 */
const getEventTypeIndicator = (eventType?: TournamentStatusEventType) => {
  switch (eventType) {
    case TournamentStatusEventType.CRITICAL:
      return {
        color: '#f44336',
        priority: 'high',
        label: 'Critical Update'
      };
    case TournamentStatusEventType.COMPLETION:
      return {
        color: '#4caf50',
        priority: 'normal',
        label: 'Tournament Complete'
      };
    case TournamentStatusEventType.INFORMATIONAL:
      return {
        color: '#2196f3',
        priority: 'low',
        label: 'Schedule Update'
      };
    default:
      return null;
  }
};

/**
 * Animated pulse component for live indicators
 */
const PulseIndicator: React.FC<{ color: string; children: React.ReactNode }> = ({ 
  color, 
  children 
}) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    
    pulse();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.pulseContainer,
        { 
          opacity: pulseAnim,
          backgroundColor: color + '20', // 20% opacity background
        }
      ]}
    >
      {children}
    </Animated.View>
  );
};

/**
 * Tournament Status Indicator Component
 */
const TournamentStatusIndicator: React.FC<TournamentStatusIndicatorProps> = ({
  tournament,
  isRecentlyChanged = false,
  subscriptionActive = false,
  lastEventType,
  onIndicatorPress,
  style
}) => {
  const statusInfo = getStatusIndicator(tournament.Status, isRecentlyChanged);
  const eventInfo = getEventTypeIndicator(lastEventType);

  const IndicatorContent = (
    <View style={[styles.container, style]}>
      {/* Main status indicator */}
      <View style={[styles.statusIndicator, { backgroundColor: statusInfo.color }]}>
        <Text style={styles.statusIcon}>{statusInfo.icon}</Text>
      </View>

      {/* Status text */}
      <Text style={[styles.statusText, { color: statusInfo.color }]}>
        {statusInfo.label}
      </Text>

      {/* Real-time subscription indicator */}
      {subscriptionActive && (
        <View style={styles.subscriptionIndicator}>
          <Text style={styles.subscriptionIcon}>📡</Text>
        </View>
      )}

      {/* Event type badge for recent changes */}
      {isRecentlyChanged && eventInfo && (
        <View style={[styles.eventBadge, { backgroundColor: eventInfo.color }]}>
          <Text style={styles.eventBadgeText}>{eventInfo.priority.toUpperCase()}</Text>
        </View>
      )}
    </View>
  );

  // Wrap with pulse animation if needed
  const FinalIndicator = statusInfo.pulse || isRecentlyChanged ? (
    <PulseIndicator color={statusInfo.color}>
      {IndicatorContent}
    </PulseIndicator>
  ) : (
    IndicatorContent
  );

  // Make it touchable if onPress is provided
  if (onIndicatorPress) {
    return (
      <TouchableOpacity onPress={onIndicatorPress} activeOpacity={0.7}>
        {FinalIndicator}
      </TouchableOpacity>
    );
  }

  return FinalIndicator;
};

/**
 * Compact version for list items
 */
export const CompactTournamentStatusIndicator: React.FC<{
  tournament: Tournament;
  isRecentlyChanged?: boolean;
  subscriptionActive?: boolean;
}> = ({ tournament, isRecentlyChanged, subscriptionActive }) => {
  const statusInfo = getStatusIndicator(tournament.Status, isRecentlyChanged);

  return (
    <View style={styles.compactContainer}>
      <View style={[styles.compactDot, { backgroundColor: statusInfo.color }]} />
      {subscriptionActive && <Text style={styles.compactSubscriptionIcon}>📡</Text>}
      {isRecentlyChanged && <Text style={styles.compactChangeIcon}>🔄</Text>}
    </View>
  );
};

/**
 * Status legend component
 */
export const TournamentStatusLegend: React.FC<{ 
  style?: any;
  onClose?: () => void;
}> = ({ style, onClose }) => {
  const statuses = [
    { status: 'running', label: 'Live Tournament' },
    { status: 'scheduled', label: 'Scheduled' },
    { status: 'finished', label: 'Completed' },
    { status: 'postponed', label: 'Postponed' },
    { status: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <View style={[styles.legend, style]}>
      <View style={styles.legendHeader}>
        <Text style={styles.legendTitle}>Tournament Status</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.legendClose}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {statuses.map(({ status, label }) => {
        const info = getStatusIndicator(status);
        return (
          <View key={status} style={styles.legendItem}>
            <Text style={styles.legendIcon}>{info.icon}</Text>
            <Text style={styles.legendLabel}>{label}</Text>
          </View>
        );
      })}
      
      <View style={styles.legendItem}>
        <Text style={styles.legendIcon}>📡</Text>
        <Text style={styles.legendLabel}>Real-time Updates Active</Text>
      </View>
      
      <View style={styles.legendItem}>
        <Text style={styles.legendIcon}>🔄</Text>
        <Text style={styles.legendLabel}>Recently Updated</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  statusIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  statusIcon: {
    fontSize: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  subscriptionIndicator: {
    marginLeft: 4,
  },
  subscriptionIcon: {
    fontSize: 10,
  },
  eventBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  eventBadgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  pulseContainer: {
    borderRadius: 12,
    padding: 2,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactSubscriptionIcon: {
    fontSize: 8,
  },
  compactChangeIcon: {
    fontSize: 8,
  },
  legend: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
    elevation: 5,
  },
  legendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  legendClose: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  legendIcon: {
    fontSize: 14,
    marginRight: 8,
    width: 20,
  },
  legendLabel: {
    fontSize: 14,
    color: '#333',
  },
});

export default TournamentStatusIndicator;