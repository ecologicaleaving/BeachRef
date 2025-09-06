/**
 * @fileoverview Cache-specific interfaces and types v2
 * Smart 2-tier caching system with semantic keys
 * Part of EPIC-007 Data Architecture Restructuration
 */

/**
 * Cache key semantic type for stable, timestamp-free cache keys
 * Format: {resource}_{filters}_{version}
 * Example: "tournaments_current_type_fivb_gender_w_v1"
 */
export type CacheKey = string & { readonly __brand: 'CacheKey' };

/**
 * Cache tier levels for the 2-tier architecture
 */
export enum CacheTier {
  /** Tier 1: Hot memory cache (15min-2h TTL) */
  MEMORY = 'MEMORY',
  /** Tier 2: Persistent storage cache (6h-24h TTL) */
  PERSISTENT = 'PERSISTENT'
}

/**
 * Cache entry metadata
 */
export interface CacheEntryMetadata {
  /** Cache key */
  readonly key: CacheKey;
  /** Cache tier where entry is stored */
  readonly tier: CacheTier;
  /** Entry creation timestamp */
  readonly createdAt: string;
  /** Entry last access timestamp */
  readonly lastAccessedAt: string;
  /** Entry expiration timestamp */
  readonly expiresAt: string;
  /** Entry size in bytes */
  readonly sizeBytes: number;
  /** Entry version for invalidation */
  readonly version: number;
  /** Hit count for this entry */
  readonly hitCount: number;
}

/**
 * Cache entry with data and metadata
 */
export interface CacheEntry<T = any> {
  /** Cached data */
  readonly data: T;
  /** Entry metadata */
  readonly metadata: CacheEntryMetadata;
}

/**
 * Cache configuration for different data types
 */
export interface CacheConfig {
  /** Memory cache TTL in milliseconds (15min-2h) */
  readonly memoryTtlMs: number;
  /** Persistent cache TTL in milliseconds (6h-24h) */
  readonly persistentTtlMs: number;
  /** Maximum memory cache size in MB */
  readonly maxMemorySize: number;
  /** Maximum persistent cache size in MB */
  readonly maxPersistentSize: number;
  /** Cache key prefix for namespacing */
  readonly keyPrefix: string;
  /** Enable cache warming on app initialization */
  readonly enableWarming: boolean;
}

/**
 * Cache performance metrics
 */
export interface CacheMetrics {
  /** Total cache hits */
  readonly hits: number;
  /** Total cache misses */
  readonly misses: number;
  /** Cache hit rate percentage */
  readonly hitRate: number;
  /** Memory cache size in bytes */
  readonly memorySizeBytes: number;
  /** Persistent cache size in bytes */
  readonly persistentSizeBytes: number;
  /** Total entries in memory cache */
  readonly memoryEntryCount: number;
  /** Total entries in persistent cache */
  readonly persistentEntryCount: number;
  /** Average response time in ms */
  readonly avgResponseTimeMs: number;
  /** Cache evictions count */
  readonly evictions: number;
  /** Last metrics update timestamp */
  readonly lastUpdated: string;
}

/**
 * Cache invalidation strategy
 */
export enum CacheInvalidationStrategy {
  /** Time-based expiration only */
  TTL_ONLY = 'TTL_ONLY',
  /** Version-based invalidation */
  VERSION_BASED = 'VERSION_BASED',
  /** Manual invalidation with patterns */
  PATTERN_BASED = 'PATTERN_BASED',
  /** Least recently used eviction */
  LRU = 'LRU'
}

/**
 * Cache warming configuration
 */
export interface CacheWarmingConfig {
  /** Enable cache warming */
  readonly enabled: boolean;
  /** Warmup delay after app start in ms */
  readonly startupDelayMs: number;
  /** Background warmup interval in ms */
  readonly intervalMs: number;
  /** Resources to warm up */
  readonly resources: readonly string[];
  /** Maximum concurrent warming operations */
  readonly maxConcurrency: number;
}

/**
 * Cache operation result
 */
export interface CacheOperationResult<T = any> {
  /** Operation success status */
  readonly success: boolean;
  /** Retrieved/stored data */
  readonly data?: T;
  /** Cache tier used */
  readonly tier?: CacheTier;
  /** Operation duration in ms */
  readonly durationMs: number;
  /** Error message if operation failed */
  readonly error?: string;
  /** Cache hit/miss status */
  readonly hit: boolean;
}

/**
 * Cache filter options for retrieving entries
 */
export interface CacheFilterOptions {
  /** Filter by cache tier */
  readonly tier?: CacheTier;
  /** Filter by key pattern (regex) */
  readonly keyPattern?: string;
  /** Filter by minimum hit count */
  readonly minHitCount?: number;
  /** Filter by expiration status */
  readonly includeExpired?: boolean;
  /** Maximum entries to return */
  readonly limit?: number;
}

/**
 * Interface for cache key building
 */
export interface ICacheKeyBuilder {
  /**
   * Build cache key for tournament list
   * @param filters - Tournament filter parameters
   * @returns Semantic cache key
   */
  tournamentList(filters: Record<string, any>): CacheKey;
  
  /**
   * Build cache key for tournament details
   * @param tournamentId - Tournament ID
   * @returns Semantic cache key
   */
  tournamentDetail(tournamentId: string): CacheKey;
  
  /**
   * Build cache key for match list
   * @param tournamentId - Tournament ID
   * @param filters - Match filter parameters
   * @returns Semantic cache key
   */
  matchList(tournamentId: string, filters?: Record<string, any>): CacheKey;
  
  /**
   * Build cache key for referee assignments
   * @param refereeId - Referee ID
   * @param dateRange - Date range filters
   * @returns Semantic cache key
   */
  refereeAssignments(refereeId: string, dateRange?: Record<string, any>): CacheKey;
  
  /**
   * Build cache key for referee list
   * @param tournamentId - Tournament ID
   * @param filters - Referee filter parameters
   * @returns Semantic cache key
   */
  refereeList(tournamentId: string, filters?: Record<string, any>): CacheKey;
  
  /**
   * Build cache key for referee details
   * @param refereeId - Referee ID
   * @returns Semantic cache key
   */
  refereeDetails(refereeId: string): CacheKey;
  
  /**
   * Build versioned cache key
   * @param baseKey - Base cache key
   * @param version - Version number
   * @returns Versioned cache key
   */
  withVersion(baseKey: string, version: number): CacheKey;
}

/**
 * Interface for cache manager operations
 */
export interface ICacheManager {
  /**
   * Get entry from cache
   * @param key - Cache key
   * @returns Cache operation result
   */
  get<T>(key: CacheKey): Promise<CacheOperationResult<T>>;
  
  /**
   * Store entry in cache
   * @param key - Cache key
   * @param data - Data to cache
   * @param tier - Preferred cache tier
   * @returns Cache operation result
   */
  set<T>(key: CacheKey, data: T, tier?: CacheTier): Promise<CacheOperationResult<void>>;
  
  /**
   * Delete entry from cache
   * @param key - Cache key
   * @returns Cache operation result
   */
  delete(key: CacheKey): Promise<CacheOperationResult<void>>;
  
  /**
   * Clear cache by pattern
   * @param pattern - Key pattern (regex)
   * @param tier - Cache tier to clear
   * @returns Number of entries cleared
   */
  clear(pattern?: string, tier?: CacheTier): Promise<number>;
  
  /**
   * Get cache metrics
   * @returns Current cache performance metrics
   */
  getMetrics(): Promise<CacheMetrics>;
  
  /**
   * Warm cache with predefined data
   * @param config - Warming configuration
   * @returns Warming operation result
   */
  warmCache(config: CacheWarmingConfig): Promise<boolean>;
  
  /**
   * Get all cache entries matching filters
   * @param options - Filter options
   * @returns Matching cache entries
   */
  getEntries(options?: CacheFilterOptions): Promise<CacheEntry[]>;
}

/**
 * Type guard to check if a string is a valid CacheKey
 * @param key - String to validate
 * @returns True if string is valid CacheKey format
 */
export function isCacheKey(key: string): key is CacheKey {
  // Cache key format: {resource}_{filters}_{version}
  // Example: "tournaments_current_type_fivb_gender_w_v1"
  const cacheKeyPattern = /^[a-z0-9_]+_v\d+$/;
  return cacheKeyPattern.test(key);
}

/**
 * Creates a branded CacheKey from string
 * @param key - String to convert to CacheKey
 * @returns Branded CacheKey
 * @throws Error if key format is invalid
 */
export function createCacheKey(key: string): CacheKey {
  if (!isCacheKey(key)) {
    throw new Error(`Invalid cache key format: ${key}. Expected format: resource_filters_vN`);
  }
  return key as CacheKey;
}