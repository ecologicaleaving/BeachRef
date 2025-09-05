/**
 * @fileoverview Performance Monitoring Hook for A/B Testing
 * Provides comprehensive performance tracking for component migration and A/B testing
 * Part of EPIC-007 Data Architecture Restructuration - Story 7.3 Task 1
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { RepositoryFactory } from '../repositories/RepositoryFactory';

/**
 * Performance metric types
 */
export type PerformanceMetricType = 
  | 'component_render'
  | 'data_fetch'
  | 'cache_operation'
  | 'transformation'
  | 'user_interaction'
  | 'api_call'
  | 'memory_usage';

/**
 * Performance metric interface
 */
export interface PerformanceMetric {
  /** Unique metric ID */
  id: string;
  /** Type of performance metric */
  type: PerformanceMetricType;
  /** Metric name/label */
  name: string;
  /** Measured value */
  value: number;
  /** Unit of measurement */
  unit: 'ms' | 'bytes' | 'count' | 'ratio' | 'percentage';
  /** Timestamp when metric was recorded */
  timestamp: number;
  /** Component or feature that generated the metric */
  source: string;
  /** Implementation version (legacy vs new) */
  implementation: 'legacy' | 'new';
  /** A/B test group if applicable */
  abTestGroup?: 'control' | 'treatment';
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Performance comparison result
 */
export interface PerformanceComparison {
  /** Legacy implementation metrics */
  legacy: {
    average: number;
    median: number;
    p95: number;
    count: number;
  };
  /** New implementation metrics */
  new: {
    average: number;
    median: number;
    p95: number;
    count: number;
  };
  /** Performance improvement */
  improvement: {
    percentage: number;
    isSignificant: boolean;
    confidence: number;
  };
}

/**
 * Performance monitoring options
 */
export interface UsePerformanceMonitoringOptions {
  /** Component or feature name */
  source: string;
  /** Enable A/B testing */
  enableABTesting?: boolean;
  /** Sample rate (0-1) for performance collection */
  sampleRate?: number;
  /** Buffer size for metrics */
  bufferSize?: number;
  /** Auto-flush interval in milliseconds */
  autoFlushInterval?: number;
  /** Enable real-time monitoring */
  enableRealTimeMonitoring?: boolean;
}

/**
 * Performance monitoring response
 */
export interface UsePerformanceMonitoringResponse {
  /** Record a performance metric */
  recordMetric: (type: PerformanceMetricType, name: string, value: number, unit: PerformanceMetric['unit'], metadata?: Record<string, any>) => void;
  /** Start timing a performance metric */
  startTiming: (name: string, type?: PerformanceMetricType) => () => void;
  /** Get performance comparison for current source */
  getComparison: (metricName: string) => PerformanceComparison | null;
  /** Get current metrics buffer */
  getMetrics: () => PerformanceMetric[];
  /** Flush metrics to storage/analytics */
  flushMetrics: () => Promise<void>;
  /** Clear metrics buffer */
  clearMetrics: () => void;
  /** Current implementation type */
  implementation: 'legacy' | 'new';
  /** A/B test group assignment */
  abTestGroup?: 'control' | 'treatment';
  /** Real-time performance stats */
  realTimeStats?: {
    averageResponseTime: number;
    cacheHitRate: number;
    errorRate: number;
    memoryUsage: number;
  };
}

/**
 * Global performance metrics storage
 */
class PerformanceMetricsManager {
  private metrics: PerformanceMetric[] = [];
  private maxBufferSize = 1000;
  private listeners: Set<(metrics: PerformanceMetric[]) => void> = new Set();

  /**
   * Add performance metric
   */
  addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Maintain buffer size
    if (this.metrics.length > this.maxBufferSize) {
      this.metrics = this.metrics.slice(-this.maxBufferSize);
    }
    
    // Notify listeners
    this.listeners.forEach(listener => listener([...this.metrics]));
  }

  /**
   * Get metrics by source and implementation
   */
  getMetrics(source?: string, implementation?: 'legacy' | 'new'): PerformanceMetric[] {
    return this.metrics.filter(metric => {
      if (source && metric.source !== source) return false;
      if (implementation && metric.implementation !== implementation) return false;
      return true;
    });
  }

  /**
   * Get performance comparison
   */
  getComparison(source: string, metricName: string): PerformanceComparison | null {
    const legacyMetrics = this.metrics.filter(m => 
      m.source === source && 
      m.name === metricName && 
      m.implementation === 'legacy'
    );
    
    const newMetrics = this.metrics.filter(m => 
      m.source === source && 
      m.name === metricName && 
      m.implementation === 'new'
    );

    if (legacyMetrics.length === 0 || newMetrics.length === 0) {
      return null;
    }

    const calculateStats = (metrics: PerformanceMetric[]) => {
      const values = metrics.map(m => m.value).sort((a, b) => a - b);
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      const median = values[Math.floor(values.length / 2)];
      const p95 = values[Math.floor(values.length * 0.95)];
      
      return { average, median, p95, count: values.length };
    };

    const legacyStats = calculateStats(legacyMetrics);
    const newStats = calculateStats(newMetrics);
    
    const improvementPercentage = ((legacyStats.average - newStats.average) / legacyStats.average) * 100;
    const isSignificant = Math.abs(improvementPercentage) > 5 && 
                         Math.min(legacyStats.count, newStats.count) >= 10;
    
    return {
      legacy: legacyStats,
      new: newStats,
      improvement: {
        percentage: improvementPercentage,
        isSignificant,
        confidence: isSignificant ? 0.95 : 0.80
      }
    };
  }

  /**
   * Add change listener
   */
  addListener(listener: (metrics: PerformanceMetric[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.listeners.forEach(listener => listener([]));
  }

  /**
   * Export metrics for external analytics
   */
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
}

// Global metrics manager
const metricsManager = new PerformanceMetricsManager();

/**
 * Performance monitoring hook for A/B testing
 * Provides comprehensive performance tracking for component migration and A/B testing
 * 
 * @param options - Performance monitoring configuration
 * @returns Performance monitoring interface with recording and comparison capabilities
 */
export const usePerformanceMonitoring = (
  options: UsePerformanceMonitoringOptions
): UsePerformanceMonitoringResponse => {
  const {
    source,
    enableABTesting = true,
    sampleRate = 1.0,
    bufferSize = 100,
    autoFlushInterval = 30000, // 30 seconds
    enableRealTimeMonitoring = true
  } = options;

  const [implementation, setImplementation] = useState<'legacy' | 'new'>('new');
  const [abTestGroup, setAbTestGroup] = useState<'control' | 'treatment' | undefined>(undefined);
  const [realTimeStats, setRealTimeStats] = useState<{
    averageResponseTime: number;
    cacheHitRate: number;
    errorRate: number;
    memoryUsage: number;
  } | undefined>(undefined);

  const metricsBuffer = useRef<PerformanceMetric[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Initialize A/B testing and implementation detection
  useEffect(() => {
    if (enableABTesting) {
      try {
        // Get repository factory to determine implementation
        const repositoryFactory = new RepositoryFactory({
          baseConfig: {
            apiClient: null as any, // Will be properly injected
            cacheManager: null as any, // Will be properly injected
            enablePerformanceMonitoring: true,
            retryAttempts: 3,
            requestTimeout: 30000
          },
          enableABTesting: true,
          newRepositoryPercentage: 50,
          enablePerformanceMonitoring: true
        });

        // Determine implementation based on feature flags or repository selection
        const selection = repositoryFactory.createTournamentRepository();
        setImplementation(selection.implementation);
        setAbTestGroup(selection.abTestGroup);
      } catch (error) {
        // console.warn('Failed to initialize A/B testing for performance monitoring:', error);
        setImplementation('new'); // Default to new implementation
      }
    }
  }, [enableABTesting]);

  // Record performance metric
  const recordMetric = useCallback((
    type: PerformanceMetricType,
    name: string,
    value: number,
    unit: PerformanceMetric['unit'],
    metadata?: Record<string, any>
  ): void => {
    // Apply sampling rate
    if (Math.random() > sampleRate) return;

    const metric: PerformanceMetric = {
      id: `${source}_${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      name,
      value,
      unit,
      timestamp: Date.now(),
      source,
      implementation,
      abTestGroup,
      metadata
    };

    // Add to local buffer
    metricsBuffer.current.push(metric);
    
    // Maintain buffer size
    if (metricsBuffer.current.length > bufferSize) {
      metricsBuffer.current = metricsBuffer.current.slice(-bufferSize);
    }

    // Add to global manager
    metricsManager.addMetric(metric);

    // Auto-flush if buffer is full
    if (metricsBuffer.current.length >= bufferSize) {
      flushMetrics();
    }
  }, [source, implementation, abTestGroup, sampleRate, bufferSize]);

  // Start timing function
  const startTiming = useCallback((
    name: string,
    type: PerformanceMetricType = 'component_render'
  ): (() => void) => {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

    return () => {
      const endTime = performance.now();
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const duration = endTime - startTime;
      const memoryDelta = endMemory - startMemory;

      recordMetric(type, name, duration, 'ms', {
        startTime,
        endTime,
        memoryDelta: memoryDelta > 0 ? memoryDelta : undefined
      });

      // Record memory usage if significant change
      if (Math.abs(memoryDelta) > 1024) { // > 1KB change
        recordMetric('memory_usage', `${name}_memory`, Math.abs(memoryDelta), 'bytes');
      }
    };
  }, [recordMetric]);

  // Get performance comparison
  const getComparison = useCallback((metricName: string): PerformanceComparison | null => {
    return metricsManager.getComparison(source, metricName);
  }, [source]);

  // Get current metrics
  const getMetrics = useCallback((): PerformanceMetric[] => {
    return [...metricsBuffer.current];
  }, []);

  // Flush metrics to external storage/analytics
  const flushMetrics = useCallback(async (): Promise<void> => {
    if (metricsBuffer.current.length === 0) return;

    try {
      // In a real implementation, this would send metrics to analytics service
      if (process.env.NODE_ENV === 'development') {
        // console.debug(`Flushing ${metricsBuffer.current.length} performance metrics for ${source}`, {
        //   implementation,
        //   abTestGroup,
        //   metrics: metricsBuffer.current.slice(-5) // Show last 5 metrics
        // });
      }

      // Simulate async flush
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Clear buffer after successful flush
      metricsBuffer.current = [];
    } catch (error) {
      // console.error('Failed to flush performance metrics:', error);
    }
  }, [source, implementation, abTestGroup]);

  // Clear metrics buffer
  const clearMetrics = useCallback((): void => {
    metricsBuffer.current = [];
  }, []);

  // Auto-flush effect
  useEffect(() => {
    if (autoFlushInterval > 0) {
      flushTimeoutRef.current = setInterval(() => {
        if (mountedRef.current && metricsBuffer.current.length > 0) {
          flushMetrics();
        }
      }, autoFlushInterval);

      return () => {
        if (flushTimeoutRef.current) {
          clearInterval(flushTimeoutRef.current);
        }
      };
    }
  }, [autoFlushInterval, flushMetrics]);

  // Real-time monitoring effect
  useEffect(() => {
    if (!enableRealTimeMonitoring) return;

    const updateRealTimeStats = () => {
      const recentMetrics = metricsManager.getMetrics(source).filter(
        m => Date.now() - m.timestamp < 60000 // Last minute
      );

      if (recentMetrics.length === 0) return;

      const responseTimeMetrics = recentMetrics.filter(m => 
        m.type === 'data_fetch' || m.type === 'api_call'
      );
      const cacheMetrics = recentMetrics.filter(m => m.type === 'cache_operation');
      const errorMetrics = recentMetrics.filter(m => 
        m.metadata?.error === true
      );
      const memoryMetrics = recentMetrics.filter(m => m.type === 'memory_usage');

      const averageResponseTime = responseTimeMetrics.length > 0
        ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length
        : 0;

      const cacheHitRate = cacheMetrics.length > 0
        ? cacheMetrics.filter(m => m.metadata?.cacheHit === true).length / cacheMetrics.length
        : 0;

      const errorRate = recentMetrics.length > 0
        ? errorMetrics.length / recentMetrics.length
        : 0;

      const memoryUsage = memoryMetrics.length > 0
        ? memoryMetrics[memoryMetrics.length - 1].value
        : 0;

      setRealTimeStats({
        averageResponseTime,
        cacheHitRate,
        errorRate,
        memoryUsage
      });
    };

    const interval = setInterval(updateRealTimeStats, 5000); // Update every 5 seconds
    updateRealTimeStats(); // Initial update

    return () => clearInterval(interval);
  }, [enableRealTimeMonitoring, source]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (flushTimeoutRef.current) {
        clearInterval(flushTimeoutRef.current);
      }
      // Flush remaining metrics on unmount
      if (metricsBuffer.current.length > 0) {
        flushMetrics();
      }
    };
  }, [flushMetrics]);

  return {
    recordMetric,
    startTiming,
    getComparison,
    getMetrics,
    flushMetrics,
    clearMetrics,
    implementation,
    abTestGroup,
    realTimeStats
  };
};

/**
 * Hook to get global performance statistics
 */
export const useGlobalPerformanceStats = () => {
  const [stats, setStats] = useState<{
    totalMetrics: number;
    sources: string[];
    averagePerformanceImprovement: number;
  }>({
    totalMetrics: 0,
    sources: [],
    averagePerformanceImprovement: 0
  });

  useEffect(() => {
    const updateStats = (metrics: PerformanceMetric[]) => {
      const sources = [...new Set(metrics.map(m => m.source))];
      const improvements: number[] = [];

      sources.forEach(source => {
        const comparison = metricsManager.getComparison(source, 'data_fetch');
        if (comparison && comparison.improvement.isSignificant) {
          improvements.push(comparison.improvement.percentage);
        }
      });

      const averageImprovement = improvements.length > 0
        ? improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length
        : 0;

      setStats({
        totalMetrics: metrics.length,
        sources,
        averagePerformanceImprovement: averageImprovement
      });
    };

    const cleanup = metricsManager.addListener(updateStats);
    updateStats(metricsManager.exportMetrics()); // Initial update

    return cleanup;
  }, []);

  return stats;
};

/**
 * Clear all performance metrics
 */
export const clearAllPerformanceMetrics = (): void => {
  metricsManager.clear();
};

/**
 * Export all performance metrics
 */
export const exportAllPerformanceMetrics = (): PerformanceMetric[] => {
  return metricsManager.exportMetrics();
};

export default usePerformanceMonitoring;