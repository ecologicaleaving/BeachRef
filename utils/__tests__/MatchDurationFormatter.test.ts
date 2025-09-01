/**
 * @fileoverview Unit tests for MatchDurationFormatter
 * Tests duration parsing and formatting edge cases
 */

import { parseTimeString, calculateTotalDuration } from '../MatchDurationFormatter';

describe('MatchDurationFormatter', () => {
  describe('parseTimeString', () => {
    test('should parse valid time strings correctly', () => {
      expect(parseTimeString('25:30')).toBe(1530); // 25*60 + 30 = 1530 seconds
      expect(parseTimeString('5:45')).toBe(345); // 5*60 + 45 = 345 seconds
      expect(parseTimeString('0:30')).toBe(30); // 30 seconds
      expect(parseTimeString('60:00')).toBe(3600); // 1 hour
      expect(parseTimeString('120:59')).toBe(7259); // 2 hours 59 seconds
    });

    test('should handle edge cases for valid formats', () => {
      expect(parseTimeString('0:00')).toBe(0);
      expect(parseTimeString('0:01')).toBe(1);
      expect(parseTimeString('1:00')).toBe(60);
      expect(parseTimeString('999:59')).toBe(59999); // Max supported
    });

    test('should return 0 for invalid formats', () => {
      expect(parseTimeString('')).toBe(0);
      expect(parseTimeString('25')).toBe(0); // Missing seconds
      expect(parseTimeString('25:60')).toBe(0); // Invalid seconds (>= 60)
      expect(parseTimeString('25:5')).toBe(0); // Single digit seconds
      expect(parseTimeString('25.30')).toBe(0); // Wrong separator
      expect(parseTimeString('25:30:00')).toBe(0); // Too many parts
      expect(parseTimeString('-5:30')).toBe(0); // Negative minutes
      expect(parseTimeString('5:-30')).toBe(0); // Negative seconds
      expect(parseTimeString('abc:30')).toBe(0); // Non-numeric minutes
      expect(parseTimeString('25:abc')).toBe(0); // Non-numeric seconds
    });

    test('should handle null, undefined, and non-string inputs', () => {
      expect(parseTimeString(null as any)).toBe(0);
      expect(parseTimeString(undefined as any)).toBe(0);
      expect(parseTimeString(123 as any)).toBe(0);
      expect(parseTimeString({} as any)).toBe(0);
      expect(parseTimeString([] as any)).toBe(0);
    });

    test('should handle whitespace', () => {
      expect(parseTimeString(' 25:30 ')).toBe(1530); // Trimmed
      expect(parseTimeString('  ')).toBe(0); // Only whitespace
      expect(parseTimeString('\t25:30\n')).toBe(1530); // Various whitespace
    });
  });

  describe('calculateTotalDuration', () => {
    test('should calculate total duration from multiple sets', () => {
      expect(calculateTotalDuration('25:30', '28:45', '18:20'))
        .toBe('1h 12m'); // 1530 + 1725 + 1100 = 4355 seconds = 72.58 minutes = 1h 12m (floored)
      
      expect(calculateTotalDuration('22:15', '24:30'))
        .toBe('46m'); // 1335 + 1470 = 2805 seconds = 46.75 minutes = 46m (floored)
      
      expect(calculateTotalDuration('45:00'))
        .toBe('45m'); // Single set
    });

    test('should handle incomplete match data', () => {
      expect(calculateTotalDuration('25:30', undefined, undefined))
        .toBe('25m'); // Only first set
      
      expect(calculateTotalDuration(undefined, '28:45', undefined))
        .toBe('28m'); // Only second set
      
      expect(calculateTotalDuration(undefined, undefined, '18:20'))
        .toBe('18m'); // Only third set
      
      expect(calculateTotalDuration('25:30', '28:45', undefined))
        .toBe('54m'); // First two sets
    });

    test('should return null for no valid durations', () => {
      expect(calculateTotalDuration()).toBe(null);
      expect(calculateTotalDuration(undefined, undefined, undefined)).toBe(null);
      expect(calculateTotalDuration('', '', '')).toBe(null);
      expect(calculateTotalDuration('invalid', 'also invalid', '25:60')).toBe(null);
    });

    test('should ignore invalid durations and use valid ones', () => {
      expect(calculateTotalDuration('25:30', 'invalid', '18:20'))
        .toBe('43m'); // 1530 + 1100 = 2630 seconds = 43.8 minutes = 43m (floored)
      
      expect(calculateTotalDuration('', '28:45', '25:60'))
        .toBe('28m'); // Only middle duration is valid
      
      expect(calculateTotalDuration('0:00', '28:45', '18:20'))
        .toBe('47m'); // Zero duration ignored, sum valid ones
    });

    test('should format hours correctly', () => {
      // Mock long duration to test hour formatting
      expect(calculateTotalDuration('60:00', '60:00', '60:00'))
        .toBe('3h'); // Exactly 3 hours
      
      expect(calculateTotalDuration('65:30', '70:45'))
        .toBe('2h 16m'); // 3930 + 4245 = 8175 seconds = 136.25 minutes = 2h 16m
    });

    test('should handle zero total duration', () => {
      expect(calculateTotalDuration('0:00', '0:00', '0:00')).toBe(null);
      expect(calculateTotalDuration('0:00')).toBe(null);
    });

    test('should handle edge case formatting', () => {
      // Test exact hour boundaries
      expect(calculateTotalDuration('30:00', '30:00')).toBe('1h'); // Exactly 1 hour
      expect(calculateTotalDuration('59:59')).toBe('59m'); // Just under 1 hour
      expect(calculateTotalDuration('60:01')).toBe('1h'); // Just over 1 hour (floors to 1h 0m)
    });
  });

  describe('integration scenarios', () => {
    test('should handle realistic beach volleyball match durations', () => {
      // Typical 2-set match (21-19, 21-17)
      expect(calculateTotalDuration('28:45', '25:30'))
        .toBe('54m');
      
      // Long 3-set match (21-19, 19-21, 15-13)
      expect(calculateTotalDuration('32:15', '35:40', '22:30'))
        .toBe('1h 30m');
      
      // Quick 2-set match (21-8, 21-12)
      expect(calculateTotalDuration('18:20', '19:45'))
        .toBe('38m');
    });

    test('should handle incomplete live match scenarios', () => {
      // Match in progress - only first set complete
      expect(calculateTotalDuration('25:30', undefined, undefined))
        .toBe('25m');
      
      // Match in progress - two sets complete
      expect(calculateTotalDuration('25:30', '28:45', undefined))
        .toBe('54m');
    });
  });
});