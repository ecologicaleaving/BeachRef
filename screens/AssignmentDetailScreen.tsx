import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefereeAssignment } from '../types/RefereeAssignments';
import { RoundPhaseDisplay } from '../components/Typography/RoundPhaseDisplay';

export const AssignmentDetailScreen: React.FC = () => {
  const { assignmentData } = useLocalSearchParams<{ assignmentData: string }>();
  const router = useRouter();

  const assignment: RefereeAssignment = React.useMemo(() => {
    try {
      return JSON.parse(assignmentData || '{}') as RefereeAssignment;
    } catch {
      return {} as RefereeAssignment;
    }
  }, [assignmentData]);

  const formatTime = (date: Date, time: string) => {
    if (time) return time;
    try {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch {
      return 'TBD';
    }
  };

  const formatDate = (date: Date) => {
    try {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Date TBD';
    }
  };

  const getStatusColor = () => {
    switch (assignment.status) {
      case 'Running':
        return styles.statusActive;
      case 'Scheduled':
        return styles.statusUpcoming;
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
      case 'Running':
        return 'LIVE NOW';
      case 'Scheduled':
        return 'UPCOMING';
      case 'Finished':
        return 'COMPLETED';
      case 'Cancelled':
        return 'CANCELLED';
      default:
        return assignment.status?.toUpperCase() || 'TBD';
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleGoBack}
          accessibilityRole="button"
          accessibilityLabel="Go back to assignments"
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assignment Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, getStatusColor()]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        </View>

        {/* Match Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Match Information</Text>
          <View style={styles.card}>
            <Text style={styles.matchTitle}>
              {assignment.teamAName || 'Team A'} vs {assignment.teamBName || 'Team B'}
            </Text>
            <Text style={styles.matchNumber}>
              Match #{assignment.matchInTournament || assignment.matchNo || 'TBD'}
            </Text>
            <RoundPhaseDisplay
              round={assignment.roundPhase || assignment.round || 'TBD'}
              emphasis="medium"
              color="textPrimary"
              style={styles.roundText}
            />
          </View>
        </View>

        {/* Schedule Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>
                {assignment.localDate ? formatDate(assignment.localDate) : 'TBD'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Time</Text>
              <Text style={styles.infoValue}>
                {assignment.localDate ? formatTime(assignment.localDate, assignment.localTime) : 'TBD'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Court</Text>
              <Text style={styles.infoValue}>
                {assignment.court ? `Court ${assignment.court}` : 'Court TBD'}
              </Text>
            </View>
          </View>
        </View>

        {/* Referee Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Referee Assignment</Text>
          <View style={styles.card}>
            <View style={styles.refereeInfo}>
              <Text style={styles.refereeRole}>
                {assignment.refereeRole === 'referee1' ? '1st Referee' : '2nd Referee'}
              </Text>
              <Text style={styles.refereeDescription}>
                {assignment.refereeRole === 'referee1' 
                  ? 'Main referee responsible for match officiating'
                  : 'Assistant referee supporting match officiating'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Tournament Context */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tournament Context</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tournament</Text>
              <Text style={styles.infoValue}>
                #{assignment.tournamentNo || 'TBD'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Match Status</Text>
              <Text style={styles.infoValue}>
                {assignment.status || 'TBD'}
              </Text>
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <View style={styles.card}>
            <Text style={styles.instructionText}>
              Please arrive at the assigned court at least 15 minutes before the scheduled match time. 
              Ensure you have all necessary referee equipment and check in with tournament officials.
            </Text>
            {assignment.status === 'Scheduled' && (
              <Text style={styles.reminderText}>
                ⏰ Remember to check for any schedule updates before heading to the court.
              </Text>
            )}
            {assignment.status === 'Running' && (
              <Text style={styles.liveText}>
                🔴 This match is currently in progress. Please proceed to your assigned court immediately.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    minWidth: 80,
    minHeight: 44, // Touch target requirement
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: {
    width: 80,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 120,
    alignItems: 'center',
  },
  statusActive: {
    backgroundColor: '#10B981', // High contrast green
  },
  statusUpcoming: {
    backgroundColor: '#3B82F6', // Professional blue
  },
  statusCompleted: {
    backgroundColor: '#6B7280', // Muted gray
  },
  statusCancelled: {
    backgroundColor: '#EF4444', // Alert red
  },
  statusDefault: {
    backgroundColor: '#9CA3AF',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  matchTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 32,
  },
  matchNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  roundText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  refereeInfo: {
    alignItems: 'center',
  },
  refereeRole: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 8,
  },
  refereeDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    lineHeight: 24,
    marginBottom: 12,
  },
  reminderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    backgroundColor: '#EBF4FF',
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
  },
  liveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    textAlign: 'center',
  },
});