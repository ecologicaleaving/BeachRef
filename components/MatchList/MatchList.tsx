import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { BeachMatch } from '../../types/match';
import DateNavigator from '../DateNavigator/DateNavigator';
import { colors } from '../../theme/tokens';
import { FlagImage } from '../FlagImage';

interface MatchListProps {
  matches: BeachMatch[];
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

export const MatchList: React.FC<MatchListProps> = ({
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
      // console.warn('localStorage not available:', error);
    }
    return '';
  });
  
  const [genderFilter, setGenderFilter] = useState<'All' | 'M' | 'W'>(() => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        return (localStorage.getItem('matchlist-genderFilter') as 'All' | 'M' | 'W') || 'All';
      }
    } catch (error) {
      // console.warn('localStorage not available:', error);
    }
    return 'All';
  });
  
  const [courtFilter, setCourtFilter] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        return localStorage.getItem('matchlist-courtFilter') || 'All';
      }
    } catch (error) {
      // console.warn('localStorage not available:', error);
    }
    return 'All';
  });
  
  const [refereeFilterMatch, setRefereeFilterMatch] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        return localStorage.getItem('matchlist-refereeFilter') || 'All';
      }
    } catch (error) {
      // console.warn('localStorage not available:', error);
    }
    return 'All';
  });
  
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        return (localStorage.getItem('matchlist-sortOrder') as 'asc' | 'desc') || 'desc';
      }
    } catch (error) {
      // console.warn('localStorage not available:', error);
    }
    return 'desc';
  });
  
  const [showCustomFilters, setShowCustomFilters] = useState(false);
  const [showRefereeDropdown, setShowRefereeDropdown] = useState(false);

  // Wrapper functions to save to localStorage
  const updateSelectedDate = (date: string) => {
    setSelectedDate(date);
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem('matchlist-selectedDate', date);
      }
    } catch (error) {
      // console.warn('Failed to save selectedDate to localStorage:', error);
    }
  };

  const updateGenderFilter = (gender: 'All' | 'M' | 'W') => {
    setGenderFilter(gender);
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem('matchlist-genderFilter', gender);
      }
    } catch (error) {
      // console.warn('Failed to save genderFilter to localStorage:', error);
    }
  };

  const updateCourtFilter = (court: string) => {
    setCourtFilter(court);
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem('matchlist-courtFilter', court);
      }
    } catch (error) {
      // console.warn('Failed to save courtFilter to localStorage:', error);
    }
  };

  const updateRefereeFilter = (referee: string) => {
    setRefereeFilterMatch(referee);
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem('matchlist-refereeFilter', referee);
      }
    } catch (error) {
      // console.warn('Failed to save refereeFilter to localStorage:', error);
    }
  };

  const updateSortOrder = (order: 'asc' | 'desc') => {
    setSortOrder(order);
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem('matchlist-sortOrder', order);
      }
    } catch (error) {
      // console.warn('Failed to save sortOrder to localStorage:', error);
    }
  };

  // Get available dates from matches
  const getAvailableDates = () => {
    const allDates = matches.map(match => 
      match.Date || match.LocalDate || match.MatchDate || match.StartDate
    ).filter(Boolean);
    return [...new Set(allDates)].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  };

  // Get available courts from filtered matches (based on date and current filters)
  const getAvailableCourts = () => {
    // Apply base filters (date, referee, gender) but not court filter to avoid circular dependency
    let baseFilteredMatches = matches;
    
    // Apply date filter - show matches from selected date onwards
    if (selectedDate) {
      baseFilteredMatches = baseFilteredMatches.filter(match => {
        const matchDate = match.Date || match.LocalDate || match.MatchDate || match.StartDate;
        return matchDate && matchDate >= selectedDate;
      });
    }
    
    // Apply referee filter
    if (refereeFilterMatch !== 'All') {
      baseFilteredMatches = baseFilteredMatches.filter(match => 
        match.Referee1Name === refereeFilterMatch || match.Referee2Name === refereeFilterMatch
      );
    }
    
    // Apply gender filter
    if (genderFilter !== 'All') {
      baseFilteredMatches = baseFilteredMatches.filter(match => match.tournamentGender === genderFilter);
    }
    
    const allCourts = baseFilteredMatches.map(match => match.Court).filter(Boolean);
    const uniqueCourts = [...new Set(allCourts)].sort();
    return ['All', ...uniqueCourts];
  };

  // Get available referees from filtered matches (based on date and current filters)
  const getAvailableReferees = () => {
    // Apply base filters (date, court, gender) but not referee filter to avoid circular dependency
    let baseFilteredMatches = matches;
    
    // Apply date filter - show matches from selected date onwards
    if (selectedDate) {
      baseFilteredMatches = baseFilteredMatches.filter(match => {
        const matchDate = match.Date || match.LocalDate || match.MatchDate || match.StartDate;
        return matchDate && matchDate >= selectedDate;
      });
    }
    
    // Apply court filter
    if (courtFilter !== 'All') {
      baseFilteredMatches = baseFilteredMatches.filter(match => match.Court === courtFilter);
    }
    
    // Apply gender filter
    if (genderFilter !== 'All') {
      baseFilteredMatches = baseFilteredMatches.filter(match => match.tournamentGender === genderFilter);
    }
    
    const allReferees = new Set<string>();
    baseFilteredMatches.forEach(match => {
      if (match.Referee1Name) allReferees.add(match.Referee1Name);
      if (match.Referee2Name) allReferees.add(match.Referee2Name);
    });
    const uniqueReferees = Array.from(allReferees).sort();
    return ['All', ...uniqueReferees];
  };

  // Auto-select today's date or nearest future date when matches change
  useEffect(() => {
    const dates = getAvailableDates();
    if (dates.length > 0 && !selectedDate) {
      const today = new Date().toISOString().split('T')[0];
      
      // Find today's date or the next available date in the future
      let defaultDate = dates.find(date => date >= today);
      
      // If no future dates, use the most recent date
      if (!defaultDate) {
        defaultDate = dates[dates.length - 1];
      }
      
      // console.log('🗓️ MatchList - Setting default date (from today onwards):', defaultDate);
      updateSelectedDate(defaultDate);
    }
  }, [matches]);

  // Get matches for selected date, gender filter, court filter, and referee filter
  const getMatchesForSelectedDate = () => {
    let filteredMatches = matches;
    
    // Apply date filter - show matches from selected date onwards
    if (selectedDate) {
      // console.log('🗓️ MatchList - Filtering from date:', selectedDate);
      const beforeFilter = filteredMatches.length;
      
      filteredMatches = filteredMatches.filter(match => {
        const matchDate = match.Date || match.LocalDate || match.MatchDate || match.StartDate;
        const isIncluded = matchDate && matchDate >= selectedDate;
        
        if (!isIncluded && matchDate) {
          // console.log(`🗓️ Excluded match: ${matchDate} < ${selectedDate}`);
        }
        
        return isIncluded;
      });
      
      // console.log(`🗓️ MatchList - Date filter: ${beforeFilter} -> ${filteredMatches.length} matches`);
    }
    // If no date selected, show all matches
    
    // Apply gender filter
    if (genderFilter !== 'All') {
      filteredMatches = filteredMatches.filter(match => match.tournamentGender === genderFilter);
    }
    
    // Apply court filter
    if (courtFilter !== 'All') {
      filteredMatches = filteredMatches.filter(match => match.Court === courtFilter);
    }
    
    // Apply referee filter
    if (refereeFilterMatch !== 'All') {
      filteredMatches = filteredMatches.filter(match => 
        match.Referee1Name === refereeFilterMatch || match.Referee2Name === refereeFilterMatch
      );
    }
    
    // Sort by time (ascending or descending)
    return filteredMatches.sort((a, b) => {
      const timeA = a.LocalTime || a.Time || '00:00';
      const timeB = b.LocalTime || b.Time || '00:00';
      
      const getTimeNumber = (timeStr: string) => {
        const parts = timeStr.split(':');
        if (parts.length !== 2) return 0;
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        return hours * 60 + minutes;
      };
      
      const timeNumA = getTimeNumber(timeA);
      const timeNumB = getTimeNumber(timeB);
      
      // Apply sort order (desc = latest first, asc = earliest first)
      return sortOrder === 'desc' ? timeNumB - timeNumA : timeNumA - timeNumB;
    });
  };

  // Format date for display
  const formatMatchDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'Unknown Date') return dateStr;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Handle date change
  const handleDateChange = (newDate: string) => {
    // console.log('🗓️ MatchList - Date changed to:', newDate);
    updateSelectedDate(newDate);
  };

  // Calculate match statistics for filter buttons based on currently filtered matches
  const getMatchStats = () => {
    // Get matches filtered by current date, court, and referee selections (but not gender)
    let baseFilteredMatches = matches;
    
    // Apply date filter - show matches from selected date onwards
    if (selectedDate) {
      baseFilteredMatches = baseFilteredMatches.filter(match => {
        const matchDate = match.Date || match.LocalDate || match.MatchDate || match.StartDate;
        return matchDate && matchDate >= selectedDate;
      });
    }
    
    // Apply court filter
    if (courtFilter !== 'All') {
      baseFilteredMatches = baseFilteredMatches.filter(match => match.Court === courtFilter);
    }
    
    // Apply referee filter
    if (refereeFilterMatch !== 'All') {
      baseFilteredMatches = baseFilteredMatches.filter(match => 
        match.Referee1Name === refereeFilterMatch || match.Referee2Name === refereeFilterMatch
      );
    }
    
    // Calculate gender stats based on the filtered matches
    const totalMatches = baseFilteredMatches.length;
    const menMatches = baseFilteredMatches.filter(match => match.tournamentGender === 'M').length;
    const womenMatches = baseFilteredMatches.filter(match => match.tournamentGender === 'W').length;
    
    return { totalMatches, menMatches, womenMatches };
  };

  // Get button label with optional stats
  const getButtonLabel = (gender: 'All' | 'M' | 'W') => {
    if (!showStatsInFilter) {
      return gender === 'All' ? 'Tutte' : gender === 'M' ? 'Maschili' : 'Femminili';
    }
    
    const { totalMatches, menMatches, womenMatches } = getMatchStats();
    const count = gender === 'All' ? totalMatches : gender === 'M' ? menMatches : womenMatches;
    const label = gender === 'All' ? 'All' : gender;
    
    return `${label} (${count})`;
  };

  // Toggle referee section expansion
  const toggleRefereeExpansion = (matchNo: string) => {
    setExpandedReferees(prev => ({
      ...prev,
      [matchNo]: !prev[matchNo]
    }));
  };

  // Render match card
  const renderMatchCard = (match: BeachMatch, index: number) => {
    const teamAScore = parseInt(match.MatchPointsA || '0');
    const teamBScore = parseInt(match.MatchPointsB || '0');
    const teamAWon = teamAScore > teamBScore && teamAScore > 0;
    const teamBWon = teamBScore > teamAScore && teamBScore > 0;
    const matchKey = match.No || `match-${index}`;
    const isRefereeExpanded = expandedReferees[matchKey] || false;

    return (
      <View key={match.No || index} style={styles.matchCard}>
        {match.tournamentGender && (
          <View style={[
            styles.genderBadge,
            match.tournamentGender === 'M' ? styles.menBadge : styles.womenBadge
          ]}>
            <Text style={[
              styles.genderText,
              match.tournamentGender === 'M' ? styles.menText : styles.womenText
            ]}>
              {match.tournamentGender}
            </Text>
          </View>
        )}
        
        <View style={styles.matchTopInfo}>
          <View style={styles.leftTopInfo}>
            {match.Court && (
              <Text style={styles.courtInfoTop}>
                Court {match.Court}
              </Text>
            )}
            {match.LocalTime && (
              <Text style={styles.timeInfoTop}>
                {match.LocalTime.substring(0, 5)}
              </Text>
            )}
          </View>
          {match.Round && match.Round.trim() !== '' && (
            <Text style={styles.roundInfoTop}>
              {match.Round}
            </Text>
          )}
        </View>
        
        <View style={styles.matchHeader}>
          <View style={styles.teamsColumn}>
            <View style={styles.teamRow}>
              <FlagImage
                countryCode={match.TeamACountryCode}
                teamName={match.TeamAName}
                size="small"
                style={styles.teamFlag}
              />
              <Text 
                style={[
                  styles.teamName, 
                  teamAWon && styles.winnerTeamName
                ]} 
                numberOfLines={2}
              >
                {match.TeamAName || 'Team A'}
              </Text>
            </View>
            <View style={styles.teamRow}>
              <FlagImage
                countryCode={match.TeamBCountryCode}
                teamName={match.TeamBName}
                size="small"
                style={styles.teamFlag}
              />
              <Text 
                style={[
                  styles.teamName, 
                  teamBWon && styles.winnerTeamName
                ]} 
                numberOfLines={2}
              >
                {match.TeamBName || 'Team B'}
              </Text>
            </View>
          </View>
          
          <View style={styles.scoreColumn}>
            <View style={styles.matchScore}>
              <Text 
                style={[
                  styles.scoreText,
                  teamAWon && styles.winnerScoreText
                ]}
              >
                {match.MatchPointsA || '0'}
              </Text>
              <Text 
                style={[
                  styles.scoreText,
                  teamBWon && styles.winnerScoreText
                ]}
              >
                {match.MatchPointsB || '0'}
              </Text>
            </View>
          </View>
        </View>
        
        {(match.Referee1Name || match.Referee2Name) && (
          <View style={styles.collapsibleRefereeSection}>
            <TouchableOpacity 
              style={styles.refereeToggleHeader}
              onPress={() => toggleRefereeExpansion(matchKey)}
            >
              <Text style={styles.refereeToggleText}>
                Referees {isRefereeExpanded ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
            
            {isRefereeExpanded && (
              <View style={styles.refereesSection}>
                {match.Referee1Name && (
                  <View style={styles.refereeContainer}>
                    <Text style={[
                      styles.refereeText,
                      selectedReferee?.Name === match.Referee1Name && styles.highlightedReferee
                    ]}>
                      R1: {match.Referee1Name}
                      {match.Referee1FederationCode && ` (${match.Referee1FederationCode})`}
                    </Text>
                  </View>
                )}
                {match.Referee2Name && (
                  <View style={styles.refereeContainer}>
                    <Text style={[
                      styles.refereeText,
                      selectedReferee?.Name === match.Referee2Name && styles.highlightedReferee
                    ]}>
                      R2: {match.Referee2Name}
                      {match.Referee2FederationCode && ` (${match.Referee2FederationCode})`}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const availableDates = getAvailableDates();
  const displayMatches = getMatchesForSelectedDate();

  return (
    <View style={styles.container}>
      {title && (
        <Text style={styles.title}>
          {title}
        </Text>
      )}
      
      {showDateNavigator && matches.length > 0 && availableDates.length > 1 && (
        <DateNavigator
          availableDates={availableDates}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          formatDate={formatMatchDate}
        />
      )}

      {(customFilters || showGenderFilter || showCourtFilter || showRefereeFilter) && (
        <>
          <View style={styles.filterToggleSection}>
            <TouchableOpacity 
              style={styles.filterToggleButton}
              onPress={() => setShowCustomFilters(!showCustomFilters)}
            >
              <Text style={styles.filterToggleText}>
                {showCustomFilters ? 'Hide Filters' : 'Show Filters'}
              </Text>
              <Text style={styles.filterToggleIcon}>
                {showCustomFilters ? '△' : '▽'}
              </Text>
            </TouchableOpacity>
          </View>

          {showCustomFilters && (
            <View style={styles.expandableFiltersPanel}>
              {customFilters}
              
              {showGenderFilter && (
                <View style={styles.genderFilterContainer}>
                  <View style={styles.genderFilterButtons}>
                    {(['All', 'M', 'W'] as const).map((gender) => (
                      <TouchableOpacity
                        key={gender}
                        style={[
                          styles.genderFilterButton,
                          genderFilter === gender && styles.activeGenderFilterButton
                        ]}
                        onPress={() => updateGenderFilter(gender)}
                      >
                        <Text style={[
                          styles.genderFilterText,
                          genderFilter === gender && styles.activeGenderFilterText
                        ]}>
                          {getButtonLabel(gender)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {showCourtFilter && (
                <View style={styles.courtFilterContainer}>
                  <View style={styles.courtFilterButtons}>
                    {getAvailableCourts().map((court) => (
                      <TouchableOpacity
                        key={court}
                        style={[
                          styles.courtFilterButton,
                          courtFilter === court && styles.activeCourtFilterButton
                        ]}
                        onPress={() => updateCourtFilter(court)}
                      >
                        <Text style={[
                          styles.courtFilterText,
                          courtFilter === court && styles.activeCourtFilterText
                        ]}>
                          {court}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {showRefereeFilter && (
                <View style={styles.refereeDropdownContainer}>
                  <Text style={styles.filterSectionLabel}>Referee</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowRefereeDropdown(true)}
                  >
                    <Text style={styles.dropdownButtonText}>
                      {refereeFilterMatch === 'All' ? 'All Referees' : refereeFilterMatch}
                    </Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>
                  
                  <Modal
                    visible={showRefereeDropdown}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowRefereeDropdown(false)}
                  >
                    <Pressable 
                      style={styles.modalOverlay}
                      onPress={() => setShowRefereeDropdown(false)}
                    >
                      <Pressable 
                        style={styles.modalDropdownContainer}
                        onPress={(e) => e.stopPropagation()}
                      >
                        <View style={styles.modalDropdownList}>
                          <ScrollView 
                            style={styles.modalScrollView}
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                          >
                            {getAvailableReferees().map((referee) => (
                              <TouchableOpacity
                                key={referee}
                                style={[
                                  styles.modalDropdownItem,
                                  refereeFilterMatch === referee && styles.activeModalDropdownItem
                                ]}
                                onPress={() => {
                                  updateRefereeFilter(referee);
                                  setShowRefereeDropdown(false);
                                }}
                              >
                                <Text style={[
                                  styles.modalDropdownItemText,
                                  refereeFilterMatch === referee && styles.activeModalDropdownItemText
                                ]}>
                                  {referee === 'All' ? 'All Referees' : referee}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      </Pressable>
                    </Pressable>
                  </Modal>
                </View>
              )}

              <View style={styles.sortOrderContainer}>
                <Text style={styles.filterSectionLabel}>Sort by Time</Text>
                <View style={styles.sortOrderButtons}>
                  <TouchableOpacity
                    style={[
                      styles.sortOrderButton,
                      sortOrder === 'desc' && styles.activeSortOrderButton
                    ]}
                    onPress={() => updateSortOrder('desc')}
                  >
                    <Text style={[
                      styles.sortOrderText,
                      sortOrder === 'desc' && styles.activeSortOrderText
                    ]}>
                      Latest First ↓
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.sortOrderButton,
                      sortOrder === 'asc' && styles.activeSortOrderButton
                    ]}
                    onPress={() => updateSortOrder('asc')}
                  >
                    <Text style={[
                      styles.sortOrderText,
                      sortOrder === 'asc' && styles.activeSortOrderText
                    ]}>
                      Earliest First ↑
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.resetLinkContainer}>
                <TouchableOpacity 
                  style={styles.resetLink}
                  onPress={() => {
                    updateGenderFilter('All');
                    updateCourtFilter('All');
                    updateRefereeFilter('All');
                    updateSortOrder('desc');
                    updateSelectedDate('');
                    setShowRefereeDropdown(false);
                    
                    // Clear all saved filters from localStorage
                    try {
                      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
                        localStorage.removeItem('matchlist-selectedDate');
                        localStorage.removeItem('matchlist-genderFilter');
                        localStorage.removeItem('matchlist-courtFilter');
                        localStorage.removeItem('matchlist-refereeFilter');
                        localStorage.removeItem('matchlist-sortOrder');
                      }
                    } catch (error) {
                      // console.warn('Failed to clear localStorage:', error);
                    }
                  }}
                >
                  <Text style={styles.resetLinkText}>
                    Reset filters
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#4A90A4" />
          <Text style={styles.loadingText}>Loading matches...</Text>
        </View>
      ) : displayMatches.length > 0 ? (
        <View style={styles.matchesList}>
          {displayMatches.map((match, index) => renderMatchCard(match, index))}
        </View>
      ) : (
        <Text style={styles.noMatchesText}>{emptyMessage}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 16,
  },
  genderFilterContainer: {
    marginBottom: 16,
  },
  genderFilterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  genderFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeGenderFilterButton: {
    backgroundColor: '#4A90A4',
    borderColor: '#4A90A4',
  },
  genderFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeGenderFilterText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filterToggleSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginVertical: 8,
    borderRadius: 8,
  },
  filterToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90A4',
    marginRight: 8,
  },
  filterToggleIcon: {
    fontSize: 12,
    color: '#4A90A4',
    fontWeight: 'bold',
  },
  expandableFiltersPanel: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    paddingBottom: 16,
    zIndex: 1000,
    elevation: 5,
  },
  courtFilterContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  courtFilterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  courtFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 4,
  },
  activeCourtFilterButton: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  courtFilterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeCourtFilterText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  refereeFilterContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  refereeFilterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  refereeFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 4,
  },
  activeRefereeFilterButton: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  refereeFilterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeRefereeFilterText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Referee Dropdown Styles
  refereeDropdownContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  filterSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  // Modal Dropdown Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDropdownContainer: {
    width: '80%',
    maxWidth: 300,
  },
  modalDropdownList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    maxHeight: 300,
    overflow: 'hidden',
  },
  modalScrollView: {
    maxHeight: 300,
  },
  modalDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activeModalDropdownItem: {
    backgroundColor: '#EFF6FF',
  },
  modalDropdownItemText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
  activeModalDropdownItemText: {
    color: '#2563EB',
    fontWeight: '600',
  },
  // Sort Order Styles
  sortOrderContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sortOrderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortOrderButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  activeSortOrderButton: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  sortOrderText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeSortOrderText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Reset Link Styles
  resetLinkContainer: {
    marginTop: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  resetLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resetLinkText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '400',
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4A90A4',
  },
  matchesList: {
    gap: 12,
  },
  noMatchesText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    paddingVertical: 20,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  genderBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  menBadge: {
    backgroundColor: '#000000',
  },
  womenBadge: {
    backgroundColor: '#000000',
  },
  genderText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  menText: {
    color: '#FFFFFF',
  },
  womenText: {
    color: '#FFFFFF',
  },
  matchTopInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leftTopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  courtInfoTop: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  timeInfoTop: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  roundInfoTop: {
    fontSize: 11,
    color: '#FF6B35',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  matchHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  teamsColumn: {
    flex: 2,
    paddingRight: 16,
    justifyContent: 'space-around',
    minHeight: 50,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  teamFlag: {
    marginRight: 8,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1B365D',
    lineHeight: 18,
    paddingVertical: 2,
    flex: 1,
  },
  winnerTeamName: {
    fontWeight: 'bold',
    color: colors.success,
  },
  scoreColumn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchScore: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
    minWidth: 24,
    textAlign: 'center',
    marginVertical: 2,
  },
  winnerScoreText: {
    fontWeight: 'bold',
    color: colors.success,
  },
  // Collapsible referee styles
  collapsibleRefereeSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  refereeToggleHeader: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
  },
  refereeToggleText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  refereesSection: {
    paddingTop: 8,
  },
  refereeContainer: {
    marginBottom: 2,
  },
  refereeText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  highlightedReferee: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    color: '#92400E',
    fontWeight: 'bold',
  },
});

export default MatchList;