import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { AssignmentStatusProvider, useAssignmentStatus } from '../hooks/useAssignmentStatus';
import NavigationHeader from '../components/navigation/NavigationHeader';
import BottomTabNavigation from '../components/navigation/BottomTabNavigation';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { TournamentCore } from '../types/tournament-v2';
import { BeachMatch } from '../types/match';
import { VisApiClient } from '../services/api/VisApiClient';
import RefereeDropdown from '../components/RefereeDropdown/RefereeDropdown';
import MatchList from '../components/MatchList/MatchList';

interface RefereeFromDB {
  No: string;
  Name: string;
  FederationCode?: string;
  Level?: string;
  isSelected?: boolean;
}

const RefereeMonitorScreenContent: React.FC = () => {
  const router = useRouter();
  const { tournamentData } = useLocalSearchParams<{ tournamentData: string }>();

  const tournament: Tournament = React.useMemo(() => {
    try {
      const parsed = JSON.parse(tournamentData || '{}') as Tournament;
      return parsed;
    } catch {
      return {} as Tournament;
    }
  }, [tournamentData]);

  const [refereeList, setRefereeList] = useState<RefereeFromDB[]>([]);
  const [loadingReferees, setLoadingReferees] = useState(false);
  const [selectedReferee, setSelectedReferee] = useState<RefereeFromDB | null>(null);
  const [refereeMatches, setRefereeMatches] = useState<BeachMatch[]>([]);
  const [loadingRefereeMatches, setLoadingRefereeMatches] = useState(false);
  const [refereeCacheKey, setRefereeCacheKey] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(true);
  const [refereeFilter, setRefereeFilter] = useState<'All' | '1' | '2'>('All');

  // Assignment status management
  const { 
    currentAssignmentStatus,
    statusCounts,
    isOnline,
    syncStatus
  } = useAssignmentStatus();

  useEffect(() => {
    if (tournament?.No) {
      // Clear cache if tournament changed
      if (refereeCacheKey && refereeCacheKey !== tournament.No) {
        console.log(`🏐 REFEREE MONITOR: Tournament changed from ${refereeCacheKey} to ${tournament.No}, clearing cache`);
        setRefereeList([]);
        setRefereeCacheKey(null);
        setSelectedReferee(null);
        setRefereeMatches([]);
      }
      loadRefereeList();
    }
  }, [tournament?.No]);

  // Load referee list for the tournament (extract from matches with caching)
  const loadRefereeList = async () => {
    if (!tournament?.No) return;
    
    // Check cache first for faster loading
    if (refereeCacheKey === tournament.No && refereeList.length > 0) {
      console.log(`🏐 REFEREE MONITOR: Using cached referee list for tournament ${tournament.No} (${refereeList.length} referees)`);
      return;
    }
    
    setLoadingReferees(true);
    try {
      console.log(`🏐 REFEREE MONITOR: Loading referees for tournament ${tournament.No}...`);
      
      // Get matches directly to extract referees
      const matches = await VisApiService.fetchMatchesDirectFromAPI(tournament.No);
      console.log(`🏐 REFEREE MONITOR: Found ${matches.length} matches for tournament ${tournament.No}`);
      
      if (matches.length === 0) {
        console.log(`🏐 REFEREE MONITOR: No matches found - tournament may not have started yet`);
        Alert.alert('No Referees Found', 'This tournament has no matches scheduled yet, so referee assignments are not available.');
        setLoadingReferees(false);
        return;
      }
      
      // Extract unique referees from matches
      const refereeMap = new Map<string, RefereeFromDB>();
      
      matches.forEach(match => {
        // Add Referee 1 if present
        if (match.NoReferee1 && match.Referee1Name) {
          refereeMap.set(match.NoReferee1, {
            No: match.NoReferee1,
            Name: match.Referee1Name,
            FederationCode: match.Referee1FederationCode,
          });
        }
        
        // Add Referee 2 if present
        if (match.NoReferee2 && match.Referee2Name) {
          refereeMap.set(match.NoReferee2, {
            No: match.NoReferee2,
            Name: match.Referee2Name,
            FederationCode: match.Referee2FederationCode,
          });
        }
      });
      
      // Convert to array and sort by name
      const referees = Array.from(refereeMap.values()).sort((a, b) => a.Name.localeCompare(b.Name));
      
      setRefereeList(referees);
      setRefereeCacheKey(tournament.No); // Cache this result
      console.log(`🏐 REFEREE MONITOR: Extracted and cached ${referees.length} unique referees:`, referees.map(r => r.Name));
      
    } catch (error) {
      console.error('Failed to load referees:', error);
      Alert.alert('Error', 'Failed to load referee list');
    } finally {
      setLoadingReferees(false);
    }
  };

  // Load matches for selected referee (same logic as RefereeSettingsScreen)
  const loadRefereeMatches = async (referee: RefereeFromDB) => {
    if (!tournament?.No) return;
    
    setLoadingRefereeMatches(true);
    try {
      let allMatches: BeachMatch[] = [];
      
      // Load matches from merged tournaments or single tournament
      const mergedTournaments = (tournament as any)._mergedTournaments || [];
      
      if (mergedTournaments.length > 1) {
        // Load from merged tournaments
        for (const mergedTournament of mergedTournaments) {
          try {
            const matches = await VisApiService.getBeachMatchList(mergedTournament.No);
            const gender = VisApiService.extractGenderFromCode(mergedTournament.Code);
            
            const matchesWithMeta = matches.map(match => ({
              ...match,
              tournamentGender: gender,
              tournamentNo: mergedTournament.No,
              tournamentCode: mergedTournament.Code,
              tournamentName: mergedTournament.Name,
            }));
            
            allMatches = [...allMatches, ...matchesWithMeta];
          } catch (error) {
            console.warn(`Failed to load referee matches for ${mergedTournament.Name}:`, error);
          }
        }
      } else {
        // Single tournament
        const matches = await VisApiService.getBeachMatchList(tournament.No);
        const gender = tournament.Code ? VisApiService.extractGenderFromCode(tournament.Code) : 'Unknown';
        
        const matchesWithMeta = matches.map(match => ({
          ...match,
          tournamentGender: gender,
          tournamentNo: tournament.No,
          tournamentCode: tournament.Code,
        }));
        
        allMatches = [...matchesWithMeta];
      }
      
      // Filter matches by referee
      const refereeName = referee.Name;
      const refereeMatches = allMatches.filter(match => 
        match.Referee1Name?.includes(refereeName) || 
        match.Referee2Name?.includes(refereeName)
      );
      
      // Sort matches by date and time
      const sortedMatches = refereeMatches.sort((a, b) => {
        const dateA = new Date(`${a.Date || ''} ${a.LocalTime || ''}`);
        const dateB = new Date(`${b.Date || ''} ${b.LocalTime || ''}`);
        return dateA.getTime() - dateB.getTime();
      });

      setRefereeMatches(sortedMatches);
      
      console.log(`🏐 REFEREE MONITOR: Loaded ${sortedMatches.length} matches for ${referee.Name}`);

    } catch (error) {
      console.error(`Error loading referee matches for ${referee.Name}:`, error);
      Alert.alert('Error', 'Failed to load referee matches');
    } finally {
      setLoadingRefereeMatches(false);
    }
  };

  // Handle referee selection
  const handleRefereeSelect = (referee: RefereeFromDB | null) => {
    if (referee) {
      setSelectedReferee(referee);
      setShowDropdown(false);
      loadRefereeMatches(referee);
    } else {
      setSelectedReferee(null);
      setRefereeMatches([]);
      setShowDropdown(true);
    }
  };

  // Handle edit button press (show dropdown again)
  const handleEditReferee = () => {
    setShowDropdown(true);
  };

  // Filter matches by referee position (1° or 2°)
  const getFilteredRefereeMatches = () => {
    if (!selectedReferee) return refereeMatches;
    
    if (refereeFilter === '1') {
      return refereeMatches.filter(match => match.Referee1Name?.includes(selectedReferee.Name));
    } else if (refereeFilter === '2') {
      return refereeMatches.filter(match => match.Referee2Name?.includes(selectedReferee.Name));
    }
    
    return refereeMatches;
  };

  // Calculate referee match statistics
  const getRefereeStats = () => {
    const allMatches = refereeMatches.length;
    const firstRefereeMatches = refereeMatches.filter(match => match.Referee1Name?.includes(selectedReferee?.Name || '')).length;
    const secondRefereeMatches = refereeMatches.filter(match => match.Referee2Name?.includes(selectedReferee?.Name || '')).length;
    
    return { allMatches, firstRefereeMatches, secondRefereeMatches };
  };



  return (
    <View style={styles.container}>
      <NavigationHeader
        title={selectedReferee && !showDropdown ? selectedReferee.Name : "Referee Monitor"}
        showBackButton={false}
        showStatusBar={false}
        rightComponent={
          selectedReferee && !showDropdown ? (
            <TouchableOpacity 
              style={styles.editButton}
              onPress={handleEditReferee}
            >
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        {/* Referee Dropdown - shown only when selecting */}
        {showDropdown && (
          <View style={styles.refereeSelectionSection}>
            <RefereeDropdown
              referees={refereeList}
              selectedReferee={selectedReferee}
              onRefereeSelect={handleRefereeSelect}
              loading={loadingReferees}
              placeholder="Select a referee..."
              emptyMessage="No referees available"
            />
          </View>
        )}

        {/* Match List with integrated filters - shown when referee is selected */}
        {selectedReferee && !showDropdown && (
          <MatchList
            matches={getFilteredRefereeMatches()}
            loading={loadingRefereeMatches}
            title=""
            selectedReferee={selectedReferee}
            emptyMessage="No matches found for selected referee"
            showDateNavigator={true}
            showGenderFilter={true}
            showStatsInFilter={true}
            showCourtFilter={true}
            customFilters={(
              <View style={styles.refereeFiltersSection}>
                <View style={styles.refereeFilterButtons}>
                  {(['All', '1', '2'] as const).map((filter) => {
                    const { allMatches, firstRefereeMatches, secondRefereeMatches } = getRefereeStats();
                    const count = filter === 'All' ? allMatches : filter === '1' ? firstRefereeMatches : secondRefereeMatches;
                    const label = filter === 'All' ? `All (${count})` : `${filter}° (${count})`;
                    
                    return (
                      <TouchableOpacity
                        key={filter}
                        style={[
                          styles.refereeFilterButton,
                          refereeFilter === filter && styles.activeRefereeFilterButton
                        ]}
                        onPress={() => setRefereeFilter(filter)}
                      >
                        <Text style={[
                          styles.refereeFilterText,
                          refereeFilter === filter && styles.activeRefereeFilterText
                        ]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          />
        )}

      </ScrollView>

      <BottomTabNavigation 
        currentTab="monitor" 
        onTabPress={(tab) => {
          if (tab === 'details' && tournament) {
            router.push({
              pathname: '/tournament-detail',
              params: { tournamentData: JSON.stringify(tournament) }
            });
          } else if (tab === 'monitor') {
            router.push({
              pathname: '/schedule-results',
              params: { tournamentData: JSON.stringify(tournament) }
            });
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  refereeSelectionSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A90A4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  editIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  // Referee Filters Section
  refereeFiltersSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 8,
  },
  refereeFilterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  refereeFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeRefereeFilterButton: {
    backgroundColor: '#2E8B57',
    borderColor: '#2E8B57',
  },
  refereeFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeRefereeFilterText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

const RefereeMonitorScreen: React.FC = () => {
  return (
    <AssignmentStatusProvider>
      <RefereeMonitorScreenContent />
    </AssignmentStatusProvider>
  );
};

export default RefereeMonitorScreen;