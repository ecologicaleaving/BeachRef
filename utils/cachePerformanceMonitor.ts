/**
 * Cache Performance Monitor
 * Part of Story 1.1: Tournament Cache Optimization - Task 4
 *
 * Monitors cache performance metrics and provides user feedback
 */

interface CacheMetrics {
  hits: number;
  misses: number;
  totalRequests: number;
  avgResponseTime: number;
  lastRequestTime: number;
}

interface CacheEvent {
  timestamp: number;
  type: 'hit' | 'miss' | 'error';
  cacheKey: string;
  responseTime: number;
  dataSize?: number;
}

export class CachePerformanceMonitor {
  private static metrics = new Map<string, CacheMetrics>();
  private static events: CacheEvent[] = [];
  private static readonly MAX_EVENTS = 100; // Keep last 100 events

  /**
   * Record a cache hit
   * @param cacheKey - Cache key that was hit
   * @param responseTime - Time taken to retrieve from cache (ms)
   * @param dataSize - Size of cached data in bytes (optional)
   */
  static recordCacheHit(cacheKey: string, responseTime: number, dataSize?: number): void {
    this.updateMetrics(cacheKey, 'hit', responseTime);
    this.addEvent({
      timestamp: Date.now(),
      type: 'hit',
      cacheKey,
      responseTime,
      dataSize
    });

  }

  /**
   * Record a cache miss
   * @param cacheKey - Cache key that was missed
   * @param responseTime - Time taken for fallback API call (ms)
   */
  static recordCacheMiss(cacheKey: string, responseTime: number): void {
    this.updateMetrics(cacheKey, 'miss', responseTime);
    this.addEvent({
      timestamp: Date.now(),
      type: 'miss',
      cacheKey,
      responseTime
    });

  }

  /**
   * Record a cache error
   * @param cacheKey - Cache key that errored
   * @param responseTime - Time taken before error
   */
  static recordCacheError(cacheKey: string, responseTime: number): void {
    this.updateMetrics(cacheKey, 'error', responseTime);
    this.addEvent({
      timestamp: Date.now(),
      type: 'error',
      cacheKey,
      responseTime
    });

    console.warn(`📊 Cache ERROR: ${cacheKey} (${responseTime}ms)`);
  }

  /**
   * Get cache hit ratio for a specific cache type
   * @param cacheType - Type of cache (e.g., 'tournament', 'matches')
   * @returns Hit ratio as percentage (0-100)
   */
  static getCacheHitRatio(cacheType?: string): number {
    if (cacheType) {
      const metrics = this.getMetricsForType(cacheType);
      if (metrics.totalRequests === 0) return 0;
      return (metrics.hits / metrics.totalRequests) * 100;
    }

    // Overall hit ratio
    let totalHits = 0;
    let totalRequests = 0;

    Array.from(this.metrics.values()).forEach(metric => {
      totalHits += metric.hits;
      totalRequests += metric.totalRequests;
    });

    if (totalRequests === 0) return 0;
    return (totalHits / totalRequests) * 100;
  }

  /**
   * Get performance stats for debugging/monitoring
   */
  static getPerformanceStats(): {
    overallHitRatio: number;
    totalRequests: number;
    avgResponseTime: number;
    cacheTypes: Record<string, {
      hitRatio: number;
      requests: number;
      avgResponseTime: number;
    }>;
    recentEvents: CacheEvent[];
  } {
    const stats = {
      overallHitRatio: this.getCacheHitRatio(),
      totalRequests: 0,
      avgResponseTime: 0,
      cacheTypes: {} as Record<string, any>,
      recentEvents: this.events.slice(-10) // Last 10 events
    };

    let totalResponseTime = 0;

    Array.from(this.metrics.entries()).forEach(([cacheKey, metrics]) => {
      stats.totalRequests += metrics.totalRequests;
      totalResponseTime += metrics.avgResponseTime * metrics.totalRequests;

      const cacheType = this.extractCacheType(cacheKey);
      if (!stats.cacheTypes[cacheType]) {
        stats.cacheTypes[cacheType] = {
          hitRatio: this.getCacheHitRatio(cacheType),
          requests: 0,
          avgResponseTime: 0
        };
      }

      stats.cacheTypes[cacheType].requests += metrics.totalRequests;
      stats.cacheTypes[cacheType].avgResponseTime = metrics.avgResponseTime;
    });

    stats.avgResponseTime = stats.totalRequests > 0 ? totalResponseTime / stats.totalRequests : 0;

    return stats;
  }

  /**
   * Get user-friendly cache status message
   */
  static getCacheStatusMessage(): string {
    const hitRatio = this.getCacheHitRatio();
    const totalRequests = Array.from(this.metrics.values())
      .reduce((sum, metric) => sum + metric.totalRequests, 0);

    if (totalRequests === 0) {
      return 'Cache warming up...';
    }

    if (hitRatio >= 80) {
      return `Cache performing well (${hitRatio.toFixed(1)}% hit rate)`;
    } else if (hitRatio >= 60) {
      return `Cache performance moderate (${hitRatio.toFixed(1)}% hit rate)`;
    } else {
      return `Cache performance low (${hitRatio.toFixed(1)}% hit rate)`;
    }
  }

  /**
   * Check if cache is providing performance benefits
   * @returns true if cache hit ratio > 50% and avg cache response < 200ms
   */
  static isCacheEffective(): boolean {
    const hitRatio = this.getCacheHitRatio();
    const stats = this.getPerformanceStats();

    return hitRatio > 50 && stats.avgResponseTime < 200;
  }

  /**
   * Reset all metrics (useful for testing)
   */
  static reset(): void {
    this.metrics.clear();
    this.events.length = 0;
  }

  private static updateMetrics(cacheKey: string, type: 'hit' | 'miss' | 'error', responseTime: number): void {
    if (!this.metrics.has(cacheKey)) {
      this.metrics.set(cacheKey, {
        hits: 0,
        misses: 0,
        totalRequests: 0,
        avgResponseTime: 0,
        lastRequestTime: Date.now()
      });
    }

    const metrics = this.metrics.get(cacheKey)!;

    // Update counters
    if (type === 'hit') metrics.hits++;
    else if (type === 'miss') metrics.misses++;

    metrics.totalRequests++;

    // Update average response time
    const totalTime = metrics.avgResponseTime * (metrics.totalRequests - 1) + responseTime;
    metrics.avgResponseTime = totalTime / metrics.totalRequests;

    metrics.lastRequestTime = Date.now();
  }

  private static addEvent(event: CacheEvent): void {
    this.events.push(event);

    // Keep only recent events
    if (this.events.length > this.MAX_EVENTS) {
      this.events.splice(0, this.events.length - this.MAX_EVENTS);
    }
  }

  private static getMetricsForType(cacheType: string): CacheMetrics {
    const aggregated: CacheMetrics = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      avgResponseTime: 0,
      lastRequestTime: 0
    };

    let totalResponseTime = 0;

    Array.from(this.metrics.entries()).forEach(([cacheKey, metrics]) => {
      if (this.extractCacheType(cacheKey) === cacheType) {
        aggregated.hits += metrics.hits;
        aggregated.misses += metrics.misses;
        aggregated.totalRequests += metrics.totalRequests;
        totalResponseTime += metrics.avgResponseTime * metrics.totalRequests;
        aggregated.lastRequestTime = Math.max(aggregated.lastRequestTime, metrics.lastRequestTime);
      }
    });

    if (aggregated.totalRequests > 0) {
      aggregated.avgResponseTime = totalResponseTime / aggregated.totalRequests;
    }

    return aggregated;
  }

  private static extractCacheType(cacheKey: string): string {
    if (cacheKey.startsWith('matches_')) return 'matches';
    if (cacheKey.startsWith('tournament_')) return 'tournament';
    if (cacheKey.startsWith('referee_')) return 'referee';
    return 'other';
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}