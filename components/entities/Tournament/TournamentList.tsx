import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Text,
  RefreshControl,
} from 'react-native';
import { TournamentCore } from '../../../types/tournament-v2';
import { TournamentCard } from './TournamentCard';
import { CacheService } from '../../../services/CacheService';
import { CacheResult } from '../../../types/cache';
import { NetworkStatus, OfflineBanner } from '../../offline';
import { DataFreshness } from '../../DataFreshness';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import { useIsOfflineData } from '../../../hooks/useOfflineStatus';
import { useDataFreshness } from '../../../hooks/useDataFreshness';
import { useAutoSync } from '../../../hooks/useSyncManager';
import { SyncStatus } from '../../SyncStatus';
import { StorageAlert } from '../../StorageAlert';
import { useStorageMonitoring } from '../../../hooks/useStorageManager';
import { TournamentStatusLegend } from '../../tournament/TournamentStatusIndicator';
import { ActionIcons, UtilityIcons } from '../../Icons/IconLibrary';
import { colors } from '../../../theme/tokens';

export interface TournamentListProps {
  onTournamentPress: (tournament: TournamentCore) => void;
  showDefaultToggle?: boolean;
  showStatusBadge?: boolean;
  compactMode?: boolean;
  showStatusLegend?: boolean;
  showNetworkStatus?: boolean;
  refreshEnabled?: boolean;
  filterByStatus?: 'all' | 'live' | 'upcoming' | 'completed';
  maxItems?: number;
}

/**
 * Unified Tournament List Component
 * Consolidates VisTournamentList, TournamentList, and SimpleTournamentList functionality
 */
export const TournamentList: React.FC<TournamentListProps> = ({
  onTournamentPress,
  showDefaultToggle = false,
  showStatusBadge = true,
  compactMode = false,
  showStatusLegend = false,
  showNetworkStatus = true,
  refreshEnabled = true,
  filterByStatus = 'all',
  maxItems,
}) => {
  const [tournaments, setTournaments] = useState<TournamentCore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Network and data freshness hooks
  const networkStatus = useNetworkStatus();
  const isOnline = networkStatus.isOnline;
  const isOfflineData = useIsOfflineData(tournaments);
  const dataFreshness = useDataFreshness(tournaments);
  
  // Auto-sync and storage monitoring
  useAutoSync();
  const { storageStatus, showStorageAlert } = useStorageMonitoring();

  // Load tournaments from cache/API
  const loadTournaments = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);
      
      const result: CacheResult<TournamentCore[]> = await CacheService.getTournaments(
        {},
        forceRefresh
      );

      if (result.success && result.data) {
        let filteredTournaments = result.data;

        // Apply status filter
        if (filterByStatus !== 'all') {
          // Add filtering logic here based on tournament status
          // This would need to be implemented based on your status determination logic
        }

        // Apply max items limit
        if (maxItems && maxItems > 0) {
          filteredTournaments = filteredTournaments.slice(0, maxItems);
        }

        setTournaments(filteredTournaments);
      } else {
        setError(result.error || 'Failed to load tournaments');
      }
    } catch (error) {
      console.error('Error loading tournaments:', error);
      setError('Failed to load tournaments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterByStatus, maxItems]);

  // Initial load
  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    if (!refreshEnabled) return;
    setRefreshing(true);
    loadTournaments(true);
  }, [loadTournaments, refreshEnabled]);

  // Handle retry on error
  const handleRetry = useCallback(() => {
    setLoading(true);
    loadTournaments(true);
  }, [loadTournaments]);

  // Render tournament item
  const renderTournament = useCallback(({ item }: { item: TournamentCore }) => (
    <TournamentCard
      tournament={item}
      onPress={() => onTournamentPress(item)}
      showDefaultToggle={showDefaultToggle}
      showStatusBadge={showStatusBadge}
      compact={compactMode}
    />
  ), [onTournamentPress, showDefaultToggle, showStatusBadge, compactMode]);

  // Render header with network status and legend
  const renderHeader = () => (
    <View style={styles.header}>
      {showNetworkStatus && (
        <>
          <NetworkStatus />
          {isOfflineData && <OfflineBanner />}
          <DataFreshness data={tournaments} />
          <SyncStatus />
          {showStorageAlert && <StorageAlert status={storageStatus} />}
        </>
      )}
      
      {showStatusLegend && <TournamentStatusLegend />}
    </View>
  );

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ActionIcons.Tournament style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>No Tournaments Found</Text>
      <Text style={styles.emptySubtitle}>
        {error ? error : 'No tournaments match your current filters'}
      </Text>
      {error && (
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <UtilityIcons.Refresh style={styles.retryIcon} />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render loading state
  if (loading && tournaments.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading tournaments...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tournaments}
        keyExtractor={(item) => item.visNo || item.id}
        renderItem={renderTournament}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          refreshEnabled ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          tournaments.length === 0 && styles.listContentEmpty
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listContent: {
    paddingBottom: 32,
  },
  listContentEmpty: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    color: '#D1D5DB',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B365D',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    marginRight: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});