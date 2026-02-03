/**
 * Cache Debug Utilities
 *
 * Utility functions for debugging and manually clearing cache.
 * Useful for development and troubleshooting cache issues.
 */

import { CacheMigrationService } from '../services/cache/CacheMigrationService';
import { UnifiedCacheManager } from '../services/cache/UnifiedCacheManager';
import { cacheMmkvStorage } from '../services/cache/MmkvStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class CacheDebugUtils {
  /**
   * Get cache statistics for debugging
   */
  static async getCacheStats(): Promise<{
    asyncStorageKeys: number;
    asyncStorageTournamentKeys: number;
    mmkvKeys: number;
    mmkvTournamentKeys: number;
    totalSize: string;
  }> {
    try {
      const asyncKeys = await AsyncStorage.getAllKeys();
      const asyncTournamentKeys = asyncKeys.filter(key =>
        key.includes('tournament') || key.includes('match')
      );

      const mmkvKeys = await cacheMmkvStorage.getAllKeys();
      const mmkvTournamentKeys = mmkvKeys.filter(key =>
        key.includes('tournament') || key.includes('match')
      );

      // Estimate size (rough approximation)
      let totalSize = 0;
      for (const key of asyncKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }

      return {
        asyncStorageKeys: asyncKeys.length,
        asyncStorageTournamentKeys: asyncTournamentKeys.length,
        mmkvKeys: mmkvKeys.length,
        mmkvTournamentKeys: mmkvTournamentKeys.length,
        totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      throw error;
    }
  }

  /**
   * List all tournament cache keys (for debugging)
   */
  static async listTournamentCacheKeys(): Promise<{
    asyncStorageKeys: string[];
    mmkvKeys: string[];
  }> {
    try {
      const asyncKeys = await AsyncStorage.getAllKeys();
      const asyncTournamentKeys = asyncKeys.filter(key =>
        key.includes('tournament') || key.includes('match')
      );

      const mmkvKeys = await cacheMmkvStorage.getAllKeys();
      const mmkvTournamentKeys = mmkvKeys.filter(key =>
        key.includes('tournament') || key.includes('match')
      );

      return {
        asyncStorageKeys: asyncTournamentKeys,
        mmkvKeys: mmkvTournamentKeys,
      };
    } catch (error) {
      console.error('Failed to list cache keys:', error);
      throw error;
    }
  }

  /**
   * Force clear ALL cache (AsyncStorage + MMKV)
   * WARNING: This clears EVERYTHING, use with caution!
   */
  static async forceClearAllCache(): Promise<void> {
    try {
      console.log('🗑️ FORCE CLEARING ALL CACHE (AsyncStorage + MMKV)...');

      // Clear AsyncStorage
      const asyncKeys = await AsyncStorage.getAllKeys();
      if (asyncKeys.length > 0) {
        await AsyncStorage.multiRemove(asyncKeys);
        console.log(`✅ Cleared ${asyncKeys.length} AsyncStorage keys`);
      }

      // Clear MMKV
      const mmkvKeys = await cacheMmkvStorage.getAllKeys();
      for (const key of mmkvKeys) {
        await cacheMmkvStorage.removeItem(key);
      }
      console.log(`✅ Cleared ${mmkvKeys.length} MMKV keys`);

      console.log('✅ ALL CACHE CLEARED');
    } catch (error) {
      console.error('❌ Failed to force clear all cache:', error);
      throw error;
    }
  }

  /**
   * Force clear only tournament-related cache
   */
  static async forceClearTournamentCache(): Promise<void> {
    await CacheMigrationService.forceClearAllTournamentCache();
  }

  /**
   * Run cache migration manually (for testing)
   */
  static async runCacheMigration(): Promise<void> {
    await CacheMigrationService.checkAndMigrate();
  }

  /**
   * Print cache debug info to console
   */
  static async printCacheDebugInfo(): Promise<void> {
    try {
      console.log('\n=== CACHE DEBUG INFO ===');

      const stats = await this.getCacheStats();
      console.log('Cache Statistics:');
      console.log(`  AsyncStorage Keys: ${stats.asyncStorageKeys}`);
      console.log(`  AsyncStorage Tournament Keys: ${stats.asyncStorageTournamentKeys}`);
      console.log(`  MMKV Keys: ${stats.mmkvKeys}`);
      console.log(`  MMKV Tournament Keys: ${stats.mmkvTournamentKeys}`);
      console.log(`  Total Size: ${stats.totalSize}`);

      const keys = await this.listTournamentCacheKeys();
      console.log('\nAsyncStorage Tournament Keys:');
      keys.asyncStorageKeys.forEach(key => console.log(`  - ${key}`));

      console.log('\nMMKV Tournament Keys:');
      keys.mmkvKeys.forEach(key => console.log(`  - ${key}`));

      console.log('======================\n');
    } catch (error) {
      console.error('Failed to print cache debug info:', error);
    }
  }
}

// Export convenience functions for use in console/debugger
if (__DEV__) {
  (global as any).cacheDebug = {
    stats: () => CacheDebugUtils.getCacheStats(),
    list: () => CacheDebugUtils.listTournamentCacheKeys(),
    print: () => CacheDebugUtils.printCacheDebugInfo(),
    clearAll: () => CacheDebugUtils.forceClearAllCache(),
    clearTournament: () => CacheDebugUtils.forceClearTournamentCache(),
    migrate: () => CacheDebugUtils.runCacheMigration(),
  };

  console.log('💡 Cache debug utilities available at: global.cacheDebug');
  console.log('   - cacheDebug.stats() - Get cache statistics');
  console.log('   - cacheDebug.list() - List all cache keys');
  console.log('   - cacheDebug.print() - Print cache debug info');
  console.log('   - cacheDebug.clearAll() - Clear ALL cache');
  console.log('   - cacheDebug.clearTournament() - Clear tournament cache');
  console.log('   - cacheDebug.migrate() - Run cache migration');
}
