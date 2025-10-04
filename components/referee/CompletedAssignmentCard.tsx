import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { RefereeAssignment } from '../../types/RefereeAssignments';
import { designTokens } from '../../theme/tokens';

interface CompletedAssignmentCardProps {
  assignment: RefereeAssignment;
  onPress?: () => void;
}

export const CompletedAssignmentCard: React.FC<CompletedAssignmentCardProps> = ({
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
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getStatusColor = () => {
    switch (assignment.status) {
      case 'Finished':
        return styles.statusCompleted;
      case 'Cancelled':
        return styles.statusCancelled;
      default:
        return styles.statusDefault;
    }
  };

  const getStatusText = () => {
    switch (assignment.status) {
      case 'Finished':
        return 'COMPLETED';
      case 'Cancelled':
        return 'CANCELLED';
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
      accessibilityLabel={`Completed assignment: ${assignment.teamAName} vs ${assignment.teamBName}, ${formatDate(assignment.localDate)} at ${formatTime(assignment.localDate, assignment.localTime)}, Court ${assignment.court}`}
    >
      <View style={styles.header}>
        <View style={[styles.statusBadge, getStatusColor()]}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
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
    backgroundColor: '#F9FAFB', // Muted background for completed
    borderRadius: 8,
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 100,
    opacity: 0.8, // Muted styling for reference
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  statusCompleted: {
    backgroundColor: designTokens.neutrals.textSecondary, // Muted gray for completed
  },
  statusCancelled: {
    backgroundColor: '#EF4444', // Alert red for cancelled
  },
  statusDefault: {
    backgroundColor: '#9CA3AF',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  matchInfo: {
    flex: 1,
  },
  matchTitle: {
    fontSize: 16, // Smaller for muted appearance
    fontWeight: '600', // Less bold than current/upcoming
    color: designTokens.neutrals.textSecondary, // Muted text color
    lineHeight: 20,
    marginBottom: 6,
  },
  matchDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 6,
  },
  leftDetails: {
    alignItems: 'flex-start',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.neutrals.textSecondary,
  },
  rightDetails: {
    alignItems: 'flex-end',
  },
  courtText: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.neutrals.textSecondary,
    marginBottom: 2,
  },
  roundText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  roleIndicator: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
    color: designTokens.neutrals.textSecondary,
  },
});