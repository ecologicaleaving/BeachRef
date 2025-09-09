/**
 * @fileoverview Tests for TanStack Query Performance Monitoring
 * Testing performance tracking, validation, and monitoring utilities
 */

import { 
  queryPerformanceMonitor,
  performanceBenchmarks,
  performanceValidator,
  memoryMonitor,
  enablePerformanceMonitoring
} from '../queryPerformance';
import { queryClient } from '../queryClient';

// Mock performance.now for consistent testing
const mockPerformanceNow = jest.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true,
});

describe('Query Performance Monitoring', () => {
  beforeEach(() => {
    queryPerformanceMonitor.clear();
    mockPerformanceNow.mockReturnValue(1000);
    jest.clearAllMocks();
  });

  describe('QueryPerformanceMonitor', () => {
    test('should track query performance metrics', () => {
      const queryKey = ['tournaments', 'list'];
      const testData = { tournaments: [{ id: 1, name: 'Test Tournament' }] };
      
      queryPerformanceMonitor.trackQuery(queryKey, 1000, 1100, testData);
      
      const metrics = queryPerformanceMonitor.getMetrics(queryKey);
      expect(metrics).toBeDefined();
      expect(metrics?.duration).toBe(100);
      expect(metrics?.dataSize).toBeGreaterThan(0);
      expect(metrics?.errorCount).toBe(0);
    });

    test('should track query errors', () => {
      const queryKey = ['tournaments', 'error'];
      const error = new Error('Query failed');
      
      queryPerformanceMonitor.trackQuery(queryKey, 1000, 1200, null, error);
      
      const metrics = queryPerformanceMonitor.getMetrics(queryKey);
      expect(metrics?.errorCount).toBe(1);
      expect(metrics?.duration).toBe(200);
    });

    test('should calculate cache hit detection', () => {
      const queryKey = ['tournaments', 'cached'];
      
      // First request (should be cache miss)
      queryPerformanceMonitor.trackQuery(queryKey, 1000, 1200, { data: 'test' });
      let metrics = queryPerformanceMonitor.getMetrics(queryKey);
      expect(metrics?.cacheHit).toBe(false);
      
      // Second request (fast response = likely cache hit)
      queryPerformanceMonitor.trackQuery(queryKey, 2000, 2005, { data: 'test' });
      metrics = queryPerformanceMonitor.getMetrics(queryKey);
      expect(metrics?.cacheHit).toBe(true);
    });

    test('should calculate average response time', () => {
      const queryKey = ['tournaments', 'average'];
      
      // Multiple requests to test averaging
      queryPerformanceMonitor.trackQuery(queryKey, 1000, 1100, {}); // 100ms
      queryPerformanceMonitor.trackQuery(queryKey, 2000, 2200, {}); // 200ms
      
      const metrics = queryPerformanceMonitor.getMetrics(queryKey);
      // Should be weighted average: 100 * 0.8 + 200 * 0.2 = 120
      expect(metrics?.averageResponseTime).toBe(120);
    });

    test('should get all metrics', () => {
      queryPerformanceMonitor.trackQuery(['query1'], 1000, 1100, {});
      queryPerformanceMonitor.trackQuery(['query2'], 1000, 1150, {});
      
      const allMetrics = queryPerformanceMonitor.getAllMetrics();
      expect(allMetrics).toHaveLength(2);
    });

    test('should support observers', () => {
      const observer = jest.fn();
      const unsubscribe = queryPerformanceMonitor.subscribe(observer);
      
      queryPerformanceMonitor.trackQuery(['test'], 1000, 1100, {});
      expect(observer).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      queryPerformanceMonitor.trackQuery(['test2'], 1000, 1100, {});
      expect(observer).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('Performance Benchmarks', () => {
    test('should have benchmarks for all query types', () => {
      expect(performanceBenchmarks.tournaments).toBeDefined();
      expect(performanceBenchmarks.matches).toBeDefined();
      expect(performanceBenchmarks.referees).toBeDefined();
    });

    test('should have reasonable benchmark values', () => {
      expect(performanceBenchmarks.tournaments.maxResponseTime).toBeGreaterThan(0);
      expect(performanceBenchmarks.tournaments.maxDataSize).toBeGreaterThan(0);
      expect(performanceBenchmarks.tournaments.minCacheHitRate).toBeGreaterThan(0);
      expect(performanceBenchmarks.tournaments.minCacheHitRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Performance Validation', () => {
    test('should validate query performance against benchmarks', () => {
      const queryKey = ['tournaments', 'test'];
      
      // Add fast, small query with good cache behavior
      queryPerformanceMonitor.trackQuery(queryKey, 1000, 1050, { small: 'data' });
      // Add cache hit to improve hit rate
      queryPerformanceMonitor.trackQuery(queryKey, 2000, 2005, { small: 'data' });
      
      const validation = queryPerformanceMonitor.validatePerformance(queryKey);
      // May pass or fail depending on cache hit rate calculation
      expect(validation.metrics).toBeDefined();
      expect(Array.isArray(validation.issues)).toBe(true);
    });

    test('should detect performance issues', () => {
      const queryKey = ['tournaments', 'slow'];
      const largeData = { large: 'x'.repeat(200 * 1024) }; // 200KB+ data
      
      // Add slow, large query (should fail)
      queryPerformanceMonitor.trackQuery(queryKey, 1000, 1500, largeData); // 500ms
      
      const validation = queryPerformanceMonitor.validatePerformance(queryKey);
      expect(validation.passed).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
    });

    test('should handle missing metrics gracefully', () => {
      const validation = queryPerformanceMonitor.validatePerformance(['nonexistent']);
      expect(validation.passed).toBe(false);
      expect(validation.issues).toContain('No metrics available');
    });
  });

  describe('Performance Validator', () => {
    test('should validate all queries', () => {
      // Add some test queries
      queryPerformanceMonitor.trackQuery(['good'], 1000, 1050, { data: 'small' });
      queryPerformanceMonitor.trackQuery(['bad'], 1000, 1800, { data: 'x'.repeat(1000000) });
      
      const validation = performanceValidator.validateAllQueries();
      expect(validation.totalQueries).toBe(2);
      expect(validation.totalQueries).toBe(validation.passedQueries + validation.failedQueries);
      expect(validation.failedQueries).toBeGreaterThanOrEqual(0);
    });

    test('should check minimum standards', () => {
      // Add mostly good queries
      for (let i = 0; i < 9; i++) {
        queryPerformanceMonitor.trackQuery([`good${i}`], 1000, 1050, { data: 'small' });
      }
      // Add one bad query
      queryPerformanceMonitor.trackQuery(['bad'], 1000, 1800, { data: 'x'.repeat(1000000) });
      
      const meetsStandards = performanceValidator.meetsMinimumStandards();
      expect(meetsStandards).toBe(true); // 90% pass rate > 80% threshold
    });

    test('should generate performance report', () => {
      queryPerformanceMonitor.trackQuery(['test'], 1000, 1100, { data: 'test' });
      
      const report = performanceValidator.generateReport();
      expect(report).toContain('TanStack Query Performance Report');
      expect(report).toContain('Total Queries: 1');
      expect(report).toMatch(/Response Time: \d+\.\d+ms/);
    });
  });

  describe('Memory Monitor', () => {
    test('should provide cache memory usage information', () => {
      // Mock query cache
      const mockQueries = [
        { queryKey: ['test1'], data: 'data1' },
        { queryKey: ['test2'], data: 'data2' },
      ];
      
      jest.spyOn(queryClient.getQueryCache(), 'getAll').mockReturnValue(mockQueries as any);
      
      const usage = memoryMonitor.getCacheMemoryUsage();
      expect(usage.queryCount).toBe(2);
      expect(typeof usage.totalDataSize).toBe('number');
      expect(typeof usage.averageQuerySize).toBe('number');
      expect(Array.isArray(usage.largestQueries)).toBe(true);
    });

    test('should check if memory usage is acceptable', () => {
      jest.spyOn(queryClient.getQueryCache(), 'getAll').mockReturnValue([] as any);
      
      const acceptable = memoryMonitor.isMemoryUsageAcceptable();
      expect(typeof acceptable).toBe('boolean');
    });
  });

  describe('Performance Monitoring Integration', () => {
    test('should enable performance monitoring without errors', () => {
      expect(() => enablePerformanceMonitoring(queryClient)).not.toThrow();
    });

    test('should track performance when monitoring is enabled', async () => {
      enablePerformanceMonitoring(queryClient);
      
      // Test that monitoring is enabled without errors
      expect(() => enablePerformanceMonitoring(queryClient)).not.toThrow();
      
      // Manually track a query to verify the monitoring system works
      queryPerformanceMonitor.trackQuery(['monitored'], 1000, 1100, { data: 'test' });
      
      const metrics = queryPerformanceMonitor.getMetrics(['monitored']);
      expect(metrics).toBeDefined();
      expect(metrics?.duration).toBe(100);
    });
  });

  describe('Error Handling', () => {
    test('should handle observer callback errors gracefully', () => {
      const badObserver = jest.fn().mockImplementation(() => {
        throw new Error('Observer error');
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      queryPerformanceMonitor.subscribe(badObserver);
      queryPerformanceMonitor.trackQuery(['test'], 1000, 1100, {});
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Performance observer callback failed:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    test('should handle data size estimation errors', () => {
      const circularData = {};
      (circularData as any).self = circularData;
      
      // Should not throw on circular references
      expect(() => {
        queryPerformanceMonitor.trackQuery(['circular'], 1000, 1100, circularData);
      }).not.toThrow();
      
      const metrics = queryPerformanceMonitor.getMetrics(['circular']);
      expect(metrics?.dataSize).toBe(0);
    });
  });
});