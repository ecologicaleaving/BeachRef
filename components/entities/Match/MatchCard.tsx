import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  formatMatchTimeForUser,
  formatMatchTimeDetailed
} from '../../../utils/matchTimeFormatter';
import {
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
  tournamentData?: {
    city?: string;
    country?: string;
    countryCode?: string;
    name?: string;
    venue?: string;
    defaultTimeZone?: string;
  }; // Tournament location data for timezone detection
  liveScoreRefresh?: number; // For triggering score age reset on live score updates
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
  tournamentData,
  liveScoreRefresh,
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

  // Get live scores from match result - support both formats
  const getTeamScores = () => {
    // NEW: BeachMatchLiveDTO format
    const beachMatchDTO = match as any;
    if (beachMatchDTO.score?.sets) {
      let team1Wins = 0;
      let team2Wins = 0;

      for (const setScore of beachMatchDTO.score.sets) {
        const homeScore = setScore.home || 0;
        const awayScore = setScore.away || 0;

        // Determine set winner (21+ with 2-point lead, or 15+ in deciding set)
        if (homeScore >= 21 && homeScore - awayScore >= 2) {
          team1Wins++;
        } else if (awayScore >= 21 && awayScore - homeScore >= 2) {
          team2Wins++;
        }
      }

      return { team1Score: team1Wins, team2Score: team2Wins };
    }

    // LEGACY: Original format
    return {
      team1Score: match.result?.team1Sets || 0,
      team2Score: match.result?.team2Sets || 0
    };
  };

  const { team1Score, team2Score } = getTeamScores();

  // Track score age for LIVE matches
  const [scoreAge, setScoreAge] = useState<number>(0);
  const [lastScoreUpdate, setLastScoreUpdate] = useState<Date>(new Date());

  // Convert setScores array to string for proper dependency tracking
  // Support both legacy setScores format and new BeachMatchLiveDTO score.sets format
  const getScoresForTracking = () => {
    // New BeachMatchLiveDTO format
    if ((match as any).score?.sets) {
      return JSON.stringify((match as any).score.sets);
    }
    // Legacy format
    if (match.result?.setScores) {
      return JSON.stringify(match.result.setScores);
    }
    return '';
  };
  const setScoresString = getScoresForTracking();

  // Update score timestamp when scores change for LIVE matches
  useEffect(() => {
    if (isMatchLive(match)) {
      setLastScoreUpdate(new Date());
      setScoreAge(0);
    }
  }, [team1Score, team2Score, setScoresString, match.status, (match as any)?.rawStatus]);

  // Reset score age when live score refresh timer triggers (every 5 seconds)
  useEffect(() => {
    if (isMatchLive(match) && liveScoreRefresh !== undefined && liveScoreRefresh > 0) {
      console.log(`🔄 SCORE AGE RESET: Match ${match.id} - resetting to 0s due to fresh data (refresh: ${liveScoreRefresh})`);
      setLastScoreUpdate(new Date());
      setScoreAge(0);
    }
  }, [liveScoreRefresh]);


  // Score age counter for LIVE matches (updates every second)
  useEffect(() => {
    if (!isMatchLive(match)) return;

    const interval = setInterval(() => {
      const now = new Date();
      const ageInSeconds = Math.floor((now.getTime() - lastScoreUpdate.getTime()) / 1000);
      setScoreAge(ageInSeconds);
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
      // Prepare match data for the new timezone system
      const matchData = {
        scheduledDateTime: dateTimeString, // Local time according to user clarification
      };

      // Use provided tournament data for timezone detection
      const tournamentDataForConversion = tournamentData || {
        defaultTimeZone: tournamentTimezone,
      };

      // Get user's timezone time using the new system
      const userTime = formatMatchTimeForUser(matchData, {
        showTimezoneIndicator: false,
        tournamentData: tournamentDataForConversion
      });

      // For now, we'll show the same time as both local and user
      // The new system automatically handles timezone conversion to user time
      return {
        localTime: userTime, // Both show user time now
        userTime: null // No need for dual display since we show user time
      };
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

  // Get result type for display (only show if not "Normal")
  const getResultTypeDisplay = (): string | null => {
    // PRIORITY 1: Check the new resultType field from BeachMatchCore
    if (match.resultType && match.resultType !== 'Normal') {
      // Convert result type to display format
      switch (match.resultType) {
        case 'ForfeitA':
        case 'ForfeitB':
        case 'ForfeitBoth':
          return 'Forfeit';
        case 'InjuryA':
        case 'InjuryB':
        case 'InjuryBoth':
          return 'Injury';
        case 'OutA':
        case 'OutB':
        case 'OutBoth':
          return 'Withdrawal';
        case 'DisqualifiedA':
        case 'DisqualifiedB':
        case 'DisqualifiedBoth':
          return 'DQ';
        default:
          return match.resultType; // Show other result types as-is
      }
    }

    // LEGACY: Check BeachMatchLiveDTO format for compatibility
    const beachMatchDTO = match as any;
    const legacyResultType = beachMatchDTO.status?.resultType;

    if (legacyResultType && legacyResultType !== 'Normal') {
      // Convert result type to display format
      switch (legacyResultType) {
        case 'ForfeitA':
        case 'ForfeitB':
        case 'ForfeitBoth':
          return 'Forfeit';
        case 'InjuryA':
        case 'InjuryB':
        case 'InjuryBoth':
          return 'Injury';
        case 'OutA':
        case 'OutB':
        case 'OutBoth':
          return 'Withdrawal';
        case 'DisqualifiedA':
        case 'DisqualifiedB':
        case 'DisqualifiedBoth':
          return 'DQ';
        default:
          return legacyResultType; // Show other result types as-is
      }
    }

    // LEGACY: Check forfeit flag in match result
    if (match.result?.forfeit) {
      return 'Forfeit';
    }

    return null; // Don't show anything for normal results
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
        onPress={() => {
          // Call the existing onPress if provided
          onPress?.(match);

          // Navigate to match detail screen with correct VIS match number
          // Priority: visNo (pure VIS match number) > extracted from matchCode > fallback
          const visMatchNo = match.visNo || extractNumericFromString(match.matchCode) || extractNumericFromString(match.id) || 'unknown';
          const tournamentNo = (match as any).tournamentNo || 'demo';

          // Helper function to extract numeric part
          function extractNumericFromString(str?: string): string | null {
            if (!str) return null;
            const numericMatch = str.match(/\d+/);
            return numericMatch ? numericMatch[0] : null;
          }

          if (__DEV__) {
            console.log('[MatchCard] Navigation with VIS match number:', {
              visMatchNo,
              originalId: match.id,
              matchCode: match.matchCode,
              visNoField: match.visNo,
              extractedFromMatchCode: extractNumericFromString(match.matchCode),
              extractedFromId: extractNumericFromString(match.id),
              tournamentNo,
              finalURL: `/match-detail?matchNo=${visMatchNo}&tournamentNo=${tournamentNo}`
            });
          }

          router.push({
            pathname: '/match-detail',
            params: {
              matchNo: visMatchNo,  // Use VIS match number for direct polling
              tournamentNo,
              matchData: JSON.stringify(match)
            }
          });
        }}
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
{(() => {
              // DEBUG: Log what fields are available for first few matches
              const matchIndex = parseInt(match.visNo || '0');
              if (matchIndex <= 3) {
                console.log(`🏐 [DEBUG-MatchCard] Match ${match.visNo} badge fields:`, {
                  tournamentGender: (match as any).tournamentGender,
                  tournamentGenderText: (match as any).tournamentGenderText,
                  noInTournament: (match as any).noInTournament,
                  matchCode: match.matchCode,
                  hasGenderText: !!(match as any).tournamentGenderText
                });
              }

              // Use tournamentGenderText for display, fallback to raw value then 'M'
              const genderText = (match as any).tournamentGenderText || (match as any).tournamentGender || 'M';
              const matchNumber = (match as any).noInTournament || match.matchCode || match.visNo;

              return (
                <View style={[
                  styles.genderBadge,
                  genderText === 'M' ? styles.menBadge : styles.womenBadge,
                  isQualification && styles.qualificationGenderBadge
                ]}>
                  <Text style={[
                    styles.genderBadgeText,
                    genderText === 'M' ? styles.menBadgeText : styles.womenBadgeText
                  ]}>
                    {getRoundPrefix(match)}{genderText}{matchNumber}
                  </Text>
                </View>
              );
            })()}
          </View>

          <View style={styles.timeCourtContainer}>
            {/* Compact horizontal layout - Court, Time, Status close together */}
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8}}>
              {/* Court */}
              <Text style={styles.courtText}>
                {match.court?.courtNumber ? (
                  match.court.courtNumber === 'CC' ? 'CC' : `C${match.court.courtNumber}`
                ) : 'TBD'}
              </Text>

              {/* Time Display */}
              <View style={styles.timeDisplayContainer}>
                {(() => {
                  // Use enhanced timezone system for accurate "My Time" display
                  const timeDisplay = (() => {
                    // Try new timezone-safe structure first
                    const scheduled = (match as any).scheduled;

                    if (scheduled) {
                      // Display tournament local time (immune to browser timezone)
                      const localTime = scheduled.timeTournament; // "14:00:00" format
                      const displayTime = localTime.substring(0, 5); // "14:00"

                      // Calculate "My Time" using new timezone utilities
                      try {
                        // Prepare match data for timezone conversion
                        const matchData = {
                          // Use the UTC timestamp directly since epochMs is already correct
                          BeginDateTimeUtc: new Date(scheduled.epochMs).toISOString(),
                          // Also provide local time fields for enhanced detection
                          LocalDate: scheduled.dateTournament,
                          LocalTime: scheduled.timeTournament.substring(0, 5),
                          TournamentCity: (match as any).city || (match as any).venue,
                          TournamentCountry: (match as any).country,
                          TournamentCountryCode: (match as any).countryCode,
                          TournamentName: (match as any).tournamentName
                        };


                        const tournamentData = {
                          city: (match as any).city || (match as any).venue,
                          country: (match as any).country,
                          countryCode: (match as any).countryCode,
                          name: (match as any).tournamentName,
                          defaultTimeZone: tournamentTimezone || scheduled.tz
                        };

                        const userTime = formatMatchTimeForUser(matchData, {
                          showTimezoneIndicator: false,
                          tournamentData
                        });

                        // Show userTime for LIVE matches when timezone preference is 'user'
                        const isLiveMatch = match.status === MatchStatus.RUNNING;
                        const shouldShowMyTime = isLiveMatch && timezonePreference === 'user' && userTime;
                        const userTimeFormatted = shouldShowMyTime ? userTime : null;

                        // Debug logging for timezone issues
                        if (isLiveMatch) {
                          console.log('🕒 MatchCard timezone debug:', {
                            isLiveMatch,
                            timezonePreference,
                            userTime,
                            displayTime,
                            shouldShowMyTime,
                            userTimeFormatted,
                            tournamentCity: (match as any).city,
                            tournamentCountry: (match as any).country
                          });
                        }
                        return { localTime: displayTime, userTime: userTimeFormatted };

                      } catch (error) {
                        return { localTime: displayTime, userTime: null };
                      }
                    }

                    // Fallback for backward compatibility
                    if (match.scheduledDateTime) {
                      return getTimeDisplay(match.scheduledDateTime);
                    }

                    return { localTime: 'TBD', userTime: null };
                  })();

                  return (
                    <View style={{alignItems: 'center'}}>
                      <Text style={styles.matchTime}>
                        {timeDisplay.localTime}
                      </Text>
                      {timeDisplay.userTime && (
                        <Text style={styles.userTimeBelow}>
                          ({timeDisplay.userTime})
                        </Text>
                      )}
                    </View>
                  );
                })()}
              </View>

              {/* Status */}
              {(() => {
                const rawStatus = (match as any)?.rawStatus;
                const statusText = (() => {
                  if (typeof rawStatus === 'number') {
                    if (rawStatus >= 9) {
                      return 'Closed';
                    } else if (rawStatus >= 3 && rawStatus <= 8) {
                      return 'Live';
                    } else if (rawStatus === 2) {
                      return 'Ready';
                    } else if (rawStatus === 1) {
                      return 'Scheduled';
                    } else {
                      return `Status ${rawStatus}`;
                    }
                  }
                  return match.status || '';
                })();

                const resultTypeDisplay = getResultTypeDisplay();

                return (
                  <View style={styles.statusContainer}>
                    <Text style={styles.statusText}>
                      {statusText}
                    </Text>
                    {resultTypeDisplay && (
                      <View style={styles.inlineResultBadge}>
                        <Text style={styles.inlineResultText}>• {resultTypeDisplay}</Text>
                      </View>
                    )}
                  </View>
                );
              })()}
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
                {/* Main score row - simplified without duration to avoid overlap */}
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

                {/* Set Scores Display - check multiple sources */}
                {(() => {
                  // NEW: Check for BeachMatchLiveDTO format first
                  const beachMatchDTO = match as any;
                  if (beachMatchDTO.score?.sets && beachMatchDTO.score.sets.length > 0) {
                    return true;
                  }

                  // LEGACY: Check if we have setScores in result
                  if (matchWithResult.result?.setScores && matchWithResult.result.setScores.length >= 2) {
                    return true;
                  }

                  // LEGACY: Check BeachMatch format for individual set score fields
                  const rawMatch = match as any;
                  const hasLegacySetScores = (rawMatch.PointsTeamASet1 && rawMatch.PointsTeamBSet1) ||
                                            (rawMatch.PointsTeamASet2 && rawMatch.PointsTeamBSet2) ||
                                            (rawMatch.PointsTeamASet3 && rawMatch.PointsTeamBSet3);

                  return hasLegacySetScores;
                })() && (
                  <View style={styles.setScoresContainer}>
                    {(() => {
                      const sets = [];
                      const beachMatchDTO = match as any;

                      // NEW: Try BeachMatchLiveDTO format first (preferred)
                      if (beachMatchDTO.score?.sets && beachMatchDTO.score.sets.length > 0) {
                        const scoreSets = beachMatchDTO.score.sets;

                        // Determine current set for live matches
                        const getCurrentSetNumber = (): number => {
                          if (!isMatchLive(match)) return -1;

                          // Check status from DTO
                          const statusState = beachMatchDTO.status?.state;
                          if (statusState) {
                            if (statusState === 'InSet1') return 1;
                            if (statusState === 'InSet2') return 2;
                            if (statusState === 'InSet3') return 3;
                            if (statusState === 'InSet4') return 4;
                            if (statusState === 'InSet5') return 5;
                          }

                          // Fallback: Find last incomplete set
                          for (let i = 0; i < scoreSets.length; i++) {
                            const setScore = scoreSets[i];
                            const homeScore = setScore.home || 0;
                            const awayScore = setScore.away || 0;
                            const maxScore = Math.max(homeScore, awayScore);
                            const minScore = Math.min(homeScore, awayScore);

                            // Current set if: scores are close OR match is explicitly in this set
                            if (maxScore < 21 || (maxScore >= 21 && Math.abs(homeScore - awayScore) < 2)) {
                              return setScore.setNo;
                            }
                          }

                          return scoreSets.length > 0 ? scoreSets.length : 1;
                        };

                        const currentSetNumber = getCurrentSetNumber();

                        for (const setScore of scoreSets) {
                          const isCurrentSet = isMatchLive(match) && setScore.setNo === currentSetNumber;
                          const homeScore = setScore.home || 0;
                          const awayScore = setScore.away || 0;

                          // Skip empty sets unless it's the current live set
                          if (!isCurrentSet && homeScore === 0 && awayScore === 0) {
                            continue;
                          }

                          sets.push(
                            <View
                              key={`set-${setScore.setNo}`}
                              style={[
                                styles.setScore,
                                isCurrentSet && styles.currentSetScore
                              ]}
                            >
                              <Text style={[
                                styles.setScoreText,
                                isCurrentSet && styles.currentSetScoreText
                              ]}>
                                {homeScore}-{awayScore}
                              </Text>
                              {isCurrentSet && (
                                <View style={styles.liveIndicator}>
                                  <Text style={styles.liveIndicatorText}>●</Text>
                                </View>
                              )}
                            </View>
                          );
                        }
                      }

                      // LEGACY: Try to use result.setScores
                      else if (matchWithResult.result?.setScores && matchWithResult.result.setScores.length >= 2) {
                        const setScores = matchWithResult.result.setScores;

                        // Parse set scores: [set1_team1, set1_team2, set2_team1, set2_team2, ...]
                        const totalSets = Math.floor(setScores.length / 2);

                        // Determine current set for live matches
                        const getCurrentSetNumber = (): number => {
                          if (!isMatchLive(match)) return -1;

                          // Check VIS status for current set indication
                          const rawStatus = (match as any)?.rawStatus;
                          if (typeof rawStatus === 'number') {
                            // VIS status codes: 3=InSet1, 4=Set1Finished, 5=InSet2, 6=Set2Finished, 7=InSet3, 8=Set3Finished
                            if (rawStatus === 3) return 1; // Currently in set 1
                            if (rawStatus === 5) return 2; // Currently in set 2
                            if (rawStatus === 7) return 3; // Currently in set 3
                          }

                          // Fallback: determine based on set completion
                          // Find the last incomplete set (where both teams have scores but neither has won definitively)
                          for (let i = 0; i < setScores.length; i += 2) {
                            if (i + 1 < setScores.length) {
                              const team1Score = setScores[i];
                              const team2Score = setScores[i + 1];
                              const setNum = Math.floor(i / 2) + 1;

                              // If both teams have scores and the set isn't decisively won (e.g., 21+ vs <19), this might be current
                              if (team1Score > 0 || team2Score > 0) {
                                const maxScore = Math.max(team1Score, team2Score);
                                const minScore = Math.min(team1Score, team2Score);

                                // Current set if: scores are close OR match is explicitly in this set
                                if (maxScore < 21 || (maxScore >= 21 && Math.abs(team1Score - team2Score) < 2)) {
                                  return setNum;
                                }
                              }
                            }
                          }

                          // Default to last set with scores
                          return totalSets > 0 ? totalSets : 1;
                        };

                        const currentSetNumber = getCurrentSetNumber();

                        for (let i = 0; i < setScores.length; i += 2) {
                          if (i + 1 < setScores.length) {
                            const team1Score = setScores[i];
                            const team2Score = setScores[i + 1];
                            const setNumber = Math.floor(i / 2) + 1;
                            const isWinningSet = team1Score > team2Score ? 1 : team2Score > team1Score ? 2 : 0;
                            const isCurrentSet = isMatchLive(match) && setNumber === currentSetNumber;

                            sets.push(
                              <View key={setNumber} style={[
                                styles.individualSet,
                                isCurrentSet && styles.currentSet
                              ]}>
                                <Text style={[
                                  styles.setScore,
                                  isCurrentSet && styles.currentSetScore
                                ]}>
                                  {team1Score}
                                </Text>
                                <Text style={[
                                  styles.setScoreSeparator,
                                  isCurrentSet && styles.currentSetSeparator
                                ]}>-</Text>
                                <Text style={[
                                  styles.setScore,
                                  isCurrentSet && styles.currentSetScore
                                ]}>
                                  {team2Score}
                                </Text>
                              </View>
                            );
                          }
                        }
                      } else {
                        // Fallback to legacy BeachMatch format - simplified
                        const rawMatch = match as any;

                        // Determine current set for legacy format
                        const getCurrentSetNumberLegacy = (): number => {
                          if (!isMatchLive(match)) return -1;

                          const rawStatus = (match as any)?.rawStatus;
                          if (typeof rawStatus === 'number') {
                            if (rawStatus === 3) return 1; // Currently in set 1
                            if (rawStatus === 5) return 2; // Currently in set 2
                            if (rawStatus === 7) return 3; // Currently in set 3
                          }

                          // Default to set 1 for legacy format if live
                          return 1;
                        };

                        const currentSetNumber = getCurrentSetNumberLegacy();

                        // Set 1
                        if (rawMatch.PointsTeamASet1 && rawMatch.PointsTeamBSet1) {
                          const team1Score = parseInt(rawMatch.PointsTeamASet1);
                          const team2Score = parseInt(rawMatch.PointsTeamBSet1);
                          const isCurrentSet = isMatchLive(match) && currentSetNumber === 1;

                          sets.push(
                            <View key={1} style={[
                              styles.individualSet,
                              isCurrentSet && styles.currentSet
                            ]}>
                              <Text style={[
                                styles.setScore,
                                isCurrentSet && styles.currentSetScore
                              ]}>{team1Score}</Text>
                              <Text style={[
                                styles.setScoreSeparator,
                                isCurrentSet && styles.currentSetSeparator
                              ]}>-</Text>
                              <Text style={[
                                styles.setScore,
                                isCurrentSet && styles.currentSetScore
                              ]}>{team2Score}</Text>
                            </View>
                          );
                        }

                        // Set 2
                        if (rawMatch.PointsTeamASet2 && rawMatch.PointsTeamBSet2) {
                          const team1Score = parseInt(rawMatch.PointsTeamASet2);
                          const team2Score = parseInt(rawMatch.PointsTeamBSet2);
                          const isCurrentSet = isMatchLive(match) && currentSetNumber === 2;

                          sets.push(
                            <View key={2} style={[
                              styles.individualSet,
                              isCurrentSet && styles.currentSet
                            ]}>
                              <Text style={[
                                styles.setScore,
                                isCurrentSet && styles.currentSetScore
                              ]}>{team1Score}</Text>
                              <Text style={[
                                styles.setScoreSeparator,
                                isCurrentSet && styles.currentSetSeparator
                              ]}>-</Text>
                              <Text style={[
                                styles.setScore,
                                isCurrentSet && styles.currentSetScore
                              ]}>{team2Score}</Text>
                            </View>
                          );
                        }

                        // Set 3
                        if (rawMatch.PointsTeamASet3 && rawMatch.PointsTeamBSet3) {
                          const team1Score = parseInt(rawMatch.PointsTeamASet3);
                          const team2Score = parseInt(rawMatch.PointsTeamBSet3);
                          const isCurrentSet = isMatchLive(match) && currentSetNumber === 3;

                          sets.push(
                            <View key={3} style={[
                              styles.individualSet,
                              isCurrentSet && styles.currentSet
                            ]}>
                              <Text style={[
                                styles.setScore,
                                isCurrentSet && styles.currentSetScore
                              ]}>{team1Score}</Text>
                              <Text style={[
                                styles.setScoreSeparator,
                                isCurrentSet && styles.currentSetSeparator
                              ]}>-</Text>
                              <Text style={[
                                styles.setScore,
                                isCurrentSet && styles.currentSetScore
                              ]}>{team2Score}</Text>
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

                {/* Duration and Result Type below set scores to avoid overlap */}
                {(() => {
                  const totalDuration = getMatchDuration(match);
                  const resultTypeDisplay = getResultTypeDisplay();

                  return (totalDuration || resultTypeDisplay) ? (
                    <View style={styles.durationAndResultContainer}>
                      {totalDuration && (
                        <Text style={styles.durationText}>({totalDuration})</Text>
                      )}
                      {resultTypeDisplay && (
                        <Text style={styles.resultTypeText}>({resultTypeDisplay})</Text>
                      )}
                    </View>
                  ) : null;
                })()}
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
  userTimeBelow: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151', // Più scuro del precedente #6B7280
    textAlign: 'center',
    marginTop: 2,
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
  statusContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
  },
  inlineResultBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginTop: 2,
  },
  inlineResultText: {
    fontSize: 8,
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
  currentSet: {
    backgroundColor: '#374151', // Dark gray background for current set in live matches
    borderWidth: 1,
    borderColor: '#4B5563',
    paddingHorizontal: 8,
    paddingVertical: 3,
    transform: [{ scale: 1.1 }], // Make it 10% bigger
  },
  setScore: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  currentSetScore: {
    fontSize: 13, // Slightly bigger font for current set (was 11, now 13 = ~18% increase)
    fontWeight: '700', // Slightly bolder weight
    color: '#D1D5DB', // Light gray text on dark gray background
  },
  setScoreSeparator: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    marginHorizontal: 3,
  },
  currentSetSeparator: {
    fontSize: 12, // Slightly bigger separator for current set (was 10, now 12 = 20% increase)
    fontWeight: '600',
    color: '#D1D5DB', // Light gray separator on dark gray background
    marginHorizontal: 4,
  },
  activeSetScore: {
    color: '#111827',
    fontWeight: '700',
  },
  winningSetScore: {
    color: '#059669',
    fontWeight: '700',
  },
  durationAndResultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  resultTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626', // Red color to indicate non-normal result
    textAlign: 'center',
    fontStyle: 'italic',
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

