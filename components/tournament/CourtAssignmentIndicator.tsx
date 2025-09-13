import React from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { CourtAssignmentChange } from '../../services/TournamentStatusMonitor';
import { BeachMatch } from '../../types/match';

/**
 * Court assignment indicator props
 */
interface CourtAssignmentIndicatorProps {
  courtChanges: CourtAssignmentChange[];
  match?: BeachMatch;
  isRecentlyChanged?: boolean;
  onIndicatorPress?: () => void;
  compact?: boolean;
  style?: any;
}

/**
 * Get court change priority info
 */
const getCourtChangePriority = (priority: 'high' | 'normal' | 'low', changeType: string) => {
  switch (priority) {
    case 'high':
      return {
        color: '#f44336',
        icon: '🚨',
        label: changeType === 'emergency' ? 'Emergency Court Change' : 'Urgent Court Change',
        bgColor: '#ffebee'
      };
    case 'normal':
      return {
        color: '#ff9800',
        icon: '⚠️',
        label: 'Court Reassignment',
        bgColor: '#fff3e0'
      };
    case 'low':
      return {
        color: '#2196f3',
        icon: 'ℹ️',
        label: 'Court Assignment',
        bgColor: '#e3f2fd'
      };
  }
};

/**
 * Get court change type info
 */
const getCourtChangeType = (changeType: 'assignment' | 'reassignment' | 'emergency') => {
  switch (changeType) {
    case 'emergency':
      return {
        label: 'Emergency',
        description: 'Last-minute court change',
        urgency: 'high'
      };
    case 'reassignment':
      return {
        label: 'Reassignment',
        description: 'Court changed from previous assignment',
        urgency: 'normal'
      };
    case 'assignment':
      return {
        label: 'Assignment',
        description: 'Initial court assignment',
        urgency: 'low'
      };
  }
};

/**
 * Format court change for display
 */
const formatCourtChange = (change: CourtAssignmentChange): string => {
  if (!change.oldCourt) {
    return `Assigned to ${change.newCourt}`;
  }
  return `${change.oldCourt} → ${change.newCourt}`;
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
 * Court Assignment Indicator Component
 */
const CourtAssignmentIndicator: React.FC<CourtAssignmentIndicatorProps> = ({
  courtChanges,
  match,
  isRecentlyChanged = false,
  onIndicatorPress,
  compact = false,
  style
}) => {
  // Filter changes for specific match if provided
  const relevantChanges = match 
    ? courtChanges.filter(change => change.matchNo === match.NoInTournament)
    : courtChanges;

  if (relevantChanges.length === 0 && !isRecentlyChanged) {
    return null;
  }

  // Use the most recent/highest priority change
  const primaryChange = relevantChanges.reduce((highest, current) => {
    if (!highest) return current;
    
    const priorityOrder = { high: 3, normal: 2, low: 1 };
    const currentPriority = priorityOrder[current.priority];
    const highestPriority = priorityOrder[highest.priority];
    
    if (currentPriority > highestPriority) return current;
    if (currentPriority === highestPriority && current.timestamp > highest.timestamp) return current;
    
    return highest;
  }, null as CourtAssignmentChange | null);

  if (!primaryChange) return null;

  const priorityInfo = getCourtChangePriority(primaryChange.priority, primaryChange.changeType);
  const typeInfo = getCourtChangeType(primaryChange.changeType);

  const IndicatorContent = compact ? (
    <View style={[styles.compactContainer, style]}>
      <View style={[styles.compactDot, { backgroundColor: priorityInfo.color }]} />
      <Text style={styles.compactIcon}>{priorityInfo.icon}</Text>
      {match && (
        <Text style={styles.compactCourt}>{match.Court}</Text>
      )}
    </View>
  ) : (
    <View style={[styles.container, style, { backgroundColor: priorityInfo.bgColor }]}>
      {/* Priority indicator */}
      <View style={[styles.priorityIndicator, { backgroundColor: priorityInfo.color }]}>
        <Text style={styles.priorityIcon}>{priorityInfo.icon}</Text>
      </View>

      {/* Change details */}
      <View style={styles.detailsContainer}>
        <Text style={[styles.priorityText, { color: priorityInfo.color }]}>
          {priorityInfo.label}
        </Text>
        
        <Text style={styles.courtChange}>
          {formatCourtChange(primaryChange)}
        </Text>
        
        <Text style={styles.changeType}>
          {typeInfo.label} • {primaryChange.timestamp.toLocaleTimeString()}
        </Text>
        
        {relevantChanges.length > 1 && (
          <Text style={styles.additionalChanges}>
            +{relevantChanges.length - 1} more change{relevantChanges.length > 2 ? 's' : ''}
          </Text>
        )}
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
    <PulseIndicator color={priorityInfo.color}>
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
 * Court changes detail modal/view component
 */
export const CourtChangesDetail: React.FC<{
  courtChanges: CourtAssignmentChange[];
  onClose?: () => void;
  style?: any;
}> = ({ courtChanges, onClose, style }) => {
  // Group changes by priority
  const groupedChanges = courtChanges.reduce((groups, change) => {
    if (!groups[change.priority]) {
      groups[change.priority] = [];
    }
    groups[change.priority].push(change);
    return groups;
  }, {} as Record<'high' | 'normal' | 'low', CourtAssignmentChange[]>);

  return (
    <View style={[styles.detailView, style]}>
      <View style={styles.detailHeader}>
        <Text style={styles.detailTitle}>Court Assignment Changes</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.detailClose}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.detailSummary}>
        <Text style={styles.detailCount}>
          Total: {courtChanges.length} court assignment change{courtChanges.length !== 1 ? 's' : ''}
        </Text>
        
        {/* Priority breakdown */}
        {Object.entries(groupedChanges).map(([priority, changes]) => {
          if (changes.length === 0) return null;
          const priorityInfo = getCourtChangePriority(priority as any, 'reassignment');
          
          return (
            <Text key={priority} style={[styles.priorityBreakdown, { color: priorityInfo.color }]}>
              {priorityInfo.icon} {changes.length} {priority} priority
            </Text>
          );
        })}
      </View>
      
      <View style={styles.detailChanges}>
        <Text style={styles.detailChangesTitle}>Recent Changes:</Text>
        {courtChanges
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 10) // Show latest 10
          .map((change, index) => {
            const priorityInfo = getCourtChangePriority(change.priority, change.changeType);
            const typeInfo = getCourtChangeType(change.changeType);
            
            return (
              <View key={index} style={styles.detailChangeItem}>
                <View style={styles.detailChangeHeader}>
                  <Text style={[styles.detailChangeMatch, { color: priorityInfo.color }]}>
                    {priorityInfo.icon} Match {change.matchNo}
                  </Text>
                  <Text style={styles.detailChangeTime}>
                    {change.timestamp.toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={styles.detailChangeText}>
                  {formatCourtChange(change)} ({typeInfo.label})
                </Text>
                {typeInfo.description && (
                  <Text style={styles.detailChangeDescription}>
                    {typeInfo.description}
                  </Text>
                )}
              </View>
            );
          })}
      </View>
      
      {courtChanges.length > 10 && (
        <Text style={styles.detailMoreChanges}>
          ... and {courtChanges.length - 10} more changes
        </Text>
      )}
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
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    marginVertical: 4,
  },
  priorityIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  priorityIcon: {
    fontSize: 12,
  },
  detailsContainer: {
    flex: 1,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  courtChange: {
    fontSize: 13,
    color: '#333',
    marginBottom: 2,
    fontWeight: '500',
  },
  changeType: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  additionalChanges: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
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
  compactCourt: {
    fontSize: 9,
    fontWeight: '600',
    color: '#333',
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
  detailCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  priorityBreakdown: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
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
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  detailChangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailChangeMatch: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailChangeTime: {
    fontSize: 11,
    color: '#999',
  },
  detailChangeText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 2,
    fontWeight: '500',
  },
  detailChangeDescription: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  detailMoreChanges: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default CourtAssignmentIndicator;