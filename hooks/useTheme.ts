/**
 * useTheme Hook - Easy access to design tokens
 * Provides type-safe access to the unified design system
 *
 * Usage:
 * const { brandBlue, neutrals, badgeColors, buttons, ... } = useTheme();
 *
 * Example:
 * <View style={{ backgroundColor: neutrals.bgSurface, borderColor: cardTokens.border }} />
 */

import { designTokens } from '../theme/tokens';

export interface Theme {
  // Brand colors
  brandBlue: typeof designTokens.brandBlue;
  neutrals: typeof designTokens.neutrals;

  // Legacy colors (for backward compatibility)
  colors: typeof designTokens.colors;
  brandColors: typeof designTokens.brandColors;
  statusColors: typeof designTokens.statusColors;

  // New unified tokens
  badgeColors: typeof designTokens.badgeColors;
  buttons: typeof designTokens.buttonTokens;
  links: typeof designTokens.linkTokens;
  focusRing: typeof designTokens.focusRing;
  cardTokens: typeof designTokens.cardTokens;
  alertTokens: typeof designTokens.alertTokens;

  // Layout
  spacing: typeof designTokens.spacing;
  typography: typeof designTokens.typography;
  iconTokens: typeof designTokens.iconTokens;
}

/**
 * Hook to access design tokens
 * Returns the complete theme object with all design tokens
 */
export const useTheme = (): Theme => {
  return {
    // Brand colors
    brandBlue: designTokens.brandBlue,
    neutrals: designTokens.neutrals,

    // Legacy colors
    colors: designTokens.colors,
    brandColors: designTokens.brandColors,
    statusColors: designTokens.statusColors,

    // New unified tokens
    badgeColors: designTokens.badgeColors,
    buttons: designTokens.buttonTokens,
    links: designTokens.linkTokens,
    focusRing: designTokens.focusRing,
    cardTokens: designTokens.cardTokens,
    alertTokens: designTokens.alertTokens,

    // Layout
    spacing: designTokens.spacing,
    typography: designTokens.typography,
    iconTokens: designTokens.iconTokens,
  };
};

/**
 * Helper hook to get CSS variable name for web platform
 * Returns the CSS variable string for use in web styles
 *
 * Example:
 * const bgVar = useCSSVar('bgSurface'); // Returns 'var(--bg-surface)'
 */
export const useCSSVar = (tokenName: string): string => {
  // Convert camelCase to kebab-case
  const cssVarName = tokenName.replace(/([A-Z])/g, '-$1').toLowerCase();
  return `var(--${cssVarName})`;
};
