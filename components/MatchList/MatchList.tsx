import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { BeachMatch } from '../../types/match';
import DateNavigator from '../DateNavigator/DateNavigator';

interface MatchListProps {
  matches: BeachMatch[];
  loading?: boolean;
  title?: string;
  selectedReferee?: { Name: string } | null;
  emptyMessage?: string;
  showDateNavigator?: boolean;
}

export const MatchList: React.FC<MatchListProps> = ({
  matches,
  loading = false,
  title = "Matches",
  selectedReferee,
  emptyMessage = "No matches found",
  showDateNavigator = true,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Get available dates from matches
  const getAvailableDates = () => {
    const allDates = matches.map(match => 
      match.Date || match.LocalDate || match.MatchDate || match.StartDate
    ).filter(Boolean);
    return [...new Set(allDates)].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  };

  // Auto-select most recent date when matches change
  useEffect(() => {
    const dates = getAvailableDates();
    if (dates.length > 0 && !selectedDate) {
      const defaultDate = dates[dates.length - 1]; // Most recent
      console.log('🗓️ MatchList - Setting default to most recent date:', defaultDate);
      setSelectedDate(defaultDate);
    }
  }, [matches]);

  // Get matches for selected date
  const getMatchesForSelectedDate = () => {
    if (!selectedDate) return matches.slice(0, 10);
    
    return matches.filter(match => {
      const matchDate = match.Date || match.LocalDate || match.MatchDate || match.StartDate;
      return matchDate === selectedDate;
    }).sort((a, b) => {
      const timeA = a.LocalTime || a.Time || '00:00';
      const timeB = b.LocalTime || b.Time || '00:00';
      
      const getTimeNumber = (timeStr: string) => {
        const parts = timeStr.split(':');
        if (parts.length !== 2) return 0;
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        return hours * 60 + minutes;
      };
      
      return getTimeNumber(timeA) - getTimeNumber(timeB);
    });
  };

  // Format date for display
  const formatMatchDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'Unknown Date') return dateStr;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Handle date change
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
  };

  // Render match card
  const renderMatchCard = (match: BeachMatch, index: number) => {
    const teamAScore = parseInt(match.MatchPointsA || '0');
    const teamBScore = parseInt(match.MatchPointsB || '0');
    const teamAWon = teamAScore > teamBScore && teamAScore > 0;
    const teamBWon = teamBScore > teamAScore && teamBScore > 0;

    return (
      <View key={match.No || index} style={styles.matchCard}>
        {/* Gender Badge */}
        {match.tournamentGender && (
          <View style={[
            styles.genderBadge,
            match.tournamentGender === 'M' ? styles.menBadge : styles.womenBadge
          ]}>
            <Text style={[
              styles.genderText,
              match.tournamentGender === 'M' ? styles.menText : styles.womenText
            ]}>
              {match.tournamentGender}
            </Text>
          </View>
        )}
        
        {/* Top Info */}
        <View style={styles.matchTopInfo}>
          <View style={styles.leftTopInfo}>
            {match.Court && (
              <Text style={styles.courtInfoTop}>
                Court {match.Court}
              </Text>
            )}
            {match.LocalTime && (
              <Text style={styles.timeInfoTop}>
                {match.LocalTime.substring(0, 5)}
              </Text>
            )}
          </View>
          {match.Round && match.Round.trim() !== '' && (
            <Text style={styles.roundInfoTop}>
              {match.Round}
            </Text>
          )}
        </View>
        
        {/* Teams Section */}
        <View style={styles.matchHeader}>
          <View style={styles.teamsColumn}>
            <Text 
              style={[
                styles.teamName, 
                teamAWon && styles.winnerTeamName
              ]} 
              numberOfLines={2}
            >
              {match.TeamAName || 'Team A'}
            </Text>
            <Text 
              style={[
                styles.teamName, 
                teamBWon && styles.winnerTeamName
              ]} 
              numberOfLines={2}
            >
              {match.TeamBName || 'Team B'}
            </Text>
          </View>
          
          <View style={styles.scoreColumn}>
            <View style={styles.matchScore}>
              <Text 
                style={[
                  styles.scoreText,
                  teamAWon && styles.winnerScoreText
                ]}
              >
                {match.MatchPointsA || '0'}
              </Text>
              <Text 
                style={[
                  styles.scoreText,
                  teamBWon && styles.winnerScoreText
                ]}
              >
                {match.MatchPointsB || '0'}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Referees Section */}
        {(match.Referee1Name || match.Referee2Name) && (
          <View style={styles.refereesSection}>
            {match.Referee1Name && (
              <Text style={[
                styles.refereeText,
                selectedReferee?.Name === match.Referee1Name && styles.highlightedReferee
              ]}>
                1° {match.Referee1Name}
                {match.Referee1FederationCode && ` (${match.Referee1FederationCode})`}
              </Text>
            )}
            {match.Referee2Name && (
              <Text style={[
                styles.refereeText,
                selectedReferee?.Name === match.Referee2Name && styles.highlightedReferee
              ]}>
                2° {match.Referee2Name}
                {match.Referee2FederationCode && ` (${match.Referee2FederationCode})`}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const availableDates = getAvailableDates();
  const displayMatches = getMatchesForSelectedDate();

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>
        {title} {selectedDate ? `(${formatMatchDate(selectedDate)})` : ''}
      </Text>
      
      {/* Date Navigator */}
      {showDateNavigator && matches.length > 0 && availableDates.length > 1 && (
        <DateNavigator
          availableDates={availableDates}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          formatDate={formatMatchDate}
          getMatchCount={(date) => {
            const matchesForDate = matches.filter(match => {
              const matchDate = match.Date || match.LocalDate || match.MatchDate || match.StartDate;
              return matchDate === date;
            });
            return matchesForDate.length;
          }}
        />
      )}

      {/* Matches List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#4A90A4" />
          <Text style={styles.loadingText}>Loading matches...</Text>
        </View>
      ) : displayMatches.length > 0 ? (
        <View style={styles.matchesList}>
          {displayMatches.map((match, index) => renderMatchCard(match, index))}
        </View>
      ) : (
        <Text style={styles.noMatchesText}>{emptyMessage}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4A90A4',
  },
  matchesList: {
    gap: 12,
  },
  noMatchesText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    paddingVertical: 20,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  genderBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  menBadge: {
    backgroundColor: '#000000',
  },
  womenBadge: {
    backgroundColor: '#000000',
  },
  genderText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  menText: {
    color: '#FFFFFF',
  },
  womenText: {
    color: '#FFFFFF',
  },
  matchTopInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leftTopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  courtInfoTop: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  timeInfoTop: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  roundInfoTop: {
    fontSize: 11,
    color: '#FF6B35',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  matchHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  teamsColumn: {
    flex: 2,
    paddingRight: 16,
    justifyContent: 'space-around',
    minHeight: 50,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1B365D',
    marginBottom: 6,
    lineHeight: 18,
    paddingVertical: 2,
  },
  winnerTeamName: {
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  scoreColumn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchScore: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
    minWidth: 24,
    textAlign: 'center',
    marginVertical: 2,
  },
  winnerScoreText: {
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  refereesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  refereeText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
    marginBottom: 2,
  },
  highlightedReferee: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    color: '#92400E',
    fontWeight: 'bold',
  },
});

export default MatchList;