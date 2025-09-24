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
import { BeachMatchLiveDTO, isBeachMatchLiveDTO } from '../types/beach-match-live-dto';
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
import { BeachMatchLiveDTOService } from '../services/BeachMatchLiveDTOService';
import { LiveScorePollingService, createLiveScorePollingService } from '../services/live-score/LiveScorePollingService';
import { VisApiClient } from '../services/api/VisApiClient';
import { DEFAULT_RETRY_CONFIG } from '../types/api-v2';
import { ConnectionCircuitBreaker } from '../services/ConnectionCircuitBreaker';

// Simple Status-Driven Polling Solution
enum PollingMode {
  OFF = 0,           // No polling
  SOFT = 30000,      // 30 seconds for pre-match
  LIVE = 5000        // 5 seconds for live matches
}

// Single function determines polling interval based on match status
function getPollingInterval(match: BeachMatchLiveDTO): number {
  // Live match = fast polling
  if (match.status?.state?.startsWith('InSet')) {
    return PollingMode.LIVE;
  }

  // Finished = no polling
  if (['Finished', 'Cancelled'].includes(match.status?.state)) {
    return PollingMode.OFF;
  }

  // Scheduled + within 30 min = soft polling
  if (match.status?.state === 'Scheduled') {
    const now = Date.now();
    const startTime = new Date(match.schedule?.startTime || 0).getTime();
    const thirtyMinutes = 30 * 60 * 1000;

    if (startTime - now <= thirtyMinutes && startTime > now) {
      return PollingMode.SOFT;
    }
  }

  return PollingMode.OFF;
}

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


// Interface for the new DTO-based state structure
interface MatchDetailState {
  // Main DTO: Complete match data structure (from reference)
  matchDTO: BeachMatchLiveDTO | null;

  // Legacy support: Keep for backward compatibility
  baseMatch: BeachMatchDTO | null;
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


  // New DTO-based state structure
  const [state, setState] = useState<MatchDetailState>({
    matchDTO: null,
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
  let beachMatchService, dtoService;
  try {
    beachMatchService = useRef(BeachMatchService.getInstance());
    dtoService = useRef(BeachMatchLiveDTOService.getInstance());
  } catch (error) {
    throw error;
  }

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

  /**
   * Load match data using ONLY BeachMatchLiveDTO service (single GetBeachMatch API call)
   */
  const loadMatchDetail = useCallback(async () => {
    try {
      // Preserve live data during refresh - don't reset it
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Direct route parameter validation - only match number needed
      const resolvedMatchNumber = parseInt(matchNo?.trim() ?? '', 10);

      if (isNaN(resolvedMatchNumber) || resolvedMatchNumber <= 0) {
        throw new Error(`Invalid match number: ${matchNo}. Must be a positive integer.`);
      }

      // SINGLE API CALL: Use only BeachMatchLiveDTOService with optimized parameters
      // This will make only ONE GetBeachMatch API call
      try {
        const dtoParams = {
          matchNo: resolvedMatchNumber,
          // tournamentNo: REMOVED - using only match number for simplest possible API call
          includeTournamentInfo: false, // DISABLED - reduces API calls
          includeStatistics: false,     // DISABLED - reduces API calls
          includeOfficials: false       // DISABLED - reduces API calls
        };

        if (__DEV__) {
          console.log('[MatchDetail] Making SINGLE GetBeachMatch API call with params:', dtoParams);
        }

        const matchDTO = await dtoService.current.buildBeachMatchLiveDTO(dtoParams);

        // Keep this log to show complete match DTO
        if (__DEV__) {
          console.log('[MatchDetail] Complete Match DTO from SINGLE API call:', JSON.stringify(matchDTO, null, 2));
        }

        // Update state with DTO
        setState(prev => ({
          ...prev,
          matchDTO,
          loading: false,
          renderKey: `dto-${matchDTO.matchNo}-${Date.now()}`
        }));

      } catch (dtoError) {
        if (__DEV__) {
          console.error('[MatchDetail] Failed to create DTO - no real data available:', dtoError);
        }
        // If DTO creation fails, it means no real data is available
        setState(prev => ({
          ...prev,
          error: 'No real match data available in database',
          loading: false,
          renderKey: `dto-error-${Date.now()}`
        }));
      }

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Failed to load match details: ${error instanceof Error ? error.message : String(error)}`,
        loading: false
      }));
    }
  }, [matchNo, tournamentNo, matchData]);

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
  }, [matchNo, tournamentNo, loadMatchDetail]);

  const handleRefresh = () => {
    loadMatchDetail();
  };

  // Removed: No longer needed since we're making only one API call


  /**
   * Update live data with optimization for frequent updates
   */
  const updateLiveData = useCallback((liveData: BeachMatchLiveDTO) => {
    setState(prev => {
      // Version filtering: reject older data
      if (prev.liveData && prev.lastLiveUpdate) {
        const currentVersion = parseInt(prev.lastLiveUpdate) || 0;
        const newVersion = parseInt(liveData.lastUpdate) || 0;

        if (newVersion < currentVersion) {
          return prev;
        }

        // Data quality filtering: reject empty data if we have better data
        if (newVersion <= currentVersion) {
          const hasCurrentData = (prev.liveData.closedSets?.length || 0) > 0 || prev.liveData.currentSet;
          const hasNewData = (liveData.closedSets?.length || 0) > 0 || liveData.currentSet;

          if (hasCurrentData && !hasNewData) {
            return prev;
          }
        }
      }

      // Same-version change detection
      if (prev.liveData && prev.lastLiveUpdate === liveData.lastUpdate) {
        const unchanged =
          prev.liveData.status === liveData.status &&
          prev.liveData.currentSet === liveData.currentSet &&
          prev.liveData.points.a === liveData.points.a &&
          prev.liveData.points.b === liveData.points.b;

        if (unchanged) {
          return prev;
        }
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
    if (state.isPollingActive) {
      return;
    }

    const pollingCallback = (liveData: BeachLive, error?: Error) => {
      if (error) {
        handlePollingError(error);
        return;
      }

      // NEW: Update DTO with live data (no legacy fallback)
      if (state.matchDTO) {
        const updatedDTO = dtoService.current.updateDTOWithLiveData(state.matchDTO, liveData);

        // Log the updated BeachMatchLiveDTO with live data
        if (__DEV__) {
          console.log('[MatchDetail] Updated BeachMatchLiveDTO with Live Data:', JSON.stringify(updatedDTO, null, 2));
        }

        setState(prev => ({
          ...prev,
          matchDTO: updatedDTO,
          renderKey: `dto-live-${updatedDTO.audit?.liveVersion ?? Date.now()}`
        }));
      }
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
      const pollingInstance = getPollingService();
      pollingInstance.stopPolling(matchNumber);
      setState(prev => ({ ...prev, isPollingActive: false }));
    };
  }, [getPollingService, state.baseMatch?.status, state.isPollingActive, updateLiveData]);

  // Simple status-driven polling - replaces all complex polling logic
  useEffect(() => {
    // TEMPORARILY DISABLED - Polling disabled for debugging GetBeachMatch API calls
    /*
    if (!state.matchDTO || !matchNo) return;

    const interval = getPollingInterval(state.matchDTO);

    if (interval === 0) {
      // Stop polling
      if (pollingCleanup.current) {
        pollingCleanup.current();
        pollingCleanup.current = null;
      }
      setState(prev => ({ ...prev, isPollingActive: false }));
      return;
    }

    // For live matches, use the existing live polling with real-time updates
    if (interval === PollingMode.LIVE) {
      const matchNumber = parseInt(matchNo, 10);
      if (!isNaN(matchNumber) && !state.isPollingActive) {
        startLivePolling(matchNumber);
      }
      return;
    }

    // For soft polling (pre-match), use simple interval with loadMatchDetail
    if (interval === PollingMode.SOFT) {
      if (pollingCleanup.current) {
        pollingCleanup.current();
      }

      const timer = setInterval(() => {
        loadMatchDetail(); // Refresh match data to check for status changes
      }, interval);

      pollingCleanup.current = () => clearInterval(timer);
    }
    */

  }, [state.matchDTO?.status?.state, state.matchDTO?.schedule?.startTime, matchNo, state.isPollingActive, startLivePolling, loadMatchDetail]);

  /**
   * Transform BeachLive data to BeachMatchLiveDTO
   */
  const transformBeachLiveToDTO = useCallback((beachLive: BeachLive): BeachMatchLiveDTO => {
    const currentSet = getCurrentSetFromBeachLive(beachLive);
    const closedSets = extractClosedSetsFromBeachLive(beachLive.sets, beachLive.status);
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

    if (isMatchFinished(baseMatch.status)) {
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

  const isMatchFinished = (status: any): boolean => {
    // Handle both DTO status object and string status
    const statusStr = typeof status === 'object' && status?.state ? status.state : status;
    if (typeof statusStr !== 'string') return false;

    const lowerStatus = statusStr.toLowerCase();

    // Check for numeric status codes (VIS uses numeric codes like '9', '10', '13', etc.)
    const numeric = Number(statusStr);
    if (!Number.isNaN(numeric) && numeric >= 9) {
      return true;
    }

    // Also check legacy format with 'status' prefix
    if (lowerStatus.startsWith('status')) {
      const legacyNumeric = Number(lowerStatus.replace('status', ''));
      if (!Number.isNaN(legacyNumeric) && legacyNumeric >= 9) {
        return true;
      }
    }

    return lowerStatus.includes('finished') ||
           lowerStatus.includes('final') ||
           lowerStatus.includes('closed') ||
           lowerStatus.includes('official') ||
           lowerStatus.includes('cancelled');
  };

  // Helper function to derive set status from overall match status and set number
  // Based on beachMatchLiveDTO.md reference: status 5 = "InSet2" means set 1 finished, set 2 in progress
  const deriveSetStatus = (setNo: number, overallMatchStatus: string): BeachSetStatus => {
    const numericStatus = parseInt(overallMatchStatus, 10);

    if (isNaN(numericStatus)) {
      return BeachSetStatus.NOT_STARTED;
    }

    // Using VIS_STATUS_TO_BEACH_MATCH_STATUS mapping from reference
    switch (numericStatus) {
      case 0: case 1: case 2: // Scheduled, ReadyToStart
        return BeachSetStatus.NOT_STARTED;

      case 3: // InSet1
        return setNo === 1 ? BeachSetStatus.IN_PROGRESS : BeachSetStatus.NOT_STARTED;

      case 4: // Set1Finished
        return setNo === 1 ? BeachSetStatus.FINISHED : BeachSetStatus.NOT_STARTED;

      case 5: // InSet2
        if (setNo === 1) return BeachSetStatus.FINISHED;
        if (setNo === 2) return BeachSetStatus.IN_PROGRESS;
        return BeachSetStatus.NOT_STARTED;

      case 6: // Set2Finished
        if (setNo === 1 || setNo === 2) return BeachSetStatus.FINISHED;
        return BeachSetStatus.NOT_STARTED;

      case 7: // InSet3
        if (setNo === 1 || setNo === 2) return BeachSetStatus.FINISHED;
        if (setNo === 3) return BeachSetStatus.IN_PROGRESS;
        return BeachSetStatus.NOT_STARTED;

      case 8: // Set3Finished
        if (setNo <= 3) return BeachSetStatus.FINISHED;
        return BeachSetStatus.NOT_STARTED;

      default: // 9+ = Finished, OfficialResult
        return BeachSetStatus.FINISHED;
    }
  };

  const getCurrentSetFromBeachLive = (beachLive: BeachLive) => {
    if (!beachLive.sets || beachLive.sets.length === 0) {
      return undefined;
    }

    // Use overall match status to derive set statuses (per beachMatchLiveDTO.md reference)
    const overallStatus = beachLive.status || '0';

    // Find the set that should be in progress based on overall match status
    const inProgress = beachLive.sets.find(set =>
      deriveSetStatus(set.no, overallStatus) === BeachSetStatus.IN_PROGRESS
    );
    if (inProgress) {
      return inProgress;
    }

    const upcoming = beachLive.sets.find(set =>
      deriveSetStatus(set.no, overallStatus) === BeachSetStatus.NOT_STARTED
    );
    if (upcoming) {
      return upcoming;
    }

    return beachLive.sets[beachLive.sets.length - 1];
  };

  const extractClosedSetsFromBeachLive = (sets?: BeachLive['sets'], overallStatus?: string): Array<{ set: number; a: number; b: number }> => {
    if (!sets || sets.length === 0) return [];

    const matchStatus = overallStatus || '0';

    return sets
      .filter(set => deriveSetStatus(set.no, matchStatus) === BeachSetStatus.FINISHED)
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
        subtitle: `${match.team1?.teamName || 'Team A'} vs ${match.team2?.teamName || 'Team B'}`
      };
    } else if (mergedData.type === 'dto') {
      const dto = mergedData.data;
      return {
        title: dto.round?.name || dto.round?.phase || 'Match Details',
        subtitle: `${dto.teams?.home?.teamName || 'Team A'} vs ${dto.teams?.away?.teamName || 'Team B'}`
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
   * Merge stable and live data for rendering - now supports DTO
   */
  const getMergedMatchData = useMemo(() => {
    // NEW: Priority 1 - Use DTO if available (preferred approach)
    if (state.matchDTO) {
      const isLive = ['InSet1', 'InSet2', 'InSet3', 'InSet4', 'InSet5'].includes(state.matchDTO?.status?.state);
      return {
        type: 'dto' as const,
        data: state.matchDTO,
        isLive,
        live: null // DTO already includes live data
      };
    }

    // Legacy support for backward compatibility
    if (legacyData.legacyMatch) {
      const isLive = !!state.liveData && !isMatchFinished(state.liveData?.status || 'Unknown');

      // Merge live data into legacy match structure for display
      let mergedLegacyMatch = legacyData.legacyMatch;
      if (state.liveData && isLive) {
        // Update legacy match with live scores
        const liveData = state.liveData;

        // Create updated setScores array from live data
        const liveSetScores: number[] = [];

        // Add closed sets
        if (liveData.closedSets) {
          liveData.closedSets.forEach(set => {
            liveSetScores.push(set.a, set.b);
          });
        }

        // Add current set if in progress
        if (liveData.currentSet && liveData.points.a !== null && liveData.points.b !== null) {
          liveSetScores.push(liveData.points.a, liveData.points.b);
        }

        // Update the legacy match structure
        mergedLegacyMatch = {
          ...legacyData.legacyMatch,
          status: liveData.status,
          result: {
            ...legacyData.legacyMatch.result,
            setScores: liveSetScores
          }
        };
      }

      return {
        type: 'legacy' as const,
        data: mergedLegacyMatch,
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

    return result;
  }, [state.matchDTO, state.baseMatch, state.liveData, legacyData.legacyMatch, state.renderKey]);

  // Complete data fetch for finished matches - one-time comprehensive fetch
  useEffect(() => {
    const mergedData = getMergedMatchData;

    if (__DEV__) {
      console.log('[MatchDetail] Comprehensive fetch check:', {
        hasData: !!mergedData,
        type: mergedData?.type,
        status: mergedData?.type === 'legacy' ? mergedData.data.status : mergedData?.data?.status?.state || mergedData?.data?.status,
        rawStatusObject: mergedData?.data?.status,
        fullData: mergedData?.data,
        matchNo,
        tournamentNo,
        hasBaseMatch: !!state.baseMatch
      });
    }

    // For finished matches - either legacy or DTO type, or matches that should be finished
    const actualStatus = mergedData?.type === 'legacy'
      ? mergedData.data.status
      : mergedData?.data?.status?.state || mergedData?.data?.status;

    const isFinishedMatch = mergedData && (
      (mergedData.type === 'legacy' && ['FINISHED', 'Cancelled'].includes(actualStatus)) ||
      (mergedData.type === 'dto' && ['Finished', 'Cancelled', 'InSet1', 'InSet2', 'InSet3'].includes(actualStatus))
    );

    if (__DEV__) {
      console.log('[MatchDetail] Match finish check:', {
        isFinishedMatch,
        actualStatus,
        matchNo,
        tournamentNo,
        willTriggerFetch: isFinishedMatch && matchNo && tournamentNo
      });
    }

    if (isFinishedMatch && matchNo && tournamentNo) {
      if (__DEV__) {
        console.log('[MatchDetail] Triggering comprehensive data fetch for finished match');
      }

      const fetchCompleteMatchData = async () => {
        try {
          // Force a comprehensive DTO build with all statistics and details
          const matchNumber = parseInt(matchNo, 10);
          const tournamentNumber = parseInt(tournamentNo, 10);

          if (!isNaN(matchNumber) && !isNaN(tournamentNumber)) {
            if (__DEV__) {
              console.log('[MatchDetail] Fetching complete data for finished match:', matchNumber);
            }

            // Get the best available match data
            const availableMatchData = state.baseMatch || mergedData?.data;

            if (__DEV__) {
              console.log('[MatchDetail] Using match data for comprehensive fetch:', {
                hasBaseMatch: !!state.baseMatch,
                hasMergedData: !!mergedData?.data,
                mergedDataType: mergedData?.type,
                selectedData: availableMatchData ? Object.keys(availableMatchData) : null,
                sampleTeamData: availableMatchData?.team1?.teamName || availableMatchData?.teamA?.name
              });
            }

            const completeDTO = await dtoService.current.buildBeachMatchLiveDTO({
              matchNo: matchNumber,
              tournamentNo: tournamentNumber,
              includeTournamentInfo: true,
              includeStatistics: true,    // Enable statistics for finished matches
              includeOfficials: true,
              includeMatchEvents: true   // Get match timeline/events if available
              // Removed matchData to force fresh API calls for real data
            });

            // Log the complete DTO with all stats
            if (__DEV__) {
              console.log('[MatchDetail] Complete Finished Match DTO with Stats:', JSON.stringify(completeDTO, null, 2));
            }

            // Update state with the complete DTO
            setState(prev => ({
              ...prev,
              matchDTO: completeDTO,
              renderKey: `complete-${Date.now()}`
            }));
          }
        } catch (error) {
          if (__DEV__) {
            console.error('[MatchDetail] Failed to fetch complete match data - no real data available:', error);
          }
          // Don't set any DTO if we can't get real data - this prevents mock data from being displayed
          setState(prev => ({
            ...prev,
            error: 'No real match data available in database',
            renderKey: `error-${Date.now()}`
          }));
        }
      };

      // Only fetch once - check if we already have comprehensive data
      const needsCompleteData = mergedData.type === 'legacy' ||
        (mergedData.type === 'dto' && !mergedData.data.statistics);

      if (needsCompleteData) {
        if (__DEV__) {
          console.log('[MatchDetail] Triggering comprehensive data fetch for finished match');
        }
        fetchCompleteMatchData();
      } else if (__DEV__) {
        console.log('[MatchDetail] Already have comprehensive data, skipping fetch');
      }
    }
  }, [getMergedMatchData, matchNo, tournamentNo, state.baseMatch, state.matchDTO]);

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

  // Get round prefix for gender badge (Q for qualification/rounds 1&2) - same logic as MatchCard
  const getRoundPrefix = (match: any): string => {
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
      const statusState = typeof status === 'object' && status.state ? status.state : status;
      const statusString = typeof statusState === 'string' ? statusState : String(statusState);

      switch (statusString.toLowerCase()) {
        case 'scheduled':
          return 'SCHEDULED';
        case 'readytostart':
        case 'ready':
          return 'READY';
        case 'inset1':
          return 'IN SET 1';
        case 'set1finished':
        case 'set1done':
          return 'SET 1 DONE';
        case 'inset2':
          return 'IN SET 2';
        case 'set2finished':
        case 'set2done':
          return 'SET 2 DONE';
        case 'inset3':
          return 'IN SET 3';
        case 'set3finished':
        case 'set3done':
          return 'SET 3 DONE';
        case 'inset4':
          return 'IN SET 4';
        case 'set4finished':
          return 'SET 4 DONE';
        case 'inset5':
          return 'IN SET 5';
        case 'set5finished':
          return 'SET 5 DONE';
        case 'finished':
          return 'FINAL';
        case 'officialresult':
          return 'OFFICIAL';
        case 'corrected':
          return 'CORRECTED';
        case 'closed':
          return 'CLOSED';
        case 'cancelled':
          return 'CANCELLED';
        default:
          return statusString.toUpperCase();
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

    // NEW: Handle DTO format (preferred)
    if (mergedData.type === 'dto') {
      const dto = mergedData.data;
      const setData = dto.score?.sets?.find(s => s.setNo === setNumber);
      if (setData) {
        teamAPoints = setData.home || 0;
        teamBPoints = setData.away || 0;
      }
    } else if (mergedData.type === 'legacy') {
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

  // Log complete DTO data being used to populate the screen
  if (__DEV__ && mergedData) {
    console.log('[MatchDetail] Current Screen Data:', {
      dataType: mergedData.type,
      isLive: mergedData.isLive,
      status: mergedData.data.status,
      completeData: JSON.stringify(mergedData.data, null, 2)
    });
  }

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
            (mergedData.type === 'dto' && false)) && (
            <View style={styles.womenTopBand} />
          )}

          <View style={styles.matchHeaderContent}>
            {/* Left: Gender badge and match info */}
            <View style={styles.matchHeaderLeft}>
              <View style={styles.genderSection}>
                {(() => {
                  // Try to get badge data from URL params first (from Tournament detail page)
                  let urlParamData: any = null;
                  try {
                    urlParamData = matchData ? JSON.parse(matchData) : null;
                  } catch (e) {
                    console.warn('[MatchDetailScreen] Failed to parse matchData param:', e);
                  }

                  // DEBUG: Log badge fields for first match
                  if ((mergedData.type === 'legacy' && (mergedData.data as any).visNo === '1') ||
                      (mergedData.type === 'dto' && mergedData.data.matchNo === 1)) {
                    console.log(`🏐 [DEBUG-MatchDetail] Match badge fields (${mergedData.type}):`, {
                      // URL param fields (from Tournament page)
                      urlParam_tournamentGender: urlParamData?.tournamentGender,
                      urlParam_noInTournament: urlParamData?.noInTournament,
                      // Legacy fields
                      legacy_tournamentGender: mergedData.type === 'legacy' ? (mergedData.data as any).tournamentGender : 'N/A',
                      legacy_noInTournament: mergedData.type === 'legacy' ? (mergedData.data as any).noInTournament : 'N/A',
                      legacy_matchCode: mergedData.type === 'legacy' ? (mergedData.data as any).matchCode : 'N/A',
                      // DTO fields
                      dto_tournamentGender: mergedData.type === 'dto' ? mergedData.data.tournamentGender : 'N/A',
                      dto_noInTournament: mergedData.type === 'dto' ? mergedData.data.noInTournament : 'N/A',
                      dto_matchNo: mergedData.type === 'dto' ? mergedData.data.matchNo : 'N/A'
                    });
                  }

                  // Badge fields with priority: URL params > legacy > DTO > fallback
                  const gender = urlParamData?.tournamentGender ||
                    (mergedData.type === 'legacy' ? (mergedData.data as any).tournamentGender : mergedData.data.tournamentGender) ||
                    'M';

                  const matchNumber = urlParamData?.noInTournament ||
                    (mergedData.type === 'legacy' ?
                      ((mergedData.data as any).noInTournament || (mergedData.data as any).matchCode || (mergedData.data as any).visNo) :
                      (mergedData.data.noInTournament || mergedData.data.matchNo)) ||
                    '1';

                  return (
                    <View style={[
                      styles.genderBadge,
                      gender === 'M' ? styles.menBadge : styles.womenBadge
                    ]}>
                      <Text style={[
                        styles.genderBadgeText,
                        gender === 'M' ? styles.menBadgeText : styles.womenBadgeText
                      ]}>
                        {getRoundPrefix(mergedData.data)}{gender}{matchNumber}
                      </Text>
                    </View>
                  );
                })()}
                {/* Court info - unified for both legacy and DTO */}
                {(mergedData.type === 'legacy' ? (mergedData.data as any).court : mergedData.type === 'dto' ? mergedData.data.venue?.court : null) && (
                  <Text style={styles.courtInfo}>
                    Court {mergedData.type === 'legacy' ?
                      ((mergedData.data as any).court?.courtNumber === 'CC' ? 'CC' : `C${(mergedData.data as any).court?.courtNumber}`) :
                      (mergedData.data.venue?.court === 'CC' ? 'CC' : `C${mergedData.data.venue?.court}`)
                    }
                  </Text>
                )}
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
              ) : mergedData.type === 'dto' && mergedData.data.round?.name ? (
                <RoundPhaseDisplay
                  round={mergedData.data.round.name}
                  phase={mergedData.data.round?.phase}
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
            ) : mergedData.type === 'dto' && mergedData.data.schedule?.localTime ? (
              <Text style={styles.matchTime}>
                {mergedData.data.schedule.localTime.includes(':')
                  ? mergedData.data.schedule.localTime.split(':').slice(0, 2).join(':')
                  : mergedData.data.schedule.localTime}
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
                      ? mergedData.data.teams?.home?.federationCode || 'XXX'
                      : 'XXX'
                  }
                  size="large"
                  style={styles.teamFlag}
                />
                <Text style={styles.countryCode}>
                  {mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data)
                    ? mergedData.data.team1.countryCode
                    : mergedData.type === 'dto'
                    ? mergedData.data.teams?.home?.federationCode
                    : ''}
                </Text>
              </View>
              <Text style={styles.teamName} numberOfLines={2}>
                {mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data)
                  ? mergedData.data.team1.teamName
                  : mergedData.type === 'dto'
                  ? mergedData.data.teams?.home?.teamName
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
                  ? (mergedData.data.teams?.home?.setWon || 0)
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
                      ? mergedData.data.teams?.away?.federationCode || 'XXX'
                      : 'XXX'
                  }
                  size="large"
                  style={styles.teamFlag}
                />
                <Text style={styles.countryCode}>
                  {mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data)
                    ? mergedData.data.team2.countryCode
                    : mergedData.type === 'dto'
                    ? mergedData.data.teams?.away?.federationCode
                    : ''}
                </Text>
              </View>
              <Text style={styles.teamName} numberOfLines={2}>
                {mergedData.type === 'legacy' && isBeachMatchCore(mergedData.data)
                  ? mergedData.data.team2.teamName
                  : mergedData.type === 'dto'
                  ? mergedData.data.teams?.away?.teamName
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
                  ? (mergedData.data.teams?.away?.setWon || 0)
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
                  : mergedData.type === 'dto' && mergedData.data.schedule?.localDate
                  ? mergedData.data.schedule.localDate
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
                  ? (mergedData.data.court?.courtNumber === 'CC' ? 'Center Court' : `Court ${mergedData.data.court?.courtNumber}`)
                  : mergedData.type === 'dto' && mergedData.data.venue?.court
                  ? (mergedData.data.venue?.court === 'CC' ? 'Center Court' : `Court ${mergedData.data.venue?.court}`)
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
                  ? mergedData.data.round?.name
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
                  ? mergedData.data.matchNo?.toString() || 'N/A'
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
              {mergedData.type === 'dto' && mergedData.data.officials && (
                <>
                  {mergedData.data.officials?.firstReferee && (
                    <View style={styles.refereeItem}>
                      <View style={styles.refereeInfo}>
                        <Text style={styles.refereePosition}>1st Referee</Text>
                        <Text style={styles.refereeName}>{mergedData.data.officials?.firstReferee?.name}</Text>
                      </View>
                      <FlagImage
                        countryCode={mergedData.data.officials?.firstReferee?.federationCode || 'XXX'}
                        size="large"
                        style={styles.refereeFlag}
                      />
                    </View>
                  )}
                  {mergedData.data.officials?.secondReferee && (
                    <View style={styles.refereeItem}>
                      <View style={styles.refereeInfo}>
                        <Text style={styles.refereePosition}>2nd Referee</Text>
                        <Text style={styles.refereeName}>{mergedData.data.officials?.secondReferee?.name}</Text>
                      </View>
                      <FlagImage
                        countryCode={mergedData.data.officials?.secondReferee?.federationCode || 'XXX'}
                        size="large"
                        style={styles.refereeFlag}
                      />
                    </View>
                  )}
                  {mergedData.data.officials?.others && mergedData.data.officials.others.length > 0 && (
                    <View style={styles.refereeItem}>
                      <View style={styles.refereeInfo}>
                        <Text style={styles.refereePosition}>Challenge Referee</Text>
                        <Text style={styles.refereeName}>{mergedData.data.officials?.others?.[0]?.name}</Text>
                      </View>
                      <FlagImage
                        countryCode={mergedData.data.officials?.others?.[0]?.federationCode || 'XXX'}
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
                        {(() => {
                          const duration = parseInt((mergedData.data as any).DurationSet1) || 0;
                          return `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;
                        })()}
                      </Text>
                    </View>
                  )}
                  {(mergedData.data as any).DurationSet2 && (
                    <View style={styles.durationItem}>
                      <Text style={styles.durationLabel}>Set 2</Text>
                      <Text style={styles.durationValue}>
                        {(() => {
                          const duration = parseInt((mergedData.data as any).DurationSet2) || 0;
                          return `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;
                        })()}
                      </Text>
                    </View>
                  )}
                  {(mergedData.data as any).DurationSet3 && (
                    <View style={styles.durationItem}>
                      <Text style={styles.durationLabel}>Set 3</Text>
                      <Text style={styles.durationValue}>
                        {(() => {
                          const duration = parseInt((mergedData.data as any).DurationSet3) || 0;
                          return `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;
                        })()}
                      </Text>
                    </View>
                  )}
                </>
              )}
              {mergedData.type === 'dto' && mergedData.data.sets?.filter(set => set.durationSec).map((set) => (
                <View key={set.set} style={styles.durationItem}>
                  <Text style={styles.durationLabel}>Set {set.set}</Text>
                  <Text style={styles.durationValue}>
                    {(() => {
                      const duration = set.durationSec || 0;
                      return `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;
                    })()}
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

