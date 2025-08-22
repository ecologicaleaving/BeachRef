import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../theme/tokens';
import { VisApiClient } from '../services/api/VisApiClient';
import { BeachMatch } from '../types/match';
import { TournamentCore } from '../types/tournament-v2';
import { AssignmentStatusProvider, useAssignmentStatus } from '../hooks/useAssignmentStatus';
import NavigationHeader from '../components/navigation/NavigationHeader';
import BottomTabNavigation from '../components/navigation/BottomTabNavigation';
import { designTokens } from '../theme/tokens';
import MatchList from '../components/MatchList/MatchList';

const CourtMonitorScreenContent: React.FC = () => {
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

  const [availableCourts, setAvailableCourts] = useState<string[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<string>('All Courts');
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [courtMatches, setCourtMatches] = useState<BeachMatch[]>([]);
  const [loadingCourtMatches, setLoadingCourtMatches] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Assignment status management
  const { 
    currentAssignmentStatus,
    statusCounts,
    isOnline,
    syncStatus
  } = useAssignmentStatus();

  useEffect(() => {
    if (tournament?.No) {
      loadAvailableCourts();
      loadCourtMatches();
    }
  }, [tournament?.No]);

  useEffect(() => {
    if (selectedCourt) {
      loadCourtMatches();
    }
  }, [selectedCourt]);

  // Load available courts for the tournament
  const loadAvailableCourts = async () => {
    if (!tournament?.No) return;
    
    setLoadingCourts(true);
    try {
      const matches = await VisApiService.getBeachMatchList(tournament.No);
      const courts = [...new Set(matches.map(match => match.Court).filter(Boolean))].sort();
      setAvailableCourts(['All Courts', ...courts]);
      // console.log(`🏐 COURT MONITOR: Found ${courts.length} courts:`, courts);
    } catch (error) {
      // console.error('Failed to load courts:', error);
      Alert.alert('Error', 'Failed to load available courts');
    } finally {
      setLoadingCourts(false);
    }
  };

  // Load court matches based on selected court (same logic as RefereeSettingsScreen)
  const loadCourtMatches = async () => {
    if (!tournament?.No) return;
    
    setLoadingCourtMatches(true);
    try {
      let allTournamentMatches: BeachMatch[] = [];
      
      // Check if this tournament has merged tournaments from the tournament detail screen
      const mergedTournaments = (tournament as any)._mergedTournaments || [];
      
      // console.log(`🏐 COURT MONITOR MATCHES: Loading matches for ${mergedTournaments.length > 0 ? 'merged' : 'single'} tournament`);
      
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
        // console.log(`🏐 COURT MONITOR LOADING: ${mergedTournaments.length} tournaments from merged data`);
        
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
            // console.log(`🏐 COURT MONITOR LOADED: ${matches.length} matches (${gender}) from ${mergedTournament.Name}`);
          } catch (error) {
            // console.warn(`Failed to load court monitor matches for ${mergedTournament.Name}:`, error);
          }
        }
      } else {
        // Single tournament
        // console.log(`🏐 COURT MONITOR FALLBACK: Using single tournament method`);
        
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
            // console.warn('Failed to find related tournaments:', relatedError);
          }
        }
      }
      
      // Filter by selected court
      let filteredMatches = allTournamentMatches;
      if (selectedCourt !== 'All Courts') {
        filteredMatches = allTournamentMatches.filter(match => match.Court === selectedCourt);
      }
      
      // Sort matches by time (descending - most recent first)
      const sortedMatches = filteredMatches.sort((a, b) => {
        const timeA = a.LocalTime || '00:00';
        const timeB = b.LocalTime || '00:00';
        
        const getTimeNumber = (timeStr: string) => {
          const parts = timeStr.split(':');
          if (parts.length < 2) return 0;
          const hours = parseInt(parts[0]) || 0;
          const minutes = parseInt(parts[1]) || 0;
          return hours * 60 + minutes;
        };
        
        const timeNumA = getTimeNumber(timeA);
        const timeNumB = getTimeNumber(timeB);
        
        return timeNumB - timeNumA; // Descending
      });
      
      // console.log(`🏐 COURT MONITOR: Final result - ${sortedMatches.length} matches loaded for court "${selectedCourt}"`);
      setCourtMatches(sortedMatches);
      
      // Get unique dates and set most recent date as selected (same as Tournament Details)
      const uniqueDates = [...new Set(sortedMatches.map(match => match.LocalDate || 'Unknown Date'))].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      if (uniqueDates.length > 0 && !selectedDate) {
        const defaultDate = uniqueDates[uniqueDates.length - 1]; // Last day (most recent)
        // console.log('🗓️ Court Monitor - Setting default to most recent date:', defaultDate);
        setSelectedDate(defaultDate);
      }
      
    } catch (error) {
      // console.error('Failed to load court matches:', error);
    } finally {
      setLoadingCourtMatches(false);
    }
  };

  // Handle date change from DateNavigator
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
  };

  // Get matches for selected date
  const getMatchesForSelectedDate = () => {
    if (!selectedDate) return courtMatches.slice(0, 10);
    
    const matchesForDate = courtMatches.filter(match => {
      const matchDate = match.Date || match.LocalDate || match.MatchDate || match.StartDate;
      return matchDate === selectedDate;
    });
    
    return matchesForDate.sort((a, b) => {
      const timeA = a.LocalTime || a.Time || '00:00';
      const timeB = b.LocalTime || b.Time || '00:00';
      
      const getTimeNumber = (timeStr: string) => {
        const parts = timeStr.split(':');
        if (parts.length !== 2) return 0;
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        return hours * 60 + minutes;
      };
      
      return getTimeNumber(timeA) - getTimeNumber(timeB);
    });
  };

  // Get available dates from matches
  const getAvailableDates = () => {
    const allDates = courtMatches.map(match => 
      match.Date || match.LocalDate || match.MatchDate || match.StartDate
    ).filter(Boolean);
    return [...new Set(allDates)].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
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

  // Render match card (same style as other screens)
  const renderMatchCard = (match: BeachMatch, index: number) => {
    const teamAScore = parseInt(match.MatchPointsA || '0');
    const teamBScore = parseInt(match.MatchPointsB || '0');
    const teamAWon = teamAScore > teamBScore && teamAScore > 0;
    const teamBWon = teamBScore > teamAScore && teamBScore > 0;

    return (
      <View key={match.No || index} style={styles.matchCard}>
        {/* Gender Strip */}
        {match.tournamentGender && (
          <View style={[
            styles.genderStrip,
            match.tournamentGender === 'M' ? styles.menStrip : styles.womenStrip
          ]} />
        )}
        
        {/* Top Info */}
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
          <Text style={styles.roundInfoTop}>
            {match.Round || 'Match'}
          </Text>
        </View>
        
        {/* Teams Section */}
        <View style={styles.matchHeader}>
          <View style={styles.teamsColumn}>
            <Text 
              style={[
                styles.teamName, 
                teamAWon && styles.winnerTeamName
              ]} 
              numberOfLines={2}
            >
              {match.TeamAName || 'Team A'}
            </Text>
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
        
        {/* Referees Section */}
        {(match.Referee1Name || match.Referee2Name) && (
          <View style={styles.refereesSection}>
            {match.Referee1Name && (
              <Text style={styles.refereeText}>
                1° {match.Referee1Name}
                {match.Referee1FederationCode && ` (${match.Referee1FederationCode})`}
              </Text>
            )}
            {match.Referee2Name && (
              <Text style={styles.refereeText}>
                2° {match.Referee2Name}
                {match.Referee2FederationCode && ` (${match.Referee2FederationCode})`}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Court Monitor"
        showBackButton={false}
        showStatusBar={false}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        {/* Court Selection */}
        <View style={styles.courtSelectionSection}>
          <Text style={styles.sectionTitle}>Select Court</Text>
          {loadingCourts ? (
            <ActivityIndicator size="small" color="#4A90A4" />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.courtScrollView}>
              {availableCourts.map((court) => (
                <TouchableOpacity
                  key={court}
                  style={[
                    styles.courtButton,
                    selectedCourt === court && styles.selectedCourtButton
                  ]}
                  onPress={() => setSelectedCourt(court)}
                >
                  <Text style={[
                    styles.courtButtonText,
                    selectedCourt === court && styles.selectedCourtButtonText
                  ]}>
                    {court}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Match List with Date Navigator */}
        <MatchList
          matches={courtMatches}
          loading={loadingCourtMatches}
          title={`Matches - ${selectedCourt}`}
          emptyMessage="No matches found for selected court"
          showDateNavigator={true}
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
  courtSelectionSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 12,
  },
  courtScrollView: {
    flexDirection: 'row',
  },
  courtButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedCourtButton: {
    backgroundColor: '#4A90A4',
    borderColor: '#4A90A4',
  },
  courtButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  selectedCourtButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  matchesSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
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
  genderStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  menStrip: {
    backgroundColor: '#87CEEB',
  },
  womenStrip: {
    backgroundColor: '#FFB6C1',
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
  teamName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1B365D',
    marginBottom: 6,
    lineHeight: 18,
    paddingVertical: 2,
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
  refereesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  refereeText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
    marginBottom: 2,
  },
});

const CourtMonitorScreen: React.FC = () => {
  return (
    <AssignmentStatusProvider>
      <CourtMonitorScreenContent />
    </AssignmentStatusProvider>
  );
};

export default CourtMonitorScreen;