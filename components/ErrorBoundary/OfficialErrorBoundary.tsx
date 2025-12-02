/**
 * OfficialErrorBoundary Component
 *
 * Error boundary specifically for official display section.
 * Prevents official fetch failures from breaking match card rendering.
 *
 * Part of specs/006-match-officials-display - User Story 1 (T025)
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme/tokens';

interface Props {
  children: ReactNode;
  /** Fallback UI to show on error (optional) */
  fallback?: ReactNode;
  /** Whether to show error message in dev mode */
  showErrorInDev?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * OfficialErrorBoundary
 *
 * Catches errors in official display and shows fallback UI.
 * Logs errors in dev mode for debugging.
 *
 * @example
 * ```tsx
 * <OfficialErrorBoundary>
 *   <OfficialList officials={officials} loading={loading} />
 * </OfficialErrorBoundary>
 * ```
 */
export class OfficialErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    console.error('[OfficialErrorBoundary] Caught error in official display:', error);
    console.error('[OfficialErrorBoundary] Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Return custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // In development, show error details
      if (__DEV__ && this.props.showErrorInDev) {
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Official Display Error</Text>
            <Text style={styles.errorMessage}>
              {this.state.error?.message || 'An error occurred'}
            </Text>
            <Text style={styles.errorHelp}>
              Check console for details
            </Text>
          </View>
        );
      }

      // In production, silent degradation (return null)
      return null;
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    padding: spacing.medium,
    backgroundColor: colors.errorLight || colors.error,
    borderRadius: 8,
    marginVertical: spacing.small,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.error,
    marginBottom: spacing.small,
  },
  errorMessage: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.small,
  },
  errorHelp: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
