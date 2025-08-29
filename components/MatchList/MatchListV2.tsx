import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { BeachMatchCore, MatchStatus } from '../../types/match-v2';
import DateNavigator from '../DateNavigator/DateNavigator';
import { FlagImage } from '../FlagImage';
import { RoundPhaseDisplay } from '../Typography/RoundPhaseDisplay';
import { MatchDataTransformer } from '../../services/MatchDataTransformer';
import { SetScoreService } from '../../services/SetScoreService';
import { VisApiClient } from '../../services/api/VisApiClient';

// Extended match type to include tournament-specific fields
type ExtendedBeachMatch = BeachMatchCore & {
  tournamentGender?: 'M' | 'W';
  tournamentNo?: string;
};

interface MatchListV2Props {
  matches: ExtendedBeachMatch[];
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
  selectedDate?: string; // External selected date to override internal state
  onDateChange?: (date: string) => void; // Callback for date changes
  externalCourtFilter?: string; // External court filter to override internal state
  onCourtFilterChange?: (court: string) => void; // Callback for court filter changes
  externalGenderFilter?: 'All' | 'M' | 'W'; // External gender filter to override internal state
  onGenderFilterChange?: (gender: 'All' | 'M' | 'W') => void; // Callback for gender filter changes
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
  selectedDate: externalSelectedDate,
  onDateChange: externalOnDateChange,
  externalCourtFilter,
  onCourtFilterChange,
  externalGenderFilter,
  onGenderFilterChange,
}) => {
  // State for collapsible referees and dropdown
  const [expandedReferees, setExpandedReferees] = useState<{[key: string]: boolean}>({});
  const [showRefereeDropdown, setShowRefereeDropdown] = useState<boolean>(false);
  
  // State for set scores enhancement
  const [enhancedMatches, setEnhancedMatches] = useState<ExtendedBeachMatch[]>([]);
  const [setScoreService] = useState(() => new SetScoreService());
  

  // Initialize filters from localStorage or defaults
  const [internalSelectedDate, setInternalSelectedDate] = useState<string>('');
  
  // Use external selectedDate if provided, otherwise use internal state
  const selectedDate = externalSelectedDate !== undefined ? externalSelectedDate : internalSelectedDate;
  const setSelectedDate = externalOnDateChange || setInternalSelectedDate;
  
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

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        // Force reset to new default - remove this after users have migrated
        const storedValue = localStorage.getItem('matchlist-sortOrder');
        if (storedValue === 'desc') {
          localStorage.setItem('matchlist-sortOrder', 'asc');
          return 'asc';
        }
        return (storedValue as 'asc' | 'desc') || 'asc';
      }
    } catch (error) {
      // localStorage not available, use defaults
    }
    return 'asc';
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
        // Only persist internal selectedDate, not external one
        if (externalSelectedDate === undefined) {
          localStorage.setItem('matchlist-selectedDate', internalSelectedDate);
        }
        // Only persist internal gender filter, not external one
        if (externalGenderFilter === undefined) {
          localStorage.setItem('matchlist-genderFilter', genderFilter);
        }
        // Only persist internal court filter, not external one
        if (externalCourtFilter === undefined) {
          localStorage.setItem('matchlist-courtFilter', courtFilter);
        }
        localStorage.setItem('matchlist-refereeFilter', refereeFilter);
        localStorage.setItem('matchlist-statusFilter', statusFilter);
        localStorage.setItem('matchlist-sortOrder', sortOrder);
        localStorage.setItem('matchlist-showFilters', showFilters.toString());
      }
    } catch (error) {
      // Failed to save filters to localStorage
    }
  }, [internalSelectedDate, genderFilter, courtFilter, refereeFilter, statusFilter, sortOrder, showFilters, externalSelectedDate, externalCourtFilter, externalGenderFilter]);

  // Enhanced matches with set scores
  useEffect(() => {
    const enhanceMatches = async () => {
      try {
        const enhanced = await setScoreService.enhanceMatchesWithSetScores(matches);
        const enhancedCount = enhanced.filter(match => 
          match.result?.setScores && match.result.setScores.length > 0
        ).length;
        
        setEnhancedMatches(enhanced);
        
      } catch (error) {
        console.error('Failed to enhance matches with set scores:', error);
        setEnhancedMatches(matches);
      }
    };

    if (matches.length > 0) {
      enhanceMatches();
    } else {
      setEnhancedMatches([]);
    }
  }, [matches, setScoreService]);


  // Extract unique dates from matches for DateNavigator
  const uniqueDates = React.useMemo(() => {
    const validDates = matches
      .map(match => {
        const date = new Date(match.scheduledDateTime);
        if (isNaN(date.getTime())) {
          return null; // mark invalid dates for filtering
        }
        return date.toISOString().split('T')[0]; // YYYY-MM-DD format
      })
      .filter(date => date !== null) as string[]; // remove null values
    
    return Array.from(new Set(validDates)).sort();
  }, [matches]);

  // Smart date selection: set today if tournament is ongoing, last day if finished
  // Only do this if not using external selectedDate
  useEffect(() => {
    if (uniqueDates.length === 0 || externalSelectedDate !== undefined) return;

    // Check if we already have a date from localStorage
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const savedDate = localStorage.getItem('matchlist-selectedDate');
        if (savedDate && uniqueDates.includes(savedDate)) {
          setInternalSelectedDate(savedDate);
          return;
        }
      }
    } catch (error) {
      // localStorage not available, continue with smart selection
    }

    const today = new Date().toISOString().split('T')[0];
    const firstDate = uniqueDates[0];
    const lastDate = uniqueDates[uniqueDates.length - 1];

    // If today is within tournament dates, select today
    if (uniqueDates.includes(today)) {
      setInternalSelectedDate(today);
    }
    // If tournament is finished (today > last tournament date), select last day
    else if (today > lastDate) {
      setInternalSelectedDate(lastDate);
    }
    // If tournament hasn't started yet (today < first tournament date), select first day
    else if (today < firstDate) {
      setInternalSelectedDate(firstDate);
    }
    // Fallback to first date
    else {
      setInternalSelectedDate(firstDate);
    }
  }, [uniqueDates, externalSelectedDate]);

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
    
    return matchesToFilter.filter(match => {
      // Date filter
      if (selectedDate) {
        const date = new Date(match.scheduledDateTime);
        if (isNaN(date.getTime())) {
          return false; // skip matches with invalid dates
        }
        const matchDate = date.toISOString().split('T')[0];
        if (matchDate !== selectedDate) return false;
      }

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
      if (refereeFilter !== 'All') {
        const hasReferee = match.refereeAssignments?.some(ref => ref.refereeName === refereeFilter);
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
      // Sort by date and time
      const dateA = new Date(a.scheduledDateTime);
      const dateB = new Date(b.scheduledDateTime);
      
      if (sortOrder === 'desc') {
        return dateB.getTime() - dateA.getTime(); // Descending (newest first)
      } else {
        return dateA.getTime() - dateB.getTime(); // Ascending (oldest first)
      }
    });

    // Final result logging will happen in UI render
  }, [matches, enhancedMatches, selectedDate, effectiveGenderFilter, effectiveCourtFilter, refereeFilter, statusFilter, selectedReferee, sortOrder]);


  // Group matches by date
  const groupedMatches = React.useMemo(() => {
    const groups: { [date: string]: typeof filteredMatches } = {};
    
    filteredMatches.forEach(match => {
      const date = new Date(match.scheduledDateTime);
      if (isNaN(date.getTime())) return;
      
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(match);
    });
    
    // Sort dates and return as array of [date, matches] pairs
    return Object.entries(groups).sort((a, b) => {
      const dateA = new Date(a[0]);
      const dateB = new Date(b[0]);
      
      if (sortOrder === 'desc') {
        return dateB.getTime() - dateA.getTime(); // Newest first
      } else {
        return dateA.getTime() - dateB.getTime(); // Oldest first
      }
    });
  }, [filteredMatches, sortOrder]);

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

  // Format date for section headers
  const formatDateHeader = (dateString: string): string => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const dateOnly = date.toDateString();
    const todayOnly = today.toDateString();
    const tomorrowOnly = tomorrow.toDateString();
    
    if (dateOnly === todayOnly) {
      return 'Today';
    } else if (dateOnly === tomorrowOnly) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
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
  const renderMatch = (match: BeachMatchCore) => {
    const statusDisplay = getStatusDisplay(match.status, match.scheduledDateTime);
    
    // Extract proper round display data using transformer service
    const roundData = MatchDataTransformer.getRoundDisplayData(match as any);
    
    const matchWithResult = match;
    
    return (
      <View key={match.id} style={styles.matchCard}>
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
            <Text style={styles.matchTime}>{match.scheduledDateTime ? formatTime(match.scheduledDateTime) : 'TBD'}</Text>
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
                          
                          sets.push(
                            <View key={setNumber} style={styles.individualSet}>
                              <Text style={[
                                styles.setScore,
                                isWinningSet === 1 && styles.winningSetScore
                              ]}>{team1Score}</Text>
                              <Text style={styles.setScoreSeparator}>-</Text>
                              <Text style={[
                                styles.setScore,
                                isWinningSet === 2 && styles.winningSetScore
                              ]}>{team2Score}</Text>
                            </View>
                          );
                        }
                      }
                      
                      return sets;
                    })()}
                  </View>
                )}
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
      {showDateNavigator && uniqueDates.length > 0 && (
        <DateNavigator
          availableDates={uniqueDates}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
      )}

      {/* Only show filter toggle if any filters are enabled */}
      {(showGenderFilter || showCourtFilter || showRefereeFilter || showStatsInFilter) && (
        <TouchableOpacity 
          style={styles.filterToggleButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterToggleText}>
            {showFilters ? 'Hide Filters' : 'Show Filters'} {showFilters ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>
      )}

      {showFilters && (
        <View style={[
          styles.filtersContainer,
          showRefereeDropdown && styles.filtersContainerExpanded
        ]}>
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

        {/* Referee Filter - positioned LAST to render above other filters */}
        {showRefereeFilter && uniqueReferees.length > 0 && (
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Referee:</Text>
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={[styles.dropdownButton, showRefereeDropdown && styles.dropdownButtonActive]}
                onPress={() => setShowRefereeDropdown(!showRefereeDropdown)}
              >
                <Text style={[styles.dropdownButtonText, showRefereeDropdown && styles.dropdownButtonTextActive]}>
                  {refereeFilter === 'All' ? 'ALL' : refereeFilter.split(' ').pop()}
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
                        style={[styles.dropdownItem, refereeFilter === 'All' && styles.dropdownItemActive]}
                        onPress={() => {
                          setRefereeFilter('All');
                          setShowRefereeDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, refereeFilter === 'All' && styles.dropdownItemTextActive]}>
                          ALL
                        </Text>
                      </TouchableOpacity>
                      {uniqueReferees.map(referee => (
                        <TouchableOpacity
                          key={referee}
                          style={[styles.dropdownItem, refereeFilter === referee && styles.dropdownItemActive]}
                          onPress={() => {
                            setRefereeFilter(referee);
                            setShowRefereeDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, refereeFilter === referee && styles.dropdownItemTextActive]} numberOfLines={1}>
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

      <ScrollView style={styles.matchesList} showsVerticalScrollIndicator={false}>
        {filteredMatches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        ) : (
          <>
            {groupedMatches.map(([date, matches]) => (
              <View key={date}>
                <View style={styles.dateHeader}>
                  <Text style={styles.dateHeaderText}>{formatDateHeader(date)}</Text>
                </View>
                {matches.map(renderMatch)}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'visible',
  },
  filterToggleButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
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
    // Same styling as base genderBadge
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
    // Same as base genderBadgeText
  },
  dateHeader: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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