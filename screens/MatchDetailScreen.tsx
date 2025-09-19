import * as React from 'react';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { BeachMatchDTO, BeachMatchLiveDTO, isValidBeachMatchDTO, isValidBeachMatchLiveDTO } from '../types/match-details-dto';
import { BeachLive } from '../types/beach-live';
import { formatTime, formatDateLong, formatTimeWithTimezoneSync } from '../utils/dateFormatters';
import { FlagImage } from '../components/FlagImage';
import { RoundPhaseDisplay } from '../components/Typography/RoundPhaseDisplay';
import { LiveIndicator } from '../components/Status/LiveIndicator';
import { Card } from '../components/Foundation/Container';
import { colors, spacing, typography } from '../theme/tokens';
import { shadowPresets } from '../theme/shadows';
import { BeachMatchService } from '../services/BeachMatchService';
import { LiveScorePollingService } from '../services/live-score/LiveScorePollingService';

// Interface for the new dual-data state structure
interface MatchDetailState {
  // Stable match metadata (loaded once/rarely updated)
  baseMatch: BeachMatchDTO | null;

  // Live polling data (updated frequently during live matches)
  liveData: BeachMatchLiveDTO | null;

  // Component state
  loading: boolean;
  error: string | null;

  // Polling state
  isPollingActive: boolean;
  lastLiveUpdate: string | null;
  pollingError: string | null;

  // Performance optimization
  renderKey: string;
}

// Legacy support interface
interface LegacyMatchData {
  legacyMatch: MatchResult | BeachMatchCore | null;
}

export default function MatchDetailScreen() {
  const router = useRouter();
  const {
    matchNo,
    tournamentNo,
    matchData // Legacy parameter for direct BeachMatchCore data from MatchCard
  } = useLocalSearchParams<{
    matchNo: string;
    tournamentNo: string;
    matchData?: string; // JSON stringified BeachMatchCore
  }>();

  // New dual-data state structure
  const [state, setState] = useState<MatchDetailState>({
    baseMatch: null,
    liveData: null,
    loading: true,
    error: null,
    isPollingActive: false,
    lastLiveUpdate: null,
    pollingError: null,
    renderKey: `initial-${Date.now()}`
  });

  // Legacy state for backward compatibility during transition
  const [legacyData, setLegacyData] = useState<LegacyMatchData>({
    legacyMatch: null
  });

  // Service instances
  const beachMatchService = useRef(BeachMatchService.getInstance());
  const pollingService = useRef(LiveScorePollingService.getInstance());
  const pollingCleanup = useRef<(() => void) | null>(null);

  // Initialize data loading
  useEffect(() => {
    if (matchNo && tournamentNo) {
      loadMatchDetail();
    }

    // Cleanup polling on unmount
    return () => {
      if (pollingCleanup.current) {
        pollingCleanup.current();
        pollingCleanup.current = null;
      }
    };
  }, [matchNo, tournamentNo]);

  // Monitor base match for live polling initialization
  useEffect(() => {
    if (state.baseMatch && shouldStartLivePolling(state.baseMatch)) {
      startLivePolling(state.baseMatch.no);
    }
  }, [state.baseMatch?.no, state.baseMatch?.status]);

  // Stop polling when match ends
  useEffect(() => {
    if (state.liveData?.status && isMatchFinished(state.liveData.status)) {
      if (pollingCleanup.current) {
        pollingCleanup.current();
        pollingCleanup.current = null;
      }
    }
  }, [state.liveData?.status]);

  /**
   * Load base match data using BeachMatchService
   */
  const loadMatchDetail = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const matchNumberId = parseInt(matchNo);
      if (!matchNumberId || isNaN(matchNumberId)) {
        throw new Error('Invalid match number');
      }

      // Handle legacy matchData parameter for backward compatibility
      if (matchData) {
        try {
          const parsedMatch = JSON.parse(matchData) as BeachMatchCore;
          // Convert legacy data to new state structure
          setLegacyData({ legacyMatch: parsedMatch });
          setState(prev => ({
            ...prev,
            loading: false,
            renderKey: `legacy-${Date.now()}`
          }));
          return;
        } catch (parseError) {
          console.warn('Failed to parse legacy matchData, falling back to new DTO system');
        }
      }

      // Load stable match data using BeachMatchService
      const baseMatch = await beachMatchService.current.getMatch(matchNumberId);

      setState(prev => ({
        ...prev,
        baseMatch,
        loading: false,
        renderKey: `base-${Date.now()}`
      }));

    } catch (error) {
      console.error('Failed to load match detail:', error);
      setState(prev => ({
        ...prev,
        error: `Failed to load match details: ${error.message}`,
        loading: false
      }));
    }
  };

  /**
   * Start live polling for matches that need it
   */
  const startLivePolling = useCallback((matchNo: number) => {
    if (state.isPollingActive) {
      console.log('Polling already active for match', matchNo);
      return;
    }

    console.log('Starting live polling for match', matchNo);

    const pollingCallback = (liveData: BeachLive, error?: Error) => {
      if (error) {
        handlePollingError(error);
        return;
      }

      const transformedLiveData = transformBeachLiveToDTO(liveData);
      updateLiveData(transformedLiveData);
    };

    // Start polling with adaptive intervals
    pollingService.current.startPolling(
      matchNo,
      pollingCallback,
      [], // No filtering options for match details
      true // Enable adaptive polling
    );

    setState(prev => ({ ...prev, isPollingActive: true }));

    // Store cleanup function
    pollingCleanup.current = () => {
      console.log('Stopping live polling for match', matchNo);
      pollingService.current.stopPolling(matchNo);
      setState(prev => ({ ...prev, isPollingActive: false }));
    };
  }, [state.isPollingActive]);

  /**
   * Transform BeachLive data to BeachMatchLiveDTO
   */
  const transformBeachLiveToDTO = useCallback((beachLive: BeachLive): BeachMatchLiveDTO => {
    const currentSet = getCurrentSetFromBeachLive(beachLive);

    return {
      status: beachLive.match.status,
      currentSet: currentSet?.no,
      points: {
        a: currentSet?.pointsTeamA ?? null,
        b: currentSet?.pointsTeamB ?? null
      },
      teamServing: beachLive.noServingTeam === 1 ? "A" :
                   beachLive.noServingTeam === 2 ? "B" : null,
      timeouts: {
        a: beachLive.teamA.timeoutsRemaining || 0,
        b: beachLive.teamB.timeoutsRemaining || 0
      },
      lastUpdate: new Date().toISOString(),
      closedSets: extractClosedSetsFromBeachLive(beachLive.sets),
      liveFeed: {
        available: !!beachLive.events,
        events: beachLive.events?.map(event => ({
          set: event.setNo,
          action: event.type,
          detail: event.description,
          scoreAfter: parseEventScore(event.scoreAfter),
          ts: event.timestamp,
          servingTeam: event.teamNo === 1 ? "A" : event.teamNo === 2 ? "B" : null
        }))
      }
    };
  }, []);

  /**
   * Update live data with optimization for frequent updates
   */
  const updateLiveData = useCallback((liveData: BeachMatchLiveDTO) => {
    setState(prev => {
      // Skip update if data hasn't actually changed
      if (prev.lastLiveUpdate === liveData.lastUpdate) {
        return prev;
      }

      return {
        ...prev,
        liveData,
        lastLiveUpdate: liveData.lastUpdate,
        pollingError: null, // Clear any previous polling errors
        renderKey: `live-${Date.now()}`
      };
    });
  }, []);

  /**
   * Handle polling errors with graceful degradation
   */
  const handlePollingError = useCallback((error: Error) => {
    console.warn('Live polling error:', error.message);

    setState(prev => ({
      ...prev,
      pollingError: `Live updates temporarily unavailable: ${error.message}`
    }));
  }, []);

  /**
   * Helper functions
   */
  const shouldStartLivePolling = (baseMatch: BeachMatchDTO): boolean => {
    if (!baseMatch) return false;

    // Check if match status indicates live activity
    const status = baseMatch.status.toLowerCase();
    return status.includes('inset') ||
           status.includes('running') ||
           status === 'ready';
  };

  const isMatchFinished = (status: string): boolean => {
    const lowerStatus = status.toLowerCase();
    return lowerStatus.includes('finished') ||
           lowerStatus.includes('final') ||
           lowerStatus.includes('closed');
  };

  const getCurrentSetFromBeachLive = (beachLive: BeachLive) => {
    return beachLive.sets?.find(set => !set.finished);
  };

  const extractClosedSetsFromBeachLive = (sets: any[]): Array<{ set: number; a: number; b: number }> => {
    if (!sets) return [];

    return sets
      .filter(set => set.finished)
      .map(set => ({
        set: set.no,
        a: set.pointsTeamA,
        b: set.pointsTeamB
      }));
  };

  const parseEventScore = (scoreString?: string): { a: number; b: number } | undefined => {
    if (!scoreString) return undefined;

    const match = scoreString.match(/(\d+)[:-](\d+)/);
    if (match) {
      return {
        a: parseInt(match[1]),
        b: parseInt(match[2])
      };
    }
    return undefined;
  };

  const handleRefresh = () => {
    loadMatchDetail();
  };

  const handleGoBack = () => {
    router.back();
  };

  /**
   * Merge stable and live data for rendering
   */
  const getMergedMatchData = useMemo(() => {
    // Legacy support for backward compatibility
    if (legacyData.legacyMatch) {
      return {
        type: 'legacy' as const,
        data: legacyData.legacyMatch,
        isLive: false, // Legacy data is not live
        live: null
      };
    }

    // New DTO system
    if (!state.baseMatch) {
      return null;
    }

    return {
      type: 'dto' as const,
      data: {
        // Base data (stable)
        ...state.baseMatch,

        // Override with live data where available
        status: state.liveData?.status || state.baseMatch.status,

        // Sets: merge closed sets + current set
        sets: [
          ...(state.liveData?.closedSets || state.baseMatch.sets || []),
          ...(state.liveData?.currentSet && state.liveData.points.a !== null ? [{
            set: state.liveData.currentSet,
            a: state.liveData.points.a,
            b: state.liveData.points.b,
            isLive: true
          }] : [])
        ]
      },
      isLive: !!state.liveData && !isMatchFinished(state.liveData.status),
      live: state.liveData
    };
  }, [state.baseMatch, state.liveData, legacyData.legacyMatch, state.renderKey]);

  // Helper function to determine if match is BeachMatchCore type (legacy)
  const isBeachMatchCore = (match: MatchResult | BeachMatchCore): match is BeachMatchCore => {
    return 'team1' in match && 'team2' in match && 'court' in match;
  };

  // Helper function to check if match is live (legacy)
  const isMatchLive = (match?: MatchResult | BeachMatchCore | any): boolean => {
    if (!match) return false;

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

  // New helper for DTO system
  const isMatchLiveNew = (): boolean => {
    const mergedData = getMergedMatchData;
    return mergedData?.isLive || false;
  };

  // Get unified status text - supports both legacy and new DTO system
  const getStatusText = (): string => {
    const mergedData = getMergedMatchData;
    if (!mergedData) return 'UNKNOWN';

    if (mergedData.type === 'legacy') {
      const match = mergedData.data;
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
    } else {
      // New DTO system
      const status = mergedData.data.status;

      if (mergedData.isLive) {
        // Live match - check current set
        if (state.liveData?.currentSet) {
          return `IN SET ${state.liveData.currentSet}`;
        }
        return 'LIVE';
      }

      // Map DTO status to display text
      switch (status.toLowerCase()) {
        case 'scheduled':
          return 'SCHEDULED';
        case 'ready':
          return 'READY';
        case 'inset1':
          return 'IN SET 1';
        case 'set1done':
          return 'SET 1 DONE';
        case 'inset2':
          return 'IN SET 2';
        case 'set2done':
          return 'SET 2 DONE';
        case 'inset3':
          return 'IN SET 3';
        case 'set3done':
          return 'SET 3 DONE';
        case 'finished':
          return 'FINAL';
        case 'cancelled':
          return 'CANCELLED';
        default:
          return status.toUpperCase();
      }
    }
  };

  const getStatusBadgeStyle = () => {
    const mergedData = getMergedMatchData;
    if (!mergedData) {
      return { ...styles.statusBadge, backgroundColor: colors.textSecondary };
    }

    const statusText = getStatusText();
    const isLive = mergedData.isLive;

    if (isLive) {
      return { ...styles.statusBadge, backgroundColor: colors.success };
    }

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
    const mergedData = getMergedMatchData;
    if (!mergedData) return null;

    let teamAPoints = 0;
    let teamBPoints = 0;

    if (mergedData.type === 'legacy') {
      const match = mergedData.data;
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
    } else {
      // New DTO system
      const sets = mergedData.data.sets || [];
      const currentSet = sets.find(set => set.set === setNumber);
      if (currentSet) {
        teamAPoints = currentSet.a;
        teamBPoints = currentSet.b;
      }
    }

    // Don't render if set wasn't played
    if (teamAPoints === 0 && teamBPoints === 0 && setNumber > 1) {
      return null;
    }

    const teamAWon = teamAPoints > teamBPoints && (teamAPoints >= 21 || teamBPoints >= 21);
    const teamBWon = teamBPoints > teamAPoints && (teamBPoints >= 21 || teamAPoints >= 21);
    const isCurrentSet = mergedData.isLive && setNumber === getCurrentSetNumber();

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
    const mergedData = getMergedMatchData;
    if (!mergedData || !mergedData.isLive) return -1;

    if (mergedData.type === 'legacy') {
      const match = mergedData.data;
      if (isBeachMatchCore(match)) {
        const rawStatus = (match as any)?.rawStatus;
        if (typeof rawStatus === 'number') {
          if (rawStatus === 3) return 1; // Currently in set 1
          if (rawStatus === 5) return 2; // Currently in set 2
          if (rawStatus === 7) return 3; // Currently in set 3
        }
      }
    } else {
      // New DTO system
      if (state.liveData?.currentSet) {
        return state.liveData.currentSet;
      }
    }

    return 1; // Default to set 1
  };

  // Check loading state
  if (state.loading) {
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

  // Check error state or no data
  const mergedData = getMergedMatchData;
  if (state.error || !mergedData) {
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
          <Text style={styles.errorText}>{state.error || 'No match data available'}</Text>
          <Text style={styles.errorSubtext}>Please try again</Text>
          {state.pollingError && (
            <Text style={styles.pollingErrorText}>{state.pollingError}</Text>
          )}
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
        {mergedData.isLive && (
          <View style={styles.liveIndicatorContainer}>
            <LiveIndicator />
            <Text style={styles.liveText}>LIVE MATCH</Text>
          </View>
        )}

        {/* Live polling error indicator */}
        {state.pollingError && (
          <View style={styles.pollingErrorContainer}>
            <Text style={styles.pollingErrorText}>{state.pollingError}</Text>
          </View>
        )}

        {/* Match Header Card - Tournament info and status */}
        <Card style={[
          styles.matchHeaderCard,
          mergedData.isLive && styles.liveCard
        ]}>
          {/* Top band for women's matches - consistent with MatchCard */}
          {((mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data) && (mergedData.data as any).tournamentGender === 'W') ||
            (mergedData.type === 'dto' && mergedData.data.tournamentGender === 'W')) && (
            <View style={styles.womenTopBand} />
          )}

          <View style={styles.matchHeaderContent}>
            {/* Left: Gender badge and match info */}
            <View style={styles.matchHeaderLeft}>
              <View style={styles.genderSection}>
                {mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data) ? (
                  <>
                    <View style={[
                      styles.genderBadge,
                      (mergedData.data as any).tournamentGender === 'M' ? styles.menBadge : styles.womenBadge
                    ]}>
                      <Text style={[
                        styles.genderBadgeText,
                        (mergedData.data as any).tournamentGender === 'M' ? styles.menBadgeText : styles.womenBadgeText
                      ]}>
                        {(mergedData.data as any).tournamentGender}{(mergedData.data as any).noInTournament || mergedData.data.matchCode}
                      </Text>
                    </View>
                    {mergedData.data.court && (
                      <Text style={styles.courtInfo}>
                        Court {mergedData.data.court.courtNumber === 'CC' ? 'CC' : `C${mergedData.data.court.courtNumber}`}
                      </Text>
                    )}
                  </>
                ) : mergedData.type === 'dto' ? (
                  <>
                    <View style={[
                      styles.genderBadge,
                      mergedData.data.tournamentGender === 'M' ? styles.menBadge : styles.womenBadge
                    ]}>
                      <Text style={[
                        styles.genderBadgeText,
                        mergedData.data.tournamentGender === 'M' ? styles.menBadgeText : styles.womenBadgeText
                      ]}>
                        {mergedData.data.tournamentGender}{mergedData.data.no}
                      </Text>
                    </View>
                    {mergedData.data.court && (
                      <Text style={styles.courtInfo}>
                        Court {mergedData.data.court === 'CC' ? 'CC' : `C${mergedData.data.court}`}
                      </Text>
                    )}
                  </>
                ) : null}
              </View>
            </View>

            {/* Center: Status */}
            <View style={styles.statusContainer}>
              <View style={getStatusBadgeStyle()}>
                <Text style={styles.statusText}>{getStatusText()}</Text>
              </View>
            </View>

            {/* Right: Round display */}
            <View style={styles.matchHeaderRight}>
              {mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data) && mergedData.data.roundName ? (
                <RoundPhaseDisplay
                  round={mergedData.data.roundName}
                  phase={(mergedData.data as any).Phase}
                  style={styles.roundBadge}
                />
              ) : mergedData.type === 'dto' && mergedData.data.roundName ? (
                <RoundPhaseDisplay
                  round={mergedData.data.roundName}
                  phase={mergedData.data.roundPhase}
                  style={styles.roundBadge}
                />
              ) : null}
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
  pollingErrorContainer: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  pollingErrorText: {
    ...typography.caption,
    color: '#92400E',
    fontWeight: '600',
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