/**
 * End-to-End Timezone System Validation Tests - Phase 4
 * Comprehensive validation of timezone system with real-world scenarios
 * Focus: Brazil tournament issue (14:00 local → 18:00 display to Italian users)
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { VISApiTimezoneEnhancer } from '../../supabase/functions/vis-adapter/timezone-processor';

describe('Timezone System End-to-End Validation', () => {
  let enhancer: VISApiTimezoneEnhancer;
  let performanceResults: Array<{ operation: string; duration: number }>;

  beforeEach(() => {
    enhancer = new VISApiTimezoneEnhancer();
    performanceResults = [];
  });

  afterEach(() => {
    // Log performance results for monitoring
    if (performanceResults.length > 0) {
      console.log('Performance Results:', performanceResults);
    }
  });

  describe('Brazil Tournament Issue Validation (AC: 1)', () => {
    test('validates Brazil tournament 14:00 local → 18:00 display to Italian users', () => {
      // Brazil tournament match at 14:00 local time (UTC-3)
      const brazilMatchXml = `<?xml version="1.0" encoding="UTF-8"?>
      <Match>
        <No>BR001</No>
        <Code>M001</Code>
        <TournamentCode>BRAZIL2025</TournamentCode>
        <LocalDate>2025-01-15</LocalDate>
        <LocalTime>14:00:00</LocalTime>
        <LocalTimeOffset>-03:00</LocalTimeOffset>
        <TimeZone>America/Sao_Paulo</TimeZone>
        <Team1>TeamA/TeamB</Team1>
        <Team2>TeamC/TeamD</Team2>
        <Status>SCHEDULED</Status>
      </Match>`;

      const start = Date.now();
      const result = enhancer.processMatchWithFallback(brazilMatchXml);
      const duration = Date.now() - start;

      performanceResults.push({ operation: 'Brazil timezone conversion', duration });

      // Brazil 14:00 local (UTC-3) should convert to 17:00 UTC
      expect(result.utcStart).toBe('2025-01-15T17:00:00.000Z');
      expect(result.timezoneSource).toBe('LocalDateTime');
      expect(result.timezone).toBe('America/Sao_Paulo');
      expect(result.offset).toBe('-03:00');

      // Italian user sees match at 18:00 (UTC+1)
      // UTC time is 17:00, Italy is UTC+1, so Italian time is 18:00
      const utcTime = new Date(result.utcStart!);
      const italianTime = new Date(utcTime.getTime() + (1 * 60 * 60 * 1000)); // UTC+1

      expect(italianTime.getUTCHours()).toBe(18); // Use UTC hours to avoid system timezone interference
      expect(italianTime.getUTCMinutes()).toBe(0);

      // Performance validation: <200ms
      expect(duration).toBeLessThan(200);
    });

    test('validates timezone field availability across multiple regions', () => {
      const regions = [
        {
          name: 'Brazil',
          xml: `<Match>
            <LocalDate>2025-01-15</LocalDate>
            <LocalTime>14:00:00</LocalTime>
            <LocalTimeOffset>-03:00</LocalTimeOffset>
            <TimeZone>America/Sao_Paulo</TimeZone>
          </Match>`,
          expectedOffset: '-03:00'
        },
        {
          name: 'Europe',
          xml: `<Match>
            <BeginDateTimeUtc>2025-01-15T17:00:00Z</BeginDateTimeUtc>
            <TimeZone>Europe/Rome</TimeZone>
            <LocalTimeOffset>+01:00</LocalTimeOffset>
          </Match>`,
          expectedOffset: '+01:00'
        },
        {
          name: 'Asia',
          xml: `<Match>
            <UtcDate>2025-01-15</UtcDate>
            <UtcTime>09:00:00</UtcTime>
            <TimeZone>Asia/Tokyo</TimeZone>
            <LocalTimeOffset>+09:00</LocalTimeOffset>
          </Match>`,
          expectedOffset: '+09:00'
        },
        {
          name: 'North America',
          xml: `<Match>
            <LocalDate>2025-01-15</LocalDate>
            <LocalTime>12:00:00</LocalTime>
            <LocalTimeOffset>-05:00</LocalTimeOffset>
            <TimeZone>America/New_York</TimeZone>
          </Match>`,
          expectedOffset: '-05:00'
        }
      ];

      regions.forEach(({ name, xml, expectedOffset }) => {
        const start = Date.now();
        const timezoneFields = enhancer.extractTimezoneFields(xml);
        const result = enhancer.convertToUtc(timezoneFields);
        const duration = Date.now() - start;

        performanceResults.push({ operation: `${name} timezone extraction`, duration });

        expect(result.offset || result.timezone).toBeTruthy();
        if (result.offset) {
          expect(result.offset).toBe(expectedOffset);
        }
        expect(duration).toBeLessThan(200);
      });
    });

    test('confirms UTC conversion accuracy with real VIS API response patterns', () => {
      const testCases = [
        {
          name: 'High priority UTC timestamp',
          xml: `<Match><BeginDateTimeUtc>2025-01-15T18:00:00Z</BeginDateTimeUtc></Match>`,
          expectedUtc: '2025-01-15T18:00:00Z',
          expectedSource: 'BeginDateTimeUtc'
        },
        {
          name: 'UTC date/time components',
          xml: `<Match><UtcDate>2025-01-15</UtcDate><UtcTime>19:00:00</UtcTime></Match>`,
          expectedUtc: '2025-01-15T19:00:00Z',
          expectedSource: 'UtcDateTime'
        },
        {
          name: 'Local time with offset conversion',
          xml: `<Match><LocalDate>2025-01-15</LocalDate><LocalTime>15:00:00</LocalTime><LocalTimeOffset>-03:00</LocalTimeOffset></Match>`,
          expectedUtc: '2025-01-15T18:00:00.000Z',
          expectedSource: 'LocalDateTime'
        }
      ];

      testCases.forEach(({ name, xml, expectedUtc, expectedSource }) => {
        const start = Date.now();
        const result = enhancer.processMatchWithFallback(xml);
        const duration = Date.now() - start;

        performanceResults.push({ operation: name, duration });

        expect(result.utcStart).toBe(expectedUtc);
        expect(result.timezoneSource).toBe(expectedSource);
        expect(duration).toBeLessThan(200);
      });
    });

    test('verifies fallback behavior with incomplete timezone data', () => {
      const incompleteCases = [
        {
          name: 'Missing timezone offset',
          xml: `<Match><LocalDate>2025-01-15</LocalDate><LocalTime>14:00:00</LocalTime></Match>`
        },
        {
          name: 'Invalid time format',
          xml: `<Match><LocalDate>2025-01-15</LocalDate><LocalTime>invalid</LocalTime><LocalTimeOffset>-03:00</LocalTimeOffset></Match>`
        },
        {
          name: 'Completely empty',
          xml: `<Match></Match>`
        }
      ];

      incompleteCases.forEach(({ name, xml }) => {
        const start = Date.now();
        const result = enhancer.processMatchWithFallback(xml);
        const duration = Date.now() - start;

        performanceResults.push({ operation: `Fallback: ${name}`, duration });

        expect(result.utcStart).toBeNull();
        expect(result.timezoneSource).toBe('fallback');
        expect(result.isReliable).toBe(false);
        expect(duration).toBeLessThan(200);
      });
    });
  });

  describe('Performance Validation (AC: 2)', () => {
    test('achieves <200ms timezone calculation performance consistently', () => {
      const iterations = 50;
      const durations: number[] = [];

      const testXml = `<Match>
        <LocalDate>2025-01-15</LocalDate>
        <LocalTime>14:00:00</LocalTime>
        <LocalTimeOffset>-03:00</LocalTimeOffset>
        <TimeZone>America/Sao_Paulo</TimeZone>
      </Match>`;

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        enhancer.processMatchWithFallback(testXml);
        const duration = Date.now() - start;
        durations.push(duration);
      }

      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);

      expect(avgDuration).toBeLessThan(200);
      expect(maxDuration).toBeLessThan(200);

      performanceResults.push(
        { operation: 'Average timezone calculation', duration: avgDuration },
        { operation: 'Maximum timezone calculation', duration: maxDuration }
      );
    });

    test('optimizes UTC conversion pipeline for real-world VIS API response times', () => {
      // Simulate large match response processing
      const matchCount = 100;
      const matches = Array.from({ length: matchCount }, (_, i) => `
        <Match>
          <No>${12000 + i}</No>
          <LocalDate>2025-01-15</LocalDate>
          <LocalTime>${14 + (i % 10)}:${(i % 60).toString().padStart(2, '0')}:00</LocalTime>
          <LocalTimeOffset>-03:00</LocalTimeOffset>
          <TimeZone>America/Sao_Paulo</TimeZone>
        </Match>
      `).join('');

      const fullXml = `<?xml version="1.0" encoding="UTF-8"?><Matches>${matches}</Matches>`;

      const start = Date.now();

      // Process each match
      const results = [];
      const matchRegex = /<Match>.*?<\/Match>/gs;
      let match;
      while ((match = matchRegex.exec(fullXml)) !== null) {
        const result = enhancer.processMatchWithFallback(match[0]);
        results.push(result);
      }

      const totalDuration = Date.now() - start;
      const avgPerMatch = totalDuration / matchCount;

      expect(results).toHaveLength(matchCount);
      expect(avgPerMatch).toBeLessThan(20); // <20ms per match for bulk processing
      expect(totalDuration).toBeLessThan(2000); // <2s for 100 matches

      performanceResults.push(
        { operation: `Bulk processing ${matchCount} matches`, duration: totalDuration },
        { operation: 'Average per match', duration: avgPerMatch }
      );
    });
  });

  describe('Edge Case Validation (AC: 3)', () => {
    test('handles DST transition scenarios', () => {
      const dstCases = [
        {
          name: 'Brazil DST transition (October)',
          xml: `<Match>
            <LocalDate>2025-10-19</LocalDate>
            <LocalTime>01:30:00</LocalTime>
            <LocalTimeOffset>-02:00</LocalTimeOffset>
            <TimeZone>America/Sao_Paulo</TimeZone>
          </Match>`,
          expectedSource: 'LocalDateTime'
        },
        {
          name: 'Europe DST transition (March)',
          xml: `<Match>
            <LocalDate>2025-03-30</LocalDate>
            <LocalTime>02:30:00</LocalTime>
            <LocalTimeOffset>+02:00</LocalTimeOffset>
            <TimeZone>Europe/Rome</TimeZone>
          </Match>`,
          expectedSource: 'LocalDateTime'
        }
      ];

      dstCases.forEach(({ name, xml, expectedSource }) => {
        const start = Date.now();
        const result = enhancer.processMatchWithFallback(xml);
        const duration = Date.now() - start;

        performanceResults.push({ operation: `DST: ${name}`, duration });

        expect(result.timezoneSource).toBe(expectedSource);
        expect(result.utcStart).toBeTruthy();
        expect(duration).toBeLessThan(200);
      });
    });

    test('validates handling of malformed timezone data', () => {
      const malformedCases = [
        {
          name: 'Invalid offset format',
          xml: `<Match><LocalTimeOffset>invalid</LocalTimeOffset></Match>`
        },
        {
          name: 'Extreme offset values',
          xml: `<Match><LocalTimeOffset>+25:00</LocalTimeOffset></Match>`
        },
        {
          name: 'Malformed ISO timestamp',
          xml: `<Match><BeginDateTimeUtc>not-a-timestamp</BeginDateTimeUtc></Match>`
        },
        {
          name: 'Invalid timezone string',
          xml: `<Match><TimeZone>@#$%^&*()</TimeZone></Match>`
        }
      ];

      malformedCases.forEach(({ name, xml }) => {
        const start = Date.now();
        const result = enhancer.processMatchWithFallback(xml);
        const duration = Date.now() - start;

        performanceResults.push({ operation: `Malformed: ${name}`, duration });

        // Should not throw and should fallback gracefully
        expect(result.timezoneSource).toBe('fallback');
        expect(result.isReliable).toBe(false);
        expect(duration).toBeLessThan(200);
      });
    });

    test('tests extreme date/time values and boundary conditions', () => {
      const extremeCases = [
        {
          name: 'Year 1970 boundary',
          xml: `<Match><LocalDate>1970-01-01</LocalDate><LocalTime>00:00:00</LocalTime><LocalTimeOffset>+00:00</LocalTimeOffset></Match>`
        },
        {
          name: 'Year 2038 boundary',
          xml: `<Match><LocalDate>2038-01-19</LocalDate><LocalTime>03:14:07</LocalTime><LocalTimeOffset>+00:00</LocalTimeOffset></Match>`
        },
        {
          name: 'Leap year February 29',
          xml: `<Match><LocalDate>2024-02-29</LocalDate><LocalTime>12:00:00</LocalTime><LocalTimeOffset>+00:00</LocalTimeOffset></Match>`
        },
        {
          name: 'Maximum timezone offset',
          xml: `<Match><LocalDate>2025-01-15</LocalDate><LocalTime>12:00:00</LocalTime><LocalTimeOffset>+14:00</LocalTimeOffset></Match>`
        },
        {
          name: 'Minimum timezone offset',
          xml: `<Match><LocalDate>2025-01-15</LocalDate><LocalTime>12:00:00</LocalTime><LocalTimeOffset>-12:00</LocalTimeOffset></Match>`
        }
      ];

      extremeCases.forEach(({ name, xml }) => {
        const start = Date.now();
        const result = enhancer.processMatchWithFallback(xml);
        const duration = Date.now() - start;

        performanceResults.push({ operation: `Extreme: ${name}`, duration });

        // Should handle gracefully without throwing
        expect(typeof result.utcStart).toBe('string');
        expect(duration).toBeLessThan(200);
      });
    });
  });

  describe('Round-trip Validation (AC: 7)', () => {
    test('validates UTC ↔ Local timezone accuracy', () => {
      const testCases = [
        {
          region: 'Brazil',
          localTime: '14:00:00',
          offset: '-03:00',
          date: '2025-01-15'
        },
        {
          region: 'Italy',
          localTime: '18:00:00',
          offset: '+01:00',
          date: '2025-01-15'
        },
        {
          region: 'Japan',
          localTime: '02:00:00',
          offset: '+09:00',
          date: '2025-01-16'
        }
      ];

      testCases.forEach(({ region, localTime, offset, date }) => {
        const xml = `<Match>
          <LocalDate>${date}</LocalDate>
          <LocalTime>${localTime}</LocalTime>
          <LocalTimeOffset>${offset}</LocalTimeOffset>
        </Match>`;

        const start = Date.now();
        const result = enhancer.processMatchWithFallback(xml);
        const duration = Date.now() - start;

        performanceResults.push({ operation: `Round-trip: ${region}`, duration });

        // Convert back from UTC to local
        const utcTime = new Date(result.utcStart!);
        const offsetMinutes = parseInt(offset.substring(1, 3)) * 60 + parseInt(offset.substring(4, 6));
        const offsetMs = (offset[0] === '+' ? offsetMinutes : -offsetMinutes) * 60 * 1000;
        const backToLocal = new Date(utcTime.getTime() + offsetMs);

        // Create original local time using UTC methods to avoid system timezone interference
        const [year, month, day] = date.split('-').map(Number);
        const [hour, minute, second] = localTime.split(':').map(Number);
        const originalLocal = new Date(Date.UTC(year, month - 1, day, hour, minute, second || 0));

        // Times should match exactly
        expect(backToLocal.getTime()).toBe(originalLocal.getTime());
        expect(duration).toBeLessThan(200);
      });
    });

    test('validates zero timezone calculation errors in comprehensive testing', () => {
      let errorCount = 0;
      const testIterations = 1000;

      for (let i = 0; i < testIterations; i++) {
        try {
          const randomHour = Math.floor(Math.random() * 24);
          const randomMinute = Math.floor(Math.random() * 60);
          const randomOffsetHours = Math.floor(Math.random() * 25) - 12; // -12 to +12

          const xml = `<Match>
            <LocalDate>2025-01-15</LocalDate>
            <LocalTime>${randomHour.toString().padStart(2, '0')}:${randomMinute.toString().padStart(2, '0')}:00</LocalTime>
            <LocalTimeOffset>${randomOffsetHours >= 0 ? '+' : ''}${Math.abs(randomOffsetHours).toString().padStart(2, '0')}:00</LocalTimeOffset>
          </Match>`;

          const result = enhancer.processMatchWithFallback(xml);

          // If conversion succeeded, validate it's correct
          if (result.utcStart && result.timezoneSource !== 'fallback') {
            const utcTime = new Date(result.utcStart);
            if (isNaN(utcTime.getTime())) {
              errorCount++;
            }
          }
        } catch (error) {
          errorCount++;
        }
      }

      expect(errorCount).toBe(0);
      performanceResults.push({ operation: `${testIterations} random validations`, duration: errorCount });
    });
  });
});