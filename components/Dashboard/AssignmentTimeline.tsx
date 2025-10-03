/**
 * AssignmentTimeline Component
 * Visual timeline showing referee's daily assignment schedule
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Assignment } from '../../types/assignments';
import { designTokens } from '../../theme/tokens';
import { StatusIcons } from '../Icons/IconLibrary';
import { CountdownTimer } from './CountdownTimer';

export type TimelineView = 'daily' | 'tournament' | 'detailed';
export type TimelineSort = 'time' | 'court' | 'importance';

interface AssignmentTimelineProps {
  assignments: Assignment[];
  currentAssignmentId?: string;
  onAssignmentPress?: (assignment: Assignment) => void;
  view?: TimelineView;
  showFilters?: boolean;
  showConflicts?: boolean;
  enableExpansion?: boolean;
  sortBy?: TimelineSort;
}

export const AssignmentTimeline: React.FC<AssignmentTimelineProps> = React.memo(({
  assignments,
  currentAssignmentId,
  onAssignmentPress,
  view = 'daily',
  showFilters = false,
  showConflicts = true,
  enableExpansion = true,
  sortBy = 'time',
}) => {
  const [selectedDate, setSelectedDate] = React.useState<string>(
    new Date().toDateString()
  );
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());
  const [currentSort, setCurrentSort] = React.useState<TimelineSort>(sortBy);
  // Enhanced sorting logic
  const getSortedAssignments = () => {
    let filtered = [...assignments];

    // Filter by view type
    if (view === 'daily') {
      const selectedDateObj = new Date(selectedDate);
      const dayStart = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      filtered = filtered.filter(assignment => 
        assignment.matchTime >= dayStart && assignment.matchTime < dayEnd
      );
    }

    // Apply sorting
    switch (currentSort) {
      case 'time':
        filtered.sort((a, b) => a.matchTime.getTime() - b.matchTime.getTime());
        break;
      case 'court':
        filtered.sort((a, b) => {
          if (a.courtNumber !== b.courtNumber) {
            return a.courtNumber - b.courtNumber;
          }
          return a.matchTime.getTime() - b.matchTime.getTime();
        });
        break;
      case 'importance':
        const importanceOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        filtered.sort((a, b) => {
          const aImportance = importanceOrder[a.importance as keyof typeof importanceOrder] || 1;
          const bImportance = importanceOrder[b.importance as keyof typeof importanceOrder] || 1;
          if (aImportance !== bImportance) {
            return bImportance - aImportance;
          }
          return a.matchTime.getTime() - b.matchTime.getTime();
        });
        break;
    }

    return filtered;
  };

  const sortedAssignments = getSortedAssignments();

  // Conflict detection logic
  const detectConflicts = (assignment: Assignment) => {
    if (!showConflicts) return false;
    
    const conflictWindow = 30 * 60 * 1000; // 30 minutes
    return assignments.some(other => 
      other.id !== assignment.id && 
      Math.abs(other.matchTime.getTime() - assignment.matchTime.getTime()) < conflictWindow
    );
  };

  // Toggle expansion
  const toggleExpansion = (assignmentId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(assignmentId)) {
      newExpanded.delete(assignmentId);
    } else {
      newExpanded.add(assignmentId);
    }
    setExpandedItems(newExpanded);
  };

  // Date navigation for daily view
  const navigateDate = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate);
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate.toDateString());
  };

  const formatTimeOnly = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusIcon = (status: string, isCurrent: boolean) => {
    const size = isCurrent ? 'large' : 'medium';
    const theme = isCurrent ? 'highContrast' : 'default';

    switch (status) {
      case 'current':
        return <StatusIcons.Current size={size} theme={theme} />;
      case 'upcoming':
        return <StatusIcons.Upcoming size={size} theme={theme} />;
      case 'completed':
        return <StatusIcons.Completed size={size} theme={theme} />;
      case 'cancelled':
        return <StatusIcons.Cancelled size={size} theme={theme} />;
      default:
        return <StatusIcons.Upcoming size={size} theme={theme} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current':
        return designTokens.statusColors.current;
      case 'upcoming':
        return designTokens.statusColors.upcoming;
      case 'completed':
        return designTokens.statusColors.completed;
      case 'cancelled':
        return designTokens.statusColors.cancelled;
      default:
        return designTokens.colors.textSecondary;
    }
  };

  const renderTimelineItem = (assignment: Assignment, index: number) => {
    const isCurrent = assignment.id === currentAssignmentId;
    const isLast = index === sortedAssignments.length - 1;
    const statusColor = getStatusColor(assignment.status);
    const hasConflict = detectConflicts(assignment);
    const isExpanded = expandedItems.has(assignment.id);

    return (
      <TouchableOpacity
        key={assignment.id}
        style={[
          styles.timelineItem,
          isCurrent && styles.currentTimelineItem,
          hasConflict && styles.conflictTimelineItem
        ]}
        onPress={() => {
          if (enableExpansion) {
            toggleExpansion(assignment.id);
          }
          onAssignmentPress?.(assignment);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Assignment: ${assignment.homeTeam} vs ${assignment.awayTeam} at ${formatTimeOnly(assignment.matchTime)}`}
      >
        {/* Timeline connector */}
        <View style={styles.timelineConnector}>
          <View style={[styles.timelineNode, { backgroundColor: statusColor }]}>
            {getStatusIcon(assignment.status, isCurrent)}
          </View>
          {!isLast && (
            <View style={[styles.timelineLine, { backgroundColor: statusColor }]} />
          )}
        </View>

        {/* Assignment content */}
        <View style={[styles.assignmentContent, isCurrent && styles.currentAssignmentContent]}>
          <View style={styles.assignmentHeader}>
            <Text style={[styles.assignmentTime, isCurrent && styles.currentAssignmentTime]}>
              {formatTimeOnly(assignment.matchTime)}
            </Text>
            {assignment.status === 'upcoming' && (
              <CountdownTimer 
                targetDate={assignment.matchTime}
                size="small"
                showMessage={false}
              />
            )}
          </View>

          <Text style={[styles.assignmentTeams, isCurrent && styles.currentAssignmentTeams]}>
            {assignment.homeTeam} vs {assignment.awayTeam}
          </Text>

          <View style={styles.assignmentDetails}>
            <Text style={[styles.assignmentCourt, isCurrent && styles.currentAssignmentDetail]}>
              Court {assignment.courtNumber} • {assignment.refereePosition}
            </Text>
            <Text style={[styles.assignmentType, isCurrent && styles.currentAssignmentDetail]}>
              {assignment.matchType}
            </Text>
          </View>

          {assignment.notes && (
            <Text style={[styles.assignmentNotes, isCurrent && styles.currentAssignmentNotes]}>
              {assignment.notes}
            </Text>
          )}

          {hasConflict && (
            <View style={styles.conflictBadge}>
              <Text style={styles.conflictText}>SCHEDULE CONFLICT</Text>
            </View>
          )}

          {assignment.importance === 'high' && (
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>HIGH PRIORITY</Text>
            </View>
          )}

          {/* Expanded details */}
          {enableExpansion && isExpanded && (
            <View style={styles.expandedDetails}>
              {assignment.tournamentInfo && (
                <View style={styles.expandedSection}>
                  <Text style={styles.expandedSectionTitle}>Tournament Info</Text>
                  <Text style={styles.expandedText}>Name: {assignment.tournamentInfo.name}</Text>
                  <Text style={styles.expandedText}>Location: {assignment.tournamentInfo.location}</Text>
                  <Text style={styles.expandedText}>Court: {assignment.tournamentInfo.court}</Text>
                </View>
              )}
              
              <View style={styles.expandedSection}>
                <Text style={styles.expandedSectionTitle}>Assignment Details</Text>
                <Text style={styles.expandedText}>Match ID: {assignment.id}</Text>
                <Text style={styles.expandedText}>Position: {assignment.refereePosition}</Text>
                <Text style={styles.expandedText}>Status: {assignment.status.toUpperCase()}</Text>
                {assignment.matchResult && (
                  <Text style={styles.expandedText}>Result: {assignment.matchResult}</Text>
                )}
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (sortedAssignments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Assignments</Text>
        <Text style={styles.emptyText}>
          You have no assignments scheduled for today.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Enhanced Header with View Controls */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {view === 'daily' ? `Schedule - ${new Date(selectedDate).toLocaleDateString()}` : 
           view === 'tournament' ? 'Tournament Schedule' : 'Detailed Timeline'}
        </Text>
        
        {/* Date navigation for daily view */}
        {view === 'daily' && (
          <View style={styles.dateNavigation}>
            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => navigateDate('prev')}
              accessibilityLabel="Previous day"
            >
              <Text style={styles.navButtonText}>←</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => navigateDate('next')}
              accessibilityLabel="Next day"
            >
              <Text style={styles.navButtonText}>→</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Filters and Sort Controls */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled={true}>
            <TouchableOpacity
              style={[styles.filterButton, currentSort === 'time' && styles.activeFilterButton]}
              onPress={() => setCurrentSort('time')}
            >
              <Text style={[styles.filterText, currentSort === 'time' && styles.activeFilterText]}>Time</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, currentSort === 'court' && styles.activeFilterButton]}
              onPress={() => setCurrentSort('court')}
            >
              <Text style={[styles.filterText, currentSort === 'court' && styles.activeFilterText]}>Court</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, currentSort === 'importance' && styles.activeFilterButton]}
              onPress={() => setCurrentSort('importance')}
            >
              <Text style={[styles.filterText, currentSort === 'importance' && styles.activeFilterText]}>Priority</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <View style={styles.summaryContainer}>
        <Text style={styles.subtitle}>
          {sortedAssignments.length} assignment{sortedAssignments.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView 
        style={styles.timeline}
        contentContainerStyle={styles.timelineContent}
        showsVerticalScrollIndicator={false}
      >
        {sortedAssignments.map((assignment, index) => 
          renderTimelineItem(assignment, index)
        )}
      </ScrollView>
    </View>
  );
});

AssignmentTimeline.displayName = 'AssignmentTimeline';

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.colors.background,
    borderRadius: 12,
    padding: designTokens.spacing.md,
    margin: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: designTokens.brandColors.primaryLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.brandColors.primaryLight,
  },
  dateNavigation: {
    flexDirection: 'row',
    gap: designTokens.spacing.xs,
  },
  navButton: {
    backgroundColor: designTokens.colors.secondary,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: 6,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
    minWidth: designTokens.iconTokens.accessibility.minimumTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    color: designTokens.colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  filtersContainer: {
    marginBottom: designTokens.spacing.sm,
    paddingBottom: designTokens.spacing.sm,
  },
  filterButton: {
    backgroundColor: designTokens.brandColors.primaryLight,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: 20,
    marginRight: designTokens.spacing.xs,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
    justifyContent: 'center',
  },
  activeFilterButton: {
    backgroundColor: designTokens.colors.secondary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
  },
  activeFilterText: {
    color: designTokens.colors.background,
  },
  summaryContainer: {
    marginBottom: designTokens.spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
  },
  timeline: {
    maxHeight: 300,
  },
  timelineContent: {
    paddingBottom: designTokens.spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: designTokens.spacing.sm,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
  },
  currentTimelineItem: {
    backgroundColor: designTokens.brandColors.primaryLight,
    borderRadius: 8,
    marginHorizontal: -designTokens.spacing.xs,
    paddingHorizontal: designTokens.spacing.xs,
    paddingVertical: designTokens.spacing.xs,
  },
  conflictTimelineItem: {
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    marginHorizontal: -designTokens.spacing.xs,
    paddingHorizontal: designTokens.spacing.xs,
    paddingVertical: designTokens.spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: designTokens.colors.error,
  },
  timelineConnector: {
    width: 40,
    alignItems: 'center',
    marginRight: designTokens.spacing.sm,
  },
  timelineNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    opacity: 0.3,
  },
  assignmentContent: {
    flex: 1,
    paddingTop: 2,
  },
  currentAssignmentContent: {
    // Additional styling for current assignment if needed
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  assignmentTime: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
  },
  currentAssignmentTime: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  assignmentTeams: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
    marginBottom: 4,
  },
  currentAssignmentTeams: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  assignmentDetails: {
    marginBottom: 4,
  },
  assignmentCourt: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
    marginBottom: 2,
  },
  assignmentType: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
  },
  currentAssignmentDetail: {
    fontWeight: '500',
  },
  assignmentNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    color: designTokens.colors.textSecondary,
    marginTop: 4,
  },
  currentAssignmentNotes: {
    fontSize: 14,
  },
  priorityBadge: {
    backgroundColor: designTokens.colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '600',
    color: designTokens.colors.background,
    letterSpacing: 0.5,
  },
  conflictBadge: {
    backgroundColor: designTokens.colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  conflictText: {
    fontSize: 9,
    fontWeight: '600',
    color: designTokens.colors.background,
    letterSpacing: 0.5,
  },
  expandedDetails: {
    marginTop: designTokens.spacing.sm,
    paddingTop: designTokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: designTokens.brandColors.primaryLight,
  },
  expandedSection: {
    marginBottom: designTokens.spacing.sm,
  },
  expandedSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
    marginBottom: 4,
  },
  expandedText: {
    fontSize: 11,
    color: designTokens.colors.textSecondary,
    marginBottom: 2,
    lineHeight: 14,
  },
  emptyContainer: {
    backgroundColor: designTokens.colors.background,
    borderRadius: 12,
    padding: designTokens.spacing.xl,
    margin: designTokens.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: designTokens.brandColors.primaryLight,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default AssignmentTimeline;