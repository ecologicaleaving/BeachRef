import React from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { TournamentCore } from '../types/tournament-v2';

interface VisTournamentItemProps {
  tournament: TournamentCore;
  onPress: () => void;
}

/**
 * Tournament item component optimized for VIS API data structure
 * Handles the actual fields returned by FIVB VIS API
 */
const VisTournamentItem: React.FC<VisTournamentItemProps> = ({ tournament, onPress }) => {
  // console.log('🏐 VisTournamentItem rendering tournament:', tournament.name || tournament.No);
  
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
    if (!city && !country && !location && !venue) {
      const inferredLocation = inferLocationFromName(tournament.name || tournament.title);
      if (inferredLocation) return inferredLocation;
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
      const start = formatDate(startDate);
      const end = formatDate(endDate);
      if (start === end) return start;
      return `${start} - ${end}`;
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
          <Text style={styles.tournamentNumber}>#{tournament.visNo || tournament.No}</Text>
          {getGenderBadge()}
        </View>
        <View style={styles.tournamentHeaderRight}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>ACTIVE</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.tournamentName}>
        {getTournamentName()}
      </Text>
      
      <View style={styles.locationRow}>
        <Text style={styles.locationIcon}>📍</Text>
        <Text style={styles.tournamentLocation}>{getLocation()}</Text>
      </View>
      
      <View style={styles.dateRow}>
        <Text style={styles.dateIcon}>📅</Text>
        <Text style={styles.tournamentDate}>{getDateRange()}</Text>
      </View>

      {/* Tournament type/category if available */}
      {tournament.tournamentType && (
        <View style={styles.categoryRow}>
          <Text style={styles.categoryIcon}>🏆</Text>
          <Text style={styles.categoryText}>
            {tournament.tournamentType}
          </Text>
        </View>
      )}
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
  // console.log('🏐 VisTournamentList rendering with', tournaments.length, 'tournaments');

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
      <FlatList
        data={tournaments}
        renderItem={renderTournament}
        keyExtractor={(item) => (item.visNo || item.No || item.code || '').toString()}
        style={styles.list}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={true}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={10}
      />
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
  tournamentNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1B365D',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
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
  tournamentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 8,
    lineHeight: 24,
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
    color: '#6B7280',
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
    color: '#6B7280',
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
    color: '#2563EB', // Blue for men
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
    color: '#6B7280',
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
    color: '#6B7280',
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