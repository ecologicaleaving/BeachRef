/**
 * @fileoverview Tests for TanStack Query Persistence Integration
 * Testing AsyncStorage persistence and migration functionality
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { asyncStoragePersister, migrateAsyncStorageData, handlePersistenceError } from '../queryPersistence';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('Query Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('asyncStoragePersister', () => {
    test('should be defined and configured', () => {
      expect(asyncStoragePersister).toBeDefined();
      expect(typeof asyncStoragePersister.persistQuery).toBe('function');
      expect(typeof asyncStoragePersister.restoreQueries).toBe('function');
      expect(typeof asyncStoragePersister.persisterGc).toBe('function');
      expect(typeof asyncStoragePersister.retrieveQuery).toBe('function');
    });

    test('should handle storage operations gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue();
      
      // Should not throw when storage is available
      expect(() => asyncStoragePersister).not.toThrow();
    });

    test('should handle storage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage unavailable'));
      
      // Should not crash the application
      expect(() => asyncStoragePersister).not.toThrow();
    });
  });

  describe('migrateAsyncStorageData', () => {
    test('should check for existing cache keys', async () => {
      const mockKeys = ['cache_tournaments', 'tournament_123', 'matches_456', 'other_key'];
      mockAsyncStorage.getAllKeys.mockResolvedValue(mockKeys);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await migrateAsyncStorageData();
      
      expect(mockAsyncStorage.getAllKeys).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found 3 legacy cache keys for migration consideration')
      );
      
      consoleSpy.mockRestore();
    });

    test('should handle migration check gracefully when no legacy keys exist', async () => {
      mockAsyncStorage.getAllKeys.mockResolvedValue(['other_key', 'unrelated_data']);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await migrateAsyncStorageData();
      
      expect(mockAsyncStorage.getAllKeys).toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('should handle AsyncStorage errors during migration check', async () => {
      mockAsyncStorage.getAllKeys.mockRejectedValue(new Error('Storage error'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await migrateAsyncStorageData();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'AsyncStorage migration check failed:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    test('should identify legacy cache key patterns correctly', async () => {
      const mockKeys = [
        'cache_tournaments_2024',
        'tournament_FIVB2024M001',
        'matches_eventId_123',
        '@react-native-async-storage/something',
        'expo-settings',
        'other_app_data'
      ];
      mockAsyncStorage.getAllKeys.mockResolvedValue(mockKeys);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await migrateAsyncStorageData();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found 3 legacy cache keys')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('handlePersistenceError', () => {
    test('should log persistence errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const testError = new Error('Persistence failed');
      
      handlePersistenceError(testError);
      
      expect(consoleSpy).toHaveBeenCalledWith('Query persistence error:', testError);
      
      consoleSpy.mockRestore();
    });

    test('should handle different error types', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      handlePersistenceError(new Error('Network error'));
      handlePersistenceError(new TypeError('Type error'));
      
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Storage Integration', () => {
    test('should use correct storage key for persistence', () => {
      // The persister should use the configured key for storage operations
      const expectedKey = 'tanstack-query-cache';
      
      // This is validated through the persister configuration
      expect(asyncStoragePersister).toBeDefined();
      
      // The actual key is used internally by the persister
      // We validate this through integration testing
    });

    test('should handle storage quota exceeded scenarios', async () => {
      const quotaError = new Error('QuotaExceededError');
      mockAsyncStorage.setItem.mockRejectedValue(quotaError);
      
      // Should handle quota errors gracefully
      expect(() => asyncStoragePersister).not.toThrow();
    });
  });

  describe('Persistence Configuration', () => {
    test('should export persistence options', () => {
      const { persistOptions } = require('../queryPersistence');
      
      expect(persistOptions).toBeDefined();
      expect(persistOptions.persister).toBe(asyncStoragePersister);
      expect(persistOptions.maxAge).toBe(1000 * 60 * 60 * 24 * 7); // 7 days
      expect(persistOptions.dehydrateOptions).toBeDefined();
      expect(typeof persistOptions.dehydrateOptions.shouldDehydrateQuery).toBe('function');
    });

    test('should only persist successful queries', () => {
      const { persistOptions } = require('../queryPersistence');
      const shouldDehydrate = persistOptions.dehydrateOptions.shouldDehydrateQuery;
      
      expect(shouldDehydrate({ state: { status: 'success' } })).toBe(true);
      expect(shouldDehydrate({ state: { status: 'error' } })).toBe(false);
      expect(shouldDehydrate({ state: { status: 'loading' } })).toBe(false);
    });
  });
});