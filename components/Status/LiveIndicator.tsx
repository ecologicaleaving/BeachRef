/**
 * Live Indicator Component - Story 002: Live Score UX Animations
 * Provides visual feedback for live match data with pulsing animation
 */

import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

import { useLiveIndicatorAnimation } from '../../utils/statusAnimations';
import { colors } from '../../theme/tokens';

export interface LiveIndicatorProps {
  isLive: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: any;
  testID?: string;
}

export const LiveIndicator: React.FC<LiveIndicatorProps> = ({
  isLive,
  size = 'medium',
  style,
  testID,
}) => {
  const pulseAnimation = useLiveIndicatorAnimation(isLive);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { width: 8, height: 8, borderRadius: 4 };
      case 'large':
        return { width: 16, height: 16, borderRadius: 8 };
      case 'medium':
      default:
        return { width: 12, height: 12, borderRadius: 6 };
    }
  };

  if (!isLive) {
    return null;
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      <Animated.View
        style={[
          styles.indicator,
          getSizeStyles(),
          pulseAnimation,
        ]}
        accessibilityLabel="Live match indicator"
        accessibilityRole="image"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    backgroundColor: colors.success,
    // Cross-platform shadow styling
    ...(typeof window !== 'undefined'
      ? { boxShadow: `0px 0px 4px rgba(34, 197, 94, 0.8)` }
      : { elevation: 4 }),
  },
});

export default LiveIndicator;