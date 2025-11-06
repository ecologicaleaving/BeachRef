import AsyncStorage from '@react-native-async-storage/async-storage';
import { CachedData } from '../types/cache';

/**
 * Local storage manager using AsyncStorage for offline persistence
 * Handles data serialization, storage quota management, and cleanup
 */
export class LocalStorageManager {
  private static readonly CACHE_PREFIX = '@VisCache:';
  private static readonly OFFLINE_PREFIX = '@VisOffline:';
  private static readonly METADATA_KEY = '@VisCache:metadata';
  private static readonly OFFLINE_METADATA_KEY = '@VisOffline:metadata';
  private static readonly MAX_STORAGE_SIZE = 2 * 1024 * 1024; // 2MB target
  private maxAge: number; // in milliseconds

  constructor(maxAgeDays: number = 7) {
    this.maxAge = maxAgeDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds
  }

  /**
   * Get item from local storage
   */
  async get(key: string): Promise<CachedData | null> {
    try {
      const fullKey = this.getFullKey(key);
      const value = await AsyncStorage.getItem(fullKey);
      
      if (!value) {
        return null;
      }

      const cachedData: CachedData = JSON.parse(value);
      
      // Check if expired
      if (this.isExpired(cachedData)) {
        await this.delete(key);
        return null;
      }

      return cachedData;
    } catch (error) {
      // console.error('LocalStorageManager.get error:', error);
      return null;
    }
  }

  /**
   * Set item in local storage
   */
  async set(key: string, data: any, ttl: number): Promise<void> {
    try {
      const cachedData: CachedData = {
        data,
        timestamp: Date.now(),
        ttl
      };

      const fullKey = this.getFullKey(key);
      await AsyncStorage.setItem(fullKey, JSON.stringify(cachedData));
      await this.updateMetadata(key, cachedData);
    } catch (error) {
      // console.error('LocalStorageManager.set error:', error);
      throw new Error(`Failed to store data for key: ${key}`);
    }
  }

  /**
   * Delete item from local storage
   */
  async delete(key: string): Promise<boolean> {
    try {
      const fullKey = this.getFullKey(key);
      await AsyncStorage.removeItem(fullKey);
      await this.removeFromMetadata(key);
      return true;
    } catch (error) {
      // console.error('LocalStorageManager.delete error:', error);
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      const keys = await this.getAllCacheKeys();
      if (keys.length > 0) {
        await AsyncStorage.multiRemove(keys);
      }
      await AsyncStorage.removeItem(LocalStorageManager.METADATA_KEY);
    } catch (error) {
      // console.error('LocalStorageManager.clear error:', error);
      throw new Error('Failed to clear cache');
    }
  }

  /**
   * Get storage statistics and perform cleanup
   */
  async getStats(): Promise<{
    totalKeys: number;
    totalSizeBytes: number;
    expiredKeys: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    try {
      const keys = await this.getAllCacheKeys();
      let totalSize = 0;
      let expiredCount = 0;
      let oldestTime = Date.now();
      let newestTime = 0;

      for (const key of keys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            totalSize += value.length;
            const cachedData: CachedData = JSON.parse(value);
            
            if (this.isExpired(cachedData)) {
              expiredCount++;
            }

            if (cachedData.timestamp < oldestTime) {
              oldestTime = cachedData.timestamp;
            }
            if (cachedData.timestamp > newestTime) {
              newestTime = cachedData.timestamp;
            }
          }
        } catch (parseError) {
          // Skip corrupted entries
          expiredCount++;
        }
      }

      return {
        totalKeys: keys.length,
        totalSizeBytes: totalSize,
        expiredKeys: expiredCount,
        oldestEntry: newestTime > 0 ? new Date(oldestTime) : null,
        newestEntry: newestTime > 0 ? new Date(newestTime) : null
      };
    } catch (error) {
      // console.error('LocalStorageManager.getStats error:', error);
      return {
        totalKeys: 0,
        totalSizeBytes: 0,
        expiredKeys: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }
  }

  /**
   * Clean up expired entries and enforce storage limits
   */
  async cleanup(): Promise<number> {
    try {
      const keys = await this.getAllCacheKeys();
      const keysToRemove: string[] = [];
      const now = Date.now();

      for (const key of keys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            const cachedData: CachedData = JSON.parse(value);
            
            // Remove if expired or too old
            if (this.isExpired(cachedData) || (now - cachedData.timestamp > this.maxAge)) {
              keysToRemove.push(key);
            }
          }
        } catch (parseError) {
          // Remove corrupted entries
          keysToRemove.push(key);
        }
      }

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        // Update metadata
        await this.cleanupMetadata(keysToRemove);
      }

      return keysToRemove.length;
    } catch (error) {
      // console.error('LocalStorageManager.cleanup error:', error);
      return 0;
    }
  }

  /**
   * Get keys matching a pattern
   */
  async getKeysByPattern(pattern: string): Promise<string[]> {
    try {
      const allKeys = await this.getAllCacheKeys();
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      
      return allKeys
        .map(key => key.replace(LocalStorageManager.CACHE_PREFIX, ''))
        .filter(key => regex.test(key));
    } catch (error) {
      // console.error('LocalStorageManager.getKeysByPattern error:', error);
      return [];
    }
  }

  /**
   * Serialize data for storage
   */
  private serialize(data: any): string {
    return JSON.stringify(data);
  }

  /**
   * Deserialize data from storage
   */
  private deserialize(data: string): any {
    return JSON.parse(data);
  }

  /**
   * Get full key with cache prefix
   */
  private getFullKey(key: string): string {
    return LocalStorageManager.CACHE_PREFIX + key;
  }

  /**
   * Get all cache keys
   */
  private async getAllCacheKeys(): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      return allKeys.filter(key => key.startsWith(LocalStorageManager.CACHE_PREFIX));
    } catch (error) {
      // console.error('LocalStorageManager.getAllCacheKeys error:', error);
      return [];
    }
  }

  /**
   * Check if cached data is expired
   */
  private isExpired(cachedData: CachedData): boolean {
    return Date.now() - cachedData.timestamp > cachedData.ttl;
  }

  /**
   * Update metadata for tracking
   */
  private async updateMetadata(key: string, cachedData: CachedData): Promise<void> {
    try {
      const metadataStr = await AsyncStorage.getItem(LocalStorageManager.METADATA_KEY);
      const metadata = metadataStr ? JSON.parse(metadataStr) : {};
      
      metadata[key] = {
        timestamp: cachedData.timestamp,
        ttl: cachedData.ttl,
        size: JSON.stringify(cachedData).length
      };

      await AsyncStorage.setItem(LocalStorageManager.METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      // Metadata update failure is not critical
      // console.warn('Failed to update metadata:', error);
    }
  }

  /**
   * Remove key from metadata
   */
  private async removeFromMetadata(key: string): Promise<void> {
    try {
      const metadataStr = await AsyncStorage.getItem(LocalStorageManager.METADATA_KEY);
      if (metadataStr) {
        const metadata = JSON.parse(metadataStr);
        delete metadata[key];
        await AsyncStorage.setItem(LocalStorageManager.METADATA_KEY, JSON.stringify(metadata));
      }
    } catch (error) {
      // console.warn('Failed to remove from metadata:', error);
    }
  }

  /**
   * Clean up metadata for removed keys
   */
  private async cleanupMetadata(removedKeys: string[]): Promise<void> {
    try {
      const metadataStr = await AsyncStorage.getItem(LocalStorageManager.METADATA_KEY);
      if (metadataStr) {
        const metadata = JSON.parse(metadataStr);
        
        for (const fullKey of removedKeys) {
          const key = fullKey.replace(LocalStorageManager.CACHE_PREFIX, '');
          delete metadata[key];
        }
        
        await AsyncStorage.setItem(LocalStorageManager.METADATA_KEY, JSON.stringify(metadata));
      }
    } catch (error) {
      // console.warn('Failed to cleanup metadata:', error);
    }
  }

  // ===== OFFLINE-SPECIFIC METHODS =====

  /**
   * Store data for offline persistence (never expires automatically)
   */
  async setOffline(key: string, data: any): Promise<void> {
    try {
      const compressedData = this.compressData(data);
      const offlineData = {
        data: compressedData,
        timestamp: Date.now(),
        offline: true,
        size: JSON.stringify(compressedData).length
      };

      const fullKey = this.getOfflineKey(key);
      await AsyncStorage.setItem(fullKey, JSON.stringify(offlineData));
      await this.updateOfflineMetadata(key, offlineData);
      
      // Check storage quota and cleanup if needed
      await this.enforceStorageQuota();
    } catch (error) {
      // console.error('LocalStorageManager.setOffline error:', error);
      throw new Error(`Failed to store offline data for key: ${key}`);
    }
  }

  /**
   * Get data from offline storage
   */
  async getOffline(key: string): Promise<any | null> {
    try {
      const fullKey = this.getOfflineKey(key);
      const value = await AsyncStorage.getItem(fullKey);
      
      if (!value) {
        return null;
      }

      const offlineData = JSON.parse(value);
      return this.decompressData(offlineData.data);
    } catch (error) {
      // console.error('LocalStorageManager.getOffline error:', error);
      return null;
    }
  }

  /**
   * Get all offline keys with their timestamps (for LRU eviction)
   */
  async getOfflineKeys(): Promise<{key: string, timestamp: number, size: number}[]> {
    try {
      const metadataStr = await AsyncStorage.getItem(LocalStorageManager.OFFLINE_METADATA_KEY);
      if (!metadataStr) return [];
      
      const metadata = JSON.parse(metadataStr);
      return Object.entries(metadata).map(([key, data]: [string, any]) => ({
        key,
        timestamp: data.timestamp,
        size: data.size || 0
      }));
    } catch (error) {
      // console.error('LocalStorageManager.getOfflineKeys error:', error);
      return [];
    }
  }

  /**
   * Get total storage usage
   */
  async getStorageUsage(): Promise<{
    totalSize: number;
    offlineSize: number;
    cacheSize: number;
    isNearLimit: boolean;
  }> {
    try {
      let totalSize = 0;
      let offlineSize = 0;
      let cacheSize = 0;

      // Get all keys
      const allKeys = await AsyncStorage.getAllKeys();
      
      for (const key of allKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            const size = value.length;
            totalSize += size;
            
            if (key.startsWith(LocalStorageManager.OFFLINE_PREFIX)) {
              offlineSize += size;
            } else if (key.startsWith(LocalStorageManager.CACHE_PREFIX)) {
              cacheSize += size;
            }
          }
        } catch (error) {
          // Skip corrupted entries
        }
      }

      return {
        totalSize,
        offlineSize,
        cacheSize,
        isNearLimit: totalSize > (LocalStorageManager.MAX_STORAGE_SIZE * 0.8) // 80% threshold
      };
    } catch (error) {
      // console.error('LocalStorageManager.getStorageUsage error:', error);
      return {
        totalSize: 0,
        offlineSize: 0,
        cacheSize: 0,
        isNearLimit: false
      };
    }
  }

  /**
   * Enforce storage quota using LRU eviction
   */
  async enforceStorageQuota(): Promise<number> {
    try {
      const usage = await this.getStorageUsage();
      
      if (usage.totalSize <= LocalStorageManager.MAX_STORAGE_SIZE) {
        return 0; // No cleanup needed
      }

      // Get offline keys sorted by timestamp (oldest first)
      const offlineKeys = await this.getOfflineKeys();
      offlineKeys.sort((a, b) => a.timestamp - b.timestamp);

      let removedCount = 0;
      let freedSize = 0;
      const targetSize = LocalStorageManager.MAX_STORAGE_SIZE * 0.7; // Clean to 70%

      for (const keyInfo of offlineKeys) {
        if (usage.totalSize - freedSize <= targetSize) {
          break;
        }

        try {
          await this.deleteOffline(keyInfo.key);
          removedCount++;
          freedSize += keyInfo.size;
        } catch (error) {
          // console.warn(`Failed to remove offline key ${keyInfo.key}:`, error);
        }
      }

      return removedCount;
    } catch (error) {
      // console.error('LocalStorageManager.enforceStorageQuota error:', error);
      return 0;
    }
  }

  /**
   * Delete offline data
   */
  async deleteOffline(key: string): Promise<boolean> {
    try {
      const fullKey = this.getOfflineKey(key);
      await AsyncStorage.removeItem(fullKey);
      await this.removeFromOfflineMetadata(key);
      return true;
    } catch (error) {
      // console.error('LocalStorageManager.deleteOffline error:', error);
      return false;
    }
  }

  /**
   * Clear all offline data
   */
  async clearOffline(): Promise<void> {
    try {
      const keys = await this.getAllOfflineKeys();
      if (keys.length > 0) {
        await AsyncStorage.multiRemove(keys);
      }
      await AsyncStorage.removeItem(LocalStorageManager.OFFLINE_METADATA_KEY);
    } catch (error) {
      // console.error('LocalStorageManager.clearOffline error:', error);
      throw new Error('Failed to clear offline cache');
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Compress data for storage optimization
   */
  private compressData(data: any): any {
    if (Array.isArray(data)) {
      // For tournaments and matches, remove or minimize non-essential fields
      return data.map(item => {
        if (item.No && item.Name) {
          // Tournament data optimization
          return {
            No: item.No,
            Name: item.Name,
            Code: item.Code,
            StartDate: item.StartDate,
            EndDate: item.EndDate,
            Location: item.Location,
            Status: item.Status
          };
        } else if (item.No && item.TeamAName) {
          // Match data optimization
          return {
            No: item.No,
            NoInTournament: item.NoInTournament,
            TeamAName: item.TeamAName,
            TeamBName: item.TeamBName,
            LocalDate: item.LocalDate,
            LocalTime: item.LocalTime,
            Status: item.Status,
            Court: item.Court,
            MatchPointsA: item.MatchPointsA,
            MatchPointsB: item.MatchPointsB
          };
        }
        return item; // Return as-is if not recognized format
      });
    }
    return data; // Return as-is if not array
  }

  /**
   * Decompress data from storage
   */
  private decompressData(data: any): any {
    return data; // For now, just return as-is since we're only removing fields
  }

  /**
   * Get full offline key with prefix
   */
  private getOfflineKey(key: string): string {
    return LocalStorageManager.OFFLINE_PREFIX + key;
  }

  /**
   * Get all offline cache keys
   */
  private async getAllOfflineKeys(): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      return allKeys.filter(key => key.startsWith(LocalStorageManager.OFFLINE_PREFIX));
    } catch (error) {
      // console.error('LocalStorageManager.getAllOfflineKeys error:', error);
      return [];
    }
  }

  /**
   * Update offline metadata for tracking
   */
  private async updateOfflineMetadata(key: string, offlineData: any): Promise<void> {
    try {
      const metadataStr = await AsyncStorage.getItem(LocalStorageManager.OFFLINE_METADATA_KEY);
      const metadata = metadataStr ? JSON.parse(metadataStr) : {};
      
      metadata[key] = {
        timestamp: offlineData.timestamp,
        size: offlineData.size,
        offline: true
      };

      await AsyncStorage.setItem(LocalStorageManager.OFFLINE_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      // console.warn('Failed to update offline metadata:', error);
    }
  }

  /**
   * Remove key from offline metadata
   */
  private async removeFromOfflineMetadata(key: string): Promise<void> {
    try {
      const metadataStr = await AsyncStorage.getItem(LocalStorageManager.OFFLINE_METADATA_KEY);
      if (metadataStr) {
        const metadata = JSON.parse(metadataStr);
        delete metadata[key];
        await AsyncStorage.setItem(LocalStorageManager.OFFLINE_METADATA_KEY, JSON.stringify(metadata));
      }
    } catch (error) {
      // console.warn('Failed to remove from offline metadata:', error);
    }
  }
}