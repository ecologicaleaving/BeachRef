/**
 * TeamListItem Component
 *
 * Individual team card component for displaying team information in the entry list.
 * Feature: 003-players-entry-list
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TournamentTeam, TEAM_CARD_HEIGHT } from '../../types/tournament-team';

interface TeamListItemProps {
  /** Team data to display */
  team: TournamentTeam;
  /** Callback when team is pressed */
  onPress: (team: TournamentTeam) => void;
}

/**
 * Team card component with seed, player names, and country
 */
export function TeamListItem({ team, onPress }: TeamListItemProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(team)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Team ${team.seed || 'unseeded'}: ${team.player1.fullName} and ${team.player2.fullName}, ${team.countryCode}`}
    >
      {/* Seed Number */}
      <View style={styles.seedContainer}>
        <Text style={styles.seedText}>{team.seed || '-'}</Text>
      </View>

      {/* Team Information */}
      <View style={styles.contentContainer}>
        <Text style={styles.playerName} numberOfLines={1}>
          {team.player1.fullName}
        </Text>
        <Text style={styles.playerName} numberOfLines={1}>
          {team.player2.fullName}
        </Text>
        <Text style={styles.countryText}>{team.countryCode}</Text>
      </View>

      {/* Status Badges */}
      <View style={styles.badgeContainer}>
        {team.isWildCard && (
          <View style={[styles.badge, styles.wildCardBadge]}>
            <Text style={styles.badgeText}>WC</Text>
          </View>
        )}
        {team.isReserve && (
          <View style={[styles.badge, styles.reserveBadge]}>
            <Text style={styles.badgeText}>RES</Text>
          </View>
        )}
        {team.status === 'Withdrawn' && (
          <View style={[styles.badge, styles.withdrawnBadge]}>
            <Text style={styles.badgeText}>W</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: TEAM_CARD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 44, // Minimum touch target (iOS HIG)
  },
  seedContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  seedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    lineHeight: 18,
  },
  countryText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
    marginTop: 2,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  wildCardBadge: {
    backgroundColor: '#DBEAFE',
  },
  reserveBadge: {
    backgroundColor: '#F3F4F6',
  },
  withdrawnBadge: {
    backgroundColor: '#FEE2E2',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
});
