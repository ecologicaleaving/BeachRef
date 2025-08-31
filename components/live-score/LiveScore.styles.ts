/**
 * Shared styling definitions for Live Score components
 * Part of EPIC-001 Live Score Display - Story 1.2
 * 
 * Provides consistent styling patterns, animations, and theme integration
 * across all live score components for visual cohesion.
 */

import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme/tokens';

/**
 * Common animation configurations for live score components
 */
export const animations = {
  // Pulse animation for critical moments (match point, set point)
  pulse: {
    duration: 800,
    minScale: 1.0,
    maxScale: 1.2,
  },
  
  // Ball in play indicator animation
  ballInPlay: {
    duration: 1000,
    minOpacity: 0.3,
    maxOpacity: 1.0,
  },
  
  // Live dot pulsing
  liveDot: {
    duration: 1500,
    minOpacity: 0.4,
    maxOpacity: 1.0,
  },
} as const;

/**
 * Common color themes for live score states
 */
export const liveScoreColors = {
  live: {
    primary: colors.success,
    background: colors.success + '10',
    border: colors.success,
    text: colors.success,
  },
  
  completed: {
    primary: colors.textSecondary,
    background: '#F9FAFB',
    border: '#D1D5DB',
    text: colors.textSecondary,
  },
  
  upcoming: {
    primary: colors.secondary,
    background: colors.background,
    border: colors.secondary,
    text: colors.textPrimary,
  },
  
  critical: {
    primary: colors.error,
    background: colors.error + '15',
    border: colors.error,
    text: colors.error,
  },
  
  warning: {
    primary: colors.warning,
    background: colors.warning + '15',
    border: colors.warning,
    text: colors.warning,
  },
} as const;

/**
 * Common shadow configurations for outdoor visibility
 * React Native Web compliant shadows using boxShadow equivalent
 */
export const shadows = {
  // Light shadow for cards
  card: {
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Prominent shadow for live elements
  live: {
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  
  // Critical element shadow
  critical: {
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
} as const;

/**
 * Responsive sizing configurations
 */
export const responsiveSizing = {
  compact: {
    containerPadding: spacing.sm,
    fontSize: typography.caption.fontSize,
    dotSize: 6,
    minHeight: 36,
  },
  
  normal: {
    containerPadding: spacing.md,
    fontSize: typography.body.fontSize,
    dotSize: 8,
    minHeight: 48,
  },
  
  large: {
    containerPadding: spacing.lg,
    fontSize: typography.bodyLarge.fontSize,
    dotSize: 10,
    minHeight: 64,
  },
} as const;

/**
 * Common component styles
 */
export const commonStyles = StyleSheet.create({
  // Base container styles
  baseContainer: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.textSecondary + '30',
    ...shadows.card,
  },
  
  // Compact container variant
  compactContainer: {
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  
  // Live match styling
  liveContainer: {
    borderWidth: 3,
    borderColor: liveScoreColors.live.border,
    backgroundColor: liveScoreColors.live.background,
    ...shadows.live,
  },
  
  // Completed match styling
  completedContainer: {
    opacity: 0.8,
    backgroundColor: liveScoreColors.completed.background,
    borderColor: liveScoreColors.completed.border,
  },
  
  // Critical moment styling
  criticalContainer: {
    borderWidth: 2,
    borderColor: liveScoreColors.critical.border,
    backgroundColor: liveScoreColors.critical.background,
    ...shadows.critical,
  },
  
  // Live indicator dot
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: liveScoreColors.live.primary,
    ...shadows.live,
  },
  
  // Section dividers
  divider: {
    height: 1,
    backgroundColor: colors.textSecondary + '20',
    marginVertical: spacing.sm,
  },
  
  verticalDivider: {
    width: 2,
    backgroundColor: colors.textSecondary + '40',
    marginHorizontal: spacing.md,
  },
  
  // No data state
  noDataContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.7,
    paddingVertical: spacing.lg,
  },
  
  noDataText: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Loading state
  loadingContainer: {
    opacity: 0.7,
  },
  
  loadingText: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  
  // Error state
  errorContainer: {
    borderWidth: 2,
    borderColor: colors.error,
  },
  
  errorText: {
    fontSize: typography.body.fontSize,
    color: colors.error,
    textAlign: 'center',
  },
});

/**
 * Typography styles for different live score contexts
 */
export const liveScoreTypography = StyleSheet.create({
  // Team names
  teamName: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  
  teamNameLive: {
    fontSize: typography.body.fontSize,
    fontWeight: 'bold',
    color: liveScoreColors.live.text,
  },
  
  teamNameCompleted: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
    color: liveScoreColors.completed.text,
  },
  
  // Scores
  score: {
    fontSize: typography.h1.fontSize,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  
  scoreLive: {
    fontSize: typography.hero.fontSize,
    fontWeight: 'bold',
    color: liveScoreColors.live.text,
  },
  
  scoreActive: {
    fontSize: typography.h2.fontSize,
    fontWeight: 'bold',
    color: liveScoreColors.live.text,
  },
  
  scoreWinning: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  
  // Status labels
  statusLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  statusLabelCritical: {
    fontSize: typography.body.fontSize,
    fontWeight: 'bold',
    color: liveScoreColors.critical.text,
    // React Native Web compatible text shadow
    textShadowColor: liveScoreColors.critical.primary + '40',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  statusLabelWarning: {
    fontSize: typography.caption.fontSize + 1,
    fontWeight: 'bold',
    color: liveScoreColors.warning.text,
    // React Native Web compatible text shadow
    textShadowColor: liveScoreColors.warning.primary + '40',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  
  statusLabelNormal: {
    fontSize: typography.caption.fontSize,
    color: liveScoreColors.live.text,
  },
  
  // Detail text
  detailText: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  
  // Compact variations
  compactTeamName: {
    fontSize: typography.caption.fontSize + 1,
  },
  
  compactScore: {
    fontSize: typography.h2.fontSize,
  },
  
  compactStatusLabel: {
    fontSize: 10,
  },
  
  compactDetailText: {
    fontSize: 10,
  },
});

/**
 * Layout helpers for consistent spacing and alignment
 */
export const layoutHelpers = StyleSheet.create({
  // Flex layouts
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  rowAround: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  
  column: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  
  columnStart: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  
  columnEnd: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  
  // Common gaps
  gapXs: {
    gap: spacing.xs,
  },
  
  gapSm: {
    gap: spacing.sm,
  },
  
  gapMd: {
    gap: spacing.md,
  },
  
  // Centered content
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Full width with padding
  fullWidthPadded: {
    width: '100%',
    paddingHorizontal: spacing.md,
  },
});

export default {
  animations,
  liveScoreColors,
  shadows,
  responsiveSizing,
  commonStyles,
  liveScoreTypography,
  layoutHelpers,
};