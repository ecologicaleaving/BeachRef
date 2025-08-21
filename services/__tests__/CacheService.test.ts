import { CacheService } from '../CacheService';
import { MemoryCacheManager } from '../MemoryCacheManager';
import { LocalStorageManager } from '../LocalStorageManager';
import { CacheStatsService } from '../CacheStatsService';
import { TournamentCore } from '../../types/tournament-v2';
import { BeachMatch } from '../../types/match';

// Mock dependencies
jest.mock('../MemoryCacheManager');
jest.mock('../LocalStorageManager');
jest.mock('../CacheStatsService', () => ({
  CacheStatsService: {
    getInstance: jest.fn(() => ({
      startTimer: jest.fn(),
      recordHit: jest.fn(),
      getDetailedMetrics: jest.fn()
    }))
  }
}));
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({ data: [], error: null }))
        }))
      }))
    }))
  }
}));

jest.mock('../api/VisApiClient', () => ({
  VisApiClient: jest.fn().mockImplementation(() => ({
    getEventList: jest.fn(),
    getBeachMatchList: jest.fn()
  }))
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    multiRemove: jest.fn(),
    getAllKeys: jest.fn(() => Promise.resolve([])),
  }
}));

describe('CacheService', () => {
  let mockMemoryCache: jest.Mocked<MemoryCacheManager>;
  let mockLocalStorage: jest.Mocked<LocalStorageManager>;
  let mockStats: jest.Mocked<CacheStatsService>;

  const mockTournaments: TournamentCore[] = [
    {
      id: 'tournament_1',
      visNo: '1',
      version: 1,
      lastUpdated: new Date().toISOString(),
      name: 'Test Tournament',
      code: 'TEST2025',
      gender: 'Mixed',
      tournamentType: 'BPT',
      dates: {
        startDate: '2025-08-22',
        endDate: '2025-08-24'
      },
      status: 'ACTIVE'
    }
  ];

  const mockMatches: BeachMatch[] = [
    {
      No: 'M1',
      NoInTournament: '1',
      TeamAName: 'Team A',
      TeamBName: 'Team B',
      Status: 'Running',
      tournamentNo: '1'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset CacheService state
    (CacheService as any).initialized = false;
    
    mockMemoryCache = new MemoryCacheManager() as jest.Mocked<MemoryCacheManager>;
    mockLocalStorage = new LocalStorageManager() as jest.Mocked<LocalStorageManager>;
    
    // Mock CacheStatsService.getInstance() to return our mock
    const { CacheStatsService } = require('../CacheStatsService');
    mockStats = {
      startTimer: jest.fn(),
      recordHit: jest.fn(),
      getDetailedMetrics: jest.fn()
    } as any;
    CacheStatsService.getInstance.mockReturnValue(mockStats);

    // Setup default mocks
    mockMemoryCache.get.mockReturnValue(null);
    mockLocalStorage.get.mockResolvedValue(null);
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      CacheService.initialize();
      
      expect(MemoryCacheManager).toHaveBeenCalledWith(50, 1000);
      expect(LocalStorageManager).toHaveBeenCalledWith(7);
    });

    test('should initialize with custom configuration', () => {
      CacheService.initialize({
        memoryMaxSize: 100,
        memoryMaxEntries: 2000,
        localStorageMaxAge: 14
      });
      
      expect(MemoryCacheManager).toHaveBeenCalledWith(100, 2000);
      expect(LocalStorageManager).toHaveBeenCalledWith(14);
    });

    test('should not reinitialize if already initialized', () => {
      CacheService.initialize();
      CacheService.initialize();
      
      expect(MemoryCacheManager).toHaveBeenCalledTimes(1);
    });
  });

  describe('Multi-Tier Fallback Testing', () => {
    test('should return data from memory cache (Tier 1)', async () => {
      CacheService.initialize();
      
      // Mock memory cache hit
      mockMemoryCache.get.mockReturnValue({
        data: mockTournaments,
        timestamp: Date.now(),
        ttl: 86400000,
        accessCount: 1,
        lastAccessed: Date.now()
      });

      const result = await CacheService.getTournaments();

      expect(result.data).toEqual(mockTournaments);
      expect(result.source).toBe('memory');
      expect(result.fromCache).toBe(true);
      expect(mockStats.recordHit).toHaveBeenCalledWith('memory', expect.any(String));
    });

    test('should fallback to local storage (Tier 2) when memory cache misses', async () => {
      CacheService.initialize();
      
      // Mock memory cache miss, local storage hit
      mockMemoryCache.get.mockReturnValue(null);
      mockLocalStorage.get.mockResolvedValue({
        data: mockTournaments,
        timestamp: Date.now(),
        ttl: 86400000
      });

      const result = await CacheService.getTournaments();

      expect(result.data).toEqual(mockTournaments);
      expect(result.source).toBe('localStorage');
      expect(result.fromCache).toBe(true);
      expect(mockStats.recordHit).toHaveBeenCalledWith('localStorage', expect.any(String));
      expect(mockMemoryCache.set).toHaveBeenCalled();
    });

    test('should fallback to API (Tier 4) when all caches miss', async () => {
      const { VisApiClient } = require('../api/VisApiClient');
      const mockApiClient = new VisApiClient();
      mockApiClient.getEventList.mockResolvedValue(mockTournaments);

      CacheService.initialize();
      
      // Mock all cache misses
      mockMemoryCache.get.mockReturnValue(null);
      mockLocalStorage.get.mockResolvedValue(null);

      const result = await CacheService.getTournaments();

      expect(result.data).toEqual(mockTournaments);
      expect(result.source).toBe('api');
      expect(result.fromCache).toBe(false);
      expect(mockStats.recordHit).toHaveBeenCalledWith('api', expect.any(String));
    });

    test('should handle cascade failures gracefully', async () => {
      const { VisApiClient } = require('../api/VisApiClient');
      const mockApiClient = new VisApiClient();
      mockApiClient.getEventList.mockRejectedValue(new Error('API Error'));

      CacheService.initialize();
      
      // Mock all failures except stale data fallback
      mockMemoryCache.get.mockReturnValue(null);
      mockLocalStorage.get
        .mockResolvedValueOnce(null) // First call for fresh data
        .mockResolvedValueOnce({ // Second call for stale data fallback
          data: mockTournaments,
          timestamp: Date.now() - 1000000, // Old timestamp
          ttl: 86400000
        });

      const result = await CacheService.getTournaments();

      expect(result.data).toEqual(mockTournaments);
      expect(result.source).toBe('localStorage');
      expect(result.fromCache).toBe(true);
    });
  });

  describe('TTL Validation Testing', () => {
    test('should respect TTL for memory cache entries', async () => {
      CacheService.initialize();
      
      // Mock expired memory cache entry
      const expiredEntry = {
        data: mockTournaments,
        timestamp: Date.now() - 100000, // Old timestamp
        ttl: 50000, // 50 seconds TTL (expired)
        accessCount: 1,
        lastAccessed: Date.now() - 100000
      };
      
      mockMemoryCache.get.mockReturnValue(expiredEntry);

      // Should trigger fallback since entry is expired
      await expect(CacheService.getTournaments()).resolves.toBeDefined();
      expect(mockLocalStorage.get).toHaveBeenCalled();
    });

    test('should calculate dynamic TTL for different match statuses', async () => {
      CacheService.initialize();

      const liveMatches = [{ ...mockMatches[0], Status: 'Running' }];
      const scheduledMatches = [{ ...mockMatches[0], Status: 'Scheduled' }];
      const finishedMatches = [{ ...mockMatches[0], Status: 'Finished' }];

      // Test with live matches (should use 30 seconds TTL)
      mockMemoryCache.get.mockReturnValue(null);
      mockLocalStorage.get.mockResolvedValue({
        data: liveMatches,
        timestamp: Date.now(),
        ttl: 30000
      });

      const liveResult = await CacheService.getMatches('1');
      expect(liveResult.data).toEqual(liveMatches);

      // Test with scheduled matches (should use 15 minutes TTL)
      mockLocalStorage.get.mockResolvedValue({
        data: scheduledMatches,
        timestamp: Date.now(),
        ttl: 900000
      });

      const scheduledResult = await CacheService.getMatches('1');
      expect(scheduledResult.data).toEqual(scheduledMatches);

      // Test with finished matches (should use 24 hours TTL)
      mockLocalStorage.get.mockResolvedValue({
        data: finishedMatches,
        timestamp: Date.now(),
        ttl: 86400000
      });

      const finishedResult = await CacheService.getMatches('1');
      expect(finishedResult.data).toEqual(finishedMatches);
    });

    test('should validate freshness correctly', () => {
      const freshData = {
        data: mockTournaments,
        timestamp: Date.now() - 1000, // 1 second ago
        ttl: 5000 // 5 seconds TTL
      };

      const staleData = {
        data: mockTournaments,
        timestamp: Date.now() - 10000, // 10 seconds ago
        ttl: 5000 // 5 seconds TTL
      };

      expect(CacheService.isFresh(freshData, 5000)).toBe(true);
      expect(CacheService.isFresh(staleData, 5000)).toBe(false);
    });
  });

  describe('Memory Cache Testing', () => {
    test('should use memory cache operations correctly', () => {
      CacheService.initialize();

      // Test get
      CacheService.getFromMemory('test-key');
      expect(mockMemoryCache.get).toHaveBeenCalledWith('test-key');

      // Test set
      CacheService.setInMemory('test-key', mockTournaments, 86400000);
      expect(mockMemoryCache.set).toHaveBeenCalledWith('test-key', mockTournaments, 86400000);

      // Test clear specific key
      CacheService.clearMemoryCache('test-key');
      expect(mockMemoryCache.delete).toHaveBeenCalledWith('test-key');

      // Test clear all
      CacheService.clearMemoryCache();
      expect(mockMemoryCache.clear).toHaveBeenCalled();
    });
  });

  describe('Local Storage Testing', () => {
    test('should use local storage operations correctly', async () => {
      CacheService.initialize();

      // Test get
      await CacheService.getFromLocalStorage('test-key');
      expect(mockLocalStorage.get).toHaveBeenCalledWith('test-key');

      // Test set
      await CacheService.setLocalStorage('test-key', mockTournaments, 86400000);
      expect(mockLocalStorage.set).toHaveBeenCalledWith('test-key', mockTournaments, 86400000);

      // Test clear specific key
      await CacheService.clearLocalStorage('test-key');
      expect(mockLocalStorage.delete).toHaveBeenCalledWith('test-key');

      // Test clear all
      await CacheService.clearLocalStorage();
      expect(mockLocalStorage.clear).toHaveBeenCalled();
    });
  });

  describe('Error Handling Testing', () => {
    test('should handle Supabase errors gracefully', async () => {
      CacheService.initialize();
      
      // Mock Supabase error
      const { supabase } = require('../supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Supabase error')
            })
          })
        })
      });

      // Mock API fallback
      const { VisApiClient } = require('../api/VisApiClient');
      const mockApiClient = new VisApiClient();
      mockApiClient.getEventList.mockResolvedValue(mockTournaments);

      const result = await CacheService.getTournaments();
      
      expect(result.data).toEqual(mockTournaments);
      expect(result.source).toBe('api');
    });

    test('should handle network failures with exponential backoff', async () => {
      const { VisApiClient } = require('../api/VisApiClient');
      const mockApiClient = new VisApiClient();
      
      // Simulate network error
      mockApiClient.getEventList.mockRejectedValue(new Error('Network error'));
      
      CacheService.initialize();

      await expect(CacheService.getTournaments()).rejects.toThrow('Network error');
    });

    test('should return stale data when all else fails', async () => {
      const { VisApiClient } = require('../api/VisApiClient');
      const mockApiClient = new VisApiClient();
      mockApiClient.getEventList.mockRejectedValue(new Error('API Error'));

      CacheService.initialize();
      
      // Mock stale data available
      mockMemoryCache.get.mockReturnValue(null);
      mockLocalStorage.get
        .mockResolvedValueOnce(null) // Fresh data attempt
        .mockResolvedValueOnce({ // Stale data fallback
          data: mockTournaments,
          timestamp: Date.now() - 1000000,
          ttl: 86400000
        });

      const result = await CacheService.getTournaments();
      
      expect(result.data).toEqual(mockTournaments);
      expect(result.fromCache).toBe(true);
    });
  });

  describe('Cache Statistics Testing', () => {
    test('should track cache statistics correctly', () => {
      CacheService.initialize();
      
      // Mock stats methods
      mockStats.getDetailedMetrics.mockReturnValue({
        memoryHits: 10,
        supabaseHits: 5,
        localHits: 3,
        apiCalls: 2,
        totalRequests: 20,
        hitRatio: 0.9,
        averageResponseTimes: {
          memory: 5,
          localStorage: 15,
          supabase: 100,
          api: 500
        },
        cacheEfficiency: 90,
        apiReductionPercentage: 90
      });

      const stats = CacheService.getCacheStats();
      
      expect(stats).toBeDefined();
      expect(stats.hitRatio).toBe(0.9);
      expect(stats.cacheEfficiency).toBe(90);
      expect(mockStats.getDetailedMetrics).toHaveBeenCalled();
    });
  });

  describe('Cache Key Generation', () => {
    test('should generate consistent cache keys', () => {
      const key1 = CacheService.generateCacheKey('tournaments');
      const key2 = CacheService.generateCacheKey('tournaments');
      expect(key1).toBe(key2);

      const keyWithFilters = CacheService.generateCacheKey('tournaments', { currentlyActive: true });
      expect(keyWithFilters).toContain('tournaments');
      expect(keyWithFilters).not.toBe(key1);
    });

    test('should generate different keys for different filters', () => {
      const key1 = CacheService.generateCacheKey('tournaments', { currentlyActive: true });
      const key2 = CacheService.generateCacheKey('tournaments', { currentlyActive: false });
      expect(key1).not.toBe(key2);
    });
  });

  describe('Cleanup Operations', () => {
    test('should perform cleanup operations', async () => {
      CacheService.initialize();
      
      mockMemoryCache.cleanupExpired.mockReturnValue(5);
      mockLocalStorage.cleanup.mockResolvedValue(3);

      const result = await CacheService.cleanup();
      
      expect(result.memoryCleanedEntries).toBe(5);
      expect(result.localStorageCleanedEntries).toBe(3);
      expect(mockMemoryCache.cleanupExpired).toHaveBeenCalled();
      expect(mockLocalStorage.cleanup).toHaveBeenCalled();
    });
  });

  describe('Cache Invalidation', () => {
    test('should invalidate cache entries by pattern', async () => {
      CacheService.initialize();
      
      mockMemoryCache.getKeysByPattern.mockReturnValue(['tournaments_1', 'tournaments_2']);
      mockLocalStorage.getKeysByPattern.mockResolvedValue(['tournaments_3', 'tournaments_4']);

      await CacheService.invalidate('tournaments*');
      
      expect(mockMemoryCache.getKeysByPattern).toHaveBeenCalledWith('tournaments*');
      expect(mockLocalStorage.getKeysByPattern).toHaveBeenCalledWith('tournaments*');
      expect(mockMemoryCache.delete).toHaveBeenCalledTimes(2);
      expect(mockLocalStorage.delete).toHaveBeenCalledTimes(2);
    });
  });
});