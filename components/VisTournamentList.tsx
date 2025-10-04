import React from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { TournamentCore } from '../types/tournament-v2';
import { FlagImage } from './FlagImage';
import { designTokens } from '../theme/tokens';

interface VisTournamentItemProps {
  tournament: TournamentCore;
  onPress: () => void;
}

/**
 * Tournament item component optimized for VIS API data structure
 * Handles the actual fields returned by FIVB VIS API
 */
export const VisTournamentItem: React.FC<VisTournamentItemProps> = ({ tournament, onPress }) => {
  
  const formatDate = (dateStr?: string, includeYear = true) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const day = date.getDate().toString().padStart(2, '0');
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear();
      
      if (includeYear) {
        return `${day} ${month} ${year}`;
      } else {
        return `${day} ${month}`;
      }
    } catch {
      return dateStr;
    }
  };

  const getLocation = () => {
    // VIS API provides City and Country fields directly
    const city = tournament.city;
    const country = tournament.country;
    const location = tournament.location;
    const venue = (tournament as any).venue;
    
    // Try different combinations
    if (city && country) {
      return `${city}, ${country}`;
    }
    
    if (location && country) {
      return `${location}, ${country}`;
    }
    
    if (venue && city) {
      return `${venue}, ${city}`;
    }
    
    if (venue && country) {
      return `${venue}, ${country}`;
    }
    
    // Try to infer from tournament name if location data is missing
    const inferredLocation = inferLocationFromName(tournament.name || tournament.title);
    if (inferredLocation) {
      return inferredLocation;
    }
    
    return city || country || location || venue || 'Location TBA';
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
      { pattern: 'warsaw', location: 'Warsaw, Poland' },
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
      { pattern: 'bujumbura', location: 'Bujumbura, Burundi' },
      { pattern: 'warsaw', location: 'Warsaw, Poland' },
      { pattern: 'hamburg', location: 'Hamburg, Germany' },
      { pattern: 'ostrava', location: 'Ostrava, Czech Republic' },
      { pattern: 'brasilia', location: 'Brasília, Brazil' },
      { pattern: 'doha', location: 'Doha, Qatar' },
      { pattern: 'dubai', location: 'Dubai, UAE' },
      { pattern: 'melbourne', location: 'Melbourne, Australia' },
      { pattern: 'adelaide', location: 'Adelaide, Australia' },
      { pattern: 'perth', location: 'Perth, Australia' },
      { pattern: 'brisbane', location: 'Brisbane, Australia' },
      { pattern: 'athens', location: 'Athens, Greece' },
      { pattern: 'lisbon', location: 'Lisbon, Portugal' },
      { pattern: 'barcelona', location: 'Barcelona, Spain' },
      { pattern: 'valencia', location: 'Valencia, Spain' },
      { pattern: 'seville', location: 'Seville, Spain' },
      { pattern: 'milan', location: 'Milan, Italy' },
      { pattern: 'naples', location: 'Naples, Italy' },
      { pattern: 'florence', location: 'Florence, Italy' },
      { pattern: 'venice', location: 'Venice, Italy' },
    ];
    
    for (const { pattern, location } of cityPatterns) {
      if (nameLower.includes(pattern)) {
        return location;
      }
    }
    
    return null;
  };

  const getDateRange = () => {
    // TournamentCore provides dates in nested structure
    const startDate = tournament.dates?.startDate;
    const endDate = tournament.dates?.endDate;
    
    if (startDate && endDate) {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      // If same date, show just one date
      if (startDate === endDate) {
        return formatDate(startDate);
      }
      
      // If same year, format as "03 Aug - 06 Aug 2025"
      if (startDateObj.getFullYear() === endDateObj.getFullYear()) {
        const startFormatted = formatDate(startDate, false); // No year
        const endFormatted = formatDate(endDate, true);      // With year
        return `${startFormatted} - ${endFormatted}`;
      } 
      // Different years, show both years
      else {
        const startFormatted = formatDate(startDate, true);
        const endFormatted = formatDate(endDate, true);
        return `${startFormatted} - ${endFormatted}`;
      }
    }
    return formatDate(startDate) || formatDate(endDate) || 'Dates TBA';
  };

  // Get gender badge like in MatchCard
  const getGenderBadge = () => {
    const gender = tournament.gender;
    if (!gender) return null;
    
    let genderText = '';
    let genderStyle = styles.mixedSymbol;
    
    if (gender === 'M') {
      genderText = 'M';
      genderStyle = styles.menSymbol;
    } else if (gender === 'W') {
      genderText = 'W';
      genderStyle = styles.womenSymbol;
    } else {
      genderText = 'M+W'; // Mixed gender
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

  // Get status badge based on exact date logic: SCHEDULED, LIVE NOW, COMPLETED
  const getStatusBadge = () => {
    const startDate = tournament.dates?.startDate;
    const endDate = tournament.dates?.endDate;
    
    if (!startDate || !endDate) {
      return (
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>SCHEDULED</Text>
        </View>
      );
    }
    
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // If start date is after today = SCHEDULED
    if (start > now) {
      return (
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>SCHEDULED</Text>
        </View>
      );
    }
    
    // If start less than today and end after today = LIVE  
    if (start <= now && end >= now) {
      return (
        <View style={[styles.statusBadge, styles.liveBadgeStyle]}>
          <View style={styles.liveIndicatorPulse} />
          <Text style={[styles.statusText, styles.liveStatusText]}>LIVE</Text>
        </View>
      );
    }
    
    // If end is less than today = COMPLETED
    return (
      <View style={[styles.statusBadge, styles.completedBadgeStyle]}>
        <Text style={[styles.statusText, styles.completedStatusText]}>COMPLETED</Text>
      </View>
    );
  };

  const getTournamentName = () => {
    // VIS API provides Name field
    return tournament.name || `Tournament ${tournament.visNo || tournament.No}`;
  };

  return (
    <TouchableOpacity 
      style={styles.tournamentItem} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={styles.tournamentHeader}>
        <View style={styles.tournamentHeaderLeft}>
          {getGenderBadge()}
        </View>
        <View style={styles.tournamentHeaderRight}>
          {getStatusBadge()}
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
          {getTournamentName()}
        </Text>
      </View>
      
      
      <View style={styles.dateRow}>
        <Text style={styles.dateIcon}>📅</Text>
        <Text style={styles.tournamentDate}>{getDateRange()}</Text>
      </View>

    </TouchableOpacity>
  );
};

interface VisTournamentListProps {
  tournaments: TournamentCore[];
  onTournamentPress: (tournament: TournamentCore) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

/**
 * Tournament list component optimized for VIS API data
 * Designed to display tournaments from FIVB VIS API with correct field mapping
 */
const VisTournamentList: React.FC<VisTournamentListProps> = ({ 
  tournaments, 
  onTournamentPress, 
  loading = false,
  error = null,
  onRetry 
}) => {

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading tournaments...</Text>
        <Text style={styles.loadingSubtext}>Fetching data from VIS API</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error Loading Tournaments</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        {onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (tournaments.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No Tournaments Found</Text>
        <Text style={styles.emptySubtext}>
          No tournaments available for the selected criteria.
        </Text>
        {onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Refresh</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const renderTournament = ({ item }: { item: TournamentCore }) => (
    <VisTournamentItem 
      tournament={item} 
      onPress={() => onTournamentPress(item)}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.listContainer}>
        {tournaments.map((tournament, index) => (
          <VisTournamentItem 
            key={tournament.visNo || tournament.No || tournament.code || index.toString()}
            tournament={tournament} 
            onPress={() => onTournamentPress(tournament)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 32,
  },
  list: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  tournamentItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    boxShadow: '0px 2px 4px rgba(27, 54, 93, 0.08)',
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tournamentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tournamentHeaderRight: {
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: '#10B981',
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
  completedBadgeStyle: {
    backgroundColor: '#F3F4F6', // Light gray background
    borderWidth: 1,
    borderColor: designTokens.neutrals.textSecondary, // Gray border
  },
  completedStatusText: {
    fontSize: 10,
    letterSpacing: 0.5,
    color: designTokens.neutrals.textSecondary, // Gray text
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    lineHeight: 24,
    flex: 1,
    marginLeft: 8,
  },
  tournamentFlag: {
    marginRight: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  tournamentLocation: {
    fontSize: 14,
    color: '#4A90A4',
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  tournamentDate: {
    fontSize: 14,
    color: designTokens.neutrals.textSecondary,
    flex: 1,
  },
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  genderIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  genderText: {
    fontSize: 13,
    color: designTokens.neutrals.textSecondary,
    fontWeight: '500',
  },
  // Gender badge styles (like in MatchCard)
  genderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 32,
    alignItems: 'center',
  },
  genderSymbol: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  menSymbol: {
    color: designTokens.linkTokens.default, // Blue for men
  },
  womenSymbol: {
    color: '#DC2626', // Red for women
  },
  mixedSymbol: {
    color: '#8B5CF6', // Purple for mixed
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  categoryIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 13,
    color: designTokens.neutrals.textSecondary,
    fontWeight: '500',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 16,
    color: '#4A90A4',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: designTokens.neutrals.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
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
});

export default VisTournamentList;
