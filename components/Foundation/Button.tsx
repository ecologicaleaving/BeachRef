/**
 * Button Foundation Components
 * WCAG AAA Compliant Interactive Components for Tournament Referees
 */

import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { colors, spacing } from '../../theme/tokens';
import { shadowPresets } from '../../theme/shadows';
import { getColor, getTextColor } from '../../utils/colors';
import { Text } from '../Typography';

const { width: screenWidth } = Dimensions.get('window');

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Base Button component with high-contrast styling
 * Meets WCAG AAA requirements and outdoor visibility standards
 */
export function Button({
  variant = 'primary',
  size = 'medium',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  const variantColors = {
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
  };

  const backgroundColor = variantColors[variant];
  const textColor = getTextColor(variant as keyof typeof colors);
  
  // Calculate opacity for disabled state
  const opacity = disabled ? 0.6 : 1;

  const buttonStyles = [
    styles.base,
    styles[size],
    {
      backgroundColor,
      opacity,
    },
    fullWidth && styles.fullWidth,
    style,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      disabled={disabled || loading}
      accessible
      accessibilityRole="button"
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading,
      }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text
          variant={size === 'large' ? 'bodyLarge' : 'body'}
          color={textColor as keyof typeof colors}
          style={styles.buttonText}
        >
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

/**
 * Primary Action Button - Main call-to-action
 * Uses primary brand color with maximum contrast
 */
export function PrimaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="primary" {...props} />;
}

/**
 * Secondary Action Button - Supporting actions
 * Uses secondary brand color for visual hierarchy
 */
export function SecondaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="secondary" {...props} />;
}

/**
 * Accent Button - Attention-grabbing actions
 * Uses accent color for important but not primary actions
 */
export function AccentButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="accent" {...props} />;
}

/**
 * Success Button - Positive actions (submit, confirm)
 * Uses success color for positive confirmations
 */
export function SuccessButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="success" {...props} />;
}

/**
 * Warning Button - Cautionary actions
 * Uses warning color for actions requiring attention
 */
export function WarningButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="warning" {...props} />;
}

/**
 * Error Button - Destructive actions (delete, cancel)
 * Uses error color for destructive or negative actions
 */
export function ErrorButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="error" {...props} />;
}

/**
 * Icon Button - Compact button for icon-only actions
 * Square format with touch target optimization
 */
export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'size'> {
  icon: React.ReactNode;
  accessibilityLabel: string;
}

export function IconButton({
  icon,
  variant = 'primary',
  accessibilityLabel,
  style,
  ...props
}: IconButtonProps) {
  const variantColors = {
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
  };

  const backgroundColor = variantColors[variant];
  const opacity = props.disabled ? 0.6 : 1;

  const buttonStyles = [
    styles.base,
    styles.iconButton,
    {
      backgroundColor,
      opacity,
    },
    style,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      disabled={props.disabled || props.loading}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{
        disabled: props.disabled || props.loading,
        busy: props.loading,
      }}
      {...props}
    >
      {props.loading ? (
        <ActivityIndicator
          color={getTextColor(variant)}
          size="small"
        />
      ) : (
        icon
      )}
    </TouchableOpacity>
  );
}

/**
 * Floating Action Button - Prominent action button
 * Fixed positioning with high visibility for primary actions
 */
export function FloatingActionButton({
  variant = 'accent',
  style,
  ...props
}: Omit<ButtonProps, 'size' | 'fullWidth'>) {
  return (
    <Button
      variant={variant}
      size="large"
      style={[styles.fab, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    // High contrast border for outdoor visibility
    borderWidth: 2,
    borderColor: 'transparent',
    // Minimum touch target for accessibility
    minHeight: 44,
    // Shadow for depth and visibility
    ...shadowPresets.small,
  },
  small: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 36,
  },
  medium: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  large: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56, // Preferred touch target size
  },
  fullWidth: {
    width: '100%',
  },
  buttonText: {
    textAlign: 'center',
    fontWeight: '600', // Semi-bold for better visibility
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 28, // Circular
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  fab: {
    borderRadius: 32,
    width: 64,
    height: 64,
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    // Enhanced shadow for floating appearance
    ...shadowPresets.large,
  },
});