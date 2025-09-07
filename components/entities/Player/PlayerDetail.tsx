import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { PlayerInfo } from './PlayerCard';
import { FlagImage } from '../../FlagImage';
import { StatusBadge } from '../../Status';
import { ActionIcons } from '../../Icons/IconLibrary';
import { colors } from '../../../theme/tokens';

export interface PlayerDetailProps {
  player: PlayerInfo;
  onEditPress?: () => void;
  onContactPress?: () => void;
  onHistoryPress?: () => void;
  onTeamPress?: () => void;
  onStatsPress?: () => void;
  showActions?: boolean;
  variant?: 'default' | 'live' | 'team';
  matchHistory?: string[];
  teamStats?: {
    matchesPlayed: number;
    matchesWon: number;
    setsWon: number;
    setsLost: number;
    pointsWon: number;
    pointsLost: number;
  };
  partnerStats?: {
    name: string;
    matchesTogether: number;
    winRate: number;
  };
}

/**
 * Unified Player Detail Component
 * Provides comprehensive player information and action buttons
 */
export const PlayerDetail: React.FC<PlayerDetailProps> = ({
  player,
  onEditPress,
  onContactPress,
  onHistoryPress,
  onTeamPress,
  onStatsPress,
  showActions = true,
  variant = 'default',
  matchHistory = [],
  teamStats,
  partnerStats,
}) => {
  
  // Get player status for badge
  const getPlayerStatusForBadge = () => {
    if (player.isServing) return 'active';
    if (player.position === 'serving') return 'active';
    if (player.position === 'receiving') return 'warning';
    return 'inactive';
  };

  // Format win rate as percentage
  const formatWinRate = (winRate?: number) => {
    if (winRate === undefined) return 'N/A';
    return `${Math.round(winRate * 100)}%`;
  };

  // Get performance stats section
  const getPerformanceSection = () => {
    if (!teamStats && !player.winRate && !player.matchCount) {
      return null;
    }

    return (
      <View style={styles.performanceSection}>
        <Text style={styles.sectionTitle}>Performance Statistics</Text>
        
        {player.matchCount !== undefined && (
          <DetailRow 
            label="Total Matches" 
            value={player.matchCount.toString()} 
          />
        )}
        
        {player.winRate !== undefined && (
          <DetailRow 
            label="Win Rate" 
            value={formatWinRate(player.winRate)} 
          />
        )}
        
        {player.ranking && (
          <DetailRow 
            label="Current Ranking" 
            value={`#${player.ranking}`} 
          />
        )}
        
        {teamStats && (
          <>
            <DetailRow 
              label="Matches Played" 
              value={teamStats.matchesPlayed.toString()} 
            />
            <DetailRow 
              label="Matches Won" 
              value={`${teamStats.matchesWon} (${formatWinRate(teamStats.matchesWon / teamStats.matchesPlayed)})`} 
            />
            <DetailRow 
              label="Sets Record" 
              value={`${teamStats.setsWon}W - ${teamStats.setsLost}L`} 
            />
            <DetailRow 
              label="Points Record" 
              value={`${teamStats.pointsWon}W - ${teamStats.pointsLost}L`} 
            />
          </>
        )}
      </View>
    );
  };

  // Get team/partner section
  const getTeamSection = () => {
    if (!player.teamName && !player.partnerName && !partnerStats) {
      return null;
    }

    return (
      <View style={styles.teamSection}>
        <Text style={styles.sectionTitle}>Team Information</Text>
        
        {player.teamName && (
          <DetailRow 
            label="Team" 
            value={player.teamName} 
          />
        )}
        
        {player.partnerName && (
          <DetailRow 
            label="Current Partner" 
            value={player.partnerName} 
          />
        )}
        
        {partnerStats && (
          <>
            <DetailRow 
              label="Partnership Matches" 
              value={partnerStats.matchesTogether.toString()} 
            />
            <DetailRow 
              label="Partnership Win Rate" 
              value={formatWinRate(partnerStats.winRate)} 
            />
          </>
        )}
      </View>
    );
  };

  // Get match history section
  const getMatchHistorySection = () => {
    if (matchHistory.length === 0) return null;

    return (
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Recent Match History</Text>
        
        <View style={styles.matchHistoryList}>
          {matchHistory.slice(0, 10).map((match, index) => (
            <Text key={index} style={styles.historyItem}>
              • {match}
            </Text>
          ))}
          {matchHistory.length > 10 && (
            <Text style={styles.moreMatches}>
              +{matchHistory.length - 10} more matches...
            </Text>
          )}
        </View>
      </View>
    );
  };

  // Get current match info (for live variant)
  const getCurrentMatchSection = () => {
    if (variant !== 'live' || (!player.currentPoints && !player.isServing)) {
      return null;
    }

    return (
      <View style={styles.currentMatchSection}>
        <Text style={styles.sectionTitle}>Current Match Status</Text>
        
        {player.currentPoints !== undefined && (
          <DetailRow 
            label="Current Points" 
            value={player.currentPoints.toString()} 
          />
        )}
        
        <DetailRow 
          label="Serving Status" 
          value={player.isServing ? 'Currently Serving' : 'Receiving'} 
        />
        
        {player.position && (
          <DetailRow 
            label="Position" 
            value={player.position.charAt(0).toUpperCase() + player.position.slice(1)} 
          />
        )}
      </View>
    );
  };

  // Get action buttons
  const getActionButtons = () => {
    if (!showActions) return [];

    const buttons = [];

    if (onStatsPress) {
      buttons.push({
        label: 'View Full Statistics',
        icon: ActionIcons.Stats,
        onPress: onStatsPress,
        primary: true,
      });
    }

    if (onTeamPress && player.teamName) {
      buttons.push({
        label: 'View Team Details',
        icon: ActionIcons.Team,
        onPress: onTeamPress,
        primary: false,
      });
    }

    if (onHistoryPress) {
      buttons.push({
        label: 'Match History',
        icon: ActionIcons.History,
        onPress: onHistoryPress,
        primary: false,
      });
    }

    if (onEditPress) {
      buttons.push({
        label: 'Edit Player Info',
        icon: ActionIcons.Edit,
        onPress: onEditPress,
        primary: false,
      });
    }

    if (onContactPress) {
      buttons.push({
        label: 'Contact Information',
        icon: ActionIcons.Contact,
        onPress: onContactPress,
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
        <View style={styles.playerHeaderInfo}>
          <View style={styles.basicHeaderInfo}>
            {player.countryCode && (
              <FlagImage 
                countryCode={player.countryCode} 
                style={styles.headerFlag} 
              />
            )}
            <View style={styles.headerTextContainer}>
              <Text style={styles.playerName}>
                {player.name}
              </Text>
              {player.playerNumber && (
                <Text style={styles.playerNumber}>
                  Player #{player.playerNumber}
                </Text>
              )}
              {player.countryCode && (
                <Text style={styles.countryName}>
                  {player.countryCode}
                </Text>
              )}
            </View>
          </View>
          
          {player.isServing && (
            <View style={styles.servingBadge}>
              <ActionIcons.Serve style={styles.servingIcon} />
              <Text style={styles.servingText}>Serving</Text>
            </View>
          )}
        </View>
        
        <StatusBadge
          status={getPlayerStatusForBadge() as any}
          size="medium"
          variant="solid"
          style={styles.statusBadge}
        />
      </View>

      {/* Basic Information */}
      <View style={styles.basicSection}>
        <Text style={styles.sectionTitle}>Player Information</Text>
        
        <DetailRow 
          label="Full Name" 
          value={player.name} 
        />
        
        {player.playerNumber && (
          <DetailRow 
            label="Player Number" 
            value={`#${player.playerNumber}`} 
          />
        )}
        
        {player.countryCode && (
          <DetailRow 
            label="Country" 
            value={player.countryCode} 
          />
        )}
        
        {player.ranking && (
          <DetailRow 
            label="World Ranking" 
            value={`#${player.ranking}`} 
          />
        )}
      </View>

      {/* Current Match Section */}
      {getCurrentMatchSection()}

      {/* Team Section */}
      {getTeamSection()}

      {/* Performance Section */}
      {getPerformanceSection()}

      {/* Match History Section */}
      {getMatchHistorySection()}

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
  playerHeaderInfo: {
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
  playerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 4,
  },
  playerNumber: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  countryName: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  servingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  servingIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 6,
  },
  servingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
  currentMatchSection: {
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
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  teamSection: {
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
  performanceSection: {
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
  historySection: {
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
    color: '#6B7280',
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
  matchHistoryList: {
    marginTop: 8,
  },
  historyItem: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    paddingLeft: 8,
    lineHeight: 18,
  },
  moreMatches: {
    fontSize: 14,
    color: colors.accent,
    fontStyle: 'italic',
    marginTop: 8,
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
    color: '#6B7280',
    marginRight: 12,
  },
  actionIconPrimary: {
    color: '#FFFFFF',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    flex: 1,
  },
  actionButtonTextPrimary: {
    color: '#FFFFFF',
  },
});