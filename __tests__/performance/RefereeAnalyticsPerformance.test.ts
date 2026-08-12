/**
 * Performance Tests for Referee Analytics
 * Story 4.2: Referee Performance Analytics - Task 6
 * Validates Epic 4 performance requirements
 */

import { AnalyticsService } from '../../services/AnalyticsService';
import RefereeAnalyticsExportService from '../../services/RefereeAnalyticsExportService';
import { RefereePerformanceMetrics } from '../../hooks/useRefereeAnalytics';

// Mock dependencies
jest.mock('../../services/ErrorLogger');

// Mock Supabase
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  rpc: jest.fn(),
  upsert: jest.fn(),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

/**
 * Costruttore di query FINTO ma COMPLETO.
 *
 * I test costruivano a mano catene parziali (`select -> gte -> lte`), e il
 * servizio ne chiama anche altre: bastava un `.in('referee_id', ...)` per
 * ottenere "query.in is not a function". Un doppio parziale di un costruttore
 * di query si rompe al primo filtro nuovo, e si rompe in silenzio dentro un
 * try/catch.
 *
 * Qui QUALUNQUE metodo si incatena, e il risultato si attende alla fine —
 * come fa PostgREST, che e' thenable.
 */
const costruttoreFinto = (risultato: { data: unknown; error: unknown }): any => {
  const q: any = new Proxy(
    {},
    {
      get: (_b, chiave: string) => {
        if (chiave === 'then') {
          return (ok: any, ko: any) => Promise.resolve(risultato).then(ok, ko);
        }
        return jest.fn(() => q);
      },
    }
  );
  return q;
};

// Performance test utilities
const measurePerformance = async (operation: () => Promise<any>): Promise<number> => {
  const start = performance.now();
  await operation();
  const end = performance.now();
  return end - start;
};

const generateLargeDataset = (size: number) => {
  const data = [];
  for (let i = 1; i <= size; i++) {
    data.push({
      referee_id: i.toString(),
      date: '2025-01-01',
      total_assignments: Math.floor(Math.random() * 50),
      first_referee_count: Math.floor(Math.random() * 20),
      second_referee_count: Math.floor(Math.random() * 20),
      challenge_referee_count: Math.floor(Math.random() * 10),
      tournaments_worked: [`TOUR${String(i).padStart(3, '0')}`],
      performance_score: Math.floor(Math.random() * 100),
    });
  }
  return data;
};

const generatePerformanceMetrics = (size: number): RefereePerformanceMetrics[] => {
  const metrics = [];
  for (let i = 1; i <= size; i++) {
    metrics.push({
      referee_id: i.toString(),
      referee_name: `Referee ${i}`,
      federation_code: i % 2 === 0 ? 'FIVB' : 'CEV',
      total_assignments: Math.floor(Math.random() * 50) + 1,
      first_referee_count: Math.floor(Math.random() * 20),
      second_referee_count: Math.floor(Math.random() * 20),
      challenge_referee_count: Math.floor(Math.random() * 10),
      completion_rate: 90 + Math.floor(Math.random() * 10),
      tournaments_worked: [`TOUR${String(i).padStart(3, '0')}`, `TOUR${String(i + 100).padStart(3, '0')}`],
      performance_score: 60 + Math.floor(Math.random() * 40),
      workload_trend: ['increasing', 'stable', 'decreasing'][Math.floor(Math.random() * 3)] as any,
      geographic_coverage: [`Location${i}`, `Location${i + 100}`],
      avg_matches_per_day: 1 + Math.random() * 5,
    });
  }
  return metrics;
};

describe('Referee Analytics Performance Tests', () => {
  let analyticsService: AnalyticsService;
  let exportService: RefereeAnalyticsExportService;

  beforeAll(() => {
    // Setup performance API if not available
    if (typeof performance === 'undefined') {
      (global as any).performance = {
        now: jest.fn(() => Date.now()),
      };
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    analyticsService = AnalyticsService.getInstance({
      enablePerformanceMonitoring: true,
    });
    exportService = RefereeAnalyticsExportService.getInstance();
  });

  describe('Epic 4 Performance Requirements', () => {
    /**
     * Requirement: Dashboard load time < 2 seconds
     */
    it('should load analytics dashboard within 2 seconds', async () => {
      // Mock large dataset response
      const largeDataset = generateLargeDataset(500);
      mockSupabase.from.mockReturnValue(costruttoreFinto({ data: largeDataset, error: null }));

      const performanceTime = await measurePerformance(async () => {
        await analyticsService.aggregateRefereeAnalytics(
          '2025-01-01 00:00:00',
          '2025-01-31 23:59:59'
        );
      });

      expect(performanceTime).toBeLessThan(2000); // < 2 seconds
    });

    /**
     * Requirement: Analytics queries < 500ms (database level)
     */
    it('should complete database analytics queries within 500ms', async () => {
      // Mock typical dataset response
      const normalDataset = generateLargeDataset(100);
      mockSupabase.from.mockReturnValue(costruttoreFinto({ data: normalDataset, error: null }));

      const performanceTime = await measurePerformance(async () => {
        await analyticsService.aggregateRefereeAnalytics(
          '2025-01-01 00:00:00',
          '2025-01-07 23:59:59'
        );
      });

      expect(performanceTime).toBeLessThan(500); // < 500ms
    });

    /**
     * Requirement: Analytics calculations < 100ms overhead
     */
    it('should calculate performance scores with < 100ms overhead', async () => {
      // Mock performance score calculation
      const mockAnalyticsData = [{
        referee_id: '1',
        date: '2025-01-01',
        total_assignments: 10,
        first_referee_count: 5,
        second_referee_count: 3,
        challenge_referee_count: 2,
        tournaments_worked: ['TOUR001', 'TOUR002'],
      }];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue({
                data: mockAnalyticsData,
                error: null,
              }),
            }),
          }),
        }),
      });

      const performanceTime = await measurePerformance(async () => {
        await analyticsService.calculatePerformanceScore('1', {
          start: '2025-01-01',
          end: '2025-01-31',
        });
      });

      expect(performanceTime).toBeLessThan(100); // < 100ms
    });
  });

  describe('Data Processing Performance', () => {
    /**
     * Test batch processing performance with large referee sets
     */
    it('should handle large referee batches efficiently', async () => {
      const largeRefereeSet = Array.from({ length: 1000 }, (_, i) => (i + 1).toString());
      
      // Mock batch processing
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: generateLargeDataset(100), // Simulate reasonable response size per batch
                error: null,
              }),
            }),
          }),
        }),
      });

      const performanceTime = await measurePerformance(async () => {
        await analyticsService.aggregateRefereeAnalytics(
          '2025-01-01 00:00:00',
          '2025-01-31 23:59:59',
          largeRefereeSet
        );
      });

      // Should handle large batches within reasonable time
      expect(performanceTime).toBeLessThan(5000); // < 5 seconds for 1000 referees
    });

    /**
     * Test memory efficiency with large datasets
     */
    it('should maintain memory efficiency with large datasets', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process large dataset
      const largeMetrics = generatePerformanceMetrics(10000);
      
      // Test export performance with large dataset
      const performanceTime = await measurePerformance(async () => {
        await exportService.exportAnalytics(largeMetrics.slice(0, 1000), 'json');
      });

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(performanceTime).toBeLessThan(3000); // < 3 seconds for 1000 referees
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // < 50MB memory increase
    });
  });

  describe('Export Performance', () => {
    /**
     * Test CSV export performance
     */
    it('should export CSV data efficiently', async () => {
      const testData = generatePerformanceMetrics(500);

      const performanceTime = await measurePerformance(async () => {
        await exportService.exportAnalytics(testData, 'csv');
      });

      expect(performanceTime).toBeLessThan(1000); // < 1 second for 500 referees
    });

    /**
     * Test JSON export performance
     */
    it('should export JSON data efficiently', async () => {
      const testData = generatePerformanceMetrics(500);

      const performanceTime = await measurePerformance(async () => {
        await exportService.exportAnalytics(testData, 'json');
      });

      expect(performanceTime).toBeLessThan(1000); // < 1 second for 500 referees
    });

    /**
     * Test PDF generation performance
     */
    it('should generate PDF reports efficiently', async () => {
      const testData = generatePerformanceMetrics(100); // Smaller for PDF

      const performanceTime = await measurePerformance(async () => {
        await exportService.exportAnalytics(testData, 'pdf');
      });

      expect(performanceTime).toBeLessThan(2000); // < 2 seconds for 100 referees
    });
  });

  describe('Concurrent Operations Performance', () => {
    /**
     * Test multiple simultaneous analytics operations
     */
    it('should handle concurrent analytics requests efficiently', async () => {
      // Mock responses for concurrent requests
      mockSupabase.from.mockReturnValue(costruttoreFinto({ data: generateLargeDataset(50), error: null }));

      const concurrentOperations = Array.from({ length: 5 }, (_, i) =>
        analyticsService.aggregateRefereeAnalytics(
          '2025-01-01 00:00:00',
          '2025-01-31 23:59:59',
          [(i + 1).toString(), (i + 2).toString()]
        )
      );

      const performanceTime = await measurePerformance(async () => {
        await Promise.all(concurrentOperations);
      });

      expect(performanceTime).toBeLessThan(3000); // < 3 seconds for 5 concurrent operations
    });
  });

  describe('Data Validation Performance', () => {
    /**
     * Test analytics data validation performance
     */
    it('should validate analytics data efficiently', async () => {
      // Mock validation response
      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            validation_type: 'consistency_check',
            issue_count: 0,
            description: 'All data consistent',
          },
        ],
        error: null,
      });

      const performanceTime = await measurePerformance(async () => {
        await analyticsService.validateAnalyticsData();
      });

      expect(performanceTime).toBeLessThan(200); // < 200ms for validation
    });

    /**
     * Test data cleanup performance
     */
    it('should clean up old data efficiently', async () => {
      // Mock cleanup response
      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            cleanup_type: 'old_analytics',
            records_deleted: 100,
          },
        ],
        error: null,
      });

      const performanceTime = await measurePerformance(async () => {
        await analyticsService.cleanupOldData();
      });

      expect(performanceTime).toBeLessThan(500); // < 500ms for cleanup
    });
  });

  describe('Edge Case Performance', () => {
    /**
     * Test performance with empty datasets
     */
    it('should handle empty datasets efficiently', async () => {
      mockSupabase.from.mockReturnValue(costruttoreFinto({ data: [], error: null }));

      const performanceTime = await measurePerformance(async () => {
        await analyticsService.aggregateRefereeAnalytics(
          '2025-01-01 00:00:00',
          '2025-01-31 23:59:59'
        );
      });

      expect(performanceTime).toBeLessThan(50); // < 50ms for empty dataset
    });

    /**
     * Test performance with single referee
     */
    it('should handle single referee queries efficiently', async () => {
      const singleRefereeData = generateLargeDataset(1);
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue({
                data: singleRefereeData,
                error: null,
              }),
            }),
          }),
        }),
      });

      const performanceTime = await measurePerformance(async () => {
        await analyticsService.calculatePerformanceScore('1', {
          start: '2025-01-01',
          end: '2025-01-31',
        });
      });

      expect(performanceTime).toBeLessThan(25); // < 25ms for single referee
    });
  });

  describe('Performance Monitoring', () => {
    /**
     * Test that performance monitoring doesn't add significant overhead
     */
    it('should have minimal performance monitoring overhead', async () => {
      const testData = generateLargeDataset(100);
      
      mockSupabase.from.mockReturnValue(costruttoreFinto({ data: testData, error: null }));

      // Test with monitoring enabled
      const timeWithMonitoring = await measurePerformance(async () => {
        const serviceWithMonitoring = AnalyticsService.getInstance({
          enablePerformanceMonitoring: true,
        });
        await serviceWithMonitoring.aggregateRefereeAnalytics(
          '2025-01-01 00:00:00',
          '2025-01-31 23:59:59'
        );
      });

      // Test without monitoring
      const timeWithoutMonitoring = await measurePerformance(async () => {
        const serviceWithoutMonitoring = AnalyticsService.getInstance({
          enablePerformanceMonitoring: false,
        });
        await serviceWithoutMonitoring.aggregateRefereeAnalytics(
          '2025-01-01 00:00:00',
          '2025-01-31 23:59:59'
        );
      });

      const overhead = timeWithMonitoring - timeWithoutMonitoring;
      expect(overhead).toBeLessThan(50); // < 50ms overhead
    });
  });
});

// Export utilities for integration testing
export {
  measurePerformance,
  generateLargeDataset,
  generatePerformanceMetrics,
};