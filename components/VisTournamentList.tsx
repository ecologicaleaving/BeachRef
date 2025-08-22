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
    
    if (city && country) {
      return `${city}, ${country}`;
    }
    return city || country || tournament.location || 'Location TBA';
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

  const getTournamentCode = () => {
    // VIS API provides Code field
    return tournament.code || `T${tournament.visNo || tournament.No}`;
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
          <Text style={styles.tournamentCode}>{getTournamentCode()}</Text>
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

      {/* Show gender if available */}
      {tournament.gender && (
        <View style={styles.genderRow}>
          <Text style={styles.genderIcon}>👥</Text>
          <Text style={styles.genderText}>
            {tournament.gender === 'M' ? 'Men' : tournament.gender === 'W' ? 'Women' : tournament.gender}
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
  tournamentCode: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
    backgroundColor: '#F3F4F6',
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