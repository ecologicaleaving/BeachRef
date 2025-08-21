/**
 * TouchFeedbackProvider
 * Consistent haptic, visual, and audio feedback system for touch interactions
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { 
  Animated, 
  Vibration, 
  Platform,
  AccessibilityInfo,
} from 'react-native';
import type {
  TouchFeedbackConfig,
  HapticFeedbackType,
  UseTouchFeedbackReturn,
} from '../../types/touchTarget';

// Default feedback configuration
const DEFAULT_FEEDBACK_CONFIG: TouchFeedbackConfig = {
  haptic: {
    enabled: true,
    type: 'light',
    intensity: 0.8,
    duration: 50,
  },
  visual: {
    enabled: true,
    type: 'opacity',
    duration: 150,
    color: 'rgba(255, 255, 255, 0.3)',
  },
  audio: {
    enabled: false,
    soundType: 'tap',
    volume: 0.5,
  },
};

interface TouchFeedbackContextType {
  feedbackConfig: TouchFeedbackConfig;
  updateFeedbackConfig: (config: Partial<TouchFeedbackConfig>) => void;
  triggerHapticFeedback: (type: HapticFeedbackType) => void;
  triggerVisualFeedback: (animatedValue: Animated.Value, config?: Partial<TouchFeedbackConfig['visual']>) => void;
  triggerAudioFeedback: (soundType?: string) => void;
  isReducedMotionEnabled: boolean;
  isHapticEnabled: boolean;
}

const TouchFeedbackContext = createContext<TouchFeedbackContextType | null>(null);

export interface TouchFeedbackProviderProps {
  children: React.ReactNode;
  initialConfig?: Partial<TouchFeedbackConfig>;
  respectSystemPreferences?: boolean;
}

/**
 * TouchFeedbackProvider provides consistent feedback across all touch interactions
 */
export const TouchFeedbackProvider: React.FC<TouchFeedbackProviderProps> = ({
  children,
  initialConfig,
  respectSystemPreferences = true,
}) => {
  const [feedbackConfig, setFeedbackConfig] = useState<TouchFeedbackConfig>(() => ({
    ...DEFAULT_FEEDBACK_CONFIG,
    ...initialConfig,
  }));
  
  const [systemPreferences, setSystemPreferences] = useState({
    isReducedMotionEnabled: false,
    isHapticEnabled: true,
  });
  
  // Load system accessibility preferences
  React.useEffect(() => {
    if (respectSystemPreferences) {
      // Check for reduced motion preference
      AccessibilityInfo.isReduceMotionEnabled().then((isEnabled) => {
        setSystemPreferences(prev => ({
          ...prev,
          isReducedMotionEnabled: isEnabled,
        }));
      });
      
      // Listen for accessibility changes
      const subscription = AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        (isEnabled) => {
          setSystemPreferences(prev => ({
            ...prev,
            isReducedMotionEnabled: isEnabled,
          }));
        }
      );
      
      return () => {
        subscription?.remove();
      };
    }
  }, [respectSystemPreferences]);
  
  // Update feedback configuration
  const updateFeedbackConfig = useCallback((newConfig: Partial<TouchFeedbackConfig>) => {
    setFeedbackConfig(prevConfig => ({
      haptic: { ...prevConfig.haptic, ...newConfig.haptic },
      visual: { ...prevConfig.visual, ...newConfig.visual },
      audio: { ...prevConfig.audio, ...newConfig.audio },
    }));
  }, []);
  
  // Trigger haptic feedback
  const triggerHapticFeedback = useCallback((type: HapticFeedbackType) => {
    if (!feedbackConfig.haptic.enabled || !systemPreferences.isHapticEnabled) {
      return;
    }
    
    try {
      if (Platform.OS === 'ios') {
        // iOS haptic feedback (requires expo-haptics or similar)
        // For now, using basic Vibration as fallback
        switch (type) {
          case 'light':
            Vibration.vibrate(20);
            break;
          case 'medium':
            Vibration.vibrate(40);
            break;
          case 'heavy':
            Vibration.vibrate(60);
            break;
          case 'selection':
            Vibration.vibrate([10, 20]);
            break;
          case 'warning':
            Vibration.vibrate([50, 50, 50]);
            break;
          case 'error':
            Vibration.vibrate([100, 50, 100]);
            break;
          case 'success':
            Vibration.vibrate([20, 20, 20]);
            break;
          default:
            Vibration.vibrate(feedbackConfig.haptic.duration || 50);
        }
      } else if (Platform.OS === 'android') {
        // Android vibration patterns
        const patterns: { [key in HapticFeedbackType]: number | number[] } = {
          light: 20,
          medium: 40,
          heavy: 60,
          selection: [10, 20],
          warning: [50, 50, 50],
          error: [100, 50, 100],
          success: [20, 20, 20],
        };
        
        const pattern = patterns[type];
        if (Array.isArray(pattern)) {
          Vibration.vibrate(pattern);
        } else {
          Vibration.vibrate(pattern);
        }
      }
    } catch (error) {
      // Silently fail if haptic feedback is not available
      // console.warn('TouchFeedbackProvider: Haptic feedback failed', error);
    }
  }, [feedbackConfig.haptic, systemPreferences.isHapticEnabled]);
  
  // Trigger visual feedback
  const triggerVisualFeedback = useCallback((
    animatedValue: Animated.Value,
    customConfig?: Partial<TouchFeedbackConfig['visual']>
  ) => {
    if (!feedbackConfig.visual.enabled || systemPreferences.isReducedMotionEnabled) {
      return;
    }
    
    const visualConfig = { ...feedbackConfig.visual, ...customConfig };
    const duration = visualConfig.duration;
    
    switch (visualConfig.type) {
      case 'opacity':
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 0.5,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ]).start();
        break;
        
      case 'scale':
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 0.95,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ]).start();
        break;
        
      case 'highlight':
        // Custom highlight animation (would need additional implementation)
        break;
        
      case 'ripple':
        // Ripple effect (would need additional implementation)
        break;
        
      default:
        // Default opacity animation
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 0.7,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ]).start();
    }
  }, [feedbackConfig.visual, systemPreferences.isReducedMotionEnabled]);
  
  // Trigger audio feedback
  const triggerAudioFeedback = useCallback((soundType?: string) => {
    if (!feedbackConfig.audio.enabled) {
      return;
    }
    
    // Audio feedback would require additional implementation with expo-av or similar
    // For now, this is a placeholder
    // console.log(`TouchFeedbackProvider: Audio feedback triggered - ${soundType || feedbackConfig.audio.soundType}`);
  }, [feedbackConfig.audio]);
  
  const contextValue: TouchFeedbackContextType = {
    feedbackConfig,
    updateFeedbackConfig,
    triggerHapticFeedback,
    triggerVisualFeedback,
    triggerAudioFeedback,
    isReducedMotionEnabled: systemPreferences.isReducedMotionEnabled,
    isHapticEnabled: systemPreferences.isHapticEnabled,
  };
  
  return (
    <TouchFeedbackContext.Provider value={contextValue}>
      {children}
    </TouchFeedbackContext.Provider>
  );
};

/**
 * Hook to access touch feedback functionality
 */
export const useTouchFeedback = (
  customConfig?: Partial<TouchFeedbackConfig>
): UseTouchFeedbackReturn => {
  const context = useContext(TouchFeedbackContext);
  
  if (!context) {
    throw new Error('useTouchFeedback must be used within a TouchFeedbackProvider');
  }
  
  const {
    feedbackConfig,
    updateFeedbackConfig,
    triggerHapticFeedback,
    triggerVisualFeedback,
    triggerAudioFeedback,
  } = context;
  
  // Merge custom config with provider config
  const mergedConfig = React.useMemo(() => ({
    ...feedbackConfig,
    ...(customConfig && {
      haptic: { ...feedbackConfig.haptic, ...customConfig.haptic },
      visual: { ...feedbackConfig.visual, ...customConfig.visual },
      audio: { ...feedbackConfig.audio, ...customConfig.audio },
    }),
  }), [feedbackConfig, customConfig]);
  
  // Animated values for visual feedback
  const opacityValue = useRef(new Animated.Value(1)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  
  // Touch event handlers with feedback
  const onPressIn = useCallback(() => {
    // Trigger haptic feedback on press start
    if (mergedConfig.haptic.enabled) {
      triggerHapticFeedback(mergedConfig.haptic.type);
    }
    
    // Start visual feedback
    if (mergedConfig.visual.enabled) {
      const animatedValue = mergedConfig.visual.type === 'scale' ? scaleValue : opacityValue;
      triggerVisualFeedback(animatedValue, mergedConfig.visual);
    }
  }, [mergedConfig, triggerHapticFeedback, triggerVisualFeedback, opacityValue, scaleValue]);
  
  const onPressOut = useCallback(() => {
    // Audio feedback on release (if enabled)
    if (mergedConfig.audio.enabled) {
      triggerAudioFeedback(mergedConfig.audio.soundType);
    }
  }, [mergedConfig.audio, triggerAudioFeedback]);
  
  const onPress = useCallback(() => {
    // Additional haptic feedback for successful press (if different from press-in)
    if (mergedConfig.haptic.enabled && mergedConfig.haptic.type === 'success') {
      triggerHapticFeedback('success');
    }
  }, [mergedConfig.haptic, triggerHapticFeedback]);
  
  const onLongPress = useCallback(() => {
    // Special feedback for long press
    if (mergedConfig.haptic.enabled) {
      triggerHapticFeedback('heavy');
    }
  }, [mergedConfig.haptic, triggerHapticFeedback]);
  
  return {
    onPressIn,
    onPressOut,
    onPress,
    onLongPress,
    feedbackConfig: mergedConfig,
    updateFeedbackConfig: (config) => {
      if (customConfig) {
        // Update only local config
        Object.assign(customConfig, config);
      } else {
        // Update provider config
        updateFeedbackConfig(config);
      }
    },
  };
};

export default TouchFeedbackProvider;