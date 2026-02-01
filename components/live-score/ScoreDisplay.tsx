/**
 * ScoreDisplay Component - Set-by-set score breakdown display
 * Part of EPIC-001 Live Score Display - Story 1.2
 * 
 * A component that displays detailed score breakdown by sets with highlighting
 * for the current active set and muted styling for historical sets.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from '../Typography/Text';
import { colors, spacing, typography } from '../../theme/tokens';
import { BeachLiveTeam, BeachLiveSet, BeachSetStatus } from '../../types/beach-live';
import { BeachMatch } from '../../types/match';

export interface ScoreDisplayProps {
  /** Team A data (live or fallback) */
  teamA: BeachLiveTeam | { name: string; federationCode: string };
  /** Team B data (live or fallback) */
  teamB: BeachLiveTeam | { name: string; federationCode: string };
  /** Sets data from live API */
  sets?: readonly BeachLiveSet[];
  /** Fallback match data for static display */
  fallbackMatch?: BeachMatch;
  /** Current active set number (1, 2, or 3) */
  currentSet?: number;
  /** Whether to show compact layout */
  compact?: boolean;
  /** Additional container styles */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * ScoreDisplay component that shows set-by-set breakdown
 * Highlights current active set with distinct visual styling
 * Shows historical set scores with muted styling
 * Handles edge cases (forfeit, walkover, incomplete sets)
 */
export const ScoreDisplay: React.FC<ScoreDisplayProps> = React.memo(({
  teamA,
  teamB,
  sets,
  fallbackMatch,
  currentSet,
  compact = false,
  style,
  testID,
}) => {
  // Determine if we have live data or using fallback
  const hasLiveData = sets && sets.length > 0;

  // Get set data for display
  const getSetData = (): {
    setNumber: number;
    teamAScore: number;
    teamBScore: number;
    status: BeachSetStatus | 'completed' | 'not-started';
    isActive: boolean;
  }[] => {
    if (hasLiveData) {
      // Use live data
      return sets!.map((set, _index) => ({
        setNumber: set.no,
        teamAScore: set.pointsTeamA,
        teamBScore: set.pointsTeamB,
        status: set.status,
        isActive: currentSet ? set.no === currentSet : set.status === 'InProgress',
      }));
    } else if (fallbackMatch) {
      // Use static match data
      const setData: {
        setNumber: number;
        teamAScore: number;
        teamBScore: number;
        status: 'completed' | 'not-started';
        isActive: boolean;
      }[] = [];

      // Set 1
      if (fallbackMatch.PointsTeamASet1 || fallbackMatch.PointsTeamBSet1) {
        setData.push({
          setNumber: 1,
          teamAScore: parseInt(fallbackMatch.PointsTeamASet1 || '0', 10),
          teamBScore: parseInt(fallbackMatch.PointsTeamBSet1 || '0', 10),
          status: 'completed',
          isActive: false,
        });
      }

      // Set 2
      if (fallbackMatch.PointsTeamASet2 || fallbackMatch.PointsTeamBSet2) {
        setData.push({
          setNumber: 2,
          teamAScore: parseInt(fallbackMatch.PointsTeamASet2 || '0', 10),
          teamBScore: parseInt(fallbackMatch.PointsTeamBSet2 || '0', 10),
          status: 'completed',
          isActive: false,
        });
      }

      // Set 3
      if (fallbackMatch.PointsTeamASet3 || fallbackMatch.PointsTeamBSet3) {
        setData.push({
          setNumber: 3,
          teamAScore: parseInt(fallbackMatch.PointsTeamASet3 || '0', 10),
          teamBScore: parseInt(fallbackMatch.PointsTeamBSet3 || '0', 10),
          status: 'completed',
          isActive: false,
        });
      }

      return setData;
    }

    return [];
  };

  const setData = getSetData();

  // Handle edge cases where no sets are available
  if (setData.length === 0) {
    return (
      <View style={[styles.container, compact && styles.compactContainer, style]} testID={testID}>
        <Text style={styles.noDataText}>No set data available</Text>
      </View>
    );
  }

  // Get team match points (total sets won)
  const getMatchPoints = (): { teamA: number; teamB: number } => {
    if (hasLiveData && 'matchPoints' in teamA && 'matchPoints' in teamB) {
      return {
        teamA: teamA.matchPoints,
        teamB: teamB.matchPoints,
      };
    } else if (fallbackMatch) {
      return {
        teamA: parseInt(fallbackMatch.MatchPointsA || '0', 10),
        teamB: parseInt(fallbackMatch.MatchPointsB || '0', 10),
      };
    }
    return { teamA: 0, teamB: 0 };
  };

  const matchPoints = getMatchPoints();

  return (
    <View 
      style={[styles.container, compact && styles.compactContainer, style]} 
      testID={testID}
      accessibilityLabel={`Score breakdown: ${teamA.name} ${matchPoints.teamA} sets, ${teamB.name} ${matchPoints.teamB} sets`}
    >
      {/* Match points header (sets won) */}
      <View style={styles.matchPointsHeader}>
        <View style={styles.teamHeader}>
          <Text 
            style={[styles.teamHeaderText, compact && styles.compactTeamHeaderText]}
            numberOfLines={1}
          >
            {teamA.name}
          </Text>
          <Text style={[styles.matchPoints, compact && styles.compactMatchPoints]}>
            {matchPoints.teamA}
          </Text>
        </View>
        
        <Text style={[styles.setsLabel, compact && styles.compactSetsLabel]}>
          SETS
        </Text>
        
        <View style={styles.teamHeader}>
          <Text 
            style={[styles.teamHeaderText, compact && styles.compactTeamHeaderText]}
            numberOfLines={1}
          >
            {teamB.name}
          </Text>
          <Text style={[styles.matchPoints, compact && styles.compactMatchPoints]}>
            {matchPoints.teamB}
          </Text>
        </View>
      </View>

      {/* Set-by-set scores */}
      <View style={styles.setsContainer}>
        {setData.map((set) => (
          <View 
            key={set.setNumber}
            style={[
              styles.setRow,
              compact && styles.compactSetRow,
              set.isActive && styles.activeSetRow,
              set.status === 'not-started' && styles.notStartedSetRow,
            ]}
            accessibilityLabel={`Set ${set.setNumber}: ${teamA.name} ${set.teamAScore}, ${teamB.name} ${set.teamBScore}${set.isActive ? ' - current set' : ''}`}
          >
            {/* Set number */}
            <View style={styles.setNumberContainer}>
              <Text 
                style={[
                  styles.setNumber,
                  compact && styles.compactSetNumber,
                  set.isActive && styles.activeSetNumber,
                  set.status === 'not-started' && styles.mutedSetNumber,
                ]}
              >
                {set.setNumber}
              </Text>
            </View>

            {/* Team A score */}
            <View style={styles.scoreContainer}>
              <Text 
                style={[
                  styles.setScore,
                  compact && styles.compactSetScore,
                  set.isActive && styles.activeSetScore,
                  set.status === 'not-started' && styles.mutedSetScore,
                  set.teamAScore > set.teamBScore && set.status === 'Finished' && styles.winningScore,
                ]}
              >
                {set.teamAScore}
              </Text>
            </View>

            {/* Separator */}
            <Text 
              style={[
                styles.scoreSeparator,
                compact && styles.compactScoreSeparator,
                set.isActive && styles.activeScoreSeparator,
                set.status === 'not-started' && styles.mutedScoreSeparator,
              ]}
            >
              -
            </Text>

            {/* Team B score */}
            <View style={styles.scoreContainer}>
              <Text 
                style={[
                  styles.setScore,
                  compact && styles.compactSetScore,
                  set.isActive && styles.activeSetScore,
                  set.status === 'not-started' && styles.mutedSetScore,
                  set.teamBScore > set.teamAScore && set.status === 'Finished' && styles.winningScore,
                ]}
              >
                {set.teamBScore}
              </Text>
            </View>

            {/* Set status indicator */}
            {set.status === 'InProgress' && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Additional info for special cases */}
      {hasLiveData && sets!.some(set => set.durationMinutes) && !compact && (
        <View style={styles.additionalInfo}>
          <Text style={styles.durationText}>
            Duration: {sets!.reduce((total, set) => total + (set.durationMinutes || 0), 0)}min
          </Text>
        </View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for performance optimization
  // Only re-render if score data or set status has changed
  return (
    prevProps.currentSet === nextProps.currentSet &&
    prevProps.compact === nextProps.compact &&
    JSON.stringify(prevProps.sets) === JSON.stringify(nextProps.sets) &&
    prevProps.fallbackMatch === nextProps.fallbackMatch &&
    prevProps.teamA === nextProps.teamA &&
    prevProps.teamB === nextProps.teamB
  );
});

ScoreDisplay.displayName = 'ScoreDisplay';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.textSecondary + '30',
  },
  compactContainer: {
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  matchPointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.textSecondary + '20',
  },
  teamHeader: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  teamHeaderText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  compactTeamHeaderText: {
    fontSize: typography.caption.fontSize,
  },
  matchPoints: {
    fontSize: typography.h1.fontSize,
    fontWeight: 'bold',
    color: colors.textPrimary,
    minWidth: 32,
    textAlign: 'center',
  },
  compactMatchPoints: {
    fontSize: typography.h2.fontSize,
  },
  setsLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: spacing.sm,
  },
  compactSetsLabel: {
    fontSize: 10,
  },
  setsContainer: {
    gap: spacing.xs,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
    backgroundColor: colors.background,
  },
  compactSetRow: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  activeSetRow: {
    backgroundColor: colors.success + '10',
    borderWidth: 2,
    borderColor: colors.success,
  },
  notStartedSetRow: {
    opacity: 0.5,
  },
  setNumberContainer: {
    minWidth: 24,
    alignItems: 'center',
  },
  setNumber: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  compactSetNumber: {
    fontSize: typography.caption.fontSize,
  },
  activeSetNumber: {
    color: colors.success,
    fontWeight: 'bold',
  },
  mutedSetNumber: {
    color: colors.textSecondary,
    opacity: 0.6,
  },
  scoreContainer: {
    minWidth: 40,
    alignItems: 'center',
  },
  setScore: {
    fontSize: typography.bodyLarge.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  compactSetScore: {
    fontSize: typography.body.fontSize,
  },
  activeSetScore: {
    color: colors.success,
    fontSize: typography.h2.fontSize,
    fontWeight: 'bold',
  },
  mutedSetScore: {
    color: colors.textSecondary,
    opacity: 0.6,
  },
  winningScore: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  scoreSeparator: {
    fontSize: typography.bodyLarge.fontSize,
    color: colors.textSecondary,
    fontWeight: '300',
    paddingHorizontal: spacing.xs,
  },
  compactScoreSeparator: {
    fontSize: typography.body.fontSize,
  },
  activeScoreSeparator: {
    color: colors.success,
    fontWeight: '600',
  },
  mutedScoreSeparator: {
    opacity: 0.6,
  },
  liveIndicator: {
    marginLeft: spacing.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  additionalInfo: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.textSecondary + '20',
    alignItems: 'center',
  },
  durationText: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  noDataText: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: spacing.lg,
  },
});

export default ScoreDisplay;