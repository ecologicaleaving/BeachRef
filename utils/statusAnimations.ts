/**
 * Status Change Animation System
 * Story 1.4: Status-Driven Color Coding System
 * Story 002: Enhanced Live Score UX with Animations
 *
 * Provides smooth transition animations for status changes
 * Built on React Native's own Animated API (issue #38 dropped reanimated)
 */

import { Animated, Easing, AccessibilityInfo } from 'react-native';
import React, { useEffect } from 'react';
import { TournamentStatus, getStatusColor } from './statusColors';

// Animation configuration constants
export const ANIMATION_TIMING = {
  fast: 150,      // Quick transitions
  normal: 250,    // Standard transitions
  slow: 400,      // Smooth, deliberate transitions
  pulse: 1000,    // Pulse duration for urgent states
} as const;

export const EASING_CURVES = {
  easeInOut: Easing.inOut(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  bounce: Easing.bounce,
  spring: Easing.elastic(1.2),
} as const;

// Status change animation types
export type StatusAnimationType = 'fade' | 'scale' | 'slide' | 'color' | 'pulse' | 'highlight';
export type AnimationTiming = keyof typeof ANIMATION_TIMING;
export type EasingCurve = keyof typeof EASING_CURVES;

export interface StatusAnimationConfig {
  type: StatusAnimationType;
  duration?: AnimationTiming;
  easing?: EasingCurve;
  delay?: number;
  loop?: boolean;
}

// Create animated values for status transitions
export class StatusAnimationController {
  private animatedValue: Animated.Value;
  private colorAnimated: Animated.Value;
  private scaleAnimated: Animated.Value;
  private opacityAnimated: Animated.Value;
  private currentAnimation?: Animated.CompositeAnimation;

  constructor() {
    this.animatedValue = new Animated.Value(0);
    this.colorAnimated = new Animated.Value(0);
    this.scaleAnimated = new Animated.Value(1);
    this.opacityAnimated = new Animated.Value(1);
  }

  // Animate status transition
  animateStatusChange(
    fromStatus: TournamentStatus,
    toStatus: TournamentStatus,
    config: StatusAnimationConfig = { type: 'fade' }
  ): Promise<void> {
    return new Promise((resolve) => {
      // Stop any ongoing animation
      this.stop();

      const duration = ANIMATION_TIMING[config.duration || 'normal'];
      const easing = EASING_CURVES[config.easing || 'easeInOut'];

      let animation: Animated.CompositeAnimation;

      switch (config.type) {
        case 'fade':
          animation = this.createFadeAnimation(duration, easing);
          break;
        case 'scale':
          animation = this.createScaleAnimation(duration, easing);
          break;
        case 'slide':
          animation = this.createSlideAnimation(duration, easing);
          break;
        case 'color':
          animation = this.createColorAnimation(fromStatus, toStatus, duration, easing);
          break;
        case 'pulse':
          animation = this.createPulseAnimation(toStatus === 'emergency');
          break;
        case 'highlight':
          animation = this.createHighlightAnimation(duration, easing);
          break;
        default:
          animation = this.createFadeAnimation(duration, easing);
      }

      if (config.delay) {
        animation = Animated.sequence([
          Animated.delay(config.delay),
          animation,
        ]);
      }

      if (config.loop) {
        animation = Animated.loop(animation);
      }

      this.currentAnimation = animation;
      animation.start(({ finished }) => {
        if (finished) {
          resolve();
        }
      });
    });
  }

  // Create fade animation
  private createFadeAnimation(duration: number, easing: any): Animated.CompositeAnimation {
    this.opacityAnimated.setValue(1);
    
    return Animated.sequence([
      Animated.timing(this.opacityAnimated, {
        toValue: 0,
        duration: duration / 2,
        easing,
        useNativeDriver: false,
      }),
      Animated.timing(this.opacityAnimated, {
        toValue: 1,
        duration: duration / 2,
        easing,
        useNativeDriver: false,
      }),
    ]);
  }

  // Create scale animation
  private createScaleAnimation(duration: number, easing: any): Animated.CompositeAnimation {
    this.scaleAnimated.setValue(1);
    
    return Animated.sequence([
      Animated.timing(this.scaleAnimated, {
        toValue: 1.1,
        duration: duration / 2,
        easing,
        useNativeDriver: false,
      }),
      Animated.timing(this.scaleAnimated, {
        toValue: 1,
        duration: duration / 2,
        easing,
        useNativeDriver: false,
      }),
    ]);
  }

  // Create slide animation
  private createSlideAnimation(duration: number, easing: any): Animated.CompositeAnimation {
    this.animatedValue.setValue(0);
    
    return Animated.sequence([
      Animated.timing(this.animatedValue, {
        toValue: 1,
        duration: duration / 2,
        easing,
        useNativeDriver: false,
      }),
      Animated.timing(this.animatedValue, {
        toValue: 0,
        duration: duration / 2,
        easing,
        useNativeDriver: false,
      }),
    ]);
  }

  // Create color transition animation
  private createColorAnimation(
    fromStatus: TournamentStatus,
    toStatus: TournamentStatus,
    duration: number,
    easing: any
  ): Animated.CompositeAnimation {
    this.colorAnimated.setValue(0);
    
    return Animated.timing(this.colorAnimated, {
      toValue: 1,
      duration,
      easing,
      useNativeDriver: false, // Color animations can't use native driver
    });
  }

  // Create pulse animation for urgent states
  private createPulseAnimation(isEmergency: boolean = false): Animated.CompositeAnimation {
    this.scaleAnimated.setValue(1);
    this.opacityAnimated.setValue(1);
    
    const pulseScale = isEmergency ? 1.15 : 1.08;
    const pulseOpacity = isEmergency ? 0.7 : 0.8;
    
    return Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(this.scaleAnimated, {
            toValue: pulseScale,
            duration: ANIMATION_TIMING.pulse / 2,
            easing: EASING_CURVES.easeInOut,
            useNativeDriver: false,
          }),
          Animated.timing(this.opacityAnimated, {
            toValue: pulseOpacity,
            duration: ANIMATION_TIMING.pulse / 2,
            easing: EASING_CURVES.easeInOut,
            useNativeDriver: false,
          }),
        ]),
        Animated.parallel([
          Animated.timing(this.scaleAnimated, {
            toValue: 1,
            duration: ANIMATION_TIMING.pulse / 2,
            easing: EASING_CURVES.easeInOut,
            useNativeDriver: false,
          }),
          Animated.timing(this.opacityAnimated, {
            toValue: 1,
            duration: ANIMATION_TIMING.pulse / 2,
            easing: EASING_CURVES.easeInOut,
            useNativeDriver: false,
          }),
        ]),
      ])
    );
  }

  // Create highlight animation
  private createHighlightAnimation(duration: number, easing: any): Animated.CompositeAnimation {
    this.animatedValue.setValue(0);
    
    return Animated.sequence([
      Animated.timing(this.animatedValue, {
        toValue: 1,
        duration: duration / 3,
        easing,
        useNativeDriver: false,
      }),
      Animated.timing(this.animatedValue, {
        toValue: 0.3,
        duration: duration / 3,
        easing,
        useNativeDriver: false,
      }),
      Animated.timing(this.animatedValue, {
        toValue: 0,
        duration: duration / 3,
        easing,
        useNativeDriver: false,
      }),
    ]);
  }

  // Stop current animation
  stop(): void {
    if (this.currentAnimation) {
      this.currentAnimation.stop();
      this.currentAnimation = undefined;
    }
  }

  // Reset all animated values
  reset(): void {
    this.stop();
    this.animatedValue.setValue(0);
    this.colorAnimated.setValue(0);
    this.scaleAnimated.setValue(1);
    this.opacityAnimated.setValue(1);
  }

  // Get animated style objects
  getAnimatedStyles() {
    return {
      fade: {
        opacity: this.opacityAnimated,
      },
      scale: {
        transform: [{ scale: this.scaleAnimated }],
      },
      slide: {
        transform: [
          {
            translateX: this.animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 10],
            }),
          },
        ],
      },
      pulse: {
        transform: [{ scale: this.scaleAnimated }],
        opacity: this.opacityAnimated,
      },
      highlight: {
        backgroundColor: this.animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: ['transparent', '#FFD70040'], // Semi-transparent gold highlight
        }),
      },
    };
  }

  // Get interpolated color for color animations
  getInterpolatedColor(fromStatus: TournamentStatus, toStatus: TournamentStatus) {
    return this.colorAnimated.interpolate({
      inputRange: [0, 1],
      outputRange: [getStatusColor(fromStatus), getStatusColor(toStatus)],
    });
  }
}

// Utility functions for common status animations
export const statusAnimationPresets = {
  // Quick status update
  quickUpdate: {
    type: 'fade' as StatusAnimationType,
    duration: 'fast' as AnimationTiming,
    easing: 'easeOut' as EasingCurve,
  },
  
  // Smooth transition between statuses
  smoothTransition: {
    type: 'scale' as StatusAnimationType,
    duration: 'normal' as AnimationTiming,
    easing: 'easeInOut' as EasingCurve,
  },
  
  // Emergency alert animation
  emergencyAlert: {
    type: 'pulse' as StatusAnimationType,
    duration: 'slow' as AnimationTiming,
    easing: 'bounce' as EasingCurve,
    loop: true,
  },
  
  // Highlight for user attention
  attention: {
    type: 'highlight' as StatusAnimationType,
    duration: 'normal' as AnimationTiming,
    easing: 'easeInOut' as EasingCurve,
  },
  
  // Color morphing between statuses
  colorMorph: {
    type: 'color' as StatusAnimationType,
    duration: 'slow' as AnimationTiming,
    easing: 'easeInOut' as EasingCurve,
  },
  
  // Slide transition for status changes
  slideTransition: {
    type: 'slide' as StatusAnimationType,
    duration: 'normal' as AnimationTiming,
    easing: 'easeInOut' as EasingCurve,
  },
} as const;

// Hook-style animation utilities for React components
export const createStatusAnimation = (): StatusAnimationController => {
  return new StatusAnimationController();
};

// Batch animation for multiple status changes
export const animateMultipleStatusChanges = async (
  controllers: StatusAnimationController[],
  changes: Array<{
    fromStatus: TournamentStatus;
    toStatus: TournamentStatus;
    config?: StatusAnimationConfig;
  }>,
  sequence: boolean = false
): Promise<void> => {
  if (sequence) {
    // Animate in sequence
    for (let i = 0; i < changes.length; i++) {
      if (controllers[i]) {
        await controllers[i].animateStatusChange(
          changes[i].fromStatus,
          changes[i].toStatus,
          changes[i].config
        );
      }
    }
  } else {
    // Animate in parallel
    const animations = changes.map((change, index) => {
      if (controllers[index]) {
        return controllers[index].animateStatusChange(
          change.fromStatus,
          change.toStatus,
          change.config
        );
      }
      return Promise.resolve();
    });
    
    await Promise.all(animations);
  }
};

// Performance optimization helpers
export const optimizeAnimationPerformance = {
  // Use native driver when possible
  shouldUseNativeDriver: (animationType: StatusAnimationType): boolean => {
    return ['fade', 'scale', 'slide', 'pulse'].includes(animationType);
  },
  
  // Reduce animation complexity on lower-end devices
  getOptimizedConfig: (
    baseConfig: StatusAnimationConfig,
    devicePerformance: 'high' | 'medium' | 'low' = 'medium'
  ): StatusAnimationConfig => {
    if (devicePerformance === 'low') {
      return {
        ...baseConfig,
        type: 'fade', // Simplest animation
        duration: 'fast',
      };
    }
    
    if (devicePerformance === 'medium') {
      return {
        ...baseConfig,
        duration: baseConfig.duration === 'slow' ? 'normal' : baseConfig.duration,
      };
    }
    
    return baseConfig;
  },
};

export default StatusAnimationController;
// =============================================================================
// Live Score UX animation hooks (Story 002)
// =============================================================================
// These used to be built on `react-native-reanimated`. They are now built on
// React Native's own `Animated`, which ships inside react-native-web and is
// already bundled (issue #38): reanimated accounted for 176 modules and 544 KB
// of the web entry chunk while being used only by the five hooks below.
// The public shape of every hook is unchanged — each returns a style object
// that can be spread into an `Animated.View` style array.

/** Drives an Animated.Value through a sequence of timings, once per change. */
const useSequence = (
  run: (value: Animated.Value) => Animated.CompositeAnimation | null,
  initial: number,
  deps: any[]
) => {
  const value = React.useRef(new Animated.Value(initial)).current;

  useEffect(() => {
    const animation = run(value);
    if (!animation) return;
    animation.start();
    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
};

/**
 * Hook for animating score changes with bounce effect
 * Animates scale from 1.0 → 1.2 → 1.0 over 300ms
 */
export const useScoreChangeAnimation = (score: number | string, isLive: boolean = false) => {
  const previousScore = React.useRef(score);

  const scale = useSequence(
    (value) => {
      const changed = score !== previousScore.current;
      previousScore.current = score;
      if (!isLive || !changed || score === undefined || score === null) return null;
      return Animated.sequence([
        Animated.timing(value, { toValue: 1.2, duration: 150, useNativeDriver: false }),
        Animated.timing(value, { toValue: 1, duration: 150, useNativeDriver: false }),
      ]);
    },
    1,
    [score, isLive]
  );

  return { transform: [{ scale }] };
};

/**
 * Hook for live indicator pulsing animation
 * Creates a subtle pulsing effect for live status indicators
 */
export const useLiveIndicatorAnimation = (isLive: boolean) => {
  const opacity = useSequence(
    (value) => {
      if (!isLive) {
        return Animated.timing(value, { toValue: 0, duration: 300, useNativeDriver: false });
      }
      return Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 0.3, duration: 1000, useNativeDriver: false }),
          Animated.timing(value, { toValue: 1, duration: 1000, useNativeDriver: false }),
        ])
      );
    },
    isLive ? 1 : 0,
    [isLive]
  );

  return { opacity };
};

/**
 * Hook for match status change animations
 * Provides smooth transitions for status changes (Scheduled → Running → Finished)
 */
export const useStatusChangeAnimation = (status: string) => {
  const scale = useSequence(
    (value) =>
      Animated.sequence([
        Animated.timing(value, { toValue: 1.05, duration: 200, useNativeDriver: false }),
        Animated.timing(value, { toValue: 1, duration: 200, useNativeDriver: false }),
      ]),
    1,
    [status]
  );

  const opacity = useSequence(
    (value) =>
      Animated.sequence([
        Animated.timing(value, { toValue: 0.8, duration: 100, useNativeDriver: false }),
        Animated.timing(value, { toValue: 1, duration: 100, useNativeDriver: false }),
      ]),
    1,
    [status]
  );

  return { transform: [{ scale }], opacity };
};

/**
 * Hook for court assignment change animations
 * Animates when court assignments are updated
 */
export const useCourtChangeAnimation = (courtNumber: string | number) => {
  const translateY = useSequence(
    (value) => {
      if (!courtNumber) return null;
      return Animated.sequence([
        Animated.timing(value, { toValue: -5, duration: 150, useNativeDriver: false }),
        Animated.timing(value, { toValue: 0, duration: 150, useNativeDriver: false }),
      ]);
    },
    0,
    [courtNumber]
  );

  const opacity = useSequence(
    (value) => {
      if (!courtNumber) return null;
      return Animated.sequence([
        Animated.timing(value, { toValue: 0.7, duration: 150, useNativeDriver: false }),
        Animated.timing(value, { toValue: 1, duration: 150, useNativeDriver: false }),
      ]);
    },
    1,
    [courtNumber]
  );

  return { transform: [{ translateY }], opacity };
};

/**
 * Hook for loading state animations
 * Creates gentle fade animations for loading states
 */
export const useLoadingAnimation = (isLoading: boolean) => {
  const opacity = useSequence(
    (value) => {
      if (!isLoading) {
        return Animated.timing(value, { toValue: 1, duration: 300, useNativeDriver: false });
      }
      return Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 0.6, duration: 800, useNativeDriver: false }),
          Animated.timing(value, { toValue: 1, duration: 800, useNativeDriver: false }),
        ])
      );
    },
    isLoading ? 0.6 : 1,
    [isLoading]
  );

  return { opacity };
};

/**
 * Hook to detect the user's reduced motion preference.
 * Returns a `{ value }` container so existing call sites keep working.
 */
export const useReducedMotion = () => {
  const container = React.useRef({ value: false }).current;
  const [, forceUpdate] = React.useState(0);

  useEffect(() => {
    let cancelled = false;

    const apply = (enabled: boolean) => {
      if (cancelled || container.value === enabled) return;
      container.value = enabled;
      forceUpdate((n) => n + 1);
    };

    AccessibilityInfo.isReduceMotionEnabled()
      .then(apply)
      .catch(() => apply(false));

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', apply);

    return () => {
      cancelled = true;
      subscription?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return container;
};

/**
 * Conditionally apply an animated style depending on the reduced motion
 * preference. Returns a static (empty) style when reduced motion is on.
 */
export const withReducedMotionCheck = (normalAnimatedStyle: any, reducedMotion: boolean) => {
  return reducedMotion ? {} : normalAnimatedStyle;
};
