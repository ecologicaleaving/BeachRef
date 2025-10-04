import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { RefereeAssignment } from '../../types/RefereeAssignments';
import { designTokens } from '../../theme/tokens';

interface CurrentAssignmentCardProps {
  assignment: RefereeAssignment;
  onPress?: () => void;
}

export const CurrentAssignmentCard: React.FC<CurrentAssignmentCardProps> = ({
  assignment,
  onPress
}) => {
  const formatTime = (date: Date, time: string) => {
    if (time) return time;
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = () => {
    switch (assignment.status) {
      case 'Running':
        return styles.statusActive;
      case 'Scheduled':
        return styles.statusUpcoming;
      default:
        return styles.statusDefault;
    }
  };

  const getStatusText = () => {
    switch (assignment.status) {
      case 'Running':
        return 'LIVE NOW';
      case 'Scheduled':
        return 'UPCOMING';
      default:
        return assignment.status.toUpperCase();
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Current assignment: ${assignment.teamAName} vs ${assignment.teamBName}, ${formatDate(assignment.localDate)} at ${formatTime(assignment.localDate, assignment.localTime)}, Court ${assignment.court}`}
    >
      {/* Status Indicator */}
      <View style={[styles.statusBadge, getStatusColor()]}>
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>

      {/* Match Details */}
      <View style={styles.matchInfo}>
        <Text style={styles.matchTitle}>
          {assignment.teamAName} vs {assignment.teamBName}
        </Text>
        
        <View style={styles.matchDetails}>
          <View style={styles.timeInfo}>
            <Text style={styles.dateText}>{formatDate(assignment.localDate)}</Text>
            <Text style={styles.timeText}>{formatTime(assignment.localDate, assignment.localTime)}</Text>
          </View>
          
          <View style={styles.venueInfo}>
            <Text style={styles.courtText}>Court {assignment.court}</Text>
            <Text style={styles.roundText}>{assignment.round}</Text>
          </View>
        </View>
      </View>

      {/* Referee Role Indicator */}
      <View style={styles.roleIndicator}>
        <Text style={styles.roleText}>
          {assignment.refereeRole === 'referee1' ? '1st Referee' : '2nd Referee'}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#E5E7EB',
    minHeight: 200, // Extra large hero card
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  statusActive: {
    backgroundColor: '#10B981', // High contrast green
  },
  statusUpcoming: {
    backgroundColor: '#3B82F6', // Professional blue
  },
  statusDefault: {
    backgroundColor: designTokens.neutrals.textSecondary, // Neutral gray
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  matchInfo: {
    flex: 1,
    paddingTop: 8,
  },
  matchTitle: {
    fontSize: 24, // Large for outdoor visibility
    fontWeight: '800',
    color: '#111827',
    lineHeight: 32,
    marginBottom: 16,
    textAlign: 'center',
  },
  matchDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  timeInfo: {
    alignItems: 'flex-start',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  venueInfo: {
    alignItems: 'flex-end',
  },
  courtText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  roundText: {
    fontSize: 16,
    fontWeight: '500',
    color: designTokens.neutrals.textSecondary,
  },
  roleIndicator: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
});