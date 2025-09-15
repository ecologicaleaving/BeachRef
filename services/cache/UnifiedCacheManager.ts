/**
 * Unified Cache Manager
 * Part of Service Layer Consolidation Refactoring
 * Consolidates LocalStorageManager, TournamentStorageService, and Assignment cache logic
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CacheStrategy,
  CacheEntry,
  CacheMetadata,
  CacheStrategies,
  CacheStrategyFactory
} from './CacheStrategy';

export interface CacheOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CacheStats {
  totalKeys: number;
  totalSizeBytes: number;
  expiredKeys: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
  strategyCounts: Record<string, number>;
}

/**
 * Unified Cache Manager
 * Replaces LocalStorageManager and TournamentStorageService caching logic
 */
export class UnifiedCacheManager {
  private static instance: UnifiedCacheManager | null = null;
  private static readonly METADATA_KEY = '@VisCacheMetadata';
  private static readonly MAX_TOTAL_SIZE = 5 * 1024 * 1024; // 5MB total limit

  private strategies = new Map<string, CacheStrategy>();

  private constructor() {
    // Register default strategies
    Object.values(CacheStrategies).forEach(strategy => {
      this.strategies.set(strategy.namespace, strategy);
    });
  }

  static getInstance(): UnifiedCacheManager {
    if (!UnifiedCacheManager.instance) {
      UnifiedCacheManager.instance = new UnifiedCacheManager();
    }
    return UnifiedCacheManager.instance;
  }

  /**
   * Register a custom cache strategy
   */
  registerStrategy(strategy: CacheStrategy): void {
    this.strategies.set(strategy.namespace, strategy);
  }

  /**
   * Get data from cache using strategy
   */
  async get<T>(namespace: string, key: string): Promise<CacheOperationResult<T>> {
    try {
      const strategy = this.strategies.get(namespace);
      if (!strategy) {
        return { success: false, error: `Unknown cache strategy: ${namespace}` };
      }

      const fullKey = this.buildKey(strategy, key);
      const cachedValue = await AsyncStorage.getItem(fullKey);

      if (!cachedValue) {
        return { success: true, data: undefined };
      }

      const entry: CacheEntry<T> = JSON.parse(cachedValue);

      // Check if expired
      if (this.isExpired(entry)) {
        await this.delete(namespace, key);
        return { success: true, data: undefined };
      }

      // Decompress if needed
      const data = strategy.compression ? this.decompress(entry.data) : entry.data;

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: `Cache get failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Set data in cache using strategy
   */
  async set<T>(namespace: string, key: string, data: T): Promise<CacheOperationResult<void>> {
    try {
      const strategy = this.strategies.get(namespace);
      if (!strategy) {
        return { success: false, error: `Unknown cache strategy: ${namespace}` };
      }

      // Compress if needed
      const processedData = strategy.compression ? this.compress(data) : data;

      const entry: CacheEntry<T> = {
        data: processedData,
        timestamp: Date.now(),
        ttl: strategy.ttl,
        namespace,
        size: JSON.stringify(processedData).length
      };

      const fullKey = this.buildKey(strategy, key);
      await AsyncStorage.setItem(fullKey, JSON.stringify(entry));
      await this.updateMetadata(namespace, entry);

      // Check storage limits
      await this.enforceStorageLimits();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Cache set failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Delete item from cache
   */
  async delete(namespace: string, key: string): Promise<CacheOperationResult<void>> {
    try {
      const strategy = this.strategies.get(namespace);
      if (!strategy) {
        return { success: false, error: `Unknown cache strategy: ${namespace}` };
      }

      const fullKey = this.buildKey(strategy, key);
      await AsyncStorage.removeItem(fullKey);
      await this.removeFromMetadata(namespace, key);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Cache delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Clear all cache entries for a namespace
   */
  async clearNamespace(namespace: string): Promise<CacheOperationResult<void>> {
    try {
      const strategy = this.strategies.get(namespace);
      if (!strategy) {
        return { success: false, error: `Unknown cache strategy: ${namespace}` };
      }

      const keys = await this.getKeysForNamespace(namespace);
      if (keys.length > 0) {
        await AsyncStorage.multiRemove(keys);
      }

      await this.clearNamespaceMetadata(namespace);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Cache clear failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith('@Vis'));

      let totalSize = 0;
      let expiredCount = 0;
      let oldestTime = Date.now();
      let newestTime = 0;
      const strategyCounts: Record<string, number> = {};

      for (const key of cacheKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            totalSize += value.length;

            // Try to parse as cache entry
            try {
              const entry: CacheEntry = JSON.parse(value);
              const namespace = entry.namespace || 'unknown';
              strategyCounts[namespace] = (strategyCounts[namespace] || 0) + 1;

              if (this.isExpired(entry)) {
                expiredCount++;
              }

              if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
              }
              if (entry.timestamp > newestTime) {
                newestTime = entry.timestamp;
              }
            } catch {
              // Not a cache entry, just count the size
            }
          }
        } catch {
          expiredCount++; // Count corrupted entries as expired
        }
      }

      return {
        totalKeys: cacheKeys.length,
        totalSizeBytes: totalSize,
        expiredKeys: expiredCount,
        oldestEntry: newestTime > 0 ? new Date(oldestTime) : null,
        newestEntry: newestTime > 0 ? new Date(newestTime) : null,
        strategyCounts
      };
    } catch (error) {
      return {
        totalKeys: 0,
        totalSizeBytes: 0,
        expiredKeys: 0,
        oldestEntry: null,
        newestEntry: null,
        strategyCounts: {}
      };
    }
  }

  /**
   * Clean up expired entries across all namespaces
   */
  async cleanup(): Promise<number> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith('@Vis'));
      const keysToRemove: string[] = [];

      for (const key of cacheKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            try {
              const entry: CacheEntry = JSON.parse(value);
              if (this.isExpired(entry)) {
                keysToRemove.push(key);
              }
            } catch {
              // Corrupted entry, remove it
              keysToRemove.push(key);
            }
          }
        } catch {
          keysToRemove.push(key);
        }
      }

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        await this.cleanupMetadata(keysToRemove);
      }

      return keysToRemove.length;
    } catch {
      return 0;
    }
  }

  // Private helper methods

  private buildKey(strategy: CacheStrategy, key: string): string {
    return `${strategy.prefix}${key}`;
  }

  private isExpired(entry: CacheEntry): boolean {
    if (entry.ttl === Infinity) return false;
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private compress(data: any): any {
    // For now, just return the data as-is
    // Could implement actual compression later if needed
    return data;
  }

  private decompress(data: any): any {
    // For now, just return the data as-is
    return data;
  }

  private async getKeysForNamespace(namespace: string): Promise<string[]> {
    const strategy = this.strategies.get(namespace);
    if (!strategy) return [];

    const allKeys = await AsyncStorage.getAllKeys();
    return allKeys.filter(key => key.startsWith(strategy.prefix));
  }

  private async updateMetadata(namespace: string, entry: CacheEntry): Promise<void> {
    try {
      const metadataStr = await AsyncStorage.getItem(UnifiedCacheManager.METADATA_KEY);
      const metadata: CacheMetadata = metadataStr ? JSON.parse(metadataStr) : {
        totalEntries: 0,
        totalSize: 0,
        lastCleanup: Date.now(),
        strategyCounts: {}
      };

      metadata.totalEntries += 1;
      metadata.totalSize += entry.size || 0;
      metadata.strategyCounts[namespace] = (metadata.strategyCounts[namespace] || 0) + 1;

      await AsyncStorage.setItem(UnifiedCacheManager.METADATA_KEY, JSON.stringify(metadata));
    } catch {
      // Metadata update failure is not critical
    }
  }

  private async removeFromMetadata(namespace: string, key: string): Promise<void> {
    // Implementation for metadata cleanup on remove
  }

  private async clearNamespaceMetadata(namespace: string): Promise<void> {
    // Implementation for namespace metadata cleanup
  }

  private async cleanupMetadata(removedKeys: string[]): Promise<void> {
    // Implementation for batch metadata cleanup
  }

  private async enforceStorageLimits(): Promise<void> {
    const stats = await this.getStats();
    if (stats.totalSizeBytes > UnifiedCacheManager.MAX_TOTAL_SIZE) {
      // Implement LRU eviction
      await this.cleanup();
    }
  }
}

// Export singleton instance for convenience
export const cacheManager = UnifiedCacheManager.getInstance();