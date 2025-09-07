import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { BeachMatchCore } from '../../../types/match-v2';
import { FlagImage } from '../../FlagImage';
import { StatusBadge } from '../../Status';
import { RoundPhaseDisplay } from '../../Typography/RoundPhaseDisplay';
import { determineMatchStatus, getStatusColorWithText } from '../../../utils/statusColors';
import { MatchDataTransformer } from '../../../services/MatchDataTransformer';
import { colors } from '../../../theme/tokens';

export interface MatchCardProps {
  match: BeachMatchCore;
  onPress?: (match: BeachMatchCore) => void;
  showStatusBadge?: boolean;
  showReferee?: boolean;
  showDuration?: boolean;
  compact?: boolean;
  variant?: 'default' | 'referee' | 'live';
}

/**
 * Unified Match Card Component
 * Consolidates MatchCard, LiveMatchCard, CompletedMatchCard functionality
 */
export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  onPress,
  showStatusBadge = true,
  showReferee = false,
  showDuration = false,
  compact = false,
  variant = 'default',
}) => {
  // Determine match status
  const matchStatus = determineMatchStatus(match);
  
  // Map match status to TournamentStatus for StatusBadge
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
    if (!timeStr) return '';
    try {
      // Handle different time formats (HH:MM:SS or HH:MM)
      const timeParts = timeStr.split(':');
      if (timeParts.length >= 2) {
        return `${timeParts[0]}:${timeParts[1]}`;
      }
      return timeStr;
    } catch {
      return timeStr;
    }
  };

  // Get match duration if available
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

    // Fallback to match result duration
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

  // Get gender symbol and style
  const getGenderDisplay = () => {
    const gender = (match as any).tournamentGender || match.teams?.gender;
    if (!gender) return null;
    
    let genderText = '';
    let genderStyle = styles.genderMixed;
    
    if (gender === 'M') {
      genderText = '♂';
      genderStyle = styles.genderMale;
    } else if (gender === 'W') {
      genderText = '♀';
      genderStyle = styles.genderFemale;
    } else {
      genderText = '⚭';
      genderStyle = styles.genderMixed;
    }
    
    return (
      <View style={styles.genderBadge}>
        <Text style={[styles.genderSymbol, genderStyle]}>
          {genderText}
        </Text>
      </View>
    );
  };

  // Get match score display
  const getScoreDisplay = () => {
    if (!match.teams?.teamA || !match.teams?.teamB) return null;
    
    const scoreA = match.teams.teamA.matchPoints || 0;
    const scoreB = match.teams.teamB.matchPoints || 0;
    
    if (scoreA === 0 && scoreB === 0 && matchStatus === 'upcoming') {
      return null; // Don't show 0-0 for upcoming matches
    }
    
    return (
      <View style={styles.scoreContainer}>
        <Text style={[
          styles.scoreText,
          scoreA > scoreB && styles.scoreWinner,
          compact && styles.scoreTextCompact
        ]}>
          {scoreA}
        </Text>
        <Text style={[styles.scoreSeparator, compact && styles.scoreSeparatorCompact]}>
          -
        </Text>
        <Text style={[
          styles.scoreText,
          scoreB > scoreA && styles.scoreWinner,
          compact && styles.scoreTextCompact
        ]}>
          {scoreB}
        </Text>
      </View>
    );
  };

  // Get referee display
  const getRefereeDisplay = () => {
    if (!showReferee || !match.officials?.referee1) return null;
    
    const referee = match.officials.referee1;
    return (
      <Text style={[styles.refereeText, compact && styles.refereeTextCompact]}>
        R1: {referee.name || `#${referee.number}`}
      </Text>
    );
  };

  return (
    <TouchableOpacity 
      style={[
        styles.card,
        compact && styles.cardCompact,
        variant === 'live' && styles.cardLive,
        variant === 'referee' && styles.cardReferee,
      ]} 
      onPress={() => onPress?.(match)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.matchInfo}>
          <Text style={[styles.matchNumber, compact && styles.matchNumberCompact]}>
            #{match.matchNumber || match.id}
          </Text>
          <Text style={[styles.courtInfo, compact && styles.courtInfoCompact]}>
            Court {match.court?.name || match.court?.number || 'TBD'}
          </Text>
        </View>
        
        <View style={styles.headerRight}>
          {getGenderDisplay()}
          {showStatusBadge && (
            <StatusBadge
              status={statusForBadge}
              size="small"
              variant="solid"
              style={styles.statusBadge}
            />
          )}
        </View>
      </View>

      <View style={styles.teamsContainer}>
        <View style={styles.teamRow}>
          <View style={styles.teamInfo}>
            <FlagImage 
              countryCode={match.teams?.teamA?.federationCode || ''} 
              style={[styles.flag, compact && styles.flagCompact]} 
            />
            <Text style={[styles.teamName, compact && styles.teamNameCompact]}>
              {match.teams?.teamA?.name || 'Team A'}
            </Text>
          </View>
          {getScoreDisplay()}
        </View>
        
        <View style={styles.teamRow}>
          <View style={styles.teamInfo}>
            <FlagImage 
              countryCode={match.teams?.teamB?.federationCode || ''} 
              style={[styles.flag, compact && styles.flagCompact]} 
            />
            <Text style={[styles.teamName, compact && styles.teamNameCompact]}>
              {match.teams?.teamB?.name || 'Team B'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <RoundPhaseDisplay 
            round={match.round}
            phase={match.phase}
            style={[styles.roundPhase, compact && styles.roundPhaseCompact]}
          />
          <Text style={[styles.timeText, compact && styles.timeTextCompact]}>
            {formatTime(match.scheduledTime?.time)}
          </Text>
        </View>
        
        <View style={styles.footerRight}>
          {showDuration && getMatchDuration() && (
            <Text style={[styles.durationText, compact && styles.durationTextCompact]}>
              {getMatchDuration()}
            </Text>
          )}
          {getRefereeDisplay()}
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
  cardLive: {
    borderColor: colors.success,
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  cardReferee: {
    borderColor: colors.accent,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  matchNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B365D',
    marginRight: 12,
  },
  matchNumberCompact: {
    fontSize: 14,
    marginRight: 8,
  },
  courtInfo: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  courtInfoCompact: {
    fontSize: 13,
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
  statusBadge: {
    marginLeft: 8,
  },
  teamsContainer: {
    marginBottom: 12,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B365D',
    flex: 1,
  },
  teamNameCompact: {
    fontSize: 14,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
    minWidth: 24,
    textAlign: 'center',
  },
  scoreTextCompact: {
    fontSize: 16,
    minWidth: 20,
  },
  scoreWinner: {
    color: colors.success,
  },
  scoreSeparator: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9CA3AF',
    marginHorizontal: 6,
  },
  scoreSeparatorCompact: {
    fontSize: 14,
    marginHorizontal: 4,
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
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roundPhase: {
    marginRight: 12,
  },
  roundPhaseCompact: {
    marginRight: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  timeTextCompact: {
    fontSize: 13,
  },
  durationText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginRight: 12,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationTextCompact: {
    fontSize: 11,
    marginRight: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  refereeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  refereeTextCompact: {
    fontSize: 11,
  },
});