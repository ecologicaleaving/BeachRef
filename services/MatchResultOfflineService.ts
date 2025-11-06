/**
 * Match Result Offline Service
 * Story 2.2: Match Result Card Optimization
 * 
 * Offline result caching with sync when connection restored
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo/netinfo';
import { EnhancedMatchResult, OfflineCacheEntry } from '../types/MatchResults';
import { getOfflineCacheKey, createOfflineCacheEntry } from '../utils/matchResults';

export interface OfflineServiceConfig {
  maxRetryAttempts: number;
  retryDelayMs: number;
  cacheExpiryHours: number;
  autoSyncEnabled: boolean;
}

export interface OfflineSyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: {
    matchId: string;
    error: string;
  }[];
}

class MatchResultOfflineService {
  private static instance: MatchResultOfflineService;
  private config: OfflineServiceConfig;
  private syncInProgress: boolean = false;
  private syncListeners: ((result: OfflineSyncResult) => void)[] = [];
  private isOnline: boolean = true;
  private netInfoUnsubscribe?: () => void;

  private constructor() {
    this.config = {
      maxRetryAttempts: 3,
      retryDelayMs: 5000,
      cacheExpiryHours: 24,
      autoSyncEnabled: true,
    };

    this.initializeNetworkListener();
  }

  public static getInstance(): MatchResultOfflineService {
    if (!MatchResultOfflineService.instance) {
      MatchResultOfflineService.instance = new MatchResultOfflineService();
    }
    return MatchResultOfflineService.instance;
  }

  /**
   * Initialize network connection listener
   */
  private initializeNetworkListener(): void {
    this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // If we just came online and auto-sync is enabled, sync pending results
      if (wasOffline && this.isOnline && this.config.autoSyncEnabled) {
        this.syncPendingResults();
      }
    });
  }

  /**
   * Cache match result for offline use
   */
  public async cacheMatchResult(matchResult: EnhancedMatchResult): Promise<boolean> {
    try {
      const cacheKey = this.getCacheKey(matchResult.matchId);
      const cacheEntry = createOfflineCacheEntry(matchResult);
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
      
      // Add to pending sync queue if result is submitted
      if (matchResult.resultStatus === 'submitted') {
        await this.addToPendingSync(cacheEntry);
      }

      return true;
    } catch (error) {
      // console.error('Failed to cache match result:', error);
      return false;
    }
  }

  /**
   * Retrieve cached match result
   */
  public async getCachedMatchResult(matchId: string): Promise<EnhancedMatchResult | null> {
    try {
      const cacheKey = this.getCacheKey(matchId);
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) {
        return null;
      }

      const cacheEntry: OfflineCacheEntry = JSON.parse(cached);
      
      // Check if cache has expired
      const expiryTime = new Date(cacheEntry.timestamp);
      expiryTime.setHours(expiryTime.getHours() + this.config.cacheExpiryHours);
      
      if (new Date() > expiryTime) {
        await this.removeCachedResult(matchId);
        return null;
      }

      return cacheEntry.matchResult;
    } catch (error) {
      // console.error('Failed to get cached match result:', error);
      return null;
    }
  }

  /**
   * Get all cached match results
   */
  public async getAllCachedResults(): Promise<EnhancedMatchResult[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('match_result_'));
      
      if (cacheKeys.length === 0) {
        return [];
      }

      const cached = await AsyncStorage.multiGet(cacheKeys);
      const results: EnhancedMatchResult[] = [];

      for (const [key, value] of cached) {
        if (value) {
          try {
            const cacheEntry: OfflineCacheEntry = JSON.parse(value);
            
            // Check expiry
            const expiryTime = new Date(cacheEntry.timestamp);
            expiryTime.setHours(expiryTime.getHours() + this.config.cacheExpiryHours);
            
            if (new Date() <= expiryTime) {
              results.push(cacheEntry.matchResult);
            } else {
              // Remove expired entry
              const matchId = key.replace('match_result_', '');
              await this.removeCachedResult(matchId);
            }
          } catch (parseError) {
            // console.error('Failed to parse cached result:', parseError);
          }
        }
      }

      return results;
    } catch (error) {
      // console.error('Failed to get all cached results:', error);
      return [];
    }
  }

  /**
   * Remove cached match result
   */
  public async removeCachedResult(matchId: string): Promise<boolean> {
    try {
      const cacheKey = this.getCacheKey(matchId);
      await AsyncStorage.removeItem(cacheKey);
      await this.removeFromPendingSync(matchId);
      return true;
    } catch (error) {
      // console.error('Failed to remove cached result:', error);
      return false;
    }
  }

  /**
   * Add result to pending sync queue
   */
  private async addToPendingSync(cacheEntry: OfflineCacheEntry): Promise<void> {
    try {
      const pendingSync = await this.getPendingSyncQueue();
      const existing = pendingSync.findIndex(item => item.id === cacheEntry.id);
      
      if (existing >= 0) {
        pendingSync[existing] = cacheEntry;
      } else {
        pendingSync.push(cacheEntry);
      }

      await AsyncStorage.setItem('pending_sync_queue', JSON.stringify(pendingSync));
    } catch (error) {
      // console.error('Failed to add to pending sync:', error);
    }
  }

  /**
   * Remove result from pending sync queue
   */
  private async removeFromPendingSync(matchId: string): Promise<void> {
    try {
      const pendingSync = await this.getPendingSyncQueue();
      const filtered = pendingSync.filter(item => 
        !item.id.includes(matchId)
      );
      
      await AsyncStorage.setItem('pending_sync_queue', JSON.stringify(filtered));
    } catch (error) {
      // console.error('Failed to remove from pending sync:', error);
    }
  }

  /**
   * Get pending sync queue
   */
  public async getPendingSyncQueue(): Promise<OfflineCacheEntry[]> {
    try {
      const queue = await AsyncStorage.getItem('pending_sync_queue');
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      // console.error('Failed to get pending sync queue:', error);
      return [];
    }
  }

  /**
   * Get pending sync count
   */
  public async getPendingSyncCount(): Promise<number> {
    const queue = await this.getPendingSyncQueue();
    return queue.length;
  }

  /**
   * Check if there are pending results to sync
   */
  public async hasPendingSync(): Promise<boolean> {
    const count = await this.getPendingSyncCount();
    return count > 0;
  }

  /**
   * Sync all pending results
   */
  public async syncPendingResults(
    submitFunction?: (matchResult: EnhancedMatchResult) => Promise<boolean>
  ): Promise<OfflineSyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: [{ matchId: 'system', error: 'Sync already in progress' }]
      };
    }

    if (!this.isOnline) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: [{ matchId: 'system', error: 'No network connection' }]
      };
    }

    this.syncInProgress = true;
    const result: OfflineSyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: []
    };

    try {
      const pendingQueue = await this.getPendingSyncQueue();
      
      for (const cacheEntry of pendingQueue) {
        try {
          // Skip if max retries exceeded
          if (cacheEntry.attempts >= this.config.maxRetryAttempts) {
            result.failedCount++;
            result.errors.push({
              matchId: cacheEntry.matchResult.matchId,
              error: 'Max retry attempts exceeded'
            });
            continue;
          }

          // Update attempt count
          cacheEntry.attempts++;

          let syncSuccess = false;

          if (submitFunction) {
            // Use provided submit function
            syncSuccess = await submitFunction(cacheEntry.matchResult);
          } else {
            // Default sync implementation (would integrate with actual API)
            syncSuccess = await this.defaultSyncResult(cacheEntry.matchResult);
          }

          if (syncSuccess) {
            // Mark as synced and remove from pending queue
            const syncedResult = {
              ...cacheEntry.matchResult,
              resultStatus: 'synced' as const,
              isOffline: false,
              syncPending: false,
              lastModified: new Date(),
            };

            await this.cacheMatchResult(syncedResult);
            await this.removeFromPendingSync(cacheEntry.matchResult.matchId);
            result.syncedCount++;
          } else {
            // Update cache with increased attempt count
            await this.addToPendingSync(cacheEntry);
            result.failedCount++;
            result.errors.push({
              matchId: cacheEntry.matchResult.matchId,
              error: cacheEntry.lastError || 'Sync failed'
            });
          }

          // Add delay between sync attempts to avoid overwhelming server
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));

        } catch (error) {
          result.failedCount++;
          result.errors.push({
            matchId: cacheEntry.matchResult.matchId,
            error: error instanceof Error ? error.message : 'Unknown sync error'
          });
        }
      }

      result.success = result.failedCount === 0;

    } catch (error) {
      result.success = false;
      result.errors.push({
        matchId: 'system',
        error: error instanceof Error ? error.message : 'System sync error'
      });
    } finally {
      this.syncInProgress = false;
      this.notifySyncListeners(result);
    }

    return result;
  }

  /**
   * Default sync result implementation
   */
  private async defaultSyncResult(matchResult: EnhancedMatchResult): Promise<boolean> {
    // This would integrate with actual tournament API
    // For now, simulate network request
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate success/failure based on network conditions
    return this.isOnline && Math.random() > 0.1; // 90% success rate
  }

  /**
   * Clear all offline cache
   */
  public async clearAllCache(): Promise<boolean> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith('match_result_') || key === 'pending_sync_queue'
      );
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }

      return true;
    } catch (error) {
      // console.error('Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  public async getCacheStats(): Promise<{
    totalCached: number;
    pendingSync: number;
    cacheSize: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    try {
      const allResults = await this.getAllCachedResults();
      const pendingCount = await this.getPendingSyncCount();
      
      let oldestEntry: Date | null = null;
      let newestEntry: Date | null = null;
      
      if (allResults.length > 0) {
        const dates = allResults.map(result => new Date(result.lastModified));
        oldestEntry = new Date(Math.min(...dates.map(d => d.getTime())));
        newestEntry = new Date(Math.max(...dates.map(d => d.getTime())));
      }

      return {
        totalCached: allResults.length,
        pendingSync: pendingCount,
        cacheSize: JSON.stringify(allResults).length, // Rough size estimate
        oldestEntry,
        newestEntry,
      };
    } catch (error) {
      // console.error('Failed to get cache stats:', error);
      return {
        totalCached: 0,
        pendingSync: 0,
        cacheSize: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }
  }

  /**
   * Add sync listener
   */
  public addSyncListener(listener: (result: OfflineSyncResult) => void): void {
    this.syncListeners.push(listener);
  }

  /**
   * Remove sync listener
   */
  public removeSyncListener(listener: (result: OfflineSyncResult) => void): void {
    const index = this.syncListeners.indexOf(listener);
    if (index >= 0) {
      this.syncListeners.splice(index, 1);
    }
  }

  /**
   * Notify sync listeners
   */
  private notifySyncListeners(result: OfflineSyncResult): void {
    this.syncListeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        // console.error('Sync listener error:', error);
      }
    });
  }

  /**
   * Get cache key for match result
   */
  private getCacheKey(matchId: string): string {
    return getOfflineCacheKey(matchId);
  }

  /**
   * Update service configuration
   */
  public updateConfig(config: Partial<OfflineServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): OfflineServiceConfig {
    return { ...this.config };
  }

  /**
   * Get network status
   */
  public isNetworkOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Force network status check
   */
  public async checkNetworkStatus(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      this.isOnline = state.isConnected ?? false;
      return this.isOnline;
    } catch (error) {
      // console.error('Failed to check network status:', error);
      return false;
    }
  }

  /**
   * Cleanup service (call on app shutdown)
   */
  public cleanup(): void {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
    }
  }
}

export default MatchResultOfflineService;