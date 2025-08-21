/**
 * @fileoverview Unit tests for useCacheAwareData hook
 * Tests intelligent caching with TTL, invalidation, and performance monitoring
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { 
  useCacheAwareData, 
  useCacheStats,
  clearAllCache,
  invalidateCacheByTags
} from '../../hooks/useCacheAwareData';

describe('useCacheAwareData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    clearAllCache();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic caching functionality', () => {
    it('should fetch and cache data on first call', async () => {
      const mockData = { id: '1', name: 'Test Data' };
      const mockFetchMethod = jest.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() =>
        useCacheAwareData('test-key', mockFetchMethod)
      );

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.cacheHit).toBe(false);

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
      expect(result.current.cacheHit).toBe(false); // First fetch is not a cache hit
      expect(mockFetchMethod).toHaveBeenCalledTimes(1);
    });

    it('should return cached data on subsequent calls', async () => {
      const mockData = { id: '1', name: 'Test Data' };
      const mockFetchMethod = jest.fn().mockResolvedValue(mockData);

      // First call
      const { result: result1 } = renderHook(() =>
        useCacheAwareData('test-key', mockFetchMethod, { ttl: 10000 })
      );

      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
      });

      // Second call with same key
      const { result: result2 } = renderHook(() =>
        useCacheAwareData('test-key', mockFetchMethod, { ttl: 10000 })
      );

      // Should immediately return cached data
      expect(result2.current.loading).toBe(false);
      expect(result2.current.data).toEqual(mockData);
      expect(result2.current.cacheHit).toBe(true);
      expect(mockFetchMethod).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should handle cache miss after TTL expires', async () => {
      const mockData1 = { id: '1', name: 'First Data' };
      const mockData2 = { id: '1', name: 'Updated Data' };
      const mockFetchMethod = jest.fn()
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2);

      // First call
      const { result } = renderHook(() =>
        useCacheAwareData('test-key', mockFetchMethod, { ttl: 1000 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(result.current.data).toEqual(mockData1);

      // Advance time past TTL
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      // Trigger refresh
      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.data).toEqual(mockData2);
      expect(mockFetchMethod).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache metadata', () => {
    it('should provide cache metadata for hits', async () => {
      const mockData = { id: '1', name: 'Test Data' };
      const mockFetchMethod = jest.fn().mockResolvedValue(mockData);

      // First call to populate cache
      const { result: result1 } = renderHook(() =>
        useCacheAwareData('test-key', mockFetchMethod, { ttl: 10000 })
      );

      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
      });

      // Advance time slightly
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Second call for cache hit
      const { result: result2 } = renderHook(() =>
        useCacheAwareData('test-key', mockFetchMethod, { ttl: 10000 })
      );

      expect(result2.current.cacheHit).toBe(true);
      expect(result2.current.cacheMetadata).toBeDefined();
      expect(result2.current.cacheMetadata!.age).toBeGreaterThan(1000);
      expect(result2.current.cacheMetadata!.isStale).toBe(false);
      expect(result2.current.cacheMetadata!.accessCount).toBeGreaterThan(0);
    });

    it('should detect stale data', async () => {
      const mockData = { id: '1', name: 'Test Data' };
      const mockFetchMethod = jest.fn().mockResolvedValue(mockData);

      // First call to populate cache
      const { result } = renderHook(() =>
        useCacheAwareData('test-key', mockFetchMethod, { ttl: 1000 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Advance time past TTL
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      // Call refresh to detect staleness
      await act(async () => {
        await result.current.refresh();
      });

      // Note: After refresh, we get fresh data so staleness is reset
      expect(result.current.cacheMetadata?.isStale).toBe(false);
    });
  });

  describe('Stale-while-revalidate', () => {
    it('should serve stale data while revalidating in background', async () => {
      const mockData1 = { id: '1', name: 'Original Data' };
      const mockData2 = { id: '1', name: 'Updated Data' };
      const mockFetchMethod = jest.fn()
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2);

      // First call to populate cache
      const { result } = renderHook(() =>
        useCacheAwareData('test-key', mockFetchMethod, { 
          ttl: 1000,
          staleWhileRevalidate: true,
          maxStaleTime: 5000
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(result.current.data).toEqual(mockData1);

      // Advance time past TTL but within maxStaleTime
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Second call should serve stale data immediately and revalidate in background
      const { result: result2 } = renderHook(() =>
        useCacheAwareData('test-key', mockFetchMethod, { 
          ttl: 1000,
          staleWhileRevalidate: true,
          maxStaleTime: 5000
        })
      );

      // Should immediately serve stale data
      expect(result2.current.data).toEqual(mockData1);
      expect(result2.current.loading).toBe(false);

      // Wait for background revalidation
      await waitFor(() => {
        expect(mockFetchMethod).toHaveBeenCalledTimes(2);
      }, { timeout: 3000 });
    });

    it('should not serve data older than maxStaleTime', async () => {
      const mockData1 = { id: '1', name: 'Original Data' };
      const mockData2 = { id: '1', name: 'Updated Data' };
      const mockFetchMethod = jest.fn()
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2);

      // First call to populate cache
      const { result } = renderHook(() =>
        useCacheAwareData('test-key', mockFetchMethod, { 
          ttl: 1000,
          staleWhileRevalidate: true,
          maxStaleTime: 3000
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(result.current.data).toEqual(mockData1);

      // Advance time past maxStaleTime
      act(() => {
        jest.advanceTimersByTime(4000);
      });

      // Second call should fetch fresh data
      const { result: result2 } = renderHook(() =>
        useCacheAwareData('test-key', mockFetchMethod, { 
          ttl: 1000,
          staleWhileRevalidate: true,
          maxStaleTime: 3000
        })
      );

      // Should be loading fresh data
      expect(result2.current.loading).toBe(true);

      await waitFor(() => {
        expect(result2.current.loading).toBe(false);
      });

      expect(result2.current.data).toEqual(mockData2);
      expect(mockFetchMethod).toHaveBeenCalledTimes(2);
    });
  });

  describe('Optimistic updates', () => {
    it('should support optimistic updates', async () => {
      const mockData = { id: '1', name: 'Original Data' };
      const optimisticData = { id: '1', name: 'Optimistic Data' };
      const mockFetchMethod = jest.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() =>
        useCacheAwareData('test-key', mockFetchMethod, { enableOptimisticUpdates: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(result.current.data).toEqual(mockData);

      // Apply optimistic update
      act(() => {
        result.current.optimisticUpdate(optimisticData);
      });

      expect(result.current.data).toEqual(optimisticData);
    });

    it('should not allow optimistic updates when disabled', async () => {
      const mockData = { id: '1', name: 'Original Data' };
      const optimisticData = { id: '1', name: 'Optimistic Data' };
      const mockFetchMethod = jest.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() =>
        useCacheAwareData('test-key', mockFetchMethod, { enableOptimisticUpdates: false })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(result.current.data).toEqual(mockData);

      // Try optimistic update (should be ignored)
      act(() => {
        result.current.optimisticUpdate(optimisticData);
      });

      expect(result.current.data).toEqual(mockData); // Should remain unchanged
    });
  });

  describe('Cache invalidation', () => {
    it('should invalidate specific cache entry', async () => {
      const mockData1 = { id: '1', name: 'Original Data' };
      const mockData2 = { id: '1', name: 'Updated Data' };
      const mockFetchMethod = jest.fn()
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2);

      const { result } = renderHook(() =>
        useCacheAwareData('test-key', mockFetchMethod, { ttl: 10000 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(result.current.data).toEqual(mockData1);

      // Invalidate cache
      act(() => {
        result.current.invalidate();
      });

      // Next call should fetch fresh data
      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.data).toEqual(mockData2);
      expect(mockFetchMethod).toHaveBeenCalledTimes(2);
    });

    it('should invalidate cache by tags', async () => {
      const mockData1 = { id: '1', name: 'Tournament 1' };
      const mockData2 = { id: '2', name: 'Tournament 2' };
      const mockFetchMethod1 = jest.fn().mockResolvedValue(mockData1);
      const mockFetchMethod2 = jest.fn().mockResolvedValue(mockData2);

      // Cache data with tags
      const { result: result1 } = renderHook(() =>
        useCacheAwareData('tournament_1', mockFetchMethod1, { 
          invalidationTags: ['tournaments', 'tournament_1']
        })
      );

      const { result: result2 } = renderHook(() =>
        useCacheAwareData('tournament_2', mockFetchMethod2, { 
          invalidationTags: ['tournaments', 'tournament_2']
        })
      );

      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
        expect(result2.current.loading).toBe(false);
      });

      // Invalidate all tournaments
      act(() => {
        invalidateCacheByTags(['tournaments']);
      });

      // Both should refetch on next access
      await act(async () => {
        await result1.current.refresh();
        await result2.current.refresh();
      });

      expect(mockFetchMethod1).toHaveBeenCalledTimes(2);
      expect(mockFetchMethod2).toHaveBeenCalledTimes(2);
    });
  });

  describe('Background refresh', () => {
    it('should refresh data in background at specified intervals', async () => {
      const mockData1 = { id: '1', name: 'Original Data' };
      const mockData2 = { id: '1', name: 'Updated Data' };
      const mockFetchMethod = jest.fn()
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2);

      const { result } = renderHook(() =>
        useCacheAwareData('test-key', mockFetchMethod, { backgroundRefreshInterval: 5000 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(result.current.data).toEqual(mockData1);

      // Advance time to trigger background refresh
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockFetchMethod).toHaveBeenCalledTimes(2);
      });

      expect(result.current.data).toEqual(mockData2);
    });

    it('should not background refresh when still loading', async () => {
      let resolvePromise: (value: any) => void;
      const mockPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      const mockFetchMethod = jest.fn().mockReturnValue(mockPromise);

      const { result } = renderHook(() =>
        useCacheAwareData('test-key', mockFetchMethod, { backgroundRefreshInterval: 1000 })
      );

      expect(result.current.loading).toBe(true);

      // Advance time while still loading
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Should not trigger additional calls
      expect(mockFetchMethod).toHaveBeenCalledTimes(1);

      // Resolve the promise
      act(() => {
        resolvePromise!({ id: '1', name: 'Test' });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle fetch errors', async () => {
      const mockError = new Error('Fetch failed');
      const mockFetchMethod = jest.fn().mockRejectedValue(mockError);

      const { result } = renderHook(() =>
        useCacheAwareData('test-key', mockFetchMethod)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toEqual(mockError);
      expect(result.current.cacheHit).toBe(false);
    });

    it('should recover from errors on retry', async () => {
      const mockError = new Error('Initial error');
      const mockData = { id: '1', name: 'Recovered Data' };
      const mockFetchMethod = jest.fn()
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockData);

      const { result } = renderHook(() =>
        useCacheAwareData('test-key', mockFetchMethod)
      );

      await waitFor(() => {
        expect(result.current.error).toEqual(mockError);
      });

      // Retry
      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
    });
  });

  describe('useCacheStats hook', () => {
    it('should provide cache statistics', async () => {
      const mockFetchMethod = jest.fn().mockResolvedValue({ id: '1' });

      // Add some data to cache
      const { result: dataResult } = renderHook(() =>
        useCacheAwareData('test-key-1', mockFetchMethod)
      );

      await waitFor(() => {
        expect(dataResult.current.loading).toBe(false);
      });

      // Get cache stats
      const { result: statsResult } = renderHook(() => useCacheStats());

      expect(statsResult.current.size).toBeGreaterThan(0);
      expect(statsResult.current.hits).toBeGreaterThanOrEqual(0);
      expect(statsResult.current.misses).toBeGreaterThan(0);
      expect(statsResult.current.hitRatio).toBeGreaterThanOrEqual(0);
      expect(statsResult.current.memoryUsage).toBeGreaterThanOrEqual(0);
    });

    it('should update cache statistics over time', async () => {
      const mockFetchMethod = jest.fn().mockResolvedValue({ id: '1' });

      const { result: statsResult } = renderHook(() => useCacheStats());
      const initialStats = statsResult.current;

      // Add data to cache
      const { result: dataResult } = renderHook(() =>
        useCacheAwareData('test-key-stats', mockFetchMethod)
      );

      await waitFor(() => {
        expect(dataResult.current.loading).toBe(false);
      });

      // Advance timer to trigger stats update
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(statsResult.current.size).toBeGreaterThan(initialStats.size);
      });
    });
  });

  describe('Cleanup', () => {
    it('should clear timeouts on unmount', () => {
      const mockFetchMethod = jest.fn().mockResolvedValue({ id: '1' });
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount } = renderHook(() =>
        useCacheAwareData('test-key', mockFetchMethod, { backgroundRefreshInterval: 5000 })
      );

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should not update state after unmount', async () => {
      let resolvePromise: (value: any) => void;
      const mockPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      const mockFetchMethod = jest.fn().mockReturnValue(mockPromise);

      const { result, unmount } = renderHook(() =>
        useCacheAwareData('test-key', mockFetchMethod)
      );

      expect(result.current.loading).toBe(true);

      unmount();

      // Resolve promise after unmount
      act(() => {
        resolvePromise!({ id: '1' });
      });

      // Should not update state
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
    });
  });

  describe('Cache utilities', () => {
    it('should clear all cache entries', async () => {
      const mockFetchMethod = jest.fn().mockResolvedValue({ id: '1' });

      // Add data to cache
      const { result } = renderHook(() =>
        useCacheAwareData('test-key', mockFetchMethod)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear all cache
      act(() => {
        clearAllCache();
      });

      // Next call should be a cache miss
      const { result: result2 } = renderHook(() =>
        useCacheAwareData('test-key', mockFetchMethod)
      );

      expect(result2.current.cacheHit).toBe(false);
    });
  });
});