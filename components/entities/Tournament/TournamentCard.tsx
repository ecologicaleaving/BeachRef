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

  // Format gender badge text
  const getGenderBadgeText = (gender: string) => {
    switch (gender) {
      case 'M':
        return 'M';
      case 'W':
        return 'W';
      case 'MIXED':
        return 'M + W';
      default:
        return gender;
    }
  };

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

  // Convert 2-letter country code to 3-letter format
  const getThreeLetterCountryCode = (countryCode?: string): string | null => {
    if (!countryCode || countryCode.length !== 2) return null;
    
    // Common country code mappings (2-letter to 3-letter ISO codes)
    const countryCodeMap: { [key: string]: string } = {
      'AD': 'AND', 'AE': 'ARE', 'AF': 'AFG', 'AG': 'ATG', 'AI': 'AIA',
      'AL': 'ALB', 'AM': 'ARM', 'AO': 'AGO', 'AQ': 'ATA', 'AR': 'ARG',
      'AS': 'ASM', 'AT': 'AUT', 'AU': 'AUS', 'AW': 'ABW', 'AX': 'ALA',
      'AZ': 'AZE', 'BA': 'BIH', 'BB': 'BRB', 'BD': 'BGD', 'BE': 'BEL',
      'BF': 'BFA', 'BG': 'BGR', 'BH': 'BHR', 'BI': 'BDI', 'BJ': 'BEN',
      'BL': 'BLM', 'BM': 'BMU', 'BN': 'BRN', 'BO': 'BOL', 'BQ': 'BES',
      'BR': 'BRA', 'BS': 'BHS', 'BT': 'BTN', 'BV': 'BVT', 'BW': 'BWA',
      'BY': 'BLR', 'BZ': 'BLZ', 'CA': 'CAN', 'CC': 'CCK', 'CD': 'COD',
      'CF': 'CAF', 'CG': 'COG', 'CH': 'CHE', 'CI': 'CIV', 'CK': 'COK',
      'CL': 'CHL', 'CM': 'CMR', 'CN': 'CHN', 'CO': 'COL', 'CR': 'CRI',
      'CU': 'CUB', 'CV': 'CPV', 'CW': 'CUW', 'CX': 'CXR', 'CY': 'CYP',
      'CZ': 'CZE', 'DE': 'DEU', 'DJ': 'DJI', 'DK': 'DNK', 'DM': 'DMA',
      'DO': 'DOM', 'DZ': 'DZA', 'EC': 'ECU', 'EE': 'EST', 'EG': 'EGY',
      'EH': 'ESH', 'ER': 'ERI', 'ES': 'ESP', 'ET': 'ETH', 'FI': 'FIN',
      'FJ': 'FJI', 'FK': 'FLK', 'FM': 'FSM', 'FO': 'FRO', 'FR': 'FRA',
      'GA': 'GAB', 'GB': 'GBR', 'GD': 'GRD', 'GE': 'GEO', 'GF': 'GUF',
      'GG': 'GGY', 'GH': 'GHA', 'GI': 'GIB', 'GL': 'GRL', 'GM': 'GMB',
      'GN': 'GIN', 'GP': 'GLP', 'GQ': 'GNQ', 'GR': 'GRC', 'GS': 'SGS',
      'GT': 'GTM', 'GU': 'GUM', 'GW': 'GNB', 'GY': 'GUY', 'HK': 'HKG',
      'HM': 'HMD', 'HN': 'HND', 'HR': 'HRV', 'HT': 'HTI', 'HU': 'HUN',
      'ID': 'IDN', 'IE': 'IRL', 'IL': 'ISR', 'IM': 'IMN', 'IN': 'IND',
      'IO': 'IOT', 'IQ': 'IRQ', 'IR': 'IRN', 'IS': 'ISL', 'IT': 'ITA',
      'JE': 'JEY', 'JM': 'JAM', 'JO': 'JOR', 'JP': 'JPN', 'KE': 'KEN',
      'KG': 'KGZ', 'KH': 'KHM', 'KI': 'KIR', 'KM': 'COM', 'KN': 'KNA',
      'KP': 'PRK', 'KR': 'KOR', 'KW': 'KWT', 'KY': 'CYM', 'KZ': 'KAZ',
      'LA': 'LAO', 'LB': 'LBN', 'LC': 'LCA', 'LI': 'LIE', 'LK': 'LKA',
      'LR': 'LBR', 'LS': 'LSO', 'LT': 'LTU', 'LU': 'LUX', 'LV': 'LVA',
      'LY': 'LBY', 'MA': 'MAR', 'MC': 'MCO', 'MD': 'MDA', 'ME': 'MNE',
      'MF': 'MAF', 'MG': 'MDG', 'MH': 'MHL', 'MK': 'MKD', 'ML': 'MLI',
      'MM': 'MMR', 'MN': 'MNG', 'MO': 'MAC', 'MP': 'MNP', 'MQ': 'MTQ',
      'MR': 'MRT', 'MS': 'MSR', 'MT': 'MLT', 'MU': 'MUS', 'MV': 'MDV',
      'MW': 'MWI', 'MX': 'MEX', 'MY': 'MYS', 'MZ': 'MOZ', 'NA': 'NAM',
      'NC': 'NCL', 'NE': 'NER', 'NF': 'NFK', 'NG': 'NGA', 'NI': 'NIC',
      'NL': 'NLD', 'NO': 'NOR', 'NP': 'NPL', 'NR': 'NRU', 'NU': 'NIU',
      'NZ': 'NZL', 'OM': 'OMN', 'PA': 'PAN', 'PE': 'PER', 'PF': 'PYF',
      'PG': 'PNG', 'PH': 'PHL', 'PK': 'PAK', 'PL': 'POL', 'PM': 'SPM',
      'PN': 'PCN', 'PR': 'PRI', 'PS': 'PSE', 'PT': 'PRT', 'PW': 'PLW',
      'PY': 'PRY', 'QA': 'QAT', 'RE': 'REU', 'RO': 'ROU', 'RS': 'SRB',
      'RU': 'RUS', 'RW': 'RWA', 'SA': 'SAU', 'SB': 'SLB', 'SC': 'SYC',
      'SD': 'SDN', 'SE': 'SWE', 'SG': 'SGP', 'SH': 'SHN', 'SI': 'SVN',
      'SJ': 'SJM', 'SK': 'SVK', 'SL': 'SLE', 'SM': 'SMR', 'SN': 'SEN',
      'SO': 'SOM', 'SR': 'SUR', 'SS': 'SSD', 'ST': 'STP', 'SV': 'SLV',
      'SX': 'SXM', 'SY': 'SYR', 'SZ': 'SWZ', 'TC': 'TCA', 'TD': 'TCD',
      'TF': 'ATF', 'TG': 'TGO', 'TH': 'THA', 'TJ': 'TJK', 'TK': 'TKL',
      'TL': 'TLS', 'TM': 'TKM', 'TN': 'TUN', 'TO': 'TON', 'TR': 'TUR',
      'TT': 'TTO', 'TV': 'TUV', 'TW': 'TWN', 'TZ': 'TZA', 'UA': 'UKR',
      'UG': 'UGA', 'UM': 'UMI', 'US': 'USA', 'UY': 'URY', 'UZ': 'UZB',
      'VA': 'VAT', 'VC': 'VCT', 'VE': 'VEN', 'VG': 'VGB', 'VI': 'VIR',
      'VN': 'VNM', 'VU': 'VUT', 'WF': 'WLF', 'WS': 'WSM', 'YE': 'YEM',
      'YT': 'MYT', 'ZA': 'ZAF', 'ZM': 'ZMB', 'ZW': 'ZWE'
    };
    
    return countryCodeMap[countryCode.toUpperCase()] || countryCode.toUpperCase();
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
        // Temporarily hidden: Default card styling
        // isDefault && styles.cardDefault
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
            <Text style={[styles.countryName, compact && styles.countryNameCompact]}>
              {tournament.countryName || 
               getThreeLetterCountryCode(tournament.countryCode) || 
               tournament.countryCode || 
               'Country TBD'}
            </Text>
          </View>
        </View>
        
        <View style={styles.badges}>
          {tournament.gender && (
            <View style={styles.genderBadge}>
              <Text style={styles.genderBadgeText}>
                {getGenderBadgeText(tournament.gender)}
              </Text>
            </View>
          )}
          {showStatusBadge && (
            <StatusBadge
              status={tournamentStatus}
              size="small"
              variant="solid"
              style={styles.statusBadge}
            />
          )}
        </View>
      </View>

      <Text style={[styles.tournamentName, compact && styles.tournamentNameCompact]}>
        {tournament.name || `Tournament ${tournament.visNo}`}
      </Text>
      
      <Text style={[styles.dateRange, compact && styles.dateRangeCompact]}>
        {getDateRange()}
      </Text>

      {/* Temporarily hidden: Default tournament functionality */}
      {false && showDefaultToggle && canBeDefault && (
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

      {false && isDefault && (
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
  countryName: {
    fontSize: 16,
    color: '#1B365D',
    fontWeight: 'bold',
  },
  countryNameCompact: {
    fontSize: 15,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  genderBadge: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 40,
    alignItems: 'center',
  },
  genderBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },
  statusBadge: {
    marginLeft: 0,
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