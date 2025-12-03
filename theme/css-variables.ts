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
  const { brandBlue, spacing, neutrals } = designTokens;

  return `
    :root {
      /* ============================================================ */
      /* STEP 1: PRIMITIVE TOKENS (mattoni/building blocks)          */
      /* ============================================================ */

      /* Brand Scale (Zinc/Titanium) */
      --brandBlue-900: ${brandBlue[900]};
      --brandBlue-700: ${brandBlue[700]};
      --brandBlue-600: ${brandBlue[600]};
      --brandBlue-500: ${brandBlue[500]};
      --brandBlue-300: ${brandBlue[300]};

      /* Neutrals */
      --neutral-50: ${neutrals.bgPage};
      --neutral-100: #F4F4F5;
      --neutral-200: ${neutrals.borderSubtle};
      --neutral-300: #D4D4D8;
      --neutral-500: #71717A;
      --neutral-700: ${brandBlue[700]};
      --neutral-900: ${neutrals.textPrimary};

      /* Stati */
      --red-500: #B91C1C;
      --red-50: #FEE2E2;
      --info-500: ${brandBlue[600]};
      --info-50: #F4F4F5;
      --green-500: #15803D;
      --green-50: #DCFCE7;
      --amber-600: #D97706; /* Accent */

      /* ============================================================ */
      /* STEP 2: SEMANTIC TOKENS (ruoli UI/UI roles)                 */
      /* ============================================================ */

      /* Semantic: Page & Surfaces */
      --bg-page: var(--neutral-50);
      --bg-surface: ${neutrals.bgSurface};
      --border-subtle: var(--neutral-200);

      /* Semantic: Text */
      --text-primary: var(--neutral-900);
      --text-secondary: ${neutrals.textSecondary};

      /* Semantic: Links */
      --link-default: var(--amber-600);
      --link-hover: #B45309;

      /* Semantic: Buttons - Primary */
      --button-primary-bg: var(--brandBlue-900);
      --button-primary-text: #FFFFFF;
      --button-primary-hover: var(--brandBlue-700);

      /* Semantic: Buttons - Secondary */
      --button-secondary-bg: #FFFFFF;
      --button-secondary-text: var(--brandBlue-900);
      --button-secondary-border: var(--neutral-200);
      --button-secondary-hover: #F4F4F5;

      /* Semantic: Buttons - Destructive */
      --button-destructive-bg: var(--red-50);
      --button-destructive-text: var(--red-500);
      --button-destructive-border: #FECACA;

      /* Semantic: States - LIVE */
      --state-live-text: var(--red-500);
      --state-live-bg: var(--red-50);
      --state-live-dot: #DC2626;

      /* Semantic: States - Scheduled */
      --state-scheduled-text: var(--brandBlue-700);
      --state-scheduled-bg: var(--info-50);

      /* Semantic: States - Completed */
      --state-completed-text: var(--green-500);
      --state-completed-bg: var(--green-50);

      /* Semantic: Cards */
      --card-border: var(--neutral-200);
      --card-border-active: var(--amber-600);
      --card-border-hover: var(--neutral-300);
      --card-bg-hover: #FAFAFA;
      --card-shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
      --card-shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);

      /* Semantic: Alerts - Info */
      --alert-info-text: var(--brandBlue-900);
      --alert-info-bg: #F4F4F5;
      --alert-info-border: var(--brandBlue-900);

      /* Semantic: Alerts - Success */
      --alert-success-text: var(--green-500);
      --alert-success-bg: var(--green-50);

      /* Semantic: Alerts - Warning */
      --alert-warning-text: #B45309;
      --alert-warning-bg: #FEF3C7;

      /* Semantic: Alerts - Error */
      --alert-error-text: var(--red-500);
      --alert-error-bg: var(--red-50);

      /* Semantic: Focus */
      --focus-ring: var(--amber-600);

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
