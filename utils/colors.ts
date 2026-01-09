/**
 * Color Utility Functions for React Native/Expo
 * WCAG AAA Compliant Color System for Tournament Referees
 */

import { colors, brandColors } from '../theme/tokens';
import { calculateContrast, getBestContrastColor } from './contrast';
import {
  getStatusColor as getNewStatusColor,
  getStatusColorWithText,
  TournamentStatus
} from './statusColors';

/**
 * Get a color value by semantic name
 */
export function getColor(colorName: keyof typeof colors): string {
  return colors[colorName];
}

/**
 * Get contrast-optimized text color for a given background
 */
export function getTextColor(backgroundColor: keyof typeof colors): string {
  const bgColor = colors[backgroundColor];
  
  // Use predefined text colors that we know meet contrast requirements
  if (backgroundColor === 'background') {
    return colors.textPrimary;
  }
  
  if (backgroundColor === 'primary' || backgroundColor === 'secondary') {
    return colors.background; // White text on dark backgrounds
  }
  
  // For accent colors, determine best contrast
  return getBestContrastColor(bgColor);
}

/**
 * Legacy status-driven color mapping for referee states (deprecated)
 * @deprecated Use tokenStatusColors and getNewStatusColor from statusColors.ts instead
 */
export const statusColors = {
  active: colors.success,      // Active/live match indicators
  upcoming: colors.warning,    // Upcoming assignments, alerts  
  completed: colors.textSecondary, // Completed assignments
  cancelled: colors.error,     // Cancelled matches, critical alerts
  primary: colors.primary,     // Primary actions
  accent: colors.accent,       // Call-to-action buttons
} as const;

export type StatusType = keyof typeof statusColors;

/**
 * Get color for specific referee status (legacy)
 * @deprecated Use getNewStatusColor from statusColors.ts instead
 */
export function getStatusColor(status: StatusType): string {
  return statusColors[status];
}

/**
 * Get appropriate text color for status backgrounds (legacy)
 * @deprecated Use getStatusColorWithText from statusColors.ts instead
 */
export function getStatusTextColor(status: StatusType): string {
  const statusColor = statusColors[status];
  return getBestContrastColor(statusColor);
}

/**
 * Enhanced status color system - Story 1.4 implementation
 * Get color for tournament status with WCAG AAA compliance
 */
export function getTournamentStatusColor(status: TournamentStatus): string {
  return getNewStatusColor(status);
}

/**
 * Get complete status styling with automatic contrast optimization
 */
export function getTournamentStatusStyle(status: TournamentStatus) {
  return getStatusColorWithText(status);
}

/**
 * Validate color combination meets WCAG AAA requirements
 */
export function validateColorCombination(
  foreground: string, 
  background: string
): { isValid: boolean; ratio: number; recommendation?: string } {
  const contrast = calculateContrast(foreground, background);
  
  if (contrast.wcagAAA) {
    return {
      isValid: true,
      ratio: contrast.ratio,
    };
  }
  
  return {
    isValid: false,
    ratio: contrast.ratio,
    recommendation: contrast.wcagAA 
      ? 'Meets WCAG AA but not AAA. Consider darker foreground or lighter background.'
      : 'Does not meet WCAG standards. Requires significant color adjustment.',
  };
}

/**
 * Get original FIVB brand color (for backgrounds and decorative use)
 */
export function getBrandColor(colorName: keyof typeof brandColors): string {
  return brandColors[colorName];
}

/**
 * Get WCAG-compliant color or original brand color based on context
 */
export function getAdaptiveColor(
  colorName: keyof typeof colors,
  useOriginalBrand: boolean = false
): string {
  if (!useOriginalBrand) {
    return colors[colorName];
  }

  // Map WCAG colors to original FIVB colors when appropriate
  const brandMapping: Partial<Record<keyof typeof colors, keyof typeof brandColors>> = {
    secondary: 'fivbSecondary',
    accent: 'fivbAccent', 
    success: 'fivbSuccess',
    warning: 'fivbWarning',
    error: 'fivbError',
  };

  const brandKey = brandMapping[colorName];
  return brandKey ? brandColors[brandKey] : colors[colorName];
}

/**
 * Color palette for debugging and development
 */
export const colorPalette = {
  ...colors,
  ...brandColors,
  // Additional semantic mappings
  success: colors.success,
  info: colors.secondary, 
  warning: colors.warning,
  danger: colors.error,
  light: colors.background,
  dark: colors.primary,
  muted: colors.textSecondary,
} as const;

/**
 * Generate style object for React Native components
 */
export function createColorStyle(
  colorName: keyof typeof colorPalette,
  property: 'color' | 'backgroundColor' = 'color'
) {
  return {
    [property]: colorPalette[colorName],
  };
}

/**
 * High contrast mode adjustments
 */
export function getHighContrastColor(
  colorName: keyof typeof colors,
  isHighContrastMode: boolean = false
): string {
  if (!isHighContrastMode) {
    return colors[colorName];
  }

  // In high contrast mode, make adjustments for maximum visibility
  const highContrastAdjustments: Partial<Record<keyof typeof colors, string>> = {
    textSecondary: colors.textPrimary, // Use primary text color for better visibility
    secondary: colors.primary,         // Use primary color for better visibility
  };

  return highContrastAdjustments[colorName] || colors[colorName];
}

/**
 * Color documentation for contrast ratios - FIVB Brand Colors
 */
export const colorContrastDocs = {
  'textPrimary on background': '10.98:1 (WCAG AAA)',
  'textSecondary on background': '7.67:1 (WCAG AAA)',
  'accent on background': '4.75:1 (WCAG AA+)',
  'success on background': '8.14:1 (WCAG AAA)', 
  'warning on background': '4.91:1 (WCAG AA+)',
  'error on background': '9.28:1 (WCAG AAA)',
  'background on primary': '12.12:1 (WCAG AAA)',
  'background on secondary': '8.40:1 (WCAG AAA)',
} as const;