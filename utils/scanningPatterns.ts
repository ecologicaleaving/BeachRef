/**
 * Scanning Patterns - Typography Optimization for Referee Information Processing
 * Patterns designed for outdoor conditions and rapid information scanning
 */

import { TextStyle } from 'react-native';
import { colors } from '../theme/tokens';

/**
 * Scanning context types for different referee scenarios
 */
export type ScanningContext = 
  | 'quick-assignment-check'    // Rapid scan of current assignments
  | 'detailed-match-review'     // In-depth match information analysis  
  | 'peripheral-status-monitor' // Background monitoring of multiple statuses
  | 'critical-alert-response'   // Immediate attention to urgent information
  | 'schedule-overview'         // Scanning multiple time slots and courts
  | 'result-verification';      // Checking completed match results

/**
 * Information urgency levels for scanning prioritization
 */
export type UrgencyLevel = 'immediate' | 'urgent' | 'important' | 'routine';

/**
 * Scannable typography pattern configuration
 */
export interface ScannablePattern {
  primary: TextStyle;
  secondary: TextStyle; 
  tertiary: TextStyle;
  metadata: TextStyle;
  emphasis: TextStyle;
}

/**
 * Context-specific scanning patterns optimized for referee workflows
 */
export const scannablePatterns: Record<ScanningContext, ScannablePattern> = {
  'quick-assignment-check': {
    // Optimized for 2-second scan of assignment cards
    primary: {
      fontSize: 28,
      fontWeight: '800',
      lineHeight: 36,
      letterSpacing: 0.5,
      color: colors.textPrimary,
    },
    secondary: {
      fontSize: 20,
      fontWeight: '600', 
      lineHeight: 26,
      letterSpacing: 0.2,
      color: colors.textPrimary,
    },
    tertiary: {
      fontSize: 16,
      fontWeight: '500',
      lineHeight: 22,
      letterSpacing: 0.1,
      color: colors.textSecondary,
    },
    metadata: {
      fontSize: 13,
      fontWeight: '500',
      lineHeight: 18,
      letterSpacing: 0.3,
      color: colors.textSecondary,
      textTransform: 'uppercase',
    },
    emphasis: {
      fontSize: 32,
      fontWeight: '900',
      lineHeight: 40,
      letterSpacing: 0.8,
      color: colors.success,
    },
  },

  'detailed-match-review': {
    // Optimized for comprehensive match information reading
    primary: {
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 32,
      letterSpacing: 0.2,
      color: colors.textPrimary,
    },
    secondary: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 26,
      letterSpacing: 0.1,
      color: colors.textPrimary,
    },
    tertiary: {
      fontSize: 16,
      fontWeight: 'normal',
      lineHeight: 24,
      letterSpacing: 0,
      color: colors.textPrimary,
    },
    metadata: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
      letterSpacing: 0.25,
      color: colors.textSecondary,
    },
    emphasis: {
      fontSize: 20,
      fontWeight: '700',
      lineHeight: 28,
      letterSpacing: 0.3,
      color: colors.accent,
    },
  },

  'peripheral-status-monitor': {
    // Optimized for background awareness while focused on primary task
    primary: {
      fontSize: 22,
      fontWeight: 'bold',
      lineHeight: 26,
      letterSpacing: 1.0,
      color: colors.textPrimary,
    },
    secondary: {
      fontSize: 16,
      fontWeight: 'bold',
      lineHeight: 20,
      letterSpacing: 0.5,
      color: colors.textPrimary,
    },
    tertiary: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 18,
      letterSpacing: 0.3,
      color: colors.textSecondary,
    },
    metadata: {
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 16,
      letterSpacing: 0.5,
      color: colors.textSecondary,
      textTransform: 'uppercase',
    },
    emphasis: {
      fontSize: 26,
      fontWeight: '900',
      lineHeight: 30,
      letterSpacing: 1.2,
      color: colors.warning,
    },
  },

  'critical-alert-response': {
    // Optimized for maximum visibility and immediate attention
    primary: {
      fontSize: 36,
      fontWeight: '900',
      lineHeight: 44,
      letterSpacing: 1.0,
      color: colors.error,
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    secondary: {
      fontSize: 24,
      fontWeight: '800',
      lineHeight: 32,
      letterSpacing: 0.5,
      color: colors.textPrimary,
    },
    tertiary: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
      letterSpacing: 0.3,
      color: colors.textPrimary,
    },
    metadata: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 18,
      letterSpacing: 0.5,
      color: colors.textSecondary,
      textTransform: 'uppercase',
    },
    emphasis: {
      fontSize: 40,
      fontWeight: '900',
      lineHeight: 48,
      letterSpacing: 1.5,
      color: colors.error,
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
  },

  'schedule-overview': {
    // Optimized for scanning multiple time slots and courts efficiently
    primary: {
      fontSize: 18,
      fontWeight: '700',
      lineHeight: 24,
      letterSpacing: 0.2,
      color: colors.textPrimary,
    },
    secondary: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 22,
      letterSpacing: 0.1,
      color: colors.textPrimary,
    },
    tertiary: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
      letterSpacing: 0,
      color: colors.textSecondary,
    },
    metadata: {
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 16,
      letterSpacing: 0.4,
      color: colors.textSecondary,
      textTransform: 'uppercase',
    },
    emphasis: {
      fontSize: 20,
      fontWeight: '800',
      lineHeight: 26,
      letterSpacing: 0.4,
      color: colors.accent,
    },
  },

  'result-verification': {
    // Optimized for accuracy checking of completed matches
    primary: {
      fontSize: 22,
      fontWeight: '700',
      lineHeight: 30,
      letterSpacing: 0.1,
      color: colors.textPrimary,
    },
    secondary: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 26,
      letterSpacing: 0,
      color: colors.textPrimary,
    },
    tertiary: {
      fontSize: 16,
      fontWeight: 'normal',
      lineHeight: 24,
      letterSpacing: 0,
      color: colors.textPrimary,
    },
    metadata: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
      letterSpacing: 0.25,
      color: colors.textSecondary,
    },
    emphasis: {
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 32,
      letterSpacing: 0.2,
      color: colors.success,
    },
  },
};

/**
 * Get typography style based on scanning context and information level
 */
export function getScannableTypography(
  context: ScanningContext,
  level: keyof ScannablePattern
): TextStyle {
  return scannablePatterns[context][level];
}

/**
 * Urgency-based text emphasis system
 * Maps urgency levels to visual emphasis patterns
 */
export const urgencyEmphasis: Record<UrgencyLevel, {
  scale: number;
  weight: TextStyle['fontWeight'];
  color: string;
  spacing: number;
  shadow?: boolean;
}> = {
  immediate: {
    scale: 1.4,        // 40% larger
    weight: '900',
    color: colors.error,
    spacing: 1.2,
    shadow: true,
  },
  urgent: {
    scale: 1.2,        // 20% larger
    weight: '800',
    color: colors.warning,
    spacing: 0.8,
    shadow: false,
  },
  important: {
    scale: 1.1,        // 10% larger
    weight: '600',
    color: colors.accent,
    spacing: 0.4,
    shadow: false,
  },
  routine: {
    scale: 1.0,        // Normal size
    weight: 'normal',
    color: colors.textPrimary,
    spacing: 0,
    shadow: false,
  },
};

/**
 * Apply urgency emphasis to base typography style
 */
export function applyUrgencyEmphasis(
  baseStyle: TextStyle,
  urgency: UrgencyLevel
): TextStyle {
  const emphasis = urgencyEmphasis[urgency];
  
  return {
    ...baseStyle,
    fontSize: Math.round((baseStyle.fontSize || 16) * emphasis.scale),
    fontWeight: emphasis.weight,
    color: emphasis.color,
    letterSpacing: (baseStyle.letterSpacing || 0) + emphasis.spacing,
    ...(emphasis.shadow && {
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    }),
  };
}

/**
 * Peripheral vision optimization patterns
 * Designed for information that needs to be noticed without direct focus
 */
export const peripheralPatterns = {
  statusBadge: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    textAlign: 'center' as const,
  },
  
  alertBanner: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
    letterSpacing: 2.0,
    textTransform: 'uppercase' as const,
    paddingVertical: 16,
    textAlign: 'center' as const,
    backgroundColor: colors.error,
    color: colors.background,
  },
  
  quickIndicator: {
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 18,
    letterSpacing: 1.0,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 32,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
} as const;

/**
 * Get peripheral vision optimized style
 */
export function getPeripheralStyle(
  pattern: keyof typeof peripheralPatterns,
  urgency: UrgencyLevel = 'routine'
): TextStyle {
  const baseStyle = peripheralPatterns[pattern];
  return applyUrgencyEmphasis(baseStyle, urgency);
}

/**
 * Scanning efficiency metrics and validation
 */
export const scanningMetrics = {
  quickScan: {
    targetTime: 2000,      // 2 seconds
    maxElements: 5,        // Maximum scannable elements
    minFontSize: 16,       // Minimum readable font size
    optimalContrast: 7,    // WCAG AAA contrast ratio
  },
  
  detailScan: {
    targetTime: 8000,      // 8 seconds
    maxElements: 12,       // Maximum readable elements
    minFontSize: 14,       // Smaller text acceptable for details
    optimalContrast: 7,    // WCAG AAA contrast ratio
  },
  
  peripheralScan: {
    targetTime: 500,       // 500ms glance
    maxElements: 3,        // Very limited elements
    minFontSize: 18,       // Larger text for peripheral vision
    optimalContrast: 8,    // Higher contrast for peripheral
  },
} as const;

/**
 * Validate scanning pattern effectiveness
 */
export function validateScanningPattern(
  context: ScanningContext,
  elementCount: number,
  averageFontSize: number
): {
  isOptimal: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // Get appropriate metrics based on context
  let metrics;
  if (context.includes('quick') || context.includes('peripheral')) {
    metrics = scanningMetrics.peripheralScan;
  } else if (context.includes('detailed')) {
    metrics = scanningMetrics.detailScan;
  } else {
    metrics = scanningMetrics.quickScan;
  }
  
  // Validate element count
  if (elementCount > metrics.maxElements) {
    warnings.push(`Too many elements (${elementCount}) for ${context} context`);
    recommendations.push(`Reduce to ${metrics.maxElements} or fewer elements`);
  }
  
  // Validate font size
  if (averageFontSize < metrics.minFontSize) {
    warnings.push(`Font size (${averageFontSize}px) too small for optimal scanning`);
    recommendations.push(`Increase to minimum ${metrics.minFontSize}px`);
  }
  
  const isOptimal = warnings.length === 0;
  
  return { isOptimal, warnings, recommendations };
}