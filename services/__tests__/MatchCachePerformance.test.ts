import { CacheService } from '../CacheService';
import { VisApiService } from '../visApi';
import { BeachMatch } from '../../types/match';

// Performance testing utilities
interface PerformanceTestResult {
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  successRate: number;
  cacheHitRate?: number;
}

describe('Match Cache Performance Validation', () => {
  const sampleMatches: BeachMatch[] = [
    {
      No: '1',
      NoInTournament: '1',
      TeamAName: 'Team A',
      TeamBName: 'Team B',
      LocalDate: '2024-01-15',
      LocalTime: '14:00:00',
      Court: '1',
      Status: 'Live',
      MatchPointsA: '1',
      MatchPointsB: '0'
    },
    {
      No: '2',
      NoInTournament: '2',
      TeamAName: 'Team C',
      TeamBName: 'Team D',
      LocalDate: '2024-01-15',
      LocalTime: '16:00:00',
      Court: '2',
      Status: 'Scheduled',
      MatchPointsA: '0',
      MatchPointsB: '0'
    }
  ];

  beforeEach(() => {
    // Initialize cache service
    CacheService.initialize();
  });

  afterEach(async () => {
    // Clean up cache
    await CacheService.cleanup();
  });

  const measurePerformance = async (
    operation: () => Promise<any>,
    iterations: number = 10
  ): Promise<PerformanceTestResult> => {
    const times: number[] = [];
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
      try {
        const start = performance.now();
        await operation();
        const end = performance.now();
        times.push(end - start);
        successCount++;
      } catch (error) {
        // console.warn(`Performance test iteration ${i + 1} failed:`, error);
      }
    }

    const avgResponseTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minResponseTime = Math.min(...times);
    const maxResponseTime = Math.max(...times);
    const successRate = (successCount / iterations) * 100;

    return {
      avgResponseTime,
      minResponseTime,
      maxResponseTime,
      successRate
    };
  };

  describe('Memory Cache Performance', () => {
    it('should provide sub-100ms response times for memory cache hits', async () => {
      const tournamentNo = 'PERF_TEST_MEMORY';
      
      // Pre-populate memory cache
      CacheService.setInMemory(
        CacheService.generateCacheKey('matches', { tournamentNo }),
        sampleMatches,
        5 * 60 * 1000 // 5 minutes TTL
      );

      const performance = await measurePerformance(async () => {
        return CacheService.getFromMemory(
          CacheService.generateCacheKey('matches', { tournamentNo })
        );
      }, 20);

      expect(performance.avgResponseTime).toBeLessThan(100);
      expect(performance.successRate).toBe(100);
      expect(performance.maxResponseTime).toBeLessThan(100);
    });
  });

  describe('Cache Hit Ratio', () => {
    it('should achieve at least 70% cache hit ratio in repeated requests', async () => {
      const tournamentNo = 'PERF_TEST_HIT_RATIO';
      let cacheHits = 0;
      let totalRequests = 0;

      // Mock the cache service to track hits
      const originalGetFromMemory = CacheService.getFromMemory;
      CacheService.getFromMemory = jest.fn().mockImplementation((key: string) => {
        totalRequests++;
        const result = originalGetFromMemory.call(CacheService, key);
        if (result) {
          cacheHits++;
        }
        return result;
      });

      try {
        // First request - will be a cache miss
        CacheService.setInMemory(
          CacheService.generateCacheKey('matches', { tournamentNo }),
          sampleMatches,
          5 * 60 * 1000
        );

        // Make multiple requests
        for (let i = 0; i < 10; i++) {
          CacheService.getFromMemory(
            CacheService.generateCacheKey('matches', { tournamentNo })
          );
        }

        const hitRatio = (cacheHits / totalRequests) * 100;
        expect(hitRatio).toBeGreaterThanOrEqual(70);

      } finally {
        // Restore original method
        CacheService.getFromMemory = originalGetFromMemory;
      }
    });
  });

  describe('Dynamic TTL Performance', () => {
    it('should calculate TTL efficiently for different match statuses', async () => {
      const liveMatches: BeachMatch[] = sampleMatches.map(m => ({ ...m, Status: 'Live' }));
      const scheduledMatches: BeachMatch[] = sampleMatches.map(m => ({ ...m, Status: 'Scheduled' }));
      const finishedMatches: BeachMatch[] = sampleMatches.map(m => ({ ...m, Status: 'Finished' }));

      const testTTLCalculation = async (matches: BeachMatch[]) => {
        const start = performance.now();
        // Access the private method via any cast for testing
        (CacheService as any).calculateMatchesTTL(matches);
        const end = performance.now();
        return end - start;
      };

      const liveTime = await testTTLCalculation(liveMatches);
      const scheduledTime = await testTTLCalculation(scheduledMatches);
      const finishedTime = await testTTLCalculation(finishedMatches);

      // TTL calculation should be very fast (sub-millisecond)
      expect(liveTime).toBeLessThan(10);
      expect(scheduledTime).toBeLessThan(10);
      expect(finishedTime).toBeLessThan(10);
    });
  });

  describe('Cache Tier Fallback Performance', () => {
    it('should maintain acceptable performance even with tier fallbacks', async () => {
      const tournamentNo = 'PERF_TEST_FALLBACK';

      // Mock fetch for API fallback
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<BeachMatch No="1" NoInTournament="1" TeamAName="Team A" />')
      });

      const performance = await measurePerformance(async () => {
        return VisApiService.fetchMatchesDirectFromAPI(tournamentNo);
      }, 5);

      // API fallback should complete within reasonable time (under 5 seconds)
      expect(performance.avgResponseTime).toBeLessThan(5000);
      expect(performance.successRate).toBe(100);
    });
  });

  describe('Performance Improvement Validation', () => {
    it('should demonstrate 50% performance improvement with cached data', async () => {
      const tournamentNo = 'PERF_TEST_IMPROVEMENT';

      // Mock direct API to be slower
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              text: () => Promise.resolve('<BeachMatch No="1" NoInTournament="1" TeamAName="Team A" />')
            });
          }, 200); // Simulate 200ms API response
        })
      );

      // Measure direct API performance
      const directApiPerf = await measurePerformance(async () => {
        return VisApiService.fetchMatchesDirectFromAPI(tournamentNo);
      }, 5);

      // Pre-populate cache
      CacheService.setInMemory(
        CacheService.generateCacheKey('matches', { tournamentNo }),
        sampleMatches,
        5 * 60 * 1000
      );

      // Measure cached performance
      const cachedPerf = await measurePerformance(async () => {
        return CacheService.getFromMemory(
          CacheService.generateCacheKey('matches', { tournamentNo })
        );
      }, 5);

      // Calculate improvement
      const improvementRatio = directApiPerf.avgResponseTime / cachedPerf.avgResponseTime;
      const improvementPercentage = ((directApiPerf.avgResponseTime - cachedPerf.avgResponseTime) / directApiPerf.avgResponseTime) * 100;

      // console.log(`Performance improvement: ${improvementPercentage.toFixed(1)}% (${improvementRatio.toFixed(1)}x faster)`);
      // console.log(`Direct API: ${directApiPerf.avgResponseTime.toFixed(2)}ms, Cached: ${cachedPerf.avgResponseTime.toFixed(2)}ms`);

      // Should be at least 50% improvement
      expect(improvementPercentage).toBeGreaterThanOrEqual(50);
      expect(improvementRatio).toBeGreaterThanOrEqual(1.5);
    });
  });

  describe('Load Testing', () => {
    it('should handle concurrent requests efficiently', async () => {
      const tournamentNo = 'PERF_TEST_CONCURRENT';
      
      // Pre-populate cache
      CacheService.setInMemory(
        CacheService.generateCacheKey('matches', { tournamentNo }),
        sampleMatches,
        5 * 60 * 1000
      );

      // Create multiple concurrent requests
      const concurrentRequests = Array.from({ length: 20 }, () =>
        CacheService.getFromMemory(
          CacheService.generateCacheKey('matches', { tournamentNo })
        )
      );

      const start = performance.now();
      const results = await Promise.all(concurrentRequests);
      const end = performance.now();

      const totalTime = end - start;
      const avgTimePerRequest = totalTime / concurrentRequests.length;

      // All requests should succeed
      expect(results.every(result => result !== null)).toBe(true);
      
      // Average time per request should still be fast
      expect(avgTimePerRequest).toBeLessThan(50); // 50ms per request in concurrent scenario
    });
  });
});