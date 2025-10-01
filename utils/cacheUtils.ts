/**
 * Cache utilities for tournament cache optimization
 * Part of Story 1.1: Tournament Cache Optimization
 */

/**
 * Check if cached data is stale based on timestamp and TTL
 * @param cachedData - Cached data with timestamp
 * @param ttlMs - Time to live in milliseconds
 * @returns true if data is stale, false if still fresh
 */
export function isStale(cachedData: { cachedAt: string } | null, ttlMs: number): boolean {
  if (!cachedData || !cachedData.cachedAt) {
    return true; // No cache data means stale
  }

  const cachedTime = new Date(cachedData.cachedAt).getTime();
  const now = Date.now();

  return (now - cachedTime) > ttlMs;
}

/**
 * Create cache metadata with timestamp and expiry
 * @param ttlMs - Time to live in milliseconds
 * @returns Cache metadata object
 */
export function createCacheMetadata(ttlMs: number) {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();

  return {
    cachedAt: now,
    expiresAt
  };
}

/**
 * TTL constants for different cache types (in milliseconds)
 */
export const CacheTTL = {
  TOURNAMENT_DETAILS: 6 * 60 * 60 * 1000,     // 6 hours
  MATCH_DATA_LIVE: 5 * 60 * 1000,             // 5 minutes for live tournaments
  MATCH_DATA_SCHEDULED: 2 * 60 * 60 * 1000,   // 2 hours for scheduled tournaments
  MATCH_DATA_COMPLETED: 24 * 60 * 60 * 1000,  // 24 hours for completed tournaments
  REFEREE_DATA: 24 * 60 * 60 * 1000,          // 24 hours for referee data
} as const;

/**
 * Get appropriate TTL based on tournament status
 * @param tournamentStatus - Status of the tournament
 * @returns TTL in milliseconds
 */
export function getMatchCacheTTL(tournamentStatus: string): number {
  switch (tournamentStatus?.toUpperCase()) {
    case 'LIVE':
    case 'RUNNING':
      return CacheTTL.MATCH_DATA_LIVE;
    case 'SCHEDULED':
    case 'UPCOMING':
      return CacheTTL.MATCH_DATA_SCHEDULED;
    case 'COMPLETED':
    case 'FINISHED':
      return CacheTTL.MATCH_DATA_COMPLETED;
    default:
      return CacheTTL.TOURNAMENT_DETAILS; // Default to 6 hours
  }
}