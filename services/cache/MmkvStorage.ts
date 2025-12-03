/**
 * MMKV Storage Wrapper
 *
 * High-performance storage layer using react-native-mmkv (30x faster than AsyncStorage).
 * Provides AsyncStorage-compatible API for easy migration.
 *
 * Feature: specs/001-vis-api-optimization
 * Task: T031
 */

import { MMKV } from 'react-native-mmkv';
import { Platform } from 'react-native';

/**
 * MmkvStorage
 *
 * Wrapper for react-native-mmkv with AsyncStorage-compatible interface.
 *
 * **Performance Benefits:**
 * - 30x faster than AsyncStorage overall
 * - 500%+ faster reads
 * - 100%+ faster writes
 * - Memory-mapped for instant access
 * - Built-in encryption support (native platforms only)
 *
 * **Migration Path:**
 * ```typescript
 * // Before (AsyncStorage)
 * await AsyncStorage.setItem('key', 'value');
 * const value = await AsyncStorage.getItem('key');
 *
 * // After (MmkvStorage)
 * await mmkvStorage.setItem('key', 'value');
 * const value = await mmkvStorage.getItem('key');
 * ```
 */
export class MmkvStorage {
  private storage: MMKV;
  private namespace: string;

  constructor(namespace: string = 'default', encryptionKey?: string) {
    this.namespace = namespace;

    // MMKV encryption is only supported on native platforms (iOS/Android)
    // Web platform doesn't support encryption
    const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
    const key = encryptionKey || process.env.EXPO_PUBLIC_MMKV_KEY;

    this.storage = new MMKV({
      id: `beachref-${namespace}`,
      // Only use encryption key on native platforms
      ...(isNative && key ? { encryptionKey: key } : {}),
    });
  }

  /**
   * Store a value (AsyncStorage-compatible)
   *
   * @param key - Storage key
   * @param value - Value to store (will be JSON stringified)
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      this.storage.set(key, value);
    } catch (error) {
      console.error(`[MmkvStorage:${this.namespace}] Failed to set item:`, error);
      throw error;
    }
  }

  /**
   * Retrieve a value (AsyncStorage-compatible)
   *
   * @param key - Storage key
   * @returns Stored value or null if not found
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const value = this.storage.getString(key);
      return value ?? null;
    } catch (error) {
      console.error(`[MmkvStorage:${this.namespace}] Failed to get item:`, error);
      return null;
    }
  }

  /**
   * Remove a value (AsyncStorage-compatible)
   *
   * @param key - Storage key
   */
  async removeItem(key: string): Promise<void> {
    try {
      this.storage.delete(key);
    } catch (error) {
      console.error(`[MmkvStorage:${this.namespace}] Failed to remove item:`, error);
      throw error;
    }
  }

  /**
   * Get all keys (AsyncStorage-compatible)
   *
   * @returns Array of all keys in storage
   */
  async getAllKeys(): Promise<string[]> {
    try {
      return this.storage.getAllKeys();
    } catch (error) {
      console.error(`[MmkvStorage:${this.namespace}] Failed to get all keys:`, error);
      return [];
    }
  }

  /**
   * Clear all data (AsyncStorage-compatible)
   */
  async clear(): Promise<void> {
    try {
      this.storage.clearAll();
    } catch (error) {
      console.error(`[MmkvStorage:${this.namespace}] Failed to clear storage:`, error);
      throw error;
    }
  }

  /**
   * Get multiple items at once (AsyncStorage-compatible)
   *
   * @param keys - Array of keys to retrieve
   * @returns Array of [key, value] pairs
   */
  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    try {
      return keys.map(key => [key, this.storage.getString(key) ?? null]);
    } catch (error) {
      console.error(`[MmkvStorage:${this.namespace}] Failed to multiGet:`, error);
      return keys.map(key => [key, null]);
    }
  }

  /**
   * Set multiple items at once (AsyncStorage-compatible)
   *
   * @param keyValuePairs - Array of [key, value] pairs
   */
  async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    try {
      keyValuePairs.forEach(([key, value]) => {
        this.storage.set(key, value);
      });
    } catch (error) {
      console.error(`[MmkvStorage:${this.namespace}] Failed to multiSet:`, error);
      throw error;
    }
  }

  /**
   * Remove multiple items at once (AsyncStorage-compatible)
   *
   * @param keys - Array of keys to remove
   */
  async multiRemove(keys: string[]): Promise<void> {
    try {
      keys.forEach(key => {
        this.storage.delete(key);
      });
    } catch (error) {
      console.error(`[MmkvStorage:${this.namespace}] Failed to multiRemove:`, error);
      throw error;
    }
  }

  // ========================================================================
  // MMKV-specific methods (not in AsyncStorage API)
  // ========================================================================

  /**
   * Set a boolean value directly (MMKV native type)
   */
  setBoolean(key: string, value: boolean): void {
    this.storage.set(key, value);
  }

  /**
   * Get a boolean value directly (MMKV native type)
   */
  getBoolean(key: string): boolean | undefined {
    return this.storage.getBoolean(key);
  }

  /**
   * Set a number value directly (MMKV native type)
   */
  setNumber(key: string, value: number): void {
    this.storage.set(key, value);
  }

  /**
   * Get a number value directly (MMKV native type)
   */
  getNumber(key: string): number | undefined {
    return this.storage.getNumber(key);
  }

  /**
   * Check if a key exists
   */
  contains(key: string): boolean {
    return this.storage.contains(key);
  }

  /**
   * Get storage size in bytes (for monitoring)
   */
  getSize(): number {
    try {
      // Estimate size by serializing all data
      const keys = this.storage.getAllKeys();
      let totalSize = 0;

      keys.forEach(key => {
        const value = this.storage.getString(key);
        if (value) {
          totalSize += new Blob([value]).size;
        }
      });

      return totalSize;
    } catch (error) {
      console.error(`[MmkvStorage:${this.namespace}] Failed to get size:`, error);
      return 0;
    }
  }

  /**
   * Get namespace identifier
   */
  getNamespace(): string {
    return this.namespace;
  }

  /**
   * Get raw MMKV instance (for advanced use cases)
   */
  getRawStorage(): MMKV {
    return this.storage;
  }

  // ========================================================================
  // Domain-specific cache methods (specs/006-match-officials-display)
  // ========================================================================

  /**
   * Cache AuxiliaryPersons for an event
   *
   * Stores official data from GetEvent with 120s TTL.
   * Key format: `event:${eventNo}:auxiliaryPersons`
   *
   * @param eventNo Event number (tournament identifier)
   * @param auxiliaryPersons Array of AuxiliaryPerson objects
   * @param ttlSeconds Time-to-live in seconds (default: 120s)
   *
   * @example
   * ```typescript
   * await mmkvStorage.cacheAuxiliaryPersons('12345', [
   *   { No: 3, FirstName: 'John', LastName: 'Doe', NationalityCode: 'US', Functions: 2, Gender: 0 }
   * ]);
   * ```
   */
  async cacheAuxiliaryPersons(
    eventNo: string,
    auxiliaryPersons: any[],
    ttlSeconds: number = 120
  ): Promise<void> {
    try {
      const key = `event:${eventNo}:auxiliaryPersons`;
      const expiresAt = Date.now() + (ttlSeconds * 1000);

      const cacheEntry = {
        data: auxiliaryPersons,
        expiresAt,
        cachedAt: Date.now()
      };

      await this.setItem(key, JSON.stringify(cacheEntry));
    } catch (error) {
      console.error(`[MmkvStorage:${this.namespace}] Failed to cache AuxiliaryPersons for event ${eventNo}:`, error);
      throw error;
    }
  }

  /**
   * Get cached AuxiliaryPersons for an event
   *
   * Returns null if not found or expired (120s TTL).
   * Key format: `event:${eventNo}:auxiliaryPersons`
   *
   * @param eventNo Event number (tournament identifier)
   * @returns Array of AuxiliaryPerson objects or null if not found/expired
   *
   * @example
   * ```typescript
   * const officials = await mmkvStorage.getCachedAuxiliaryPersons('12345');
   * if (officials) {
   *   // Use cached data
   * } else {
   *   // Fetch from API
   * }
   * ```
   */
  async getCachedAuxiliaryPersons(eventNo: string): Promise<any[] | null> {
    try {
      const key = `event:${eventNo}:auxiliaryPersons`;
      const cached = await this.getItem(key);

      if (!cached) {
        return null;
      }

      const cacheEntry = JSON.parse(cached);

      // Check expiration (120s TTL)
      if (Date.now() > cacheEntry.expiresAt) {
        // Expired - remove from cache
        await this.removeItem(key);
        return null;
      }

      return cacheEntry.data;
    } catch (error) {
      console.error(`[MmkvStorage:${this.namespace}] Failed to get cached AuxiliaryPersons for event ${eventNo}:`, error);
      return null;
    }
  }
}

/**
 * Create a new MMKV storage instance
 *
 * @param namespace - Storage namespace (e.g., 'cache', 'audit', 'user')
 * @param encryptionKey - Optional encryption key (defaults to EXPO_PUBLIC_MMKV_KEY)
 * @returns MmkvStorage instance
 *
 * @example
 * ```typescript
 * // Create cache storage
 * const cacheStorage = createMmkvStorage('cache');
 *
 * // Store data
 * await cacheStorage.setItem('tournaments', JSON.stringify(tournaments));
 *
 * // Retrieve data
 * const data = await cacheStorage.getItem('tournaments');
 * const tournaments = data ? JSON.parse(data) : [];
 * ```
 */
export function createMmkvStorage(namespace: string, encryptionKey?: string): MmkvStorage {
  return new MmkvStorage(namespace, encryptionKey);
}

/**
 * Default MMKV storage instances
 */
export const defaultMmkvStorage = new MmkvStorage('default');
export const cacheMmkvStorage = new MmkvStorage('cache');
export const auditMmkvStorage = new MmkvStorage('audit');
