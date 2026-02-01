import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../theme/tokens';
import { TournamentStorageService, UserPreferences } from '../services/TournamentStorageService';
import { BeachMatch } from '../types/match';
import { AssignmentStatusProvider, useAssignmentStatus } from '../hooks/useAssignmentStatus';
import { StatusIndicator } from '../components/Status/StatusIndicator';
import NavigationHeader from '../components/navigation/NavigationHeader';
import BottomTabNavigation from '../components/navigation/BottomTabNavigation';
import { designTokens } from '../theme/tokens';
// DateNavigator and useDateNavigation completely removed

interface RefereeFromDB {
  No: string;
  Name: string;
  FederationCode?: string;
  Level?: string;
  isSelected?: boolean;
}

interface RefereeProfile {
  refereeNo: string;
  name: string;
  certificationLevel: string;
  federationCode: string;
  languages: string[];
}

const RefereeSettingsScreenContent: React.FC = () => {
  const router = useRouter();
  const { tournamentData } = useLocalSearchParams<{ tournamentData: string; autoCourtMonitor?: string }>(); // autoCourtMonitor removed (TS6133)

  // Parse tournament data from route params
  const tournament: Tournament = React.useMemo(() => {
    try {
      const parsed = JSON.parse(tournamentData || '{}') as Tournament;
      // merged variable removed (TS6133) - was: const merged = (parsed as any)._mergedTournaments;
      return parsed;
    } catch {
      return {} as Tournament;
    }
  }, [tournamentData]);
  const [profile, setProfile] = useState<RefereeProfile>({
    refereeNo: '',
    name: '',
    certificationLevel: '',
    federationCode: '',
    languages: [],
  });
  const [preferences, setPreferences] = useState<UserPreferences>({
    notificationsEnabled: true,
    onboardingCompleted: true,
  });
  const [loading, setLoading] = useState(true);
  const [refereeList, setRefereeList] = useState<RefereeFromDB[]>([]);
  const [loadingReferees, setLoadingReferees] = useState(false);
  const [showRefereeList, setShowRefereeList] = useState(false);
  const [refereeCacheKey, setRefereeCacheKey] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [availableCourts, setAvailableCourts] = useState<string[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<string>('All Courts');
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [showCourtSelection, setShowCourtSelection] = useState(false);
  const [courtMatches, setCourtMatches] = useState<BeachMatch[]>([]);
  const [loadingCourtMatches, setLoadingCourtMatches] = useState(false);
  // Date selection removed - showing all matches
  const [currentTournament, setCurrentTournament] = useState<any>(null);
  const [selectedReferee, setSelectedReferee] = useState<RefereeFromDB | null>(null);
  const [refereeMatches, setRefereeMatches] = useState<BeachMatch[]>([]);
  const [loadingRefereeMatches, setLoadingRefereeMatches] = useState(false);
  const [showRefereeMatches, setShowRefereeMatches] = useState(false);

  // Assignment status management
  const {
    currentAssignmentStatus,
    statusCounts,
    isOnline,
    syncStatus,
    refreshStatuses
  } = useAssignmentStatus(); // Removed unused: allStatuses, updateAssignmentStatus, getAssignmentsByStatus (TS6133)

  // Additional status notification preferences
  const [statusNotifications, setStatusNotifications] = useState({
    urgencyAlerts: true,
    statusChanges: true,
    offlineSync: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  // Update current tournament when route params change
  useEffect(() => {
    if (tournament.No) {
      setCurrentTournament(tournament);
      setSelectedTournament(tournament.No);
      
      // Reset monitor data when tournament changes
      setSelectedCourt('All Courts');
      setCourtMatches([]);
      setSelectedReferee(null);
      setRefereeMatches([]);
      setShowCourtSelection(false);
      setShowRefereeMatches(false);
      setAvailableCourts([]);
      setRefereeList([]);
      
      // Force reload of court matches if court selection is active
      if (showCourtSelection) {
        setTimeout(() => loadCourtMatches(), 100);
      }
    }
  }, [tournament]);

  useEffect(() => {
    if (selectedTournament) {
      loadAvailableCourts();
    }
  }, [selectedTournament]);

  useEffect(() => {
    if (selectedTournament && selectedCourt && showCourtSelection) {
      loadCourtMatches();
    }
  }, [selectedTournament, selectedCourt, showCourtSelection]);

  const loadSettings = async () => {
    try {
      // Load user preferences
      const userPrefs = await TournamentStorageService.getUserPreferences();
      setPreferences(userPrefs);
      
      // Load selected tournament (prioritize route params over storage)
      if (!tournament.No) {
        const storedTournament = await TournamentStorageService.getSelectedTournament();
        if (storedTournament) {
          setSelectedTournament(storedTournament.No);
          setCurrentTournament(storedTournament);
        }
      }
      
      // Load saved referee profile
      const savedProfile = await loadSavedRefereeProfile();
      if (savedProfile) {
        setProfile(savedProfile);
      }
    } catch (error) {
      // // console.error('Failed to load settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // Load available courts from tournament matches
  const loadAvailableCourts = async () => {
    if (!selectedTournament) return;
    
    setLoadingCourts(true);
    try {
      
      // Get matches from both current and related tournaments
      let allMatches: BeachMatch[] = [];
      
      // Load matches from current tournament
      const currentMatches = await VisApiService.getBeachMatchList(selectedTournament);
      allMatches = [...currentMatches];
      
      // Find related tournaments (men's/women's versions) and load their matches too
      const tournament = currentTournament || await TournamentStorageService.getSelectedTournament();
      if (tournament?.Code) {
        try {
          const relatedTournaments = await VisApiService.findRelatedTournaments(tournament);
          for (const relatedTournament of relatedTournaments) {
            if (relatedTournament.No !== selectedTournament) {
              try {
                const relatedMatches = await VisApiService.getBeachMatchList(relatedTournament.No);
                allMatches = [...allMatches, ...relatedMatches];
              } catch (relatedError) {
                // // console.warn(`Failed to load matches from ${relatedTournament.Code}:`, relatedError);
              }
            }
          }
        } catch (relatedError) {
          // // console.warn('Failed to find related tournaments:', relatedError);
        }
      }
      
      // Extract unique courts from matches
      const allCourts = [...new Set(
        allMatches
          .map(match => match.Court)
          .filter(court => court && court.trim() !== '')
      )];
      
      // Sort courts in specific order: CC, C1, C2, C3, C4, then others alphabetically
      const courtOrder = ['CC', 'C1', 'C2', 'C3', 'C4'];
      const courts = allCourts.sort((a, b) => {
        const aIndex = courtOrder.indexOf(a ?? '');
        const bIndex = courtOrder.indexOf(b ?? '');
        
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
      });
      
      setAvailableCourts(courts);
      
      // Extract referees from matches
      const referees = new Map<string, RefereeFromDB>();
      
      allMatches.forEach(match => {
        // Add Referee 1
        if (match.NoReferee1 && match.Referee1Name) {
          referees.set(match.NoReferee1, {
            No: match.NoReferee1,
            Name: match.Referee1Name,
            FederationCode: match.Referee1FederationCode || '',
            Level: 'International', // Default level, could be enhanced
            isSelected: false
          });
        }
        
        // Add Referee 2
        if (match.NoReferee2 && match.Referee2Name) {
          referees.set(match.NoReferee2, {
            No: match.NoReferee2,
            Name: match.Referee2Name,
            FederationCode: match.Referee2FederationCode || '',
            Level: 'International', // Default level, could be enhanced
            isSelected: false
          });
        }
      });
      
      const refereeList = Array.from(referees.values()).sort((a, b) => a.Name.localeCompare(b.Name));
      setRefereeList(refereeList);
      
    } catch (error) {
      // // console.error('Failed to load available courts:', error);
    } finally {
      setLoadingCourts(false);
    }
  };

  const loadSavedRefereeProfile = async (): Promise<RefereeProfile | null> => {
    try {
      // TODO: Load from secure storage/AsyncStorage
      // For now return null, will be implemented when referee is selected from list
      return null;
    } catch (error) {
      // // console.error('Failed to load saved referee profile:', error);
      return null;
    }
  };

  const loadRefereeList = async () => {
    if (!selectedTournament) {
      Alert.alert('Error', 'No tournament selected');
      return;
    }

    // Check cache first for faster loading
    if (refereeCacheKey === selectedTournament && refereeList.length > 0) {
      setShowRefereeList(true);
      return;
    }

    setLoadingReferees(true);
    try {
      
      // Skip tournament details call for faster loading - get matches directly
      const matches = await VisApiService.fetchMatchesDirectFromAPI(selectedTournament);
      
      if (matches.length === 0) {
        Alert.alert('No Referees Found', 'This tournament has no matches scheduled yet, so referee assignments are not available. Referees are typically assigned closer to the tournament start date.');
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
      
      const referees = Array.from(refereeMap.values()).sort((a, b) => a.Name.localeCompare(b.Name));
      
      if (referees.length === 0) {
        Alert.alert('No Referees Found', 'The matches for this tournament do not have referee assignments yet. Referees are typically assigned closer to the tournament start date.');
        setLoadingReferees(false);
        return;
      }
      
      setRefereeList(referees);
      setRefereeCacheKey(selectedTournament); // Cache the result
      setShowRefereeList(true);
    } catch (error) {
      // // console.error('Failed to load referee list:', error);
      Alert.alert('Error', 'Failed to load referee list. Please check your connection and try again.');
    } finally {
      setLoadingReferees(false);
    }
  };

  const handleSelectReferee = async (referee: RefereeFromDB) => {
    try {
      
      setSelectedReferee(referee);
      setShowRefereeList(false);
      setShowRefereeMatches(true);
      
      // Load matches for this referee
      await loadRefereeMatches(referee);
      
    } catch (error) {
      // // console.error('Failed to select referee:', error);
      Alert.alert('Error', 'Failed to load referee matches');
    }
  };

  const loadRefereeMatches = async (referee: RefereeFromDB) => {
    if (!selectedTournament) {
      return;
    }

    try {
      setLoadingRefereeMatches(true);

      // Check if this tournament has merged tournaments from the tournament detail screen
      const mergedTournaments = (tournament as any)._mergedTournaments || [];
      let allMatches: BeachMatch[] = [];
      
      if (mergedTournaments.length > 1) {
        
        // Load matches from all merged tournaments
        for (const mergedTournament of mergedTournaments) {
          try {
            const matches = await VisApiService.getBeachMatchList(mergedTournament.No);
            const gender = VisApiService.extractGenderFromCode(mergedTournament.Code);
            
            // Add metadata to matches
            const matchesWithMeta = matches.map(match => ({
              ...match,
              sourceType: 'merged',
              sourceTournament: mergedTournament.No,
              tournamentGender: gender,
              tournamentCode: mergedTournament.Code,
              tournamentName: mergedTournament.Name
            }));
            
            allMatches = [...allMatches, ...matchesWithMeta];
          } catch (error) {
            // // console.warn(`Failed to load referee matches for ${mergedTournament.Name}:`, error);
          }
        }
      } else {
        // Fallback: Get matches from single tournament (including both male and female if applicable)
        allMatches = await VisApiService.getBeachMatchList(selectedTournament);
      }
      
      // Get current tournament data to determine gender
      const currentTournamentData = currentTournament || await TournamentStorageService.getSelectedTournament();
      const currentGender = currentTournamentData?.Code ? VisApiService.extractGenderFromCode(currentTournamentData.Code) : 'Mixed';
      
      // Add source metadata to original matches
      allMatches = allMatches.map(match => ({
        ...match,
        sourceType: 'original',
        sourceTournament: selectedTournament,
        tournamentGender: currentGender
      }));
      
      // Try to load opposite gender tournament matches (robust implementation)
      try {
        const oppositeGenderTournamentNo = await findOppositeGenderTournament(selectedTournament);
        
        if (oppositeGenderTournamentNo && oppositeGenderTournamentNo !== selectedTournament) {
          try {
            const oppositeMatches = await VisApiService.getBeachMatchList(oppositeGenderTournamentNo);
            
            // Determine opposite gender
            const oppositeGender = currentGender === 'M' ? 'W' : 'M';
            
            // Add source metadata to female matches
            const oppositeMatchesWithMeta = oppositeMatches.map(match => ({
              ...match,
              sourceType: 'female',
              sourceTournament: oppositeGenderTournamentNo,
              tournamentGender: oppositeGender
            }));
            
            allMatches = [...allMatches, ...oppositeMatchesWithMeta];
          } catch (oppositeMatchError) {
          }
        } else {
        }
      } catch (genderSearchError) {
      }

      // Debug: Show sample match referee fields and gender info (unused variables removed - TS6133)
      if (allMatches.length > 0) {
        //   Referee: allMatches[0].Referee,
        //   Referee1: sampleMatch.Referee1,
        //   Referee2: sampleMatch.Referee2,
        //   Referee1Name: sampleMatch.Referee1Name,
        //   Referee2Name: sampleMatch.Referee2Name,
        //   Referee1No: sampleMatch.Referee1No,
        //   Referee2No: sampleMatch.Referee2No,
        //   allFields: Object.keys(sampleMatch).filter(key => key.toLowerCase().includes('ref'))
        // });
        
        // Debug gender information
        //   matchNo: match.No,
        //   teams: `${match.TeamAName} vs ${match.TeamBName}`,
        //   tournamentGender: match.tournamentGender,
        //   genderFields: Object.keys(match).filter(key => key.toLowerCase().includes('gender'))
        // })));
      }

      // Debug the referee we're looking for
      //   name: referee.Name,
      //   no: referee.No,
      //   federationCode: referee.FederationCode
      // });

      // Filter matches where this referee is assigned
      const refereeMatches = allMatches.filter((match, index) => {
        // Check multiple referee field variations
        const referee1Match = match.Referee1 && match.Referee1.includes(referee.Name);
        const referee2Match = match.Referee2 && match.Referee2.includes(referee.Name);
        const generalRefereeMatch = match.Referee && match.Referee.includes(referee.Name);
        const referee1NameMatch = match.Referee1Name && match.Referee1Name.includes(referee.Name);
        const referee2NameMatch = match.Referee2Name && match.Referee2Name.includes(referee.Name);
        
        // Also check by referee number
        const referee1NoMatch = match.Referee1No && match.Referee1No === referee.No;
        const referee2NoMatch = match.Referee2No && match.Referee2No === referee.No;
        
        // Also try partial name matches (surname only)
        const refereeNameParts = referee.Name.split(' ');
        const surname = refereeNameParts[refereeNameParts.length - 1];
        const surnameMatch1 = match.Referee1Name && match.Referee1Name.includes(surname ?? '');
        const surnameMatch2 = match.Referee2Name && match.Referee2Name.includes(surname ?? '');
        
        const isAssigned = referee1Match || referee2Match || generalRefereeMatch || 
                          referee1NameMatch || referee2NameMatch || 
                          referee1NoMatch || referee2NoMatch ||
                          surnameMatch1 || surnameMatch2;
        
        // Debug first few matches regardless of assignment
        if (index < 3) {
          //   teams: `${match.TeamAName} vs ${match.TeamBName}`,
          //   referee1: match.Referee1,
          //   referee2: match.Referee2,
          //   referee1Name: match.Referee1Name,
          //   referee2Name: match.Referee2Name,
          //   referee1No: match.Referee1No,
          //   referee2No: match.Referee2No,
          //   isAssigned: isAssigned,
          //   matchedBy: {
          //     referee1Match,
          //     referee2Match,
          //     generalRefereeMatch,
          //     referee1NameMatch,
          //     referee2NameMatch,
          //     referee1NoMatch,
          //     referee2NoMatch,
          //     surnameMatch1,
          //     surnameMatch2
          //   }
          // });
        }
        
        if (isAssigned) {
        }
        
        return isAssigned;
      });

      
      // DEBUG MODE: If no matches found, show debugging info and all matches temporarily (unused variables removed - TS6133)
      if (refereeMatches.length === 0 && allMatches.length > 0) {
        
        // Show referee name variations for debugging
        const refereeNameParts = referee.Name.split(' ');
        const surname = refereeNameParts[refereeNameParts.length - 1];
        //   fullName: referee.Name,
        //   surname: surname,
        //   parts: refereeNameParts
        // });
        
        // Check all referee fields in all matches
        const allRefereeNames = new Set();
        allMatches.forEach(match => {
          if (match.Referee1Name) allRefereeNames.add(match.Referee1Name);
          if (match.Referee2Name) allRefereeNames.add(match.Referee2Name);
          if (match.Referee1) allRefereeNames.add(match.Referee1);
          if (match.Referee2) allRefereeNames.add(match.Referee2);
          if (match.Referee) allRefereeNames.add(match.Referee);
        });

        // TEMPORARY: Show all matches for debugging (similarNames removed - TS6133)
        setRefereeMatches(allMatches); // Show all matches for debugging
        
        // Set default to last day of tournament using multiple date field fallbacks
        const allDates = allMatches.map(match => 
          match.Date || match.LocalDate || match.MatchDate || match.StartDate
        ).filter(Boolean);
        const sortedDates = [...new Set(allDates)].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        if (sortedDates.length > 0) {
          setSelectedDate(sortedDates[sortedDates.length - 1]); // Last day of tournament as default (highest date)
        }
        return;
      }
      
      // Sort matches by date and time
      const sortedMatches = refereeMatches.sort((a, b) => {
        const dateA = new Date(`${a.Date || ''} ${a.LocalTime || ''}`);
        const dateB = new Date(`${b.Date || ''} ${b.LocalTime || ''}`);
        return dateA.getTime() - dateB.getTime();
      });

      setRefereeMatches(sortedMatches);
      
      // Set default to last day of tournament
      const uniqueDates = [...new Set(sortedMatches.map(match => match.Date))].filter(Boolean);
      const sortedDatesAsc = uniqueDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      if (sortedDatesAsc.length > 0) {
        setSelectedDate(sortedDatesAsc[sortedDatesAsc.length - 1]); // Last day of tournament as default (highest date)
      }

    } catch (error) {
      // // console.error(`Error loading referee matches for ${referee.Name}:`, error);
      Alert.alert('Error', 'Failed to load referee matches');
    } finally {
      setLoadingRefereeMatches(false);
    }
  };

  const findOppositeGenderTournament = async (tournamentNo: string): Promise<string | null> => {
    try {
      
      // Get all tournaments from API
      const tournaments = await VisApiService.fetchDirectFromAPI();
      
      const currentTournament = tournaments.find(t => t.No === tournamentNo);
      
      if (!currentTournament || !currentTournament.Code) {
        return null;
      }
      
      const currentCode = currentTournament.Code;
      
      // Try to find opposite gender tournament by transforming the code
      let oppositeCode: string | null = null;
      
      if (currentCode.startsWith('M')) {
        oppositeCode = 'W' + currentCode.substring(1);
      } else if (currentCode.startsWith('W')) {
        oppositeCode = 'M' + currentCode.substring(1);
      } else {
        // Try both M and W prefixes for tournaments without gender prefix
        const maleCode = 'M' + currentCode;
        const femaleCode = 'W' + currentCode;
        
        
        const maleTournament = tournaments.find(t => t.Code === maleCode);
        const femaleTournament = tournaments.find(t => t.Code === femaleCode);
        
        // Return the one that's different from current
        if (maleTournament && maleTournament.No !== tournamentNo) {
          return maleTournament.No;
        }
        if (femaleTournament && femaleTournament.No !== tournamentNo) {
          return femaleTournament.No;
        }
        
        return null;
      }
      
      // Look for the opposite gender tournament
      if (oppositeCode) {
        const oppositeTournament = tournaments.find(t => t.Code === oppositeCode);
        if (oppositeTournament) {
          return oppositeTournament.No;
        } else {
        }
      }
      
      return null;
      
    } catch (error) {
      // // console.error('Error finding opposite gender tournament:', error);
      return null;
    }
  };

  const renderMatchItem = (match: BeachMatch, index: number) => {
    // Winner determination logic
    const teamAScore = parseInt(match.MatchPointsA || '0');
    const teamBScore = parseInt(match.MatchPointsB || '0');
    const teamAWon = teamAScore > teamBScore && teamAScore > 0;
    const teamBWon = teamBScore > teamAScore && teamBScore > 0;

    return (
      <View key={match.No || index} style={styles.courtMatchCard}>
        {/* Gender Strip */}
        {match.tournamentGender && (
          <View style={[
            styles.genderStrip,
            match.tournamentGender === 'M' ? styles.menStrip : styles.womenStrip
          ]} />
        )}
        
        {/* Teams Section - at the top */}
        <View style={styles.matchTeamsHeader}>
          <View style={styles.teamsOnlyColumn}>
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
        
        {/* Court, Time and Duration Section */}
        <View style={styles.matchInfoRow}>
          <View style={styles.leftInfoGroup}>
            {match.Court && (
              <Text style={styles.courtInfoMiddle}>
                {match.Court === 'CC' ? 'CC' : `C${match.Court}`}
              </Text>
            )}
            {match.LocalTime && (
              <Text style={styles.timeInfoMiddle}>
                {match.LocalTime.substring(0, 5)}
              </Text>
            )}
          </View>
          <Text style={styles.durationInfoMiddle}>
            {getMatchDuration(match)}
          </Text>
        </View>
        
        {/* Referees Section - at the bottom */}
        {(match.Referee1Name || match.Referee2Name) && (
          <View style={styles.refereesSection}>
            {match.Referee1Name && (
              <Text style={selectedReferee?.Name === match.Referee1Name ? styles.selectedRefereeHighlight : styles.refereeText}>
                1° {match.Referee1Name}
                {match.Referee1FederationCode && ` (${match.Referee1FederationCode})`}
              </Text>
            )}
            {match.Referee2Name && (
              <Text style={selectedReferee?.Name === match.Referee2Name ? styles.selectedRefereeHighlight : styles.refereeText}>
                2° {match.Referee2Name}
                {match.Referee2FederationCode && ` (${match.Referee2FederationCode})`}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const handleSaveProfile = async () => {
    try {
      // TODO: Save referee profile to storage/API
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      // // console.error('Failed to save profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    try {
      await TournamentStorageService.updatePreference('notificationsEnabled', enabled);
      setPreferences(prev => ({ ...prev, notificationsEnabled: enabled }));
    } catch (error) {
      // // console.error('Failed to update notification setting:', error);
      Alert.alert('Error', 'Failed to update notification setting');
    }
  };

  // Handle status notification preferences
  const handleToggleStatusNotification = (type: keyof typeof statusNotifications, enabled: boolean) => {
    setStatusNotifications(prev => ({ ...prev, [type]: enabled }));
    // TODO: Save to storage or sync with assignment status service
  };

  // Handle status bar press
  const handleStatusPress = () => {
    if (currentAssignmentStatus) {
      router.push('/my-assignments');
    }
  };

  // Render main monitor options
  const renderMonitorOptions = () => {
    return (
      <View style={styles.monitorContainer}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Tournament Monitor</Text>
          <Text style={styles.welcomeSubtitle}>Choose your monitoring mode</Text>
        </View>
        
        <View style={styles.optionsContainer}>
          {/* Court Monitor Card */}
          <TouchableOpacity 
            style={styles.monitorCard}
            onPress={() => handleCourtMonitor()}
          >
            <View style={styles.cardIcon}>
              <Text style={styles.iconText}>🏐</Text>
            </View>
            <Text style={styles.cardTitle}>Court Monitor</Text>
            <Text style={styles.cardDescription}>
              Select and monitor a specific court's matches and assignments
            </Text>
            <View style={styles.cardArrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>
          
          {/* Referee Monitor Card */}
          <TouchableOpacity 
            style={styles.monitorCard}
            onPress={() => handleRefereeMonitor()}
          >
            <View style={styles.cardIcon}>
              <Text style={styles.iconText}>👥</Text>
            </View>
            <Text style={styles.cardTitle}>Referee Monitor</Text>
            <Text style={styles.cardDescription}>
              Select and monitor a specific referee's assignments and matches
            </Text>
            <View style={styles.cardArrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handleCourtMonitor = () => {
    // Navigate to court selection view within the same screen
    setShowCourtSelection(true);
    // Load courts and matches when entering court monitor
    if (selectedTournament) {
      loadAvailableCourts();
    }
  };

  const handleRefereeMonitor = () => {
    // Load and show referee selection page
    
    // Check if we already have cached referees for this tournament
    if (refereeCacheKey === selectedTournament && refereeList.length > 0) {
      setShowRefereeList(true);
    } else {
      setShowRefereeList(true);
      loadRefereeList();
    }
  };

  // Load court matches based on selected court
  const loadCourtMatches = async () => {
    if (!selectedTournament) return;
    
    
    setLoadingCourtMatches(true);
    try {
      let allTournamentMatches: BeachMatch[] = [];
      
      // Check if this tournament has merged tournaments from the tournament detail screen
      const mergedTournaments = (tournament as any)._mergedTournaments || [];
      const currentTournamentData = currentTournament || await TournamentStorageService.getSelectedTournament();
      
      
      if (mergedTournaments.length > 1) {
        
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
              tournamentCountry: currentTournamentData?.Country || currentTournamentData?.CountryName || inferredCountry
            }));
            
            allTournamentMatches = [...allTournamentMatches, ...matchesWithMeta];
          } catch (error) {
            // // console.warn(`Failed to load court matches for ${mergedTournament.Name}:`, error);
          }
        }
      } else {
        // Fallback: Load matches from current tournament using old method
        
        const currentMatches = await VisApiService.getBeachMatchList(selectedTournament);
        const currentGender = currentTournamentData?.Code ? VisApiService.extractGenderFromCode(currentTournamentData.Code) : 'Unknown';
        
        // Add metadata to current tournament matches
        const inferredCountry = inferCountryFromName(currentTournamentData?.Name);
      
        const currentMatchesWithMeta = currentMatches.map(match => ({
          ...match,
          tournamentGender: currentGender,
          tournamentNo: selectedTournament,
          tournamentCode: currentTournamentData?.Code,
          tournamentCountry: currentTournamentData?.Country || currentTournamentData?.CountryName || inferredCountry
        }));
        
        allTournamentMatches = [...currentMatchesWithMeta];
        
        // Find related tournaments (men's/women's versions) - fallback method
        if (currentTournamentData?.Code) {
          try {
            const relatedTournaments = await VisApiService.findRelatedTournaments(currentTournamentData);
            // Load matches from related tournaments (excluding current one)
            for (const relatedTournament of relatedTournaments) {
              if (relatedTournament.No !== selectedTournament) {
                try {
                  const relatedMatches = await VisApiService.getBeachMatchList(relatedTournament.No);
                  const relatedGender = VisApiService.extractGenderFromCode(relatedTournament.Code);
                  
                  // Add metadata to related tournament matches
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
            // // console.warn('Failed to find related tournaments:', relatedError);
          }
        }
      }
      
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
      
      // Filter by selected court if not 'All Courts'
      let filteredMatches = allTournamentMatches;
      if (selectedCourt !== 'All Courts') {
        filteredMatches = allTournamentMatches.filter(match => match.Court === selectedCourt);
      }
      
      // Sort matches ONLY by time (descending - most recent first)
      const sortedMatches = filteredMatches.sort((a, b) => {
        const timeA = a.LocalTime || '00:00';
        const timeB = b.LocalTime || '00:00';
        
        // Convert time strings (HH:MM) to comparable numbers
        const getTimeNumber = (timeStr: string) => {
          const parts = timeStr.split(':');
          if (parts.length < 2) return 0;
          const hours = parseInt(parts[0] ?? '0') || 0;
          const minutes = parseInt(parts[1] ?? '0') || 0;
          return hours * 60 + minutes;
        };
        
        const timeNumA = getTimeNumber(timeA);
        const timeNumB = getTimeNumber(timeB);
        
        // Descending: 17:00 (1020) before 12:00 (720)
        return timeNumB - timeNumA;
      });
      
      
      setCourtMatches(sortedMatches);
      
      // Debug logging removed
      
      // Match data ready
      
      // Get unique dates and set most recent date as selected (same as Tournament Details)
      const uniqueDates = [...new Set(sortedMatches.map(match => match.LocalDate || 'Unknown Date'))].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      if (uniqueDates.length > 0 && !selectedDate) {
        const defaultDate = uniqueDates[uniqueDates.length - 1]; // Last day (most recent)
        setSelectedDate(defaultDate);
      }
      
    } catch (error) {
      // // console.error('Failed to load court matches:', error);
    } finally {
      setLoadingCourtMatches(false);
    }
  };

  // Get unique dates for court matches
  const getCourtUniqueDates = () => {
    return [...new Set(courtMatches.map(match => match.LocalDate || 'Unknown Date'))];
  };

  // Format match date for referee matches
  const formatMatchDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'Unknown Date') return dateStr;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Date navigation functions
  const getAvailableDates = () => {
    if (showCourtSelection) {
      // For court monitor
      const courtDates = getCourtUniqueDates();
      return courtDates;
    } else {
      // For referee monitor
      const allDates = refereeMatches.map(match => 
        match.Date || match.LocalDate || match.MatchDate || match.StartDate
      ).filter(Boolean);
      const sortedDates = [...new Set(allDates)].sort((a, b) => new Date(a).getTime() - new Date(b).getTime()); // Ascending order for proper navigation
      return sortedDates;
    }
  };

  const getCurrentDateIndex = () => {
    const dates = getAvailableDates();
    if (!selectedDate) return -1;
    return dates.indexOf(selectedDate);
  };

  const navigateToDate = (direction: 'prev' | 'next') => {
    const dates = getAvailableDates();
    const currentIndex = getCurrentDateIndex();
    
    if (currentIndex === -1) {
      // No date selected, select the last day (most recent in the tournament)
      if (dates.length > 0) {
        const defaultDate = dates[dates.length - 1];
        setSelectedDate(defaultDate);
      }
      return;
    }

    let newIndex;
    if (direction === 'prev') {
      // Prev = go to older dates (lower index, earlier in time)
      newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex; // Stop at first (oldest)
    } else {
      // Next = go to newer dates (higher index, later in time) - but we want to limit this
      newIndex = currentIndex < dates.length - 1 ? currentIndex + 1 : currentIndex; // Stop at last (newest)
    }

    // Only change if we actually moved
    if (newIndex !== currentIndex) {
      setSelectedDate(dates[newIndex]);
    }
  };

  // Render date navigator with left/right arrows
  const renderDateNavigator = () => {
    const dates = getAvailableDates();
    const currentIndex = getCurrentDateIndex();
    const currentDate = selectedDate || (dates.length > 0 ? dates[0] : '');
    
    // Debug logging
    //   dates: dates,
    //   currentIndex,
    //   currentDate: selectedDate,
    //   datesLength: dates.length
    // });
    
    if (dates.length <= 1) return null; // Don't show navigator for single date
    
    // Check if we're at the boundaries
    const isAtFirst = currentIndex <= 0;
    const isAtLast = currentIndex >= dates.length - 1;
    
    // Disable next button if we're at the latest day (no future navigation)
    const isNextDisabled = isAtLast;
    
    // Get match count for current date
    const matchCount = showCourtSelection 
      ? getMatchesForSelectedDate().length
      : refereeMatches.filter(match => {
          const matchDate = match.Date || match.LocalDate || match.MatchDate || match.StartDate;
          return matchDate === currentDate;
        }).length;
    
    const displayDate = currentDate ? formatMatchDate(currentDate) : 'All Days';
    const isToday = currentDate && new Date(currentDate).toDateString() === new Date().toDateString();
    const dateInfo = isToday ? '📅 Today' : displayDate;
    
    return (
      <View style={styles.dateNavigator}>
        <TouchableOpacity 
          style={[
            styles.dateNavButton,
            isAtFirst && styles.dateNavButtonDisabled
          ]}
          onPress={() => !isAtFirst && navigateToDate('prev')}
          disabled={isAtFirst}
        >
          <Text style={[
            styles.dateNavButtonText,
            isAtFirst && styles.dateNavButtonTextDisabled
          ]}>◀</Text>
        </TouchableOpacity>
        
        <View style={styles.dateDisplayContainer}>
          <Text style={styles.dateDisplayText}>{dateInfo}</Text>
          <Text style={styles.datePositionText}>
            {matchCount} matches • {currentIndex + 1} of {dates.length}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.dateNavButton,
            isNextDisabled && styles.dateNavButtonDisabled
          ]}
          onPress={() => !isNextDisabled && navigateToDate('next')}
          disabled={isNextDisabled}
        >
          <Text style={[
            styles.dateNavButtonText,
            isNextDisabled && styles.dateNavButtonTextDisabled
          ]}>▶</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Get matches for selected date
  const getMatchesForSelectedDate = () => {
    if (!selectedDate) return courtMatches.slice(0, 10); // Show first 10 if no date selected
    
    const matchesForDate = courtMatches.filter(match => (match.LocalDate || 'Unknown Date') === selectedDate);
    
    // Sort by time descending (most recent first)
    return matchesForDate.sort((a, b) => {
      const timeA = a.LocalTime || '00:00';
      const timeB = b.LocalTime || '00:00';
      
      // Convert time strings (HH:MM) to comparable numbers
      const getTimeNumber = (timeStr: string) => {
        const parts = timeStr.split(':');
        if (parts.length !== 2) return 0;
        const hours = parseInt(parts[0] ?? '0') || 0;
        const minutes = parseInt(parts[1] ?? '0') || 0;
        return hours * 60 + minutes;
      };
      
      const timeNumA = getTimeNumber(timeA);
      const timeNumB = getTimeNumber(timeB);
      
      // We want 17:00 BEFORE 12:00, so HIGHER numbers first (descending)
      // 17:00 = 1020 minutes, 12:00 = 720 minutes
      // For descending: bigger - smaller = positive (moves bigger item up)
      return timeNumB - timeNumA;
    });
  };

  // Simple time display with user's local time in parentheses
  const getSimpleTimeWithUserTime = (localTime: string) => {
    try {
      const timeOnly = localTime.substring(0, 5); // Remove seconds: "13:15"
      
      // Get current user time for comparison (this is a simple approach)
      // Since we don't know the tournament timezone, we'll show current local time
      const now = new Date();
      const userTimeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      return `${timeOnly} (${userTimeStr})`;
    } catch (error) {
      return localTime.substring(0, 5);
    }
  };

  // Get timezone for tournament country
  const getTournamentTimezone = (country?: string) => {
    if (!country) return 'UTC';
    
    const countryTimezones: { [key: string]: string } = {
      'Canada': 'America/Toronto',
      'USA': 'America/New_York', 
      'United States': 'America/New_York',
      'Brazil': 'America/Sao_Paulo',
      'Italy': 'Europe/Rome',
      'France': 'Europe/Paris',
      'Germany': 'Europe/Berlin',
      'Spain': 'Europe/Madrid',
      'Netherlands': 'Europe/Amsterdam',
      'Poland': 'Europe/Warsaw',
      'Austria': 'Europe/Vienna',
      'Switzerland': 'Europe/Zurich',
      'Norway': 'Europe/Oslo',
      'Sweden': 'Europe/Stockholm',
      'Denmark': 'Europe/Copenhagen',
      'Finland': 'Europe/Helsinki',
      'Australia': 'Australia/Sydney',
      'Japan': 'Asia/Tokyo',
      'China': 'Asia/Shanghai',
      'Qatar': 'Asia/Qatar',
      'UAE': 'Asia/Dubai',
      'Turkey': 'Europe/Istanbul',
      'Mexico': 'America/Mexico_City',
      'Argentina': 'America/Argentina/Buenos_Aires',
      'Chile': 'America/Santiago',
      'South Africa': 'Africa/Johannesburg',
      'Egypt': 'Africa/Cairo'
    };
    
    return countryTimezones[country] || 'UTC';
  };

  // Format time showing tournament local time and user time if different
  const formatTimeWithLocal = (localTime: string, tournamentCountry?: string) => {
    try {
      if (!localTime) return '';
      
      // Remove seconds and get HH:MM
      const timeOnly = localTime.substring(0, 5);
      
      // Time conversion logic
      
      // Get timezone abbreviation for display
      const getTzAbbr = (country?: string) => {
        const abbrs: { [key: string]: string } = {
          'Canada': 'EST',
          'USA': 'EST',
          'United States': 'EST',
          'Brazil': 'BRT',
          'Italy': 'CET',
          'ITA': 'CET',
          'France': 'CET',
          'FRA': 'CET', 
          'Germany': 'CET',
          'GER': 'CET',
          'Deutschland': 'CET',
          'Spain': 'CET',
          'ESP': 'CET',
          'Netherlands': 'CET',
          'NED': 'CET',
          'Poland': 'CET',
          'POL': 'CET',
          'Austria': 'CET',
          'AUT': 'CET',
          'Switzerland': 'CET',
          'SUI': 'CET',
          'Norway': 'CET',
          'NOR': 'CET',
          'Sweden': 'CET',
          'SWE': 'CET',
          'Denmark': 'CET',
          'DEN': 'CET',
          'Qatar': 'AST',
          'QAT': 'AST',
          'Japan': 'JST',
          'JPN': 'JST',
          'Australia': 'AEDT',
          'AUS': 'AEDT',
          'Mexico': 'CST',
          'MEX': 'CST',
          'Argentina': 'ART',
          'ARG': 'ART',
          'Chile': 'CLT',
          'CHI': 'CLT',
        };
        return abbrs[country || ''] || 'Local';
      };
      
      const tzAbbr = getTzAbbr(tournamentCountry);
      
      // Convert tournament time to user's local time
      // Assuming LocalTime is in the tournament's timezone
      const [hours, minutes] = timeOnly.split(':').map(Number);
      
      // Create a date object for today with the tournament time
      const today = new Date();
      const tournamentDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
      
      // Get user's current timezone offset
      const userTimezoneOffset = new Date().getTimezoneOffset();
      
      // Get tournament timezone offset (simplified approximation)
      const getTournamentOffset = (country?: string) => {
        const offsets: { [key: string]: number } = {
          'Canada': 300, // EST is UTC-5 (300 minutes)
          'USA': 300,    // EST is UTC-5
          'United States': 300,
          'Brazil': 180, // BRT is UTC-3 (180 minutes)
          'Italy': -60,  // CET is UTC+1 (-60 minutes)
          'ITA': -60,
          'France': -60,
          'FRA': -60,
          'Germany': -60, // CET is UTC+1 (-60 minutes)
          'GER': -60,
          'Deutschland': -60,
          'Spain': -60,
          'ESP': -60,
          'Netherlands': -60,
          'NED': -60,
          'Poland': -60,
          'POL': -60,
          'Austria': -60,
          'AUT': -60,
          'Switzerland': -60,
          'SUI': -60,
          'Norway': -60,
          'NOR': -60,
          'Sweden': -60,
          'SWE': -60,
          'Denmark': -60,
          'DEN': -60,
          'Qatar': -180, // AST is UTC+3 (-180 minutes)
          'QAT': -180,
          'Japan': -540, // JST is UTC+9 (-540 minutes)
          'JPN': -540,
          'Australia': -660, // AEDT is UTC+11 (-660 minutes)
          'AUS': -660,
          'Mexico': 360, // CST is UTC-6
          'MEX': 360,
          'Argentina': 180, // ART is UTC-3
          'ARG': 180,
          'Chile': 180,  // CLT is UTC-3
          'CHI': 180,
        };
        return offsets[country || ''] || 0;
      };
      
      const tournamentOffset = getTournamentOffset(tournamentCountry);
      
      // Calculate time difference between tournament and user timezone
      // Note: getTimezoneOffset() returns positive for timezones behind UTC
      // So we need to reverse the logic
      const offsetDifference = userTimezoneOffset - tournamentOffset;
      
      // Timezone calculation
      
      // Apply the difference to get user's local time
      const userDateTime = new Date(tournamentDateTime.getTime() + (offsetDifference * 60000));
      const userTimeStr = userDateTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      // Show tournament time and user time if they're different
      if (userTimeStr === timeOnly) {
        return `${timeOnly} ${tzAbbr}`;
      } else {
        return `${timeOnly} ${tzAbbr} (${userTimeStr})`;
      }
    } catch (error) {
      // // console.warn('Error formatting time:', error);
      return localTime.substring(0, 5);
    }
  };

  // Calculate total match duration in minutes
  const getMatchDuration = (match: BeachMatch): string => {
    try {
      const durations = [
        match.DurationSet1,
        match.DurationSet2,
        match.DurationSet3
      ].filter(duration => duration && duration.trim() !== '' && duration !== '0');
      
      if (durations.length === 0) return 'Match';
      
      let totalSeconds = 0;
      
      durations.forEach(duration => {
        // Duration is in seconds, convert to integer
        const seconds = parseInt(duration ?? '0') || 0;
        totalSeconds += seconds;
      });
      
      const totalMinutes = Math.round(totalSeconds / 60);
      return totalMinutes > 0 ? `${totalMinutes} min` : 'Match';
    } catch (error) {
      // // console.warn('Error calculating match duration:', error);
      return 'Match';
    }
  };

  // Render court selection section
  const renderCourtSelectionSection = () => {
    return (
      <ScrollView style={styles.courtSelectionFullScreen} contentContainerStyle={styles.courtSelectionContent}>
        
        {loadingCourts ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#FF6B35" />
            <Text style={styles.loadingText}>Loading available courts...</Text>
          </View>
        ) : (
          <View style={styles.courtSelectionContainer}>
            <View style={styles.centerFilterContainer}>
              {['All Courts', ...availableCourts].map((court) => (
                <TouchableOpacity
                  key={court}
                  style={[
                    styles.courtButton,
                    selectedCourt === court && styles.activeCourtButton
                  ]}
                  onPress={() => setSelectedCourt(court)}
                >
                  <Text style={[
                    styles.courtButtonText,
                    selectedCourt === court && styles.activeCourtButtonText
                  ]}>
                    {court}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Court Matches Section */}
            {loadingCourtMatches ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#FF6B35" />
                <Text style={styles.loadingText}>Loading matches...</Text>
              </View>
            ) : courtMatches.length > 0 ? (
              <>
                {/* Date Navigator removed - showing all matches */}
                
                {/* Matches List */}
                <View style={styles.courtMatchesList}>
                  {getMatchesForSelectedDate().map((match, index) => {
                    const scoreA = parseInt(match.MatchPointsA || '0');
                    const scoreB = parseInt(match.MatchPointsB || '0');
                    const teamAWon = scoreA > scoreB;
                    const teamBWon = scoreB > scoreA;
                    
                    return (
                      <View key={match.No || index} style={styles.courtMatchCard}>
                        {/* Gender Strip */}
                        {match.tournamentGender && (
                          <View style={[
                            styles.genderStrip,
                            match.tournamentGender === 'M' ? styles.menStrip : styles.womenStrip
                          ]} />
                        )}
                        
                        {/* Teams Section - at the top */}
                        <View style={styles.matchTeamsHeader}>
                          <View style={styles.teamsOnlyColumn}>
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
                        
                        {/* Court, Time and Duration Section */}
                        <View style={styles.matchInfoRow}>
                          <View style={styles.leftInfoGroup}>
                            {match.Court && (
                              <Text style={styles.courtInfoMiddle}>
                                {match.Court === 'CC' ? 'CC' : `C${match.Court}`}
                              </Text>
                            )}
                            {match.LocalTime && (
                              <Text style={styles.timeInfoMiddle}>
                                {match.LocalTime.substring(0, 5)}
                              </Text>
                            )}
                          </View>
                          <Text style={styles.durationInfoMiddle}>
                            {getMatchDuration(match)}
                          </Text>
                        </View>
                        
                        {/* Referees Section - at the bottom */}
                        {(match.Referee1Name || match.Referee2Name) && (
                          <View style={styles.refereesSection}>
                            {match.Referee1Name && (
                              <Text style={selectedReferee?.Name === match.Referee1Name ? styles.selectedRefereeHighlight : styles.refereeText}>
                                1° {match.Referee1Name}
                                {match.Referee1FederationCode && ` (${match.Referee1FederationCode})`}
                              </Text>
                            )}
                            {match.Referee2Name && (
                              <Text style={selectedReferee?.Name === match.Referee2Name ? styles.selectedRefereeHighlight : styles.refereeText}>
                                2° {match.Referee2Name}
                                {match.Referee2FederationCode && ` (${match.Referee2FederationCode})`}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              <View style={styles.noMatchesContainer}>
                <Text style={styles.noMatchesText}>No matches found for {selectedCourt}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    );
  };

  // Handle assignment status data management  
  const handleClearStatusData = () => {
    Alert.alert(
      'Clear Assignment Status Data',
      'This will clear all assignment status tracking data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            // TODO: Clear assignment status data
            refreshStatuses();
            Alert.alert('Success', 'Assignment status data cleared.');
          },
        },
      ]
    );
  };

  const handleResetApp = async () => {
    Alert.alert(
      'Reset App Data',
      'This will clear all your settings and tournament selection. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await TournamentStorageService.clearAllData();
              Alert.alert('Success', 'App data cleared. Please restart the app.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset app data');
            }
          },
        },
      ]
    );
  };

  const renderRefereeListPage = () => {
    if (!showRefereeList) return null;

    return (
      <View style={styles.container}>
        {/* Header with back button */}
        <View style={styles.pageHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setShowRefereeList(false)}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Select Referee</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        {loadingReferees ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingText}>Loading referee list...</Text>
          </View>
        ) : (
          <FlatList
            data={refereeList}
            keyExtractor={(item) => item.No}
            renderItem={({ item }) => (
              <View style={styles.refereeCard}>
                <View style={styles.refereeInfo}>
                  <Text style={styles.refereeName}>{item.Name}</Text>
                  <Text style={styles.refereeDetails}>
                    #{item.No} • {item.FederationCode || 'N/A'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.goButton}
                  onPress={() => handleSelectReferee(item)}
                >
                  <Text style={styles.goButtonText}>Go</Text>
                </TouchableOpacity>
              </View>
            )}
            style={styles.refereeListPage}
            contentContainerStyle={styles.refereeListContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  };

  const renderProfileSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Referee Profile</Text>
      
      {!selectedTournament ? (
        <Text style={styles.warningText}>
          Please select a tournament first to load the referee list.
        </Text>
      ) : (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Selected Referee</Text>
            {profile.name ? (
              <View style={styles.selectedRefereeCard}>
                <Text style={styles.selectedRefereeName}>{profile.name}</Text>
                <Text style={styles.selectedRefereeDetails}>
                  #{profile.refereeNo} • {profile.federationCode || 'N/A'}
                </Text>
              </View>
            ) : (
              <Text style={styles.noRefereeSelected}>No referee selected</Text>
            )}
            
            <TouchableOpacity
              style={styles.selectRefereeButton}
              onPress={loadRefereeList}
              disabled={loadingReferees}
            >
              {loadingReferees ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.selectRefereeButtonText}>
                  {profile.name ? 'Change Referee' : 'Select from Tournament Referee List'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {profile.name && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Federation Code</Text>
                <Text style={styles.readOnlyText}>{profile.federationCode || 'N/A'}</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Referee Number</Text>
                <Text style={styles.readOnlyText}>#{profile.refereeNo}</Text>
              </View>
            </>
          )}

          {profile.name && (
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
              <Text style={styles.saveButtonText}>Save Referee Selection</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );

  const renderAssignmentStatusSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Assignment Status</Text>
      
      {/* Current Status Display */}
      {currentAssignmentStatus ? (
        <View style={styles.statusDisplay}>
          <StatusIndicator
            type={currentAssignmentStatus.status}
            size="large"
            variant="prominent"
            showIcon={true}
            showText={true}
            customLabel={`Court ${currentAssignmentStatus.courtNumber}`}
          />
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusCount}>{statusCounts.current}</Text>
              <Text style={styles.statusLabel}>Current</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusCount}>{statusCounts.upcoming}</Text>
              <Text style={styles.statusLabel}>Upcoming</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusCount}>{statusCounts.completed}</Text>
              <Text style={styles.statusLabel}>Completed</Text>
            </View>
          </View>
          
          {/* Network Status */}
          <View style={styles.networkStatusDisplay}>
            <Text style={styles.networkLabel}>Status Sync:</Text>
            <Text style={[styles.networkValue, { 
              color: isOnline ? designTokens.colors.success : designTokens.colors.error 
            }]}>
              {isOnline ? (syncStatus === 'synced' ? '✅ Synced' : '🔄 Syncing...') : '📴 Offline'}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.noStatusText}>No active assignment status</Text>
      )}
      
      {/* Status Management Actions */}
      <TouchableOpacity style={styles.statusAction} onPress={() => router.push('/my-assignments')}>
        <Text style={styles.statusActionText}>View All Assignments</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.statusAction, styles.dangerStatusAction]} onPress={handleClearStatusData}>
        <Text style={[styles.statusActionText, styles.dangerActionText]}>Clear Status Data</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPreferencesSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Notification Preferences</Text>
      
      <View style={styles.preferenceRow}>
        <View style={styles.preferenceInfo}>
          <Text style={styles.preferenceTitle}>Match Notifications</Text>
          <Text style={styles.preferenceDescription}>
            Get notified when your next match is about to start
          </Text>
        </View>
        <Switch
          value={preferences.notificationsEnabled}
          onValueChange={handleToggleNotifications}
          trackColor={{ false: '#ccc', true: designTokens.colors.accent }}
          thumbColor={preferences.notificationsEnabled ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.preferenceRow}>
        <View style={styles.preferenceInfo}>
          <Text style={styles.preferenceTitle}>Urgency Alerts</Text>
          <Text style={styles.preferenceDescription}>
            Critical warnings for time-sensitive assignments
          </Text>
        </View>
        <Switch
          value={statusNotifications.urgencyAlerts}
          onValueChange={(enabled) => handleToggleStatusNotification('urgencyAlerts', enabled)}
          trackColor={{ false: '#ccc', true: designTokens.colors.error }}
          thumbColor={statusNotifications.urgencyAlerts ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.preferenceRow}>
        <View style={styles.preferenceInfo}>
          <Text style={styles.preferenceTitle}>Status Change Alerts</Text>
          <Text style={styles.preferenceDescription}>
            Notifications when assignment status changes
          </Text>
        </View>
        <Switch
          value={statusNotifications.statusChanges}
          onValueChange={(enabled) => handleToggleStatusNotification('statusChanges', enabled)}
          trackColor={{ false: '#ccc', true: designTokens.colors.secondary }}
          thumbColor={statusNotifications.statusChanges ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.preferenceRow}>
        <View style={styles.preferenceInfo}>
          <Text style={styles.preferenceTitle}>Offline Sync Alerts</Text>
          <Text style={styles.preferenceDescription}>
            Notifications about offline data sync status
          </Text>
        </View>
        <Switch
          value={statusNotifications.offlineSync}
          onValueChange={(enabled) => handleToggleStatusNotification('offlineSync', enabled)}
          trackColor={{ false: '#ccc', true: designTokens.colors.warning }}
          thumbColor={statusNotifications.offlineSync ? '#fff' : '#f4f3f4'}
        />
      </View>
    </View>
  );

  const renderAppSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>App Management</Text>
      
      <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/tournament-selection')}>
        <Text style={styles.actionButtonText}>Switch Tournament</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={handleResetApp}>
        <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Reset App Data</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <NavigationHeader
          title="Settings"
          showBackButton={true}
          showStatusBar={false}
          onStatusPress={handleStatusPress}
        />
        <View style={styles.centerContainer}>
          <Text>Loading settings...</Text>
        </View>
        <BottomTabNavigation 
          currentTab="monitor" 
          onTabPress={(tab) => {
            if (tab === 'details' && currentTournament) {
              router.push({
                pathname: '/tournament-detail',
                params: { tournamentData: JSON.stringify(currentTournament) }
              });
            }
          }}
        />
      </View>
    );
  }

  const renderRefereeMatchesSection = () => {
    if (!selectedReferee) return null;


    // Debug the date fields in matches
    //   matchNo: match.No,
    //   Date: match.Date,
    //   LocalDate: match.LocalDate,
    //   MatchDate: match.MatchDate,
    //   StartDate: match.StartDate,
    //   allDateFields: Object.keys(match).filter(key => key.toLowerCase().includes('date'))
    // })));

    // Try multiple date field variations
    const allDates = refereeMatches.map(match => 
      match.Date || match.LocalDate || match.MatchDate || match.StartDate
    ).filter(Boolean);
    

    // Get unique dates from referee matches for the date tabs (most recent first)
    const uniqueDates = [...new Set(allDates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    
    // Filter matches by selected date (check multiple date fields)
    // If no date is selected, auto-select the last day of tournament
    let effectiveSelectedDate = selectedDate;
    if (!effectiveSelectedDate && refereeMatches.length > 0) {
      const allDates = refereeMatches.map(match => 
        match.Date || match.LocalDate || match.MatchDate || match.StartDate
      ).filter(Boolean);
      const sortedDates = [...new Set(allDates)].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      if (sortedDates.length > 0) {
        effectiveSelectedDate = sortedDates[sortedDates.length - 1]; // Last day of tournament
      }
    }
    
    const filteredMatches = effectiveSelectedDate 
      ? refereeMatches.filter(match => {
          const matchDate = match.Date || match.LocalDate || match.MatchDate || match.StartDate;
          return matchDate === effectiveSelectedDate;
        })
      : refereeMatches;
    
    // Sort matches by time (ascending - earliest first)
    const sortedMatches = filteredMatches.sort((a, b) => {
      const timeA = a.LocalTime || a.Time || '00:00';
      const timeB = b.LocalTime || b.Time || '00:00';
      
      // Convert time strings (HH:MM) to comparable numbers
      const getTimeNumber = (timeStr: string) => {
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0] || '0', 10);
        const minutes = parseInt(parts[1] || '0', 10);
        return hours * 60 + minutes; // Total minutes from midnight
      };
      
      return getTimeNumber(timeA) - getTimeNumber(timeB); // Ascending order
    });
      

    return (
      <ScrollView style={styles.courtSelectionFullScreen} contentContainerStyle={styles.courtSelectionContent}>
        
        {/* Header with referee info and back button */}
        <View style={styles.refereeHeaderSection}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setShowRefereeMatches(false)}
          >
            <Text style={styles.backButtonText}>← Back to Referees</Text>
          </TouchableOpacity>
          <Text style={styles.refereeHeaderTitle}>
            {selectedReferee.Name} ({selectedReferee.FederationCode || 'N/A'})
          </Text>
          <Text style={styles.refereeHeaderSubtitle}>
            {refereeMatches.length} assigned matches
          </Text>
        </View>

        {loadingRefereeMatches ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#FF6B35" />
            <Text style={styles.loadingText}>Loading referee matches...</Text>
          </View>
        ) : (
          <>
            {/* Date Navigator removed - showing all matches */}

            {/* Matches list */}
            <View style={styles.matchesContainer}>
              {sortedMatches.length > 0 ? (
                sortedMatches.map((match, index) => (
                  <View key={`${match.No}-${index}`} style={styles.matchItem}>
                    {renderMatchItem(match, index)}
                  </View>
                ))
              ) : (
                <View style={styles.noMatchesContainer}>
                  <Text style={styles.noMatchesText}>
                    {selectedDate 
                      ? `No matches assigned to ${selectedReferee.Name} on ${formatMatchDate(selectedDate)}`
                      : `No matches assigned to ${selectedReferee.Name}`
                    }
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {!showRefereeList && (
        <NavigationHeader
        title={currentTournament?.Name || "Settings"}
        showBackButton={true}
        showStatusBar={false}
        onStatusPress={handleStatusPress}
        rightComponent={
          <View style={styles.headerActions}>
            {/* Status Badge Indicators */}
            {statusCounts.current > 0 && (
              <View style={[styles.statusBadge, { backgroundColor: designTokens.colors.success }]}>
                <Text style={styles.statusBadgeText}>{statusCounts.current}</Text>
              </View>
            )}
            {statusCounts.upcoming > 0 && (
              <View style={[styles.statusBadge, { backgroundColor: designTokens.colors.secondary }]}>
                <Text style={styles.statusBadgeText}>{statusCounts.upcoming}</Text>
              </View>
            )}
            
            {/* Network Status Indicator */}
            {(!isOnline || syncStatus !== 'synced') && (
              <View style={[styles.networkStatus, { 
                backgroundColor: !isOnline ? designTokens.colors.error : designTokens.colors.warning 
              }]}>
                <Text style={styles.networkStatusText}>
                  {!isOnline ? '📴' : '🔄'}
                </Text>
              </View>
            )}
          </View>
        }
      />
      )}

      <View style={styles.mainContent}>
        {showRefereeList ? renderRefereeListPage() :
         showCourtSelection ? renderCourtSelectionSection() : 
         showRefereeMatches ? renderRefereeMatchesSection() : 
         renderMonitorOptions()}
      </View>
      {!showRefereeList && <BottomTabNavigation 
        currentTab="monitor" 
        onTabPress={(tab) => {
          if (tab === 'details' && currentTournament) {
            router.push({
              pathname: '/tournament-detail',
              params: { tournamentData: JSON.stringify(currentTournament) }
            });
          }
        }}
      />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#FF6B35',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  preferenceInfo: {
    flex: 1,
    marginRight: 16,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: '#4A90A4',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  dangerButtonText: {
    color: '#fff',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  
  // Referee selection styles
  warningText: {
    fontSize: 14,
    color: '#f59e0b',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  selectedRefereeCard: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0ea5e9',
    marginBottom: 8,
  },
  selectedRefereeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0c4a6e',
  },
  selectedRefereeDetails: {
    fontSize: 14,
    color: '#075985',
    marginTop: 4,
  },
  noRefereeSelected: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    padding: 12,
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  selectRefereeButton: {
    backgroundColor: '#0ea5e9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  selectRefereeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  readOnlyText: {
    fontSize: 16,
    color: designTokens.neutrals.textPrimary,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1B365D',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    paddingLeft: 16,
  },
  modalLoadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  refereeList: {
    maxHeight: 400,
  },
  refereeItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  refereeInfo: {
    flex: 1,
  },
  refereeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  refereeDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
  
  // Referee List Page Styles
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B365D',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60, // Same width as back button to center title
  },
  refereeListPage: {
    flex: 1,
  },
  refereeListContainer: {
    padding: 16,
  },
  refereeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#1B365D',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  goButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Status Integration Styles
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  
  statusBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  
  statusBadgeText: {
    color: designTokens.colors.background,
    fontSize: 11,
    fontWeight: 'bold',
  },
  
  networkStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  networkStatusText: {
    fontSize: 12,
  },
  
  statusDisplay: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
  },
  
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: designTokens.spacing.md,
    gap: designTokens.spacing.sm,
  },
  
  statusItem: {
    flex: 1,
    alignItems: 'center',
    padding: designTokens.spacing.sm,
    backgroundColor: designTokens.brandColors.primaryLight,
    borderRadius: 8,
  },
  
  statusCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: designTokens.colors.primary,
    marginBottom: 4,
  },
  
  statusLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: designTokens.colors.textSecondary,
    textTransform: 'uppercase',
  },
  
  networkStatusDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs,
    backgroundColor: designTokens.brandColors.primaryLight,
    borderRadius: 8,
  },
  
  networkLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: designTokens.colors.textPrimary,
  },
  
  networkValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  noStatusText: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: designTokens.spacing.md,
    backgroundColor: designTokens.brandColors.primaryLight,
    borderRadius: 8,
    marginBottom: designTokens.spacing.md,
  },
  
  statusAction: {
    backgroundColor: designTokens.colors.secondary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  
  statusActionText: {
    color: designTokens.colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  
  dangerStatusAction: {
    backgroundColor: designTokens.colors.error,
  },
  
  dangerActionText: {
    color: designTokens.colors.background,
  },
  
  // Court Selection Styles
  courtSelectionContainer: {
    marginTop: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  centerFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  courtButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#1B365D',
    backgroundColor: 'transparent',
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeCourtButton: {
    backgroundColor: '#1B365D',
  },
  courtButtonText: {
    color: '#1B365D',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  activeCourtButtonText: {
    color: '#FFFFFF',
  },
  courtSelectionHint: {
    fontSize: 12,
    color: designTokens.neutrals.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4A90A4',
  },
  
  // Referee Dropdown Styles
  refereeDropdownContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  refereeDropdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B365D',
    marginBottom: 8,
  },
  refereeDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  refereeDropdownText: {
    fontSize: 14,
    color: '#1B365D',
    flex: 1,
  },
  refereeDropdownArrow: {
    fontSize: 12,
    color: designTokens.neutrals.textSecondary,
    marginLeft: 8,
  },
  selectedRefereeInfo: {
    marginTop: 6,
    paddingLeft: 4,
  },
  selectedRefereeDetails: {
    fontSize: 12,
    color: designTokens.neutrals.textSecondary,
    fontStyle: 'italic',
  },
  
  // Main Monitor Interface Styles
  mainContent: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  monitorContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: designTokens.neutrals.textSecondary,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 20,
  },
  monitorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#1B365D',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  cardIcon: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 48,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B365D',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: designTokens.neutrals.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  cardArrow: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -12,
  },
  arrowText: {
    fontSize: 24,
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  
  // Court Selection Full Screen Styles
  courtSelectionFullScreen: {
    flex: 1,
  },
  courtSelectionContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    flexGrow: 1,
  },
  courtSelectionHeader: {
    marginBottom: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1B365D',
    fontWeight: '600',
  },
  courtSelectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B365D',
    textAlign: 'center',
    marginBottom: 8,
  },
  courtSelectionSubtitle: {
    fontSize: 16,
    color: designTokens.neutrals.textSecondary,
    textAlign: 'center',
  },
  
  // Court Matches Display Styles
  courtMatchesSection: {
    marginTop: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  courtMatchesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 16,
    textAlign: 'center',
  },
  courtMatchesList: {
    flex: 1,
  },
  courtMatchCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  noMatchesContainer: {
    padding: 24,
    alignItems: 'center',
  },
  noMatchesText: {
    fontSize: 14,
    color: designTokens.neutrals.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  
  // Date Tabs Styles (copied from TournamentDetailScreen)
  dateTabsContainer: {
    marginBottom: 16,
  },
  dateTabsScrollView: {
    flexGrow: 0,
  },
  dateTabsContent: {
    paddingLeft: 8,
    paddingRight: 8,
  },
  dateTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#1B365D',
    backgroundColor: 'transparent',
    minHeight: 36,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  activeDateTab: {
    backgroundColor: '#1B365D',
  },
  dateTabText: {
    color: '#1B365D',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  activeDateTabText: {
    color: '#FFFFFF',
  },
  
  // Date Navigator Styles
  dateNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginHorizontal: 8,
  },
  dateNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1B365D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  dateNavButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateNavButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  dateNavButtonTextDisabled: {
    color: designTokens.neutrals.textSecondary,
  },
  dateDisplayContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  dateDisplayText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B365D',
    textAlign: 'center',
    marginBottom: 2,
  },
  datePositionText: {
    fontSize: 12,
    color: designTokens.neutrals.textSecondary,
    textAlign: 'center',
  },
  
  // Match Display Styles (copied from TournamentDetailScreen)
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
    color: designTokens.neutrals.textSecondary,
    fontWeight: '500',
  },
  roundInfoTop: {
    fontSize: 11,
    color: '#000000',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  matchHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  matchTeamsHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  teamsOnlyColumn: {
    flex: 3,
    paddingRight: 8,
    justifyContent: 'space-between',
  },
  teamsColumn: {
    flex: 3,
    paddingRight: 8,
    justifyContent: 'space-between',
  },
  matchInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingVertical: 2,
  },
  leftInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  courtInfoMiddle: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '500',
  },
  timeInfoMiddle: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '400',
  },
  durationInfoMiddle: {
    fontSize: 12,
    color: '#000000',
    fontWeight: 'bold',
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
    alignItems: 'flex-end',
    paddingRight: 8,
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
  
  // Referees Section Styles
  refereesSection: {
    marginTop: 8,
  },
  refereeText: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 2,
  },
  selectedRefereeHighlight: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 2,
  },
  
  // Referee Matches Section Styles
  refereeHeaderSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
  refereeHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: designTokens.neutrals.textPrimary,
    marginBottom: 4,
  },
  refereeHeaderSubtitle: {
    fontSize: 14,
    color: designTokens.neutrals.textSecondary,
  },
  mostRecentDateTab: {
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  matchItem: {
    marginBottom: 8,
  },
});

// Wrapper component with AssignmentStatusProvider
const RefereeSettingsScreen: React.FC = () => {
  return (
    <AssignmentStatusProvider>
      <RefereeSettingsScreenContent />
    </AssignmentStatusProvider>
  );
};

export default RefereeSettingsScreen;
