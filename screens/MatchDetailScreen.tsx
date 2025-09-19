import * as React from 'react';
import { useState, useEffect } from 'react';
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
import { BeachMatchCore, MatchStatus } from '../types/match-v2';
import { formatTime, formatDateLong, formatTimeWithTimezoneSync } from '../utils/dateFormatters';
import { FlagImage } from '../components/FlagImage';
import { RoundPhaseDisplay } from '../components/Typography/RoundPhaseDisplay';
import { LiveIndicator } from '../components/Status/LiveIndicator';
import { Card } from '../components/Foundation/Container';
import { colors, spacing, typography } from '../theme/tokens';
import { shadowPresets } from '../theme/shadows';

export default function MatchDetailScreen() {
  const router = useRouter();
  const {
    matchNo,
    tournamentNo,
    matchData // New parameter for direct BeachMatchCore data from MatchCard
  } = useLocalSearchParams<{
    matchNo: string;
    tournamentNo: string;
    matchData?: string; // JSON stringified BeachMatchCore
  }>();

  const [match, setMatch] = useState<MatchResult | BeachMatchCore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMatchDetail();
  }, [matchNo, tournamentNo]);

  const loadMatchDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      // First try to use direct match data from MatchCard navigation
      if (matchData) {
        try {
          const parsedMatch = JSON.parse(matchData) as BeachMatchCore;
          setMatch(parsedMatch);
          setLoading(false);
          return;
        } catch (parseError) {
          console.warn('Failed to parse matchData, falling back to API');
        }
      }

      // For demo purposes, create comprehensive mock data
      if (matchNo && tournamentNo) {
        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 800));

        const mockMatch: BeachMatchCore = {
          id: matchNo,
          matchCode: `M${matchNo}`,
          scheduledDateTime: '2024-01-20T14:30:00.000Z',
          court: {
            courtNumber: 'CC', // Center Court
            courtName: 'Center Court'
          },
          status: Math.random() > 0.5 ? MatchStatus.RUNNING : MatchStatus.FINISHED,
          round: 'Final',
          roundName: 'Gold Medal Match',
          team1: {
            teamName: 'Ana Gallay / Fernanda Pereyra',
            countryCode: 'ARG',
            players: [
              { firstName: 'Ana', lastName: 'Gallay', countryCode: 'ARG' },
              { firstName: 'Fernanda', lastName: 'Pereyra', countryCode: 'ARG' }
            ]
          },
          team2: {
            teamName: 'Melissa Humana-Paredes / Brandie Wilkerson',
            countryCode: 'CAN',
            players: [
              { firstName: 'Melissa', lastName: 'Humana-Paredes', countryCode: 'CAN' },
              { firstName: 'Brandie', lastName: 'Wilkerson', countryCode: 'CAN' }
            ]
          },
          result: {
            team1Sets: 2,
            team2Sets: 1,
            winner: 1,
            setScores: [21, 18, 21, 16, 15, 12], // Set 1: 21-18, Set 2: 21-16, Set 3: 15-12
            duration: 85 // minutes
          },
          refereeAssignments: [
            {
              refereeName: 'Marco Rossi',
              federationCode: 'ITA',
              function: '1st Referee',
              assignmentStatus: 'Confirmed'
            },
            {
              refereeName: 'Sarah Johnson',
              federationCode: 'USA',
              function: '2nd Referee',
              assignmentStatus: 'Confirmed'
            }
          ],
          actualStartTime: '2024-01-20T14:35:00.000Z',
          actualEndTime: '2024-01-20T16:00:00.000Z',
          // Extended mock data
          ...{
            tournamentGender: 'W',
            noInTournament: '23',
            utc_start: '2024-01-20T14:30:00.000Z',
            rawStatus: Math.random() > 0.5 ? 8 : 9, // 8 = Set3Finished, 9 = Closed
            phase: '3', // Final phase
            Phase: 'Medal',
            RoundPhase: '3',
            DurationSet1: '1860', // 31 minutes in seconds
            DurationSet2: '2220', // 37 minutes in seconds
            DurationSet3: '1020', // 17 minutes in seconds
            Duration: '5100', // Total duration in seconds (85 minutes)
            teamAPositionInMainDraw: '1',
            teamBPositionInMainDraw: '2',
            PointsTeamASet1: '21',
            PointsTeamBSet1: '18',
            PointsTeamASet2: '21',
            PointsTeamBSet2: '16',
            PointsTeamASet3: '15',
            PointsTeamBSet3: '12',
            Referee1Name: 'Marco Rossi',
            Referee1FederationCode: 'ITA',
            Referee2Name: 'Sarah Johnson',
            Referee2FederationCode: 'USA'
          }
        };

        setMatch(mockMatch);
      } else {
        setError('Invalid match parameters');
      }
    } catch (error) {
      console.error('Failed to load match detail:', error);
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

  // Helper function to determine if match is BeachMatchCore type
  const isBeachMatchCore = (match: MatchResult | BeachMatchCore): match is BeachMatchCore => {
    return 'team1' in match && 'team2' in match && 'court' in match;
  };

  // Helper function to check if match is live
  const isMatchLive = (match: MatchResult | BeachMatchCore): boolean => {
    if (isBeachMatchCore(match)) {
      // Don't consider matches with placeholder teams as live
      if (match.team1.teamName === 'TBD' || match.team2.teamName === 'TBD') {
        return false;
      }

      // Check for raw VIS numeric status codes 3-8 (LIVE matches)
      const rawStatus = (match as any)?.rawStatus;
      if (typeof rawStatus === 'number') {
        return rawStatus >= 3 && rawStatus <= 8;
      }

      // Fallback to mapped status
      return match.status === MatchStatus.RUNNING;
    } else {
      // MatchResult type
      return match.status === 'Running';
    }
  };

  // Get unified status text
  const getStatusText = (match: MatchResult | BeachMatchCore): string => {
    if (isBeachMatchCore(match)) {
      if (isMatchLive(match)) return 'LIVE';

      const rawStatus = (match as any)?.rawStatus;
      if (typeof rawStatus === 'number') {
        if (rawStatus >= 9) return 'FINAL';
        const statusText = {
          1: 'SCHEDULED',
          2: 'READY',
          3: 'IN SET 1',
          4: 'SET 1 DONE',
          5: 'IN SET 2',
          6: 'SET 2 DONE',
          7: 'IN SET 3',
          8: 'SET 3 DONE'
        }[rawStatus] || 'UNKNOWN';
        return statusText;
      }

      return match.status === MatchStatus.FINISHED ? 'FINAL' :
             match.status === MatchStatus.SCHEDULED ? 'SCHEDULED' : 'LIVE';
    } else {
      // MatchResult type
      switch (match.status) {
        case 'Running':
          return 'LIVE';
        case 'Finished':
          return 'FINAL';
        case 'Scheduled':
          return 'SCHEDULED';
        case 'Cancelled':
          return 'CANCELLED';
        default:
          return match.status.toUpperCase();
      }
    }
  };

  const getStatusBadgeStyle = (match: MatchResult | BeachMatchCore) => {
    if (isMatchLive(match)) {
      return { ...styles.statusBadge, backgroundColor: colors.success };
    }

    const statusText = getStatusText(match);
    switch (statusText) {
      case 'LIVE':
      case 'IN SET 1':
      case 'IN SET 2':
      case 'IN SET 3':
        return { ...styles.statusBadge, backgroundColor: colors.success };
      case 'FINAL':
      case 'SET 1 DONE':
      case 'SET 2 DONE':
      case 'SET 3 DONE':
        return { ...styles.statusBadge, backgroundColor: colors.textSecondary };
      case 'SCHEDULED':
      case 'READY':
        return { ...styles.statusBadge, backgroundColor: colors.primary };
      case 'CANCELLED':
        return { ...styles.statusBadge, backgroundColor: colors.error };
      default:
        return { ...styles.statusBadge, backgroundColor: colors.textSecondary };
    }
  };

  const renderSetScore = (setNumber: number) => {
    if (!match) return null;

    let teamAPoints = 0;
    let teamBPoints = 0;

    if (isBeachMatchCore(match)) {
      // Use setScores array from BeachMatchCore
      if (match.result?.setScores) {
        const setIndex = (setNumber - 1) * 2;
        if (setIndex + 1 < match.result.setScores.length) {
          teamAPoints = match.result.setScores[setIndex];
          teamBPoints = match.result.setScores[setIndex + 1];
        }
      } else {
        // Fallback to legacy format
        const rawMatch = match as any;
        switch (setNumber) {
          case 1:
            teamAPoints = parseInt(rawMatch.PointsTeamASet1 || '0');
            teamBPoints = parseInt(rawMatch.PointsTeamBSet1 || '0');
            break;
          case 2:
            teamAPoints = parseInt(rawMatch.PointsTeamASet2 || '0');
            teamBPoints = parseInt(rawMatch.PointsTeamBSet2 || '0');
            break;
          case 3:
            teamAPoints = parseInt(rawMatch.PointsTeamASet3 || '0');
            teamBPoints = parseInt(rawMatch.PointsTeamBSet3 || '0');
            break;
        }
      }
    } else {
      // MatchResult type
      switch (setNumber) {
        case 1:
          teamAPoints = match.pointsTeamASet1 || 0;
          teamBPoints = match.pointsTeamBSet1 || 0;
          break;
        case 2:
          teamAPoints = match.pointsTeamASet2 || 0;
          teamBPoints = match.pointsTeamBSet2 || 0;
          break;
        case 3:
          teamAPoints = match.pointsTeamASet3 || 0;
          teamBPoints = match.pointsTeamBSet3 || 0;
          break;
      }
    }

    // Don't render if set wasn't played
    if (teamAPoints === 0 && teamBPoints === 0 && setNumber > 1) {
      return null;
    }

    const teamAWon = teamAPoints > teamBPoints && (teamAPoints >= 21 || teamBPoints >= 21);
    const teamBWon = teamBPoints > teamAPoints && (teamBPoints >= 21 || teamAPoints >= 21);
    const isCurrentSet = isMatchLive(match) && setNumber === getCurrentSetNumber();

    return (
      <View key={setNumber} style={[
        styles.setScoreContainer,
        isCurrentSet && styles.currentSetContainer
      ]}>
        <Text style={[styles.setLabel, isCurrentSet && styles.currentSetLabel]}>
          Set {setNumber} {isCurrentSet && '(Live)'}
        </Text>
        <View style={styles.setScoreRow}>
          <View style={[
            styles.setScore,
            teamAWon && styles.winningScore,
            isCurrentSet && styles.currentSetScore
          ]}>
            <Text style={[
              styles.setScoreText,
              teamAWon && styles.winningScoreText,
              isCurrentSet && styles.currentSetScoreText
            ]}>
              {teamAPoints}
            </Text>
          </View>
          <Text style={[
            styles.setScoreDivider,
            isCurrentSet && styles.currentSetDivider
          ]}>-</Text>
          <View style={[
            styles.setScore,
            teamBWon && styles.winningScore,
            isCurrentSet && styles.currentSetScore
          ]}>
            <Text style={[
              styles.setScoreText,
              teamBWon && styles.winningScoreText,
              isCurrentSet && styles.currentSetScoreText
            ]}>
              {teamBPoints}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Helper function to get current set number for live matches
  const getCurrentSetNumber = (): number => {
    if (!match || !isMatchLive(match)) return -1;

    if (isBeachMatchCore(match)) {
      const rawStatus = (match as any)?.rawStatus;
      if (typeof rawStatus === 'number') {
        if (rawStatus === 3) return 1; // Currently in set 1
        if (rawStatus === 5) return 2; // Currently in set 2
        if (rawStatus === 7) return 3; // Currently in set 3
      }
    }

    return 1; // Default to set 1
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
      {/* Header - consistent with existing app design */}
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
        {/* Live Indicator for live matches */}
        {isMatchLive(match) && (
          <View style={styles.liveIndicatorContainer}>
            <LiveIndicator />
            <Text style={styles.liveText}>LIVE MATCH</Text>
          </View>
        )}

        {/* Match Header Card - Tournament info and status */}
        <Card style={[
          styles.matchHeaderCard,
          isMatchLive(match) && styles.liveCard
        ]}>
          {/* Top band for women's matches - consistent with MatchCard */}
          {isBeachMatchCore(match) && (match as any).tournamentGender === 'W' && (
            <View style={styles.womenTopBand} />
          )}

          <View style={styles.matchHeaderContent}>
            {/* Left: Gender badge and match info */}
            <View style={styles.matchHeaderLeft}>
              {isBeachMatchCore(match) && (
                <View style={styles.genderSection}>
                  <View style={[
                    styles.genderBadge,
                    (match as any).tournamentGender === 'M' ? styles.menBadge : styles.womenBadge
                  ]}>
                    <Text style={[
                      styles.genderBadgeText,
                      (match as any).tournamentGender === 'M' ? styles.menBadgeText : styles.womenBadgeText
                    ]}>
                      {(match as any).tournamentGender}{(match as any).noInTournament || match.matchCode}
                    </Text>
                  </View>
                  {match.court && (
                    <Text style={styles.courtInfo}>
                      Court {match.court.courtNumber === 'CC' ? 'CC' : `C${match.court.courtNumber}`}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Center: Status */}
            <View style={styles.statusContainer}>
              <View style={getStatusBadgeStyle(match)}>
                <Text style={styles.statusText}>{getStatusText(match)}</Text>
              </View>
            </View>

            {/* Right: Round display */}
            <View style={styles.matchHeaderRight}>
              {isBeachMatchCore(match) && match.roundName && (
                <RoundPhaseDisplay
                  round={match.roundName}
                  phase={(match as any).Phase}
                  style={styles.roundBadge}
                />
              )}
            </View>
          </View>
        </Card>

        {/* Teams and Score Card */}
        <Card style={styles.teamsCard}>
          <View style={styles.teamsHeader}>
            <Text style={styles.sectionTitle}>
              {isMatchLive(match) ? 'Live Score' : 'Final Score'}
            </Text>
            {/* Match time info */}
            {isBeachMatchCore(match) && match.scheduledDateTime && (
              <Text style={styles.matchTime}>
                {new Date(match.scheduledDateTime).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })}
              </Text>
            )}
          </View>

          <View style={styles.teamsContainer}>
            {/* Team 1 */}
            <View style={styles.teamSection}>
              <View style={styles.teamFlagSection}>
                <FlagImage
                  countryCode={isBeachMatchCore(match) ? match.team1.countryCode : 'XXX'}
                  size="large"
                  style={styles.teamFlag}
                />
                <Text style={styles.countryCode}>
                  {isBeachMatchCore(match) ? match.team1.countryCode : ''}
                </Text>
              </View>
              <Text style={styles.teamName} numberOfLines={2}>
                {isBeachMatchCore(match) ? match.team1.teamName : match.teamAName}
                {isBeachMatchCore(match) && (match as any).teamAPositionInMainDraw && (
                  <Text style={styles.teamPosition}> (#{(match as any).teamAPositionInMainDraw})</Text>
                )}
              </Text>
              <Text style={[
                styles.matchPoints,
                isBeachMatchCore(match) && match.result?.winner === 1 && styles.winnerPoints
              ]}>
                {isBeachMatchCore(match) ? (match.result?.team1Sets || 0) : match.matchPointsA}
              </Text>
            </View>

            <Text style={styles.vsText}>vs</Text>

            {/* Team 2 */}
            <View style={styles.teamSection}>
              <View style={styles.teamFlagSection}>
                <FlagImage
                  countryCode={isBeachMatchCore(match) ? match.team2.countryCode : 'XXX'}
                  size="large"
                  style={styles.teamFlag}
                />
                <Text style={styles.countryCode}>
                  {isBeachMatchCore(match) ? match.team2.countryCode : ''}
                </Text>
              </View>
              <Text style={styles.teamName} numberOfLines={2}>
                {isBeachMatchCore(match) ? match.team2.teamName : match.teamBName}
                {isBeachMatchCore(match) && (match as any).teamBPositionInMainDraw && (
                  <Text style={styles.teamPosition}> (#{(match as any).teamBPositionInMainDraw})</Text>
                )}
              </Text>
              <Text style={[
                styles.matchPoints,
                isBeachMatchCore(match) && match.result?.winner === 2 && styles.winnerPoints
              ]}>
                {isBeachMatchCore(match) ? (match.result?.team2Sets || 0) : match.matchPointsB}
              </Text>
            </View>
          </View>
        </Card>

        {/* Set by Set Scores */}
        <Card style={styles.setsCard}>
          <Text style={styles.sectionTitle}>Set Scores</Text>
          <View style={styles.setsGrid}>
            {[1, 2, 3].map(setNum => renderSetScore(setNum))}
          </View>
        </Card>

        {/* Match Information */}
        <Card style={styles.matchInfoCard}>
          <Text style={styles.sectionTitle}>Match Information</Text>
          <View style={styles.infoGrid}>
            {/* Date */}
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>
                {isBeachMatchCore(match) && match.scheduledDateTime ?
                  new Date(match.scheduledDateTime).toLocaleDateString() :
                  formatDateLong(match.localDate)}
              </Text>
            </View>

            {/* Court */}
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Court</Text>
              <Text style={styles.infoValue}>
                {isBeachMatchCore(match) && match.court ?
                  (match.court.courtNumber === 'CC' ? 'Center Court' : `Court ${match.court.courtNumber}`) :
                  match.court}
              </Text>
            </View>

            {/* Round */}
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Round</Text>
              <Text style={styles.infoValue}>
                {isBeachMatchCore(match) ? match.roundName || match.round : match.round}
              </Text>
            </View>

            {/* Match Number */}
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Match Number</Text>
              <Text style={styles.infoValue}>
                {isBeachMatchCore(match) ? match.matchCode : match.no}
              </Text>
            </View>

            {/* Duration (if finished) */}
            {isBeachMatchCore(match) && match.result?.duration && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Duration</Text>
                <Text style={styles.infoValue}>
                  {Math.floor(match.result.duration / 60)}h {match.result.duration % 60}m
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Referees Section */}
        {isBeachMatchCore(match) && match.refereeAssignments && match.refereeAssignments.length > 0 && (
          <Card style={styles.refereesCard}>
            <Text style={styles.sectionTitle}>Match Officials</Text>
            <View style={styles.refereesGrid}>
              {match.refereeAssignments.map((referee, index) => (
                <View key={index} style={styles.refereeItem}>
                  <View style={styles.refereeInfo}>
                    <Text style={styles.refereePosition}>
                      {referee.function?.includes('1st') ? '1st Referee' :
                       referee.function?.includes('2nd') ? '2nd Referee' :
                       referee.function?.includes('Challenge') ? 'Challenge Referee' :
                       referee.function || 'Referee'}
                    </Text>
                    <Text style={styles.refereeName}>{referee.refereeName}</Text>
                  </View>
                  <FlagImage
                    countryCode={referee.federationCode}
                    size="large"
                    style={styles.refereeFlag}
                  />
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Set Durations (if available) */}
        {isBeachMatchCore(match) && ((match as any).DurationSet1 || (match as any).DurationSet2 || (match as any).DurationSet3) && (
          <Card style={styles.durationCard}>
            <Text style={styles.sectionTitle}>Set Durations</Text>
            <View style={styles.durationGrid}>
              {(match as any).DurationSet1 && (
                <View style={styles.durationItem}>
                  <Text style={styles.durationLabel}>Set 1</Text>
                  <Text style={styles.durationValue}>
                    {Math.floor(parseInt((match as any).DurationSet1) / 60)}:{(parseInt((match as any).DurationSet1) % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
              )}
              {(match as any).DurationSet2 && (
                <View style={styles.durationItem}>
                  <Text style={styles.durationLabel}>Set 2</Text>
                  <Text style={styles.durationValue}>
                    {Math.floor(parseInt((match as any).DurationSet2) / 60)}:{(parseInt((match as any).DurationSet2) % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
              )}
              {(match as any).DurationSet3 && (
                <View style={styles.durationItem}>
                  <Text style={styles.durationLabel}>Set 3</Text>
                  <Text style={styles.durationValue}>
                    {Math.floor(parseInt((match as any).DurationSet3) / 60)}:{(parseInt((match as any).DurationSet3) % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
              )}
            </View>
          </Card>
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    ...shadowPresets.card,
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  refreshButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.success,
    minHeight: 44,
    justifyContent: 'center',
  },
  refreshButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.h2,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Live indicator
  liveIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  liveText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.success,
    letterSpacing: 1,
  },

  // Match Header Card
  matchHeaderCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    overflow: 'hidden',
  },
  liveCard: {
    borderColor: colors.success,
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  womenTopBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#000000',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  matchHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  matchHeaderLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  matchHeaderRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  genderSection: {
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  genderBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.textPrimary,
  },
  menBadge: {
    // Default styling
  },
  womenBadge: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  genderBadgeText: {
    ...typography.caption,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  menBadgeText: {
    // Default text color
  },
  womenBadgeText: {
    color: colors.background,
  },
  courtInfo: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statusContainer: {
    flex: 1,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  statusText: {
    color: colors.background,
    ...typography.bodyLarge,
    fontWeight: '800',
  },
  roundBadge: {
    // Will be styled by RoundPhaseDisplay component
  },

  // Teams Card
  teamsCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  teamsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  matchTime: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  teamsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  teamSection: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  teamFlagSection: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  teamFlag: {
    marginBottom: 2,
  },
  countryCode: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  teamName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  teamPosition: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  matchPoints: {
    ...typography.hero,
    fontWeight: '800',
    color: colors.success,
  },
  winnerPoints: {
    color: colors.primary,
  },
  vsText: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Section titles
  sectionTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  // Set Scores Card
  setsCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  setsGrid: {
    gap: spacing.md,
  },
  setScoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  currentSetContainer: {
    backgroundColor: colors.success + '15', // 15% opacity
    borderWidth: 2,
    borderColor: colors.success,
  },
  setLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 80,
  },
  currentSetLabel: {
    color: colors.success,
    fontWeight: '700',
  },
  setScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  setScore: {
    width: 50,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
  currentSetScore: {
    backgroundColor: colors.success,
    transform: [{ scale: 1.1 }],
  },
  winningScore: {
    backgroundColor: colors.primary,
  },
  setScoreText: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  currentSetScoreText: {
    color: colors.background,
    fontWeight: '800',
  },
  winningScoreText: {
    color: colors.background,
  },
  setScoreDivider: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  currentSetDivider: {
    color: colors.success,
    fontWeight: '800',
  },

  // Match Info Card
  matchInfoCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  infoGrid: {
    gap: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },

  // Referees Card
  refereesCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  refereesGrid: {
    gap: spacing.md,
  },
  refereeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  refereeInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  refereePosition: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  refereeName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  refereeFlag: {
    marginLeft: spacing.sm,
  },

  // Duration Card
  durationCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  durationGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.sm,
  },
  durationItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  durationLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  durationValue: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});