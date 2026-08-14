/**
 * Icon System Utilities
 * Story 1.5: Outdoor-Optimized Iconography
 *
 * High-contrast, outdoor-visible icon system for tournament referees
 */

import { colors, statusColors, designTokens } from '../theme/tokens';
import { calculateContrast } from './contrast';

// Icon variant types for outdoor visibility
export type IconVariant = 'filled' | 'outlined' | 'rounded';
export type IconSize = 'small' | 'medium' | 'large';

// Icon sizing configuration (minimum 44px touch targets for large)
export const ICON_SIZES = {
  small: 24,   // Non-interactive icons
  medium: 32,  // Semi-interactive icons  
  large: 44,   // Interactive icons (touch target compliant)
} as const;

// Stroke width for outlined variants (consistent across family)
export const STROKE_WIDTHS = {
  small: 2,
  medium: 2.5,
  large: 3,
} as const;

// Icon categories for the referee tournament app
export type IconCategory = 
  | 'status'       // Tournament/match status indicators
  | 'navigation'   // App navigation icons
  | 'action'       // User action icons (edit, delete, etc.)
  | 'data'         // Data representation (charts, lists, etc.)
  | 'communication' // Communication icons (alerts, notifications)
  | 'utility';      // Utility functions (settings, help, etc.)

// Core icon mappings for tournament referee functionality
export const CORE_ICON_MAP = {
  // Status icons (matches StatusBadge requirements)
  status: {
    current: 'play-circle',      // Active/playing match
    upcoming: 'clock',           // Scheduled/upcoming match  
    completed: 'checkmark-circle', // Completed match
    cancelled: 'close-circle',   // Cancelled match
    emergency: 'warning',        // Emergency/urgent alert
  },
  
  // Navigation icons
  navigation: {
    home: 'home',
    tournaments: 'trophy',
    assignments: 'clipboard',
    schedule: 'calendar',
    settings: 'settings',
    back: 'chevron-back',
    forward: 'chevron-forward',
    menu: 'menu',
  },
  
  // Action icons
  action: {
    edit: 'pencil',
    delete: 'trash',
    add: 'add',
    refresh: 'refresh',
    share: 'share',
    filter: 'funnel',
    search: 'search',
    // Issue #49 — icone gia' referenziate da `ActionIcons` ma mai mappate:
    // `getIconName()` ripiegava su 'help-circle'.
    alert: 'alert-circle',
    assignment: 'clipboard',
    'chevron-right': 'chevron-forward',
    contact: 'person-circle',
    fast: 'flash',
    history: 'time',
    'live-score': 'pulse',
    match: 'tennisball',
    minus: 'remove',
    phone: 'call',
    player: 'person',
    plus: 'add',
    referee: 'people',
    results: 'trophy',
    serve: 'hand-left',
    stats: 'stats-chart',
    submit: 'checkmark-done',
    team: 'people-circle',
    undo: 'arrow-undo',
  },

  // Data icons
  data: {
    list: 'list',
    grid: 'grid',
    chart: 'bar-chart',
    stats: 'analytics',
    details: 'information-circle',
    // Issue #49 — vedi sopra.
    emergency: 'warning',
    health: 'medkit',
    info: 'information-circle',
    location: 'location',
    organization: 'business',
    person: 'person',
    phone: 'call',
    time: 'time',
  },
  
  // Communication icons
  communication: {
    notification: 'notifications',
    alert: 'alert-circle',
    message: 'mail',
    phone: 'call',
  },
  
  // Utility icons
  utility: {
    help: 'help-circle',
    info: 'information',
    external: 'open',
    download: 'download',
    upload: 'cloud-upload',
    // Issue #49 — vedi sopra.
    activity: 'pulse',
    check: 'checkmark',
    'chevron-down': 'chevron-down',
    close: 'close',
    refresh: 'refresh',
    security: 'shield-checkmark',
    settings: 'settings',
    warning: 'warning',
    weather: 'partly-sunny',
  },
} as const;

// Icon color themes for different contexts
export const ICON_COLOR_THEMES = {
  // Default theme using brand colors
  default: {
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
    muted: colors.textSecondary,
  },
  
  // Status-based coloring (integrates with Story 1.4)
  status: {
    current: statusColors.current,
    upcoming: statusColors.upcoming,
    completed: statusColors.completed,
    cancelled: statusColors.cancelled,
    emergency: statusColors.emergency,
  },
  
  // High-contrast theme for outdoor visibility
  highContrast: {
    primary: colors.textPrimary,      // Maximum contrast
    secondary: colors.primary,        // High contrast alternative
    accent: colors.error,             // Emergency visibility
    muted: colors.textSecondary,      // Subdued elements
  },
  
  // Accessibility theme for users with visual impairments
  accessibility: {
    primary: '#000000',    // Pure black for maximum contrast
    secondary: designTokens.neutrals.textPrimary,  // Dark gray
    // era #CC0000: 5.89 su bianco e 4.80 su #E8E8E8, sotto il 7:1 che questo
    // tema — quello pensato per chi ha una disabilita' visiva — pretende da
    // se' stesso (issue #94). Il tema piu' accessibile era il meno conforme.
    accent: '#9D0000',     // High contrast red -> 7.04 sullo sfondo peggiore
    muted: designTokens.neutrals.textSecondary,      // Medium gray
  },
} as const;

/**
 * Get icon name for specific category and function
 */
export function getIconName(category: IconCategory, iconKey: string): string {
  const categoryMap = CORE_ICON_MAP[category];
  if (!categoryMap || !(iconKey in categoryMap)) {
    // console.warn(`Icon not found: ${category}.${iconKey}`);
    return 'help-circle'; // Fallback icon
  }
  
  return (categoryMap as any)[iconKey];
}

/**
 * Get appropriate icon color with WCAG AAA compliance
 */
export function getIconColor(
  theme: keyof typeof ICON_COLOR_THEMES, 
  colorKey: string,
  backgroundColor: string = colors.background
): { 
  color: string; 
  contrastRatio: number; 
  wcagCompliant: boolean; 
} {
  const themeColors = ICON_COLOR_THEMES[theme];

  // Il ripiego era `themeColors.primary`, e **il tema `status` non ha
  // `primary`** (issue #111): le sue chiavi sono `current`, `upcoming`,
  // `completed`, `cancelled`, `emergency`. Con un `colorKey` che quel tema non
  // conosce, `iconColor` restava `undefined` e la riga sotto lo passava a
  // `calculateContrast`, che moriva con `Invalid hex color: undefined`.
  // Non un colore sbagliato: un'eccezione, quindi un'icona che fa cadere lo
  // schermo che la contiene.
  //
  // Il ripiego finale e' ora un colore che esiste per costruzione. Un'icona di
  // colore inatteso e' un difetto di aspetto; un'icona che solleva e' un
  // difetto di disponibilita', e i due non si scambiano.
  const iconColor: string =
    (themeColors as Record<string, string>)[colorKey] ||
    (themeColors as Record<string, string>).primary ||
    colors.textPrimary;

  const contrast = calculateContrast(iconColor, backgroundColor);
  
  return {
    color: iconColor,
    contrastRatio: contrast.ratio,
    wcagCompliant: contrast.wcagAAA, // 7:1 ratio required
  };
}

/**
 * Get optimal icon size based on context and accessibility requirements
 */
export function getIconSize(
  size: IconSize,
  isInteractive: boolean = false,
  isEmergency: boolean = false
): { 
  size: number; 
  strokeWidth: number; 
  touchTarget: number; 
} {
  // Annotati `number` di proposito: `ICON_SIZES` e `STROKE_WIDTHS` sono
  // `as const`, quindi l'inferenza li stringe ai letterali (`24 | 32 | 44`) e
  // le riassegnazioni qui sotto — 44 per il touch target, `* 1.2` per
  // l'emergenza — non ci rientrano. La funzione restituisce `number`: e' il
  // tipo della variabile che era troppo stretto, non il valore.
  let iconSize: number = ICON_SIZES[size];
  let strokeWidth: number = STROKE_WIDTHS[size];
  
  // Ensure interactive icons meet 44px touch target minimum
  if (isInteractive && iconSize < 44) {
    iconSize = 44;
    strokeWidth = STROKE_WIDTHS.large;
  }
  
  // Increase size for emergency visibility
  if (isEmergency) {
    iconSize = Math.max(iconSize * 1.2, 44);
    strokeWidth = strokeWidth * 1.2;
  }
  
  return {
    size: iconSize,
    strokeWidth,
    touchTarget: Math.max(iconSize, 44), // Always ensure 44px minimum touch target
  };
}

/**
 * Get variant-specific icon name for Ionicons
 */
export function getVariantIconName(baseName: string, variant: IconVariant): string {
  switch (variant) {
    case 'filled':
      return baseName; // Default Ionicons style is filled
    case 'outlined':
      return baseName.endsWith('-outline') ? baseName : `${baseName}-outline`;
    case 'rounded':
      // For rounded, use sharp variants when available or fallback to outline
      return baseName.endsWith('-sharp') ? baseName : `${baseName}-outline`;
    default:
      return baseName;
  }
}

/**
 * Generate icon style configuration for React Native
 */
export function getIconStyles(
  size: IconSize,
  theme: keyof typeof ICON_COLOR_THEMES,
  colorKey: string = 'primary',
  variant: IconVariant = 'outlined',
  isInteractive: boolean = false,
  isEmergency: boolean = false
) {
  const sizeConfig = getIconSize(size, isInteractive, isEmergency);
  const colorConfig = getIconColor(theme, colorKey);
  
  // Log warning if contrast is insufficient
  if (!colorConfig.wcagCompliant) {
    // console.warn(`Icon contrast insufficient: ${colorConfig.contrastRatio.toFixed(2)}:1 (requires 7:1)`);
  }
  
  // Variant-specific styling adjustments
  const getVariantStyles = (variant: IconVariant) => {
    switch (variant) {
      case 'filled':
        return {
          strokeWidth: 0,
          opacity: isEmergency ? 1.0 : 0.95, // Slight transparency for non-emergency filled icons
        };
      case 'outlined':
        return {
          strokeWidth: sizeConfig.strokeWidth,
          opacity: 1.0,
        };
      case 'rounded':
        return {
          strokeWidth: sizeConfig.strokeWidth * 0.8, // Slightly thinner for rounded appearance
          opacity: 1.0,
          borderRadius: sizeConfig.size * 0.2, // Rounded corners effect
        };
      default:
        return {
          strokeWidth: sizeConfig.strokeWidth,
          opacity: 1.0,
        };
    }
  };
  
  const variantStyles = getVariantStyles(variant);
  
  return {
    size: sizeConfig.size,
    color: colorConfig.color,
    strokeWidth: variantStyles.strokeWidth,
    variant,
    style: {
      width: sizeConfig.touchTarget,
      height: sizeConfig.touchTarget,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    accessibility: {
      accessible: true,
      accessibilityRole: isInteractive ? ('button' as const) : ('image' as const),
    },
    contrast: {
      ratio: colorConfig.contrastRatio,
      compliant: colorConfig.wcagCompliant,
    },
  };
}

/**
 * Icon preloading configuration for performance
 */
export const CRITICAL_ICONS = [
  'status.current',
  'status.upcoming', 
  'status.completed',
  'status.emergency',
  'navigation.home',
  'navigation.tournaments',
  'navigation.back',
  'communication.alert',
] as const;

/**
 * Validate icon accessibility and outdoor visibility
 */
export function validateIconAccessibility(
  iconColor: string,
  backgroundColor: string = colors.background,
  minContrastRatio: number = 7.0 // WCAG AAA requirement
): {
  isValid: boolean;
  contrastRatio: number;
  recommendations: string[];
} {
  const contrast = calculateContrast(iconColor, backgroundColor);
  const recommendations: string[] = [];
  
  if (contrast.ratio < minContrastRatio) {
    recommendations.push(`Increase contrast ratio to at least ${minContrastRatio}:1`);
    recommendations.push('Consider using highContrast or accessibility color theme');
  }
  
  if (contrast.ratio < 4.5) {
    recommendations.push('Icon may not be visible in direct sunlight');
    recommendations.push('Add outlined variant or background treatment');
  }
  
  return {
    isValid: contrast.ratio >= minContrastRatio,
    contrastRatio: contrast.ratio,
    recommendations,
  };
}

/**
 * Icon family consistency validation
 */
export function validateIconFamily(icons: Array<{
  size: number;
  strokeWidth: number;
  color: string;
}>): {
  isConsistent: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check stroke width consistency within size categories
  const strokeWidthsBySize = icons.reduce((acc, icon) => {
    const sizeCategory = icon.size <= 24 ? 'small' : icon.size <= 32 ? 'medium' : 'large';
    if (!acc[sizeCategory]) acc[sizeCategory] = [];
    acc[sizeCategory].push(icon.strokeWidth);
    return acc;
  }, {} as Record<string, number[]>);
  
  Object.entries(strokeWidthsBySize).forEach(([size, widths]) => {
    const uniqueWidths = [...new Set(widths)];
    if (uniqueWidths.length > 1) {
      issues.push(`Inconsistent stroke widths in ${size} icons: ${uniqueWidths.join(', ')}`);
    }
  });
  
  return {
    isConsistent: issues.length === 0,
    issues,
  };
}

export default {
  ICON_SIZES,
  STROKE_WIDTHS,
  CORE_ICON_MAP,
  ICON_COLOR_THEMES,
  CRITICAL_ICONS,
  getIconName,
  getIconColor,
  getIconSize,
  getIconStyles,
  validateIconAccessibility,
  validateIconFamily,
};