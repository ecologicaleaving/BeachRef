import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { BeachLivePlayer } from '../../../types/beach-live';
import { FlagImage } from '../../FlagImage';
import { StatusBadge } from '../../Status';
import { ActionIcons } from '../../Icons/IconLibrary';
import { colors } from '../../../theme/tokens';

// Extended player interface that combines live player data with team context
export interface PlayerInfo extends Partial<BeachLivePlayer> {
  readonly id?: string;
  readonly name: string;
  readonly playerNumber?: number;
  readonly countryCode?: string;
  readonly teamName?: string;
  readonly ranking?: number;
  readonly isServing?: boolean;
  readonly position?: 'left' | 'right' | 'serving' | 'receiving';
  readonly matchCount?: number;
  readonly winRate?: number;
  readonly currentPoints?: number;
  readonly partnerName?: string;
}

export interface PlayerCardProps {
  player: PlayerInfo;
  onPress?: (player: PlayerInfo) => void;
  showCountry?: boolean;
  showTeamInfo?: boolean;
  showStats?: boolean;
  showStatus?: boolean;
  compact?: boolean;
  variant?: 'default' | 'live' | 'team' | 'ranking';
  isHighlighted?: boolean;
}

/**
 * Unified Player Card Component
 * Displays player information with various display options and variants
 */
export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  onPress,
  showCountry = true,
  showTeamInfo = false,
  showStats = false,
  showStatus = false,
  compact = false,
  variant = 'default',
  isHighlighted = false,
}) => {
  
  // Format player name (shorten if needed)
  const getDisplayName = () => {
    if (compact) {
      // For compact mode, show last name only or first initial + last name
      const nameParts = player.name.split(' ');
      if (nameParts.length > 1) {
        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];
        return `${firstName.charAt(0)}. ${lastName}`;
      }
    }
    return player.name;
  };

  // Get player status display
  const getPlayerStatus = () => {
    if (!showStatus) return null;
    
    let statusText = '';
    let statusColor = '#6B7280';
    
    if (player.isServing) {
      statusText = 'Serving';
      statusColor = colors.success;
    } else if (player.position) {
      statusText = player.position.charAt(0).toUpperCase() + player.position.slice(1);
      statusColor = colors.accent;
    }
    
    if (!statusText) return null;
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
        <Text style={styles.statusText}>{statusText}</Text>
      </View>
    );
  };

  // Get player ranking display
  const getRankingDisplay = () => {
    if (!player.ranking) return null;
    
    return (
      <View style={styles.rankingBadge}>
        <Text style={styles.rankingText}>#{player.ranking}</Text>
      </View>
    );
  };

  // Get stats display
  const getStatsDisplay = () => {
    if (!showStats || (!player.matchCount && !player.winRate && !player.currentPoints)) {
      return null;
    }
    
    return (
      <View style={styles.statsContainer}>
        {player.matchCount !== undefined && (
          <Text style={styles.statText}>
            {player.matchCount} matches
          </Text>
        )}
        {player.winRate !== undefined && (
          <Text style={styles.statText}>
            {Math.round(player.winRate * 100)}% win
          </Text>
        )}
        {player.currentPoints !== undefined && (
          <Text style={styles.statText}>
            {player.currentPoints} pts
          </Text>
        )}
      </View>
    );
  };

  // Get team info display
  const getTeamInfoDisplay = () => {
    if (!showTeamInfo || (!player.teamName && !player.partnerName)) {
      return null;
    }
    
    return (
      <View style={styles.teamInfoContainer}>
        {player.teamName && (
          <Text style={styles.teamNameText} numberOfLines={1}>
            {player.teamName}
          </Text>
        )}
        {player.partnerName && (
          <Text style={styles.partnerText} numberOfLines={1}>
            w/ {player.partnerName}
          </Text>
        )}
      </View>
    );
  };

  // Get serving indicator
  const getServingIndicator = () => {
    if (!player.isServing) return null;
    
    return (
      <View style={styles.servingIndicator}>
        <ActionIcons.Serve style={styles.servingIcon} />
      </View>
    );
  };

  return (
    <TouchableOpacity 
      style={[
        styles.card,
        compact && styles.cardCompact,
        variant === 'live' && styles.cardLive,
        variant === 'team' && styles.cardTeam,
        variant === 'ranking' && styles.cardRanking,
        isHighlighted && styles.cardHighlighted,
        player.isServing && styles.cardServing,
      ]} 
      onPress={() => onPress?.(player)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.playerInfo}>
          <View style={styles.nameSection}>
            {showCountry && player.countryCode && (
              <FlagImage 
                countryCode={player.countryCode} 
                style={[styles.flag, compact && styles.flagCompact]} 
              />
            )}
            <View style={styles.nameContainer}>
              <Text style={[styles.playerName, compact && styles.playerNameCompact]}>
                {getDisplayName()}
              </Text>
              {player.playerNumber && (
                <Text style={[styles.playerNumber, compact && styles.playerNumberCompact]}>
                  #{player.playerNumber}
                </Text>
              )}
            </View>
          </View>
          
          {!compact && getTeamInfoDisplay()}
        </View>
        
        <View style={styles.headerRight}>
          {getServingIndicator()}
          {getRankingDisplay()}
          {getPlayerStatus()}
        </View>
      </View>

      {!compact && (
        <View style={styles.cardBody}>
          <View style={styles.detailsRow}>
            {player.countryCode && (
              <Text style={styles.countryText}>
                {player.countryCode}
              </Text>
            )}
            {variant === 'live' && player.currentPoints !== undefined && (
              <Text style={styles.pointsText}>
                {player.currentPoints} points
              </Text>
            )}
          </View>
          
          {getStatsDisplay()}
        </View>
      )}
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
  cardLive: {
    borderColor: colors.success,
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  cardTeam: {
    borderColor: colors.accent,
    borderWidth: 1,
  },
  cardRanking: {
    borderColor: colors.warning,
    borderWidth: 1,
    backgroundColor: '#FFFBEB',
  },
  cardHighlighted: {
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: '#EEF2FF',
  },
  cardServing: {
    borderLeftColor: colors.success,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerInfo: {
    flex: 1,
  },
  nameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  flag: {
    width: 24,
    height: 18,
    borderRadius: 3,
    marginRight: 8,
  },
  flagCompact: {
    width: 20,
    height: 15,
    marginRight: 6,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B365D',
    marginRight: 8,
  },
  playerNameCompact: {
    fontSize: 14,
  },
  playerNumber: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  playerNumberCompact: {
    fontSize: 12,
  },
  teamInfoContainer: {
    marginTop: 4,
  },
  teamNameText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  partnerText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servingIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  servingIcon: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  rankingBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  rankingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cardBody: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  countryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B365D',
  },
  pointsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: '500',
  },
});