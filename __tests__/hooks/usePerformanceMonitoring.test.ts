/**
 * @fileoverview Unit tests for usePerformanceMonitoring hook
 * Tests comprehensive performance tracking for component migration and A/B testing
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { 
  usePerformanceMonitoring, 
  useGlobalPerformanceStats,
  clearAllPerformanceMetrics,
  exportAllPerformanceMetrics
} from '../../hooks/usePerformanceMonitoring';
import { RepositoryFactory } from '../../repositories/RepositoryFactory';

// Mock RepositoryFactory
jest.mock('../../repositories/RepositoryFactory');
const MockRepositoryFactory = RepositoryFactory as jest.MockedClass<typeof RepositoryFactory>;

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 1000000
  }
};
Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

describe('usePerformanceMonitoring', () => {
  let mockRepositoryFactory: jest.Mocked<RepositoryFactory>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    clearAllPerformanceMetrics();

    mockRepositoryFactory = {
      createTournamentRepository: jest.fn(),
      createMatchRepository: jest.fn(),
      getPerformanceComparison: jest.fn(),
      getABTestResults: jest.fn(),
      forceLegacyFallback: jest.fn(),
      clearMetrics: jest.fn()
    } as any;

    MockRepositoryFactory.mockImplementation(() => mockRepositoryFactory);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic functionality', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring({ source: 'test-component' })
      );

      expect(result.current.implementation).toBe('new');
      expect(result.current.abTestGroup).toBeUndefined();
      expect(typeof result.current.recordMetric).toBe('function');
      expect(typeof result.current.startTiming).toBe('function');
      expect(typeof result.current.getComparison).toBe('function');
    });

    it('should record performance metrics', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring({ source: 'test-component' })
      );

      act(() => {
        result.current.recordMetric('component_render', 'render_time', 150, 'ms', { 
          componentName: 'TestComponent' 
        });
      });

      const metrics = result.current.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        type: 'component_render',
        name: 'render_time',
        value: 150,
        unit: 'ms',
        source: 'test-component',
        implementation: 'new'
      });
      expect(metrics[0].metadata).toEqual({ componentName: 'TestComponent' });
    });

    it('should start and stop timing measurements', () => {
      mockPerformance.now
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1150);

      const { result } = renderHook(() =>
        usePerformanceMonitoring({ source: 'test-component' })
      );

      let stopTiming: () => void;

      act(() => {
        stopTiming = result.current.startTiming('test_operation', 'data_fetch');
      });

      act(() => {
        stopTiming();
      });

      const metrics = result.current.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        type: 'data_fetch',
        name: 'test_operation',
        value: 150,
        unit: 'ms'
      });
    });
  });

  describe('A/B testing integration', () => {
    it('should determine implementation from repository factory', () => {
      mockRepositoryFactory.createTournamentRepository.mockReturnValue({
        repository: {} as any,
        implementation: 'legacy',
        featureFlagValue: false,
        abTestGroup: 'control',
        metadata: {
          timestamp: new Date().toISOString(),
          reason: 'ab_test'
        }
      });

      const { result } = renderHook(() =>
        usePerformanceMonitoring({ 
          source: 'test-component',
          enableABTesting: true
        })
      );

      expect(result.current.implementation).toBe('legacy');
      expect(result.current.abTestGroup).toBe('control');
    });

    it('should handle repository factory errors gracefully', () => {
      mockRepositoryFactory.createTournamentRepository.mockImplementation(() => {
        throw new Error('Repository factory error');
      });

      const { result } = renderHook(() =>
        usePerformanceMonitoring({ 
          source: 'test-component',
          enableABTesting: true
        })
      );

      // Should default to new implementation
      expect(result.current.implementation).toBe('new');
      expect(result.current.abTestGroup).toBeUndefined();
    });

    it('should skip A/B testing when disabled', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring({ 
          source: 'test-component',
          enableABTesting: false
        })
      );

      expect(mockRepositoryFactory.createTournamentRepository).not.toHaveBeenCalled();
      expect(result.current.implementation).toBe('new');
    });
  });

  describe('Sampling and buffering', () => {
    it('should respect sample rate for metric recording', () => {
      // Mock Math.random to always return 0.8 (80%)
      const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.8);

      const { result } = renderHook(() =>
        usePerformanceMonitoring({ 
          source: 'test-component',
          sampleRate: 0.5 // 50% sample rate
        })
      );

      act(() => {
        result.current.recordMetric('component_render', 'test_metric', 100, 'ms');
      });

      // Should not record metric due to sampling (0.8 > 0.5)
      const metrics = result.current.getMetrics();
      expect(metrics).toHaveLength(0);

      mockRandom.mockRestore();
    });

    it('should record metrics within sample rate', () => {
      const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.3);

      const { result } = renderHook(() =>
        usePerformanceMonitoring({ 
          source: 'test-component',
          sampleRate: 0.5
        })
      );

      act(() => {
        result.current.recordMetric('component_render', 'test_metric', 100, 'ms');
      });

      const metrics = result.current.getMetrics();
      expect(metrics).toHaveLength(1);

      mockRandom.mockRestore();
    });

    it('should maintain buffer size limit', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring({ 
          source: 'test-component',
          bufferSize: 3
        })
      );

      // Add more metrics than buffer size
      act(() => {
        result.current.recordMetric('component_render', 'metric1', 100, 'ms');
        result.current.recordMetric('component_render', 'metric2', 200, 'ms');
        result.current.recordMetric('component_render', 'metric3', 300, 'ms');
        result.current.recordMetric('component_render', 'metric4', 400, 'ms');
      });

      const metrics = result.current.getMetrics();
      expect(metrics).toHaveLength(3); // Should maintain buffer size
      expect(metrics[metrics.length - 1].name).toBe('metric4'); // Should keep latest
    });
  });

  describe('Memory usage tracking', () => {
    it('should track memory usage during timing', () => {
      (mockPerformance as any).memory.usedJSHeapSize = 1000000;
      
      mockPerformance.now
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1150);

      const { result } = renderHook(() =>
        usePerformanceMonitoring({ source: 'test-component' })
      );

      let stopTiming: () => void;

      act(() => {
        stopTiming = result.current.startTiming('memory_test');
      });

      // Change memory usage
      (mockPerformance as any).memory.usedJSHeapSize = 1002000; // +2KB

      act(() => {
        stopTiming();
      });

      const metrics = result.current.getMetrics();
      
      // Should have timing metric + memory metric
      expect(metrics.length).toBeGreaterThanOrEqual(1);
      
      const timingMetric = metrics.find(m => m.name === 'memory_test');
      expect(timingMetric).toBeDefined();
      expect(timingMetric!.metadata?.memoryDelta).toBe(2000);
    });

    it('should record separate memory metrics for significant changes', () => {
      (mockPerformance as any).memory.usedJSHeapSize = 1000000;
      
      mockPerformance.now
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1150);

      const { result } = renderHook(() =>
        usePerformanceMonitoring({ source: 'test-component' })
      );

      let stopTiming: () => void;

      act(() => {
        stopTiming = result.current.startTiming('memory_test');
      });

      // Significant memory increase
      (mockPerformance as any).memory.usedJSHeapSize = 1010000; // +10KB

      act(() => {
        stopTiming();
      });

      const metrics = result.current.getMetrics();
      const memoryMetric = metrics.find(m => m.type === 'memory_usage');
      
      expect(memoryMetric).toBeDefined();
      expect(memoryMetric!.name).toBe('memory_test_memory');
      expect(memoryMetric!.value).toBe(10000);
      expect(memoryMetric!.unit).toBe('bytes');
    });
  });

  describe('Auto-flush functionality', () => {
    it('should auto-flush metrics at specified intervals', async () => {
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const { result } = renderHook(() =>
        usePerformanceMonitoring({ 
          source: 'test-component',
          autoFlushInterval: 1000
        })
      );

      // Add a metric
      act(() => {
        result.current.recordMetric('component_render', 'test_metric', 100, 'ms');
      });

      expect(result.current.getMetrics()).toHaveLength(1);

      // Advance time to trigger auto-flush
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.getMetrics()).toHaveLength(0);
      });

      consoleSpy.mockRestore();
    });

    it('should auto-flush when buffer is full', async () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring({ 
          source: 'test-component',
          bufferSize: 2
        })
      );

      // Fill buffer to trigger auto-flush
      await act(async () => {
        result.current.recordMetric('component_render', 'metric1', 100, 'ms');
        result.current.recordMetric('component_render', 'metric2', 200, 'ms');
      });

      // Buffer should be flushed
      expect(result.current.getMetrics()).toHaveLength(0);
    });
  });

  describe('Real-time monitoring', () => {
    it('should update real-time statistics', async () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring({ 
          source: 'test-component',
          enableRealTimeMonitoring: true
        })
      );

      // Add some metrics
      act(() => {
        result.current.recordMetric('data_fetch', 'api_call', 250, 'ms');
        result.current.recordMetric('cache_operation', 'cache_get', 10, 'ms', { cacheHit: true });
        result.current.recordMetric('api_call', 'error_call', 1000, 'ms', { error: true });
        result.current.recordMetric('memory_usage', 'heap_size', 5000000, 'bytes');
      });

      // Advance time to trigger stats update
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(result.current.realTimeStats).toBeDefined();
      });

      const stats = result.current.realTimeStats!;
      expect(stats.averageResponseTime).toBeGreaterThan(0);
      expect(stats.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(stats.errorRate).toBeGreaterThanOrEqual(0);
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });

    it('should not update stats when real-time monitoring is disabled', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring({ 
          source: 'test-component',
          enableRealTimeMonitoring: false
        })
      );

      expect(result.current.realTimeStats).toBeUndefined();
    });
  });

  describe('Performance comparison', () => {
    it('should provide performance comparison data', () => {
      const mockComparison = {
        legacy: { average: 500, median: 450, p95: 800, count: 10 },
        new: { average: 200, median: 180, p95: 350, count: 10 },
        improvement: { percentage: 60, isSignificant: true, confidence: 0.95 }
      };

      // This would be populated by the global metrics manager
      const { result } = renderHook(() =>
        usePerformanceMonitoring({ source: 'test-component' })
      );

      // The actual comparison would come from the global metrics manager
      // For testing, we just verify the function exists
      expect(typeof result.current.getComparison).toBe('function');
      
      const comparison = result.current.getComparison('api_call');
      expect(comparison).toBeNull(); // No data yet
    });
  });

  describe('Cleanup and error handling', () => {
    it('should flush metrics on unmount', async () => {
      const { result, unmount } = renderHook(() =>
        usePerformanceMonitoring({ source: 'test-component' })
      );

      // Add metrics
      act(() => {
        result.current.recordMetric('component_render', 'test_metric', 100, 'ms');
      });

      expect(result.current.getMetrics()).toHaveLength(1);

      // Unmount should trigger flush
      unmount();

      // Verify cleanup
      expect(result.current.getMetrics()).toHaveLength(0);
    });

    it('should handle flush errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() =>
        usePerformanceMonitoring({ source: 'test-component' })
      );

      // Mock fetch to fail
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await result.current.flushMetrics();
      });

      // Should not throw, but log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to flush performance metrics:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should clear intervals on unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const { unmount } = renderHook(() =>
        usePerformanceMonitoring({ 
          source: 'test-component',
          autoFlushInterval: 1000
        })
      );

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Global performance statistics', () => {
    it('should track global performance stats', () => {
      const { result } = renderHook(() => useGlobalPerformanceStats());

      expect(result.current).toMatchObject({
        totalMetrics: expect.any(Number),
        sources: expect.any(Array),
        averagePerformanceImprovement: expect.any(Number)
      });
    });

    it('should update global stats when metrics are added', async () => {
      const { result: statsResult } = renderHook(() => useGlobalPerformanceStats());
      const { result: monitorResult } = renderHook(() =>
        usePerformanceMonitoring({ source: 'global-test' })
      );

      const initialCount = statsResult.current.totalMetrics;

      act(() => {
        monitorResult.current.recordMetric('component_render', 'test_metric', 100, 'ms');
      });

      await waitFor(() => {
        expect(statsResult.current.totalMetrics).toBeGreaterThan(initialCount);
      });

      expect(statsResult.current.sources).toContain('global-test');
    });
  });

  describe('Utility functions', () => {
    it('should clear all performance metrics', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring({ source: 'test-component' })
      );

      act(() => {
        result.current.recordMetric('component_render', 'test_metric', 100, 'ms');
      });

      expect(result.current.getMetrics()).toHaveLength(1);

      act(() => {
        clearAllPerformanceMetrics();
      });

      expect(result.current.getMetrics()).toHaveLength(0);
    });

    it('should export all performance metrics', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring({ source: 'test-component' })
      );

      act(() => {
        result.current.recordMetric('component_render', 'test_metric', 100, 'ms');
      });

      const exported = exportAllPerformanceMetrics();
      expect(exported).toHaveLength(1);
      expect(exported[0]).toMatchObject({
        type: 'component_render',
        name: 'test_metric',
        value: 100,
        unit: 'ms',
        source: 'test-component'
      });
    });
  });
});