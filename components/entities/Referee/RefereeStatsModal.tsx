import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { EventReferee, RefereeOfficial, getOfficialDisplayName } from '../../../types/referee-v2';
import { FlagImage } from '../../FlagImage';
import { StatusBadge } from '../../Status';
import { ActionIcons } from '../../Icons/IconLibrary';
import { colors } from '../../../theme/tokens';
import { useRefereeAnalytics } from '../../../hooks/useRefereeAnalytics';

export interface RefereeStatsModalProps {
  referee: EventReferee | RefereeOfficial;
  visible: boolean;
  onClose: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * Referee Stats Modal Component
 * Shows detailed statistics for a referee with profile navigation option
 */
export const RefereeStatsModal: React.FC<RefereeStatsModalProps> = ({
  referee,
  visible,
  onClose,
}) => {
  const router = useRouter();

  // Get referee analytics data
  const { data: analyticsData, isLoading: analyticsLoading, error } = useRefereeAnalytics(
    { refereeIds: [referee.id] },
    {
      enabled: visible, // Only fetch when modal is visible
      cacheStrategy: 'historical',
      enablePerformanceMonitoring: true
    }
  );

  // Handle profile navigation
  const handleViewProfile = () => {
    onClose(); // Close modal first
    router.push({
      pathname: '/referee-profile',
      params: {
        refereeData: JSON.stringify(referee)
      }
    });
  };

  // Get referee stats data
  const refereeStats = analyticsData?.data?.find(stats => stats.referee_id === referee.id) || analyticsData?.data?.[0];

  // Determine referee status for badge
  const statusForBadge = (() => {
    switch (referee.status) {
      case 'Active': return 'active';
      case 'Inactive': return 'inactive';
      case 'Suspended': return 'error';
      case 'Restricted': return 'warning';
      default: return 'inactive';
    }
  })();

  // Get gender display
  const getGenderDisplay = () => {
    const gender = referee.gender;
    if (!gender) return null;

    const genderSymbol = gender === 'M' ? '♂' : gender === 'W' ? '♀' : '⚭';
    const genderStyle = gender === 'M' ? styles.genderMale :
                       gender === 'W' ? styles.genderFemale :
                       styles.genderMixed;

    return (
      <View style={styles.genderBadge}>
        <Text style={[styles.genderSymbol, genderStyle]}>
          {genderSymbol}
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <ActionIcons.Close style={styles.closeIcon} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Referee Statistics</Text>
          </View>
          <TouchableOpacity onPress={handleViewProfile} style={styles.profileButton}>
            <ActionIcons.Profile style={styles.profileIcon} />
            <Text style={styles.profileButtonText}>Profile</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Referee Info Card */}
          <View style={styles.refereeCard}>
            <View style={styles.refereeHeader}>
              <FlagImage
                countryCode={referee.federationCode}
                style={styles.flag}
              />
              <View style={styles.refereeInfo}>
                <Text style={styles.refereeName}>
                  {getOfficialDisplayName(referee)}
                </Text>
                <Text style={styles.refereeId}>
                  {'RefereeId' in referee ? `#${referee.RefereeId}` : `#${referee.noOfficial}`}
                </Text>
                <View style={styles.refereeDetails}>
                  <Text style={styles.federationText}>{referee.federationCode}</Text>
                  <Text style={styles.typeText}>{referee.type}</Text>
                </View>
              </View>
              <View style={styles.headerRight}>
                {getGenderDisplay()}
                <StatusBadge
                  status={statusForBadge as any}
                  size="small"
                  variant="solid"
                />
              </View>
            </View>
          </View>

          {/* Statistics Section */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Performance Statistics</Text>

            {analyticsLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading statistics...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Unable to load statistics</Text>
              </View>
            ) : !refereeStats ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No statistics available</Text>
              </View>
            ) : (
              <>
                {/* Main Stats Grid */}
                <View style={styles.mainStatsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{refereeStats.total_assignments}</Text>
                    <Text style={styles.statLabel}>Total Matches</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{refereeStats.tournaments_worked.length}</Text>
                    <Text style={styles.statLabel}>Tournaments</Text>
                  </View>
                </View>

                <View style={styles.mainStatsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{Math.round(refereeStats.completion_rate * 100)}%</Text>
                    <Text style={styles.statLabel}>Completion Rate</Text>
                  </View>
                  {refereeStats.performance_score && (
                    <View style={styles.statCard}>
                      <Text style={[
                        styles.statValue,
                        refereeStats.performance_score >= 80 ? styles.statGood :
                        refereeStats.performance_score >= 60 ? styles.statOkay : styles.statPoor
                      ]}>
                        {Math.round(refereeStats.performance_score)}
                      </Text>
                      <Text style={styles.statLabel}>Performance Score</Text>
                    </View>
                  )}
                </View>

                {/* Role Breakdown */}
                <View style={styles.roleSection}>
                  <Text style={styles.subsectionTitle}>Role Breakdown</Text>
                  <View style={styles.roleBreakdown}>
                    <View style={styles.roleItem}>
                      <Text style={styles.roleCount}>{refereeStats.first_referee_count}</Text>
                      <Text style={styles.roleLabel}>First Referee (R1)</Text>
                    </View>
                    <View style={styles.roleItem}>
                      <Text style={styles.roleCount}>{refereeStats.second_referee_count}</Text>
                      <Text style={styles.roleLabel}>Second Referee (R2)</Text>
                    </View>
                    {refereeStats.challenge_referee_count > 0 && (
                      <View style={styles.roleItem}>
                        <Text style={styles.roleCount}>{refereeStats.challenge_referee_count}</Text>
                        <Text style={styles.roleLabel}>Challenge Referee (CR)</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Recent Activity */}
                {refereeStats.tournaments_worked && refereeStats.tournaments_worked.length > 0 && (
                  <View style={styles.recentSection}>
                    <Text style={styles.subsectionTitle}>Recent Tournaments</Text>
                    <View style={styles.tournamentsList}>
                      {refereeStats.tournaments_worked.slice(0, 5).map((tournament: string, index: number) => (
                        <View key={index} style={styles.tournamentItem}>
                          <Text style={styles.tournamentText}>{tournament}</Text>
                        </View>
                      ))}
                      {refereeStats.tournaments_worked.length > 5 && (
                        <Text style={styles.moreText}>
                          +{refereeStats.tournaments_worked.length - 5} more tournaments
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Additional Info */}
          <View style={styles.additionalInfo}>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={styles.infoValue}>{referee.status}</Text>
            </View>
            {(referee as EventReferee).theoryTest && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Theory Test:</Text>
                <Text style={styles.infoValue}>{(referee as EventReferee).theoryTest}</Text>
              </View>
            )}
            {(referee as EventReferee).strongPoints && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Strong Points:</Text>
                <Text style={styles.infoValue}>{(referee as EventReferee).strongPoints}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginRight: 16,
  },
  closeIcon: {
    fontSize: 24,
    color: '#6B7280',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1B365D',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  profileIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 8,
  },
  profileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  refereeCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  refereeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    width: 48,
    height: 36,
    borderRadius: 6,
    marginRight: 16,
  },
  refereeInfo: {
    flex: 1,
  },
  refereeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 4,
  },
  refereeId: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  refereeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  federationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B365D',
    marginRight: 16,
  },
  typeText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  headerRight: {
    alignItems: 'center',
  },
  genderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  genderSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  genderMale: {
    color: '#3B82F6',
  },
  genderFemale: {
    color: '#EC4899',
  },
  genderMixed: {
    color: '#8B5CF6',
  },
  statsSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B365D',
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  mainStatsGrid: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statGood: {
    color: colors.success,
  },
  statOkay: {
    color: '#F59E0B',
  },
  statPoor: {
    color: '#EF4444',
  },
  roleSection: {
    marginTop: 8,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  roleBreakdown: {
    gap: 8,
  },
  roleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
  },
  roleCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  roleLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  recentSection: {
    marginTop: 20,
  },
  tournamentsList: {
    gap: 6,
  },
  tournamentItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  tournamentText: {
    fontSize: 14,
    color: '#374151',
  },
  moreText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  additionalInfo: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 40,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    textAlign: 'right',
  },
});