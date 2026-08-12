import { LocalStorageManager } from '../LocalStorageManager';

// Import the mocked AsyncStorage
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const mockedAsyncStorage = AsyncStorage as any;

describe('LocalStorageManager', () => {
  let localStorage: LocalStorageManager;

  beforeEach(() => {
    localStorage = new LocalStorageManager(7); // 7 days max age
    jest.clearAllMocks();
    
    // Reset all mock functions
    Object.values(mockedAsyncStorage).forEach(mockFn => {
      if (typeof mockFn === 'function' && mockFn.mockClear) {
        mockFn.mockClear();
      }
    });
  });

  describe('Basic Operations', () => {
    test('should store and retrieve data', async () => {
      const testData = { name: 'Test Tournament', id: '1' };
      
      
      // Verify mock is working
      expect(mockedAsyncStorage.setItem).toBeDefined();
      
      await localStorage.set('test-key', testData, 60000);
      
      expect(mockedAsyncStorage.setItem).toHaveBeenCalled();

      // Mock getItem for retrieval
      const cachedData = {
        data: testData,
        timestamp: Date.now(),
        ttl: 60000
      };
      
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));
      
      const result = await localStorage.get('test-key');
      
      expect(result).toBeTruthy();
      expect(result?.data).toEqual(testData);
    });

    test('should return null for non-existent keys', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(null);
      
      const result = await localStorage.get('non-existent');
      expect(result).toBeNull();
    });

    test('should delete entries correctly', async () => {
      mockedAsyncStorage.removeItem.mockResolvedValue();
      mockedAsyncStorage.getItem.mockResolvedValue('{}'); // metadata
      mockedAsyncStorage.setItem.mockResolvedValue(); // metadata update
      
      const deleted = await localStorage.delete('test-key');
      
      expect(deleted).toBe(true);
      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith('@VisCache:test-key');
    });

    test('should clear all entries', async () => {
      mockedAsyncStorage.getAllKeys.mockResolvedValue([
        '@VisCache:key1',
        '@VisCache:key2',
        '@OtherApp:key3'
      ]);
      mockedAsyncStorage.multiRemove.mockResolvedValue();
      mockedAsyncStorage.removeItem.mockResolvedValue();
      
      await localStorage.clear();
      
      expect(mockedAsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@VisCache:key1',
        '@VisCache:key2'
      ]);
      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith('@VisCache:metadata');
    });
  });

  describe('TTL and Expiration', () => {
    test('should return null for expired entries', async () => {
      const expiredData = {
        data: { test: 'data' },
        timestamp: Date.now() - 120000, // 2 minutes ago
        ttl: 60000 // 1 minute TTL (expired)
      };
      
      // `mockResolvedValue` non e' una coda: la seconda chiamata SOSTITUISCE
      // la prima. Il test preparava la voce scaduta e subito dopo la
      // rimpiazzava con i metadati, quindi `get()` leggeva `{}` — non una
      // voce scaduta, una voce senza campi — e l'asserzione falliva su un
      // codice che si comportava correttamente.
      mockedAsyncStorage.getItem.mockImplementation(async (chiave: string) =>
        chiave === '@VisCache:expired-key' ? JSON.stringify(expiredData) : '{}'
      );
      mockedAsyncStorage.removeItem.mockResolvedValue();
      mockedAsyncStorage.setItem.mockResolvedValue(); // metadata update
      
      const result = await localStorage.get('expired-key');
      
      expect(result).toBeNull();
      expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith('@VisCache:expired-key');
    });

    test('should clean up expired and old entries', async () => {
      const now = Date.now();
      const oneWeekAgo = now - (8 * 24 * 60 * 60 * 1000); // 8 days ago (older than maxAge)
      const validTimestamp = now - (60 * 60 * 1000); // 1 hour ago
      
      mockedAsyncStorage.getAllKeys.mockResolvedValue([
        '@VisCache:expired-key',
        '@VisCache:old-key',
        '@VisCache:valid-key',
        '@OtherApp:other-key'
      ]);

      // Mock data for each key
      mockedAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify({
          data: { test: 'expired' },
          timestamp: now - 120000, // 2 minutes ago
          ttl: 60000 // 1 minute TTL (expired)
        }))
        .mockResolvedValueOnce(JSON.stringify({
          data: { test: 'old' },
          timestamp: oneWeekAgo,
          ttl: 86400000 // Valid TTL but too old
        }))
        .mockResolvedValueOnce(JSON.stringify({
          data: { test: 'valid' },
          timestamp: validTimestamp,
          ttl: 86400000 // Valid
        }));

      mockedAsyncStorage.multiRemove.mockResolvedValue();
      mockedAsyncStorage.getItem.mockResolvedValue('{}'); // metadata
      mockedAsyncStorage.setItem.mockResolvedValue(); // metadata update

      const cleanedCount = await localStorage.cleanup();

      expect(cleanedCount).toBe(2); // expired-key and old-key
      expect(mockedAsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@VisCache:expired-key',
        '@VisCache:old-key'
      ]);
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should provide accurate storage statistics', async () => {
      const mockKeys = [
        '@VisCache:key1',
        '@VisCache:key2'
      ];

      const validData = {
        data: { test: 'valid' },
        timestamp: Date.now() - 1000,
        ttl: 60000
      };

      const expiredData = {
        data: { test: 'expired' },
        timestamp: Date.now() - 120000,
        ttl: 60000
      };

      mockedAsyncStorage.getAllKeys.mockResolvedValue(mockKeys);
      mockedAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(validData))
        .mockResolvedValueOnce(JSON.stringify(expiredData));

      const stats = await localStorage.getStats();

      expect(stats.totalKeys).toBe(2);
      expect(stats.expiredKeys).toBe(1);
      expect(stats.totalSizeBytes).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBeInstanceOf(Date);
      expect(stats.newestEntry).toBeInstanceOf(Date);
    });

    test('should handle corrupted data gracefully in statistics', async () => {
      const mockKeys = ['@VisCache:corrupted'];

      mockedAsyncStorage.getAllKeys.mockResolvedValue(mockKeys);
      mockedAsyncStorage.getItem.mockResolvedValue('invalid json');

      const stats = await localStorage.getStats();

      expect(stats.expiredKeys).toBe(1); // Corrupted entries count as expired
    });
  });

  describe('Pattern Matching', () => {
    test('should find keys by pattern', async () => {
      mockedAsyncStorage.getAllKeys.mockResolvedValue([
        '@VisCache:tournament_1',
        '@VisCache:tournament_2',
        '@VisCache:match_1',
        '@OtherApp:other_key'
      ]);

      const tournamentKeys = await localStorage.getKeysByPattern('tournament*');
      const matchKeys = await localStorage.getKeysByPattern('match*');

      expect(tournamentKeys).toHaveLength(2);
      expect(tournamentKeys).toContain('tournament_1');
      expect(tournamentKeys).toContain('tournament_2');

      expect(matchKeys).toHaveLength(1);
      expect(matchKeys).toContain('match_1');
    });
  });

  describe('Error Handling', () => {
    test('should handle AsyncStorage errors gracefully', async () => {
      mockedAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await localStorage.get('test-key');
      expect(result).toBeNull();
    });

    test('should handle set errors', async () => {
      mockedAsyncStorage.setItem.mockRejectedValue(new Error('Storage full'));

      await expect(localStorage.set('test-key', { data: 'test' }, 60000))
        .rejects.toThrow('Failed to store data for key: test-key');
    });

    test('should handle delete errors', async () => {
      mockedAsyncStorage.removeItem.mockRejectedValue(new Error('Delete error'));

      const result = await localStorage.delete('test-key');
      expect(result).toBe(false);
    });

    test('should handle clear errors', async () => {
      mockedAsyncStorage.getAllKeys.mockRejectedValue(new Error('Keys error'));

      await expect(localStorage.clear()).rejects.toThrow('Failed to clear cache');
    });

    test('should handle cleanup errors gracefully', async () => {
      mockedAsyncStorage.getAllKeys.mockRejectedValue(new Error('Keys error'));

      const cleanedCount = await localStorage.cleanup();
      expect(cleanedCount).toBe(0);
    });
  });

  describe('Metadata Management', () => {
    test('should update metadata when setting items', async () => {
      mockedAsyncStorage.setItem.mockResolvedValue();
      mockedAsyncStorage.getItem.mockResolvedValueOnce('{}'); // Empty metadata initially
      
      await localStorage.set('test-key', { data: 'test' }, 60000);

      // Should call setItem twice: once for data, once for metadata
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledTimes(2);
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        '@VisCache:metadata',
        expect.stringContaining('test-key')
      );
    });

    test('should handle metadata errors gracefully', async () => {
      mockedAsyncStorage.setItem.mockResolvedValueOnce(); // Data set succeeds
      mockedAsyncStorage.getItem.mockRejectedValue(new Error('Metadata error'));

      // Should not throw even if metadata fails
      await expect(localStorage.set('test-key', { data: 'test' }, 60000))
        .resolves.not.toThrow();
    });
  });

  describe('Serialization', () => {
    test('should handle complex data types', async () => {
      const complexData = {
        array: [1, 2, 3],
        nested: { deep: { value: 'test' } },
        date: new Date().toISOString(),
        boolean: true,
        null: null,
        undefined: undefined
      };

      mockedAsyncStorage.setItem.mockResolvedValue();
      mockedAsyncStorage.getItem.mockResolvedValueOnce(null); // metadata
      mockedAsyncStorage.setItem.mockResolvedValue(); // metadata update

      await localStorage.set('complex-key', complexData, 60000);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        '@VisCache:complex-key',
        expect.stringContaining('"array":[1,2,3]')
      );
    });

    test('should handle large objects', async () => {
      const largeData = {
        tournaments: new Array(1000).fill(null).map((_, i) => ({
          id: i,
          name: `Tournament ${i}`,
          description: 'A'.repeat(100)
        }))
      };

      mockedAsyncStorage.setItem.mockResolvedValue();
      mockedAsyncStorage.getItem.mockResolvedValueOnce(null); // metadata
      mockedAsyncStorage.setItem.mockResolvedValue(); // metadata update

      await localStorage.set('large-data', largeData, 60000);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalled();
    });
  });
});