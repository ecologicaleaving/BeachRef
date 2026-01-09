import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { EventReferee, RefereeOfficial, getOfficialDisplayName, getOfficialFullDisplayName, isActiveOfficial } from '../../../types/referee-v2';
import { FlagImage } from '../../FlagImage';
import { StatusBadge } from '../../Status';
import { ActionIcons } from '../../Icons/IconLibrary';
import { colors, designTokens } from '../../../theme/tokens';

export interface RefereeDetailProps {
  referee: EventReferee | RefereeOfficial;
  onEditPress?: () => void;
  onAssignPress?: () => void;
  onContactPress?: () => void;
  onHistoryPress?: () => void;
  showActions?: boolean;
  variant?: 'default' | 'assignment';
  assignmentCount?: number;
  recentAssignments?: string[];
}

/**
 * Unified Referee Detail Component
 * Provides comprehensive referee information and action buttons
 */
export const RefereeDetail: React.FC<RefereeDetailProps> = ({
  referee,
  onEditPress,
  onAssignPress,
  onContactPress,
  onHistoryPress,
  showActions = true,
  assignmentCount = 0,
  recentAssignments = [],
}) => {
  
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

  // Get full role display text
  const getRoleDisplayText = () => {
    // Check if it's RefereeOfficial (has role field) or EventReferee
    const role = (referee as RefereeOfficial).role || referee.type;
    
    switch (role) {
      case 'Referee1':
        return 'First Referee (R1)';
      case 'Referee2':
        return 'Second Referee (R2)';
      case 'ChallengeReferee':
        return 'Challenge Referee (CR)';
      case 'TechnicalOfficial':
        return 'Technical Official (TO)';
      case 'TournamentDirector':
        return 'Tournament Director (TD)';
      case 'MatchCommissioner':
        return 'Match Commissioner (MC)';
      case 'Referee':
        return 'Referee';
      case 'Technical':
        return 'Technical Official';
      case 'Administrative':
        return 'Administrative Official';
      default:
        return role;
    }
  };

  // Get gender display text
  const getGenderDisplayText = () => {
    switch (referee.gender) {
      case 'M': return 'Male';
      case 'W': return 'Female';
      default: return 'Not specified';
    }
  };

  // Get status color
  const getStatusColor = () => {
    switch (referee.status) {
      case 'Active': return colors.success;
      case 'Inactive': return designTokens.neutrals.textSecondary;
      case 'Suspended': return colors.error;
      case 'Restricted': return colors.warning;
      default: return designTokens.neutrals.textSecondary;
    }
  };

  // Get experience/skills section for EventReferee
  const getExperienceSection = () => {
    const eventReferee = referee as EventReferee;
    if (!eventReferee.theoryTest && !eventReferee.strongPoints && !eventReferee.weakPoints) {
      return null;
    }

    return (
      <View style={styles.experienceSection}>
        <Text style={styles.sectionTitle}>Skills & Experience</Text>
        
        {eventReferee.theoryTest && (
          <DetailRow 
            label="Theory Test" 
            value={eventReferee.theoryTest} 
          />
        )}
        
        {eventReferee.strongPoints && (
          <DetailRow 
            label="Strong Points" 
            value={eventReferee.strongPoints}
            multiline 
          />
        )}
        
        {eventReferee.weakPoints && (
          <DetailRow 
            label="Areas for Improvement" 
            value={eventReferee.weakPoints}
            multiline 
          />
        )}
      </View>
    );
  };

  // Get assignments section
  const getAssignmentsSection = () => {
    if (assignmentCount === 0 && recentAssignments.length === 0) {
      return null;
    }

    return (
      <View style={styles.assignmentsSection}>
        <Text style={styles.sectionTitle}>Assignments</Text>
        
        <DetailRow 
          label="Total Assignments" 
          value={assignmentCount.toString()} 
        />
        
        {recentAssignments.length > 0 && (
          <View style={styles.recentAssignments}>
            <Text style={styles.subsectionTitle}>Recent Assignments</Text>
            {recentAssignments.slice(0, 5).map((assignment, index) => (
              <Text key={index} style={styles.assignmentItem}>
                • {assignment}
              </Text>
            ))}
            {recentAssignments.length > 5 && (
              <Text style={styles.moreAssignments}>
                +{recentAssignments.length - 5} more...
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  // Get action buttons based on referee status and variant
  const getActionButtons = () => {
    if (!showActions) return [];

    const buttons = [];

    if (isActiveOfficial(referee)) {
      if (onAssignPress) {
        buttons.push({
          label: 'Assign to Match',
          icon: ActionIcons.Assignment,
          onPress: onAssignPress,
          primary: true,
        });
      }
    }

    if (onEditPress) {
      buttons.push({
        label: 'Edit Details',
        icon: ActionIcons.Edit,
        onPress: onEditPress,
        primary: false,
      });
    }

    if (onContactPress) {
      buttons.push({
        label: 'Contact Info',
        icon: ActionIcons.Contact,
        onPress: onContactPress,
        primary: false,
      });
    }

    if (onHistoryPress) {
      buttons.push({
        label: 'Assignment History',
        icon: ActionIcons.History,
        onPress: onHistoryPress,
        primary: false,
      });
    }

    return buttons;
  };

  const actionButtons = getActionButtons();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.refereeHeaderInfo}>
          <View style={styles.basicHeaderInfo}>
            <FlagImage 
              countryCode={referee.federationCode} 
              style={styles.headerFlag} 
            />
            <View style={styles.headerTextContainer}>
              <Text style={styles.refereeName}>
                {getOfficialDisplayName(referee)}
              </Text>
              <Text style={styles.refereeId}>
                {'RefereeId' in referee ? `ID: ${referee.RefereeId}` : `ID: ${referee.noOfficial}`}
              </Text>
              <Text style={styles.federationCode}>
                {referee.federationCode} Federation
              </Text>
            </View>
          </View>
        </View>
        
        <StatusBadge
          status={statusForBadge as any}
          size="medium"
          variant="solid"
          style={styles.statusBadge}
        />
      </View>

      {/* Basic Information */}
      <View style={styles.basicSection}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
        <DetailRow 
          label="Full Name" 
          value={getOfficialFullDisplayName(referee)} 
        />
        <DetailRow 
          label="Gender" 
          value={getGenderDisplayText()} 
        />
        <DetailRow 
          label="Role/Type" 
          value={getRoleDisplayText()} 
        />
        <DetailRow 
          label="Status" 
          value={
            <Text style={[styles.statusValue, { color: getStatusColor() }]}>
              {referee.status}
            </Text>
          }
        />
        <DetailRow 
          label="Federation" 
          value={referee.federationCode} 
        />
      </View>

      {/* Experience Section */}
      {getExperienceSection()}

      {/* Assignments Section */}
      {getAssignmentsSection()}

      {/* Action Buttons */}
      {actionButtons.length > 0 && (
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Actions</Text>
          {actionButtons.map((button, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.actionButton,
                button.primary && styles.actionButtonPrimary
              ]}
              onPress={button.onPress}
              activeOpacity={0.7}
            >
              <button.icon style={[
                styles.actionIcon,
                button.primary && styles.actionIconPrimary
              ]} />
              <Text style={[
                styles.actionButtonText,
                button.primary && styles.actionButtonTextPrimary
              ]}>
                {button.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

interface DetailRowProps {
  label: string;
  value: string | React.ReactNode;
  multiline?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, multiline = false }) => (
  <View style={[styles.detailRow, multiline && styles.detailRowMultiline]}>
    <Text style={styles.detailLabel}>{label}</Text>
    {typeof value === 'string' ? (
      <Text style={[styles.detailValue, multiline && styles.detailValueMultiline]}>
        {value}
      </Text>
    ) : (
      <View style={[styles.detailValue, multiline && styles.detailValueMultiline]}>
        {value}
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 12,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  refereeHeaderInfo: {
    flex: 1,
  },
  basicHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerFlag: {
    width: 48,
    height: 36,
    borderRadius: 6,
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  refereeName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 4,
  },
  refereeId: {
    fontSize: 16,
    color: designTokens.neutrals.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  federationCode: {
    fontSize: 14,
    color: designTokens.neutrals.textSecondary,
    fontWeight: '500',
  },
  statusBadge: {
    marginLeft: 16,
  },
  basicSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  experienceSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  assignmentsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B365D',
    marginBottom: 8,
    marginTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailRowMultiline: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 16,
    color: designTokens.neutrals.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: '#1B365D',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  detailValueMultiline: {
    textAlign: 'left',
    marginTop: 8,
    lineHeight: 20,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  recentAssignments: {
    marginTop: 12,
  },
  assignmentItem: {
    fontSize: 14,
    color: designTokens.neutrals.textSecondary,
    marginBottom: 4,
    paddingLeft: 8,
  },
  moreAssignments: {
    fontSize: 14,
    color: colors.accent,
    fontStyle: 'italic',
    marginTop: 4,
    paddingLeft: 8,
  },
  actionsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionButtonPrimary: {
    backgroundColor: colors.accent,
  },
  actionIcon: {
    fontSize: 20,
    color: designTokens.neutrals.textSecondary,
    marginRight: 12,
  },
  actionIconPrimary: {
    color: '#FFFFFF',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.neutrals.textSecondary,
    flex: 1,
  },
  actionButtonTextPrimary: {
    color: '#FFFFFF',
  },
});