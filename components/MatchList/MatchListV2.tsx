import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { VisCompliantMatch } from '../../types/match-vis-compliant';
import { BeachMatchCore, MatchStatus } from '../../types/match-v2';

/**
 * MIGRATION NOTE: This component now accepts both VIS-compliant and legacy match data.
 * The MatchInterfaceAdapter automatically transforms VIS data to component-compatible format.
 * This allows gradual migration while maintaining identical visual behavior.
 */
import { FlagImage } from '../FlagImage';
import { RoundPhaseDisplay } from '../Typography/RoundPhaseDisplay';
import { MatchDataTransformer } from '../../services/MatchDataTransformer';
import { SetScoreService } from '../../services/SetScoreService';
import { VisApiClient } from '../../services/api/VisApiClient';
import { calculateTotalDuration } from '../../utils/MatchDurationFormatter';
import { adaptMatchesForComponent } from '../../utils/MatchInterfaceAdapter';
import { useMemo } from 'react';

// Extended match type using VIS-compliant interface
type ExtendedVisMatch = VisCompliantMatch & {
  tournamentGender?: 'M' | 'W';
  // Legacy compatibility properties computed from VIS data
  id: string;
  matchNumber: string;
  scheduledDateTime: string;
  court?: {
    courtNumber?: string;
  };
  team1?: {
    teamName?: string;
    player1Name?: string;
    player2Name?: string;
    countryCode?: string;
    ranking?: number;
  };
  team2?: {
    teamName?: string;
    player1Name?: string;
    player2Name?: string;
    countryCode?: string;
    ranking?: number;
  };
  status: MatchStatus;
  refereeAssignments?: {
    refereeName: string;
    federationCode?: string;
  }[];
  result?: {
    team1Sets?: number;
    team2Sets?: number;
    winner?: number;
    duration?: number;
    setScores?: number[];
  };
  actualStartTime?: string;
  actualEndTime?: string;
};

// Legacy compatibility type for gradual migration
type ExtendedBeachMatch = BeachMatchCore & {
  tournamentGender?: 'M' | 'W';
  tournamentNo?: string;
};

// Type-safe helper to extract duration fields from match data
type MatchWithDurationFields = {
  DurationSet1?: string;
  DurationSet2?: string;
  DurationSet3?: string;
};

const getMatchDuration = (match: ExtendedVisMatch | ExtendedBeachMatch): string | null => {
  
  // First try to get duration from match result (calculated from start/end time)
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
  
  // Fallback: try to get duration from individual set fields (if available)
  // Type assertion is necessary here as ExtendedBeachMatch inherits from legacy BeachMatch
  // which contains duration fields that are not in the BeachMatchCore type
  const matchWithDuration = match as ExtendedBeachMatch & MatchWithDurationFields;
  return calculateTotalDuration(
    matchWithDuration.DurationSet1,
    matchWithDuration.DurationSet2,
    matchWithDuration.DurationSet3
  );
};

interface MatchListV2Props {
  matches: ExtendedVisMatch[] | ExtendedBeachMatch[];
  loading?: boolean;
  title?: string;
  selectedReferee?: { Name: string } | null;
  emptyMessage?: string;
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
  onMatchesReady?: (matches: (ExtendedVisMatch | ExtendedBeachMatch)[], targetIndex: number) => void; // Callback when matches are ready with target scroll index
  onMatchLayout?: (matchId: string, y: number) => void; // Callback for match layout measurement
  showAllDays?: boolean; // Enhanced: Show all tournament days in timeline view
  enableTimelineView?: boolean; // Enhanced: Enable complete tournament timeline mode
  liveScores?: { [matchNumber: string]: any }; // External live scores data
  getLiveScore?: (matchNumber: string) => any; // Function to get live score for a match
}

export const MatchListV2: React.FC<MatchListV2Props> = ({
  matches,
  loading = false,
  title = "Matches",
  selectedReferee,
  emptyMessage = "No matches found",
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
  // State for collapsible referees and dropdown
  const [expandedReferees, setExpandedReferees] = useState<{[key: string]: boolean}>({});
  const [showRefereeDropdown, setShowRefereeDropdown] = useState<boolean>(false);
  
  // State for collapsible date panels
  const [expandedDates, setExpandedDates] = useState<{[key: string]: boolean}>({});
  
  // State for set scores enhancement
  const [enhancedMatches, setEnhancedMatches] = useState<(ExtendedVisMatch | ExtendedBeachMatch)[]>([]);
  const [setScoreService] = useState(() => new SetScoreService());
  
  

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
    if (onCourtFilterChange) {
      onCourtFilterChange(court);
    } else {
      setCourtFilter(court);
    }
  };

  // Use external gender filter if provided, otherwise internal state
  const effectiveGenderFilter = externalGenderFilter ?? genderFilter;
  const setEffectiveGenderFilter = (gender: 'All' | 'M' | 'W') => {
    if (onGenderFilterChange) {
      onGenderFilterChange(gender);
    } else {
      setGenderFilter(gender);
    }
  };

  // Use external referee filter if provided, otherwise internal state
  const effectiveRefereeFilter = externalRefereeFilter ?? refereeFilter;
  const setEffectiveRefereeFilter = (referee: string) => {
    if (onRefereeFilterChange) {
      onRefereeFilterChange(referee);
    } else {
      setRefereeFilter(referee);
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

  // Enhanced matches with set scores
  useEffect(() => {
    const enhanceMatches = async () => {
      try {
        // First adapt matches to component format (handles VIS-compliant data)
        const adaptedMatches = adaptMatchesForComponent(matches);
        const enhanced = await setScoreService.enhanceMatchesWithSetScores(adaptedMatches);
        const enhancedCount = enhanced.filter(match => 
          match.result?.setScores && match.result.setScores.length > 0
        ).length;
        
        setEnhancedMatches(enhanced);
        
      } catch (error) {
        console.error('Failed to enhance matches with set scores:', error);
        // Fallback to adapted matches without enhancement
        const adaptedMatches = adaptMatchesForComponent(matches);
        setEnhancedMatches(adaptedMatches);
      }
    };

    if (matches.length > 0) {
      enhanceMatches();
    } else {
      setEnhancedMatches([]);
    }
  }, [matches, setScoreService]);

  // Reset filters when tournament changes (matches change)
  React.useEffect(() => {
    // Reset only content filters when matches array changes (indicates tournament change)
    // Keep sort order preference
    if (matches.length > 0) {
      setEffectiveCourtFilter('All');
      setEffectiveGenderFilter('All');
      setEffectiveRefereeFilter('All');
      setStatusFilter('All');
      setShowRefereeDropdown(false);
    }
  }, [matches]); // Only depend on matches array reference change

  // uniqueDates calculation REMOVED - DateNavigator disabled

  // Smart date selection DISABLED - using timeline mode, no date filtering needed

  // Extract unique courts
  const uniqueCourts = React.useMemo(() => {
    const courtNumbers = matches
      .map(match => match.court?.courtNumber)
      .filter((courtNumber): courtNumber is string => !!courtNumber)
      .map(courtNumber => String(courtNumber)); // Ensure all are strings
    
    const unique = Array.from(new Set(courtNumbers)).sort();
    
    
    return unique;
  }, [matches]);

  // Extract unique referees
  const uniqueReferees = React.useMemo(() => {
    const refereeNames = new Set<string>();
    matches.forEach(match => {
      match.refereeAssignments?.forEach(referee => {
        if (referee.refereeName) refereeNames.add(referee.refereeName);
      });
    });
    return Array.from(refereeNames).sort();
  }, [matches]);

  // Filter matches based on current filters
  const filteredMatches = React.useMemo(() => {
    // ALWAYS use enhanced matches if available, even if empty
    const matchesToFilter = enhancedMatches.length > 0 ? enhancedMatches : matches;
    const withSetScores = matchesToFilter.filter(m => m.result?.setScores && m.result.setScores.length > 0);
    
    
    // Show date range of input matches
    if (matchesToFilter.length > 0) {
      const dates = matchesToFilter.map(m => m.scheduledDateTime.split('T')[0]).sort();
      const uniqueDates = [...new Set(dates)];
    }
    
    return matchesToFilter.filter(match => {
      // DATE FILTERING COMPLETELY DISABLED - using timeline mode
      // All date filtering logic removed to isolate selectedDate error

      // Gender filter
      if (effectiveGenderFilter !== 'All') {
        if (!match.tournamentGender || match.tournamentGender !== effectiveGenderFilter) {
          return false;
        }
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
      const now = new Date();
      
      // Phase 2: Priority logic - start from current time context
      const aIsRunning = a.status === MatchStatus.RUNNING;
      const bIsRunning = b.status === MatchStatus.RUNNING;
      const aIsFuture = dateA.getTime() >= now.getTime();
      const bIsFuture = dateB.getTime() >= now.getTime();
      
      // Priority 1: Currently running matches always first
      if (aIsRunning && !bIsRunning) return -1;
      if (!aIsRunning && bIsRunning) return 1;
      
      // Priority 2: In timeline mode, keep simple chronological order
      // Skip complex proximity logic when showing all days
      if (!aIsRunning && !bIsRunning && !enableTimelineView && !showAllDays) {
        // Calculate distance from current time for both matches
        const aDistance = Math.abs(dateA.getTime() - now.getTime());
        const bDistance = Math.abs(dateB.getTime() - now.getTime());
        
        // If one is very close to current time (within 30 minutes), prioritize it
        const closeTimeWindow = 30 * 60 * 1000; // 30 minutes
        const aIsClose = aDistance <= closeTimeWindow;
        const bIsClose = bDistance <= closeTimeWindow;
        
        if (aIsClose && !bIsClose) return -1;
        if (!aIsClose && bIsClose) return 1;
        
        // If both are close or both are far, continue to normal sorting
      }
      
      // Phase 1: Standard chronological sorting for the rest
      if (sortOrder === 'desc') {
        return dateB.getTime() - dateA.getTime(); // Descending (newest first)
      } else {
        return dateA.getTime() - dateB.getTime(); // Ascending (earliest first)
      }
    });

    // Final result logging will happen in UI render
  }, [matches, enhancedMatches, effectiveGenderFilter, effectiveCourtFilter, effectiveRefereeFilter, statusFilter, selectedReferee, sortOrder, enableTimelineView, showAllDays]);


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
    
    // Sort dates and return as array of [date, matches] pairs
    const result = Object.entries(groups).sort((a, b) => {
      const dateA = new Date(a[0]);
      const dateB = new Date(b[0]);
      
      if (sortOrder === 'desc') {
        return dateB.getTime() - dateA.getTime(); // Newest first
      } else {
        return dateA.getTime() - dateB.getTime(); // Oldest first
      }
    });
    
    return result;
  }, [filteredMatches, sortOrder]);

  // Initialize expanded dates - only most recent date is expanded by default
  useEffect(() => {
    if (groupedMatches.length > 0) {
      const allDates = groupedMatches.map(([date]) => date);
      // With descending order, the first date is the most recent
      const mostRecentDate = sortOrder === 'desc' ? allDates[0] : allDates[allDates.length - 1];
      
      
      const initialExpanded: {[key: string]: boolean} = {};
      allDates.forEach(date => {
        initialExpanded[date] = date === mostRecentDate; // Only most recent is expanded
      });
      
      setExpandedDates(initialExpanded);
    }
  }, [groupedMatches, sortOrder]);

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

  // Check if match is currently live (beach volleyball rules)
  const isMatchLive = (match: ExtendedVisMatch | ExtendedBeachMatch): boolean => {
    // Rule 1: Current time must be past scheduled time
    if (!match.scheduledDateTime) return false;
    const matchDate = new Date(match.scheduledDateTime);
    const now = new Date();
    const isAfterScheduledTime = matchDate < now;
    
    // Rule 2: Match must not be finished (no team has won 2 sets yet)
    const team1Sets = match.result?.team1Sets || 0;
    const team2Sets = match.result?.team2Sets || 0;
    const matchNotFinished = team1Sets < 2 && team2Sets < 2;
    
    // Rule 3: Check if match status indicates it's running
    const statusIsRunning = match.status === MatchStatus.RUNNING || match.status === MatchStatus.IN_PROGRESS;
    
    // Rule 4: For matches without explicit status, assume live if started within reasonable timeframe (2 hours)
    const timeSinceStart = now.getTime() - matchDate.getTime();
    const withinReasonableTimeframe = timeSinceStart <= 2 * 60 * 60 * 1000; // 2 hours
    
    // Match is live if:
    // - Time has passed AND match not finished AND (status indicates running OR within reasonable timeframe)
    return isAfterScheduledTime && matchNotFinished && (statusIsRunning || withinReasonableTimeframe);
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

  // Render individual match card
  const renderMatch = (match: ExtendedVisMatch | ExtendedBeachMatch) => {
    const statusDisplay = getStatusDisplay(match.status, match.scheduledDateTime);
    
    
    // Extract proper round display data using transformer service
    const roundData = MatchDataTransformer.getRoundDisplayData(match as any);
    
    // Merge live scores with match result for live matches
    let matchWithResult = match;
    if (getLiveScore && isMatchLive(match)) {
      const liveScore = getLiveScore(match.matchNumber);
      if (liveScore && liveScore.sets && liveScore.sets.length > 0) {
        // Create enhanced result from live score data
        const liveResult = {
          team1Sets: liveScore.sets.filter((set: any, index: number) => 
            index % 2 === 0 && set.pointsTeamA > set.pointsTeamB).length,
          team2Sets: liveScore.sets.filter((set: any, index: number) => 
            index % 2 === 0 && set.pointsTeamA < set.pointsTeamB).length,
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
        style={styles.matchCard} 
        nativeID={`match-${match.id}`}
        onLayout={(event) => {
          if (onMatchLayout) {
            onMatchLayout(match.id, event.nativeEvent.layout.y);
          }
        }}
      >
        <View style={styles.matchHeader}>
          <View style={styles.leftBadgeContainer}>
            {match.tournamentGender && (
              <View style={[
                styles.genderBadge,
                match.tournamentGender === 'M' ? styles.menBadge : styles.womenBadge
              ]}>
                <Text style={[
                  styles.genderBadgeText,
                  match.tournamentGender === 'M' ? styles.menBadgeText : styles.womenBadgeText
                ]}>{match.tournamentGender}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.timeCourtContainer}>
            <View style={styles.timeContainer}>
              {isMatchLive(match) && (
                <View style={styles.liveDot} />
              )}
              <Text style={styles.matchTime}>{match.scheduledDateTime ? formatTime(match.scheduledDateTime) : 'TBD'}</Text>
            </View>
            <Text style={styles.courtText}>
              {match.court?.courtNumber ? (
                match.court.courtNumber === 'CC' ? 'CC' : `C${match.court.courtNumber}`
              ) : 'TBD'}
            </Text>
          </View>
          
          <View style={styles.rightBadgeContainer}>
            <View style={[styles.statusBadge, { backgroundColor: '#6B7280' }]}>
              <RoundPhaseDisplay
                round={roundData.round}
                phase={roundData.phase}
                emphasis="medium"
                color="textPrimary"
                style={styles.statusText}
              />
            </View>
          </View>
        </View>

        <View style={styles.flagsAndResultRow}>
          <FlagImage
            federationCode={match.team1?.countryCode}
            teamName={match.team1?.teamName}
            size="medium"
            style={styles.leftFlag}
          />
          
          <View style={styles.centerResultContainer}>
            {matchWithResult.result ? (
              <View style={styles.resultContainerWithSets}>
                <View style={styles.resultContainer}>
                  <Text style={[
                    styles.resultScore,
                    matchWithResult.result.winner === 1 && styles.winnerScore
                  ]}>{matchWithResult.result.team1Sets}</Text>
                  <Text style={styles.scoreSeparator}>-</Text>
                  <Text style={[
                    styles.resultScore,
                    matchWithResult.result.winner === 2 && styles.winnerScore
                  ]}>{matchWithResult.result.team2Sets}</Text>
                </View>
                {(() => {
                  // Show set scores for ANY number of complete sets (even 1 set = 2 scores)
                  const hasSetScores = matchWithResult.result.setScores && matchWithResult.result.setScores.length >= 2;
                  
                  
                  
                  
                  return hasSetScores;
                })() && (
                  <View style={styles.setScoresContainer}>
                    {(() => {
                      const setScores = matchWithResult.result.setScores;
                      const sets = [];
                      
                      // Parse set scores: [set1_team1, set1_team2, set2_team1, set2_team2, ...]
                      for (let i = 0; i < setScores.length; i += 2) {
                        if (i + 1 < setScores.length) {
                          const team1Score = setScores[i];
                          const team2Score = setScores[i + 1];
                          const setNumber = Math.floor(i / 2) + 1;
                          const isWinningSet = team1Score > team2Score ? 1 : team2Score > team1Score ? 2 : 0;
                          
                          // Check if this set is completed
                          // A set is completed if:
                          // 1. Match is finished, OR
                          // 2. One team has winning score with 2+ point lead (21+ for sets 1&2, 15+ for set 3), OR  
                          // 3. This is not the last set in the array (meaning next set has started)
                          const isMatchFinished = match.status === MatchStatus.FINISHED;
                          const isThirdSet = setNumber === 3;
                          const minWinScore = isThirdSet ? 15 : 21;
                          const hasWinningScore = (team1Score >= minWinScore && team1Score - team2Score >= 2) || 
                                                  (team2Score >= minWinScore && team2Score - team1Score >= 2);
                          const isNotLastSet = setNumber < Math.floor(setScores.length / 2);
                          const isSetComplete = isMatchFinished || hasWinningScore || isNotLastSet;
                          
                          sets.push(
                            <View key={setNumber} style={styles.individualSet}>
                              <Text style={[
                                styles.setScore,
                                isWinningSet === 1 && isSetComplete && styles.winningSetScore
                              ]}>{team1Score}</Text>
                              <Text style={styles.setScoreSeparator}>-</Text>
                              <Text style={[
                                styles.setScore,
                                isWinningSet === 2 && isSetComplete && styles.winningSetScore
                              ]}>{team2Score}</Text>
                            </View>
                          );
                        }
                      }
                      
                      return sets;
                    })()}
                  </View>
                )}
                {(() => {
                  const totalDuration = getMatchDuration(match);
                  return totalDuration ? (
                    <Text style={styles.durationText}>({totalDuration})</Text>
                  ) : null;
                })()}
              </View>
            ) : (
              <Text style={styles.vsText}>vs</Text>
            )}
          </View>
          
          <FlagImage
            federationCode={match.team2?.countryCode}
            teamName={match.team2?.teamName}
            size="medium"
            style={styles.rightFlag}
          />
        </View>

        <View style={styles.teamsContainer}>
          <View style={styles.teamsRow}>
            <View style={styles.teamSection}>
              {match.team1?.teamName ? (
                <Text style={[
                  styles.teamName,
                  styles.leftTeamName,
                  matchWithResult.result?.winner === 1 && styles.winnerTeam
                ]} numberOfLines={2}>
                  {match.team1.teamName}
                  {match.team1?.ranking && <Text style={styles.rankingText}> (#{match.team1.ranking})</Text>}
                </Text>
              ) : (
                <View style={styles.playersContainer}>
                  {match.team1?.player1Name && (
                    <Text style={[
                      styles.playerName,
                      styles.leftTeamName,
                      matchWithResult.result?.winner === 1 && styles.winnerTeam
                    ]}>
                      {(match.team1.player1Name || '').split(' ').pop() || ''}
                    </Text>
                  )}
                  {match.team1?.player2Name && (
                    <Text style={[
                      styles.playerName,
                      styles.leftTeamName,
                      matchWithResult.result?.winner === 1 && styles.winnerTeam
                    ]}>
                      {(match.team1.player2Name || '').split(' ').pop() || ''}
                    </Text>
                  )}
                  {match.team1?.ranking && (
                    <Text style={[styles.rankingText, styles.leftTeamName]}>
                      (#{match.team1.ranking})
                    </Text>
                  )}
                </View>
              )}
              <Text style={[styles.countryCode, styles.leftCountryCode]}>
                {match.team1?.countryCode || ''}
              </Text>
            </View>
            
            <View style={styles.teamSection}>
              {match.team2?.teamName ? (
                <Text style={[
                  styles.teamName,
                  styles.rightTeamName,
                  matchWithResult.result?.winner === 2 && styles.winnerTeam
                ]} numberOfLines={2}>
                  {match.team2.teamName}
                  {match.team2?.ranking && <Text style={styles.rankingText}> (#{match.team2.ranking})</Text>}
                </Text>
              ) : (
                <View style={styles.playersContainer}>
                  {match.team2?.player1Name && (
                    <Text style={[
                      styles.playerName,
                      styles.rightTeamName,
                      matchWithResult.result?.winner === 2 && styles.winnerTeam
                    ]}>
                      {(match.team2.player1Name || '').split(' ').pop() || ''}
                    </Text>
                  )}
                  {match.team2?.player2Name && (
                    <Text style={[
                      styles.playerName,
                      styles.rightTeamName,
                      matchWithResult.result?.winner === 2 && styles.winnerTeam
                    ]}>
                      {(match.team2.player2Name || '').split(' ').pop() || ''}
                    </Text>
                  )}
                  {match.team2?.ranking && (
                    <Text style={[styles.rankingText, styles.rightTeamName]}>
                      (#{match.team2.ranking})
                    </Text>
                  )}
                </View>
              )}
              <Text style={[styles.countryCode, styles.rightCountryCode]}>
                {match.team2?.countryCode || ''}
              </Text>
            </View>
          </View>
        </View>

        {match.refereeAssignments && match.refereeAssignments.length > 0 && (
          <View style={styles.refereesContainer}>
            {match.refereeAssignments.map((referee, index) => (
              <View key={index} style={styles.refereeRow}>
                <View style={styles.refereeContentRow}>
                  <Text style={styles.refereePosition}>{index === 0 ? '1°' : '2°'}</Text>
                  <Text style={styles.refereeName}>{referee.refereeName}</Text>
                  <FlagImage
                    federationCode={referee.federationCode}
                    teamName={referee.refereeName}
                    size="medium"
                    style={styles.refereeFlag}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading matches...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

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
    </View>
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
    fontSize: 11,
    fontWeight: '400',
    color: '#9CA3AF',
    marginTop: 2,
    textAlign: 'center',
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
    paddingVertical: 4,
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