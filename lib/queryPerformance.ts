/**
 * @fileoverview TanStack Query Performance Monitoring and Optimization
 * Performance tracking, monitoring, and validation utilities
 */

import { QueryClient } from '@tanstack/react-query';
import { queryClient } from './queryClient';

/**
 * Performance metrics interface
 */
export interface QueryPerformanceMetrics {
  queryKey: string;
  duration: number;
  dataSize: number;
  cacheHit: boolean;
  errorCount: number;
  retryCount: number;
  lastExecuted: number;
  averageResponseTime: number;
  hitRate: number;
}

/**
 * Performance benchmarks for different query types
 */
export const performanceBenchmarks = {
  tournaments: {
    maxResponseTime: 200, // ms
    maxDataSize: 100 * 1024, // 100KB
    minCacheHitRate: 0.8, // 80%
  },
  matches: {
    maxResponseTime: 300, // ms
    maxDataSize: 500 * 1024, // 500KB
    minCacheHitRate: 0.7, // 70%
  },
  referees: {
    maxResponseTime: 150, // ms
    maxDataSize: 50 * 1024, // 50KB
    minCacheHitRate: 0.9, // 90%
  },
} as const;

/**
 * Performance metrics storage and tracking
 */
class QueryPerformanceMonitor {
  private metrics: Map<string, QueryPerformanceMetrics> = new Map();
  private observers: Set<(metrics: QueryPerformanceMetrics) => void> = new Set();

  /**
   * Track query performance
   */
  trackQuery(queryKey: unknown[], startTime: number, endTime: number, data: any, error?: Error): void {
    const keyString = JSON.stringify(queryKey);
    const duration = endTime - startTime;
    const dataSize = this.estimateDataSize(data);
    
    const existing = this.metrics.get(keyString);
    const cacheHit = existing ? duration < 10 : false; // < 10ms likely cache hit
    
    const metrics: QueryPerformanceMetrics = {
      queryKey: keyString,
      duration,
      dataSize,
      cacheHit,
      errorCount: existing ? existing.errorCount + (error ? 1 : 0) : (error ? 1 : 0),
      retryCount: 0, // Will be updated separately
      lastExecuted: endTime,
      averageResponseTime: existing 
        ? (existing.averageResponseTime * 0.8 + duration * 0.2) 
        : duration,
      hitRate: existing 
        ? existing.hitRate * 0.9 + (cacheHit ? 0.1 : 0)
        : (cacheHit ? 1 : 0),
    };

    this.metrics.set(keyString, metrics);
    this.notifyObservers(metrics);
  }

  /**
   * Record query performance (alias for trackQuery with simplified interface)
   * Compatible with analytics collection usage
   */
  recordQuery(operationName: string, duration: number, dataCount?: number, category: string = 'query'): void {
    const queryKey = [category, operationName];
    const endTime = Date.now();
    const startTime = endTime - duration;
    
    // Create mock data object based on dataCount for size estimation
    const mockData = dataCount ? new Array(dataCount).fill({}) : null;
    
    this.trackQuery(queryKey, startTime, endTime, mockData);
  }

  /**
   * Get performance metrics for a specific query
   */
  getMetrics(queryKey: unknown[]): QueryPerformanceMetrics | undefined {
    return this.metrics.get(JSON.stringify(queryKey));
  }

  /**
   * Get all performance metrics
   */
  getAllMetrics(): QueryPerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Validate performance against benchmarks
   */
  validatePerformance(queryKey: unknown[]): {
    passed: boolean;
    issues: string[];
    metrics: QueryPerformanceMetrics | undefined;
  } {
    const metrics = this.getMetrics(queryKey);
    if (!metrics) {
      return { passed: false, issues: ['No metrics available'], metrics: undefined };
    }

    const issues: string[] = [];
    const queryType = this.getQueryType(queryKey);
    const benchmark = performanceBenchmarks[queryType as keyof typeof performanceBenchmarks];

    if (!benchmark) {
      return { passed: true, issues: [], metrics };
    }

    if (metrics.averageResponseTime > benchmark.maxResponseTime) {
      issues.push(`Response time ${metrics.averageResponseTime}ms exceeds ${benchmark.maxResponseTime}ms`);
    }

    if (metrics.dataSize > benchmark.maxDataSize) {
      issues.push(`Data size ${metrics.dataSize} bytes exceeds ${benchmark.maxDataSize} bytes`);
    }

    if (metrics.hitRate < benchmark.minCacheHitRate) {
      issues.push(`Cache hit rate ${(metrics.hitRate * 100).toFixed(1)}% below ${(benchmark.minCacheHitRate * 100)}%`);
    }

    return {
      passed: issues.length === 0,
      issues,
      metrics,
    };
  }

  /**
   * Subscribe to performance updates
   */
  subscribe(callback: (metrics: QueryPerformanceMetrics) => void): () => void {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Estimate data size in bytes
   */
  private estimateDataSize(data: any): number {
    if (!data) return 0;
    try {
      return JSON.stringify(data).length * 2; // Rough UTF-16 estimation
    } catch {
      return 0;
    }
  }

  /**
   * Extract query type from query key
   */
  private getQueryType(queryKey: unknown[]): string {
    if (Array.isArray(queryKey) && queryKey.length > 0) {
      return String(queryKey[0]);
    }
    return 'unknown';
  }

  /**
   * Notify observers of performance updates
   */
  private notifyObservers(metrics: QueryPerformanceMetrics): void {
    this.observers.forEach(callback => {
      try {
        callback(metrics);
      } catch (error) {
        console.warn('Performance observer callback failed:', error);
      }
    });
  }
}

// Global performance monitor instance
export const queryPerformanceMonitor = new QueryPerformanceMonitor();

/**
 * Query client with performance monitoring integration
 */
export function enablePerformanceMonitoring(client: QueryClient = queryClient): void {
  // Set up mutation and query observers for performance tracking
  client.getQueryCache().subscribe((event) => {
    if (event?.type === 'updated' && 'query' in event && event.query) {
      const query = event.query as any;
      const now = Date.now();
      
      // Track successful data updates
      if (query.state.status === 'success' && query.state.data) {
        queryPerformanceMonitor.trackQuery(
          query.queryKey,
          query.state.dataUpdatedAt - 50, // Approximate start time
          now,
          query.state.data
        );
      }
      
      // Track errors
      if (query.state.status === 'error' && query.state.error) {
        queryPerformanceMonitor.trackQuery(
          query.queryKey,
          query.state.errorUpdatedAt - 50, // Approximate start time
          now,
          null,
          query.state.error as Error
        );
      }
    }
  });
}

/**
 * Performance validation utility
 */
export const performanceValidator = {
  /**
   * Validate all current queries against benchmarks
   */
  validateAllQueries(): { 
    totalQueries: number;
    passedQueries: number;
    failedQueries: number;
    issues: { queryKey: string; issues: string[] }[];
  } {
    const allMetrics = queryPerformanceMonitor.getAllMetrics();
    const results = allMetrics.map(metrics => {
      const queryKey = JSON.parse(metrics.queryKey);
      return {
        queryKey: metrics.queryKey,
        ...queryPerformanceMonitor.validatePerformance(queryKey)
      };
    });

    return {
      totalQueries: allMetrics.length,
      passedQueries: results.filter(r => r.passed).length,
      failedQueries: results.filter(r => !r.passed).length,
      issues: results
        .filter(r => !r.passed)
        .map(r => ({ queryKey: r.queryKey, issues: r.issues })),
    };
  },

  /**
   * Check if performance meets minimum standards
   */
  meetsMinimumStandards(): boolean {
    const validation = this.validateAllQueries();
    const passRate = validation.totalQueries > 0 
      ? validation.passedQueries / validation.totalQueries 
      : 1;
    
    return passRate >= 0.8; // 80% of queries must meet benchmarks
  },

  /**
   * Generate performance report
   */
  generateReport(): string {
    const validation = this.validateAllQueries();
    const allMetrics = queryPerformanceMonitor.getAllMetrics();
    
    const avgResponseTime = allMetrics.length > 0 
      ? allMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / allMetrics.length 
      : 0;
    const totalDataSize = allMetrics.reduce((sum, m) => sum + m.dataSize, 0);
    const avgCacheHitRate = allMetrics.length > 0
      ? allMetrics.reduce((sum, m) => sum + m.hitRate, 0) / allMetrics.length
      : 0;

    return `
TanStack Query Performance Report
================================

Summary:
- Total Queries: ${validation.totalQueries}
- Passed: ${validation.passedQueries} (${((validation.passedQueries / validation.totalQueries) * 100).toFixed(1)}%)
- Failed: ${validation.failedQueries}

Averages:
- Response Time: ${avgResponseTime.toFixed(1)}ms
- Cache Hit Rate: ${(avgCacheHitRate * 100).toFixed(1)}%
- Total Data Size: ${(totalDataSize / 1024).toFixed(1)}KB

Issues:
${validation.issues.map(issue => 
  `- ${issue.queryKey}: ${issue.issues.join(', ')}`
).join('\n')}

Minimum Standards: ${this.meetsMinimumStandards() ? 'PASSED ✅' : 'FAILED ❌'}
    `.trim();
  },
};

/**
 * Memory usage monitoring for query cache
 */
export const memoryMonitor = {
  /**
   * Get current cache memory usage estimate
   */
  getCacheMemoryUsage(): {
    queryCount: number;
    totalDataSize: number;
    averageQuerySize: number;
    largestQueries: { queryKey: string; size: number }[];
  } {
    const allQueries = queryClient.getQueryCache().getAll();
    const querySizes = allQueries.map(query => {
      const size = queryPerformanceMonitor.getMetrics([...query.queryKey])?.dataSize || 0;
      return {
        queryKey: JSON.stringify(query.queryKey),
        size,
      };
    });

    const totalDataSize = querySizes.reduce((sum, q) => sum + q.size, 0);
    
    return {
      queryCount: allQueries.length,
      totalDataSize,
      averageQuerySize: totalDataSize / allQueries.length || 0,
      largestQueries: querySizes
        .sort((a, b) => b.size - a.size)
        .slice(0, 5),
    };
  },

  /**
   * Check if memory usage is within acceptable limits
   */
  isMemoryUsageAcceptable(): boolean {
    const usage = this.getCacheMemoryUsage();
    const maxMemoryUsage = 10 * 1024 * 1024; // 10MB
    
    return usage.totalDataSize < maxMemoryUsage;
  },
};