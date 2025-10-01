import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Switch,
  Platform,
} from 'react-native';
import { Icon } from '../components/Icons/FeatherIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../theme/tokens';
import { shadowPresets } from '../theme/shadows';
import { TournamentCore } from '../types/tournament-v2';
import { BeachMatchCore, MatchStatus, canReadyToStartMatchGoLive, getEnhancedMatchStatus } from '../types/match-v2';
import { TournamentStorageService } from '../services/TournamentStorageService';
import { TournamentOperationsService } from '../services/TournamentOperationsService';
import { DefaultTournamentService } from '../services/DefaultTournamentService';
import { FallbackTournamentService } from '../services/FallbackTournamentService';
import { TournamentMatchCache } from '../services/cache/TournamentMatchCache';
import { TournamentCacheWarmingService } from '../services/cache/TournamentCacheWarmingService';
import { isStale, CacheTTL } from '../utils/cacheUtils';
// Dynamic imports for VisApiClient will be done in the function
import { GetBeachMatchListRequest } from '../types/api-v2';
import { VisResponseParser } from '../services/parsing/VisResponseParser';
// DataTransformationService no longer needed - using BeachMatchCore directly
import { AssignmentStatusProvider, useAssignmentStatus } from '../hooks/useAssignmentStatus';
import { useLiveScores } from '../hooks/useLiveScores';
import { useTournaments } from '../hooks/useTournaments';
import { featureFlags } from '../hooks/compatibility/FeatureFlags';
import BottomTabNavigation from '../components/navigation/BottomTabNavigation';
import NavigationHeader from '../components/navigation/NavigationHeader';
import { TournamentBottomMenu } from '../components/navigation/TournamentBottomMenu';
import { MatchListV2 } from '../components/MatchList/MatchListV2';
import { LiveScoreCard } from '../components/live-score/LiveScoreCard';
import { designTokens } from '../theme/tokens';
import { FlagImage } from '../components/FlagImage';
import { TournamentCard } from '../components/entities/Tournament';
import { TournamentRefereeList } from '../components/referee/TournamentRefereeList';
// Removed TournamentDateExtractor - now using direct API StartDate/EndDate

// Separate component for expanded filters to prevent hooks issues
const ExpandedFiltersView: React.FC<{
  matches: BeachMatchCore[];
  genderFilter: 'All' | 'M' | 'W';
  setGenderFilter: (filter: 'All' | 'M' | 'W') => void;
  courtFilter: string;
  setCourtFilter: (filter: string) => void;
  refereeFilter: string;
  setRefereeFilter: (filter: string) => void;
  showRefereeDropdown: boolean;
  setShowRefereeDropdown: (show: boolean) => void;
  setShowFilters: (show: boolean) => void;
  refereeNamesFromAPI: string[];
  refereeDataFromAPI: {name: string, federationCode: string}[];
  getTournamentStatus: () => string;
}> = ({
  matches,
  genderFilter,
  setGenderFilter,
  courtFilter,
  setCourtFilter,
  refereeFilter,
  setRefereeFilter,
  showRefereeDropdown,
  setShowRefereeDropdown,
  setShowFilters,
  refereeNamesFromAPI,
  refereeDataFromAPI,
  getTournamentStatus
}) => {
  // Memoize court numbers to prevent recalculation on every render
  const courtNumbers = React.useMemo(() => {
    return Array.from(new Set(matches?.map(m => m.court?.courtNumber) || []))
      .filter(Boolean)
      .sort();
  }, [matches]);

  // Memoize referee names from matches (for COMPLETED tournaments)
  const refereeNamesFromMatches = React.useMemo(() => {
    if (!matches || matches.length === 0) {
      return [];
    }
    
    const allReferees: string[] = [];
    
    
    matches.forEach((match, index) => {
      // Extract referees from Referee1Name and Referee2Name fields
      if (match.Referee1Name && match.Referee1Name.trim()) {
        allReferees.push(match.Referee1Name.trim());
      }
      if (match.Referee2Name && match.Referee2Name.trim()) {
        allReferees.push(match.Referee2Name.trim());
      }
    });
    
    const uniqueReferees = Array.from(new Set(allReferees)).filter(Boolean).sort();
    return uniqueReferees;
  }, [matches]);

  // Combined referee names using dual system
  const refereeNames = React.useMemo(() => {
    const tournamentStatus = getTournamentStatus();

    // For COMPLETED tournaments, always try to use match-extracted referees first
    // But also try API referees as fallback
    if (tournamentStatus === 'COMPLETED') {

      if (refereeNamesFromMatches.length > 0) {
        return refereeNamesFromMatches;
      } else if (refereeNamesFromAPI.length > 0) {
        return refereeNamesFromAPI;
      } else {
        // As a last resort, return some test data to verify the dropdown works
        return ['Test Referee 1', 'Test Referee 2'];
      }
    } else {
      // For LIVE tournaments, use both API referees AND match-extracted referees
      // This ensures the dropdown includes all referees that appear in matches
      const combined = [...refereeNamesFromAPI, ...refereeNamesFromMatches];
      const uniqueCombined = Array.from(new Set(combined)).filter(Boolean).sort();

      // If we have match-extracted referees, prioritize those (they're most accurate)
      if (refereeNamesFromMatches.length > 0) {
        return refereeNamesFromMatches;
      } else if (uniqueCombined.length > 0) {
        return uniqueCombined;
      } else {
        return refereeNamesFromAPI;
      }
    }
  }, [refereeNamesFromMatches, refereeNamesFromAPI, matches, getTournamentStatus]);

  // Get federation code for a referee name
  const getRefereeData = React.useCallback((refereeName: string) => {
    return refereeDataFromAPI.find(ref => ref.name === refereeName);
  }, [refereeDataFromAPI]);

  return (
    <View style={styles.expandedFilters}>
      {/* Referee Filter - MOVED TO TOP */}
      <View style={[styles.filterGroup, styles.refereeFilterGroup]}>
        <Text style={styles.filterLabel}>Referee:</Text>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={[
              styles.dropdownButton,
              showRefereeDropdown && styles.dropdownButtonActive
            ]}
            onPress={() => setShowRefereeDropdown(!showRefereeDropdown)}
          >
            <Text style={[
              styles.dropdownButtonText,
              showRefereeDropdown && styles.dropdownButtonTextActive
            ]} numberOfLines={1}>
              {refereeFilter === 'All' ? 'All Referees' : refereeFilter}
            </Text>
            <Text style={[
              styles.dropdownArrow,
              showRefereeDropdown && styles.dropdownArrowActive
            ]}>
              {showRefereeDropdown ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {showRefereeDropdown && (
            <View style={styles.dropdownList}>
              <ScrollView style={styles.dropdownScrollView} nestedScrollEnabled={true}>
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    refereeFilter === 'All' && styles.dropdownItemActive
                  ]}
                  onPress={() => {
                    setRefereeFilter('All');
                    setShowRefereeDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    refereeFilter === 'All' && styles.dropdownItemTextActive
                  ]}>
                    All Referees
                  </Text>
                </TouchableOpacity>
                {(() => {
                  return refereeNames.map((referee) => {
                    const refereeData = getRefereeData(referee);
                    return (
                      <TouchableOpacity
                        key={referee}
                        style={[
                          styles.dropdownItem,
                          refereeFilter === referee && styles.dropdownItemActive
                        ]}
                        onPress={() => {
                          setRefereeFilter(referee);
                          setShowRefereeDropdown(false);
                        }}
                      >
                        <View style={styles.dropdownItemContent}>
                          {refereeData?.federationCode && (
                            <FlagImage
                              countryCode={refereeData.federationCode}
                              size="small"
                              style={styles.dropdownFlag}
                            />
                          )}
                          <Text style={[
                            styles.dropdownItemText,
                            refereeFilter === referee && styles.dropdownItemTextActive
                          ]} numberOfLines={2}>
                            {referee}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  });
                })()}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* Gender Filter */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Gender:</Text>
        <View style={styles.filterButtons}>
          {['All', 'M', 'W'].map((gender) => (
            <TouchableOpacity
              key={gender}
              style={[
                styles.filterButton,
                genderFilter === gender && styles.filterButtonActive
              ]}
              onPress={() => setGenderFilter(gender as 'All' | 'M' | 'W')}
            >
              <Text style={[
                styles.filterButtonText,
                genderFilter === gender && styles.filterButtonTextActive
              ]}>
                {gender === 'All' ? 'All' : gender === 'M' ? 'Men' : 'Women'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Court Filter */}
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Court:</Text>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              courtFilter === 'All' && styles.filterButtonActive
            ]}
            onPress={() => setCourtFilter('All')}
          >
            <Text style={[
              styles.filterButtonText,
              courtFilter === 'All' && styles.filterButtonTextActive
            ]}>
              All Courts
            </Text>
          </TouchableOpacity>
          {courtNumbers.map((court) => (
            <TouchableOpacity
              key={court}
              style={[
                styles.filterButton,
                courtFilter === court && styles.filterButtonActive
              ]}
              onPress={() => setCourtFilter(court)}
            >
              <Text style={[
                styles.filterButtonText,
                courtFilter === court && styles.filterButtonTextActive
              ]}>
                {court === 'CC' ? 'CC' : `Court ${court}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Save Button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={() => {
            // Save the filter settings (they're already applied in real-time)
            // Close the filters panel
            setShowFilters(false);
          }}
        >
          <Text style={styles.saveButtonText}>Save & Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const TournamentDetailScreenContent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [detailedTournament, setDetailedTournament] = useState<TournamentCore | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [matches, setMatches] = useState<BeachMatchCore[] | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(false);
  // Removed tab system - showing ranking by default
  const [hasRankingData, setHasRankingData] = useState(false); // Will be true when ranking API is implemented
  const [refreshing, setRefreshing] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  // Add loading guards to prevent excessive API calls
  const [loadMatchesInProgress, setLoadMatchesInProgress] = useState(false);
  
  // Referee list state (for LIVE/SCHEDULED tournaments)
  const [refereeNamesFromAPI, setRefereeNamesFromAPI] = useState<string[]>([]);
  const [refereeDataFromAPI, setRefereeDataFromAPI] = useState<{name: string, federationCode: string}[]>([]);
  const [refereesLoading, setRefereesLoading] = useState(false);

  // State to track if we need to load complete tournament data
  const [isMinimalTournament, setIsMinimalTournament] = useState(false);
  const [completeTournamentData, setCompleteTournamentData] = useState<TournamentCore | null>(null);
  const [apiTournamentLocationData, setApiTournamentLocationData] = useState<any>(null);
  
  const router = useRouter();
  const { tournamentData, tab, visNo } = useLocalSearchParams<{ tournamentData?: string; tab?: string; visNo?: string }>();

  // Tab state for bottom menu
  const [activeTab, setActiveTab] = useState<'schedule' | 'officials'>('schedule');

  // Set active tab based on URL parameter
  useEffect(() => {
    if (tab === 'schedule' || tab === 'officials') {
      setActiveTab(tab);
    }
  }, [tab]);

  // Filter states for external control of MatchListV2 - preserved during refresh
  // Date filtering disabled - showing all days in timeline
  const [courtFilter, setCourtFilter] = useState<string>('All');
  const [genderFilter, setGenderFilter] = useState<'All' | 'M' | 'W'>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [refereeFilter, setRefereeFilter] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [showRefereeDropdown, setShowRefereeDropdown] = useState(false);

  // Ref for auto-scrolling to relevant matches
  const scrollViewRef = useRef<ScrollView>(null);

  // Track match positions for precise scrolling
  const matchPositions = useRef<{ [matchId: string]: number }>({});
  const hasAutoScrolled = useRef<boolean>(false);
  const matchListRef = useRef<View>(null);
  const matchListOffset = useRef<number>(0);
  const autoscrollRetryCount = useRef<number>(0);
  const maxRetries = 5;



  // Helper function to check if match is LIVE using enhanced status with court sequencing logic
  const isMatchLive = (match: any, allMatches: any[] = matches): boolean => {
    // Don't consider matches with placeholder teams as live
    if (match?.team1?.teamName === 'TBD' || match?.team2?.teamName === 'TBD') {
      return false;
    }

    // Use enhanced status that considers court sequencing
    const enhancedStatus = getEnhancedMatchStatus(match, allMatches);

    // Check enhanced status first
    if (enhancedStatus === MatchStatus.RUNNING) {
      return true;
    }

    // VIS API uses numeric status codes:
    // 1=Scheduled, 2=ReadyToStart, 3-11=InSet1-InSet5 (LIVE), 12+=Finished/Official
    const status = match?.status;

    // Check for string status first (mapped values)
    if (typeof status === 'string') {
      return status === MatchStatus.RUNNING;
    }

    // Check for numeric VIS status codes (3-8 = LIVE matches per user requirement)
    if (typeof status === 'number') {
      // Include status 2 if it can transition to live based on court sequence
      if (status === 2 && canReadyToStartMatchGoLive(match, allMatches)) {
        return true;
      }
      return status >= 3 && status <= 8;
    }

    // Fallback: check raw VIS status field if available
    const rawStatus = match?.rawStatus || match?.visStatus;
    if (typeof rawStatus === 'number') {
      // Include status 2 if it can transition to live based on court sequence
      if (rawStatus === 2 && canReadyToStartMatchGoLive(match, allMatches)) {
        return true;
      }
      return rawStatus >= 3 && rawStatus <= 8;
    }

    return false;
  };

  // Auto-scroll logic with priority: 1) LIVE matches, 2) Last SCHEDULED match, 3) Stay at top
  const attemptAutoScroll = (matches: any[], forceRetry: boolean = false) => {
    if (hasAutoScrolled.current || !scrollViewRef.current || matches.length === 0) {
      return;
    }

    // Only autoscroll on matches or schedule panel (where match list is shown)
    if (activeTab !== 'matches' && activeTab !== 'schedule') {
      return;
    }

    let targetMatchId: string | null = null;
    let scrollReason = '';

    // Priority 1: Find any LIVE match using enhanced isMatchLive logic with court sequencing
    const liveMatches = matches.filter(match => isMatchLive(match, matches));

    if (liveMatches.length > 0) {
      targetMatchId = liveMatches[0].id;
      scrollReason = 'LIVE match';
    } else {
      // Priority 2: Last SCHEDULED match of TODAY
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

      const todaysScheduledMatches = matches.filter(match => {
        if (!match?.scheduledDateTime) return false;

        // Check if match is today
        const matchDate = new Date(match.scheduledDateTime).toISOString().split('T')[0];
        if (matchDate !== todayStr) return false;

        // Check for SCHEDULED status
        const status = match?.status;
        const enhancedStatus = getEnhancedMatchStatus(match, matches);

        // Include scheduled matches (status 1 or 'Scheduled')
        if (typeof status === 'string') {
          return status === MatchStatus.SCHEDULED;
        }
        if (typeof status === 'number') {
          return status === 1; // VIS API: 1 = Scheduled
        }
        if (enhancedStatus === MatchStatus.SCHEDULED) {
          return true;
        }

        return false;
      });

      if (todaysScheduledMatches.length > 0) {
        // Sort by time and take the FIRST one (earliest scheduled match of today)
        const sortedScheduledMatches = todaysScheduledMatches.sort((a, b) => {
          return new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime();
        });

        const firstScheduledMatchToday = sortedScheduledMatches[0];
        targetMatchId = firstScheduledMatchToday.id;
        scrollReason = `First SCHEDULED match of today (${todaysScheduledMatches.length} total today)`;
      }
      // Priority 3: If no LIVE or TODAY'S SCHEDULED matches, stay at top (no scroll)
    }

    // Scroll to target if position is available
    if (targetMatchId && matchPositions.current[targetMatchId] !== undefined) {
      const matchRelativeY = matchPositions.current[targetMatchId];
      const absoluteY = matchListOffset.current + matchRelativeY;

      const targetY = Math.max(0, absoluteY + 450); // Bring match to visible area with more offset

      scrollViewRef.current.scrollTo({
        y: targetY,
        animated: true
      });

      hasAutoScrolled.current = true;
    } else {
      // Retry logic with delay
      if (autoscrollRetryCount.current < maxRetries) {
        autoscrollRetryCount.current++;

        setTimeout(() => {
          attemptAutoScroll(matches, true);
        }, 200);
      }
    }
  };

  // Handle match layout measurement and trigger autoscroll
  const handleMatchLayout = (matchId: string, y: number) => {
    matchPositions.current[matchId] = y;

    // Try autoscroll when new position is recorded
    if (matches && matches.length > 0 && (activeTab === 'matches' || activeTab === 'schedule')) {
      setTimeout(() => {
        attemptAutoScroll(matches);
      }, 100);
    }
  };

  // Handle auto-scroll when matches are ready - DISABLED per user request
  const handleMatchesReady = (matches: BeachMatchCore[], targetIndex: number) => {
    // Just clear loading
    setTimeout(() => {
      setMatchesLoading(false);
    }, 1000);

    // Auto-scroll logic disabled - will work on it later
  };

  const tournament: TournamentCore = React.useMemo(() => {
    try {
      if (completeTournamentData) {
        // Use loaded complete tournament data if available
        return completeTournamentData;
      } else if (tournamentData) {
        // Normal case: full tournament data passed as JSON
        const parsed = JSON.parse(tournamentData) as TournamentCore;
        return parsed;
      } else if (visNo) {
        // Fallback case: only visNo provided - create minimal tournament object
        const minimalTournament: TournamentCore = {
          visNo: visNo,
          name: `Loading Tournament ${visNo}...`,
          title: `Loading Tournament ${visNo}...`,
          dates: {},
          // Add other required fields as needed
        } as TournamentCore;
        // Mark that we need to load complete data
        if (!isMinimalTournament) {
          setIsMinimalTournament(true);
        }
        return minimalTournament;
      } else {
        // No tournament data or visNo provided
        return {} as TournamentCore;
      }
    } catch (error) {
      console.error('Error parsing tournament data:', error);
      if (visNo) {
        // Fallback to minimal tournament
        if (!isMinimalTournament) {
          setIsMinimalTournament(true);
        }
        return {
          visNo: visNo,
          name: `Loading Tournament ${visNo}...`,
          title: `Loading Tournament ${visNo}...`,
          dates: {},
        } as TournamentCore;
      }
      return {} as TournamentCore;
    }
  }, [tournamentData, visNo, completeTournamentData, isMinimalTournament]);

  // Define getTournamentStatus early to avoid temporal dead zone issues
  const getTournamentStatus = React.useCallback(() => {
    // Use the same logic as TournamentSelectionScreen for consistency
    const startDate = tournament.dates?.startDate;
    const endDate = tournament.dates?.endDate;
    
    if (!startDate) {
      return 'SCHEDULED';
    }
    
    const today = new Date().toISOString().split('T')[0];
    const startDateOnly = startDate.split('T')[0];
    
    if (today < startDateOnly) {
      return 'SCHEDULED';
    }
    
    if (endDate) {
      const endDateOnly = endDate.split('T')[0];
      
      if (today > endDateOnly) {
        return 'COMPLETED';
      }
      if (today >= startDateOnly && today <= endDateOnly) {
        return 'LIVE NOW';
      }
    } else {
      // Only start date available - consider live for reasonable duration
      const start = new Date(startDate);
      const weekAfter = new Date(start);
      weekAfter.setDate(start.getDate() + 7);
      
      const now = new Date();
      if (now >= start && now <= weekAfter) {
        return 'LIVE NOW';
      }
      if (now > weekAfter) {
        return 'COMPLETED';
      }
    }
    
    return 'SCHEDULED';
  }, [tournament.dates?.startDate, tournament.dates?.endDate]);

  // Hybrid tournament data management - use hook for enhanced caching and real-time updates
  // Only use tournament hook if feature flag is enabled
  // Avoid Supabase function calls on web (CORS); rely on provided tournament data
  const shouldUseTournamentHook = Platform.OS !== 'web' && featureFlags.shouldUseNewHook('TournamentDetailScreen', 'tournaments');
  
  const {
    data: hookTournaments = [],
    isLoading: tournamentHookLoading,
    error: tournamentHookError,
    forceRefresh: refreshTournamentData
  } = useTournaments(
    (tournament?.visNo && shouldUseTournamentHook) ? {
      tournamentCode: tournament.visNo,
      includeDetails: true
    } : undefined,
    {
      enableRealTimeUpdates: getTournamentStatus() !== 'COMPLETED',
      cacheStrategy: getTournamentStatus() === 'COMPLETED' ? 'historical' : 'live',
      enablePerformanceMonitoring: true
    }
  );

  // Track tournament hook errors for migration safety
  useEffect(() => {
    if (shouldUseTournamentHook && tournamentHookError) {
      featureFlags.recordError('TournamentDetailScreen', tournamentHookError.message || 'Unknown tournament hook error');
    }
  }, [shouldUseTournamentHook, tournamentHookError]);

  // Get enhanced tournament data from hook if available, fallback to props
  const enhancedTournament = React.useMemo(() => {
    if (hookTournaments.length > 0) {
      const hookTournament = hookTournaments.find(t => t.visNo === tournament?.visNo);
      if (hookTournament) {
        // Merge hook data with existing tournament data
        return {
          ...tournament,
          ...hookTournament,
          // Preserve complex data from original parsing
          beachTournaments: (tournament as any).beachTournaments,
          tournamentNo: (tournament as any).tournamentNo,
        };
      }
    }
    return tournament;
  }, [tournament, hookTournaments]);

  // Check if this tournament is default on mount and set up listener
  useEffect(() => {
    const checkDefaultStatus = async () => {
      if (tournament.visNo) {
        const defaultStatus = await DefaultTournamentService.isDefaultTournament(tournament.visNo);
        setIsDefault(defaultStatus);
      }
    };
    checkDefaultStatus();

    // Set up listener for default tournament changes
    const removeListener = DefaultTournamentService.addListener((defaultTournament) => {
      if (tournament.visNo) {
        setIsDefault(defaultTournament?.visNo === tournament.visNo);
      }
    });

    return removeListener;
  }, [tournament.visNo]);

  // Check if tournament can be set as default (only LIVE tournaments)
  const tournamentStatus = DefaultTournamentService.getTournamentStatus(
    tournament.dates?.startDate, 
    tournament.dates?.endDate
  );
  const canBeDefault = tournamentStatus === 'LIVE NOW';

  // Handle default switch toggle
  const handleDefaultToggle = async (value: boolean) => {
    if (!tournament.visNo) return;
    
    try {
      const result = await DefaultTournamentService.toggleDefaultTournament(tournament);
      
      if (result.success) {
        setIsDefault(result.isDefault);

        if (result.isDefault) {
          Alert.alert(
            'Default Set',
            'This tournament is now your default. The homepage will redirect here.',
            [{ text: 'OK' }]
          );
        } else {
          // Tournament was deselected as default - redirect to home
          router.push('/');
        }
      } else {
        // Show error message for why it couldn't be set as default
        Alert.alert(
          'Cannot Set as Default', 
          result.reason || 'This tournament cannot be set as default.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Could not update default tournament setting');
    }
  };

  // Assignment status management
  const { 
    currentAssignmentStatus,
    statusCounts,
    isOnline,
    syncStatus
  } = useAssignmentStatus();

  // Get match numbers for live score polling
  const matchNumbers = React.useMemo(() => {
    if (!matches) return [];
    const toNumericMatchNo = (m: any): number | null => {
      const raw = m?.visNo || m?.matchCode || '';
      const digits = String(raw).replace(/\D/g, '');
      const n = parseInt(digits || '', 10);
      return Number.isFinite(n) ? n : null;
    };
    return matches
      .filter(match => {
        // Only poll for matches that are likely to have live scores
        const status = match.status;
        const rawStatus = match.rawStatus || match.status;
        const shouldInclude =
          status === MatchStatus.RUNNING ||
          status === MatchStatus.SCHEDULED ||
          (typeof rawStatus === 'number' && rawStatus >= 1 && rawStatus <= 8) ||
          isMatchLive(match, matches);

        return shouldInclude;
      })
      .map(m => toNumericMatchNo(m))
      .filter((v): v is number => v !== null);
  }, [matches, activeTab]);

  // Helper function to get numeric match identifier for live scores
  // Uses the same logic as polling service for consistency
  const getMatchNumberForLiveScore = React.useCallback((match: BeachMatchCore): number | null => {
    const raw = match?.visNo || match?.matchCode || '';
    const digits = String(raw).replace(/\D/g, '');
    const n = parseInt(digits || '', 10);
    return Number.isFinite(n) ? n : null;
  }, []);

  // Live scores hook with automatic lifecycle management
  const {
    liveScores,
    isLoading: liveScoresLoading,
    isOnline: liveScoresOnline,
    isPolling,
    getLiveScore,
    refreshLiveScores,
    statistics: liveScoreStats
  } = useLiveScores({
    matchNumbers,
    autoStart: true, // Auto-start polling when screen is focused
    useAdaptivePolling: true, // Enable adaptive polling for different match statuses
    staleTimeMs: 3000, // Cache stale time for running matches (3 seconds)
    cacheTimeMs: 10000 // Cache time for frequently changing data (10 seconds)
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'short', // Changed from 'long' to 'short' for 3-letter month codes
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Compact date formatting functions (moved from TournamentDateExtractor)
  const formatCompactDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      const day = date.getDate().toString().padStart(2, '0');
      const monthName = getMonthNameShort(date.getMonth());
      
      return `${day} ${monthName}`;
    } catch {
      return dateStr;
    }
  };

  const formatCompactDateRange = (startDate: string, endDate: string): string => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const startDay = start.getDate().toString().padStart(2, '0');
      const endDay = end.getDate().toString().padStart(2, '0');
      const monthName = getMonthNameShort(start.getMonth());
      
      // If same date, show as single date
      if (startDate === endDate) {
        return `${startDay} ${monthName}`;
      }
      
      // Check if they're in the same month/year
      if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        return `${startDay} - ${endDay} ${monthName}`;
      } else {
        // Different months - show month for each date
        const endMonthName = getMonthNameShort(end.getMonth());
        return `${startDay} ${monthName} - ${endDay} ${endMonthName}`;
      }
    } catch {
      return `${startDate} - ${endDate}`;
    }
  };

  const getMonthNameShort = (monthIndex: number): string => {
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return monthNames[monthIndex] || 'Jan';
  };

  const getLocation = () => {
    // Use detailed tournament data if available, fallback to basic tournament data
    const tournamentData = detailedTournament || tournament;
    const city = tournamentData.city;
    const country = tournamentData.country;
    
    if (city && country) {
      return `${city}, ${country}`;
    }
    
    // Only return location if we have explicit location data, city, or country
    // Don't show "Location not specified" or try to infer from title
    return tournamentData.location || city || country || null;
  };

  // Function codes mapping (verified from VIS API data)
  const getFunctionName = (functionCode: string): string => {
    const functionMap: { [key: string]: string } = {
      '1': 'Main Referee',
      '2': 'Line Judge', 
      '3': 'Scorer',
      '4': 'Assistant/Volunteer',
      '5': 'Technical Official',
      '6': 'Supervisor',
      '7': 'Medical Staff',
      '8': 'Media Officer',
      // Based on actual data analysis
    };
    return functionMap[functionCode] || `Function ${functionCode}`;
  };

  // Parse XML content to extract useful information
  const parseAuxiliaryPersons = (xmlString?: string): string => {
    if (!xmlString) return '';
    
    try {
      // Decode HTML entities
      const decoded = xmlString
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#xD;&#xA;/g, '')
        .replace(/&#xA;/g, '');
      
      // Extract person information using regex
      const personMatches = decoded.match(/<AuxiliaryPerson[^>]*>/g);
      if (!personMatches) return '';
      
      // Group by function to show function counts
      const functionGroups: { [key: string]: Array<{name: string, nationality: string}> } = {};
      
      const persons = personMatches.map(match => {
        const firstNameMatch = match.match(/FirstName="([^"]*)"/);
        const lastNameMatch = match.match(/LastName="([^"]*)"/);
        const nationalityMatch = match.match(/NationalityCode="([^"]*)"/);
        const functionMatch = match.match(/Functions="([^"]*)"/);
        
        const firstName = firstNameMatch ? firstNameMatch[1] : '';
        const lastName = lastNameMatch ? lastNameMatch[1] : '';
        const nationality = nationalityMatch ? nationalityMatch[1] : '';
        const functionCode = functionMatch ? functionMatch[1] : '';
        
        const functionName = getFunctionName(functionCode);
        
        // Group by function
        if (!functionGroups[functionName]) {
          functionGroups[functionName] = [];
        }
        functionGroups[functionName].push({ name: `${firstName} ${lastName}`, nationality });
        
        return `${firstName} ${lastName} (${nationality}, ${functionName})`;
      });
      
      // Create summary by function
      const functionSummary = Object.entries(functionGroups)
        .map(([funcName, people]) => `${people.length} ${funcName}${people.length > 1 ? 's' : ''}`)
        .join(', ');
      
      return `${persons.length} people: ${functionSummary}. Examples: ${persons.slice(0, 2).join(', ')}${persons.length > 2 ? '...' : ''}`;
    } catch {
      return 'Personnel information available';
    }
  };

  const parseOfficialFunctions = (xmlString?: string): string => {
    if (!xmlString) return '';
    
    try {
      // Decode HTML entities
      const decoded = xmlString
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#xD;&#xA;/g, '')
        .replace(/&#xA;/g, '');
      
      // Try to extract official function information
      // This might have different XML structure - let's see what we get
      
      // Look for common official XML patterns
      const functionMatches = decoded.match(/<[^>]*Function[^>]*>/g) || 
                             decoded.match(/<Official[^>]*>/g) ||
                             decoded.match(/<[^>]*Code="[^"]*"[^>]*>/g);
      
      if (functionMatches && functionMatches.length > 0) {
        // Extract function codes/names from the matches
        const functions = functionMatches.map(match => {
          const codeMatch = match.match(/Code="([^"]*)"/);
          const nameMatch = match.match(/Name="([^"]*)"/);
          const typeMatch = match.match(/Type="([^"]*)"/);
          
          if (codeMatch) return `Function ${codeMatch[1]}`;
          if (nameMatch) return nameMatch[1];
          if (typeMatch) return typeMatch[1];
          return 'Official Function';
        });
        
        return `${functions.length} official functions: ${functions.slice(0, 3).join(', ')}${functions.length > 3 ? '...' : ''}`;
      }
      
      // Fallback: if it's just text content, show first part
      const textContent = decoded.replace(/<[^>]*>/g, '').trim();
      if (textContent) {
        return `Official functions: ${textContent.substring(0, 50)}${textContent.length > 50 ? '...' : ''}`;
      }
      
      return 'Official functions available';
    } catch {
      return 'Official functions available';
    }
  };

  const getDateRange = () => {
    // Use complete tournament dates from TournamentCore structure
    const tournamentData = detailedTournament || tournament;
    const startDate = tournamentData?.dates?.startDateQualification || tournamentData?.dates?.startDate;
    const endDate = tournamentData?.dates?.endDateMainDraw || tournamentData?.dates?.endDate;
    
    if (!startDate && !endDate) {
      return 'Dates TBD';
    }
    
    if (startDate && endDate) {
      if (startDate === endDate) {
        return formatCompactDate(startDate);
      }
      return `${formatCompactDate(startDate)} - ${formatCompactDate(endDate)}`;
    }
    
    // If only one date is available
    if (startDate) {
      return formatCompactDate(startDate);
    } else if (endDate) {
      return `until ${formatCompactDate(endDate)}`;
    }
    
    return 'Dates TBD';
  };



  const getStatusColor = () => {
    const status = getTournamentStatus();
    switch (status) {
      case 'LIVE NOW':
        return colors.success;
      case 'SCHEDULED':
        return '#FF6B35';
      case 'COMPLETED':
        return '#6B7280';
      default:
        return '#4A90A4';
    }
  };


  const handleGoBack = async () => {
    try {
      // STEP 1: Always clear default tournament first (if this tournament is set as default)
      const tournamentVisNo = tournament.visNo || visNo;

      if (tournamentVisNo) {
        const isDefault = await DefaultTournamentService.isDefaultTournament(tournamentVisNo);
        if (isDefault) {
          await DefaultTournamentService.clearDefaultTournament();

          // STEP 2: Add small delay to ensure state updates propagate
          // This prevents race condition where home still sees old default tournament
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // STEP 3: After ensuring default is cleared, redirect to home
      // This ensures proper routing logic and prevents getting stuck
      router.replace('/');
    } catch (error) {
      console.error('Error handling tournament not found:', error);
      // Fallback: always redirect to home even if there's an error
      router.replace('/');
    }
  };

  // Load referees using dual system: GetEventRefereeList for LIVE/SCHEDULED, matches for COMPLETED
  const loadRefereeList = async () => {
    if (!tournament.visNo) return;
    
    setRefereesLoading(true);
    try {
      const tournamentStatus = getTournamentStatus();
      
      if (tournamentStatus === 'COMPLETED') {
        // Referees will be extracted from matches - no API call needed
        setRefereeNamesFromAPI([]);
      } else {
        await loadRefereesFromAPI();
      }
    } catch (error) {
      console.error('Error loading referee list:', error);
      setRefereeNamesFromAPI([]);
    } finally {
      setRefereesLoading(false);
    }
  };

  // VIS API referee request with correct format
  const loadRefereesFromAPI = async () => {
    try {
      const NoEvent = tournament.visNo; // Use current tournament's event number
      
      const xml = `<Requests>
  <Request Type="GetEventRefereeList"
           Fields="NoReferee FirstName LastName FederationCode Gender Role Status">
    <Filter NoEvent="${NoEvent}"/>
  </Request>
</Requests>`;

      const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
        method: "POST",
        headers: {
          "Accept": "application/xml",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ Request: xml })
      });
      
      if (response.ok) {
        const xmlResponse = await response.text();
        
        // Parse and store referee data
        const referees = parseRefereeXML(xmlResponse);
        const validReferees = referees.filter(ref => ref.firstName.trim() || ref.lastName.trim());

        const refereeNames = validReferees
          .map(ref => `${ref.firstName} ${ref.lastName}`.trim())
          .sort();

        const refereeData = validReferees
          .map(ref => ({
            name: `${ref.firstName} ${ref.lastName}`.trim(),
            federationCode: ref.federationCode || ''
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setRefereeNamesFromAPI(refereeNames);
        setRefereeDataFromAPI(refereeData);
      } else {
        setRefereeNamesFromAPI([]);
        setRefereeDataFromAPI([]);
      }
    } catch (error) {
      console.error('🏐 Error in loadRefereesFromAPI:', error);
      setRefereeNamesFromAPI([]);
      setRefereeDataFromAPI([]);
    }
  };

  // Parse referee XML response
  const parseRefereeXML = (xmlString: string) => {
    const referees: any[] = [];
    
    // Extract referee data using regex (simple parsing)
    const refereeMatches = xmlString.match(/<EventReferee[^>]*>/g);
    
    if (refereeMatches) {
      refereeMatches.forEach(match => {
        const noReferee = match.match(/NoReferee="([^"]*)"/)?.[1] || '';
        const firstName = match.match(/FirstName="([^"]*)"/)?.[1] || '';
        const lastName = match.match(/LastName="([^"]*)"/)?.[1] || '';
        const federationCode = match.match(/FederationCode="([^"]*)"/)?.[1] || '';
        const gender = match.match(/Gender="([^"]*)"/)?.[1] || '';
        
        referees.push({
          noReferee,
          firstName,
          lastName,
          federationCode,
          gender
        });
      });
    }
    
    return referees;
  };


  // Load enhanced tournament data for display purposes only
  const loadTournamentDisplayData = async () => {
    if (!tournament.visNo) return;

    try {
      // STEP 1: Check cache first
      const cacheKey = `${tournament.visNo}`;
      const cached = await TournamentStorageService.getCachedTournamentDetails(tournament.visNo);

      if (cached && !isStale(cached, CacheTTL.TOURNAMENT_DETAILS)) {
        console.log('📦 Using cached tournament details');
        setTournamentData(cached.tournament);
        setDetailsLoading(false);
        return;
      }

      // STEP 2: Show stale data immediately if available, then refresh in background
      if (cached) {
        console.log('🔄 Showing stale tournament data, refreshing in background');
        setTournamentData(cached.tournament);
        setDetailsLoading(false);
      } else {
        setDetailsLoading(true);
      }

      // STEP 3: Fetch fresh data from API
      const { VisApiClient } = await import('../services/api/VisApiClient');
      const { DEFAULT_RETRY_CONFIG } = await import('../types/api-v2');

      const config = {
        baseURL: process.env.EXPO_PUBLIC_VIS_API_BASE_URL || '',
        timeout: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '10000', 10),
      };

      const visApi = new VisApiClient(config, DEFAULT_RETRY_CONFIG);

      // Get tournament details from API
      const response = await visApi.getBeachTournament({ TournamentNo: tournament.visNo });
      const details = response.success ? response.data : null;

      if (details) {
        // SELECTIVE MERGE: Only merge safe display fields, preserve core tournament data
        const enhancedTournament = {
          ...tournament, // Keep original tournament data as base
          // Only add missing display fields from API response
          countryCode: details.countryCode || tournament.countryCode,
          countryName: details.countryName || tournament.countryName,
          country: details.country || tournament.country,
          city: details.city || tournament.city,
          location: details.location || tournament.location,
        };

        // Cache the fresh data
        await TournamentStorageService.cacheTournamentDetails(tournament.visNo, enhancedTournament);
        setTournamentData(enhancedTournament);
        setDetailedTournament(enhancedTournament);
      } else {
        // No API data available - use basic tournament
        setDetailedTournament(tournament);
      }
    } catch (error) {
      console.warn('Tournament display data load failed:', error);

      // STEP 4: Error handling with cached data fallback
      if (cached) {
        console.log('🔄 Using cached data due to API error');
        setTournamentData(cached.tournament);
        setDetailedTournament(cached.tournament);
      } else {
        // Fallback to basic tournament data
        setDetailedTournament(tournament);
      }
    } finally {
      setDetailsLoading(false);
    }
  };

  // Load matches for the tournament - OPTIMIZED API FLOW with CACHE-FIRST LOADING
  const loadMatches = async () => {
    // Prevent multiple simultaneous calls
    if (loadMatchesInProgress) {
      return;
    }

    try {
      // STEP 1: Check cache first for matches
      const cachedMatches = await TournamentMatchCache.getCachedMatches(tournament.visNo);

      if (cachedMatches) {
        console.log(`📦 Using cached matches (${cachedMatches.length} matches)`);
        setMatches(cachedMatches);
        setMatchesLoading(false);
        setLoadMatchesInProgress(false);
        return;
      }

      console.log('🔄 No cached matches found, fetching from API');
    } catch (error) {
      console.warn('Failed to check cache for matches:', error);
    }

    setLoadMatchesInProgress(true);
    // STEP 1: Always start with GetEvent to get tournament structure (without field specification)
    if (!(tournament as any).beachTournaments) {

      const { VisApiClient } = await import('../services/api/VisApiClient');
      const { DEFAULT_RETRY_CONFIG } = await import('../types/api-v2');

      const config = {
        baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
        timeoutMs: 30000,
        maxRetries: 3,
        retryDelayMs: 1000,
        enableLogging: true,
        headers: {}
      };

      const visApi = new VisApiClient(config, DEFAULT_RETRY_CONFIG);

      try {
        // GetEvent call without field specification as requested
        const tournamentResponse = await visApi.getEvent({
          eventNo: tournament.visNo
        });

        if (tournamentResponse.success && tournamentResponse.xmlData) {
          // Format XML for readability
          const formattedXml = tournamentResponse.xmlData
            .replace(/></g, '>\n<')
            .replace(/^\s*\n/gm, '')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n');

          // Extract BeachTournament numbers from Content field of GetEvent response
          let contentField = '';
          const contentMatch = tournamentResponse.xmlData.match(/Content="([^"]*)"/);
          if (contentMatch) {
            contentField = contentMatch[1];

            // Decode HTML entities
            const decodedContent = contentField
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#xD;&#xA;/g, '')
              .replace(/&#xA;/g, '');

            const formattedContent = decodedContent
              .replace(/></g, '>\n<')
              .replace(/^\s*\n/gm, '')
              .split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 0)
              .join('\n');

            // Now extract BeachTournament entries from the decoded content
            const beachTournamentMatches = decodedContent.match(/<BeachTournament[^>]*No="([^"]*)"[^>]*Gender="([^"]*)"[^>]*\/>/g);

            if (beachTournamentMatches && beachTournamentMatches.length > 0) {
              // Parse each BeachTournament entry
              const tournaments = beachTournamentMatches.map(match => {
                const noMatch = match.match(/No="([^"]*)"/);
                const genderMatch = match.match(/Gender="([^"]*)"/);
                return {
                  no: noMatch ? noMatch[1] : null,
                  gender: genderMatch ? genderMatch[1] : null
                };
              });

              // Store tournament list for subsequent API calls
              const validTournaments = tournaments.filter(t => t.no && t.gender);
              if (validTournaments.length > 0) {
                (tournament as any).beachTournaments = validTournaments;
                (tournament as any).tournamentNo = validTournaments[0].no;
              } else {
                (tournament as any).beachTournaments = [];
                (tournament as any).tournamentNo = tournament.visNo;
              }
            } else {
              (tournament as any).beachTournaments = [];
              (tournament as any).tournamentNo = tournament.visNo;
            }
          } else {
            (tournament as any).beachTournaments = [];
            (tournament as any).tournamentNo = tournament.visNo;
          }
        } else {
          (tournament as any).beachTournaments = [];
          (tournament as any).tournamentNo = tournament.visNo;
        }
      } catch (error) {
        (tournament as any).beachTournaments = [];
        (tournament as any).tournamentNo = tournament.visNo;
      }
    }
    
    // Get all available tournament numbers (both men's and women's if available)
    const beachTournaments = (tournament as any).beachTournaments;
    const tournamentNo = (tournament as any).tournamentNo;


    if (!beachTournaments && !tournamentNo) {
      setMatches([]);
      setLoadMatchesInProgress(false);
      return;
    }
    
    setMatchesLoading(true);
    try {
      const { VisApiClient } = await import('../services/api/VisApiClient');
      const { DEFAULT_RETRY_CONFIG } = await import('../types/api-v2');
      
      const config = {
        baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
        timeoutMs: 30000, // Increase to 30 seconds for match list requests (can be large)
        maxRetries: 3,
        retryDelayMs: 1000,
        enableLogging: true,
        headers: {}
      };
      
      const visApi = new VisApiClient(config, DEFAULT_RETRY_CONFIG);
      
      let allMatches: BeachMatchCore[] = [];
      
      // STEP 2 & 3: GetBeachTournament and GetBeachMatchList for each tournament in parallel
      if (beachTournaments && beachTournaments.length > 0) {

        // OPTIMIZED PARALLEL API CALLS - One GetBeachTournament + One GetBeachMatchList per tournament
        const matchPromises = beachTournaments.map(async (beachTournament) => {
          try {
            // STEP 2: GetBeachTournament without field specification (as requested)
            let tournamentTimezone: string | undefined;
            let tournamentData: any = undefined;
            try {
              const tournamentRequest: GetBeachTournamentRequest = {
                tournamentNo: beachTournament.no
                // No fields specified as requested
              };
              const tournamentResponse = await visApi.getBeachTournament(tournamentRequest);


              if (tournamentResponse.success && tournamentResponse.xmlData) {
                // Format XML for readability
                const formattedTournamentXml = tournamentResponse.xmlData
                  .replace(/></g, '>\n<')
                  .replace(/^\s*\n/gm, '')
                  .split('\n')
                  .map(line => line.trim())
                  .filter(line => line.length > 0)
                  .join('\n');

                tournamentData = VisResponseParser.parseBeachTournament(tournamentResponse.xmlData);

                tournamentTimezone = tournamentData?.DefaultTimeZone;

              }
            } catch (error) {
              console.warn('⚠️ Failed to fetch tournament timezone, will fall back to match-level timezone:', error);
            }

            // STEP 3: GetBeachMatchList for each tournament
            const matchRequest: GetBeachMatchListRequest = {
              tournamentNo: beachTournament.no,
              includeResults: true,
              includeReferees: true
            };

            const matchResponse = await visApi.getBeachMatchList(matchRequest);

            // Phase 3 Logging: GetBeachMatchList API Flow
            console.log('🏐 ===== PHASE 3: GetBeachMatchList API Flow =====');
            console.log('📤 REQUEST (all available fields):', {
              endpoint: 'GetBeachMatchList',
              // Required fields
              tournamentNo: matchRequest.tournamentNo,
              // Optional filters (showing what we're requesting)
              courtNo: matchRequest.courtNo || '(not specified)',
              status: matchRequest.status || '(not specified)',
              startDate: matchRequest.startDate || '(not specified)',
              endDate: matchRequest.endDate || '(not specified)',
              includeResults: matchRequest.includeResults,
              includeReferees: matchRequest.includeReferees,
              refereeId: matchRequest.refereeId || '(not specified)',
              // Available but not used fields (from GetBeachMatchListRequest interface):
              availableButNotUsed: [
                'courtNo - Filter by court number',
                'status - Filter by match status',
                'startDate - Start date for matches',
                'endDate - End date for matches',
                'refereeId - Filter by first referee ID'
              ],
              timestamp: new Date().toISOString()
            });

            if (matchResponse.success && matchResponse.xmlData) {
              // Log raw response (truncated for readability)
              const rawResponse = matchResponse.xmlData;
              const truncatedResponse = rawResponse.length > 2000
                ? rawResponse.substring(0, 2000) + '...[TRUNCATED]...'
                : rawResponse;

              console.log('📥 RAW RESPONSE (readable):', {
                success: matchResponse.success,
                dataLength: rawResponse.length,
                responsePreview: truncatedResponse.replace(/></g, '>\n<'), // Add newlines between tags
                timestamp: new Date().toISOString()
              });
              // Parse matches with tournament timezone context and gender data
              const tournamentGender = beachTournament.gender; // Use existing parsed gender
              const tournamentGenderText = tournamentGender === '0' ? 'M' : tournamentGender === '1' ? 'W' : 'M'; // Convert 0→M, 1→W


              // Construct timezone-compatible TournamentLocation from parsed tournament data
              // Check various possible field names from the API response
              const tournamentLocationForTimezone = tournamentData ? {
                city: tournamentData.city || tournamentData.DefaultCity,
                country: tournamentData.country || tournamentData.CountryName,
                countryCode: tournamentData.countryCode || tournamentData.CountryCode,
                venue: tournamentData.venue || tournamentData.DefaultVenue,
                name: tournamentData.name || tournamentData.Name || tournamentData.Title
              } : undefined;

              // Store API tournament location data for use in MatchListV2
              if (tournamentLocationForTimezone) {
                setApiTournamentLocationData(tournamentLocationForTimezone);
              }

              const matchesCore = VisResponseParser.parseBeachMatches(
                matchResponse.xmlData,
                beachTournament.no,
                tournamentTimezone,
                tournamentGender, // Use beachTournament.gender
                tournamentGenderText, // Use beachTournament.gender as text too
                tournamentLocationForTimezone // Pass timezone-compatible tournament location data
              );

              // Log parsed objects (first match only)
              if (matchesCore.length > 0) {
                const firstMatch = matchesCore[0];
                console.log('📋 PARSED OBJECT (first match):', {
                  totalMatches: matchesCore.length,
                  firstMatch: {
                    id: firstMatch.id,
                    visNo: firstMatch.visNo,
                    matchCode: firstMatch.matchCode,
                    round: firstMatch.round,
                    status: firstMatch.status,
                    rawStatus: (firstMatch as any).rawStatus,
                    court: firstMatch.court,
                    scheduledDateTime: firstMatch.scheduledDateTime,
                    team1: {
                      teamName: firstMatch.team1.teamName,
                      countryCode: firstMatch.team1.countryCode,
                      player1Name: firstMatch.team1.player1Name,
                      player2Name: firstMatch.team1.player2Name
                    },
                    team2: {
                      teamName: firstMatch.team2.teamName,
                      countryCode: firstMatch.team2.countryCode,
                      player1Name: firstMatch.team2.player1Name,
                      player2Name: firstMatch.team2.player2Name
                    },
                    refereeAssignments: firstMatch.refereeAssignments,
                    result: firstMatch.result,
                    resultType: (firstMatch as any).resultType,
                    tournamentGender: (firstMatch as any).tournamentGender,
                    tournamentGenderText: (firstMatch as any).tournamentGenderText,
                    teamAPositionInMainDraw: (firstMatch as any).teamAPositionInMainDraw,
                    teamBPositionInMainDraw: (firstMatch as any).teamBPositionInMainDraw,
                    teamAPositionInQualification: (firstMatch as any).teamAPositionInQualification,
                    teamBPositionInQualification: (firstMatch as any).teamBPositionInQualification,
                    timezone: (firstMatch as any).timezone,
                    tournamentTimezone: firstMatch.tournamentTimezone,
                    Referee1Name: (firstMatch as any).Referee1Name,
                    Referee2Name: (firstMatch as any).Referee2Name
                  },
                  timestamp: new Date().toISOString()
                });
              } else {
                console.log('📋 PARSED OBJECT: No matches found in response');
              }
              console.log('🏐 ===== END PHASE 3 LOGGING =====');

              // OPTIMIZED: Batch extract legacy fields to avoid per-match regex
              const legacyFieldsMap = extractAllLegacyFields(matchResponse.xmlData);

              // Add gender information to each match and apply legacy fields
              const matchesWithGender = matchesCore.map((match, index) => {
                const legacyFields = legacyFieldsMap[match.visNo];


                // Preserve critical fields from VisResponseParser - don't let legacy fields override them
                const preservedFields = {
                  noInTournament: (match as any).noInTournament,
                  tournamentGender: (match as any).tournamentGender
                };

                const finalMatch = {
                  ...match,
                  ...legacyFields, // O(1) lookup instead of expensive per-match regex
                  ...preservedFields, // Override legacy fields with VisResponseParser values for critical fields
                  tournamentNo: beachTournament.no
                };


                return finalMatch;
              });

              return matchesWithGender;
            }
          } catch (error) {
            console.warn(`Failed to load matches for ${beachTournament.gender}:`, error);
            return [];
          }
          return [];
        });

        // Wait for ALL API calls in parallel instead of sequential
        const results = await Promise.all(matchPromises);

        // Combine all results
        results.forEach(matches => {
          if (matches && matches.length > 0) {
            allMatches = allMatches.concat(matches);
          }
        });
      } else {
        // Fallback: load from single tournament number using optimized approach
        // GetBeachTournament without field specification (as requested)
        let tournamentTimezone: string | undefined;
        try {
          const tournamentRequest: GetBeachTournamentRequest = {
            tournamentNo: tournamentNo
            // No fields specified as requested
          };
          const tournamentResponse = await visApi.getBeachTournament(tournamentRequest);

          if (tournamentResponse.success && tournamentResponse.xmlData) {
            // Format XML for readability
            const formattedFallbackXml = tournamentResponse.xmlData
              .replace(/></g, '>\n<')
              .replace(/^\s*\n/gm, '')
              .split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 0)
              .join('\n');

            const tournamentData = VisResponseParser.parseBeachTournament(tournamentResponse.xmlData);
            tournamentTimezone = tournamentData?.DefaultTimeZone;
          }
        } catch (error) {
          console.warn('⚠️ Failed to fetch tournament timezone in fallback, will fall back to match-level timezone:', error);
        }

        // GetBeachMatchList for the tournament
        const matchRequest: GetBeachMatchListRequest = {
          tournamentNo: tournamentNo,
          includeResults: true,
          includeReferees: true
        };

        const matchResponse = await visApi.getBeachMatchList(matchRequest);

        // Phase 3 Logging: GetBeachMatchList API Flow (Fallback Path)
        console.log('🏐 ===== PHASE 3: GetBeachMatchList API Flow (Fallback) =====');
        console.log('📤 REQUEST (fallback):', {
          endpoint: 'GetBeachMatchList',
          tournamentNo: matchRequest.tournamentNo,
          includeResults: matchRequest.includeResults,
          includeReferees: matchRequest.includeReferees,
          timestamp: new Date().toISOString()
        });

        if (matchResponse.success && matchResponse.xmlData) {
          // Log raw response (truncated for readability)
          const rawResponse = matchResponse.xmlData;
          const truncatedResponse = rawResponse.length > 2000
            ? rawResponse.substring(0, 2000) + '...[TRUNCATED]...'
            : rawResponse;

          console.log('📥 RAW RESPONSE (readable, fallback):', {
            success: matchResponse.success,
            dataLength: rawResponse.length,
            responsePreview: truncatedResponse.replace(/></g, '>\n<'), // Add newlines between tags
            timestamp: new Date().toISOString()
          });
        }

        // If failed and we have a real TournamentNo different from EventNo, try EventNo as fallback
        if (!matchResponse.success && tournament.visNo !== tournamentNo) {
          const fallbackRequest: GetBeachMatchListRequest = {
            tournamentNo: tournament.visNo,
            includeResults: true,
            includeReferees: true
          };
          const fallbackResponse = await visApi.getBeachMatchList(fallbackRequest);

          if (fallbackResponse.success && fallbackResponse.xmlData) {
            allMatches = VisResponseParser.parseBeachMatches(fallbackResponse.xmlData, tournament.visNo, tournamentTimezone, undefined, undefined, tournamentData);

            // Phase 3 Logging: Show parsed object for first match (fallback path)
            if (allMatches.length > 0) {
              const firstMatch = allMatches[0];
              console.log('📥 PARSED OBJECT (FALLBACK - First Match):', {
                id: firstMatch.id,
                matchNumber: firstMatch.matchNumber,
                status: firstMatch.status,
                scheduledDateTime: firstMatch.scheduledDateTime,
                teams: {
                  teamA: {
                    name: firstMatch.teamA.name,
                    country: firstMatch.teamA.country,
                    score: firstMatch.teamA.score,
                    position: firstMatch.teamA.position,
                    positionInQualification: (firstMatch.teamA as any).positionInQualification
                  },
                  teamB: {
                    name: firstMatch.teamB.name,
                    country: firstMatch.teamB.country,
                    score: firstMatch.teamB.score,
                    position: firstMatch.teamB.position,
                    positionInQualification: (firstMatch.teamB as any).positionInQualification
                  }
                },
                court: firstMatch.court,
                round: firstMatch.round,
                phase: firstMatch.phase,
                referees: firstMatch.referees?.map(ref => ({
                  name: ref.name,
                  country: ref.country,
                  function: ref.function
                })) || [],
                scheduled: (firstMatch as any).scheduled,
                tournamentInfo: {
                  tournamentTimezone,
                  defaultTimeZone: tournamentData?.defaultTimeZone
                },
                timestamp: new Date().toISOString()
              });
            }
          }
        } else if (matchResponse.success && matchResponse.xmlData) {
          allMatches = VisResponseParser.parseBeachMatches(matchResponse.xmlData, tournamentNo, tournamentTimezone, undefined, undefined, tournamentData);
        }
      }
      
      // Parse the response asynchronously to avoid blocking UI
      if (allMatches.length > 0) {
        setTimeout(async () => {
          try {
            // Sort matches by date and time in DESCENDING order (newest/latest first)
            const sortedMatches = allMatches.sort((a, b) => {
              const dateA = new Date(a.scheduledDateTime);
              const dateB = new Date(b.scheduledDateTime);
              return dateB.getTime() - dateA.getTime(); // Reversed for descending order
            });

            setMatches(sortedMatches);
            setMatchesLoading(false);

            // Cache the matches with tournament status
            const tournamentStatus = getTournamentStatus();
            TournamentMatchCache.cacheMatches(tournament.visNo, sortedMatches, tournamentStatus)
              .catch(error => console.warn('Failed to cache matches:', error));
          } catch (parseError) {
            setMatches([]);
            setMatchesLoading(false);
          }
        }, 10); // Small delay to let UI update
      } else {
        setMatches([]);
        setMatchesLoading(false);
      }
    } catch (error) {
      setMatches([]);
      setMatchesLoading(false);
    } finally {
      // Reset loading guard
      setLoadMatchesInProgress(false);
    }
    // Note: Don't set setMatchesLoading(false) in finally - async parsing handles it
  };

  // Trigger autoscroll when matches are loaded
  useEffect(() => {
    if (matches && matches.length > 0 && !matchesLoading && (activeTab === 'matches' || activeTab === 'schedule')) {
      // Reset retry counter for new attempt
      autoscrollRetryCount.current = 0;

      setTimeout(() => {
        attemptAutoScroll(matches);
      }, 300); // Delay to allow layout
    }
  }, [matches, matchesLoading, activeTab]);

  // OPTIMIZED: Batch XML parsing function to avoid per-match regex overhead
  const extractAllLegacyFields = (xmlData: string): Record<string, any> => {
    const fieldsMap: Record<string, any> = {};

    // Single regex to find ALL BeachMatch elements (much faster than per-match regex)
    const allMatchesRegex = /<BeachMatch[^>]*>/g;
    let match;

    while ((match = allMatchesRegex.exec(xmlData)) !== null) {
      const matchElement = match[0];
      const noMatch = matchElement.match(/No="([^"]*)"/);

      if (noMatch) {
        const matchNo = noMatch[1];

        // Helper function to extract XML attributes efficiently
        const extractAttribute = (xml: string, attribute: string): string | null => {
          const regex = new RegExp(`${attribute}="([^"]*)"`,'i');
          const match = xml.match(regex);
          return match ? match[1] : null;
        };


        fieldsMap[matchNo] = {
          // Don't extract noInTournament here - we'll use the value from VisResponseParser
          PointsTeamASet1: extractAttribute(matchElement, 'PointsTeamASet1'),
          PointsTeamBSet1: extractAttribute(matchElement, 'PointsTeamBSet1'),
          PointsTeamASet2: extractAttribute(matchElement, 'PointsTeamASet2'),
          PointsTeamBSet2: extractAttribute(matchElement, 'PointsTeamBSet2'),
          PointsTeamASet3: extractAttribute(matchElement, 'PointsTeamASet3'),
          PointsTeamBSet3: extractAttribute(matchElement, 'PointsTeamBSet3'),
          MatchPointsA: extractAttribute(matchElement, 'MatchPointsA'),
          MatchPointsB: extractAttribute(matchElement, 'MatchPointsB'),
          Duration: extractAttribute(matchElement, 'Duration'),
          DurationSet1: extractAttribute(matchElement, 'DurationSet1'),
          DurationSet2: extractAttribute(matchElement, 'DurationSet2'),
          DurationSet3: extractAttribute(matchElement, 'DurationSet3'),
          Referee1Name: extractAttribute(matchElement, 'Referee1Name'),
          Referee2Name: extractAttribute(matchElement, 'Referee2Name'),
        };
      }
    }

    return fieldsMap;
  };

  // Pull-to-refresh function that preserves user filters
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    
    try {
      // Refresh tournament display data, matches, and referee list while preserving filters
      await Promise.all([
        loadTournamentDisplayData(),
        loadMatches(),
        loadRefereeList()
      ]);
      
      // Refresh live scores if available
      if (refreshLiveScores) {
        refreshLiveScores();
      }
    } catch (error) {
    } finally {
      setRefreshing(false);
    }
  }, [refreshLiveScores]);

  // Load complete tournament data when we have minimal tournament from visNo only
  useEffect(() => {
    const loadCompleteDataFromAPI = async () => {
      if (!isMinimalTournament || !visNo || completeTournamentData) return;

      setDetailsLoading(true);

      try {
        // First try to get tournaments from API
        let tournaments: TournamentCore[] = [];

        try {
          const { VisApiClient } = await import('../services/api/VisApiClient');
          const { DEFAULT_RETRY_CONFIG } = await import('../types/api-v2');

          const config = {
            baseURL: process.env.EXPO_PUBLIC_VIS_API_BASE_URL || '',
            timeout: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '10000', 10),
          };

          const visApi = new VisApiClient(config, DEFAULT_RETRY_CONFIG);
          const apiResponse = await visApi.getTournaments();
          tournaments = apiResponse.tournaments || [];

        } catch (apiError) {
          // Fallback to sample tournaments
          tournaments = await FallbackTournamentService.getTournaments();
        }

        // Find the tournament with matching visNo
        const fullTournament = tournaments.find(t => t.visNo === visNo);

        if (fullTournament) {
          setCompleteTournamentData(fullTournament);
          setIsMinimalTournament(false);
        }
      } catch (error) {
        console.error('Error loading complete tournament data:', error);
      } finally {
        setDetailsLoading(false);
      }
    };

    loadCompleteDataFromAPI();
  }, [isMinimalTournament, visNo, completeTournamentData]);

  useEffect(() => {
    if (tournament.visNo) {
      // Track recently viewed tournament for cache warming
      TournamentCacheWarmingService.trackRecentlyViewed(tournament.visNo);

      // Load tournament display data (country, location info for TournamentCard)
      loadTournamentDisplayData();
      loadMatches();

      // Load referee list using dual system (GetEventRefereeList for LIVE/SCHEDULED, matches for COMPLETED)
      loadRefereeList();
    }

    // Clear expired caches on first load
    TournamentStorageService.clearExpiredTournamentCaches().catch(() => {
      // Silent fail for cache cleanup
    });
  }, [tournament.visNo]); // Removed tournamentData to prevent excessive reloads

  // Initialize cache warming service on component mount
  useEffect(() => {
    TournamentCacheWarmingService.startBackgroundWarming();

    return () => {
      // Cleanup cache warming on unmount
      TournamentCacheWarmingService.stopBackgroundWarming();
    };
  }, []);

  // Clean up - removed debug effect


  // Handle status bar press - navigate to assignments if available
  const handleStatusPress = () => {
    if (currentAssignmentStatus) {
      router.push('/my-assignments');
    }
  };



  if (!tournament.visNo) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Tournament data not found</Text>
        <Text style={styles.errorSubText}>This tournament may no longer be available or the link is incorrect.</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationHeader
        title={activeTab === 'schedule' ? 'Schedule & Results' : 'Officials'}
        subtitle={tournament?.name}
        showBackButton={true}
        onBackPress={() => router.back()}
        onHomePress={() => router.push('/')}
        showStatusBar={false}
      />

      {/* Tournament Info - Scrollable */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        stickyHeaderIndices={[1]} // Make the filters section sticky (always index 1)
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B35']} // Android
            tintColor="#FF6B35" // iOS
            title="Pull to refresh tournament data"
            titleColor="#666"
          />
        }
      >
        {/* Index 0: Tournament Card - will scroll up and disappear */}
        {detailsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingText}>Loading tournament details...</Text>
          </View>
        ) : (
          <View>
            {/* Use unified TournamentCard component without extra wrappers */}
            <TournamentCard
              tournament={detailedTournament || tournament}
              onPress={() => {}} // No action needed since we're already on the detail screen
              showDefaultToggle={true}
              showStatusBadge={true}
              compact={false}
            />
          </View>
        )}

        {/* Index 1: STICKY FILTERS SECTION - Date Navigator + Filter Controls - Only show for schedule tab */}
        {activeTab === 'schedule' && (
          <View style={styles.stickyFiltersWrapper}>
            {!detailsLoading ? (
              <View>

                {/* Filter Controls Section */}
                <View style={styles.filterControlsSection}>
                  <View style={styles.filterToggleContainer}>
                    <TouchableOpacity
                      style={styles.filterToggleButton}
                      onPress={() => setShowFilters(!showFilters)}
                    >
                      <Text style={styles.filterToggleText}>
                        {showFilters ? 'Hide Filters' : 'Show Filters'} {showFilters ? '▲' : '▼'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.resetFiltersButton}
                      onPress={() => {
                        setCourtFilter('All');
                        setGenderFilter('All');
                        setStatusFilter('All');
                        setRefereeFilter('All');
                        setShowRefereeDropdown(false);
                      }}
                    >
                      <Text style={styles.resetFiltersText}>Reset Filters</Text>
                    </TouchableOpacity>

                  </View>

                  {/* Expanded Filter Options */}
                  {showFilters && matches && matches.length > 0 && (
                    <ExpandedFiltersView
                      matches={matches}
                      genderFilter={genderFilter}
                      setGenderFilter={setGenderFilter}
                      courtFilter={courtFilter}
                      setCourtFilter={setCourtFilter}
                      refereeFilter={refereeFilter}
                      setRefereeFilter={setRefereeFilter}
                      showRefereeDropdown={showRefereeDropdown}
                      setShowRefereeDropdown={setShowRefereeDropdown}
                      setShowFilters={setShowFilters}
                      refereeNamesFromAPI={refereeNamesFromAPI}
                      refereeDataFromAPI={refereeDataFromAPI}
                      getTournamentStatus={getTournamentStatus}
                    />
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.filtersPlaceholder}>
                <Text style={styles.filtersPlaceholderText}>
                  {detailsLoading ? 'Loading filters...' : 'Loading tournament data...'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Content Section - Only show when not loading */}
        {!detailsLoading && (
          <View>
            {/* Schedule Tab Content */}
            {activeTab === 'schedule' && (
              <View style={[styles.tabContent, styles.tabContentSpacing]}>
                {/* Live Score Cards for InProgress/Scheduled matches */}
                {matches && matches.length > 0 && (
                  <View style={styles.liveScoresContainer}>
                    {matches
                      .filter(match => {
                        // Show LiveScoreCard for matches that could have live data
                        const status = match.status;
                        // Show all live scores - date filtering removed
                        return (status === 'InProgress' || status === 'Scheduled');
                      })
                      .map(match => {
                        const matchNumber = getMatchNumberForLiveScore(match);
                        const liveScore = matchNumber ? getLiveScore(matchNumber) : null;
                        const liveScoreState = matchNumber ? liveScores[matchNumber] : null;

                        return (
                          <LiveScoreCard
                            key={match.id}
                            matchNo={matchNumber || 0}
                            beachLive={liveScore || undefined}
                            loading={liveScoreState?.isLoading || false}
                            error={liveScoreState?.error || undefined}
                            fallbackMatch={match as any}
                            onRefresh={refreshLiveScores}
                            style={styles.liveScoreCard}
                          />
                        );
                      })}
                  </View>
                )}

                <View
                  ref={matchListRef}
                  onLayout={(event) => {
                    const yPosition = event.nativeEvent.layout.y;
                    matchListOffset.current = yPosition;
                  }}
                >
                  <MatchListV2
                    matches={matches || []}
                    loading={matchesLoading || matches === null}
                    title=""
                    emptyMessage={(() => {
                      const status = getTournamentStatus();
                      if (status === 'COMPLETED') {
                        return "Loading completed tournament matches...";
                      } else if (status === 'SCHEDULED') {
                        return "Matches will be available when the tournament starts";
                      }
                      return "No matches available for this tournament";
                    })()}
                    showGenderFilter={false}
                    showStatsInFilter={false}
                    showCourtFilter={false}
                    showRefereeFilter={false}
                    externalCourtFilter={courtFilter}
                    onCourtFilterChange={setCourtFilter}
                    externalGenderFilter={genderFilter}
                  onGenderFilterChange={setGenderFilter}
                  externalRefereeFilter={refereeFilter}
                  onRefereeFilterChange={setRefereeFilter}
                  onMatchesReady={handleMatchesReady}
                  onMatchLayout={handleMatchLayout}
                  enableTimelineView={true}
                  showAllDays={true}
                  liveScores={liveScores}
                  getLiveScore={getLiveScore}
                  // Hybrid hook features - provide tournament code for enhanced caching and real-time updates
                  tournamentCode={enhancedTournament?.visNo}
                  enableRealTime={getTournamentStatus() === 'LIVE' || getTournamentStatus() === 'SCHEDULED'}
                  enableLiveScores={getTournamentStatus() === 'LIVE'}
                  tournamentTimezone={(() => {
                    try {
                      // Use the comprehensive timezone detection system
                      const { detectTournamentTimezone } = require('../utils/tournamentTimezoneMapping');

                      const tournamentLocation = {
                        city: apiTournamentLocationData?.city || tournament?.city,
                        country: apiTournamentLocationData?.country || tournament?.country,
                        countryCode: apiTournamentLocationData?.countryCode || tournament?.countryCode,
                        venue: apiTournamentLocationData?.venue || tournament?.venue,
                        name: apiTournamentLocationData?.name || tournament?.name
                      };

                      const detectionResult = detectTournamentTimezone(tournamentLocation);

                      return detectionResult.timezone;
                    } catch (error) {
                      return 'UTC'; // Fallback
                    }
                  })()}
                  tournamentGender={enhancedTournament?.gender}
                  tournamentData={(() => {
                    // Get the detected timezone from the previous calculation
                    const detectedTimezone = (() => {
                      try {
                        const { detectTournamentTimezone } = require('../utils/tournamentTimezoneMapping');
                        const tournamentLocation = {
                          city: apiTournamentLocationData?.city || tournament?.city,
                          country: apiTournamentLocationData?.country || tournament?.country,
                          countryCode: apiTournamentLocationData?.countryCode || tournament?.countryCode,
                          venue: apiTournamentLocationData?.venue || tournament?.venue,
                          name: apiTournamentLocationData?.name || tournament?.name
                        };
                        const detectionResult = detectTournamentTimezone(tournamentLocation);
                        return detectionResult.timezone;
                      } catch (error) {
                        return 'UTC';
                      }
                    })();

                    const tournamentDataForMatchList = {
                      city: apiTournamentLocationData?.city || tournament?.city,
                      country: apiTournamentLocationData?.country || tournament?.country,
                      countryCode: apiTournamentLocationData?.countryCode || tournament?.countryCode,
                      name: apiTournamentLocationData?.name || tournament?.name,
                      venue: apiTournamentLocationData?.venue || tournament?.venue,
                      defaultTimeZone: detectedTimezone,
                      startDate: tournament?.dates?.startDate, // For live tournament detection
                      endDate: tournament?.dates?.endDate, // For live tournament detection
                    };


                    return tournamentDataForMatchList;
                  })()}
                  matchFilters={{
                    // Use the tournament numbers from the existing complex loading logic
                    tournamentCode: enhancedTournament?.visNo,
                    // Add date range if available from enhanced tournament data
                    dateRange: enhancedTournament?.dates ? {
                      startDate: enhancedTournament.dates.startDate,
                      endDate: enhancedTournament.dates.endDate
                    } : undefined
                  }}
                />
                </View>
              </View>
            )}

            {/* Officials Tab Content */}
            {activeTab === 'officials' && (
              <View style={[styles.tabContent, styles.tabContentSpacing]}>
                {/* Referees List Title */}
                <View style={styles.refereesListTitleContainer}>
                  <Text style={styles.refereesListTitle}>Referees List</Text>
                </View>

                <TournamentRefereeList
                  tournamentNo={tournament.visNo}
                  tournamentName={tournament.name || tournament.title}
                  tournamentData={JSON.stringify({
                    visNo: tournament.visNo,
                    name: tournament.name || tournament.title,
                    startDate: tournament.dates?.startDate,
                    endDate: tournament.dates?.endDate,
                    status: tournament.status
                  })}
                  matchData={matches ? JSON.stringify(matches.slice(0, 100)) : undefined}
                  showHeader={false}
                  onRefresh={onRefresh}
                />
              </View>
            )}
          </View>
        )}
      </ScrollView>
      
      {/* Tournament Bottom Menu */}
      <TournamentBottomMenu
        activeTab={activeTab}
        onTabChange={(tab) => {
          // Switch between all tabs locally
          setActiveTab(tab);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 20,
    color: '#1B365D',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  errorSubText: {
    fontSize: 16,
    color: '#445566',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  backButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 80, // Add space for bottom menu (menu height + safe area)
  },
  tabContentSpacing: {
    paddingBottom: 20, // Bottom padding for content
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  debugText: {
    fontSize: 12,
    color: '#FF0000',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFEEEE',
    padding: 4,
  },
  
  // Tournament Summary Card - Compact version
  compactSummaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    ...shadowPresets.small,
    elevation: 3,
  },
  compactCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  compactInfo: {
    gap: 6,
  },
  infoRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoIcon: {
    fontSize: 16,
    width: 20,
  },
  infoRow: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B365D',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Status Integration Styles
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  
  statusBadgeText: {
    color: designTokens.colors.background,
    fontSize: 11,
    fontWeight: 'bold',
  },
  
  networkStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  networkStatusText: {
    fontSize: 12,
  },
  
  tournamentSelectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1B365D',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadowPresets.small,
    elevation: 3,
  },
  
  tournamentSelectButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
  },

  // Tab Headers Styles (non-sticky)
  tabHeadersWrapper: {
    backgroundColor: '#F5F5F5', // Match container background
    paddingTop: 8,
  },
  
  // Sticky Filters Wrapper - Always present container
  stickyFiltersWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    zIndex: 10,
    elevation: 3,
    ...shadowPresets.small,
  },
  
  // Date Navigator Section
  dateNavigatorSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  
  // Filter Controls Section
  filterControlsSection: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },

  // Filter Toggle Container
  filterToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  filterToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  
  filterToggleText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  
  resetFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  
  resetFiltersText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
  },
  
  // Expanded Filters
  expandedFilters: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  
  filterGroup: {
    marginBottom: 12,
  },

  refereeFilterGroup: {
    zIndex: 9998,
    position: 'relative',
  },
  
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  
  filterButtonActive: {
    backgroundColor: '#1F2937',
    borderColor: '#1F2937',
  },
  
  filterButtonText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  
  // In-card tab headers
  inCardTabHeaders: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
    marginTop: 16,
  },
  
  // Placeholder when filters not available
  filtersPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
  },
  
  filtersPlaceholderText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  tabHeadersContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    ...shadowPresets.small,
    elevation: 3,
  },
  tabHeaders: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
    flex: 1,
  },
  tabHeader: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTabHeader: {
    backgroundColor: '#1B365D',
  },
  tabHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabHeaderText: {
    color: '#FFFFFF',
  },
  tabContent: {
    minHeight: 200,
  },
  rankingPlaceholder: {
    backgroundColor: '#FFFFFF',
    padding: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowPresets.small,
    elevation: 3,
    minHeight: 150,
  },
  rankingPlaceholderText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
  },

  // Schedule Section Styles
  scheduleSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    ...shadowPresets.small,
    elevation: 3,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B365D',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },

  scheduleContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  scheduleText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    textAlign: 'left',
  },


  // Tournament Card Styles (matching VisTournamentList)
  tournamentCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    ...shadowPresets.small,
    elevation: 3,
  },
  tournamentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tournamentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Removed unused tournament header styles - now using TournamentCard component


  // Live Scores Container Styles
  liveScoresContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  liveScoreCard: {
    marginBottom: 12,
  },

  // Dropdown styles for referee filter
  dropdownContainer: {
    position: 'relative',
    zIndex: 99999,
    elevation: 20,
  },
  dropdownButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minWidth: 180,
    maxWidth: 250,
  },
  dropdownButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  dropdownButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  dropdownButtonTextActive: {
    color: '#FFFFFF',
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#6B7280',
    marginLeft: 8,
  },
  dropdownArrowActive: {
    color: '#FFFFFF',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginTop: 2,
    maxHeight: 200,
    ...shadowPresets.small,
    elevation: 25,
    zIndex: 100000,
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownFlag: {
    width: 16,
    height: 12,
    borderRadius: 2,
  },
  dropdownItemActive: {
    backgroundColor: '#EFF6FF',
  },
  dropdownItemText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },

  // Removed unused default switch styles - now handled by TournamentCard component

  // Save button styles for filters panel
  saveButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    zIndex: 1,
    position: 'relative',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // DEBUG BUTTON STYLES - Temporary for development
  debugButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#8B5CF6', // Purple background for debug
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  
  debugButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Empty state styles for players tab
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    ...shadowPresets.small,
    elevation: 3,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Referees List Title Styles
  refereesListTitleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  refereesListTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B365D',
    letterSpacing: 0.5,
  },

});

// Wrapper component with AssignmentStatusProvider
const TournamentDetailScreen: React.FC = () => {
  return (
    <AssignmentStatusProvider>
      <TournamentDetailScreenContent />
    </AssignmentStatusProvider>
  );
};

export default TournamentDetailScreen;
