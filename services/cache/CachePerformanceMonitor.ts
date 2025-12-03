/**
 * Cache Performance Monitor
 *
 * Tracks cache hit/miss rates, response times, and storage metrics.
 *
 * Feature: specs/001-vis-api-optimization
 * Tasks: T048-T051
 */

import { CacheEntry } from '../../types/audit';

/**
 * Cache metrics for monitoring
 */
export interface CacheMetrics {
  /** Total cache hits */
  hits: number;
  /** Total cache misses */
  misses: number;
  /** Cache hit rate (0-1) */
  hitRate: number;
  /** Average response time for hits (ms) */
  avgHitResponseTime: number;
  /** Average response time for misses (ms) */
  avgMissResponseTime: number;
  /** Total storage used (bytes) */
  storageUsed: number;
  /** Storage quota (bytes) */
  storageQuota: number;
  /** Storage utilization (0-1) */
  storageUtilization: number;
  /** Total entries in cache */
  entryCount: number;
  /** Stale entries served */
  staleServed: number;
  /** Evictions performed */
  evictions: number;
}

/**
 * Cache operation timing
 */
interface OperationTiming {
  startTime: number;
  endTime?: number;
  hit: boolean;
}

/**
 * CachePerformanceMonitor
 *
 * Monitors and reports on cache performance metrics.
 *
 * **Metrics Tracked (T048-T051):**
 * - Hit/miss rates
 * - Access counts per entry
 * - Last accessed timestamps
 * - Response times for hits vs misses
 * - Storage quota utilization
 */
export class CachePerformanceMonitor {
  private static instance: CachePerformanceMonitor | null = null;

  // T048: Hit/miss tracking
  private hits: number = 0;
  private misses: number = 0;

  // Response time tracking
  private hitResponseTimes: number[] = [];
  private missResponseTimes: number[] = [];
  private readonly MAX_TIMING_SAMPLES = 100; // Keep last 100 samples

  // Storage tracking
  private storageQuota: number = 100 * 1024 * 1024; // 100MB default
  private currentStorageUsed: number = 0;

  // Entry tracking
  private entryCount: number = 0;
  private staleServed: number = 0;
  private evictions: number = 0;

  // Operation timing
  private operations: Map<string, OperationTiming> = new Map();

  private constructor() {}

  static getInstance(): CachePerformanceMonitor {
    if (!CachePerformanceMonitor.instance) {
      CachePerformanceMonitor.instance = new CachePerformanceMonitor();
    }
    return CachePerformanceMonitor.instance;
  }

  /**
   * T048: Record a cache hit
   */
  recordHit(responseTime?: number): void {
    this.hits++;

    if (responseTime !== undefined) {
      this.hitResponseTimes.push(responseTime);
      // Keep only last N samples
      if (this.hitResponseTimes.length > this.MAX_TIMING_SAMPLES) {
        this.hitResponseTimes.shift();
      }
    }
  }

  /**
   * T048: Record a cache miss
   */
  recordMiss(responseTime?: number): void {
    this.misses++;

    if (responseTime !== undefined) {
      this.missResponseTimes.push(responseTime);
      if (this.missResponseTimes.length > this.MAX_TIMING_SAMPLES) {
        this.missResponseTimes.shift();
      }
    }
  }

  /**
   * Record stale data served (stale-while-revalidate)
   */
  recordStaleServed(): void {
    this.staleServed++;
  }

  /**
   * Record cache eviction
   */
  recordEviction(): void {
    this.evictions++;
  }

  /**
   * T049: Update entry count
   */
  setEntryCount(count: number): void {
    this.entryCount = count;
  }

  /**
   * Update storage metrics
   */
  setStorageMetrics(used: number, quota?: number): void {
    this.currentStorageUsed = used;
    if (quota !== undefined) {
      this.storageQuota = quota;
    }
  }

  /**
   * Start tracking an operation
   */
  startOperation(operationId: string): void {
    this.operations.set(operationId, {
      startTime: Date.now(),
      hit: false,
    });
  }

  /**
   * End tracking an operation and record hit/miss
   */
  endOperation(operationId: string, hit: boolean): void {
    const operation = this.operations.get(operationId);
    if (operation) {
      operation.endTime = Date.now();
      operation.hit = hit;

      const responseTime = operation.endTime - operation.startTime;

      if (hit) {
        this.recordHit(responseTime);
      } else {
        this.recordMiss(responseTime);
      }

      this.operations.delete(operationId);
    }
  }

  /**
   * T051: Get cache hit rate
   */
  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  /**
   * Get average response time for cache hits
   */
  getAvgHitResponseTime(): number {
    if (this.hitResponseTimes.length === 0) return 0;
    const sum = this.hitResponseTimes.reduce((a, b) => a + b, 0);
    return sum / this.hitResponseTimes.length;
  }

  /**
   * Get average response time for cache misses
   */
  getAvgMissResponseTime(): number {
    if (this.missResponseTimes.length === 0) return 0;
    const sum = this.missResponseTimes.reduce((a, b) => a + b, 0);
    return sum / this.missResponseTimes.length;
  }

  /**
   * T051: Get all metrics for reporting
   */
  getMetrics(): CacheMetrics {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate(),
      avgHitResponseTime: this.getAvgHitResponseTime(),
      avgMissResponseTime: this.getAvgMissResponseTime(),
      storageUsed: this.currentStorageUsed,
      storageQuota: this.storageQuota,
      storageUtilization: this.storageQuota > 0 ? this.currentStorageUsed / this.storageQuota : 0,
      entryCount: this.entryCount,
      staleServed: this.staleServed,
      evictions: this.evictions,
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.hitResponseTimes = [];
    this.missResponseTimes = [];
    this.entryCount = 0;
    this.staleServed = 0;
    this.evictions = 0;
    this.operations.clear();
  }

  /**
   * Get formatted metrics report
   */
  getReport(): string {
    const metrics = this.getMetrics();

    return `
╔═══════════════════════════════════════════════════════════════╗
║              CACHE PERFORMANCE REPORT                          ║
╠═══════════════════════════════════════════════════════════════╣
║ Hit Rate:              ${(metrics.hitRate * 100).toFixed(1)}%                           ║
║ Hits:                  ${metrics.hits.toString().padEnd(10)}                    ║
║ Misses:                ${metrics.misses.toString().padEnd(10)}                    ║
║ Stale Served:          ${metrics.staleServed.toString().padEnd(10)}                    ║
║ Evictions:             ${metrics.evictions.toString().padEnd(10)}                    ║
╠═══════════════════════════════════════════════════════════════╣
║ Response Times:                                                ║
║ - Avg Hit:             ${metrics.avgHitResponseTime.toFixed(0)}ms                       ║
║ - Avg Miss:            ${metrics.avgMissResponseTime.toFixed(0)}ms                       ║
╠═══════════════════════════════════════════════════════════════╣
║ Storage:                                                       ║
║ - Used:                ${(metrics.storageUsed / 1024 / 1024).toFixed(2)}MB                   ║
║ - Quota:               ${(metrics.storageQuota / 1024 / 1024).toFixed(0)}MB                       ║
║ - Utilization:         ${(metrics.storageUtilization * 100).toFixed(1)}%                    ║
║ - Entry Count:         ${metrics.entryCount.toString().padEnd(10)}                    ║
╚═══════════════════════════════════════════════════════════════╝
    `.trim();
  }

  /**
   * Log metrics to console
   */
  logMetrics(): void {
    console.log(this.getReport());
  }

  /**
   * Check if performance targets are met
   */
  checkTargets(): {
    hitRateTarget: boolean;
    responseTimeTarget: boolean;
    storageTarget: boolean;
  } {
    const metrics = this.getMetrics();

    return {
      hitRateTarget: metrics.hitRate >= 0.7, // 70% hit rate target (SC-003)
      responseTimeTarget: metrics.avgHitResponseTime < 100, // <100ms target (SC-006)
      storageTarget: metrics.storageUtilization < 0.9, // <90% storage utilization
    };
  }
}
