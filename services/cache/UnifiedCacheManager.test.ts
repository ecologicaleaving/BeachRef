/**
 * Unit Tests for Unified Cache Manager
 * Part of Service Layer Consolidation Refactoring
 */

import { UnifiedCacheManager } from './UnifiedCacheManager';
import { CacheStrategies } from './CacheStrategy';

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn()
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('UnifiedCacheManager', () => {
  let cacheManager: UnifiedCacheManager;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheManager = UnifiedCacheManager.getInstance();
  });

  describe('Basic Operations', () => {
    it('should set and get data using tournament_details strategy', async () => {
      const testData = { name: 'Test Tournament', id: '123' };
      const key = 'tournament_123';

      mockAsyncStorage.setItem.mockResolvedValue(undefined);
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        data: testData,
        timestamp: Date.now(),
        ttl: CacheStrategies.TOURNAMENT_DETAILS.ttl,
        namespace: 'tournament_details'
      }));

      // Set data
      const setResult = await cacheManager.set('tournament_details', key, testData);
      expect(setResult.success).toBe(true);
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();

      // Get data
      const getResult = await cacheManager.get('tournament_details', key);
      expect(getResult.success).toBe(true);
      expect(getResult.data).toEqual(testData);
    });

    it('should return null for non-existent data', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await cacheManager.get('tournament_details', 'nonexistent');
      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });

    it('should handle expired data by removing it', async () => {
      const expiredEntry = {
        data: { test: 'data' },
        timestamp: Date.now() - 10000, // 10 seconds ago
        ttl: 5000, // 5 second TTL (expired)
        namespace: 'tournament_details'
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(expiredEntry));
      mockAsyncStorage.removeItem.mockResolvedValue(undefined);

      const result = await cacheManager.get('tournament_details', 'expired_key');
      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      expect(mockAsyncStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('Strategy Registration', () => {
    it('should register custom cache strategies', () => {
      const customStrategy = {
        namespace: 'custom_test',
        ttl: 60000,
        prefix: '@VisCache:custom:',
        compression: false
      };

      cacheManager.registerStrategy(customStrategy);

      // This would be tested by attempting to use the strategy
      expect(() => {
        cacheManager.registerStrategy(customStrategy);
      }).not.toThrow();
    });

    it('should fail operations with unknown strategy', async () => {
      const result = await cacheManager.get('unknown_strategy', 'test_key');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown cache strategy');
    });
  });

  describe('Namespace Management', () => {
    it('should clear all entries in a namespace', async () => {
      const mockKeys = [
        '@VisCache:tournament:key1',
        '@VisCache:tournament:key2',
        '@VisCache:general:key3'
      ];

      mockAsyncStorage.getAllKeys.mockResolvedValue(mockKeys);
      mockAsyncStorage.multiRemove.mockResolvedValue(undefined);

      const result = await cacheManager.clearNamespace('tournament_details');
      expect(result.success).toBe(true);
      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@VisCache:tournament:key1',
        '@VisCache:tournament:key2'
      ]);
    });
  });

  describe('Statistics', () => {
    it('should return cache statistics', async () => {
      const mockKeys = [
        '@VisCache:tournament:key1',
        '@VisCache:general:key2'
      ];

      mockAsyncStorage.getAllKeys.mockResolvedValue(mockKeys);
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify({
          data: {},
          timestamp: Date.now(),
          ttl: 1000,
          namespace: 'tournament_details'
        }))
        .mockResolvedValueOnce(JSON.stringify({
          data: {},
          timestamp: Date.now() - 2000, // Expired
          ttl: 1000,
          namespace: 'general'
        }));

      const stats = await cacheManager.getStats();

      expect(stats.totalKeys).toBe(2);
      expect(stats.expiredKeys).toBe(1);
      expect(stats.strategyCounts).toHaveProperty('tournament_details');
      expect(stats.strategyCounts).toHaveProperty('general');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup expired entries', async () => {
      const mockKeys = [
        '@VisCache:tournament:expired',
        '@VisCache:general:valid'
      ];

      mockAsyncStorage.getAllKeys.mockResolvedValue(mockKeys);
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify({
          data: {},
          timestamp: Date.now() - 2000, // Expired
          ttl: 1000,
          namespace: 'tournament_details'
        }))
        .mockResolvedValueOnce(JSON.stringify({
          data: {},
          timestamp: Date.now(),
          ttl: 10000, // Valid
          namespace: 'general'
        }));

      mockAsyncStorage.multiRemove.mockResolvedValue(undefined);

      const removedCount = await cacheManager.cleanup();

      expect(removedCount).toBe(1);
      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@VisCache:tournament:expired'
      ]);
    });
  });

  describe('Error Handling', () => {
    it('should handle AsyncStorage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await cacheManager.get('tournament_details', 'test_key');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cache get failed');
    });

    it('should handle corrupted cache entries', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid json');

      const result = await cacheManager.get('tournament_details', 'corrupted_key');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cache get failed');
    });
  });
});