/**
 * MatchStatusIndicators Component - Live match status indicators
 * Part of EPIC-001 Live Score Display - Story 1.2
 * 
 * A component that displays visual indicators for critical match moments:
 * - Ball in play state
 * - Match point alerts with prominent styling  
 * - Set point alerts with distinct styling
 * - Pulsing/animation effects for critical match moments
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle, Animated } from 'react-native';
import { Text } from '../Typography/Text';
import { colors, spacing, typography } from '../../theme/tokens';

export interface MatchStatusIndicatorsProps {
  /** Whether the ball is currently in play */
  ballInPlay: boolean;
  /** Match point status for both teams */
  matchPoints: { teamA: boolean; teamB: boolean };
  /** Set point status for both teams */
  setPoints: { teamA: boolean; teamB: boolean };
  /** Use compact layout for smaller spaces */
  compact?: boolean;
  /** Additional container styles */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * MatchStatusIndicators component that shows critical match status
 * Uses pulsing animations and prominent styling for urgent moments
 * Provides clear visual hierarchy for different types of status
 */
export const MatchStatusIndicators: React.FC<MatchStatusIndicatorsProps> = React.memo(({
  ballInPlay,
  matchPoints,
  setPoints,
  compact = false,
  style,
  testID,
}) => {
  // Animation values for pulsing effects
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ballInPlayAnim = useRef(new Animated.Value(0.3)).current;

  // Determine if any critical moment is happening
  const hasCriticalMoment = matchPoints.teamA || matchPoints.teamB || setPoints.teamA || setPoints.teamB;
  const hasMatchPoint = matchPoints.teamA || matchPoints.teamB;
  const hasSetPoint = setPoints.teamA || setPoints.teamB;

  // Pulse animation for critical moments
  useEffect(() => {
    if (hasCriticalMoment) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      return () => {
        pulseAnimation.stop();
      };
    } else {
      pulseAnim.setValue(1);
    }
  }, [hasCriticalMoment, pulseAnim]);

  // Ball in play animation
  useEffect(() => {
    if (ballInPlay) {
      const ballAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(ballInPlayAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(ballInPlayAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      ballAnimation.start();

      return () => {
        ballAnimation.stop();
      };
    } else {
      ballInPlayAnim.setValue(0.3);
    }
  }, [ballInPlay, ballInPlayAnim]);

  // Helper function to get status indicators
  const getStatusIndicators = (): Array<{
    type: 'match-point' | 'set-point' | 'ball-in-play';
    text: string;
    priority: 'critical' | 'high' | 'medium';
    teamInfo?: string;
  }> => {
    const indicators: Array<{
      type: 'match-point' | 'set-point' | 'ball-in-play';
      text: string;
      priority: 'critical' | 'high' | 'medium';
      teamInfo?: string;
    }> = [];

    // Match points (highest priority)
    if (matchPoints.teamA && matchPoints.teamB) {
      indicators.push({
        type: 'match-point',
        text: 'MATCH POINT - BOTH',
        priority: 'critical',
      });
    } else if (matchPoints.teamA) {
      indicators.push({
        type: 'match-point',
        text: 'MATCH POINT',
        priority: 'critical',
        teamInfo: 'Team A',
      });
    } else if (matchPoints.teamB) {
      indicators.push({
        type: 'match-point',
        text: 'MATCH POINT',
        priority: 'critical',
        teamInfo: 'Team B',
      });
    }

    // Set points (high priority)
    if (setPoints.teamA && setPoints.teamB) {
      indicators.push({
        type: 'set-point',
        text: 'SET POINT - BOTH',
        priority: 'high',
      });
    } else if (setPoints.teamA) {
      indicators.push({
        type: 'set-point',
        text: 'SET POINT',
        priority: 'high',
        teamInfo: 'Team A',
      });
    } else if (setPoints.teamB) {
      indicators.push({
        type: 'set-point',
        text: 'SET POINT',
        priority: 'high',
        teamInfo: 'Team B',
      });
    }

    // Ball in play (medium priority)
    if (ballInPlay) {
      indicators.push({
        type: 'ball-in-play',
        text: 'BALL IN PLAY',
        priority: 'medium',
      });
    }

    return indicators;
  };

  const indicators = getStatusIndicators();

  // If no indicators, return minimal display
  if (indicators.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer, compact && styles.compactContainer, style]} testID={testID}>
        <View style={styles.quietDot} />
        <Text style={[styles.quietText, compact && styles.compactQuietText]}>
          Quiet
        </Text>
      </View>
    );
  }

  return (
    <View 
      style={[styles.container, compact && styles.compactContainer, style]} 
      testID={testID}
      accessibilityLabel={`Match status: ${indicators.map(i => i.text + (i.teamInfo ? ` for ${i.teamInfo}` : '')).join(', ')}`}
    >
      {indicators.map((indicator, index) => (
        <Animated.View
          key={`${indicator.type}-${index}`}
          style={[
            styles.indicatorContainer,
            compact && styles.compactIndicatorContainer,
            indicator.priority === 'critical' && styles.criticalContainer,
            indicator.priority === 'high' && styles.highContainer,
            indicator.priority === 'medium' && styles.mediumContainer,
            (indicator.priority === 'critical' || indicator.priority === 'high') && {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          {/* Status dot with specific styling */}
          <Animated.View
            style={[
              styles.statusDot,
              indicator.type === 'match-point' && styles.matchPointDot,
              indicator.type === 'set-point' && styles.setPointDot,
              indicator.type === 'ball-in-play' && styles.ballInPlayDot,
              indicator.type === 'ball-in-play' && {
                opacity: ballInPlayAnim,
              },
            ]}
          />

          {/* Status text */}
          <Text
            style={[
              styles.indicatorText,
              compact && styles.compactIndicatorText,
              indicator.priority === 'critical' && styles.criticalText,
              indicator.priority === 'high' && styles.highText,
              indicator.priority === 'medium' && styles.mediumText,
            ]}
          >
            {indicator.text}
          </Text>

          {/* Team info if applicable */}
          {indicator.teamInfo && !compact && (
            <Text
              style={[
                styles.teamInfo,
                indicator.priority === 'critical' && styles.criticalTeamInfo,
                indicator.priority === 'high' && styles.highTeamInfo,
              ]}
            >
              {indicator.teamInfo}
            </Text>
          )}
        </Animated.View>
      ))}
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for performance optimization
  // Only re-render if status indicators have changed
  return (
    prevProps.ballInPlay === nextProps.ballInPlay &&
    prevProps.compact === nextProps.compact &&
    prevProps.matchPoints.teamA === nextProps.matchPoints.teamA &&
    prevProps.matchPoints.teamB === nextProps.matchPoints.teamB &&
    prevProps.setPoints.teamA === nextProps.setPoints.teamA &&
    prevProps.setPoints.teamB === nextProps.setPoints.teamB
  );
});

MatchStatusIndicators.displayName = 'MatchStatusIndicators';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 8,
    minHeight: 48,
  },
  compactContainer: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: 36,
  },
  emptyContainer: {
    justifyContent: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
  },
  compactIndicatorContainer: {
    gap: spacing.xs,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
  },
  criticalContainer: {
    backgroundColor: colors.error + '15',
    borderWidth: 2,
    borderColor: colors.error,
  },
  highContainer: {
    backgroundColor: colors.warning + '15',
    borderWidth: 2,
    borderColor: colors.warning,
  },
  mediumContainer: {
    backgroundColor: colors.success + '10',
    borderWidth: 1,
    borderColor: colors.success,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  matchPointDot: {
    backgroundColor: colors.error,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  setPointDot: {
    backgroundColor: colors.warning,
    shadowColor: colors.warning,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 3,
  },
  ballInPlayDot: {
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 2,
  },
  indicatorText: {
    fontSize: typography.caption.fontSize,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactIndicatorText: {
    fontSize: 10,
  },
  criticalText: {
    color: colors.error,
    fontSize: typography.body.fontSize,
    // React Native Web compatible text shadow
    textShadowColor: colors.error + '40',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  highText: {
    color: colors.warning,
    fontSize: typography.caption.fontSize + 1,
    // React Native Web compatible text shadow
    textShadowColor: colors.warning + '40',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  mediumText: {
    color: colors.success,
    fontSize: typography.caption.fontSize,
  },
  teamInfo: {
    fontSize: typography.caption.fontSize - 1,
    color: colors.textSecondary,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  criticalTeamInfo: {
    color: colors.error,
    fontWeight: '600',
  },
  highTeamInfo: {
    color: colors.warning,
    fontWeight: '600',
  },
  quietDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondary,
    opacity: 0.5,
  },
  quietText: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
    fontWeight: '500',
    opacity: 0.7,
  },
  compactQuietText: {
    fontSize: 10,
  },
});

export default MatchStatusIndicators;