/**
 * useTouchFeedback Hook
 * Custom hook for touch feedback management with haptic, visual, and audio responses
 */

import { useRef, useCallback, useMemo } from 'react';
import { Animated, Vibration, Platform } from 'react-native';
import type {
  TouchFeedbackConfig,
  HapticFeedbackType,
  UseTouchFeedbackReturn,
} from '../types/touchTarget';

interface UseTouchFeedbackOptions {
  /**
   * Feedback configuration
   */
  hapticEnabled?: boolean;
  visualEnabled?: boolean;
  audioEnabled?: boolean;
  
  /**
   * Haptic settings
   */
  hapticType?: HapticFeedbackType;
  hapticIntensity?: number;
  
  /**
   * Visual settings
   */
  visualType?: 'opacity' | 'scale' | 'highlight' | 'ripple';
  visualDuration?: number;
  
  /**
   * Audio settings
   */
  audioType?: 'tap' | 'click' | 'success' | 'error' | 'warning';
  audioVolume?: number;
  
  /**
   * Performance settings
   */
  useNativeDriver?: boolean;
  enablePerformanceTracking?: boolean;
  
  /**
   * Custom feedback handlers
   */
  onHapticFeedback?: (type: HapticFeedbackType) => void;
  onVisualFeedback?: (animatedValue: Animated.Value) => void;
  onAudioFeedback?: (audioType: string) => void;
}

/**
 * Default touch feedback configuration
 */
const DEFAULT_TOUCH_FEEDBACK_OPTIONS: Required<UseTouchFeedbackOptions> = {
  hapticEnabled: true,
  visualEnabled: true,
  audioEnabled: false,
  hapticType: 'light',
  hapticIntensity: 0.8,
  visualType: 'opacity',
  visualDuration: 150,
  audioType: 'tap',
  audioVolume: 0.5,
  useNativeDriver: false,
  enablePerformanceTracking: false,
  onHapticFeedback: () => {},
  onVisualFeedback: () => {},
  onAudioFeedback: () => {},
};

/**
 * Custom hook for managing touch feedback with haptic, visual, and audio responses
 */
export const useTouchFeedback = (
  options: UseTouchFeedbackOptions = {}
): UseTouchFeedbackReturn => {
  const config = useMemo(() => ({
    ...DEFAULT_TOUCH_FEEDBACK_OPTIONS,
    ...options,
  }), [options]);
  
  // Animated values for visual feedback
  const opacityValue = useRef(new Animated.Value(1)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  
  // Performance tracking
  const performanceRef = useRef({
    hapticCount: 0,
    visualCount: 0,
    audioCount: 0,
    lastFeedbackTime: 0,
    averageResponseTime: 0,
  });
  
  // Haptic feedback patterns for different types
  const hapticPatterns = useMemo(() => {
    const baseIntensity = config.hapticIntensity * 100;
    
    return {
      light: Math.round(baseIntensity * 0.3),
      medium: Math.round(baseIntensity * 0.6),
      heavy: Math.round(baseIntensity * 1.0),
      selection: [Math.round(baseIntensity * 0.2), 20],
      warning: [Math.round(baseIntensity * 0.5), 50, Math.round(baseIntensity * 0.5)],
      error: [Math.round(baseIntensity * 0.8), 50, Math.round(baseIntensity * 0.8)],
      success: [Math.round(baseIntensity * 0.3), 20, Math.round(baseIntensity * 0.3)],
    } as const;
  }, [config.hapticIntensity]);
  
  // Trigger haptic feedback
  const triggerHapticFeedback = useCallback((type: HapticFeedbackType = config.hapticType) => {
    if (!config.hapticEnabled) return;
    
    const startTime = performance.now();
    
    try {
      const pattern = hapticPatterns[type];
      
      if (Platform.OS === 'ios') {
        // iOS haptic feedback - using basic vibration for now
        if (Array.isArray(pattern)) {
          Vibration.vibrate(pattern as number[]);
        } else {
          Vibration.vibrate(pattern);
        }
      } else if (Platform.OS === 'android') {
        // Android vibration patterns
        if (Array.isArray(pattern)) {
          Vibration.vibrate(pattern as number[]);
        } else {
          Vibration.vibrate(pattern);
        }
      }
      
      // Performance tracking
      if (config.enablePerformanceTracking) {
        performanceRef.current.hapticCount++;
        performanceRef.current.lastFeedbackTime = performance.now() - startTime;
      }
      
      // Custom handler
      config.onHapticFeedback(type);
      
    } catch (error) {
      // console.warn('useTouchFeedback: Haptic feedback failed', error);
    }
  }, [config.hapticEnabled, config.hapticType, config.enablePerformanceTracking, config.onHapticFeedback, hapticPatterns]);
  
  // Trigger visual feedback
  const triggerVisualFeedback = useCallback((type: typeof config.visualType = config.visualType) => {
    if (!config.visualEnabled) return;
    
    const startTime = performance.now();
    const animatedValue = type === 'scale' ? scaleValue : opacityValue;
    
    try {
      switch (type) {
        case 'opacity':
          Animated.sequence([
            Animated.timing(opacityValue, {
              toValue: 0.6,
              duration: config.visualDuration / 2,
              useNativeDriver: config.useNativeDriver,
            }),
            Animated.timing(opacityValue, {
              toValue: 1,
              duration: config.visualDuration / 2,
              useNativeDriver: config.useNativeDriver,
            }),
          ]).start();
          break;
          
        case 'scale':
          Animated.sequence([
            Animated.timing(scaleValue, {
              toValue: 0.95,
              duration: config.visualDuration / 2,
              useNativeDriver: config.useNativeDriver,
            }),
            Animated.timing(scaleValue, {
              toValue: 1,
              duration: config.visualDuration / 2,
              useNativeDriver: config.useNativeDriver,
            }),
          ]).start();
          break;
          
        case 'highlight':
          // Custom highlight animation - placeholder
          Animated.timing(opacityValue, {
            toValue: 0.8,
            duration: config.visualDuration,
            useNativeDriver: config.useNativeDriver,
          }).start(() => {
            Animated.timing(opacityValue, {
              toValue: 1,
              duration: config.visualDuration,
              useNativeDriver: config.useNativeDriver,
            }).start();
          });
          break;
          
        case 'ripple':
          // Ripple effect - placeholder
          Animated.timing(scaleValue, {
            toValue: 1.05,
            duration: config.visualDuration,
            useNativeDriver: config.useNativeDriver,
          }).start(() => {
            Animated.timing(scaleValue, {
              toValue: 1,
              duration: config.visualDuration,
              useNativeDriver: config.useNativeDriver,
            }).start();
          });
          break;
      }
      
      // Performance tracking
      if (config.enablePerformanceTracking) {
        performanceRef.current.visualCount++;
        performanceRef.current.lastFeedbackTime = performance.now() - startTime;
      }
      
      // Custom handler
      config.onVisualFeedback(animatedValue);
      
    } catch (error) {
      // console.warn('useTouchFeedback: Visual feedback failed', error);
    }
  }, [config.visualEnabled, config.visualType, config.visualDuration, config.useNativeDriver, config.enablePerformanceTracking, config.onVisualFeedback, opacityValue, scaleValue]);
  
  // Trigger audio feedback
  const triggerAudioFeedback = useCallback((type: typeof config.audioType = config.audioType) => {
    if (!config.audioEnabled) return;
    
    const startTime = performance.now();
    
    try {
      // Audio feedback implementation would go here
      // For now, this is a placeholder
      // console.log(`useTouchFeedback: Audio feedback - ${type} at volume ${config.audioVolume}`);
      
      // Performance tracking
      if (config.enablePerformanceTracking) {
        performanceRef.current.audioCount++;
        performanceRef.current.lastFeedbackTime = performance.now() - startTime;
      }
      
      // Custom handler
      config.onAudioFeedback(type);
      
    } catch (error) {
      // console.warn('useTouchFeedback: Audio feedback failed', error);
    }
  }, [config.audioEnabled, config.audioType, config.audioVolume, config.enablePerformanceTracking, config.onAudioFeedback]);
  
  // Touch event handlers
  const onPressIn = useCallback(() => {
    // Trigger haptic feedback on press start
    triggerHapticFeedback(config.hapticType);
    
    // Start visual feedback
    triggerVisualFeedback(config.visualType);
  }, [triggerHapticFeedback, triggerVisualFeedback, config.hapticType, config.visualType]);
  
  const onPressOut = useCallback(() => {
    // Reset visual feedback
    if (config.visualEnabled) {
      // Reset animations to initial state
      opacityValue.setValue(1);
      scaleValue.setValue(1);
    }
  }, [config.visualEnabled, opacityValue, scaleValue]);
  
  const onPress = useCallback(() => {
    // Audio feedback on successful press
    triggerAudioFeedback(config.audioType);
    
    // Additional haptic feedback for confirmation
    if (config.hapticType === 'selection') {
      triggerHapticFeedback('success');
    }
  }, [triggerAudioFeedback, triggerHapticFeedback, config.audioType, config.hapticType]);
  
  const onLongPress = useCallback(() => {
    // Special feedback for long press
    triggerHapticFeedback('heavy');
    triggerVisualFeedback('scale');
  }, [triggerHapticFeedback, triggerVisualFeedback]);
  
  // Create feedback configuration object
  const feedbackConfig: TouchFeedbackConfig = useMemo(() => ({
    haptic: {
      enabled: config.hapticEnabled,
      type: config.hapticType,
      intensity: config.hapticIntensity,
    },
    visual: {
      enabled: config.visualEnabled,
      type: config.visualType,
      duration: config.visualDuration,
    },
    audio: {
      enabled: config.audioEnabled,
      soundType: config.audioType,
      volume: config.audioVolume,
    },
  }), [config]);
  
  // Update feedback configuration
  const updateFeedbackConfig = useCallback((newConfig: Partial<TouchFeedbackConfig>) => {
    // This would update the configuration
    // For now, it's a placeholder since we're using immutable options
    // console.log('useTouchFeedback: Configuration update requested', newConfig);
  }, []);
  
  // Performance metrics getter
  const getPerformanceMetrics = useCallback(() => {
    if (!config.enablePerformanceTracking) return null;
    
    const metrics = performanceRef.current;
    return {
      ...metrics,
      totalFeedbackCount: metrics.hapticCount + metrics.visualCount + metrics.audioCount,
      averageResponseTime: metrics.lastFeedbackTime,
    };
  }, [config.enablePerformanceTracking]);
  
  // Animated style values for components
  const animatedStyles = useMemo(() => ({
    opacity: opacityValue,
    scale: scaleValue,
    transform: [{ scale: scaleValue }],
  }), [opacityValue, scaleValue]);
  
  return {
    onPressIn,
    onPressOut,
    onPress,
    onLongPress,
    feedbackConfig,
    updateFeedbackConfig,
    
    // Additional utilities
    triggerHapticFeedback,
    triggerVisualFeedback,
    triggerAudioFeedback,
    
    // Animated values for styling
    animatedValues: {
      opacity: opacityValue,
      scale: scaleValue,
    },
    animatedStyles,
    
    // Performance tracking
    ...(config.enablePerformanceTracking && {
      performanceMetrics: getPerformanceMetrics(),
    }),
  };
};

export default useTouchFeedback;