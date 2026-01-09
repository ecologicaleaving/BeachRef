/**
 * Brand Error State Component
 * Professional error states with FIVB branding
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from '../Typography/Text';
import { Button } from '../Foundation/Button';
import { colors, spacing } from '../../theme/tokens';

export interface BrandErrorStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'error' | 'warning' | 'info';
  showIcon?: boolean;
  style?: ViewStyle;
}

export const BrandErrorState: React.FC<BrandErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'Please try again later.',
  actionLabel = 'Try Again',
  onAction,
  variant = 'error',
  showIcon = true,
  style,
}) => {
  const getVariantColor = () => {
    switch (variant) {
      case 'warning':
        return colors.warning;
      case 'info':
        return colors.secondary;
      default:
        return colors.error;
    }
  };

  const getVariantIcon = () => {
    switch (variant) {
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '❌';
    }
  };

  const variantColor = getVariantColor();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        {showIcon && (
          <View style={[
            styles.iconContainer,
            { borderColor: variantColor }
          ]}>
            <Text variant="hero" style={styles.icon}>
              {getVariantIcon()}
            </Text>
          </View>
        )}
        
        <Text 
          variant="h2" 
          color={colors.textPrimary}
          style={[styles.title, { color: variantColor }]}
        >
          {title}
        </Text>
        
        <Text 
          variant="body" 
          color={colors.textSecondary}
          style={styles.message}
        >
          {message}
        </Text>
        
        {onAction && actionLabel && (
          <View style={styles.actionContainer}>
            <Button
              variant="primary"
              onPress={onAction}
              style={[
                styles.actionButton,
                { backgroundColor: variantColor }
              ]}
            >
              {actionLabel}
            </Button>
          </View>
        )}
      </View>
    </View>
  );
};

/**
 * Brand Empty State Component
 * Professional empty states for no data scenarios
 */
export interface BrandEmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
  style?: ViewStyle;
}

export const BrandEmptyState: React.FC<BrandEmptyStateProps> = ({
  title = 'No data available',
  message = 'There\'s nothing to show here yet.',
  actionLabel,
  onAction,
  icon = '📋',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <View style={[
          styles.iconContainer,
          { borderColor: colors.textSecondary }
        ]}>
          <Text variant="hero" style={styles.icon}>
            {icon}
          </Text>
        </View>
        
        <Text 
          variant="h2" 
          color={colors.textPrimary}
          style={styles.title}
        >
          {title}
        </Text>
        
        <Text 
          variant="body" 
          color={colors.textSecondary}
          style={styles.message}
        >
          {message}
        </Text>
        
        {onAction && actionLabel && (
          <View style={styles.actionContainer}>
            <Button
              variant="secondary"
              onPress={onAction}
              style={styles.actionButton}
            >
              {actionLabel}
            </Button>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 320,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    backgroundColor: colors.background,
  },
  icon: {
    fontSize: 32,
    textAlign: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  actionContainer: {
    width: '100%',
  },
  actionButton: {
    width: '100%',
    minHeight: 48,
    justifyContent: 'center',
  },
});

BrandErrorState.displayName = 'BrandErrorState';
BrandEmptyState.displayName = 'BrandEmptyState';