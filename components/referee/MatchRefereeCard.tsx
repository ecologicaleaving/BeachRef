import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../Typography/Text';
import { FlagImage } from '../FlagImage';
import { colors, brandColors, statusColors, designTokens } from '../../theme/tokens';
import { RefereeMatch } from '../../services/RefereeStatsService';

interface MatchRefereeCardProps {
  match: RefereeMatch;
  style?: any;
}

export const MatchRefereeCard: React.FC<MatchRefereeCardProps> = ({ match, style }) => {
  // Format match results from set scores
  const formatResults = (): { setScores: string; setResult: string; totalDuration: string } => {
    // Check if we have set score data in the raw match data
    const rawMatch = (match as any).rawMatch;
    if (!rawMatch) return { setScores: '', setResult: '', totalDuration: '' };


    const set1A = rawMatch.PointsTeamASet1;
    const set1B = rawMatch.PointsTeamBSet1;
    const set2A = rawMatch.PointsTeamASet2;
    const set2B = rawMatch.PointsTeamBSet2;
    const set3A = rawMatch.PointsTeamASet3;
    const set3B = rawMatch.PointsTeamBSet3;

    const results = [];
    let teamAWins = 0;
    let teamBWins = 0;
    let totalSets = 0;

    if (set1A && set1B && set1A !== '0' && set1B !== '0') {
      results.push(`${set1A}-${set1B}`);
      totalSets++;
      if (parseInt(set1A) > parseInt(set1B)) teamAWins++;
      else teamBWins++;
    }
    if (set2A && set2B && set2A !== '0' && set2B !== '0') {
      results.push(`${set2A}-${set2B}`);
      totalSets++;
      if (parseInt(set2A) > parseInt(set2B)) teamAWins++;
      else teamBWins++;
    }
    if (set3A && set3B && set3A !== '0' && set3B !== '0') {
      results.push(`${set3A}-${set3B}`);
      totalSets++;
      if (parseInt(set3A) > parseInt(set3B)) teamAWins++;
      else teamBWins++;
    }

    const setScores = results.length > 0 ? results.join(', ') : '';
    const setResult = (teamAWins > 0 || teamBWins > 0) ? `${teamAWins}-${teamBWins}` : '';

    // Calculate total match duration including intervals
    const totalDuration = calculateMatchDuration(rawMatch, totalSets);

    return { setScores, setResult, totalDuration };
  };

  // Calculate total match duration including set durations and intervals
  const calculateMatchDuration = (rawMatch: any, totalSets: number): string => {
    if (!rawMatch || totalSets === 0) return '';

    let totalMinutes = 0;

    // Add set durations (format might be "MM:SS" or just minutes)
    const durations = [rawMatch.DurationSet1, rawMatch.DurationSet2, rawMatch.DurationSet3];

    for (let i = 0; i < totalSets; i++) {
      const duration = durations[i];
      if (duration) {
        // Handle different duration formats
        if (duration.includes(':')) {
          // Format: "MM:SS"
          const [minutes, seconds] = duration.split(':').map(Number);
          totalMinutes += minutes + (seconds >= 30 ? 1 : 0); // Round seconds
        } else if (!isNaN(parseInt(duration))) {
          // Format: just minutes
          totalMinutes += parseInt(duration);
        }
      } else {
        // Estimate if duration not available (average 20 minutes per set)
        totalMinutes += 20;
      }
    }

    // Add intervals between sets (2 minutes per interval)
    // For 2 sets: 1 interval, for 3 sets: 2 intervals
    const intervals = totalSets > 1 ? totalSets - 1 : 0;
    totalMinutes += intervals * 2;

    return totalMinutes > 0 ? `${totalMinutes}min` : '';
  };

  // Get phase name (keep original, make smaller)
  const getPhaseName = (): string => {
    return match.round; // Use original phase name, will make smaller in styling
  };

  // Get FIVB-branded status styling
  const getStatusStyle = () => {
    const rawMatch = (match as any).rawMatch;
    const status = match.status.toLowerCase();

    // Check if match is finished based on status or having set scores
    const hasSetScores = rawMatch && (
      (rawMatch.PointsTeamASet1 && rawMatch.PointsTeamBSet1 && rawMatch.PointsTeamASet1 !== '0' && rawMatch.PointsTeamBSet1 !== '0') ||
      (rawMatch.PointsTeamASet2 && rawMatch.PointsTeamBSet2 && rawMatch.PointsTeamASet2 !== '0' && rawMatch.PointsTeamBSet2 !== '0')
    );

    if (status.includes('finished') || status.includes('completed') || status.includes('final') || hasSetScores) {
      return {
        backgroundColor: brandColors.accentLight,
        color: colors.success,
        text: 'FINISHED',
        borderColor: colors.success
      };
    }
    if (status.includes('running') || status.includes('live') || status.includes('playing')) {
      return {
        backgroundColor: brandColors.secondaryLight,
        color: statusColors.current,
        text: 'LIVE',
        borderColor: statusColors.current
      };
    }
    return {
      backgroundColor: brandColors.primaryLight,
      color: colors.textSecondary,
      text: 'SCHEDULED',
      borderColor: colors.secondary
    };
  };

  // Format time compactly
  const formatTime = (): string => {
    try {
      const date = new Date(match.dateTime);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) +
             ' ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return 'TBD';
    }
  };

  const statusStyle = getStatusStyle();
  const { setScores, setResult, totalDuration } = formatResults();
  const phaseName = getPhaseName();

  // Format court - use 2-letter code only (CC for Center Court, or just the code)
  const formatCourt = (): string => {
    const court = match.court.toString().toUpperCase();
    if (court === 'CENTER COURT' || court === 'CENTRE COURT') return 'CC';
    // For numeric courts like "1", "2", etc., just return as is
    // For codes like "CC", "A", "B", return as is
    return court.length <= 2 ? court : court.substring(0, 2);
  };

  return (
    <View style={[styles.card, style]}>
      {/* Top Row - Court left, Time center, Status right */}
      <View style={styles.topRow}>
        {/* Top Left - Court in blue dot */}
        <View style={styles.topLeftSection}>
          <View style={styles.courtBadge}>
            <Text style={styles.courtText}>{formatCourt()}</Text>
          </View>
        </View>

        {/* Top Center - Date/Time */}
        <View style={styles.topCenterSection}>
          <Text style={styles.timeText}>{formatTime()}</Text>
        </View>

        {/* Top Right - Phase Name + Status */}
        <View style={styles.topRightSection}>
          <View style={styles.phaseSection}>
            <Text style={styles.phaseText}>{phaseName}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            {
              backgroundColor: statusStyle.backgroundColor,
              borderColor: statusStyle.borderColor
            }
          ]}>
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {statusStyle.text}
            </Text>
          </View>
        </View>
      </View>

      {/* Referee Section - Above teams row, R1 at top, R2 at bottom */}
      <View style={styles.refereeSection}>
        <View style={styles.refereeRow}>
          <View style={styles.refereeInfo}>
            <FlagImage
              countryCode={(match as any).rawMatch?.Referee1FederationCode || 'XX'}
              style={styles.refereeFlag}
            />
            <Text style={[
              styles.refereeName,
              match.refereeRole === 'first' ? styles.currentReferee : null
            ]}>
              {match.referees.referee1.name}
            </Text>
          </View>
          <View style={[styles.refereeBadge, styles.refereeBadgeR1]}>
            <Text style={styles.refereeLabel}>R1</Text>
          </View>
        </View>

        <View style={styles.refereeRow}>
          <View style={styles.refereeInfo}>
            <FlagImage
              countryCode={(match as any).rawMatch?.Referee2FederationCode || 'XX'}
              style={styles.refereeFlag}
            />
            <Text style={[
              styles.refereeName,
              match.refereeRole === 'second' ? styles.currentReferee : null
            ]}>
              {match.referees.referee2.name}
            </Text>
          </View>
          <View style={[styles.refereeBadge, styles.refereeBadgeR2]}>
            <Text style={styles.refereeLabel}>R2</Text>
          </View>
        </View>
      </View>

      {/* Main Row - Results + Teams */}
      <View style={styles.mainRow}>
        {/* Results Section - Float left */}
        {(setScores || setResult || totalDuration) && (
          <View style={styles.resultsSection}>
            <View style={styles.resultsRow}>
              {setResult && (
                <Text style={styles.setResultText}>{setResult}</Text>
              )}
              {totalDuration && (
                <Text style={styles.durationText}>{totalDuration}</Text>
              )}
            </View>
            {setScores && (
              <Text style={styles.setScoresText}>{setScores}</Text>
            )}
          </View>
        )}

        {/* Teams Section - Two Rows on the right */}
        <View style={styles.teamsSection}>
          <View style={styles.teamRow}>
            <Text style={styles.teamName} numberOfLines={1}>
              {match.teams.team1.name}
            </Text>
            <FlagImage countryCode={match.teams.team1.countryCode} style={styles.flag} />
          </View>
          <View style={styles.teamRow}>
            <Text style={styles.teamName} numberOfLines={1}>
              {match.teams.team2.name}
            </Text>
            <FlagImage countryCode={match.teams.team2.countryCode} style={styles.flag} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: brandColors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.secondary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 95,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  spacer: {
    flex: 1,
  },

  // Phase Section - FIVB branded styling
  phaseSection: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: brandColors.secondaryLight,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: colors.secondary,
  },

  phaseText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },

  // Teams Section - Two Rows
  teamsSection: {
    flexDirection: 'column',
    justifyContent: 'center',
    flex: 1,
    gap: 2,
  },

  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  flag: {
    width: 20,
    height: 15,
    borderRadius: 3,
    marginLeft: 6,
  },

  teamName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },

  // Results Section - FIVB branded with accent background
  resultsSection: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    backgroundColor: brandColors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.accent,
    minWidth: 80,
  },

  resultsText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
    textAlign: 'center',
  },

  // Set Result Styles - FIVB success color
  setResultText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
    textAlign: 'left',
  },

  setScoresText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'left',
  },

  // Results row for set result + duration
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'left',
  },

  // Top Left Section
  topLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Top Center Section
  topCenterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },

  // Top Right Section
  topRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // Center Section
  centerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },

  // Right Section
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  // Bottom Right Section
  bottomRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Metadata Section
  metadataSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'flex-end',
  },

  courtBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1B365D',
    justifyContent: 'center',
    alignItems: 'center',
  },

  courtText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  timeText: {
    fontSize: 10,
    color: colors.textSecondary,
  },

  separator: {
    fontSize: 10,
    color: '#D1D5DB',
  },

  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    minWidth: 24,
    alignItems: 'center',
    borderWidth: 1,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },

  refereeRole: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
  },

  currentReferee: {
    color: colors.primary,
    fontWeight: '700',
  },

  // Referee Section - FIVB professional styling
  refereeSection: {
    marginBottom: 10,
    paddingBottom: 8,
    paddingHorizontal: 6,
    paddingTop: 4,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.secondary,
    gap: 4,
  },

  refereeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },

  refereeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  refereeBadgeR1: {
    backgroundColor: colors.primary,
  },

  refereeBadgeR2: {
    backgroundColor: colors.secondary,
  },

  refereeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.background,
    textAlign: 'center',
  },

  refereeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },

  refereeFlag: {
    width: 20,
    height: 15,
    borderRadius: 3,
  },

  refereeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },

  refereeCountryCode: {
    fontSize: 8,
    color: designTokens.neutrals.textSecondary,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'right',
  },

});

export default MatchRefereeCard;