/**
 * EmptyTeamListState Component
 *
 * Empty state component displayed when no teams are available for the current filter.
 * Feature: 003-players-entry-list
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Users } from 'lucide-react-native';

interface EmptyTeamListStateProps {
  /** Custom message to display */
  message?: string;
}

/**
 * Empty state with icon and message
 */
export function EmptyTeamListState({ message }: EmptyTeamListStateProps) {
  const displayMessage = message || 'No teams registered yet';

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Users size={48} color="#9CA3AF" strokeWidth={1.5} />
      </View>
      <Text style={styles.message}>{displayMessage}</Text>
      <Text style={styles.hint}>
        Teams will appear here once they are registered in the tournament
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  iconContainer: {
    marginBottom: 16,
    opacity: 0.6,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
