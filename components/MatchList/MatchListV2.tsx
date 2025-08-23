import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { BeachMatchCore, MatchStatus } from '../../types/match-v2';
import DateNavigator from '../DateNavigator/DateNavigator';
import { FlagImage } from '../FlagImage';

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
}) => {
  // State for collapsible referees
  const [expandedReferees, setExpandedReferees] = useState<{[key: string]: boolean}>({});
  
  // State for showing/hiding referees for each match card individually
  const [showRefereesForMatch, setShowRefereesForMatch] = useState<{[matchId: string]: boolean}>({});

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
        return (localStorage.getItem('matchlist-sortOrder') as 'asc' | 'desc') || 'desc';
      }
    } catch (error) {
      // localStorage not available, use defaults
    }
    return 'desc';
  });

  const [showFilters, setShowFilters] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('matchlist-showFilters');
        return saved === 'true'; // Only show if explicitly saved as true
      }
    } catch (error) {
      // localStorage not available, use defaults
    }
    return false; // Default to hidden
  });

  // Persist filters to localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        // Only persist internal selectedDate, not external one
        if (externalSelectedDate === undefined) {
          localStorage.setItem('matchlist-selectedDate', internalSelectedDate);
        }
        localStorage.setItem('matchlist-genderFilter', genderFilter);
        localStorage.setItem('matchlist-courtFilter', courtFilter);
        localStorage.setItem('matchlist-refereeFilter', refereeFilter);
        localStorage.setItem('matchlist-statusFilter', statusFilter);
        localStorage.setItem('matchlist-sortOrder', sortOrder);
        localStorage.setItem('matchlist-showFilters', showFilters.toString());
      }
    } catch (error) {
      // Failed to save filters to localStorage
    }
  }, [internalSelectedDate, genderFilter, courtFilter, refereeFilter, statusFilter, sortOrder, showFilters, externalSelectedDate]);

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
    return Array.from(new Set(matches.map(match => match.court.courtNumber))).sort();
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
    return matches.filter(match => {
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
      if (genderFilter !== 'All') {
        if (!match.tournamentGender || match.tournamentGender !== genderFilter) {
          return false;
        }
      }

      // Court filter
      if (courtFilter !== 'All' && match.court.courtNumber !== courtFilter) {
        return false;
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
  }, [matches, selectedDate, genderFilter, courtFilter, refereeFilter, statusFilter, selectedReferee, sortOrder]);

  // Function to toggle referee visibility for a specific match
  const toggleRefereesForMatch = (matchId: string) => {
    setShowRefereesForMatch(prev => ({
      ...prev,
      [matchId]: !prev[matchId]
    }));
  };

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
    
    const matchWithResult = match;
    
    return (
      <View key={match.id} style={styles.matchCard}>
        <View style={styles.matchHeader}>
          <View style={styles.timeContainer}>
            <Text style={styles.matchTime}>{match.scheduledDateTime ? formatTime(match.scheduledDateTime) : 'TBD'}</Text>
          </View>
          <View style={styles.courtContainer}>
            <Text style={styles.courtText}>
              {match.court?.courtNumber ? (
                match.court.courtNumber === 'CC' ? 'CC' : `C${match.court.courtNumber}`
              ) : 'TBD'}
            </Text>
          </View>
          <View style={styles.headerBadgesContainer}>
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
            <View style={[styles.statusBadge, { backgroundColor: '#6B7280' }]}>
              <Text style={styles.statusText}>{(match as any).NoRound || 'Round TBD'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.teamsContainer}>
          <View style={styles.teamRow}>
            <View style={styles.teamWithFlag}>
              <Text style={[
                styles.teamName,
                matchWithResult.result?.winner === 1 && styles.winnerTeam
              ]}>
                {match.team1?.teamName || `${match.team1?.player1Name || ''} / ${match.team1?.player2Name || ''}`}
                {match.team1?.countryCode && `\n(${match.team1.countryCode})`}
              </Text>
              <FlagImage
                federationCode={match.team1?.countryCode}
                teamName={match.team1?.teamName}
                size="medium"
                style={styles.teamFlag}
              />
            </View>
            {matchWithResult.result && (
              <View style={styles.scoreContainer}>
                <Text style={[
                  styles.teamScore,
                  matchWithResult.result.winner === 1 && styles.winnerScore
                ]}>{matchWithResult.result.team1Sets}</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.vsText}>vs</Text>
          
          <View style={styles.teamRow}>
            <View style={styles.teamWithFlag}>
              <Text style={[
                styles.teamName,
                matchWithResult.result?.winner === 2 && styles.winnerTeam
              ]}>
                {match.team2?.teamName || `${match.team2?.player1Name || ''} / ${match.team2?.player2Name || ''}`}
                {match.team2?.countryCode && `\n(${match.team2.countryCode})`}
              </Text>
              <FlagImage
                federationCode={match.team2?.countryCode}
                teamName={match.team2?.teamName}
                size="medium"
                style={styles.teamFlag}
              />
            </View>
            {matchWithResult.result && (
              <View style={styles.scoreContainer}>
                <Text style={[
                  styles.teamScore,
                  matchWithResult.result.winner === 2 && styles.winnerScore
                ]}>{matchWithResult.result.team2Sets}</Text>
              </View>
            )}
          </View>
        </View>

        {match.refereeAssignments && match.refereeAssignments.length > 0 && (
          <TouchableOpacity 
            style={styles.refereeLinkInCard}
            onPress={() => toggleRefereesForMatch(match.id)}
          >
            <Text style={styles.refereeLinkTextInCard}>
              {showRefereesForMatch[match.id] ? 'Hide Referees' : 'Show Referees'}
            </Text>
          </TouchableOpacity>
        )}

        {showRefereesForMatch[match.id] && match.refereeAssignments && match.refereeAssignments.length > 0 && (
          <View style={styles.refereesContainer}>
            {match.refereeAssignments.map((referee, index) => (
              <View key={index} style={styles.refereeRow}>
                <Text style={styles.refereePosition}>{index === 0 ? '1°' : '2°'}</Text>
                <Text style={styles.refereeName}>{referee.refereeName}</Text>
                <FlagImage
                  federationCode={referee.federationCode}
                  teamName={referee.refereeName}
                  size="medium"
                  style={styles.refereeFlag}
                />
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
        <View style={styles.filtersContainer}>
        {showCourtFilter && uniqueCourts.length > 1 && (
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Court:</Text>
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[styles.filterButton, courtFilter === 'All' && styles.filterButtonActive]}
                onPress={() => setCourtFilter('All')}
              >
                <Text style={[styles.filterButtonText, courtFilter === 'All' && styles.filterButtonTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              {uniqueCourts.map(court => (
                <TouchableOpacity
                  key={court}
                  style={[styles.filterButton, courtFilter === court && styles.filterButtonActive]}
                  onPress={() => setCourtFilter(court)}
                >
                  <Text style={[styles.filterButtonText, courtFilter === court && styles.filterButtonTextActive]}>
                    {court === 'CC' ? 'CC' : `C${court}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {showRefereeFilter && uniqueReferees.length > 0 && (
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Referee:</Text>
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[styles.filterButton, refereeFilter === 'All' && styles.filterButtonActive]}
                onPress={() => setRefereeFilter('All')}
              >
                <Text style={[styles.filterButtonText, refereeFilter === 'All' && styles.filterButtonTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              {uniqueReferees.slice(0, 5).map(referee => (
                <TouchableOpacity
                  key={referee}
                  style={[styles.filterButton, refereeFilter === referee && styles.filterButtonActive]}
                  onPress={() => setRefereeFilter(referee)}
                >
                  <Text style={[styles.filterButtonText, refereeFilter === referee && styles.filterButtonTextActive]} numberOfLines={1}>
                    {referee.split(' ').pop()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Gender:</Text>
          <View style={styles.filterButtons}>
            {(['All', 'M', 'W'] as const).map(gender => (
              <TouchableOpacity
                key={gender}
                style={[styles.filterButton, genderFilter === gender && styles.filterButtonActive]}
                onPress={() => setGenderFilter(gender)}
              >
                <Text style={[styles.filterButtonText, genderFilter === gender && styles.filterButtonTextActive]}>
                  {gender === 'All' ? 'All' : gender === 'M' ? 'Men' : 'Women'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

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
  refereeLinkInCard: {
    width: '100%',
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  refereeLinkTextInCard: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    textDecorationLine: 'underline',
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
  },
  filterGroup: {
    marginBottom: 12,
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
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
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
    marginBottom: 12,
  },
  timeContainer: {
    alignItems: 'flex-start',
  },
  matchTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  courtContainer: {
    alignItems: 'center',
  },
  courtText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
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
    marginBottom: 12,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  teamWithFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamFlag: {
    marginLeft: 8,
  },
  teamName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginRight: 8,
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
    marginVertical: 4,
  },
  refereesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  refereeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  refereePosition: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    minWidth: 24,
    marginRight: 8,
  },
  refereeFlag: {
    marginLeft: 8,
  },
  refereeName: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
    fontWeight: '500',
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
  headerBadgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
});