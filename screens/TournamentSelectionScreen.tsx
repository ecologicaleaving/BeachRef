import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ScrollView,
  Dimensions,
  TouchableWithoutFeedback,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { TournamentCore } from '../types/tournament-v2';
import { colors } from '../theme/tokens';
import NavigationHeader from '../components/navigation/NavigationHeader';
import VisTournamentList from '../components/VisTournamentList';
import { DefaultTournamentService } from '../services/DefaultTournamentService';
import { VisTournamentItem } from '../components/VisTournamentList';
import { FlagImage } from '../components/FlagImage';
// Removed TournamentDateExtractor - now using direct API StartDate/EndDate

interface TournamentCardProps {
  tournament: TournamentCore;
  onPress: () => void;
}

const TournamentCard: React.FC<TournamentCardProps> = ({ tournament, onPress }) => {
  const [isDefault, setIsDefault] = useState(false);

  // Check if this tournament is default on mount
  useEffect(() => {
    const checkDefaultStatus = async () => {
      const defaultStatus = await DefaultTournamentService.isDefaultTournament(tournament.visNo);
      setIsDefault(defaultStatus);
    };
    checkDefaultStatus();
  }, [tournament.visNo]);

  // Check if tournament can be set as default (only LIVE tournaments)
  const tournamentStatus = DefaultTournamentService.getTournamentStatus(
    tournament.dates?.startDate, 
    tournament.dates?.endDate
  );
  const canBeDefault = tournamentStatus === 'LIVE NOW';

  // Handle default switch toggle
  const handleDefaultToggle = async (value: boolean) => {
    try {
      const result = await DefaultTournamentService.toggleDefaultTournament(
        tournament.visNo, 
        tournament.title || tournament.name || `Tournament ${tournament.visNo}`,
        tournament.dates?.startDate,
        tournament.dates?.endDate
      );
      
      if (result.success) {
        setIsDefault(result.isDefault);
        
        if (result.isDefault) {
          Alert.alert(
            'Default Set', 
            'This tournament is now your default. The homepage will redirect here.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Show error message for why it couldn't be set as default
        Alert.alert(
          'Cannot Set as Default', 
          result.reason || 'This tournament cannot be set as default.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error toggling default tournament:', error);
      Alert.alert('Error', 'Could not update default tournament setting');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Helper function to infer country from tournament name
  const inferCountryFromName = (name?: string): string | undefined => {
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
    if (nameLower.includes('toronto') || nameLower.includes('vancouver') || nameLower.includes('canada') || nameLower.includes('montreal')) return 'Canada';
    if (nameLower.includes('brazil') || nameLower.includes('rio') || nameLower.includes('sao paulo')) return 'Brazil';
    if (nameLower.includes('usa') || nameLower.includes('america') || nameLower.includes('miami') || nameLower.includes('los angeles') || nameLower.includes('new york')) return 'USA';
    if (nameLower.includes('poland') || nameLower.includes('warsaw') || nameLower.includes('krakow')) return 'Poland';
    if (nameLower.includes('netherlands') || nameLower.includes('amsterdam') || nameLower.includes('den haag')) return 'Netherlands';
    if (nameLower.includes('norway') || nameLower.includes('oslo')) return 'Norway';
    if (nameLower.includes('sweden') || nameLower.includes('stockholm')) return 'Sweden';
    if (nameLower.includes('denmark') || nameLower.includes('copenhagen')) return 'Denmark';
    if (nameLower.includes('finland') || nameLower.includes('helsinki')) return 'Finland';
    if (nameLower.includes('turkey') || nameLower.includes('istanbul') || nameLower.includes('ankara')) return 'Turkey';
    if (nameLower.includes('mexico') || nameLower.includes('cancun') || nameLower.includes('acapulco')) return 'Mexico';
    if (nameLower.includes('argentina') || nameLower.includes('buenos aires')) return 'Argentina';
    if (nameLower.includes('chile') || nameLower.includes('santiago') || nameLower.includes('viña del mar')) return 'Chile';
    
    return undefined;
  };

  const getLocation = () => {
    // Try different combinations of available location data
    const city = tournament.city;
    const country = tournament.country;
    const location = (tournament as any).location;
    const venue = (tournament as any).venue;
    const continent = (tournament as any).continent;
    
    // Prefer city, country combination
    if (city && country) {
      return `${city}, ${country}`;
    }
    
    // Try other combinations
    if (location && country) {
      return `${location}, ${country}`;
    }
    
    if (venue && city) {
      return `${venue}, ${city}`;
    }
    
    if (venue && country) {
      return `${venue}, ${country}`;
    }
    
    // Single field options
    if (location) return location;
    if (city) return city;
    if (country) return country;
    if (venue) return venue;
    if (continent) return continent;
    
    // Fallback: try to extract from tournament name
    return inferLocationFromName(tournament.name || tournament.title) || null;
  };
  
  // Helper function to extract location from tournament name
  const inferLocationFromName = (name?: string): string | null => {
    if (!name) return null;
    
    const nameLower = name.toLowerCase();
    
    // Common city patterns
    const cityPatterns = [
      { pattern: 'doha', location: 'Doha, Qatar' },
      { pattern: 'dubai', location: 'Dubai, UAE' },
      { pattern: 'rome', location: 'Rome, Italy' },
      { pattern: 'paris', location: 'Paris, France' },
      { pattern: 'madrid', location: 'Madrid, Spain' },
      { pattern: 'vienna', location: 'Vienna, Austria' },
      { pattern: 'hamburg', location: 'Hamburg, Germany' },
      { pattern: 'berlin', location: 'Berlin, Germany' },
      { pattern: 'munich', location: 'Munich, Germany' },
      { pattern: 'ostrava', location: 'Ostrava, Czech Republic' },
      { pattern: 'espinho', location: 'Espinho, Portugal' },
      { pattern: 'gstaad', location: 'Gstaad, Switzerland' },
      { pattern: 'brasilia', location: 'Brasília, Brazil' },
      { pattern: 'brasília', location: 'Brasília, Brazil' },
      { pattern: 'rio', location: 'Rio de Janeiro, Brazil' },
      { pattern: 'sao paulo', location: 'São Paulo, Brazil' },
      { pattern: 'cancun', location: 'Cancún, Mexico' },
      { pattern: 'acapulco', location: 'Acapulco, Mexico' },
      { pattern: 'singapore', location: 'Singapore' },
      { pattern: 'tokyo', location: 'Tokyo, Japan' },
      { pattern: 'osaka', location: 'Osaka, Japan' },
      { pattern: 'sydney', location: 'Sydney, Australia' },
      { pattern: 'gold coast', location: 'Gold Coast, Australia' },
      { pattern: 'vancouver', location: 'Vancouver, Canada' },
      { pattern: 'toronto', location: 'Toronto, Canada' },
      { pattern: 'montreal', location: 'Montreal, Canada' },
      { pattern: 'manhattan beach', location: 'Manhattan Beach, USA' },
      { pattern: 'hermosa beach', location: 'Hermosa Beach, USA' },
      { pattern: 'huntington beach', location: 'Huntington Beach, USA' },
      { pattern: 'long beach', location: 'Long Beach, USA' },
    ];
    
    for (const { pattern, location } of cityPatterns) {
      if (nameLower.includes(pattern)) {
        return location;
      }
    }
    
    return null;
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

  const getDateRange = () => {
    // Use TournamentCore dates object
    const startDate = tournament.dates?.startDate;
    const endDate = tournament.dates?.endDate;
    
    if (!startDate && !endDate) {
      return 'Dates TBD';
    }
    
    if (startDate && endDate) {
      if (startDate === endDate) {
        return formatCompactDate(startDate);
      }
      return formatCompactDateRange(startDate, endDate);
    }
    
    return formatCompactDate(startDate || endDate);
  };

  const getStatusIndicator = () => {
    if (!tournament.dates?.startDate || !tournament.dates?.endDate) return (
      <View style={[styles.statusIndicator, { backgroundColor: '#6B7280' }]}>
        <Text style={styles.statusText}>SCHEDULED</Text>
      </View>
    );
    
    const now = new Date();
    const start = new Date(tournament.dates.startDate);
    const end = new Date(tournament.dates.endDate);
    
    let status = '';
    let backgroundColor = '#6B7280';
    
    // If start date is after today = SCHEDULED
    if (start > now) {
      status = 'SCHEDULED';
      backgroundColor = '#6B7280';
    }
    // If start less than today and end after today = LIVE NOW  
    else if (start <= now && end >= now) {
      status = 'LIVE NOW';
      backgroundColor = colors.success;
    }
    // If end is less than today = COMPLETED
    else {
      status = 'COMPLETED';
      backgroundColor = '#1B365D';
    }
    
    return (
      <View style={[styles.statusIndicator, { backgroundColor }]}>
        <Text style={styles.statusText}>{status}</Text>
      </View>
    );
  };

  // Get gender badge (like in match cards)
  const getGenderBadge = () => {
    const gender = tournament.gender;
    if (!gender) return null;
    
    let genderText = '';
    let genderStyle = styles.mixedSymbol;
    
    if (gender === 'M') {
      genderText = '♂';
      genderStyle = styles.menSymbol;
    } else if (gender === 'W') {
      genderText = '♀';
      genderStyle = styles.womenSymbol;
    } else {
      genderText = '⚭'; // Mixed symbol
      genderStyle = styles.mixedSymbol;
    }
    
    return (
      <View style={styles.genderBadge}>
        <Text style={[styles.genderSymbol, genderStyle]}>
          {genderText}
        </Text>
      </View>
    );
  };

  // Get prize money info
  const getPrizeInfo = () => {
    const prize = tournament.PrizeMoney || tournament.Prize;
    const currency = tournament.Currency;
    if (!prize) return null;
    
    return (
      <Text style={styles.tournamentPrize}>
        💰 {currency ? `${currency} ` : ''}${prize}
      </Text>
    );
  };

  // Get venue/surface info
  const getVenueInfo = () => {
    const venue = tournament.Venue;
    const surface = tournament.Surface;
    const courts = tournament.Courts;
    
    if (venue || surface || courts) {
      const parts = [];
      if (venue) parts.push(venue);
      if (surface) parts.push(`${surface} surface`);
      if (courts) parts.push(`${courts} courts`);
      
      return (
        <Text style={styles.tournamentVenue} numberOfLines={1}>
          🏐 {parts.join(' • ')}
        </Text>
      );
    }
    return null;
  };

  // Get teams/gender info
  const getParticipantsInfo = () => {
    const teams = tournament.Teams || tournament.MaxTeams;
    const gender = tournament.Gender;
    const participants = tournament.Participants;
    
    if (teams || gender || participants) {
      const parts = [];
      if (gender) parts.push(gender === 'M' ? 'Men' : gender === 'W' ? 'Women' : 'Mixed');
      if (teams) parts.push(`${teams} teams`);
      if (participants && !teams) parts.push(`${participants} participants`);
      
      return (
        <Text style={styles.tournamentParticipants}>
          👥 {parts.join(' • ')}
        </Text>
      );
    }
    return null;
  };

  return (
    <TouchableOpacity style={styles.tournamentCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        {getStatusIndicator()}
        {getGenderBadge()}
      </View>
      
      <Text style={styles.tournamentName}>
        {tournament.title || tournament.name || `Tournament ${tournament.visNo}`}
      </Text>
      
      
      {getDateRange() && (
        <View style={styles.dateRow}>
          <Icon name="calendar-outline" size={14} color="#6B7280" style={styles.dateIcon} />
          <Text style={styles.tournamentDate}>{getDateRange()}</Text>
        </View>
      )}
      
      <View style={styles.cardFooter}>
        {canBeDefault && (
          <View style={styles.defaultSwitchContainer}>
            <Text style={styles.defaultSwitchLabel}>Default</Text>
            <Switch
              value={isDefault}
              onValueChange={handleDefaultToggle}
              trackColor={{ false: '#D1D5DB', true: colors.primary }}
              thumbColor={isDefault ? '#FFFFFF' : '#9CA3AF'}
              style={styles.defaultSwitch}
            />
          </View>
        )}
        <TouchableOpacity style={styles.openButton} onPress={onPress}>
          <Text style={styles.openButtonText}>OPEN</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};


const TournamentSelectionScreen: React.FC = () => {
  const [tournaments, setTournaments] = useState<TournamentCore[]>([]);
  
  const [initialLoading, setInitialLoading] = useState(true);
  const [tournamentLoading, setTournamentLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Simplified state - season/month hierarchy
  const [expandedSeasons, setExpandedSeasons] = useState<{[key: string]: boolean}>({});
  const [expandedMonths, setExpandedMonths] = useState<{[key: string]: boolean}>({});
  const [hierarchyInitialized, setHierarchyInitialized] = useState<boolean>(false);
  const router = useRouter();

  // Helper function to format month name
  function formatMonthName(month: number): string {
    return new Date(2025, month, 1).toLocaleDateString('en-US', { month: 'long' });
  }

  // Helper function to get season key
  function getSeasonKey(year: number): string {
    return `season-${year}`;
  }

  // Helper function to get month key
  function getMonthKey(year: number, month: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  }

  const loadTournaments = useCallback(async (forceRefresh = false, isInitial = false) => {
    try {
      if (isInitial) {
        setInitialLoading(true);
      } else {
        setTournamentLoading(true);
      }
      setError(null);
      
      // DIRECT API CALL - Bypass broken cache system
      const { VisApiClient } = await import('../services/api/VisApiClient');
      const { DEFAULT_RETRY_CONFIG } = await import('../types/api-v2');
      
      const config = {
        baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
        timeoutMs: 10000,
        maxRetries: 1,
        retryDelayMs: 1000,
        exponentialBackoff: false,
        enableLogging: true
      };
      
      const visApi = new VisApiClient(config, DEFAULT_RETRY_CONFIG);
      
      const response = await visApi.getEventList({
        tournamentType: 'BPT',
        maxResults: 50
      });
      
      if (response.success && response.xmlData) {
        // Parse manually
        const visTournaments = parseXMLDirectly(response.xmlData);
        
        // Use VIS tournaments
        const finalTournaments = visTournaments;
        
        // Show tournaments immediately with EventNo fallback
        setTournaments(finalTournaments);
        
        // No need for dynamic categories - showing all tournaments
        
        // Enhance tournaments with real tournament numbers in background
        enhanceTournamentsInBackground(finalTournaments, visApi);
      } else {
        // No tournaments available from API
        setTournaments([]);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setInitialLoading(false);
      setTournamentLoading(false);
    }
  }, []); // Remove dependencies that cause re-runs

  // Enhance tournaments with real tournament numbers in background (non-blocking)
  const enhanceTournamentsInBackground = (tournaments: TournamentCore[], visApi: any): void => {
    // Process tournaments in background without blocking UI
    setTimeout(async () => {
      try {
        let enhancedCount = 0;
        
        // Process tournaments in small batches
        for (let i = 0; i < tournaments.length; i++) {
          const tournament = tournaments[i];
          
          try {
            const tournamentResponse = await visApi.getBeachTournament({
              tournamentNo: tournament.visNo,
              includeLocation: false,
              includeVenue: false
            });
            
            if (tournamentResponse.success && tournamentResponse.xmlData) {
              // Extract the real tournament number from response
              const tournamentNoMatch = tournamentResponse.xmlData.match(/<BeachTournament[^>]*No="([^"]*)"[^>]*>/);
              if (tournamentNoMatch) {
                const realTournamentNo = tournamentNoMatch[1];
                
                // Update the tournament object in place
                (tournament as any).tournamentNo = realTournamentNo;
                enhancedCount++;
                
                // Update state incrementally so UI stays responsive
                if (enhancedCount % 3 === 0) { // Update every 3 enhancements
                  setTournaments([...tournaments]); // Trigger re-render
                }
              } else {
                (tournament as any).tournamentNo = tournament.visNo;
              }
            } else {
              (tournament as any).tournamentNo = tournament.visNo; // Fallback
            }
            
            // Small delay to avoid overwhelming the API and keep UI responsive
            await new Promise(resolve => setTimeout(resolve, 300));
            
          } catch (error) {
            (tournament as any).tournamentNo = tournament.visNo; // Fallback
          }
        }
        
        // Final state update when all done
        const updatedTournaments = [...tournaments];
        setTournaments(updatedTournaments);
        
        // No need to update categories - showing all tournaments
        
      } catch (error) {
        // Silent error handling for background process
      }
    }, 100); // Small delay to let UI render first
  };

  // Map VIS tournament type to our categories
  const mapTournamentType = (visType?: string, tournamentName?: string): string => {
    // Check tournament name for category indicators if visType is not helpful
    const name = (tournamentName || '').toUpperCase();
    const type = (visType || '').toUpperCase();
    
    // Check name first for BPT categories
    if (name.includes('BPT') || name.includes('BEACH PRO TOUR') || name.includes('ELITE16')) {
      if (name.includes('ELITE') || name.includes('ELITE16')) return 'BPT ELITE';
      if (name.includes('CHALLENGER') || name.includes('CHALLENGE')) return 'BPT CHALLENGER';
      if (name.includes('FUTURES')) return 'BPT FUTURES';
      return 'BPT';
    }
    
    // Check name for FIVB
    if (name.includes('FIVB') || name.includes('WORLD CHAMPIONSHIP') || name.includes('WORLD TOUR')) {
      return 'FIVB';
    }
    
    // Check name for CEV
    if (name.includes('CEV') || name.includes('EUROPEAN') || name.includes('CONTINENTAL')) {
      return 'CEV';
    }
    
    // Check name for NORCECA
    if (name.includes('NORCECA') || name.includes('NORTH AMERICAN') || name.includes('CENTRAL AMERICAN')) {
      return 'NORCECA';
    }
    
    // Check visType as fallback
    if (type.includes('FIVB')) return 'FIVB';
    if (type.includes('BPT') || type.includes('BEACH PRO TOUR')) {
      if (type.includes('ELITE') || type.includes('ELITE16')) return 'BPT ELITE';
      if (type.includes('CHALLENGER') || type.includes('CHALLENGE')) return 'BPT CHALLENGER';
      if (type.includes('FUTURES')) return 'BPT FUTURES';
      return 'BPT';
    }
    if (type.includes('CEV')) return 'CEV';
    if (type.includes('NORCECA')) return 'NORCECA';
    
    return 'LOCAL';
  };

  // Simple XML parser for tournaments
  const parseXMLDirectly = (xmlData: string): TournamentCore[] => {
    const tournaments: TournamentCore[] = [];
    
    try {
      // Fix regex: VIS XML uses self-closing Event tags like <Event ... />
      const eventRegex = /<Event[^>]*\/>/gs;
      const eventMatches = xmlData.match(eventRegex) || [];
      
      eventMatches.forEach((eventMatch, index) => {
        const getValue = (tagName: string): string => {
          // Fix: Extract from attributes in self-closing tags
          const regex = new RegExp(`${tagName}="([^"]*)"`, 'i');
          const result = eventMatch.match(regex);
          return result ? result[1] : '';
        };
        
        const visNo = getValue('No');
        const code = getValue('Code');
        const name = getValue('Name');
        const NoEvent = visNo; // In GetEventList, the 'No' field IS the event number for referee filtering
        const startDate = getValue('StartDate');
        const endDate = getValue('EndDate');
        const city = getValue('City');
        const country = getValue('Country');
        const location = getValue('Location');
        const venue = getValue('Venue');
        const continent = getValue('Continent');
        const gender = getValue('Gender');
        const type = getValue('Type'); // Extract tournament type from VIS API
        const countryCode = getValue('CountryCode');
        
        // Parse location data from VIS API
        
        if (visNo && name) {
          const tournament: TournamentCore = {
            id: `tournament_${visNo}_${index}`,
            visNo,
            version: 1,
            lastUpdated: new Date().toISOString(),
            code: code || visNo,
            name,
            title: name, // Use name as title for consistency
            gender: gender === 'W' ? 'W' as any : gender === 'M' ? 'M' as any : 'MIXED' as any,
            tournamentType: mapTournamentType(type, name) as any,
            status: 'ACTIVE' as any,
            dates: {
              startDate: startDate || new Date().toISOString(),
              endDate: endDate || startDate || new Date().toISOString()
            },
            city: city || undefined,
            country: country || undefined,
            countryCode: countryCode || undefined,
            location: location || undefined,
            NoEvent: NoEvent || undefined, // Include NoEvent for referee API calls
            // Add extra fields for enhanced location display
            ...(venue && { venue }),
            ...(continent && { continent })
          } as any;
          
          tournaments.push(tournament);
        }
      });
      
    } catch (error) {
      // Silent error handling for XML parsing
    }
    
    return tournaments;
  };



  useEffect(() => {
    // Load tournaments directly from API - inline to avoid dependency issues
    const runDirectApiCall = async () => {
      try {
        setInitialLoading(true);
        setError(null);
        
        // DIRECT API CALL - Bypass broken cache system
        
        const { VisApiClient } = await import('../services/api/VisApiClient');
        const { DEFAULT_RETRY_CONFIG } = await import('../types/api-v2');
        
        const config = {
          baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
          timeoutMs: 10000,
          maxRetries: 1,
          retryDelayMs: 1000,
          exponentialBackoff: false,
          enableLogging: true
        };
        
        const visApi = new VisApiClient(config, DEFAULT_RETRY_CONFIG);
        
        const response = await visApi.getEventList({
          maxResults: 50
        });
        
        if (response.success && response.xmlData) {
          try {
            // Parse manually
            const visTournaments = parseXMLDirectly(response.xmlData);
            
            // Use VIS tournaments
            const finalTournaments = visTournaments;
          
            setTournaments(finalTournaments);
            
            // No need for dynamic categories - showing all tournaments
          } catch (parseError) {
            // No tournaments available due to parsing error
            setTournaments([]);
          }
        } else {
          // No tournaments available from API
          setTournaments([]);
        }
        
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setInitialLoading(false);
        setTournamentLoading(false);
      }
    };
    
    runDirectApiCall();
  }, []); // Empty dependency array - run once on mount

  // Handle currentYear changes with tournament loading (not full page reload)
  // DISABLED: This was interfering with tournament loading
  // useEffect(() => {
  //   if (initialLoading) return; // Skip during initial load
  //   loadTournaments(false, false); // Reload tournaments for new year, but don't show full page loading
  // }, [currentYear]);


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Force a complete cache refresh
      const { CacheService } = await import('../services/CacheService');
      
      // Clear memory and local storage caches
      if (typeof CacheService.clearCache === 'function') {
        await CacheService.clearCache();
      }
      
      await loadTournaments(true);
    } finally {
      setRefreshing(false);
    }
  }, [loadTournaments]);

  const handleTournamentPress = (tournament: TournamentCore) => {
    const merged = (tournament as any)._mergedTournaments;
    
    // Ensure _mergedTournaments and tournamentNo are preserved in JSON serialization
    const tournamentWithMerged = {
      ...tournament,
      _mergedTournaments: merged,
      tournamentNo: (tournament as any).tournamentNo // Pass the real tournament number
    };
    
    router.push({
      pathname: '/tournament-detail',
      params: { tournamentData: JSON.stringify(tournamentWithMerged) }
    });
  };

  // Generate dynamic categories based on actual tournament data
  const generateDynamicCategories = (tournaments: TournamentCore[]): string[] => {
    const categories = new Set<string>(['ALL']); // Always include ALL
    
    tournaments.forEach(tournament => {
      // Use VIS API tournamentType if available
      if (tournament.tournamentType) {
        categories.add(tournament.tournamentType.toUpperCase());
      } else {
        // Fallback: Infer type from name
        const name = (tournament.name || tournament.title || '').toUpperCase();
        
        if (name.includes('FIVB') || name.includes('WORLD CHAMPIONSHIP') || name.includes('WORLD TOUR')) {
          categories.add('FIVB');
        } else if (name.includes('BPT') || name.includes('BEACH PRO TOUR')) {
          // Check for specific BPT subcategories first
          if (name.includes('ELITE') || name.includes('ELITE16')) {
            categories.add('BPT ELITE');
          } else if (name.includes('CHALLENGER') || name.includes('CHALLENGE')) {
            categories.add('BPT CHALLENGER');
          } else if (name.includes('FUTURES')) {
            categories.add('BPT FUTURES');
          } else {
            categories.add('BPT');
          }
        } else if (name.includes('CEV') || name.includes('EUROPEAN') || name.includes('CONFEDERATION')) {
          categories.add('CEV');
        } else if (name.includes('NORCECA') || name.includes('NORTH AMERICAN') || name.includes('CENTRAL AMERICAN') || name.includes('CARIBBEAN')) {
          categories.add('NORCECA');
        } else {
          categories.add('LOCAL');
        }
      }
    });
    
    // Sort categories by importance - prioritize the requested categories
    const categoryOrder = ['ALL', 'FIVB', 'BPT ELITE', 'BPT CHALLENGER', 'BPT FUTURES', 'BPT', 'CEV', 'NORCECA', 'LOCAL'];
    const sortedCategories = Array.from(categories).sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a);
      const bIndex = categoryOrder.indexOf(b);
      
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      } else if (aIndex !== -1) {
        return -1;
      } else if (bIndex !== -1) {
        return 1;
      } else {
        return a.localeCompare(b);
      }
    });
    
    return sortedCategories;
  };

  // Match tournament to category with flexible patterns
  const matchesTournamentCategory = (tournament: TournamentCore, category: string): boolean => {
    if (category === 'ALL') return true;
    
    // Primary matching: Use VIS API tournamentType field (most reliable)
    if (tournament.tournamentType) {
      const tournamentType = tournament.tournamentType.toUpperCase();
      
      // Direct type matching
      if (tournamentType === category) return true;
      
      // Handle category variations
      switch (category) {
        case 'FIVB':
          return tournamentType === 'FIVB';
        case 'BPT ELITE':
          return tournamentType === 'BPT ELITE' || (tournamentType === 'BPT' && (tournament.name || '').toUpperCase().includes('ELITE'));
        case 'BPT CHALLENGER':
          return tournamentType === 'BPT CHALLENGER' || (tournamentType === 'BPT' && ((tournament.name || '').toUpperCase().includes('CHALLENGER') || (tournament.name || '').toUpperCase().includes('CHALLENGE')));
        case 'BPT FUTURES':
          return tournamentType === 'BPT FUTURES' || (tournamentType === 'BPT' && (tournament.name || '').toUpperCase().includes('FUTURES'));
        case 'BPT':
          return tournamentType === 'BPT' || tournamentType === 'BPT ELITE' || tournamentType === 'BPT CHALLENGER' || tournamentType === 'BPT FUTURES';
        case 'CEV':
          return tournamentType === 'CEV';
        case 'NORCECA':
          return tournamentType === 'NORCECA';
        case 'LOCAL':
          return tournamentType === 'LOCAL';
        default:
          if (tournamentType === category) return true;
      }
    }
    
    // Fallback: Pattern-based matching in tournament name/title (for data without tournamentType)
    const name = (tournament.name || tournament.title || '').toUpperCase();
    const allText = name.trim();
    
    switch (category) {
      case 'FIVB':
        return allText.includes('FIVB') || allText.includes('WORLD CHAMPIONSHIP') || allText.includes('WORLD TOUR');
      case 'BPT ELITE':
        return (allText.includes('BPT') || allText.includes('BEACH PRO TOUR')) && (allText.includes('ELITE') || allText.includes('ELITE16'));
      case 'BPT CHALLENGER':
        return (allText.includes('BPT') || allText.includes('BEACH PRO TOUR')) && (allText.includes('CHALLENGER') || allText.includes('CHALLENGE'));
      case 'BPT FUTURES':
        return (allText.includes('BPT') || allText.includes('BEACH PRO TOUR')) && allText.includes('FUTURES');
      case 'BPT':
        return allText.includes('BPT') || allText.includes('BEACH PRO TOUR') || allText.includes('BEACH PROFESSIONAL');
      case 'CEV':
        return allText.includes('CEV') || allText.includes('EUROPEAN') || allText.includes('CONFEDERATION');
      case 'NORCECA':
        return allText.includes('NORCECA') || allText.includes('NORTH AMERICAN') || allText.includes('CENTRAL AMERICAN') || allText.includes('CARIBBEAN');
      case 'LOCAL':
        return allText.includes('NATIONAL') || allText.includes('DOMESTIC') || allText.includes('CHAMPIONSHIP') ||
               allText.includes('REGIONAL') || allText.includes('LOCAL');
      default:
        // For any other category, check if it appears in the tournament text
        return allText.includes(category);
    }
  };

  // Get tournament status based on dates
  const getTournamentStatus = (tournament: TournamentCore): 'SCHEDULED' | 'LIVE NOW' | 'COMPLETED' => {
    if (!tournament.dates?.startDate || !tournament.dates?.endDate) return 'SCHEDULED';
    
    const now = new Date();
    const start = new Date(tournament.dates.startDate);
    const end = new Date(tournament.dates.endDate);
    
    // Calculate tournament status based on dates
    
    // If start date is after today = SCHEDULED
    if (start > now) return 'SCHEDULED';
    // If start less than today and end after today = LIVE NOW  
    if (start <= now && end >= now) return 'LIVE NOW';
    // If end is less than today = COMPLETED
    return 'COMPLETED';
  };

  // Get LIVE tournaments (currently active)
  const liveTournaments = tournaments.filter(tournament => {
    return getTournamentStatus(tournament) === 'LIVE NOW';
  });

  // Group tournaments by season and month hierarchy
  const groupedTournaments = React.useMemo(() => {
    const seasonGroups: { [seasonKey: string]: { [monthKey: string]: TournamentCore[] } } = {};
    
    // Filter tournaments
    const baseFilteredTournaments = tournaments.filter(tournament => {
      if (!tournament.name || !tournament.dates?.startDate) {
        return false;
      }
      
      const startDate = new Date(tournament.dates.startDate);
      const year = startDate.getFullYear();
      
      // Only include tournaments from 2001 to 2026
      if (year < 2001 || year > 2026) {
        return false;
      }
      
      return true;
    });
    
    // Group by season (year) and then by month
    baseFilteredTournaments.forEach(tournament => {
      if (tournament.dates?.startDate) {
        const tournamentDate = new Date(tournament.dates.startDate);
        const year = tournamentDate.getFullYear();
        const month = tournamentDate.getMonth();
        const seasonKey = getSeasonKey(year);
        const monthKey = getMonthKey(year, month);
        
        if (!seasonGroups[seasonKey]) {
          seasonGroups[seasonKey] = {};
        }
        
        if (!seasonGroups[seasonKey][monthKey]) {
          seasonGroups[seasonKey][monthKey] = [];
        }
        
        seasonGroups[seasonKey][monthKey].push(tournament);
      }
    });
    
    // Sort tournaments within each month by end date descending (most recent first)
    Object.keys(seasonGroups).forEach(seasonKey => {
      Object.keys(seasonGroups[seasonKey]).forEach(monthKey => {
        seasonGroups[seasonKey][monthKey].sort((a, b) => {
          const endDateA = new Date(a.dates?.endDate || a.dates?.startDate || '');
          const endDateB = new Date(b.dates?.endDate || b.dates?.startDate || '');
          return endDateB.getTime() - endDateA.getTime(); // Descending order
        });
      });
    });
    
    return seasonGroups;
  }, [tournaments]);
  
  // Initialize expanded seasons and months - 2025 season open, current month open
  useEffect(() => {
    if (Object.keys(groupedTournaments).length > 0 && !hierarchyInitialized) {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const currentSeasonKey = getSeasonKey(2025); // Always expand 2025
      const currentMonthKey = getMonthKey(currentYear, currentMonth);
      
      // Initialize seasons - only 2025 expanded
      const initialSeasons: {[key: string]: boolean} = {};
      for (let year = 2001; year <= 2026; year++) {
        initialSeasons[getSeasonKey(year)] = year === 2025;
      }
      
      // Initialize months - only current month expanded if in 2025
      const initialMonths: {[key: string]: boolean} = {};
      if (currentYear === 2025) {
        initialMonths[currentMonthKey] = true;
      }
      
      setExpandedSeasons(initialSeasons);
      setExpandedMonths(initialMonths);
      setHierarchyInitialized(true);
    }
  }, [Object.keys(groupedTournaments).length, hierarchyInitialized]);
  
  // Toggle season expansion
  const toggleSeasonExpansion = (seasonKey: string) => {
    setExpandedSeasons(prev => ({
      ...prev,
      [seasonKey]: !prev[seasonKey]
    }));
  };
  
  // Toggle month expansion within a season
  const toggleMonthExpansion = (monthKey: string) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthKey]: !prev[monthKey]
    }));
  };
  
  // Get season years sorted (recent first)
  const getSeasonYears = (): number[] => {
    const years: number[] = [];
    for (let year = 2026; year >= 2001; year--) {
      years.push(year);
    }
    return years;
  };

  // Get tournaments filtered by status for display in specific sections
  const getStatusFilteredTournaments = (status: 'All' | 'SCHEDULED' | 'LIVE NOW' | 'COMPLETED') => {
    return groupedTournaments.flatMap(([monthKey, tournaments]) => tournaments).filter(tournament => {
      if (status === 'All') return true;
      const tournamentStatus = getTournamentStatus(tournament);
      return tournamentStatus === status;
    });
  };



  // Extract tournament categories from tournament data
  const extractTournamentCategories = (tournaments: TournamentCore[]): string[] => {
    const categorySet = new Set<string>();
    categorySet.add('ALL'); // Always include ALL option
    
    tournaments.forEach(tournament => {
      // Extract from tournament type field
      const sources = [
        tournament.tournamentType
      ].filter(Boolean);
      
      sources.forEach(source => {
        if (typeof source === 'string') {
          const normalized = source.trim().toUpperCase();
          if (normalized && normalized !== 'NULL' && normalized !== 'UNDEFINED') {
            categorySet.add(normalized);
          }
        }
      });
      
      // Extract from tournament name patterns
      const name = (tournament.name || tournament.title || '').toUpperCase();
      
      // BPT subcategories (check specific ones first, then general BPT)
      if ((name.includes('BPT') || name.includes('BEACH PRO TOUR')) && name.includes('FUTURES')) {
        categorySet.add('BPT FUTURES');
      } else if ((name.includes('BPT') || name.includes('BEACH PRO TOUR')) && (name.includes('ELITE') || name.includes('ELITE16'))) {
        categorySet.add('BPT ELITE');
      } else if ((name.includes('BPT') || name.includes('BEACH PRO TOUR')) && (name.includes('CHALLENGER') || name.includes('CHALLENGE'))) {
        categorySet.add('BPT CHALLENGER');
      } else if (name.includes('BPT') || name.includes('BEACH PRO TOUR')) {
        categorySet.add('BPT');
      }
      
      if (name.includes('CEV') || name.includes('EUROPEAN')) {
        categorySet.add('CEV');
      }
      if (name.includes('NORCECA') || name.includes('NORTH AMERICAN') || name.includes('CENTRAL AMERICAN') || name.includes('CARIBBEAN')) {
        categorySet.add('NORCECA');
      }
      if (name.includes('FIVB') || name.includes('WORLD')) {
        categorySet.add('FIVB');
      }
      if (name.includes('NATIONAL') || name.includes('DOMESTIC')) {
        categorySet.add('NATIONAL');
      }
      if (name.includes('YOUTH') || name.includes('U21') || name.includes('U19')) {
        categorySet.add('YOUTH');
      }
      if (name.includes('QUALIFICATION') || name.includes('QUALIFIER')) {
        categorySet.add('QUALIFICATION');
      }
      // Default to LOCAL if no specific category was added
      if (categorySet.size === 1) { // Only 'ALL' was added
        categorySet.add('LOCAL');
      }
    });
    
    const categories = Array.from(categorySet).sort((a, b) => {
      // Prioritize the requested categories: BPT CHALLENGER, BPT FUTURES, BPT ELITE, CEV, NORCECA, LOCAL
      const priority = [
        'ALL', 
        'FIVB',
        'BPT ELITE', 'BPT CHALLENGER', 'BPT FUTURES', 'BPT',
        'CEV', 'NORCECA', 'LOCAL',
        'NATIONAL', 'YOUTH', 'QUALIFICATION'
      ];
      const aIndex = priority.indexOf(a);
      const bIndex = priority.indexOf(b);
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
    
    return categories;
  };

  const renderTournament = ({ item }: { item: TournamentCore }) => {
    return (
      <TournamentCard 
        tournament={item} 
        onPress={() => handleTournamentPress(item)} 
      />
    );
  };

  // Get categories with counts and filter out empty ones
  const getCategoriesWithCounts = () => {
    return availableCategories.map(category => {
      const count = tournaments.filter(tournament => {
        if (!tournament.dates?.startDate) return false;
        if (tournament.status && tournament.status.toLowerCase().includes('cancelled')) return false;
        
        return matchesTournamentCategory(tournament, category);
      }).length;
      
      return { category, count };
    }).filter(item => item.count > 0 || item.category === 'ALL'); // Keep ALL even if 0, filter others
  };

  const renderCategoryDropdown = () => {
    const categoriesWithCounts = getCategoriesWithCounts();
    const selectedCategory = categoriesWithCounts.find(item => item.category === selectedType);
    
    return (
      <View style={styles.filterRowContainer}>
        <TouchableOpacity 
          style={styles.dropdownButton}
          onPress={() => setShowDropdown(!showDropdown)}
          accessibilityRole="button"
          accessibilityLabel={`Tournament category selector. Current selection: ${selectedCategory ? selectedCategory.category : 'Select Category'}`}
          accessibilityState={{ expanded: showDropdown }}
          accessibilityHint={showDropdown ? "Close category dropdown" : "Open category dropdown"}
        >
          <Text style={styles.dropdownButtonText}>
            {selectedCategory ? selectedCategory.category : 'Select Category'}
          </Text>
          <Text style={styles.dropdownArrow}>
            {showDropdown ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>
        
        {showDropdown && (
          <View 
            style={styles.dropdownList}
            accessible={true}
            accessibilityLabel="Category selection dropdown"
          >
            <ScrollView 
              style={styles.dropdownScroll}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {categoriesWithCounts.map((item) => (
                <TouchableOpacity
                  key={item.category}
                  style={[
                    styles.dropdownItem,
                    selectedType === item.category && styles.activeDropdownItem
                  ]}
                  onPress={() => {
                    setSelectedType(item.category);
                    setShowDropdown(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${item.category} category with ${item.count} tournaments`}
                  accessibilityState={{ selected: selectedType === item.category }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    selectedType === item.category && styles.activeDropdownItemText
                  ]}>
                    {item.category} ({item.count})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  // Render LIVE tournaments section (without header)
  const renderLiveTournaments = () => {
    if (liveTournaments.length === 0) return null;

    return (
      <View style={styles.liveTournamentsSection}>
        {liveTournaments.length === 1 ? (
          <VisTournamentItem 
            tournament={liveTournaments[0]}
            onPress={() => handleTournamentPress(liveTournaments[0])}
          />
        ) : (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.liveCarouselContainer}
            style={styles.liveCarousel}
          >
            {liveTournaments.map((tournament, index) => (
              <View key={tournament.id} style={styles.liveCarouselItem}>
                <VisTournamentItem 
                  tournament={tournament}
                  onPress={() => handleTournamentPress(tournament)}
                />
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };


  const renderStatusFilter = () => {
    const statuses: ('All' | 'SCHEDULED' | 'LIVE NOW' | 'COMPLETED')[] = ['All', 'SCHEDULED', 'LIVE NOW', 'COMPLETED'];
    
    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'All': return 'All';
        case 'SCHEDULED': return 'SCHEDULED';
        case 'LIVE NOW': return 'LIVE';
        case 'COMPLETED': return 'COMPLETED';
        default: return status;
      }
    };
    
    return (
      <View style={styles.filterRowContainer}>
        <Text style={styles.filterRowLabel}>Status:</Text>
        <View style={styles.statusFilterButtons}>
          {statuses.map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusFilterButton,
                statusFilter === status && styles.activeStatusFilterButton
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[
                styles.statusFilterText,
                statusFilter === status && styles.activeStatusFilterText
              ]}>
                {getStatusLabel(status)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Format month header for collapsible sections
  const formatMonthHeader = (monthKey: string): string => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long' });
  };

  if (initialLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading tournaments...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Unable to load tournaments</Text>
        <Text style={styles.errorSubtext}>Please check your internet connection</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadTournaments}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
      <View style={styles.container}>
        <NavigationHeader 
          title="Tournaments" 
          showStatusBar={false} 
          showRefreshButton={false}
        />
        
        <ScrollView 
          style={styles.scrollContainer}
          stickyHeaderIndices={[1]} // Make the second element (filters) sticky
          showsVerticalScrollIndicator={false}
        >
          {/* Carousel Section - will disappear when scrolling */}
          {renderLiveTournaments()}
          
          {/* No filters - just seasons and months hierarchy */}
        
          {/* Tournament List Section */}
          <View style={styles.tournamentsSection}>
            {tournamentLoading && (
              <View 
                style={styles.tournamentLoadingOverlay}
                accessibilityLabel="Loading tournaments"
                accessibilityLiveRegion="polite"
              >
                <ActivityIndicator size="small" color="#FF6B35" />
              </View>
            )}
          
            {Object.keys(groupedTournaments).length === 0 && !initialLoading && !tournamentLoading ? (
              <View style={styles.emptyState}>
                <Icon name="clock-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyText}>No tournaments found</Text>
                <Text style={styles.emptySubtext}>
                  No tournaments available
                </Text>
              </View>
            ) : (
              <ScrollView 
                style={styles.seasonsList}
                showsVerticalScrollIndicator={false}
              >
                {getSeasonYears().map(year => {
                  const seasonKey = getSeasonKey(year);
                  const seasonData = groupedTournaments[seasonKey];
                  const isSeasonExpanded = expandedSeasons[seasonKey] || false;
                  
                  if (!seasonData) return null;
                  
                  const totalTournaments = Object.values(seasonData).reduce((sum, monthTournaments) => sum + monthTournaments.length, 0);
                  
                  return (
                    <View key={seasonKey}>
                      {/* Season Header */}
                      <TouchableOpacity 
                        style={[
                          styles.seasonHeader,
                          isSeasonExpanded && styles.expandedSeasonHeader
                        ]}
                        onPress={() => toggleSeasonExpansion(seasonKey)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.seasonHeaderContent}>
                          <Text style={styles.seasonHeaderText}>
                            Season {year}
                          </Text>
                          <Text style={styles.tournamentCountText}>
                            {totalTournaments} {totalTournaments === 1 ? 'tournament' : 'tournaments'}
                          </Text>
                        </View>
                        
                        <Text style={styles.expandIndicator}>
                          {isSeasonExpanded ? '▼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                      
                      {/* Season Content - Months */}
                      {isSeasonExpanded && (
                        <View style={styles.seasonContent}>
                          {Object.entries(seasonData)
                            .sort(([a], [b]) => b.localeCompare(a)) // Recent months first
                            .map(([monthKey, monthTournaments]) => {
                              const isMonthExpanded = expandedMonths[monthKey] || false;
                              
                              return (
                                <View key={monthKey}>
                                  {/* Month Header */}
                                  <TouchableOpacity 
                                    style={[
                                      styles.monthHeader,
                                      isMonthExpanded && styles.expandedMonthHeader
                                    ]}
                                    onPress={() => toggleMonthExpansion(monthKey)}
                                    activeOpacity={0.7}
                                  >
                                    <View style={styles.monthHeaderContent}>
                                      <Text style={styles.monthHeaderText}>
                                        {formatMonthHeader(monthKey)}
                                      </Text>
                                      <Text style={styles.tournamentCountText}>
                                        {monthTournaments.length} {monthTournaments.length === 1 ? 'tournament' : 'tournaments'}
                                      </Text>
                                    </View>
                                    
                                    <Text style={styles.expandIndicator}>
                                      {isMonthExpanded ? '▼' : '▶'}
                                    </Text>
                                  </TouchableOpacity>
                                  
                                  {/* Month Content - Tournaments */}
                                  {isMonthExpanded && (
                                    <View style={styles.tournamentsContainer}>
                                      <VisTournamentList
                                        tournaments={monthTournaments}
                                        onTournamentPress={handleTournamentPress}
                                        loading={false}
                                        error={null}
                                        onRetry={() => loadTournaments(true)}
                                      />
                                    </View>
                                  )}
                                </View>
                              );
                            })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  stickyFilters: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  tournamentsSection: {
    flex: 1,
    position: 'relative',
  },
  contentWrapper: {
    flex: 1,
    paddingTop: 8,
  },
  listWrapper: {
    flex: 1,
    position: 'relative',
  },
  tournamentLoadingOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1B365D',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#4A90A4',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#4A90A4',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 24,
    color: '#1B365D',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 18,
    color: '#4A90A4',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  tournamentCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 24,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  // Legacy live indicator for backward compatibility
  liveIndicator: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 6,
    lineHeight: 24,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  tournamentLocation: {
    fontSize: 14,
    color: '#4A90A4',
    flex: 1,
  },
  countryFlag: {
    marginLeft: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dateIcon: {
    marginRight: 6,
  },
  tournamentDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  // Gender badge styles (like in match cards)
  genderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  genderSymbol: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  menSymbol: {
    color: '#3B82F6', // Blue for men
  },
  womenSymbol: {
    color: '#EC4899', // Pink for women
  },
  mixedSymbol: {
    color: '#8B5CF6', // Purple for mixed
  },
  tournamentPrize: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
    marginTop: 4,
  },
  tournamentParticipants: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  tournamentVenue: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  defaultSwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  defaultSwitchLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  defaultSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  openButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B365D',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#4A90A4',
    textAlign: 'center',
  },
  // Dropdown Styles
  dropdownContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
    position: 'relative',
    zIndex: 1000,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B365D',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 24,
    right: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: 200,
    zIndex: 1001,
  },
  dropdownScroll: {
    maxHeight: 180, // Slightly less than dropdownList to account for padding
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activeDropdownItem: {
    backgroundColor: '#F0F9FF',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#374151',
  },
  activeDropdownItemText: {
    color: '#1B365D',
    fontWeight: '600',
  },
  monthNavigatorContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 16,
  },
  monthNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  monthDisplayContainer: {
    alignItems: 'center',
    minWidth: 160,
    marginHorizontal: 16,
  },
  monthDisplayText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 2,
    textAlign: 'center',
  },
  seasonsList: {
    flex: 1,
  },
  seasonHeader: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 20,
    marginBottom: 0,
    borderBottomWidth: 2,
    borderBottomColor: '#1976D2',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expandedSeasonHeader: {
    backgroundColor: '#BBDEFB',
    borderColor: '#0D47A1',
    shadowOpacity: 0.15,
  },
  seasonHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seasonHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1976D2',
  },
  seasonContent: {
    paddingLeft: 16,
    marginBottom: 8,
  },
  monthHeader: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 6,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  expandedMonthHeader: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    shadowOpacity: 0.1,
  },
  monthHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  tournamentCountText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  expandIndicator: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  tournamentsContainer: {
    marginBottom: 8,
  },
  // LIVE tournaments section styles
  liveTournamentsSection: {
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 16,
  },
  liveCarousel: {
    marginHorizontal: -12, // Offset the padding to allow edge-to-edge scrolling
  },
  liveCarouselContainer: {
    paddingHorizontal: 12,
  },
  liveCarouselItem: {
    width: 280, // Fixed width for consistency
    marginRight: 16,
  },
  // Filter Toggle Link Styles
  filterToggleSection: {
    paddingHorizontal: 24,
    marginBottom: 8,
    alignItems: 'center',
  },
  filterToggleLink: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A90A4',
    textDecorationLine: 'underline',
  },
  expandableFiltersPanel: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    paddingTop: 16,
    paddingBottom: 8,
  },
  // Filter Row Styles
  filterRowContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  filterRowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B365D',
    marginBottom: 8,
  },
  // Period Selector Buttons
  periodSelectorButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1B365D',
    backgroundColor: 'transparent',
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  activePeriodButton: {
    backgroundColor: '#1B365D',
  },
  periodButtonText: {
    color: '#1B365D',
    fontWeight: '600',
    fontSize: 13,
  },
  activePeriodButtonText: {
    color: '#FFFFFF',
  },
  // Status Filter Buttons
  statusFilterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4A90A4',
    backgroundColor: 'transparent',
    flex: 1,
    alignItems: 'center',
  },
  activeStatusFilterButton: {
    backgroundColor: '#4A90A4',
  },
  statusFilterText: {
    color: '#4A90A4',
    fontWeight: '600',
    fontSize: 12,
  },
  activeStatusFilterText: {
    color: '#FFFFFF',
  },
});

export default TournamentSelectionScreen;