/**
 * CSS Variables Generator for Web Platform
 * Generates CSS custom properties from design tokens for use in web styles
 *
 * Structure:
 * 1. Primitive tokens (--brandBlue-900, --neutral-50, etc.)
 * 2. Semantic tokens (--bg-page, --text-primary, etc.) that reference primitives
 *
 * Rule: Components should ALWAYS use semantic tokens, never primitives directly
 */

import { designTokens } from './tokens';

/**
 * Generates CSS custom properties from design tokens
 * Following the primitive + semantic architecture from the design guide
 */
export const generateCSSVariables = (): string => {
  const { brandBlue, spacing } = designTokens;

  return `
    :root {
      /* ============================================================ */
      /* STEP 1: PRIMITIVE TOKENS (mattoni/building blocks)          */
      /* ============================================================ */

      /* Brand blues */
      --brandBlue-900: ${brandBlue[900]};
      --brandBlue-700: ${brandBlue[700]};
      --brandBlue-600: ${brandBlue[600]};
      --brandBlue-500: ${brandBlue[500]};
      --brandBlue-300: ${brandBlue[300]};

      /* Neutrals */
      --neutral-50: #FFFFFF;
      --neutral-100: #F7FAFE;
      --neutral-200: #E3ECF7;
      --neutral-300: #CFE3FA;
      --neutral-500: #90A4BF;
      --neutral-700: #5F6E86;
      --neutral-900: #0D1A2B;

      /* Stati */
      --red-500: #D92D20;
      --red-50: #FEE4E2;
      --info-500: #1F5AA6;
      --info-50: #E9F2FF;
      --green-500: #027A48;
      --green-50: #EAF7F0;

      /* ============================================================ */
      /* STEP 2: SEMANTIC TOKENS (ruoli UI/UI roles)                 */
      /* ============================================================ */

      /* Semantic: Page & Surfaces */
      --bg-page: var(--neutral-50);
      --bg-surface: var(--neutral-100);
      --border-subtle: var(--neutral-200);

      /* Semantic: Text */
      --text-primary: var(--neutral-900);
      --text-secondary: var(--neutral-700);

      /* Semantic: Links */
      --link-default: var(--brandBlue-500);
      --link-hover: var(--brandBlue-600);

      /* Semantic: Buttons - Primary */
      --button-primary-bg: var(--brandBlue-500);
      --button-primary-text: #FFFFFF;
      --button-primary-hover: var(--brandBlue-600);

      /* Semantic: Buttons - Secondary */
      --button-secondary-bg: var(--neutral-50);
      --button-secondary-text: var(--brandBlue-700);
      --button-secondary-border: var(--neutral-200);
      --button-secondary-hover: #F0F6FF;

      /* Semantic: Buttons - Destructive */
      --button-destructive-bg: var(--red-50);
      --button-destructive-text: #B42318;
      --button-destructive-border: #FAC5C3;

      /* Semantic: States - LIVE */
      --state-live-text: var(--red-500);
      --state-live-bg: var(--red-50);
      --state-live-dot: #EF4444;

      /* Semantic: States - Scheduled */
      --state-scheduled-text: var(--brandBlue-600);
      --state-scheduled-bg: var(--info-50);

      /* Semantic: States - Completed */
      --state-completed-text: var(--green-500);
      --state-completed-bg: var(--green-50);

      /* Semantic: Cards */
      --card-border: var(--neutral-200);
      --card-border-active: var(--brandBlue-600);
      --card-border-hover: var(--neutral-300);
      --card-bg-hover: #F0F6FF;
      --card-shadow-sm: 0 1px 2px rgba(13,26,43,0.06);
      --card-shadow-md: 0 4px 12px rgba(13,26,43,0.06);

      /* Semantic: Alerts - Info */
      --alert-info-text: var(--brandBlue-600);
      --alert-info-bg: var(--info-50);
      --alert-info-border: var(--brandBlue-600);

      /* Semantic: Alerts - Success */
      --alert-success-text: var(--green-500);
      --alert-success-bg: var(--green-50);

      /* Semantic: Alerts - Warning */
      --alert-warning-text: #B54708;
      --alert-warning-bg: #FFF4E5;

      /* Semantic: Alerts - Error */
      --alert-error-text: #B42318;
      --alert-error-bg: var(--red-50);

      /* Semantic: Focus */
      --focus-ring: var(--brandBlue-300);

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
