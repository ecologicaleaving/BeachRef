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
   *
   * ✨ ENHANCED: Now includes year in cache key to fix João Pessoa bug
   *
   * @param tournamentNo - Tournament number
   * @param year - Year filter (optional, uses current year if not provided)
   * @returns Cached matches or null if not found/expired
   */
  static async getCachedMatches(tournamentNo: string, year?: number): Promise<BeachMatchCore[] | null> {
    const startTime = Date.now();

    // ✨ FIX: Include year in cache key to avoid João Pessoa bug
    const yearToUse = year || new Date().getFullYear();
    const cacheKey = `matches_${tournamentNo}_${yearToUse}`;

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
        console.log(`📦 Match cache for tournament ${tournamentNo} year ${yearToUse} is stale, TTL: ${ttl}ms`);
        CachePerformanceMonitor.recordCacheMiss(cacheKey, Date.now() - startTime);
        return null;
      }

      // FIX #29: Validate that cached matches actually belong to the requested year
      // Guards against corrupt cache entries from warming service or cross-year contamination
      // Check ALL possible date fields from VIS API
      const validMatches = cached.matches.filter(m => {
        const dateStr = (m as any).scheduledDateTime || (m as any).LocalDate || (m as any).Date || (m as any).MatchDate || (m as any).LocalDateTime;
        if (!dateStr) return false; // REJECT matches without any date — they're likely from corrupt/old cache
        const matchYear = new Date(dateStr).getFullYear();
        if (isNaN(matchYear)) return false; // Invalid date
        return matchYear === yearToUse;
      });

      if (validMatches.length !== cached.matches.length) {
        console.warn(`⚠️ [Cache] Filtered ${cached.matches.length - validMatches.length} wrong-year matches from cache for tournament ${tournamentNo} year ${yearToUse}`);
      }

      if (validMatches.length === 0) {
        // All matches were from wrong year - treat as cache miss
        console.warn(`⚠️ [Cache] All ${cached.matches.length} cached matches are wrong year for tournament ${tournamentNo} year ${yearToUse}, treating as MISS`);
        CachePerformanceMonitor.recordCacheMiss(cacheKey, Date.now() - startTime);
        return null;
      }

      const responseTime = Date.now() - startTime;
      const dataSize = JSON.stringify(validMatches).length;

      CachePerformanceMonitor.recordCacheHit(cacheKey, responseTime, dataSize);
      console.log(`📦 ✅ Cache HIT for tournament ${tournamentNo} year ${yearToUse} (${validMatches.length} matches)`);
      return validMatches;
    } catch (error) {
      CachePerformanceMonitor.recordCacheError(cacheKey, Date.now() - startTime);
      console.warn('Failed to get cached matches:', error);
      return null;
    }
  }

  /**
   * Cache matches for a tournament with status-aware TTL
   *
   * ✨ ENHANCED: Now includes year in cache key to fix João Pessoa bug
   *
   * @param tournamentNo - Tournament number
   * @param matches - Match data to cache
   * @param status - Tournament status for TTL calculation
   * @param year - Year filter (optional, extracted from matches if not provided)
   */
  static async cacheMatches(
    tournamentNo: string,
    matches: BeachMatchCore[],
    status: string,
    year?: number
  ): Promise<void> {
    // Guard: never cache an empty match list — it would be treated as "no matches"
    // on the next read, preventing a fresh API fetch for a tournament that has data.
    if (matches.length === 0) {
      return;
    }

    try {
      // ✨ FIX: Extract year from first match or use provided year
      let yearToUse = year;
      if (!yearToUse && matches.length > 0) {
        yearToUse = new Date(matches[0].scheduledDateTime).getFullYear();
      }
      if (!yearToUse) {
        yearToUse = new Date().getFullYear();
      }

      const cacheKey = `matches_${tournamentNo}_${yearToUse}`;
      const ttl = getMatchCacheTTL(status);
      const metadata = createCacheMetadata(ttl);

      const cacheData: CachedMatchData = {
        matches,
        tournamentStatus: status,
        ...metadata
      };

      const result = await this.cacheManager.set(this.NAMESPACE, cacheKey, cacheData);

      if (result.success) {
        console.log(`📦 Cached ${matches.length} matches for tournament ${tournamentNo} year ${yearToUse} (status: ${status}, TTL: ${ttl}ms)`);
      } else {
        console.warn('Failed to cache matches:', result.error);
      }
    } catch (error) {
      console.warn('Failed to cache matches:', error);
    }
  }

  /**
   * Check if matches are cached and fresh for a tournament
   *
   * @param tournamentNo - Tournament number
   * @param year - Year filter (optional)
   * @returns true if fresh cache exists, false otherwise
   */
  static async hasFreshCache(tournamentNo: string, year?: number): Promise<boolean> {
    const cached = await this.getCachedMatches(tournamentNo, year);
    return cached !== null;
  }

  /**
   * Clear cached matches for a specific tournament
   *
   * ✨ ENHANCED: Now clears year-specific cache
   *
   * @param tournamentNo - Tournament number
   * @param year - Year filter (optional, clears current year if not provided)
   */
  static async clearCache(tournamentNo: string, year?: number): Promise<void> {
    try {
      const yearToUse = year || new Date().getFullYear();
      const cacheKey = `matches_${tournamentNo}_${yearToUse}`;
      await this.cacheManager.delete(this.NAMESPACE, cacheKey);
      console.log(`🗑️ Cleared match cache for tournament ${tournamentNo} year ${yearToUse}`);
    } catch (error) {
      console.warn('Failed to clear match cache:', error);
    }
  }

  /**
   * Get cache metadata for debugging
   *
   * @param tournamentNo - Tournament number
   * @param year - Year filter (optional)
   * @returns Cache metadata or null
   */
  static async getCacheMetadata(tournamentNo: string, year?: number): Promise<{
    status: string;
    cachedAt: string;
    ttl: number;
    isStale: boolean;
    year: number;
  } | null> {
    try {
      const yearToUse = year || new Date().getFullYear();
      const cacheKey = `matches_${tournamentNo}_${yearToUse}`;
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
        isStale: stale,
        year: yearToUse,
      };
    } catch (error) {
      console.warn('Failed to get cache metadata:', error);
      return null;
    }
  }
}