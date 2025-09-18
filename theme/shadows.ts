import { Platform, ViewStyle, TextStyle } from 'react-native';

/**
 * Cross-platform shadow utility for React Native and React Native Web
 * Provides consistent shadow styles that work on both native platforms and web
 */

export interface ShadowConfig {
  elevation?: number;
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
}

export interface TextShadowConfig {
  textShadowColor?: string;
  textShadowOffset?: { width: number; height: number };
  textShadowRadius?: number;
}

/**
 * Creates cross-platform shadow styles
 * @param config Shadow configuration
 * @returns ViewStyle object with appropriate shadow properties for each platform
 */
export const createShadow = (config: ShadowConfig): ViewStyle => {
  const {
    elevation = 2,
    shadowColor = '#000',
    shadowOffset = { width: 0, height: 1 },
    shadowOpacity = 0.1,
    shadowRadius = 2,
  } = config;

  return Platform.select({
    web: {
      // Use CSS box-shadow for web
      boxShadow: `${shadowOffset.width}px ${shadowOffset.height}px ${shadowRadius}px rgba(${
        shadowColor === '#000' ? '0, 0, 0' : shadowColor.replace('#', '')
      }, ${shadowOpacity})`,
    } as ViewStyle,
    default: {
      // Use only elevation for native platforms to avoid shadow* warnings
      elevation,
    },
  }) as ViewStyle;
};

/**
 * Creates cross-platform text shadow styles
 * @param config Text shadow configuration
 * @returns TextStyle object with appropriate text shadow properties for each platform
 */
export const createTextShadow = (config: TextShadowConfig): TextStyle => {
  const {
    textShadowColor = '#000',
    textShadowOffset = { width: 0, height: 0 },
    textShadowRadius = 2,
  } = config;

  return Platform.select({
    web: {
      // Use CSS text-shadow for web
      textShadow: `${textShadowOffset.width}px ${textShadowOffset.height}px ${textShadowRadius}px ${textShadowColor}`,
    } as TextStyle,
    default: {
      // For native platforms, disable text shadows to avoid warnings
      // (Text shadows on mobile can affect performance)
    },
  }) as TextStyle;
};

/**
 * Common shadow presets for consistent design
 */
export const shadowPresets = {
  none: createShadow({ shadowOpacity: 0, elevation: 0 }),

  subtle: createShadow({
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  }),

  small: createShadow({
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  }),

  medium: createShadow({
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  }),

  large: createShadow({
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  }),

  card: createShadow({
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  }),

  modal: createShadow({
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  }),
};