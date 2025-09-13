/**
 * AssignmentSummary Component - Referee-Specific Information Prominence
 * Optimized for quick scanning of referee assignments and priorities
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Title, Heading, Subheading, EnhancedBodyText, EnhancedCaption } from './Text';
import { colors, spacing } from '../../theme/tokens';

export interface Assignment {
  id: string;
  matchId: string;
  teams: {
    teamA: string;
    teamB: string;
  };
  schedule: {
    date: string;
    time: string;
    court: string;
    round: string;
  };
  referee: {
    role: 'referee1' | 'referee2';
    status: 'assigned' | 'confirmed' | 'in-progress' | 'completed';
    priority: 'critical' | 'high' | 'medium' | 'low';
  };
  tournament: {
    name: string;
    category: string;
  };
}

export interface AssignmentSummaryProps {
  assignment: Assignment;
  showTournament?: boolean;
  compact?: boolean;
  testID?: string;
}

/**
 * AssignmentSummary with referee-centric information hierarchy
 * Priority Order: Referee Status > Match Info > Schedule > Tournament Context
 */
export const AssignmentSummary: React.FC<AssignmentSummaryProps> = ({
  assignment,
  showTournament = true,
  compact = false,
  testID,
}) => {
  const getRefereeStatusEmphasis = () => {
    switch (assignment.referee.status) {
      case 'in-progress':
        return 'critical' as const;
      case 'confirmed':
        return 'high' as const;
      case 'assigned':
        return 'medium' as const;
      case 'completed':
        return 'low' as const;
      default:
        return 'medium' as const;
    }
  };

  const getStatusColor = () => {
    switch (assignment.referee.status) {
      case 'in-progress':
        return 'success' as const;
      case 'confirmed':
        return 'primary' as const;
      case 'assigned':
        return 'textSecondary' as const;
      case 'completed':
        return 'textSecondary' as const;
      default:
        return 'textSecondary' as const;
    }
  };

  const getRefereeRoleText = () => {
    return assignment.referee.role === 'referee1' ? '1st Referee' : '2nd Referee';
  };

  const getStatusDisplayText = () => {
    switch (assignment.referee.status) {
      case 'in-progress':
        return 'ACTIVE NOW';
      case 'confirmed':
        return 'CONFIRMED';
      case 'assigned':
        return 'ASSIGNED';
      case 'completed':
        return 'COMPLETED';
      default:
        return assignment.referee.status.toUpperCase();
    }
  };

  return (
    <View style={[styles.container, compact && styles.compactContainer]} testID={testID}>
      {/* PRIMARY: Referee Status and Role - Most Critical Information */}
      <View style={styles.refereeStatusSection}>
        <Title 
          level={compact ? 2 : 1}
          critical={assignment.referee.status === 'in-progress'}
          color={getStatusColor()}
          style={styles.statusTitle}
        >
          {getStatusDisplayText()}
        </Title>
        
        <Heading 
          emphasis={getRefereeStatusEmphasis()}
          hierarchy="primary"
          color="accent"
          style={styles.refereeRole}
        >
          {getRefereeRoleText()}
        </Heading>
      </View>

      {/* SECONDARY: Match Information - Core Assignment Details */}
      <View style={styles.matchSection}>
        <Heading 
          emphasis="high"
          hierarchy="secondary"
          color="textPrimary"
          style={styles.matchId}
        >
          Match {assignment.matchId}
        </Heading>
        
        <View style={styles.teamsContainer}>
          <Subheading 
            emphasis="medium"
            color="textPrimary"
            style={styles.teamsText}
          >
            {assignment.teams.teamA} vs {assignment.teams.teamB}
          </Subheading>
        </View>
      </View>

      {/* TERTIARY: Schedule Information - Supporting Details */}
      <View style={styles.scheduleSection}>
        <View style={styles.timeCourtRow}>
          <View style={styles.timeContainer}>
            <EnhancedBodyText 
              emphasis="medium"
              hierarchy="tertiary"
              color="textPrimary"
              style={styles.timeText}
            >
              {assignment.schedule.time}
            </EnhancedBodyText>
            <EnhancedCaption 
              emphasis="medium"
              color="textSecondary"
            >
              {assignment.schedule.date}
            </EnhancedCaption>
          </View>
          
          <View style={styles.venueContainer}>
            <EnhancedBodyText 
              emphasis="high"
              hierarchy="tertiary"
              color="textPrimary"
              style={styles.courtText}
            >
              Court {assignment.schedule.court}
            </EnhancedBodyText>
            <EnhancedCaption 
              emphasis="medium"
              color="textSecondary"
            >
              {assignment.schedule.round}
            </EnhancedCaption>
          </View>
        </View>
      </View>

      {/* CONTEXT: Tournament Information (when shown) */}
      {showTournament && !compact && (
        <View style={styles.tournamentSection}>
          <EnhancedCaption 
            emphasis="low"
            color="textSecondary"
            style={styles.tournamentName}
          >
            {assignment.tournament.name}
          </EnhancedCaption>
          <EnhancedCaption 
            emphasis="low"
            color="textSecondary"
          >
            {assignment.tournament.category}
          </EnhancedCaption>
        </View>
      )}

      {/* Priority Indicator (visual emphasis only) */}
      {assignment.referee.priority === 'critical' && (
        <View style={styles.priorityIndicator}>
          <EnhancedCaption 
            urgent
            color="error"
            style={styles.priorityText}
          >
            HIGH PRIORITY
          </EnhancedCaption>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.lg,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  compactContainer: {
    padding: spacing.md,
    marginVertical: spacing.xs,
  },
  refereeStatusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statusTitle: {
    flex: 2,
  },
  refereeRole: {
    flex: 1,
    textAlign: 'right',
  },
  matchSection: {
    marginBottom: spacing.md,
  },
  matchId: {
    marginBottom: spacing.xs,
  },
  teamsContainer: {
    paddingLeft: spacing.sm,
  },
  teamsText: {
    lineHeight: 24,
  },
  scheduleSection: {
    marginBottom: spacing.sm,
  },
  timeCourtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  timeContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  timeText: {
    marginBottom: 2,
    fontWeight: '600',
  },
  venueContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  courtText: {
    marginBottom: 2,
    fontWeight: '600',
  },
  tournamentSection: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  tournamentName: {
    marginBottom: 2,
    textAlign: 'center',
  },
  priorityIndicator: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.error,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

export default AssignmentSummary;