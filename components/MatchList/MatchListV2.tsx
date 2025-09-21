import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, Pressable, ScrollView, Platform } from 'react-native';
import { BeachMatchCore, MatchStatus, MatchResult, MatchTeam, CourtInfo, canReadyToStartMatchGoLive, getEnhancedMatchStatus } from '../../types/match-v2';
import { MatchList, MatchCard } from '../entities/Match';
import { useMatches, MatchesFilters } from '../../hooks/useMatches';
import { MatchDTO } from '../../services/DualReadService';
import { featureFlags } from '../../hooks/compatibility/FeatureFlags';
import { calculateTotalDuration } from '../../utils/MatchDurationFormatter';
import { useRefereeScreenAnalytics } from '../../hooks/useAnalyticsCollection';
import { TimezoneService, VISTimezoneFields } from '../../services/TimezoneService';
import { formatTimeWithTimezoneSync } from '../../utils/dateFormatters';
import { DateTime } from 'luxon';

// Extended match type to include tournament-specific fields
type ExtendedBeachMatch = BeachMatchCore & {
  tournamentGender?: 'M' | 'W';
  tournamentNo?: string;
};

// Tournament context interface for timezone-aware transformations
interface TournamentContext {
  timezone?: string;
  tournamentId?: string;
  location?: string;
  gender?: 'M' | 'W' | 'MIXED';
}

/**
 * Transforms MatchDTO from hook to BeachMatchCore for component compatibility
 * Maintains backward compatibility with existing component interfaces
 * @param dto MatchDTO from useMatches hook
 * @param tournamentContext Optional tournament context for timezone conversion
 * @returns BeachMatchCore expected by components
 */
const transformMatchDTO = (dto: MatchDTO, tournamentContext?: TournamentContext): BeachMatchCore => {
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

  // Enhanced timezone conversion using complete VIS API data (Phase 2)
  let timezoneConversionAccuracy: 'high' | 'medium' | 'low' = 'low';
  let utcScheduledDateTime: string | undefined;

  // DEBUG: Timezone conversion for match 1 (silent)
  if (dto.matchCode === '1') {
    // Debug timezone conversion for match 1 - logs removed
  }

  // Prepare VIS timezone fields for comprehensive TimezoneService conversion
  const visFields: VISTimezoneFields = {
    BeginDateTimeUtc: dto.beginDateTimeUtc,
    EndDateTimeUtc: dto.endDateTimeUtc,
    UtcDate: dto.utcDate,
    UtcTime: dto.utcTime,
    LocalDate: dto.localDate,
    LocalTime: dto.localTime,
    LocalTimeOffset: dto.localTimeOffset,
    TimeZone: dto.timezone || tournamentContext?.timezone,
  };


  // Use TimezoneService for accurate timezone conversion
  if (visFields.LocalDate && visFields.LocalTime) {
    try {
      // FIXED: Use scheduledDateTime as-is when it contains correct local time
      // The issue was that timezone conversion was treating local time as UTC

      if (visFields.BeginDateTimeUtc) {
        // Priority 1: Direct UTC timestamp (highest accuracy)
        utcScheduledDateTime = visFields.BeginDateTimeUtc;
        timezoneConversionAccuracy = 'high';
      } else if (visFields.UtcDate && visFields.UtcTime) {
        // Priority 2: UTC components (high accuracy)
        utcScheduledDateTime = `${visFields.UtcDate}T${visFields.UtcTime}`;
        timezoneConversionAccuracy = 'high';
      } else if (tournamentContext?.timezone && visFields.LocalDate && visFields.LocalTime) {
        // Priority 3: Use tournament timezone to properly convert local time
        // This fixes the issue where localTimeOffset is incorrect from VIS API
        const localDateTime = `${visFields.LocalDate}T${visFields.LocalTime}`;
        // Keep scheduledDateTime as-is since it already contains correct local time
        // The display logic should use scheduledDateTime directly for local time display
        utcScheduledDateTime = dto.scheduledDateTime; // Use original scheduledDateTime
        timezoneConversionAccuracy = 'medium';
      } else if (visFields.LocalTimeOffset) {
        // Priority 3: Local time with offset (medium accuracy)
        const localDateTime = `${visFields.LocalDate}T${visFields.LocalTime}`;
        const offsetMinutes = parseTimezoneOffset(visFields.LocalTimeOffset);
        const localDate = new Date(localDateTime);
        if (!isNaN(localDate.getTime())) {
          const utcDate = new Date(localDate.getTime() - (offsetMinutes * 60 * 1000));
          utcScheduledDateTime = utcDate.toISOString();
          timezoneConversionAccuracy = 'medium';
        }
      } else {
        // Fallback: Use original scheduledDateTime
        const date = new Date(dto.scheduledDateTime);
        if (!isNaN(date.getTime())) {
          utcScheduledDateTime = date.toISOString();
          timezoneConversionAccuracy = 'low';
        }
      }
    } catch (error) {
      // Enhanced timezone conversion failed, using fallback
      // Final fallback: Use original scheduledDateTime
      try {
        const date = new Date(dto.scheduledDateTime);
        if (!isNaN(date.getTime())) {
          utcScheduledDateTime = date.toISOString();
          timezoneConversionAccuracy = 'low';
        }
      } catch (fallbackError) {
        console.error('All timezone conversion methods failed:', fallbackError);
      }
    }
  }


  // Helper function to parse timezone offset
  function parseTimezoneOffset(offset: string): number {
    const cleaned = offset.replace(/[^\+\-\d:]/g, '');
    const match = cleaned.match(/^([+\-])(\d{1,2}):?(\d{2})?$/);
    if (!match) return 0;

    const [, sign, hours, minutes = '00'] = match;
    const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);
    return sign === '+' ? totalMinutes : -totalMinutes;
  }

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
    rawStatus: (dto as any).rawStatus ?? (dto as any).visStatus,
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
    // New timezone fields
    tournamentTimezone: tournamentContext?.timezone,
    utcScheduledDateTime,
    timezoneConversionAccuracy,
  };

  // Preserve ALL original DTO fields for legacy compatibility
  // This allows MatchCard to access legacy fields like PointsTeamASet1, Referee1Name, etc.
  const preservedMatch = {
    ...beachMatchCore,
    ...(dto as any), // Spread all original DTO fields to preserve legacy data

    // Inject tournament context data for filtering
    tournamentGender: tournamentContext?.gender || (dto as any).tournamentGender,
    
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
  tournamentTimezone?: string; // Phase 3: Tournament timezone for timezone-aware formatting
  tournamentGender?: 'M' | 'W' | 'MIXED'; // Tournament gender for match context injection
  externalScrollRef?: React.RefObject<ScrollView>; // External ScrollView ref for autoscroll (from parent container)
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
  tournamentTimezone,
  tournamentGender,
}) => {
  // Analytics tracking for match list interactions
  const { trackRefereeInteraction } = useRefereeScreenAnalytics();

  // ScrollView ref for auto-scroll functionality (DISABLED - handled by external container)
  const scrollViewRef = useRef<ScrollView>(null);
  const matchLayoutsRef = useRef<Record<string, number>>({});
  const pendingAutoscrollRef = useRef<boolean>(false);

  // AUTOSCROLL DISABLED: Let external container handle autoscroll
  const AUTOSCROLL_ENABLED = false;

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
    return shouldUseHook ? rawMatches.map(dto => transformMatchDTO(dto, { timezone: tournamentTimezone, gender: tournamentGender })) : [];
  }, [rawMatches, shouldUseHook, tournamentTimezone, tournamentGender]);

  // Use either prop matches or hook matches
  const activeMatches = propMatches || hookMatches;
  const loading = propLoading || (shouldUseHook ? hookLoading : false);
  const error = hookError?.message || null;
  // State for collapsible referees and dropdown
  const [expandedReferees, setExpandedReferees] = useState<{[key: string]: boolean}>({});
  const [showRefereeDropdown, setShowRefereeDropdown] = useState<boolean>(false);
  
  // State for collapsible date panels
  const [expandedDates, setExpandedDates] = useState<{[key: string]: boolean}>({});

  // State for TBD matches panel
  const [tbdPanelExpanded, setTbdPanelExpanded] = useState<boolean>(false);

  // State for set scores enhancement
  const [enhancedMatches, setEnhancedMatches] = useState<ExtendedBeachMatch[]>([]);
  const [setScoreService] = useState(() => (window as any).SetScoreService ? new (window as any).SetScoreService() : null);

  // State for live score refresh
  const [liveScoreRefresh, setLiveScoreRefresh] = useState<number>(0);
  
  

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
        localStorage.setItem('matchlist-showFilters', showFilters.toString());
      }
    } catch (error) {
      // Failed to save filters to localStorage
    }
  }, [genderFilter, courtFilter, refereeFilter, statusFilter, showFilters, externalCourtFilter, externalGenderFilter, externalRefereeFilter]);

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

  // Timer to refresh live scores every 5 seconds for LIVE matches
  useEffect(() => {
    const hasLiveMatches = activeMatches.some(match => isMatchLive(match));
    if (!hasLiveMatches || !getLiveScore) return;

    const interval = setInterval(() => {
      // Force re-render to pick up fresh live score data
      // Refreshing live scores for LIVE matches
      setLiveScoreRefresh(prev => prev + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeMatches, getLiveScore]);

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
      // Extract from structured referee assignments (existing logic)
      match.refereeAssignments?.forEach(referee => {
        if (referee.refereeName) refereeNames.add(referee.refereeName);
      });

      // Extract from VIS API referee names (enhanced functionality)
      const matchAny = match as any;
      if (matchAny.Referee1Name) refereeNames.add(matchAny.Referee1Name);
      if (matchAny.Referee2Name) refereeNames.add(matchAny.Referee2Name);
    });
    return Array.from(refereeNames).sort();
  }, [activeMatches]);

  // Filter matches based on current filters
  const { filteredMatches, tbdMatches } = React.useMemo(() => {
    // ALWAYS use enhanced matches if available, even if empty
    const matchesToFilter = enhancedMatches.length > 0 ? enhancedMatches : activeMatches;
    const withSetScores = matchesToFilter.filter(m => m.result?.setScores && m.result.setScores.length > 0);

    const validMatches: typeof matchesToFilter = [];
    const tbdMatches: typeof matchesToFilter = [];

    // Show date range of input matches
    if (matchesToFilter.length > 0) {
      const dates = matchesToFilter.map(m => {
        // Use timezone-safe date from scheduled structure if available
        const scheduled = (m as any).scheduled;
        if (scheduled?.dateTournament) {
          return scheduled.dateTournament;
        }
        // Fallback to legacy method (but this is the buggy path)
        return m.scheduledDateTime.split('T')[0];
      }).sort();
      const uniqueDates = [...new Set(dates)];
    }

    matchesToFilter.forEach(match => {
      // Check if this is a TBD match (missing data)
      const hasNoScheduledTime = !match.scheduledDateTime || match.scheduledDateTime.trim() === '';
      const hasInvalidDate = match.scheduledDateTime && isNaN(new Date(match.scheduledDateTime).getTime());
      const hasNoTeams = match.team1.teamName === 'TBD' || match.team2.teamName === 'TBD';

      const isTBDMatch = hasNoScheduledTime || hasInvalidDate || hasNoTeams;

      if (isTBDMatch) {
        tbdMatches.push(match);
        return; // Don't process further filters for TBD matches
      }

      // For valid matches, apply normal filtering
      const matchDate = new Date(match.scheduledDateTime);

      // Gender filter - IMPLEMENTED: Use tournament gender from tournament context
      if (effectiveGenderFilter !== 'All') {
        const matchGender = (match as any).tournamentGender;
        if (!matchGender || matchGender !== effectiveGenderFilter) {
          return; // Skip this match
        }
      }

      // Court filter
      if (effectiveCourtFilter !== 'All') {
        const matchCourtNumber = match.court?.courtNumber;
        if (!matchCourtNumber || String(matchCourtNumber) !== String(effectiveCourtFilter)) {
          return; // Skip this match
        }
      }

      // Referee filter - Enhanced to check both structured assignments and VIS API names
      if (effectiveRefereeFilter !== 'All') {
        const hasStructuredReferee = match.refereeAssignments?.some(ref => ref.refereeName === effectiveRefereeFilter);
        const matchAny = match as any;
        const hasVISReferee = matchAny.Referee1Name === effectiveRefereeFilter || matchAny.Referee2Name === effectiveRefereeFilter;

        if (!hasStructuredReferee && !hasVISReferee) return; // Skip this match
      }

      // Status filter
      if (statusFilter !== 'All') {
        const statusMapping: Record<string, MatchStatus[]> = {
          'Scheduled': [MatchStatus.SCHEDULED],
          'InProgress': [MatchStatus.IN_PROGRESS, MatchStatus.WARMUP],
          'Completed': [MatchStatus.COMPLETED]
        };
        if (!statusMapping[statusFilter]?.includes(match.status)) {
          return; // Skip this match
        }
      }

      // Selected referee filter (from props)
      if (selectedReferee) {
        const hasSelectedReferee = match.refereeAssignments?.some(ref =>
          ref.refereeName === selectedReferee.Name
        );
        if (!hasSelectedReferee) return; // Skip this match
      }

      // If we reach here, this is a valid match
      validMatches.push(match);
    });

    // Return valid matches without sorting - sorting will be done in grouping phase
    return { filteredMatches: validMatches, tbdMatches };

    // Final result logging will happen in UI render
  }, [activeMatches, enhancedMatches, effectiveGenderFilter, effectiveCourtFilter, effectiveRefereeFilter, statusFilter, selectedReferee, enableTimelineView, showAllDays]);


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
                          (now.getTime() - matchTime.getTime()) <= 75 * 60 * 1000; // Within 75 minutes of start time
      
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


  // Group filtered matches by date only (both genders together, excludes TBD matches which are handled separately)
  const groupedMatches = React.useMemo(() => {
    const groups: { [date: string]: typeof filteredMatches } = {};

    filteredMatches.forEach((match, index) => {
      // Use timezone-safe date from scheduled structure if available
      const scheduled = (match as any).scheduled;
      let dateKey: string;

      if (scheduled?.dateTournament) {
        // Use pre-calculated tournament date (immune to browser timezone)
        dateKey = scheduled.dateTournament; // Already in YYYY-MM-DD format
      } else {
        // Fallback to legacy method (but this is the buggy path)
        const date = new Date(match.scheduledDateTime);
        if (isNaN(date.getTime())) {
          return;
        }
        dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(match);

      // Debug first few matches
      if (index < 5) {
      }
    });

    // Return date groups in DESCENDING order (latest/newest dates first)
    const dayGroups = Object.entries(groups)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA)) // DESCENDING date order (latest first)
      .map(([dateKey, matches]) => [dateKey, matches] as const); // No match sorting within groups

    return dayGroups;
  }, [filteredMatches, tournamentTimezone]);

  // Initialize expanded dates - expand today's panel if it exists
  useEffect(() => {
    if (groupedMatches.length > 0) {
      const allDates = groupedMatches.map(([date]) => date);
      const today = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format

      const initialExpanded: {[key: string]: boolean} = {};

      // Check if today exists in the panels
      const todayExists = allDates.includes(today);

      allDates.forEach(date => {
        // If today exists, expand today's panel. Otherwise, expand the first panel
        initialExpanded[date] = todayExists ? (date === today) : (date === allDates[0]);
      });

      setExpandedDates(initialExpanded);
    }
  }, [groupedMatches]);

  // Auto-scroll with priority: 1) LIVE matches, 2) Today's first match (last in Today panel)
  const scrollToFirstLiveMatch = useCallback(() => {
    if (!AUTOSCROLL_ENABLED) {
      // AUTOSCROLL: Disabled in MatchListV2 - handled by external container
      return;
    }
    // AUTOSCROLL: Starting autoscroll function
    // AUTOSCROLL: ScrollView ref exists
    // AUTOSCROLL: Filtered matches count
    // AUTOSCROLL: Match layouts available

    let targetMatchId: string | null = null;
    let scrollReason = '';

    // Priority 1: First LIVE match
    const liveMatches = filteredMatches.filter(match => isMatchLive(match));
    // AUTOSCROLL: Live matches found

    if (liveMatches.length > 0) {
      targetMatchId = liveMatches[0].id;
      scrollReason = 'LIVE match';
      // AUTOSCROLL: Target = LIVE match
    } else {
      // Priority 2: First match of today (chronologically first, appears last in "Today" panel)
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      // AUTOSCROLL: Looking for today matches

      const todayMatches = filteredMatches.filter(match => {
        // Use timezone-safe date from scheduled structure if available
        const scheduled = (match as any).scheduled;
        if (scheduled?.dateTournament) {
          return scheduled.dateTournament === todayStr;
        }
        // Fallback to legacy method (but this is the buggy path)
        const matchDate = new Date(match.scheduledDateTime).toISOString().split('T')[0];
        return matchDate === todayStr;
      });

      // AUTOSCROLL: Today matches found
      // Log today matches (removed)

      // Sort today's matches chronologically and get the first one
      if (todayMatches.length > 0) {
        const sortedTodayMatches = todayMatches.sort((a, b) => {
          // Use timezone-safe epoch for sorting when available
          const scheduledA = (a as any).scheduled;
          const scheduledB = (b as any).scheduled;

          if (scheduledA?.epochMs && scheduledB?.epochMs) {
            return scheduledA.epochMs - scheduledB.epochMs;
          }
          // Use string comparison for legacy data (works with ISO format)
          const timeStrA = scheduledA?.dateTimeTournament || a.scheduledDateTime;
          const timeStrB = scheduledB?.dateTimeTournament || b.scheduledDateTime;
          return timeStrA.localeCompare(timeStrB); // Ascending order for autoscroll
        });
        targetMatchId = sortedTodayMatches[0].id;
        scrollReason = 'Today first match';
        // AUTOSCROLL: Target = Today first match
      }
    }

    // Scroll to target match if found
    if (targetMatchId && scrollViewRef.current) {
      const yPosition = matchLayoutsRef.current[targetMatchId];
      // AUTOSCROLL: Target Y position

      if (yPosition !== undefined) {
        // AUTOSCROLL: Scrolling to target position
        pendingAutoscrollRef.current = false;
        scrollViewRef.current.scrollTo({
          y: Math.max(0, yPosition - 100), // Offset for header
          animated: true
        });
      } else {
        // AUTOSCROLL: Position not available yet, marking as pending
        // Position not available yet, mark as pending
        pendingAutoscrollRef.current = true;
      }
    } else {
      if (!targetMatchId) {
        // AUTOSCROLL: No target match found
      }
      if (!scrollViewRef.current) {
        // AUTOSCROLL: ScrollView ref not available
      }
    }
  }, [filteredMatches]);

  // Trigger pending autoscroll when position becomes available
  const triggerPendingAutoscroll = useCallback(() => {
    if (pendingAutoscrollRef.current) {
      // AUTOSCROLL: Triggering pending autoscroll
      setTimeout(() => scrollToFirstLiveMatch(), 100);
    }
  }, [scrollToFirstLiveMatch]);

  // Auto-scroll effect - trigger when matches change and live matches OR today's matches exist
  useEffect(() => {
    if (!AUTOSCROLL_ENABLED) {
      // AUTOSCROLL EFFECT: Disabled in MatchListV2
      return;
    }
    // AUTOSCROLL EFFECT: Matches changed, checking conditions
    const hasLiveMatches = filteredMatches.some(match => isMatchLive(match));

    // Check if there are matches for today
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const hasTodayMatches = filteredMatches.some(match => {
      // Use timezone-safe date from scheduled structure if available
      const scheduled = (match as any).scheduled;
      if (scheduled?.dateTournament) {
        return scheduled.dateTournament === todayStr;
      }
      // Fallback to legacy method (but this is the buggy path)
      const matchDate = new Date(match.scheduledDateTime).toISOString().split('T')[0];
      return matchDate === todayStr;
    });

    // AUTOSCROLL EFFECT: Has LIVE matches
    // AUTOSCROLL EFFECT: Has today matches
    // AUTOSCROLL EFFECT: Total filtered matches

    // Trigger autoscroll if we have LIVE matches OR today's matches
    if ((hasLiveMatches || hasTodayMatches) && filteredMatches.length > 0) {
      // AUTOSCROLL EFFECT: Conditions met, triggering autoscroll
      // Reset pending flag and trigger autoscroll
      pendingAutoscrollRef.current = false;
      // Add delay to allow initial render to complete
      setTimeout(() => scrollToFirstLiveMatch(), 300);
    } else {
      // AUTOSCROLL EFFECT: Conditions not met, no autoscroll
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
    setShowRefereeDropdown(false);
  };

  // Toggle date panel expansion (accordion - close others)
  const toggleDateExpansion = (date: string) => {
    setExpandedDates(prev => {
      const isCurrentlyExpanded = prev[date];
      if (isCurrentlyExpanded) {
        // If closing current date, just close it
        return {
          ...prev,
          [date]: false
        };
      } else {
        // If opening, close all others and open this one
        const newState: {[key: string]: boolean} = {};
        Object.keys(prev).forEach(key => {
          newState[key] = false;
        });
        newState[date] = true;
        return newState;
      }
    });
  };

  // Check if match is currently live - using enhanced status with court sequencing logic
  const isMatchLive = (match: BeachMatchCore): boolean => {
    // Don't consider matches with placeholder teams as live
    if (match.team1.teamName === 'TBD' || match.team2.teamName === 'TBD') {
      return false;
    }

    // Use enhanced status that considers court sequencing
    const enhancedStatus = getEnhancedMatchStatus(match, activeMatches);

    // Check enhanced status first
    if (enhancedStatus === MatchStatus.RUNNING) {
      return true;
    }

    // VIS API uses numeric status codes:
    // 1=Scheduled, 2=ReadyToStart, 3-11=InSet1-InSet5 (LIVE), 12+=Finished/Official
    const status = match.status;

    // Check for string status first (mapped values)
    if (typeof status === 'string') {
      return status === MatchStatus.RUNNING;
    }

    // Check for numeric VIS status codes (3-8 = LIVE matches per user requirement)
    if (typeof status === 'number') {
      // Include status 2 if it can transition to live based on court sequence
      if (status === 2 && canReadyToStartMatchGoLive(match, activeMatches)) {
        return true;
      }
      return status >= 3 && status <= 8;
    }

    // Fallback: check raw VIS status field if available from match data
    const rawStatus = (match as any)?.rawStatus || (match as any)?.visStatus;
    if (typeof rawStatus === 'number') {
      // Include status 2 if it can transition to live based on court sequence
      if (rawStatus === 2 && canReadyToStartMatchGoLive(match, activeMatches)) {
        return true;
      }
      return rawStatus >= 3 && rawStatus <= 8;
    }

    return false;
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
  const renderMatch = useCallback((match: BeachMatchCore) => {
    // Merge live scores with match result for live matches
    // This function re-executes when liveScoreRefresh changes, forcing fresh getLiveScore() calls
    if (isMatchLive(match)) {
      // Re-rendering LIVE match (refresh cycle)
    }
    let matchWithResult = match;
    if (getLiveScore && isMatchLive(match)) {
      // Support VIS match numbers like "M001"/"W012" by stripping non-digits
      // Use consistent field access pattern with updated isMatchLive logic
      const rawCode = match?.visNo || match?.matchCode || '';
      const numericCode = String(rawCode).replace(/\D/g, '');
      const matchNo = parseInt(numericCode || '', 10);
      const liveScore = Number.isFinite(matchNo) ? getLiveScore(matchNo) : null;
      // Live score data retrieved
      if (liveScore && liveScore.sets && liveScore.sets.length > 0) {
        // Live score sets detail
        // Create enhanced result from live score data
        const liveResult = {
          team1Sets: liveScore.sets.filter((set: any) => set.pointsTeamA > set.pointsTeamB).length,
          team2Sets: liveScore.sets.filter((set: any) => set.pointsTeamB > set.pointsTeamA).length,
          winner: undefined, // Live matches don't have a winner yet
          setScores: liveScore.sets.flatMap((set: any) => [set.pointsTeamA, set.pointsTeamB])
        };
        // Live result calculated
        
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

          const isLive = isMatchLive(match);

          // Use tournament timezone for consistent date/time display across all users
          const matchTime = formatTimeWithTimezoneSync(match.scheduledDateTime, {
            tournamentTimezone: tournamentTimezone || 'UTC',
            cachedPreference: 'local',
            showTimezoneIndicator: false,
          });

          // Check if match is today using tournament timezone (prevents Brazil/Italy date drift)
          const tournamentDate = DateTime.fromISO(match.scheduledDateTime)
            .setZone(tournamentTimezone || 'UTC')
            .toFormat('yyyy-MM-dd');
          const todayInTournament = DateTime.now()
            .setZone(tournamentTimezone || 'UTC')
            .toFormat('yyyy-MM-dd');
          const isToday = tournamentDate === todayInTournament;

          // Match layout rendered

          // AUTOSCROLL DISABLED: Let external container handle autoscroll
          if (!AUTOSCROLL_ENABLED) {
            // LAYOUT AUTOSCROLL: Disabled in MatchListV2
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
          tournamentTimezone={tournamentTimezone}
          liveScoreRefresh={liveScoreRefresh}
        />
      </View>
    );
  }, [getLiveScore, liveScoreRefresh, onMatchLayout, tournamentTimezone]);




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

            {/* TBD Matches Panel - Shows matches with missing data */}
            {tbdMatches.length > 0 && (
              <View key="tbd-matches-panel">
                {/* TBD Panel Header */}
                <TouchableOpacity
                  style={[
                    styles.tbdHeader,
                    tbdPanelExpanded && styles.tbdHeaderExpanded
                  ]}
                  onPress={() => setTbdPanelExpanded(!tbdPanelExpanded)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dateHeaderContent}>
                    <Text style={styles.tbdHeaderText}>
                      Matches TBD
                    </Text>
                    <Text style={styles.matchCountText}>
                      {tbdMatches.length} {tbdMatches.length === 1 ? 'match' : 'matches'}
                    </Text>
                  </View>

                  {/* Collapse/Expand Indicator */}
                  <Text style={styles.tbdExpandIndicator}>
                    {tbdPanelExpanded ? '▼' : '▶'}
                  </Text>
                </TouchableOpacity>

                {/* Collapsible TBD Matches Container */}
                {tbdPanelExpanded && (
                  <View style={styles.matchesContainer}>
                    {tbdMatches.map((match, index) => (
                      <React.Fragment key={`tbd-${match.id}-${index}`}>
                        {renderMatch(match)}
                      </React.Fragment>
                    ))}
                  </View>
                )}
              </View>
            )}
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
  // New styles for date-gender separation
  dateGenderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  womenHeader: {
    backgroundColor: '#FEF7FF', // Light purple background for women
    borderLeftColor: '#A855F7', // Purple left border for women
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

  // TBD Panel Styles
  tbdHeader: {
    backgroundColor: '#FEF3C7', // Light amber background
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 24, // Extra spacing from regular date panels
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B', // Amber border
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B', // Amber left accent
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tbdHeaderExpanded: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    shadowOpacity: 0.15,
  },
  tbdHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E', // Dark amber text
    letterSpacing: 0.5,
  },
  tbdExpandIndicator: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B', // Amber color
    marginLeft: 8,
    minWidth: 20,
    textAlign: 'center',
  },
});

