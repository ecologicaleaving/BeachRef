/**
 * Enhanced Current Assignment Card - Hero Content Implementation
 * Primary information display with maximum prominence for referee workflow
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Assignment } from '../../types/assignments';
import { designTokens } from '../../theme/tokens';

// Design tokens successfully loaded with safe fallbacks
import { StatusIndicator } from '../Status';
import { HeroContent, ContextSensitiveDisplay, TimeSensitiveContent, useRefereeContext } from '../Hierarchy';
import { CourtNumber, VisualHierarchyText } from '../Hierarchy/VisualHierarchyText';
import { CountdownTimer } from './CountdownTimer';
import { UrgentNotifications } from './UrgentNotifications';

interface EnhancedCurrentAssignmentCardProps {
  assignment: Assignment;
  onViewDetails?: () => void;
  onEnterResults?: () => void;
  onPrepare?: () => void;
  showQuickActions?: boolean;
  heroProminence?: 'maximum' | 'high' | 'standard';
}

export const EnhancedCurrentAssignmentCard: React.FC<EnhancedCurrentAssignmentCardProps> = ({
  assignment,
  onViewDetails,
  onEnterResults,
  onPrepare,
  showQuickActions = true,
  heroProminence = 'maximum',
}) => {
  const context = useRefereeContext(assignment);
  
  // Time-critical calculations (memoized for performance)
  const timeCalculations = React.useMemo(() => {
    const now = new Date();
    const assignmentTime = new Date(assignment.matchTime);
    const minutesUntil = (assignmentTime.getTime() - now.getTime()) / (1000 * 60);
    return {
      minutesUntil,
      isUrgent: minutesUntil <= 15 && minutesUntil > 0,
      isImmediate: minutesUntil <= 5 && minutesUntil > 0,
    };
  }, [assignment.matchTime]);
  
  const { minutesUntil, isUrgent, isImmediate } = timeCalculations;

  const formatMatchTime = React.useCallback((timeStr: string) => {
    try {
      const time = new Date(timeStr);
      return time.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return timeStr;
    }
  }, []);

  const formatTeams = React.useCallback((teams: (string | undefined)[]) => {
    const validTeams = teams.filter(team => team && team.trim());
    if (validTeams.length === 0) {
      return 'Teams TBD';
    }
    if (validTeams.length >= 2) {
      return `${validTeams[0]} vs ${validTeams[1]}`;
    }
    return validTeams.join(', ');
  }, []);

  const getUrgencyLevel = (): 'immediate' | 'urgent' | 'normal' => {
    if (isImmediate) return 'immediate';
    if (isUrgent) return 'urgent';
    return 'normal';
  };

  return (
    <ContextSensitiveDisplay 
      context={context} 
      assignment={assignment}
      priority="primary"
    >
      <TimeSensitiveContent 
        assignment={assignment}
        urgencyThreshold={15}
        style={styles.container}
      >
        <HeroContent 
          prominence={heroProminence}
          contextSensitive={true}
        >
          {/* Urgent Notifications Banner */}
          {(isUrgent || isImmediate) && (
            <UrgentNotifications
              level={getUrgencyLevel()}
              message={isImmediate ? 'MATCH STARTING NOW' : 'MATCH STARTING SOON'}
              assignment={assignment}
            />
          )}

          {/* Assignment Status Indicator */}
          <View style={styles.statusSection}>
            <StatusIndicator
              type={assignment.status as any}
              size="large"
              variant="prominent"
              showIcon={true}
              showText={true}
              customLabel="CURRENT ASSIGNMENT"
            />
            {assignment.priority === 'high' && (
              <View style={styles.priorityBadge}>
                <Text style={styles.priorityText}>HIGH PRIORITY</Text>
              </View>
            )}
          </View>

          {/* Court Number - Hero Typography */}
          <View style={styles.courtSection}>
            <CourtNumber 
              courtNumber={assignment.court} 
              status="current"
              urgent={isUrgent}
            />
            {assignment.courtType && (
              <VisualHierarchyText 
                priority="secondary" 
                variant="body"
                style={styles.courtType}
              >
                {assignment.courtType}
              </VisualHierarchyText>
            )}
          </View>

          {/* Time-Critical Data */}
          <View style={styles.timeSection}>
            <CountdownTimer
              targetTime={assignment.matchTime}
              size="large"
              urgentThreshold={15}
              immediateThreshold={5}
              showProgress={true}
            />
            <VisualHierarchyText 
              priority="primary" 
              variant="body"
              emphasis="strong"
              style={styles.matchTime}
            >
              Match Time: {formatMatchTime(assignment.matchTime)}
            </VisualHierarchyText>
          </View>

          {/* Teams - Primary Information */}
          <View style={styles.teamsSection}>
            <VisualHierarchyText 
              priority="primary" 
              variant="title"
              emphasis="normal"
              style={styles.teams}
            >
              {formatTeams([assignment.homeTeam, assignment.awayTeam])}
            </VisualHierarchyText>
            {assignment.matchType && (
              <VisualHierarchyText 
                priority="secondary" 
                variant="body"
                style={styles.matchType}
              >
                {assignment.matchType}
              </VisualHierarchyText>
            )}
          </View>

          {/* Assignment Context */}
          <View style={styles.contextSection}>
            {assignment.round && (
              <View style={styles.contextItem}>
                <Text style={styles.contextLabel}>Round:</Text>
                <Text style={styles.contextValue}>{assignment.round}</Text>
              </View>
            )}
            {assignment.phase && (
              <View style={styles.contextItem}>
                <Text style={styles.contextLabel}>Phase:</Text>
                <Text style={styles.contextValue}>{assignment.phase}</Text>
              </View>
            )}
            {assignment.importance && (
              <View style={styles.contextItem}>
                <Text style={styles.contextLabel}>Importance:</Text>
                <Text style={[styles.contextValue, styles.importance]}>
                  {assignment.importance}
                </Text>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          {showQuickActions && (
            <View style={styles.actionsSection}>
              {onViewDetails && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.primaryAction]} 
                  onPress={onViewDetails}
                >
                  <Text style={styles.primaryActionText}>View Details</Text>
                </TouchableOpacity>
              )}
              
              {assignment.status === 'completed' && onEnterResults && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.secondaryAction]} 
                  onPress={onEnterResults}
                >
                  <Text style={styles.secondaryActionText}>Enter Results</Text>
                </TouchableOpacity>
              )}

              {(context === 'preparing' || context === 'upcoming') && onPrepare && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.tertiaryAction]} 
                  onPress={onPrepare}
                >
                  <Text style={styles.tertiaryActionText}>Prepare</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Emergency Information Access */}
          <TouchableOpacity style={styles.emergencyAccess}>
            <Text style={styles.emergencyText}>🚨 Emergency Contacts</Text>
          </TouchableOpacity>
        </HeroContent>
      </TimeSensitiveContent>
    </ContextSensitiveDisplay>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: designTokens.spacing.md,
    marginVertical: designTokens.spacing.sm,
  },

  statusSection: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
  },

  priorityBadge: {
    backgroundColor: designTokens.colors?.error || '#8B1538',
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: designTokens.spacing.xs,
  },

  priorityText: {
    color: designTokens.colors?.background || '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  courtSection: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.lg,
  },

  courtType: {
    marginTop: designTokens.spacing.xs,
    textAlign: 'center',
    color: designTokens.colors?.textSecondary || '#445566',
  },

  timeSection: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.lg,
  },

  matchTime: {
    marginTop: designTokens.spacing.sm,
    textAlign: 'center',
  },

  teamsSection: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
  },

  teams: {
    textAlign: 'center',
    marginBottom: designTokens.spacing.xs,
  },

  matchType: {
    textAlign: 'center',
    color: designTokens.colors?.textSecondary || '#445566',
  },

  contextSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.lg,
    paddingHorizontal: designTokens.spacing.sm,
  },

  contextItem: {
    flexDirection: 'row',
    backgroundColor: designTokens.brandColors.primaryLight,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: 6,
    alignItems: 'center',
  },

  contextLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors?.textSecondary || '#445566',
    marginRight: designTokens.spacing.xs,
  },

  contextValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: designTokens.colors?.textPrimary || '#2C3E50',
  },

  importance: {
    color: designTokens.colors?.error || '#8B1538',
  },

  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.md,
  },

  actionButton: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: 8,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },

  primaryAction: {
    backgroundColor: designTokens.colors?.primary || '#1B365D',
  },

  secondaryAction: {
    backgroundColor: designTokens.colors?.secondary || '#2B5F75',
  },

  tertiaryAction: {
    backgroundColor: designTokens.colors?.accent || '#B8391A',
  },

  primaryActionText: {
    color: designTokens.colors?.background || '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  secondaryActionText: {
    color: designTokens.colors?.background || '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  tertiaryActionText: {
    color: designTokens.colors?.background || '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  emergencyAccess: {
    alignItems: 'center',
    paddingVertical: designTokens.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: designTokens.brandColors.primaryLight,
    marginTop: designTokens.spacing.sm,
  },

  emergencyText: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors?.error || '#8B1538',
  },
});