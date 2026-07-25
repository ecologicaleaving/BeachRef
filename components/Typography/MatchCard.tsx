/**
 * MatchCard Component - Typography Hierarchy Implementation
 * Referee-optimized match card with clear information scanning patterns
 * Enhanced with live score animations (Story 002)
 */

import React from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';

import { Title, Heading, Subheading, EnhancedBodyText, EnhancedCaption } from './Text';
import { colors, spacing } from '../../theme/tokens';
import { createTextShadow } from '../../theme/shadows';
import { FlagImage } from '../FlagImage';
import { RoundPhaseDisplay } from './RoundPhaseDisplay';
import { LiveIndicator } from '../Status/LiveIndicator';
import { useScoreChangeAnimation, useStatusChangeAnimation, useCourtChangeAnimation, useReducedMotion, withReducedMotionCheck } from '../../utils/statusAnimations';

export interface MatchInfo {
  matchId: string;
  teamA: string;
  teamB: string;
  teamAFederationCode?: string;
  teamBFederationCode?: string;
  time: string;
  date: string;
  court: string;
  round: string;
  phase?: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  refereeRole?: 'referee1' | 'referee2';
  priority?: 'critical' | 'high' | 'medium' | 'low';
  // Live score properties
  teamAScore?: number | string;
  teamBScore?: number | string;
  isLive?: boolean;
  liveData?: {
    duration?: string;
    lastUpdate?: string;
    points?: number;
  };
}

export interface MatchCardProps {
  match: MatchInfo;
  variant?: 'current' | 'upcoming' | 'completed';
  onPress?: (match: MatchInfo) => void;
  testID?: string;
}

/**
 * MatchCard with hierarchical typography for referee scanning
 * Information Hierarchy: Match ID > Teams > Time/Status > Court/Round
 * Enhanced with live score animations and visual indicators
 */
export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  variant = 'upcoming',
  onPress,
  testID,
}) => {
  const handlePress = () => {
    onPress?.(match);
  };

  // Determine if match is live
  const isLive = match.isLive || match.status === 'live';

  // Animation hooks
  const reducedMotionEnabled = useReducedMotion();
  const teamAScoreAnimation = useScoreChangeAnimation(match.teamAScore, isLive);
  const teamBScoreAnimation = useScoreChangeAnimation(match.teamBScore, isLive);
  const statusAnimation = useStatusChangeAnimation(match.status);
  const courtAnimation = useCourtChangeAnimation(match.court);

  const getVariantStyles = () => {
    const baseVariant = (() => {
      switch (variant) {
        case 'current':
          return {
            container: styles.currentContainer,
            emphasis: 'critical' as const,
          };
        case 'completed':
          return {
            container: styles.completedContainer,
            emphasis: 'low' as const,
          };
        case 'upcoming':
        default:
          return {
            container: styles.upcomingContainer,
            emphasis: 'medium' as const,
          };
      }
    })();

    // Enhance with live styling if match is live
    if (isLive) {
      return {
        container: [baseVariant.container, styles.liveContainer],
        emphasis: 'critical' as const,
      };
    }

    return baseVariant;
  };

  const { container, emphasis } = getVariantStyles();

  // Extract proper round display data from match
  const roundData = {
    round: match.round || 'TBD',
    phase: match.phase
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.baseContainer,
        container,
        pressed && styles.pressed,
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Match ${match.matchId}: ${match.teamA} vs ${match.teamB}, ${match.date} at ${match.time}, C${match.court}`}
      testID={testID}
    >
      {/* PRIMARY LEVEL: Match ID - Largest, most prominent */}
      <View style={styles.matchIdSection}>
        <Title
          level={2}
          critical={variant === 'current' || isLive}
          color="textPrimary"
          style={styles.matchId}
        >
          {match.matchId}
        </Title>

        {/* Live indicator and status with animations */}
        <View style={styles.statusRow}>
          {isLive && (
            <LiveIndicator
              isLive={isLive}
              size="medium"
              style={styles.liveIndicator}
              testID={`${testID}-live-indicator`}
            />
          )}
          <Animated.View
            style={withReducedMotionCheck(statusAnimation, reducedMotionEnabled.value)}
          >
            <EnhancedCaption
              urgent={isLive}
              emphasis={isLive ? 'critical' : emphasis}
              color={isLive ? 'success' : 'textSecondary'}
              style={styles.statusText}
            >
              {match.status.toUpperCase()}
            </EnhancedCaption>
          </Animated.View>
        </View>
      </View>

      {/* SECONDARY LEVEL: Team Names with Live Scores - Clear hierarchy with vs separator */}
      <View style={styles.teamsSection}>
        <View style={styles.teamContainer}>
          <Heading
            emphasis={emphasis}
            hierarchy="secondary"
            color="textPrimary"
            style={styles.teamName}
          >
            {match.teamA}
          </Heading>
          <FlagImage
            federationCode={match.teamAFederationCode}
            teamName={match.teamA}
            size="medium"
            style={styles.flagImage}
          />
          {/* Animated Team A Score */}
          {match.teamAScore !== undefined && (
            <Animated.View
              style={withReducedMotionCheck(teamAScoreAnimation, reducedMotionEnabled.value)}
            >
              <EnhancedBodyText
                emphasis={isLive ? 'critical' : 'medium'}
                color={isLive ? 'success' : 'textPrimary'}
                style={[styles.scoreText, isLive && styles.liveScoreText]}
              >
                {match.teamAScore}
              </EnhancedBodyText>
            </Animated.View>
          )}
        </View>

        <EnhancedBodyText
          emphasis="low"
          color="textSecondary"
          style={styles.vsText}
        >
          vs
        </EnhancedBodyText>

        <View style={styles.teamContainer}>
          <Heading
            emphasis={emphasis}
            hierarchy="secondary"
            color="textPrimary"
            style={styles.teamName}
          >
            {match.teamB}
          </Heading>
          <FlagImage
            federationCode={match.teamBFederationCode}
            teamName={match.teamB}
            size="medium"
            style={styles.flagImage}
          />
          {/* Animated Team B Score */}
          {match.teamBScore !== undefined && (
            <Animated.View
              style={withReducedMotionCheck(teamBScoreAnimation, reducedMotionEnabled.value)}
            >
              <EnhancedBodyText
                emphasis={isLive ? 'critical' : 'medium'}
                color={isLive ? 'success' : 'textPrimary'}
                style={[styles.scoreText, isLive && styles.liveScoreText]}
              >
                {match.teamBScore}
              </EnhancedBodyText>
            </Animated.View>
          )}
        </View>
      </View>

      {/* TERTIARY LEVEL: Time and Status Information */}
      <View style={styles.timeStatusSection}>
        <View style={styles.timeInfo}>
          <Subheading 
            emphasis={emphasis}
            color="textPrimary"
            style={styles.timeText}
          >
            {match.time}
          </Subheading>
          <EnhancedCaption 
            emphasis="medium"
            color="textSecondary"
          >
            {match.date}
          </EnhancedCaption>
        </View>

        <View style={styles.venueInfo}>
          <Animated.View
            style={withReducedMotionCheck(courtAnimation, reducedMotionEnabled.value)}
          >
            <Subheading
              emphasis="high"
              color="textPrimary"
              style={styles.courtText}
            >
              C{match.court}
            </Subheading>
          </Animated.View>
          <RoundPhaseDisplay
            round={roundData.round}
            phase={roundData.phase}
            emphasis="medium"
            color="textSecondary"
          />
        </View>
      </View>

      {/* Referee Role (if applicable) */}
      {match.refereeRole && (
        <View style={styles.refereeRoleSection}>
          <EnhancedBodyText 
            emphasis="medium"
            color="accent"
            style={styles.refereeRole}
          >
            {match.refereeRole === 'referee1' ? '1st Referee' : '2nd Referee'}
          </EnhancedBodyText>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  baseContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.lg,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
    // Use both boxShadow for web and elevation for mobile
    ...(typeof window !== 'undefined'
      ? { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)' }
      : { elevation: 8 }),
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minHeight: 160, // Adequate touch target size
  },
  currentContainer: {
    borderColor: colors.success,
    borderWidth: 3,
    backgroundColor: '#F0FDF4', // Very light green background
  },
  upcomingContainer: {
    borderColor: colors.secondary,
    borderWidth: 2,
  },
  completedContainer: {
    borderColor: '#D1D5DB',
    opacity: 0.8,
    backgroundColor: '#F9FAFB',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  liveContainer: {
    borderColor: colors.success,
    borderWidth: 3,
    backgroundColor: '#F0FDF4', // Very light green background
    // Enhanced glow effect for live matches
    ...(typeof window !== 'undefined'
      ? { boxShadow: `0px 0px 8px rgba(34, 197, 94, 0.3)` }
      : { elevation: 12 }),
  },
  matchIdSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  matchId: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  liveIndicator: {
    marginRight: spacing.xs,
  },
  statusText: {
    marginLeft: spacing.sm,
  },
  scoreText: {
    marginLeft: spacing.sm,
    fontWeight: '600',
    fontSize: 16,
  },
  liveScoreText: {
    color: colors.success,
    fontWeight: '700',
    ...createTextShadow({
      textShadowColor: colors.success,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 2,
    }),
  },
  teamsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  teamContainer: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  teamName: {
    textAlign: 'center',
    flex: 1,
  },
  flagImage: {
    marginLeft: spacing.sm,
  },
  vsText: {
    flex: 0.5,
    textAlign: 'center',
    fontWeight: '300',
  },
  timeStatusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  timeInfo: {
    alignItems: 'flex-start',
  },
  timeText: {
    marginBottom: 2,
  },
  venueInfo: {
    alignItems: 'flex-end',
  },
  courtText: {
    marginBottom: 2,
  },
  refereeRoleSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  refereeRole: {
    fontWeight: '600',
  },
});

export default MatchCard;