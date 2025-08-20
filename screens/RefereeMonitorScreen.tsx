import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { AssignmentStatusProvider, useAssignmentStatus } from '../hooks/useAssignmentStatus';
import NavigationHeader from '../components/navigation/NavigationHeader';
import BottomTabNavigation from '../components/navigation/BottomTabNavigation';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Tournament } from '../types/tournament';
import { BeachMatch } from '../types/match';
import { VisApiService } from '../services/visApi';
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
      loadRefereeMatches(referee);
    } else {
      setSelectedReferee(null);
      setRefereeMatches([]);
    }
  };


  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Referee Monitor"
        showBackButton={false}
        showStatusBar={false}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        {/* Referee Dropdown */}
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

        {/* Match List with Date Navigator */}
        {selectedReferee && (
          <MatchList
            matches={refereeMatches}
            loading={loadingRefereeMatches}
            title={`${selectedReferee.Name}'s Matches`}
            selectedReferee={selectedReferee}
            emptyMessage="No matches found for selected referee"
            showDateNavigator={true}
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
              pathname: '/tools-selection',
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
});

const RefereeMonitorScreen: React.FC = () => {
  return (
    <AssignmentStatusProvider>
      <RefereeMonitorScreenContent />
    </AssignmentStatusProvider>
  );
};

export default RefereeMonitorScreen;