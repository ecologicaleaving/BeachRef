/**
 * @fileoverview MatchStatusPollingManager for adaptive polling intervals
 * Implements status-aware polling management for optimal performance
 * Part of Story 1.3: Optimize Polling and Field Selection
 */

import { MatchPollingStatus, MatchStatusPollingConfig, FieldSelectionMode } from '../types/api-v2';

/**
 * Status change listener callback
 */
export type StatusChangeCallback = (matchNo: number, oldStatus: MatchPollingStatus, newStatus: MatchPollingStatus) => void;

/**
 * Manager for adaptive polling intervals based on match status
 * Implements VIS guide recommendations for status-based polling optimization
 */
export class MatchStatusPollingManager {
  private matchStatuses: Map<number, MatchPollingStatus> = new Map();
  private statusChangeListeners: StatusChangeCallback[] = [];
  
  // Polling configurations per VIS guide recommendations
  private static readonly POLLING_CONFIGS: Record<MatchPollingStatus, MatchStatusPollingConfig> = {
    [MatchPollingStatus.RUNNING]: {
      status: MatchPollingStatus.RUNNING,
      intervalMs: 3000, // 3 seconds for running matches
      shouldPoll: true,
      fieldSelectionMode: FieldSelectionMode.SLIM // Use slim fields for frequent polling
    },
    [MatchPollingStatus.SCHEDULED]: {
      status: MatchPollingStatus.SCHEDULED,
      intervalMs: 30000, // 30 seconds for scheduled matches
      shouldPoll: true,
      fieldSelectionMode: FieldSelectionMode.FULL // Full fields less frequently
    },
    [MatchPollingStatus.FINISHED]: {
      status: MatchPollingStatus.FINISHED,
      intervalMs: 0, // No polling for finished matches
      shouldPoll: false,
      fieldSelectionMode: FieldSelectionMode.FULL // Full fields when needed
    }
  };

  /**
   * Get polling configuration for a match status
   * @param status - Match status
   * @returns Polling configuration
   */
  getPollingConfig(status: MatchPollingStatus): MatchStatusPollingConfig {
    return MatchStatusPollingManager.POLLING_CONFIGS[status];
  }

  /**
   * Update match status and notify listeners if changed
   * @param matchNo - Match number
   * @param status - New status
   * @returns True if status changed
   */
  updateMatchStatus(matchNo: number, status: MatchPollingStatus): boolean {
    const currentStatus = this.matchStatuses.get(matchNo);
    
    if (currentStatus === status) {
      return false; // No change
    }

    const oldStatus = currentStatus || MatchPollingStatus.SCHEDULED; // Default for new matches
    this.matchStatuses.set(matchNo, status);

    // Notify listeners of status change
    this.statusChangeListeners.forEach(listener => {
      try {
        listener(matchNo, oldStatus, status);
      } catch (error) {
        console.error('Error in status change listener:', error);
      }
    });

    return true;
  }

  /**
   * Get current status for a match
   * @param matchNo - Match number
   * @returns Current status or SCHEDULED as default
   */
  getMatchStatus(matchNo: number): MatchPollingStatus {
    return this.matchStatuses.get(matchNo) || MatchPollingStatus.SCHEDULED;
  }

  /**
   * Get polling interval for a specific match
   * @param matchNo - Match number
   * @returns Polling interval in milliseconds
   */
  getPollingInterval(matchNo: number): number {
    const status = this.getMatchStatus(matchNo);
    return this.getPollingConfig(status).intervalMs;
  }

  /**
   * Check if polling should be active for a match
   * @param matchNo - Match number
   * @returns True if polling should be active
   */
  shouldPoll(matchNo: number): boolean {
    const status = this.getMatchStatus(matchNo);
    return this.getPollingConfig(status).shouldPoll;
  }

  /**
   * Get recommended field selection mode for a match
   * @param matchNo - Match number
   * @returns Field selection mode
   */
  getFieldSelectionMode(matchNo: number): FieldSelectionMode {
    const status = this.getMatchStatus(matchNo);
    return this.getPollingConfig(status).fieldSelectionMode;
  }

  /**
   * Add status change listener
   * @param listener - Callback for status changes
   */
  addStatusChangeListener(listener: StatusChangeCallback): void {
    this.statusChangeListeners.push(listener);
  }

  /**
   * Remove status change listener
   * @param listener - Callback to remove
   */
  removeStatusChangeListener(listener: StatusChangeCallback): void {
    const index = this.statusChangeListeners.indexOf(listener);
    if (index > -1) {
      this.statusChangeListeners.splice(index, 1);
    }
  }

  /**
   * Remove match from tracking
   * @param matchNo - Match number to remove
   */
  removeMatch(matchNo: number): void {
    this.matchStatuses.delete(matchNo);
  }

  /**
   * Get all tracked matches with their statuses
   * @returns ReadonlyMap of match numbers to statuses
   */
  getAllMatches(): ReadonlyMap<number, MatchPollingStatus> {
    return this.matchStatuses as ReadonlyMap<number, MatchPollingStatus>;
  }

  /**
   * Clear all tracked matches
   */
  clear(): void {
    this.matchStatuses.clear();
  }

  /**
   * Get performance metrics for adaptive polling
   * @returns Performance summary
   */
  getPerformanceMetrics(): {
    totalMatches: number;
    runningMatches: number;
    scheduledMatches: number;
    finishedMatches: number;
    activePolling: number;
  } {
    const statusCounts = {
      [MatchPollingStatus.RUNNING]: 0,
      [MatchPollingStatus.SCHEDULED]: 0,
      [MatchPollingStatus.FINISHED]: 0
    };

    this.matchStatuses.forEach(status => {
      statusCounts[status]++;
    });

    return {
      totalMatches: this.matchStatuses.size,
      runningMatches: statusCounts[MatchPollingStatus.RUNNING],
      scheduledMatches: statusCounts[MatchPollingStatus.SCHEDULED],
      finishedMatches: statusCounts[MatchPollingStatus.FINISHED],
      activePolling: statusCounts[MatchPollingStatus.RUNNING] + statusCounts[MatchPollingStatus.SCHEDULED]
    };
  }
}

/**
 * Singleton instance for application-wide use
 */
export const matchStatusPollingManager = new MatchStatusPollingManager();