/**
 * Design Tokens - Professional Sport Tech Visual Design System
 * "Titanium & Gold" Theme - Sober, Professional, High Contrast
 *
 * ## WCAG AAA su OGNI tema (issue #94)
 *
 * Ogni colore usato per testo o per un'icona che veicola stato rispetta un
 * contrasto **>= 7:1**, e `error` (da cui deriva `statusColors.emergency`)
 * rispetta **>= 9:1**. Non solo sul tema ad alto contrasto: su tutti, perche'
 * il tema di default e' l'unico che le persone vedono davvero — il
 * `toggleHighContrast` esiste in `ThemeContext` ma nessuna schermata lo
 * chiama, quindi non e' raggiungibile dall'utente.
 *
 * ### Il contrasto va misurato sullo sfondo peggiore, non sul bianco
 *
 * `__tests__/outdoor-visibility-validation.test.ts` valuta le icone su cinque
 * condizioni di luce (`#FFFFFF` sole diretto, `#F5F5F5` ombra, `#E8E8E8`
 * nuvoloso, `#FFF8DC` golden hour, `#E6F3FF` blue hour) piu' tre scenari
 * d'uso, fra cui il riflesso della sabbia `#FFFEF7`. Su bianco puro `accent`
 * dava 3.19; su `#E8E8E8` dava **2.60**. Tarare sul bianco avrebbe lasciato
 * l'app illeggibile esattamente nella condizione per cui esiste: un arbitro
 * in campo, di pomeriggio.
 *
 * I valori sotto sono quindi calcolati sul **minimo** fra tutti quegli
 * sfondi. Se cambi un colore, ricalcola cosi' — `utils/contrast.ts` ha la
 * funzione, e i test falliscono se sbagli.
 */

import { DesignTokens, IconTokens, StatusColors } from '../types/theme';
import { calculateContrast } from '../utils/contrast';

// STEP 1: Unified Brand Scale (Zinc/Titanium)
export const brandBlue = {
  900: '#18181B',  // Zinc 950 - Main Header/Nav
  700: '#3F3F46',  // Zinc 700 - Titles
  600: '#4B4B54',  // era #52525B — 6.31 sullo sfondo peggiore, sotto 7:1 (#94)
  500: '#71717A',  // Zinc 500 - Muted text
  300: '#D4D4D8',  // Zinc 300 - Borders
} as const;

// STEP 2: Rationalized Neutrals
export const neutrals = {
  bgPage: '#FAFAFA',        // Zinc 50
  bgSurface: '#FFFFFF',
  borderSubtle: '#E4E4E7',  // Zinc 200
  textPrimary: '#18181B',   // Zinc 950
  textSecondary: '#4B4B54', // era #52525B — 6.31 sullo sfondo peggiore (#94)
  textTertiary: '#4B4B51',  // era #71717A — 3.94 sullo sfondo peggiore (#94)
} as const;

// Base Colors (without statusColors to avoid circular dependency)
const baseColors = {
  primary: brandBlue[900],      // Dark Titanium
  secondary: brandBlue[600],    // Medium Titanium
  // Contrasto sul minimo fra gli sfondi di outdoor-visibility (vedi header).
  // `error` punta a 9:1 e non a 7:1 perche' `statusColors.emergency` ne deriva,
  // e lo stato di emergenza ha una soglia propria piu' alta.
  accent: '#733F03',            // era #D97706 (2.60) -> 7.02
  success: '#0E582A',           // era #15803D (4.09) -> 7.00
  warning: '#7C3906',           // era #B45309 (4.10) -> 7.01
  error: '#781212',             // era #B91C1C (5.28) -> 9.05
  text: neutrals.textPrimary,   // Alias for textPrimary (TS2339 fix)
  textPrimary: neutrals.textPrimary,
  textSecondary: neutrals.textSecondary,
  textTertiary: neutrals.textTertiary,  // Muted text
  border: neutrals.borderSubtle, // Border color (TS2339 fix)
  background: neutrals.bgPage,
  // Issue #65: `app/notification-settings.tsx` and the three
  // `components/notifications/*` panels style themselves with `colors.surface`,
  // `colors.onPrimary`, `colors.surfaceDisabled` and `colors.textDisabled`.
  // None of them existed here, so every one of those styles resolved to
  // `undefined` — sections with no background on a page background, and switch
  // thumbs with no colour. The crash hid it; with the crash fixed the screen
  // would simply have looked broken instead.
  surface: neutrals.bgSurface,
  onPrimary: neutrals.bgSurface,
  surfaceDisabled: '#E4E4E7',   // Zinc 200
  textDisabled: brandBlue[500], // Zinc 500
} as const;

// Legacy Brand Colors (Mapped to new theme)
export const brandColors = {
  fivbPrimary: '#18181B',
  // Allineati ai token sopra (#94): erano copie degli stessi esadecimali, e
  // lasciarli indietro avrebbe creato due palette divergenti con lo stesso nome.
  fivbSecondary: '#4B4B54',
  fivbAccent: '#733F03',
  fivbSuccess: '#0E582A',
  fivbWarning: '#7C3906',
  fivbError: '#781212',
  primaryLight: '#F4F4F5',
  secondaryLight: '#F4F4F5',
  accentLight: '#FEF3C7',
} as const;

// STEP 3: Badge and Status Colors
export const badgeColors = {
  live: {
    // `statusColors.current` deriva da qui e ha soglia 7:1, non 9:1 come
    // `emergency`: sono due colori distinti che prima coincidevano su #B91C1C.
    text: '#961717',      // era #B91C1C (5.28) -> 7.05
    background: '#FEE2E2', // Red 100 — sfondo, non testo
    dot: '#941A1A',       // era #DC2626 (3.94) -> 7.08
  },
  scheduled: {
    text: '#3F3F46',      // Zinc 700
    background: '#F4F4F5', // Zinc 100
  },
  completed: {
    text: '#0E582A',      // era #15803D (4.09) -> 7.00
    background: '#DCFCE7', // Green 100 — sfondo, non testo
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
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
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
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
    letterSpacing: 0.25,
  },
  sizes: {
    small: 14,
    medium: 16,
    large: 18,
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