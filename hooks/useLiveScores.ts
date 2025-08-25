/**
 * Live Score Hook for Tournament Screen Integration
 * Tournament screen live score polling with lifecycle management
 * Part of EPIC-001 Live Score Display - Story 1.3
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';
import { BeachLive } from '../types/beach-live';
import { LiveScorePollingService, LiveScoreCallback, createLiveScorePollingService } from '../services/live-score/LiveScorePollingService';
import { ConnectionCircuitBreaker } from '../services/ConnectionCircuitBreaker';
import { VisApiClient } from '../services/api/VisApiClient';
import { DEFAULT_RETRY_CONFIG } from '../types/api-v2';

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
}

/**
 * Custom hook for managing live score polling in tournament screens
 * Follows the useAssignmentStatus pattern with proper lifecycle management
 */
export function useLiveScores(options: UseLiveScoresOptions): UseLiveScoresReturn {
  const { matchNumbers, autoStart = true, pollingService: customPollingService } = options;

  // State management
  const [liveScores, setLiveScores] = useState<Record<number, LiveScoreState>>({});
  const [isOnline, setIsOnline] = useState(true);
  const [statistics, setStatistics] = useState({});

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

  // Start polling for all matches
  const startPolling = useCallback(() => {
    if (!pollingServiceRef.current || !isOnline || !isActiveRef.current) {
      return;
    }

    matchNumbers.forEach(matchNo => {
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
      pollingServiceRef.current!.startPolling(matchNo, callback);
    });
  }, [matchNumbers, isOnline, createLiveScoreCallback]);

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
    matchNumbers.forEach(matchNo => {
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
  }, [matchNumbers]);

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
    pollingServiceRef.current.startPolling(matchNo, callback);
  }, [isOnline, createLiveScoreCallback]);

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
    statistics
  };
}

export default useLiveScores;