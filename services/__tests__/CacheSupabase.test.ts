import { CacheService } from '../CacheService';

// Mock Supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({
            data: [],
            error: null
          }))
        })),
        gte: jest.fn(() => ({
          data: [],
          error: null
        }))
      }))
    }))
  }
}));

describe('CacheService Supabase Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CacheService.initialize();
  });

  describe('Supabase Cache TTL Configuration', () => {
    it('should have 24-hour TTL for tournaments', () => {
      const config = (CacheService as any).config;
      
      // Assert 24-hour TTL (24 * 60 * 60 * 1000 = 86400000ms)
      expect(config.defaultTTL.tournaments).toBe(86400000);
    });

    it('should properly calculate TTL in milliseconds', () => {
      const config = (CacheService as any).config;
      const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
      
      expect(config.defaultTTL.tournaments).toBe(twentyFourHoursInMs);
    });
  });

  describe('Cache Freshness Validation', () => {
    it('should validate fresh data correctly', () => {
      const freshData = {
        data: { test: 'data' },
        timestamp: Date.now() - (12 * 60 * 60 * 1000), // 12 hours ago
        ttl: 24 * 60 * 60 * 1000 // 24 hours
      };

      const isFresh = CacheService.isFresh(freshData, 24 * 60 * 60 * 1000);
      expect(isFresh).toBe(true);
    });

    it('should identify stale data correctly', () => {
      const staleData = {
        data: { test: 'data' },
        timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
        ttl: 24 * 60 * 60 * 1000 // 24 hours
      };

      const isFresh = CacheService.isFresh(staleData, 24 * 60 * 60 * 1000);
      expect(isFresh).toBe(false);
    });

    it('should handle edge case at exactly 24 hours', () => {
      const edgeCaseData = {
        data: { test: 'data' },
        timestamp: Date.now() - (24 * 60 * 60 * 1000), // Exactly 24 hours ago
        ttl: 24 * 60 * 60 * 1000 // 24 hours
      };

      const isFresh = CacheService.isFresh(edgeCaseData, 24 * 60 * 60 * 1000);
      expect(isFresh).toBe(false); // Should be stale at exactly 24 hours
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys for tournaments', () => {
      const key1 = CacheService.generateCacheKey('tournaments');
      const key2 = CacheService.generateCacheKey('tournaments');
      
      expect(key1).toBe(key2);
      expect(key1).toBe('tournaments');
    });

    it('should include filter options in cache key', () => {
      const filters = { tournamentType: 'FIVB', currentlyActive: true };
      const key = CacheService.generateCacheKey('tournaments', filters);
      
      expect(key).toContain('tournaments_');
      expect(key).toContain('FIVB');
      expect(key).toContain('currentlyActive');
    });

    it('should generate different keys for different filter combinations', () => {
      const key1 = CacheService.generateCacheKey('tournaments', { tournamentType: 'FIVB' });
      const key2 = CacheService.generateCacheKey('tournaments', { tournamentType: 'BPT' });
      
      expect(key1).not.toBe(key2);
    });

    it('should handle null and undefined filters consistently', () => {
      const keyNull = CacheService.generateCacheKey('tournaments', null);
      const keyUndefined = CacheService.generateCacheKey('tournaments', undefined);
      const keyEmpty = CacheService.generateCacheKey('tournaments');
      
      expect(keyNull).toBe('tournaments');
      expect(keyUndefined).toBe('tournaments');
      expect(keyEmpty).toBe('tournaments');
    });
  });

  describe('Supabase Query Performance', () => {
    it('should enforce 24-hour freshness in Supabase queries', async () => {
      const { supabase } = require('../supabase');
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnValue({ data: [], error: null })
      };
      const mockSelect = jest.fn().mockReturnValue(mockQuery);
      supabase.from.mockReturnValue({ select: mockSelect });

      // Act
      await CacheService.getTournamentsFromSupabase();

      // Assert - Should query for data synced within last 24 hours
      expect(mockQuery.gte).toHaveBeenCalled();
      const gteCall = mockQuery.gte.mock.calls[0];
      expect(gteCall[0]).toBe('last_synced');
      
      // Verify the timestamp is approximately 24 hours ago
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const queryTime = new Date(gteCall[1]);
      const timeDifference = Math.abs(twentyFourHoursAgo.getTime() - queryTime.getTime());
      
      // Should be within 1 second of 24 hours ago
      expect(timeDifference).toBeLessThan(1000);
    });

    it('should handle Supabase query errors gracefully', async () => {
      const { supabase } = require('../supabase');
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnValue({ data: null, error: new Error('Database error') })
      };
      supabase.from.mockReturnValue({ select: jest.fn().mockReturnValue(mockQuery) });

      // Act
      const result = await CacheService.getTournamentsFromSupabase();

      // Assert - Should return empty array on error
      expect(result).toEqual([]);
    });

    it('should apply active tournament filter when specified', async () => {
      const { supabase } = require('../supabase');
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis()
      };
      mockQuery.data = [];
      mockQuery.error = null;
      const mockSelect = jest.fn().mockReturnValue(mockQuery);
      supabase.from.mockReturnValue({ select: mockSelect });

      // Act
      await CacheService.getTournamentsFromSupabase({ currentlyActive: true });

      // Assert - Should filter by status = 'Running'
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'Running');
    });

    it('should apply year filter when specified', async () => {
      const { supabase } = require('../supabase');
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis()
      };
      mockQuery.data = [];
      mockQuery.error = null;
      const mockSelect = jest.fn().mockReturnValue(mockQuery);
      supabase.from.mockReturnValue({ select: mockSelect });

      // Act
      await CacheService.getTournamentsFromSupabase({ year: 2025 });

      // Assert - Should filter by year range
      expect(mockQuery.gte).toHaveBeenCalledWith('dates->>startDate', '2025-01-01');
      expect(mockQuery.lte).toHaveBeenCalledWith('dates->>startDate', '2025-12-31');
    });

    it('should apply tournament type filter when specified', async () => {
      const { supabase } = require('../supabase');
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis()
      };
      mockQuery.data = [];
      mockQuery.error = null;
      const mockSelect = jest.fn().mockReturnValue(mockQuery);
      supabase.from.mockReturnValue({ select: mockSelect });

      // Act
      await CacheService.getTournamentsFromSupabase({ tournamentType: 'FIVB' });

      // Assert - Should filter by tournament type
      expect(mockQuery.eq).toHaveBeenCalledWith('type', 'FIVB');
    });

    it('should apply recentOnly filter when specified', async () => {
      const { supabase } = require('../supabase');
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis()
      };
      mockQuery.data = [];
      mockQuery.error = null;
      const mockSelect = jest.fn().mockReturnValue(mockQuery);
      supabase.from.mockReturnValue({ select: mockSelect });

      // Act
      await CacheService.getTournamentsFromSupabase({ recentOnly: true });

      // Assert - Should apply recent date range filter
      const gteCallsForStartDate = mockQuery.gte.mock.calls.filter(call => call[0] === 'dates->>startDate');
      const lteCallsForStartDate = mockQuery.lte.mock.calls.filter(call => call[0] === 'dates->>startDate');
      
      expect(gteCallsForStartDate.length).toBeGreaterThan(0);
      expect(lteCallsForStartDate.length).toBeGreaterThan(0);
    });
  });

  describe('Cache Performance Monitoring', () => {
    it('should track Supabase cache response times under 500ms requirement', async () => {
      const { supabase } = require('../supabase');
      const mockData = [
        { no: '1', code: 'FIVB2025', name: 'Test Tournament', last_synced: new Date().toISOString() }
      ];
      
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnValue({ data: mockData, error: null })
      };
      supabase.from.mockReturnValue({ select: jest.fn().mockReturnValue(mockQuery) });

      // Act
      const startTime = performance.now();
      const result = await CacheService.getTournamentsFromSupabase();
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert
      expect(result).toHaveLength(1);
      expect(duration).toBeLessThan(500); // Should be under 500ms requirement
    });

    it('should validate cache invalidation behavior', async () => {
      // Test cache invalidation pattern matching
      const testKeys = [
        'tournaments_{"tournamentType":"FIVB"}',
        'tournaments_{"tournamentType":"BPT"}',
        'tournaments_{}',
        'matches_T001'
      ];

      // Mock MemoryCacheManager methods
      const mockMemoryCache = {
        getKeysByPattern: jest.fn().mockReturnValue(testKeys.filter(key => key.startsWith('tournaments_'))),
        delete: jest.fn()
      };

      (CacheService as any).memoryCache = mockMemoryCache;

      // Act
      await CacheService.invalidate('tournaments_*');

      // Assert - Should have found and processed tournament cache keys
      expect(mockMemoryCache.getKeysByPattern).toHaveBeenCalledWith('tournaments_*');
      expect(mockMemoryCache.delete).toHaveBeenCalledTimes(3); // 3 tournament keys
    });
  });

  describe('Cache Performance Requirements Validation', () => {
    it('should meet Supabase cache 500ms response time requirement', async () => {
      // This test validates that the Supabase cache layer responds within 500ms
      // In a real environment, this would test actual network latency
      const { supabase } = require('../supabase');
      
      // Mock fast response
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnValue(Promise.resolve({ data: [], error: null }))
      };
      supabase.from.mockReturnValue({ select: jest.fn().mockReturnValue(mockQuery) });

      const responseTimePromises = [];
      
      // Test multiple requests to validate consistent performance
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        const responsePromise = CacheService.getTournamentsFromSupabase()
          .then(() => performance.now() - startTime);
        responseTimePromises.push(responsePromise);
      }

      const responseTimes = await Promise.all(responseTimePromises);

      // Assert all responses are under 500ms
      responseTimes.forEach((responseTime, index) => {
        expect(responseTime).toBeLessThan(500);
      });

      // Assert average response time is well under requirement
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      expect(avgResponseTime).toBeLessThan(100); // Much faster than 500ms requirement
    });

    it('should validate 24-hour TTL behavior over time', () => {
      // Test different time scenarios
      const now = Date.now();
      const testCases = [
        { hoursAgo: 1, shouldBeFresh: true },
        { hoursAgo: 12, shouldBeFresh: true },
        { hoursAgo: 23, shouldBeFresh: true },
        { hoursAgo: 24, shouldBeFresh: false },
        { hoursAgo: 25, shouldBeFresh: false },
        { hoursAgo: 48, shouldBeFresh: false }
      ];

      testCases.forEach(({ hoursAgo, shouldBeFresh }) => {
        const testData = {
          data: { test: 'data' },
          timestamp: now - (hoursAgo * 60 * 60 * 1000),
          ttl: 24 * 60 * 60 * 1000
        };

        const isFresh = CacheService.isFresh(testData, 24 * 60 * 60 * 1000);
        expect(isFresh).toBe(shouldBeFresh);
      });
    });
  });
});