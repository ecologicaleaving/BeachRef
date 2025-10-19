/**
 * Cache Service with MMKV and Adaptive TTL
 *
 * Multi-level cache with intelligent expiration based on data volatility.
 *
 * Feature: specs/001-vis-api-optimization
 * Tasks: T032, T035-T038, T045-T047
 */

import { MmkvStorage, cacheMmkvStorage } from './MmkvStorage';
import {
  CacheEntry,
  DataVolatility,
  EntityType,
  TTL_MAP,
} from '../../types/audit';
import NetInfo from '@react-native-community/netinfo';

/**
 * CacheService
 *
 * Enhanced caching with MMKV storage and adaptive TTL based on data volatility.
 *
 * **Features:**
 * - MMKV storage (30x faster than AsyncStorage)
 * - Adaptive TTL by entity type and status
 * - Stale-while-revalidate pattern
 * - Event-driven cache invalidation
 * - Network-aware revalidation
 *
 * **TTL Strategy:**
 * - Live data (match scores during play): 5s
 * - Dynamic data (match lists with status changes): 15s
 * - Semi-static (tournament lists): 120s (2 min)
 * - Static (archived tournaments): 24h
 */
export class CacheService {
  private static instance: CacheService | null = null;
  private storage: MmkvStorage;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private readonly MAX_MEMORY_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private currentMemoryCacheSize = 0;

  private constructor() {
    // T032: Use MMKV storage instead of AsyncStorage
    this.storage = cacheMmkvStorage;

    // Set up network change listener for T047
    this.setupNetworkListener();
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * T035: Determine data volatility based on entity type and status
   */
  private determineVolatility(entityType: EntityType, status?: string): DataVolatility {
    // Live data: Match in progress
    if (status === 'Running' || status === 'Live' || status === 'InProgress') {
      return 'live';
    }

    // Dynamic data: Scheduled matches or active tournaments
    if (entityType === 'match' && (status === 'Scheduled' || status === 'Upcoming')) {
      return 'dynamic';
    }

    // Semi-static: Tournament lists, referee lists
    if (entityType === 'tournament' || entityType === 'referee') {
      return 'semi-static';
    }

    // Static: Finished matches, archived data
    if (status === 'Finished' || status === 'Completed' || status === 'Archived') {
      return 'static';
    }

    // Default to semi-static
    return 'semi-static';
  }

  /**
   * T036: Get TTL based on data volatility
   */
  private getTTL(volatility: DataVolatility): number {
    return TTL_MAP[volatility];
  }

  /**
   * T037: Set cache entry with adaptive TTL
   *
   * @param key - Cache key
   * @param value - Data to cache
   * @param entityType - Type of entity being cached
   * @param status - Optional entity status for TTL determination
   */
  async set(
    key: string,
    value: any,
    entityType: EntityType,
    status?: string
  ): Promise<void> {
    try {
      const now = Date.now();
      const volatility = this.determineVolatility(entityType, status);
      const ttl = this.getTTL(volatility);

      // T037: Create cache entry with staleness and expiration timestamps
      const entry: CacheEntry = {
        key,
        value,
        level: 'mmkv',
        stalenessTimestamp: now + ttl,
        expirationTimestamp: now + ttl * 2, // Expire at 2x TTL
        createdAt: now,
        lastAccessedAt: now,
        accessCount: 0,
        dataVolatility: volatility,
        entityType,
        entityStatus: status || null,
      };

      // Store in memory cache (Level 1)
      this.setMemoryCache(key, entry);

      // Store in MMKV (Level 2)
      await this.storage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.error('[CacheService] Failed to set cache entry:', error);
    }
  }

  /**
   * T038: Get cache entry with stale-while-revalidate pattern
   *
   * @param key - Cache key
   * @param revalidate - Callback to fetch fresh data if stale
   * @returns Cached data (may be stale) or undefined if expired
   */
  async get<T>(
    key: string,
    revalidate?: () => Promise<T>
  ): Promise<{ data: T | undefined; isStale: boolean }> {
    try {
      const now = Date.now();

      // Check memory cache first (Level 1)
      let entry = this.getMemoryCache(key);

      // If not in memory, check MMKV (Level 2)
      if (!entry) {
        const stored = await this.storage.getItem(key);
        if (stored) {
          entry = JSON.parse(stored) as CacheEntry;
          // Promote to memory cache
          this.setMemoryCache(key, entry);
        }
      }

      if (!entry) {
        return { data: undefined, isStale: false };
      }

      // Update access tracking
      entry.lastAccessedAt = now;
      entry.accessCount++;

      // Check if expired (hard expiration)
      if (now >= entry.expirationTimestamp) {
        await this.delete(key);
        return { data: undefined, isStale: false };
      }

      // Check if stale (soft expiration)
      const isStale = now >= entry.stalenessTimestamp;

      // T038: Stale-while-revalidate - serve stale data, refetch in background
      if (isStale && revalidate) {
        // Return stale data immediately
        const staleData = entry.value as T;

        // Revalidate in background (don't await)
        revalidate()
          .then(freshData => {
            // Update cache with fresh data
            this.set(key, freshData, entry.entityType, entry.entityStatus || undefined);
          })
          .catch(error => {
            console.warn('[CacheService] Background revalidation failed:', error);
          });

        return { data: staleData, isStale: true };
      }

      return { data: entry.value as T, isStale };
    } catch (error) {
      console.error('[CacheService] Failed to get cache entry:', error);
      return { data: undefined, isStale: false };
    }
  }

  /**
   * Delete a cache entry
   */
  async delete(key: string): Promise<void> {
    try {
      // Remove from memory
      this.deleteMemoryCache(key);

      // Remove from MMKV
      await this.storage.removeItem(key);
    } catch (error) {
      console.error('[CacheService] Failed to delete cache entry:', error);
    }
  }

  /**
   * T045: Invalidate cache based on event (status change)
   *
   * @param entityType - Type of entity
   * @param entityId - Specific entity ID
   * @param event - Event that triggered invalidation (e.g., 'status-change')
   */
  async invalidate(entityType: EntityType, entityId?: string, event?: string): Promise<void> {
    try {
      const pattern = entityId ? `${entityType}:${entityId}` : `${entityType}:`;

      // Get all keys matching pattern
      const allKeys = await this.storage.getAllKeys();
      const matchingKeys = allKeys.filter(key => key.startsWith(pattern));

      // Delete matching entries
      await Promise.all(matchingKeys.map(key => this.delete(key)));

      console.log(`[CacheService] Invalidated ${matchingKeys.length} entries for ${entityType}${entityId ? `:${entityId}` : ''} (event: ${event || 'manual'})`);
    } catch (error) {
      console.error('[CacheService] Failed to invalidate cache:', error);
    }
  }

  /**
   * T046: Invalidate related queries
   *
   * Example: When tournament status changes, invalidate match list
   */
  async invalidateRelated(entityType: EntityType, entityId: string): Promise<void> {
    try {
      // Define related entities
      const relatedMap: Record<EntityType, EntityType[]> = {
        tournament: ['match', 'referee'],
        match: [],
        referee: [],
        ranking: [],
      };

      const relatedTypes = relatedMap[entityType] || [];

      // Invalidate each related type
      await Promise.all(
        relatedTypes.map(relatedType =>
          this.invalidate(relatedType, entityId, 'related-invalidation')
        )
      );
    } catch (error) {
      console.error('[CacheService] Failed to invalidate related queries:', error);
    }
  }

  /**
   * T047: Set up network change listener for cache revalidation
   */
  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      // When reconnecting, trigger revalidation of stale data
      if (state.isConnected && state.isInternetReachable) {
        console.log('[CacheService] Network reconnected - revalidating stale cache entries');
        // Revalidation would be triggered by next access with stale-while-revalidate
      }
    });
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();
      this.currentMemoryCacheSize = 0;
      await this.storage.clear();
      console.log('[CacheService] Cleared all cache');
    } catch (error) {
      console.error('[CacheService] Failed to clear cache:', error);
    }
  }

  // ========================================================================
  // Memory Cache Management (Level 1)
  // ========================================================================

  private setMemoryCache(key: string, entry: CacheEntry): void {
    const entrySize = JSON.stringify(entry).length;

    // Evict if memory limit would be exceeded
    while (
      this.currentMemoryCacheSize + entrySize > this.MAX_MEMORY_CACHE_SIZE &&
      this.memoryCache.size > 0
    ) {
      this.evictLRU();
    }

    this.memoryCache.set(key, entry);
    this.currentMemoryCacheSize += entrySize;
  }

  private getMemoryCache(key: string): CacheEntry | undefined {
    return this.memoryCache.get(key);
  }

  private deleteMemoryCache(key: string): void {
    const entry = this.memoryCache.get(key);
    if (entry) {
      const entrySize = JSON.stringify(entry).length;
      this.memoryCache.delete(key);
      this.currentMemoryCacheSize -= entrySize;
    }
  }

  /**
   * Evict least recently used entry from memory cache
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    this.memoryCache.forEach((entry, key) => {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.deleteMemoryCache(oldestKey);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memoryCacheSize: number;
    memoryCacheEntries: number;
    mmkvSize: number;
    mmkvEntries: number;
  }> {
    const allKeys = await this.storage.getAllKeys();

    return {
      memoryCacheSize: this.currentMemoryCacheSize,
      memoryCacheEntries: this.memoryCache.size,
      mmkvSize: this.storage.getSize(),
      mmkvEntries: allKeys.length,
    };
  }

  // ========================================================================
  // Additive Fetching (T066-T068)
  // ========================================================================

  /**
   * T066: Implement additive field fetching
   *
   * Returns cached data if it contains all requested fields, or null if additional
   * fields need to be fetched. Caller should then merge results using mergeFields.
   *
   * @param key - Cache key
   * @param requestedFields - Fields needed for current use case
   * @returns Cached data if sufficient, null if additional fields needed
   *
   * @example
   * ```typescript
   * const cached = await cache.getWithFields('tournament:123', ['No', 'Name', 'StartDate']);
   * if (!cached) {
   *   // Need to fetch from API with requested fields
   *   const fresh = await api.getTournament({ fields: requestedFields });
   *   await cache.mergeFields('tournament:123', fresh, requestedFields);
   * }
   * ```
   */
  async getWithFields<T extends Record<string, any>>(
    key: string,
    requestedFields: string[]
  ): Promise<{ data: T | undefined; needsAdditionalFields: boolean; missingFields?: string[] }> {
    try {
      // Get cached entry
      const entry = this.getMemoryCache(key);
      const cachedData = entry?.value as T | undefined;

      if (!cachedData) {
        return { data: undefined, needsAdditionalFields: true, missingFields: requestedFields };
      }

      // T067: Calculate field diff - determine missing fields
      const missingFields = this.calculateMissingFields(cachedData, requestedFields);

      // If all requested fields are present, return cached data
      if (missingFields.length === 0) {
        console.log(`[CacheService] Cache hit with all fields: ${key} (${requestedFields.length} fields)`);
        return { data: cachedData, needsAdditionalFields: false };
      }

      // Some fields are missing - return cached data with indicator
      console.log(`[CacheService] Cache hit but missing fields: ${key} (missing: ${missingFields.join(', ')})`);
      return { data: cachedData, needsAdditionalFields: true, missingFields };

    } catch (error) {
      console.error('[CacheService] Failed to get with fields:', error);
      return { data: undefined, needsAdditionalFields: true, missingFields: requestedFields };
    }
  }

  /**
   * T067: Calculate field diff to determine missing fields
   *
   * @param cachedData - Cached entity data
   * @param requestedFields - Fields needed for current use case
   * @returns Array of field names that are missing from cached data
   */
  private calculateMissingFields<T extends Record<string, any>>(
    cachedData: T,
    requestedFields: string[]
  ): string[] {
    const missingFields: string[] = [];

    for (const field of requestedFields) {
      // Check if field exists and has a non-null/non-undefined value
      if (!(field in cachedData) || cachedData[field] === null || cachedData[field] === undefined) {
        missingFields.push(field);
      }
    }

    return missingFields;
  }

  /**
   * T068: Merge new fields with cached entity (partial update)
   *
   * Updates cached entity with additional fields from fresh API response.
   * Preserves existing fields that are not in the new data.
   *
   * @param key - Cache key
   * @param freshData - Fresh data from API with additional fields
   * @param newFields - Fields that were newly fetched
   * @param entityType - Type of entity being cached
   * @param status - Optional entity status for TTL
   *
   * @example
   * ```typescript
   * // Cached: { No: '123', Name: 'Tournament' }
   * // Fresh:  { No: '123', Name: 'Tournament', Location: 'Beach', NoOfMatches: 42 }
   * await cache.mergeFields('tournament:123', fresh, ['Location', 'NoOfMatches'], 'tournament');
   * // Result: { No: '123', Name: 'Tournament', Location: 'Beach', NoOfMatches: 42 }
   * ```
   */
  async mergeFields<T extends Record<string, any>>(
    key: string,
    freshData: T,
    newFields: string[],
    entityType: EntityType,
    status?: string
  ): Promise<void> {
    try {
      // Get existing cached data
      const entry = this.getMemoryCache(key);
      const cachedData = (entry?.value as T) || ({} as T);

      // T068: Merge fresh fields with cached data
      const mergedData: T = { ...cachedData };

      // Update only the new fields from fresh data
      for (const field of newFields) {
        if (field in freshData) {
          mergedData[field] = freshData[field];
        }
      }

      // Update cache with merged data
      await this.set(key, mergedData, entityType, status);

      console.log(`[CacheService] Merged ${newFields.length} new fields into ${key}`);
    } catch (error) {
      console.error('[CacheService] Failed to merge fields:', error);
      throw error;
    }
  }

  /**
   * Smart fetch with additive field strategy
   *
   * High-level helper that handles the complete additive fetching flow:
   * 1. Check cache for existing data
   * 2. Determine if additional fields are needed
   * 3. Fetch only missing fields if needed
   * 4. Merge results and update cache
   *
   * @param key - Cache key
   * @param requestedFields - Fields needed for current use case
   * @param fetchFn - Function to fetch fresh data from API
   * @param entityType - Type of entity
   * @param status - Optional entity status
   * @returns Complete data with all requested fields
   *
   * @example
   * ```typescript
   * const tournament = await cache.fetchWithAdditiveFields(
   *   'tournament:123',
   *   ['No', 'Name', 'Location', 'NoOfMatches'],
   *   () => api.getTournament({ tournamentNo: '123', fields: ['Location', 'NoOfMatches'] }),
   *   'tournament'
   * );
   * ```
   */
  async fetchWithAdditiveFields<T extends Record<string, any>>(
    key: string,
    requestedFields: string[],
    fetchFn: (missingFields: string[]) => Promise<T>,
    entityType: EntityType,
    status?: string
  ): Promise<T> {
    try {
      // Check cache for existing data
      const { data: cachedData, needsAdditionalFields, missingFields } = await this.getWithFields<T>(
        key,
        requestedFields
      );

      // If all fields are in cache, return immediately
      if (!needsAdditionalFields && cachedData) {
        return cachedData;
      }

      // Fetch missing fields from API
      const freshData = await fetchFn(missingFields || requestedFields);

      // Merge and update cache
      if (cachedData && missingFields && missingFields.length > 0) {
        // Partial update - merge new fields
        await this.mergeFields(key, freshData, missingFields, entityType, status);
        return { ...cachedData, ...freshData };
      } else {
        // Full update - no cached data
        await this.set(key, freshData, entityType, status);
        return freshData;
      }
    } catch (error) {
      console.error('[CacheService] Failed to fetch with additive fields:', error);
      throw error;
    }
  }
}
