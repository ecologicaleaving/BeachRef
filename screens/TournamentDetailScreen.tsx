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
import { colors } from '../theme/tokens';
import { TournamentCore } from '../types/tournament-v2';
import { BeachMatchCore } from '../types/match-v2';
import { TournamentStorageService } from '../services/TournamentStorageService';
// Dynamic imports for VisApiClient will be done in the function
import { GetBeachMatchListRequest } from '../types/api-v2';
import { VisResponseParser } from '../services/parsing/VisResponseParser';
// DataTransformationService no longer needed - using BeachMatchCore directly
import { AssignmentStatusProvider, useAssignmentStatus } from '../hooks/useAssignmentStatus';
import { useLiveScores } from '../hooks/useLiveScores';
import BottomTabNavigation from '../components/navigation/BottomTabNavigation';
import NavigationHeader from '../components/navigation/NavigationHeader';
import { MatchListV2 } from '../components/MatchList/MatchListV2';
import DateNavigator from '../components/DateNavigator/DateNavigator';
import { LiveScoreCard } from '../components/live-score/LiveScoreCard';
import { designTokens } from '../theme/tokens';
import { FlagImage } from '../components/FlagImage';
// Removed TournamentDateExtractor - now using direct API StartDate/EndDate

const TournamentDetailScreenContent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [detailedTournament, setDetailedTournament] = useState<TournamentCore | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [matches, setMatches] = useState<BeachMatchCore[] | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'ranking'>('schedule');
  const [hasRankingData, setHasRankingData] = useState(false); // Will be true when ranking API is implemented
  
  // Filter states for external control of MatchListV2
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [courtFilter, setCourtFilter] = useState<string>('All');
  const [genderFilter, setGenderFilter] = useState<'All' | 'M' | 'W'>('All');
  
  const router = useRouter();
  const { tournamentData } = useLocalSearchParams<{ tournamentData: string }>();

  const tournament: TournamentCore = React.useMemo(() => {
    try {
      const parsed = JSON.parse(tournamentData || '{}') as TournamentCore;
      const merged = (parsed as any)._mergedTournaments;
      
      return parsed;
    } catch (error) {
      return {} as TournamentCore;
    }
  }, [tournamentData]);

  // Assignment status management
  const { 
    currentAssignmentStatus,
    statusCounts,
    isOnline,
    syncStatus
  } = useAssignmentStatus();

  // Get match numbers for live score polling
  const matchNumbers = React.useMemo(() => {
    if (!matches) return [];
    return matches
      .filter(match => {
        // Only poll for matches that are likely to have live scores
        const status = match.status;
        return status === 'InProgress' || status === 'Scheduled';
      })
      .map(match => match.matchNumber);
  }, [matches]);

  // Live scores hook with automatic lifecycle management
  const {
    liveScores,
    isLoading: liveScoresLoading,
    isOnline: liveScoresOnline,
    isPolling,
    getLiveScore,
    refreshLiveScores,
    statistics: liveScoreStats
  } = useLiveScores({
    matchNumbers,
    autoStart: true // Auto-start polling when screen is focused
  });

  // Extract unique dates from matches for DateNavigator
  const uniqueDates = React.useMemo(() => {
    if (!matches) return [];
    
    const validDates = matches
      .map(match => {
        const date = new Date(match.scheduledDateTime);
        if (isNaN(date.getTime())) {
          return null;
        }
        return date.toISOString().split('T')[0]; // YYYY-MM-DD format
      })
      .filter(date => date !== null) as string[];
    
    return Array.from(new Set(validDates)).sort();
  }, [matches]);


  // Function to get match count per date for DateNavigator
  const getMatchCountForDate = (date: string): number => {
    if (!matches) return 0;
    return matches.filter(match => {
      const matchDate = new Date(match.scheduledDateTime);
      if (isNaN(matchDate.getTime())) return false;
      return matchDate.toISOString().split('T')[0] === date;
    }).length;
  };

  // Smart date selection: set today if tournament is live, last day if finished, first day if upcoming
  useEffect(() => {
    if (!matches || uniqueDates.length === 0 || selectedDate !== '') return;

    const today = new Date().toISOString().split('T')[0];
    const firstDate = uniqueDates[0];
    const lastDate = uniqueDates[uniqueDates.length - 1];
    
    // Get tournament status within the effect to avoid hoisting issues
    const tournamentStatus = getTournamentStatus();

    // If tournament is live and today has matches, select today
    if (tournamentStatus === 'Live' && uniqueDates.includes(today)) {
      setSelectedDate(today);
    }
    // If tournament is finished, select last day
    else if (tournamentStatus === 'Completed') {
      setSelectedDate(lastDate);
    }
    // If tournament is upcoming, select first day
    else if (tournamentStatus === 'Upcoming') {
      setSelectedDate(firstDate);
    }
    // Fallback: if today is within tournament dates, select today
    else if (uniqueDates.includes(today)) {
      setSelectedDate(today);
    }
    // Final fallback: select last date
    else {
      setSelectedDate(lastDate);
    }
  }, [matches, uniqueDates, selectedDate]); // Removed getTournamentStatus from dependencies

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
    const city = tournamentData.city;
    const country = tournamentData.country;
    
    if (city && country) {
      return `${city}, ${country}`;
    }
    
    // Only return location if we have explicit location data, city, or country
    // Don't show "Location not specified" or try to infer from title
    return tournamentData.location || city || country || null;
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
    // Use complete tournament dates from TournamentCore structure
    const tournamentData = detailedTournament || tournament;
    const startDate = tournamentData?.dates?.startDateQualification || tournamentData?.dates?.startDate;
    const endDate = tournamentData?.dates?.endDateMainDraw || tournamentData?.dates?.endDate;
    
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
    // Use direct API dates for status calculation
    const startDate = detailedTournament?.dates?.startDate || tournament.dates?.startDate;
    const endDate = detailedTournament?.dates?.endDate || tournament.dates?.endDate;
    
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
        return colors.success;
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
    if (!tournament.visNo) return;
    
    setDetailsLoading(true);
    try {
      // Get enhanced tournament details from GetEventList API
      const details = await VisApiClient.getBeachTournamentDetails(tournament.visNo);
      
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

  // Load matches for the tournament - MUST wait for real tournament number from GetBeachTournament
  const loadMatches = async () => {
    
    // If we don't have the real tournament number yet, we need to get it first
    if (!(tournament as any).tournamentNo) {
      
      const { VisApiClient } = await import('../services/api/VisApiClient');
      const { DEFAULT_RETRY_CONFIG } = await import('../types/api-v2');
      
      const config = {
        baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
        timeoutMs: 30000,
        maxRetries: 3,
        retryDelayMs: 1000,
        enableLogging: true,
        headers: {}
      };
      
      const visApi = new VisApiClient(config, DEFAULT_RETRY_CONFIG);
      
      try {
        const tournamentResponse = await visApi.getEvent({
          eventNo: tournament.visNo,
          includeOfficials: false,
          includeReferees: false
        });
        
        if (tournamentResponse.success && tournamentResponse.xmlData) {
          
          // Extract BeachTournament numbers from Content field of GetEvent response
          // The Content field is an attribute on the Event element, not a separate element
          let contentField = '';
          const contentMatch = tournamentResponse.xmlData.match(/Content="([^"]*)"/);
          if (contentMatch) {
            contentField = contentMatch[1];
            
            // Decode HTML entities
            const decodedContent = contentField
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#xD;&#xA;/g, '')
              .replace(/&#xA;/g, '');
            
            
            // Now extract BeachTournament entries from the decoded content
            const beachTournamentMatches = decodedContent.match(/<BeachTournament[^>]*No="([^"]*)"[^>]*Gender="([^"]*)"[^>]*\/>/g);
            
            if (beachTournamentMatches && beachTournamentMatches.length > 0) {
              // Parse each BeachTournament entry
              const tournaments = beachTournamentMatches.map(match => {
                const noMatch = match.match(/No="([^"]*)"/);
                const genderMatch = match.match(/Gender="([^"]*)"/);
                return {
                  no: noMatch ? noMatch[1] : null,
                  gender: genderMatch ? genderMatch[1] : null
                };
              });
              
              
              // Store both tournament numbers for loading both men's and women's matches
              const validTournaments = tournaments.filter(t => t.no && t.gender);
              if (validTournaments.length > 0) {
                (tournament as any).beachTournaments = validTournaments;
                // For backward compatibility, still set the main tournamentNo to the first one
                (tournament as any).tournamentNo = validTournaments[0].no;
              } else {
                (tournament as any).tournamentNo = tournament.visNo;
              }
            } else {
              (tournament as any).tournamentNo = tournament.visNo;
            }
          } else {
            (tournament as any).tournamentNo = tournament.visNo;
          }
        } else {
          (tournament as any).tournamentNo = tournament.visNo;
        }
      } catch (error) {
        (tournament as any).tournamentNo = tournament.visNo;
      }
    }
    
    // Get all available tournament numbers (both men's and women's if available)
    const beachTournaments = (tournament as any).beachTournaments;
    const tournamentNo = (tournament as any).tournamentNo;
    
    
    if (!beachTournaments && !tournamentNo) {
      setMatches([]);
      return;
    }
    
    setMatchesLoading(true);
    try {
      const { VisApiClient } = await import('../services/api/VisApiClient');
      const { DEFAULT_RETRY_CONFIG } = await import('../types/api-v2');
      
      const config = {
        baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
        timeoutMs: 30000, // Increase to 30 seconds for match list requests (can be large)
        maxRetries: 3,
        retryDelayMs: 1000,
        enableLogging: true,
        headers: {}
      };
      
      const visApi = new VisApiClient(config, DEFAULT_RETRY_CONFIG);
      
      let allMatches: BeachMatchCore[] = [];
      
      // If we have separated beach tournaments, load matches from each
      if (beachTournaments && beachTournaments.length > 0) {
        
        for (const beachTournament of beachTournaments) {
          const matchRequest: GetBeachMatchListRequest = {
            tournamentNo: beachTournament.no,
            includeResults: true,
            includeReferees: true
          };
          
          const matchResponse = await visApi.getBeachMatchList(matchRequest);
          
          if (matchResponse.success && matchResponse.xmlData) {
            const matchesCore = VisResponseParser.parseBeachMatches(matchResponse.xmlData, beachTournament.no);
            
            // Add gender information to each match
            const matchesWithGender = matchesCore.map(match => ({
              ...match,
              tournamentGender: beachTournament.gender === '0' ? 'M' : 'W',
              tournamentNo: beachTournament.no
            }));
            
            allMatches = allMatches.concat(matchesWithGender);
          } else {
          }
        }
      } else {
        // Fallback: load from single tournament number
        
        const matchRequest: GetBeachMatchListRequest = {
          tournamentNo: tournamentNo,
          includeResults: true,
          includeReferees: true
        };
        
        const matchResponse = await visApi.getBeachMatchList(matchRequest);
        
        // If failed and we have a real TournamentNo different from EventNo, try EventNo as fallback
        if (!matchResponse.success && tournament.visNo !== tournamentNo) {
          const fallbackRequest: GetBeachMatchListRequest = {
            tournamentNo: tournament.visNo,
            includeResults: true,
            includeReferees: true
          };
          const fallbackResponse = await visApi.getBeachMatchList(fallbackRequest);
          
          if (fallbackResponse.success && fallbackResponse.xmlData) {
            allMatches = VisResponseParser.parseBeachMatches(fallbackResponse.xmlData, tournament.visNo);
          }
        } else if (matchResponse.success && matchResponse.xmlData) {
          allMatches = VisResponseParser.parseBeachMatches(matchResponse.xmlData, tournamentNo);
        }
      }
      
      // Parse the response asynchronously to avoid blocking UI
      if (allMatches.length > 0) {
        
        setTimeout(async () => {
          try {
            // Sort matches by date and time for better organization
            const sortedMatches = allMatches.sort((a, b) => {
              const dateA = new Date(a.scheduledDateTime);
              const dateB = new Date(b.scheduledDateTime);
              return dateA.getTime() - dateB.getTime();
            });
            
            setMatches(sortedMatches);
            setMatchesLoading(false);
          } catch (parseError) {
            setMatches([]);
            setMatchesLoading(false);
          }
        }, 10); // Small delay to let UI update
      } else {
        setMatches([]);
        setMatchesLoading(false);
      }
    } catch (error) {
      setMatches([]);
      setMatchesLoading(false);
    }
    // Note: Don't set setMatchesLoading(false) in finally - async parsing handles it
  };

  

  useEffect(() => {
    if (tournament.visNo) {
      // TEMPORARILY DISABLED - loadTournamentDetails() restituisce dati sbagliati (Locarno instead of Baden)
      // loadTournamentDetails();
      loadMatches();
    }
    
    // Clear expired caches on first load
    TournamentStorageService.clearExpiredTournamentCaches().catch(() => {
      // Silent fail for cache cleanup
    });
  }, [tournament.visNo, tournamentData]); // Added tournamentData as dependency

  // Debug effect for MatchList render
  useEffect(() => {
  }, [matches, matchesLoading, activeTab]);


  // Handle status bar press - navigate to assignments if available
  const handleStatusPress = () => {
    if (currentAssignmentStatus) {
      router.push('/my-assignments');
    }
  };



  if (!tournament.visNo) {
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
        title={tournament.name || 'Tournament Details'} 
        showBackButton={false}
        showRefreshButton={false}
        showStatusBar={false}
      />

      {/* Tournament Info - Scrollable */}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[1]} // Make the tabs section sticky (after tournament card)
      >
        {/* Loading state - when active, shows instead of content */}
        {detailsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingText}>Loading tournament details...</Text>
          </View>
        ) : (
          <>
            {/* Index 0: Tournament Card - will scroll up and disappear */}
            <View style={styles.tournamentCard}>
              <View style={styles.tournamentCardHeader}>
                <View style={styles.tournamentHeaderLeft}>
                  {tournament.gender && (
                    <View style={styles.genderBadgesContainer}>
                      {tournament.gender === 'M' ? (
                        <View style={styles.genderBadge}>
                          <Text style={[styles.genderSymbol, styles.menSymbol]}>M</Text>
                        </View>
                      ) : tournament.gender === 'W' ? (
                        <View style={styles.genderBadge}>
                          <Text style={[styles.genderSymbol, styles.womenSymbol]}>W</Text>
                        </View>
                      ) : (
                        <>
                          <View style={styles.genderBadge}>
                            <Text style={[styles.genderSymbol, styles.menSymbol]}>M</Text>
                          </View>
                          <Text style={styles.plusSymbol}>+</Text>
                          <View style={styles.genderBadge}>
                            <Text style={[styles.genderSymbol, styles.womenSymbol]}>W</Text>
                          </View>
                        </>
                      )}
                    </View>
                  )}
                </View>
                <View style={styles.tournamentHeaderRight}>
                  {getTournamentStatus() === 'Live' ? (
                    <View style={[styles.statusBadge, styles.liveBadgeStyle]}>
                      <View style={styles.liveIndicatorPulse} />
                      <Text style={[styles.statusText, styles.liveStatusText]}>LIVE</Text>
                    </View>
                  ) : (
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                      <Text style={styles.statusText}>{getTournamentStatus().toUpperCase()}</Text>
                    </View>
                  )}
                </View>
              </View>
              
              <View style={styles.titleRow}>
                <FlagImage
                  federationCode={tournament.countryCode || tournament.country}
                  teamName={tournament.country}
                  size="medium"
                  style={styles.tournamentFlag}
                />
                <Text style={styles.tournamentName}>
                  {tournament.title || tournament.name}
                </Text>
              </View>
              
              <View style={styles.dateRow}>
                <Text style={styles.dateIcon}>📅</Text>
                <Text style={styles.tournamentDate}>{getDateRange()}</Text>
              </View>
            </View>

            {/* Index 1: Sticky Tabs and Filters - will stick to top when tournament card scrolls up */}
            <View style={styles.stickyTabsWrapper}>
              <View style={styles.tabsSection}>
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
                    {hasRankingData && (
                      <TouchableOpacity
                        style={[styles.tabHeader, activeTab === 'ranking' && styles.activeTabHeader]}
                        onPress={() => setActiveTab('ranking')}
                      >
                        <Text style={[styles.tabHeaderText, activeTab === 'ranking' && styles.activeTabHeaderText]}>
                          Ranking
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                
                {/* DateNavigator and filters - always visible for schedule tab */}
                {activeTab === 'schedule' && uniqueDates.length > 0 && (
                  <DateNavigator
                    availableDates={uniqueDates}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    getMatchCount={getMatchCountForDate}
                  />
                )}
                
              </View>
            </View>

            {/* Index 2: Tab Content - scrollable content below sticky tabs */}
            <View style={styles.tabContent}>
              {activeTab === 'schedule' && (
                <>
                  {/* Live Score Cards for InProgress/Scheduled matches */}
                  {matches && matches.length > 0 && (
                    <View style={styles.liveScoresContainer}>
                      {matches
                        .filter(match => {
                          // Show LiveScoreCard for matches that could have live data
                          const status = match.status;
                          const matchDate = new Date(match.scheduledDateTime);
                          const selectedMatchDate = matchDate.toISOString().split('T')[0];
                          
                          // Only show for selected date and active/scheduled matches
                          return (
                            selectedMatchDate === selectedDate &&
                            (status === 'InProgress' || status === 'Scheduled')
                          );
                        })
                        .map(match => {
                          const liveScore = getLiveScore(match.matchNumber);
                          const liveScoreState = liveScores[match.matchNumber];
                          
                          return (
                            <LiveScoreCard
                              key={match.matchNumber}
                              matchNo={match.matchNumber}
                              beachLive={liveScore || undefined}
                              loading={liveScoreState?.isLoading || false}
                              error={liveScoreState?.error || undefined}
                              fallbackMatch={{
                                no: match.matchNumber,
                                status: match.status as any,
                                teamA: {
                                  name: match.teamA.name,
                                  federationCode: match.teamA.countryCode,
                                  players: []
                                },
                                teamB: {
                                  name: match.teamB.name,
                                  federationCode: match.teamB.countryCode,
                                  players: []
                                },
                                court: {
                                  no: parseInt(match.court.courtNumber) || 1,
                                  name: match.court.courtName || `Court ${match.court.courtNumber}`,
                                  surface: 'Sand'
                                },
                                scheduledDateTime: match.scheduledDateTime,
                                sets: match.sets?.map(set => ({
                                  no: set.setNumber,
                                  pointsTeamA: set.scoreTeamA,
                                  pointsTeamB: set.scoreTeamB,
                                  status: set.status
                                })) || []
                              } as any}
                              onRefresh={refreshLiveScores}
                              style={styles.liveScoreCard}
                            />
                          );
                        })}
                    </View>
                  )}
                  
                  <MatchListV2
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
                    showDateNavigator={false}
                    showGenderFilter={true}
                    showStatsInFilter={true}
                    showCourtFilter={true}
                    showRefereeFilter={true}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    externalCourtFilter={courtFilter}
                    onCourtFilterChange={setCourtFilter}
                    externalGenderFilter={genderFilter}
                    onGenderFilterChange={setGenderFilter}
                  />
                </>
              )}
              {activeTab === 'ranking' && (
                <View style={styles.rankingPlaceholder}>
                  <Text style={styles.rankingPlaceholderText}>
                    Tournament ranking will be available here
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.refToolsBottomContainer}>
        <TouchableOpacity
          style={styles.refToolsButton}
          onPress={() => {
            router.push({
              pathname: '/ref-mode',
              params: { 
                eventNo: tournament.visNo,
                tournamentName: tournament.name 
              }
            });
          }}
        >
          <Text style={styles.refToolsButtonText}>Ref Tools</Text>
        </TouchableOpacity>
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
  backButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
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
    justifyContent: 'space-between',
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
  stickyTabsWrapper: {
    backgroundColor: '#F5F5F5', // Match container background
    paddingTop: 8,
  },
  tabsSection: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    paddingBottom: 8,
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

  // Ref Tools Bottom Container Styles
  refToolsBottomContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  refToolsButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  refToolsButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Tournament Card Styles (matching VisTournamentList)
  tournamentCard: {
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
  tournamentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tournamentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genderBadgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tournamentHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  genderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderSymbol: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  menSymbol: {
    color: '#374151',
  },
  womenSymbol: {
    color: '#374151',
  },
  mixedSymbol: {
    color: '#8B5CF6', // Purple for mixed
  },
  plusSymbol: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6B7280',
    marginHorizontal: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tournamentFlag: {
    marginRight: 8,
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  tournamentDate: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  liveBadgeStyle: {
    backgroundColor: '#FFFFFF', // White background
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  liveIndicatorPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4444',
    marginRight: 6,
  },
  liveStatusText: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: '#0F4C75', // Blue text
  },


  // Live Scores Container Styles
  liveScoresContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  liveScoreCard: {
    marginBottom: 12,
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