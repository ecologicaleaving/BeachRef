/**
 * Tournament Match Cache Service
 * Part of Story 1.1: Tournament Cache Optimization - Task 2
 *
 * Implements match-level caching with status-aware TTL
 */

import { UnifiedCacheManager } from './UnifiedCacheManager';
import { BeachMatchCore } from '../../types/match-v2';
import { isStale, getMatchCacheTTL, createCacheMetadata } from '../../utils/cacheUtils';
import { CachePerformanceMonitor } from '../../utils/cachePerformanceMonitor';

interface CachedMatchData {
  matches: BeachMatchCore[];
  tournamentStatus: string;
  cachedAt: string;
  expiresAt: string;
}

export class TournamentMatchCache {
  private static readonly NAMESPACE = 'tournament_matches';
  private static cacheManager = UnifiedCacheManager.getInstance();

  /**
   * Get cached matches for a tournament
   * @param tournamentNo - Tournament number
   * @returns Cached matches or null if not found/expired
   */
  static async getCachedMatches(tournamentNo: string): Promise<BeachMatchCore[] | null> {
    const startTime = Date.now();
    const cacheKey = `matches_${tournamentNo}`;

    try {
      const result = await this.cacheManager.get<CachedMatchData>(this.NAMESPACE, cacheKey);

      if (!result.success || !result.data) {
        CachePerformanceMonitor.recordCacheMiss(cacheKey, Date.now() - startTime);
        return null;
      }

      const cached = result.data;

      // Check if cache is stale based on tournament status
      const ttl = getMatchCacheTTL(cached.tournamentStatus);
      if (isStale(cached, ttl)) {
        console.log(`📦 Match cache for tournament ${tournamentNo} is stale, TTL: ${ttl}ms`);
        CachePerformanceMonitor.recordCacheMiss(cacheKey, Date.now() - startTime);
        return null;
      }

      const responseTime = Date.now() - startTime;
      const dataSize = JSON.stringify(cached.matches).length;

      CachePerformanceMonitor.recordCacheHit(cacheKey, responseTime, dataSize);
      return cached.matches;
    } catch (error) {
      CachePerformanceMonitor.recordCacheError(cacheKey, Date.now() - startTime);
      console.warn('Failed to get cached matches:', error);
      return null;
    }
  }

  /**
   * Cache matches for a tournament with status-aware TTL
   * @param tournamentNo - Tournament number
   * @param matches - Match data to cache
   * @param status - Tournament status for TTL calculation
   */
  static async cacheMatches(
    tournamentNo: string,
    matches: BeachMatchCore[],
    status: string
  ): Promise<void> {
    try {
      const cacheKey = `matches_${tournamentNo}`;
      const ttl = getMatchCacheTTL(status);
      const metadata = createCacheMetadata(ttl);

      const cacheData: CachedMatchData = {
        matches,
        tournamentStatus: status,
        ...metadata
      };

      const result = await this.cacheManager.set(this.NAMESPACE, cacheKey, cacheData);

      if (result.success) {
        console.log(`📦 Cached ${matches.length} matches for tournament ${tournamentNo} (status: ${status}, TTL: ${ttl}ms)`);
      } else {
        console.warn('Failed to cache matches:', result.error);
      }
    } catch (error) {
      console.warn('Failed to cache matches:', error);
    }
  }

  /**
   * Check if matches are cached and fresh for a tournament
   * @param tournamentNo - Tournament number
   * @returns true if fresh cache exists, false otherwise
   */
  static async hasFreshCache(tournamentNo: string): Promise<boolean> {
    const cached = await this.getCachedMatches(tournamentNo);
    return cached !== null;
  }

  /**
   * Clear cached matches for a specific tournament
   * @param tournamentNo - Tournament number
   */
  static async clearCache(tournamentNo: string): Promise<void> {
    try {
      const cacheKey = `matches_${tournamentNo}`;
      await this.cacheManager.delete(this.NAMESPACE, cacheKey);
      console.log(`🗑️ Cleared match cache for tournament ${tournamentNo}`);
    } catch (error) {
      console.warn('Failed to clear match cache:', error);
    }
  }

  /**
   * Get cache metadata for debugging
   * @param tournamentNo - Tournament number
   * @returns Cache metadata or null
   */
  static async getCacheMetadata(tournamentNo: string): Promise<{
    status: string;
    cachedAt: string;
    ttl: number;
    isStale: boolean
  } | null> {
    try {
      const cacheKey = `matches_${tournamentNo}`;
      const result = await this.cacheManager.get<CachedMatchData>(this.NAMESPACE, cacheKey);

      if (!result.success || !result.data) {
        return null;
      }

      const cached = result.data;
      const ttl = getMatchCacheTTL(cached.tournamentStatus);
      const stale = isStale(cached, ttl);

      return {
        status: cached.tournamentStatus,
        cachedAt: cached.cachedAt,
        ttl,
        isStale: stale
      };
    } catch (error) {
      console.warn('Failed to get cache metadata:', error);
      return null;
    }
  }
}