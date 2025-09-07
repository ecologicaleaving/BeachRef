import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { TournamentCore } from '../../../types/tournament-v2';
import { FlagImage } from '../../FlagImage';
import { StatusBadge } from '../../Status';
import { DefaultTournamentService } from '../../../services/DefaultTournamentService';
import { getStatusColorWithText, determineTournamentStatus } from '../../../utils/statusColors';
import { colors } from '../../../theme/tokens';

export interface TournamentCardProps {
  tournament: TournamentCore;
  onPress: () => void;
  showDefaultToggle?: boolean;
  showStatusBadge?: boolean;
  compact?: boolean;
}

/**
 * Unified Tournament Card Component
 * Combines features from VisTournamentItem, TournamentCard, and other tournament displays
 */
export const TournamentCard: React.FC<TournamentCardProps> = ({ 
  tournament, 
  onPress,
  showDefaultToggle = false,
  showStatusBadge = true,
  compact = false
}) => {
  const [isDefault, setIsDefault] = useState(false);

  // Check if this tournament is default on mount
  useEffect(() => {
    if (showDefaultToggle) {
      const checkDefaultStatus = async () => {
        const defaultStatus = await DefaultTournamentService.isDefaultTournament(tournament.visNo);
        setIsDefault(defaultStatus);
      };
      checkDefaultStatus();
    }
  }, [tournament.visNo, showDefaultToggle]);

  // Format date display
  const formatDate = (dateStr?: string, includeYear = true) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const day = date.getDate().toString().padStart(2, '0');
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear();
      return includeYear ? `${day} ${month} ${year}` : `${day} ${month}`;
    } catch {
      return dateStr;
    }
  };

  // Get tournament status and colors
  const tournamentStatusText = DefaultTournamentService.getTournamentStatus(
    tournament.dates?.startDate, 
    tournament.dates?.endDate
  );
  const canBeDefault = tournamentStatusText === 'LIVE NOW';
  
  // Map status text to TournamentStatus type for StatusBadge
  const mapStatusToTournamentStatus = (status: string): 'current' | 'upcoming' | 'completed' | 'cancelled' | 'emergency' => {
    switch (status) {
      case 'LIVE NOW':
        return 'current';
      case 'COMPLETED':
        return 'completed';
      case 'SCHEDULED':
      default:
        return 'upcoming';
    }
  };
  
  const tournamentStatus = mapStatusToTournamentStatus(tournamentStatusText);

  // Handle default tournament toggle
  const handleToggleDefault = async (value: boolean) => {
    try {
      if (value) {
        await DefaultTournamentService.setDefaultTournament(tournament.visNo);
      } else {
        await DefaultTournamentService.clearDefaultTournament();
      }
      setIsDefault(value);
    } catch (error) {
      console.error('Error toggling default tournament:', error);
    }
  };

  // Format date range
  const getDateRange = () => {
    const startDate = tournament.dates?.startDate;
    const endDate = tournament.dates?.endDate;
    
    if (!startDate) return 'Dates TBD';
    
    if (startDate && endDate) {
      const start = formatDate(startDate, false);
      const end = formatDate(endDate, false);
      const year = new Date(startDate).getFullYear();
      return `${start} - ${end} ${year}`;
    }
    
    return formatDate(startDate);
  };

  return (
    <TouchableOpacity 
      style={[
        styles.card,
        compact && styles.cardCompact,
        isDefault && styles.cardDefault
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.countryInfo}>
          <FlagImage 
            countryCode={tournament.countryCode || ''} 
            style={styles.flag} 
          />
          <View style={styles.locationInfo}>
            <Text style={[styles.cityName, compact && styles.cityNameCompact]}>
              {tournament.city || 'City TBD'}
            </Text>
            <Text style={[styles.countryName, compact && styles.countryNameCompact]}>
              {tournament.countryName || tournament.countryCode || 'Country TBD'}
            </Text>
          </View>
        </View>
        
        {showStatusBadge && (
          <StatusBadge
            status={tournamentStatus}
            size="small"
            variant="solid"
            style={styles.statusBadge}
          />
        )}
      </View>

      <Text style={[styles.tournamentName, compact && styles.tournamentNameCompact]}>
        {tournament.name || `Tournament ${tournament.visNo}`}
      </Text>
      
      <Text style={[styles.dateRange, compact && styles.dateRangeCompact]}>
        {getDateRange()}
      </Text>

      {showDefaultToggle && canBeDefault && (
        <View style={styles.defaultToggle}>
          <Text style={styles.defaultToggleLabel}>Set as Default</Text>
          <Switch
            value={isDefault}
            onValueChange={handleToggleDefault}
            trackColor={{ false: '#767577', true: colors.accent }}
            thumbColor={isDefault ? '#fff' : '#f4f3f4'}
            style={styles.switch}
          />
        </View>
      )}

      {isDefault && (
        <View style={styles.defaultIndicator}>
          <Text style={styles.defaultIndicatorText}>★ Default Tournament</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardCompact: {
    padding: 16,
    marginVertical: 6,
  },
  cardDefault: {
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: '#FFF9F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  countryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    width: 40,
    height: 30,
    borderRadius: 6,
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 2,
  },
  cityNameCompact: {
    fontSize: 15,
  },
  countryName: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  countryNameCompact: {
    fontSize: 13,
  },
  statusBadge: {
    marginLeft: 12,
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 8,
    lineHeight: 24,
  },
  tournamentNameCompact: {
    fontSize: 16,
    marginBottom: 6,
  },
  dateRange: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  dateRangeCompact: {
    fontSize: 14,
  },
  defaultToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  defaultToggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1B365D',
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  defaultIndicator: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  defaultIndicatorText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.accent,
  },
});