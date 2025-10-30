/**
 * TournamentTeamsScreen
 *
 * Main screen for displaying tournament team entry list with filtering and virtualization.
 * Feature: 003-players-entry-list
 */

import React from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTournamentTeams } from '../hooks/useTournamentTeams';
import { TeamListItem } from '../components/tournament/TeamListItem';
import { EmptyTeamListState } from '../components/tournament/EmptyTeamListState';
import { TEAM_CARD_HEIGHT, TournamentTeam } from '../types/tournament-team';

/**
 * Tournament Teams Screen Component
 */
export default function TournamentTeamsScreen() {
  // Get tournament number from route params
  const params = useLocalSearchParams();
  const tournamentNo = parseInt(params.tournamentNo as string, 10);

  // Use tournament teams hook
  const {
    filteredTeams,
    loading,
    refreshing,
    error,
    isOffline,
    refresh,
    openTeamModal,
  } = useTournamentTeams(tournamentNo);

  /**
   * Render individual team item
   */
  const renderTeamItem = ({ item }: { item: TournamentTeam }) => (
    <TeamListItem team={item} onPress={openTeamModal} />
  );

  /**
   * Get item layout for FlatList optimization
   * Critical for virtualization performance
   */
  const getItemLayout = (_data: TournamentTeam[] | null | undefined, index: number) => ({
    length: TEAM_CARD_HEIGHT,
    offset: TEAM_CARD_HEIGHT * index,
    index,
  });

  /**
   * Render empty state
   */
  const renderEmptyComponent = () => {
    if (loading) {
      return null; // Loading handled separately
    }

    if (error) {
      return (
        <EmptyTeamListState
          message={isOffline ? 'Offline - No cached data available' : 'Failed to load teams'}
        />
      );
    }

    return <EmptyTeamListState message="No teams found for the selected filters" />;
  };

  /**
   * Render loading state
   */
  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading teams...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Offline Indicator */}
      {isOffline && !loading && (
        <View style={styles.offlineBar}>
          <Text style={styles.offlineText}>Offline - showing cached data</Text>
        </View>
      )}

      {/* Team List */}
      <FlatList
        data={filteredTeams}
        renderItem={renderTeamItem}
        keyExtractor={(item) => `team-${item.teamNo}`}
        getItemLayout={getItemLayout}
        ListEmptyComponent={renderEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#3B82F6"
            colors={['#3B82F6']}
          />
        }
        // Performance optimizations
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={21}
        removeClippedSubviews={true}
        // Accessibility
        contentContainerStyle={filteredTeams.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  offlineBar: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400E',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
  },
});
