import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { BeachMatchCore } from '../../../types/match-v2';
import { FlagImage } from '../../FlagImage';
import { StatusBadge } from '../../Status';
import { RoundPhaseDisplay } from '../../Typography/RoundPhaseDisplay';
import { ActionIcons } from '../../Icons/IconLibrary';
import { determineMatchStatus } from '../../../utils/statusColors';
import { colors, designTokens } from '../../../theme/tokens';

export interface MatchDetailProps {
  match: BeachMatchCore;
  onEditPress?: () => void;
  onResultPress?: () => void;
  onRefereePress?: () => void;
  onLiveScorePress?: () => void;
  showActions?: boolean;
  variant?: 'default' | 'referee';
}

/**
 * Unified Match Detail Component
 * Provides comprehensive match information and action buttons
 */
export const MatchDetail: React.FC<MatchDetailProps> = ({
  match,
  onEditPress,
  onResultPress,
  onRefereePress,
  onLiveScorePress,
  showActions = true,
  variant = 'default',
}) => {
  
  // Determine match status
  const matchStatus = determineMatchStatus(match);
  const statusForBadge = (() => {
    switch (matchStatus) {
      case 'current': return 'current';
      case 'completed': return 'completed';
      case 'upcoming': return 'upcoming';
      default: return 'upcoming';
    }
  })();

  // Format time display
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return 'TBD';
    try {
      const timeParts = timeStr.split(':');
      if (timeParts.length >= 2) {
        return `${timeParts[0]}:${timeParts[1]}`;
      }
      return timeStr;
    } catch {
      return timeStr || 'TBD';
    }
  };

  // Format date display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'TBD';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  // Get match duration
  const getMatchDuration = (): string | null => {
    const totalDurationSeconds = (match as any).Duration;
    if (totalDurationSeconds) {
      const totalMinutes = Math.floor(parseInt(totalDurationSeconds) / 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    }

    if (match.result?.duration && typeof match.result.duration === 'number') {
      const totalMinutes = match.result.duration;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    }

    return null;
  };

  // Get set scores display
  const getSetScores = () => {
    if (!match.result?.sets || match.result.sets.length === 0) return null;
    
    return match.result.sets.map((set, index) => (
      <View key={index} style={styles.setScore}>
        <Text style={styles.setLabel}>Set {index + 1}</Text>
        <View style={styles.setScoreContainer}>
          <Text style={[
            styles.setScoreText,
            set.teamA > set.teamB && styles.setScoreWinner
          ]}>
            {set.teamA}
          </Text>
          <Text style={styles.setScoreSeparator}>-</Text>
          <Text style={[
            styles.setScoreText,
            set.teamB > set.teamA && styles.setScoreWinner
          ]}>
            {set.teamB}
          </Text>
        </View>
      </View>
    ));
  };

  // Get action buttons based on match status and variant
  const getActionButtons = () => {
    if (!showActions) return [];

    const buttons = [];

    if (matchStatus === 'current') {
      if (onLiveScorePress) {
        buttons.push({
          label: 'Live Score',
          icon: ActionIcons.LiveScore,
          onPress: onLiveScorePress,
          primary: true,
        });
      }
    }

    if (matchStatus === 'upcoming' && variant === 'referee') {
      if (onEditPress) {
        buttons.push({
          label: 'Edit Match',
          icon: ActionIcons.Edit,
          onPress: onEditPress,
          primary: false,
        });
      }
    }

    if (matchStatus === 'completed') {
      if (onResultPress) {
        buttons.push({
          label: 'View Results',
          icon: ActionIcons.Results,
          onPress: onResultPress,
          primary: true,
        });
      }
    }

    if (onRefereePress && (matchStatus === 'upcoming' || matchStatus === 'current')) {
      buttons.push({
        label: 'Referee Info',
        icon: ActionIcons.Referee,
        onPress: onRefereePress,
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
        <View style={styles.matchHeaderInfo}>
          <Text style={styles.matchNumber}>
            Match #{match.matchNumber || match.id}
          </Text>
          <Text style={styles.courtInfo}>
            Court {match.court?.name || match.court?.number || 'TBD'}
          </Text>
        </View>
        
        <StatusBadge
          status={statusForBadge}
          size="medium"
          variant="solid"
          style={styles.statusBadge}
        />
      </View>

      {/* Teams Section */}
      <View style={styles.teamsSection}>
        <Text style={styles.sectionTitle}>Teams</Text>
        
        <View style={styles.teamContainer}>
          <View style={styles.teamInfo}>
            <FlagImage 
              countryCode={match.teams?.teamA?.federationCode || ''} 
              style={styles.teamFlag} 
            />
            <View style={styles.teamDetails}>
              <Text style={styles.teamName}>
                {match.teams?.teamA?.name || 'Team A'}
              </Text>
              <Text style={styles.teamPlayers}>
                {match.teams?.teamA?.players?.map(p => p.name).join(' / ') || 'Players TBD'}
              </Text>
            </View>
          </View>
          
          <View style={styles.matchScore}>
            <Text style={[
              styles.matchScoreText,
              (match.teams?.teamA?.matchPoints || 0) > (match.teams?.teamB?.matchPoints || 0) && styles.matchScoreWinner
            ]}>
              {match.teams?.teamA?.matchPoints || 0}
            </Text>
          </View>
        </View>

        <View style={styles.teamContainer}>
          <View style={styles.teamInfo}>
            <FlagImage 
              countryCode={match.teams?.teamB?.federationCode || ''} 
              style={styles.teamFlag} 
            />
            <View style={styles.teamDetails}>
              <Text style={styles.teamName}>
                {match.teams?.teamB?.name || 'Team B'}
              </Text>
              <Text style={styles.teamPlayers}>
                {match.teams?.teamB?.players?.map(p => p.name).join(' / ') || 'Players TBD'}
              </Text>
            </View>
          </View>
          
          <View style={styles.matchScore}>
            <Text style={[
              styles.matchScoreText,
              (match.teams?.teamB?.matchPoints || 0) > (match.teams?.teamA?.matchPoints || 0) && styles.matchScoreWinner
            ]}>
              {match.teams?.teamB?.matchPoints || 0}
            </Text>
          </View>
        </View>

        {/* Set Scores */}
        {getSetScores() && (
          <View style={styles.setScoresContainer}>
            <Text style={styles.setScoresTitle}>Set Scores</Text>
            <View style={styles.setScoresList}>
              {getSetScores()}
            </View>
          </View>
        )}
      </View>

      {/* Match Details */}
      <View style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Match Details</Text>
        
        <DetailRow 
          label="Date" 
          value={formatDate(match.scheduledTime?.date)} 
        />
        <DetailRow 
          label="Time" 
          value={formatTime(match.scheduledTime?.time)} 
        />
        <DetailRow 
          label="Round/Phase" 
          value={
            <RoundPhaseDisplay 
              round={match.round}
              phase={match.phase}
              style={styles.roundPhaseDetail}
            />
          }
        />
        {getMatchDuration() && (
          <DetailRow 
            label="Duration" 
            value={getMatchDuration()!} 
          />
        )}
        {match.officials?.referee1 && (
          <DetailRow 
            label="Referee 1" 
            value={match.officials.referee1.name || `#${match.officials.referee1.number}`} 
          />
        )}
        {match.officials?.referee2 && (
          <DetailRow 
            label="Referee 2" 
            value={match.officials.referee2.name || `#${match.officials.referee2.number}`} 
          />
        )}
      </View>

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
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    {typeof value === 'string' ? (
      <Text style={styles.detailValue}>{value}</Text>
    ) : (
      <View style={styles.detailValue}>{value}</View>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.neutrals.bgSurface,
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
  matchHeaderInfo: {
    flex: 1,
  },
  matchNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 4,
  },
  courtInfo: {
    fontSize: 16,
    color: designTokens.neutrals.textSecondary,
    fontWeight: '500',
  },
  statusBadge: {
    marginLeft: 16,
  },
  teamsSection: {
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
  teamContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.neutrals.borderSubtle,
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamFlag: {
    width: 40,
    height: 30,
    borderRadius: 6,
    marginRight: 16,
  },
  teamDetails: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 4,
  },
  teamPlayers: {
    fontSize: 14,
    color: designTokens.neutrals.textSecondary,
    fontWeight: '500',
  },
  matchScore: {
    minWidth: 48,
    alignItems: 'center',
  },
  matchScoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: designTokens.neutrals.textSecondary,
  },
  matchScoreWinner: {
    color: colors.success,
  },
  setScoresContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: designTokens.neutrals.borderSubtle,
  },
  setScoresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 12,
  },
  setScoresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  setScore: {
    alignItems: 'center',
  },
  setLabel: {
    fontSize: 12,
    color: designTokens.neutrals.textSecondary,
    marginBottom: 4,
  },
  setScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  setScoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: designTokens.neutrals.textSecondary,
    minWidth: 24,
    textAlign: 'center',
  },
  setScoreWinner: {
    color: colors.success,
  },
  setScoreSeparator: {
    fontSize: 14,
    color: designTokens.neutrals.textSecondary,
    marginHorizontal: 4,
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.neutrals.borderSubtle,
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
  roundPhaseDetail: {
    alignSelf: 'flex-end',
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