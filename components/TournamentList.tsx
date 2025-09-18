import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { H1Text, H2Text, BodyText, CaptionText } from './Typography';
import { TournamentCore , TournamentType } from '../types/tournament-v2';

import { testSupabaseConnection } from '../services/supabase';
import { useTournaments } from '../hooks/useTournaments';
import { NetworkStatus, OfflineBanner, OfflineBadge } from './offline';
import { DataFreshness } from './DataFreshness';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useIsOfflineData } from '../hooks/useOfflineStatus';
import { useDataFreshness } from '../hooks/useDataFreshness';
import { useAutoSync } from '../hooks/useSyncManager';
import { SyncStatus } from './SyncStatus';
import { StorageAlert, StorageStatusIndicator } from './StorageAlert';
import { useStorageMonitoring } from '../hooks/useStorageManager';
import { CompactTournamentStatusIndicator, TournamentStatusLegend } from './tournament/TournamentStatusIndicator';
import MinimalTournamentDetail from './MinimalTournamentDetail';
import { StatusBadge } from './Status';
import { getStatusColorWithText, determineTournamentStatus } from '../utils/statusColors';
import { ActionIcons, UtilityIcons, DataIcons, CommunicationIcons } from './Icons/IconLibrary';

interface TournamentItemProps {
  tournament: TournamentCore;
  onPress: () => void;
  isOfflineData?: boolean;
  isRecentlyChanged?: boolean;
  subscriptionActive?: boolean;
}

const TournamentItem: React.FC<TournamentItemProps> = ({ 
  tournament, 
  onPress, 
  isOfflineData = false,
  isRecentlyChanged = false,
  subscriptionActive = false
}) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getLocation = () => {
    // TournamentCore doesn't have City/CountryName - would need location service
    return 'Location TBA'; // Simplified for migration
  };

  const getDateRange = () => {
    // TournamentCore has structured dates field
    if (tournament.dates.startDate && tournament.dates.endDate) {
      const start = formatDate(tournament.dates.startDate);
      const end = formatDate(tournament.dates.endDate);
      if (start === end) return start;
      return `${start} - ${end}`;
    }
    return formatDate(tournament.dates.startDate) || formatDate(tournament.dates.endDate);
  };

  // Determine tournament status for color coding
  const tournamentStatus = determineTournamentStatus(tournament);
  const statusColors = getStatusColorWithText(tournamentStatus);
  
  return (
    <TouchableOpacity 
      style={[
        styles.tournamentItem,
        isRecentlyChanged && styles.recentlyChangedItem,
        { borderLeftWidth: 4, borderLeftColor: statusColors.backgroundColor }
      ]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <OfflineBadge isOfflineData={isOfflineData} />
      <View style={styles.tournamentHeader}>
        <View style={styles.tournamentHeaderLeft}>
          <CaptionText style={styles.tournamentNumber}>#{tournament.visNo}</CaptionText>
          <CaptionText style={styles.tournamentCode}>{tournament.code}</CaptionText>
        </View>
        <View style={styles.tournamentHeaderRight}>
          <StatusBadge 
            status={tournamentStatus}
            variant="solid"
            size="small"
            showIcon={false}
          />
          <CompactTournamentStatusIndicator 
            tournament={tournament}
            isRecentlyChanged={isRecentlyChanged}
            subscriptionActive={subscriptionActive}
          />
        </View>
      </View>
      
      <H2Text style={styles.tournamentName}>
        {tournament.name || `Tournament ${tournament.visNo}`}
      </H2Text>
      
      {getLocation() && (
        <View style={styles.locationRow}>
          <DataIcons.Details size="small" theme="default" colorKey="secondary" />
          <BodyText style={styles.tournamentLocation}>{getLocation()}</BodyText>
        </View>
      )}
      
      {getDateRange() && (
        <View style={styles.dateRow}>
          <UtilityIcons.Info size="small" theme="default" colorKey="muted" />
          <CaptionText style={styles.tournamentDate}>{getDateRange()}</CaptionText>
        </View>
      )}
    </TouchableOpacity>
  );
};

const TournamentList: React.FC = () => {
  const [selectedType, setSelectedType] = useState<TournamentType>('BPT');
  const [selectedTournament, setSelectedTournament] = useState<TournamentCore | null>(null);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [showStatusLegend, setShowStatusLegend] = useState(false);
  
  // Use simplified tournaments hook - replaces manual loading logic
  const {
    data: tournaments = [],
    isLoading: loading,
    error: hookError,
    refetch: refetchTournaments,
    dataUpdatedAt,
    isStale
  } = useTournaments({
    status: 'ACTIVE', // currentlyActive equivalent
    season: 2025 // Only this year's tournaments for performance
  });
  
  // Convert hook error to string format for compatibility
  const error = hookError?.message || null;
  
  const { isConnected, isOffline } = useNetworkStatus();
  // Create mock cache result for compatibility with existing UI components
  const cacheResult = tournaments.length > 0 ? {
    data: tournaments,
    source: isStale ? 'cache' as const : 'fresh' as const,
    timestamp: dataUpdatedAt,
    cached: true
  } : null;
  const isOfflineData = useIsOfflineData(cacheResult);
  const freshnessInfo = useDataFreshness(cacheResult);
  const { forceSyncNow } = useAutoSync({ currentlyActive: true, tournamentType: selectedType });
  const { shouldShowAlert } = useStorageMonitoring();
  // Temporarily disable problematic tournament status hook to prevent infinite re-renders
  const tournamentsWithStatus = tournaments;
  const recentlyChangedTournaments = new Set();
  const subscriptionActive = false;
  const statusError = null;
  const statusLastUpdate = null;
  const clearRecentChanges = () => {};

  const checkSupabaseConnection = useCallback(async () => {
    try {
      const isConnected = await testSupabaseConnection();
      setSupabaseConnected(isConnected);
    } catch (err) {
      // console.error('Failed to test Supabase connection:', err);
      setSupabaseConnected(false);
    }
  }, []);

  // Handle offline banner based on data freshness
  useEffect(() => {
    if (cacheResult) {
      const isOfflineSource = cacheResult.source === 'cache' || isStale;
      setShowOfflineBanner(isOfflineSource && isOffline);
    }
  }, [cacheResult, isStale, isOffline]);

  // Check Supabase connection on mount
  useEffect(() => {
    checkSupabaseConnection();
  }, [checkSupabaseConnection]);

  // Handle errors from the hook
  useEffect(() => {
    if (error) {
      if (isOffline) {
        Alert.alert('Offline', 'No cached tournament data available. Connect to the internet to load tournaments.');
      } else {
        Alert.alert('Error', 'Failed to load tournaments: ' + error);
      }
    }
  }, [error, isOffline]);

  const renderTournament = ({ item }: { item: Tournament }) => {
    // Use tournament with status updates if available
    const tournamentWithStatus = tournamentsWithStatus.find(t => t.No === item.No) || item;
    const isRecentlyChanged = recentlyChangedTournaments.has(item.No);
    
    return (
      <TournamentItem 
        tournament={tournamentWithStatus} 
        onPress={() => setSelectedTournament(tournamentWithStatus)}
        isOfflineData={isOfflineData}
        isRecentlyChanged={isRecentlyChanged}
        subscriptionActive={subscriptionActive}
      />
    );
  };

  const renderFilterTabs = () => {
    const filterTypes: TournamentType[] = ['ALL', 'FIVB', 'CEV', 'BPT'];
    
    return (
      <View style={styles.filterContainer}>
        {filterTypes.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterButton,
              selectedType === type && styles.activeFilterButton
            ]}
            onPress={() => setSelectedType(type)}
          >
            <BodyText style={[
              styles.filterButtonText,
              selectedType === type && styles.activeFilterButtonText
            ]}>
              {type}
            </BodyText>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Show tournament detail if a tournament is selected
  if (selectedTournament) {
    return (
      <MinimalTournamentDetail 
        tournament={selectedTournament} 
        onBack={() => setSelectedTournament(null)} 
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <BodyText style={styles.loadingText}>Loading tournaments...</BodyText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <NetworkStatus style={styles.networkStatus} />
        <H2Text style={styles.errorText}>Error: {error}</H2Text>
        <BodyText style={styles.errorSubtext}>
          {isOffline 
            ? 'No cached tournament data available offline'
            : 'Please check your internet connection'
          }
        </BodyText>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => refetchTournaments()}
          accessibilityLabel="Retry loading tournaments"
        >
          <View style={styles.retryButtonContent}>
            <ActionIcons.Refresh size="small" theme="default" colorKey="primary" />
            <BodyText style={styles.retryButtonText}>Try Again</BodyText>
          </View>
        </TouchableOpacity>
        
        {isConnected && (
          <TouchableOpacity 
            style={[styles.retryButton, styles.forceSyncButton]} 
            onPress={() => forceSyncNow().catch(console.error)}
            accessibilityLabel="Force synchronization"
          >
            <View style={styles.retryButtonContent}>
              <ActionIcons.Refresh size="small" theme="default" colorKey="primary" />
              <BodyText style={styles.retryButtonText}>Force Sync</BodyText>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const getSubtitle = () => {
    if (tournaments.length === 0) {
      return isOffline 
        ? 'No cached tournaments available offline.'
        : 'No active tournaments found. Showing upcoming tournaments when available.';
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Check if any tournaments are actually happening today
    const happeningNow = tournaments.filter(t => {
      if (!t.StartDate || !t.EndDate) return false;
      try {
        const start = new Date(t.StartDate);
        const end = new Date(t.EndDate);
        return start <= today && today <= end;
      } catch {
        return false;
      }
    });
    
    if (happeningNow.length > 0) {
      return `${happeningNow.length} tournament${happeningNow.length > 1 ? 's' : ''} happening now`;
    }
    
    // Check if these are future tournaments
    const futureTournaments = tournaments.filter(t => {
      if (!t.StartDate) return false;
      try {
        const start = new Date(t.StartDate);
        return start > today;
      } catch {
        return false;
      }
    });
    
    if (futureTournaments.length > 0) {
      return `${futureTournaments.length} upcoming tournament${futureTournaments.length > 1 ? 's' : ''}`;
    }
    
    return `${tournaments.length} tournament${tournaments.length > 1 ? 's' : ''}`;
  };

  return (
    <View style={styles.container}>
      <NetworkStatus compact style={styles.networkStatusCompact} />
      
      <StorageAlert autoShow={shouldShowAlert} />
      
      {showOfflineBanner && (
        <OfflineBanner 
          onDismiss={() => setShowOfflineBanner(false)}
          showWhenOnline={isConnected && cacheResult?.source === 'offline'}
        />
      )}
      
      <View style={styles.titleRow}>
        <H1Text>Active Tournaments</H1Text>
        <TouchableOpacity 
          style={styles.statusLegendButton}
          onPress={() => setShowStatusLegend(!showStatusLegend)}
          accessibilityLabel="Show status legend"
          accessibilityHint="Double tap to view tournament status explanations"
        >
          <UtilityIcons.Info 
            size="medium" 
            theme="highContrast" 
            colorKey="secondary"
            isInteractive={true}
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.subtitleContainer}>
        <BodyText style={styles.subtitle}>
          {getSubtitle()}
          {cacheResult && (
            <CaptionText style={styles.dataSourceText}>
              {' '}(from {cacheResult.source})
            </CaptionText>
          )}
        </BodyText>
        
        {/* Real-time status information */}
        {subscriptionActive && (
          <View style={styles.realtimeStatus}>
            <View style={styles.realtimeStatusRow}>
              <CommunicationIcons.Notification size="small" theme="default" colorKey="accent" />
              <CaptionText style={styles.realtimeStatusText}>
                Real-time updates active
              </CaptionText>
            </View>
            {recentlyChangedTournaments.size > 0 && (
              <TouchableOpacity 
                style={styles.clearChangesButton}
                onPress={clearRecentChanges}
              >
                <CaptionText style={styles.clearChangesText}>
                  Clear {recentlyChangedTournaments.size} changes
                </CaptionText>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {statusError && (
          <View style={styles.statusErrorRow}>
            <CommunicationIcons.Alert size="small" theme="highContrast" colorKey="accent" />
            <CaptionText style={styles.statusError}>
              Status subscription error: {statusError}
            </CaptionText>
          </View>
        )}
        
        {statusLastUpdate && (
          <CaptionText style={styles.statusLastUpdate}>
            Last status update: {statusLastUpdate.toLocaleTimeString()}
          </CaptionText>
        )}
      </View>
      
      <View style={styles.statusRow}>
        {cacheResult && (
          <View style={styles.freshnessContainer}>
            <DataFreshness 
              timestamp={cacheResult.timestamp}
              size="medium"
              style={styles.freshness}
            />
            {freshnessInfo && (
              <CaptionText style={styles.freshnessText}>
                Data {freshnessInfo.relativeTime}
              </CaptionText>
            )}
          </View>
        )}
        
        <View style={styles.statusIndicators}>
          <SyncStatus 
            compact 
            style={styles.syncStatus}
            onForceSync={() => forceSyncNow().catch(console.error)}
          />
          <StorageStatusIndicator style={styles.storageStatus} />
        </View>
      </View>
      
      {supabaseConnected !== null && (
        <View style={styles.connectionStatus}>
          <View style={styles.connectionRow}>
            <DataIcons.Stats size="small" theme="default" colorKey="secondary" />
            <CaptionText style={[
              styles.connectionText,
              supabaseConnected ? styles.connectedText : styles.disconnectedText
            ]}>
              Supabase: {supabaseConnected ? 'Connected' : 'Disconnected'}
            </CaptionText>
          </View>
        </View>
      )}
      
      {renderFilterTabs()}
      
      {showStatusLegend && (
        <TournamentStatusLegend 
          onClose={() => setShowStatusLegend(false)}
        />
      )}
      
      <FlatList
        data={tournaments}
        renderItem={renderTournament}
        keyExtractor={(item) => item.No}
        style={styles.list}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={true}
        extraData={{
          recentlyChangedTournaments,
          subscriptionActive,
          tournamentsWithStatus
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
    color: '#333',
  },
  statusLegendButton: {
    marginLeft: 12,
    padding: 4,
  },
  subtitleContainer: {
    marginBottom: 20,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#666',
  },
  realtimeStatus: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  realtimeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  realtimeStatusText: {
    color: '#4caf50',
    fontWeight: '600',
  },
  clearChangesButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#ff9800',
    borderRadius: 4,
  },
  clearChangesText: {
    color: 'white',
    fontWeight: '600',
  },
  statusErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusError: {
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 0,
  },
  statusLastUpdate: {
    color: '#999',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    color: '#666',
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  tournamentItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.1)',
    elevation: 5,
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tournamentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tournamentHeaderRight: {
    alignItems: 'center',
  },
  recentlyChangedItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
    boxShadow: '0px 2px 3.84px rgba(255, 152, 0, 0.2)',
  },
  tournamentNumber: {
    color: '#0066cc',
    fontWeight: 'bold',
  },
  tournamentCode: {
    color: '#999',
    fontFamily: 'monospace',
  },
  tournamentName: {
    color: '#333',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 6,
  },
  tournamentLocation: {
    color: '#666',
    marginBottom: 0,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tournamentDate: {
    color: '#999',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0066cc',
    backgroundColor: 'transparent',
  },
  activeFilterButton: {
    backgroundColor: '#0066cc',
  },
  filterButtonText: {
    color: '#0066cc',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  connectionStatus: {
    alignItems: 'center',
    marginBottom: 16,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectionText: {
    fontWeight: '500',
  },
  connectedText: {
    color: '#4caf50',
  },
  disconnectedText: {
    color: '#f44336',
  },
  networkStatus: {
    marginBottom: 16,
  },
  networkStatusCompact: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 1,
  },
  dataSourceText: {
    color: '#999',
    fontStyle: 'italic',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0066cc',
    borderRadius: 8,
  },
  retryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  freshnessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  freshness: {
    marginRight: 8,
  },
  freshnessText: {
    color: '#666',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  syncStatus: {
    marginLeft: 8,
  },
  forceSyncButton: {
    backgroundColor: '#4CAF50',
    marginTop: 8,
  },
  statusIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storageStatus: {
    marginLeft: 4,
  },
});

export default TournamentList;