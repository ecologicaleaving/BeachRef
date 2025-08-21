import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
            {match.Court ? `Court ${match.Court}` : 'Court TBD'}
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
          <Text style={[styles.teamName, teamAWon && styles.winnerText]}>
            {match.TeamAName || 'Team A'}
          </Text>
          <Text style={[styles.teamScore, teamAWon && styles.winnerText]}>
            {match.MatchPointsA || '0'}
          </Text>
        </View>
        
        <Text style={styles.vsText}>vs</Text>
        
        <View style={[styles.teamRow, teamBWon && styles.winnerTeam]}>
          <Text style={[styles.teamName, teamBWon && styles.winnerText]}>
            {match.TeamBName || 'Team B'}
          </Text>
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
            <Text style={selectedReferee?.Name === match.Referee1Name ? styles.selectedRefereeHighlight : styles.refereeText}>
              1° {match.Referee1Name}
              {match.Referee1FederationCode && ` (${match.Referee1FederationCode})`}
            </Text>
          )}
          {match.Referee2Name && (
            <Text style={selectedReferee?.Name === match.Referee2Name ? styles.selectedRefereeHighlight : styles.refereeText}>
              2° {match.Referee2Name}
              {match.Referee2FederationCode && ` (${match.Referee2FederationCode})`}
            </Text>
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
  teamName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1B365D',
    flex: 1,
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