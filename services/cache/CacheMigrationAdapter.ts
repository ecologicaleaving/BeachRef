/**
 * Cache Migration Adapter
 * Provides backward compatibility while transitioning to UnifiedCacheManager
 * Allows gradual migration of existing LocalStorageManager and TournamentStorageService usage
 */

import { Tournament } from '../../types/tournament';
import { TournamentRefereeData } from '../../types/referee-v2';
import { CachedData } from '../../types/cache';
import { UnifiedCacheManager, CacheOperationResult } from './UnifiedCacheManager';
import { CacheStrategies } from './CacheStrategy';

export interface UserPreferences {
  selectedCourt?: string;
  notificationsEnabled: boolean;
  lastAppVersion?: string;
  onboardingCompleted: boolean;
}

/**
 * Adapter for LocalStorageManager compatibility
 * Maintains the same interface but uses UnifiedCacheManager internally
 */
export class LocalStorageManagerAdapter {
  private cacheManager = UnifiedCacheManager.getInstance();

  constructor(private maxAgeDays: number = 7) {}

  /**
   * Get item from cache (LocalStorageManager compatible)
   */
  async get(key: string): Promise<CachedData | null> {
    const result = await this.cacheManager.get<any>('general', key);

    if (!result.success || result.data === undefined) {
      return null;
    }

    // Transform to LocalStorageManager format
    return {
      data: result.data,
      timestamp: Date.now(), // Approximate - real timestamp stored internally
      ttl: CacheStrategies.GENERAL.ttl
    };
  }

  /**
   * Set item in cache (LocalStorageManager compatible)
   */
  async set(key: string, data: any, ttl: number): Promise<void> {
    const result = await this.cacheManager.set('general', key, data);

    if (!result.success) {
      throw new Error(result.error || 'Failed to store data');
    }
  }

  /**
   * Delete item from cache
   */
  async delete(key: string): Promise<boolean> {
    const result = await this.cacheManager.delete('general', key);
    return result.success;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    const result = await this.cacheManager.clearNamespace('general');

    if (!result.success) {
      throw new Error('Failed to clear cache');
    }
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    const stats = await this.cacheManager.getStats();

    return {
      totalKeys: stats.strategyCounts['general'] || 0,
      totalSizeBytes: stats.totalSizeBytes,
      expiredKeys: stats.expiredKeys,
      oldestEntry: stats.oldestEntry,
      newestEntry: stats.newestEntry
    };
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<number> {
    return await this.cacheManager.cleanup();
  }

  /**
   * Get keys matching a pattern (simplified implementation)
   */
  async getKeysByPattern(pattern: string): Promise<string[]> {
    // This is a simplified implementation - the full pattern matching
    // would require additional metadata tracking
    return [];
  }

  // Offline storage methods - delegate to offline namespace

  async setOffline(key: string, data: any): Promise<void> {
    const result = await this.cacheManager.set('offline', key, data);

    if (!result.success) {
      throw new Error(result.error || 'Failed to store offline data');
    }
  }

  async getOffline(key: string): Promise<any | null> {
    const result = await this.cacheManager.get('offline', key);
    return result.success ? result.data : null;
  }

  async deleteOffline(key: string): Promise<boolean> {
    const result = await this.cacheManager.delete('offline', key);
    return result.success;
  }

  async clearOffline(): Promise<void> {
    const result = await this.cacheManager.clearNamespace('offline');

    if (!result.success) {
      throw new Error('Failed to clear offline cache');
    }
  }
}

/**
 * Adapter for TournamentStorageService compatibility
 * Maintains the same interface but uses UnifiedCacheManager internally
 */
export class TournamentStorageServiceAdapter {
  private cacheManager = UnifiedCacheManager.getInstance();

  // Tournament selection methods - use user preferences namespace

  static async saveSelectedTournament(tournament: Tournament): Promise<void> {
    const cacheManager = UnifiedCacheManager.getInstance();
    const result = await cacheManager.set('user_prefs', 'selected_tournament', tournament);

    if (!result.success) {
      throw new Error('Failed to save tournament selection');
    }
  }

  static async getSelectedTournament(): Promise<Tournament | null> {
    const cacheManager = UnifiedCacheManager.getInstance();
    const result = await cacheManager.get<Tournament>('user_prefs', 'selected_tournament');

    return result.success ? result.data || null : null;
  }

  static async clearSelectedTournament(): Promise<void> {
    const cacheManager = UnifiedCacheManager.getInstance();
    const result = await cacheManager.delete('user_prefs', 'selected_tournament');

    if (!result.success) {
      throw new Error('Failed to clear tournament selection');
    }
  }

  static async hasSelectedTournament(): Promise<boolean> {
    const tournament = await this.getSelectedTournament();
    return tournament !== null;
  }

  // User preferences methods

  static async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    const cacheManager = UnifiedCacheManager.getInstance();
    const result = await cacheManager.set('user_prefs', 'preferences', preferences);

    if (!result.success) {
      throw new Error('Failed to save user preferences');
    }
  }

  static async getUserPreferences(): Promise<UserPreferences> {
    const cacheManager = UnifiedCacheManager.getInstance();
    const result = await cacheManager.get<UserPreferences>('user_prefs', 'preferences');

    if (result.success && result.data) {
      return result.data;
    }

    // Return defaults
    return {
      notificationsEnabled: true,
      onboardingCompleted: false,
    };
  }

  static async updatePreference<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): Promise<void> {
    const preferences = await this.getUserPreferences();
    preferences[key] = value;
    await this.saveUserPreferences(preferences);
  }

  // Court preferences

  static async saveCourtPreference(tournamentNo: string, court: string): Promise<void> {
    const cacheManager = UnifiedCacheManager.getInstance();
    const result = await cacheManager.set('user_prefs', `court_${tournamentNo}`, court);

    if (!result.success) {
      throw new Error('Failed to save court preference');
    }
  }

  static async getCourtPreference(tournamentNo: string): Promise<string | null> {
    const cacheManager = UnifiedCacheManager.getInstance();
    const result = await cacheManager.get<string>('user_prefs', `court_${tournamentNo}`);

    return result.success ? result.data || null : null;
  }

  // Navigation state

  static async getNavigationState(): Promise<'selection' | 'dashboard'> {
    const hasSelectedTournament = await this.hasSelectedTournament();
    return hasSelectedTournament ? 'dashboard' : 'selection';
  }

  // Tournament details cache

  static async cacheTournamentDetails(tournamentNo: string, tournament: Tournament): Promise<void> {
    const cacheManager = UnifiedCacheManager.getInstance();
    const result = await cacheManager.set('tournament_details', tournamentNo, tournament);

    if (!result.success) {
      console.warn('Failed to cache tournament details:', result.error);
    }
  }

  static async getCachedTournamentDetails(tournamentNo: string): Promise<Tournament | null> {
    const cacheManager = UnifiedCacheManager.getInstance();
    const result = await cacheManager.get<Tournament>('tournament_details', tournamentNo);

    return result.success ? result.data || null : null;
  }

  // Referee data cache

  static async cacheRefereeData(tournamentNo: string, refereeData: TournamentRefereeData): Promise<void> {
    const cacheManager = UnifiedCacheManager.getInstance();
    const result = await cacheManager.set('referee_data', tournamentNo, refereeData);

    if (!result.success) {
      console.error('Failed to cache referee data:', result.error);
    }
  }

  static async getCachedRefereeData(tournamentNo: string): Promise<TournamentRefereeData | null> {
    const cacheManager = UnifiedCacheManager.getInstance();
    const result = await cacheManager.get<TournamentRefereeData>('referee_data', tournamentNo);

    return result.success ? result.data || null : null;
  }

  // Cleanup methods

  static async clearExpiredTournamentCaches(): Promise<void> {
    const cacheManager = UnifiedCacheManager.getInstance();
    await cacheManager.cleanup(); // This cleans up expired entries across all namespaces
  }

  static async clearExpiredRefereeCaches(): Promise<void> {
    const cacheManager = UnifiedCacheManager.getInstance();
    await cacheManager.cleanup();
  }

  static async clearRefereeDataCache(tournamentNo: string): Promise<void> {
    const cacheManager = UnifiedCacheManager.getInstance();
    await cacheManager.delete('referee_data', tournamentNo);
  }

  static async clearAllData(): Promise<void> {
    const cacheManager = UnifiedCacheManager.getInstance();

    // Clear all namespaces used by tournament storage
    await Promise.all([
      cacheManager.clearNamespace('user_prefs'),
      cacheManager.clearNamespace('tournament_details'),
      cacheManager.clearNamespace('referee_data')
    ]);
  }

  // Helper methods

  static async isNewUser(): Promise<boolean> {
    const hasSelectedTournament = await this.hasSelectedTournament();
    const preferences = await this.getUserPreferences();

    return !hasSelectedTournament && !preferences.onboardingCompleted;
  }

  static async completeOnboarding(): Promise<void> {
    await this.updatePreference('onboardingCompleted', true);
  }
}

// Export instances for backward compatibility
export const localStorageManager = new LocalStorageManagerAdapter();
export { TournamentStorageServiceAdapter as TournamentStorageService };