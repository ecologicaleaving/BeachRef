import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  RefreshControl,
} from 'react-native';
import { BeachMatchCore } from '../../../types/match-v2';
import { MatchCard } from './MatchCard';
import { determineMatchStatus } from '../../../utils/statusColors';
import { ActionIcons, UtilityIcons } from '../../Icons/IconLibrary';
import { colors } from '../../../theme/tokens';

export interface MatchListProps {
  matches: BeachMatchCore[];
  onMatchPress?: (match: BeachMatchCore) => void;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
  showStatusBadge?: boolean;
  showReferee?: boolean;
  showDuration?: boolean;
  compactMode?: boolean;
  filterByStatus?: 'all' | 'live' | 'upcoming' | 'completed';
  filterByGender?: 'all' | 'M' | 'W';
  filterByCourt?: string | 'all';
  groupByStatus?: boolean;
  maxItems?: number;
  emptyMessage?: string;
  variant?: 'default' | 'referee' | 'live';
}

/**
 * Unified Match List Component
 * Consolidates MatchListV2 and other match list implementations
 */
export const MatchList: React.FC<MatchListProps> = ({
  matches,
  onMatchPress,
  loading = false,
  error = null,
  onRefresh,
  refreshing = false,
  showStatusBadge = true,
  showReferee = false,
  showDuration = false,
  compactMode = false,
  filterByStatus = 'all',
  filterByGender = 'all',
  filterByCourt = 'all',
  groupByStatus = false,
  maxItems,
  emptyMessage = 'No matches found',
  variant = 'default',
}) => {
  
  // Filter and sort matches
  const filteredMatches = useMemo(() => {
    let filtered = [...matches];

    // Apply status filter
    if (filterByStatus !== 'all') {
      filtered = filtered.filter(match => {
        const status = determineMatchStatus(match);
        return status === filterByStatus;
      });
    }

    // Apply gender filter
    if (filterByGender !== 'all') {
      filtered = filtered.filter(match => {
        const gender = (match as any).tournamentGender || match.teams?.gender;
        return gender === filterByGender;
      });
    }

    // Apply court filter
    if (filterByCourt !== 'all') {
      filtered = filtered.filter(match => {
        const courtName = match.court?.name || match.court?.number?.toString();
        return courtName === filterByCourt;
      });
    }

    // Sort by time and status
    filtered.sort((a, b) => {
      const statusA = determineMatchStatus(a);
      const statusB = determineMatchStatus(b);
      
      // Priority order: live -> upcoming -> completed
      const statusPriority = { current: 0, upcoming: 1, completed: 2 };
      const priorityA = statusPriority[statusA as keyof typeof statusPriority] ?? 3;
      const priorityB = statusPriority[statusB as keyof typeof statusPriority] ?? 3;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Within same status, sort by time
      const timeA = a.scheduledTime?.time || '';
      const timeB = b.scheduledTime?.time || '';
      return timeA.localeCompare(timeB);
    });

    // Apply max items limit
    if (maxItems && maxItems > 0) {
      filtered = filtered.slice(0, maxItems);
    }

    return filtered;
  }, [matches, filterByStatus, filterByGender, filterByCourt, maxItems]);

  // Group matches by status if requested
  const groupedMatches = useMemo(() => {
    if (!groupByStatus) {
      return [{ title: '', data: filteredMatches }];
    }

    const groups = filteredMatches.reduce((acc, match) => {
      const status = determineMatchStatus(match);
      const statusTitle = status === 'current' ? 'Live Matches' : 
                         status === 'upcoming' ? 'Upcoming Matches' : 
                         'Completed Matches';
      
      if (!acc[statusTitle]) {
        acc[statusTitle] = [];
      }
      acc[statusTitle].push(match);
      return acc;
    }, {} as Record<string, BeachMatchCore[]>);

    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  }, [filteredMatches, groupByStatus]);

  // Render match item
  const renderMatch = useCallback(({ item }: { item: BeachMatchCore }) => (
    <MatchCard
      match={item}
      onPress={onMatchPress}
      showStatusBadge={showStatusBadge}
      showReferee={showReferee}
      showDuration={showDuration}
      compact={compactMode}
      variant={variant}
    />
  ), [onMatchPress, showStatusBadge, showReferee, showDuration, compactMode, variant]);

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
      <ActionIcons.Match style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>No Matches Found</Text>
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
  if (loading && filteredMatches.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading matches...</Text>
        </View>
      </View>
    );
  }

  // Render grouped list
  if (groupByStatus) {
    return (
      <View style={styles.container}>
        <FlatList
          data={groupedMatches.flatMap(section => [
            { type: 'header', title: section.title, key: `header-${section.title}` },
            ...section.data.map(match => ({ type: 'match', match, key: match.id || match.matchNumber }))
          ])}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return renderSectionHeader({ section: { title: item.title } });
            }
            return renderMatch({ item: (item as any).match });
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
            filteredMatches.length === 0 && styles.listContentEmpty
          ]}
        />
      </View>
    );
  }

  // Render simple list
  return (
    <View style={styles.container}>
      <FlatList
        data={filteredMatches}
        keyExtractor={(item) => item.id || item.matchNumber || `match-${Math.random()}`}
        renderItem={renderMatch}
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
          filteredMatches.length === 0 && styles.listContentEmpty
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