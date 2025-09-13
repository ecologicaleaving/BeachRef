import React from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { ScheduleChangeResult } from '../../services/TournamentStatusMonitor';
import { BeachMatch } from '../../types/match';

/**
 * Schedule change indicator props
 */
interface ScheduleChangeIndicatorProps {
  scheduleChanges: ScheduleChangeResult | null;
  match?: BeachMatch;
  isRecentlyChanged?: boolean;
  onIndicatorPress?: () => void;
  compact?: boolean;
  style?: any;
}

/**
 * Get schedule change severity
 */
const getScheduleChangeSeverity = (significantChanges: number, totalChanges: number) => {
  if (significantChanges > 0) {
    return {
      level: 'high',
      color: '#f44336',
      icon: '🚨',
      label: 'Major Schedule Change'
    };
  }
  
  if (totalChanges > 3) {
    return {
      level: 'medium',
      color: '#ff9800',
      icon: '⚠️',
      label: 'Multiple Schedule Changes'
    };
  }
  
  if (totalChanges > 0) {
    return {
      level: 'low',
      color: '#2196f3',
      icon: 'ℹ️',
      label: 'Schedule Update'
    };
  }
  
  return null;
};

/**
 * Format schedule change details
 */
const formatScheduleChanges = (changes: ScheduleChangeResult): string[] => {
  const details: string[] = [];
  
  changes.changedMatches.forEach(change => {
    const changeDetails: string[] = [];
    
    if (change.changes.date) {
      changeDetails.push(`Date: ${change.changes.date.old} → ${change.changes.date.new}`);
    }
    
    if (change.changes.time) {
      changeDetails.push(`Time: ${change.changes.time.old} → ${change.changes.time.new}`);
    }
    
    if (change.changes.court) {
      changeDetails.push(`Court: ${change.changes.court.old} → ${change.changes.court.new}`);
    }
    
    if (changeDetails.length > 0) {
      details.push(`Match ${change.matchNo}: ${changeDetails.join(', ')}`);
    }
  });
  
  return details;
};

/**
 * Animated pulse component for recent changes
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
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
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
 * Schedule Change Indicator Component
 */
const ScheduleChangeIndicator: React.FC<ScheduleChangeIndicatorProps> = ({
  scheduleChanges,
  match,
  isRecentlyChanged = false,
  onIndicatorPress,
  compact = false,
  style
}) => {
  if (!scheduleChanges || scheduleChanges.changeCount === 0) {
    return null;
  }

  const severity = getScheduleChangeSeverity(
    scheduleChanges.significantChanges, 
    scheduleChanges.changeCount
  );

  if (!severity) return null;

  // For match-specific indicator, check if this match has changes
  if (match) {
    const matchHasChanges = scheduleChanges.changedMatches.some(
      change => change.matchNo === match.NoInTournament
    );
    if (!matchHasChanges && !isRecentlyChanged) {
      return null;
    }
  }

  const IndicatorContent = compact ? (
    <View style={[styles.compactContainer, style]}>
      <View style={[styles.compactDot, { backgroundColor: severity.color }]} />
      <Text style={styles.compactIcon}>{severity.icon}</Text>
    </View>
  ) : (
    <View style={[styles.container, style]}>
      {/* Severity indicator */}
      <View style={[styles.severityIndicator, { backgroundColor: severity.color }]}>
        <Text style={styles.severityIcon}>{severity.icon}</Text>
      </View>

      {/* Change details */}
      <View style={styles.detailsContainer}>
        <Text style={[styles.severityText, { color: severity.color }]}>
          {severity.label}
        </Text>
        
        <Text style={styles.changeCount}>
          {scheduleChanges.changeCount} change{scheduleChanges.changeCount !== 1 ? 's' : ''}
          {scheduleChanges.significantChanges > 0 && (
            <Text style={styles.significantText}>
              {' '}({scheduleChanges.significantChanges} major)
            </Text>
          )}
        </Text>
        
        <Text style={styles.lastDetected}>
          Last detected: {scheduleChanges.lastDetected.toLocaleTimeString()}
        </Text>
      </View>

      {/* Expand button for details */}
      {onIndicatorPress && (
        <TouchableOpacity 
          style={styles.expandButton}
          onPress={onIndicatorPress}
        >
          <Text style={styles.expandIcon}>▶</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Wrap with pulse animation if recently changed
  const FinalIndicator = isRecentlyChanged ? (
    <PulseIndicator color={severity.color}>
      {IndicatorContent}
    </PulseIndicator>
  ) : (
    IndicatorContent
  );

  // Make it touchable if onPress is provided
  if (onIndicatorPress && !compact) {
    return (
      <TouchableOpacity onPress={onIndicatorPress} activeOpacity={0.7}>
        {FinalIndicator}
      </TouchableOpacity>
    );
  }

  return FinalIndicator;
};

/**
 * Schedule changes detail modal/view component
 */
export const ScheduleChangesDetail: React.FC<{
  scheduleChanges: ScheduleChangeResult;
  onClose?: () => void;
  style?: any;
}> = ({ scheduleChanges, onClose, style }) => {
  const changeDetails = formatScheduleChanges(scheduleChanges);
  const severity = getScheduleChangeSeverity(
    scheduleChanges.significantChanges,
    scheduleChanges.changeCount
  );

  return (
    <View style={[styles.detailView, style]}>
      <View style={styles.detailHeader}>
        <Text style={styles.detailTitle}>Schedule Changes</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.detailClose}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {severity && (
        <View style={styles.detailSummary}>
          <Text style={[styles.detailSeverity, { color: severity.color }]}>
            {severity.icon} {severity.label}
          </Text>
          <Text style={styles.detailCount}>
            Total: {scheduleChanges.changeCount} changes
          </Text>
          {scheduleChanges.significantChanges > 0 && (
            <Text style={styles.detailSignificant}>
              {scheduleChanges.significantChanges} major changes (&gt;2 hours)
            </Text>
          )}
        </View>
      )}
      
      <View style={styles.detailChanges}>
        <Text style={styles.detailChangesTitle}>Change Details:</Text>
        {changeDetails.map((detail, index) => (
          <Text key={index} style={styles.detailChangeItem}>
            • {detail}
          </Text>
        ))}
      </View>
      
      <Text style={styles.detailTimestamp}>
        Last detected: {scheduleChanges.lastDetected.toLocaleString()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    marginVertical: 4,
  },
  severityIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  severityIcon: {
    fontSize: 12,
  },
  detailsContainer: {
    flex: 1,
  },
  severityText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  changeCount: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  significantText: {
    fontWeight: '600',
    color: '#f44336',
  },
  lastDetected: {
    fontSize: 10,
    color: '#999',
  },
  expandButton: {
    padding: 4,
    marginLeft: 8,
  },
  expandIcon: {
    fontSize: 12,
    color: '#666',
  },
  pulseContainer: {
    borderRadius: 8,
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
  compactIcon: {
    fontSize: 8,
  },
  detailView: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
    elevation: 5,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  detailClose: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  detailSummary: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailSeverity: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  detailSignificant: {
    fontSize: 12,
    color: '#f44336',
    fontWeight: '500',
  },
  detailChanges: {
    marginBottom: 12,
  },
  detailChangesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  detailChangeItem: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
    lineHeight: 18,
  },
  detailTimestamp: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ScheduleChangeIndicator;