import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAnalyticsDashboard } from '../../hooks/useAnalyticsDashboard';
import { useAnalyticsSettings } from '../../hooks/useAnalyticsSettings';
import { AnalyticsService } from '../../services/AnalyticsService';
import { LocalStorageManager } from '../../services/LocalStorageManager';
import { queryKeys } from '../../lib/queryClient';

// Mock services
jest.mock('../../services/AnalyticsService');
jest.mock('../../services/LocalStorageManager');
jest.mock('../../services/ErrorLogger', () => ({
  ErrorLogger: {
    getInstance: () => ({
      logError: jest.fn(),
    }),
  },
}));

// Mock performance monitor
jest.mock('../../lib/queryPerformance', () => ({
  queryPerformanceMonitor: {
    trackQuery: jest.fn(),
  },
}));

// Mock referee analytics hook for integration
jest.mock('../../hooks/useRefereeAnalytics', () => ({
  useRefereeAnalytics: jest.fn().mockReturnValue({
    data: [
      {
        referee_id: '1',
        referee_name: 'Integration Test Referee',
        federation_code: 'FIVB',
        total_assignments: 15,
        first_referee_count: 10,
        second_referee_count: 5,
        challenge_referee_count: 0,
        completion_rate: 98,
        tournaments_worked: ['TOURNAMENT_1', 'TOURNAMENT_2', 'TOURNAMENT_3'],
        performance_score: 92,
        workload_trend: 'stable',
        geographic_coverage: ['Europe', 'Asia'],
        avg_matches_per_day: 3.2,
      },
    ],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    performance: { queryTime: 320 },
    source: 'database',
    refreshAnalytics: jest.fn(),
    aggregatePerformance: jest.fn(),
    exportAnalytics: jest.fn(),
    calculateTrends: jest.fn(),
    getAvailableTemplates: jest.fn(),
  }),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
        // Un test che aspetta 30 secondi per rinfrescare non sta verificando
        // niente che gli serva: sta solo tenendo vivo un timer.
        refetchInterval: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

/**
 * UN client per test, e viene distrutto.
 *
 * Prima `createWrapper()` ne creava uno nuovo a ogni chiamata — dieci volte in
 * questa suite — e nessuno veniva mai smontato: non c'era un `unmount()`, non
 * c'era un `afterEach`. Ogni client restava vivo con dentro una query che
 * `useAnalyticsDashboard` rinfresca ogni 30 secondi
 * (`enableRealTimeUpdates: true` e' il suo predefinito), e con `gcTime: 0`
 * ogni rinfresco produceva oggetti che nessuno raccoglieva.
 *
 * Esito misurato: 4 GB di heap e `FATAL ERROR: Reached heap limit` dopo sei
 * minuti. E siccome un worker che muore si porta dietro le suite che stava
 * eseguendo, questa e' la spiegazione di "tre run danno tre numeri" (#94):
 * non test instabili, ma un test che avvelena il processo — con vittime
 * diverse a ogni giro, a seconda di come jest ha distribuito il lavoro.
 */
let clientCorrente: QueryClient | null = null;

const createWrapper = () => {
  clientCorrente?.clear();
  clientCorrente = createTestQueryClient();
  const client = clientCorrente;
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
};

afterEach(() => {
  // `clear()` svuota la cache, `unmount()` ferma gli osservatori: senza il
  // secondo, gli intervalli restano accesi anche a cache vuota.
  clientCorrente?.unmount();
  clientCorrente?.clear();
  clientCorrente = null;
  jest.clearAllTimers();
});

describe('Analytics Dashboard Integration Tests', () => {
  let mockAnalyticsService: jest.Mocked<AnalyticsService>;
  let mockLocalStorageManager: jest.Mocked<LocalStorageManager>;

  const mockTimeRange = {
    start: '2025-01-01',
    end: '2025-01-09',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock AnalyticsService
    mockAnalyticsService = {
      getInstance: jest.fn(),
      aggregateRefereeAnalytics: jest.fn().mockResolvedValue([]),
      calculatePerformanceScore: jest.fn().mockResolvedValue(85),
    } as any;
    
    (AnalyticsService.getInstance as jest.Mock).mockReturnValue(mockAnalyticsService);

    // `LocalStorageManager` NON ha `getInstance`, e non ha nemmeno
    // `getItem`/`setItem`: e' una cache TTL con API `get` / `set` / `delete`
    // su prefisso `@VisCache:`. Il test mockava tre metodi inesistenti, e la
    // riga successiva — `LocalStorageManager.getInstance as jest.Mock` —
    // chiamava `.mockReturnValue` su `undefined`, uccidendo l'intera suite
    // in `beforeEach`: 12 test falliti, tutti con lo stesso errore che non
    // c'entrava niente con cio' che volevano verificare.
    //
    // Il codice di produzione era gia' stato corretto (issue #71/#65,
    // `useAnalyticsSettings` persiste le preferenze su AsyncStorage con una
    // chiave esplicita). Era il test a essere rimasto indietro.
    mockLocalStorageManager = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
    } as any;
  });

  describe('End-to-End Analytics Dashboard Flow', () => {
    it('integrates analytics dashboard with settings and performs complete flow', async () => {
      // Mock settings data
      const mockSettings = {
        timeRange: mockTimeRange,
        customizations: {
          timeRange: mockTimeRange,
          showTournamentAnalytics: true,
          showRefereeAnalytics: true,
          showPerformanceMetrics: true,
          refreshInterval: 30000,
          widgetLayout: 'grid',
        },
        enableRealTimeUpdates: true,
        refreshInterval: 30000,
        theme: 'auto',
        exportFormat: 'csv',
        lastUpdated: '2025-01-09T12:00:00Z',
      };

      mockLocalStorageManager.get.mockResolvedValue(JSON.stringify(mockSettings));

      // Render both hooks
      const settingsWrapper = createWrapper();
      const dashboardWrapper = createWrapper();

      const { result: settingsResult } = renderHook(
        () => useAnalyticsSettings(),
        { wrapper: settingsWrapper }
      );

      const { result: dashboardResult } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper: dashboardWrapper }
      );

      // Wait for settings to load
      await waitFor(() => {
        expect(settingsResult.current.settings).toBeDefined();
      });

      // Wait for dashboard to load
      await waitFor(() => {
        expect(dashboardResult.current.data).toBeDefined();
      });

      // Verify integration
      expect(settingsResult.current.settings?.enableRealTimeUpdates).toBe(true);
      expect(dashboardResult.current.status.isRealTimeEnabled).toBe(true);
      expect(dashboardResult.current.status.refreshInterval).toBe(30000);
      expect(dashboardResult.current.data?.refereeAnalytics).toHaveLength(1);
    });

    it('handles settings changes affecting dashboard configuration', async () => {
      const mockSettings = {
        timeRange: mockTimeRange,
        customizations: {
          timeRange: mockTimeRange,
          showTournamentAnalytics: true,
          showRefereeAnalytics: true,
          showPerformanceMetrics: true,
          refreshInterval: 30000,
          widgetLayout: 'grid',
        },
        enableRealTimeUpdates: false, // Initially disabled
        refreshInterval: 60000,
        theme: 'auto',
        exportFormat: 'csv',
        lastUpdated: '2025-01-09T12:00:00Z',
      };

      mockLocalStorageManager.get.mockResolvedValue(JSON.stringify(mockSettings));
      mockLocalStorageManager.set.mockResolvedValue(undefined);

      const wrapper = createWrapper();

      const { result: settingsResult } = renderHook(
        () => useAnalyticsSettings(),
        { wrapper }
      );

      // Wait for settings to load
      await waitFor(() => {
        expect(settingsResult.current.settings?.enableRealTimeUpdates).toBe(false);
      });

      // Update settings to enable real-time
      await settingsResult.current.updateSettings({
        enableRealTimeUpdates: true,
        refreshInterval: 15000,
      });

      await waitFor(() => {
        expect(settingsResult.current.settings?.enableRealTimeUpdates).toBe(true);
        expect(settingsResult.current.settings?.refreshInterval).toBe(15000);
      });

      // Verify persistence
      expect(mockLocalStorageManager.set).toHaveBeenCalledWith(
        'analytics_settings',
        expect.stringContaining('"enableRealTimeUpdates":true')
      );
    });
  });

  describe('Performance Integration Tests', () => {
    it('validates end-to-end performance meets Epic 4 targets', async () => {
      const wrapper = createWrapper();

      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const performance = result.current.performance;
      
      // Epic 4 performance targets:
      // - Dashboard load time < 2 seconds
      // - Analytics queries < 500ms
      expect(performance.queryTime).toBeLessThan(500);
      expect(performance.averageQueryTime).toBeLessThan(500);
      
      // Total end-to-end load should be reasonable for mobile
      const totalLoadTime = performance.queryTime + 200; // Estimated UI rendering time
      expect(totalLoadTime).toBeLessThan(2000);
    });

    it('tracks performance metrics across multiple operations', async () => {
      const wrapper = createWrapper();

      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange, {
          enablePerformanceMonitoring: true,
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Initial load performance
      const initialPerformance = result.current.performance;
      expect(initialPerformance.totalQueries).toBeGreaterThanOrEqual(1);

      // Trigger refresh to simulate real-time update
      await result.current.actions.refresh();

      await waitFor(() => {
        const updatedPerformance = result.current.performance;
        expect(updatedPerformance.totalQueries).toBeGreaterThan(initialPerformance.totalQueries);
      });

      // Verify average query time is calculated correctly
      const finalPerformance = result.current.performance;
      expect(finalPerformance.averageQueryTime).toBeGreaterThan(0);
      expect(finalPerformance.averageQueryTime).toBeLessThan(1000); // Reasonable average
    });
  });

  describe('Real-time Updates Integration', () => {
    it('integrates real-time updates with TanStack Query patterns', async () => {
      const wrapper = createWrapper();

      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange, {
          enableRealTimeUpdates: true,
          refreshInterval: 1000, // 1 second for testing
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      expect(result.current.status.isRealTimeEnabled).toBe(true);
      expect(result.current.status.refreshInterval).toBe(1000);

      // Toggle real-time updates
      result.current.actions.toggleRealTimeUpdates();

      await waitFor(() => {
        expect(result.current.status.isRealTimeEnabled).toBe(false);
      });

      // Re-enable with different interval
      result.current.actions.updateRefreshInterval(5000);
      result.current.actions.toggleRealTimeUpdates();

      await waitFor(() => {
        expect(result.current.status.isRealTimeEnabled).toBe(true);
        expect(result.current.status.refreshInterval).toBe(5000);
      });
    });

    it('handles real-time update failures gracefully', async () => {
      // Mock a failing refresh
      const mockFailingRefresh = jest.fn().mockRejectedValue(new Error('Network timeout'));

      jest.doMock('../../hooks/useRefereeAnalytics', () => ({
        useRefereeAnalytics: jest.fn().mockReturnValue({
          data: [],
          isLoading: false,
          error: null,
          refetch: jest.fn(),
          performance: { queryTime: 0 },
          source: 'cache',
          refreshAnalytics: mockFailingRefresh,
          aggregatePerformance: jest.fn(),
          exportAnalytics: jest.fn(),
          calculateTrends: jest.fn(),
          getAvailableTemplates: jest.fn(),
        }),
      }));

      const wrapper = createWrapper();

      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Attempt refresh that should fail
      await expect(result.current.actions.refresh()).rejects.toThrow('Network timeout');

      // Dashboard should still be functional after error
      expect(result.current.data).toBeDefined();
      expect(result.current.error).toBeNull(); // Dashboard should handle refresh errors gracefully
    });
  });

  describe('Cache and Data Consistency Integration', () => {
    it('integrates with TanStack Query cache strategies correctly', async () => {
      const queryClient = createTestQueryClient();
      
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange, {
          cacheStrategy: 'live',
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Verify query is cached
      const cachedData = queryClient.getQueryData(
        queryKeys.analytics.dashboard({ timeRange: mockTimeRange, config: expect.any(Object) })
      );
      expect(cachedData).toBeDefined();

      // Clear cache through action
      await result.current.actions.clearCache();

      // Cache should be invalidated
      const postClearCache = queryClient.getQueryData(
        queryKeys.analytics.dashboard({ timeRange: mockTimeRange, config: expect.any(Object) })
      );
      // Query should be refetched after cache clear
      expect(postClearCache).toBeDefined();
    });

    it('maintains data consistency across multiple hook instances', async () => {
      const queryClient = createTestQueryClient();
      
      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      // Render two instances of the hook
      const { result: result1 } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper }
      );

      const { result: result2 } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper }
      );

      await waitFor(() => {
        expect(result1.current.data).toBeDefined();
        expect(result2.current.data).toBeDefined();
      });

      // Both instances should have the same data
      expect(result1.current.data?.refereeAnalytics).toEqual(result2.current.data?.refereeAnalytics);
      expect(result1.current.status.source).toBe(result2.current.status.source);

      // Refresh one instance
      await result1.current.actions.refresh();

      await waitFor(() => {
        // Both should be updated due to shared cache
        expect(result1.current.data?.lastUpdated).toBeTruthy();
        expect(result2.current.data?.lastUpdated).toBeTruthy();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('integrates error logging across all services', async () => {
      // Mock service failures
      mockAnalyticsService.aggregateRefereeAnalytics.mockRejectedValue(
        new Error('Database connection failed')
      );

      const wrapper = createWrapper();

      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      // Error should be handled gracefully
      expect(result.current.error?.message).toContain('Database connection failed');
      
      // Hook should remain stable despite error
      expect(result.current.actions.refresh).toBeDefined();
      expect(result.current.status).toBeDefined();
    });

    it('recovers from errors when services become available', async () => {
      // Start with failing service
      mockAnalyticsService.aggregateRefereeAnalytics
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValue([]);

      const wrapper = createWrapper();

      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper }
      );

      // Should start with error
      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      // Retry should succeed
      await result.current.actions.refresh();

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.data).toBeDefined();
      });
    });
  });

  describe('Mobile Performance Integration', () => {
    it('optimizes for mobile device constraints', async () => {
      const wrapper = createWrapper();

      const startTime = Date.now();

      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange, {
          enablePerformanceMonitoring: true,
          refreshInterval: 30000, // Epic 4 real-time requirement
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      const loadTime = Date.now() - startTime;

      // Should load quickly on mobile devices
      expect(loadTime).toBeLessThan(1000); // Hook initialization should be fast

      // Performance metrics should meet mobile targets
      const performance = result.current.performance;
      expect(performance.queryTime).toBeLessThan(500); // Database queries
      expect(performance.averageQueryTime).toBeLessThan(500); // Sustained performance
    });

    it('handles memory constraints appropriately', async () => {
      const queryClient = createTestQueryClient();
      
      // Configure for memory-constrained environment
      queryClient.setDefaultOptions({
        queries: {
          gcTime: 5 * 60 * 1000, // 5 minutes GC time (shorter for mobile)
          staleTime: 30 * 1000, // 30 seconds stale time for real-time data
        },
      });

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toBeDefined();
      });

      // Should work within memory constraints
      expect(result.current.data?.refereeAnalytics).toBeDefined();
      expect(result.current.performance.queryTime).toBeGreaterThan(0);

      // Cache should be managed appropriately
      const cacheSize = queryClient.getQueryCache().getAll().length;
      expect(cacheSize).toBeLessThan(100); // Reasonable cache size
    });
  });
});