import React, { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  RefreshControl,
} from 'react-native';
import { BeachMatchCore, MatchStatus, MatchResult, MatchTeam, CourtInfo } from '../../../types/match-v2';
import { MatchCard } from './MatchCard';
import { determineMatchStatus } from '../../../utils/statusColors';
import { ActionIcons, UtilityIcons } from '../../Icons/IconLibrary';
import { colors, designTokens } from '../../../theme/tokens';
import { useMatches, MatchesFilters } from '../../../hooks/useMatches';
import { MatchDTO } from '../../../services/DualReadService';
import { featureFlags } from '../../../hooks/compatibility/FeatureFlags';

/**
 * Transforms MatchDTO from hook to BeachMatchCore for component compatibility
 * Maintains backward compatibility with existing component interfaces
 * @param dto MatchDTO from useMatches hook
 * @returns BeachMatchCore expected by components
 */
const transformMatchDTO = (dto: MatchDTO): BeachMatchCore => {
  // Transform result if it exists
  const result: MatchResult | undefined = dto.result ? {
    team1Sets: dto.result.team1Sets,
    team2Sets: dto.result.team2Sets,
    setScores: dto.result.setScores.flatMap(score => [score.a, score.b]),
    duration: dto.result.duration,
    winner: dto.result.winner,
    forfeit: dto.result.forfeit,
  } : undefined;

  // Transform teams
  const team1: MatchTeam = {
    teamNumber: dto.team1.teamNumber,
    teamName: dto.team1.teamName,
    player1Name: dto.team1.player1Name,
    player2Name: dto.team1.player2Name,
    countryCode: dto.team1.countryCode,
    ranking: dto.team1.ranking,
  };

  const team2: MatchTeam = {
    teamNumber: dto.team2.teamNumber,
    teamName: dto.team2.teamName,
    player1Name: dto.team2.player1Name,
    player2Name: dto.team2.player2Name,
    countryCode: dto.team2.countryCode,
    ranking: dto.team2.ranking,
  };

  // Transform court info
  const court: CourtInfo = {
    courtNumber: dto.court.courtNumber,
    courtName: dto.court.courtName,
    surface: dto.court.surface,
    location: dto.court.location,
  };

  return {
    id: dto.id,
    visNo: dto.visNo,
    version: 1,
    lastUpdated: new Date().toISOString(),
    tournamentId: dto.tournamentCode, // Using tournamentCode as tournamentId
    matchCode: dto.matchCode,
    round: dto.round,
    phaseCode: dto.phaseCode,
    status: dto.status as MatchStatus,
    court,
    scheduledDateTime: dto.scheduledDateTime,
    actualStartTime: dto.actualStartTime,
    actualEndTime: dto.actualEndTime,
    team1,
    team2,
    result,
    refereeAssignments: (dto as any).refereeAssignments || [],
    notes: (dto as any).notes,
    weather: (dto as any).weather,
    importance: (dto as any).importance,
  };
};

export interface MatchListProps {
  matches?: BeachMatchCore[]; // Made optional to allow hook-based data fetching
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
  // New props for hook-based data fetching
  tournamentCode?: string; // Enable filtering by tournament
  eventId?: number;
  matchFilters?: MatchesFilters; // Additional filters for useMatches hook
  enableRealTime?: boolean; // Enable real-time updates for live matches
  enableLiveScores?: boolean; // Enable live score updates
}

/**
 * Unified Match List Component
 * Consolidates MatchListV2 and other match list implementations
 */
export const MatchList: React.FC<MatchListProps> = ({
  matches: propMatches,
  onMatchPress,
  loading: propLoading = false,
  error: propError = null,
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
  // New hook-based props
  tournamentCode,
  eventId,
  matchFilters,
  enableRealTime = false,
  enableLiveScores = false,
}) => {
  // Hook-based data fetching when tournamentCode is provided AND feature flag is enabled
  const shouldUseHook = !!tournamentCode && featureFlags.shouldUseNewHook('MatchList', 'matches');
  const hookFilters = useMemo((): MatchesFilters => ({
    tournamentCode,
    eventId,
    ...matchFilters,
  }), [tournamentCode, eventId, matchFilters]);

  const hookResult = useMatches(
    shouldUseHook ? hookFilters : undefined,
    {
      enableRealTimeUpdates: enableRealTime,
      enableLiveScores,
      enablePerformanceMonitoring: true,
      groupByReferee: true,
    }
  );

  const {
    data: rawMatches = [],
    loading: hookLoading = false,
    error: hookError,
    refetch: forceRefresh,
  } = hookResult || {};

  // Transform hook data to component format
  const hookMatches = useMemo(() => {
    return shouldUseHook ? rawMatches.map(transformMatchDTO) : [];
  }, [rawMatches, shouldUseHook]);

  // Use either prop matches or hook matches
  const matches = propMatches || hookMatches;
  const loading = propLoading || (shouldUseHook ? hookLoading : false);
  const error = propError || (hookError?.message || null);

  // Track hook errors for migration safety
  useEffect(() => {
    if (shouldUseHook && hookError) {
      featureFlags.recordError('MatchList', hookError.message || 'Unknown hook error');
    }
  }, [shouldUseHook, hookError]);
  
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
        // Use tournamentGender if available on extended match types
        const gender = (match as any).tournamentGender;
        return gender === filterByGender;
      });
    }

    // Apply court filter
    if (filterByCourt !== 'all') {
      filtered = filtered.filter(match => {
        const courtNumber = match.court?.courtNumber || match.court?.courtName;
        return courtNumber === filterByCourt;
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
      const timeA = a.scheduledDateTime || '';
      const timeB = b.scheduledDateTime || '';
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
      {error && (onRefresh || shouldUseHook) && (
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => shouldUseHook ? forceRefresh() : onRefresh?.()}
        >
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
            (onRefresh || shouldUseHook) ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => shouldUseHook ? forceRefresh() : onRefresh?.()}
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
          (onRefresh || shouldUseHook) ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => shouldUseHook ? forceRefresh() : onRefresh?.()}
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
    backgroundColor: designTokens.neutrals.bgSurface,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: designTokens.neutrals.bgSurface,
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