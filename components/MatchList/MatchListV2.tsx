import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { BeachMatchCore, MatchStatus } from '../../types/match-v2';
import DateNavigator from '../DateNavigator/DateNavigator';

interface MatchListV2Props {
  matches: BeachMatchCore[];
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
}) => {
  // State for collapsible referees
  const [expandedReferees, setExpandedReferees] = useState<{[key: string]: boolean}>({});

  // Initialize filters from localStorage or defaults
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        return localStorage.getItem('matchlist-selectedDate') || '';
      }
    } catch (error) {
      // localStorage not available, use defaults
    }
    return '';
  });
  
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
        return localStorage.getItem('matchlist-showFilters') === 'true';
      }
    } catch (error) {
      // localStorage not available, use defaults
    }
    return false;
  });

  // Persist filters to localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem('matchlist-selectedDate', selectedDate);
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
  }, [selectedDate, genderFilter, courtFilter, refereeFilter, statusFilter, sortOrder, showFilters]);

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

  // Extract unique courts
  const uniqueCourts = React.useMemo(() => {
    return Array.from(new Set(matches.map(match => match.court.courtNumber))).sort();
  }, [matches]);

  // Extract unique referees
  const uniqueReferees = React.useMemo(() => {
    const refereeNames = new Set<string>();
    matches.forEach(match => {
      match.referees?.forEach(ref => {
        if (ref.name) refereeNames.add(ref.name);
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
        const hasReferee = match.referees?.some(ref => ref.name === refereeFilter);
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
        const hasSelectedReferee = match.referees?.some(ref => 
          ref.name === selectedReferee.Name
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

  // Format date from ISO string
  const formatDate = (isoDateTime: string): string => {
    const date = new Date(isoDateTime);
    if (isNaN(date.getTime())) {
      return 'TBD'; // fallback for invalid dates
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status display text and color
  const getStatusDisplay = (status: MatchStatus): { text: string; color: string } => {
    switch (status) {
      case MatchStatus.SCHEDULED:
        return { text: 'Scheduled', color: '#6B7280' };
      case MatchStatus.WARMUP:
        return { text: 'Warm-up', color: '#F59E0B' };
      case MatchStatus.IN_PROGRESS:
        return { text: 'Live', color: '#10B981' };
      case MatchStatus.COMPLETED:
        return { text: 'Final', color: '#374151' };
      case MatchStatus.CANCELLED:
        return { text: 'Cancelled', color: '#EF4444' };
      case MatchStatus.POSTPONED:
        return { text: 'Postponed', color: '#F59E0B' };
      default:
        return { text: status, color: '#6B7280' };
    }
  };

  // Render individual match card
  const renderMatch = (match: BeachMatchCore) => {
    const statusDisplay = getStatusDisplay(match.status);
    
    return (
      <View key={match.id} style={styles.matchCard}>
        <View style={styles.matchHeader}>
          <View style={styles.timeContainer}>
            <Text style={styles.matchTime}>{formatTime(match.scheduledDateTime)}</Text>
            <Text style={styles.matchDate}>{formatDate(match.scheduledDateTime)}</Text>
          </View>
          <View style={styles.courtContainer}>
            <Text style={styles.courtText}>Court {match.court.courtNumber}</Text>
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
            <View style={[styles.statusBadge, { backgroundColor: statusDisplay.color }]}>
              <Text style={styles.statusText}>{statusDisplay.text}</Text>
            </View>
          </View>
        </View>

        <View style={styles.teamsContainer}>
          <View style={styles.teamRow}>
            <Text style={styles.teamName} numberOfLines={1}>
              {match.team1.teamName || `${match.team1.player1Name} / ${match.team1.player2Name}`}
            </Text>
            {match.result && (
              <Text style={styles.teamScore}>{match.result.team1Sets}</Text>
            )}
          </View>
          
          <Text style={styles.vsText}>vs</Text>
          
          <View style={styles.teamRow}>
            <Text style={styles.teamName} numberOfLines={1}>
              {match.team2.teamName || `${match.team2.player1Name} / ${match.team2.player2Name}`}
            </Text>
            {match.result && (
              <Text style={styles.teamScore}>{match.result.team2Sets}</Text>
            )}
          </View>
        </View>

        {match.referees && match.referees.length > 0 && (
          <View style={styles.refereesContainer}>
            <Text style={styles.refereesLabel}>Referees:</Text>
            {match.referees.map((referee, index) => (
              <Text key={referee.id || index} style={styles.refereeText}>
                {referee.name} ({referee.countryCode})
              </Text>
            ))}
          </View>
        )}

        {match.round && (
          <View style={styles.roundContainer}>
            <Text style={styles.roundText}>{match.round}</Text>
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

      {/* Filter Toggle Button */}
      <TouchableOpacity 
        style={styles.filterToggleButton}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Text style={styles.filterToggleText}>
          {showFilters ? 'Hide Filters' : 'Show Filters'} {showFilters ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* Filters */}
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
                    {court}
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
                    {referee.split(' ').pop()} {/* Show last name only */}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Gender Filter */}
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

        {/* Sort Order */}
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

      {/* Match List */}
      <ScrollView style={styles.matchesList} showsVerticalScrollIndicator={false}>
        {filteredMatches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.matchCount}>
              {filteredMatches.length} {filteredMatches.length === 1 ? 'match' : 'matches'}
            </Text>
            {filteredMatches.map(renderMatch)}
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
  matchCount: {
    fontSize: 14,
    color: '#6B7280',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
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
  matchDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
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
  teamName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginRight: 8,
  },
  teamScore: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    minWidth: 24,
    textAlign: 'center',
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
});