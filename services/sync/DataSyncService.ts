/**
 * Data Sync Service
 *
 * Implements lazy loading strategy with database persistence.
 * Orchestrates the flow: Cache → Database → VIS API
 *
 * CURRENT: Lazy Loading Only
 * FUTURE: Background Sync (prepared but disabled)
 */

import { CacheService } from '../cache/CacheService';
import { databaseService } from '../database/DatabaseService';
import { extractYearFromMatch, extractYearFromTournament } from '../database/DatabaseMapper';
import { SyncConfig } from '../../config/syncConfig';
import { BeachMatchCore } from '../../types/match-v2';
import { TournamentCore } from '../../types/tournament-v2';

/**
 * Sync result with metadata
 */
export interface SyncResult<T> {
  data: T;
  source: 'cache' | 'database' | 'api';
  isFresh: boolean;
  timestamp: number;
}

/**
 * Sync progress callback for background sync (future)
 */
export type SyncProgressCallback = (current: number, total: number, message?: string) => void;

/**
 * Data Sync Service
 *
 * Implements the smart data flow:
 * 1. Check memory cache (< 1ms)
 * 2. Check Supabase DB (< 50ms)
 * 3. Fallback to VIS API (200-2000ms)
 * 4. Save to DB after VIS API fetch (lazy loading)
 */
export class DataSyncService {
  private static instance: DataSyncService | null = null;
  private cacheService: CacheService;

  private constructor() {
    this.cacheService = CacheService.getInstance();
  }

  static getInstance(): DataSyncService {
    if (!DataSyncService.instance) {
      DataSyncService.instance = new DataSyncService();
    }
    return DataSyncService.instance;
  }

  // =========================================================================
  // LAZY LOADING STRATEGY (ACTIVE)
  // =========================================================================

  /**
   * Get matches with lazy loading strategy
   *
   * Flow:
   * 1. Check cache → return immediately if fresh
   * 2. Check database → return if found + update cache
   * 3. Call VIS API → save to DB + cache
   *
   * @param tournamentNo - Tournament number
   * @param year - Year filter (fixes João Pessoa bug)
   * @param apiCallback - Callback to fetch from VIS API if needed
   * @returns Matches with metadata
   */
  async getMatchesWithLazyLoading(
    tournamentNo: string,
    year: number,
    apiCallback: () => Promise<BeachMatchCore[]>
  ): Promise<SyncResult<BeachMatchCore[]>> {
    const startTime = Date.now();

    // STEP 1: Check memory cache
    const cacheKey = `match:${tournamentNo}:${year}`;
    const cached = await this.cacheService.get<BeachMatchCore[]>(cacheKey);

    if (cached.data && !cached.isStale) {
      console.log(`[DataSyncService] ⚡ Cache HIT for ${tournamentNo} (${Date.now() - startTime}ms)`);
      return {
        data: cached.data,
        source: 'cache',
        isFresh: true,
        timestamp: Date.now(),
      };
    }

    // STEP 2: Check Supabase database
    console.log(`[DataSyncService] Cache miss, checking database...`);
    const dbMatches = await databaseService.getMatches({
      tournamentCode: tournamentNo,
      year,
    });

    if (dbMatches.length > 0) {
      console.log(`[DataSyncService] ✅ Database HIT for ${tournamentNo} (${Date.now() - startTime}ms)`);

      // Update cache with DB data
      await this.cacheService.set(cacheKey, dbMatches, 'match', this.inferMatchStatus(dbMatches));

      return {
        data: dbMatches,
        source: 'database',
        isFresh: true,
        timestamp: Date.now(),
      };
    }

    // STEP 3: Fallback to VIS API
    console.log(`[DataSyncService] Database miss, fetching from VIS API...`);
    const apiMatches = await apiCallback();

    console.log(`[DataSyncService] 🌐 VIS API call completed (${Date.now() - startTime}ms)`);

    // STEP 4: Save to database (lazy loading persistence)
    if (SyncConfig.lazyLoading.saveToDbAfterFetch && apiMatches.length > 0) {
      console.log(`[DataSyncService] 💾 Saving ${apiMatches.length} matches to database...`);
      await databaseService.saveMatches(apiMatches);
    }

    // STEP 5: Update cache
    await this.cacheService.set(cacheKey, apiMatches, 'match', this.inferMatchStatus(apiMatches));

    return {
      data: apiMatches,
      source: 'api',
      isFresh: true,
      timestamp: Date.now(),
    };
  }

  /**
   * Get tournament with lazy loading strategy
   *
   * @param visNo - VIS tournament number
   * @param apiCallback - Callback to fetch from VIS API if needed
   * @returns Tournament with metadata
   */
  async getTournamentWithLazyLoading(
    visNo: string,
    apiCallback: () => Promise<TournamentCore>
  ): Promise<SyncResult<TournamentCore>> {
    const startTime = Date.now();

    // STEP 1: Check cache
    const cacheKey = `tournament:${visNo}`;
    const cached = await this.cacheService.get<TournamentCore>(cacheKey);

    if (cached.data && !cached.isStale) {
      console.log(`[DataSyncService] ⚡ Cache HIT for tournament ${visNo}`);
      return {
        data: cached.data,
        source: 'cache',
        isFresh: true,
        timestamp: Date.now(),
      };
    }

    // STEP 2: Check database
    const dbTournament = await databaseService.getTournament(visNo);

    if (dbTournament) {
      console.log(`[DataSyncService] ✅ Database HIT for tournament ${visNo} (${Date.now() - startTime}ms)`);

      // Update cache
      await this.cacheService.set(cacheKey, dbTournament, 'tournament', dbTournament.status);

      return {
        data: dbTournament,
        source: 'database',
        isFresh: true,
        timestamp: Date.now(),
      };
    }

    // STEP 3: Fetch from API
    console.log(`[DataSyncService] Database miss, fetching tournament from VIS API...`);
    const apiTournament = await apiCallback();

    // STEP 4: Save to database
    if (SyncConfig.lazyLoading.saveToDbAfterFetch) {
      await databaseService.saveTournament(apiTournament);
    }

    // STEP 5: Update cache
    await this.cacheService.set(cacheKey, apiTournament, 'tournament', apiTournament.status);

    return {
      data: apiTournament,
      source: 'api',
      isFresh: true,
      timestamp: Date.now(),
    };
  }

  // =========================================================================
  // BACKGROUND SYNC STRATEGY (FUTURE - DISABLED)
  // =========================================================================

  /**
   * Background sync for recent tournaments
   *
   * FUTURE: This will sync recent/future tournaments in background
   * CURRENT: Disabled (SyncConfig.backgroundSync.enabled = false)
   *
   * @param onProgress - Progress callback for UI updates
   * @returns Sync statistics
   */
  async syncRecentTournaments(
    onProgress?: SyncProgressCallback
  ): Promise<{
    success: boolean;
    tournamentsSynced: number;
    matchesSynced: number;
    errors: string[];
  }> {
    // Check if background sync is enabled
    if (!SyncConfig.backgroundSync.enabled) {
      console.log('[DataSyncService] Background sync is disabled');
      return {
        success: false,
        tournamentsSynced: 0,
        matchesSynced: 0,
        errors: ['Background sync is disabled in config'],
      };
    }

    // TODO: Implement background sync strategy
    // This will be added in Phase 2 after testing lazy loading
    console.log('[DataSyncService] Background sync not yet implemented');

    return {
      success: false,
      tournamentsSynced: 0,
      matchesSynced: 0,
      errors: ['Background sync not yet implemented'],
    };
  }

  /**
   * User-triggered sync with progress tracking
   *
   * FUTURE: This will allow users to manually sync tournaments
   * CURRENT: Placeholder for future implementation
   *
   * @param onProgress - Progress callback
   * @param onCancel - Cancellation check callback
   */
  async userTriggeredSync(
    onProgress?: SyncProgressCallback,
    onCancel?: () => boolean
  ): Promise<void> {
    if (!SyncConfig.backgroundSync.enabled) {
      throw new Error('Background sync is not enabled');
    }

    // TODO: Implement user-triggered sync
    throw new Error('User-triggered sync not yet implemented');
  }

  // =========================================================================
  // CACHE INVALIDATION
  // =========================================================================

  /**
   * Invalidate cache for specific tournament
   *
   * Forces next access to fetch from database or API
   */
  async invalidateTournamentCache(tournamentNo: string, year: number): Promise<void> {
    const cacheKey = `match:${tournamentNo}:${year}`;
    await this.cacheService.delete(cacheKey);
    console.log(`[DataSyncService] Invalidated cache for tournament ${tournamentNo} year ${year}`);
  }

  /**
   * Clear database cache for tournament
   *
   * Removes from database, forcing next access to fetch from API
   */
  async clearTournamentDatabase(tournamentNo: string, year: number): Promise<void> {
    await databaseService.deleteMatchesByTournament(tournamentNo, year);
    await this.invalidateTournamentCache(tournamentNo, year);
    console.log(`[DataSyncService] Cleared database for tournament ${tournamentNo} year ${year}`);
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================

  /**
   * Infer match status for cache TTL determination
   */
  private inferMatchStatus(matches: BeachMatchCore[]): string {
    if (matches.length === 0) return 'Unknown';

    // Check if any match is running
    const hasRunning = matches.some(m => m.status === 'Running' || m.status === 'Live');
    if (hasRunning) return 'Running';

    // Check if all matches are finished
    const allFinished = matches.every(m => m.status === 'Finished' || m.status === 'Completed');
    if (allFinished) return 'Finished';

    // Default to scheduled
    return 'Scheduled';
  }

  /**
   * Get sync statistics
   */
  async getSyncStatistics(): Promise<{
    cacheStats: any;
    dbStats: {
      tournamentCount: number;
      matchCount: number;
      refereeCount: number;
    };
  }> {
    const [cacheStats, dbStats] = await Promise.all([
      this.cacheService.getStats(),
      databaseService.getStatistics(),
    ]);

    return {
      cacheStats,
      dbStats,
    };
  }
}

// Export singleton instance
export const dataSyncService = DataSyncService.getInstance();
