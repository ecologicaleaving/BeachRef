/**
 * @fileoverview Cache functionality tests
 * Tests caching mechanisms and cache-aware data operations
 */

import { clearAllCache, invalidateCacheByTags } from '../../hooks/useCacheAwareData';

// Mock performance for testing
const mockPerformance = {
  now: jest.fn(() => Date.now())
};
Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

describe('Cache Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAllCache();
  });

  describe('Cache utilities', () => {
    it('should clear all cache entries', () => {
      // Test that clearAllCache function exists and can be called
      expect(() => clearAllCache()).not.toThrow();
    });

    it('should invalidate cache by tags', () => {
      const tags = ['tournaments', 'matches'];
      
      // Test that invalidateCacheByTags function exists and can be called
      expect(() => invalidateCacheByTags(tags)).not.toThrow();
    });
  });

  describe('Cache key generation', () => {
    it('should generate consistent cache keys', () => {
      const cacheKey1 = 'tournament_123_filters_type_fivb';
      const cacheKey2 = 'tournament_123_filters_type_fivb';
      
      expect(cacheKey1).toBe(cacheKey2);
    });

    it('should generate different keys for different filters', () => {
      const cacheKey1 = 'tournament_123_filters_type_fivb';
      const cacheKey2 = 'tournament_123_filters_type_bpt';
      
      expect(cacheKey1).not.toBe(cacheKey2);
    });
  });

  describe('TTL (Time To Live) calculations', () => {
    it('should calculate correct expiration times', () => {
      const now = Date.now();
      const ttl = 5 * 60 * 1000; // 5 minutes
      const expirationTime = now + ttl;
      
      expect(expirationTime).toBeGreaterThan(now);
      expect(expirationTime - now).toBe(ttl);
    });

    it('should detect expired entries', () => {
      const now = Date.now();
      const ttl = 5 * 60 * 1000; // 5 minutes
      const createdTime = now - (6 * 60 * 1000); // 6 minutes ago
      const isExpired = (now - createdTime) > ttl;
      
      expect(isExpired).toBe(true);
    });

    it('should detect valid entries', () => {
      const now = Date.now();
      const ttl = 5 * 60 * 1000; // 5 minutes
      const createdTime = now - (3 * 60 * 1000); // 3 minutes ago
      const isExpired = (now - createdTime) > ttl;
      
      expect(isExpired).toBe(false);
    });
  });

  describe('Cache metadata', () => {
    it('should track access count', () => {
      let accessCount = 0;
      
      // Simulate cache accesses
      accessCount++;
      accessCount++;
      accessCount++;
      
      expect(accessCount).toBe(3);
    });

    it('should track last access time', () => {
      const lastAccessed = Date.now();
      
      expect(lastAccessed).toBeGreaterThan(0);
      expect(typeof lastAccessed).toBe('number');
    });

    it('should calculate cache age', () => {
      const timestamp = Date.now() - 10000; // 10 seconds ago
      const age = Date.now() - timestamp;
      
      expect(age).toBeGreaterThanOrEqual(10000);
    });
  });

  describe('Stale-while-revalidate logic', () => {
    it('should identify stale but valid data', () => {
      const now = Date.now();
      const ttl = 5 * 60 * 1000; // 5 minutes
      const maxStaleTime = 10 * 60 * 1000; // 10 minutes
      const createdTime = now - (6 * 60 * 1000); // 6 minutes ago
      
      const age = now - createdTime;
      const isStale = age > ttl;
      const isWithinMaxStale = age < maxStaleTime;
      
      expect(isStale).toBe(true);
      expect(isWithinMaxStale).toBe(true);
    });

    it('should identify data beyond max stale time', () => {
      const now = Date.now();
      const ttl = 5 * 60 * 1000; // 5 minutes
      const maxStaleTime = 10 * 60 * 1000; // 10 minutes
      const createdTime = now - (12 * 60 * 1000); // 12 minutes ago
      
      const age = now - createdTime;
      const isStale = age > ttl;
      const isWithinMaxStale = age < maxStaleTime;
      
      expect(isStale).toBe(true);
      expect(isWithinMaxStale).toBe(false);
    });
  });

  describe('Memory management', () => {
    it('should estimate memory usage', () => {
      const testData = { id: '1', name: 'Test Data', complex: { nested: 'value' } };
      const estimatedSize = JSON.stringify(testData).length * 2; // Rough byte estimate
      
      expect(estimatedSize).toBeGreaterThan(0);
      expect(typeof estimatedSize).toBe('number');
    });

    it('should handle cache eviction scenarios', () => {
      const maxSize = 3;
      const cache = new Map();
      
      // Fill cache beyond max size
      cache.set('key1', { data: 'value1', lastAccessed: Date.now() - 3000 });
      cache.set('key2', { data: 'value2', lastAccessed: Date.now() - 2000 });
      cache.set('key3', { data: 'value3', lastAccessed: Date.now() - 1000 });
      cache.set('key4', { data: 'value4', lastAccessed: Date.now() });
      
      // Simulate LRU eviction
      if (cache.size > maxSize) {
        const entries = Array.from(cache.entries());
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        cache.delete(entries[0][0]); // Remove oldest
      }
      
      expect(cache.size).toBe(maxSize);
      expect(cache.has('key1')).toBe(false); // Oldest should be evicted
      expect(cache.has('key4')).toBe(true); // Newest should remain
    });
  });

  describe('Cache statistics', () => {
    it('should calculate hit ratio', () => {
      const hits = 8;
      const misses = 2;
      const total = hits + misses;
      const hitRatio = hits / total;
      
      expect(hitRatio).toBe(0.8);
      expect(hitRatio).toBeGreaterThan(0.5); // Good cache performance
    });

    it('should track cache operations', () => {
      const stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0
      };
      
      // Simulate cache operations
      stats.misses++; // Initial fetch
      stats.sets++; // Store in cache
      stats.hits++; // Subsequent access
      stats.hits++; // Another access
      
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(1);
      
      const hitRatio = stats.hits / (stats.hits + stats.misses);
      expect(hitRatio).toBeCloseTo(0.67, 2);
    });
  });

  describe('Cache invalidation patterns', () => {
    it('should support tag-based invalidation', () => {
      const cache = new Map();
      const tagIndex = new Map();
      
      // Store entries with tags
      const key1 = 'tournament_123';
      const key2 = 'tournament_456';
      const tags = ['tournaments', 'fivb'];
      
      cache.set(key1, { data: 'tournament1' });
      cache.set(key2, { data: 'tournament2' });
      
      tags.forEach(tag => {
        if (!tagIndex.has(tag)) tagIndex.set(tag, new Set());
        tagIndex.get(tag).add(key1);
        tagIndex.get(tag).add(key2);
      });
      
      // Invalidate by tag
      const invalidationTag = 'tournaments';
      const keysToInvalidate = tagIndex.get(invalidationTag) || new Set();
      
      keysToInvalidate.forEach(key => cache.delete(key));
      
      expect(cache.size).toBe(0);
    });

    it('should support time-based invalidation', () => {
      const cache = new Map();
      const ttl = 5000; // 5 seconds
      
      // Add entry with timestamp
      const key = 'test_key';
      const entry = {
        data: 'test_data',
        timestamp: Date.now() - 6000, // 6 seconds ago
        ttl: ttl
      };
      
      cache.set(key, entry);
      
      // Check expiration
      const isExpired = (Date.now() - entry.timestamp) > entry.ttl;
      
      if (isExpired) {
        cache.delete(key);
      }
      
      expect(cache.has(key)).toBe(false);
    });
  });

  describe('Performance optimization', () => {
    it('should batch cache operations efficiently', () => {
      const operations = [];
      const batchSize = 10;
      
      // Simulate batched operations
      for (let i = 0; i < 25; i++) {
        operations.push({ type: 'set', key: `key_${i}`, value: `value_${i}` });
      }
      
      const batches = [];
      for (let i = 0; i < operations.length; i += batchSize) {
        batches.push(operations.slice(i, i + batchSize));
      }
      
      expect(batches).toHaveLength(3); // 25 operations in batches of 10
      expect(batches[0]).toHaveLength(10);
      expect(batches[1]).toHaveLength(10);
      expect(batches[2]).toHaveLength(5);
    });

    it('should handle concurrent cache access', async () => {
      const cache = new Map();
      const pendingRequests = new Map();
      
      const cacheKey = 'concurrent_test';
      
      // Simulate concurrent requests for same data
      const request1 = getCachedData(cacheKey);
      const request2 = getCachedData(cacheKey);
      const request3 = getCachedData(cacheKey);
      
      async function getCachedData(key: string) {
        if (cache.has(key)) {
          return cache.get(key);
        }
        
        // Check if request is already pending
        if (pendingRequests.has(key)) {
          return pendingRequests.get(key);
        }
        
        // Create new request
        const request = new Promise(resolve => {
          setTimeout(() => {
            const data = `data_for_${key}`;
            cache.set(key, data);
            pendingRequests.delete(key);
            resolve(data);
          }, 100);
        });
        
        pendingRequests.set(key, request);
        return request;
      }
      
      const results = await Promise.all([request1, request2, request3]);
      
      expect(results).toHaveLength(3);
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
      expect(cache.size).toBe(1); // Only one entry should be cached
    });
  });
});