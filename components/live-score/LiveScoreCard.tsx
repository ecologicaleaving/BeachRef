/**
 * LiveScoreCard Component - Main container for live score display
 * Part of EPIC-001 Live Score Display - Story 1.2
 * 
 * A card component that displays real-time match scores and status from BeachLive data
 * with graceful fallback to static match data when live scores are unavailable.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Card } from '../Foundation/Container';
import { StatusBadge } from '../Status/StatusBadge';
import { Text } from '../Typography/Text';
import { RoundPhaseDisplay } from '../Typography/RoundPhaseDisplay';
import { colors, spacing, typography } from '../../theme/tokens';
import { BeachLive, BeachMatchStatus } from '../../types/beach-live';
import { BeachMatch } from '../../types/match';

export interface LiveScoreCardProps {
  /** Match number identifier */
  matchNo: number;
  /** Live score data from BeachLive API */
  beachLive?: BeachLive;
  /** Loading state indicator */
  loading?: boolean;
  /** Error state from live score polling */
  error?: Error;
  /** Static match data for fallback display */
  fallbackMatch?: BeachMatch;
  /** Refresh callback for manual refresh */
  onRefresh?: () => void;
  /** Additional container styles */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Main LiveScoreCard component that displays live match scores and status
 * Handles different match states (not started, in progress, completed)
 * Optimized with React.memo for performance during rapid updates
 */
export const LiveScoreCard: React.FC<LiveScoreCardProps> = React.memo(({
  matchNo,
  beachLive,
  loading = false,
  error,
  fallbackMatch,
  onRefresh,
  style,
  testID,
}) => {
  // Determine data source and match state
  const hasLiveData = beachLive && !error;
  const matchData = hasLiveData ? beachLive.match : null;
  
  // Extract proper round display data for fallback match
  const roundData = fallbackMatch ? {
    round: fallbackMatch.Round || 'TBD',
    phase: (fallbackMatch as any).phase
  } : { round: 'TBD', phase: undefined };
  const teamA = hasLiveData ? beachLive.teamA : { 
    name: fallbackMatch?.TeamAName || 'Team A',
    federationCode: fallbackMatch?.TeamAFederationCode || '',
  };
  const teamB = hasLiveData ? beachLive.teamB : { 
    name: fallbackMatch?.TeamBName || 'Team B',
    federationCode: fallbackMatch?.TeamBFederationCode || '',
  };

  // Get match status for display
  const getMatchStatus = (): { 
    status: BeachMatchStatus; 
    displayText: string; 
    badgeVariant: 'current' | 'upcoming' | 'completed' | 'cancelled' 
  } => {
    const status = (hasLiveData ? matchData?.status : fallbackMatch?.Status) as BeachMatchStatus || BeachMatchStatus.SCHEDULED;
    
    switch (status) {
      case BeachMatchStatus.IN_PROGRESS:
        return { 
          status, 
          displayText: 'LIVE', 
          badgeVariant: 'current' as const 
        };
      case BeachMatchStatus.FINISHED:
        return { 
          status, 
          displayText: 'FINISHED', 
          badgeVariant: 'completed' as const 
        };
      case BeachMatchStatus.CANCELLED:
        return { 
          status, 
          displayText: 'CANCELLED', 
          badgeVariant: 'cancelled' as const 
        };
      case BeachMatchStatus.POSTPONED:
        return { 
          status, 
          displayText: 'POSTPONED', 
          badgeVariant: 'upcoming' as const 
        };
      case BeachMatchStatus.SUSPENDED:
        return { 
          status, 
          displayText: 'SUSPENDED', 
          badgeVariant: 'upcoming' as const 
        };
      case BeachMatchStatus.SCHEDULED:
      default:
        return { 
          status, 
          displayText: 'SCHEDULED', 
          badgeVariant: 'upcoming' as const 
        };
    }
  };

  const { displayText, badgeVariant } = getMatchStatus();

  // Current set scores (from live data or fallback)
  const getCurrentSetScores = (): { teamAScore: number; teamBScore: number } => {
    if (hasLiveData && beachLive.sets.length > 0) {
      const currentSet = beachLive.sets.find(set => set.status === 'InProgress') || 
                         beachLive.sets[beachLive.sets.length - 1];
      return {
        teamAScore: currentSet?.pointsTeamA || 0,
        teamBScore: currentSet?.pointsTeamB || 0,
      };
    }
    
    // Fallback to static match data - use the most recent completed set or current set
    if (fallbackMatch) {
      // Check set 3 first (current/final set), then set 2, then set 1
      if (fallbackMatch.PointsTeamASet3 || fallbackMatch.PointsTeamBSet3) {
        return {
          teamAScore: parseInt(fallbackMatch.PointsTeamASet3 || '0', 10),
          teamBScore: parseInt(fallbackMatch.PointsTeamBSet3 || '0', 10),
        };
      } else if (fallbackMatch.PointsTeamASet2 || fallbackMatch.PointsTeamBSet2) {
        return {
          teamAScore: parseInt(fallbackMatch.PointsTeamASet2 || '0', 10),
          teamBScore: parseInt(fallbackMatch.PointsTeamBSet2 || '0', 10),
        };
      } else if (fallbackMatch.PointsTeamASet1 || fallbackMatch.PointsTeamBSet1) {
        return {
          teamAScore: parseInt(fallbackMatch.PointsTeamASet1 || '0', 10),
          teamBScore: parseInt(fallbackMatch.PointsTeamBSet1 || '0', 10),
        };
      }
    }
    
    return { teamAScore: 0, teamBScore: 0 };
  };

  const { teamAScore, teamBScore } = getCurrentSetScores();

  // Handle loading state
  if (loading) {
    return (
      <Card style={[styles.container, styles.loadingContainer, style]} testID={testID}>
        <View style={styles.header}>
          <Text style={styles.matchNumber}>Match {matchNo}</Text>
          <StatusBadge status="upcoming" label="Loading..." size="small" />
        </View>
        <View style={styles.loadingContent}>
          <Text style={styles.loadingText}>Loading live scores...</Text>
        </View>
      </Card>
    );
  }

  // Handle error state with fallback
  if (error && !fallbackMatch) {
    return (
      <Card style={[styles.container, styles.errorContainer, style]} testID={testID}>
        <View style={styles.header}>
          <Text style={styles.matchNumber}>Match {matchNo}</Text>
          <StatusBadge status="emergency" label="Error" size="small" />
        </View>
        <View style={styles.errorContent}>
          <Text style={styles.errorText}>Unable to load match data</Text>
          {onRefresh && (
            <Text style={styles.retryText} onPress={onRefresh}>
              Tap to retry
            </Text>
          )}
        </View>
      </Card>
    );
  }

  // Main live score display
  return (
    <Card 
      style={[
        styles.container, 
        badgeVariant === 'current' && styles.liveContainer,
        badgeVariant === 'completed' && styles.completedContainer,
        style
      ]} 
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Match ${matchNo}: ${teamA?.name || 'Team A'} ${teamAScore} - ${teamBScore} ${teamB?.name || 'Team B'}, Status: ${displayText}`}
    >
      {/* Header with match number and status */}
      <View style={styles.header}>
        <Text style={styles.matchNumber}>Match {matchNo}</Text>
        <View style={styles.statusContainer}>
          {!hasLiveData && (
            <Text style={styles.fallbackIndicator}>Static</Text>
          )}
          <StatusBadge 
            status={badgeVariant} 
            label={displayText} 
            size="small" 
            variant={badgeVariant === 'current' ? 'solid' : 'outlined'}
          />
        </View>
      </View>

      {/* Team names and current scores */}
      <View style={styles.scoresSection}>
        <View style={styles.teamContainer}>
          <Text 
            style={[
              styles.teamName,
              badgeVariant === 'current' && styles.liveTeamName
            ]}
            numberOfLines={2}
          >
            {teamA?.name || 'Team A'}
          </Text>
          <Text 
            style={[
              styles.score,
              badgeVariant === 'current' && styles.liveScore
            ]}
          >
            {teamAScore}
          </Text>
        </View>

        <Text style={styles.vsText}>vs</Text>

        <View style={styles.teamContainer}>
          <Text 
            style={[
              styles.teamName,
              badgeVariant === 'current' && styles.liveTeamName
            ]}
            numberOfLines={2}
          >
            {teamB?.name || 'Team B'}
          </Text>
          <Text 
            style={[
              styles.score,
              badgeVariant === 'current' && styles.liveScore
            ]}
          >
            {teamBScore}
          </Text>
        </View>
      </View>

      {/* Match details */}
      {(matchData || fallbackMatch) && (
        <View style={styles.matchDetails}>
          <Text style={styles.detailText}>
            {hasLiveData && matchData 
              ? new Date(matchData.dateTime).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : fallbackMatch?.LocalTime || 'TBD'
            }
          </Text>
          <Text style={styles.detailText}>
            Court {hasLiveData ? matchData?.court?.no || matchData?.court?.name : fallbackMatch?.Court || 'TBD'}
          </Text>
          <RoundPhaseDisplay
            round={hasLiveData ? matchData?.round?.name : roundData.round}
            phase={roundData.phase}
            emphasis="medium"
            color="textSecondary"
            style={styles.detailText}
          />
        </View>
      )}

      {/* Live data indicator */}
      {hasLiveData && (
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live Data</Text>
        </View>
      )}
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for optimized re-renders
  // Only re-render if key props have actually changed
  return (
    prevProps.matchNo === nextProps.matchNo &&
    prevProps.loading === nextProps.loading &&
    prevProps.error === nextProps.error &&
    prevProps.beachLive?.version === nextProps.beachLive?.version &&
    prevProps.fallbackMatch === nextProps.fallbackMatch
  );
});

LiveScoreCard.displayName = 'LiveScoreCard';

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
    minHeight: 140,
  },
  loadingContainer: {
    opacity: 0.7,
  },
  errorContainer: {
    borderWidth: 2,
    borderColor: colors.error,
  },
  liveContainer: {
    borderWidth: 3,
    borderColor: colors.success,
    backgroundColor: '#F0FDF4', // Light green background for live matches
  },
  completedContainer: {
    opacity: 0.8,
    backgroundColor: '#F9FAFB', // Light gray for completed matches
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  matchNumber: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    color: colors.textPrimary,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fallbackIndicator: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  scoresSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  teamContainer: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  teamName: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    minHeight: typography.body.lineHeight * 2, // Reserve space for 2 lines
  },
  liveTeamName: {
    color: colors.success,
    fontWeight: 'bold',
  },
  score: {
    fontSize: typography.h1.fontSize,
    fontWeight: 'bold',
    color: colors.textPrimary,
    minWidth: 40,
    textAlign: 'center',
  },
  liveScore: {
    color: colors.success,
    fontSize: typography.hero.fontSize,
  },
  vsText: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    fontWeight: '300',
    paddingHorizontal: spacing.sm,
  },
  matchDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.textSecondary + '30',
  },
  detailText: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  liveIndicator: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  liveText: {
    fontSize: 10,
    color: colors.success,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  loadingText: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  errorContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  errorText: {
    fontSize: typography.body.fontSize,
    color: colors.error,
    textAlign: 'center',
  },
  retryText: {
    fontSize: typography.caption.fontSize,
    color: colors.accent,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default LiveScoreCard;