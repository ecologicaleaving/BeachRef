import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAnalyticsDashboard, validateAnalyticsPerformance } from '../useAnalyticsDashboard';
import { useRefereeAnalytics } from '../useRefereeAnalytics';
import { queryKeys } from '../../lib/queryClient';

// Mock the referee analytics hook
jest.mock('../useRefereeAnalytics');
const mockUseRefereeAnalytics = useRefereeAnalytics as jest.MockedFunction<typeof useRefereeAnalytics>;

// Mock ErrorLogger
jest.mock('../../services/ErrorLogger', () => ({
  ErrorLogger: {
    getInstance: () => ({
      logError: jest.fn(),
    }),
  },
}));

// Mock query performance monitor
jest.mock('../../lib/queryPerformance', () => ({
  queryPerformanceMonitor: {
    trackQuery: jest.fn(),
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAnalyticsDashboard', () => {
  const mockTimeRange = {
    start: '2025-01-01',
    end: '2025-01-09',
  };

  const mockRefereeData = [
    {
      referee_id: '1',
      referee_name: 'Test Referee 1',
      federation_code: 'FIVB',
      total_assignments: 10,
      first_referee_count: 6,
      second_referee_count: 4,
      challenge_referee_count: 0,
      completion_rate: 95,
      tournaments_worked: ['TOURNAMENT_1', 'TOURNAMENT_2'],
      performance_score: 88,
      workload_trend: 'stable' as const,
      geographic_coverage: ['Europe'],
      avg_matches_per_day: 2.5,
    },
    {
      referee_id: '2',
      referee_name: 'Test Referee 2',
      federation_code: 'FIVB',
      total_assignments: 8,
      first_referee_count: 5,
      second_referee_count: 3,
      challenge_referee_count: 0,
      completion_rate: 92,
      tournaments_worked: ['TOURNAMENT_2'],
      performance_score: 82,
      workload_trend: 'increasing' as const,
      geographic_coverage: ['Europe'],
      avg_matches_per_day: 1.8,
    },
  ];

  const mockRefereeAnalyticsResult = {
    data: mockRefereeData,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    performance: { queryTime: 250 },
    source: 'database' as const,
    refreshAnalytics: jest.fn(),
    aggregatePerformance: jest.fn(),
    exportAnalytics: jest.fn(),
    calculateTrends: jest.fn(),
    getAvailableTemplates: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRefereeAnalytics.mockReturnValue(mockRefereeAnalyticsResult);
  });

  describe('Hook Initialization', () => {
    it('initializes with default configuration', async () => {
      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.status.isRealTimeEnabled).toBe(true);
      expect(result.current.status.refreshInterval).toBe(30000); // 30 seconds
      expect(result.current.performance).toBeDefined();
    });

    it('applies custom configuration correctly', async () => {
      const customConfig = {
        enableRealTimeUpdates: false,
        refreshInterval: 60000, // 1 minute
        enablePerformanceMonitoring: false,
        autoRefresh: false,
        cacheStrategy: 'static' as const,
      };

      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange, customConfig),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.status.isRealTimeEnabled).toBe(false);
        expect(result.current.status.refreshInterval).toBe(60000);
      });
    });
  });

  describe('Data Aggregation', () => {
    it('aggregates referee analytics data correctly', async () => {
      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const dashboardData = result.current.data!;
      
      expect(dashboardData.refereeAnalytics).toEqual(mockRefereeData);
      expect(dashboardData.tournamentAnalytics).toBeNull(); // Not yet implemented
      expect(dashboardData.source).toBe('database');
      expect(dashboardData.performance.queryTime).toBe(250);
    });

    it('handles empty referee data', async () => {
      mockUseRefereeAnalytics.mockReturnValue({
        ...mockRefereeAnalyticsResult,
        data: [],
      });

      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.data!.refereeAnalytics).toEqual([]);
    });

    it('tracks performance metrics correctly', async () => {
      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.performance).toBeDefined();
      });

      const performance = result.current.performance;
      expect(performance.queryTime).toBeGreaterThanOrEqual(0);
      expect(performance.totalQueries).toBeGreaterThanOrEqual(0);
      expect(performance.averageQueryTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Real-time Updates', () => {
    it('configures real-time updates with correct interval', async () => {
      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange, {
          enableRealTimeUpdates: true,
          refreshInterval: 15000, // 15 seconds
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.status.isRealTimeEnabled).toBe(true);
        expect(result.current.status.refreshInterval).toBe(15000);
      });
    });

    it('disables real-time updates when configured', async () => {
      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange, {
          enableRealTimeUpdates: false,
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.status.isRealTimeEnabled).toBe(false);
      });
    });

    it('toggles real-time updates through actions', async () => {
      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.status.isRealTimeEnabled).toBe(true);
      });

      // Toggle real-time updates
      result.current.actions.toggleRealTimeUpdates();

      await waitFor(() => {
        expect(result.current.status.isRealTimeEnabled).toBe(false);
      });
    });

    it('updates refresh interval through actions', async () => {
      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.status.refreshInterval).toBe(30000);
      });

      // Update refresh interval
      result.current.actions.updateRefreshInterval(60000);

      await waitFor(() => {
        expect(result.current.status.refreshInterval).toBe(60000);
      });
    });
  });

  describe('Actions', () => {
    it('provides refresh action', async () => {
      const mockRefreshAnalytics = jest.fn().mockResolvedValue(undefined);
      mockUseRefereeAnalytics.mockReturnValue({
        ...mockRefereeAnalyticsResult,
        refreshAnalytics: mockRefreshAnalytics,
      });

      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.actions.refresh).toBeDefined();
      });

      // Trigger refresh
      await result.current.actions.refresh();

      expect(mockRefreshAnalytics).toHaveBeenCalled();
    });

    it('provides cache clear action', async () => {
      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.actions.clearCache).toBeDefined();
      });

      // Should not throw when clearing cache
      await expect(result.current.actions.clearCache()).resolves.toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('handles referee analytics errors gracefully', async () => {
      const error = new Error('Referee analytics failed');
      mockUseRefereeAnalytics.mockReturnValue({
        ...mockRefereeAnalyticsResult,
        error,
        data: undefined,
      });

      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.error).toBe(error);
      });
    });

    it('handles refresh errors gracefully', async () => {
      const refreshError = new Error('Refresh failed');
      const mockRefreshAnalytics = jest.fn().mockRejectedValue(refreshError);
      
      mockUseRefereeAnalytics.mockReturnValue({
        ...mockRefereeAnalyticsResult,
        refreshAnalytics: mockRefreshAnalytics,
      });

      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.actions.refresh).toBeDefined();
      });

      // Refresh should handle errors without crashing
      await expect(result.current.actions.refresh()).rejects.toThrow('Refresh failed');
    });
  });

  describe('Loading States', () => {
    it('shows loading state when referee analytics is loading', async () => {
      mockUseRefereeAnalytics.mockReturnValue({
        ...mockRefereeAnalyticsResult,
        isLoading: true,
        data: undefined,
      });

      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
    });

    it('shows refreshing state during manual refresh', async () => {
      const mockRefreshAnalytics = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      mockUseRefereeAnalytics.mockReturnValue({
        ...mockRefereeAnalyticsResult,
        refreshAnalytics: mockRefreshAnalytics,
      });

      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });

      // Start refresh
      const refreshPromise = result.current.actions.refresh();

      // Should show refreshing state
      expect(result.current.isRefreshing).toBe(true);

      // Wait for refresh completion
      await refreshPromise;

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });
    });
  });

  describe('Performance Validation', () => {
    it('validates performance metrics correctly', () => {
      // Test excellent performance (< 1s dashboard, < 200ms queries)
      const excellentPerformance = { queryTime: 500, averageQueryTime: 150 };
      const result = validateAnalyticsPerformance(excellentPerformance);
      
      expect(result.dashboardLoadStatus).toBe('excellent');
      expect(result.queryPerformanceStatus).toBe('excellent');
      expect(result.meetingTargets).toBe(true);

      // Test good performance (1-2s dashboard, 200-500ms queries)
      const goodPerformance = { queryTime: 1500, averageQueryTime: 300 };
      const goodResult = validateAnalyticsPerformance(goodPerformance);
      
      expect(goodResult.dashboardLoadStatus).toBe('good');
      expect(goodResult.queryPerformanceStatus).toBe('good');
      expect(goodResult.meetingTargets).toBe(true);

      // Test slow performance (> 2s dashboard, > 500ms queries)
      const slowPerformance = { queryTime: 3000, averageQueryTime: 800 };
      const slowResult = validateAnalyticsPerformance(slowPerformance);
      
      expect(slowResult.dashboardLoadStatus).toBe('slow');
      expect(slowResult.queryPerformanceStatus).toBe('slow');
      expect(slowResult.meetingTargets).toBe(false);
    });

    it('meets Epic 4 performance targets', async () => {
      // Mock good performance data
      mockUseRefereeAnalytics.mockReturnValue({
        ...mockRefereeAnalyticsResult,
        performance: { queryTime: 400 }, // < 500ms target
      });

      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.performance.queryTime).toBeLessThan(500);
      });

      // Validate against Epic 4 targets
      const validation = validateAnalyticsPerformance(result.current.performance);
      expect(validation.meetingTargets).toBe(true);
    });
  });

  describe('Integration with Query Keys', () => {
    it('uses correct query keys for analytics dashboard', async () => {
      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper: createWrapper() }
      );

      // Verify query keys are structured correctly
      const expectedQueryKey = queryKeys.analytics.dashboard({ 
        timeRange: mockTimeRange, 
        config: expect.any(Object) 
      });
      
      expect(expectedQueryKey).toEqual([
        'analytics', 
        'dashboard', 
        expect.any(Object)
      ]);
    });
  });
});