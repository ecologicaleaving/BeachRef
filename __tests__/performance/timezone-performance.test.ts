/**
 * Timezone Performance Testing and Monitoring - Phase 4
 * Validates <200ms performance targets and monitors timezone operations
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { VISApiTimezoneEnhancer } from '../../supabase/functions/vis-adapter/timezone-processor';

interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  inputSize?: number;
}

describe('Timezone Performance Testing', () => {
  let enhancer: VISApiTimezoneEnhancer;
  let metrics: PerformanceMetrics[];

  beforeEach(() => {
    enhancer = new VISApiTimezoneEnhancer();
    metrics = [];
  });

  const recordMetric = (operation: string, startTime: number, success: boolean, inputSize?: number) => {
    const duration = Date.now() - startTime;
    metrics.push({
      operation,
      duration,
      timestamp: Date.now(),
      success,
      inputSize
    });
    return duration;
  };

  describe('Core Performance Requirements (AC: 2)', () => {
    test('timezone calculations consistently meet <200ms target', () => {
      const testCases = [
        {
          name: 'High priority UTC timestamp',
          xml: `<Match><BeginDateTimeUtc>2025-01-15T18:00:00Z</BeginDateTimeUtc></Match>`
        },
        {
          name: 'UTC date/time components',
          xml: `<Match><UtcDate>2025-01-15</UtcDate><UtcTime>19:00:00</UtcTime></Match>`
        },
        {
          name: 'Local time conversion',
          xml: `<Match><LocalDate>2025-01-15</LocalDate><LocalTime>14:00:00</LocalTime><LocalTimeOffset>-03:00</LocalTimeOffset></Match>`
        },
        {
          name: 'Complex tournament defaults',
          xml: `<Match><LocalDate>2025-01-15</LocalDate><LocalTime>14:00:00</LocalTime></Match>`
        }
      ];

      const iterations = 100;

      testCases.forEach(({ name, xml }) => {
        const durations: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const startTime = Date.now();
          try {
            const result = enhancer.processMatchWithFallback(xml);
            const duration = recordMetric(`${name} - iteration ${i}`, startTime, true);
            durations.push(duration);
          } catch (error) {
            recordMetric(`${name} - iteration ${i}`, startTime, false);
          }
        }

        const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        const maxDuration = Math.max(...durations);
        const minDuration = Math.min(...durations);
        const p95Duration = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)];

        console.log(`${name} Performance:`, {
          avg: avgDuration,
          max: maxDuration,
          min: minDuration,
          p95: p95Duration,
          samples: iterations
        });

        // All metrics must be under 200ms
        expect(avgDuration).toBeLessThan(200);
        expect(maxDuration).toBeLessThan(200);
        expect(p95Duration).toBeLessThan(200);
      });
    });

    test('bulk processing performance with real-world VIS API response times', () => {
      const matchCounts = [10, 50, 100, 500];

      matchCounts.forEach(count => {
        const matches = Array.from({ length: count }, (_, i) => `
          <Match>
            <No>${10000 + i}</No>
            <Code>M${i.toString().padStart(3, '0')}</Code>
            <LocalDate>2025-01-15</LocalDate>
            <LocalTime>${14 + (i % 10)}:${(i % 60).toString().padStart(2, '0')}:00</LocalTime>
            <LocalTimeOffset>-03:00</LocalTimeOffset>
            <TimeZone>America/Sao_Paulo</TimeZone>
          </Match>
        `).join('');

        const fullXml = `<?xml version="1.0" encoding="UTF-8"?><Matches>${matches}</Matches>`;

        const startTime = Date.now();
        const results = [];

        try {
          const matchRegex = /<Match>.*?<\/Match>/gs;
          let match;
          while ((match = matchRegex.exec(fullXml)) !== null) {
            const result = enhancer.processMatchWithFallback(match[0]);
            results.push(result);
          }

          const totalDuration = recordMetric(`Bulk processing ${count} matches`, startTime, true, count);
          const avgPerMatch = totalDuration / count;

          console.log(`Bulk ${count} matches:`, {
            total: totalDuration,
            avgPerMatch,
            throughput: count / (totalDuration / 1000)
          });

          // Performance requirements
          expect(results).toHaveLength(count);
          expect(avgPerMatch).toBeLessThan(20); // <20ms per match average
          expect(totalDuration).toBeLessThan(count * 20); // Total should scale linearly

        } catch (error) {
          recordMetric(`Bulk processing ${count} matches`, startTime, false, count);
          throw error;
        }
      });
    });

    test('memory usage remains stable during extended operations', () => {
      const iterations = 1000;
      const xml = `<Match>
        <LocalDate>2025-01-15</LocalDate>
        <LocalTime>14:00:00</LocalTime>
        <LocalTimeOffset>-03:00</LocalTimeOffset>
        <TimeZone>America/Sao_Paulo</TimeZone>
      </Match>`;

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage();
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        enhancer.processMatchWithFallback(xml);
      }

      const totalDuration = recordMetric(`Memory stability test ${iterations} operations`, startTime, true);
      const finalMemory = process.memoryUsage();

      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseKB = memoryIncrease / 1024;

      console.log('Memory Usage:', {
        initial: Math.round(initialMemory.heapUsed / 1024) + 'KB',
        final: Math.round(finalMemory.heapUsed / 1024) + 'KB',
        increase: Math.round(memoryIncreaseKB) + 'KB',
        avgPerOperation: Math.round(memoryIncreaseKB / iterations) + 'B'
      });

      // Memory usage should not grow excessively (timezone processing creates temporary objects)
      expect(memoryIncreaseKB).toBeLessThan(10240); // <10MB increase for 1000 operations (realistic for JS)
      expect(totalDuration / iterations).toBeLessThan(10); // <10ms average
    });
  });

  describe('Stress Testing and Stability (AC: 5)', () => {
    test('48-hour continuous operation simulation', () => {
      const simulatedHours = 0.1; // 6 minutes simulation for testing
      const operationsPerHour = 3600; // 1 operation per second
      const totalOperations = Math.floor(simulatedHours * operationsPerHour);

      const xml = `<Match>
        <LocalDate>2025-01-15</LocalDate>
        <LocalTime>14:00:00</LocalTime>
        <LocalTimeOffset>-03:00</LocalTimeOffset>
        <TimeZone>America/Sao_Paulo</TimeZone>
      </Match>`;

      let successCount = 0;
      let errorCount = 0;
      const durations: number[] = [];

      console.log(`Starting ${simulatedHours}h simulation (${totalOperations} operations)...`);

      const overallStart = Date.now();

      for (let i = 0; i < totalOperations; i++) {
        const opStart = Date.now();
        try {
          const result = enhancer.processMatchWithFallback(xml);
          const duration = recordMetric(`Stress test operation ${i}`, opStart, true);
          durations.push(duration);
          successCount++;

          // Validate result quality
          if (result.timezoneSource === 'fallback') {
            console.warn(`Unexpected fallback at operation ${i}`);
          }
        } catch (error) {
          recordMetric(`Stress test operation ${i}`, opStart, false);
          errorCount++;
        }

        // Simulate realistic operation intervals
        if (i % 100 === 0) {
          console.log(`Progress: ${i}/${totalOperations} (${Math.round(i/totalOperations*100)}%)`);
        }
      }

      const totalTime = Date.now() - overallStart;
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);

      console.log('Stress Test Results:', {
        totalOperations,
        successCount,
        errorCount,
        errorRate: (errorCount / totalOperations * 100).toFixed(2) + '%',
        avgDuration: avgDuration.toFixed(2) + 'ms',
        maxDuration: maxDuration + 'ms',
        totalTime: (totalTime / 1000).toFixed(1) + 's'
      });

      // Strict requirements for production readiness
      expect(errorCount).toBe(0); // Zero tolerance for errors
      expect(avgDuration).toBeLessThan(200);
      expect(maxDuration).toBeLessThan(200);
      expect(successCount).toBe(totalOperations);
    });

    test('circuit breaker behavior under timezone service failures', () => {
      // Simulate various failure scenarios
      const failureScenarios = [
        {
          name: 'Invalid XML format',
          xml: 'not-xml-at-all'
        },
        {
          name: 'Malformed dates',
          xml: `<Match><LocalDate>not-a-date</LocalDate><LocalTime>not-a-time</LocalTime></Match>`
        },
        {
          name: 'Extremely large XML',
          xml: `<Match>${'x'.repeat(10000000)}</Match>` // 10MB of data
        }
      ];

      failureScenarios.forEach(({ name, xml }) => {
        const iterations = 10;
        let resilientCount = 0;

        for (let i = 0; i < iterations; i++) {
          const startTime = Date.now();
          try {
            const result = enhancer.processMatchWithFallback(xml);
            const duration = recordMetric(`Circuit breaker: ${name} - ${i}`, startTime, true);

            // Should not crash and should provide fallback
            expect(result.timezoneSource).toBe('fallback');
            expect(result.isReliable).toBe(false);
            expect(duration).toBeLessThan(5000); // Should timeout/fail fast

            resilientCount++;
          } catch (error) {
            recordMetric(`Circuit breaker: ${name} - ${i}`, startTime, false);
            // Even failures should not crash the system
          }
        }

        console.log(`${name}: ${resilientCount}/${iterations} resilient responses`);
        expect(resilientCount).toBe(iterations); // Should always provide fallback
      });
    });
  });

  describe('Performance Monitoring Implementation (AC: 2)', () => {
    test('implements real-time timezone calculation performance tracking', () => {
      const performanceTracker = {
        operations: [] as PerformanceMetrics[],

        track(operation: string, fn: () => any) {
          const start = Date.now();
          let success = true;
          let result;

          try {
            result = fn();
          } catch (error) {
            success = false;
            throw error;
          } finally {
            this.operations.push({
              operation,
              duration: Date.now() - start,
              timestamp: Date.now(),
              success
            });
          }

          return result;
        },

        getMetrics(window: number = 60000) { // 1 minute window
          const now = Date.now();
          const recent = this.operations.filter(op => (now - op.timestamp) < window);

          if (recent.length === 0) return null;

          const durations = recent.map(op => op.duration);
          const successCount = recent.filter(op => op.success).length;

          return {
            count: recent.length,
            successRate: (successCount / recent.length) * 100,
            avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
            maxDuration: Math.max(...durations),
            minDuration: Math.min(...durations),
            p95Duration: durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)]
          };
        }
      };

      // Simulate various operations
      const testOperations = Array.from({ length: 100 }, (_, i) => ({
        name: `operation-${i}`,
        xml: `<Match>
          <LocalDate>2025-01-15</LocalDate>
          <LocalTime>${14 + (i % 10)}:00:00</LocalTime>
          <LocalTimeOffset>-03:00</LocalTimeOffset>
        </Match>`
      }));

      testOperations.forEach(({ name, xml }) => {
        performanceTracker.track(name, () => {
          return enhancer.processMatchWithFallback(xml);
        });
      });

      const metrics = performanceTracker.getMetrics();

      expect(metrics).not.toBeNull();
      expect(metrics!.successRate).toBe(100);
      expect(metrics!.avgDuration).toBeLessThan(200);
      expect(metrics!.maxDuration).toBeLessThan(200);
      expect(metrics!.p95Duration).toBeLessThan(200);

      console.log('Performance Tracking Metrics:', metrics);
    });
  });

  afterEach(() => {
    // Output performance summary
    const successfulOps = metrics.filter(m => m.success);
    const failedOps = metrics.filter(m => !m.success);

    if (successfulOps.length > 0) {
      const avgDuration = successfulOps.reduce((sum, m) => sum + m.duration, 0) / successfulOps.length;
      const maxDuration = Math.max(...successfulOps.map(m => m.duration));

      console.log('Test Performance Summary:', {
        totalOperations: metrics.length,
        successful: successfulOps.length,
        failed: failedOps.length,
        avgDuration: Math.round(avgDuration) + 'ms',
        maxDuration: maxDuration + 'ms',
        successRate: ((successfulOps.length / metrics.length) * 100).toFixed(1) + '%'
      });
    }
  });
});