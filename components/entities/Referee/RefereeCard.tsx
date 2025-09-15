import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { EventReferee, RefereeOfficial, getOfficialDisplayName, isActiveOfficial } from '../../../types/referee-v2';
import { FlagImage } from '../../FlagImage';
import { StatusBadge } from '../../Status';
import { ActionIcons } from '../../Icons/IconLibrary';
import { colors } from '../../../theme/tokens';
import { useRefereeAnalytics } from '../../../hooks/useRefereeAnalytics';

export interface RefereeCardProps {
  referee: EventReferee | RefereeOfficial;
  onPress?: (referee: EventReferee | RefereeOfficial) => void;
  showStatusBadge?: boolean;
  showRole?: boolean;
  showAssignments?: boolean;
  showStatistics?: boolean;
  compact?: boolean;
  variant?: 'default' | 'assignment' | 'selection' | 'analytics';
  assignmentCount?: number;
}

/**
 * Unified Referee Card Component
 * Displays referee information with various display options and variants
 */
export const RefereeCard: React.FC<RefereeCardProps> = ({
  referee,
  onPress,
  showStatusBadge = true,
  showRole = false,
  showAssignments = false,
  showStatistics = false,
  compact = false,
  variant = 'default',
  assignmentCount = 0,
}) => {
  const router = useRouter();

  // Handle referee card press to navigate to profile
  const handleRefereePress = () => {
    // If custom onPress is provided, use it
    if (onPress) {
      onPress(referee);
      return;
    }

    // Otherwise, navigate to referee profile
    router.push({
      pathname: '/referee-profile',
      params: {
        refereeData: JSON.stringify(referee)
      }
    });
  };
  
  // Get referee analytics data if statistics should be shown
  const { data: analyticsData, isLoading: analyticsLoading } = useRefereeAnalytics(
    showStatistics ? { refereeIds: [referee.id] } : undefined, 
    { 
      enabled: showStatistics,
      cacheStrategy: 'historical',
      enablePerformanceMonitoring: true 
    }
  );

  
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

  // Get role display text
  const getRoleDisplay = () => {
    if (!showRole) return null;
    
    // Check if it's RefereeOfficial (has role field) or EventReferee
    const role = (referee as RefereeOfficial).role || referee.type;
    let roleText = role;
    
    // Simplify role text for display
    switch (role) {
      case 'Referee1':
        roleText = 'R1';
        break;
      case 'Referee2':
        roleText = 'R2';
        break;
      case 'ChallengeReferee':
        roleText = 'CR';
        break;
      case 'TechnicalOfficial':
        roleText = 'TO';
        break;
      case 'TournamentDirector':
        roleText = 'TD';
        break;
      case 'MatchCommissioner':
        roleText = 'MC';
        break;
      default:
        roleText = role;
    }
    
    return (
      <View style={styles.roleBadge}>
        <Text style={styles.roleText}>{roleText}</Text>
      </View>
    );
  };

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

  // Get referee experience/skills display
  const getExperienceDisplay = () => {
    const eventReferee = referee as EventReferee;
    if (!eventReferee.theoryTest && !eventReferee.strongPoints) return null;
    
    return (
      <View style={styles.experienceContainer}>
        {eventReferee.theoryTest && (
          <Text style={styles.experienceText}>
            Theory: {eventReferee.theoryTest}
          </Text>
        )}
        {eventReferee.strongPoints && (
          <Text style={[styles.experienceText, styles.strongPoints]} numberOfLines={1}>
            Skills: {eventReferee.strongPoints}
          </Text>
        )}
      </View>
    );
  };

  // Get assignment count display
  const getAssignmentDisplay = () => {
    if (!showAssignments || assignmentCount === 0) return null;
    
    return (
      <View style={styles.assignmentBadge}>
        <ActionIcons.Assignment style={styles.assignmentIcon} />
        <Text style={styles.assignmentCount}>{assignmentCount}</Text>
      </View>
    );
  };

  // Get statistics display
  const getStatisticsDisplay = () => {
    if (!showStatistics) return null;
    
    if (analyticsLoading) {
      return (
        <View style={styles.statisticsContainer}>
          <Text style={styles.statisticsLoading}>Loading stats...</Text>
        </View>
      );
    }
    
    if (!analyticsData?.data || analyticsData.data.length === 0) {
      return (
        <View style={styles.statisticsContainer}>
          <Text style={styles.statisticsEmpty}>No statistics available</Text>
        </View>
      );
    }
    
    // Find the specific referee stats or use first if only one
    const refereeStats = analyticsData.data.find(stats => stats.referee_id === referee.id) || analyticsData.data[0];
    
    // Validate that the data is for the correct referee
    if (!refereeStats || (refereeStats.referee_id !== referee.id && analyticsData.data.length > 1)) {
      console.warn('RefereeCard: Analytics data mismatch for referee:', referee.id, 'Got data for:', refereeStats?.referee_id);
      return (
        <View style={styles.statisticsContainer}>
          <Text style={styles.statisticsEmpty}>Statistics unavailable</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.statisticsContainer}>
        <View style={styles.statisticsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{refereeStats.total_assignments}</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{refereeStats.tournaments_worked.length}</Text>
            <Text style={styles.statLabel}>Tournaments</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(refereeStats.completion_rate * 100)}%</Text>
            <Text style={styles.statLabel}>Complete Rate</Text>
          </View>
          {refereeStats.performance_score && (
            <View style={styles.statItem}>
              <Text style={[
                styles.statValue,
                refereeStats.performance_score >= 80 ? styles.statGood : 
                refereeStats.performance_score >= 60 ? styles.statOkay : styles.statPoor
              ]}>
                {Math.round(refereeStats.performance_score)}
              </Text>
              <Text style={styles.statLabel}>Score</Text>
            </View>
          )}
        </View>
        
        <View style={styles.roleBreakdown}>
          <View style={styles.roleItem}>
            <Text style={styles.roleCount}>{refereeStats.first_referee_count}</Text>
            <Text style={styles.roleLabel}>R1</Text>
          </View>
          <Text style={styles.roleSeparator}>|</Text>
          <View style={styles.roleItem}>
            <Text style={styles.roleCount}>{refereeStats.second_referee_count}</Text>
            <Text style={styles.roleLabel}>R2</Text>
          </View>
          {refereeStats.challenge_referee_count > 0 && (
            <>
              <Text style={styles.roleSeparator}>|</Text>
              <View style={styles.roleItem}>
                <Text style={styles.roleCount}>{refereeStats.challenge_referee_count}</Text>
                <Text style={styles.roleLabel}>CR</Text>
              </View>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <TouchableOpacity 
      style={[
        styles.card,
        compact && styles.cardCompact,
        variant === 'assignment' && styles.cardAssignment,
        variant === 'selection' && styles.cardSelection,
        variant === 'analytics' && styles.cardAnalytics,
        !isActiveOfficial(referee) && styles.cardInactive,
      ]} 
      onPress={handleRefereePress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <FlagImage 
          countryCode={referee.federationCode} 
          style={[styles.flagLeft, compact && styles.flagLeftCompact]} 
        />
        
        <View style={styles.refereeInfo}>
          <View style={styles.basicInfo}>
            <View style={styles.nameContainer}>
              <Text style={[styles.refereeName, compact && styles.refereeNameCompact]}>
                {getOfficialDisplayName(referee)}
              </Text>
              <Text style={[styles.refereeId, compact && styles.refereeIdCompact]}>
                {'RefereeId' in referee ? `#${referee.RefereeId}` : `#${referee.noOfficial}`}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          {/* Always show basic role totals */}
          {analyticsData?.data?.length > 0 && (
            <View style={styles.roleTotals}>
              <View style={styles.roleTotal}>
                <Text style={styles.roleTotalCount}>{(analyticsData.data.find(stats => stats.referee_id === referee.id) || analyticsData.data[0])?.first_referee_count || 0}</Text>
                <Text style={styles.roleTotalLabel}>R1</Text>
              </View>
              <Text style={styles.roleTotalSeparator}>•</Text>
              <View style={styles.roleTotal}>
                <Text style={styles.roleTotalCount}>{(analyticsData.data.find(stats => stats.referee_id === referee.id) || analyticsData.data[0])?.second_referee_count || 0}</Text>
                <Text style={styles.roleTotalLabel}>R2</Text>
              </View>
            </View>
          )}
          {getGenderDisplay()}
          {getRoleDisplay()}
          {showStatusBadge && (
            <StatusBadge
              status={statusForBadge as any}
              size="small"
              variant="solid"
              style={styles.statusBadge}
            />
          )}
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.detailsRow}>
          <Text style={[styles.federationText, compact && styles.federationTextCompact]}>
            {referee.federationCode}
          </Text>
          <Text style={[styles.typeText, compact && styles.typeTextCompact]}>
            {referee.type}
          </Text>
        </View>

        {!compact && getExperienceDisplay()}
        {getStatisticsDisplay()}
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <Text style={[styles.statusText, compact && styles.statusTextCompact]}>
            {referee.status}
          </Text>
        </View>
        
        <View style={styles.footerRight}>
          {getAssignmentDisplay()}
        </View>
      </View>

    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardCompact: {
    padding: 12,
    marginVertical: 4,
  },
  cardAssignment: {
    borderColor: colors.accent,
    borderWidth: 1,
  },
  cardSelection: {
    borderColor: colors.success,
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  cardInactive: {
    backgroundColor: '#F9FAFB',
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  flagLeft: {
    width: 32,
    height: 24,
    borderRadius: 4,
    marginRight: 12,
  },
  flagLeftCompact: {
    width: 24,
    height: 18,
    marginRight: 8,
  },
  refereeInfo: {
    flex: 1,
  },
  basicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    width: 32,
    height: 24,
    borderRadius: 4,
    marginRight: 12,
  },
  flagCompact: {
    width: 24,
    height: 18,
    marginRight: 8,
  },
  nameContainer: {
    flex: 1,
  },
  refereeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 2,
  },
  refereeNameCompact: {
    fontSize: 14,
  },
  refereeId: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  refereeIdCompact: {
    fontSize: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  genderSymbol: {
    fontSize: 16,
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
  roleBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statusBadge: {
    marginLeft: 8,
  },
  cardBody: {
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  federationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B365D',
  },
  federationTextCompact: {
    fontSize: 12,
  },
  typeText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  typeTextCompact: {
    fontSize: 12,
  },
  experienceContainer: {
    marginTop: 8,
  },
  experienceText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  strongPoints: {
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerLeft: {
    flex: 1,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusTextCompact: {
    fontSize: 11,
  },
  assignmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  assignmentIcon: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
  assignmentCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  
  // Analytics variant card style
  cardAnalytics: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  
  // Statistics display styles
  statisticsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statisticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
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
  roleBreakdown: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
  },
  roleItem: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  roleCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 1,
  },
  roleLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  roleSeparator: {
    fontSize: 12,
    color: '#D1D5DB',
    paddingHorizontal: 4,
  },
  statisticsLoading: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 8,
  },
  statisticsEmpty: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 4,
    fontStyle: 'italic',
  },
  
  // Role totals always visible styles
  roleTotals: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleTotal: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  roleTotalCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    lineHeight: 14,
  },
  roleTotalLabel: {
    fontSize: 8,
    color: '#9CA3AF',
    fontWeight: '500',
    lineHeight: 10,
  },
  roleTotalSeparator: {
    fontSize: 10,
    color: '#D1D5DB',
    paddingHorizontal: 2,
  },
});