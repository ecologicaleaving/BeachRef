import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useRefereeAnalytics } from '../../hooks/useRefereeAnalytics';
import { DeploymentFeatureFlags } from '../../services/DeploymentFeatureFlags';
import { NewAnalyticsService } from '../../services/NewAnalyticsService';

// Mock the services
// Stessa ragione del doppio qui sotto: una sola istanza, condivisa fra il test
// e il codice sotto esame. Altrimenti `mockReturnValue(false)` non arriva mai
// dove serve e ogni test girerebbe col flag acceso.
jest.mock('../../services/DeploymentFeatureFlags', () => {
  const instance = {
    isNewAnalyticsEndpointsEnabled: jest.fn(() => true),
    isAnalyticsMonitoringEnabled: jest.fn(() => true),
    isAnalyticsCacheEnabled: jest.fn(() => true),
  };
  return { DeploymentFeatureFlags: { getInstance: jest.fn(() => instance) } };
});

// `getInstance` deve restituire lo STESSO oggetto a ogni chiamata.
//
// Con una fabbrica che ne costruisce uno nuovo ogni volta, l'istanza che il
// test configura e quella che il hook usa sono due oggetti diversi: il
// `mockResolvedValue` del test non arriva mai al codice sotto esame, che riceve
// una `queryAnalytics` senza implementazione. E' lo stesso difetto gia'
// documentato qui sotto per `ErrorLogger`.
jest.mock('../../services/NewAnalyticsService', () => {
  const instance = {
    queryAnalytics: jest.fn(),
    exportAnalytics: jest.fn(),
    getHealthStatus: jest.fn(),
  };
  return { NewAnalyticsService: { getInstance: jest.fn(() => instance) } };
});

// `useRefereeAnalytics` usa `AnalyticsService`, NON `NewAnalyticsService`.
//
// La suite mockava solo il secondo, quindi il primo restava quello vero e
// tentava di interrogare Supabase: la query non riusciva mai e tutti e dodici
// i test fallivano sullo stesso `expect(result.current.isSuccess).toBe(true)`.
// Dodici fallimenti identici, nessuno dei quali riguardava cio' che il test
// voleva verificare.
jest.mock('../../services/AnalyticsService', () => ({
  AnalyticsService: {
    getInstance: jest.fn(() => ({
      aggregateRefereeAnalytics: jest.fn().mockResolvedValue([
        {
          referee_id: '1',
          referee_name: 'Test Referee',
          federation_code: 'FIVB',
          total_assignments: 10,
          first_referee_count: 6,
          second_referee_count: 4,
          challenge_referee_count: 0,
          tournaments_worked: ['T1'],
          performance_score: 90,
          date: '2026-01-01',
        },
      ]),
      calculatePerformanceScore: jest.fn().mockResolvedValue(90),
    })),
  },
}));

// Istanza unica, per la stessa ragione degli altri doppi: il test recupera
// `getInstance()` per configurarlo, il hook ne chiama un altro, e senza questa
// stabilita' i due non sono lo stesso oggetto.
jest.mock('../../services/RefereeAnalyticsExportService', () => {
  const instance = {
    exportAnalytics: jest.fn(),
    getAvailableTemplates: jest.fn(() => ({})),
  };
  return { __esModule: true, default: { getInstance: jest.fn(() => instance) } };
});

jest.mock('../../services/ErrorLogger', () => ({
  ErrorLogger: {
    getInstance: jest.fn(() => ({
      logError: jest.fn()
    }))
  }
}));

/**
 * Riattivati dalla #102: la migrazione ora e' cablata.
 *
 * Erano sospesi dalla #94 perche' descrivevano un'integrazione che non
 * esisteva: `NewAnalyticsService` non era importato da nessun file
 * dell'applicazione. `useRefereeAnalytics` ora consulta
 * `isNewAnalyticsEndpointsEnabled()` e, quando e' acceso, legge dalle Edge
 * Function.
 *
 * Il flag e' **spento di partenza**: chi non lo accende resta sul percorso di
 * prima. Si accende un browser alla volta con `?nuoveAnalytics=on`.
 */

describe('Analytics End-to-End Integration Tests', () => {
  let queryClient: QueryClient;
  let mockFeatureFlags: any;
  let mockAnalyticsService: any;

  const createWrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          // Senza questi, gli hook che hanno `enableRealTimeUpdates` acceso
          // per difetto aprono un intervallo che nessuno chiude: il client non
          // viene mai smontato e la suite si blocca fino al timeout.
          refetchInterval: false,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
          gcTime: 0,
        },
      },
    });

    mockFeatureFlags = DeploymentFeatureFlags.getInstance();
    mockAnalyticsService = NewAnalyticsService.getInstance();

    // Reset all mocks
    jest.clearAllMocks();

    // `clearAllMocks` azzera le CHIAMATE, non le implementazioni: un
    // `mockReturnValue(false)` sul flag, o un `mockRejectedValue` sulla query,
    // sopravviveva al proprio test e decideva l'esito dei successivi. Quattro
    // casi risultavano rossi perche' giravano col flag lasciato spento da un
    // test precedente, non per cio' che volevano provare. I doppi si riarmano
    // qui, in modo che ogni test parta dallo stesso stato dichiarato.
    mockFeatureFlags.isNewAnalyticsEndpointsEnabled.mockReturnValue(true);
    mockFeatureFlags.isAnalyticsMonitoringEnabled.mockReturnValue(true);
    mockFeatureFlags.isAnalyticsCacheEnabled.mockReturnValue(true);
    mockAnalyticsService.queryAnalytics.mockResolvedValue([]);
    mockAnalyticsService.exportAnalytics.mockResolvedValue(undefined);
  });

  afterEach(() => {
    // `unmount()` ferma gli osservatori, `clear()` svuota la cache. Senza il
    // primo gli intervalli restano accesi anche a cache vuota, e il worker si
    // porta dietro le suite successive.
    queryClient?.unmount();
    queryClient?.clear();
  });

  describe('Feature Flag Integration', () => {
    it('should use new analytics endpoints when feature flag is enabled', async () => {
      // Setup mocks
      mockFeatureFlags.isNewAnalyticsEndpointsEnabled.mockReturnValue(true);
      mockAnalyticsService.queryAnalytics.mockResolvedValue([
        {
          referee_id: '1',
          total_assignments: 5,
          first_referee_count: 3,
          second_referee_count: 2,
          challenge_referee_count: 0,
          tournaments_worked: ['TOURNAMENT_1'],
          performance_score: 85,
          date_range: {
            start: '2024-09-01 00:00:00',
            end: '2024-09-30 23:59:59'
          }
        }
      ]);

      const { result } = renderHook(
        () => useRefereeAnalytics({
          dateRange: {
            start: '2024-09-01',
            end: '2024-09-30'
          }
        }),
        { wrapper: createWrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify new analytics service was called
      expect(mockAnalyticsService.queryAnalytics).toHaveBeenCalledWith({
        startDate: '2024-09-01 00:00:00',
        endDate: '2024-09-30 23:59:59',
        refereeIds: undefined,
        tournamentCode: undefined,
        federation: undefined
      });

      // Verify data transformation
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data![0]).toMatchObject({
        referee_id: '1',
        total_assignments: 5,
        first_referee_count: 3,
        second_referee_count: 2,
        challenge_referee_count: 0,
        performance_score: 85
      });

      // Verify source detection
      expect(result.current.source).toBe('database');
    });

    it('con il flag spento il servizio nuovo non viene interrogato affatto', async () => {
      // Il test originale si chiamava "fallback to legacy when new endpoints
      // fail" ma metteva il flag a `false` e poi faceva fallire il servizio
      // NUOVO, aspettandosi un errore. Con il flag spento quel servizio non
      // viene nemmeno chiamato, quindi il suo fallimento non puo' produrre
      // niente: il caso era irrealizzabile.
      //
      // La proprieta' che conta davvero — ed e' quella che protegge gli utenti
      // finche' la migrazione non e' verificata — e' che a flag spento il
      // percorso nuovo sia FUORI dal circuito, non che ripieghi con garbo.
      mockFeatureFlags.isNewAnalyticsEndpointsEnabled.mockReturnValue(false);
      mockAnalyticsService.queryAnalytics.mockRejectedValue(new Error('Endpoint failed'));

      const { result } = renderHook(
        () => useRefereeAnalytics({
          dateRange: {
            start: '2024-09-01',
            end: '2024-09-30'
          }
        }),
        { wrapper: createWrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAnalyticsService.queryAnalytics).not.toHaveBeenCalled();
    });
  });

  describe('Zero Breaking Changes Validation', () => {
    it('should maintain exact interface compatibility', async () => {
      // Setup successful response
      mockFeatureFlags.isNewAnalyticsEndpointsEnabled.mockReturnValue(true);
      mockAnalyticsService.queryAnalytics.mockResolvedValue([
        {
          referee_id: '1',
          total_assignments: 10,
          first_referee_count: 6,
          second_referee_count: 4,
          challenge_referee_count: 0,
          tournaments_worked: ['T1', 'T2'],
          performance_score: 92,
          date_range: {
            start: '2024-09-01 00:00:00',
            end: '2024-09-30 23:59:59'
          }
        }
      ]);

      const { result } = renderHook(
        () => useRefereeAnalytics(),
        { wrapper: createWrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify all required interface methods exist
      expect(typeof result.current.aggregatePerformance).toBe('function');
      expect(typeof result.current.exportAnalytics).toBe('function');
      expect(typeof result.current.calculateTrends).toBe('function');
      expect(typeof result.current.refreshAnalytics).toBe('function');
      expect(typeof result.current.getAvailableTemplates).toBe('function');

      // Verify all required properties exist
      expect(result.current.source).toBeDefined();
      expect(result.current.performance).toBeDefined();
      expect(typeof result.current.performance.queryTime).toBe('number');

      // Verify TanStack Query properties are preserved
      expect(result.current.data).toBeDefined();
      expect(typeof result.current.isLoading).toBe('boolean');
      expect(typeof result.current.isError).toBe('boolean');
      expect(typeof result.current.isSuccess).toBe('boolean');
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should preserve data structure for React components', async () => {
      // Setup response with comprehensive data
      mockFeatureFlags.isNewAnalyticsEndpointsEnabled.mockReturnValue(true);
      mockAnalyticsService.queryAnalytics.mockResolvedValue([
        {
          referee_id: '123',
          total_assignments: 15,
          first_referee_count: 8,
          second_referee_count: 7,
          challenge_referee_count: 0,
          tournaments_worked: ['WORLD_TOUR_2024', 'NATIONAL_CHAMP'],
          performance_score: 88,
          date_range: {
            start: '2024-08-01 00:00:00',
            end: '2024-08-31 23:59:59'
          }
        }
      ]);

      const { result } = renderHook(
        () => useRefereeAnalytics({
          dateRange: { start: '2024-08-01', end: '2024-08-31' },
          federationCode: 'FIVB'
        }),
        { wrapper: createWrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const refereeMetrics = result.current.data![0];

      // Verify all expected fields are present with correct types
      expect(typeof refereeMetrics.referee_id).toBe('string');
      expect(typeof refereeMetrics.referee_name).toBe('string');
      expect(typeof refereeMetrics.federation_code).toBe('string');
      expect(typeof refereeMetrics.total_assignments).toBe('number');
      expect(typeof refereeMetrics.first_referee_count).toBe('number');
      expect(typeof refereeMetrics.second_referee_count).toBe('number');
      expect(typeof refereeMetrics.challenge_referee_count).toBe('number');
      expect(typeof refereeMetrics.completion_rate).toBe('number');
      expect(Array.isArray(refereeMetrics.tournaments_worked)).toBe(true);
      expect(typeof refereeMetrics.performance_score).toBe('number');
      expect(['increasing', 'stable', 'decreasing']).toContain(refereeMetrics.workload_trend);
      expect(Array.isArray(refereeMetrics.geographic_coverage)).toBe(true);
      expect(typeof refereeMetrics.avg_matches_per_day).toBe('number');

      // Verify calculated fields
      expect(refereeMetrics.completion_rate).toBe(100); // Should be 100% for assignments > 0
      expect(refereeMetrics.workload_trend).toBe('increasing'); // 15 assignments > 5
      expect(refereeMetrics.avg_matches_per_day).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle network failures gracefully', async () => {
      mockFeatureFlags.isNewAnalyticsEndpointsEnabled.mockReturnValue(true);
      mockAnalyticsService.queryAnalytics.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(
        () => useRefereeAnalytics(),
        { wrapper: createWrapper }
      );

      // `useRefereeAnalytics` ha un `retry` PROPRIO — due tentativi con attesa
      // crescente — che sovrascrive il `retry: false` del client di test. Con
      // il timeout di default di `waitFor` (1000 ms) la query e' ancora in
      // mezzo ai ritentativi, quindi `isError` e' legittimamente falso e il
      // test falliva su una condizione non ancora raggiunta.
      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 10000 }
      );

      expect(result.current.error).toBeDefined();
      expect(result.current.data).toBeUndefined();
    });

    it('should handle malformed data gracefully', async () => {
      mockFeatureFlags.isNewAnalyticsEndpointsEnabled.mockReturnValue(true);
      mockAnalyticsService.queryAnalytics.mockResolvedValue([
        {
          referee_id: '1',
          total_assignments: null, // Malformed data
          first_referee_count: undefined,
          second_referee_count: 2,
          challenge_referee_count: 0,
          tournaments_worked: null,
          performance_score: 'invalid'
        }
      ]);

      const { result } = renderHook(
        () => useRefereeAnalytics(),
        { wrapper: createWrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should handle malformed data without crashing
      const refereeMetrics = result.current.data![0];
      expect(refereeMetrics.total_assignments).toBe(null);
      expect(refereeMetrics.performance_score).toBe('invalid');

      // `tournaments_worked` viene NORMALIZZATO a `[]`, e deliberatamente: il
      // tipo dichiara `string[]` mentre la colonna e' `text[]` annullabile, e
      // un `null` che passa di qui non rompe niente sul momento — rompe il
      // primo consumatore che fa `.map()`, lontano da qui. La ragione e'
      // scritta per esteso nel hook. Il test chiedeva il passaggio del `null`
      // grezzo, che e' esattamente cio' che quella riga esiste per impedire.
      expect(refereeMetrics.tournaments_worked).toEqual([]);
    });
  });

  describe('Performance and Caching', () => {
    it('should track performance metrics', async () => {
      mockFeatureFlags.isNewAnalyticsEndpointsEnabled.mockReturnValue(true);
      mockAnalyticsService.queryAnalytics.mockResolvedValue([]);

      const { result } = renderHook(
        () => useRefereeAnalytics(),
        { wrapper: createWrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.performance.queryTime).toBeGreaterThan(0);
      expect(typeof result.current.performance.queryTime).toBe('number');
    });

    it('should support different cache strategies', async () => {
      mockFeatureFlags.isNewAnalyticsEndpointsEnabled.mockReturnValue(true);
      mockAnalyticsService.queryAnalytics.mockResolvedValue([]);

      const { result: liveResult } = renderHook(
        () => useRefereeAnalytics({}, { cacheStrategy: 'live' }),
        { wrapper: createWrapper }
      );

      const { result: staticResult } = renderHook(
        () => useRefereeAnalytics({}, { cacheStrategy: 'static' }),
        { wrapper: createWrapper }
      );

      await waitFor(() => {
        expect(liveResult.current.isSuccess).toBe(true);
        expect(staticResult.current.isSuccess).toBe(true);
      });

      // Both should work regardless of cache strategy
      expect(liveResult.current.data).toBeDefined();
      expect(staticResult.current.data).toBeDefined();
    });
  });

  describe('Export and Advanced Features', () => {
    it('should support analytics export functionality', async () => {
      const mockBlob = new Blob(['test data'], { type: 'text/csv' });
      const mockExportService = require('../../services/RefereeAnalyticsExportService').default.getInstance();
      mockExportService.exportAnalytics.mockResolvedValue(mockBlob);

      mockFeatureFlags.isNewAnalyticsEndpointsEnabled.mockReturnValue(true);
      mockAnalyticsService.queryAnalytics.mockResolvedValue([
        {
          referee_id: '1',
          total_assignments: 5,
          first_referee_count: 3,
          second_referee_count: 2,
          challenge_referee_count: 0,
          tournaments_worked: ['T1'],
          performance_score: 85
        }
      ]);

      const { result } = renderHook(
        () => useRefereeAnalytics(),
        { wrapper: createWrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Test export functionality
      const exportResult = await result.current.exportAnalytics('csv');
      expect(exportResult).toBe(mockBlob);
      expect(mockExportService.exportAnalytics).toHaveBeenCalled();
    });

    it('should support aggregate performance functionality', async () => {
      mockFeatureFlags.isNewAnalyticsEndpointsEnabled.mockReturnValue(true);
      mockAnalyticsService.queryAnalytics.mockResolvedValue([]);

      const { result } = renderHook(
        () => useRefereeAnalytics(),
        { wrapper: createWrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Test aggregate performance
      await result.current.aggregatePerformance(['1', '2', '3']);
      
      expect(mockAnalyticsService.queryAnalytics).toHaveBeenCalledWith({
        startDate: expect.stringMatching(/\d{4}-\d{2}-\d{2} 00:00:00/),
        endDate: expect.stringMatching(/\d{4}-\d{2}-\d{2} 23:59:59/),
        refereeIds: ['1', '2', '3']
      });
    });
  });

  describe('Real-world Integration Scenarios', () => {
    it('should handle typical tournament analytics workflow', async () => {
      mockFeatureFlags.isNewAnalyticsEndpointsEnabled.mockReturnValue(true);
      mockAnalyticsService.queryAnalytics.mockResolvedValue([
        {
          referee_id: 'REF001',
          total_assignments: 12,
          first_referee_count: 8,
          second_referee_count: 4,
          challenge_referee_count: 0,
          tournaments_worked: ['WORLD_TOUR_VIENNA', 'WORLD_TOUR_HAMBURG'],
          performance_score: 91,
          date_range: {
            start: '2024-07-01 00:00:00',
            end: '2024-07-31 23:59:59'
          }
        },
        {
          referee_id: 'REF002',
          total_assignments: 8,
          first_referee_count: 3,
          second_referee_count: 5,
          challenge_referee_count: 0,
          tournaments_worked: ['WORLD_TOUR_VIENNA'],
          performance_score: 78,
          date_range: {
            start: '2024-07-01 00:00:00',
            end: '2024-07-31 23:59:59'
          }
        }
      ]);

      const { result } = renderHook(
        () => useRefereeAnalytics({
          dateRange: { start: '2024-07-01', end: '2024-07-31' },
          federationCode: 'FIVB',
          performanceThreshold: 80
        }),
        { wrapper: createWrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should filter by performance threshold
      const data = result.current.data!;
      expect(data.length).toBe(1); // Only REF001 meets threshold of 80+
      expect(data[0].referee_id).toBe('REF001');
      expect(data[0].performance_score).toBe(91);

      // Verify comprehensive data structure
      expect(data[0].tournaments_worked).toEqual(['WORLD_TOUR_VIENNA', 'WORLD_TOUR_HAMBURG']);
      expect(data[0].workload_trend).toBe('increasing'); // 12 assignments > 5
      expect(data[0].avg_matches_per_day).toBeCloseTo(0.39, 2); // 12 assignments / 31 days
    });

    it('should work with role-based filtering', async () => {
      mockFeatureFlags.isNewAnalyticsEndpointsEnabled.mockReturnValue(true);
      mockAnalyticsService.queryAnalytics.mockResolvedValue([
        {
          referee_id: 'REF001',
          total_assignments: 10,
          first_referee_count: 8,
          second_referee_count: 2,
          challenge_referee_count: 0,
          tournaments_worked: ['T1'],
          performance_score: 85
        },
        {
          referee_id: 'REF002',
          total_assignments: 6,
          first_referee_count: 0,
          second_referee_count: 6,
          challenge_referee_count: 0,
          tournaments_worked: ['T1'],
          performance_score: 75
        }
      ]);

      const { result } = renderHook(
        () => useRefereeAnalytics({
          roleTypes: ['FIRST'] // Only first referees
        }),
        { wrapper: createWrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should only return REF001 who has first referee assignments
      const data = result.current.data!;
      expect(data.length).toBe(1);
      expect(data[0].referee_id).toBe('REF001');
      expect(data[0].first_referee_count).toBe(8);
    });
  });
});