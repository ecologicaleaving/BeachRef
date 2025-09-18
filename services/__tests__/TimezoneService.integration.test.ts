/**
 * Integration test for TimezoneService with live API data simulation
 * Tests performance and accuracy with real-world VIS API response patterns
 */

import { TimezoneService, VISTimezoneFields } from '../TimezoneService';

// Mock dependencies for integration test
jest.mock('../ConnectionCircuitBreaker', () => ({
  ConnectionCircuitBreaker: {
    getInstance: jest.fn(() => ({
      canExecute: jest.fn(() => true),
      onSuccess: jest.fn(),
      onFailure: jest.fn(),
      isHealthy: jest.fn(() => true),
      getState: jest.fn(() => 'CLOSED'),
    })),
  },
}));

jest.mock('../ErrorLogger', () => ({
  ErrorLogger: {
    logError: jest.fn(),
  },
}));

describe('TimezoneService Integration Tests', () => {
  beforeEach(() => {
    TimezoneService.resetMetrics();
  });

  describe('Live API Data Simulation', () => {
    it('should handle Brazil tournament data correctly (Story validation)', async () => {
      // Simulates actual VIS API response for Brazil tournament matches
      const brazilTournamentData: VISTimezoneFields[] = [
        {
          // High accuracy: Direct UTC timestamp
          BeginDateTimeUtc: '2024-03-15T17:00:00.000Z', // 17:00 UTC = 14:00 BRT
          LocalDate: '2024-03-15',
          LocalTime: '14:00:00',
          TimeZone: 'BRT',
        },
        {
          // Medium accuracy: UTC components
          UtcDate: '2024-03-15',
          UtcTime: '17:00:00',
          LocalDate: '2024-03-15',
          LocalTime: '14:00:00',
          TimeZone: 'America/Sao_Paulo',
        },
        {
          // Medium accuracy: Local time with offset
          LocalDate: '2024-03-15',
          LocalTime: '14:00:00',
          LocalTimeOffset: '-03:00', // Brazil Standard Time
          TimeZone: 'BRT',
        },
        {
          // Low accuracy: Local time only (fallback)
          LocalDate: '2024-03-15',
          LocalTime: '14:00:00',
        },
      ];

      const results = await TimezoneService.testWithVISData(brazilTournamentData);

      // Validate results meet story requirements
      expect(results.passed).toBe(4); // All conversions should succeed
      expect(results.failed).toBe(0);
      expect(results.averageTime).toBeLessThan(200); // Performance requirement

      // Validate specific timezone conversions
      results.results.forEach((result, index) => {
        expect(TimezoneService.validateUTCResult(result)).toBe(true);

        // First three should have 17:00 UTC (14:00 BRT + 3 hours)
        if (index < 3) {
          expect(result.utcStart.getUTCHours()).toBe(17);
          expect(result.fallbackUsed).toBe(false);
        }
      });

      // Check accuracy distribution
      const highAccuracy = results.results.filter(r => r.conversionAccuracy === 'high').length;
      const mediumAccuracy = results.results.filter(r => r.conversionAccuracy === 'medium').length;
      const lowAccuracy = results.results.filter(r => r.conversionAccuracy === 'low').length;

      expect(highAccuracy).toBe(2); // BeginDateTimeUtc + UtcDate/UtcTime
      expect(mediumAccuracy).toBe(1); // LocalTime + Offset
      expect(lowAccuracy).toBe(1);   // LocalTime only
    });

    it('should handle multi-region tournament data efficiently', async () => {
      // Simulates VIS API responses from different tournament regions
      const multiRegionData: VISTimezoneFields[] = [
        // Brazil tournament
        {
          LocalDate: '2024-03-15',
          LocalTime: '14:00:00',
          TimeZone: 'America/Sao_Paulo',
        },
        // Italy tournament
        {
          LocalDate: '2024-03-15',
          LocalTime: '14:00:00',
          TimeZone: 'Europe/Rome',
        },
        // USA tournament
        {
          LocalDate: '2024-03-15',
          LocalTime: '14:00:00',
          TimeZone: 'America/New_York',
        },
        // Asian tournament
        {
          LocalDate: '2024-03-15',
          LocalTime: '14:00:00',
          TimeZone: 'Asia/Tokyo',
        },
        // Unknown timezone (should fallback)
        {
          LocalDate: '2024-03-15',
          LocalTime: '14:00:00',
          TimeZone: 'UNKNOWN_TZ',
        },
      ];

      const startTime = Date.now();
      const results = await TimezoneService.testWithVISData(multiRegionData);
      const totalTime = Date.now() - startTime;

      // Performance validation
      expect(totalTime).toBeLessThan(1000); // Total batch processing < 1 second
      expect(results.averageTime).toBeLessThan(200); // Individual conversion < 200ms

      // Accuracy validation
      expect(results.passed).toBe(5); // All should succeed
      expect(results.failed).toBe(0);

      // Validate timezone handling
      expect(results.results[0].detectedTimezone).toBe('America/Sao_Paulo');
      expect(results.results[1].detectedTimezone).toBe('Europe/Rome');
      expect(results.results[2].detectedTimezone).toBe('America/New_York');
      expect(results.results[3].detectedTimezone).toBe('Asia/Tokyo');
      expect(results.results[4].detectedTimezone).toBe('UTC'); // Fallback for unknown

      // Validate UTC conversion differences
      const utcHours = results.results.map(r => r.utcStart.getUTCHours());
      expect(new Set(utcHours).size).toBeGreaterThan(1); // Different timezones should produce different UTC times
    });

    it('should handle DST transition scenarios correctly', async () => {
      // Test DST transitions in different regions
      const dstTransitionData: VISTimezoneFields[] = [
        // Brazil DST transition (first Sunday in November)
        {
          LocalDate: '2024-11-03',
          LocalTime: '02:00:00',
          TimeZone: 'America/Sao_Paulo',
        },
        // Europe DST transition (last Sunday in October)
        {
          LocalDate: '2024-10-27',
          LocalTime: '02:00:00',
          TimeZone: 'Europe/Rome',
        },
        // US DST transition (first Sunday in November)
        {
          LocalDate: '2024-11-03',
          LocalTime: '02:00:00',
          TimeZone: 'America/New_York',
        },
      ];

      const results = await TimezoneService.testWithVISData(dstTransitionData);

      // All should succeed even during DST transitions
      expect(results.passed).toBe(3);
      expect(results.failed).toBe(0);
      expect(results.averageTime).toBeLessThan(200);

      // All results should be valid
      results.results.forEach(result => {
        expect(TimezoneService.validateUTCResult(result)).toBe(true);
        expect(result.conversionAccuracy).toBe('medium');
        expect(result.fallbackUsed).toBe(false);
      });
    });

    it('should maintain performance under stress conditions', async () => {
      // Generate large dataset simulating busy tournament day
      const stressTestData: VISTimezoneFields[] = [];
      const timezones = ['America/Sao_Paulo', 'Europe/Rome', 'America/New_York', 'Asia/Tokyo', 'UTC'];

      // Generate 100 matches across different timezones
      for (let i = 0; i < 100; i++) {
        stressTestData.push({
          LocalDate: '2024-03-15',
          LocalTime: `${String(8 + (i % 14)).padStart(2, '0')}:${String((i * 15) % 60).padStart(2, '0')}:00`,
          TimeZone: timezones[i % timezones.length],
          LocalTimeOffset: i % 2 === 0 ? '-03:00' : undefined, // Mix with/without offset
        });
      }

      const startTime = Date.now();
      const results = await TimezoneService.testWithVISData(stressTestData);
      const totalTime = Date.now() - startTime;

      // Performance requirements under stress
      expect(totalTime).toBeLessThan(10000); // Total processing < 10 seconds
      expect(results.averageTime).toBeLessThan(200); // Average still < 200ms
      expect(results.passed).toBe(100); // All should succeed
      expect(results.failed).toBe(0);

      // Validate service health after stress test
      expect(TimezoneService.isHealthy()).toBe(true);

      const metrics = TimezoneService.getPerformanceMetrics();
      expect(metrics.successCount).toBeGreaterThanOrEqual(100);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.averageResponseTime).toBeLessThan(200);
    });
  });

  describe('Error Resilience with Live Data Patterns', () => {
    it('should handle partial/malformed VIS API responses gracefully', async () => {
      const malformedData: VISTimezoneFields[] = [
        // Valid data
        {
          LocalDate: '2024-03-15',
          LocalTime: '14:00:00',
          TimeZone: 'America/Sao_Paulo',
        },
        // Missing time
        {
          LocalDate: '2024-03-15',
          TimeZone: 'America/Sao_Paulo',
        },
        // Invalid UTC timestamp
        {
          BeginDateTimeUtc: 'invalid-timestamp',
          LocalDate: '2024-03-15',
          LocalTime: '14:00:00',
        },
        // Invalid offset
        {
          LocalDate: '2024-03-15',
          LocalTime: '14:00:00',
          LocalTimeOffset: 'invalid-offset',
        },
        // Empty data
        {},
      ];

      const results = await TimezoneService.testWithVISData(malformedData);

      // Should handle errors gracefully with fallbacks
      expect(results.passed).toBeGreaterThan(0); // At least some should succeed
      expect(results.averageTime).toBeLessThan(200);

      // First item should succeed
      expect(TimezoneService.validateUTCResult(results.results[0])).toBe(true);
      expect(results.results[0].fallbackUsed).toBe(false);

      // Others should use fallbacks or ultimate fallback
      results.results.slice(1).forEach(result => {
        expect(result.fallbackUsed).toBe(true);
        expect(result.conversionAccuracy).toBe('low');
      });
    });
  });

  describe('Story Validation: Brazil Tournament Issue', () => {
    it('should resolve the exact Brazil tournament scenario from story', async () => {
      // Exact scenario: Italy user viewing Brazil tournament
      // Brazil local time 14:00 should convert correctly to UTC for Italian user display

      const brazilMatchData: VISTimezoneFields = {
        LocalDate: '2024-06-15', // Summer time period
        LocalTime: '14:00:00',   // 14:00 local time in Brazil
        TimeZone: 'America/Sao_Paulo',
      };

      const result = await TimezoneService.convertToUTC(brazilMatchData);

      // Validate conversion accuracy
      expect(result.fallbackUsed).toBe(false);
      expect(result.conversionAccuracy).toBe('medium');
      expect(result.detectedTimezone).toBe('America/Sao_Paulo');

      // Brazil Standard Time (BRT) is UTC-3
      // 14:00 BRT = 17:00 UTC
      expect(result.utcStart.getUTCHours()).toBe(17);
      expect(result.utcStart.getUTCMinutes()).toBe(0);

      // Italy (Rome) in summer is UTC+2
      // 17:00 UTC = 19:00 Italy time
      // This validates that Italian users will see correct converted time

      // Validate performance
      const metrics = TimezoneService.getPerformanceMetrics();
      expect(metrics.conversionTime).toBeLessThan(200);
      expect(metrics.averageResponseTime).toBeLessThan(200);

      // Validate result structure
      expect(result.sourceFields).toEqual(['LocalDate', 'LocalTime', 'TimeZone']);
      expect(result.originalLocalDate).toBe('2024-06-15');
      expect(result.originalLocalTime).toBe('14:00:00');
    });
  });
});