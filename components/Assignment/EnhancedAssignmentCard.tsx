/**
 * EnhancedAssignmentCard Component
 * Advanced assignment card with status management, result entry, and navigation
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Assignment } from '../../types/assignments';
import { designTokens } from '../../theme/tokens';
import { StatusIndicator } from '../Status/StatusIndicator';
import { CountdownTimer } from '../Dashboard/CountdownTimer';
import { StatusIcons, DataIcons } from '../Icons/IconLibrary';
import { useAssignmentPreparation } from '../../hooks/useAssignmentPreparation';

interface EnhancedAssignmentCardProps {
  assignment: Assignment;
  onPress?: (assignment: Assignment) => void;
  onStatusManage?: (assignment: Assignment) => void;
  onResultEntry?: (assignment: Assignment) => void;
  onAssignmentDetails?: (assignment: Assignment) => void;
  showActions?: boolean;
  variant?: 'compact' | 'detailed' | 'timeline';
}

export const EnhancedAssignmentCard: React.FC<EnhancedAssignmentCardProps> = ({
  assignment,
  onPress,
  onStatusManage,
  onResultEntry,
  onAssignmentDetails,
  showActions = true,
  variant = 'detailed',
}) => {
  const { 
    getPreparation, 
    getPreparationCompletionRate,
    detectScheduleConflicts 
  } = useAssignmentPreparation();

  const preparation = getPreparation(assignment.id);
  const completionRate = getPreparationCompletionRate(assignment.id);
  const hasConflicts = detectScheduleConflicts([assignment]).length > 0;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };


  const handleResultEntry = () => {
    if (assignment.status === 'completed') {
      onResultEntry?.(assignment);
    } else {
      Alert.alert(
        'Enter Results',
        'This match must be completed before results can be entered.',
        [
          { text: 'OK', style: 'default' },
          { 
            text: 'Mark as Completed', 
            onPress: () => onStatusManage?.(assignment),
            style: 'default'
          }
        ]
      );
    }
  };

  const renderTimeInfo = () => {
    const showCountdown = assignment.status === 'upcoming' || assignment.status === 'current';
    
    return (
      <View style={styles.timeContainer}>
        <Text style={styles.dateText}>{formatDate(assignment.matchTime)}</Text>
        <Text style={styles.timeText}>{formatTime(assignment.matchTime)}</Text>
        {showCountdown && (
          <CountdownTimer 
            targetDate={assignment.matchTime}
            size="small"
            showMessage={false}
          />
        )}
      </View>
    );
  };

  const renderStatus = () => (
    <View style={styles.statusContainer}>
      <StatusIndicator
        type={assignment.status}
        size="medium"
        showIcon={true}
        showText={false}
      />
      {hasConflicts && (
        <View style={styles.conflictIndicator}>
          <Text style={styles.conflictText}>CONFLICT</Text>
        </View>
      )}
    </View>
  );

  const renderPreparationStatus = () => {
    if (!preparation || assignment.status === 'completed' || assignment.status === 'cancelled') {
      return null;
    }

    return (
      <View style={styles.preparationStatus}>
        <Text style={styles.preparationLabel}>
          Preparation: {completionRate}% complete
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${completionRate}%` }
            ]} 
          />
        </View>
      </View>
    );
  };

  const renderActions = () => {
    if (!showActions) return null;

    return (
      <View style={styles.actionsContainer}>
        {/* Assignment Details */}
        <TouchableOpacity
          style={[styles.actionButton, styles.detailsAction]}
          onPress={() => onAssignmentDetails?.(assignment)}
          accessibilityRole="button"
          accessibilityLabel="View assignment details"
        >
          <DataIcons.Details size="small" theme="default" colorKey="primary" />
          <Text style={styles.actionText}>Details</Text>
        </TouchableOpacity>

        {/* Status Management */}
        {(assignment.status === 'upcoming' || assignment.status === 'current') && (
          <TouchableOpacity
            style={[styles.actionButton, styles.statusAction]}
            onPress={() => onStatusManage?.(assignment)}
            accessibilityRole="button"
            accessibilityLabel="Manage assignment status"
          >
            <StatusIcons.Current size="small" theme="default" />
            <Text style={styles.actionText}>Manage</Text>
          </TouchableOpacity>
        )}

        {/* Result Entry */}
        {(assignment.status === 'completed' || assignment.status === 'current') && (
          <TouchableOpacity
            style={[styles.actionButton, styles.resultAction]}
            onPress={handleResultEntry}
            accessibilityRole="button"
            accessibilityLabel="Enter match results"
          >
            <DataIcons.Details size="small" theme="default" colorKey="accent" />
            <Text style={styles.actionText}>Results</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderCompactView = () => (
    <View style={styles.compactContent}>
      <View style={styles.compactInfo}>
        <Text style={styles.compactTeams}>
          {assignment.homeTeam} vs {assignment.awayTeam}
        </Text>
        <Text style={styles.compactDetails}>
          Court {assignment.courtNumber} • {formatTime(assignment.matchTime)}
        </Text>
      </View>
      {renderStatus()}
    </View>
  );

  const renderDetailedView = () => (
    <View style={styles.detailedContent}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.teamsText}>
            {assignment.homeTeam} vs {assignment.awayTeam}
          </Text>
          <Text style={styles.matchTypeText}>{assignment.matchType}</Text>
        </View>
        {renderStatus()}
      </View>

      <View style={styles.matchDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Court</Text>
          <Text style={styles.detailValue}>{assignment.courtNumber}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Position</Text>
          <Text style={styles.detailValue}>{assignment.refereePosition}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Time</Text>
          <Text style={styles.detailValue}>{formatTime(assignment.matchTime)}</Text>
        </View>
      </View>

      {assignment.notes && (
        <Text style={styles.notesText}>{assignment.notes}</Text>
      )}

      {renderPreparationStatus()}
      {renderActions()}
    </View>
  );

  const renderTimelineView = () => (
    <View style={styles.timelineContent}>
      <View style={styles.timelineHeader}>
        {renderTimeInfo()}
        {renderStatus()}
      </View>
      <Text style={styles.timelineTeams}>
        {assignment.homeTeam} vs {assignment.awayTeam}
      </Text>
      <Text style={styles.timelineDetails}>
        Court {assignment.courtNumber} • {assignment.refereePosition}
      </Text>
    </View>
  );

  return (
    <TouchableOpacity
      style={[
        styles.container,
        styles[`${variant}Container`],
        assignment.status === 'current' && styles.currentContainer,
        hasConflicts && styles.conflictContainer,
      ]}
      onPress={() => onPress?.(assignment)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Assignment: ${assignment.homeTeam} vs ${assignment.awayTeam}`}
    >
      {variant === 'compact' && renderCompactView()}
      {variant === 'detailed' && renderDetailedView()}
      {variant === 'timeline' && renderTimelineView()}

      {/* Priority indicator */}
      {assignment.importance === 'high' && (
        <View style={styles.priorityStripe} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designTokens.brandColors.primaryLight,
    marginBottom: designTokens.spacing.sm,
    overflow: 'hidden',
  },
  compactContainer: {
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.sm,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
  },
  detailedContainer: {
    padding: designTokens.spacing.md,
  },
  timelineContainer: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
  },
  currentContainer: {
    borderColor: designTokens.statusColors.current,
    borderWidth: 2,
    backgroundColor: designTokens.brandColors.primaryLight,
  },
  conflictContainer: {
    borderLeftWidth: 4,
    borderLeftColor: designTokens.colors.error,
  },
  priorityStripe: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 4,
    height: '100%',
    backgroundColor: designTokens.colors.error,
  },
  // Compact view styles
  compactContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactInfo: {
    flex: 1,
  },
  compactTeams: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
    marginBottom: 2,
  },
  compactDetails: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
  },
  // Detailed view styles
  detailedContent: {
    gap: designTokens.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
    marginRight: designTokens.spacing.sm,
  },
  teamsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
    marginBottom: 4,
  },
  matchTypeText: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
  },
  matchDetails: {
    flexDirection: 'row',
    gap: designTokens.spacing.md,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
  },
  notesText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: designTokens.colors.textSecondary,
    lineHeight: 20,
  },
  // Timeline view styles
  timelineContent: {
    gap: designTokens.spacing.xs,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeContainer: {
    alignItems: 'flex-start',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: designTokens.colors.textSecondary,
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
  },
  timelineTeams: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
  },
  timelineDetails: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
  },
  // Status and indicators
  statusContainer: {
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  conflictIndicator: {
    backgroundColor: designTokens.colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  conflictText: {
    fontSize: 9,
    fontWeight: '600',
    color: designTokens.colors.background,
  },
  // Preparation status
  preparationStatus: {
    gap: designTokens.spacing.xs,
  },
  preparationLabel: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: designTokens.brandColors.primaryLight,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: designTokens.colors.accent,
    borderRadius: 2,
  },
  // Actions
  actionsContainer: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
    paddingTop: designTokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: designTokens.brandColors.primaryLight,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: designTokens.spacing.sm,
    borderRadius: 6,
    gap: designTokens.spacing.xs,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
  },
  detailsAction: {
    backgroundColor: designTokens.brandColors.primaryLight,
  },
  statusAction: {
    backgroundColor: designTokens.colors.secondary,
  },
  resultAction: {
    backgroundColor: designTokens.colors.accent,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
  },
});