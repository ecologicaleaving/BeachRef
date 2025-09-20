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
import { BeachLive, BeachSetStatus } from '../types/beach-live';
import { formatTime, formatDateLong, formatTimeWithTimezoneSync } from '../utils/dateFormatters';
import { FlagImage } from '../components/FlagImage';
import { RoundPhaseDisplay } from '../components/Typography/RoundPhaseDisplay';
import { LiveIndicator } from '../components/Status/LiveIndicator';
import { Card } from '../components/Foundation/Container';
import { NavigationHeader } from '../components/navigation/NavigationHeader';
import { colors, spacing, typography } from '../theme/tokens';
import { shadowPresets } from '../theme/shadows';
import { BeachMatchService } from '../services/BeachMatchService';
import { LiveScorePollingService, createLiveScorePollingService } from '../services/live-score/LiveScorePollingService';
import { VisApiClient } from '../services/api/VisApiClient';
import { DEFAULT_RETRY_CONFIG } from '../types/api-v2';
import { ConnectionCircuitBreaker } from '../services/ConnectionCircuitBreaker';

function extractNumericIdentifier(...values: Array<unknown>): number | null {
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }

    const raw = String(value).trim();

    // Handle pure numeric strings first
    if (/^\d+$/.test(raw)) {
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
      continue;
    }

    // Handle legacy composite match IDs like "8243_courtcc_1758366000000_31"
    // Extract the last numeric part after final underscore (likely the actual match number)
    const lastNumericMatch = raw.match(/_(\d+)$/);
    if (lastNumericMatch) {
      const parsed = Number.parseInt(lastNumericMatch[1], 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }

    // Extract the first numeric part before underscore (fallback - might be tournament number)
    const firstNumericMatch = raw.match(/^(\d+)_/);
    if (firstNumericMatch) {
      const parsed = Number.parseInt(firstNumericMatch[1], 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }

    // Extract any numeric sequence from the string as fallback
    const anyNumericMatch = raw.match(/\d+/);
    if (anyNumericMatch) {
      const parsed = Number.parseInt(anyNumericMatch[0], 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return null;
}

const DEFAULT_VIS_BASE_URL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';
const DEFAULT_VIS_TIMEOUT_MS = 15000;
const BACK_BUTTON_LABEL = '\u2190 Back';

function resolveVisApiBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_VIS_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_VIS_API_BASE_URL;
  }
  return DEFAULT_VIS_BASE_URL;
}

function resolveVisApiTimeout(): number {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_TIMEOUT) {
    const parsed = Number(process.env.EXPO_PUBLIC_API_TIMEOUT);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_VIS_TIMEOUT_MS;
}


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

  if (__DEV__) {
    console.log('[MatchDetail] route params', { matchNo, tournamentNo, hasLegacy: !!matchData });
  }

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
  const pollingService = useRef<LiveScorePollingService | null>(null);
  const pollingCleanup = useRef<(() => void) | null>(null);
  const visApiClientRef = useRef<VisApiClient | null>(null);
  const pollingCircuitBreakerRef = useRef<ConnectionCircuitBreaker | null>(null);

  const resolveVisApiClient = useCallback((): VisApiClient => {
    if (!visApiClientRef.current) {
      visApiClientRef.current = new VisApiClient(
        {
          baseUrl: resolveVisApiBaseUrl(),
          timeoutMs: resolveVisApiTimeout(),
          maxRetries: 3,
          retryDelayMs: 1000,
          exponentialBackoff: true,
          enableLogging: false,
        },
        DEFAULT_RETRY_CONFIG
      );
    }
    return visApiClientRef.current;
  }, []);

  const resolvePollingCircuitBreaker = useCallback((): ConnectionCircuitBreaker => {
    if (!pollingCircuitBreakerRef.current) {
      pollingCircuitBreakerRef.current = ConnectionCircuitBreaker.getInstance('live-score-polling');
    }
    return pollingCircuitBreakerRef.current;
  }, []);

  // Initialize polling service lazily
  const getPollingService = useCallback(() => {
    if (!pollingService.current) {
      const visClient = resolveVisApiClient();
      const circuitBreaker = resolvePollingCircuitBreaker();
      pollingService.current = createLiveScorePollingService(visClient, circuitBreaker);
    }
    return pollingService.current;
  }, [resolveVisApiClient, resolvePollingCircuitBreaker]);

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
      // Preserve live data during refresh - don't reset it
      setState(prev => ({ ...prev, loading: true, error: null }));

      const numericRouteMatch = matchNo?.trim() ?? '';
      const numericRouteTournament = tournamentNo?.trim() ?? '';

      let resolvedMatchNumber: number | null = extractNumericIdentifier(numericRouteMatch);
      let resolvedTournamentNumber: number | null = extractNumericIdentifier(numericRouteTournament);

      if (matchData) {
        try {
          const parsedMatch = JSON.parse(matchData) as BeachMatchCore & { visNo?: string | number; visMatchId?: string | number; matchNo?: string | number };
          setLegacyData({ legacyMatch: parsedMatch });

          const matchIdentifier = extractNumericIdentifier(
            (parsedMatch as any).visNo,
            (parsedMatch as any).visMatchId,
            (parsedMatch as any).visMatchNo,
            (parsedMatch as any).vis_match_no,
            (parsedMatch as any).matchNo,
            (parsedMatch as any).match_no,
            (parsedMatch as any).No,
            (parsedMatch as any).matchId,
            (parsedMatch as any).id
          );

          if (__DEV__) {
            console.log('[MatchDetail] legacy match data extraction', {
              visNo: (parsedMatch as any).visNo,
              visMatchId: (parsedMatch as any).visMatchId,
              visMatchNo: (parsedMatch as any).visMatchNo,
              matchNo: (parsedMatch as any).matchNo,
              No: (parsedMatch as any).No,
              extractedMatchIdentifier: matchIdentifier
            });
          }

          if (matchIdentifier !== null) {
            resolvedMatchNumber = matchIdentifier;
          }

          if (resolvedTournamentNumber === null) {
            const tournamentIdentifier = extractNumericIdentifier(
              (parsedMatch as any).tournamentNo,
              (parsedMatch as any).tournament_no,
              (parsedMatch as any).tournamentId,
              (parsedMatch as any).tournament_id,
              (parsedMatch as any).eventId,
              (parsedMatch as any).event_id,
              (parsedMatch as any).NoTournament
            );

            if (tournamentIdentifier !== null) {
              resolvedTournamentNumber = tournamentIdentifier;
            }
          }
        } catch (parseError) {
          if (__DEV__) {
            console.warn('[MatchDetail] legacy matchData parse failed, falling back to DTO system', parseError);
          }
        }
      }

      if (resolvedMatchNumber === null || Number.isNaN(resolvedMatchNumber)) {
        throw new Error('Unable to determine match identifier');
      }

      if (resolvedTournamentNumber === null || Number.isNaN(resolvedTournamentNumber)) {
        throw new Error('Unable to determine tournament identifier');
      }
      if (__DEV__) {
        console.log('[MatchDetail] resolved match number', resolvedMatchNumber, {
          fromRoute: matchNo,
          hasLegacy: !!matchData,
          tournament: resolvedTournamentNumber ?? tournamentNo,
          extractedFromRouteMatch: extractNumericIdentifier(numericRouteMatch),
          routeMatchRaw: numericRouteMatch
        });
      }

      const baseMatch = await beachMatchService.current.getMatch(resolvedMatchNumber, {
        matchNo: resolvedMatchNumber,
        tournamentNo: resolvedTournamentNumber ?? undefined
      });

      if (__DEV__) {
        console.log('[MatchDetail] base match loaded', resolvedMatchNumber, baseMatch?.status);
      }

      setState(prev => ({
        ...prev,
        baseMatch,
        loading: false,
        renderKey: `base-${resolvedMatchNumber}-${Date.now()}`
      }));

    } catch (error) {
      if (__DEV__) {
        console.warn('[MatchDetail] failed to load match detail', error);
      }
      setState(prev => ({
        ...prev,
        error: `Failed to load match details: ${error instanceof Error ? error.message : String(error)}`,
        loading: false
      }));
    }
  };

  /**
   * Update live data with optimization for frequent updates
   */
  const updateLiveData = useCallback((liveData: BeachMatchLiveDTO) => {
    if (__DEV__) {
      console.log('[MatchDetail] updateLiveData called', {
        newStatus: liveData.status,
        newCurrentSet: liveData.currentSet,
        newPoints: liveData.points,
        lastUpdate: liveData.lastUpdate
      });
    }

    setState(prev => {
      if (prev.liveData && prev.lastLiveUpdate === liveData.lastUpdate) {
        const unchanged =
          prev.liveData.status === liveData.status &&
          prev.liveData.currentSet === liveData.currentSet &&
          prev.liveData.points.a === liveData.points.a &&
          prev.liveData.points.b === liveData.points.b;

        if (unchanged) {
          if (__DEV__) {
            console.log('[MatchDetail] updateLiveData - no changes detected, skipping update');
          }
          return prev;
        }
      }

      if (__DEV__) {
        console.log('[MatchDetail] updateLiveData - applying live data update');
      }

      return {
        ...prev,
        liveData,
        lastLiveUpdate: liveData.lastUpdate ?? prev.lastLiveUpdate,
        pollingError: null, // Clear any previous polling errors
        renderKey: `live-${liveData.lastUpdate ?? Date.now()}`
      };
    });
  }, []);


  /**
   * Start live polling for matches that need it
   */
  const startLivePolling = useCallback((matchNumber: number) => {
    if (__DEV__) {
      console.log('[MatchDetail] startLivePolling invoked', matchNumber, {
        baseStatus: state.baseMatch?.status,
        isPollingActive: state.isPollingActive,
      });
    }

    if (state.isPollingActive) {
      if (__DEV__) {
        console.log('[MatchDetail] polling already active, skipping', matchNumber);
      }
      return;
    }

    if (__DEV__) {
      console.log('[MatchDetail] Starting live polling for match', matchNumber);
    }

    const pollingCallback = (liveData: BeachLive, error?: Error) => {
      if (error) {
        handlePollingError(error);
        return;
      }

      if (__DEV__) {
        const matchIdentifier = liveData?.match?.no ?? state.baseMatch?.no ?? matchNumber;
        console.log('[LiveMatch] VIS BeachLive payload', matchIdentifier, liveData);

        // Log the sets data specifically
        console.log('[LiveMatch] Raw sets data from VIS:', liveData?.sets);
        console.log('[LiveMatch] Team scores from VIS:', {
          teamA: liveData?.teamA,
          teamB: liveData?.teamB
        });
      }

      const transformedLiveData = transformBeachLiveToDTO(liveData);

      if (__DEV__) {
        console.log('[LiveMatch] Transformed live data for UI:', {
          status: transformedLiveData.status,
          currentSet: transformedLiveData.currentSet,
          points: transformedLiveData.points,
          closedSets: transformedLiveData.closedSets,
          lastUpdate: transformedLiveData.lastUpdate
        });
      }

      updateLiveData(transformedLiveData);
    };

    const service = getPollingService();
    service.startPolling(
      matchNumber,
      pollingCallback,
      [],
      true
    );

    setState(prev => ({ ...prev, isPollingActive: true }));

    pollingCleanup.current = () => {
      if (__DEV__) {
        console.log('[MatchDetail] Stopping live polling for match', matchNumber);
      }
      const pollingInstance = getPollingService();
      pollingInstance.stopPolling(matchNumber);
      setState(prev => ({ ...prev, isPollingActive: false }));
    };
  }, [getPollingService, state.baseMatch?.status, state.isPollingActive, updateLiveData]);

  /**
   * Transform BeachLive data to BeachMatchLiveDTO
   */
  const transformBeachLiveToDTO = useCallback((beachLive: BeachLive): BeachMatchLiveDTO => {
    if (__DEV__) {
      console.log('[LiveMatch] Processing sets for transformation:', beachLive.sets?.map(set => ({
        no: set.no,
        status: set.status,
        pointsTeamA: set.pointsTeamA,
        pointsTeamB: set.pointsTeamB
      })));
    }

    const currentSet = getCurrentSetFromBeachLive(beachLive);
    const closedSets = extractClosedSetsFromBeachLive(beachLive.sets);

    if (__DEV__) {
      console.log('[LiveMatch] Transformation results:', {
        currentSet: currentSet ? { no: currentSet.no, pointsA: currentSet.pointsTeamA, pointsB: currentSet.pointsTeamB, status: currentSet.status } : null,
        closedSets,
        totalSetsInData: beachLive.sets?.length || 0
      });
    }
    const events = beachLive.events?.map(event => ({
      set: event.setNo,
      rally: event.sequence,
      ts: event.timestamp,
      servingTeam: event.teamNo === 1 ? "A" : event.teamNo === 2 ? "B" : null,
      action: event.type,
      detail: event.description || null,
      scoreAfter: parseEventScore(event.scoreAfter)
    }));

    return {
      status: beachLive.match?.status || "Unknown",
      currentSet: currentSet?.no,
      points: {
        a: currentSet?.pointsTeamA ?? null,
        b: currentSet?.pointsTeamB ?? null
      },
      teamServing:
        beachLive.noServingTeam === 1 ? "A" :
        beachLive.noServingTeam === 2 ? "B" : null,
      timeouts: {
        a: beachLive.teamA?.timeoutsRemaining ?? 0,
        b: beachLive.teamB?.timeoutsRemaining ?? 0
      },
      lastUpdate: String(beachLive.version ?? Date.now()),
      closedSets,
      liveFeed: {
        available: Array.isArray(events) && events.length > 0,
        events
      }
    };
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
    if (!baseMatch) {
      return false;
    }

    if (__DEV__) {
      console.log('[MatchDetail] evaluating shouldStartLivePolling', { status: baseMatch.status });
    }

    if (isMatchFinished(baseMatch.status)) {
      if (__DEV__) {
        console.log('[MatchDetail] match considered finished, skipping polling', baseMatch.status);
      }
      return false;
    }

    const normalizedStatus = baseMatch.status?.toLowerCase?.() ?? '';
    if (!normalizedStatus) {
      return false;
    }

    if (normalizedStatus.startsWith('status')) {
      const numeric = Number(normalizedStatus.replace('status', ''));
      if (!Number.isNaN(numeric)) {
        return numeric >= 3 && numeric < 9;
      }
    }

    return normalizedStatus.includes('inset') ||
           normalizedStatus.includes('running') ||
           normalizedStatus.includes('live') ||
           normalizedStatus.includes('ready') ||
           normalizedStatus.includes('scheduled');
  };

  const isMatchFinished = (status: string): boolean => {
    const lowerStatus = status.toLowerCase();

    if (lowerStatus.startsWith('status')) {
      const numeric = Number(lowerStatus.replace('status', ''));
      if (!Number.isNaN(numeric) && numeric >= 9) {
        return true;
      }
    }

    return lowerStatus.includes('finished') ||
           lowerStatus.includes('final') ||
           lowerStatus.includes('closed') ||
           lowerStatus.includes('official') ||
           lowerStatus.includes('cancelled');
  };

  const getCurrentSetFromBeachLive = (beachLive: BeachLive) => {
    if (!beachLive.sets || beachLive.sets.length === 0) {
      return undefined;
    }

    const inProgress = beachLive.sets.find(set => set.status === BeachSetStatus.IN_PROGRESS);
    if (inProgress) {
      return inProgress;
    }

    const upcoming = beachLive.sets.find(set => set.status === BeachSetStatus.NOT_STARTED);
    if (upcoming) {
      return upcoming;
    }

    return beachLive.sets[beachLive.sets.length - 1];
  };

  const extractClosedSetsFromBeachLive = (sets?: BeachLive['sets']): Array<{ set: number; a: number; b: number }> => {
    if (!sets || sets.length === 0) return [];

    return sets
      .filter(set => set.status === BeachSetStatus.FINISHED)
      .map(set => ({
        set: set.no,
        a: set.pointsTeamA,
        b: set.pointsTeamB
      }));
  };

  const parseEventScore = (scoreString?: string): { a: number; b: number } | undefined => {
    if (!scoreString) {
      return undefined;
    }

    const match = scoreString.match(/(\d+)[:-](\d+)/);
    if (!match) {
      return undefined;
    }

    return {
      a: parseInt(match[1], 10),
      b: parseInt(match[2], 10)
    };
  };

  const handleRefresh = () => {
    if (__DEV__) {
      console.log('[MatchDetail] handleRefresh called', {
        hasLiveData: !!state.liveData,
        isPollingActive: state.isPollingActive,
        baseMatchStatus: state.baseMatch?.status
      });
    }
    loadMatchDetail();
  };

  const handleGoBack = () => {
    router.back();
  };

  /**
   * Generate header title and subtitle based on available match data
   */
  const getHeaderInfo = () => {
    const mergedData = getMergedMatchData;
    if (!mergedData) {
      return { title: 'Match Details', subtitle: undefined };
    }

    if (mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data)) {
      const match = mergedData.data;
      return {
        title: match.roundName || match.round || 'Match Details',
        subtitle: `${match.team1.teamName} vs ${match.team2.teamName}`
      };
    } else if (mergedData.type === 'dto') {
      const match = mergedData.data;
      return {
        title: match.roundName || 'Match Details',
        subtitle: `${match.teamA.name || 'Team A'} vs ${match.teamB.name || 'Team B'}`
      };
    } else if (mergedData.type === 'legacy') {
      // MatchResult type
      const match = mergedData.data as any;
      return {
        title: match.round || 'Match Details',
        subtitle: `${match.teamAName || 'Team A'} vs ${match.teamBName || 'Team B'}`
      };
    }

    return { title: 'Match Details', subtitle: undefined };
  };

  /**
   * Merge stable and live data for rendering
   */
  const getMergedMatchData = useMemo(() => {
    if (__DEV__) {
      console.log('[MatchDetail] getMergedMatchData calculation', {
        hasLegacyMatch: !!legacyData.legacyMatch,
        hasBaseMatch: !!state.baseMatch,
        hasLiveData: !!state.liveData,
        liveDataStatus: state.liveData?.status,
        renderKey: state.renderKey
      });
    }

    // Legacy support for backward compatibility
    if (legacyData.legacyMatch) {
      const isLive = !!state.liveData && !isMatchFinished(state.liveData?.status || 'Unknown');
      if (__DEV__) {
        console.log('[MatchDetail] using legacy data path', { isLive, hasLiveData: !!state.liveData });
      }
      return {
        type: 'legacy' as const,
        data: legacyData.legacyMatch,
        isLive,
        live: state.liveData
      };
    }

    // New DTO system
    if (!state.baseMatch) {
      return null;
    }

    const mergedSets = [
      ...(state.liveData?.closedSets || state.baseMatch.sets || []),
      ...(state.liveData?.currentSet && state.liveData.points.a !== null ? [{
        set: state.liveData.currentSet,
        a: state.liveData.points.a,
        b: state.liveData.points.b,
        isLive: true
      }] : [])
    ];

    const result = {
      type: 'dto' as const,
      data: {
        // Base data (stable)
        ...state.baseMatch,

        // Override with live data where available
        status: state.liveData?.status || state.baseMatch.status,

        // Sets: merge closed sets + current set
        sets: mergedSets
      },
      isLive: !!state.liveData && !isMatchFinished(state.liveData.status),
      live: state.liveData
    };

    if (__DEV__) {
      console.log('[MatchDetail] DTO merged data result:', {
        isLive: result.isLive,
        status: result.data.status,
        sets: result.data.sets,
        liveCurrentSet: state.liveData?.currentSet,
        livePoints: state.liveData?.points,
        baseSets: state.baseMatch.sets
      });
    }

    return result;
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
        <NavigationHeader
          title="Match Details"
          subtitle="Loading..."
          showHomeButton={true}
          onHomePress={handleGoBack}
          showStatusBar={false}
          showLogo={false}
          showBurgerMenu={true}
          useBackButton={true}
        />
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
        <NavigationHeader
          title="Match Details"
          subtitle="Error loading match"
          showHomeButton={true}
          onHomePress={handleGoBack}
          showStatusBar={false}
          showLogo={false}
          showBurgerMenu={true}
          useBackButton={true}
        />
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

  const headerInfo = getHeaderInfo();

  return (
    <View style={styles.container}>
      <NavigationHeader
        title={headerInfo.title}
        subtitle={headerInfo.subtitle}
        showHomeButton={true}
        onHomePress={handleGoBack}
        showStatusBar={false}
        showLogo={false}
        showBurgerMenu={true}
        useBackButton={true}
      />

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
              {mergedData.isLive ? 'Live Score' : 'Final Score'}
            </Text>
            {/* Match time info */}
            {mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data) && mergedData.data.scheduledDateTime ? (
              <Text style={styles.matchTime}>
                {new Date(mergedData.data.scheduledDateTime).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })}
              </Text>
            ) : mergedData.type === 'dto' && mergedData.data.localTime ? (
              <Text style={styles.matchTime}>
                {mergedData.data.localTime}
              </Text>
            ) : null}
          </View>

          <View style={styles.teamsContainer}>
            {/* Team 1 */}
            <View style={styles.teamSection}>
              <View style={styles.teamFlagSection}>
                <FlagImage
                  countryCode={
                    mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data)
                      ? mergedData.data.team1.countryCode
                      : mergedData.type === 'dto'
                      ? mergedData.data.teamA.federation || 'XXX'
                      : 'XXX'
                  }
                  size="large"
                  style={styles.teamFlag}
                />
                <Text style={styles.countryCode}>
                  {mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data)
                    ? mergedData.data.team1.countryCode
                    : mergedData.type === 'dto'
                    ? mergedData.data.teamA.federation
                    : ''}
                </Text>
              </View>
              <Text style={styles.teamName} numberOfLines={2}>
                {mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data)
                  ? mergedData.data.team1.teamName
                  : mergedData.type === 'dto'
                  ? mergedData.data.teamA.name
                  : mergedData.type === 'legacy'
                  ? (mergedData.data as any).teamAName
                  : 'Team A'}
              </Text>
              <Text style={[
                styles.matchPoints,
                mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data) && mergedData.data.result?.winner === 1 && styles.winnerPoints
              ]}>
                {mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data)
                  ? (mergedData.data.result?.team1Sets || 0)
                  : mergedData.type === 'dto'
                  ? (mergedData.data.sets?.filter(set => set.a > set.b).length || 0)
                  : mergedData.type === 'legacy'
                  ? (mergedData.data as any).matchPointsA || 0
                  : 0}
              </Text>
            </View>

            <Text style={styles.vsText}>vs</Text>

            {/* Team 2 */}
            <View style={styles.teamSection}>
              <View style={styles.teamFlagSection}>
                <FlagImage
                  countryCode={
                    mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data)
                      ? mergedData.data.team2.countryCode
                      : mergedData.type === 'dto'
                      ? mergedData.data.teamB.federation || 'XXX'
                      : 'XXX'
                  }
                  size="large"
                  style={styles.teamFlag}
                />
                <Text style={styles.countryCode}>
                  {mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data)
                    ? mergedData.data.team2.countryCode
                    : mergedData.type === 'dto'
                    ? mergedData.data.teamB.federation
                    : ''}
                </Text>
              </View>
              <Text style={styles.teamName} numberOfLines={2}>
                {mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data)
                  ? mergedData.data.team2.teamName
                  : mergedData.type === 'dto'
                  ? mergedData.data.teamB.name
                  : mergedData.type === 'legacy'
                  ? (mergedData.data as any).teamBName
                  : 'Team B'}
              </Text>
              <Text style={[
                styles.matchPoints,
                mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data) && mergedData.data.result?.winner === 2 && styles.winnerPoints
              ]}>
                {mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data)
                  ? (mergedData.data.result?.team2Sets || 0)
                  : mergedData.type === 'dto'
                  ? (mergedData.data.sets?.filter(set => set.b > set.a).length || 0)
                  : mergedData.type === 'legacy'
                  ? (mergedData.data as any).matchPointsB || 0
                  : 0}
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
                {mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data) && mergedData.data.scheduledDateTime
                  ? new Date(mergedData.data.scheduledDateTime).toLocaleDateString()
                  : mergedData.type === 'dto' && mergedData.data.localDate
                  ? mergedData.data.localDate
                  : mergedData.type === 'legacy'
                  ? formatDateLong((mergedData.data as any).localDate)
                  : 'N/A'}
              </Text>
            </View>

            {/* Court */}
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Court</Text>
              <Text style={styles.infoValue}>
                {mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data) && mergedData.data.court
                  ? (mergedData.data.court.courtNumber === 'CC' ? 'Center Court' : `Court ${mergedData.data.court.courtNumber}`)
                  : mergedData.type === 'dto' && mergedData.data.court
                  ? (mergedData.data.court === 'CC' ? 'Center Court' : `Court ${mergedData.data.court}`)
                  : mergedData.type === 'legacy'
                  ? (mergedData.data as any).court
                  : 'N/A'}
              </Text>
            </View>

            {/* Round */}
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Round</Text>
              <Text style={styles.infoValue}>
                {mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data)
                  ? mergedData.data.roundName || mergedData.data.round
                  : mergedData.type === 'dto'
                  ? mergedData.data.roundName
                  : mergedData.type === 'legacy'
                  ? (mergedData.data as any).round
                  : 'N/A'}
              </Text>
            </View>

            {/* Match Number */}
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Match Number</Text>
              <Text style={styles.infoValue}>
                {mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data)
                  ? mergedData.data.matchCode
                  : mergedData.type === 'dto'
                  ? mergedData.data.no.toString()
                  : mergedData.type === 'legacy'
                  ? (mergedData.data as any).no
                  : 'N/A'}
              </Text>
            </View>

            {/* Duration (if finished) */}
            {mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data) && mergedData.data.result?.duration && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Duration</Text>
                <Text style={styles.infoValue}>
                  {Math.floor(mergedData.data.result.duration / 60)}h {mergedData.data.result.duration % 60}m
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Referees Section */}
        {((mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data) && mergedData.data.refereeAssignments && mergedData.data.refereeAssignments.length > 0) ||
          (mergedData.type === 'dto' && mergedData.data.referees)) && (
          <Card style={styles.refereesCard}>
            <Text style={styles.sectionTitle}>Match Officials</Text>
            <View style={styles.refereesGrid}>
              {mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data) && mergedData.data.refereeAssignments?.map((referee, index) => (
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
              {mergedData.type === 'dto' && mergedData.data.referees && (
                <>
                  {mergedData.data.referees.first && (
                    <View style={styles.refereeItem}>
                      <View style={styles.refereeInfo}>
                        <Text style={styles.refereePosition}>1st Referee</Text>
                        <Text style={styles.refereeName}>{mergedData.data.referees.first.name}</Text>
                      </View>
                      <FlagImage
                        countryCode={mergedData.data.referees.first.federation || 'XXX'}
                        size="large"
                        style={styles.refereeFlag}
                      />
                    </View>
                  )}
                  {mergedData.data.referees.second && (
                    <View style={styles.refereeItem}>
                      <View style={styles.refereeInfo}>
                        <Text style={styles.refereePosition}>2nd Referee</Text>
                        <Text style={styles.refereeName}>{mergedData.data.referees.second.name}</Text>
                      </View>
                      <FlagImage
                        countryCode={mergedData.data.referees.second.federation || 'XXX'}
                        size="large"
                        style={styles.refereeFlag}
                      />
                    </View>
                  )}
                  {mergedData.data.referees.challenge && (
                    <View style={styles.refereeItem}>
                      <View style={styles.refereeInfo}>
                        <Text style={styles.refereePosition}>Challenge Referee</Text>
                        <Text style={styles.refereeName}>{mergedData.data.referees.challenge.name}</Text>
                      </View>
                      <FlagImage
                        countryCode={mergedData.data.referees.challenge.federation || 'XXX'}
                        size="large"
                        style={styles.refereeFlag}
                      />
                    </View>
                  )}
                </>
              )}
            </View>
          </Card>
        )}

        {/* Set Durations (if available) */}
        {((mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data) && ((mergedData.data as any).DurationSet1 || (mergedData.data as any).DurationSet2 || (mergedData.data as any).DurationSet3)) ||
          (mergedData.type === 'dto' && mergedData.data.sets?.some(set => set.durationSec))) && (
          <Card style={styles.durationCard}>
            <Text style={styles.sectionTitle}>Set Durations</Text>
            <View style={styles.durationGrid}>
              {mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data) && (
                <>
                  {(mergedData.data as any).DurationSet1 && (
                    <View style={styles.durationItem}>
                      <Text style={styles.durationLabel}>Set 1</Text>
                      <Text style={styles.durationValue}>
                        {Math.floor(parseInt((mergedData.data as any).DurationSet1) / 60)}:{(parseInt((mergedData.data as any).DurationSet1) % 60).toString().padStart(2, '0')}
                      </Text>
                    </View>
                  )}
                  {(mergedData.data as any).DurationSet2 && (
                    <View style={styles.durationItem}>
                      <Text style={styles.durationLabel}>Set 2</Text>
                      <Text style={styles.durationValue}>
                        {Math.floor(parseInt((mergedData.data as any).DurationSet2) / 60)}:{(parseInt((mergedData.data as any).DurationSet2) % 60).toString().padStart(2, '0')}
                      </Text>
                    </View>
                  )}
                  {(mergedData.data as any).DurationSet3 && (
                    <View style={styles.durationItem}>
                      <Text style={styles.durationLabel}>Set 3</Text>
                      <Text style={styles.durationValue}>
                        {Math.floor(parseInt((mergedData.data as any).DurationSet3) / 60)}:{(parseInt((mergedData.data as any).DurationSet3) % 60).toString().padStart(2, '0')}
                      </Text>
                    </View>
                  )}
                </>
              )}
              {mergedData.type === 'dto' && mergedData.data.sets?.filter(set => set.durationSec).map((set) => (
                <View key={set.set} style={styles.durationItem}>
                  <Text style={styles.durationLabel}>Set {set.set}</Text>
                  <Text style={styles.durationValue}>
                    {Math.floor(set.durationSec! / 60)}:{(set.durationSec! % 60).toString().padStart(2, '0')}
                  </Text>
                </View>
              ))}
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
  refreshButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    minHeight: 32,
    justifyContent: 'center',
    marginLeft: 8,
  },
  refreshButtonText: {
    ...typography.caption,
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

