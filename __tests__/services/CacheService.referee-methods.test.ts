/**
 * Unit tests for CacheService referee caching methods
 * Tests multi-tier caching behavior, TTL handling, and API integration
 */

import { CacheService } from '../../services/CacheService';
import { TournamentRefereeData } from '../../types/referee-v2';

// Mock dependencies
jest.mock('../../services/MemoryCacheManager');
jest.mock('../../services/LocalStorageManager');
jest.mock('../../services/api/VisApiClient');
jest.mock('../../services/supabase', () => ({
  supabase: null
}));

jest.mock('../../services/CacheStatsService', () => ({
  CacheStatsService: {
    getInstance: jest.fn(() => ({
      startTimer: jest.fn(),
      recordHit: jest.fn(),
      getDetailedMetrics: jest.fn(() => ({}))
    }))
  }
}));

jest.mock('../../services/NetworkMonitor', () => ({
  NetworkMonitor: {
    getInstance: jest.fn(() => ({
      isConnected: true,
      getNetworkState: jest.fn(() => Promise.resolve({
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true
      }))
    }))
  }
}));

describe('CacheService - Referee Methods', () => {
  const mockTournamentNo = '12345';
  const mockRefereeData: TournamentRefereeData = {
    officials: [
      {
        federationCode: 'USA',
        firstName: 'John',
        gender: 'M',
        lastName: 'Doe',
        noOfficial: 'OFF001',
        role: 'Referee1',
        status: 'Active',
        type: 'Referee'
      }
    ],
    referees: [
      {
        federationCode: 'BRA',
        firstName: 'Maria',
        gender: 'W',
        lastName: 'Silva',
        noReferee: 'REF001',
        status: 'Active',
        type: 'Referee',
        theoryTest: '90',
        strongPoints: 'Quick decisions',
        weakPoints: 'Communication'
      }
    ],
    eventNo: mockTournamentNo,
    timestamp: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Initialize CacheService before each test
    CacheService.initialize();
  });

  describe('getRefereeData', () => {
    it('should return data from memory cache when available', async () => {
      // Mock memory cache hit
      const mockMemoryGet = jest.spyOn(CacheService as any, 'getRefereesFromMemory')
        .mockReturnValue(mockRefereeData);
      
      const result = await CacheService.getRefereeData(mockTournamentNo);

      expect(result).toEqual({
        data: mockRefereeData,
        source: 'memory',
        fromCache: true,
        timestamp: expect.any(Number)
      });
      expect(mockMemoryGet).toHaveBeenCalledWith(
        expect.stringContaining('referees')
      );
    });

    it('should fall back to local storage when memory cache misses', async () => {
      // Mock memory cache miss and local storage hit
      jest.spyOn(CacheService as any, 'getRefereesFromMemory')
        .mockReturnValue(null);
      const mockLocalGet = jest.spyOn(CacheService as any, 'getRefereesFromLocalStorage')
        .mockResolvedValue(mockRefereeData);
      const mockSetMemory = jest.spyOn(CacheService, 'setInMemory')
        .mockImplementation(() => {});

      const result = await CacheService.getRefereeData(mockTournamentNo);

      expect(result).toEqual({
        data: mockRefereeData,
        source: 'localStorage',
        fromCache: true,
        timestamp: expect.any(Number)
      });
      expect(mockLocalGet).toHaveBeenCalled();
      expect(mockSetMemory).toHaveBeenCalledWith(
        expect.stringContaining('referees'),
        mockRefereeData,
        24 * 60 * 60 * 1000 // 24 hours TTL
      );
    });

    it('should fall back to offline storage when network unavailable', async () => {
      // Mock memory and local cache miss, network unavailable
      jest.spyOn(CacheService as any, 'getRefereesFromMemory')
        .mockReturnValue(null);
      jest.spyOn(CacheService as any, 'getRefereesFromLocalStorage')
        .mockResolvedValue(null);
      
      // Mock network monitor to return disconnected
      const mockNetworkMonitor = (CacheService as any).networkMonitor = {
        isConnected: false
      };
      
      const mockOfflineGet = jest.spyOn(CacheService as any, 'getRefereesFromOfflineStorage')
        .mockResolvedValue(mockRefereeData);

      const result = await CacheService.getRefereeData(mockTournamentNo);

      expect(result).toEqual({
        data: mockRefereeData,
        source: 'offline',
        fromCache: true,
        timestamp: expect.any(Number)
      });
      expect(mockOfflineGet).toHaveBeenCalled();
      
      // Restore network monitor
      mockNetworkMonitor.isConnected = true;
    });

    it('should use 24-hour TTL for referee data', async () => {
      // Mock memory cache hit
      const mockSetMemory = jest.spyOn(CacheService, 'setInMemory')
        .mockImplementation(() => {});
      jest.spyOn(CacheService as any, 'getRefereesFromMemory')
        .mockReturnValue(null);
      jest.spyOn(CacheService as any, 'getRefereesFromLocalStorage')
        .mockResolvedValue(mockRefereeData);

      await CacheService.getRefereeData(mockTournamentNo);

      expect(mockSetMemory).toHaveBeenCalledWith(
        expect.any(String),
        mockRefereeData,
        24 * 60 * 60 * 1000 // 24 hours in milliseconds
      );
    });

    it('should handle API fallback when all caches miss', async () => {
      // Mock all cache layers miss and API call
      jest.spyOn(CacheService as any, 'getRefereesFromMemory')
        .mockReturnValue(null);
      jest.spyOn(CacheService as any, 'getRefereesFromLocalStorage')
        .mockResolvedValue(null);
      jest.spyOn(CacheService, 'isNetworkConnected', 'get')
        .mockReturnValue(true);
      const mockApiCall = jest.spyOn(CacheService as any, 'getRefereesFromAPI')
        .mockResolvedValue(mockRefereeData);
      jest.spyOn(CacheService, 'setLocalStorage').mockResolvedValue();
      jest.spyOn(CacheService, 'setOfflineStorage').mockResolvedValue();
      jest.spyOn(CacheService, 'setInMemory').mockImplementation(() => {});

      const result = await CacheService.getRefereeData(mockTournamentNo);

      expect(result).toEqual({
        data: mockRefereeData,
        source: 'api',
        fromCache: false,
        timestamp: expect.any(Number)
      });
      expect(mockApiCall).toHaveBeenCalledWith(mockTournamentNo);
    });

    it('should handle errors gracefully with stale data fallback', async () => {
      const staleData = { ...mockRefereeData, timestamp: '2023-01-01T00:00:00Z' };
      
      // Mock all cache layers miss and API error
      jest.spyOn(CacheService as any, 'getRefereesFromMemory')
        .mockReturnValue(null);
      jest.spyOn(CacheService as any, 'getRefereesFromLocalStorage')
        .mockResolvedValue(null);
      jest.spyOn(CacheService, 'isNetworkConnected', 'get')
        .mockReturnValue(true);
      jest.spyOn(CacheService as any, 'getRefereesFromAPI')
        .mockRejectedValue(new Error('API Error'));
      jest.spyOn(CacheService as any, 'getRefereesFromOfflineStorage')
        .mockResolvedValue(null);
      jest.spyOn(CacheService as any, 'getStaleData')
        .mockResolvedValue(staleData);

      const result = await CacheService.getRefereeData(mockTournamentNo);

      expect(result).toEqual({
        data: staleData,
        source: 'localStorage',
        fromCache: true,
        timestamp: expect.any(Number)
      });
    });
  });

  describe('TTL Configuration', () => {
    it('should have correct 24-hour TTL for referees in config', () => {
      CacheService.initialize();
      const config = (CacheService as any).config;
      
      expect(config.defaultTTL.referees).toBe(24 * 60 * 60 * 1000);
    });
  });
});