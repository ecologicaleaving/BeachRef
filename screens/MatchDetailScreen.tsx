import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MatchResultsService } from '../services/MatchResultsService';
import { MatchResult } from '../types/MatchResults';
import { formatTime, formatDateLong } from '../utils/dateFormatters';

export default function MatchDetailScreen() {
  const router = useRouter();
  const { matchNo, tournamentNo } = useLocalSearchParams<{
    matchNo: string;
    tournamentNo: string;
  }>();

  const [match, setMatch] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMatchDetail();
  }, [matchNo, tournamentNo]);

  const loadMatchDetail = async () => {
    if (!matchNo || !tournamentNo) {
      setError('Invalid match parameters');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get all matches and find the specific one
      const results = await MatchResultsService.getMatchResults(tournamentNo, true);
      const allMatches = [...results.live, ...results.completed, ...results.scheduled];
      const matchDetail = allMatches.find(m => m.no === matchNo);

      if (matchDetail) {
        setMatch(matchDetail);
      } else {
        setError('Match not found');
      }
    } catch (error) {
      // console.error('Failed to load match detail:', error);
      setError('Failed to load match details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadMatchDetail();
  };

  const handleGoBack = () => {
    router.back();
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Running':
        return { ...styles.statusBadge, backgroundColor: '#10B981' };
      case 'Finished':
        return { ...styles.statusBadge, backgroundColor: '#6B7280' };
      case 'Scheduled':
        return { ...styles.statusBadge, backgroundColor: '#3B82F6' };
      case 'Cancelled':
        return { ...styles.statusBadge, backgroundColor: '#EF4444' };
      default:
        return { ...styles.statusBadge, backgroundColor: '#6B7280' };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Running':
        return 'LIVE';
      case 'Finished':
        return 'FINAL';
      case 'Scheduled':
        return 'SCHEDULED';
      case 'Cancelled':
        return 'CANCELLED';
      default:
        return status.toUpperCase();
    }
  };

  const renderSetScore = (setNumber: number) => {
    if (!match) return null;

    let teamAPoints = 0;
    let teamBPoints = 0;

    switch (setNumber) {
      case 1:
        teamAPoints = match.pointsTeamASet1;
        teamBPoints = match.pointsTeamBSet1;
        break;
      case 2:
        teamAPoints = match.pointsTeamASet2;
        teamBPoints = match.pointsTeamBSet2;
        break;
      case 3:
        teamAPoints = match.pointsTeamASet3;
        teamBPoints = match.pointsTeamBSet3;
        break;
    }

    // Don't render if set wasn't played
    if (teamAPoints === 0 && teamBPoints === 0 && setNumber > 1) {
      return null;
    }

    const teamAWon = teamAPoints > teamBPoints && (teamAPoints >= 21 || teamBPoints >= 21);
    const teamBWon = teamBPoints > teamAPoints && (teamBPoints >= 21 || teamAPoints >= 21);

    return (
      <View key={setNumber} style={styles.setScoreContainer}>
        <Text style={styles.setLabel}>Set {setNumber}</Text>
        <View style={styles.setScoreRow}>
          <View style={[styles.setScore, teamAWon && styles.winningScore]}>
            <Text style={[styles.setScoreText, teamAWon && styles.winningScoreText]}>
              {teamAPoints}
            </Text>
          </View>
          <Text style={styles.setScoreDivider}>-</Text>
          <View style={[styles.setScore, teamBWon && styles.winningScore]}>
            <Text style={[styles.setScoreText, teamBWon && styles.winningScoreText]}>
              {teamBPoints}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Match Details</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading match details...</Text>
        </View>
      </View>
    );
  }

  if (error || !match) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Match Details</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Text style={styles.refreshButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubtext}>Please try again</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Match Details</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View style={getStatusBadgeStyle(match.status)}>
            <Text style={styles.statusText}>{getStatusText(match.status)}</Text>
          </View>
        </View>

        {/* Teams */}
        <View style={styles.teamsContainer}>
          <View style={styles.teamSection}>
            <Text style={styles.teamName}>{match.teamAName}</Text>
            <Text style={styles.matchPoints}>{match.matchPointsA}</Text>
          </View>
          
          <Text style={styles.vsText}>vs</Text>
          
          <View style={styles.teamSection}>
            <Text style={styles.teamName}>{match.teamBName}</Text>
            <Text style={styles.matchPoints}>{match.matchPointsB}</Text>
          </View>
        </View>

        {/* Set by Set Scores */}
        <View style={styles.setsContainer}>
          <Text style={styles.sectionTitle}>Set by Set Scores</Text>
          <View style={styles.setsGrid}>
            {[1, 2, 3].map(setNum => renderSetScore(setNum))}
          </View>
        </View>

        {/* Match Information */}
        <View style={styles.matchInfoContainer}>
          <Text style={styles.sectionTitle}>Match Information</Text>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{formatDateLong(match.localDate)}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Time</Text>
              <Text style={styles.infoValue}>{formatTime(match.localDate, match.localTime)}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Court</Text>
              <Text style={styles.infoValue}>{match.court}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Round</Text>
              <Text style={styles.infoValue}>{match.round}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Match Number</Text>
              <Text style={styles.infoValue}>{match.no}</Text>
            </View>
          </View>
        </View>

        {/* Set Durations (if available) */}
        {(match.durationSet1 || match.durationSet2 || match.durationSet3) && (
          <View style={styles.durationContainer}>
            <Text style={styles.sectionTitle}>Set Durations</Text>
            <View style={styles.durationGrid}>
              {match.durationSet1 && (
                <View style={styles.durationItem}>
                  <Text style={styles.durationLabel}>Set 1</Text>
                  <Text style={styles.durationValue}>{match.durationSet1}</Text>
                </View>
              )}
              {match.durationSet2 && (
                <View style={styles.durationItem}>
                  <Text style={styles.durationLabel}>Set 2</Text>
                  <Text style={styles.durationValue}>{match.durationSet2}</Text>
                </View>
              )}
              {match.durationSet3 && (
                <View style={styles.durationItem}>
                  <Text style={styles.durationLabel}>Set 3</Text>
                  <Text style={styles.durationValue}>{match.durationSet3}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  refreshButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#10B981',
    minHeight: 44,
    justifyContent: 'center',
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  teamsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  teamSection: {
    alignItems: 'center',
    flex: 1,
  },
  teamName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  matchPoints: {
    fontSize: 36,
    fontWeight: '800',
    color: '#10B981',
  },
  vsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  setsContainer: {
    backgroundColor: '#FFFFFF',
    marginVertical: 8,
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  setsGrid: {
    gap: 12,
  },
  setScoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  setLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    width: 60,
  },
  setScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  setScore: {
    width: 50,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  winningScore: {
    backgroundColor: '#10B981',
  },
  setScoreText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  winningScoreText: {
    color: '#FFFFFF',
  },
  setScoreDivider: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280',
    marginHorizontal: 12,
  },
  matchInfoContainer: {
    backgroundColor: '#FFFFFF',
    marginVertical: 8,
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  durationContainer: {
    backgroundColor: '#FFFFFF',
    marginVertical: 8,
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  durationGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  durationItem: {
    alignItems: 'center',
    flex: 1,
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  durationValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
});