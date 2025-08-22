/**
 * Visual Hierarchy Text Component
 * Typography system with referee-first information prioritization
 */

import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { designTokens } from '../../theme/tokens';
import { InformationPriority, InformationClassifier } from './InformationArchitecture';

interface VisualHierarchyTextProps {
  priority: InformationPriority;
  children: React.ReactNode;
  variant?: 'hero' | 'title' | 'body' | 'caption';
  emphasis?: 'normal' | 'strong' | 'urgent';
  scanOptimized?: boolean;
  outdoor?: boolean;
  style?: TextStyle;
}

export const VisualHierarchyText: React.FC<VisualHierarchyTextProps> = ({
  priority,
  children,
  variant = 'body',
  emphasis = 'normal',
  scanOptimized = true,
  outdoor = true,
  style,
}) => {
  const baseSpecs = InformationClassifier.getHierarchySpecs(priority);
  
  const textStyles = [
    styles.baseText,
    baseSpecs,
    styles[variant],
    styles[`${priority}Text`],
    emphasis === 'strong' && styles.strongEmphasis,
    emphasis === 'urgent' && styles.urgentEmphasis,
    scanOptimized && styles.scanOptimized,
    outdoor && styles.outdoorOptimized,
    style,
  ];

  return (
    <Text style={textStyles}>
      {children}
    </Text>
  );
};

// Court Number Display - Hero Typography for Primary Information
interface CourtNumberProps {
  courtNumber: string | number;
  status?: 'current' | 'upcoming' | 'completed';
  urgent?: boolean;
}

export const CourtNumber: React.FC<CourtNumberProps> = ({
  courtNumber,
  status = 'current',
  urgent = false,
}) => {
  return (
    <VisualHierarchyText
      priority="primary"
      variant="hero"
      emphasis={urgent ? 'urgent' : 'strong'}
      style={[
        styles.courtNumber,
        status === 'current' && styles.currentCourt,
        urgent && styles.urgentCourt,
      ]}
    >
      Court {courtNumber}
    </VisualHierarchyText>
  );
};

// Screen Title with Hierarchy
interface HierarchyTitleProps {
  children: React.ReactNode;
  priority?: InformationPriority;
  screenContext?: boolean;
}

export const HierarchyTitle: React.FC<HierarchyTitleProps> = ({
  children,
  priority = 'primary',
  screenContext = false,
}) => {
  return (
    <VisualHierarchyText
      priority={priority}
      variant="title"
      emphasis="strong"
      style={screenContext && styles.screenTitle}
    >
      {children}
    </VisualHierarchyText>
  );
};

// Section Header with Visual Weight
interface SectionHeaderProps {
  children: React.ReactNode;
  priority: InformationPriority;
  collapsible?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  children,
  priority,
  collapsible = false,
}) => {
  return (
    <VisualHierarchyText
      priority={priority}
      variant={priority === 'primary' ? 'title' : 'body'}
      emphasis={priority === 'primary' ? 'strong' : 'normal'}
      style={collapsible && styles.collapsibleHeader}
    >
      {children}
    </VisualHierarchyText>
  );
};

const styles = StyleSheet.create({
  baseText: {
    // Use system default font family for React Native
  },

  // Variant Styles
  hero: {
    fontSize: 40,
    fontWeight: 'bold',
    lineHeight: 48,
    letterSpacing: -0.5,
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 40,
    letterSpacing: -0.3,
  },

  body: {
    fontSize: 18,
    fontWeight: 'normal',
    lineHeight: 24,
  },

  caption: {
    fontSize: 14,
    fontWeight: 'normal',
    lineHeight: 18,
  },

  // Priority-Based Text Styles
  primaryText: {
    color: designTokens.colors.textPrimary,
    fontWeight: 'bold',
  },

  secondaryText: {
    color: designTokens.colors.textPrimary,
    fontWeight: '600',
  },

  tertiaryText: {
    color: designTokens.colors.textSecondary,
    fontWeight: 'normal',
  },

  // Emphasis Styles
  strongEmphasis: {
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
  },

  urgentEmphasis: {
    fontWeight: 'bold',
    color: designTokens.colors.error,
    textShadowColor: designTokens.colors.background,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },

  // Scan Optimization
  scanOptimized: {
    letterSpacing: 0.3,
    lineHeight: 1.4,
  },

  // Outdoor Optimization
  outdoorOptimized: {
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Special Components
  courtNumber: {
    textAlign: 'center',
    marginVertical: designTokens.spacing.sm,
  },

  currentCourt: {
    color: designTokens.statusColors.current,
  },

  urgentCourt: {
    color: designTokens.colors.error,
    textShadowColor: designTokens.colors.background,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },

  screenTitle: {
    marginBottom: designTokens.spacing.md,
    paddingHorizontal: designTokens.spacing.md,
  },

  collapsibleHeader: {
    paddingVertical: designTokens.spacing.xs,
  },
});