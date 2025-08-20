import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Tournament } from '../types/tournament';
import { BeachMatch } from '../types/match';
import { TournamentStorageService } from '../services/TournamentStorageService';
import { VisApiService } from '../services/visApi';
import { AssignmentStatusProvider, useAssignmentStatus } from '../hooks/useAssignmentStatus';
import BottomTabNavigation from '../components/navigation/BottomTabNavigation';
import NavigationHeader from '../components/navigation/NavigationHeader';
import { designTokens } from '../theme/tokens';
import MatchList from '../components/MatchList/MatchList';

const TournamentDetailScreenContent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [matches, setMatches] = useState<BeachMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [allMatches, setAllMatches] = useState<BeachMatch[]>([]);
  const [showMoreLoading, setShowMoreLoading] = useState(false);
  // Date navigation using direct state (same as Court Monitor)
  const [selectedDate, setSelectedDate] = useState<string>('');

  const [detailedTournament, setDetailedTournament] = useState<Tournament | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const router = useRouter();
  const { tournamentData } = useLocalSearchParams<{ tournamentData: string }>();

  const tournament: Tournament = React.useMemo(() => {
    try {
      const parsed = JSON.parse(tournamentData || '{}') as Tournament;
      const merged = (parsed as any)._mergedTournaments;
      if (merged && merged.length > 1) {
        console.log(`🏐 DETAIL: "${parsed.Name}" has ${merged.length} merged tournaments`);
      }
      return parsed;
    } catch {
      return {} as Tournament;
    }
  }, [tournamentData]);

  // Assignment status management
  const { 
    currentAssignmentStatus,
    statusCounts,
    isOnline,
    syncStatus
  } = useAssignmentStatus();

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'short', // Changed from 'long' to 'short' for 3-letter month codes
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getLocation = () => {
    // Try different combinations of available location data
    const city = tournament.City;
    const country = tournament.CountryName || tournament.Country;
    
    if (city && country) {
      return `${city}, ${country}`;
    }
    
    // Only return location if we have explicit location data, city, or country
    // Don't show "Location not specified" or try to infer from title
    return tournament.Location || city || country || null;
  };

  const getDateRange = () => {
    if (tournament.Dates) {
      return tournament.Dates;
    }
    if (tournament.StartDate && tournament.EndDate) {
      const start = formatDate(tournament.StartDate);
      const end = formatDate(tournament.EndDate);
      if (start === end) return start;
      return `${start} - ${end}`;
    }
    return formatDate(tournament.StartDate) || formatDate(tournament.EndDate) || 'Dates TBD';
  };

  const getTournamentStatus = () => {
    if (!tournament.StartDate) return 'Scheduled';
    
    const now = new Date();
    const start = new Date(tournament.StartDate);
    
    // If we have both start and end dates
    if (tournament.EndDate) {
      const end = new Date(tournament.EndDate);
      
      if (start <= now && now <= end) {
        return 'Live';
      } else if (start > now) {
        return 'Upcoming';
      } else {
        return 'Completed';
      }
    }
    
    // If we only have start date, use simple logic
    if (start > now) {
      return 'Upcoming';
    } else {
      // If start date is in the past, assume it's completed
      return 'Completed';
    }
  };

  // Date navigation functions (same as Court Monitor)
  const getAvailableDates = () => {
    const allDates = allMatches.map(match => 
      match.Date || match.LocalDate || match.MatchDate || match.StartDate
    ).filter(Boolean);
    const sortedDates = [...new Set(allDates)].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    console.log('🗓️ Tournament Detail - Available dates (oldest to newest):', sortedDates);
    return sortedDates;
  };

  const getMatchesForSelectedDate = () => {
    if (!selectedDate) return allMatches.slice(0, 10); // Show first 10 if no date selected
    
    const matchesForDate = allMatches.filter(match => {
      const matchDate = match.Date || match.LocalDate || match.MatchDate || match.StartDate;
      return matchDate === selectedDate;
    });
    
    // Sort by time ascending
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

  // Debug logging - moved after getTournamentStatus declaration
  const tournamentStatus = getTournamentStatus();
  const currentAvailableDates = getAvailableDates();
  const currentMatchesForDate = getMatchesForSelectedDate();
  
  console.log('🏐 TournamentDetail: Current state:', {
    tournamentNo: tournament.No,
    tournamentStatus,
    tournamentStartDate: tournament.StartDate,
    tournamentEndDate: tournament.EndDate,
    allMatches: allMatches?.length || 0,
    selectedDate,
    availableDates: currentAvailableDates.length,
    matchesForSelectedDate: currentMatchesForDate.length,
    availableDatesArray: currentAvailableDates,
    matchesForSelectedDateArray: currentMatchesForDate.slice(0, 3) // Show first 3 for debug
  });

  const getStatusColor = () => {
    const status = getTournamentStatus();
    switch (status) {
      case 'Live':
        return '#2E8B57';
      case 'Upcoming':
        return '#FF6B35';
      case 'Completed':
        return '#6B7280';
      default:
        return '#4A90A4';
    }
  };


  const handleGoBack = () => {
    router.back();
  };

  // Load detailed tournament information
  const loadTournamentDetails = async () => {
    if (!tournament.No) return;
    
    setDetailsLoading(true);
    try {
      console.log(`Loading detailed tournament info for ${tournament.No}...`);
      
      // Try to get additional tournament details from the API
      const details = await VisApiService.getBeachTournamentDetails(tournament.No);
      
      if (details) {
        console.log('Detailed tournament data:', details);
        // Merge the detailed data with the basic tournament data
        setDetailedTournament({
          ...tournament,
          ...details
        });
      } else {
        // If no additional details found, use the basic tournament data
        setDetailedTournament(tournament);
      }
    } catch (error) {
      console.error('Failed to load tournament details:', error);
      // Fallback to basic tournament data
      setDetailedTournament(tournament);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Load matches for active or completed tournaments
  const loadMatches = async () => {
    console.log('🏐 TournamentDetail: loadMatches called', { 
      tournamentNo: tournament.No, 
      tournamentName: tournament.Name,
      hasNo: !!tournament.No 
    });
    
    if (!tournament.No) {
      console.log('🏐 TournamentDetail: No tournament number, aborting');
      return;
    }
    
    const status = getTournamentStatus();
    console.log('🏐 TournamentDetail: Loading matches, status:', status);
    // Temporarily removed status check to debug
    // if (status !== 'Live' && status !== 'Completed') return;
    
    setMatchesLoading(true);
    try {
      let allTournamentMatches: BeachMatch[] = [];
      
      // Check if this tournament has merged tournaments from the tournament detail screen
      const mergedTournaments = (tournament as any)._mergedTournaments || [];
      
      console.log(`🏐 TOURNAMENT DETAIL: Loading matches for "${tournament.Name}"`);
      console.log(`🏐 TOURNAMENT DETAIL MATCHES: Loading matches for ${mergedTournaments.length > 0 ? 'merged' : 'single'} tournament`);
      
      // Helper function to infer country from tournament name (same as court monitor)
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
        console.log(`🏐 TOURNAMENT DETAIL LOADING: ${mergedTournaments.length} tournaments from merged data`);
        
        // Load matches from all merged tournaments (exactly like court monitor)
        for (const mergedTournament of mergedTournaments) {
          try {
            const matches = await VisApiService.getBeachMatchList(mergedTournament.No);
            const gender = VisApiService.extractGenderFromCode(mergedTournament.Code);
            const inferredCountry = inferCountryFromName(mergedTournament.Name);
            
            // Add metadata to matches (same as court monitor)
            const matchesWithMeta = matches.map(match => ({
              ...match,
              tournamentGender: gender,
              tournamentNo: mergedTournament.No,
              tournamentCode: mergedTournament.Code,
              tournamentName: mergedTournament.Name,
              tournamentCountry: tournament?.Country || tournament?.CountryName || inferredCountry
            }));
            
            allTournamentMatches = [...allTournamentMatches, ...matchesWithMeta];
            console.log(`🏐 TOURNAMENT DETAIL LOADED: ${matches.length} matches (${gender}) from ${mergedTournament.Name}`);
          } catch (error) {
            console.warn(`Failed to load tournament detail matches for ${mergedTournament.Name}:`, error);
          }
        }
      }
      
      else {
        // Fallback: Load matches from current tournament using old method (same as court monitor fallback)
        console.log(`🏐 TOURNAMENT DETAIL FALLBACK: Using single tournament method`);
        
        const currentMatches = await VisApiService.getBeachMatchList(tournament.No);
        const currentGender = tournament.Code ? VisApiService.extractGenderFromCode(tournament.Code) : 'Unknown';
        
        // Add metadata to current tournament matches
        const inferredCountry = inferCountryFromName(tournament.Name);
      
        const currentMatchesWithMeta = currentMatches.map(match => ({
          ...match,
          tournamentGender: currentGender,
          tournamentNo: tournament.No,
          tournamentCode: tournament.Code,
          tournamentCountry: tournament.Country || tournament.CountryName || inferredCountry
        }));
        
        allTournamentMatches = [...currentMatchesWithMeta];
        
        // Find related tournaments (men's/women's versions) - fallback method (same as court monitor)
        if (tournament.Code) {
          try {
            const relatedTournaments = await VisApiService.findRelatedTournaments(tournament);
            // Load matches from related tournaments (excluding current one)
            for (const relatedTournament of relatedTournaments) {
              if (relatedTournament.No !== tournament.No) {
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
            console.warn('Failed to find related tournaments:', relatedError);
          }
        }
      }
      
      // Process matches exactly like court monitor "ALL" 
      // Since we want ALL matches (not filtered by court), we use all matches
      let filteredMatches = allTournamentMatches; // Same as selectedCourt === 'All Courts'
      
      // Sort matches ONLY by time (descending - most recent first) - same as court monitor
      const sortedMatches = filteredMatches.sort((a, b) => {
        const timeA = a.LocalTime || '00:00';
        const timeB = b.LocalTime || '00:00';
        
        // Convert time strings (HH:MM) to comparable numbers
        const getTimeNumber = (timeStr: string) => {
          const parts = timeStr.split(':');
          if (parts.length < 2) return 0;
          const hours = parseInt(parts[0]) || 0;
          const minutes = parseInt(parts[1]) || 0;
          return hours * 60 + minutes;
        };
        
        const timeNumA = getTimeNumber(timeA);
        const timeNumB = getTimeNumber(timeB);
        
        // Descending: 17:00 (1020) before 12:00 (720)
        return timeNumB - timeNumA;
      });
      
      console.log(`Total matches loaded and sorted: ${sortedMatches.length}`);
      
      // Get unique dates from sorted matches and sort them (earliest first) - same as court monitor
      const uniqueDates = [...new Set(sortedMatches.map(match => 
        match.LocalDate || 'Unknown Date'
      ))].sort((a, b) => new Date(a).getTime() - new Date(b).getTime()); // Sort oldest to newest
      
      console.log('🗓️ Tournament Detail - Available dates (oldest to newest):', uniqueDates);
      // Note: Date management is now handled by useDateNavigation hook
      
      // Use the sorted matches directly (same as court monitor)
      setAllMatches(sortedMatches);
      console.log(`🏐 TournamentDetail: Final result - ${sortedMatches.length} matches loaded, ${uniqueDates.length} dates available`);
      
      // Auto-select the most recent date if not already set (same as Court Monitor)
      if (uniqueDates.length > 0 && !selectedDate) {
        const defaultDate = uniqueDates[uniqueDates.length - 1]; // Last day (most recent)
        console.log('🗓️ Tournament Detail - Setting default to most recent date:', defaultDate);
        setSelectedDate(defaultDate);
      }
    } catch (error) {
      console.error('Failed to load matches:', error);
    } finally {
      setMatchesLoading(false);
    }
  };

  // Load more matches for selected date (same as Court Monitor)
  const loadMoreMatches = async () => {
    const currentMatches = getMatchesForSelectedDate();
    const currentCount = matches?.length || 5;
    if (currentCount >= currentMatches.length) return;
    
    setShowMoreLoading(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      const nextBatch = currentMatches.slice(0, currentCount + 5);
      setMatches(nextBatch);
      setShowMoreLoading(false);
    }, 500);
  };

  // Handle date change from DateNavigator (same as Court Monitor)
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    // Reset matches to show first 5 for the new date
    const matchesForNewDate = allMatches.filter(match => {
      const matchDate = match.Date || match.LocalDate || match.MatchDate || match.StartDate;
      return matchDate === newDate;
    });
    setMatches(matchesForNewDate.slice(0, 5));
  };


  // Render match card (same style as monitor screens)
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

  useEffect(() => {
    console.log('🏐 TournamentDetail: useEffect triggered', { 
      tournamentNo: tournament.No, 
      tournamentName: tournament.Name,
      hasTournamentData: !!tournamentData 
    });
    
    if (tournament.No) {
      loadMatches();
      loadTournamentDetails();
    } else {
      console.log('🏐 TournamentDetail: No tournament.No, skipping loadMatches');
    }
  }, [tournament.No, tournamentData]); // Added tournamentData as dependency

  // Additional trigger - try to load when tournament data becomes available
  useEffect(() => {
    if (tournament.No && allMatches.length === 0) {
      console.log('🏐 TournamentDetail: Retry trigger - tournament available but no matches loaded');
      loadMatches();
    }
  }, [tournament]);

  // Handle status bar press - navigate to assignments if available
  const handleStatusPress = () => {
    if (currentAssignmentStatus) {
      router.push('/my-assignments');
    }
  };


  if (!tournament.No) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Tournament data not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Navigation Header without Status Bar */}
      <NavigationHeader
        title="Tournament Details"
        showBackButton={false}
        showStatusBar={false}
        rightComponent={
          <TouchableOpacity 
            style={styles.tournamentSelectButton}
            onPress={() => router.push('/tournament-selection')}
          >
            <Text style={styles.tournamentSelectButtonText}>📋</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {/* Tournament Card */}
        <View style={styles.tournamentCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.statusText}>{getTournamentStatus().toUpperCase()}</Text>
            </View>
            {detailsLoading && (
              <ActivityIndicator size="small" color="#FF6B35" style={styles.loadingIndicator} />
            )}
          </View>

          <Text style={styles.tournamentName}>
            {tournament.Title || tournament.Name || `Tournament ${tournament.No}`}
          </Text>

          <View style={styles.detailsContainer}>
            {/* Date */}
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📅</Text>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{getDateRange()}</Text>
              </View>
            </View>

            {/* Location - only show if available */}
            {getLocation() && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>📍</Text>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{getLocation()}</Text>
                </View>
              </View>
            )}

            {/* Tournament Type/Category */}
            {(detailedTournament?.Type || detailedTournament?.Category || detailedTournament?.Series) && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>🏆</Text>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>
                    {detailedTournament?.Type || detailedTournament?.Category || detailedTournament?.Series}
                  </Text>
                </View>
              </View>
            )}


            {/* Prize Money */}
            {(detailedTournament?.PrizeMoney || detailedTournament?.Prize) && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>💰</Text>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Prize Money</Text>
                  <Text style={styles.detailValue}>
                    {detailedTournament?.PrizeMoney || detailedTournament?.Prize}
                    {detailedTournament?.Currency && ` ${detailedTournament.Currency}`}
                  </Text>
                </View>
              </View>
            )}

            {/* Venue Details */}
            {detailedTournament?.Venue && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>🏟️</Text>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Venue</Text>
                  <Text style={styles.detailValue}>{detailedTournament.Venue}</Text>
                </View>
              </View>
            )}

            {/* Number of Courts */}
            {detailedTournament?.Courts && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>🏐</Text>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Courts</Text>
                  <Text style={styles.detailValue}>{detailedTournament.Courts}</Text>
                </View>
              </View>
            )}

            {/* Surface Type */}
            {detailedTournament?.Surface && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>🏖️</Text>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Surface</Text>
                  <Text style={styles.detailValue}>{detailedTournament.Surface}</Text>
                </View>
              </View>
            )}

            {/* Entry Deadline */}
            {detailedTournament?.EntryDeadline && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>⏰</Text>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Entry Deadline</Text>
                  <Text style={styles.detailValue}>{formatDate(detailedTournament.EntryDeadline)}</Text>
                </View>
              </View>
            )}

            {/* Contact Information */}
            {detailedTournament?.ContactName && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>👤</Text>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Contact</Text>
                  <Text style={styles.detailValue}>{detailedTournament.ContactName}</Text>
                  {detailedTournament.ContactEmail && (
                    <Text style={styles.detailSubValue}>{detailedTournament.ContactEmail}</Text>
                  )}
                  {detailedTournament.ContactPhone && (
                    <Text style={styles.detailSubValue}>{detailedTournament.ContactPhone}</Text>
                  )}
                </View>
              </View>
            )}

            {/* Website */}
            {detailedTournament?.Website && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>🌐</Text>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Website</Text>
                  <Text style={styles.detailValue}>{detailedTournament.Website}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Match Results Section */}
        {allMatches.length > 0 && (
          <MatchList
            matches={allMatches}
            loading={matchesLoading}
            title={getTournamentStatus() === 'Live' ? 'Latest Results' : 'Final Results'}
            emptyMessage="No match results available"
            showDateNavigator={true}
          />
        )}

      </ScrollView>

      <BottomTabNavigation 
        currentTab="details" 
        onTabPress={(tab) => {
          if (tab === 'details' && tournament) {
            // Already on details page, do nothing
            return;
          } else if (tab === 'monitor' && tournament) {
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 20,
    color: '#1B365D',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for fixed button
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#1B365D',
    fontWeight: '600',
  },
  tournamentCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 8,
    marginVertical: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#1B365D',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tournamentName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 24,
    lineHeight: 36,
  },
  detailsContainer: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#1B365D',
    fontWeight: '600',
  },
  detailSubValue: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  loadingIndicator: {
    marginLeft: 8,
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
  
  tournamentSelectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1B365D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1B365D',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  
  tournamentSelectButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  
  // Match Results Styles
  matchResultsSection: {
    marginHorizontal: 8,
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  matchResultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 16,
  },
  matchesLoading: {
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
    gap: 16,
  },
  dateGroup: {
    marginBottom: 8,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 80,
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
  courtInfo: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  noMatchesText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    paddingVertical: 20,
  },
  winnerTeamName: {
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  winnerScoreText: {
    fontWeight: 'bold',
    color: '#2E8B57',
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
  genderBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 24,
    alignItems: 'center',
  },
  menBadge: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#1976D2',
  },
  womenBadge: {
    backgroundColor: '#FCE4EC',
    borderWidth: 1,
    borderColor: '#C2185B',
  },
  mixedBadge: {
    backgroundColor: '#F3E5F5',
    borderWidth: 1,
    borderColor: '#7B1FA2',
  },
  genderBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  roundInfoTop: {
    fontSize: 11,
    color: '#FF6B35',
    fontWeight: 'bold',
    textTransform: 'uppercase',
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
    backgroundColor: '#87CEEB', // Light blue - same as court monitor
  },
  womenStrip: {
    backgroundColor: '#FFB6C1', // Light pink - same as court monitor
  },
  loadMoreButton: {
    backgroundColor: '#4A90A4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    alignSelf: 'center',
    minWidth: 150,
  },
  loadMoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadMoreButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Additional styles for match cards (same as monitor screens)
  leftTopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInfoTop: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
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

// Wrapper component with AssignmentStatusProvider
const TournamentDetailScreen: React.FC = () => {
  return (
    <AssignmentStatusProvider>
      <TournamentDetailScreenContent />
    </AssignmentStatusProvider>
  );
};

export default TournamentDetailScreen;