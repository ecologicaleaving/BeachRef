/**
 * Match Duration Hook
 * Manages live match duration updates synced with 5-second polling
 * User Story 2: Match Duration - Real-time duration display for live matches
 */

import { useState, useEffect, useCallback } from 'react';
import { BeachMatch, MatchDuration } from '../types';
import { matchDurationService } from '../services/MatchDurationService';

/**
 * Hook configuration options
 */
export interface UseMatchDurationOptions {
  /**
   * Auto-update interval for live matches (milliseconds)
   * Default: 5000 (5 seconds, synced with live score polling)
   */
  updateInterval?: number;

  /**
   * Whether to enable auto-updates for live matches
   * Default: true
   */
  enableAutoUpdate?: boolean;
}

/**
 * Hook return type
 */
export interface UseMatchDurationReturn {
  /**
   * Current duration data for the match
   */
  duration: MatchDuration | null;

  /**
   * Whether the match is currently live
   */
  isLive: boolean;

  /**
   * Manually update duration (useful when match data changes)
   */
  updateDuration: (match: BeachMatch) => void;

  /**
   * Formatted duration string for display (e.g., "45 min")
   */
  formattedDuration: string;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<UseMatchDurationOptions> = {
  updateInterval: 5000, // 5 seconds (synced with live score polling)
  enableAutoUpdate: true
};

/**
 * Match duration hook - tracks and updates match duration for live matches
 *
 * Features:
 * - Calculates total match duration from VIS API set durations
 * - Auto-updates every 5 seconds for live matches (synced with polling)
 * - Client-side calculation (no additional API calls)
 * - Caches match start times for accurate live duration
 *
 * @example
 * ```tsx
 * function MatchCard({ match }: { match: BeachMatch }) {
 *   const { formattedDuration, isLive } = useMatchDuration(match);
 *
 *   return (
 *     <View>
 *       <Text>Match Duration: {formattedDuration}</Text>
 *       {isLive && <Text>LIVE</Text>}
 *     </View>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With custom update interval
 * function MatchCard({ match }: { match: BeachMatch }) {
 *   const { duration, updateDuration } = useMatchDuration(match, {
 *     updateInterval: 10000, // Update every 10 seconds
 *     enableAutoUpdate: true
 *   });
 *
 *   // Manual update when match data changes
 *   useEffect(() => {
 *     updateDuration(match);
 *   }, [match.Status, match.Version]);
 *
 *   return <MatchDurationDisplay duration={duration} />;
 * }
 * ```
 */
export function useMatchDuration(
  match: BeachMatch | null,
  options: UseMatchDurationOptions = {}
): UseMatchDurationReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [duration, setDuration] = useState<MatchDuration | null>(null);

  /**
   * Update duration from match data
   */
  const updateDuration = useCallback((matchData: BeachMatch) => {
    try {
      const newDuration = matchDurationService.calculateDuration(matchData);
      setDuration(newDuration);
    } catch (error) {
      console.warn('[useMatchDuration] Failed to calculate duration:', error);
      setDuration(null);
    }
  }, []);

  /**
   * Initial calculation when match changes
   */
  useEffect(() => {
    if (match) {
      updateDuration(match);
    } else {
      setDuration(null);
    }
  }, [match, updateDuration]);

  /**
   * Auto-update for live matches (synced with 5-second polling)
   */
  useEffect(() => {
    if (!match || !opts.enableAutoUpdate) {
      return;
    }

    const isLive = match.Status === 'Running';

    if (!isLive) {
      return; // No auto-update for non-live matches
    }

    // Update immediately
    updateDuration(match);

    // Set up interval for auto-updates
    const intervalId = setInterval(() => {
      updateDuration(match);
    }, opts.updateInterval);

    return () => clearInterval(intervalId);
  }, [match, opts.enableAutoUpdate, opts.updateInterval, updateDuration]);

  /**
   * Format duration for display
   */
  const formattedDuration = duration
    ? duration.totalMinutes === 0
      ? '0 min'
      : `${duration.totalMinutes} min`
    : '--';

  return {
    duration,
    isLive: duration?.isLive ?? false,
    updateDuration,
    formattedDuration
  };
}

/**
 * Batch hook for managing multiple match durations
 * Useful for match lists where you want to track durations for all matches
 *
 * @example
 * ```tsx
 * function MatchList({ matches }: { matches: BeachMatch[] }) {
 *   const durations = useMatchDurationBatch(matches);
 *
 *   return matches.map(match => {
 *     const duration = durations.get(match.No);
 *     return (
 *       <MatchCard
 *         key={match.No}
 *         match={match}
 *         duration={duration}
 *       />
 *     );
 *   });
 * }
 * ```
 */
export function useMatchDurationBatch(
  matches: BeachMatch[],
  options: UseMatchDurationOptions = {}
): Map<string, MatchDuration> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [durations, setDurations] = useState<Map<string, MatchDuration>>(new Map());

  /**
   * Update all durations
   */
  const updateAllDurations = useCallback(() => {
    const newDurations = matchDurationService.updateDurations(matches);
    setDurations(newDurations);
  }, [matches]);

  /**
   * Initial calculation
   */
  useEffect(() => {
    updateAllDurations();
  }, [updateAllDurations]);

  /**
   * Auto-update for live matches
   */
  useEffect(() => {
    if (!opts.enableAutoUpdate) {
      return;
    }

    const hasLiveMatches = matches.some(m => m.Status === 'Running');

    if (!hasLiveMatches) {
      return; // No auto-update if no live matches
    }

    // Update immediately
    updateAllDurations();

    // Set up interval for auto-updates
    const intervalId = setInterval(() => {
      updateAllDurations();
    }, opts.updateInterval);

    return () => clearInterval(intervalId);
  }, [matches, opts.enableAutoUpdate, opts.updateInterval, updateAllDurations]);

  return durations;
}
