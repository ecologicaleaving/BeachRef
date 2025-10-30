/**
 * Tournament Loading Skeleton Component
 * Skeleton loader displayed while tournaments are being fetched
 * User Story 1: Loading States - Visual feedback during data fetch
 */

import React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Container } from '../Foundation/Container';

/**
 * Component props
 */
export interface TournamentLoadingSkeletonProps {
  /**
   * Number of skeleton cards to display (default: 3)
   */
  count?: number;

  /**
   * Whether to animate the skeleton (default: true)
   */
  animated?: boolean;
}

/**
 * Single skeleton card component
 */
function SkeletonCard({ animated = true }: { animated?: boolean }): React.ReactElement {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!animated) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animated, animatedValue]);

  const opacity = animated
    ? animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7]
      })
    : 0.5;

  return (
    <View style={styles.card}>
      {/* Tournament name */}
      <Animated.View style={[styles.skeletonLarge, { opacity }]} />

      {/* Tournament details row */}
      <View style={styles.detailsRow}>
        <Animated.View style={[styles.skeletonSmall, { opacity }]} />
        <Animated.View style={[styles.skeletonSmall, { opacity }]} />
      </View>

      {/* Date range */}
      <Animated.View style={[styles.skeletonMedium, { opacity }]} />

      {/* Status badge placeholder */}
      <View style={styles.badgeRow}>
        <Animated.View style={[styles.skeletonBadge, { opacity }]} />
      </View>
    </View>
  );
}

/**
 * Tournament loading skeleton component
 *
 * Displays animated skeleton placeholders while tournament data is loading.
 * Prevents layout shift by maintaining consistent card dimensions.
 *
 * @example
 * ```tsx
 * function TournamentList() {
 *   const { isLoading } = useTournamentLoading();
 *
 *   if (isLoading) {
 *     return <TournamentLoadingSkeleton count={5} />;
 *   }
 *
 *   return <TournamentGrid />;
 * }
 * ```
 */
export function TournamentLoadingSkeleton({
  count = 3,
  animated = true
}: TournamentLoadingSkeletonProps): React.ReactElement {
  return (
    <Container style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} animated={animated} />
      ))}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  skeletonLarge: {
    height: 24,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 12
  },
  skeletonMedium: {
    height: 18,
    width: '70%',
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 12
  },
  skeletonSmall: {
    height: 16,
    width: 80,
    backgroundColor: '#e0e0e0',
    borderRadius: 4
  },
  skeletonBadge: {
    height: 24,
    width: 100,
    backgroundColor: '#e0e0e0',
    borderRadius: 12
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 4
  }
});
