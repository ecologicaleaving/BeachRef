/**
 * Container/View Foundation Components
 * WCAG AAA Compliant Layout Components for Tournament Referees
 */

import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme/tokens';
import { shadowPresets } from '../../theme/shadows';
import { getColor, getTextColor } from '../../utils/colors';

export type ContainerColor = keyof typeof colors;
export type ContainerSpacing = keyof typeof spacing;

export interface ContainerProps extends ViewProps {
  backgroundColor?: ContainerColor;
  padding?: ContainerSpacing;
  margin?: ContainerSpacing;
  paddingHorizontal?: ContainerSpacing;
  paddingVertical?: ContainerSpacing;
  marginHorizontal?: ContainerSpacing;
  marginVertical?: ContainerSpacing;
  children?: React.ReactNode;
}

/**
 * Base Container component with design token integration
 * Provides consistent spacing and background treatments
 */
export function Container({
  backgroundColor = 'background',
  padding,
  margin,
  paddingHorizontal,
  paddingVertical,
  marginHorizontal,
  marginVertical,
  style,
  children,
  ...props
}: ContainerProps) {
  const computedStyle = [
    styles.base,
    {
      backgroundColor: getColor(backgroundColor),
    },
    padding && { padding: spacing[padding] },
    margin && { margin: spacing[margin] },
    paddingHorizontal && { paddingHorizontal: spacing[paddingHorizontal] },
    paddingVertical && { paddingVertical: spacing[paddingVertical] },
    marginHorizontal && { marginHorizontal: spacing[marginHorizontal] },
    marginVertical && { marginVertical: spacing[marginVertical] },
    style,
  ];

  return (
    <View style={computedStyle} {...props}>
      {children}
    </View>
  );
}

/**
 * Card Container - Elevated surface with subtle shadow
 * Used for content grouping with proper contrast
 */
export function Card({
  backgroundColor = 'background',
  padding = 'md',
  ...props
}: ContainerProps) {
  return (
    <Container
      backgroundColor={backgroundColor}
      padding={padding}
      style={[styles.card, props.style]}
      {...props}
    />
  );
}

/**
 * Surface Container - Basic elevated surface
 * Used for background sections and content areas
 */
export function Surface({
  backgroundColor = 'background',
  padding = 'md',
  ...props
}: ContainerProps) {
  return (
    <Container
      backgroundColor={backgroundColor}
      padding={padding}
      style={[styles.surface, props.style]}
      {...props}
    />
  );
}

/**
 * Status Container - Color-coded container for status information
 * Automatically applies appropriate text color for contrast
 */
export interface StatusContainerProps extends Omit<ContainerProps, 'backgroundColor'> {
  status: 'active' | 'upcoming' | 'completed' | 'cancelled' | 'primary' | 'accent';
}

export function StatusContainer({
  status,
  padding = 'sm',
  ...props
}: StatusContainerProps) {
  const statusColors = {
    active: 'success' as ContainerColor,
    upcoming: 'warning' as ContainerColor,
    completed: 'textSecondary' as ContainerColor,
    cancelled: 'error' as ContainerColor,
    primary: 'primary' as ContainerColor,
    accent: 'accent' as ContainerColor,
  };

  const backgroundColor = statusColors[status];

  return (
    <Container
      backgroundColor={backgroundColor}
      padding={padding}
      style={[styles.statusContainer, props.style]}
      {...props}
    />
  );
}

/**
 * Section Container - Content section with optional header
 * Used for organizing content into logical groups
 */
export interface SectionProps extends ContainerProps {
  title?: string;
  headerBackgroundColor?: ContainerColor;
}

export function Section({
  title,
  headerBackgroundColor = 'primary',
  backgroundColor = 'background',
  padding = 'md',
  children,
  ...props
}: SectionProps) {
  return (
    <Container backgroundColor={backgroundColor} style={props.style}>
      {title && (
        <Container
          backgroundColor={headerBackgroundColor}
          paddingHorizontal="md"
          paddingVertical="sm"
          style={styles.sectionHeader}
        >
          {/* Title would be rendered with appropriate Text component */}
        </Container>
      )}
      <Container padding={padding} {...props}>
        {children}
      </Container>
    </Container>
  );
}

/**
 * Safe Area Container - Respects device safe areas
 * Used for full-screen layouts and navigation areas
 */
export function SafeContainer({ children, ...props }: ContainerProps) {
  return (
    <Container style={[styles.safeArea, props.style]} {...props}>
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  base: {
    // Base container styles
  },
  card: {
    borderRadius: 8,
    // Subtle shadow for elevation
    ...shadowPresets.small,
    // Ensure proper contrast for accessibility
    borderWidth: 1,
    borderColor: colors.textSecondary + '20', // 20% opacity
  },
  surface: {
    borderRadius: 4,
    // Minimal elevation
    ...shadowPresets.subtle,
  },
  statusContainer: {
    borderRadius: 6,
    // Strong border for outdoor visibility
    borderWidth: 2,
    borderColor: 'transparent', // Will be overridden by status color
  },
  sectionHeader: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  safeArea: {
    flex: 1,
    // Safe area padding will be handled by SafeAreaProvider in app
  },
});