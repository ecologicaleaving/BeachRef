import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MatchResult } from '../../types/MatchResults';
import { MatchResultsService } from '../../services/MatchResultsService';
import { formatTime, formatDate } from '../../utils/dateFormatters';

interface LiveMatchCardProps {
  match: MatchResult;
  onPress?: (match: MatchResult) => void;
}

export const LiveMatchCard: React.FC<LiveMatchCardProps> = ({
  match,
  onPress
}) => {
  
  const getScoreDisplay = () => {
    const score = MatchResultsService.formatScore(match);
    const matchPoints = `${match.matchPointsA}-${match.matchPointsB}`;
    return { score, matchPoints };
  };

  const { score, matchPoints } = getScoreDisplay();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed
      ]}
      onPress={() => onPress?.(match)}
      accessibilityRole="button"
      accessibilityLabel={`Live match: ${match.teamAName} vs ${match.teamBName}, current score ${score}, match points ${matchPoints}, ${formatTime(match.localDate, match.localTime)} on ${match.court}`}
    >
      {/* Live Status Indicator */}
      <View style={styles.statusBadge}>
        <View style={styles.liveIndicator} />
        <Text style={styles.statusText}>LIVE</Text>
      </View>

      {/* Team Names */}
      <View style={styles.teamsContainer}>
        <Text style={styles.teamName}>
          {match.teamAName}
          {match.teamACountryCode && ` (${match.teamACountryCode})`}
        </Text>
        <Text style={styles.vsText}>vs</Text>
        <Text style={styles.teamName}>
          {match.teamBName}
          {match.teamBCountryCode && ` (${match.teamBCountryCode})`}
        </Text>
      </View>

      {/* Score Display */}
      <View style={styles.scoreContainer}>
        <Text style={styles.matchPoints}>Match Points: {matchPoints}</Text>
        <Text style={styles.setScores}>{score}</Text>
      </View>

      {/* Referees */}
      <View style={styles.refereesContainer}>
        <Text style={styles.refereesLabel}>Referees:</Text>
        <Text style={styles.refereesText}>
          {MatchResultsService.formatReferees(match)}
        </Text>
      </View>

      {/* Match Info */}
      <View style={styles.matchInfo}>
        <View style={styles.timeInfo}>
          <Text style={styles.dateText}>{formatDate(match.localDate)}</Text>
          <Text style={styles.timeText}>{formatTime(match.localDate, match.localTime)}</Text>
        </View>
        
        <View style={styles.venueInfo}>
          <Text style={styles.courtText}>{match.court}</Text>
          <Text style={styles.roundText}>{match.round}</Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#10B981', // High-contrast green for live matches
    minHeight: 180, // Large touch target for outdoor use
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minHeight: 32, // Touch target requirement
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  teamsContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  teamName: {
    fontSize: 20, // Large font for outdoor visibility
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginVertical: 2,
  },
  vsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginVertical: 4,
  },
  scoreContainer: {
    alignItems: 'center',
    marginVertical: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
  },
  matchPoints: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  setScores: {
    fontSize: 24, // Extra large for score visibility
    fontWeight: '800',
    color: '#10B981', // Green to match live status
    textAlign: 'center',
  },
  refereesContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  refereesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  refereesText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    lineHeight: 22,
  },
  matchInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  timeInfo: {
    alignItems: 'flex-start',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  venueInfo: {
    alignItems: 'flex-end',
  },
  courtText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  roundText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
});