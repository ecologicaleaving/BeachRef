/**
 * Match Duration Service
 * Calculates match duration from VIS API StartTime and EndTime fields
 * Simplified implementation using server-provided timestamps
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
 * Match Duration Service
 * Singleton service for calculating match durations
 */
export class MatchDurationService {
  private static instance: MatchDurationService;

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
   * Uses StartTime and EndTime fields from VIS API
   * @param match - BeachMatch from VIS API
   * @returns MatchDuration with calculated times
   */
  public calculateDuration(match: BeachMatch): MatchDuration {
    const isLive = match.Status === MATCH_STATUS.RUNNING;
    const matchNo = match.No;

    // Parse set durations from VIS API (still available for per-set display)
    const set1Duration = this.parseSetDuration(match.DurationSet1);
    const set2Duration = this.parseSetDuration(match.DurationSet2);
    const set3Duration = this.parseSetDuration(match.DurationSet3);

    // Calculate total duration using VIS API timestamps
    const totalMinutes = this.calculateTotalDurationFromTimestamps(match);

    // Calculate current set duration for live matches
    const currentSetMinutes = isLive ? this.getCurrentSetDuration(match) : null;

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
   * Parse VIS API set duration string to minutes
   * @param duration - Duration string from VIS API (e.g., "15:30", "15")
   * @returns Minutes as number, or null if not available
   */
  private parseSetDuration(duration: string | undefined): number | null {
    if (!duration || duration.trim() === '') {
      return null;
    }

    // Handle MM:SS format
    const parts = duration.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0] ?? '0', 10);
      const seconds = parseInt(parts[1] ?? '0', 10);
      return minutes + Math.round(seconds / 60);
    }

    // Handle MM format
    if (parts.length === 1) {
      return parseInt(parts[0] ?? '0', 10);
    }

    return null;
  }

  /**
   * Calculate total match duration from VIS API timestamps
   * Uses StartTime and EndTime fields from VIS API
   * @param match - BeachMatch from VIS API
   * @returns Total duration in minutes
   */
  private calculateTotalDurationFromTimestamps(match: BeachMatch): number {
    const isLive = match.Status === MATCH_STATUS.RUNNING;

    // For live matches: currentTime - startTime
    if (isLive && match.StartTime) {
      const startMs = this.parseTimeToMs(match.StartTime);
      if (startMs !== null) {
        const elapsedMs = Date.now() - startMs;
        return Math.floor(elapsedMs / 60000); // Convert to minutes
      }
    }

    // For finished matches: endTime - startTime
    if (match.StartTime && match.EndTime) {
      const startMs = this.parseTimeToMs(match.StartTime);
      const endMs = this.parseTimeToMs(match.EndTime);

      if (startMs !== null && endMs !== null) {
        const durationMs = endMs - startMs;
        return Math.floor(durationMs / 60000); // Convert to minutes
      }
    }

    // Fallback: sum of set durations if timestamps not available
    const set1 = this.parseSetDuration(match.DurationSet1) ?? 0;
    const set2 = this.parseSetDuration(match.DurationSet2) ?? 0;
    const set3 = this.parseSetDuration(match.DurationSet3) ?? 0;
    return set1 + set2 + set3;
  }

  /**
   * Get current set duration for live matches
   * Uses the most recent set's duration value from VIS API
   */
  private getCurrentSetDuration(match: BeachMatch): number | null {
    // Check which set is currently being played
    const hasSet3 = this.hasSetStarted(match.PointsTeamASet3, match.PointsTeamBSet3);
    const hasSet2 = this.hasSetStarted(match.PointsTeamASet2, match.PointsTeamBSet2);
    const hasSet1 = this.hasSetStarted(match.PointsTeamASet1, match.PointsTeamBSet1);

    // Return the duration of the current set
    if (hasSet3) {
      return this.parseSetDuration(match.DurationSet3);
    }
    if (hasSet2) {
      return this.parseSetDuration(match.DurationSet2);
    }
    if (hasSet1) {
      return this.parseSetDuration(match.DurationSet1);
    }

    return null;
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
   * Parse time string (HH:MM format) to milliseconds since midnight today
   * @param timeStr - Time string in HH:MM format (e.g., "14:30")
   * @returns Milliseconds since midnight today, or null if invalid
   */
  private parseTimeToMs(timeStr: string): number | null {
    if (!timeStr || !timeStr.includes(':')) {
      return null;
    }

    const parts = timeStr.split(':');
    if (parts.length !== 2) {
      return null;
    }

    const hours = parseInt(parts[0] ?? '0', 10);
    const minutes = parseInt(parts[1] ?? '0', 10);

    if (isNaN(hours) || isNaN(minutes)) {
      return null;
    }

    // Create timestamp for today at the specified time
    const now = new Date();
    const matchTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
      0,
      0
    );

    return matchTime.getTime();
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

}

/**
 * Singleton export for convenience
 */
export const matchDurationService = MatchDurationService.getInstance();
