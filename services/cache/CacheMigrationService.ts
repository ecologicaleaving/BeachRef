/**
 * Cache Migration Service
 *
 * Clears old cache entries that don't include year in the key.
 * Fixes the João Pessoa/Nayarit bug where matches from 2013 appear in 2025 tournaments.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MmkvStorage, cacheMmkvStorage } from './MmkvStorage';
import { UnifiedCacheManager } from './UnifiedCacheManager';

export class CacheMigrationService {
  private static readonly MIGRATION_VERSION_KEY = '@CacheMigrationVersion';
  private static readonly CURRENT_VERSION = '7'; // v7: Force cache clear after parser fix — cached matches had wrong dates from new Date() fallback

  /**
   * Check if migration is needed and execute if so
   */
  static async checkAndMigrate(): Promise<void> {
    try {
      const currentVersion = await AsyncStorage.getItem(this.MIGRATION_VERSION_KEY);

      if (currentVersion !== this.CURRENT_VERSION) {
        console.log('🔄 Starting cache migration...');
        await this.migrate();
        await AsyncStorage.setItem(this.MIGRATION_VERSION_KEY, this.CURRENT_VERSION);
        console.log('✅ Cache migration complete');
      }
    } catch (error) {
      console.error('❌ Cache migration failed:', error);
    }
  }

  /**
   * Execute migration steps
   */
  private static async migrate(): Promise<void> {
    // Step 1: Clear old tournament_matches cache (pre-year-key format)
    await this.clearOldTournamentMatchesCache();

    // Step 2: Clear MMKV tournament matches cache
    await this.clearMmkvTournamentMatchesCache();

    // Step 3: Clear all expired cache entries
    await this.clearExpiredCacheEntries();
  }

  /**
   * Clear old tournament matches cache that doesn't include year in key
   */
  private static async clearOldTournamentMatchesCache(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();

      // Find all keys matching old format: vis:tournament_matches:matches_{tournamentNo}
      // But NOT matching new format: vis:tournament_matches:matches_{tournamentNo}_{year}
      const oldMatchKeys = allKeys.filter(key => {
        if (!key.startsWith('vis:tournament_matches:matches_')) {
          return false;
        }

        // Extract the part after 'matches_'
        const suffix = key.replace('vis:tournament_matches:matches_', '');

        // New format has year (4 digits) at the end: matches_1234_2025
        // Old format doesn't: matches_1234
        const hasYear = /_\d{4}$/.test(suffix);

        return !hasYear; // Return old keys (without year)
      });

      if (oldMatchKeys.length > 0) {
        console.log(`🗑️ Removing ${oldMatchKeys.length} old tournament match cache entries...`);
        await AsyncStorage.multiRemove(oldMatchKeys);
        console.log('✅ Old tournament match cache cleared');
      }
    } catch (error) {
      console.error('Failed to clear old tournament matches cache:', error);
    }
  }

  /**
   * Clear MMKV tournament matches cache
   */
  private static async clearMmkvTournamentMatchesCache(): Promise<void> {
    try {
      const mmkvStorage = cacheMmkvStorage;

      // Get all keys from MMKV
      const allKeys = await mmkvStorage.getAllKeys();

      // Find tournament match keys
      const matchKeys = allKeys.filter(key =>
        key.includes('tournament_matches') || key.includes('matches_')
      );

      if (matchKeys.length > 0) {
        console.log(`🗑️ Removing ${matchKeys.length} MMKV tournament match cache entries...`);
        for (const key of matchKeys) {
          await mmkvStorage.removeItem(key);
        }
        console.log('✅ MMKV tournament match cache cleared');
      }
    } catch (error) {
      console.error('Failed to clear MMKV cache:', error);
    }
  }

  /**
   * Clear all expired cache entries from both AsyncStorage and MMKV
   */
  private static async clearExpiredCacheEntries(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const expiredKeys: string[] = [];

      for (const key of allKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (!value) continue;

          const entry = JSON.parse(value);

          // Check if has expiration and is expired
          if (entry.expiresAt) {
            const expirationDate = new Date(entry.expiresAt);
            if (expirationDate < new Date()) {
              expiredKeys.push(key);
            }
          }
        } catch {
          // Skip invalid JSON entries
        }
      }

      if (expiredKeys.length > 0) {
        console.log(`🗑️ Removing ${expiredKeys.length} expired cache entries...`);
        await AsyncStorage.multiRemove(expiredKeys);
        console.log('✅ Expired cache entries cleared');
      }
    } catch (error) {
      console.error('Failed to clear expired cache entries:', error);
    }
  }

  /**
   * Force clear ALL tournament-related cache (use with caution)
   * This is for manual cache clearing from settings/debug screen
   */
  static async forceClearAllTournamentCache(): Promise<void> {
    try {
      console.log('🗑️ Force clearing ALL tournament cache...');

      // Clear AsyncStorage tournament caches
      const cacheManager = UnifiedCacheManager.getInstance();
      await cacheManager.clearNamespace('tournament_matches');
      await cacheManager.clearNamespace('tournaments');

      // Clear MMKV tournament caches
      const mmkvStorage = cacheMmkvStorage;
      const allKeys = await mmkvStorage.getAllKeys();
      const tournamentKeys = allKeys.filter(key =>
        key.includes('tournament') || key.includes('match')
      );

      for (const key of tournamentKeys) {
        await mmkvStorage.removeItem(key);
      }

      console.log('✅ All tournament cache cleared');
    } catch (error) {
      console.error('❌ Failed to force clear tournament cache:', error);
      throw error;
    }
  }
}
