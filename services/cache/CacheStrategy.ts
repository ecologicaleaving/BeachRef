/**
 * Cache Strategy Interface and Implementations
 * Part of Service Layer Consolidation Refactoring
 * Unified cache management with strategy pattern
 */

export interface CacheStrategy {
  readonly namespace: string;
  readonly ttl: number; // Time to live in milliseconds
  readonly compression?: boolean;
  readonly maxSize?: number; // Max entries for this strategy
  readonly prefix: string;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  namespace: string;
  size?: number;
}

export interface CacheMetadata {
  totalEntries: number;
  totalSize: number;
  lastCleanup: number;
  strategyCounts: Record<string, number>;
}

/**
 * Predefined cache strategies for different data types
 */
export const CacheStrategies = {
  // General cache - 6 hours TTL (from LocalStorageManager)
  GENERAL: {
    namespace: 'general',
    ttl: 6 * 60 * 60 * 1000, // 6 hours
    compression: false,
    prefix: '@VisCache:general:',
    maxSize: 100
  } as CacheStrategy,

  // Tournament details - 6 hours TTL (from TournamentStorageService)
  TOURNAMENT_DETAILS: {
    namespace: 'tournament_details',
    ttl: 6 * 60 * 60 * 1000, // 6 hours
    compression: true,
    prefix: '@VisCache:tournament:',
    maxSize: 50
  } as CacheStrategy,

  // Referee data - 24 hours TTL (from TournamentStorageService)
  REFEREE_DATA: {
    namespace: 'referee_data',
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    compression: true,
    prefix: '@VisCache:referee:',
    maxSize: 30
  } as CacheStrategy,

  // Offline data - 7 days TTL (from LocalStorageManager offline methods)
  OFFLINE: {
    namespace: 'offline',
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    compression: true,
    prefix: '@VisOffline:',
    maxSize: 200
  } as CacheStrategy,

  // User preferences - No expiration
  USER_PREFERENCES: {
    namespace: 'user_prefs',
    ttl: Infinity, // Never expires automatically
    compression: false,
    prefix: '@VisPref:',
    maxSize: 20
  } as CacheStrategy,

  // Assignment cache - 5 minutes TTL (from RefereeAssignmentsService)
  ASSIGNMENTS: {
    namespace: 'assignments',
    ttl: 5 * 60 * 1000, // 5 minutes
    compression: false,
    prefix: '@VisCache:assignments:',
    maxSize: 50
  } as CacheStrategy
} as const;

/**
 * Cache strategy factory for custom strategies
 */
export class CacheStrategyFactory {
  static createCustomStrategy(
    namespace: string,
    ttlMs: number,
    options: Partial<CacheStrategy> = {}
  ): CacheStrategy {
    return {
      namespace,
      ttl: ttlMs,
      prefix: `@VisCache:${namespace}:`,
      compression: false,
      maxSize: 100,
      ...options
    };
  }

  static getStrategyByNamespace(namespace: string): CacheStrategy | null {
    const strategy = Object.values(CacheStrategies).find(s => s.namespace === namespace);
    return strategy || null;
  }
}