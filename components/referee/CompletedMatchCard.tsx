import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MatchResult } from '../../types/MatchResults';
import { MatchResultsService } from '../../services/MatchResultsService';
import { formatTime, formatDate } from '../../utils/dateFormatters';
import { designTokens } from '../../theme/tokens';

interface CompletedMatchCardProps {
  match: MatchResult;
  onPress?: (match: MatchResult) => void;
}

export const CompletedMatchCard: React.FC<CompletedMatchCardProps> = ({
  match,
  onPress
}) => {
  
  const getScoreDisplay = () => {
    const score = MatchResultsService.formatScore(match);
    const matchPoints = `${match.matchPointsA}-${match.matchPointsB}`;
    const duration = MatchResultsService.getMatchDuration(match);
    const result = MatchResultsService.getMatchResultSummary(match);
    return { score, matchPoints, duration, result };
  };

  const { score, matchPoints, duration, result } = getScoreDisplay();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed
      ]}
      onPress={() => onPress?.(match)}
      accessibilityRole="button"
      accessibilityLabel={`Completed match: ${match.teamAName} vs ${match.teamBName}, final score ${score}, match points ${matchPoints}, finished at ${formatTime(match.localDate, match.localTime)} on ${match.court}`}
    >
      {/* Completed Status Badge */}
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>FINAL</Text>
      </View>

      {/* Match Result */}
      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.winnerText}>
            {result.winner}
            {result.winnerCountryCode && ` (${result.winnerCountryCode})`}
          </Text>
          <Text style={styles.resultLabel}>defeats</Text>
          <Text style={styles.loserText}>
            {result.loser}
            {result.loserCountryCode && ` (${result.loserCountryCode})`}
          </Text>
          <Text style={styles.setsWon}>({result.setsWon})</Text>
        </View>
      )}

      {/* Score Display with Set Breakdown */}
      <View style={styles.scoreContainer}>
        <Text style={styles.matchPoints}>Final Score: {matchPoints}</Text>
        <Text style={styles.setScores}>{score}</Text>
        {duration && <Text style={styles.duration}>{duration}</Text>}
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
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: designTokens.neutrals.textSecondary, // Muted gray for completed matches
    minHeight: 160, // Slightly smaller than live matches but still touch-friendly
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: designTokens.neutrals.textSecondary, // Muted gray background
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minHeight: 32, // Touch target requirement
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: designTokens.brandBlue[500], // Winner highlight
  },
  winnerText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0C4A6E',
    textAlign: 'center',
    marginBottom: 4,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0369A1',
    marginBottom: 4,
  },
  loserText: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.neutrals.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  setsWon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0C4A6E',
  },
  scoreContainer: {
    alignItems: 'center',
    marginVertical: 14,
    backgroundColor: '#F9FAFB', // Very light gray background
    borderRadius: 12,
    padding: 16,
  },
  matchPoints: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.neutrals.textPrimary,
    marginBottom: 8,
  },
  setScores: {
    fontSize: 20, // Large but not as large as live matches
    fontWeight: '700',
    color: designTokens.neutrals.textSecondary, // Gray to indicate completed status
    textAlign: 'center',
    marginBottom: 6,
  },
  duration: {
    fontSize: 14,
    fontWeight: '500',
    color: designTokens.neutrals.textSecondary,
    fontStyle: 'italic',
  },
  refereesContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: designTokens.neutrals.textSecondary,
  },
  refereesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.neutrals.textPrimary,
    marginBottom: 4,
  },
  refereesText: {
    fontSize: 16,
    fontWeight: '500',
    color: designTokens.neutrals.textPrimary,
    lineHeight: 22,
  },
  matchInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  timeInfo: {
    alignItems: 'flex-start',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    color: designTokens.neutrals.textSecondary,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.neutrals.textPrimary,
  },
  venueInfo: {
    alignItems: 'flex-end',
  },
  courtText: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.neutrals.textPrimary,
    marginBottom: 4,
  },
  roundText: {
    fontSize: 14,
    fontWeight: '500',
    color: designTokens.neutrals.textSecondary,
  },
});