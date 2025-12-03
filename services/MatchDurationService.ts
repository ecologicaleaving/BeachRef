/**
 * Match Duration Service
 * Calculates live match duration from VIS API data
 * Syncs with 5-second live score polling for real-time updates
 *
 * VIS API Duration fields contain positive 32-bit integers representing seconds.
 * Example: DurationSet1 = "1530" means 25 minutes 30 seconds
 */

import { BeachMatch, MatchDuration } from '../types';

/**
 * Match status constants from VIS API
 */
const MATCH_STATUS = {
  RUNNING: 'Running',
  SCHEDULED: 'Scheduled',
  FINISHED: 'Finished',
  CANCELLED: 'Cancelled',
} as const;

/**
 * Legacy duration parsing regex (format: "MM:SS") for cached data
 * @deprecated VIS API now returns integer seconds
 */
const LEGACY_DURATION_REGEX = /^(\d{1,3}):(\d{2})$/;

/**
 * Match Duration Service
 * Singleton service for calculating match durations
 */
export class MatchDurationService {
  private static instance: MatchDurationService;

  // In-memory cache of match start times for running matches
  private matchStartTimes: Map<string, number> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): MatchDurationService {
    if (!MatchDurationService.instance) {
      MatchDurationService.instance = new MatchDurationService();
    }
    return MatchDurationService.instance;
  }

  /**
   * Calculate match duration from VIS API match data
   * @param match - BeachMatch from VIS API
   * @returns MatchDuration with calculated times
   */
  public calculateDuration(match: BeachMatch): MatchDuration {
    const isLive = match.Status === MATCH_STATUS.RUNNING;
    const matchNo = match.No;

    // Initialize start time if this is a newly running match
    if (isLive && !this.matchStartTimes.has(matchNo)) {
      this.matchStartTimes.set(matchNo, Date.now());
    }

    // Clear start time if match is no longer running
    if (!isLive && this.matchStartTimes.has(matchNo)) {
      this.matchStartTimes.delete(matchNo);
    }

    // Parse set durations from VIS API
    const set1Duration = this.parseSetDuration(match.DurationSet1);
    const set2Duration = this.parseSetDuration(match.DurationSet2);
    const set3Duration = this.parseSetDuration(match.DurationSet3);

    // Calculate total duration
    const totalMinutes = this.calculateTotalDuration(
      set1Duration,
      set2Duration,
      set3Duration,
      isLive,
      matchNo
    );

    // Calculate current set duration for live matches
    const currentSetMinutes = isLive ? this.calculateCurrentSetDuration(match) : null;

    return {
      matchNo,
      totalMinutes,
      currentSetMinutes,
      set1Duration,
      set2Duration,
      set3Duration,
      isLive,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Parse VIS API set duration to minutes
   *
   * VIS API returns Duration as positive 32-bit integer (seconds).
   * Example: "1530" = 25 minutes 30 seconds = returns 26 minutes (rounded)
   *
   * Also handles legacy "mm:ss" format for backward compatibility with cached data.
   *
   * @param duration - Duration value (integer seconds or legacy "mm:ss" format)
   * @returns Minutes as number, or null if not available
   */
  private parseSetDuration(duration: string | undefined): number | null {
    if (!duration || duration.trim() === '') {
      return null;
    }

    const trimmed = duration.trim();

    // Check if it's legacy "mm:ss" format (contains colon)
    if (trimmed.includes(':')) {
      const matchResult = trimmed.match(LEGACY_DURATION_REGEX);
      if (!matchResult) {
        return null;
      }
      const minutes = parseInt(matchResult[1] ?? '0', 10);
      const seconds = matchResult[2] ? parseInt(matchResult[2], 10) : 0;
      return minutes + Math.round(seconds / 60);
    }

    // Primary: Parse as integer seconds (VIS API format)
    const seconds = parseInt(trimmed, 10);
    if (isNaN(seconds) || seconds < 0) {
      return null;
    }

    // Convert seconds to minutes (rounded)
    return Math.round(seconds / 60);
  }

  /**
   * Calculate total match duration
   */
  private calculateTotalDuration(
    set1: number | null,
    set2: number | null,
    set3: number | null,
    isLive: boolean,
    matchNo: string
  ): number {
    let total = 0;

    // Add completed set durations
    if (set1 !== null) total += set1;
    if (set2 !== null) total += set2;
    if (set3 !== null) total += set3;

    // Add current set duration for live matches
    if (isLive) {
      const currentSetDuration = this.calculateLiveSetDuration(matchNo);
      total += currentSetDuration;
    }

    return total;
  }

  /**
   * Calculate duration of current set for live matches
   */
  private calculateCurrentSetDuration(match: BeachMatch): number | null {
    // Determine which set is currently being played
    const hasSet1 = this.hasSetStarted(match.PointsTeamASet1, match.PointsTeamBSet1);
    const hasSet2 = this.hasSetStarted(match.PointsTeamASet2, match.PointsTeamBSet2);
    const hasSet3 = this.hasSetStarted(match.PointsTeamASet3, match.PointsTeamBSet3);

    // If Set3 has started, use Set3 duration
    if (hasSet3) {
      const set3Duration = this.parseSetDuration(match.DurationSet3);
      if (set3Duration !== null) {
        return set3Duration;
      }
    }

    // If Set2 has started (but not Set3), use Set2 duration
    if (hasSet2 && !hasSet3) {
      const set2Duration = this.parseSetDuration(match.DurationSet2);
      if (set2Duration !== null) {
        return set2Duration;
      }
    }

    // If only Set1 has started, use Set1 duration
    if (hasSet1 && !hasSet2 && !hasSet3) {
      const set1Duration = this.parseSetDuration(match.DurationSet1);
      if (set1Duration !== null) {
        return set1Duration;
      }
    }

    // Fallback: calculate from match start time
    return this.calculateLiveSetDuration(match.No);
  }

  /**
   * Check if a set has started (either team has points)
   */
  private hasSetStarted(teamAPoints: string | undefined, teamBPoints: string | undefined): boolean {
    const pointsA = parseInt(teamAPoints ?? '0', 10);
    const pointsB = parseInt(teamBPoints ?? '0', 10);
    return pointsA > 0 || pointsB > 0;
  }

  /**
   * Calculate live set duration from start time
   */
  private calculateLiveSetDuration(matchNo: string): number {
    const startTime = this.matchStartTimes.get(matchNo);
    if (!startTime) {
      return 0;
    }

    const elapsedMs = Date.now() - startTime;
    return Math.floor(elapsedMs / 60000); // Convert to minutes
  }

  /**
   * Update match durations from new polling data
   * @param matches - Array of BeachMatch from latest poll
   * @returns Map of matchNo → MatchDuration
   */
  public updateDurations(matches: BeachMatch[]): Map<string, MatchDuration> {
    const durations = new Map<string, MatchDuration>();

    for (const match of matches) {
      const duration = this.calculateDuration(match);
      durations.set(match.No, duration);
    }

    return durations;
  }

  /**
   * Clear cached start times (e.g., on app restart or manual refresh)
   */
  public clearCache(): void {
    this.matchStartTimes.clear();
  }

  /**
   * Get cached start time for a match
   * @param matchNo - Match identifier
   * @returns Start timestamp in milliseconds, or null if not cached
   */
  public getStartTime(matchNo: string): number | null {
    return this.matchStartTimes.get(matchNo) ?? null;
  }

  /**
   * Manually set start time for a match (used for testing or manual entry)
   */
  public setStartTime(matchNo: string, timestamp: number): void {
    this.matchStartTimes.set(matchNo, timestamp);
  }
}

/**
 * Singleton export for convenience
 */
export const matchDurationService = MatchDurationService.getInstance();
