import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  ActivityIndicator,
  TouchableOpacity,
  } from 'react-native';

import { useRouter } from 'expo-router';
import { Assignment } from '../types/assignments';
import { useCurrentAssignment } from '../hooks/useCurrentAssignment';
import { useAssignmentPreparation } from '../hooks/useAssignmentPreparation';
import { AssignmentStatusProvider, useAssignmentStatus } from '../hooks/useAssignmentStatus';
import { AssignmentTimeline, TimelineView } from '../components/Dashboard/AssignmentTimeline';
import { EnhancedAssignmentCard } from '../components/Assignment/EnhancedAssignmentCard';
import { AssignmentStatusManager } from '../components/Assignment/AssignmentStatusManager';
import { StatusIndicator } from '../components/Status/StatusIndicator';
import NavigationHeader from '../components/navigation/NavigationHeader';
import BottomTabNavigation from '../components/navigation/BottomTabNavigation';
import { designTokens } from '../theme/tokens';
import { assignmentNavigation } from '../utils/assignmentNavigation';

const MyAssignmentsScreenContent: React.FC = () => {
  const router = useRouter();
  
  // Initialize navigation helper
  useEffect(() => {
    assignmentNavigation.setRouter(router);
  }, [router]);

  // Enhanced state management
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [timelineView, ] = useState<TimelineView>('daily');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  
  // Use enhanced hooks
  const {
    currentAssignment,
    upcomingAssignments,
    loading: assignmentsLoading,
    error: assignmentsError,
    refreshAssignments,
  } = useCurrentAssignment();

  const {
    getPreparation,
    savePreparation,
    updateAssignmentStatus: updatePreparationStatus,
    detectScheduleConflicts,
    syncPending,
    lastSyncTime,
    syncPendingData,
  } = useAssignmentPreparation();

  // Assignment status management
  const { 
    currentAssignmentStatus,
    _allStatuses,
    statusCounts,
    isOnline,
    syncStatus,
    updateAssignmentStatus,
    _getAssignmentsByStatus,
    refreshStatuses
  } = useAssignmentStatus();

  // Combine all assignments for comprehensive view
  const allAssignments = React.useMemo(() => {
    const assignments: Assignment[] = [];
    if (currentAssignment) assignments.push(currentAssignment);
    assignments.push(...upcomingAssignments);
    return assignments;
  }, [currentAssignment, upcomingAssignments]);

  // Detect conflicts
  const conflictingAssignments = detectScheduleConflicts(allAssignments);

  // Assignment action handlers
  const handleAssignmentPress = useCallback((assignment: Assignment) => {
    assignmentNavigation.navigateToAssignmentDetails(assignment, {
      sourceScreen: 'my-assignments',
    });
  }, []);

  const handleStatusManage = useCallback((assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setStatusModalVisible(true);
  }, []);

  const handleResultEntry = useCallback((assignment: Assignment) => {
    assignmentNavigation.navigateToResultEntry(assignment, {
      sourceScreen: 'my-assignments',
    });
  }, []);

  const handleAssignmentDetails = useCallback((assignment: Assignment) => {
    assignmentNavigation.navigateToAssignmentDetails(assignment, {
      sourceScreen: 'my-assignments',
    });
  }, []);

  const handleStatusUpdate = useCallback(async (assignmentId: string, newStatus: any) => {
    try {
      // Update both assignment status and preparation status
      await updateAssignmentStatus(assignmentId, newStatus, 'normal');
      await updatePreparationStatus(assignmentId, newStatus, selectedAssignment || undefined);
      await refreshAssignments();
      setStatusModalVisible(false);
      setSelectedAssignment(null);
    } catch (error) {
      // Silent error handling
    }
  }, [updateAssignmentStatus, updatePreparationStatus, refreshAssignments, selectedAssignment]);

  const handlePreparationUpdate = useCallback(async (preparation: any) => {
    try {
      await savePreparation(preparation);
    } catch (error) {
      // Silent error handling
    }
  }, [savePreparation]);

  const handleRefresh = useCallback(async () => {
    await refreshAssignments();
    refreshStatuses();
  }, [refreshAssignments, refreshStatuses]);

  // Loading state
  if (assignmentsLoading) {
    return (
      <View style={styles.container}>
        <NavigationHeader
          title="My Assignments"
          showBackButton={true}
          showRefreshButton={false}
          onRefresh={() => {
            refreshAssignments();
          }}
          showStatusBar={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={designTokens.colors.accent} />
          <Text style={styles.loadingText}>Loading your assignments...</Text>
        </View>
        <BottomTabNavigation currentTab="assignments" />
      </View>
    );
  }

  // Error state
  if (assignmentsError) {
    return (
      <View style={styles.container}>
        <NavigationHeader
          title="My Assignments"
          showBackButton={true}
          showRefreshButton={false}
          onRefresh={() => {
            refreshAssignments();
          }}
          showStatusBar={false}
        />
        <ScrollView
          contentContainerStyle={styles.errorContainer}
          refreshControl={
            <RefreshControl refreshing={assignmentsLoading} onRefresh={handleRefresh} />
          }
        >
          <Text style={styles.errorTitle}>Unable to load assignments</Text>
          <Text style={styles.errorText}>{assignmentsError}</Text>
          <Text style={styles.pullToRefreshText}>Pull down to retry</Text>
        </ScrollView>
        <BottomTabNavigation currentTab="assignments" />
      </View>
    );
  }

  // Main render
  return (
    <View style={styles.container}>
      <NavigationHeader
        title="My Assignments"
        showBackButton={true}
        showStatusBar={false}
        showRefreshButton={false}
        onRefresh={() => {
          refreshAssignments();
        }}
        onStatusPress={() => {
          if (currentAssignmentStatus) {
            handleAssignmentPress(currentAssignment!);
          }
        }}
        rightComponent={
          <View style={styles.headerActions}>
            {/* Status Badge Indicators */}
            {statusCounts.emergency > 0 && (
              <View style={[styles.statusBadge, { backgroundColor: designTokens.colors.error }]}>
                <Text style={styles.statusBadgeText}>{statusCounts.emergency}</Text>
              </View>
            )}
            {statusCounts.upcoming > 0 && (
              <View style={[styles.statusBadge, { backgroundColor: designTokens.colors.secondary }]}>
                <Text style={styles.statusBadgeText}>{statusCounts.upcoming}</Text>
              </View>
            )}
            
            {/* View Mode Toggle */}
            <TouchableOpacity
              style={[
                styles.viewModeButton,
                viewMode === 'timeline' && styles.activeViewModeButton
              ]}
              onPress={() => setViewMode(viewMode === 'list' ? 'timeline' : 'list')}
              accessibilityLabel={`Switch to ${viewMode === 'list' ? 'timeline' : 'list'} view`}
            >
              <Text style={[
                styles.viewModeText,
                viewMode === 'timeline' && styles.activeViewModeText
              ]}>
                {viewMode === 'list' ? '📋' : '📅'}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={assignmentsLoading}
            onRefresh={handleRefresh}
            colors={[designTokens.colors.accent]}
            tintColor={designTokens.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Assignment Status Overview */}
        <View style={styles.statusOverview}>
          <StatusIndicator
            type={currentAssignment ? 'current' : 'completed'}
            size="large"
            variant="prominent"
            showIcon={true}
            showText={true}
            customLabel={currentAssignment ? 'Active Assignment' : 'No Active Assignment'}
          />
          
          {/* Network and Sync Status */}
          {(!isOnline || syncStatus !== 'synced' || syncPending) && (
            <View style={styles.syncStatus}>
              <Text style={[
                styles.syncStatusText,
                { color: !isOnline ? designTokens.colors.error : designTokens.colors.warning }
              ]}>
                {!isOnline ? '📴 Offline Mode' : 
                 syncStatus === 'syncing' ? '🔄 Syncing...' : 
                 syncPending ? '🔄 Sync Pending' : '⚠️ Sync Required'}
              </Text>
              {lastSyncTime && (
                <Text style={styles.lastSyncText}>
                  Last sync: {lastSyncTime.toLocaleTimeString()}
                </Text>
              )}
              {syncPending && isOnline && (
                <TouchableOpacity 
                  style={styles.syncButton}
                  onPress={syncPendingData}
                >
                  <Text style={styles.syncButtonText}>Sync Now</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {conflictingAssignments.length > 0 && (
            <View style={styles.conflictAlert}>
              <Text style={styles.conflictAlertText}>
                ⚠️ {conflictingAssignments.length} schedule conflict{conflictingAssignments.length !== 1 ? 's' : ''} detected
              </Text>
            </View>
          )}
        </View>

        {allAssignments.length === 0 ? (
          // Empty state
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No assignments found</Text>
            <Text style={styles.emptyText}>
              You don&apos;t have any referee assignments scheduled.
            </Text>
            <Text style={styles.pullToRefreshText}>Pull down to refresh</Text>
          </View>
        ) : viewMode === 'timeline' ? (
          // Timeline view
          <AssignmentTimeline
            assignments={allAssignments}
            currentAssignmentId={currentAssignment?.id}
            onAssignmentPress={handleAssignmentPress}
            view={timelineView}
            showFilters={true}
            showConflicts={true}
            enableExpansion={true}
          />
        ) : (
          // List view with enhanced cards
          <View style={styles.assignmentsList}>
            {/* Current Assignment - Prominent Display */}
            {currentAssignment && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Current Assignment</Text>
                <EnhancedAssignmentCard
                  assignment={currentAssignment}
                  onPress={handleAssignmentPress}
                  onStatusManage={handleStatusManage}
                  onResultEntry={handleResultEntry}
                  onAssignmentDetails={handleAssignmentDetails}
                  variant="detailed"
                  showActions={true}
                />
              </View>
            )}

            {/* Upcoming Assignments */}
            {upcomingAssignments.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Upcoming Assignments ({upcomingAssignments.length})
                </Text>
                {upcomingAssignments.map((assignment) => (
                  <EnhancedAssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    onPress={handleAssignmentPress}
                    onStatusManage={handleStatusManage}
                    onResultEntry={handleResultEntry}
                    onAssignmentDetails={handleAssignmentDetails}
                    variant="compact"
                    showActions={false}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Footer spacing */}
        <View style={styles.footer} />
      </ScrollView>

      {/* Assignment Status Management Modal */}
      {selectedAssignment && (
        <AssignmentStatusManager
          assignment={selectedAssignment}
          onStatusUpdate={handleStatusUpdate}
          onPreparationUpdate={handlePreparationUpdate}
          preparation={getPreparation(selectedAssignment.id)}
          visible={statusModalVisible}
          onClose={() => {
            setStatusModalVisible(false);
            setSelectedAssignment(null);
          }}
        />
      )}

      <BottomTabNavigation currentTab="assignments" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.background,
  },
  headerActions: {
    flexDirection: 'row',
    gap: designTokens.spacing.xs,
  },
  viewModeButton: {
    backgroundColor: designTokens.brandColors.primaryLight,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: 6,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
    minWidth: designTokens.iconTokens.accessibility.minimumTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeViewModeButton: {
    backgroundColor: designTokens.colors.secondary,
  },
  viewModeText: {
    fontSize: 16,
    color: designTokens.colors.textPrimary,
  },
  activeViewModeText: {
    color: designTokens.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: designTokens.spacing.xl,
  },
  statusOverview: {
    padding: designTokens.spacing.md,
    backgroundColor: designTokens.brandColors.primaryLight,
    marginHorizontal: designTokens.spacing.md,
    marginTop: designTokens.spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    gap: designTokens.spacing.sm,
  },
  conflictAlert: {
    backgroundColor: designTokens.colors.error,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: 8,
  },
  conflictAlertText: {
    color: designTokens.colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  syncStatus: {
    backgroundColor: designTokens.brandColors.primaryLight,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  syncStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  lastSyncText: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
  },
  syncButton: {
    backgroundColor: designTokens.colors.accent,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: 6,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
    justifyContent: 'center',
  },
  syncButtonText: {
    color: designTokens.colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: designTokens.spacing.xl,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '500',
    color: designTokens.colors.textSecondary,
    marginTop: designTokens.spacing.md,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: designTokens.spacing.xl,
    minHeight: 400,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: designTokens.colors.error,
    marginBottom: designTokens.spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: designTokens.spacing.lg,
  },
  assignmentsList: {
    gap: designTokens.spacing.sm,
  },
  section: {
    marginTop: designTokens.spacing.lg,
    marginHorizontal: designTokens.spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: designTokens.spacing.xl * 2,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: designTokens.colors.textSecondary,
    marginBottom: designTokens.spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: designTokens.spacing.lg,
  },
  pullToRefreshText: {
    fontSize: 14,
    fontWeight: '500',
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    height: designTokens.spacing.xl,
  },
  
  // Status Integration Styles
  statusBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginRight: designTokens.spacing.xs,
  },
  
  statusBadgeText: {
    color: designTokens.colors.background,
    fontSize: 11,
    fontWeight: 'bold',
  },
});

// Wrapper component with AssignmentStatusProvider
export const MyAssignmentsScreen: React.FC = () => {
  return (
    <AssignmentStatusProvider>
      <MyAssignmentsScreenContent />
    </AssignmentStatusProvider>
  );
};

export default MyAssignmentsScreen;
