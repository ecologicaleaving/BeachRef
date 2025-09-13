import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BeachMatchCore, MatchStatus } from '../../../types/match-v2';
import { FlagImage } from '../../FlagImage';
import { RoundPhaseDisplay } from '../../Typography/RoundPhaseDisplay';
import { colors } from '../../../theme/tokens';
import { calculateTotalDuration } from '../../../utils/MatchDurationFormatter';

export interface MatchCardProps {
  match: BeachMatchCore;
  onPress?: (match: BeachMatchCore) => void;
  showStatusBadge?: boolean;
  showReferee?: boolean;
  showDuration?: boolean;
  compact?: boolean;
  variant?: 'default' | 'referee' | 'live';
}

/**
 * Match Card Component - Based on Master Branch MatchListV2 Design
 * Exact replica of the compact design from the deployed app
 */
export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  onPress,
  variant = 'default',
}) => {
  const router = useRouter();
  
  // Navigate to referee profile
  const handleRefereePress = (refereeName: string, federationCode?: string) => {
    // Create a mock referee object for navigation
    const refereeData = {
      id: refereeName, // Use name as ID for now
      firstName: refereeName.split(' ')[0] || refereeName,
      lastName: refereeName.split(' ').slice(1).join(' ') || '',
      federationCode: federationCode || 'UNK',
      gender: 'M' as const, // Default gender
      status: 'Active' as const,
      type: 'Referee' as const,
      noOfficial: refereeName, // Use name as identifier
    };
    
    router.push({
      pathname: '/referee-profile',
      params: {
        refereeData: JSON.stringify(refereeData)
      }
    });
  };
  
  // Format time display
  const formatTime = (dateTimeString: string): string => {
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch {
      return 'TBD';
    }
  };

  // Check if match is live
  const isMatchLive = (match: BeachMatchCore): boolean => {
    if (!match.scheduledDateTime) return false;
    const matchDate = new Date(match.scheduledDateTime);
    const now = new Date();
    const isAfterScheduledTime = matchDate < now;
    
    const team1Sets = match.result?.team1Sets || 0;
    const team2Sets = match.result?.team2Sets || 0;
    const matchNotFinished = team1Sets < 2 && team2Sets < 2;
    
    const statusIsRunning = match.status === MatchStatus.RUNNING;
    
    const timeSinceStart = now.getTime() - matchDate.getTime();
    const withinReasonableTimeframe = timeSinceStart <= 2 * 60 * 60 * 1000; // 2 hours
    
    return isAfterScheduledTime && matchNotFinished && (statusIsRunning || withinReasonableTimeframe);
  };

  // Get match duration (from master branch logic) - check multiple sources
  const getMatchDuration = (match: BeachMatchCore): string | null => {
    const matchWithDuration = match as any;
    
    // First try to get duration from match result (calculated from start/end time)
    if (match.result?.duration && typeof match.result.duration === 'number') {
      const totalMinutes = match.result.duration;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    }
    
    // Check for Duration field in seconds (from enhanced data)
    const totalDurationSeconds = matchWithDuration.Duration;
    if (totalDurationSeconds && !isNaN(parseInt(totalDurationSeconds))) {
      const totalMinutes = Math.floor(parseInt(totalDurationSeconds) / 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      if (totalMinutes > 0) {
        if (hours > 0) {
          return `${hours}h ${minutes}m`;
        } else {
          return `${minutes}m`;
        }
      }
    }
    
    // Check for calculated time from start/end times
    if (match.actualStartTime && match.actualEndTime) {
      try {
        const startTime = new Date(match.actualStartTime).getTime();
        const endTime = new Date(match.actualEndTime).getTime();
        
        if (!isNaN(startTime) && !isNaN(endTime) && endTime > startTime) {
          const totalMinutes = Math.round((endTime - startTime) / (1000 * 60));
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          
          if (totalMinutes > 0) {
            if (hours > 0) {
              return `${hours}h ${minutes}m`;
            } else {
              return `${minutes}m`;
            }
          }
        }
      } catch (error) {
        // Skip if date parsing fails
      }
    }
    
    // Fallback: try to get duration from individual set fields using utility
    try {
      const durationResult = calculateTotalDuration(
        matchWithDuration.DurationSet1,
        matchWithDuration.DurationSet2,
        matchWithDuration.DurationSet3
      );
      
      if (durationResult && durationResult !== 'N/A' && durationResult !== '0m') {
        return durationResult;
      }
    } catch (error) {
      // Skip if calculateTotalDuration fails
    }
    
    // Try legacy format for individual set durations if available
    let totalSeconds = 0;
    let hasAnyDuration = false;
    
    // Check legacy set duration fields in seconds format
    [matchWithDuration.DurationSet1, matchWithDuration.DurationSet2, matchWithDuration.DurationSet3]
      .forEach((duration) => {
        if (duration && !isNaN(parseInt(duration))) {
          totalSeconds += parseInt(duration);
          hasAnyDuration = true;
        }
      });
    
    if (hasAnyDuration && totalSeconds > 0) {
      const totalMinutes = Math.floor(totalSeconds / 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m`;
      }
    }
    
    
    return null;
  };

  // Extract round data - prioritize roundName attribute
  const getRoundDisplayData = () => {
    const rawMatch = match as any;
    
    // First priority: use the roundName attribute directly
    if (match.roundName && match.roundName.trim()) {
      const roundName = match.roundName.trim();
      
      // Special handling for finals
      if (roundName.toLowerCase().includes('final')) {
        // Check if it's the First Place final (Gold Medal)
        if (roundName.toLowerCase().includes('first place') || 
            roundName.toLowerCase().includes('1st place') ||
            roundName.toLowerCase().includes('gold')) {
          return { 
            round: 'GOLD',
            phase: rawMatch.phase || rawMatch.Phase || rawMatch.RoundPhase
          };
        }
        // Other finals are Bronze Medal matches
        else {
          return { 
            round: 'BRONZE',
            phase: rawMatch.phase || rawMatch.Phase || rawMatch.RoundPhase
          };
        }
      }
      
      // For non-final rounds, use the roundName as-is
      return { 
        round: roundName,
        phase: rawMatch.phase || rawMatch.Phase || rawMatch.RoundPhase
      };
    }
    
    // Fallback: check other possible sources for round information  
    const round = match.round || rawMatch.Round || rawMatch.RoundDisplayText;
    const phase = rawMatch.phase || rawMatch.Phase || rawMatch.RoundPhase;
    
    // Check for medal matches first (gold/bronze)
    if (round && (round.toLowerCase().includes('gold') || round.toLowerCase().includes('bronze'))) {
      return { 
        round: round.toLowerCase().includes('gold') ? 'Gold' : 'Bronze', 
        phase: 'Medal' 
      };
    }
    
    // Check for phase-based medal determination
    if (phase && (phase.toLowerCase().includes('gold') || phase.toLowerCase().includes('bronze'))) {
      return { 
        round: phase.toLowerCase().includes('gold') ? 'Gold' : 'Bronze', 
        phase: 'Medal' 
      };
    }
    
    // Check for finals and playoffs
    if (round && round.toLowerCase().includes('final') && !round.toLowerCase().includes('semi')) {
      return { round: 'Final', phase: undefined };
    }
    
    // Check for semifinals 
    if (round && (round.toLowerCase().includes('semi') || round.toLowerCase().includes('sf'))) {
      return { round: 'Semifinal', phase: undefined };
    }
    
    // Check for quarterfinals
    if (round && (round.toLowerCase().includes('quarter') || round.toLowerCase().includes('qf'))) {
      return { round: 'Quarterfinal', phase: undefined };
    }
    
    // Check for elimination matches
    if (round && (round.toLowerCase().includes('elimin') || round.toLowerCase().includes('ko'))) {
      return { round: 'Elimination', phase: undefined };
    }
    
    // Check for pool matches
    if (round && (round.toLowerCase().includes('pool') || round.toLowerCase().includes('group'))) {
      return { round: 'Pool', phase: phase };
    }
    
    // If we have a number-based round system, try to interpret it
    if (round && /^[0-9]+$/.test(round.toString())) {
      const roundNum = parseInt(round.toString());
      if (roundNum <= 2) {
        return { round: 'Final', phase: undefined };
      } else if (roundNum <= 4) {
        return { round: 'Semifinal', phase: undefined };
      } else if (roundNum <= 8) {
        return { round: 'Quarterfinal', phase: undefined };
      } else {
        return { round: 'Elimination', phase: undefined };
      }
    }
    
    // Default fallback
    return { 
      round: round || 'TBD',
      phase: phase
    };
  };
  
  const roundData = getRoundDisplayData();

  const matchWithResult = match; // Use match as-is for now
  

  return (
    <TouchableOpacity 
      style={[
        styles.matchCard,
        variant === 'live' && styles.liveCard,
      ]} 
      onPress={() => onPress?.(match)}
      activeOpacity={0.7}
    >
      {/* Match Header - Compact horizontal layout */}
      <View style={styles.matchHeader}>
        <View style={styles.leftBadgeContainer}>
          {(match as any).tournamentGender && (
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
          )}
        </View>
        
        <View style={styles.timeCourtContainer}>
          <View style={styles.timeContainer}>
            {isMatchLive(match) && (
              <View style={styles.liveDot} />
            )}
            <Text style={styles.matchTime}>
              {match.scheduledDateTime ? formatTime(match.scheduledDateTime) : 'TBD'}
            </Text>
          </View>
          <Text style={styles.courtText}>
            {match.court?.courtNumber ? (
              match.court.courtNumber === 'CC' ? 'CC' : `C${match.court.courtNumber}`
            ) : 'TBD'}
          </Text>
        </View>
        
        <View style={styles.rightBadgeContainer}>
          <View style={styles.statusBadge}>
            <RoundPhaseDisplay
              round={roundData.round}
              phase={roundData.phase}
              emphasis="medium"
              color="textPrimary"
              style={styles.statusText}
            />
          </View>
        </View>
      </View>

      {/* Flags and Result Row */}
      <View style={styles.flagsAndResultRow}>
        <View style={styles.leftFlagContainer}>
          <FlagImage
            countryCode={match.team1?.countryCode}
            size="large"
            style={styles.leftFlag}
          />
          <Text style={[styles.countryCode, styles.leftCountryCode]}>
            {match.team1?.countryCode || ''}
          </Text>
        </View>
        
        <View style={styles.centerResultContainer}>
          {matchWithResult.result ? (
            <View style={styles.resultContainerWithSets}>
              {/* Main score and duration row */}
              <View style={styles.scoreAndDurationRow}>
                <View style={styles.resultContainer}>
                  <Text style={[
                    styles.resultScore,
                    matchWithResult.result.winner === 1 && styles.winnerScore
                  ]}>
                    {matchWithResult.result.team1Sets}
                  </Text>
                  <Text style={styles.scoreSeparator}>-</Text>
                  <Text style={[
                    styles.resultScore,
                    matchWithResult.result.winner === 2 && styles.winnerScore
                  ]}>
                    {matchWithResult.result.team2Sets}
                  </Text>
                </View>
                
                {/* Duration Display - moved to the right of the score */}
                {(() => {
                  const totalDuration = getMatchDuration(match);
                  return totalDuration ? (
                    <Text style={styles.durationText}>({totalDuration})</Text>
                  ) : null;
                })()}
              </View>
              
              {/* Set Scores Display - check multiple sources */}
              {(() => {
                // First check if we have setScores in result
                if (matchWithResult.result?.setScores && matchWithResult.result.setScores.length >= 2) {
                  return true;
                }
                
                // Check legacy BeachMatch format for individual set score fields
                const rawMatch = match as any;
                const hasLegacySetScores = (rawMatch.PointsTeamASet1 && rawMatch.PointsTeamBSet1) ||
                                          (rawMatch.PointsTeamASet2 && rawMatch.PointsTeamBSet2) ||
                                          (rawMatch.PointsTeamASet3 && rawMatch.PointsTeamBSet3);
                
                return hasLegacySetScores;
              })() && (
                <View style={styles.setScoresContainer}>
                  {(() => {
                    const sets = [];
                    
                    // Try to use result.setScores first
                    if (matchWithResult.result?.setScores && matchWithResult.result.setScores.length >= 2) {
                      const setScores = matchWithResult.result.setScores;
                      
                      // Parse set scores: [set1_team1, set1_team2, set2_team1, set2_team2, ...]
                      const totalSets = Math.floor(setScores.length / 2);
                      for (let i = 0; i < setScores.length; i += 2) {
                        if (i + 1 < setScores.length) {
                          const team1Score = setScores[i];
                          const team2Score = setScores[i + 1];
                          const setNumber = Math.floor(i / 2) + 1;
                          const isWinningSet = team1Score > team2Score ? 1 : team2Score > team1Score ? 2 : 0;
                          
                          // Check if this set is completed
                          const isMatchFinished = match.status === MatchStatus.FINISHED;
                          const isThirdSet = setNumber === 3;
                          const minWinScore = isThirdSet ? 15 : 21;
                          const hasWinningScore = (team1Score >= minWinScore && team1Score - team2Score >= 2) || 
                                                  (team2Score >= minWinScore && team2Score - team1Score >= 2);
                          const isNotLastSet = setNumber < totalSets;
                          const isSetComplete = isMatchFinished || hasWinningScore || isNotLastSet;
                          const isActiveSet = match.status === MatchStatus.RUNNING && setNumber === totalSets && !isSetComplete;
                          
                          sets.push(
                            <View key={setNumber} style={styles.individualSet}>
                              <Text style={[
                                styles.setScore,
                                isWinningSet === 1 && isSetComplete && styles.winningSetScore,
                                isActiveSet && styles.activeSetScore
                              ]}>
                                {team1Score}
                              </Text>
                              <Text style={styles.setScoreSeparator}>-</Text>
                              <Text style={[
                                styles.setScore,
                                isWinningSet === 2 && isSetComplete && styles.winningSetScore,
                                isActiveSet && styles.activeSetScore
                              ]}>
                                {team2Score}
                              </Text>
                            </View>
                          );
                        }
                      }
                    } else {
                      // Fallback to legacy BeachMatch format
                      const rawMatch = match as any;

                      
                      // Set 1
                      if (rawMatch.PointsTeamASet1 && rawMatch.PointsTeamBSet1) {
                        const team1Score = parseInt(rawMatch.PointsTeamASet1);
                        const team2Score = parseInt(rawMatch.PointsTeamBSet1);
                        const isWinningSet = team1Score > team2Score ? 1 : team2Score > team1Score ? 2 : 0;
                        
                        sets.push(
                          <View key={1} style={styles.individualSet}>
                            <Text style={[
                              styles.setScore,
                              isWinningSet === 1 && styles.winningSetScore
                            ]}>
                              {team1Score}
                            </Text>
                            <Text style={styles.setScoreSeparator}>-</Text>
                            <Text style={[
                              styles.setScore,
                              isWinningSet === 2 && styles.winningSetScore
                            ]}>
                              {team2Score}
                            </Text>
                          </View>
                        );
                      }
                      
                      // Set 2
                      if (rawMatch.PointsTeamASet2 && rawMatch.PointsTeamBSet2) {
                        const team1Score = parseInt(rawMatch.PointsTeamASet2);
                        const team2Score = parseInt(rawMatch.PointsTeamBSet2);
                        const isWinningSet = team1Score > team2Score ? 1 : team2Score > team1Score ? 2 : 0;
                        
                        sets.push(
                          <View key={2} style={styles.individualSet}>
                            <Text style={[
                              styles.setScore,
                              isWinningSet === 1 && styles.winningSetScore
                            ]}>
                              {team1Score}
                            </Text>
                            <Text style={styles.setScoreSeparator}>-</Text>
                            <Text style={[
                              styles.setScore,
                              isWinningSet === 2 && styles.winningSetScore
                            ]}>
                              {team2Score}
                            </Text>
                          </View>
                        );
                      }
                      
                      // Set 3
                      if (rawMatch.PointsTeamASet3 && rawMatch.PointsTeamBSet3) {
                        const team1Score = parseInt(rawMatch.PointsTeamASet3);
                        const team2Score = parseInt(rawMatch.PointsTeamBSet3);
                        const isWinningSet = team1Score > team2Score ? 1 : team2Score > team1Score ? 2 : 0;
                        
                        sets.push(
                          <View key={3} style={styles.individualSet}>
                            <Text style={[
                              styles.setScore,
                              isWinningSet === 1 && styles.winningSetScore
                            ]}>
                              {team1Score}
                            </Text>
                            <Text style={styles.setScoreSeparator}>-</Text>
                            <Text style={[
                              styles.setScore,
                              isWinningSet === 2 && styles.winningSetScore
                            ]}>
                              {team2Score}
                            </Text>
                          </View>
                        );
                      }
                    }
                    
                    return sets;
                  })()}
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.vsText}>vs</Text>
          )}
        </View>
        
        <View style={styles.rightFlagContainer}>
          <FlagImage
            countryCode={match.team2?.countryCode}
            size="large"
            style={styles.rightFlag}
          />
          <Text style={[styles.countryCode, styles.rightCountryCode]}>
            {match.team2?.countryCode || ''}
          </Text>
        </View>
      </View>

      {/* Teams Container */}
      <View style={styles.teamsContainer}>
        <View style={styles.teamsRow}>
          <View style={styles.teamSection}>
            <Text style={[
              styles.teamName,
              styles.leftTeamName,
              matchWithResult.result?.winner === 1 && styles.winnerTeam
            ]} numberOfLines={2}>
              {match.team1?.teamName || 'Team A'}
              {(match as any).teamAPositionInMainDraw && ` (${(match as any).teamAPositionInMainDraw})`}
            </Text>
          </View>
          
          <View style={styles.teamSection}>
            <Text style={[
              styles.teamName,
              styles.rightTeamName,
              matchWithResult.result?.winner === 2 && styles.winnerTeam
            ]} numberOfLines={2}>
              {match.team2?.teamName || 'Team B'}
              {(match as any).teamBPositionInMainDraw && ` (${(match as any).teamBPositionInMainDraw})`}
            </Text>
          </View>
        </View>
      </View>

      {/* Referees Section - support both new and legacy data formats */}
      {(() => {
        const rawMatch = match as any;
        const hasRefereeAssignments = match.refereeAssignments && match.refereeAssignments.length > 0;
        const hasLegacyReferees = rawMatch.Referee1Name || rawMatch.Referee2Name;
        
        return hasRefereeAssignments || hasLegacyReferees;
      })() && (
        <View style={styles.refereesContainer}>
          {(() => {
            const refereeRows = [];
            const rawMatch = match as any;
            
            // Try to use new format refereeAssignments first
            if (match.refereeAssignments && match.refereeAssignments.length > 0) {
              match.refereeAssignments.forEach((referee, index) => {
                // Determine referee position based on function or index
                let position = '';
                if (referee.function?.includes('1st') || referee.function?.includes('Referee 1')) {
                  position = '1°';
                } else if (referee.function?.includes('2nd') || referee.function?.includes('Referee 2')) {
                  position = '2°';
                } else if (referee.function?.includes('Challenge') || referee.function?.includes('CR')) {
                  position = 'CR';
                } else {
                  // Fallback to index-based
                  position = index === 0 ? '1°' : index === 1 ? '2°' : 'CR';
                }

                refereeRows.push(
                  <View key={`assignment-${index}`} style={styles.refereeRow}>
                    <View style={styles.refereeContentRow}>
                      <Text style={styles.refereePosition}>{position}</Text>
                      <TouchableOpacity onPress={() => handleRefereePress(referee.refereeName, referee.federationCode)}>
                        <Text style={[styles.refereeName, styles.refereeNameClickable]}>{referee.refereeName}</Text>
                      </TouchableOpacity>
                      <FlagImage
                        countryCode={referee.federationCode}
                        style={styles.refereeFlag}
                      />
                    </View>
                  </View>
                );
              });
            } else {
              // Fallback to legacy BeachMatch format
              if (rawMatch.Referee1Name) {
                refereeRows.push(
                  <View key="referee1" style={styles.refereeRow}>
                    <View style={styles.refereeContentRow}>
                      <Text style={styles.refereePosition}>1°</Text>
                      <TouchableOpacity onPress={() => handleRefereePress(rawMatch.Referee1Name, rawMatch.Referee1FederationCode)}>
                        <Text style={[styles.refereeName, styles.refereeNameClickable]}>{rawMatch.Referee1Name}</Text>
                      </TouchableOpacity>
                      <FlagImage
                        countryCode={rawMatch.Referee1FederationCode}
                        style={styles.refereeFlag}
                      />
                    </View>
                  </View>
                );
              }
              
              if (rawMatch.Referee2Name) {
                refereeRows.push(
                  <View key="referee2" style={styles.refereeRow}>
                    <View style={styles.refereeContentRow}>
                      <Text style={styles.refereePosition}>2°</Text>
                      <TouchableOpacity onPress={() => handleRefereePress(rawMatch.Referee2Name, rawMatch.Referee2FederationCode)}>
                        <Text style={[styles.refereeName, styles.refereeNameClickable]}>{rawMatch.Referee2Name}</Text>
                      </TouchableOpacity>
                      <FlagImage
                        countryCode={rawMatch.Referee2FederationCode}
                        style={styles.refereeFlag}
                      />
                    </View>
                  </View>
                );
              }
              
              // Check for challenge referee in legacy format
              if (rawMatch.ChallengeRefereeName) {
                refereeRows.push(
                  <View key="challenge-referee" style={styles.refereeRow}>
                    <View style={styles.refereeContentRow}>
                      <Text style={styles.refereePosition}>CR</Text>
                      <TouchableOpacity onPress={() => handleRefereePress(rawMatch.ChallengeRefereeName, rawMatch.ChallengeRefereeFederationCode)}>
                        <Text style={[styles.refereeName, styles.refereeNameClickable]}>{rawMatch.ChallengeRefereeName}</Text>
                      </TouchableOpacity>
                      <FlagImage
                        countryCode={rawMatch.ChallengeRefereeFederationCode}
                        style={styles.refereeFlag}
                      />
                    </View>
                  </View>
                );
              }
            }
            
            return refereeRows;
          })()}
        </View>
      )}
    </TouchableOpacity>
  );
};

// Exact styles from master branch MatchListV2
const styles = StyleSheet.create({
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 4,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  liveCard: {
    borderColor: colors.success,
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leftBadgeContainer: {
    flex: 0.8,
    alignItems: 'flex-start',
  },
  timeCourtContainer: {
    flex: 2,
    alignItems: 'center',
  },
  rightBadgeContainer: {
    flex: 0.8,
    alignItems: 'flex-end',
  },
  genderBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#374151',
  },
  menBadge: {
    // Same styling as base genderBadge
  },
  womenBadge: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  genderBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },
  menBadgeText: {
    // Same as base genderBadgeText
  },
  womenBadgeText: {
    color: '#FFFFFF',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  liveDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626', // Red color
    marginRight: 6,
  },
  matchTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B365D',
    textAlign: 'center',
  },
  courtText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
  statusBadge: {
    backgroundColor: '#6B7280',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  flagsAndResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  leftFlagContainer: {
    flex: 0.8,
    alignItems: 'flex-start',
  },
  rightFlagContainer: {
    flex: 0.8,
    alignItems: 'flex-end',
  },
  leftFlag: {
    marginBottom: 2,
  },
  rightFlag: {
    marginBottom: 2,
  },
  centerResultContainer: {
    flex: 2,
    alignItems: 'center',
  },
  resultContainerWithSets: {
    alignItems: 'center',
  },
  scoreAndDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    minWidth: 24,
    textAlign: 'center',
  },
  winnerScore: {
    color: colors.success,
  },
  scoreSeparator: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6B7280',
    marginHorizontal: 4,
  },
  vsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  teamsContainer: {
    // Container for teams
  },
  teamsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  teamSection: {
    flex: 1,
    alignItems: 'center',
  },
  teamName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B365D',
    textAlign: 'center',
    marginBottom: 2,
  },
  leftTeamName: {
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  rightTeamName: {
    textAlign: 'right',
    alignSelf: 'flex-end',
  },
  winnerTeam: {
    color: colors.success,
    fontWeight: 'bold',
  },
  countryCode: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  leftCountryCode: {
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  rightCountryCode: {
    textAlign: 'right', 
    alignSelf: 'flex-end',
  },
  refereesContainer: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  refereeRow: {
    marginBottom: 4,
    justifyContent: 'center',
  },
  refereeContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refereePosition: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#374151',
    marginRight: 8,
  },
  refereeFlag: {
    marginLeft: 8,
  },
  refereeName: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
    marginHorizontal: 8,
  },
  refereeNameClickable: {
    textDecorationLine: 'underline',
    color: colors.primary,
  },
  setScoresContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  individualSet: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  setScore: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  setScoreSeparator: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    marginHorizontal: 3,
  },
  activeSetScore: {
    color: '#111827',
    fontWeight: '700',
  },
  winningSetScore: {
    color: '#059669',
    fontWeight: '700',
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
});
