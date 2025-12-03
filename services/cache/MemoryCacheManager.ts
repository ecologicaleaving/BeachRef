/**
 * Memory Cache Manager
 *
 * In-memory cache layer (Level 1) with LRU eviction and MMKV integration.
 *
 * Feature: specs/001-vis-api-optimization
 * Task: T034
 */

import { MmkvStorage } from './MmkvStorage';
import { CacheEntry } from '../../types/audit';

/**
 * MemoryCacheManager
 *
 * Fast in-memory cache with LRU eviction and MMKV persistence.
 *
 * **Architecture:**
 * - Level 1: Memory (instant access, session lifetime)
 * - Level 2: MMKV (persistent, 30x faster than AsyncStorage)
 * - LRU eviction when memory limit reached
 */
export class MemoryCacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = []; // Track access order for LRU
  private maxSize: number;
  private currentSize: number = 0;
  private mmkvStorage: MmkvStorage;

  constructor(maxSizeBytes: number = 50 * 1024 * 1024, mmkvStorage?: MmkvStorage) {
    this.maxSize = maxSizeBytes;
    this.mmkvStorage = mmkvStorage || new MmkvStorage('memory-cache');
  }

  /**
   * Set a value in memory cache
   *
   * If memory limit exceeded, evicts LRU entries before adding new one.
   * Also persists to MMKV for durability.
   */
  set(key: string, entry: CacheEntry): void {
    const entrySize = this.calculateSize(entry);

    // Evict LRU entries if needed
    while (this.currentSize + entrySize > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }

    // Update access order
    this.updateAccessOrder(key);

    // Add to memory cache
    this.cache.set(key, entry);
    this.currentSize += entrySize;

    // Persist to MMKV (Level 2)
    this.mmkvStorage.setItem(key, JSON.stringify(entry)).catch(error => {
      console.error('[MemoryCacheManager] Failed to persist to MMKV:', error);
    });
  }

  /**
   * Get a value from memory cache
   *
   * Falls back to MMKV if not in memory, then promotes to memory.
   */
  async get(key: string): Promise<CacheEntry | undefined> {
    // Check memory first (Level 1)
    let entry = this.cache.get(key);

    if (entry) {
      // Update access order and tracking
      this.updateAccessOrder(key);
      entry.lastAccessedAt = Date.now();
      entry.accessCount++;
      return entry;
    }

    // Fall back to MMKV (Level 2)
    try {
      const stored = await this.mmkvStorage.getItem(key);
      if (stored) {
        entry = JSON.parse(stored) as CacheEntry;

        // Promote to memory cache
        this.set(key, entry);

        return entry;
      }
    } catch (error) {
      console.error('[MemoryCacheManager] Failed to retrieve from MMKV:', error);
    }

    return undefined;
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<void> {
    const entry = this.cache.get(key);
    if (entry) {
      const entrySize = this.calculateSize(entry);
      this.cache.delete(key);
      this.currentSize -= entrySize;

      // Remove from access order
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }

    // Delete from MMKV
    try {
      await this.mmkvStorage.removeItem(key);
    } catch (error) {
      console.error('[MemoryCacheManager] Failed to delete from MMKV:', error);
    }
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder = [];
    this.currentSize = 0;

    try {
      await this.mmkvStorage.clear();
    } catch (error) {
      console.error('[MemoryCacheManager] Failed to clear MMKV:', error);
    }
  }

  /**
   * Get all keys in cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size and statistics
   */
  getStats(): {
    entryCount: number;
    currentSize: number;
    maxSize: number;
    utilizationPercent: number;
  } {
    return {
      entryCount: this.cache.size,
      currentSize: this.currentSize,
      maxSize: this.maxSize,
      utilizationPercent: (this.currentSize / this.maxSize) * 100,
    };
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  /**
   * Update access order for LRU tracking
   */
  private updateAccessOrder(key: string): void {
    // Remove from current position
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }

    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    // Get least recently used key (first in array)
    const lruKey = this.accessOrder[0];
    const entry = this.cache.get(lruKey);

    if (entry) {
      const entrySize = this.calculateSize(entry);
      this.cache.delete(lruKey);
      this.currentSize -= entrySize;
      this.accessOrder.shift();

      // Also delete from MMKV
      this.mmkvStorage.removeItem(lruKey).catch(error => {
        console.error('[MemoryCacheManager] Failed to evict from MMKV:', error);
      });

      console.log(`[MemoryCacheManager] Evicted LRU entry: ${lruKey} (freed ${entrySize} bytes)`);
    }
  }

  /**
   * Calculate approximate size of cache entry in bytes
   */
  private calculateSize(entry: CacheEntry): number {
    try {
      return new Blob([JSON.stringify(entry)]).size;
    } catch {
      // Fallback: rough estimate
      return JSON.stringify(entry).length * 2; // UTF-16 characters
    }
  }
}
