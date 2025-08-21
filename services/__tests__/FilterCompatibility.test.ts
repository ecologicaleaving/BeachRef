import { CacheService } from '../CacheService';
import { VisApiService } from '../visApi';

// Mock dependencies
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        data: [],
        error: null
      }))
    }))
  }
}));

jest.mock('../MemoryCacheManager');
jest.mock('../LocalStorageManager');
jest.mock('../CacheStatsService');

const mockVisApiService = VisApiService as jest.Mocked<typeof VisApiService>;

describe('CacheService Filter Options Compatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CacheService.initialize();
    
    // Mock VisApiService methods
    mockVisApiService.getTournamentListWithDetails = jest.fn();
  });

  describe('Filter Option Passing Through Cache Tiers', () => {
    it('should pass all filter options to direct API fallback', async () => {
      const filterOptions = {
        recentOnly: true,
        year: 2025,
        currentlyActive: true,
        tournamentType: 'FIVB' as const
      };

      // Mock empty results from all cache tiers to force API fallback
      const { supabase } = require('../supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          data: null,
          error: null
        })
      });

      mockVisApiService.getTournamentListWithDetails.mockResolvedValue([{
        No: '1',
        Code: 'MFIVB2025',
        Name: 'FIVB World Tour',
        StartDate: '2025-01-15',
        EndDate: '2025-01-20',
        Version: '1'
      }]);

      // Act
      await CacheService.getTournaments(filterOptions);

      // Assert - All filter options should be passed to API
      expect(mockVisApiService.getTournamentListWithDetails).toHaveBeenCalledWith(filterOptions);
    });

    it('should pass undefined filters correctly to API fallback', async () => {
      // Mock empty cache results
      const { supabase } = require('../supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          data: null,
          error: null
        })
      });

      mockVisApiService.getTournamentListWithDetails.mockResolvedValue([]);

      // Act - No filters provided
      await CacheService.getTournaments();

      // Assert - undefined should be passed to API
      expect(mockVisApiService.getTournamentListWithDetails).toHaveBeenCalledWith(undefined);
    });

    it('should pass partial filter options correctly', async () => {
      const partialFilters = {
        tournamentType: 'BPT' as const
      };

      // Mock empty cache results
      const { supabase } = require('../supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          data: null,
          error: null
        })
      });

      mockVisApiService.getTournamentListWithDetails.mockResolvedValue([]);

      // Act
      await CacheService.getTournaments(partialFilters);

      // Assert
      expect(mockVisApiService.getTournamentListWithDetails).toHaveBeenCalledWith(partialFilters);
    });
  });

  describe('Supabase Filter Application', () => {
    it('should apply currentlyActive filter to Supabase query', async () => {
      const { supabase } = require('../supabase');
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis()
      };
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });
      mockQuery.data = [];
      mockQuery.error = null;

      // Act
      await CacheService.getTournamentsFromSupabase({ currentlyActive: true });

      // Assert - Should filter by status = 'Running'
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'Running');
    });

    it('should apply year filter to Supabase query', async () => {
      const { supabase } = require('../supabase');
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis()
      };
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });
      mockQuery.data = [];
      mockQuery.error = null;

      // Act
      await CacheService.getTournamentsFromSupabase({ year: 2025 });

      // Assert - Should filter by year range
      expect(mockQuery.gte).toHaveBeenCalledWith('dates->>startDate', '2025-01-01');
      expect(mockQuery.lte).toHaveBeenCalledWith('dates->>startDate', '2025-12-31');
    });

    it('should apply tournamentType filter to Supabase query', async () => {
      const { supabase } = require('../supabase');
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis()
      };
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });
      mockQuery.data = [];
      mockQuery.error = null;

      // Act
      await CacheService.getTournamentsFromSupabase({ tournamentType: 'FIVB' });

      // Assert - Should filter by tournament type
      expect(mockQuery.eq).toHaveBeenCalledWith('type', 'FIVB');
    });

    it('should skip tournamentType filter for ALL type', async () => {
      const { supabase } = require('../supabase');
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis()
      };
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });
      mockQuery.data = [];
      mockQuery.error = null;

      // Act
      await CacheService.getTournamentsFromSupabase({ tournamentType: 'ALL' });

      // Assert - Should NOT filter by type when type is 'ALL'
      expect(mockQuery.eq).not.toHaveBeenCalledWith('type', 'ALL');
    });

    it('should apply recentOnly filter to Supabase query', async () => {
      const { supabase } = require('../supabase');
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis()
      };
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });
      mockQuery.data = [];
      mockQuery.error = null;

      // Act
      await CacheService.getTournamentsFromSupabase({ recentOnly: true });

      // Assert - Should apply date range filter
      expect(mockQuery.gte).toHaveBeenCalledWith('dates->>startDate', expect.any(String));
      expect(mockQuery.lte).toHaveBeenCalledWith('dates->>startDate', expect.any(String));
      
      // Verify the dates are approximately one month before/after today
      const gteCall = mockQuery.gte.mock.calls.find(call => call[0] === 'dates->>startDate');
      const lteCall = mockQuery.lte.mock.calls.find(call => call[0] === 'dates->>startDate');
      
      expect(gteCall).toBeTruthy();
      expect(lteCall).toBeTruthy();
    });

    it('should apply multiple filters simultaneously', async () => {
      const { supabase } = require('../supabase');
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis()
      };
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });
      mockQuery.data = [];
      mockQuery.error = null;

      // Act - Apply multiple filters
      await CacheService.getTournamentsFromSupabase({
        currentlyActive: true,
        year: 2025,
        tournamentType: 'FIVB',
        recentOnly: true
      });

      // Assert - All filters should be applied
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'Running');
      expect(mockQuery.eq).toHaveBeenCalledWith('type', 'FIVB');
      expect(mockQuery.gte).toHaveBeenCalledWith('dates->>startDate', '2025-01-01');
      expect(mockQuery.lte).toHaveBeenCalledWith('dates->>startDate', '2025-12-31');
    });
  });

  describe('Cache Key Generation with Filters', () => {
    it('should generate different cache keys for different filter combinations', () => {
      const key1 = CacheService.generateCacheKey('tournaments', { tournamentType: 'FIVB' });
      const key2 = CacheService.generateCacheKey('tournaments', { tournamentType: 'BPT' });
      const key3 = CacheService.generateCacheKey('tournaments', { currentlyActive: true });
      const key4 = CacheService.generateCacheKey('tournaments');

      // All keys should be different
      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key1).not.toBe(key4);
      expect(key2).not.toBe(key3);
      expect(key2).not.toBe(key4);
      expect(key3).not.toBe(key4);
    });

    it('should generate consistent keys for identical filter combinations', () => {
      const filters = { tournamentType: 'FIVB', currentlyActive: true };
      const key1 = CacheService.generateCacheKey('tournaments', filters);
      const key2 = CacheService.generateCacheKey('tournaments', filters);

      expect(key1).toBe(key2);
    });

    it('should generate keys that maintain object property order independence', () => {
      const filters1 = { tournamentType: 'FIVB', currentlyActive: true };
      const filters2 = { currentlyActive: true, tournamentType: 'FIVB' };
      
      const key1 = CacheService.generateCacheKey('tournaments', filters1);
      const key2 = CacheService.generateCacheKey('tournaments', filters2);

      // Keys should be the same regardless of property order in JavaScript object
      expect(key1).toBe(key2);
    });

    it('should handle complex filter combinations in cache keys', () => {
      const complexFilters = {
        tournamentType: 'FIVB',
        currentlyActive: true,
        year: 2025,
        recentOnly: true
      };

      const key = CacheService.generateCacheKey('tournaments', complexFilters);
      
      // Should generate a valid key without errors
      expect(key).toBeTruthy();
      expect(key).toContain('tournaments_');
      expect(key.length).toBeGreaterThan('tournaments_'.length);
    });

    it('should handle edge cases in cache key generation', () => {
      // Test null filters
      const keyNull = CacheService.generateCacheKey('tournaments', null);
      expect(keyNull).toBe('tournaments');

      // Test undefined filters  
      const keyUndefined = CacheService.generateCacheKey('tournaments', undefined);
      expect(keyUndefined).toBe('tournaments');

      // Test empty object
      const keyEmpty = CacheService.generateCacheKey('tournaments', {});
      expect(keyEmpty).toContain('tournaments_');

      // Test filters with undefined values
      const keyWithUndefined = CacheService.generateCacheKey('tournaments', { 
        tournamentType: undefined,
        currentlyActive: true 
      });
      expect(keyWithUndefined).toBeTruthy();
    });
  });

  describe('Filter Preservation Across Cache Operations', () => {
    it('should maintain filter context during cache tier fallback', async () => {
      const filterOptions = {
        tournamentType: 'BPT' as const,
        currentlyActive: true
      };

      // Mock memory cache miss
      (CacheService as any).getFromMemory = jest.fn().mockReturnValue(null);
      
      // Mock local storage miss
      (CacheService as any).getFromLocalStorage = jest.fn().mockResolvedValue(null);

      // Mock Supabase miss  
      const { supabase } = require('../supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          data: [],
          error: null
        })
      });

      // Mock API success
      mockVisApiService.getTournamentListWithDetails.mockResolvedValue([{
        No: '1',
        Code: 'WBPT2025',
        Name: 'Beach Pro Tour',
        StartDate: '2025-01-25',
        EndDate: '2025-01-30',
        Version: '1'
      }]);

      // Act
      const result = await CacheService.getTournaments(filterOptions);

      // Assert - Filters should be passed correctly to API tier
      expect(mockVisApiService.getTournamentListWithDetails).toHaveBeenCalledWith(filterOptions);
      expect(result.source).toBe('api');
      expect(result.data).toHaveLength(1);
    });
  });
});