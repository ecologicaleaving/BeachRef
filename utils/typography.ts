/**
 * Typography Utilities - Hierarchical Typography System
 * Scanning optimization functions for outdoor referee environments
 */

import { Dimensions, PixelRatio } from 'react-native';
import { typography } from '../theme/tokens';

/**
 * Typography variants for semantic component creation
 */
export type TypographyVariant = keyof typeof typography;

/**
 * Information hierarchy levels for referee scanning
 */
export type InformationHierarchy = 'primary' | 'secondary' | 'tertiary';

/**
 * Emphasis levels for urgent vs. routine information
 */
export type EmphasisLevel = 'critical' | 'high' | 'medium' | 'low';

/**
 * Responsive typography scaling based on device size and pixel density
 * Optimizes for outdoor readability conditions
 */
export function getResponsiveTypography(variant: TypographyVariant, options?: {
  emphasis?: EmphasisLevel;
  hierarchy?: InformationHierarchy;
}) {
  const baseTypography = typography[variant];
  const { width } = Dimensions.get('window');
  const pixelRatio = PixelRatio.get();

  // Device size categories for responsive scaling
  const isSmallDevice = width < 375;
  const isLargeDevice = width >= 414;
  
  // Base scaling factors
  let scaleFactor = 1;
  
  // Adjust scaling based on device size
  if (isSmallDevice) {
    scaleFactor = 0.95; // Slightly smaller on small devices
  } else if (isLargeDevice) {
    scaleFactor = 1.05; // Slightly larger on large devices
  }
  
  // Adjust scaling based on pixel ratio for high-density screens
  if (pixelRatio >= 3) {
    scaleFactor *= 1.02; // Slight increase for retina displays
  }
  
  // Emphasis-based adjustments for outdoor visibility
  const emphasisAdjustments: Record<EmphasisLevel, number> = {
    critical: 1.15, // 15% larger for critical information
    high: 1.08,     // 8% larger for high priority
    medium: 1,      // No change for medium priority
    low: 0.95,      // 5% smaller for low priority
  };
  
  // Hierarchy-based adjustments for scanning patterns
  const hierarchyAdjustments: Record<InformationHierarchy, number> = {
    primary: 1.1,   // 10% larger for primary focus
    secondary: 1,   // No change for secondary focus
    tertiary: 0.92, // 8% smaller for tertiary focus
  };
  
  const emphasisFactor = options?.emphasis ? emphasisAdjustments[options.emphasis] : 1;
  const hierarchyFactor = options?.hierarchy ? hierarchyAdjustments[options.hierarchy] : 1;
  
  const finalScaleFactor = scaleFactor * emphasisFactor * hierarchyFactor;
  
  return {
    fontSize: Math.round(baseTypography.fontSize * finalScaleFactor),
    fontWeight: baseTypography.fontWeight,
    lineHeight: Math.round(baseTypography.lineHeight * finalScaleFactor),
    letterSpacing: baseTypography.letterSpacing,
  };
}

/**
 * Line height optimization for outdoor readability
 * Ensures proper spacing for quick scanning
 */
export function getOptimizedLineHeight(fontSize: number, variant: TypographyVariant): number {
  const baseLineHeight = typography[variant].lineHeight;

  // Outdoor readability optimizations
  if (variant === 'hero' || variant === 'h1') {
    // Headings need tighter line height (1.2-1.3)
    return Math.max(Math.round(fontSize * 1.25), baseLineHeight);
  } else {
    // Body text needs looser line height (1.4-1.6) for scanning
    return Math.max(Math.round(fontSize * 1.5), baseLineHeight);
  }
}

/**
 * Letter spacing optimization for sunlight conditions
 */
export function getOptimizedLetterSpacing(
  fontSize: number, 
  variant: TypographyVariant, 
  emphasis?: EmphasisLevel
): number {
  const baseLetterSpacing = typography[variant].letterSpacing;
  
  // Increase letter spacing for better outdoor readability
  let adjustment = 0;
  
  if (emphasis === 'critical') {
    adjustment = 0.3; // Increase spacing for critical text
  } else if (emphasis && (variant === 'caption' || variant === 'body')) {
    adjustment = 0.1; // Slight increase for smaller text only when emphasis is applied
  }
  
  return baseLetterSpacing + adjustment;
}

/**
 * Font weight mapping for emphasis systems
 */
export const emphasisFontWeights: Record<EmphasisLevel, 'normal' | 'bold' | '500' | '600'> = {
  critical: 'bold',
  high: '600',
  medium: '500',
  low: 'normal',
};

/**
 * Get font weight based on emphasis level
 */
export function getEmphasisFontWeight(
  baseWeight: string, 
  emphasis?: EmphasisLevel
): 'normal' | 'bold' | '500' | '600' {
  if (!emphasis) return baseWeight as any;
  return emphasisFontWeights[emphasis];
}

/**
 * Minimum touch target sizing for outdoor conditions
 * Ensures interactive text elements meet accessibility requirements
 */
export function getTouchTargetDimensions(variant: TypographyVariant): {
  minHeight: number;
  minWidth: number;
  paddingVertical: number;
  paddingHorizontal: number;
} {
  const fontSize = typography[variant].fontSize;
  
  // WCAG AAA minimum touch target is 44px
  const minTouchTarget = 44;
  
  // Calculate padding needed to reach minimum touch target
  const paddingVertical = Math.max(0, (minTouchTarget - fontSize) / 2);
  const paddingHorizontal = Math.max(8, paddingVertical); // At least 8px horizontal padding
  
  return {
    minHeight: Math.max(minTouchTarget, fontSize + (paddingVertical * 2)),
    minWidth: minTouchTarget,
    paddingVertical,
    paddingHorizontal,
  };
}

/**
 * Typography patterns for different scanning scenarios
 */
export const scanningPatterns = {
  quickScan: {
    // For rapid information scanning (assignment cards)
    primaryWeight: 'bold',
    secondaryWeight: '500',
    tertiaryWeight: 'normal',
    spacing: 'loose', // Increased line height
  },
  detailScan: {
    // For detailed information reading (match details)
    primaryWeight: '600',
    secondaryWeight: '500',
    tertiaryWeight: 'normal',
    spacing: 'normal',
  },
  peripheralScan: {
    // For peripheral vision scanning (status indicators)
    primaryWeight: 'bold',
    secondaryWeight: 'bold',
    tertiaryWeight: '500',
    spacing: 'tight', // Reduced line height for compact display
  },
} as const;

export type ScanningPattern = keyof typeof scanningPatterns;

/**
 * Get typography configuration for specific scanning pattern
 */
export function getScanningPatternConfig(pattern: ScanningPattern) {
  return scanningPatterns[pattern];
}

/**
 * Device orientation adjustments for typography
 */
export function getOrientationAdjustments(): {
  isLandscape: boolean;
  scaleFactor: number;
  spacingAdjustment: number;
  lineHeightAdjustment: number;
} {
  const { width, height } = Dimensions.get('window');
  const isLandscape = width > height;
  
  // Comprehensive typography adjustments for landscape mode
  const scaleFactor = isLandscape ? 0.90 : 1; // Smaller in landscape for more content
  const spacingAdjustment = isLandscape ? 0.9 : 1; // Tighter spacing in landscape
  const lineHeightAdjustment = isLandscape ? 0.95 : 1; // Slightly reduced line height
  
  return { 
    isLandscape, 
    scaleFactor, 
    spacingAdjustment,
    lineHeightAdjustment
  };
}

/**
 * Responsive typography that maintains hierarchy across orientations
 * Ensures text remains scannable regardless of device orientation
 */
export function getOrientationResponsiveTypography(
  variant: TypographyVariant,
  options?: {
    emphasis?: EmphasisLevel;
    hierarchy?: InformationHierarchy;
    maintainHierarchy?: boolean; // Preserve relative sizes across orientations
  }
): {
  fontSize: number;
  fontWeight: string;
  lineHeight: number;
  letterSpacing: number;
  marginVertical?: number;
} {
  const { maintainHierarchy = true } = options || {};
  const orientationData = getOrientationAdjustments();
  
  // Get base responsive typography
  const baseTypography = getResponsiveTypography(variant, options);
  
  // Apply orientation scaling
  const orientationFontSize = Math.round(baseTypography.fontSize * orientationData.scaleFactor);
  const orientationLineHeight = Math.round(baseTypography.lineHeight * orientationData.lineHeightAdjustment);
  const orientationLetterSpacing = baseTypography.letterSpacing * orientationData.spacingAdjustment;
  
  // Maintain hierarchy relationships in landscape mode
  let hierarchyAdjustment = 1;
  if (maintainHierarchy && orientationData.isLandscape) {
    // Ensure larger text sizes maintain their prominence even when scaled down
    const baseFontSizes = {
      hero: 40,
      h1: 32,
      h2: 24,
      bodyLarge: 18,
      body: 16,
      caption: 14,
    };
    
    const relativeSize = baseTypography.fontSize / baseFontSizes[variant];
    if (relativeSize > 1) {
      // Text was scaled up due to emphasis/hierarchy, preserve some of that scaling
      hierarchyAdjustment = 1 + ((relativeSize - 1) * 0.7); // Preserve 70% of the scaling
    }
  }
  
  const finalFontSize = Math.round(orientationFontSize * hierarchyAdjustment);
  
  // Calculate appropriate margin for hierarchy in different orientations
  const marginVertical = orientationData.isLandscape 
    ? Math.max(2, finalFontSize * 0.1) // Smaller margins in landscape
    : Math.max(4, finalFontSize * 0.15); // Larger margins in portrait
  
  return {
    fontSize: finalFontSize,
    fontWeight: baseTypography.fontWeight,
    lineHeight: Math.max(orientationLineHeight, finalFontSize * 1.2), // Ensure minimum line height
    letterSpacing: orientationLetterSpacing,
    marginVertical: Math.round(marginVertical),
  };
}

/**
 * Calculate optimal typography for referee-critical information
 * Combines all optimization factors for maximum outdoor readability
 */
export function getCriticalInfoTypography(variant: TypographyVariant) {
  const { scaleFactor } = getOrientationAdjustments();
  const responsive = getResponsiveTypography(variant, { 
    emphasis: 'critical', 
    hierarchy: 'primary' 
  });
  
  return {
    fontSize: Math.round(responsive.fontSize * scaleFactor),
    fontWeight: 'bold' as const,
    lineHeight: getOptimizedLineHeight(responsive.fontSize, variant),
    letterSpacing: getOptimizedLetterSpacing(responsive.fontSize, variant, 'critical'),
    ...getTouchTargetDimensions(variant),
  };
}