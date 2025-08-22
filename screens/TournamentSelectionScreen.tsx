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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, Calendar } from 'lucide-react';
import { TournamentCore } from '../types/tournament-v2';
import { colors } from '../theme/tokens';
import NavigationHeader from '../components/navigation/NavigationHeader';
import VisTournamentList from '../components/VisTournamentList';
import { VisTournamentItem } from '../components/VisTournamentList';
import { FlagImage } from '../components/FlagImage';
// Removed TournamentDateExtractor - now using direct API StartDate/EndDate

interface TournamentCardProps {
  tournament: TournamentCore;
  onPress: () => void;
}

const TournamentCard: React.FC<TournamentCardProps> = ({ tournament, onPress }) => {
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
    if (!tournament.dates?.startDate || !tournament.dates?.endDate) return null;
    
    const now = new Date();
    const start = new Date(tournament.dates.startDate);
    const end = new Date(tournament.dates.endDate);
    
    let status = '';
    let backgroundColor = '#6B7280';
    
    if (start <= now && now <= end) {
      status = 'LIVE';
      backgroundColor = colors.success;
    } else if (end < now) {
      status = 'COMPLETED';
      backgroundColor = '#1B365D';
    } else if (start > now) {
      status = 'UPCOMING';
      backgroundColor = '#FF6B35';
    }
    
    if (status) {
      return (
        <View style={[styles.statusIndicator, { backgroundColor }]}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      );
    }
    
    return null;
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
      
      {getLocation() && (
        <View style={styles.locationContainer}>
          <Text style={styles.tournamentLocation}>📍 {getLocation()}</Text>
          <FlagImage
            federationCode={tournament.countryCode}
            teamName={tournament.country}
            size="medium"
            style={styles.countryFlag}
          />
        </View>
      )}
      
      {getDateRange() && (
        <Text style={styles.tournamentDate}>📅 {getDateRange()}</Text>
      )}
      
      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.openButton} onPress={onPress}>
          <Text style={styles.openButtonText}>OPEN</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};


const TournamentSelectionScreen: React.FC = () => {
  const [tournaments, setTournaments] = useState<TournamentCore[]>([]);
  
  // Add test tournament data to verify the component works - including LIVE tournaments
  const testTournaments: TournamentCore[] = [
    {
      id: 'live_001',
      visNo: 'LIVE001',
      version: 1,
      lastUpdated: new Date().toISOString(),
      code: 'BPTROME',
      name: 'BPT Elite16 Rome',
      title: 'BPT Elite16 Rome',
      gender: 'M' as any,
      tournamentType: 'BPT ELITE' as any,
      status: 'ACTIVE' as any,
      dates: {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Started yesterday
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Ends tomorrow
      },
      city: 'Rome',
      country: 'Italy',
    },
    {
      id: 'live_002',
      visNo: 'LIVE002',
      version: 1,
      lastUpdated: new Date().toISOString(),
      code: 'CEVVIENNA',
      name: 'CEV European Championship Vienna',
      title: 'CEV European Championship Vienna',
      gender: 'W' as any,
      tournamentType: 'CEV' as any,
      status: 'ACTIVE' as any,
      dates: {
        startDate: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // Started 12h ago
        endDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // Ends in 2 days
      },
      city: 'Vienna',
      country: 'Austria',
    },
    {
      id: 'dev_001',
      visNo: 'DEV001',
      version: 1,
      lastUpdated: new Date().toISOString(),
      code: 'DEVBVB',
      name: 'BPT Challenger Warsaw Open',
      title: 'BPT Challenger Warsaw Open',
      gender: 'W' as any,
      tournamentType: 'BPT CHALLENGER' as any,
      status: 'UPCOMING' as any,
      dates: {
        startDate: '2025-08-21T00:00:00',
        endDate: '2025-08-23T23:59:59'
      },
      city: 'Warsaw',
      country: 'Poland',
    },
    {
      id: 'dev_002',
      visNo: 'DEV002',
      version: 1,
      lastUpdated: new Date().toISOString(),
      code: 'TESTBVB',
      name: 'BPT Futures Hamburg Championship',
      title: 'BPT Futures Hamburg Championship',
      gender: 'M' as any,
      tournamentType: 'BPT FUTURES' as any,
      status: 'UPCOMING' as any,
      dates: {
        startDate: '2025-08-25T00:00:00',
        endDate: '2025-08-27T23:59:59'
      },
      city: 'Hamburg',
      country: 'Germany',
    }
  ];
  const [initialLoading, setInitialLoading] = useState(true);
  const [tournamentLoading, setTournamentLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('BPT');
  const [availableCategories, setAvailableCategories] = useState<string[]>(['ALL']);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [timePeriod, setTimePeriod] = useState<'Week' | 'Month' | 'Year'>('Month');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [currentYear, setCurrentYear] = useState<Date>(new Date());
  const router = useRouter();

  // Helper function to get Sunday of current week
  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = d.getDate() - day; // Go back to Sunday (day 0)
    return new Date(d.setDate(diff));
  }

  // Helper function to format week range
  function formatWeekRange(weekStart: Date): string {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
    }
  }

  // Helper function to format month
  function formatMonth(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  // Helper function to format year
  function formatYear(date: Date): string {
    return date.getFullYear().toString();
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
        
        // Use VIS tournaments if available, otherwise test tournaments as fallback
        const finalTournaments = visTournaments.length > 0 ? visTournaments : testTournaments;
        
        // Show tournaments immediately with EventNo fallback
        setTournaments(finalTournaments);
        
        // Generate dynamic categories based on actual tournament data
        const dynamicCategories = generateDynamicCategories(finalTournaments);
        setAvailableCategories(dynamicCategories);
        
        // Set default selection to first non-ALL category if BPT doesn't exist
        if (!dynamicCategories.includes('BPT') && dynamicCategories.length > 1) {
          setSelectedType(dynamicCategories[1]); // First category after ALL
        }
        
        // Enhance tournaments with real tournament numbers in background
        enhanceTournamentsInBackground(finalTournaments, visApi);
      } else {
        // Fallback to test tournaments if API fails
        setTournaments(testTournaments);
        const testCategories = generateDynamicCategories(testTournaments);
        setAvailableCategories(testCategories);
        setSelectedType(testCategories[1] || 'ALL');
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
        
        // Update categories after enhancement (in case new types were discovered)
        const updatedCategories = generateDynamicCategories(updatedTournaments);
        setAvailableCategories(updatedCategories);
        
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
        const startDate = getValue('StartDate');
        const endDate = getValue('EndDate');
        const city = getValue('City');
        const country = getValue('Country');
        const location = getValue('Location');
        const venue = getValue('Venue');
        const continent = getValue('Continent');
        const gender = getValue('Gender');
        const type = getValue('Type'); // Extract tournament type from VIS API
        
        // Check for any country/federation code fields from VIS API
        console.log(`🌍 VIS API fields for "${name}":`, {
          city, country, location, venue, continent,
          countryCode: getValue('CountryCode'),
          federationCode: getValue('FederationCode'),
          nation: getValue('Nation'),
          federation: getValue('Federation'),
          iso: getValue('ISO'),
          code: getValue('Code')
        });
        
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
            location: location || undefined,
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

  // TEST API CALL - Direct VIS API test
  const testApiCall = async () => {
    
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
    
    try {
      const response = await visApi.getEventList({
        tournamentType: 'BPT',
        maxResults: 10,
        startDate: '2025-01-01', 
        endDate: '2025-12-31'
      });
      
      // Silent handling of test API response
    } catch (error) {
      // Silent handling of test API error
    }
  };

  // Auto-run test on first render
  React.useEffect(() => {
    if (!initialLoading && tournaments.length === 0) {
      testApiCall();
    }
  }, [initialLoading, tournaments.length]);

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
            
            // Use VIS tournaments if available, otherwise test tournaments as fallback
            const finalTournaments = visTournaments.length > 0 ? visTournaments : testTournaments;
          
            setTournaments(finalTournaments);
            
            // Generate dynamic categories
            const dynamicCategories = generateDynamicCategories(finalTournaments);
            setAvailableCategories(dynamicCategories);
            
            // Set default selection to first non-ALL category if BPT doesn't exist
            if (!dynamicCategories.includes('BPT') && dynamicCategories.length > 1) {
              setSelectedType(dynamicCategories[1]); // First category after ALL
            }
          } catch (parseError) {
            // Fallback to test tournaments if parsing fails
            setTournaments(testTournaments);
            const testCategories = generateDynamicCategories(testTournaments);
            setAvailableCategories(testCategories);
            setSelectedType(testCategories[1] || 'ALL');
          }
        } else {
          // Fallback to test tournaments if API fails
          setTournaments(testTournaments);
          const testCategories = generateDynamicCategories(testTournaments);
          setAvailableCategories(testCategories);
          setSelectedType(testCategories[1] || 'ALL');
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

  // Separate effect for category changes - only update filtered results, don't reload API
  useEffect(() => {
    // This will automatically trigger re-filtering when selectedType changes
    // No need to reload tournaments from API
  }, [selectedType]);

  // Sync time periods when switching modes (preserve user selections)
  useEffect(() => {
    const now = new Date();
    switch (timePeriod) {
      case 'Week':
        // Only reset to current week if we're switching from a different period
        // and the current week is in a different period than what was selected
        if (currentWeekStart.getFullYear() !== now.getFullYear() || 
            Math.abs(currentWeekStart.getTime() - now.getTime()) > 365 * 24 * 60 * 60 * 1000) {
          setCurrentWeekStart(getWeekStart(now));
        }
        break;
      case 'Month':
        // Only reset to current month if we're switching from a different period
        // and the current month is in a different year than what was selected
        if (currentMonth.getFullYear() !== now.getFullYear()) {
          setCurrentMonth(now);
        }
        break;
      case 'Year':
        // Don't automatically reset year - preserve user selection
        // Only set to current year on first load if year is not set
        break;
    }
  }, [timePeriod, currentWeekStart, currentMonth]);

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

  // Get LIVE tournaments (currently active)
  const liveTournaments = tournaments.filter(tournament => {
    if (!tournament.dates?.startDate || !tournament.dates?.endDate) return false;
    
    const now = new Date();
    const start = new Date(tournament.dates.startDate);
    const end = new Date(tournament.dates.endDate);
    
    return start <= now && now <= end;
  });

  // Filter tournaments based on selected time period and category
  const filteredTournaments = tournaments.filter(tournament => {
    // Basic validation filters
    if (!tournament.name || !tournament.dates?.startDate) {
      return false;
    }
    
    // Skip very old tournaments (before 2020)
    const startDate = new Date(tournament.dates.startDate);
    if (startDate.getFullYear() < 2020) {
      return false;
    }
    
    // Skip tournaments too far in the future (after 2026)
    if (startDate.getFullYear() > 2026) {
      return false;
    }
    
    // Apply time period filtering based on UI controls
    const tournamentEnd = tournament.dates?.endDate ? new Date(tournament.dates.endDate) : startDate;
    let periodOverlap = false;
    
    switch (timePeriod) {
      case 'Week':
        const weekStart = new Date(currentWeekStart);
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999); // End of day
        periodOverlap = startDate <= weekEnd && tournamentEnd >= weekStart;
        break;
        
      case 'Month':
        const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59, 999);
        periodOverlap = startDate <= monthEnd && tournamentEnd >= monthStart;
        break;
        
      case 'Year':
        const yearStart = new Date(currentYear.getFullYear(), 0, 1);
        const yearEnd = new Date(currentYear.getFullYear(), 11, 31, 23, 59, 59, 999);
        periodOverlap = startDate <= yearEnd && tournamentEnd >= yearStart;
        break;
    }
    
    if (!periodOverlap) {
      return false;
    }
    
    // Apply category/type filtering
    if (selectedType === 'ALL') {
      return true;
    }
    
    const matchesCategory = matchesTournamentCategory(tournament, selectedType);
    if (!matchesCategory) {
      return false;
    }
    
    return true;
  });


  // Navigate based on time period
  const navigatePeriod = (direction: 'prev' | 'next') => {
    const currentYearNum = new Date().getFullYear();
    const minYear = currentYearNum - 5; // Allow 5 years back
    const maxYear = currentYearNum + 2; // Allow 2 years forward
    
    switch (timePeriod) {
      case 'Week':
        const newWeekStart = new Date(currentWeekStart);
        const daysToMove = direction === 'next' ? 7 : -7;
        newWeekStart.setDate(currentWeekStart.getDate() + daysToMove);
        
        // Prevent navigation beyond reasonable limits
        if (newWeekStart.getFullYear() >= minYear && newWeekStart.getFullYear() <= maxYear) {
          setCurrentWeekStart(newWeekStart);
        }
        break;
        
      case 'Month':
        const newMonth = new Date(currentMonth);
        const monthsToMove = direction === 'next' ? 1 : -1;
        newMonth.setMonth(currentMonth.getMonth() + monthsToMove);
        
        // Prevent navigation beyond reasonable limits
        if (newMonth.getFullYear() >= minYear && newMonth.getFullYear() <= maxYear) {
          setCurrentMonth(newMonth);
        }
        break;
        
      case 'Year':
        const newYear = new Date(currentYear);
        const yearsToMove = direction === 'next' ? 1 : -1;
        const targetYear = currentYear.getFullYear() + yearsToMove;
        
        // Prevent navigation beyond reasonable limits
        if (targetYear >= minYear && targetYear <= maxYear) {
          newYear.setFullYear(targetYear);
          setCurrentYear(newYear);
        }
        break;
    }
  };

  // Navigate to current period (today)
  const goToCurrentPeriod = () => {
    const now = new Date();
    switch (timePeriod) {
      case 'Week':
        setCurrentWeekStart(getWeekStart(now));
        break;
      case 'Month':
        setCurrentMonth(now);
        break;
      case 'Year':
        setCurrentYear(now);
        break;
    }
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
        
        const tournamentStart = new Date(tournament.dates.startDate);
        const tournamentEnd = tournament.dates?.endDate ? new Date(tournament.dates.endDate) : tournamentStart;
        
        let periodOverlap = false;
        
        switch (timePeriod) {
          case 'Week':
            const weekStart = new Date(currentWeekStart);
            const weekEnd = new Date(currentWeekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            periodOverlap = tournamentStart <= weekEnd && tournamentEnd >= weekStart;
            break;
            
          case 'Month':
            const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
            periodOverlap = tournamentStart <= monthEnd && tournamentEnd >= monthStart;
            break;
            
          case 'Year':
            const yearStart = new Date(currentYear.getFullYear(), 0, 1);
            const yearEnd = new Date(currentYear.getFullYear(), 11, 31);
            periodOverlap = tournamentStart <= yearEnd && tournamentEnd >= yearStart;
            break;
        }
        
        return periodOverlap && matchesTournamentCategory(tournament, category);
      }).length;
      
      return { category, count };
    }).filter(item => item.count > 0 || item.category === 'ALL'); // Keep ALL even if 0, filter others
  };

  const renderCategoryDropdown = () => {
    const categoriesWithCounts = getCategoriesWithCounts();
    const selectedCategory = categoriesWithCounts.find(item => item.category === selectedType);
    
    return (
      <View style={styles.dropdownContainer}>
        <TouchableOpacity 
          style={styles.dropdownButton}
          onPress={() => setShowDropdown(!showDropdown)}
        >
          <Text style={styles.dropdownButtonText}>
            {selectedCategory ? `${selectedCategory.category} (${selectedCategory.count})` : 'Select Category'}
          </Text>
          <Text style={styles.dropdownArrow}>
            {showDropdown ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>
        
        {showDropdown && (
          <View style={styles.dropdownList}>
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

  const renderTimePeriodSelector = () => {
    const periods: ('Week' | 'Month' | 'Year')[] = ['Week', 'Month', 'Year'];
    
    return (
      <View style={styles.periodSelectorContainer}>
        {periods.map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              timePeriod === period && styles.activePeriodButton
            ]}
            onPress={() => setTimePeriod(period)}
          >
            <Text style={[
              styles.periodButtonText,
              timePeriod === period && styles.activePeriodButtonText
            ]}>
              {period}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderDateNavigator = () => {
    let displayInfo = '';
    let isCurrentPeriod = false;
    
    switch (timePeriod) {
      case 'Week':
        isCurrentPeriod = getWeekStart(new Date()).getTime() === currentWeekStart.getTime();
        displayInfo = isCurrentPeriod ? 'This Week' : formatWeekRange(currentWeekStart);
        break;
      case 'Month':
        const currentMonthTime = new Date().getMonth();
        const currentYearTime = new Date().getFullYear();
        isCurrentPeriod = currentMonth.getMonth() === currentMonthTime && currentMonth.getFullYear() === currentYearTime;
        displayInfo = isCurrentPeriod ? 'This Month' : formatMonth(currentMonth);
        break;
      case 'Year':
        isCurrentPeriod = currentYear.getFullYear() === new Date().getFullYear();
        displayInfo = isCurrentPeriod ? 'This Year' : formatYear(currentYear);
        break;
    }
    
    return (
      <View style={styles.weekNavigatorContainer}>
        <View style={styles.weekNavigator}>
          <TouchableOpacity 
            style={styles.calendarIconButton}
            onPress={goToCurrentPeriod}
          >
            <Calendar size={20} color="#4A90A4" strokeWidth={2} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.weekNavButton}
            onPress={() => navigatePeriod('prev')}
          >
            <Text style={styles.weekNavButtonText}>◀</Text>
          </TouchableOpacity>
          
          <View style={styles.weekDisplayContainer}>
            <Text style={styles.weekDisplayText}>{displayInfo}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.weekNavButton}
            onPress={() => navigatePeriod('next')}
          >
            <Text style={styles.weekNavButtonText}>▶</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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
          title="" 
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
          
          {/* Sticky Filter Section */}
          <View style={styles.stickyFilters}>
            {renderCategoryDropdown()}
            {renderTimePeriodSelector()}
            {renderDateNavigator()}
          </View>
        
          {/* Tournament List Section */}
          <View style={styles.tournamentsSection}>
            <VisTournamentList
              tournaments={filteredTournaments}
              onTournamentPress={handleTournamentPress}
              loading={tournamentLoading}
              error={error}
              onRetry={() => loadTournaments(true)}
            />
            {tournamentLoading && (
              <View style={styles.tournamentLoadingOverlay}>
                <ActivityIndicator size="small" color="#FF6B35" />
              </View>
            )}
          
            {filteredTournaments.length === 0 && !initialLoading && !tournamentLoading && (
              <View style={styles.emptyState}>
                <Clock size={48} color="#9CA3AF" strokeWidth={2} />
                <Text style={styles.emptyText}>No tournaments found</Text>
                <Text style={styles.emptySubtext}>
                  {tournaments.length === 0 
                    ? 'No tournaments available for any week'
                    : 'No tournaments for this week and category'
                  }
                </Text>
              </View>
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
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
  // Period Selector Styles
  periodSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1B365D',
    backgroundColor: 'transparent',
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  activePeriodButton: {
    backgroundColor: '#1B365D',
  },
  periodButtonText: {
    color: '#1B365D',
    fontWeight: '600',
    fontSize: 14,
  },
  activePeriodButtonText: {
    color: '#FFFFFF',
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
  weekNavigatorContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  weekNavigator: {
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
  weekNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  weekNavButtonText: {
    fontSize: 16,
    color: '#4A90A4',
    fontWeight: 'bold',
  },
  weekDisplayContainer: {
    alignItems: 'center',
    minWidth: 120,
    marginHorizontal: 16,
  },
  weekDisplayText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 2,
  },
  weekTournamentCount: {
    fontSize: 14,
    color: '#4A90A4',
    fontWeight: '500',
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
});

export default TournamentSelectionScreen;