/**
 * Design Token Type Definitions
 * Outdoor-Optimized Visual Design System
 */

export interface ColorToken {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled?: string;
  background: string;
  // Additional color properties
  surfacePrimary?: string;
  surfaceSecondary?: string;
  surfaceDisabled?: string;
  /** Card/section background, one step above `background`. */
  surface?: string;
  /** Foreground that sits on top of `primary` (button labels, switch thumbs). */
  onPrimary?: string;
  border?: string;
  text?: string;
  textTertiary?: string;  // Tertiary text color for muted content
  shadows?: string;
}

export interface BrandColors {
  fivbPrimary: string;
  fivbSecondary: string;
  fivbAccent: string;
  fivbSuccess: string;
  fivbWarning: string;
  fivbError: string;
  primaryLight: string;
  secondaryLight: string;
  accentLight: string;
}

export interface ColorContrast {
  ratio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
}

export interface ContrastValidation {
  [key: string]: {
    onBackground: ColorContrast;
    onPrimary: ColorContrast;
    onSecondary: ColorContrast;
  };
}

export interface TypographyToken {
  fontSize: number;
  fontWeight: string;
  lineHeight: number;
  letterSpacing?: number;
}

export interface TypographyScale {
  hero: TypographyToken;
  h1: TypographyToken;
  h2: TypographyToken;
  h3: TypographyToken;
  bodyLarge: TypographyToken;
  body: TypographyToken;
  bodySmall: TypographyToken;
  caption: TypographyToken;
  fontFamily?: string;  // Default font family (TS2339 fix)
  sizes: {
    small: number;
    medium: number;
    large: number;
  };
}

export interface SpacingToken {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  // Aliases for common usage
  xsmall: number;
  extraSmall: number; // Alias for xs
  small: number;
  medium: number;
  large: number;
  extraLarge: number;
  borderRadius: number;
}

// Status-specific color mappings for tournament referees
export interface StatusColors {
  current: string;      // Current/Active assignments (High-visibility alert orange)
  upcoming: string;     // Upcoming assignments (Professional blue)
  completed: string;    // Completed assignments (Success green)
  cancelled: string;    // Cancelled/Changed assignments (Warning indicators)
  emergency: string;    // Emergency/Urgent states (Maximum visibility)
}

// Icon system configuration for outdoor visibility
export interface IconTokens {
  sizes: {
    small: number;    // 24px - Non-interactive icons
    medium: number;   // 32px - Semi-interactive icons
    large: number;    // 44px - Interactive icons (touch target compliant)
  };
  strokeWidths: {
    small: number;    // Stroke width for small outlined icons
    medium: number;   // Stroke width for medium outlined icons
    large: number;    // Stroke width for large outlined icons
  };
  colors: {
    primary: string;      // Primary icon color
    secondary: string;    // Secondary icon color
    accent: string;       // Accent icon color
    muted: string;        // Muted/disabled icon color
    emergency: string;    // Emergency state icon color
  };
  accessibility: {
    minimumContrastRatio: number;  // WCAG AAA requirement (7:1)
    minimumTouchTarget: number;    // Minimum interactive icon size (44px)
  };
}

// New unified design system tokens
export interface BrandBlueScale {
  900: string;
  700: string;
  600: string;
  500: string;
  300: string;
}

export interface NeutralColors {
  bgPage: string;
  bgSurface: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary?: string;  // Muted/tertiary text color
}

export interface BadgeColorSet {
  text: string;
  background: string;
  dot?: string;
}

export interface BadgeColors {
  live: BadgeColorSet;
  scheduled: BadgeColorSet;
  completed: BadgeColorSet;
}

export interface ButtonColorSet {
  background: string;
  backgroundHover: string;
  text: string;
  border?: string;
}

export interface ButtonTokens {
  primary: ButtonColorSet;
  secondary: ButtonColorSet;
  destructive: ButtonColorSet;
}

export interface LinkTokens {
  default: string;
  hover: string;
}

export interface FocusRing {
  color: string;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
}

export interface CardTokens {
  border: string;
  borderActive: string;
  backgroundHover: string;
  borderHover: string;
  shadow: {
    sm: string;
    md: string;
  };
}

export interface AlertColorSet {
  text: string;
  background: string;
  border: string;
}

export interface AlertTokens {
  info: AlertColorSet;
  success: AlertColorSet;
  warning: AlertColorSet;
  error: AlertColorSet;
}

export interface DesignTokens {
  colors: ColorToken;
  brandColors: BrandColors;
  brandBlue: BrandBlueScale;
  neutrals: NeutralColors;
  statusColors: StatusColors;
  badgeColors: BadgeColors;
  buttonTokens: ButtonTokens;
  linkTokens: LinkTokens;
  focusRing: FocusRing;
  cardTokens: CardTokens;
  alertTokens: AlertTokens;
  iconTokens: IconTokens;
  typography: TypographyScale;
  spacing: SpacingToken;
  contrast: ContrastValidation;
}

export interface ThemeContextType {
  tokens: DesignTokens;
  isHighContrastMode: boolean;
  toggleHighContrast: () => void;
}