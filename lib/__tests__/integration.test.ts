/**
 * @fileoverview TanStack Query Integration Tests
 * End-to-end testing of the complete TanStack Query setup
 */

import { QueryClient } from '@tanstack/react-query';
import { queryClient, queryKeys, cacheStrategies, createQueryOptions, invalidateQueries } from '../queryClient';
import { asyncStoragePersister, migrateAsyncStorageData } from '../queryPersistence';
import { queryPerformanceMonitor, enablePerformanceMonitoring, performanceValidator } from '../queryPerformance';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('TanStack Query Integration', () => {
  beforeEach(() => {
    queryClient.clear();
    queryPerformanceMonitor.clear();
    jest.clearAllMocks();
    mockAsyncStorage.getAllKeys.mockResolvedValue([]);
  });

  describe('Complete Setup Integration', () => {
    test('should have all components properly configured', () => {
      // Query client should be configured
      expect(queryClient).toBeInstanceOf(QueryClient);
      
      // Cache strategies should be defined
      expect(cacheStrategies.live).toBeDefined();
      expect(cacheStrategies.historical).toBeDefined();
      expect(cacheStrategies.static).toBeDefined();
      
      // Query keys should be structured
      expect(queryKeys.tournaments.all).toEqual(['tournaments']);
      expect(queryKeys.matches.all).toEqual(['matches']);
      expect(queryKeys.referees.all).toEqual(['referees']);
      
      // Persistence should be configured
      expect(asyncStoragePersister).toBeDefined();
      
      // Performance monitoring should be available
      expect(queryPerformanceMonitor).toBeDefined();
      expect(typeof enablePerformanceMonitoring).toBe('function');
    });

    test('should enable performance monitoring without errors', () => {
      expect(() => enablePerformanceMonitoring(queryClient)).not.toThrow();
    });

    test('should handle cache migration gracefully', async () => {
      mockAsyncStorage.getAllKeys.mockResolvedValue([
        'cache_tournaments',
        'tournament_123',
        'matches_456'
      ]);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await migrateAsyncStorageData();
      
      expect(mockAsyncStorage.getAllKeys).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found 3 legacy cache keys')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Query Execution with Performance Tracking', () => {
    test('should execute queries with different cache strategies', async () => {
      // Enable performance monitoring
      enablePerformanceMonitoring(queryClient);

      // Mock query functions
      const liveQueryFn = jest.fn().mockResolvedValue({ data: 'live' });
      const historicalQueryFn = jest.fn().mockResolvedValue({ data: 'historical' });
      const staticQueryFn = jest.fn().mockResolvedValue({ data: 'static' });

      // Create queries with different strategies
      const liveOptions = createQueryOptions.live(['live'], liveQueryFn);
      const historicalOptions = createQueryOptions.historical(['historical'], historicalQueryFn);
      const staticOptions = createQueryOptions.static(['static'], staticQueryFn);

      // Validate query options
      expect(liveOptions.staleTime).toBe(cacheStrategies.live.staleTime);
      expect(liveOptions.refetchInterval).toBe(cacheStrategies.live.refetchInterval);
      
      expect(historicalOptions.staleTime).toBe(cacheStrategies.historical.staleTime);
      expect(historicalOptions.refetchInterval).toBe(cacheStrategies.historical.refetchInterval);
      
      expect(staticOptions.staleTime).toBe(cacheStrategies.static.staleTime);
      expect(staticOptions.refetchInterval).toBe(cacheStrategies.static.refetchInterval);

      // Execute queries
      const liveResult = await queryClient.fetchQuery(liveOptions);
      const historicalResult = await queryClient.fetchQuery(historicalOptions);
      const staticResult = await queryClient.fetchQuery(staticOptions);

      expect(liveResult).toEqual({ data: 'live' });
      expect(historicalResult).toEqual({ data: 'historical' });
      expect(staticResult).toEqual({ data: 'static' });

      expect(liveQueryFn).toHaveBeenCalled();
      expect(historicalQueryFn).toHaveBeenCalled();
      expect(staticQueryFn).toHaveBeenCalled();
    });

    test('should track performance across different query types', () => {
      // Manually track different query types
      queryPerformanceMonitor.trackQuery(
        queryKeys.tournaments.list({ season: 2024 }),
        1000,
        1100,
        { tournaments: [] }
      );

      queryPerformanceMonitor.trackQuery(
        queryKeys.matches.list({ tournamentCode: 'TEST' }),
        2000,
        2150,
        { matches: [] }
      );

      queryPerformanceMonitor.trackQuery(
        queryKeys.referees.list(),
        3000,
        3050,
        { referees: [] }
      );

      // Validate metrics
      const tournamentMetrics = queryPerformanceMonitor.getMetrics(
        queryKeys.tournaments.list({ season: 2024 })
      );
      const matchMetrics = queryPerformanceMonitor.getMetrics(
        queryKeys.matches.list({ tournamentCode: 'TEST' })
      );
      const refereeMetrics = queryPerformanceMonitor.getMetrics(
        queryKeys.referees.list()
      );

      expect(tournamentMetrics?.duration).toBe(100);
      expect(matchMetrics?.duration).toBe(150);
      expect(refereeMetrics?.duration).toBe(50);

      // Validate performance
      const allMetrics = queryPerformanceMonitor.getAllMetrics();
      expect(allMetrics).toHaveLength(3);
    });
  });

  describe('Cache Invalidation and Management', () => {
    test('should support cache invalidation', () => {
      const spy = jest.spyOn(queryClient, 'invalidateQueries');

      // Test invalidation functions
      invalidateQueries.tournaments();
      expect(spy).toHaveBeenCalledWith({ queryKey: ['tournaments'] });

      invalidateQueries.matches();
      expect(spy).toHaveBeenCalledWith({ queryKey: ['matches'] });

      invalidateQueries.referees();
      expect(spy).toHaveBeenCalledWith({ queryKey: ['referees'] });

      spy.mockRestore();
    });

    test('should support manual cache cleanup', () => {
      // Add some test queries to cache
      queryClient.setQueryData(['old-tournament'], { data: 'old' });
      queryClient.setQueryData(['new-tournament'], { data: 'new' });

      // Verify queries are in cache
      expect(queryClient.getQueryData(['old-tournament'])).toEqual({ data: 'old' });
      expect(queryClient.getQueryData(['new-tournament'])).toEqual({ data: 'new' });

      // Clear cache
      queryClient.clear();

      // Verify queries are removed
      expect(queryClient.getQueryData(['old-tournament'])).toBeUndefined();
      expect(queryClient.getQueryData(['new-tournament'])).toBeUndefined();
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle query errors gracefully', async () => {
      const errorQueryFn = jest.fn().mockRejectedValue(new Error('Query failed'));
      
      try {
        await queryClient.fetchQuery({
          queryKey: ['error-test'],
          queryFn: errorQueryFn,
          retry: 0, // Don't retry for this test
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Query failed');
      }

      expect(errorQueryFn).toHaveBeenCalled();
    });

    test('should handle persistence errors gracefully', async () => {
      mockAsyncStorage.getAllKeys.mockRejectedValue(new Error('Storage error'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Should not throw
      await migrateAsyncStorageData();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'AsyncStorage migration check failed:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Validation Integration', () => {
    test('should validate overall system performance', () => {
      // Add various performance metrics
      queryPerformanceMonitor.trackQuery(['fast-query'], 1000, 1050, { data: 'small' });
      queryPerformanceMonitor.trackQuery(['medium-query'], 2000, 2100, { data: 'medium'.repeat(100) });
      queryPerformanceMonitor.trackQuery(['slow-query'], 3000, 3300, { data: 'large'.repeat(1000) });

      const validation = performanceValidator.validateAllQueries();
      
      expect(validation.totalQueries).toBe(3);
      expect(validation.totalQueries).toBe(validation.passedQueries + validation.failedQueries);
      
      const report = performanceValidator.generateReport();
      expect(report).toContain('TanStack Query Performance Report');
      expect(report).toContain('Total Queries: 3');
    });

    test('should provide performance insights', () => {
      // Add queries with different performance characteristics
      queryPerformanceMonitor.trackQuery(['tournaments'], 1000, 1100, { count: 50 });
      queryPerformanceMonitor.trackQuery(['matches'], 2000, 2200, { count: 200 });
      queryPerformanceMonitor.trackQuery(['referees'], 3000, 3080, { count: 20 });

      const allMetrics = queryPerformanceMonitor.getAllMetrics();
      expect(allMetrics).toHaveLength(3);

      // Should have different performance characteristics
      const sortedByDuration = allMetrics.sort((a, b) => a.duration - b.duration);
      expect(sortedByDuration[0].duration).toBeLessThan(sortedByDuration[2].duration);
    });
  });

  describe('TypeScript Integration', () => {
    test('should provide proper TypeScript types', () => {
      // Query keys should have proper typing
      const tournamentKey: readonly unknown[] = queryKeys.tournaments.all;
      const matchKey: readonly unknown[] = queryKeys.matches.all;
      const refereeKey: readonly unknown[] = queryKeys.referees.all;

      expect(Array.isArray(tournamentKey)).toBe(true);
      expect(Array.isArray(matchKey)).toBe(true);
      expect(Array.isArray(refereeKey)).toBe(true);

      // Query options should be typed
      const options = createQueryOptions.live(['test'], async () => ({ data: 'test' }));
      expect(options.queryKey).toEqual(['test']);
      expect(typeof options.queryFn).toBe('function');
    });

    test('should support query parameter typing', () => {
      const tournamentParams = { season: 2024, gender: 'M' as const };
      const matchParams = { tournamentCode: 'TEST', eventId: 123 };
      const refereeParams = { tournamentCode: 'TEST' };

      const tournamentKey = queryKeys.tournaments.list(tournamentParams);
      const matchKey = queryKeys.matches.list(matchParams);
      const refereeKey = queryKeys.referees.list(refereeParams);

      expect(tournamentKey).toEqual(['tournaments', 'list', tournamentParams]);
      expect(matchKey).toEqual(['matches', 'list', matchParams]);
      expect(refereeKey).toEqual(['referees', 'list', refereeParams]);
    });
  });

  describe('Real-world Scenario Simulation', () => {
    test('should handle typical app initialization flow', async () => {
      // 1. Enable performance monitoring
      enablePerformanceMonitoring(queryClient);

      // 2. Migrate existing data
      mockAsyncStorage.getAllKeys.mockResolvedValue(['tournament_old']);
      await migrateAsyncStorageData();

      // 3. Load initial data with different strategies
      const initialQueries = [
        createQueryOptions.live(
          queryKeys.tournaments.list({ season: 2024 }),
          async () => ({ tournaments: [] })
        ),
        createQueryOptions.static(
          queryKeys.referees.list(),
          async () => ({ referees: [] })
        ),
      ];

      // Execute initial queries
      const results = await Promise.all(
        initialQueries.map(options => queryClient.fetchQuery(options))
      );

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ tournaments: [] });
      expect(results[1]).toEqual({ referees: [] });

      // 4. Validate system performance
      const performanceReport = performanceValidator.generateReport();
      expect(performanceReport).toContain('Performance Report');

      // 5. Cleanup
      queryClient.clear();
      queryPerformanceMonitor.clear();
    });

    test('should handle network failure scenarios', async () => {
      // Enable monitoring
      enablePerformanceMonitoring(queryClient);

      // Create a query that simulates network failure
      const networkErrorQuery = createQueryOptions.live(
        ['network-error'],
        async () => {
          throw new Error('Network error');
        }
      );

      // Should handle network errors gracefully
      await expect(
        queryClient.fetchQuery({ ...networkErrorQuery, retry: 0 })
      ).rejects.toThrow('Network error');

      // Performance monitoring should track the failed query for analysis
      expect(queryPerformanceMonitor.getAllMetrics()).toHaveLength(1); // Tracks failed query for monitoring
    });
  });
});