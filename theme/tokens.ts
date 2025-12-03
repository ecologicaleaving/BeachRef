/**
 * Design Tokens - Professional Sport Tech Visual Design System
 * "Titanium & Gold" Theme - Sober, Professional, High Contrast
 */

import { DesignTokens, IconTokens, StatusColors } from '../types/theme';
import { calculateContrast } from '../utils/contrast';

// STEP 1: Unified Brand Scale (Zinc/Titanium)
export const brandBlue = {
  900: '#18181B',  // Zinc 950 - Main Header/Nav
  700: '#3F3F46',  // Zinc 700 - Titles
  600: '#52525B',  // Zinc 600 - Subtitles
  500: '#71717A',  // Zinc 500 - Muted text
  300: '#D4D4D8',  // Zinc 300 - Borders
} as const;

// STEP 2: Rationalized Neutrals
export const neutrals = {
  bgPage: '#FAFAFA',        // Zinc 50
  bgSurface: '#FFFFFF',
  borderSubtle: '#E4E4E7',  // Zinc 200
  textPrimary: '#18181B',   // Zinc 950
  textSecondary: '#52525B', // Zinc 600
} as const;

// Base Colors (without statusColors to avoid circular dependency)
const baseColors = {
  primary: brandBlue[900],      // Dark Titanium
  secondary: brandBlue[600],    // Medium Titanium
  accent: '#D97706',            // Amber 600 (Professional Gold)
  success: '#15803D',           // Green 700 (Sober Green)
  warning: '#B45309',           // Amber 700
  error: '#B91C1C',             // Red 700
  textPrimary: neutrals.textPrimary,
  textSecondary: neutrals.textSecondary,
  background: neutrals.bgPage,
} as const;

// Legacy Brand Colors (Mapped to new theme)
export const brandColors = {
  fivbPrimary: '#18181B',
  fivbSecondary: '#52525B',
  fivbAccent: '#D97706',
  fivbSuccess: '#15803D',
  fivbWarning: '#B45309',
  fivbError: '#B91C1C',
  primaryLight: '#F4F4F5',
  secondaryLight: '#F4F4F5',
  accentLight: '#FEF3C7',
} as const;

// STEP 3: Badge and Status Colors
export const badgeColors = {
  live: {
    text: '#B91C1C',      // Red 700
    background: '#FEE2E2', // Red 100
    dot: '#DC2626',       // Red 600
  },
  scheduled: {
    text: '#3F3F46',      // Zinc 700
    background: '#F4F4F5', // Zinc 100
  },
  completed: {
    text: '#15803D',      // Green 700
    background: '#DCFCE7', // Green 100
  },
} as const;

export const statusColors: StatusColors = {
  current: badgeColors.live.text,
  upcoming: badgeColors.scheduled.text,
  completed: badgeColors.completed.text,
  cancelled: baseColors.primary,
  emergency: baseColors.error,
} as const;

// Final Colors Object (including statusColors)
export const colors = {
  ...baseColors,
  statusColors,
} as const;

// Icon System Tokens
export const iconTokens: IconTokens = {
  sizes: {
    small: 24,
    medium: 32,
    large: 44,
  },
  strokeWidths: {
    small: 2,
    medium: 2.5,
    large: 3,
  },
  colors: {
    primary: colors.textPrimary,
    secondary: colors.secondary,
    accent: colors.accent,
    muted: colors.textSecondary,
    emergency: colors.error,
  },
  accessibility: {
    minimumContrastRatio: 7.0,
    minimumTouchTarget: 44,
  },
} as const;

// Typography Scale
export const typography = {
  hero: {
    fontSize: 40,
    fontWeight: '700' as const,
    lineHeight: 48,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.25,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: 0,
  },
  bodyLarge: {
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 28,
    letterSpacing: 0,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
    letterSpacing: 0.25,
  },
} as const;

// STEP 4: Buttons, Links, and Focus Rings
export const buttonTokens = {
  primary: {
    background: colors.primary,      // Zinc 950
    backgroundHover: colors.secondary, // Zinc 600
    text: '#FFFFFF',
  },
  secondary: {
    background: '#FFFFFF',
    backgroundHover: '#F4F4F5',
    border: neutrals.borderSubtle,
    text: colors.primary,
  },
  destructive: {
    background: '#FEE2E2',
    text: '#B91C1C',
    border: '#FECACA',
    backgroundHover: '#FECACA', // Added missing property
  },
} as const;

export const linkTokens = {
  default: colors.accent,    // Amber 600
  hover: '#B45309',          // Amber 700
} as const;

export const focusRing = {
  color: colors.accent,
  width: 2,
  style: 'solid' as const,
} as const;

// STEP 5: Card Borders and Shadows
export const cardTokens = {
  border: neutrals.borderSubtle,
  borderActive: colors.accent,
  backgroundHover: '#FAFAFA',
  borderHover: '#D4D4D8',
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
  },
} as const;

// STEP 6: Semantic Tokens for Messages/Alerts
export const alertTokens = {
  info: {
    text: colors.primary,
    background: '#F4F4F5',
    border: colors.primary,
  },
  success: {
    text: '#15803D',
    background: '#DCFCE7',
    border: '#15803D',
  },
  warning: {
    text: '#B45309',
    background: '#FEF3C7',
    border: '#B45309',
  },
  error: {
    text: '#B91C1C',
    background: '#FEE2E2',
    border: '#B91C1C',
  },
} as const;

// Spacing Scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  // Aliases and additional tokens required by SpacingToken interface
  xsmall: 4,
  extraSmall: 4,
  small: 8,
  medium: 16,
  large: 24,
  extraLarge: 32,
  borderRadius: 8,
} as const;

// Contrast Validation
export const contrast = {
  textPrimary: {
    onBackground: calculateContrast(colors.textPrimary, colors.background),
    onPrimary: calculateContrast(colors.textPrimary, colors.primary),
    onSecondary: calculateContrast(colors.textPrimary, colors.secondary),
  },
  textSecondary: {
    onBackground: calculateContrast(colors.textSecondary, colors.background),
    onPrimary: calculateContrast(colors.textSecondary, colors.primary),
    onSecondary: calculateContrast(colors.textSecondary, colors.secondary),
  },
  accent: {
    onBackground: calculateContrast(colors.accent, colors.background),
    onPrimary: calculateContrast(colors.accent, colors.primary),
    onSecondary: calculateContrast(colors.accent, colors.secondary),
  },
  success: {
    onBackground: calculateContrast(colors.success, colors.background),
    onPrimary: calculateContrast(colors.success, colors.primary),
    onSecondary: calculateContrast(colors.success, colors.secondary),
  },
  warning: {
    onBackground: calculateContrast(colors.warning, colors.background),
    onPrimary: calculateContrast(colors.warning, colors.primary),
    onSecondary: calculateContrast(colors.warning, colors.secondary),
  },
  error: {
    onBackground: calculateContrast(colors.error, colors.background),
    onPrimary: calculateContrast(colors.error, colors.primary),
    onSecondary: calculateContrast(colors.error, colors.secondary),
  },
  statusCurrent: {
    onBackground: calculateContrast(statusColors.current, colors.background),
    onPrimary: calculateContrast(statusColors.current, colors.primary),
    onSecondary: calculateContrast(statusColors.current, colors.secondary),
  },
  statusUpcoming: {
    onBackground: calculateContrast(statusColors.upcoming, colors.background),
    onPrimary: calculateContrast(statusColors.upcoming, colors.primary),
    onSecondary: calculateContrast(statusColors.upcoming, colors.secondary),
  },
  statusCompleted: {
    onBackground: calculateContrast(statusColors.completed, colors.background),
    onPrimary: calculateContrast(statusColors.completed, colors.primary),
    onSecondary: calculateContrast(statusColors.completed, colors.secondary),
  },
  statusCancelled: {
    onBackground: calculateContrast(statusColors.cancelled, colors.background),
    onPrimary: calculateContrast(statusColors.cancelled, colors.primary),
    onSecondary: calculateContrast(statusColors.cancelled, colors.secondary),
  },
  statusEmergency: {
    onBackground: calculateContrast(statusColors.emergency, colors.background),
    onPrimary: calculateContrast(statusColors.emergency, colors.primary),
    onSecondary: calculateContrast(statusColors.emergency, colors.secondary),
  },
};

export const designTokens: DesignTokens = {
  colors,
  brandColors,
  brandBlue,
  neutrals,
  statusColors,
  badgeColors,
  buttonTokens,
  linkTokens,
  focusRing,
  cardTokens,
  alertTokens,
  iconTokens,
  typography,
  spacing,
  contrast,
} as const;

export const validateAllContrasts = (): boolean => {
  const results: boolean[] = [];

  Object.values(contrast).forEach(colorContrast => {
    Object.values(colorContrast).forEach(contrastData => {
      results.push(contrastData.wcagAAA);
      if (!contrastData.wcagAAA) {
        console.warn(`Contrast ratio ${contrastData.ratio.toFixed(2)} does not meet WCAG AAA (7:1) requirements`);
      }
    });
  });

  const allPass = results.every(result => result);

  if (allPass) {
    console.log('✅ All color combinations meet WCAG AAA (7:1) contrast requirements');
  } else {
    console.error('❌ Some color combinations do not meet WCAG AAA requirements');
  }

  return allPass;
};