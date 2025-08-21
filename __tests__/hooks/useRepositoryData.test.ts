/**
 * @fileoverview Unit tests for useRepositoryData hook
 * Tests unified repository data access with caching, error handling, and loading states
 */

import React from 'react';
import { useRepositoryData, useRepositoryDataWithRefresh } from '../../hooks/useRepositoryData';

// Simple test renderer for hooks
function renderHook<T>(hook: () => T): { result: { current: T }; rerender: () => void; unmount: () => void } {
  let result: { current: T };
  let mounted = true;
  
  function TestComponent() {
    result = { current: hook() };
    return null;
  }
  
  const container = document.createElement('div');
  const ReactDOM = require('react-dom');
  
  ReactDOM.render(React.createElement(TestComponent), container);
  
  return {
    result,
    rerender: () => {
      if (mounted) {
        ReactDOM.render(React.createElement(TestComponent), container);
      }
    },
    unmount: () => {
      mounted = false;
      ReactDOM.unmountComponentAtNode(container);
    }
  };
}

// Simple act function
function act(callback: () => void | Promise<void>) {
  return Promise.resolve(callback());
}

// Simple waitFor function
function waitFor(callback: () => boolean | void, options: { timeout?: number } = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = options.timeout || 1000;
    const start = Date.now();
    
    function check() {
      try {
        const result = callback();
        if (result !== false) {
          resolve();
          return;
        }
      } catch (error) {
        // Continue waiting
      }
      
      if (Date.now() - start > timeout) {
        reject(new Error('waitFor timeout'));
        return;
      }
      
      setTimeout(check, 10);
    }
    
    check();
  });
}

// Mock performance for testing
const mockPerformance = {
  now: jest.fn(() => Date.now())
};
Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

describe('useRepositoryData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic functionality', () => {
    it('should fetch data successfully', async () => {
      const mockData = { id: '1', name: 'Test Tournament' };
      const mockRepositoryMethod = jest.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [])
      );

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
      expect(mockRepositoryMethod).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch errors', async () => {
      const mockError = new Error('Fetch failed');
      const mockRepositoryMethod = jest.fn().mockRejectedValue(mockError);

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [])
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toEqual(mockError);
    });

    it('should skip initial fetch when skip option is true', () => {
      const mockRepositoryMethod = jest.fn().mockResolvedValue({ id: '1' });

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [], { skip: true })
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(mockRepositoryMethod).not.toHaveBeenCalled();
    });
  });

  describe('Refresh functionality', () => {
    it('should refresh data when refresh is called', async () => {
      const mockData1 = { id: '1', name: 'First' };
      const mockData2 = { id: '1', name: 'Updated' };
      const mockRepositoryMethod = jest.fn()
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2);

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [])
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(result.current.data).toEqual(mockData1);

      // Trigger refresh
      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.data).toEqual(mockData2);
      expect(mockRepositoryMethod).toHaveBeenCalledTimes(2);
    });

    it('should handle refresh errors', async () => {
      const mockData = { id: '1', name: 'Test' };
      const mockError = new Error('Refresh failed');
      const mockRepositoryMethod = jest.fn()
        .mockResolvedValueOnce(mockData)
        .mockRejectedValueOnce(mockError);

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [])
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Trigger refresh
      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('Retry functionality', () => {
    it('should retry failed requests according to retryCount', async () => {
      const mockError = new Error('Network error');
      const mockRepositoryMethod = jest.fn()
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({ id: '1', success: true });

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [], { retryCount: 2, retryDelay: 100 })
      );

      // Fast-forward through retries
      await act(async () => {
        jest.advanceTimersByTime(300); // Allow for retry delays
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockRepositoryMethod).toHaveBeenCalledTimes(3);
      expect(result.current.data).toEqual({ id: '1', success: true });
      expect(result.current.error).toBeNull();
    });

    it('should fail after exhausting all retries', async () => {
      const mockError = new Error('Persistent error');
      const mockRepositoryMethod = jest.fn().mockRejectedValue(mockError);

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [], { retryCount: 2, retryDelay: 100 })
      );

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockRepositoryMethod).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(result.current.error).toEqual(mockError);
    });

    it('should allow manual retry after failure', async () => {
      const mockError = new Error('Initial error');
      const mockData = { id: '1', recovered: true };
      const mockRepositoryMethod = jest.fn()
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockData);

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [], { retryCount: 0 })
      );

      // Wait for initial failure
      await waitFor(() => {
        expect(result.current.error).toEqual(mockError);
      });

      // Manual retry
      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Polling functionality', () => {
    it('should poll data at specified intervals', async () => {
      const mockData1 = { id: '1', count: 1 };
      const mockData2 = { id: '1', count: 2 };
      const mockRepositoryMethod = jest.fn()
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2);

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [], { pollingInterval: 1000 })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(result.current.data).toEqual(mockData1);

      // Advance time to trigger polling
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData2);
      });

      expect(mockRepositoryMethod).toHaveBeenCalledTimes(2);
    });

    it('should not poll when loading', async () => {
      let resolvePromise: (value: any) => void;
      const mockPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      const mockRepositoryMethod = jest.fn().mockReturnValue(mockPromise);

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [], { pollingInterval: 500 })
      );

      expect(result.current.loading).toBe(true);

      // Advance time while still loading
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should not trigger additional calls while loading
      expect(mockRepositoryMethod).toHaveBeenCalledTimes(1);

      // Resolve the initial promise
      act(() => {
        resolvePromise!({ id: '1' });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Cache metadata', () => {
    it('should detect cache hits from repository response', async () => {
      const mockDataWithCache = { id: '1', name: 'Test', source: 'cache' };
      const mockRepositoryMethod = jest.fn().mockResolvedValue(mockDataWithCache);

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [])
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.cacheHit).toBe(true);
    });

    it('should track last updated timestamp', async () => {
      const mockData = { id: '1', name: 'Test' };
      const mockRepositoryMethod = jest.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [])
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.lastUpdated).toBeInstanceOf(Date);
      expect(result.current.lastUpdated!.getTime()).toBeGreaterThan(Date.now() - 1000);
    });
  });

  describe('Dependency changes', () => {
    it('should refetch when dependencies change', async () => {
      const mockData1 = { id: '1', name: 'First' };
      const mockData2 = { id: '2', name: 'Second' };
      const mockRepositoryMethod = jest.fn()
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2);

      const { result, rerender } = renderHook(
        ({ deps }) => useRepositoryData(mockRepositoryMethod, deps),
        { initialProps: { deps: ['dep1'] } }
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(result.current.data).toEqual(mockData1);

      // Change dependencies
      rerender({ deps: ['dep2'] });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData2);
      });

      expect(mockRepositoryMethod).toHaveBeenCalledTimes(2);
    });
  });

  describe('useRepositoryDataWithRefresh', () => {
    it('should auto-refresh when dependencies change', async () => {
      const mockData1 = { id: '1', name: 'First' };
      const mockData2 = { id: '1', name: 'Updated' };
      const mockRepositoryMethod = jest.fn()
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2);

      let tournamentId = '1';
      const { result, rerender } = renderHook(() =>
        useRepositoryDataWithRefresh(
          () => mockRepositoryMethod(tournamentId),
          [tournamentId]
        )
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(result.current.data).toEqual(mockData1);

      // Change dependency
      tournamentId = '2';
      rerender();

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData2);
      });

      expect(mockRepositoryMethod).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup intervals and timeouts on unmount', () => {
      const mockRepositoryMethod = jest.fn().mockResolvedValue({ id: '1' });
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [], { pollingInterval: 1000 })
      );

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should not update state after unmount', async () => {
      let resolvePromise: (value: any) => void;
      const mockPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      const mockRepositoryMethod = jest.fn().mockReturnValue(mockPromise);

      const { result, unmount } = renderHook(() =>
        useRepositoryData(mockRepositoryMethod, [])
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
});