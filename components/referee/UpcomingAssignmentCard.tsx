import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { RefereeAssignment } from '../../types/RefereeAssignments';
import { designTokens } from '../../theme/tokens';

interface UpcomingAssignmentCardProps {
  assignment: RefereeAssignment;
  onPress?: () => void;
}

export const UpcomingAssignmentCard: React.FC<UpcomingAssignmentCardProps> = ({
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
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getTimeUntilMatch = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours < 1) {
      return `in ${diffMins}m`;
    } else if (diffHours < 24) {
      return `in ${diffHours}h ${diffMins}m`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `in ${diffDays}d`;
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
      accessibilityLabel={`Upcoming assignment: ${assignment.teamAName} vs ${assignment.teamBName}, ${formatDate(assignment.localDate)} at ${formatTime(assignment.localDate, assignment.localTime)}, Court ${assignment.court}`}
    >
      <View style={styles.header}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>UPCOMING</Text>
        </View>
        <Text style={styles.timeUntil}>
          {getTimeUntilMatch(assignment.localDate)}
        </Text>
      </View>

      <View style={styles.matchInfo}>
        <Text style={styles.matchTitle}>
          {assignment.teamAName} vs {assignment.teamBName}
        </Text>
        
        <View style={styles.matchDetails}>
          <View style={styles.leftDetails}>
            <Text style={styles.dateText}>{formatDate(assignment.localDate)}</Text>
            <Text style={styles.timeText}>{formatTime(assignment.localDate, assignment.localTime)}</Text>
          </View>
          
          <View style={styles.rightDetails}>
            <Text style={styles.courtText}>Court {assignment.court}</Text>
            <Text style={styles.roundText}>{assignment.round}</Text>
          </View>
        </View>
      </View>

      <View style={styles.roleIndicator}>
        <Text style={styles.roleText}>
          {assignment.refereeRole === 'referee1' ? '1st Ref' : '2nd Ref'}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minHeight: 120, // Standard size card
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: designTokens.linkTokens.default, // Professional blue
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  timeUntil: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.linkTokens.default,
  },
  matchInfo: {
    flex: 1,
  },
  matchTitle: {
    fontSize: 18, // Minimum 16px for outdoor visibility
    fontWeight: '700',
    color: designTokens.neutrals.textPrimary,
    lineHeight: 24,
    marginBottom: 8,
  },
  matchDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  leftDetails: {
    alignItems: 'flex-start',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.neutrals.textPrimary,
    marginBottom: 2,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
    color: designTokens.neutrals.textPrimary,
  },
  rightDetails: {
    alignItems: 'flex-end',
  },
  courtText: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.neutrals.textPrimary,
    marginBottom: 2,
  },
  roundText: {
    fontSize: 14,
    fontWeight: '500',
    color: designTokens.neutrals.textSecondary,
  },
  roleIndicator: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '500',
    color: designTokens.neutrals.textPrimary,
  },
});