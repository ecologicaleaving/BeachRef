/**
 * CSS Variables Generator for Web Platform
 * Converts design tokens to CSS custom properties
 */

import { designTokens } from './tokens';

/**
 * Generates CSS custom properties from design tokens
 * Use this in a <style> tag or inject into document.documentElement
 */
export const generateCSSVariables = (): string => {
  const { brandBlue, neutrals, badgeColors, buttonTokens, linkTokens, focusRing, cardTokens, alertTokens, spacing } = designTokens;

  return `
    :root {
      /* Brand Blue Scale */
      --brand-900: ${brandBlue[900]};
      --brand-700: ${brandBlue[700]};
      --brand-600: ${brandBlue[600]};
      --brand-500: ${brandBlue[500]};
      --brand-300: ${brandBlue[300]};

      /* Neutrals */
      --bg-page: ${neutrals.bgPage};
      --bg-surface: ${neutrals.bgSurface};
      --border-subtle: ${neutrals.borderSubtle};
      --text-primary: ${neutrals.textPrimary};
      --text-secondary: ${neutrals.textSecondary};

      /* Badge Colors - LIVE */
      --badge-live-text: ${badgeColors.live.text};
      --badge-live-bg: ${badgeColors.live.background};
      --badge-live-dot: ${badgeColors.live.dot};

      /* Badge Colors - Scheduled */
      --badge-scheduled-text: ${badgeColors.scheduled.text};
      --badge-scheduled-bg: ${badgeColors.scheduled.background};

      /* Badge Colors - Completed */
      --badge-completed-text: ${badgeColors.completed.text};
      --badge-completed-bg: ${badgeColors.completed.background};

      /* Button - Primary */
      --button-primary-bg: ${buttonTokens.primary.background};
      --button-primary-bg-hover: ${buttonTokens.primary.backgroundHover};
      --button-primary-text: ${buttonTokens.primary.text};

      /* Button - Secondary */
      --button-secondary-bg: ${buttonTokens.secondary.background};
      --button-secondary-bg-hover: ${buttonTokens.secondary.backgroundHover};
      --button-secondary-border: ${buttonTokens.secondary.border};
      --button-secondary-text: ${buttonTokens.secondary.text};

      /* Button - Destructive */
      --button-destructive-bg: ${buttonTokens.destructive.background};
      --button-destructive-text: ${buttonTokens.destructive.text};
      --button-destructive-border: ${buttonTokens.destructive.border};

      /* Links */
      --link-default: ${linkTokens.default};
      --link-hover: ${linkTokens.hover};

      /* Focus Ring */
      --focus-ring-color: ${focusRing.color};
      --focus-ring-width: ${focusRing.width}px;

      /* Card */
      --card-border: ${cardTokens.border};
      --card-border-active: ${cardTokens.borderActive};
      --card-bg-hover: ${cardTokens.backgroundHover};
      --card-border-hover: ${cardTokens.borderHover};
      --card-shadow-sm: ${cardTokens.shadow.sm};
      --card-shadow-md: ${cardTokens.shadow.md};

      /* Alerts - Info */
      --alert-info-text: ${alertTokens.info.text};
      --alert-info-bg: ${alertTokens.info.background};
      --alert-info-border: ${alertTokens.info.border};

      /* Alerts - Success */
      --alert-success-text: ${alertTokens.success.text};
      --alert-success-bg: ${alertTokens.success.background};
      --alert-success-border: ${alertTokens.success.border};

      /* Alerts - Warning */
      --alert-warning-text: ${alertTokens.warning.text};
      --alert-warning-bg: ${alertTokens.warning.background};
      --alert-warning-border: ${alertTokens.warning.border};

      /* Alerts - Error */
      --alert-error-text: ${alertTokens.error.text};
      --alert-error-bg: ${alertTokens.error.background};
      --alert-error-border: ${alertTokens.error.border};

      /* Spacing */
      --spacing-xs: ${spacing.xs}px;
      --spacing-sm: ${spacing.sm}px;
      --spacing-md: ${spacing.md}px;
      --spacing-lg: ${spacing.lg}px;
      --spacing-xl: ${spacing.xl}px;
      --spacing-xxl: ${spacing.xxl}px;
    }
  `.trim();
};

/**
 * Injects CSS variables into the document (web only)
 * Call this once at app initialization
 */
export const injectCSSVariables = (): void => {
  if (typeof document === 'undefined') return; // Skip on native

  const styleId = 'design-tokens-css-variables';

  // Remove existing style tag if present
  const existing = document.getElementById(styleId);
  if (existing) {
    existing.remove();
  }

  // Create and inject new style tag
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = generateCSSVariables();
  document.head.appendChild(style);
};
