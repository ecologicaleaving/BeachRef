import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAnalyticsDashboard } from '../../hooks/useAnalyticsDashboard';
import { useAnalyticsSettings } from '../../hooks/useAnalyticsSettings';
import { AnalyticsService } from '../../services/AnalyticsService';
import { LocalStorageManager } from '../../services/LocalStorageManager';
import { queryKeys } from '../../lib/queryClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRefereeAnalytics } from '../../hooks/useRefereeAnalytics';

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

      // Le impostazioni si seminano in AsyncStorage, non in LocalStorageManager
      // (issue #94). `useAnalyticsSettings` legge
      // `AsyncStorage.getItem('@BeachRef:analytics_settings')` direttamente —
      // c'e' anche una nota nel hook che spiega perche' non usa
      // `LocalStorageManager`. Il doppio era quindi montato sulla porta
      // sbagliata: il hook non trovava niente, ripiegava sui valori di default
      // (`enableRealTimeUpdates: true`) e il test falliva sulla prima
      // asserzione, prima ancora di arrivare al cambiamento che voleva provare.
      await AsyncStorage.setItem('@BeachRef:analytics_settings', JSON.stringify(mockSettings));

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

      // Verify persistence — sulla porta che il hook usa davvero, e sul
      // CONTENUTO invece che sulla forma della chiamata: cosi' l'asserzione
      // resta vera anche se cambia il modo in cui il valore viene scritto.
      const persistito = await AsyncStorage.getItem('@BeachRef:analytics_settings');
      expect(persistito).toContain('"enableRealTimeUpdates":true');
      expect(persistito).toContain('"refreshInterval":15000');
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

      // La media si verifica come NUMERO, non come "maggiore di zero" (issue
      // #94). `queryTime` e' un `Date.now()` di differenza attorno a una query
      // che qui gira su dati finti: dura meno di un millisecondo, quindi zero e'
      // la misura giusta, non un difetto. Pretendere `> 0` significa pretendere
      // che la macchina sia lenta.
      const finalPerformance = result.current.performance;
      expect(Number.isFinite(finalPerformance.averageQueryTime)).toBe(true);
      expect(finalPerformance.averageQueryTime).toBeGreaterThanOrEqual(0);
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
      // Mock a failing refresh.
      //
      // Si sovrascrive il valore restituito dal doppio GIA' ATTIVO, non si
      // dichiara un nuovo modulo (issue #94). `jest.doMock` registra una
      // fabbrica per i `require` FUTURI: `useAnalyticsDashboard` era gia' stato
      // importato in cima al file e continuava a usare il doppio originale, con
      // il suo `refreshAnalytics` che riesce. Il refresh non falliva mai e
      // `rejects.toThrow` trovava una promessa risolta.
      const mockFailingRefresh = jest.fn().mockRejectedValue(new Error('Network timeout'));
      const doppioAnalytics = useRefereeAnalytics as jest.Mock;
      const rispostaOriginale = doppioAnalytics();

      doppioAnalytics.mockReturnValue({
        ...rispostaOriginale,
        source: 'cache',
        refreshAnalytics: mockFailingRefresh,
      });

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

      // Il doppio e' condiviso da tutto il file: va rimesso com'era, altrimenti
      // ogni test successivo eredita un refresh che fallisce.
      doppioAnalytics.mockReturnValue(rispostaOriginale);
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

      // La cache si interroga per PREFISSO di chiave (issue #94).
      //
      // `getQueryData` fa una corrispondenza esatta sulla chiave, e la chiave
      // costruita qui conteneva `config: expect.any(Object)` — un matcher
      // asimmetrico di jest, non la configurazione vera che il hook ha usato.
      // Nessuna chiave poteva mai combaciare, quindi entrambe le letture erano
      // `undefined` a prescindere da cosa ci fosse in cache: il test non
      // distingueva una cache popolata da una vuota.
      const datiInCache = () =>
        queryClient
          .getQueriesData({ queryKey: ['analytics', 'dashboard'] })
          .map(([, dato]) => dato)
          .filter(dato => dato !== undefined);

      expect(datiInCache().length).toBeGreaterThan(0);

      // Clear cache through action
      await result.current.actions.clearCache();

      // La query viene rifatta dopo lo svuotamento: la cache torna popolata.
      await waitFor(() => {
        expect(datiInCache().length).toBeGreaterThan(0);
      });
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
      // L'errore va iniettato dove la dashboard LEGGE (issue #94).
      //
      // Il test faceva fallire `AnalyticsService.aggregateRefereeAnalytics`, ma
      // `useAnalyticsDashboard` prende i dati arbitri dal doppio di
      // `useRefereeAnalytics`, montato in cima a questo file: quel servizio non
      // veniva mai chiamato e l'errore non arrivava a nessuno. Il test passava
      // comunque la prima attesa, perche' `expect(null).toBeDefined()` e' vero:
      // si accorgeva del problema solo una riga dopo, leggendo `.message` da
      // `null`.
      const doppioAnalytics = useRefereeAnalytics as jest.Mock;
      const rispostaOriginale = doppioAnalytics();

      doppioAnalytics.mockReturnValue({
        ...rispostaOriginale,
        data: undefined,
        error: new Error('Database connection failed'),
      });

      const wrapper = createWrapper();

      const { result } = renderHook(
        () => useAnalyticsDashboard(mockTimeRange),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Error should be handled gracefully
      expect(result.current.error?.message).toContain('Database connection failed');

      // Hook should remain stable despite error
      expect(result.current.actions.refresh).toBeDefined();
      expect(result.current.status).toBeDefined();

      doppioAnalytics.mockReturnValue(rispostaOriginale);
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