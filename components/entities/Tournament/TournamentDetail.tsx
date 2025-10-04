import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { TournamentCore } from '../../../types/tournament-v2';
import { FlagImage } from '../../FlagImage';
import { StatusBadge } from '../../Status';
import { ActionIcons } from '../../Icons/IconLibrary';
import { getStatusColorWithText } from '../../../utils/statusColors';
import { DefaultTournamentService } from '../../../services/DefaultTournamentService';
import { colors, designTokens } from '../../../theme/tokens';

export interface TournamentDetailProps {
  tournament: TournamentCore;
  onMatchesPress?: () => void;
  onRefereesPress?: () => void;
  onAssignmentsPress?: () => void;
  showActions?: boolean;
}

/**
 * Unified Tournament Detail Component
 * Provides comprehensive tournament information and action buttons
 */
export const TournamentDetail: React.FC<TournamentDetailProps> = ({
  tournament,
  onMatchesPress,
  onRefereesPress,
  onAssignmentsPress,
  showActions = true,
}) => {
  
  // Format date display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'TBD';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  // Get tournament status and colors
  const tournamentStatus = DefaultTournamentService.getTournamentStatus(
    tournament.dates?.startDate, 
    tournament.dates?.endDate
  );
  const statusInfo = getStatusColorWithText(tournamentStatus);

  const actionButtons = [
    {
      label: 'View Matches',
      icon: ActionIcons.Tournament,
      onPress: onMatchesPress,
      disabled: !onMatchesPress,
    },
    {
      label: 'View Referees',
      icon: ActionIcons.Referee,
      onPress: onRefereesPress,
      disabled: !onRefereesPress,
    },
    {
      label: 'Assignments',
      icon: ActionIcons.Assignment,
      onPress: onAssignmentsPress,
      disabled: !onAssignmentsPress,
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.countryInfo}>
          <FlagImage 
            countryCode={tournament.countryCode || ''} 
            style={styles.flag} 
          />
          <View style={styles.locationInfo}>
            <Text style={styles.cityName}>
              {tournament.city || 'City TBD'}
            </Text>
            <Text style={styles.countryName}>
              {tournament.countryName || tournament.countryCode || 'Country TBD'}
            </Text>
          </View>
        </View>
        
        <StatusBadge
          text={statusInfo.text}
          backgroundColor={statusInfo.backgroundColor}
          textColor={statusInfo.textColor}
          style={styles.statusBadge}
        />
      </View>

      {/* Tournament Name */}
      <Text style={styles.tournamentName}>
        {tournament.name || `Tournament ${tournament.visNo}`}
      </Text>

      {/* Details Section */}
      <View style={styles.detailsSection}>
        <DetailRow 
          label="Tournament ID" 
          value={tournament.visNo || 'N/A'} 
        />
        <DetailRow 
          label="Start Date" 
          value={formatDate(tournament.dates?.startDate)} 
        />
        <DetailRow 
          label="End Date" 
          value={formatDate(tournament.dates?.endDate)} 
        />
        <DetailRow 
          label="Status" 
          value={statusInfo.text}
          valueColor={statusInfo.textColor}
        />
        {tournament.category && (
          <DetailRow 
            label="Category" 
            value={tournament.category} 
          />
        )}
        {tournament.eventType && (
          <DetailRow 
            label="Event Type" 
            value={tournament.eventType} 
          />
        )}
      </View>

      {/* Action Buttons */}
      {showActions && (
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Actions</Text>
          {actionButtons.map((button, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.actionButton,
                button.disabled && styles.actionButtonDisabled
              ]}
              onPress={button.onPress}
              disabled={button.disabled}
              activeOpacity={0.7}
            >
              <button.icon style={styles.actionIcon} />
              <Text style={[
                styles.actionButtonText,
                button.disabled && styles.actionButtonTextDisabled
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
  value: string;
  valueColor?: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, valueColor }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[
      styles.detailValue,
      valueColor && { color: valueColor }
    ]}>
      {value}
    </Text>
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
    alignItems: 'flex-start',
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
  countryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    width: 48,
    height: 36,
    borderRadius: 6,
    marginRight: 16,
  },
  locationInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 4,
  },
  countryName: {
    fontSize: 16,
    color: designTokens.neutrals.textSecondary,
    fontWeight: '500',
  },
  statusBadge: {
    marginLeft: 16,
  },
  tournamentName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B365D',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    lineHeight: 32,
  },
  detailsSection: {
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  actionIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    marginRight: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  actionButtonTextDisabled: {
    color: designTokens.neutrals.textSecondary,
  },
});