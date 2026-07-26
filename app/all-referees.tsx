/**
 * All Referees Screen
 * Displays all beach volleyball referees with real data using the same system as tournament-ref page
 * Sorted by matches officiated in descending order, with real statistics from VIS API
 */

import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { NavigationHeader } from '../components/navigation/NavigationHeader';
import { Container } from '../components/Foundation/Container';
import { Text } from '../components/Typography/Text';
import { FlagImage } from '../components/FlagImage';
import { colors, designTokens } from '../theme/tokens';
import { RefereeStatsService, SeasonStats, CareerStats } from '../services/RefereeStatsService';
import { RefereeDirectoryService } from '../services/RefereeDirectoryService';
import { loadRefereeSeasonStats } from '../services/RefereeSeasonStatsLoader';
import { createShadow } from '../theme/shadows';
// import { AssignmentStatusProvider } from '../hooks/useAssignmentStatus'; // Not needed for All Referees

interface Referee {
  RefereeId: string; // 6-digit NoReferee from VIS API
  firstName: string;
  lastName: string;
  federationCode: string;
  gender: string;
  level?: string;
  totalMatches?: number; // For sorting
  /**
   * Season stats already fetched by the bulk pass, when available.
   *
   * Issue #65: the collapsed card used to fetch these itself, from a `useEffect`
   * on mount — one `getSeasonStats` (>= 3 VIS requests) per row, for every row,
   * with nothing bounding it. On a list of several hundred referees that second
   * fan-out was larger than the first one. The bulk pass already asks for
   * exactly this data, so the card is handed the answer instead of asking again.
   */
  seasonStats?: SeasonStats | null;
}

type StatsTab = 'Current' | 'Season' | 'Career';

// Exact RefereeCard component from tournament-ref screen
const RefereeCard = ({
  referee,
  tournamentNo,
  expanded,
  onToggle
}: {
  referee: Referee;
  tournamentNo: string;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<StatsTab>('Current');
  const [currentStats, setCurrentStats] = useState<SeasonStats | null>(referee?.seasonStats ?? null);
  const [seasonStats, setSeasonStats] = useState<SeasonStats | null>(null);
  const [careerStats, setCareerStats] = useState<CareerStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  /**
   * Adopt the stats the bulk pass produced, whenever they land.
   *
   * Issue #65: this replaces a `useEffect` that called `getSeasonStats` on
   * mount. Every card did it, the list is not virtualised so every card mounts,
   * and nothing bounded the result — hundreds of simultaneous requests on top
   * of the ones the screen had already fired. Now the data flows down from the
   * one place that fetches it, and the card issues a request only when the user
   * actually expands it.
   */
  useEffect(() => {
    if (referee?.seasonStats) {
      setCurrentStats(referee.seasonStats);
    }
  }, [referee?.seasonStats]);

  // Load stats when card is expanded or tab changes
  useEffect(() => {
    if (expanded && referee?.RefereeId) {
      loadRefereeStats();
    }
  }, [expanded, referee?.RefereeId, activeTab]);

  const loadRefereeStats = async () => {
    if (!referee?.RefereeId || !tournamentNo) {
      return;
    }
    
    setStatsLoading(true);
    
    try {
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );

      switch (activeTab) {
        case 'Current':
          // Use season stats for Current tab as well (current year season)
          const currentYear = new Date().getFullYear();
          const currentSeasonYear = currentYear.toString();
          const currentPromise = RefereeStatsService.getSeasonStats(referee.RefereeId, currentSeasonYear);
          const current = await Promise.race([currentPromise, timeout]);
          setCurrentStats(current);
          break;
        case 'Season':
          // Use current calendar year for season stats, not tournament year
          const seasonCurrentYear = new Date().getFullYear();
          const seasonYear = seasonCurrentYear.toString();
          const seasonPromise = RefereeStatsService.getSeasonStats(referee.RefereeId, seasonYear);
          const season = await Promise.race([seasonPromise, timeout]);
          setSeasonStats(season);
          break;
        case 'Career':
          const careerPromise = RefereeStatsService.getCareerStats(referee.RefereeId);
          const career = await Promise.race([careerPromise, timeout]);
          setCareerStats(career);
          break;
      }
    } catch (error) {
      console.error(`Error loading ${activeTab} stats for referee ${referee.RefereeId}:`, error);
      // Set empty stats on error to prevent indefinite loading
      switch (activeTab) {
        case 'Season':
          setSeasonStats(null);
          break;
        case 'Career':
          setCareerStats(null);
          break;
      }
    } finally {
      setStatsLoading(false);
    }
  };

  const renderStatsContent = () => {
    if (statsLoading) {
      return (
        <View style={styles.statsLoading}>
          <Text style={styles.loadingText}>Loading stats...</Text>
        </View>
      );
    }

    const stats = activeTab === 'Current' ? currentStats : 
                 activeTab === 'Season' ? seasonStats : careerStats;

    if (!stats) {
      return (
        <View style={styles.statsEmpty}>
          <Text style={styles.emptyText}>No {activeTab.toLowerCase()} data available</Text>
        </View>
      );
    }

    return (
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.totalMatches}</Text>
          <Text style={styles.statLabel}>TOT</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.matchesAsFirst}</Text>
          <Text style={styles.statLabel}>R1</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.matchesAsSecond}</Text>
          <Text style={styles.statLabel}>R2</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.menMatches}</Text>
          <Text style={styles.statLabel}>M</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.womenMatches}</Text>
          <Text style={styles.statLabel}>W</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={onToggle} activeOpacity={0.7}>
        {referee?.federationCode && (
          <View style={styles.flagSection}>
            <FlagImage federationCode={referee.federationCode} size="medium" style={styles.flagLeft} />
            <Text style={styles.countryCode}>{referee.federationCode}</Text>
          </View>
        )}
        <View style={styles.refereeMainInfo}>
          <Text style={styles.refereeName}>
            {referee?.firstName || 'Unknown'}
          </Text>
          <Text style={styles.refereeLastName}>
            {referee?.lastName || 'Referee'}
          </Text>
        </View>
        <View style={styles.cardHeaderRight}>
          {/* Always show basic R1/R2 totals */}
          <View style={styles.roleTotals}>
            <View style={styles.roleTotal}>
              <Text style={styles.roleTotalCount}>{currentStats?.matchesAsFirst || 0}</Text>
              <Text style={styles.roleTotalLabel}>R1</Text>
            </View>
            <Text style={styles.roleTotalSeparator}>•</Text>
            <View style={styles.roleTotal}>
              <Text style={styles.roleTotalCount}>{currentStats?.matchesAsSecond || 0}</Text>
              <Text style={styles.roleTotalLabel}>R2</Text>
            </View>
          </View>
          <Text style={styles.expandIcon}>
            {expanded ? '▼' : '▶'}
          </Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.statsPanel}>
          <View style={styles.tabBar}>
            {(['Current', 'Season', 'Career'] as StatsTab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {renderStatsContent()}
        </View>
      )}

      {/* Profile button at bottom */}
      <View style={styles.profileButtonContainer}>
        <TouchableOpacity
          style={styles.profileButtonBottom}
          activeOpacity={0.8}
          onPress={() => {
            try {
              const payload: any = {
                id: (referee?.RefereeId || '').toString(),
                firstName: referee?.firstName || '',
                lastName: referee?.lastName || '',
                federationCode: referee?.federationCode || '',
                gender: referee?.gender || '',
                status: 'Active',
                role: 'Referee',
                type: 'International'
              };
              router.push({ pathname: '/referee-profile', params: { refereeData: JSON.stringify(payload) } });
            } catch (e) {
              console.error('Failed to navigate to referee profile', e);
            }
          }}
        >
          <Text style={styles.profileButtonText}>View Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

function AllRefereesScreenContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [referees, setReferees] = useState<Referee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  /**
   * True while the bounded stats pass is still filling in match counts. Kept
   * separate from `loading` on purpose (issue #65, AC1): the list is usable
   * without the counters, so the spinner must not wait for them.
   */
  const [statsPending, setStatsPending] = useState(false);
  const [expandedRefereeId, setExpandedRefereeId] = useState<string | null>(null);
  const cancelledRef = React.useRef(false);

  // Use a default tournament for all referees (latest active tournament)
  const defaultTournamentNo = '1053'; // Can be made dynamic later

  const loadAllReferees = async () => {
    setLoading(true);
    setLoadError(null);
    try {

      // Phase 1: Load only active referees for current season
      const activeRefereesLoaded = await loadActiveSeasonReferees();
      if (!activeRefereesLoaded) {
        setReferees([]);
      }

      // Phase 2: Load remaining referees from other seasons incrementally in background
      setTimeout(() => {
        loadInactiveRefereesIncrementally();
      }, 1000);

    } catch (error) {
      console.error('Error loading referees:', error);
      setReferees([]);
      // AC1: a failure has to be visible. Before issue #65 the only two states
      // this screen could reach were "spinner" and "No referees available",
      // which is indistinguishable from a healthy empty result.
      setLoadError(
        error instanceof Error && error.message
          ? error.message
          : 'Could not load referees. Check your connection and pull to refresh.'
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Issue #65 — the rewritten load.
   *
   * The old version awaited an unbounded `Promise.all` over `getSeasonStats`
   * before calling `setReferees`, and `setLoading(false)` sat downstream of that
   * await. Two consequences, both visible to the user:
   *
   * - the list was withheld until the *last* of ~600 VIS requests answered, and
   * - if one of them never answered, the spinner stayed up forever.
   *
   * Now the list is published as soon as it is known — it is complete at that
   * point, only the sort key is missing — and the stats fill in behind it with a
   * bounded fan-out and a per-referee timeout. `loading` is released with the
   * list, not with the statistics.
   */
  const loadActiveSeasonReferees = async (): Promise<boolean> => {
    try {
      const currentYear = new Date().getFullYear();

      // Get matches from current year to extract active referee IDs
      const activeRefereeIds = await getActiveRefereeIdsFromMatches(currentYear);

      if (activeRefereeIds.size > 0) {

        // Get referee details for active IDs only
        const activeReferees = await getRefereeDetailsByIds(Array.from(activeRefereeIds));

        if (activeReferees.length > 0) {
          // Publish the list first, unsorted, with placeholder counters.
          setReferees(activeReferees.map(referee => ({ ...referee, totalMatches: 0 })));

          // Then fill the counters in, at most REFEREE_STATS_CONCURRENCY at a
          // time, each capped by REFEREE_STATS_TIMEOUT_MS. Not awaited: nothing
          // downstream of it may hold the spinner.
          void fillSeasonStats(activeReferees, currentYear.toString());

          // Load inactive referees in background
          setTimeout(() => {
            loadInactiveReferees(activeRefereeIds);
          }, 2000);

          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error loading active season referees:', error);
      throw error;
    }
  };

  /**
   * Bounded, progressive stats pass. Each result is merged into the list as it
   * lands and the list is re-sorted, so the ordering converges to "most matches
   * first" without ever blocking the render.
   */
  const fillSeasonStats = async (targets: Referee[], season: string): Promise<void> => {
    setStatsPending(true);
    try {
      await loadRefereeSeasonStats(targets, season, {
        isCancelled: () => cancelledRef.current,
        onResult: ({ refereeId, stats, totalMatches }) => {
          setReferees(prev => {
            const next = prev.map(referee =>
              referee.RefereeId === refereeId
                ? { ...referee, totalMatches, seasonStats: stats }
                : referee
            );
            return next.sort((a, b) => (b.totalMatches || 0) - (a.totalMatches || 0));
          });
        },
      });
    } finally {
      if (!cancelledRef.current) {
        setStatsPending(false);
      }
    }
  };

  const getActiveRefereeIdsFromMatches = async (year: number): Promise<Set<string>> => {
    try {
      
      // First get recent tournaments from current year
      const recentTournaments = await getRecentTournaments(year);
      
      if (recentTournaments.length === 0) {
        return new Set();
      }
      
      
      const refereeIds = new Set<string>();
      
      // Get matches from a few recent tournaments to find active referees
      const tournamentsToCheck = recentTournaments.slice(0, 10); // Check up to 10 recent tournaments
      
      for (const tournament of tournamentsToCheck) {
        try {
          const tournamentReferees = await getRefereeIdsFromTournament(tournament.visNo);
          tournamentReferees.forEach(id => refereeIds.add(id));
        } catch (error) {
          continue;
        }
      }
      
      return refereeIds;
    } catch (error) {
      console.error('Error getting active referee IDs from matches:', error);
      return new Set();
    }
  };

  const getRecentTournaments = async (year: number): Promise<{visNo: string, name: string}[]> => {
    // Cached by RefereeDirectoryService: the event list is fetched once and
    // reused by every later mount within the TTL (issue #46).
    const { events } = await RefereeDirectoryService.getBeachEvents();

    return events.filter(event => new Date(event.startDate).getFullYear() === year);
  };

  const getRefereeIdsFromTournament = async (tournamentNo: string): Promise<Set<string>> => {
    const { referees } = await RefereeDirectoryService.getEventReferees(tournamentNo);

    return new Set(
      referees
        .map(referee => referee.RefereeId)
        .filter(id => /^\d{6}$/.test(id))
    );
  };

  const getRefereeDetailsByIds = async (refereeIds: string[]): Promise<Referee[]> => {
    try {
      // Get all beach volleyball referees 
      const allReferees = await getAllReferees();
      
      // Filter to only those with IDs found in matches
      const activeReferees = allReferees.filter(referee => 
        refereeIds.includes(referee.RefereeId)
      );
      
      return activeReferees;
    } catch (error) {
      console.error('Error getting referee details by IDs:', error);
      return [];
    }
  };

  const loadInactiveReferees = async (activeIds: Set<string>) => {
    try {
      
      // Get all referees and filter out the active ones
      const allReferees = await getAllReferees();
      const inactiveReferees = allReferees.filter(referee => 
        !activeIds.has(referee.RefereeId)
      );
      
      
      // Add them in batches
      await loadInactiveRefereesBatch(
        inactiveReferees.map(ref => ({ ...ref, totalMatches: 0, isActive: false }))
      );
      
    } catch (error) {
      console.error('Error loading inactive referees:', error);
    }
  };

  /**
   * The full beach referee directory.
   *
   * This screen asks for it twice per load — once to resolve the active
   * referees, once again in the background pass for the inactive ones. Both
   * calls now share one cached entry instead of two full `GetRefereeList`
   * downloads (issue #46). The 6-digit normalisation and the nameless-row
   * filter moved into the service alongside the request.
   */
  const getAllReferees = async (): Promise<Referee[]> => {
    const { referees } = await RefereeDirectoryService.getAllReferees();

    return referees.map(referee => ({
      RefereeId: referee.RefereeId,
      firstName: referee.firstName,
      lastName: referee.lastName,
      federationCode: referee.federationCode,
      gender: referee.gender,
      level: referee.level ?? ''
    }));
  };

  const loadInactiveRefereesBatch = async (inactiveReferees: (Referee & { totalMatches: number; isActive: boolean })[]) => {
    if (inactiveReferees.length === 0) return;
    
    
    // Add inactive referees in small batches to avoid UI blocking
    const batchSize = 10;
    const totalBatches = Math.ceil(inactiveReferees.length / batchSize);
    
    for (let i = 0; i < totalBatches; i++) {
      const batch = inactiveReferees.slice(i * batchSize, (i + 1) * batchSize);
      
      // Add batch to current referees list
      setReferees(prev => {
        const combined = [...prev, ...batch];
        // Re-sort the entire list by total matches
        return combined.sort((a, b) => (b.totalMatches || 0) - (a.totalMatches || 0));
      });
      
      
      // Wait between batches to avoid blocking UI
      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
  };

  const loadInactiveRefereesIncrementally = () => {
    // This function is a placeholder - actual loading happens in loadActiveSeasonReferees
  };


  // Filter referees based on search query
  const filteredReferees = React.useMemo(() => {
    if (!searchQuery) return referees;
    
    const query = searchQuery.toLowerCase().trim();
    return referees.filter(referee => 
      referee.firstName.toLowerCase().includes(query) ||
      referee.lastName.toLowerCase().includes(query) ||
      referee.federationCode.toLowerCase().includes(query) ||
      referee.RefereeId.includes(query)
    );
  }, [referees, searchQuery]);

  const handleCardToggle = (refereeId: string) => {
    setExpandedRefereeId(expandedRefereeId === refereeId ? null : refereeId);
  };

  const handleBack = () => {
    router.back();
  };

  useEffect(() => {
    cancelledRef.current = false;
    loadAllReferees();
    return () => {
      // Stops the progressive stats pass from calling setState after unmount.
      cancelledRef.current = true;
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader
        title=""
        showBackButton={true}
        onBackPress={handleBack}
        showStatusBar={false}
      />
      
      <Container style={styles.content}>
        {/* Page Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.pageTitle}>Referees</Text>
        </View>
        
        {/* Search Field */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search referees by name, country, or ID..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={designTokens.neutrals.textSecondary}
          />
          <Text style={styles.sortInfo}>Active referees first, sorted by season matches (descending)</Text>
        </View>

        {/* Referee Cards - Same as Tournament Screen */}
        <ScrollView 
          style={styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadAllReferees}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {loading && referees.length === 0 && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading all referees...</Text>
            </View>
          )}
          
          {/* AC1: an explicit failure state, distinct from "no results". */}
          {loadError && !loading && referees.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Could not load referees.</Text>
              <Text style={styles.emptyText}>{loadError}</Text>
              <Text style={styles.emptyText}>Pull down to retry.</Text>
            </View>
          )}

          {filteredReferees.length === 0 && !loading && !loadError && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No referees found matching your search.' : 'No referees available.'}
              </Text>
            </View>
          )}

          {statsPending && referees.length > 0 && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Updating season match counts…</Text>
            </View>
          )}

          {filteredReferees.map((referee, index) => (
            <RefereeCard
              key={referee.RefereeId || index}
              referee={referee}
              tournamentNo={defaultTournamentNo}
              expanded={expandedRefereeId === referee.RefereeId}
              onToggle={() => handleCardToggle(referee.RefereeId)}
            />
          ))}
        </ScrollView>
      </Container>
    </SafeAreaView>
  );
}

// Export the screen directly without AssignmentStatusProvider
export default function AllRefereesScreen() {
  return <AllRefereesScreenContent />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.background,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
    backgroundColor: colors.background,
  },
  searchInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  sortInfo: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  // Card styles from tournament-ref screen
  card: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    ...createShadow({
      elevation: 3,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refereeMainInfo: {
    flex: 1,
  },
  refereeName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  refereeLastName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginTop: 2,
  },
  flagSection: {
    alignItems: 'center',
    marginRight: 12,
  },
  flagLeft: {
    width: 32,
    height: 24,
    borderRadius: 4,
    marginBottom: 4,
  },
  countryCode: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  roleTotals: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleTotal: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  roleTotalCount: {
    fontSize: 12,
    fontWeight: '600',
    color: designTokens.neutrals.textPrimary,
    lineHeight: 14,
  },
  roleTotalLabel: {
    fontSize: 8,
    color: designTokens.neutrals.textSecondary,
    fontWeight: '500',
    lineHeight: 10,
  },
  roleTotalSeparator: {
    fontSize: 10,
    color: '#D1D5DB',
    paddingHorizontal: 2,
  },
  profileButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  profileButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  statsPanel: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: colors.text,
  },
  activeTabText: {
    color: colors.background,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  statsLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  statsEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  profileButtonContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  profileButtonBottom: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});