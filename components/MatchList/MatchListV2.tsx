import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, Pressable, ScrollView, Platform } from 'react-native';
import { BeachMatchCore, MatchStatus, MatchResult, MatchTeam, CourtInfo } from '../../types/match-v2';
import { MatchList, MatchCard } from '../entities/Match';
import { useMatches, MatchesFilters } from '../../hooks/useMatches';
import { MatchDTO } from '../../services/DualReadService';
import { featureFlags } from '../../hooks/compatibility/FeatureFlags';
import { calculateTotalDuration } from '../../utils/MatchDurationFormatter';
import { useRefereeScreenAnalytics } from '../../hooks/useAnalyticsCollection';

// Extended match type to include tournament-specific fields
type ExtendedBeachMatch = BeachMatchCore & {
  tournamentGender?: 'M' | 'W';
  tournamentNo?: string;
};

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

  // Create the core BeachMatchCore object
  const beachMatchCore: BeachMatchCore = {
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

  // Preserve ALL original DTO fields for legacy compatibility
  // This allows MatchCard to access legacy fields like PointsTeamASet1, Referee1Name, etc.
  const preservedMatch = {
    ...beachMatchCore,
    ...(dto as any), // Spread all original DTO fields to preserve legacy data
    
    // Ensure core fields override any conflicts from DTO
    id: beachMatchCore.id,
    visNo: beachMatchCore.visNo,
    version: beachMatchCore.version,
    lastUpdated: beachMatchCore.lastUpdated,
    tournamentId: beachMatchCore.tournamentId,
    matchCode: beachMatchCore.matchCode,
    round: beachMatchCore.round,
    phaseCode: beachMatchCore.phaseCode,
    status: beachMatchCore.status,
    court: beachMatchCore.court,
    scheduledDateTime: beachMatchCore.scheduledDateTime,
    actualStartTime: beachMatchCore.actualStartTime,
    actualEndTime: beachMatchCore.actualEndTime,
    team1: beachMatchCore.team1,
    team2: beachMatchCore.team2,
    result: beachMatchCore.result,
    refereeAssignments: beachMatchCore.refereeAssignments,
  };


  return preservedMatch;
};

// Type-safe helper to extract duration fields from match data
type MatchWithDurationFields = {
  DurationSet1?: string;
  DurationSet2?: string;
  DurationSet3?: string;
};

const getMatchDuration = (match: ExtendedBeachMatch): string | null => {
  
  // FIXED: Primary: Use total match duration from enhanced data (Duration field in seconds)
  const totalDurationSeconds = (match as any).Duration;
  if (totalDurationSeconds) {
    const totalMinutes = Math.floor(parseInt(totalDurationSeconds) / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Fallback: try to get duration from match result (calculated from start/end time)
  if (match.result?.duration && typeof match.result.duration === 'number') {
    const totalMinutes = match.result.duration;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
  
  // Fallback: Calculate from individual set durations
  // Handle both formats: seconds (integers) and "mm:ss" format (strings)
  const durationSet1 = (match as any).DurationSet1;
  const durationSet2 = (match as any).DurationSet2;
  const durationSet3 = (match as any).DurationSet3;
  
  if (durationSet1 || durationSet2 || durationSet3) {
    // Check if durations are in "mm:ss" format (strings) or seconds (numbers)
    const isStringFormat = typeof durationSet1 === 'string' && durationSet1.includes(':');
    
    if (isStringFormat) {
      // Use the utility function for "mm:ss" format
      const totalDuration = calculateTotalDuration(durationSet1, durationSet2, durationSet3);
      if (totalDuration) {
        return totalDuration;
      }
    } else {
      // Handle seconds format (integers) - ensure all three sets are included
      const totalSeconds = (parseInt(durationSet1 || '0') + 
                           parseInt(durationSet2 || '0') + 
                           parseInt(durationSet3 || '0'));
      
      if (totalSeconds > 0) {
        const totalMinutes = Math.floor(totalSeconds / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        if (hours > 0) {
          return `${hours}h ${minutes}m`;
        } else {
          return `${minutes}m`;
        }
      }
    }
  }

  // Final fallback: try legacy calculateTotalDuration function
  const matchWithDuration = match as ExtendedBeachMatch & MatchWithDurationFields;
  return calculateTotalDuration(
    matchWithDuration.DurationSet1,
    matchWithDuration.DurationSet2,
    matchWithDuration.DurationSet3
  );
};

interface MatchListV2Props {
  matches?: ExtendedBeachMatch[]; // Made optional to allow hook-based data fetching
  loading?: boolean;
  title?: string;
  selectedReferee?: { Name: string } | null;
  emptyMessage?: string;
  // New props for hook-based data fetching
  tournamentCode?: string; // Enable filtering by tournament
  eventId?: number;
  matchFilters?: MatchesFilters; // Additional filters for useMatches hook
  enableRealTime?: boolean; // Enable real-time updates for live matches
  enableLiveScores?: boolean; // Enable live score updates
  showDateNavigator?: boolean;
  showGenderFilter?: boolean;
  showStatsInFilter?: boolean;
  showCourtFilter?: boolean;
  showRefereeFilter?: boolean;
  customFilters?: React.ReactNode;
  externalCourtFilter?: string; // External court filter to override internal state
  onCourtFilterChange?: (court: string) => void; // Callback for court filter changes
  externalGenderFilter?: 'All' | 'M' | 'W'; // External gender filter to override internal state
  onGenderFilterChange?: (gender: 'All' | 'M' | 'W') => void; // Callback for gender filter changes
  externalRefereeFilter?: string; // External referee filter to override internal state
  onRefereeFilterChange?: (referee: string) => void; // Callback for referee filter changes
  onMatchesReady?: (matches: ExtendedBeachMatch[], targetIndex: number) => void; // Callback when matches are ready with target scroll index
  onMatchLayout?: (matchId: string, y: number) => void; // Callback for match layout measurement
  showAllDays?: boolean; // Enhanced: Show all tournament days in timeline view
  enableTimelineView?: boolean; // Enhanced: Enable complete tournament timeline mode
  liveScores?: { [matchNumber: string]: any }; // External live scores data
  getLiveScore?: (matchNumber: number | string) => any; // Function to get live score for a match
}

export const MatchListV2: React.FC<MatchListV2Props> = ({
  matches: propMatches,
  loading: propLoading = false,
  title = "Matches",
  selectedReferee,
  emptyMessage = "No matches found",
  // New hook-based props
  tournamentCode,
  eventId,
  matchFilters,
  enableRealTime = false,
  enableLiveScores = false,
  showDateNavigator = true,
  showGenderFilter = true,
  showStatsInFilter = true,
  showCourtFilter = true,
  showRefereeFilter = true,
  customFilters,
  externalCourtFilter,
  onCourtFilterChange,
  externalGenderFilter,
  onGenderFilterChange,
  externalRefereeFilter,
  onRefereeFilterChange,
  onMatchesReady,
  onMatchLayout,
  showAllDays = false,
  enableTimelineView = false,
  liveScores,
  getLiveScore,
}) => {
  // Analytics tracking for match list interactions
  const { trackRefereeInteraction } = useRefereeScreenAnalytics();

  // ScrollView ref for auto-scroll functionality (moved to top)
  const scrollViewRef = useRef<ScrollView>(null);
  const matchLayoutsRef = useRef<Record<string, number>>({});
  const pendingAutoscrollRef = useRef<boolean>(false);

  // Hook-based data fetching when tournamentCode is provided AND feature flag is enabled
  // Disable hook on web to avoid CORS issues with Supabase functions; rely on provided matches instead
  const shouldUseHook = !!tournamentCode && Platform.OS !== 'web' && featureFlags.shouldUseNewHook('MatchListV2', 'matches');
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

  // Extract hook data safely
  const rawMatches = hookResult?.data || [];
  const hookLoading = hookResult?.isLoading || false;
  const hookError = hookResult?.error || null;
  const forceRefresh = hookResult?.forceRefresh || (() => Promise.resolve());

  // Track hook errors for migration safety
  useEffect(() => {
    if (shouldUseHook && hookError) {
      featureFlags.recordError('MatchListV2', hookError.message || 'Unknown hook error');
    }
  }, [shouldUseHook, hookError]);

  // Transform hook data to component format
  const hookMatches = useMemo(() => {
    return shouldUseHook ? rawMatches.map(transformMatchDTO) : [];
  }, [rawMatches, shouldUseHook]);

  // Use either prop matches or hook matches
  const activeMatches = propMatches || hookMatches;
  const loading = propLoading || (shouldUseHook ? hookLoading : false);
  const error = hookError?.message || null;
  // State for collapsible referees and dropdown
  const [expandedReferees, setExpandedReferees] = useState<{[key: string]: boolean}>({});
  const [showRefereeDropdown, setShowRefereeDropdown] = useState<boolean>(false);
  
  // State for collapsible date panels
  const [expandedDates, setExpandedDates] = useState<{[key: string]: boolean}>({});
  
  // State for set scores enhancement
  const [enhancedMatches, setEnhancedMatches] = useState<ExtendedBeachMatch[]>([]);
  const [setScoreService] = useState(() => (window as any).SetScoreService ? new (window as any).SetScoreService() : null);
  
  

  // Date selector completely removed
  
  const [genderFilter, setGenderFilter] = useState<'All' | 'M' | 'W'>(() => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        return (localStorage.getItem('matchlist-genderFilter') as 'All' | 'M' | 'W') || 'All';
      }
    } catch (error) {
      // localStorage not available, use defaults
    }
    return 'All';
  });

  const [courtFilter, setCourtFilter] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        return localStorage.getItem('matchlist-courtFilter') || 'All';
      }
    } catch (error) {
      // localStorage not available, use defaults
    }
    return 'All';
  });

  // Use external court filter if provided, otherwise internal state
  const effectiveCourtFilter = externalCourtFilter ?? courtFilter;
  const setEffectiveCourtFilter = (court: string) => {
    // Track filter analytics
    trackRefereeInteraction('filter', 'court_filter_change', {
      previous_filter: effectiveCourtFilter,
      new_filter: court,
      is_external: !!externalCourtFilter
    });
    
    if (onCourtFilterChange) {
      onCourtFilterChange(court);
    } else {
      setCourtFilter(court);
    }
  };

  // Use external gender filter if provided, otherwise internal state
  const effectiveGenderFilter = externalGenderFilter ?? genderFilter;
  const setEffectiveGenderFilter = (gender: 'All' | 'M' | 'W') => {
    // Track filter analytics
    trackRefereeInteraction('filter', 'gender_filter_change', {
      previous_filter: effectiveGenderFilter,
      new_filter: gender,
      is_external: !!externalGenderFilter
    });
    
    if (onGenderFilterChange) {
      onGenderFilterChange(gender);
    } else {
      setGenderFilter(gender);
    }
  };

  const [refereeFilter, setRefereeFilter] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        return localStorage.getItem('matchlist-refereeFilter') || 'All';
      }
    } catch (error) {
      // localStorage not available, use defaults
    }
    return 'All';
  });

  // Use external referee filter if provided, otherwise internal state
  const effectiveRefereeFilter = externalRefereeFilter ?? refereeFilter;
  const setEffectiveRefereeFilter = (referee: string) => {
    // Track filter analytics
    trackRefereeInteraction('filter', 'referee_filter_change', {
      previous_filter: effectiveRefereeFilter,
      new_filter: referee,
      is_external: !!externalRefereeFilter
    });
    
    if (onRefereeFilterChange) {
      onRefereeFilterChange(referee);
    } else {
      setRefereeFilter(referee);
    }
  };

  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'InProgress' | 'Scheduled'>(() => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        return (localStorage.getItem('matchlist-statusFilter') as 'All' | 'Completed' | 'InProgress' | 'Scheduled') || 'All';
      }
    } catch (error) {
      // localStorage not available, use defaults
    }
    return 'All';
  });

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // Default to descending (newest first)

  // Force sort order to descending on component mount (newest dates first)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.removeItem('matchlist-sortOrder');
        localStorage.setItem('matchlist-sortOrder', 'desc');
      }
    } catch (error) {
      // localStorage not available
    }
    setSortOrder('desc');
  }, []); // Run only once on mount

  const [showFilters, setShowFilters] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        // Force reset to closed by default - clear any existing saved state
        localStorage.setItem('matchlist-showFilters', 'false');
        return false;
      }
    } catch (error) {
      // localStorage not available, use defaults
    }
    return false; // Default to closed
  });

  // Persist filters to localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        // Date selector completely removed
        // Only persist internal gender filter, not external one
        if (externalGenderFilter === undefined) {
          localStorage.setItem('matchlist-genderFilter', genderFilter);
        }
        // Only persist internal court filter, not external one
        if (externalCourtFilter === undefined) {
          localStorage.setItem('matchlist-courtFilter', courtFilter);
        }
        // Only persist internal referee filter, not external one
        if (externalRefereeFilter === undefined) {
          localStorage.setItem('matchlist-refereeFilter', refereeFilter);
        }
        localStorage.setItem('matchlist-statusFilter', statusFilter);
        localStorage.setItem('matchlist-sortOrder', sortOrder);
        localStorage.setItem('matchlist-showFilters', showFilters.toString());
      }
    } catch (error) {
      // Failed to save filters to localStorage
    }
  }, [genderFilter, courtFilter, refereeFilter, statusFilter, sortOrder, showFilters, externalCourtFilter, externalGenderFilter, externalRefereeFilter]);

  // Enhanced matches with FULL VIS API data including duration
  useEffect(() => {
    const enhanceMatches = async () => {
      try {
        // TEMPORARILY DISABLE enhanced match data to fix the issue
        if (setScoreService) {
          const enhanced = await setScoreService.enhanceMatchesWithSetScores(activeMatches);
          setEnhancedMatches(enhanced);
        } else {
          setEnhancedMatches(activeMatches);
        }
      } catch (error) {
        console.error('Failed to enhance matches:', error);
        setEnhancedMatches(activeMatches);
      }
    };

    if (activeMatches.length > 0) {
      enhanceMatches();
    } else {
      setEnhancedMatches([]);
    }
  }, [activeMatches, setScoreService]);

  // Reset filters when tournament changes (matches change)
  React.useEffect(() => {
    // Reset only content filters when matches array changes (indicates tournament change)
    // Keep sort order preference
    if (activeMatches.length > 0) {
      setEffectiveCourtFilter('All');
      setEffectiveGenderFilter('All');
      setEffectiveRefereeFilter('All');
      setStatusFilter('All');
      setShowRefereeDropdown(false);
    }
  }, [activeMatches]); // Only depend on matches array reference change

  // uniqueDates calculation REMOVED - DateNavigator disabled

  // Smart date selection DISABLED - using timeline mode, no date filtering needed

  // Extract unique courts
  const uniqueCourts = React.useMemo(() => {
    const courtNumbers = activeMatches
      .map(match => match.court?.courtNumber)
      .filter((courtNumber): courtNumber is string => !!courtNumber)
      .map(courtNumber => String(courtNumber)); // Ensure all are strings
    
    const unique = Array.from(new Set(courtNumbers)).sort();
    
    
    return unique;
  }, [activeMatches]);

  // Extract unique referees
  const uniqueReferees = React.useMemo(() => {
    const refereeNames = new Set<string>();
    activeMatches.forEach(match => {
      match.refereeAssignments?.forEach(referee => {
        if (referee.refereeName) refereeNames.add(referee.refereeName);
      });
    });
    return Array.from(refereeNames).sort();
  }, [activeMatches]);

  // Filter matches based on current filters
  const filteredMatches = React.useMemo(() => {
    // ALWAYS use enhanced matches if available, even if empty
    const matchesToFilter = enhancedMatches.length > 0 ? enhancedMatches : activeMatches;
    const withSetScores = matchesToFilter.filter(m => m.result?.setScores && m.result.setScores.length > 0);
    
    
    // Show date range of input matches
    if (matchesToFilter.length > 0) {
      const dates = matchesToFilter.map(m => m.scheduledDateTime.split('T')[0]).sort();
      const uniqueDates = [...new Set(dates)];
    }
    
    return matchesToFilter.filter(match => {
      // Hide matches without scheduledDateTime (no date and time)
      if (!match.scheduledDateTime || match.scheduledDateTime.trim() === '') {
        return false;
      }

      const matchDate = new Date(match.scheduledDateTime);
      if (isNaN(matchDate.getTime())) {
        return false; // Hide matches with invalid date
      }

      // Gender filter - FIXED: Use actual gender detection logic
      if (effectiveGenderFilter !== 'All') {
        // TODO: Implement proper gender detection based on tournament data or team data
        // For now, disable gender filtering to show all matches
        // if (!match.tournamentGender || match.tournamentGender !== effectiveGenderFilter) {
        //   return false;
        // }
      }

      // Court filter
      if (effectiveCourtFilter !== 'All') {
        const matchCourtNumber = match.court?.courtNumber;
        if (!matchCourtNumber || String(matchCourtNumber) !== String(effectiveCourtFilter)) {
          return false;
        }
      }

      // Referee filter
      if (effectiveRefereeFilter !== 'All') {
        const hasReferee = match.refereeAssignments?.some(ref => ref.refereeName === effectiveRefereeFilter);
        if (!hasReferee) return false;
      }

      // Status filter
      if (statusFilter !== 'All') {
        const statusMapping: Record<string, MatchStatus[]> = {
          'Scheduled': [MatchStatus.SCHEDULED],
          'InProgress': [MatchStatus.IN_PROGRESS, MatchStatus.WARMUP],
          'Completed': [MatchStatus.COMPLETED]
        };
        if (!statusMapping[statusFilter]?.includes(match.status)) {
          return false;
        }
      }

      // Selected referee filter (from props)
      if (selectedReferee) {
        const hasSelectedReferee = match.refereeAssignments?.some(ref => 
          ref.refereeName === selectedReferee.Name
        );
        if (!hasSelectedReferee) return false;
      }

      return true;
    }).sort((a, b) => {
      const dateA = new Date(a.scheduledDateTime);
      const dateB = new Date(b.scheduledDateTime);

      // Priority 1: Currently running matches always first
      const aIsRunning = a.status === MatchStatus.RUNNING;
      const bIsRunning = b.status === MatchStatus.RUNNING;

      if (aIsRunning && !bIsRunning) return -1;
      if (!aIsRunning && bIsRunning) return 1;

      // Priority 2: Always sort dates in descending order (newest first)
      return dateB.getTime() - dateA.getTime();
    });

    // Final result logging will happen in UI render
  }, [activeMatches, enhancedMatches, effectiveGenderFilter, effectiveCourtFilter, effectiveRefereeFilter, statusFilter, selectedReferee, sortOrder, enableTimelineView, showAllDays]);


  // Calculate target match for auto-scroll and notify parent
  useEffect(() => {
    if (filteredMatches.length === 0 || !onMatchesReady) return;

    const now = new Date();
    let targetMatchIndex = -1;
    let nextUpcomingIndex = -1;
    let mostRecentPastIndex = -1;


    // Find the most relevant match to scroll to
    for (let i = 0; i < filteredMatches.length; i++) {
      const match = filteredMatches[i];
      const matchTime = new Date(match.scheduledDateTime);
      const isFuture = matchTime.getTime() >= now.getTime();

      // Simplified logging

      // Priority 1: Currently running match (check both status and time-based logic)
      const isStatusRunning = match.status === MatchStatus.RUNNING;
      const isLikelyLive = matchTime.getTime() <= now.getTime() && 
                          (now.getTime() - matchTime.getTime()) <= 2 * 60 * 60 * 1000; // Within 2 hours of start time
      
      if (isStatusRunning || isLikelyLive) {
        targetMatchIndex = i;
        break;
      }

      // Track next upcoming match (first future match)
      if (isFuture && nextUpcomingIndex === -1) {
        nextUpcomingIndex = i;
        // Found first upcoming match
      }

      // Track most recent past match
      if (!isFuture) {
        mostRecentPastIndex = i;
        // Track most recent past match
      }
    }

    // Priority logic: Running > Next Upcoming > Most Recent Past
    if (targetMatchIndex === -1) {
      if (nextUpcomingIndex !== -1) {
        // Double-check: ensure we have the EARLIEST future match
        let earliestFutureIndex = -1;
        let earliestFutureTime = Infinity;
        
        for (let i = 0; i < filteredMatches.length; i++) {
          const match = filteredMatches[i];
          const matchTime = new Date(match.scheduledDateTime);
          
          if (matchTime.getTime() >= now.getTime()) {
            if (matchTime.getTime() < earliestFutureTime) {
              earliestFutureTime = matchTime.getTime();
              earliestFutureIndex = i;
            }
          }
        }
        
        if (earliestFutureIndex !== -1) {
          targetMatchIndex = earliestFutureIndex;
        } else {
          targetMatchIndex = nextUpcomingIndex;
        }
      } else if (mostRecentPastIndex !== -1) {
        // Fallback to most recent past match only if no future matches
        targetMatchIndex = mostRecentPastIndex;
      }
    }

    if (targetMatchIndex >= 0) {
    }

    // Notify parent component with matches and target index
    onMatchesReady(filteredMatches, targetMatchIndex);
  }, [filteredMatches, onMatchesReady]);


  // Group matches by date
  const groupedMatches = React.useMemo(() => {
    const groups: { [date: string]: typeof filteredMatches } = {};
    
    
    filteredMatches.forEach((match, index) => {
      const date = new Date(match.scheduledDateTime);
      if (isNaN(date.getTime())) {
        return;
      }
      
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(match);
      
      // Debug first few matches
      if (index < 5) {
      }
    });
    
    const allDates = Object.keys(groups).sort();
    
    // Sort dates in descending order (newest first)
    const result = Object.entries(groups).sort((a, b) => {
      const dateA = new Date(a[0]);
      const dateB = new Date(b[0]);

      // Always sort dates in descending order (newest first)
      return dateB.getTime() - dateA.getTime();
    });
    
    return result;
  }, [filteredMatches]);

  // Initialize expanded dates - only most recent date is expanded by default
  useEffect(() => {
    if (groupedMatches.length > 0) {
      const allDates = groupedMatches.map(([date]) => date);
      // With dynamic sorting, today's date (first item) should be expanded
      const mostRecentDate = allDates[0]; // First date is always the most relevant (today or most recent)

      const initialExpanded: {[key: string]: boolean} = {};
      allDates.forEach(date => {
        initialExpanded[date] = date === mostRecentDate; // Only most recent is expanded
      });

      setExpandedDates(initialExpanded);
    }
  }, [groupedMatches]);

  // Auto-scroll to first live match
  const scrollToFirstLiveMatch = useCallback(() => {
    const liveMatches = filteredMatches.filter(match => isMatchLive(match));

    if (liveMatches.length > 0 && scrollViewRef.current) {
      const firstLiveMatchId = liveMatches[0].id;
      const yPosition = matchLayoutsRef.current[firstLiveMatchId];

      if (__DEV__) {
        console.log('[MatchListV2] Autoscroll attempt:', {
          liveMatchesCount: liveMatches.length,
          firstLiveMatchId,
          yPosition,
          allPositions: Object.keys(matchLayoutsRef.current).length,
          totalMatches: filteredMatches.length
        });
      }

      if (yPosition !== undefined) {
        if (__DEV__) {
          console.log('[MatchListV2] Scrolling to position:', yPosition - 100);
        }

        pendingAutoscrollRef.current = false;
        scrollViewRef.current.scrollTo({
          y: Math.max(0, yPosition - 100), // Offset for header
          animated: true
        });
      } else {
        // Position not available yet, mark as pending
        pendingAutoscrollRef.current = true;
        if (__DEV__) {
          console.log('[MatchListV2] Position not available yet, marked as pending');
        }
      }
    }
  }, [filteredMatches]);

  // Trigger pending autoscroll when position becomes available
  const triggerPendingAutoscroll = useCallback(() => {
    if (pendingAutoscrollRef.current) {
      if (__DEV__) {
        console.log('[MatchListV2] Triggering pending autoscroll');
      }
      setTimeout(() => scrollToFirstLiveMatch(), 100);
    }
  }, [scrollToFirstLiveMatch]);

  // Auto-scroll effect - trigger when matches change and live matches exist
  useEffect(() => {
    const hasLiveMatches = filteredMatches.some(match => isMatchLive(match));

    if (__DEV__) {
      console.log('[MatchListV2] Autoscroll effect check:', {
        hasLiveMatches,
        totalMatches: filteredMatches.length,
        liveMatchesCount: filteredMatches.filter(match => isMatchLive(match)).length
      });
    }

    if (hasLiveMatches && filteredMatches.length > 0) {
      if (__DEV__) {
        console.log('[MatchListV2] Live matches detected, triggering autoscroll');
      }
      // Reset pending flag and trigger autoscroll
      pendingAutoscrollRef.current = false;
      // Add delay to allow initial render to complete
      setTimeout(() => scrollToFirstLiveMatch(), 300);
    }

  }, [filteredMatches, scrollToFirstLiveMatch]);

  // Format time from ISO string
  const formatTime = (isoDateTime: string): string => {
    const date = new Date(isoDateTime);
    if (isNaN(date.getTime())) {
      return 'TBD'; // fallback for invalid dates
    }
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Format date for section headers - consistent date format (no "Today"/"Tomorrow" labels)
  const formatDateHeader = (dateString: string): string => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    const today = new Date();
    
    // Always show actual date with weekday, month and day
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  // Reset all filters to default values
  const resetFilters = () => {
    // Track filter reset analytics
    trackRefereeInteraction('filter', 'reset_all_filters', {
      previous_court: effectiveCourtFilter,
      previous_gender: effectiveGenderFilter,
      previous_referee: effectiveRefereeFilter,
      previous_status: statusFilter,
      matches_count_before: filteredMatches.length
    });
    
    setEffectiveCourtFilter('All');
    setEffectiveGenderFilter('All');
    setEffectiveRefereeFilter('All');
    setStatusFilter('All');
    setSortOrder('asc');
    setShowRefereeDropdown(false);
  };

  // Toggle date panel expansion
  const toggleDateExpansion = (date: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  // Check if match is currently live - matches MatchCard red dot logic exactly
  const isMatchLive = (match: BeachMatchCore): boolean => {
    const isLive = match.status === MatchStatus.RUNNING;

    if (__DEV__ && isLive) {
      console.log(`[MatchListV2] Live match found: ${match.id} (status=${match.status})`);
    }

    return isLive;
  };

  // Get status display text and color
  const getStatusDisplay = (status: MatchStatus, matchDateTime?: string): { text: string; color: string } => {
    // Check if match date/time has passed and force "Completed" status
    if (matchDateTime) {
      const matchDate = new Date(matchDateTime);
      const now = new Date();
      
      // If match was scheduled for the past and not explicitly cancelled/postponed, consider it completed
      if (matchDate < now && status === MatchStatus.SCHEDULED) {
        return { text: 'Final', color: '#374151' };
      }
    }

    switch (status) {
      case MatchStatus.SCHEDULED:
        return { text: 'Scheduled', color: '#6B7280' };
      case MatchStatus.RUNNING:
        return { text: 'Live', color: '#10B981' };
      case MatchStatus.FINISHED:
        return { text: 'Final', color: '#374151' };
      case MatchStatus.INTERRUPTED:
        return { text: 'Interrupted', color: '#F59E0B' };
      case MatchStatus.CANCELLED:
        return { text: 'Cancelled', color: '#EF4444' };
      case MatchStatus.POSTPONED:
        return { text: 'Postponed', color: '#F59E0B' };
      case MatchStatus.TBD:
        return { text: 'TBD', color: '#6B7280' };
      default:
        return { text: status, color: '#6B7280' };
    }
  };

  // Render individual match card using unified component
  const renderMatch = (match: BeachMatchCore) => {
    // Merge live scores with match result for live matches
    let matchWithResult = match;
    if (getLiveScore && isMatchLive(match)) {
      // Support VIS match numbers like "M001"/"W012" by stripping non-digits
      // Use consistent field access pattern with updated isMatchLive logic
      const rawCode = match?.visNo || match?.matchCode || '';
      const numericCode = String(rawCode).replace(/\D/g, '');
      const matchNo = parseInt(numericCode || '', 10);
      const liveScore = Number.isFinite(matchNo) ? getLiveScore(matchNo) : null;
      if (liveScore && liveScore.sets && liveScore.sets.length > 0) {
        // Create enhanced result from live score data
        const liveResult = {
          team1Sets: liveScore.sets.filter((set: any) => set.pointsTeamA > set.pointsTeamB).length,
          team2Sets: liveScore.sets.filter((set: any) => set.pointsTeamB > set.pointsTeamA).length,
          winner: undefined, // Live matches don't have a winner yet
          setScores: liveScore.sets.flatMap((set: any) => [set.pointsTeamA, set.pointsTeamB])
        };
        
        matchWithResult = {
          ...match,
          result: liveResult
        };
      }
    }

    return (
      <View 
        key={match.id}
        nativeID={`match-${match.id}`}
        onLayout={(event) => {
          // Track position for auto-scroll functionality
          const yPosition = event.nativeEvent.layout.y;
          matchLayoutsRef.current[match.id] = yPosition;

          if (__DEV__) {
            console.log(`[MatchListV2] Match ${match.id} layout: y=${yPosition}, isLive=${isMatchLive(match)}`);
          }

          // Check if this is a live match and trigger pending autoscroll
          if (isMatchLive(match)) {
            const liveMatches = filteredMatches.filter(m => isMatchLive(m));
            const isFirstLiveMatch = liveMatches.length > 0 && liveMatches[0].id === match.id;

            if (isFirstLiveMatch) {
              if (__DEV__) {
                console.log('[MatchListV2] First live match layout ready, triggering pending autoscroll');
              }
              triggerPendingAutoscroll();
            }
          }

          // Call external onMatchLayout if provided
          if (onMatchLayout) {
            onMatchLayout(match.id, yPosition);
          }
        }}
      >
        <MatchCard
          match={matchWithResult}
          showStatusBadge={true}
          showReferee={true}
          showDuration={true}
          compact={false}
          variant={isMatchLive(match) ? 'live' : 'default'}
        />
      </View>
    );
  };




  // Error state
  // If hook errors, gracefully fall back to propMatches instead of blocking the UI
  // Only show error screen if there are no provided matches to render
  if (error && shouldUseHook && (!propMatches || propMatches.length === 0)) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => forceRefresh()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading matches...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      showsVerticalScrollIndicator={true}
      nestedScrollEnabled={true}
    >

      {/* Only show filter toggle if any filters are enabled */}
      {(showGenderFilter || showCourtFilter || showRefereeFilter || showStatsInFilter) && (
        <View style={styles.filterControlsContainer}>
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
            onPress={resetFilters}
          >
            <Text style={styles.resetFiltersText}>Reset Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {showFilters && (
        <View style={[
          styles.filtersContainer,
          showRefereeDropdown && styles.filtersContainerExpanded
        ]}>
        {/* Referee Filter - positioned FIRST */}
        {showRefereeFilter && uniqueReferees.length > 0 && (
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Referee:</Text>
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={[styles.dropdownButton, showRefereeDropdown && styles.dropdownButtonActive]}
                onPress={() => setShowRefereeDropdown(!showRefereeDropdown)}
              >
                <Text style={[styles.dropdownButtonText, showRefereeDropdown && styles.dropdownButtonTextActive]}>
                  {effectiveRefereeFilter === 'All' ? 'ALL' : effectiveRefereeFilter.split(' ').pop()}
                </Text>
                <Text style={[styles.dropdownArrow, showRefereeDropdown && styles.dropdownArrowActive]}>
                  {showRefereeDropdown ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>
              
              {showRefereeDropdown && (
                <>
                  <Pressable
                    style={styles.dropdownOverlay}
                    onPress={() => setShowRefereeDropdown(false)}
                  />
                  <View style={styles.dropdownList}>
                    <ScrollView style={styles.dropdownScrollView} nestedScrollEnabled={true}>
                      <TouchableOpacity
                        style={[styles.dropdownItem, effectiveRefereeFilter === 'All' && styles.dropdownItemActive]}
                        onPress={() => {
                          setEffectiveRefereeFilter('All');
                          setShowRefereeDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, effectiveRefereeFilter === 'All' && styles.dropdownItemTextActive]}>
                          ALL
                        </Text>
                      </TouchableOpacity>
                      {uniqueReferees.map(referee => (
                        <TouchableOpacity
                          key={referee}
                          style={[styles.dropdownItem, effectiveRefereeFilter === referee && styles.dropdownItemActive]}
                          onPress={() => {
                            setEffectiveRefereeFilter(referee);
                            setShowRefereeDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, effectiveRefereeFilter === referee && styles.dropdownItemTextActive]} numberOfLines={1}>
                            {referee}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {showCourtFilter && uniqueCourts.length > 1 && (
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Court:</Text>
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[styles.filterButton, effectiveCourtFilter === 'All' && styles.filterButtonActive]}
                onPress={() => setEffectiveCourtFilter('All')}
              >
                <Text style={[styles.filterButtonText, effectiveCourtFilter === 'All' && styles.filterButtonTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              {uniqueCourts.map(court => (
                <TouchableOpacity
                  key={court}
                  style={[styles.filterButton, effectiveCourtFilter === court && styles.filterButtonActive]}
                  onPress={() => setEffectiveCourtFilter(court)}
                >
                  <Text style={[styles.filterButtonText, effectiveCourtFilter === court && styles.filterButtonTextActive]}>
                    {court === 'CC' ? 'CC' : `C${court}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {showGenderFilter && (
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Gender:</Text>
            <View style={styles.filterButtons}>
              {(['All', 'M', 'W'] as const).map(gender => (
                <TouchableOpacity
                  key={gender}
                  style={[styles.filterButton, effectiveGenderFilter === gender && styles.filterButtonActive]}
                  onPress={() => setEffectiveGenderFilter(gender)}
                >
                  <Text style={[styles.filterButtonText, effectiveGenderFilter === gender && styles.filterButtonTextActive]}>
                    {gender === 'All' ? 'All' : gender === 'M' ? 'Men' : 'Women'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Sort:</Text>
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[styles.filterButton, sortOrder === 'desc' && styles.filterButtonActive]}
              onPress={() => setSortOrder('desc')}
            >
              <Text style={[styles.filterButtonText, sortOrder === 'desc' && styles.filterButtonTextActive]}>
                Latest First
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, sortOrder === 'asc' && styles.filterButtonActive]}
              onPress={() => setSortOrder('asc')}
            >
              <Text style={[styles.filterButtonText, sortOrder === 'asc' && styles.filterButtonTextActive]}>
                Oldest First
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Status:</Text>
          <View style={styles.filterButtons}>
            {(['All', 'Scheduled', 'InProgress', 'Completed'] as const).map(status => (
              <TouchableOpacity
                key={status}
                style={[styles.filterButton, statusFilter === status && styles.filterButtonActive]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[styles.filterButtonText, statusFilter === status && styles.filterButtonTextActive]}>
                  {status === 'InProgress' ? 'Live' : status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {customFilters}
        </View>
      )}

      {/* Sticky results header */}
      {filteredMatches.length > 0 && (
        <View style={styles.stickyHeader}>
          <Text style={styles.matchCount}>
            {filteredMatches.length} {filteredMatches.length === 1 ? 'match' : 'matches'}
          </Text>
        </View>
      )}

      <View style={styles.matchesList}>
        {filteredMatches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        ) : (
          <>
            {groupedMatches.map(([date, matches], groupIndex) => {
              const isExpanded = expandedDates[date] || false;
              
              return (
                <View key={`${date}-${groupIndex}`}>
                  {/* Clickable Date Header Tab */}
                  <TouchableOpacity 
                    style={[
                      styles.dateHeader, 
                      (enableTimelineView || showAllDays) && styles.timelineDateHeader,
                      isExpanded && styles.expandedDateHeader
                    ]}
                    nativeID={`date-header-${date}`}
                    onPress={() => toggleDateExpansion(date)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dateHeaderContent}>
                      <Text style={[
                        styles.dateHeaderText,
                        (enableTimelineView || showAllDays) && styles.timelineDateHeaderText
                      ]}>
                        {formatDateHeader(date)}
                      </Text>
                      {(enableTimelineView || showAllDays) && (
                        <Text style={styles.matchCountText}>
                          {matches.length} {matches.length === 1 ? 'match' : 'matches'}
                        </Text>
                      )}
                    </View>
                    
                    {/* Collapse/Expand Indicator */}
                    <Text style={[
                      styles.expandIndicator,
                      (enableTimelineView || showAllDays) && styles.timelineExpandIndicator
                    ]}>
                      {isExpanded ? '▼' : '▶'}
                    </Text>
                  </TouchableOpacity>
                  
                  {/* Collapsible Matches Container */}
                  {isExpanded && (
                    <View style={styles.matchesContainer}>
                      {matches.map((match, index) => (
                        <React.Fragment key={`${match.id}-${index}`}>
                          {renderMatch(match)}
                        </React.Fragment>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'visible',
  },
  filterControlsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 8,
  },
  filterToggleButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flex: 1,
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  resetFiltersButton: {
    backgroundColor: '#FEF2F2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  resetFiltersText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  refereeToggleButton: {
    backgroundColor: '#1E40AF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1E40AF',
  },
  refereeToggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  filtersContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    overflow: 'visible',
  },
  filtersContainerExpanded: {
    paddingBottom: 220, // Extra space for dropdown when open
    zIndex: 99999,
  },
  filterGroup: {
    marginBottom: 12,
    position: 'relative',
    zIndex: 50000,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    minWidth: 60,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  matchesList: {
    flex: 1,
  },
  stickyHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  matchCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leftBadgeContainer: {
    width: 100,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  timeCourtContainer: {
    alignItems: 'center',
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF0000',
  },
  rightBadgeContainer: {
    width: 100,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  matchTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  courtText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  topScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  topScore: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  scoreSeparator: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginHorizontal: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  teamsContainer: {
    marginBottom: 8,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamSection: {
    flex: 1,
  },
  flagsAndResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  centerResultContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  leftFlag: {
    marginRight: 12,
  },
  rightFlag: {
    marginLeft: 12,
  },
  resultContainerWithSets: {
    alignItems: 'center',
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  setScoresContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  individualSet: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  setScore: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  setScoreSeparator: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9CA3AF',
    marginHorizontal: 3,
  },
  winningSetScore: {
    color: '#059669',
    fontWeight: '700',
  },
  resultScore: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  teamName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    lineHeight: 18,
  },
  leftTeamName: {
    textAlign: 'left',
  },
  rightTeamName: {
    textAlign: 'right',
  },
  rankingText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
  },
  durationText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
    marginLeft: 12,
  },
  countryCode: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  leftCountryCode: {
    textAlign: 'left',
  },
  rightCountryCode: {
    textAlign: 'right',
  },
  playersContainer: {
    flexDirection: 'column',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    lineHeight: 16,
    marginBottom: 2,
  },
  scoreContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: 'center',
  },
  teamScore: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  winnerScore: {
    color: '#059669',
    fontWeight: '800',
  },
  winnerTeam: {
    fontWeight: '600',
    color: '#059669',
  },
  vsText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontWeight: '500',
  },
  refereesContainer: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  refereeRow: {
    marginBottom: 4,
    justifyContent: 'center',
  },
  refereeContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refereePosition: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#374151',
    marginRight: 8,
  },
  refereeFlag: {
    marginLeft: 8,
  },
  refereeName: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
    marginHorizontal: 8,
  },
  refereesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  refereeText: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 8,
  },
  roundContainer: {
    marginTop: 8,
  },
  roundText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  genderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#374151',
  },
  menBadge: {
    // Same styling as base genderBadge
  },
  womenBadge: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  genderBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },
  menBadgeText: {
    // Same as base genderBadgeText
  },
  womenBadgeText: {
    color: '#FFFFFF',
  },
  dateHeader: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
    marginBottom: 0, // Remove margin since matches container will handle spacing
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dateHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  dateHeaderCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  // Enhanced timeline date header styles
  timelineDateHeader: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    marginTop: 24,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timelineDateHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E40AF',
  },
  matchCountText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  
  // New collapsible panel styles
  dateHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandIndicator: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  timelineExpandIndicator: {
    color: '#3B82F6',
    fontSize: 16,
  },
  expandedDateHeader: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    shadowOpacity: 0.1,
  },
  matchesContainer: {
    marginBottom: 8,
  },
  
  // Dropdown styles
  dropdownContainer: {
    position: 'relative',
    zIndex: 99999,
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
    minWidth: 120,
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
  dropdownOverlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 99998,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 100,
    zIndex: 100000,
    minWidth: 150, // Ensure minimum width
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
});
