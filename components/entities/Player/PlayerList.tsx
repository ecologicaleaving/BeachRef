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
import { PlayerInfo, PlayerCard } from './PlayerCard';
import { ActionIcons, UtilityIcons } from '../../Icons/IconLibrary';
import { colors } from '../../../theme/tokens';

export interface PlayerListProps {
  players: PlayerInfo[];
  onPlayerPress?: (player: PlayerInfo) => void;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
  showCountry?: boolean;
  showTeamInfo?: boolean;
  showStats?: boolean;
  showStatus?: boolean;
  compactMode?: boolean;
  filterByCountry?: string | 'all';
  filterByTeam?: string | 'all';
  filterByStatus?: 'all' | 'serving' | 'receiving';
  sortBy?: 'name' | 'ranking' | 'points' | 'winRate';
  sortOrder?: 'asc' | 'desc';
  groupByTeam?: boolean;
  maxItems?: number;
  emptyMessage?: string;
  variant?: 'default' | 'live' | 'team' | 'ranking';
  highlightedPlayer?: string;
}

/**
 * Unified Player List Component
 * Displays players with filtering, sorting, and grouping capabilities
 */
export const PlayerList: React.FC<PlayerListProps> = ({
  players,
  onPlayerPress,
  loading = false,
  error = null,
  onRefresh,
  refreshing = false,
  showCountry = true,
  showTeamInfo = false,
  showStats = false,
  showStatus = false,
  compactMode = false,
  filterByCountry = 'all',
  filterByTeam = 'all',
  filterByStatus = 'all',
  sortBy = 'name',
  sortOrder = 'asc',
  groupByTeam = false,
  maxItems,
  emptyMessage = 'No players found',
  variant = 'default',
  highlightedPlayer,
}) => {
  
  // Filter and sort players
  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = [...players];

    // Apply country filter
    if (filterByCountry !== 'all') {
      filtered = filtered.filter(player => player.countryCode === filterByCountry);
    }

    // Apply team filter
    if (filterByTeam !== 'all') {
      filtered = filtered.filter(player => player.teamName === filterByTeam);
    }

    // Apply status filter
    if (filterByStatus !== 'all') {
      filtered = filtered.filter(player => {
        if (filterByStatus === 'serving') return player.isServing;
        if (filterByStatus === 'receiving') return !player.isServing;
        return true;
      });
    }

    // Sort players
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'ranking':
          comparison = (a.ranking || 9999) - (b.ranking || 9999);
          break;
        case 'points':
          comparison = (b.currentPoints || 0) - (a.currentPoints || 0);
          break;
        case 'winRate':
          comparison = (b.winRate || 0) - (a.winRate || 0);
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Apply max items limit
    if (maxItems && maxItems > 0) {
      filtered = filtered.slice(0, maxItems);
    }

    return filtered;
  }, [players, filterByCountry, filterByTeam, filterByStatus, sortBy, sortOrder, maxItems]);

  // Group players by team if requested
  const groupedPlayers = useMemo(() => {
    if (!groupByTeam) {
      return [{ title: '', data: filteredAndSortedPlayers }];
    }

    const groups = filteredAndSortedPlayers.reduce((acc, player) => {
      const teamName = player.teamName || 'Individual Players';
      
      if (!acc[teamName]) {
        acc[teamName] = [];
      }
      acc[teamName].push(player);
      return acc;
    }, {} as Record<string, PlayerInfo[]>);

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({ title, data }));
  }, [filteredAndSortedPlayers, groupByTeam]);

  // Render player item
  const renderPlayer = useCallback(({ item }: { item: PlayerInfo }) => (
    <PlayerCard
      player={item}
      onPress={onPlayerPress}
      showCountry={showCountry}
      showTeamInfo={showTeamInfo}
      showStats={showStats}
      showStatus={showStatus}
      compact={compactMode}
      variant={variant}
      isHighlighted={highlightedPlayer === item.id || highlightedPlayer === item.name}
    />
  ), [onPlayerPress, showCountry, showTeamInfo, showStats, showStatus, compactMode, variant, highlightedPlayer]);

  // Render section header for grouped display
  const renderSectionHeader = ({ section }: { section: { title: string } }) => {
    if (!section.title) return null;
    
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
        <View style={styles.sectionHeaderLine} />
      </View>
    );
  };

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ActionIcons.Player style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>No Players Found</Text>
      <Text style={styles.emptySubtitle}>
        {error ? error : emptyMessage}
      </Text>
      {error && onRefresh && (
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <UtilityIcons.Refresh style={styles.retryIcon} />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render loading state
  if (loading && filteredAndSortedPlayers.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading players...</Text>
        </View>
      </View>
    );
  }

  // Render grouped list
  if (groupByTeam) {
    return (
      <View style={styles.container}>
        <FlatList
          data={groupedPlayers.flatMap(section => [
            { type: 'header', title: section.title, key: `header-${section.title}` },
            ...section.data.map(player => ({ 
              type: 'player', 
              player, 
              key: player.id || player.name 
            }))
          ])}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return renderSectionHeader({ section: { title: item.title } });
            }
            return renderPlayer({ item: (item as any).player });
          }}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.accent]}
                tintColor={colors.accent}
              />
            ) : undefined
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            filteredAndSortedPlayers.length === 0 && styles.listContentEmpty
          ]}
        />
      </View>
    );
  }

  // Render simple list
  return (
    <View style={styles.container}>
      <FlatList
        data={filteredAndSortedPlayers}
        keyExtractor={(item) => item.id || item.name}
        renderItem={renderPlayer}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          filteredAndSortedPlayers.length === 0 && styles.listContentEmpty
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginRight: 16,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
});