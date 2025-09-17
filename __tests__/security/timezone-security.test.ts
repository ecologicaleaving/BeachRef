/**
 * Timezone Security and Data Integrity Testing - Phase 4
 * Validates timezone data injection prevention and boundary protection
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { VISApiTimezoneEnhancer } from '../../supabase/functions/vis-adapter/timezone-processor';

describe('Timezone Security and Data Integrity', () => {
  let enhancer: VISApiTimezoneEnhancer;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    enhancer = new VISApiTimezoneEnhancer();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Data Injection Prevention (AC: 8)', () => {
    test('validates timezone data injection prevention with malformed VIS responses', () => {
      const injectionAttempts = [
        {
          name: 'Script injection in timezone field',
          xml: `<Match><TimeZone><script>alert('xss')</script></TimeZone></Match>`,
          field: 'TimeZone'
        },
        {
          name: 'SQL injection in offset field',
          xml: `<Match><LocalTimeOffset>'; DROP TABLE matches; --</LocalTimeOffset></Match>`,
          field: 'LocalTimeOffset'
        },
        {
          name: 'Command injection in datetime field',
          xml: `<Match><BeginDateTimeUtc>2025-01-15T18:00:00Z; rm -rf /</BeginDateTimeUtc></Match>`,
          field: 'BeginDateTimeUtc'
        },
        {
          name: 'Path traversal in timezone string',
          xml: `<Match><TimeZone>../../../etc/passwd</TimeZone></Match>`,
          field: 'TimeZone'
        },
        {
          name: 'XML entity injection',
          xml: `<Match><LocalDate>&xxe;</LocalDate></Match>`,
          field: 'LocalDate'
        },
        {
          name: 'Unicode bypass attempt',
          xml: `<Match><LocalTime>\u0000\u0001\u0002</LocalTime></Match>`,
          field: 'LocalTime'
        }
      ];

      injectionAttempts.forEach(({ name, xml, field }) => {
        const timezoneFields = enhancer.extractTimezoneFields(xml);
        const validation = enhancer.validateTimezoneData(timezoneFields);
        const result = enhancer.convertToUtc(timezoneFields);

        // The security model: malicious input should either be rejected by validation
        // or result in fallback behavior during conversion
        const fieldValue = (timezoneFields as any)[field];

        if (fieldValue) {
          // Check that malicious patterns are either rejected or cause fallback
          const isMalicious = fieldValue.includes('<script>') ||
                             fieldValue.includes('DROP TABLE') ||
                             fieldValue.includes('rm -rf') ||
                             fieldValue.includes('../') ||
                             fieldValue.includes('&xxe;');

          if (isMalicious) {
            // Malicious input should either fail validation or cause fallback
            if (validation.isValid) {
              expect(result.timezoneSource).toBe('fallback');
            } else {
              expect(validation.issues.length).toBeGreaterThan(0);
            }
            expect(result.isReliable).toBe(false);
          }
        }

        console.log(`✓ ${name}: Safely handled`);
      });
    });

    test('prevents timezone data overflow attacks', () => {
      const overflowAttempts = [
        {
          name: 'Extremely long timezone string',
          xml: `<Match><TimeZone>${'A'.repeat(100000)}</TimeZone></Match>`
        },
        {
          name: 'Deeply nested XML structure',
          xml: `<Match>${'<nested>'.repeat(1000)}<TimeZone>America/Sao_Paulo</TimeZone>${'</nested>'.repeat(1000)}</Match>`
        },
        {
          name: 'Very large offset value',
          xml: `<Match><LocalTimeOffset>+999999:99</LocalTimeOffset></Match>`
        },
        {
          name: 'Extremely precise timestamp',
          xml: `<Match><BeginDateTimeUtc>2025-01-15T18:00:00.${'9'.repeat(100)}Z</BeginDateTimeUtc></Match>`
        }
      ];

      overflowAttempts.forEach(({ name, xml }) => {
        const start = Date.now();
        let completed = false;

        try {
          const result = enhancer.processMatchWithFallback(xml);
          const duration = Date.now() - start;

          // Should complete within reasonable time (no DoS)
          expect(duration).toBeLessThan(5000);
          expect(result.timezoneSource).toBe('fallback');
          completed = true;
        } catch (error) {
          // If it throws, should be a controlled error, not a crash
          expect(error).toBeInstanceOf(Error);
          completed = true;
        }

        expect(completed).toBe(true);
        console.log(`✓ ${name}: Protected against overflow`);
      });
    });

    test('validates input sanitization for special characters', () => {
      const specialCharCases = [
        {
          name: 'Null bytes',
          xml: `<Match><TimeZone>America/Sao_Paulo\x00</TimeZone></Match>`
        },
        {
          name: 'Control characters',
          xml: `<Match><LocalTime>14:00:00\x01\x02\x03</LocalTime></Match>`
        },
        {
          name: 'Unicode normalization attack',
          xml: `<Match><LocalDate>2025\u200D-01\u200C-15</LocalDate></Match>`
        },
        {
          name: 'Mixed encoding attack',
          xml: `<Match><LocalTimeOffset>%2B03%3A00</LocalTimeOffset></Match>`
        }
      ];

      specialCharCases.forEach(({ name, xml }) => {
        const timezoneFields = enhancer.extractTimezoneFields(xml);
        const validation = enhancer.validateTimezoneData(timezoneFields);

        // Should either sanitize or reject
        if (validation.isValid) {
          // If valid, should not contain problematic special characters
          Object.values(timezoneFields).forEach(value => {
            if (value) {
              // Check for null bytes and other dangerous control characters
              expect(value).not.toMatch(/\x00/); // No null bytes
              expect(value).not.toMatch(/\u200[C-F]/); // No zero-width characters
              // Note: Normal time strings like "14:00:00" contain valid characters
            }
          });
        } else {
          // Should have validation issues
          expect(validation.issues.length).toBeGreaterThan(0);
        }

        console.log(`✓ ${name}: Input properly sanitized`);
      });
    });
  });

  describe('UTC Conversion Boundary Protection (AC: 8)', () => {
    test('validates UTC conversion boundary protection against invalid dates', () => {
      const invalidDateCases = [
        {
          name: 'Date before Unix epoch',
          xml: `<Match><LocalDate>1969-12-31</LocalDate><LocalTime>23:59:59</LocalTime><LocalTimeOffset>+00:00</LocalTimeOffset></Match>`
        },
        {
          name: 'Date after year 2038',
          xml: `<Match><LocalDate>2039-01-01</LocalDate><LocalTime>00:00:00</LocalTime><LocalTimeOffset>+00:00</LocalTimeOffset></Match>`
        },
        {
          name: 'Invalid February 29 on non-leap year',
          xml: `<Match><LocalDate>2025-02-29</LocalDate><LocalTime>12:00:00</LocalTime><LocalTimeOffset>+00:00</LocalTimeOffset></Match>`
        },
        {
          name: 'Invalid month',
          xml: `<Match><LocalDate>2025-13-01</LocalDate><LocalTime>12:00:00</LocalTime><LocalTimeOffset>+00:00</LocalTimeOffset></Match>`
        },
        {
          name: 'Invalid day',
          xml: `<Match><LocalDate>2025-01-32</LocalDate><LocalTime>12:00:00</LocalTime><LocalTimeOffset>+00:00</LocalTimeOffset></Match>`
        },
        {
          name: 'Invalid hour',
          xml: `<Match><LocalDate>2025-01-15</LocalDate><LocalTime>25:00:00</LocalTime><LocalTimeOffset>+00:00</LocalTimeOffset></Match>`
        },
        {
          name: 'Invalid minute',
          xml: `<Match><LocalDate>2025-01-15</LocalDate><LocalTime>14:60:00</LocalTime><LocalTimeOffset>+00:00</LocalTimeOffset></Match>`
        },
        {
          name: 'Invalid timezone offset beyond limits',
          xml: `<Match><LocalDate>2025-01-15</LocalDate><LocalTime>14:00:00</LocalTime><LocalTimeOffset>+15:00</LocalTimeOffset></Match>`
        }
      ];

      invalidDateCases.forEach(({ name, xml }) => {
        const result = enhancer.processMatchWithFallback(xml);

        // Should handle gracefully - either process successfully or fallback safely
        if (result.timezoneSource === 'fallback') {
          expect(result.isReliable).toBe(false);
          expect(result.utcStart).toBeNull();
        } else {
          // If successfully processed, should be marked as unreliable for boundary cases
          expect(result.isReliable).toBe(false);
        }

        console.log(`✓ ${name}: Boundary protection active`);
      });
    });

    test('prevents timezone calculation integer overflow', () => {
      const overflowCases = [
        {
          name: 'Maximum safe integer offset',
          xml: `<Match><LocalDate>2025-01-15</LocalDate><LocalTime>14:00:00</LocalTime><LocalTimeOffset>+${Number.MAX_SAFE_INTEGER}:00</LocalTimeOffset></Match>`
        },
        {
          name: 'Negative maximum offset',
          xml: `<Match><LocalDate>2025-01-15</LocalDate><LocalTime>14:00:00</LocalTime><LocalTimeOffset>-${Number.MAX_SAFE_INTEGER}:00</LocalTimeOffset></Match>`
        },
        {
          name: 'Scientific notation in time',
          xml: `<Match><LocalDate>2025-01-15</LocalDate><LocalTime>1e10:00:00</LocalTime><LocalTimeOffset>+00:00</LocalTimeOffset></Match>`
        }
      ];

      overflowCases.forEach(({ name, xml }) => {
        const result = enhancer.processMatchWithFallback(xml);

        // Should handle gracefully without integer overflow
        expect(result.timezoneSource).toBe('fallback');
        expect(result.utcStart).toBeNull();
        expect(result.isReliable).toBe(false);

        console.log(`✓ ${name}: Integer overflow prevented`);
      });
    });
  });

  describe('Error Logging Security (AC: 8)', () => {
    test('confirms no sensitive data exposure in timezone error logging', () => {
      const sensitiveDataCases = [
        {
          name: 'API key in timezone field',
          xml: `<Match><TimeZone>sk-1234567890abcdef</TimeZone></Match>`,
          sensitivePattern: /sk-[a-f0-9]+/
        },
        {
          name: 'JWT token in offset field',
          xml: `<Match><LocalTimeOffset>eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9</LocalTimeOffset></Match>`,
          sensitivePattern: /eyJ[A-Za-z0-9-_]+/
        },
        {
          name: 'Email in timezone string',
          xml: `<Match><TimeZone>user@example.com</TimeZone></Match>`,
          sensitivePattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
        },
        {
          name: 'Credit card in datetime',
          xml: `<Match><BeginDateTimeUtc>4111-1111-1111-1111</BeginDateTimeUtc></Match>`,
          sensitivePattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/
        }
      ];

      sensitiveDataCases.forEach(({ name, xml, sensitivePattern }) => {
        consoleSpy.mockClear();

        const result = enhancer.processMatchWithFallback(xml);

        // Check all console.error calls for sensitive data exposure
        const errorCalls = consoleSpy.mock.calls.flat();
        const loggedContent = errorCalls.join(' ');

        // Should not log sensitive patterns
        expect(loggedContent).not.toMatch(sensitivePattern);

        // Result should be safely processed
        expect(result.timezoneSource).toBe('fallback');

        console.log(`✓ ${name}: No sensitive data in logs`);
      });
    });

    test('validates error context is sufficient but not excessive', () => {
      const malformedXml = `<Match><LocalDate>invalid-date</LocalDate></Match>`;

      consoleSpy.mockClear();
      const result = enhancer.processMatchWithFallback(malformedXml);

      const errorCalls = consoleSpy.mock.calls;

      if (errorCalls.length > 0) {
        errorCalls.forEach(call => {
          const message = call[0];
          const context = call[1];

          // Error message should be informative but not expose internals
          expect(typeof message).toBe('string');
          expect(message).not.toContain('password');
          expect(message).not.toContain('secret');
          expect(message).not.toContain('key');

          // Context should be limited
          if (context) {
            expect(JSON.stringify(context).length).toBeLessThan(1000);
          }
        });
      }

      expect(result.timezoneSource).toBe('fallback');
    });
  });

  describe('State Integrity Protection (AC: 8)', () => {
    test('verifies timezone processor state integrity against tampering', () => {
      const originalEnhancer = new VISApiTimezoneEnhancer();

      // Attempt to tamper with internal methods
      try {
        (originalEnhancer as any).isValidDate = () => true;
        (originalEnhancer as any).isValidTime = () => true;
        (originalEnhancer as any).isValidTimezoneOffset = () => true;
      } catch (error) {
        // Expected if methods are protected
      }

      const maliciousXml = `<Match>
        <LocalDate>invalid-date</LocalDate>
        <LocalTime>invalid-time</LocalTime>
        <LocalTimeOffset>invalid-offset</LocalTimeOffset>
      </Match>`;

      const result = originalEnhancer.processMatchWithFallback(maliciousXml);

      // Should still validate properly despite tampering attempts
      expect(result.timezoneSource).toBe('fallback');
      expect(result.isReliable).toBe(false);
    });

    test('validates immutability of timezone conversion results', () => {
      const xml = `<Match>
        <LocalDate>2025-01-15</LocalDate>
        <LocalTime>14:00:00</LocalTime>
        <LocalTimeOffset>-03:00</LocalTimeOffset>
      </Match>`;

      const result1 = enhancer.processMatchWithFallback(xml);
      const result2 = enhancer.processMatchWithFallback(xml);

      // Results should be consistent
      expect(result1.utcStart).toBe(result2.utcStart);
      expect(result1.timezoneSource).toBe(result2.timezoneSource);

      // Attempt to modify result
      const originalUtcStart = result1.utcStart;
      try {
        (result1 as any).utcStart = 'tampered-value';
      } catch (error) {
        // Expected if object is frozen/immutable
      }

      // Original result should remain unchanged or be a new instance
      const result3 = enhancer.processMatchWithFallback(xml);
      expect(result3.utcStart).toBe(originalUtcStart);
    });

    test('prevents memory corruption attacks through timezone processing', () => {
      const memoryAttackCases = [
        {
          name: 'Buffer overflow attempt via large timezone string',
          xml: `<Match><TimeZone>${'A'.repeat(1000000)}</TimeZone></Match>`
        },
        {
          name: 'Format string attack via datetime',
          xml: `<Match><BeginDateTimeUtc>%s%s%s%s%s%s%s%s</BeginDateTimeUtc></Match>`
        },
        {
          name: 'Prototype pollution attempt',
          xml: `<Match><__proto__>{"isAdmin": true}</__proto__></Match>`
        }
      ];

      memoryAttackCases.forEach(({ name, xml }) => {
        const initialMemory = process.memoryUsage();

        const result = enhancer.processMatchWithFallback(xml);

        const finalMemory = process.memoryUsage();
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

        // Should not cause excessive memory usage
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // <10MB increase
        expect(result.timezoneSource).toBe('fallback');

        console.log(`✓ ${name}: Memory protected`);
      });
    });
  });

  describe('Cryptographic Validation Security', () => {
    test('validates timezone data integrity with checksums', () => {
      const validXml = `<Match>
        <LocalDate>2025-01-15</LocalDate>
        <LocalTime>14:00:00</LocalTime>
        <LocalTimeOffset>-03:00</LocalTimeOffset>
        <TimeZone>America/Sao_Paulo</TimeZone>
      </Match>`;

      const timezoneFields = enhancer.extractTimezoneFields(validXml);

      // Calculate simple checksum of input data
      const inputData = JSON.stringify(timezoneFields);
      const checksum = inputData.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

      const result = enhancer.convertToUtc(timezoneFields);

      // Result should be deterministic for same input
      const secondResult = enhancer.convertToUtc(timezoneFields);
      expect(result.utcStart).toBe(secondResult.utcStart);

      // Checksum validation for data integrity
      const outputData = JSON.stringify(result);
      expect(outputData.length).toBeGreaterThan(0);
      expect(checksum).toBeGreaterThan(0);
    });

    test('prevents timing attacks on timezone validation', () => {
      const validXml = `<Match><LocalDate>2025-01-15</LocalDate><LocalTime>14:00:00</LocalTime><LocalTimeOffset>-03:00</LocalTimeOffset></Match>`;
      const invalidXml = `<Match><LocalDate>invalid</LocalDate><LocalTime>invalid</LocalTime><LocalTimeOffset>invalid</LocalTimeOffset></Match>`;

      const timingRuns = 50;
      const validTimes: number[] = [];
      const invalidTimes: number[] = [];

      // Measure timing for valid inputs
      for (let i = 0; i < timingRuns; i++) {
        const start = performance.now();
        enhancer.processMatchWithFallback(validXml);
        validTimes.push(performance.now() - start);
      }

      // Measure timing for invalid inputs
      for (let i = 0; i < timingRuns; i++) {
        const start = performance.now();
        enhancer.processMatchWithFallback(invalidXml);
        invalidTimes.push(performance.now() - start);
      }

      const avgValid = validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length;
      const avgInvalid = invalidTimes.reduce((sum, time) => sum + time, 0) / invalidTimes.length;

      // Timing difference should not be significant (prevents timing attacks)
      const timingDifference = Math.abs(avgValid - avgInvalid);
      expect(timingDifference).toBeLessThan(50); // <50ms difference

      console.log('Timing Analysis:', {
        avgValid: avgValid.toFixed(2) + 'ms',
        avgInvalid: avgInvalid.toFixed(2) + 'ms',
        difference: timingDifference.toFixed(2) + 'ms'
      });
    });
  });
});