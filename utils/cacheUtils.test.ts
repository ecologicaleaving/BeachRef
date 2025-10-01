/**
 * Tests for cache utilities
 * Part of Story 1.1: Tournament Cache Optimization - Task 5
 */

import {
  isStale,
  createCacheMetadata,
  CacheTTL,
  getMatchCacheTTL
} from './cacheUtils';

describe('cacheUtils', () => {
  describe('isStale', () => {
    it('should return true for null cached data', () => {
      expect(isStale(null, 1000)).toBe(true);
    });

    it('should return true for data without cachedAt timestamp', () => {
      expect(isStale({} as any, 1000)).toBe(true);
    });

    it('should return false for fresh data within TTL', () => {
      const cachedData = {
        cachedAt: new Date(Date.now() - 5000).toISOString() // 5 seconds ago
      };
      expect(isStale(cachedData, 10000)).toBe(false); // 10 second TTL
    });

    it('should return true for stale data beyond TTL', () => {
      const cachedData = {
        cachedAt: new Date(Date.now() - 15000).toISOString() // 15 seconds ago
      };
      expect(isStale(cachedData, 10000)).toBe(true); // 10 second TTL
    });

    it('should handle edge case where data is exactly at TTL boundary', () => {
      const ttl = 10000;
      const cachedData = {
        cachedAt: new Date(Date.now() - ttl).toISOString()
      };
      expect(isStale(cachedData, ttl)).toBe(false);
    });
  });

  describe('createCacheMetadata', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-30T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create metadata with correct timestamps', () => {
      const ttl = 5 * 60 * 1000; // 5 minutes
      const metadata = createCacheMetadata(ttl);

      expect(metadata.cachedAt).toBe('2025-01-30T10:00:00.000Z');
      expect(metadata.expiresAt).toBe('2025-01-30T10:05:00.000Z');
    });
  });

  describe('getMatchCacheTTL', () => {
    it('should return live TTL for live tournament status', () => {
      expect(getMatchCacheTTL('LIVE')).toBe(CacheTTL.MATCH_DATA_LIVE);
      expect(getMatchCacheTTL('RUNNING')).toBe(CacheTTL.MATCH_DATA_LIVE);
      expect(getMatchCacheTTL('live')).toBe(CacheTTL.MATCH_DATA_LIVE);
    });

    it('should return scheduled TTL for scheduled tournament status', () => {
      expect(getMatchCacheTTL('SCHEDULED')).toBe(CacheTTL.MATCH_DATA_SCHEDULED);
      expect(getMatchCacheTTL('UPCOMING')).toBe(CacheTTL.MATCH_DATA_SCHEDULED);
      expect(getMatchCacheTTL('scheduled')).toBe(CacheTTL.MATCH_DATA_SCHEDULED);
    });

    it('should return completed TTL for completed tournament status', () => {
      expect(getMatchCacheTTL('COMPLETED')).toBe(CacheTTL.MATCH_DATA_COMPLETED);
      expect(getMatchCacheTTL('FINISHED')).toBe(CacheTTL.MATCH_DATA_COMPLETED);
      expect(getMatchCacheTTL('completed')).toBe(CacheTTL.MATCH_DATA_COMPLETED);
    });

    it('should return default TTL for unknown status', () => {
      expect(getMatchCacheTTL('UNKNOWN')).toBe(CacheTTL.TOURNAMENT_DETAILS);
      expect(getMatchCacheTTL('')).toBe(CacheTTL.TOURNAMENT_DETAILS);
      expect(getMatchCacheTTL(undefined as any)).toBe(CacheTTL.TOURNAMENT_DETAILS);
    });
  });

  describe('CacheTTL constants', () => {
    it('should have correct TTL values', () => {
      expect(CacheTTL.TOURNAMENT_DETAILS).toBe(6 * 60 * 60 * 1000); // 6 hours
      expect(CacheTTL.MATCH_DATA_LIVE).toBe(5 * 60 * 1000); // 5 minutes
      expect(CacheTTL.MATCH_DATA_SCHEDULED).toBe(2 * 60 * 60 * 1000); // 2 hours
      expect(CacheTTL.MATCH_DATA_COMPLETED).toBe(24 * 60 * 60 * 1000); // 24 hours
      expect(CacheTTL.REFEREE_DATA).toBe(24 * 60 * 60 * 1000); // 24 hours
    });
  });
});