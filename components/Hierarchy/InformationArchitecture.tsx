/**
 * Information Architecture Foundation
 * Referee-First Information Priority Classification System
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { designTokens } from '../../theme/tokens';

// Information Priority Classification System
export type InformationPriority = 'primary' | 'secondary' | 'tertiary';

// Content Type Definitions for Referee-First Hierarchy
export interface HierarchyContentType {
  // Primary Information: Referee assignments, current responsibilities, time-critical data
  primary: {
    currentAssignment: boolean;
    timeCritical: boolean;
    refereeResponsibility: boolean;
    countdownTimer: boolean;
    urgentNotification: boolean;
  };
  
  // Secondary Information: Tournament context, match details, team information
  secondary: {
    tournamentContext: boolean;
    matchDetails: boolean;
    teamInformation: boolean;
    scheduleContext: boolean;
    assignmentPreview: boolean;
  };
  
  // Tertiary Information: General tournament information, statistics, administrative details
  tertiary: {
    generalTournament: boolean;
    statistics: boolean;
    administrativeDetails: boolean;
    historicalData: boolean;
    systemInformation: boolean;
  };
}

// Visual Hierarchy Design System
interface HierarchyContainerProps {
  priority: InformationPriority;
  children: React.ReactNode;
  visualWeight?: 'hero' | 'standard' | 'minimal';
  grouping?: boolean;
  scanOptimized?: boolean;
  style?: ViewStyle;
}

export const HierarchyContainer: React.FC<HierarchyContainerProps> = ({
  _priority,
  children,
  visualWeight = 'standard',
  grouping = false,
  scanOptimized = true,
  _style,
}) => {
  return (
    <View style={{ borderRadius: 8, marginVertical: 4 }}>
      {children}
    </View>
  );
};

// Information Grouping Components
interface InfoGroupProps {
  title?: string;
  priority: InformationPriority;
  children: React.ReactNode;
  collapsible?: boolean;
  separated?: boolean;
}

export const InfoGroup: React.FC<InfoGroupProps> = ({
  _title,
  priority,
  children,
  collapsible = false,
  separated = true,
}) => {
  return (
    <View style={[
      styles.infoGroup,
      separated && styles.visualSeparation,
      styles[`${priority}Group`]
    ]}>
      {children}
    </View>
  );
};

// Hero Content Container for Most Important Referee Information
interface HeroContentProps {
  children: React.ReactNode;
  prominence?: 'maximum' | 'high' | 'standard';
  contextSensitive?: boolean;
}

export const HeroContent: React.FC<HeroContentProps> = ({
  children,
  prominence = 'maximum',
  contextSensitive = true,
}) => {
  return (
    <HierarchyContainer
      priority="primary"
      visualWeight="hero"
      scanOptimized={true}
      style={[
        styles.heroContent,
        prominence === 'maximum' && styles.maxProminence,
        contextSensitive && styles.contextSensitive,
      ]}
    >
      {children}
    </HierarchyContainer>
  );
};

const styles = StyleSheet.create({
  // Base Container Styles
  baseContainer: {
    borderRadius: 8,
    marginVertical: designTokens.spacing.xs,
  },

  // Priority-Based Styling
  primary: {
    backgroundColor: designTokens.colors.background,
    borderWidth: 2,
    borderColor: designTokens.colors.primary,
    padding: designTokens.spacing.lg,
    marginHorizontal: designTokens.spacing.md,
    marginVertical: designTokens.spacing.sm,
    shadowColor: designTokens.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  secondary: {
    backgroundColor: designTokens.colors.background,
    borderWidth: 1,
    borderColor: designTokens.brandColors.primaryLight,
    padding: designTokens.spacing.md,
    marginHorizontal: designTokens.spacing.md,
    marginVertical: designTokens.spacing.xs,
    shadowColor: designTokens.colors.textSecondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },

  tertiary: {
    backgroundColor: designTokens.brandColors.primaryLight,
    borderWidth: 0,
    padding: designTokens.spacing.sm,
    marginHorizontal: designTokens.spacing.md,
    marginVertical: designTokens.spacing.xs,
    opacity: 0.95,
  },

  // Visual Weight Variants
  heroWeight: {
    borderWidth: 3,
    borderColor: designTokens.colors.primary,
    backgroundColor: designTokens.colors.background,
    padding: designTokens.spacing.xl,
    marginVertical: designTokens.spacing.md,
    shadowColor: designTokens.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },

  minimalWeight: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    padding: designTokens.spacing.xs,
    shadowOpacity: 0,
    elevation: 0,
  },

  // Grouping and Separation
  grouped: {
    marginVertical: 0,
    borderRadius: 0,
  },

  visualSeparation: {
    borderBottomWidth: 1,
    borderBottomColor: designTokens.brandColors.primaryLight,
    paddingBottom: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.sm,
  },

  // Scan Optimization
  scanOptimized: {
    minHeight: 44, // WCAG minimum touch target
    justifyContent: 'center',
  },

  // Information Group Styles
  infoGroup: {
    marginVertical: designTokens.spacing.xs,
  },

  primaryGroup: {
    marginBottom: designTokens.spacing.lg,
  },

  secondaryGroup: {
    marginBottom: designTokens.spacing.md,
  },

  tertiaryGroup: {
    marginBottom: designTokens.spacing.sm,
  },

  // Hero Content Styles
  heroContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  maxProminence: {
    minHeight: 120,
    marginVertical: designTokens.spacing.lg,
  },

  contextSensitive: {
    borderColor: designTokens.colors.accent,
  },
});

// Content type for classification
export type ClassifiableContentType = 
  | 'currentAssignment' | 'timeCritical' | 'refereeResponsibility' | 'countdownTimer' | 'urgentNotification'
  | 'tournamentContext' | 'matchDetails' | 'teamInformation' | 'scheduleContext' | 'assignmentPreview'
  | 'generalTournament' | 'statistics' | 'administrativeDetails' | 'historicalData' | 'systemInformation';

// Referee-First Information Priority Classification
export const InformationClassifier = {
  // Classify content type based on referee workflow importance
  classifyContent: (contentType: ClassifiableContentType): InformationPriority => {
    // Primary: Mission-critical referee information
    const primaryContent: ClassifiableContentType[] = [
      'currentAssignment', 'timeCritical', 'refereeResponsibility', 
      'countdownTimer', 'urgentNotification'
    ];
    
    // Secondary: Important contextual information
    const secondaryContent: ClassifiableContentType[] = [
      'tournamentContext', 'matchDetails', 'teamInformation', 
      'scheduleContext', 'assignmentPreview'
    ];
    
    // Everything else is tertiary
    if (primaryContent.includes(contentType)) return 'primary';
    if (secondaryContent.includes(contentType)) return 'secondary';
    return 'tertiary';
  },

  // Get visual hierarchy specifications
  getHierarchySpecs: (priority: InformationPriority) => {
    const specs = {
      primary: {
        fontSize: 20,
        fontWeight: 'bold',
        lineHeight: 28,
        marginBottom: designTokens.spacing.md,
        color: designTokens.colors.textPrimary,
      },
      secondary: {
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 22,
        marginBottom: designTokens.spacing.sm,
        color: designTokens.colors.textPrimary,
      },
      tertiary: {
        fontSize: 14,
        fontWeight: 'normal',
        lineHeight: 20,
        marginBottom: designTokens.spacing.xs,
        color: designTokens.colors.textSecondary,
      },
    };
    
    return specs[priority];
  },
};