/**
 * Live Score Hook for Tournament Screen Integration
 * Tournament screen live score polling with lifecycle management
 * Part of EPIC-001 Live Score Display - Story 1.3
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';
import { BeachLive } from '../types/beach-live';
import { LiveScorePollingService, LiveScoreCallback, createLiveScorePollingService } from '../services/live-score/LiveScorePollingService';
import { ConnectionCircuitBreaker } from '../services/ConnectionCircuitBreaker';
import { VisApiClient } from '../services/api/VisApiClient';
import { DEFAULT_RETRY_CONFIG, MatchPollingStatus } from '../types/api-v2';
import { matchStatusPollingManager } from '../services/MatchStatusPollingManager';

/**
 * Live score state for a single match
 */
interface LiveScoreState {
  /** Match number */
  matchNo: number;
  /** Current live score data or null if not available */
  liveScore: BeachLive | null;
  /** Loading state for this match */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether polling is active */
  isPolling: boolean;
  /** Last update timestamp */
  lastUpdated: Date | null;
}

/**
 * Hook configuration options
 */
interface UseLiveScoresOptions {
  /** Match numbers to poll for live scores */
  matchNumbers: number[];
  /** Whether to start polling immediately (default: true) */
  autoStart?: boolean;
  /** Custom polling service instance */
  pollingService?: LiveScorePollingService;
  /** Enable adaptive polling based on match status (default: false) */
  useAdaptivePolling?: boolean;
  /** Custom stale time for React Query cache (default: based on adaptive polling) */
  staleTimeMs?: number;
  /** Custom cache time for React Query cache (default: based on adaptive polling) */
  cacheTimeMs?: number;
}

/**
 * Hook return interface
 */
interface UseLiveScoresReturn {
  /** Live score states by match number */
  liveScores: Record<number, LiveScoreState>;
  /** Overall loading state */
  isLoading: boolean;
  /** Network connectivity status */
  isOnline: boolean;
  /** Whether any matches are currently polling */
  isPolling: boolean;
  /** Start polling for all configured matches */
  startPolling: () => void;
  /** Stop polling for all matches */
  stopPolling: () => void;
  /** Start polling for a specific match */
  startPollingMatch: (matchNo: number) => void;
  /** Stop polling for a specific match */
  stopPollingMatch: (matchNo: number) => void;
  /** Get live score data for a match (with fallback to cache) */
  getLiveScore: (matchNo: number) => BeachLive | null;
  /** Refresh live scores manually */
  refreshLiveScores: () => void;
  /** Polling service statistics */
  statistics: any;
  /** Get adaptive polling performance metrics */
  getAdaptivePollingMetrics: (timeRangeMs?: number) => any;
  /** Get performance summary */
  getPerformanceSummary: (timeRangeMs?: number) => any;
  /** Get React Query cache configuration for a specific match */
  getCacheConfigForMatch: (matchNo: number) => { staleTime: number; cacheTime: number };
  /** Get overall cache configuration */
  getCacheConfig: () => { staleTime: number; cacheTime: number };
}

/**
 * Get React Query cache configuration based on adaptive polling settings
 */
function getCacheConfiguration(useAdaptivePolling: boolean, staleTimeMs?: number, cacheTimeMs?: number) {
  if (!useAdaptivePolling) {
    return {
      staleTime: staleTimeMs || 5000, // 5 seconds for traditional polling
      cacheTime: cacheTimeMs || 30000 // 30 seconds for traditional polling
    };
  }

  // Adaptive polling cache configuration
  return {
    staleTime: staleTimeMs || 3000, // 3 seconds for running matches (matches fastest polling)
    cacheTime: cacheTimeMs || 60000 // 1 minute for adaptive polling (matches scheduled interval)
  };
}

/**
 * Get status-specific cache times for individual matches
 */
function getStatusBasedCacheTime(matchNo: number, useAdaptivePolling: boolean): { staleTime: number; cacheTime: number } {
  if (!useAdaptivePolling) {
    return { staleTime: 5000, cacheTime: 30000 };
  }

  const status = matchStatusPollingManager.getMatchStatus(matchNo);

  switch (status) {
    case MatchPollingStatus.RUNNING:
      return {
        staleTime: 14000, // Slightly less than polling interval (15s)
        cacheTime: 30000 // Short cache for frequently changing data
      };
    
    case MatchPollingStatus.SCHEDULED:
      return {
        staleTime: 55000, // Slightly less than polling interval (60s)
        cacheTime: 120000 // Longer cache for stable data (2 minutes)
      };
    
    case MatchPollingStatus.FINISHED:
      return { 
        staleTime: 300000, // 5 minutes (data won't change)
        cacheTime: 600000 // 10 minutes (can cache longer)
      };
    
    default:
      return { staleTime: 5000, cacheTime: 30000 };
  }
}

/**
 * Custom hook for managing live score polling in tournament screens
 * Follows the useAssignmentStatus pattern with proper lifecycle management
 */
export function useLiveScores(options: UseLiveScoresOptions): UseLiveScoresReturn {
  const { 
    matchNumbers, 
    autoStart = true, 
    pollingService: customPollingService,
    useAdaptivePolling = false,
    staleTimeMs,
    cacheTimeMs
  } = options;

  // State management
  const [liveScores, setLiveScores] = useState<Record<number, LiveScoreState>>({});
  const [isOnline, setIsOnline] = useState(true);
  const [statistics, setStatistics] = useState({});

  /**
   * `matchNumbers` stabilizzato PER VALORE.
   *
   * Arriva dalle proprieta' come array, e chi chiama scrive quasi sempre un
   * letterale (`matchNumbers: [1, 2]`): identita' nuova a ogni render. Con
   * quell'array fra le dipendenze si chiudeva un ciclo —
   *
   *     effetto -> setLiveScores(oggetto nuovo) -> render
   *             -> matchNumbers nuovo -> effetto
   *
   * — che non finiva mai. In jest riempiva 4 GB e uccideva il worker,
   * portandosi dietro le suite assegnate a quel processo: e' la causa dei
   * "tre run, tre numeri" della #94. In un browser non si vede come un crash,
   * si vede come una sottoscrizione NetInfo dietro l'altra e un polling che
   * riparte in continuazione.
   *
   * Terza occorrenza della stessa famiglia dopo #81 (useRepositoryData) e
   * useAnalyticsDashboard: una dipendenza che cambia identita' ma non valore.
   *
   * La chiave e' il contenuto, quindi due array diversi con gli stessi numeri
   * sono lo stesso ingresso — che e' esattamente cio' che il hook intende.
   */
  const chiaveIncontri = matchNumbers.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const incontri = useMemo(() => matchNumbers, [chiaveIncontri]);

  // Service instances (created once)
  const pollingServiceRef = useRef<LiveScorePollingService>();
  const circuitBreakerRef = useRef<ConnectionCircuitBreaker>();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isActiveRef = useRef(true);

  // Initialize services
  useEffect(() => {
    if (!pollingServiceRef.current) {
      if (customPollingService) {
        pollingServiceRef.current = customPollingService;
      } else {
        // Create default service instances following service factory patterns
        const visApiClient = new VisApiClient({
          baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
          timeoutMs: 10000,
          maxRetries: 3,
          retryDelayMs: 1000,
          exponentialBackoff: true,
          // No custom headers on purpose: any header outside the CORS safelist makes
          // the POST non-simple, and the VIS preflight is not cacheable — every
          // request would cost two round trips. See VisApiClientConfig.headers (#67).
          enableLogging: true
        }, DEFAULT_RETRY_CONFIG);
        const circuitBreaker = new ConnectionCircuitBreaker({
          failureThreshold: 3,
          resetTimeoutMs: 30000,
          monitorFailureRate: true
        });
        circuitBreakerRef.current = circuitBreaker;
        pollingServiceRef.current = createLiveScorePollingService(visApiClient, circuitBreaker);
      }
    }
  }, [customPollingService]);

  // Create live score callback for a specific match
  const createLiveScoreCallback = useCallback((matchNo: number): LiveScoreCallback => {
    return (data: BeachLive, error?: Error) => {
      setLiveScores(prev => ({
        ...prev,
        [matchNo]: {
          ...prev[matchNo],
          liveScore: error ? prev[matchNo]?.liveScore || null : data,
          error: error || null,
          isLoading: false,
          lastUpdated: error ? prev[matchNo]?.lastUpdated || null : new Date()
        }
      }));

      // Update statistics
      if (pollingServiceRef.current) {
        setStatistics(pollingServiceRef.current.getStatistics());
      }
    };
  }, []);

  /**
   * Le statistiche si leggono dal servizio anche PRIMA del primo sondaggio.
   *
   * `setStatistics` veniva chiamato solo dentro la callback di un sondaggio
   * riuscito: chi montava il hook con `autoStart: false` — o chi lo montava e
   * basta — leggeva `{}` mentre il servizio aveva gia' i suoi numeri. Il
   * campo prometteva "statistiche del servizio di polling" e restituiva il
   * vuoto.
   */
  useEffect(() => {
    if (pollingServiceRef.current) {
      setStatistics(pollingServiceRef.current.getStatistics());
    }
  }, [customPollingService]);

  // Start polling for all matches
  const startPolling = useCallback(() => {
    if (!pollingServiceRef.current || !isOnline || !isActiveRef.current) {
      return;
    }

    incontri.forEach(matchNo => {
      // Set loading state
      setLiveScores(prev => ({
        ...prev,
        [matchNo]: {
          ...prev[matchNo],
          isLoading: true,
          isPolling: true,
          error: null
        }
      }));

      // Start polling with callback
      const callback = createLiveScoreCallback(matchNo);
      pollingServiceRef.current!.startPolling(matchNo, callback, [], useAdaptivePolling);
    });
  }, [incontri, isOnline, createLiveScoreCallback, useAdaptivePolling]);

  // Stop polling for all matches
  const stopPolling = useCallback(() => {
    if (!pollingServiceRef.current) {
      return;
    }

    pollingServiceRef.current.stopAllPolling();

    // Update states
    setLiveScores(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(matchNoStr => {
        const matchNo = parseInt(matchNoStr);
        updated[matchNo] = {
          ...updated[matchNo],
          isLoading: false,
          isPolling: false
        };
      });
      return updated;
    });
  }, []);

  // Initialize live score states for all match numbers
  useEffect(() => {
    const initialStates: Record<number, LiveScoreState> = {};
    incontri.forEach(matchNo => {
      initialStates[matchNo] = {
        matchNo,
        liveScore: pollingServiceRef.current?.getCachedLiveScore(matchNo) || null,
        isLoading: false,
        error: null,
        isPolling: false,
        lastUpdated: null
      };
    });
    setLiveScores(initialStates);
  }, [incontri]);

  // Network connectivity monitoring (following useAssignmentStatus pattern)
  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected ?? false;
      setIsOnline(isConnected);

      // Stop polling when offline, restart when back online
      if (!isConnected) {
        stopPolling();
      } else if (isActiveRef.current && autoStart) {
        // Restart polling when back online if screen is active
        startPolling();
      }
    });

    // Get initial network state
    NetInfo.fetch().then(state => {
      const isConnected = state.isConnected ?? false;
      setIsOnline(isConnected);
    });

    return unsubscribeNetInfo;
  }, [autoStart, startPolling, stopPolling]);

  // App state monitoring for background/foreground handling
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - restart polling if screen is focused
        if (isActiveRef.current && autoStart && isOnline) {
          startPolling();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background - stop polling to save battery/data
        stopPolling();
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [autoStart, isOnline, startPolling]);

  // Screen focus/blur handling using useFocusEffect
  useFocusEffect(
    useCallback(() => {
      // Screen gained focus - start polling if auto-start enabled
      isActiveRef.current = true;
      if (autoStart && isOnline) {
        startPolling();
      }

      return () => {
        // Screen lost focus - stop polling to prevent memory leaks
        isActiveRef.current = false;
        stopPolling();
      };
    }, [autoStart, isOnline, startPolling, stopPolling])
  );

  // Start polling for specific match
  const startPollingMatch = useCallback((matchNo: number) => {
    if (!pollingServiceRef.current || !isOnline || !isActiveRef.current) {
      return;
    }

    setLiveScores(prev => ({
      ...prev,
      [matchNo]: {
        ...prev[matchNo],
        isLoading: true,
        isPolling: true,
        error: null
      }
    }));

    const callback = createLiveScoreCallback(matchNo);
    pollingServiceRef.current.startPolling(matchNo, callback, [], useAdaptivePolling);
  }, [isOnline, createLiveScoreCallback, useAdaptivePolling]);

  // Stop polling for specific match
  const stopPollingMatch = useCallback((matchNo: number) => {
    if (!pollingServiceRef.current) {
      return;
    }

    pollingServiceRef.current.stopPolling(matchNo);

    setLiveScores(prev => ({
      ...prev,
      [matchNo]: {
        ...prev[matchNo],
        isLoading: false,
        isPolling: false
      }
    }));
  }, []);

  // Get live score with fallback to cache
  const getLiveScore = useCallback((matchNo: number): BeachLive | null => {
    const state = liveScores[matchNo];
    if (state?.liveScore) {
      return state.liveScore;
    }

    // Fallback to cached data
    return pollingServiceRef.current?.getCachedLiveScore(matchNo) || null;
  }, [liveScores]);

  // Manual refresh
  const refreshLiveScores = useCallback(() => {
    if (isActiveRef.current && isOnline) {
      stopPolling();
      // Small delay to ensure cleanup, then restart
      setTimeout(startPolling, 100);
    }
  }, [isOnline, stopPolling, startPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingServiceRef.current) {
        pollingServiceRef.current.destroy();
      }
    };
  }, []);

  // Cache configuration functions
  const getCacheConfigForMatch = useCallback((matchNo: number) => {
    return getStatusBasedCacheTime(matchNo, useAdaptivePolling);
  }, [useAdaptivePolling]);

  const getCacheConfig = useCallback(() => {
    return getCacheConfiguration(useAdaptivePolling, staleTimeMs, cacheTimeMs);
  }, [useAdaptivePolling, staleTimeMs, cacheTimeMs]);

  // Adaptive polling metrics functions
  const getAdaptivePollingMetrics = useCallback((timeRangeMs?: number) => {
    return pollingServiceRef.current?.getAdaptivePollingMetrics?.(timeRangeMs) || null;
  }, []);
  
  const getPerformanceSummary = useCallback((timeRangeMs?: number) => {
    return pollingServiceRef.current?.getPerformanceSummary?.(timeRangeMs) || null;
  }, []);

  // Derived state
  const isLoading = Object.values(liveScores).some(state => state.isLoading);
  const isPolling = Object.values(liveScores).some(state => state.isPolling);

  return {
    liveScores,
    isLoading,
    isOnline,
    isPolling,
    startPolling,
    stopPolling,
    startPollingMatch,
    stopPollingMatch,
    getLiveScore,
    refreshLiveScores,
    statistics,
    getAdaptivePollingMetrics,
    getPerformanceSummary,
    getCacheConfigForMatch,
    getCacheConfig
  };
}

export default useLiveScores;