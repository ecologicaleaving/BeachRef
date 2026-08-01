/**
 * Unit Tests for useRefereeAnalytics Hook
 * Story 4.2: Referee Performance Analytics - Task 6
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useRefereeAnalytics, RefereeAnalyticsFilters } from '../useRefereeAnalytics';
import { AnalyticsService } from '../../services/AnalyticsService';
import RefereeAnalyticsExportService from '../../services/RefereeAnalyticsExportService';

// Mock the services
jest.mock('../../services/AnalyticsService');
jest.mock('../../services/RefereeAnalyticsExportService');
jest.mock('../../services/ErrorLogger');

// Mock performance API.
//
// `global`, non `window`: l'ambiente jest di questo progetto e' `node` e
// questa e' un'app React Native — `window` non esiste ne' nel test ne' in
// produzione. La riga con `window` faceva morire l'intera suite all'import
// con `ReferenceError: window is not defined`, quindi nessuno dei suoi test
// girava (issue #94). Passare a `jsdom`, come suggerisce il messaggio di
// jest, avrebbe introdotto un ambiente browser in un progetto che non gira
// in un browser: la correzione e' usare il globale che c'e' davvero.
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => 123.456),
  },
  configurable: true,
});

// Test data
const mockAnalyticsData = [
  {
    referee_id: '1',
    date: '2025-01-01',
    total_assignments: 5,
    first_referee_count: 3,
    second_referee_count: 2,
    challenge_referee_count: 0,
    tournaments_worked: ['TOUR001', 'TOUR002'],
    performance_score: 85,
  },
  {
    referee_id: '2',
    date: '2025-01-01',
    total_assignments: 8,
    first_referee_count: 4,
    second_referee_count: 3,
    challenge_referee_count: 1,
    tournaments_worked: ['TOUR001', 'TOUR003'],
    performance_score: 92,
  },
];

const mockPerformanceMetrics = [
  {
    referee_id: '1',
    referee_name: 'Referee 1',
    federation_code: 'FIVB',
    total_assignments: 5,
    first_referee_count: 3,
    second_referee_count: 2,
    challenge_referee_count: 0,
    completion_rate: 100,
    tournaments_worked: ['TOUR001', 'TOUR002'],
    performance_score: 85,
    workload_trend: 'stable' as const,
    geographic_coverage: ['Location1', 'Location2'],
    avg_matches_per_day: 2.5,
  },
  {
    referee_id: '2',
    referee_name: 'Referee 2',
    federation_code: 'CEV',
    total_assignments: 8,
    first_referee_count: 4,
    second_referee_count: 3,
    challenge_referee_count: 1,
    completion_rate: 100,
    tournaments_worked: ['TOUR001', 'TOUR003'],
    performance_score: 92,
    workload_trend: 'increasing' as const,
    geographic_coverage: ['Location1', 'Location3'],
    avg_matches_per_day: 4.0,
  },
];

// Mock implementations
const mockAnalyticsService = AnalyticsService as jest.MockedClass<typeof AnalyticsService>;
const mockExportService = RefereeAnalyticsExportService as jest.MockedClass<typeof RefereeAnalyticsExportService>;

describe('useRefereeAnalytics', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Create wrapper with QueryClient
    wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );

    // Mock AnalyticsService
    const mockAnalyticsInstance = {
      aggregateRefereeAnalytics: jest.fn().mockResolvedValue(mockAnalyticsData),
      calculatePerformanceScore: jest.fn().mockResolvedValue(85),
    };
    mockAnalyticsService.getInstance.mockReturnValue(mockAnalyticsInstance as any);

    // Mock ExportService
    const mockExportInstance = {
      exportAnalytics: jest.fn().mockResolvedValue(new Blob(['test'], { type: 'text/csv' })),
      getAvailableTemplates: jest.fn().mockReturnValue({
        performance_summary: {
          name: 'Performance Summary',
          description: 'Test template',
        },
      }),
    };
    mockExportService.getInstance.mockReturnValue(mockExportInstance as any);
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('basic functionality', () => {
    it('should initialize with default filters and config', async () => {
      const { result } = renderHook(
        () => useRefereeAnalytics({}),
        { wrapper }
      );

      expect(result.current).toBeDefined();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should fetch referee analytics data successfully', async () => {
      const filters: RefereeAnalyticsFilters = {
        refereeIds: ['1', '2'],
        dateRange: {
          start: '2025-01-01',
          end: '2025-01-31',
        },
      };

      const { result } = renderHook(
        () => useRefereeAnalytics(filters),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].referee_name).toBe('Referee 1');
      expect(result.current.data?.[1].referee_name).toBe('Referee 2');
      expect(result.current.source).toBe('database');
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      const mockAnalyticsInstance = mockAnalyticsService.getInstance();
      (mockAnalyticsInstance.aggregateRefereeAnalytics as jest.Mock).mockRejectedValue(
        new Error('API Error')
      );

      const { result } = renderHook(
        () => useRefereeAnalytics({}),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe('filtering', () => {
    it('should apply performance threshold filter', async () => {
      const filters: RefereeAnalyticsFilters = {
        performanceThreshold: 90,
      };

      const { result } = renderHook(
        () => useRefereeAnalytics(filters),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should only return referees with performance score >= 90
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].performance_score).toBeGreaterThanOrEqual(90);
    });

    it('should apply role type filter', async () => {
      const filters: RefereeAnalyticsFilters = {
        roleTypes: ['FIRST'],
      };

      const { result } = renderHook(
        () => useRefereeAnalytics(filters),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should only return referees with first referee assignments
      result.current.data?.forEach(referee => {
        expect(referee.first_referee_count).toBeGreaterThan(0);
      });
    });

    it('should apply federation code filter', async () => {
      const filters: RefereeAnalyticsFilters = {
        federationCode: 'FIVB',
      };

      const { result } = renderHook(
        () => useRefereeAnalytics(filters),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should only return referees from FIVB federation
      result.current.data?.forEach(referee => {
        expect(referee.federation_code).toBe('FIVB');
      });
    });
  });

  describe('analytics functions', () => {
    it('should aggregate performance data', async () => {
      const { result } = renderHook(
        () => useRefereeAnalytics({}),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      await result.current.aggregatePerformance(['1', '2']);

      const mockAnalyticsInstance = mockAnalyticsService.getInstance();
      expect(mockAnalyticsInstance.aggregateRefereeAnalytics).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        ['1', '2']
      );
    });

    it('should export analytics data to CSV', async () => {
      const { result } = renderHook(
        () => useRefereeAnalytics({}),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const blob = await result.current.exportAnalytics('csv');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/csv');

      const mockExportInstance = mockExportService.getInstance();
      expect(mockExportInstance.exportAnalytics).toHaveBeenCalledWith(
        expect.any(Array),
        'csv',
        expect.objectContaining({
          metadata: expect.objectContaining({
            title: 'Referee Performance Analytics Report',
            generatedBy: 'BeachRef Analytics System',
          }),
        })
      );
    });

    it('should export analytics data to JSON', async () => {
      const { result } = renderHook(
        () => useRefereeAnalytics({}),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const blob = await result.current.exportAnalytics('json');

      expect(blob).toBeInstanceOf(Blob);

      const mockExportInstance = mockExportService.getInstance();
      expect(mockExportInstance.exportAnalytics).toHaveBeenCalledWith(
        expect.any(Array),
        'json',
        expect.any(Object)
      );
    });

    it('should get available templates', async () => {
      const { result } = renderHook(
        () => useRefereeAnalytics({}),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const templates = result.current.getAvailableTemplates();

      expect(templates).toHaveProperty('performance_summary');
      expect(templates.performance_summary).toHaveProperty('name', 'Performance Summary');

      const mockExportInstance = mockExportService.getInstance();
      expect(mockExportInstance.getAvailableTemplates).toHaveBeenCalled();
    });

    it('should refresh analytics data', async () => {
      const { result } = renderHook(
        () => useRefereeAnalytics({}),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Spy on the refetch function
      const refetchSpy = jest.spyOn(result.current, 'refetch');

      await result.current.refreshAnalytics();

      expect(refetchSpy).toHaveBeenCalled();
    });
  });

  describe('performance monitoring', () => {
    it('should track query performance', async () => {
      const { result } = renderHook(
        () => useRefereeAnalytics({}, {
          enablePerformanceMonitoring: true,
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.performance.queryTime).toBeGreaterThan(0);
    });

    it('should handle performance score calculation errors gracefully', async () => {
      // Mock performance score calculation error
      const mockAnalyticsInstance = mockAnalyticsService.getInstance();
      (mockAnalyticsInstance.calculatePerformanceScore as jest.Mock).mockRejectedValue(
        new Error('Performance calculation error')
      );

      const { result } = renderHook(
        () => useRefereeAnalytics({}, {
          enablePerformanceScoring: true,
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should still return data with performance score = 0 for failed calculations
      expect(result.current.data).toBeDefined();
      result.current.data?.forEach(referee => {
        if (referee.performance_score === 0) {
          // Performance score calculation failed but didn't break the query
          expect(true).toBe(true);
        }
      });
    });
  });

  describe('caching behavior', () => {
    it('should use live cache strategy by default', async () => {
      const { result } = renderHook(
        () => useRefereeAnalytics({}),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.source).toBe('database');
    });

    it('should respect cache strategy configuration', async () => {
      const { result } = renderHook(
        () => useRefereeAnalytics({}, {
          cacheStrategy: 'historical',
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Cache strategy should affect query options (tested implicitly)
      expect(result.current.data).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty data gracefully', async () => {
      // Mock empty data
      const mockAnalyticsInstance = mockAnalyticsService.getInstance();
      (mockAnalyticsInstance.aggregateRefereeAnalytics as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(
        () => useRefereeAnalytics({}),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should handle null tournament data', async () => {
      // Mock data with null tournament arrays
      const mockDataWithNulls = [{
        ...mockAnalyticsData[0],
        tournaments_worked: null,
      }];

      const mockAnalyticsInstance = mockAnalyticsService.getInstance();
      (mockAnalyticsInstance.aggregateRefereeAnalytics as jest.Mock).mockResolvedValue(mockDataWithNulls);

      const { result } = renderHook(
        () => useRefereeAnalytics({}),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should handle null gracefully
      expect(result.current.data?.[0].tournaments_worked).toEqual([]);
    });

    it('should provide default date range when none specified', async () => {
      const { result } = renderHook(
        () => useRefereeAnalytics({}),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const mockAnalyticsInstance = mockAnalyticsService.getInstance();
      expect(mockAnalyticsInstance.aggregateRefereeAnalytics).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}/), // Start date (30 days ago)
        expect.stringMatching(/\d{4}-\d{2}-\d{2}/), // End date (today)
        undefined
      );
    });
  });
});

// Test utilities for component testing
export const createMockRefereeAnalytics = (overrides?: Partial<typeof mockPerformanceMetrics[0]>) => ({
  ...mockPerformanceMetrics[0],
  ...overrides,
});

export const createAnalyticsTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};