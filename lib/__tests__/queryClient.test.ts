/**
 * @fileoverview Tests for TanStack Query Client Configuration
 * Testing QueryClient setup and configuration patterns
 */

import { QueryClient } from '@tanstack/react-query';
import { 
  queryClient, 
  queryKeys, 
  invalidateQueries,
  cacheStrategies,
  createQueryOptions,
  backgroundRefetch,
  cacheGarbageCollection
} from '../queryClient';

describe('QueryClient Configuration', () => {
  afterEach(() => {
    // Clear query client after each test
    queryClient.clear();
  });

  describe('queryClient', () => {
    test('should be properly configured', () => {
      expect(queryClient).toBeInstanceOf(QueryClient);
      
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.queries?.staleTime).toBe(30 * 1000); // 30 seconds
      expect(defaultOptions.queries?.gcTime).toBe(60 * 60 * 1000); // 1 hour
      expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
      expect(defaultOptions.queries?.refetchOnMount).toBe(true);
      expect(defaultOptions.queries?.refetchOnReconnect).toBe(true);
      expect(defaultOptions.queries?.retry).toBe(3);
    });

    test('should have proper mutation configuration', () => {
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.mutations?.retry).toBe(1);
    });

    test('should handle retry delay correctly', () => {
      const defaultOptions = queryClient.getDefaultOptions();
      const retryDelay = defaultOptions.queries?.retryDelay as Function;
      
      expect(typeof retryDelay).toBe('function');
      expect(retryDelay(0)).toBe(1000); // First retry: 1s
      expect(retryDelay(1)).toBe(2000); // Second retry: 2s
      expect(retryDelay(5)).toBe(30000); // Max retry: 30s
    });
  });

  describe('queryKeys', () => {
    test('should generate proper tournament query keys', () => {
      expect(queryKeys.tournaments.all).toEqual(['tournaments']);
      expect(queryKeys.tournaments.lists()).toEqual(['tournaments', 'list']);
      expect(queryKeys.tournaments.list({ season: 2024, gender: 'M' }))
        .toEqual(['tournaments', 'list', { season: 2024, gender: 'M' }]);
      expect(queryKeys.tournaments.detail('tournament123'))
        .toEqual(['tournaments', 'detail', 'tournament123']);
    });

    test('should generate proper match query keys', () => {
      expect(queryKeys.matches.all).toEqual(['matches']);
      expect(queryKeys.matches.lists()).toEqual(['matches', 'list']);
      expect(queryKeys.matches.list({ tournamentCode: 'FIVB2024M001' }))
        .toEqual(['matches', 'list', { tournamentCode: 'FIVB2024M001' }]);
      expect(queryKeys.matches.byTournament('tournament123'))
        .toEqual(['matches', 'tournament', 'tournament123']);
    });

    test('should generate proper referee query keys', () => {
      expect(queryKeys.referees.all).toEqual(['referees']);
      expect(queryKeys.referees.lists()).toEqual(['referees', 'list']);
      expect(queryKeys.referees.list({ tournamentCode: 'FIVB2024M001' }))
        .toEqual(['referees', 'list', { tournamentCode: 'FIVB2024M001' }]);
      expect(queryKeys.referees.assignments()).toEqual(['referees', 'assignments']);
    });
  });

  describe('invalidateQueries', () => {
    test('should provide invalidation methods', () => {
      expect(typeof invalidateQueries.tournaments).toBe('function');
      expect(typeof invalidateQueries.matches).toBe('function');
      expect(typeof invalidateQueries.referees).toBe('function');
      expect(typeof invalidateQueries.all).toBe('function');
    });

    test('should call queryClient.invalidateQueries with correct parameters', () => {
      const spy = jest.spyOn(queryClient, 'invalidateQueries');
      
      invalidateQueries.tournaments();
      expect(spy).toHaveBeenCalledWith({ queryKey: ['tournaments'] });
      
      invalidateQueries.matches();
      expect(spy).toHaveBeenCalledWith({ queryKey: ['matches'] });
      
      spy.mockRestore();
    });
  });

  describe('Cache Strategies', () => {
    test('should provide live data strategy', () => {
      expect(cacheStrategies.live.staleTime).toBe(30 * 1000); // 30 seconds
      expect(cacheStrategies.live.gcTime).toBe(5 * 60 * 1000); // 5 minutes
      expect(cacheStrategies.live.refetchInterval).toBe(30 * 1000); // 30 seconds
      expect(cacheStrategies.live.refetchOnMount).toBe(true);
      expect(cacheStrategies.live.refetchOnReconnect).toBe(true);
    });

    test('should provide historical data strategy', () => {
      expect(cacheStrategies.historical.staleTime).toBe(12 * 60 * 60 * 1000); // 12 hours
      expect(cacheStrategies.historical.gcTime).toBe(24 * 60 * 60 * 1000); // 24 hours
      expect(cacheStrategies.historical.refetchInterval).toBe(false);
      expect(cacheStrategies.historical.refetchOnMount).toBe(false);
      expect(cacheStrategies.historical.refetchOnReconnect).toBe(false);
    });

    test('should provide static data strategy', () => {
      expect(cacheStrategies.static.staleTime).toBe(60 * 60 * 1000); // 1 hour
      expect(cacheStrategies.static.gcTime).toBe(24 * 60 * 60 * 1000); // 24 hours
      expect(cacheStrategies.static.refetchInterval).toBe(false);
      expect(cacheStrategies.static.refetchOnMount).toBe(false);
      expect(cacheStrategies.static.refetchOnReconnect).toBe(true);
    });
  });

  describe('createQueryOptions', () => {
    const mockQueryKey = ['test', 'key'];
    const mockQueryFn = jest.fn().mockResolvedValue('test data');

    test('should create live query options', () => {
      const options = createQueryOptions.live(mockQueryKey, mockQueryFn);
      
      expect(options.queryKey).toBe(mockQueryKey);
      expect(options.queryFn).toBe(mockQueryFn);
      expect(options.staleTime).toBe(cacheStrategies.live.staleTime);
      expect(options.refetchInterval).toBe(cacheStrategies.live.refetchInterval);
    });

    test('should create historical query options', () => {
      const options = createQueryOptions.historical(mockQueryKey, mockQueryFn);
      
      expect(options.queryKey).toBe(mockQueryKey);
      expect(options.queryFn).toBe(mockQueryFn);
      expect(options.staleTime).toBe(cacheStrategies.historical.staleTime);
      expect(options.refetchInterval).toBe(cacheStrategies.historical.refetchInterval);
    });

    test('should create static query options', () => {
      const options = createQueryOptions.static(mockQueryKey, mockQueryFn);
      
      expect(options.queryKey).toBe(mockQueryKey);
      expect(options.queryFn).toBe(mockQueryFn);
      expect(options.staleTime).toBe(cacheStrategies.static.staleTime);
      expect(options.refetchInterval).toBe(cacheStrategies.static.refetchInterval);
    });

    test('should create adaptive query options with default live strategy', () => {
      const options = createQueryOptions.adaptive(mockQueryKey, mockQueryFn);
      
      expect(options.queryKey).toBe(mockQueryKey);
      expect(options.queryFn).toBe(mockQueryFn);
      expect(options.staleTime).toBe(cacheStrategies.live.staleTime);
    });

    test('should create adaptive query options with specified strategy', () => {
      const options = createQueryOptions.adaptive(mockQueryKey, mockQueryFn, 'historical');
      
      expect(options.staleTime).toBe(cacheStrategies.historical.staleTime);
    });
  });

  describe('backgroundRefetch', () => {
    test('should provide background refetch utilities', () => {
      expect(typeof backgroundRefetch.enableForActiveTournaments).toBe('function');
      expect(typeof backgroundRefetch.enableForLiveMatches).toBe('function');
      expect(typeof backgroundRefetch.disableForCompleted).toBe('function');
    });

    test('should handle empty arrays gracefully', () => {
      expect(() => backgroundRefetch.enableForActiveTournaments([])).not.toThrow();
      expect(() => backgroundRefetch.enableForLiveMatches([])).not.toThrow();
    });
  });

  describe('cacheGarbageCollection', () => {
    test('should provide cache cleanup utilities', () => {
      expect(typeof cacheGarbageCollection.removeOldTournaments).toBe('function');
      expect(typeof cacheGarbageCollection.removeOldMatches).toBe('function');
      expect(typeof cacheGarbageCollection.performCleanup).toBe('function');
    });

    test('should use default cleanup times', () => {
      // Should not throw when called with no parameters
      expect(() => cacheGarbageCollection.removeOldTournaments()).not.toThrow();
      expect(() => cacheGarbageCollection.removeOldMatches()).not.toThrow();
      expect(() => cacheGarbageCollection.performCleanup()).not.toThrow();
    });
  });

  describe('Performance Configuration', () => {
    test('should have reasonable default cache times', () => {
      const defaultOptions = queryClient.getDefaultOptions();
      
      // staleTime should be short enough for live data
      expect(defaultOptions.queries?.staleTime).toBeLessThanOrEqual(60 * 1000);
      
      // gcTime should be long enough to avoid excessive re-fetching
      expect(defaultOptions.queries?.gcTime).toBeGreaterThanOrEqual(5 * 60 * 1000);
    });

    test('should have exponential backoff retry strategy', () => {
      const defaultOptions = queryClient.getDefaultOptions();
      const retryDelay = defaultOptions.queries?.retryDelay as Function;
      
      // Should have exponential backoff pattern
      expect(retryDelay(0)).toBeLessThan(retryDelay(1));
      expect(retryDelay(1)).toBeLessThan(retryDelay(2));
      
      // Should have maximum delay cap
      expect(retryDelay(10)).toBe(30000);
    });

    test('should have different strategies for different data types', () => {
      // Live data should refetch frequently
      expect(cacheStrategies.live.staleTime).toBeLessThan(cacheStrategies.historical.staleTime);
      expect(cacheStrategies.live.gcTime).toBeLessThan(cacheStrategies.historical.gcTime);
      
      // Historical data should not refetch automatically
      expect(cacheStrategies.historical.refetchInterval).toBe(false);
      expect(cacheStrategies.historical.refetchOnMount).toBe(false);
      
      // Static data should have longer cache but reconnect on network recovery
      expect(cacheStrategies.static.refetchOnReconnect).toBe(true);
      expect(cacheStrategies.static.refetchOnMount).toBe(false);
    });
  });
});