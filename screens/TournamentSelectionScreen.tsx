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
import { Clock } from 'lucide-react';
import { TournamentCore } from '../types/tournament-v2';
import { VisApiService } from '../services/visApi';
import NavigationHeader from '../components/navigation/NavigationHeader';
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
    const city = tournament.City;
    const country = tournament.CountryName || tournament.Country;
    
    if (city && country) {
      return `${city}, ${country}`;
    }
    
    // Only return location if we have explicit location data, city, or country
    // Don't show fallback text or try to infer from title
    return tournament.Location || city || country || null;
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
    // Use direct API StartDate and EndDate - no complex extraction needed!
    const startDate = tournament.StartDate;
    const endDate = tournament.EndDate;
    
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
    if (!tournament.StartDate || !tournament.EndDate) return null;
    
    const now = new Date();
    const start = new Date(tournament.StartDate);
    const end = new Date(tournament.EndDate);
    
    let status = '';
    let backgroundColor = '#6B7280';
    
    if (start <= now && now <= end) {
      status = 'LIVE';
      backgroundColor = '#2E8B57';
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

  // Get tournament category/type badge
  const getCategoryBadge = () => {
    const category = tournament.Category || tournament.Type || tournament.Series;
    if (!category) return null;
    
    // Color coding for different tournament types
    const getBadgeColor = (cat: string) => {
      const catLower = cat.toLowerCase();
      if (catLower.includes('fivb') || catLower.includes('world')) return '#FF6B35';
      if (catLower.includes('cev') || catLower.includes('europe')) return '#4A90A4';
      if (catLower.includes('bpt') || catLower.includes('elite')) return '#2E8B57';
      if (catLower.includes('national')) return '#6B7280';
      return '#9CA3AF';
    };
    
    return (
      <View style={[styles.categoryBadge, { backgroundColor: getBadgeColor(category) }]}>
        <Text style={styles.categoryBadgeText}>{category.toUpperCase()}</Text>
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
        {getCategoryBadge()}
      </View>
      
      <Text style={styles.tournamentName}>
        {tournament.Title || tournament.Name || `Tournament ${tournament.No}`}
      </Text>
      
      {getLocation() && (
        <Text style={styles.tournamentLocation}>📍 {getLocation()}</Text>
      )}
      
      {getDateRange() && (
        <Text style={styles.tournamentDate}>📅 {getDateRange()}</Text>
      )}

      {/* Enhanced information from BeachTournament/Events data */}
      {getPrizeInfo()}
      {getParticipantsInfo()}
      {getVenueInfo()}
      
      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.openButton} onPress={onPress}>
          <Text style={styles.openButtonText}>OPEN</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_CARD_WIDTH = SCREEN_WIDTH * 0.75;
const CAROUSEL_CARD_MARGIN = 12;

interface LiveTournamentCardProps {
  tournament: Tournament;
  onPress: () => void;
}

const LiveTournamentCard: React.FC<LiveTournamentCardProps> = ({ tournament, onPress }) => {
  const getLocation = () => {
    // Try different combinations of available location data
    const city = tournament.City;
    const country = tournament.CountryName || tournament.Country;
    
    if (city && country) {
      return `${city}, ${country}`;
    }
    
    // Only return location if we have explicit location data, city, or country
    return tournament.Location || city || country || null;
  };

  // Get category badge for live tournaments
  const getCategoryBadge = () => {
    const category = tournament.Category || tournament.Type || tournament.Series;
    if (!category) return null;
    
    return (
      <View style={styles.liveCategoryBadge}>
        <Text style={styles.liveCategoryBadgeText}>{category.toUpperCase()}</Text>
      </View>
    );
  };

  // Get participants info
  const getParticipantsInfo = () => {
    const gender = tournament.Gender;
    const teams = tournament.Teams || tournament.MaxTeams;
    
    if (gender || teams) {
      const parts = [];
      if (gender) parts.push(gender === 'M' ? 'Men' : gender === 'W' ? 'Women' : 'Mixed');
      if (teams) parts.push(`${teams} teams`);
      
      return (
        <Text style={styles.liveParticipantsInfo} numberOfLines={1}>
          👥 {parts.join(' • ')}
        </Text>
      );
    }
    return null;
  };

  return (
    <TouchableOpacity 
      style={styles.liveCard} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.liveCardHeader}>
        <View style={styles.liveBadge}>
          <View style={styles.liveIndicatorPulse} />
          <Text style={styles.liveBadgeText}>🔴 IN CORSO</Text>
        </View>
        {getCategoryBadge()}
      </View>
      
      <Text style={styles.liveTournamentName} numberOfLines={2}>
        {tournament.Title || tournament.Name || `Tournament ${tournament.No}`}
      </Text>
      
      {getLocation() && (
        <Text style={styles.liveTournamentLocation} numberOfLines={1}>
          📍 {getLocation()}
        </Text>
      )}
      
      {getParticipantsInfo()}
    </TouchableOpacity>
  );
};

interface WeekTournamentCardProps {
  tournament: Tournament;
  onPress: () => void;
}

const WeekTournamentCard: React.FC<WeekTournamentCardProps> = ({ tournament, onPress }) => {
  const getLocation = () => {
    const city = tournament.City;
    const country = tournament.CountryName || tournament.Country;
    
    if (city && country) {
      return `${city}, ${country}`;
    }
    
    // Only return location if we have explicit location data, city, or country
    return tournament.Location || city || country || null;
  };

  const getStatus = () => {
    if (!tournament.StartDate || !tournament.EndDate) return null;
    
    const now = new Date();
    const start = new Date(tournament.StartDate);
    const end = new Date(tournament.EndDate);
    
    if (start <= now && now <= end) {
      return { text: '🔴 LIVE', color: '#2E8B57' };
    } else if (start > now) {
      return { text: '📅 UPCOMING', color: '#4A90A4' };
    } else {
      return { text: '✅ COMPLETED', color: '#6B7280' };
    }
  };

  const status = getStatus();

  return (
    <TouchableOpacity 
      style={styles.liveCard} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.liveCardHeader}>
        {status && (
          <View style={[styles.liveBadge, { backgroundColor: status.color }]}>
            <Text style={styles.liveBadgeText}>{status.text}</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.liveTournamentName} numberOfLines={2}>
        {tournament.Title || tournament.Name || `Tournament ${tournament.No}`}
      </Text>
      
      {getLocation() && (
        <Text style={styles.liveTournamentLocation} numberOfLines={1}>
          📍 {getLocation()}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const TournamentSelectionScreen: React.FC = () => {
  const [tournaments, setTournaments] = useState<TournamentCore[]>([]);
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
      
      console.log(`🏐 Loading tournaments, force refresh: ${forceRefresh}`);
      
      // Use cache system for optimal performance
      const currentYearNumber = currentYear.getFullYear();
      console.log(`🏐 TournamentSelectionScreen: Loading tournaments for year: ${currentYearNumber}`);
      console.log(`🏐 TournamentSelectionScreen: Current year object:`, currentYear);
      console.log(`🏐 TournamentSelectionScreen: Time period:`, timePeriod);
      
      // Import CacheService dynamically to avoid circular dependencies
      const { CacheService } = await import('../services/CacheService');
      const cacheResult = await CacheService.getTournaments({ 
        recentOnly: false,  // Get all tournaments, not just recent
        tournamentType: undefined,  // Get all types, filter client-side
        year: currentYearNumber  // Use selected year from time period selector
      });
      
      const tournamentList = cacheResult.data;
      console.log(`🏐 Loaded ${tournamentList.length} total tournaments from ${cacheResult.source}`);
      console.log('🏐 Tournament sample:', tournamentList.slice(0, 2));
      
      // Debug merge status
      const mergedTournaments = tournamentList.filter(t => (t as any)._mergedTournaments && (t as any)._mergedTournaments.length > 1);
      const singleTournaments = tournamentList.filter(t => !(t as any)._mergedTournaments || (t as any)._mergedTournaments.length <= 1);
      console.log(`🏐 MERGE STATUS: ${mergedTournaments.length} merged, ${singleTournaments.length} single`);
      
      if (mergedTournaments.length > 0) {
        console.log('🏐 MERGED EXAMPLES:', mergedTournaments.slice(0, 3).map(t => ({
          name: t.Name,
          mergedCount: (t as any)._mergedTournaments.length,
          merged: (t as any)._mergedTournaments.map((m: any) => m.Name)
        })));
      }
      
      // Extract and set available categories from tournament data
      const categories = extractTournamentCategories(tournamentList);
      setAvailableCategories(categories);
      setTournaments(tournamentList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      Alert.alert('Error', 'Failed to load tournaments. Please check your connection.');
    } finally {
      setInitialLoading(false);
      setTournamentLoading(false);
    }
  }, [currentYear, timePeriod]);

  useEffect(() => {
    loadTournaments(false, true); // Initial load
  }, []);

  // Handle currentYear changes with tournament loading (not full page reload)
  useEffect(() => {
    if (initialLoading) return; // Skip during initial load
    loadTournaments(false, false); // Reload tournaments for new year, but don't show full page loading
  }, [currentYear]);

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
      console.log('🏐 FORCING CACHE REFRESH - clearing all caches');
      const { CacheService } = await import('../services/CacheService');
      
      // Clear memory and local storage caches
      if (typeof CacheService.clearCache === 'function') {
        await CacheService.clearCache();
      }
      
      console.log('🏐 Cache cleared, forcing fresh API call...');
      
      await loadTournaments(true);
    } finally {
      setRefreshing(false);
    }
  }, [loadTournaments]);

  const handleTournamentPress = (tournament: Tournament) => {
    console.log(`DEBUG CLICK: User clicked on tournament "${tournament.Name}" with No: ${tournament.No}, StartDate: ${tournament.StartDate}, EndDate: ${tournament.EndDate}`);
    const merged = (tournament as any)._mergedTournaments;
    
    // Ensure _mergedTournaments is preserved in JSON serialization
    const tournamentWithMerged = {
      ...tournament,
      _mergedTournaments: merged
    };
    
    router.push({
      pathname: '/tournament-detail',
      params: { tournamentData: JSON.stringify(tournamentWithMerged) }
    });
  };

  // Match tournament to category with flexible patterns
  const matchesTournamentCategory = (tournament: Tournament, category: string): boolean => {
    if (category === 'ALL') return true;
    
    const name = (tournament.Name || tournament.Title || '').toUpperCase();
    const type = (tournament.Type || tournament.Category || tournament.Series || '').toUpperCase();
    const allText = `${name} ${type}`.trim();
    
    // Direct field matching
    if (type.includes(category)) return true;
    
    // Pattern-based matching for common categories
    switch (category) {
      case 'BPT':
        return allText.includes('BPT') || allText.includes('BEACH PRO TOUR') || allText.includes('BEACH PROFESSIONAL') ||
               allText.includes('ELITE') || allText.includes('CHALLENGE') || allText.includes('FUTURES');
      case 'BPT FUTURES':
        return allText.includes('BPT FUTURES') || allText.includes('FUTURES');
      case 'BPT ELITE':
        return allText.includes('BPT ELITE') || allText.includes('ELITE');
      case 'BPT CHALLENGE':
        return allText.includes('BPT CHALLENGE') || allText.includes('CHALLENGE');
      case 'CEV':
        return allText.includes('CEV') || allText.includes('EUROPEAN') || allText.includes('CONFEDERATION');
      case 'FIVB':
        return allText.includes('FIVB') || allText.includes('WORLD') || allText.includes('INTERNATIONAL');
      case 'NATIONAL':
        return allText.includes('NATIONAL') || allText.includes('DOMESTIC') || allText.includes('CHAMPIONSHIP');
      case 'YOUTH':
        return allText.includes('YOUTH') || allText.includes('U21') || allText.includes('U19') || allText.includes('JUNIOR');
      case 'QUALIFICATION':
        return allText.includes('QUALIFICATION') || allText.includes('QUALIFIER') || allText.includes('QUALIFYING');
      default:
        // For any other category, check if it appears in the tournament text
        return allText.includes(category);
    }
  };

  // Filter tournaments based on selected time period and category
  const filteredTournaments = tournaments.filter(tournament => {
    if (!tournament.StartDate) return false;
    
    // Exclude cancelled tournaments
    if (tournament.Status && tournament.Status.toLowerCase().includes('cancelled')) {
      return false;
    }
    
    const tournamentStart = new Date(tournament.StartDate);
    const tournamentEnd = tournament.EndDate ? new Date(tournament.EndDate) : tournamentStart;
    
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
    
    // Type filtering
    if (selectedType === 'ALL') {
      return periodOverlap;
    }
    
    // Dynamic tournament type filtering
    return periodOverlap && matchesTournamentCategory(tournament, selectedType);
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
  const extractTournamentCategories = (tournaments: Tournament[]): string[] => {
    const categorySet = new Set<string>();
    categorySet.add('ALL'); // Always include ALL option
    
    tournaments.forEach(tournament => {
      // Extract from various possible category fields
      const sources = [
        tournament.Type,
        tournament.Category,
        tournament.Series,
        tournament.League,
        tournament.Division
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
      const name = (tournament.Name || tournament.Title || '').toUpperCase();
      
      // BPT subcategories (check specific ones first, then general BPT)
      if (name.includes('BPT FUTURES') || name.includes('FUTURES')) {
        categorySet.add('BPT FUTURES');
      } else if (name.includes('BPT ELITE') || name.includes('ELITE')) {
        categorySet.add('BPT ELITE');
      } else if (name.includes('BPT CHALLENGE') || name.includes('CHALLENGE')) {
        categorySet.add('BPT CHALLENGE');
      } else if (name.includes('BPT') || name.includes('BEACH PRO TOUR')) {
        categorySet.add('BPT');
      }
      
      if (name.includes('CEV') || name.includes('EUROPEAN')) {
        categorySet.add('CEV');
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
    });
    
    const categories = Array.from(categorySet).sort((a, b) => {
      // Prioritize common categories with BPT subcategories
      const priority = [
        'ALL', 
        'BPT', 'BPT ELITE', 'BPT CHALLENGE', 'BPT FUTURES',
        'CEV', 'FIVB', 'NATIONAL', 'YOUTH', 'QUALIFICATION'
      ];
      const aIndex = priority.indexOf(a);
      const bIndex = priority.indexOf(b);
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
    
    console.log('Extracted categories:', categories);
    return categories;
  };

  const renderTournament = ({ item }: { item: Tournament }) => {
    // Debug log for Baden tournaments only (to avoid console spam)
    if (item.Name?.toLowerCase().includes('baden')) {
      console.log(`🏐 DEBUG TOURNAMENT LIST: Complete Baden tournament object:`, JSON.stringify(item, null, 2));
    }
    
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
        if (!tournament.StartDate) return false;
        if (tournament.Status && tournament.Status.toLowerCase().includes('cancelled')) return false;
        
        const tournamentStart = new Date(tournament.StartDate);
        const tournamentEnd = tournament.EndDate ? new Date(tournament.EndDate) : tournamentStart;
        
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
          
          <TouchableOpacity 
            style={styles.todayButtonInline}
            onPress={goToCurrentPeriod}
          >
            <Text style={styles.todayButtonInlineText}>
              Today
            </Text>
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
          showRefreshButton={true}
          onRefresh={onRefresh}
        />
        
        <View style={styles.contentWrapper}>
          <Text style={styles.pageTitle}>Choose a Tournament</Text>
          {renderTimePeriodSelector()}
          
          {renderDateNavigator()}
          
          {renderCategoryDropdown()}
        
          <View style={styles.listWrapper}>
            <FlatList
              data={filteredTournaments}
              renderItem={renderTournament}
              keyExtractor={(item) => item.No}
              style={styles.list}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#FF6B35']}
                  tintColor="#FF6B35"
                />
              }
            />
            {tournamentLoading && (
              <View style={styles.tournamentLoadingOverlay}>
                <ActivityIndicator size="small" color="#FF6B35" />
              </View>
            )}
          </View>
      
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
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentWrapper: {
    flex: 1,
    paddingTop: 16,
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
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B365D',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
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
    backgroundColor: '#2E8B57',
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
  tournamentLocation: {
    fontSize: 14,
    color: '#4A90A4',
    marginBottom: 2,
  },
  tournamentDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  // Enhanced tournament card styles
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  tournamentPrize: {
    fontSize: 13,
    color: '#2E8B57',
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
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1B365D',
    backgroundColor: 'transparent',
    minWidth: 70,
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
    marginBottom: 24,
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
    marginBottom: 24,
  },
  weekNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    flex: 1,
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
  todayButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
  },
  todayButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  todayButtonInline: {
    backgroundColor: '#1B365D',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  todayButtonInlineText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  carouselContainer: {
    paddingLeft: 24,
    paddingRight: 12,
  },
  carouselCardWrapper: {
    marginRight: CAROUSEL_CARD_MARGIN,
    width: CAROUSEL_CARD_WIDTH,
  },
  liveCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#2E8B57',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#2E8B57',
    minHeight: 110,
  },
  liveCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E8B57',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveIndicatorPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
    marginRight: 6,
    // Animation would be handled by Animated API in a real implementation
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  liveTournamentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 6,
    lineHeight: 20,
  },
  liveTournamentLocation: {
    fontSize: 13,
    color: '#4A90A4',
    marginBottom: 4,
  },
  // Enhanced live card styles
  liveCategoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  liveCategoryBadgeText: {
    color: '#2E8B57',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  liveParticipantsInfo: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
  },
  // Empty Badge Styles
  emptyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  emptyBadgeText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});

export default TournamentSelectionScreen;