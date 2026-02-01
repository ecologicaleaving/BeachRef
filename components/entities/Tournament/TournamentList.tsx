import React, { useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  RefreshControl,
} from 'react-native';
import { TournamentCore, TournamentStatus, GenderType, TournamentType } from '../../../types/tournament-v2';
import { TournamentCard } from './TournamentCard';
import { useTournaments, TournamentsFilters } from '../../../hooks/useTournaments';
import { TournamentDTO } from '../../../services/DualReadService';
import { designTokens } from '../../../theme/tokens';
import { NetworkStatus, OfflineBanner } from '../../offline';
import { DataFreshness } from '../../DataFreshness';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import { useIsOfflineData } from '../../../hooks/useOfflineStatus';

import { useAutoSync } from '../../../hooks/useSyncManager';
import { SyncStatus } from '../../SyncStatus';
import { StorageAlert } from '../../StorageAlert';
import { useStorageMonitoring } from '../../../hooks/useStorageManager';
import { TournamentStatusLegend } from '../../tournament/TournamentStatusIndicator';
import { ActionIcons, UtilityIcons } from '../../Icons/IconLibrary';
import { colors } from '../../../theme/tokens';

/**
 * Transforms TournamentDTO from hook to TournamentCore for component compatibility
 * Maintains backward compatibility with existing component interfaces
 * @param dto TournamentDTO from useTournaments hook
 * @returns TournamentCore expected by components
 */
const transformTournamentDTO = (dto: TournamentDTO): TournamentCore => ({
  id: dto.id,
  visNo: dto.visNo,
  version: 1, // Default version - could be enhanced with actual versioning
  lastUpdated: new Date().toISOString(), // Current timestamp as fallback
  code: dto.code,
  name: dto.name,
  title: dto.title,
  gender: dto.gender as GenderType,
  tournamentType: dto.tournamentType as TournamentType,
  dates: dto.dates,
  status: dto.status as TournamentStatus,
  NoEvent: undefined, // Not provided in DTO - consider adding to TournamentDTO interface
  city: dto.city,
  country: dto.country,
  countryCode: dto.countryCode,
  location: dto.location,
  // Adding default values for optional TournamentCore fields to ensure type safety
  venue: undefined,
  address: undefined,
  courts: undefined,
  prizeMoney: undefined,
  currency: undefined,
  website: undefined,
  parentEventNo: undefined,
  series: undefined,
  category: undefined,
});

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
  // Convert filterByStatus to TournamentStatus for hook
  const statusFilter = useMemo((): 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | undefined => {
    switch (filterByStatus) {
      case 'live': return 'ACTIVE';
      case 'upcoming': return 'UPCOMING';
      case 'completed': return 'COMPLETED';
      default: return undefined; // 'all' case
    }
  }, [filterByStatus]);

  // Create filters for useTournaments hook
  const tournamentsFilters = useMemo((): TournamentsFilters => ({
    status: statusFilter,
  }), [statusFilter]);

  // Use the new useTournaments hook
  const tournamentsQuery = useTournaments(tournamentsFilters, {
    enableRealTimeUpdates: true,
    enablePerformanceMonitoring: true,
  });

  const {
    data: rawTournaments = [],
    isLoading: loading,
    isRefetching: refreshing,
    error: hookError,
    forceRefresh,
  } = tournamentsQuery;

  // Transform TournamentDTO to TournamentCore and apply maxItems filter
  // Memoized transformation to prevent unnecessary re-renders
  const tournaments = useMemo(() => {
    if (!rawTournaments?.length) return [];
    
    const transformedTournaments = rawTournaments.map(transformTournamentDTO);
    return maxItems && maxItems > 0 
      ? transformedTournaments.slice(0, maxItems)
      : transformedTournaments;
  }, [rawTournaments, maxItems]);

  // Convert hook error to string for compatibility
  const error = hookError?.message || null;

  // Network and data freshness hooks
  const networkStatus = useNetworkStatus();
  const isOfflineData = useIsOfflineData(tournaments);
  
  // Auto-sync and storage monitoring
  useAutoSync();
  const storageMonitoring = useStorageMonitoring();
  const showStorageAlert = storageMonitoring.shouldShowAlert;

  // Handle refresh with hook
  const handleRefresh = useCallback(() => {
    if (!refreshEnabled) return;
    forceRefresh();
  }, [forceRefresh, refreshEnabled]);

  // Handle retry on error with hook
  const handleRetry = useCallback(() => {
    forceRefresh();
  }, [forceRefresh]);

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
          {showStorageAlert && <StorageAlert />}
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
    color: designTokens.neutrals.textSecondary,
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
    color: designTokens.neutrals.textSecondary,
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