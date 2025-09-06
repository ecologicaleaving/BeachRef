/**
 * Unit tests for TournamentStorageService referee data persistence
 * Tests referee data storage, retrieval, and TTL handling
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { TournamentStorageService } from '../../services/TournamentStorageService';
import { TournamentRefereeData } from '../../types/referee-v2';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

describe('TournamentStorageService - Referee Persistence', () => {
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
  });

  describe('cacheRefereeData', () => {
    it('should cache referee data with 24-hour TTL', async () => {
      const mockSetItem = AsyncStorage.setItem as jest.Mock;
      
      await TournamentStorageService.cacheRefereeData(mockTournamentNo, mockRefereeData);

      expect(mockSetItem).toHaveBeenCalledWith(
        '@referee_data_cache_12345',
        expect.stringContaining(mockTournamentNo)
      );
      
      // Check that the stored data includes TTL information
      const storedData = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(storedData).toHaveProperty('refereeData');
      expect(storedData).toHaveProperty('cachedAt');
      expect(storedData).toHaveProperty('expiresAt');
      expect(storedData.refereeData).toEqual(mockRefereeData);
      
      // Verify 24-hour TTL (allow for small time differences)
      const cachedAt = new Date(storedData.cachedAt);
      const expiresAt = new Date(storedData.expiresAt);
      const diffHours = (expiresAt.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeCloseTo(24, 0);
    });

    it('should handle caching errors gracefully', async () => {
      const mockSetItem = AsyncStorage.setItem as jest.Mock;
      mockSetItem.mockRejectedValue(new Error('Storage full'));
      
      // Should not throw error
      await expect(
        TournamentStorageService.cacheRefereeData(mockTournamentNo, mockRefereeData)
      ).resolves.not.toThrow();
    });
  });

  describe('getCachedRefereeData', () => {
    it('should return cached data when available and not expired', async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours from now
      
      const cachedData = {
        refereeData: mockRefereeData,
        cachedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
      };
      
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      mockGetItem.mockResolvedValue(JSON.stringify(cachedData));

      const result = await TournamentStorageService.getCachedRefereeData(mockTournamentNo);

      expect(result).toEqual(mockRefereeData);
      expect(mockGetItem).toHaveBeenCalledWith('@referee_data_cache_12345');
    });

    it('should return null when no cache exists', async () => {
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      mockGetItem.mockResolvedValue(null);

      const result = await TournamentStorageService.getCachedRefereeData(mockTournamentNo);

      expect(result).toBeNull();
    });

    it('should remove expired cache and return null', async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() - 1000); // Already expired
      
      const expiredCachedData = {
        refereeData: mockRefereeData,
        cachedAt: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
        expiresAt: expiresAt.toISOString()
      };
      
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;
      mockGetItem.mockResolvedValue(JSON.stringify(expiredCachedData));

      const result = await TournamentStorageService.getCachedRefereeData(mockTournamentNo);

      expect(result).toBeNull();
      expect(mockRemoveItem).toHaveBeenCalledWith('@referee_data_cache_12345');
    });

    it('should handle retrieval errors gracefully', async () => {
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      mockGetItem.mockRejectedValue(new Error('Storage error'));

      const result = await TournamentStorageService.getCachedRefereeData(mockTournamentNo);

      expect(result).toBeNull();
    });
  });

  describe('clearExpiredRefereeCaches', () => {
    it('should remove only expired referee caches', async () => {
      const now = new Date();
      const validCache = {
        refereeData: mockRefereeData,
        cachedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString() // 12 hours from now
      };
      const expiredCache = {
        refereeData: mockRefereeData,
        cachedAt: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(now.getTime() - 1000).toISOString() // Already expired
      };

      const mockGetAllKeys = AsyncStorage.getAllKeys as jest.Mock;
      const mockGetItem = AsyncStorage.getItem as jest.Mock;
      const mockMultiRemove = AsyncStorage.multiRemove as jest.Mock;

      mockGetAllKeys.mockResolvedValue([
        '@referee_data_cache_valid',
        '@referee_data_cache_expired',
        '@other_cache_key'
      ]);

      mockGetItem.mockImplementation((key: string) => {
        if (key === '@referee_data_cache_valid') {
          return Promise.resolve(JSON.stringify(validCache));
        }
        if (key === '@referee_data_cache_expired') {
          return Promise.resolve(JSON.stringify(expiredCache));
        }
        return Promise.resolve(null);
      });

      await TournamentStorageService.clearExpiredRefereeCaches();

      expect(mockMultiRemove).toHaveBeenCalledWith(['@referee_data_cache_expired']);
    });
  });

  describe('clearRefereeDataCache', () => {
    it('should clear cache for specific tournament', async () => {
      const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;

      await TournamentStorageService.clearRefereeDataCache(mockTournamentNo);

      expect(mockRemoveItem).toHaveBeenCalledWith('@referee_data_cache_12345');
    });
  });

  describe('clearAllData', () => {
    it('should include referee data caches in cleanup', async () => {
      const mockGetAllKeys = AsyncStorage.getAllKeys as jest.Mock;
      const mockMultiRemove = AsyncStorage.multiRemove as jest.Mock;

      mockGetAllKeys.mockResolvedValue([
        '@referee_data_cache_123',
        '@referee_data_cache_456',
        '@other_key'
      ]);

      await TournamentStorageService.clearAllData();

      // Should be called twice: once for main keys, once for specific cache keys
      expect(mockMultiRemove).toHaveBeenCalledTimes(2);
      
      // Check that referee data cache keys are included in the second call
      const secondCall = mockMultiRemove.mock.calls[1][0];
      expect(secondCall).toContain('@referee_data_cache_123');
      expect(secondCall).toContain('@referee_data_cache_456');
    });
  });
});