import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
// Removed Animated imports to fix render issues
import { useRouter } from 'expo-router';
import { BeachMatchCore, MatchStatus } from '../../../types/match-v2';
import { FlagImage } from '../../FlagImage';
import { RoundPhaseDisplay } from '../../Typography/RoundPhaseDisplay';
import { LiveIndicator } from '../../Status/LiveIndicator';
import { colors } from '../../../theme/tokens';
import { shadowPresets, createTextShadow } from '../../../theme/shadows';
import { calculateTotalDuration } from '../../../utils/MatchDurationFormatter';
import {
  formatTimeWithTimezoneSync,
  subscribeToTimezonePreferenceChanges,
  getCurrentTimezonePreference
} from '../../../utils/dateFormatters';
// Simplified for now - animations disabled to fix render issues

export interface MatchCardProps {
  match: BeachMatchCore;
  onPress?: (match: BeachMatchCore) => void;
  showStatusBadge?: boolean;
  showReferee?: boolean;
  showDuration?: boolean;
  compact?: boolean;
  variant?: 'default' | 'referee' | 'live';
  tournamentTimezone?: string; // Phase 3: Tournament timezone for timezone-aware formatting
}

/**
 * Match Card Component - Based on Master Branch MatchListV2 Design
 * Exact replica of the compact design from the deployed app
 */
export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  onPress,
  variant = 'default',
  tournamentTimezone,
}) => {
  const router = useRouter();
  const [timezonePreference, setTimezonePreference] = useState<'user' | 'local'>('user');

  // Load timezone preference and subscribe to changes
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const preference = await getCurrentTimezonePreference();
        setTimezonePreference(preference);
      } catch (error) {
        console.warn('Failed to load timezone preference in MatchCard:', error);
        setTimezonePreference('user'); // Default fallback
      }
    };

    // Load initial preference
    loadPreference();

    // Subscribe to preference changes
    const unsubscribe = subscribeToTimezonePreferenceChanges((newPreference) => {
      setTimezonePreference(newPreference);
    });

    return unsubscribe;
  }, []);

  // Determine if match is live
  const isLive = variant === 'live' || match.status === MatchStatus.RUNNING;

  // Get live scores from match result
  const team1Score = match.result?.team1Sets || 0;
  const team2Score = match.result?.team2Sets || 0;

  // Track score age for LIVE matches
  const [scoreAge, setScoreAge] = useState<number>(0);
  const [lastScoreUpdate, setLastScoreUpdate] = useState<Date>(new Date());
  const [forceRender, setForceRender] = useState<number>(0);

  // Convert setScores array to string for proper dependency tracking
  const setScoresString = match.result?.setScores ? JSON.stringify(match.result.setScores) : '';

  // Update score timestamp when scores change for LIVE matches
  useEffect(() => {
    if (isMatchLive(match)) {
      setLastScoreUpdate(new Date());
      setScoreAge(0);
    }
  }, [team1Score, team2Score, setScoresString, match.status, (match as any)?.rawStatus]);

  // Combined timer: 5-second re-render + 1-second score age update for LIVE matches
  useEffect(() => {
    if (!isMatchLive(match)) return;

    let secondCounter = 0;
    const interval = setInterval(() => {
      const now = new Date();
      const ageInSeconds = Math.floor((now.getTime() - lastScoreUpdate.getTime()) / 1000);
      setScoreAge(ageInSeconds);

      secondCounter++;
      // Force re-render every 5 seconds to pick up new live score data
      if (secondCounter >= 5) {
        setForceRender(prev => prev + 1);
        setLastScoreUpdate(new Date()); // Reset score age to 0 when we get fresh data
        setScoreAge(0);
        secondCounter = 0;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastScoreUpdate, match.status, (match as any)?.rawStatus]);

  // Format score age for display
  const formatScoreAge = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  };

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
  
  // Format time display - returns object with local and user times
  const getTimeDisplay = (dateTimeString: string): { localTime: string; userTime: string | null } => {
    try {
      // Check if we have UTC timestamp available (from Phase 2 VIS API enhancement)
      const utcStart = (match as any).utc_start;
      if (utcStart) {
        // Get local tournament time
        const localTime = formatTimeWithTimezoneSync(utcStart, {
          tournamentTimezone: tournamentTimezone || 'UTC',
          cachedPreference: 'local',
          showTimezoneIndicator: false,
        });

        // Get user's timezone time
        const userTime = formatTimeWithTimezoneSync(utcStart, {
          tournamentTimezone: tournamentTimezone || 'UTC',
          cachedPreference: 'user',
          showTimezoneIndicator: false,
        });

        // Return both times, userTime is null if same as local
        return {
          localTime,
          userTime: localTime !== userTime ? userTime : null
        };
      }

      // Fallback: try to use the provided dateTimeString with timezone awareness
      if (dateTimeString) {
        const localTime = formatTimeWithTimezoneSync(dateTimeString, {
          tournamentTimezone: tournamentTimezone || 'UTC',
          cachedPreference: 'local',
          showTimezoneIndicator: false,
        });

        const userTime = formatTimeWithTimezoneSync(dateTimeString, {
          tournamentTimezone: tournamentTimezone || 'UTC',
          cachedPreference: 'user',
          showTimezoneIndicator: false,
        });

        return {
          localTime,
          userTime: localTime !== userTime ? userTime : null
        };
      }

      return { localTime: 'TBD', userTime: null };
    } catch (error) {
      console.warn('Error formatting time in MatchCard:', error);
      // Ultimate fallback to legacy formatter
      try {
        const date = new Date(dateTimeString);
        const fallbackTime = date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        return { localTime: fallbackTime, userTime: null };
      } catch {
        return { localTime: 'TBD', userTime: null };
      }
    }
  };

  // Get round prefix for gender badge (Q for qualification/rounds 1&2)
  const getRoundPrefix = (match: BeachMatchCore): string => {
    const rawMatch = (match as any);
    const roundPhase = rawMatch.phase || rawMatch.Phase || rawMatch.RoundPhase;
    const round = match.round || rawMatch.Round;
    const roundName = match.roundName || rawMatch.RoundName;

    // Check for qualification matches (VIS API standard)
    if (roundPhase === '1') return 'Q';

    // Check for qualification keywords
    const qualificationKeywords = /qualification|qual/i;
    if (round && qualificationKeywords.test(round)) return 'Q';
    if (roundName && qualificationKeywords.test(roundName)) return 'Q';

    // Check for Round 1 and Round 2 - both get Q prefix
    if (round) {
      const roundStr = round.toString().toLowerCase();
      if (roundStr === '1' || roundStr === 'round 1' || roundStr === 'r1') return 'Q';
      if (roundStr === '2' || roundStr === 'round 2' || roundStr === 'r2') return 'Q';
    }

    if (roundName) {
      const roundNameStr = roundName.toString().toLowerCase();
      if (roundNameStr.includes('round 1') || roundNameStr === 'r1') return 'Q';
      if (roundNameStr.includes('round 2') || roundNameStr === 'r2') return 'Q';
    }

    // Default: no prefix
    return '';
  };

  // Check if match is live
  const isMatchLive = (match: BeachMatchCore): boolean => {
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

  // Check if this is a qualification match
  const isQualificationMatch = (match: BeachMatchCore): boolean => {
    const rawMatch = match as any;
    const roundPhase = rawMatch.phase || rawMatch.Phase || rawMatch.RoundPhase;
    const round = match.round || rawMatch.Round;
    const roundName = match.roundName || rawMatch.RoundName;

    // Check RoundPhase "1" (VIS API standard for qualification)
    if (roundPhase === '1') return true;

    // Check round/roundName content for qualification keywords
    const qualificationKeywords = /qualification|qual/i;
    if (round && qualificationKeywords.test(round)) return true;
    if (roundName && qualificationKeywords.test(roundName)) return true;

    return false;
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
        // Check if it's specifically a Bronze Medal match
        else if (roundName.toLowerCase().includes('bronze') ||
                 roundName.toLowerCase().includes('third place') ||
                 roundName.toLowerCase().includes('3rd place')) {
          return {
            round: 'BRONZE',
            phase: rawMatch.phase || rawMatch.Phase || rawMatch.RoundPhase
          };
        }
        // Other finals (regular finals, semifinals, etc.) use the name as-is
        else {
          return {
            round: roundName,
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
  const isQualification = isQualificationMatch(match);

  const matchWithResult = match; // Use match as-is for now


  return (
    <View>
      <TouchableOpacity
        style={[
          styles.matchCard,
          variant === 'live' && styles.liveCard,
          isQualification && styles.qualificationCard,
        ]}
        onPress={() => onPress?.(match)}
        activeOpacity={0.7}
      >
        {/* Top band for women's matches */}
        {(match as any).tournamentGender === 'W' && (
          <View style={styles.womenTopBand} />
        )}

        {/* Match Header - with gender badge and time/court */}
        <View style={styles.matchHeader}>
          <View style={styles.leftBadgeContainer}>
            {isQualification && (
              <View style={styles.qualificationBadge}>
                <Text style={styles.qualificationBadgeText}>
                  QUAL
                </Text>
              </View>
            )}
            {(match as any).tournamentGender && (
              <View style={[
                styles.genderBadge,
                (match as any).tournamentGender === 'M' ? styles.menBadge : styles.womenBadge,
                isQualification && styles.qualificationGenderBadge
              ]}>
                <Text style={[
                  styles.genderBadgeText,
                  (match as any).tournamentGender === 'M' ? styles.menBadgeText : styles.womenBadgeText
                ]}>
                  {getRoundPrefix(match)}{(match as any).tournamentGender}{(match as any).noInTournament || match.matchCode}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.timeCourtContainer}>
            <View style={styles.timeContainer}>
              <Text style={styles.courtText}>
                {match.court?.courtNumber ? (
                  match.court.courtNumber === 'CC' ? 'CC' : `C${match.court.courtNumber}`
                ) : 'TBD'}
              </Text>
              <View style={styles.timeDisplayContainer}>
                {(() => {
                  // FIXED: Treat scheduledDateTime as local tournament time, calculate user time
                  const timeDisplay = match.scheduledDateTime ? (() => {
                    // Step 1: scheduledDateTime is already correct local tournament time
                    const localTime = new Date(match.scheduledDateTime).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    });

                    // Step 2: Calculate user's timezone time if different from tournament timezone
                    let userTime = null;
                    if (tournamentTimezone) {
                      try {
                        // Create a date as if it's in the tournament timezone
                        const matchDateTime = match.scheduledDateTime;

                        // If we have UTC components from VIS API, use them for accurate conversion
                        if ((match as any).utcDate && (match as any).utcTime) {
                          const utcDateTime = `${(match as any).utcDate}T${(match as any).utcTime}Z`;
                          const userTimeFormatted = new Date(utcDateTime).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          });

                          // Only show if different from local time
                          if (userTimeFormatted !== localTime) {
                            userTime = userTimeFormatted;
                          }
                        }
                      } catch (error) {
                        console.warn('Error calculating user time:', error);
                      }
                    }

                    return { localTime, userTime };
                  })() : { localTime: 'TBD', userTime: null };
                  return (
                    <>
                      <Text style={styles.matchTime}>
                        {timeDisplay.localTime}
                      </Text>
                      {timeDisplay.userTime && (
                        <Text style={styles.userTime}>
                          {timeDisplay.userTime}
                        </Text>
                      )}
                    </>
                  );
                })()}
              </View>

              {/* Status display - positioned closer to the right of time */}
              <Text style={{fontSize: 10, color: '#666', fontFamily: 'monospace', textAlign: 'right', minWidth: 60, marginLeft: 4}}>
                {(() => {
                  const rawStatus = (match as any)?.rawStatus;
                  if (typeof rawStatus === 'number') {
                    if (rawStatus >= 9) {
                      return 'Closed';
                    }
                    const statusText = {
                      1: 'Scheduled',
                      2: 'Ready to Start',
                      3: 'InSet1',
                      4: 'Set1Finished',
                      5: 'InSet2',
                      6: 'Set2Finished',
                      7: 'InSet3',
                      8: 'Set3Finished'
                    }[rawStatus] || 'Unknown';
                    return statusText;
                  }
                  return typeof match.status === 'string' ? match.status : `#${match.status}`;
                })()}
              </Text>
            </View>
          </View>

          <View style={styles.rightBadgeContainer}>
            {roundData && (
              <RoundPhaseDisplay
                round={roundData.round}
                phase={roundData.phase}
                style={styles.roundBadge}
              />
            )}
          </View>
        </View>

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
                <View style={styles.scoreAndDurationRow}>
                  <View style={styles.resultContainer}>
                    <View>
                      <Text style={[
                        styles.resultScore,
                        matchWithResult.result.winner === 1 && styles.winnerScore,
                        isLive && styles.liveScore
                      ]}>
                        {matchWithResult.result.team1Sets}
                      </Text>
                    </View>
                    <Text style={styles.scoreSeparator}>-</Text>
                    <View>
                      <Text style={[
                        styles.resultScore,
                        matchWithResult.result.winner === 2 && styles.winnerScore,
                        isLive && styles.liveScore
                      ]}>
                        {matchWithResult.result.team2Sets}
                      </Text>
                    </View>
                  </View>


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

                            sets.push(
                              <View key={setNumber} style={styles.individualSet}>
                                <Text style={[styles.setScore]}>
                                  {team1Score}
                                </Text>
                                <Text style={styles.setScoreSeparator}>-</Text>
                                <Text style={[styles.setScore]}>
                                  {team2Score}
                                </Text>
                              </View>
                            );
                          }
                        }
                      } else {
                        // Fallback to legacy BeachMatch format - simplified
                        const rawMatch = match as any;

                        // Set 1
                        if (rawMatch.PointsTeamASet1 && rawMatch.PointsTeamBSet1) {
                          const team1Score = parseInt(rawMatch.PointsTeamASet1);
                          const team2Score = parseInt(rawMatch.PointsTeamBSet1);

                          sets.push(
                            <View key={1} style={styles.individualSet}>
                              <Text style={styles.setScore}>{team1Score}</Text>
                              <Text style={styles.setScoreSeparator}>-</Text>
                              <Text style={styles.setScore}>{team2Score}</Text>
                            </View>
                          );
                        }
                      }

                      return sets;
                    })()}

                    {/* Score age indicator for LIVE matches - positioned next to set scores */}
                    {isMatchLive(match) && (
                      <Text style={{
                        fontSize: 10,
                        color: '#333',
                        fontFamily: 'monospace',
                        marginLeft: 8,
                        alignSelf: 'center'
                      }}>
                        {formatScoreAge(scoreAge)}
                      </Text>
                    )}
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

        <View style={styles.teamsContainer}>
          <View style={styles.teamsRow}>
            <View style={styles.teamSection}>
              <Text style={[styles.teamName, styles.leftTeamName]} numberOfLines={2}>
                {match.team1?.teamName || 'Team A'}
                {(match as any).teamAPositionInMainDraw && ` (${(match as any).teamAPositionInMainDraw})`}
              </Text>
            </View>

            <View style={styles.teamSection}>
              <Text style={[styles.teamName, styles.rightTeamName]} numberOfLines={2}>
                {match.team2?.teamName || 'Team B'}
                {(match as any).teamBPositionInMainDraw && ` (${(match as any).teamBPositionInMainDraw})`}
              </Text>
            </View>
          </View>
        </View>

        {/* Referees Section - Original version with text node fix */}
        {(() => {
          const rawMatch = match as any;
          const hasRefereeAssignments = match.refereeAssignments && match.refereeAssignments.length > 0;
          const hasLegacyReferees = rawMatch.Referee1Name || rawMatch.Referee2Name;

          return hasRefereeAssignments || hasLegacyReferees;
        })() ? (
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
                        <Text style={styles.refereeName}>{referee.refereeName}</Text>
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
                        <Text style={styles.refereeName}>{rawMatch.Referee1Name}</Text>
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
                        <Text style={styles.refereeName}>{rawMatch.Referee2Name}</Text>
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
                        <Text style={styles.refereeName}>{rawMatch.ChallengeRefereeName}</Text>
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
        ) : null}
      </TouchableOpacity>
    </View>
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
    ...shadowPresets.card,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
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
    fontSize: 14,
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
  timeDisplayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B365D',
    textAlign: 'center',
  },
  userTime: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 1,
  },
  courtText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    marginRight: 8,
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
  // Live Score Animation Styles (Story 002)
  liveIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  liveScore: {
    color: colors.success,
    fontWeight: '700',
    ...createTextShadow({
      textShadowColor: colors.success,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 2,
    }),
  },
  roundBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Qualification match styles
  qualificationCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B', // Amber/orange for qualification
    backgroundColor: '#FFFBEB', // Very light amber background
  },
  qualificationBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  qualificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  qualificationGenderBadge: {
    borderColor: '#F59E0B',
    borderWidth: 1,
  },
});
