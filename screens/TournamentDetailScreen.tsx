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
import { MatchList } from '../components/MatchList/MatchList';
import { designTokens } from '../theme/tokens';
// Removed TournamentDateExtractor - now using direct API StartDate/EndDate

const TournamentDetailScreenContent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [detailedTournament, setDetailedTournament] = useState<Tournament | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [matches, setMatches] = useState<BeachMatch[] | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'ranking'>('schedule');
  const router = useRouter();
  const { tournamentData } = useLocalSearchParams<{ tournamentData: string }>();

  const tournament: Tournament = React.useMemo(() => {
    try {
      const parsed = JSON.parse(tournamentData || '{}') as Tournament;
      console.log(`DEBUG INITIAL DATA: Complete tournament object received:`, {
        No: parsed.No,
        NoTournament: parsed.NoTournament,
        Code: parsed.Code,
        Name: parsed.Name,
        Title: parsed.Title,
        StartDate: parsed.StartDate,
        EndDate: parsed.EndDate,
        StartDateQualification: parsed.StartDateQualification,
        EndDateMainDraw: parsed.EndDateMainDraw,
        City: parsed.City,
        Country: parsed.Country,
        CountryName: parsed.CountryName,
        Location: parsed.Location,
        Venue: parsed.Venue,
        Surface: parsed.Surface,
        Gender: parsed.Gender,
        Teams: parsed.Teams,
        MaxTeams: parsed.MaxTeams,
        PrizeMoney: parsed.PrizeMoney,
        Currency: parsed.Currency,
        Category: parsed.Category,
        Type: parsed.Type,
        Series: parsed.Series,
        Status: parsed.Status
      });
      const merged = (parsed as any)._mergedTournaments;
      if (merged && merged.length > 1) {
        console.log(`DEBUG MERGED: This is a merged tournament with codes:`, merged.map((t: any) => ({ No: t.No, Name: t.Name, StartDate: t.StartDate, EndDate: t.EndDate })));
      }
      
      return parsed;
    } catch (error) {
      console.error('🏐 TOURNAMENT DETAILS: Failed to parse tournament data:', error);
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

  // Compact date formatting functions (moved from TournamentDateExtractor)
  const formatCompactDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      const day = date.getDate().toString().padStart(2, '0');
      const monthName = getMonthNameShort(date.getMonth());
      
      return `${day} ${monthName}`;
    } catch {
      return dateStr;
    }
  };

  const formatCompactDateRange = (startDate: string, endDate: string): string => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const startDay = start.getDate().toString().padStart(2, '0');
      const endDay = end.getDate().toString().padStart(2, '0');
      const monthName = getMonthNameShort(start.getMonth());
      
      // If same date, show as single date
      if (startDate === endDate) {
        return `${startDay} ${monthName}`;
      }
      
      // Check if they're in the same month/year
      if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        return `${startDay} - ${endDay} ${monthName}`;
      } else {
        // Different months - show month for each date
        const endMonthName = getMonthNameShort(end.getMonth());
        return `${startDay} ${monthName} - ${endDay} ${endMonthName}`;
      }
    } catch {
      return `${startDate} - ${endDate}`;
    }
  };

  const getMonthNameShort = (monthIndex: number): string => {
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return monthNames[monthIndex] || 'Jan';
  };

  const getLocation = () => {
    // Use detailed tournament data if available, fallback to basic tournament data
    const tournamentData = detailedTournament || tournament;
    const city = tournamentData.City;
    const country = tournamentData.CountryName || tournamentData.Country;
    
    if (city && country) {
      return `${city}, ${country}`;
    }
    
    // Only return location if we have explicit location data, city, or country
    // Don't show "Location not specified" or try to infer from title
    return tournamentData.Location || city || country || null;
  };

  // Function codes mapping (verified from VIS API data)
  const getFunctionName = (functionCode: string): string => {
    const functionMap: { [key: string]: string } = {
      '1': 'Main Referee',
      '2': 'Line Judge', 
      '3': 'Scorer',
      '4': 'Assistant/Volunteer',
      '5': 'Technical Official',
      '6': 'Supervisor',
      '7': 'Medical Staff',
      '8': 'Media Officer',
      // Based on actual data analysis
    };
    return functionMap[functionCode] || `Function ${functionCode}`;
  };

  // Parse XML content to extract useful information
  const parseAuxiliaryPersons = (xmlString?: string): string => {
    if (!xmlString) return '';
    
    try {
      // Decode HTML entities
      const decoded = xmlString
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#xD;&#xA;/g, '')
        .replace(/&#xA;/g, '');
      
      // Extract person information using regex
      const personMatches = decoded.match(/<AuxiliaryPerson[^>]*>/g);
      if (!personMatches) return '';
      
      // Group by function to show function counts
      const functionGroups: { [key: string]: Array<{name: string, nationality: string}> } = {};
      
      const persons = personMatches.map(match => {
        const firstNameMatch = match.match(/FirstName="([^"]*)"/);
        const lastNameMatch = match.match(/LastName="([^"]*)"/);
        const nationalityMatch = match.match(/NationalityCode="([^"]*)"/);
        const functionMatch = match.match(/Functions="([^"]*)"/);
        
        const firstName = firstNameMatch ? firstNameMatch[1] : '';
        const lastName = lastNameMatch ? lastNameMatch[1] : '';
        const nationality = nationalityMatch ? nationalityMatch[1] : '';
        const functionCode = functionMatch ? functionMatch[1] : '';
        
        const functionName = getFunctionName(functionCode);
        
        // Group by function
        if (!functionGroups[functionName]) {
          functionGroups[functionName] = [];
        }
        functionGroups[functionName].push({ name: `${firstName} ${lastName}`, nationality });
        
        return `${firstName} ${lastName} (${nationality}, ${functionName})`;
      });
      
      // Create summary by function
      const functionSummary = Object.entries(functionGroups)
        .map(([funcName, people]) => `${people.length} ${funcName}${people.length > 1 ? 's' : ''}`)
        .join(', ');
      
      return `${persons.length} people: ${functionSummary}. Examples: ${persons.slice(0, 2).join(', ')}${persons.length > 2 ? '...' : ''}`;
    } catch {
      return 'Personnel information available';
    }
  };

  const parseOfficialFunctions = (xmlString?: string): string => {
    if (!xmlString) return '';
    
    try {
      // Decode HTML entities
      const decoded = xmlString
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#xD;&#xA;/g, '')
        .replace(/&#xA;/g, '');
      
      // Try to extract official function information
      // This might have different XML structure - let's see what we get
      
      // Look for common official XML patterns
      const functionMatches = decoded.match(/<[^>]*Function[^>]*>/g) || 
                             decoded.match(/<Official[^>]*>/g) ||
                             decoded.match(/<[^>]*Code="[^"]*"[^>]*>/g);
      
      if (functionMatches && functionMatches.length > 0) {
        // Extract function codes/names from the matches
        const functions = functionMatches.map(match => {
          const codeMatch = match.match(/Code="([^"]*)"/);
          const nameMatch = match.match(/Name="([^"]*)"/);
          const typeMatch = match.match(/Type="([^"]*)"/);
          
          if (codeMatch) return `Function ${codeMatch[1]}`;
          if (nameMatch) return nameMatch[1];
          if (typeMatch) return typeMatch[1];
          return 'Official Function';
        });
        
        return `${functions.length} official functions: ${functions.slice(0, 3).join(', ')}${functions.length > 3 ? '...' : ''}`;
      }
      
      // Fallback: if it's just text content, show first part
      const textContent = decoded.replace(/<[^>]*>/g, '').trim();
      if (textContent) {
        return `Official functions: ${textContent.substring(0, 50)}${textContent.length > 50 ? '...' : ''}`;
      }
      
      return 'Official functions available';
    } catch {
      return 'Official functions available';
    }
  };

  const getDateRange = () => {
    // Use complete tournament dates: StartDateQualification to EndDateMainDraw
    const tournamentData = detailedTournament || tournament;
    const startDate = tournamentData?.StartDateQualification || tournamentData?.StartDate;
    const endDate = tournamentData?.EndDateMainDraw || tournamentData?.EndDate;
    
    if (!startDate && !endDate) {
      return 'Dates TBD';
    }
    
    if (startDate && endDate) {
      if (startDate === endDate) {
        return formatCompactDate(startDate);
      }
      return `${formatCompactDate(startDate)} - ${formatCompactDate(endDate)}`;
    }
    
    // If only one date is available
    if (startDate) {
      return formatCompactDate(startDate);
    } else if (endDate) {
      return `until ${formatCompactDate(endDate)}`;
    }
    
    return 'Dates TBD';
  };

  const getTournamentStatus = () => {
    // Use direct API StartDate and EndDate for status calculation
    const startDate = detailedTournament?.StartDate || tournament.StartDate;
    const endDate = detailedTournament?.EndDate || tournament.EndDate;
    
    if (!startDate) {
      return 'Scheduled';
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    if (today < startDate) {
      return 'Upcoming';
    }
    
    if (endDate) {
      if (today > endDate) {
        return 'Completed';
      }
      if (today >= startDate && today <= endDate) {
        return 'Live';
      }
    } else {
      // Only start date available - consider live for reasonable duration
      const start = new Date(startDate);
      const weekAfter = new Date(start);
      weekAfter.setDate(start.getDate() + 7);
      
      const now = new Date();
      if (now >= start && now <= weekAfter) {
        return 'Live';
      }
      if (now > weekAfter) {
        return 'Completed';
      }
    }
    
    return 'Scheduled';
  };


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

  // Load detailed tournament information and parse ALL available data
  const loadTournamentDetails = async () => {
    if (!tournament.No) return;
    
    setDetailsLoading(true);
    try {
      // Get enhanced tournament details from GetEventList API
      console.log(`DEBUG: Loading details for tournament No: ${tournament.No}`);
      const details = await VisApiService.getBeachTournamentDetails(tournament.No);
      console.log(`DEBUG: API returned details for tournament:`, details?.Name, details?.No);
      
      if (details) {
        
        // Merge the detailed data with the basic tournament data
        setDetailedTournament({
          ...tournament,
          ...details
        });
      } else {
        setDetailedTournament(tournament);
      }
    } catch (error) {
      // Fallback to basic tournament data
      setDetailedTournament(tournament);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Load matches for the tournament
  const loadMatches = async () => {
    // Use NoTournament if available, fallback to No
    const tournamentId = tournament.NoTournament || tournament.No;
    if (!tournamentId) return;
    
    console.log(`🏐 LOADING MATCHES: Using tournament ID "${tournamentId}" (NoTournament: ${tournament.NoTournament}, No: ${tournament.No})`);
    
    setMatchesLoading(true);
    try {
      const tournamentMatches = await VisApiService.getBeachMatchList(tournamentId);
      setMatches(tournamentMatches);
      console.log(`🏐 MATCHES LOADED: Got ${tournamentMatches.length} matches for tournament ${tournamentId}`);
    } catch (error) {
      console.error('Failed to load matches:', error);
      setMatches([]);
    } finally {
      setMatchesLoading(false);
    }
  };

  

  useEffect(() => {
    if (tournament.No) {
      // TEMPORARILY DISABLED - loadTournamentDetails() restituisce dati sbagliati (Locarno instead of Baden)
      // loadTournamentDetails();
      loadMatches();
    }
    
    // Clear expired caches on first load
    TournamentStorageService.clearExpiredTournamentCaches().catch(() => {
      // Silent fail for cache cleanup
    });
  }, [tournament.No, tournamentData]); // Added tournamentData as dependency

  // Debug effect for MatchList render
  useEffect(() => {
  }, [matches, matchesLoading, activeTab]);


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
      <NavigationHeader 
        title={tournament.Name || 'Tournament Details'} 
        showBackButton={true}
        showRefreshButton={true}
        onRefresh={() => {
          loadMatches();
          console.log('🏐 Refreshing tournament details and matches...');
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {/* Loading State */}
        {detailsLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingText}>Loading tournament details...</Text>
          </View>
        )}

        {/* Tournament Summary Card - Compact version */}
        <View style={styles.compactSummaryCard}>
          <View style={styles.compactCardHeader}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.statusText}>{getTournamentStatus().toUpperCase()}</Text>
            </View>
          </View>
          
          <View style={styles.compactInfo}>
            <View style={styles.infoRowContainer}>
              <Text style={styles.infoIcon}>📅</Text>
              <Text style={styles.infoValue}>{getDateRange()}</Text>
            </View>
            {getLocation() ? (
              <View style={styles.infoRowContainer}>
                <Text style={styles.infoIcon}>📍</Text>
                <Text style={styles.infoValue}>{getLocation()}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Tournament Tabs: Schedule and Results / Ranking */}
        <View style={styles.tabsSection}>
          {/* Tab Headers */}
          <View style={styles.tabHeadersContainer}>
            <View style={styles.tabHeaders}>
              <TouchableOpacity
                style={[styles.tabHeader, activeTab === 'schedule' && styles.activeTabHeader]}
                onPress={() => setActiveTab('schedule')}
              >
                <Text style={[styles.tabHeaderText, activeTab === 'schedule' && styles.activeTabHeaderText]}>
                  Schedule & Results
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabHeader, activeTab === 'ranking' && styles.activeTabHeader]}
                onPress={() => setActiveTab('ranking')}
              >
                <Text style={[styles.tabHeaderText, activeTab === 'ranking' && styles.activeTabHeaderText]}>
                  Ranking
                </Text>
              </TouchableOpacity>
            </View>
            {activeTab === 'schedule' && (
              <TouchableOpacity
                style={styles.refreshMatchesButton}
                onPress={async () => {
                  try {
                    const { CacheService } = await import('../services/CacheService');
                    await CacheService.invalidateMatchCache(tournament.No);
                  } catch (error) {
                    console.error("Failed to clear match cache:", error);
                  }
                  setMatches(null);
                  loadMatches();
                }}
                disabled={matchesLoading}
              >
                <Text style={styles.refreshMatchesButtonText}>
                  {matchesLoading ? '🔄' : '🔄'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'schedule' && (
              <MatchList
                matches={matches || []}
                loading={matchesLoading || matches === null}
                title=""
                emptyMessage={(() => {
                  const status = getTournamentStatus();
                  if (status === 'Completed') {
                    return "Match data not available for this completed tournament";
                  } else if (status === 'Upcoming') {
                    return "Matches will be available when the tournament starts";
                  }
                  return "No matches available for this tournament";
                })()}
                showDateNavigator={true}
                showGenderFilter={false}
                showStatsInFilter={false}
                showCourtFilter={true}
                showRefereeFilter={true}
              />
            )}
            {activeTab === 'ranking' && (
              <View style={styles.rankingPlaceholder}>
                <Text style={styles.rankingPlaceholderText}>
                  Tournament ranking will be available here
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Location and Schedule sections temporarily disabled */}


      </ScrollView>

      {/* BottomTabNavigation temporarily disabled */}
      <View style={{backgroundColor: '#FFF', padding: 10, borderTopWidth: 1, borderTopColor: '#ccc'}}>
        <Text style={{textAlign: 'center'}}>Bottom Nav Placeholder</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  
  // Tournament Summary Card - Compact version
  compactSummaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactCardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 12,
  },
  compactInfo: {
    gap: 6,
  },
  infoRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoIcon: {
    fontSize: 16,
    width: 20,
  },
  infoRow: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B365D',
    flex: 1,
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
  
  // Status Integration Styles
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
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

  // Tabs Section Styles
  tabsSection: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  tabHeadersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tabHeaders: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
    flex: 1,
  },
  refreshMatchesButton: {
    backgroundColor: '#FF6B35',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  refreshMatchesButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tabHeader: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTabHeader: {
    backgroundColor: '#1B365D',
  },
  tabHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabHeaderText: {
    color: '#FFFFFF',
  },
  tabContent: {
    minHeight: 200,
  },
  rankingPlaceholder: {
    backgroundColor: '#FFFFFF',
    padding: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 150,
  },
  rankingPlaceholderText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
  },

  // Schedule Section Styles
  scheduleSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B365D',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },

  scheduleContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  scheduleText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    textAlign: 'left',
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