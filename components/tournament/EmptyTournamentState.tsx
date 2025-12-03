/**
 * Empty Tournament State Component
 * Displayed when no tournaments are found after loading completes
 * User Story 1: Loading States - Empty state with clear messaging
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../Typography/Text';
import { Container } from '../Foundation/Container';

/**
 * Component props
 */
export interface EmptyTournamentStateProps {
  /**
   * Optional custom message (defaults to "No tournaments found")
   */
  message?: string;

  /**
   * Optional custom description
   */
  description?: string;

  /**
   * Optional action button (e.g., "Adjust Filters")
   */
  action?: React.ReactNode;
}

/**
 * Empty state component for tournament lists
 *
 * Displayed when:
 * - API returns successfully but with 0 tournaments
 * - User filters exclude all tournaments
 * - No tournaments match current date range
 *
 * @example
 * ```tsx
 * function TournamentList() {
 *   const { isEmpty } = useTournamentLoading();
 *
 *   if (isEmpty) {
 *     return (
 *       <EmptyTournamentState
 *         message="No tournaments found"
 *         description="Try adjusting your filters or date range"
 *         action={<Button onPress={clearFilters}>Clear Filters</Button>}
 *       />
 *     );
 *   }
 *
 *   return <TournamentGrid />;
 * }
 * ```
 */
export function EmptyTournamentState({
  message = 'No tournaments found',
  description = 'There are no tournaments matching your current filters.',
  action
}: EmptyTournamentStateProps): React.ReactElement {
  return (
    <Container style={styles.container}>
      <View style={styles.content}>
        {/* Icon placeholder - can be replaced with actual icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🏐</Text>
        </View>

        {/* Message */}
        <Text style={styles.message}>{message}</Text>

        {/* Description */}
        {description && (
          <Text style={styles.description}>{description}</Text>
        )}

        {/* Optional action button */}
        {action && (
          <View style={styles.actionContainer}>
            {action}
          </View>
        )}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24
  },
  content: {
    alignItems: 'center',
    maxWidth: 400
  },
  iconContainer: {
    marginBottom: 24
  },
  icon: {
    fontSize: 64,
    opacity: 0.5
  },
  message: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    color: '#1a1a1a'
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666666',
    lineHeight: 24,
    marginBottom: 24
  },
  actionContainer: {
    marginTop: 8,
    width: '100%',
    alignItems: 'center'
  }
});
