/**
 * Sync Strategy Interface
 *
 * Defines the contract for different sync strategies.
 * Allows easy addition of new sync strategies in the future.
 *
 * CURRENT:
 * - LazyLoadingStrategy (active)
 *
 * FUTURE:
 * - BackgroundSyncStrategy (planned)
 * - OnDemandSyncStrategy (planned)
 * - ScheduledSyncStrategy (planned)
 */

import { BeachMatchCore } from '../../types/match-v2';
import { TournamentCore } from '../../types/tournament-v2';

/**
 * Sync strategy result
 */
export interface SyncStrategyResult<T> {
  success: boolean;
  data?: T;
  itemsSynced: number;
  errors: string[];
  duration: number;
}

/**
 * Sync strategy options
 */
export interface SyncStrategyOptions {
  /** Force refresh even if data exists */
  forceRefresh?: boolean;
  /** Maximum number of items to sync */
  maxItems?: number;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Progress callback */
  onProgress?: (current: number, total: number, message?: string) => void;
  /** Cancellation check callback */
  onCancel?: () => boolean;
}

/**
 * Base sync strategy interface
 *
 * All sync strategies must implement this interface
 */
export interface ISyncStrategy {
  /**
   * Strategy name for logging and debugging
   */
  readonly name: string;

  /**
   * Whether this strategy is currently enabled
   */
  readonly enabled: boolean;

  /**
   * Sync tournaments using this strategy
   *
   * @param options - Sync options
   * @returns Sync result with statistics
   */
  syncTournaments(
    options?: SyncStrategyOptions
  ): Promise<SyncStrategyResult<TournamentCore[]>>;

  /**
   * Sync matches for a specific tournament
   *
   * @param tournamentNo - Tournament number
   * @param year - Year filter
   * @param options - Sync options
   * @returns Sync result with statistics
   */
  syncMatches(
    tournamentNo: string,
    year: number,
    options?: SyncStrategyOptions
  ): Promise<SyncStrategyResult<BeachMatchCore[]>>;

  /**
   * Check if this strategy can run based on current conditions
   *
   * @returns true if strategy can run, false otherwise
   */
  canRun(): Promise<boolean>;
}

/**
 * Lazy Loading Strategy (ACTIVE)
 *
 * Data is fetched only when accessed and automatically saved to DB.
 * No proactive syncing.
 *
 * This is the current active strategy.
 */
export class LazyLoadingStrategy implements ISyncStrategy {
  readonly name = 'LazyLoading';
  readonly enabled = true;

  async syncTournaments(
    options?: SyncStrategyOptions
  ): Promise<SyncStrategyResult<TournamentCore[]>> {
    // Lazy loading doesn't proactively sync
    // Data is synced on-demand when accessed
    return {
      success: true,
      data: [],
      itemsSynced: 0,
      errors: [],
      duration: 0,
    };
  }

  async syncMatches(
    tournamentNo: string,
    year: number,
    options?: SyncStrategyOptions
  ): Promise<SyncStrategyResult<BeachMatchCore[]>> {
    // Lazy loading doesn't proactively sync
    // Matches are synced when user opens tournament
    return {
      success: true,
      data: [],
      itemsSynced: 0,
      errors: [],
      duration: 0,
    };
  }

  async canRun(): Promise<boolean> {
    // Lazy loading is always available
    return true;
  }
}

/**
 * Background Sync Strategy (FUTURE - PLANNED)
 *
 * Proactively syncs recent and upcoming tournaments in background.
 * Runs on a schedule (e.g., once per day).
 *
 * This strategy will be implemented in Phase 2.
 */
export class BackgroundSyncStrategy implements ISyncStrategy {
  readonly name = 'BackgroundSync';
  readonly enabled = false; // Disabled for now

  async syncTournaments(
    options?: SyncStrategyOptions
  ): Promise<SyncStrategyResult<TournamentCore[]>> {
    // TODO: Implement background sync logic
    // Will sync tournaments in date range (last 30 days + next 90 days)
    // With rate limiting and error handling
    throw new Error('BackgroundSyncStrategy not yet implemented');
  }

  async syncMatches(
    tournamentNo: string,
    year: number,
    options?: SyncStrategyOptions
  ): Promise<SyncStrategyResult<BeachMatchCore[]>> {
    // TODO: Implement background match sync
    throw new Error('BackgroundSyncStrategy not yet implemented');
  }

  async canRun(): Promise<boolean> {
    // TODO: Check conditions:
    // - WiFi connection
    // - Battery level
    // - Time since last sync
    // - App state (foreground/background)
    return false;
  }
}

/**
 * On-Demand Sync Strategy (FUTURE - PLANNED)
 *
 * User-triggered sync with progress tracking.
 * Allows users to manually sync specific date ranges.
 *
 * This strategy will be implemented in Phase 3.
 */
export class OnDemandSyncStrategy implements ISyncStrategy {
  readonly name = 'OnDemandSync';
  readonly enabled = false; // Disabled for now

  async syncTournaments(
    options?: SyncStrategyOptions
  ): Promise<SyncStrategyResult<TournamentCore[]>> {
    // TODO: Implement user-triggered sync with progress tracking
    throw new Error('OnDemandSyncStrategy not yet implemented');
  }

  async syncMatches(
    tournamentNo: string,
    year: number,
    options?: SyncStrategyOptions
  ): Promise<SyncStrategyResult<BeachMatchCore[]>> {
    // TODO: Implement user-triggered match sync
    throw new Error('OnDemandSyncStrategy not yet implemented');
  }

  async canRun(): Promise<boolean> {
    // User-triggered sync can always run
    return true;
  }
}

/**
 * Sync Strategy Manager
 *
 * Manages multiple sync strategies and selects the appropriate one
 */
export class SyncStrategyManager {
  private strategies: Map<string, ISyncStrategy> = new Map();
  private activeStrategy: ISyncStrategy;

  constructor() {
    // Register available strategies
    this.registerStrategy(new LazyLoadingStrategy());
    this.registerStrategy(new BackgroundSyncStrategy());
    this.registerStrategy(new OnDemandSyncStrategy());

    // Set lazy loading as default active strategy
    this.activeStrategy = new LazyLoadingStrategy();
  }

  /**
   * Register a sync strategy
   */
  registerStrategy(strategy: ISyncStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Get strategy by name
   */
  getStrategy(name: string): ISyncStrategy | undefined {
    return this.strategies.get(name);
  }

  /**
   * Set active strategy
   */
  setActiveStrategy(name: string): boolean {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      console.error(`[SyncStrategyManager] Strategy '${name}' not found`);
      return false;
    }

    if (!strategy.enabled) {
      console.error(`[SyncStrategyManager] Strategy '${name}' is disabled`);
      return false;
    }

    this.activeStrategy = strategy;
    console.log(`[SyncStrategyManager] Active strategy set to: ${name}`);
    return true;
  }

  /**
   * Get active strategy
   */
  getActiveStrategy(): ISyncStrategy {
    return this.activeStrategy;
  }

  /**
   * Get all available strategies
   */
  getAllStrategies(): ISyncStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Get enabled strategies only
   */
  getEnabledStrategies(): ISyncStrategy[] {
    return Array.from(this.strategies.values()).filter(s => s.enabled);
  }
}

// Export singleton instance
export const syncStrategyManager = new SyncStrategyManager();
