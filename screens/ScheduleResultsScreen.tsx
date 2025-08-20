import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { VisApiService } from '../services/visApi';
import { BeachMatch } from '../types/match';
import { Tournament } from '../types/tournament';
import { AssignmentStatusProvider, useAssignmentStatus } from '../hooks/useAssignmentStatus';
import NavigationHeader from '../components/navigation/NavigationHeader';
import BottomTabNavigation from '../components/navigation/BottomTabNavigation';
import MatchList from '../components/MatchList/MatchList';

const ScheduleResultsScreenContent: React.FC = () => {
  const router = useRouter();
  const { tournamentData } = useLocalSearchParams<{ tournamentData: string }>();

  // Parse tournament data from route params
  const tournament: Tournament = React.useMemo(() => {
    try {
      const parsed = JSON.parse(tournamentData || '{}') as Tournament;
      const merged = (parsed as any)._mergedTournaments;
      return parsed;
    } catch {
      return {} as Tournament;
    }
  }, [tournamentData]);

  const [allMatches, setAllMatches] = useState<BeachMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);

  // Assignment status management
  const { 
    currentAssignmentStatus,
    statusCounts,
    isOnline,
    syncStatus
  } = useAssignmentStatus();

  useEffect(() => {
    if (tournament?.No) {
      loadAllMatches();
    } else {
      // No tournament, stop loading
      setLoadingMatches(false);
    }
  }, [tournament?.No]);

  // Load all matches for the tournament (same logic as other screens)
  const loadAllMatches = async () => {
    if (!tournament?.No) return;
    
    setLoadingMatches(true);
    try {
      let allTournamentMatches: BeachMatch[] = [];
      
      // Check if this tournament has merged tournaments from the tournament detail screen
      const mergedTournaments = (tournament as any)._mergedTournaments || [];
      
      console.log(`🏐 SCHEDULE/RESULTS: Loading matches for ${mergedTournaments.length > 0 ? 'merged' : 'single'} tournament`);
      
      // Helper function to infer country from tournament name
      function inferCountryFromName(name?: string): string | undefined {
        if (!name) return undefined;
        const nameLower = name.toLowerCase();
        
        if (nameLower.includes('dusseldorf') || nameLower.includes('düsseldorf')) return 'Germany';
        if (nameLower.includes('hamburg') || nameLower.includes('berlin') || nameLower.includes('munich')) return 'Germany';
        if (nameLower.includes('rome') || nameLower.includes('roma') || nameLower.includes('italy')) return 'Italy';
        if (nameLower.includes('paris') || nameLower.includes('france')) return 'France';
        if (nameLower.includes('madrid') || nameLower.includes('spain')) return 'Spain';
        if (nameLower.includes('vienna') || nameLower.includes('austria')) return 'Austria';
        if (nameLower.includes('doha') || nameLower.includes('qatar')) return 'Qatar';
        if (nameLower.includes('tokyo') || nameLower.includes('japan')) return 'Japan';
        if (nameLower.includes('sydney') || nameLower.includes('australia')) return 'Australia';
        if (nameLower.includes('toronto') || nameLower.includes('vancouver') || nameLower.includes('canada')) return 'Canada';
        if (nameLower.includes('brazil') || nameLower.includes('rio') || nameLower.includes('sao paulo')) return 'Brazil';
        
        return undefined;
      }
      
      if (mergedTournaments.length > 1) {
        console.log(`🏐 SCHEDULE/RESULTS: ${mergedTournaments.length} tournaments from merged data`);
        
        // Load matches from all merged tournaments
        for (const mergedTournament of mergedTournaments) {
          try {
            const matches = await VisApiService.getBeachMatchList(mergedTournament.No);
            const gender = VisApiService.extractGenderFromCode(mergedTournament.Code);
            const inferredCountry = inferCountryFromName(mergedTournament.Name);
            
            // Add metadata to matches
            const matchesWithMeta = matches.map(match => ({
              ...match,
              tournamentGender: gender,
              tournamentNo: mergedTournament.No,
              tournamentCode: mergedTournament.Code,
              tournamentName: mergedTournament.Name,
              tournamentCountry: tournament?.Country || tournament?.CountryName || inferredCountry
            }));
            
            allTournamentMatches = [...allTournamentMatches, ...matchesWithMeta];
            console.log(`🏐 SCHEDULE/RESULTS: ${matches.length} matches (${gender}) from ${mergedTournament.Name}`);
          } catch (error) {
            console.warn(`Failed to load matches for ${mergedTournament.Name}:`, error);
          }
        }
      } else {
        // Single tournament
        console.log(`🏐 SCHEDULE/RESULTS: Using single tournament method`);
        
        const currentMatches = await VisApiService.getBeachMatchList(tournament.No);
        const currentGender = tournament.Code ? VisApiService.extractGenderFromCode(tournament.Code) : 'Unknown';
        const inferredCountry = inferCountryFromName(tournament.Name);
      
        const currentMatchesWithMeta = currentMatches.map(match => ({
          ...match,
          tournamentGender: currentGender,
          tournamentNo: tournament.No,
          tournamentCode: tournament.Code,
          tournamentCountry: tournament.Country || tournament.CountryName || inferredCountry
        }));
        
        allTournamentMatches = [...currentMatchesWithMeta];
        
        // Find related tournaments (men's/women's versions)
        if (tournament.Code) {
          try {
            const relatedTournaments = await VisApiService.findRelatedTournaments(tournament);
            for (const relatedTournament of relatedTournaments) {
              if (relatedTournament.No !== tournament.No) {
                try {
                  const relatedMatches = await VisApiService.getBeachMatchList(relatedTournament.No);
                  const relatedGender = VisApiService.extractGenderFromCode(relatedTournament.Code);
                  
                  const relatedMatchesWithMeta = relatedMatches.map(match => ({
                    ...match,
                    tournamentGender: relatedGender,
                    tournamentNo: relatedTournament.No,
                    tournamentCode: relatedTournament.Code,
                    tournamentCountry: relatedTournament.Country || relatedTournament.CountryName || inferCountryFromName(relatedTournament.Name)
                  }));
                  
                  allTournamentMatches = [...allTournamentMatches, ...relatedMatchesWithMeta];
                } catch (relatedError) {
                  // Silent error handling
                }
              }
            }
          } catch (relatedError) {
            console.warn('Failed to find related tournaments:', relatedError);
          }
        }
      }
      
      // Sort matches by date and time
      const sortedMatches = allTournamentMatches.sort((a, b) => {
        const dateA = new Date(`${a.LocalDate || a.Date || ''} ${a.LocalTime || a.Time || ''}`);
        const dateB = new Date(`${b.LocalDate || b.Date || ''} ${b.LocalTime || b.Time || ''}`);
        return dateA.getTime() - dateB.getTime();
      });
      
      console.log(`🏐 SCHEDULE/RESULTS: Loaded ${sortedMatches.length} total matches`);
      setAllMatches(sortedMatches);
      
    } catch (error) {
      console.error('Failed to load matches:', error);
      Alert.alert('Error', 'Failed to load tournament matches');
    } finally {
      setLoadingMatches(false);
    }
  };

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Schedule/Results"
        showBackButton={false}
        showStatusBar={false}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Unified Match List with All Filters */}
        <MatchList
          matches={allMatches}
          loading={loadingMatches}
          title=""
          emptyMessage="No matches found"
        />
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
            // Already on schedule/results page, do nothing
            return;
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
});

const ScheduleResultsScreen: React.FC = () => {
  return (
    <AssignmentStatusProvider>
      <ScheduleResultsScreenContent />
    </AssignmentStatusProvider>
  );
};

export default ScheduleResultsScreen;