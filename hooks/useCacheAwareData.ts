/**
 * @fileoverview Cache-Aware Data Fetching Hook
 * Provides intelligent caching with TTL, invalidation, and performance monitoring
 * Part of EPIC-007 Data Architecture Restructuration - Story 7.3 Task 1
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Cache entry interface
 */
interface CacheEntry<T> {
  /** Cached data */
  data: T;
  /** Timestamp when data was cached */
  timestamp: number;
  /** Time-to-live in milliseconds */
  ttl: number;
  /** Cache key */
  key: string;
  /** Number of times this entry has been accessed */
  accessCount: number;
  /** Last access timestamp */
  lastAccessed: number;
  /** Source of the data (cache, api, etc.) */
  source: 'cache' | 'api' | 'optimistic';
}

/**
 * Cache statistics interface
 */
interface CacheStats {
  /** Total cache hits */
  hits: number;
  /** Total cache misses */
  misses: number;
  /** Cache hit ratio (0-1) */
  hitRatio: number;
  /** Total entries in cache */
  size: number;
  /** Memory usage estimate in bytes */
  memoryUsage: number;
}

/**
 * Options for cache-aware data fetching
 */
export interface UseCacheAwareDataOptions {
  /** Time-to-live in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Enable performance tracking */
  enablePerformanceTracking?: boolean;
  /** Cache invalidation tags */
  invalidationTags?: string[];
  /** Enable stale-while-revalidate strategy */
  staleWhileRevalidate?: boolean;
  /** Max stale time in milliseconds for SWR */
  maxStaleTime?: number;
  /** Enable optimistic updates */
  enableOptimisticUpdates?: boolean;
  /** Background refresh interval in milliseconds */
  backgroundRefreshInterval?: number;
  /** Priority level for cache eviction (1-10, higher = keep longer) */
  priority?: number;
}

/**
 * Cache-aware data response interface
 */
export interface UseCacheAwareDataResponse<T> {
  /** The fetched data */
  data: T | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether data came from cache */
  cacheHit: boolean;
  /** Manual refresh function */
  refresh: () => Promise<void>;
  /** Invalidate cache for this key */
  invalidate: () => void;
  /** Update data optimistically */
  optimisticUpdate: (data: T) => void;
  /** Cache metadata */
  cacheMetadata?: {
    age: number;
    isStale: boolean;
    accessCount: number;
  };
}

/**
 * Global cache instance
 */
class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = { hits: 0, misses: 0, hitRatio: 0, size: 0, memoryUsage: 0 };
  private invalidationListeners = new Map<string, Set<() => void>>();
  private maxSize = 100; // Maximum cache entries
  
  /**
   * Get data from cache
   */
  get<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateStats();
      return null;
    }
    
    // Check if entry is expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateStats();
      return null;
    }
    
    // Update access metadata
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    this.stats.hits++;
    this.updateStats();
    
    return entry;
  }
  
  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, ttl: number, options: { priority?: number; source?: 'cache' | 'api' | 'optimistic' } = {}): void {
    // Evict if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key,
      accessCount: 0,
      lastAccessed: Date.now(),
      source: options.source || 'api'
    };
    
    this.cache.set(key, entry);
    this.updateStats();
  }
  
  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateStats();
    }
    return deleted;
  }
  
  /**
   * Invalidate cache entries by tags
   */
  invalidateByTags(tags: string[]): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of this.cache) {
      if (tags.some(tag => key.includes(tag))) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      
      // Notify listeners
      const listeners = this.invalidationListeners.get(key);
      if (listeners) {
        listeners.forEach(listener => listener());
      }
    });
    
    this.updateStats();
  }
  
  /**
   * Add invalidation listener
   */
  addInvalidationListener(key: string, listener: () => void): () => void {
    if (!this.invalidationListeners.has(key)) {
      this.invalidationListeners.set(key, new Set());
    }
    
    this.invalidationListeners.get(key)!.add(listener);
    
    // Return cleanup function
    return () => {
      const listeners = this.invalidationListeners.get(key);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.invalidationListeners.delete(key);
        }
      }
    };
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.updateStats();
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }
  
  /**
   * Evict least recently used entries
   */
  private evictLeastRecentlyUsed(): void {
    if (this.cache.size === 0) return;
    
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
  
  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.size = this.cache.size;
    this.stats.hitRatio = this.stats.hits + this.stats.misses > 0 
      ? this.stats.hits / (this.stats.hits + this.stats.misses) 
      : 0;
    
    // Estimate memory usage (rough calculation)
    this.stats.memoryUsage = 0;
    for (const entry of this.cache.values()) {
      this.stats.memoryUsage += JSON.stringify(entry.data).length * 2; // Rough byte estimate
    }
  }
}

// Global cache instance
const globalCache = new CacheManager();

/**
 * Cache-aware data fetching hook
 * Provides intelligent caching with TTL, invalidation, and performance monitoring
 * 
 * @param cacheKey - Unique key for caching the data
 * @param fetchMethod - Async function to fetch data when cache miss occurs
 * @param options - Cache configuration options
 * @returns Cache-aware data response with cache metadata
 */
export const useCacheAwareData = <T>(
  cacheKey: string,
  fetchMethod: () => Promise<T>,
  options: UseCacheAwareDataOptions = {}
): UseCacheAwareDataResponse<T> => {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    enablePerformanceTracking = process.env.NODE_ENV === 'development',
    invalidationTags = [],
    staleWhileRevalidate = false,
    maxStaleTime = 10 * 60 * 1000, // 10 minutes default
    enableOptimisticUpdates = false,
    backgroundRefreshInterval,
    priority = 5
  } = options;

  const [data, setData] = useState<T | null>(null);
  // Specchio di `data` per le chiusure: vedi la nota dentro `fetchData`.
  const datoCorrente = useRef<T | null>(null);
  datoCorrente.current = data;

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [cacheHit, setCacheHit] = useState<boolean>(false);
  const [cacheMetadata, setCacheMetadata] = useState<{
    age: number;
    isStale: boolean;
    accessCount: number;
  } | undefined>(undefined);

  const mountedRef = useRef(true);
  const backgroundRefreshTimeoutRef = useRef<TimerHandle | null>(null);

  // Fetch data with caching logic
  const fetchData = useCallback(async (forceRefresh = false): Promise<void> => {
    if (!mountedRef.current) return;

    try {
      setError(null);
      
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedEntry = globalCache.get<T>(cacheKey);
        
        if (cachedEntry) {
          const age = Date.now() - cachedEntry.timestamp;
          const isStale = age > ttl;
          
          setData(cachedEntry.data);
          setCacheHit(true);
          setCacheMetadata({
            age,
            isStale,
            accessCount: cachedEntry.accessCount
          });
          
          if (enablePerformanceTracking) {
            // console.debug(`Cache hit for key: ${cacheKey}`, {
            //   age,
            //   isStale,
            //   accessCount: cachedEntry.accessCount
            // });
          }
          
          // If stale-while-revalidate is enabled and data is stale, fetch in background
          if (staleWhileRevalidate && isStale && age < maxStaleTime) {
            setLoading(false);
            fetchData(true); // Background refresh
            return;
          }
          
          if (!isStale) {
            setLoading(false);
            return;
          }
        }
      }
      
      // Cache miss or stale data - fetch from source
      //
      // Si legge dal RIFERIMENTO, non dallo stato: avere `data` fra le
      // dipendenze di `fetchData` ne cambiava l'identita' a ogni lettura
      // riuscita, e l'effetto di montaggio — che dipende da `fetchData` — si
      // rieseguiva subito dopo. Il secondo giro trovava il dato in cache e
      // marcava `cacheHit` come vero gia' alla PRIMA lettura, oltre a fare una
      // lettura in piu' a ogni cambio di dato.
      if (!staleWhileRevalidate || !datoCorrente.current) {
        setLoading(true);
      }

      const result = await fetchMethod();

      if (!mountedRef.current) return;

      // Update cache
      globalCache.set(cacheKey, result, ttl, { priority, source: 'api' });

      setData(result);
      setCacheHit(false);
      setCacheMetadata({
        age: 0,
        isStale: false,
        accessCount: 1
      });

      if (enablePerformanceTracking) {
        // TODO: Track fetch performance metrics
        // const startTime = Date.now();
        // const fetchTime = Date.now() - startTime;
        // console.debug(`Data fetched for key: ${cacheKey}`, {
        //   fetchTime,
        //   dataSize: JSON.stringify(result).length
        // });
      }
      
    } catch (err) {
      if (!mountedRef.current) return;
      
      const fetchError = err instanceof Error ? err : new Error('Fetch failed');
      setError(fetchError);
      
      // console.error(`Fetch failed for key: ${cacheKey}:`, fetchError);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
    // `data` NON e' fra le dipendenze, di proposito: si legge dallo specchio
    // `datoCorrente`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, fetchMethod, ttl, staleWhileRevalidate, maxStaleTime, enablePerformanceTracking, priority]);

  // Manual refresh function
  const refresh = useCallback(async (): Promise<void> => {
    await fetchData(true);
  }, [fetchData]);

  // Invalidate cache function
  const invalidate = useCallback((): void => {
    globalCache.delete(cacheKey);
    if (invalidationTags.length > 0) {
      globalCache.invalidateByTags(invalidationTags);
    }
  }, [cacheKey, invalidationTags]);

  // Optimistic update function
  const optimisticUpdate = useCallback((optimisticData: T): void => {
    if (enableOptimisticUpdates) {
      setData(optimisticData);
      globalCache.set(cacheKey, optimisticData, ttl, { priority, source: 'optimistic' });
    }
  }, [enableOptimisticUpdates, cacheKey, ttl, priority]);

  // Initial fetch effect
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Background refresh effect
  useEffect(() => {
    if (backgroundRefreshInterval && data && !loading) {
      backgroundRefreshTimeoutRef.current = setTimeout(() => {
        fetchData(true);
      }, backgroundRefreshInterval);
    }

    return () => {
      if (backgroundRefreshTimeoutRef.current) {
        clearTimeout(backgroundRefreshTimeoutRef.current);
      }
    };
  }, [backgroundRefreshInterval, data, loading, fetchData]);

  // Invalidation listener effect
  useEffect(() => {
    const cleanup = globalCache.addInvalidationListener(cacheKey, () => {
      if (mountedRef.current) {
        fetchData(true);
      }
    });

    return cleanup;
  }, [cacheKey, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (backgroundRefreshTimeoutRef.current) {
        clearTimeout(backgroundRefreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    cacheHit,
    refresh,
    invalidate,
    optimisticUpdate,
    cacheMetadata
  };
};

/**
 * Hook to get cache statistics
 */
export const useCacheStats = (): CacheStats => {
  const [stats, setStats] = useState<CacheStats>(globalCache.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(globalCache.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return stats;
};

/**
 * Clear all cache entries
 */
export const clearAllCache = (): void => {
  globalCache.clear();
};

/**
 * Invalidate cache by tags
 */
export const invalidateCacheByTags = (tags: string[]): void => {
  globalCache.invalidateByTags(tags);
};

export default useCacheAwareData;