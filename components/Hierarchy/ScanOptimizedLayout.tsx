/**
 * Scan-Optimized Layout Component
 * Layout patterns optimized for quick referee scanning under outdoor conditions
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { designTokens } from '../../theme/tokens';
import { InformationPriority } from './InformationArchitecture';

interface ScanOptimizedLayoutProps {
  children: React.ReactNode;
  pattern?: 'z-pattern' | 'f-pattern' | 'layered' | 'grid';
  priority?: InformationPriority;
  spacing?: 'tight' | 'normal' | 'loose';
  outdoorOptimized?: boolean;
  style?: ViewStyle;
}

export const ScanOptimizedLayout: React.FC<ScanOptimizedLayoutProps> = ({
  children,
  pattern = 'z-pattern',
  priority = 'secondary',
  spacing = 'normal',
  outdoorOptimized = true,
  style,
}) => {
  const layoutStyles = [
    styles.baseLayout,
    styles[pattern],
    styles[`${priority}Layout`],
    styles[`${spacing}Spacing`],
    outdoorOptimized && styles.outdoorOptimized,
    style,
  ];

  return (
    <View style={layoutStyles}>
      {children}
    </View>
  );
};

// Quick Scan Grid - Optimized for referee information scanning
interface QuickScanGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
  priority?: InformationPriority;
  scanDirection?: 'horizontal' | 'vertical';
}

export const QuickScanGrid: React.FC<QuickScanGridProps> = ({
  children,
  columns = 2,
  priority = 'secondary',
  scanDirection = 'horizontal',
}) => {
  return (
    <View style={[
      styles.quickScanGrid,
      styles[`${columns}Columns`],
      styles[`${priority}Grid`],
      scanDirection === 'vertical' && styles.verticalScan,
    ]}>
      {children}
    </View>
  );
};

// Information Stack - Vertical hierarchy with visual separation
interface InfoStackProps {
  children: React.ReactNode;
  separation?: 'minimal' | 'standard' | 'clear';
  priorityOrder?: boolean;
}

export const InfoStack: React.FC<InfoStackProps> = ({
  children,
  separation = 'standard',
  priorityOrder = true,
}) => {
  return (
    <View style={[
      styles.infoStack,
      styles[`${separation}Separation`],
      priorityOrder && styles.priorityOrdered,
    ]}>
      {children}
    </View>
  );
};

// Focal Point Layout - Draws attention to primary information
interface FocalPointLayoutProps {
  focalContent: React.ReactNode;
  supportingContent?: React.ReactNode;
  position?: 'center' | 'top' | 'left';
}

export const FocalPointLayout: React.FC<FocalPointLayoutProps> = ({
  focalContent,
  supportingContent,
  position = 'center',
}) => {
  return (
    <View style={[styles.focalPointLayout, styles[`focal${position.charAt(0).toUpperCase() + position.slice(1)}`]]}>
      <View style={styles.focalContent}>
        {focalContent}
      </View>
      {supportingContent && (
        <View style={styles.supportingContent}>
          {supportingContent}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Base Layout
  baseLayout: {
    width: '100%',
    paddingHorizontal: designTokens.spacing.md,
  },

  // Scanning Patterns
  'z-pattern': {
    // Optimized for Z-pattern eye movement (left-right, diagonal, left-right)
    flexDirection: 'column',
    alignItems: 'stretch',
  },

  'f-pattern': {
    // Optimized for F-pattern eye movement (horizontal sweeps)
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  layered: {
    // Layered information with clear visual hierarchy
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },

  grid: {
    // Grid layout for systematic scanning
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  // Priority-Based Layout Adjustments
  primaryLayout: {
    paddingVertical: designTokens.spacing.lg,
    marginVertical: designTokens.spacing.md,
  },

  secondaryLayout: {
    paddingVertical: designTokens.spacing.md,
    marginVertical: designTokens.spacing.sm,
  },

  tertiaryLayout: {
    paddingVertical: designTokens.spacing.sm,
    marginVertical: designTokens.spacing.xs,
  },

  // Spacing Variants
  tightSpacing: {
    paddingHorizontal: designTokens.spacing.sm,
    gap: designTokens.spacing.xs,
  },

  normalSpacing: {
    paddingHorizontal: designTokens.spacing.md,
    gap: designTokens.spacing.sm,
  },

  looseSpacing: {
    paddingHorizontal: designTokens.spacing.lg,
    gap: designTokens.spacing.md,
  },

  // Outdoor Optimization
  outdoorOptimized: {
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
    paddingVertical: designTokens.spacing.sm,
  },

  // Quick Scan Grid
  quickScanGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
  },

  '1Columns': {
    flexDirection: 'column',
  },

  '2Columns': {
    // Each child takes approximately half width
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  '3Columns': {
    // Each child takes approximately one-third width
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  primaryGrid: {
    gap: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.lg,
  },

  secondaryGrid: {
    gap: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.md,
  },

  tertiaryGrid: {
    gap: designTokens.spacing.xs,
    paddingVertical: designTokens.spacing.sm,
  },

  verticalScan: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
  },

  // Information Stack
  infoStack: {
    flexDirection: 'column',
    width: '100%',
  },

  minimalSeparation: {
    gap: designTokens.spacing.xs,
  },

  standardSeparation: {
    gap: designTokens.spacing.sm,
  },

  clearSeparation: {
    gap: designTokens.spacing.md,
  },

  priorityOrdered: {
    // Ensures primary information appears first
    flexDirection: 'column',
  },

  // Focal Point Layout
  focalPointLayout: {
    width: '100%',
    minHeight: 120,
  },

  focalCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  focalTop: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: designTokens.spacing.lg,
  },

  focalLeft: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: designTokens.spacing.lg,
  },

  focalContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },

  supportingContent: {
    paddingTop: designTokens.spacing.md,
    opacity: 0.8,
  },
});