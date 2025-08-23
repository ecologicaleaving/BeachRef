import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { BeachMatch } from '../../types/match';

interface RefereeFromDB {
  No: string;
  Name: string;
  FederationCode?: string;
  Level?: string;
  isSelected?: boolean;
}

interface MatchCardProps {
  match: BeachMatch;
  selectedReferee?: RefereeFromDB | null;
  showGenderStrip?: boolean;
}

export const MatchCard: React.FC<MatchCardProps> = ({ 
  match, 
  selectedReferee, 
  showGenderStrip = true 
}) => {
  // Helper function to convert federation/country codes to flag URL codes
  const getFlagCode = (code?: string): string | null => {
    if (!code) return null;
    
    const upperCode = code.toUpperCase();
    
    // Special cases for UK nations (use 3-letter codes)
    const specialCases = ['ENG', 'NIR', 'SCO', 'WAL'];
    if (specialCases.includes(upperCode)) {
      return upperCode;
    }
    
    // Common federation to ISO country code mappings
    const federationToCountry: { [key: string]: string } = {
      'AUS': 'AU',  // Australia
      'USA': 'US',  // United States
      'GER': 'DE',  // Germany
      'ITA': 'IT',  // Italy
      'FRA': 'FR',  // France
      'ESP': 'ES',  // Spain
      'BRA': 'BR',  // Brazil
      'ARG': 'AR',  // Argentina
      'CAN': 'CA',  // Canada
      'MEX': 'MX',  // Mexico
      'JPN': 'JP',  // Japan
      'CHN': 'CN',  // China
      'POL': 'PL',  // Poland
      'NED': 'NL',  // Netherlands
      'BEL': 'BE',  // Belgium
      'SUI': 'CH',  // Switzerland
      'AUT': 'AT',  // Austria
      'CZE': 'CZ',  // Czech Republic
      'SVK': 'SK',  // Slovakia
      'HUN': 'HU',  // Hungary
      'ROU': 'RO',  // Romania
      'BUL': 'BG',  // Bulgaria
      'CRO': 'HR',  // Croatia
      'SRB': 'RS',  // Serbia
      'SLO': 'SI',  // Slovenia
      'GRE': 'GR',  // Greece
      'TUR': 'TR',  // Turkey
      'RUS': 'RU',  // Russia
      'UKR': 'UA',  // Ukraine
      'BLR': 'BY',  // Belarus
      'LTU': 'LT',  // Lithuania
      'LAT': 'LV',  // Latvia
      'EST': 'EE',  // Estonia
      'FIN': 'FI',  // Finland
      'SWE': 'SE',  // Sweden
      'NOR': 'NO',  // Norway
      'DEN': 'DK',  // Denmark
      'ISL': 'IS',  // Iceland
    };
    
    // If it's a 3-letter federation code, convert to 2-letter country code
    if (upperCode.length === 3 && federationToCountry[upperCode]) {
      return federationToCountry[upperCode];
    }
    
    // If it's already a 2-letter code, use as is
    if (upperCode.length === 2) {
      return upperCode;
    }
    
    // Default fallback
    return upperCode;
  };

  // Helper function to render country flag and code
  const renderCountryFlag = (countryCode?: string) => {
    if (!countryCode) return null;
    
    const flagCode = getFlagCode(countryCode);
    if (!flagCode) return null;
    
    const flagUrl = `https://www.fivb.org/Vis2009/Images/Flags/Small/${flagCode}.png`;
    
    return (
      <View style={styles.countryContainer}>
        <Image 
          source={{ uri: flagUrl }}
          style={styles.countryFlag}
          resizeMode="contain"
        />
        <Text style={styles.countryCode}>({countryCode})</Text>
      </View>
    );
  };
  const scoreA = parseInt(match.MatchPointsA || '0');
  const scoreB = parseInt(match.MatchPointsB || '0');
  const teamAWon = scoreA > scoreB;
  const teamBWon = scoreB > scoreA;

  const formatTime = (time?: string) => {
    if (!time) return 'TBD';
    return time;
  };

  const formatDate = (date?: string) => {
    if (!date) return 'TBD';
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return date;
    }
  };

  return (
    <View style={styles.matchCard}>
      {/* Gender Strip */}
      {showGenderStrip && match.tournamentGender && (
        <View style={[
          styles.genderStrip,
          match.tournamentGender === 'M' ? styles.menStrip : styles.womenStrip
        ]} />
      )}
      
      <View style={styles.matchHeader}>
        <View style={styles.matchInfo}>
          <View style={styles.matchNumberContainer}>
            <Text style={styles.matchNumber}>#{match.NoInTournament || match.No}</Text>
            {match.tournamentGender && (
              <Text style={[
                styles.genderSymbol,
                match.tournamentGender === 'M' ? styles.menSymbol : styles.womenSymbol
              ]}>
                {match.tournamentGender === 'M' ? '♂' : '♀'}
              </Text>
            )}
          </View>
          <Text style={styles.courtInfo}>
            {match.Court ? `C${match.Court}` : 'Court TBD'}
          </Text>
        </View>
        <View style={styles.timeInfo}>
          <Text style={styles.timeText}>{formatTime(match.LocalTime)}</Text>
          <Text style={styles.dateText}>{formatDate(match.LocalDate)}</Text>
        </View>
      </View>

      {/* Teams */}
      <View style={styles.teamsContainer}>
        <View style={[styles.teamRow, teamAWon && styles.winnerTeam]}>
          <View style={styles.teamNameContainer}>
            <Text style={[styles.teamName, teamAWon && styles.winnerText]}>
              {match.TeamAName || 'Team A'}
            </Text>
            {renderCountryFlag(match.TeamACountryCode)}
          </View>
          <Text style={[styles.teamScore, teamAWon && styles.winnerText]}>
            {match.MatchPointsA || '0'}
          </Text>
        </View>
        
        <Text style={styles.vsText}>vs</Text>
        
        <View style={[styles.teamRow, teamBWon && styles.winnerTeam]}>
          <View style={styles.teamNameContainer}>
            <Text style={[styles.teamName, teamBWon && styles.winnerText]}>
              {match.TeamBName || 'Team B'}
            </Text>
            {renderCountryFlag(match.TeamBCountryCode)}
          </View>
          <Text style={[styles.teamScore, teamBWon && styles.winnerText]}>
            {match.MatchPointsB || '0'}
          </Text>
        </View>
      </View>

      {/* Status */}
      {match.Status && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{match.Status}</Text>
        </View>
      )}

      {/* Referees Section */}
      {(match.Referee1Name || match.Referee2Name) && (
        <View style={styles.refereesSection}>
          {match.Referee1Name && (
            <View style={styles.refereeRow}>
              <Text style={selectedReferee?.Name === match.Referee1Name ? styles.selectedRefereeHighlight : styles.refereeText}>
                1° {match.Referee1Name}
              </Text>
              {renderCountryFlag(match.Referee1FederationCode)}
            </View>
          )}
          {match.Referee2Name && (
            <View style={styles.refereeRow}>
              <Text style={selectedReferee?.Name === match.Referee2Name ? styles.selectedRefereeHighlight : styles.refereeText}>
                2° {match.Referee2Name}
              </Text>
              {renderCountryFlag(match.Referee2FederationCode)}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#1B365D',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  genderStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  menStrip: {
    backgroundColor: '#87CEEB', // Sky blue for men
  },
  womenStrip: {
    backgroundColor: '#FFB6C1', // Light pink for women
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    marginTop: 4,
  },
  matchInfo: {
    flex: 1,
  },
  matchNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  matchNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B365D',
    marginRight: 6,
  },
  genderSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  menSymbol: {
    color: '#2563EB', // Blue for men
  },
  womenSymbol: {
    color: '#DC2626', // Red for women
  },
  courtInfo: {
    fontSize: 14,
    color: '#6B7280',
  },
  timeInfo: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 14,
    color: '#6B7280',
  },
  teamsContainer: {
    marginBottom: 12,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  winnerTeam: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#0EA5E9',
  },
  teamNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1B365D',
  },
  countryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countryFlag: {
    width: 16,
    height: 11,
  },
  countryCode: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  teamScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    minWidth: 30,
    textAlign: 'right',
  },
  winnerText: {
    color: '#0EA5E9',
  },
  vsText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginVertical: 4,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  refereesSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    gap: 4,
  },
  refereeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  refereeText: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 2,
  },
  selectedRefereeHighlight: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 2,
  },
});