/**
 * @fileoverview Unit tests for MatchDurationFormatter
 * Tests duration parsing and formatting for VIS API data
 *
 * VIS API returns Duration as positive 32-bit integer (seconds).
 * Example: DurationSet1 = "1530" means 25 minutes 30 seconds
 */

import {
  calculateTotalDuration,
  parseDuration,
  parseDurationLegacy,
  parseDurationSeconds,
  parseTimeString,
  formatDuration,
} from '../MatchDurationFormatter';

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
      // Note: '25' is no longer treated as minutes - use parseDuration() for VIS API seconds
      expect(parseTimeString('25')).toBe(0); // Not a valid "mm:ss" format
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

  // ============================================================
  // VIS API INTEGER SECONDS FORMAT TESTS
  // ============================================================
  // VIS API returns Duration as positive 32-bit integer (seconds)
  // Example: DurationSet1 = "1530" = 25 minutes 30 seconds

  describe('parseDurationSeconds (VIS API format)', () => {
    test('should parse integer seconds correctly', () => {
      expect(parseDurationSeconds('1530')).toBe(1530); // 25:30
      expect(parseDurationSeconds('1725')).toBe(1725); // 28:45
      expect(parseDurationSeconds('0')).toBe(0);
      expect(parseDurationSeconds('60')).toBe(60); // 1 minute
      expect(parseDurationSeconds('3600')).toBe(3600); // 1 hour
    });

    test('should handle number input directly', () => {
      expect(parseDurationSeconds(1530)).toBe(1530);
      expect(parseDurationSeconds(0)).toBe(0);
      expect(parseDurationSeconds(3600)).toBe(3600);
    });

    test('should handle string integer input', () => {
      expect(parseDurationSeconds('1530')).toBe(1530);
      expect(parseDurationSeconds(' 1530 ')).toBe(1530); // Note: parseInt handles leading/trailing spaces
      expect(parseDurationSeconds('0')).toBe(0);
    });

    test('should return 0 for invalid/empty input', () => {
      expect(parseDurationSeconds('')).toBe(0);
      expect(parseDurationSeconds(null)).toBe(0);
      expect(parseDurationSeconds(undefined)).toBe(0);
      expect(parseDurationSeconds('abc')).toBe(0);
      expect(parseDurationSeconds(-100)).toBe(0);
      expect(parseDurationSeconds('-100')).toBe(0);
    });
  });

  describe('parseDurationLegacy (backward compatibility)', () => {
    test('should parse mm:ss format for cached data', () => {
      expect(parseDurationLegacy('25:30')).toBe(1530);
      expect(parseDurationLegacy('28:45')).toBe(1725);
      expect(parseDurationLegacy('0:30')).toBe(30);
    });

    test('should return 0 for non-colon format', () => {
      // Legacy parser only handles "mm:ss" format
      expect(parseDurationLegacy('1530')).toBe(0); // Not legacy format
      expect(parseDurationLegacy('25')).toBe(0); // Not legacy format
    });
  });

  describe('parseDuration (smart parser)', () => {
    test('should parse VIS API integer seconds (primary format)', () => {
      expect(parseDuration('1530')).toBe(1530);
      expect(parseDuration('1725')).toBe(1725);
      expect(parseDuration(1530)).toBe(1530);
      expect(parseDuration(0)).toBe(0);
    });

    test('should fallback to legacy mm:ss format', () => {
      expect(parseDuration('25:30')).toBe(1530);
      expect(parseDuration('28:45')).toBe(1725);
      expect(parseDuration('0:30')).toBe(30);
    });

    test('should handle null/undefined/empty gracefully', () => {
      expect(parseDuration(null)).toBe(0);
      expect(parseDuration(undefined)).toBe(0);
      expect(parseDuration('')).toBe(0);
      expect(parseDuration('   ')).toBe(0);
    });
  });

  describe('calculateTotalDuration with VIS API format', () => {
    test('should calculate from integer seconds', () => {
      // 2-set match: 1530 + 1725 = 3255 seconds = 54.25 min = "54m"
      expect(calculateTotalDuration('1530', '1725')).toBe('54m');

      // 3-set match: 1935 + 2140 + 1350 = 5425 seconds = 90.4 min = "1h 30m"
      expect(calculateTotalDuration('1935', '2140', '1350')).toBe('1h 30m');
    });

    test('should calculate from number input', () => {
      expect(calculateTotalDuration(1530, 1725)).toBe('54m');
      expect(calculateTotalDuration(1935, 2140, 1350)).toBe('1h 30m');
    });

    test('should handle mixed formats (VIS API + cached legacy)', () => {
      // First set from API (seconds), second from cache (mm:ss)
      expect(calculateTotalDuration('1530', '28:45')).toBe('54m');
      expect(calculateTotalDuration(1530, '28:45')).toBe('54m');
    });

    test('should return null for zero duration', () => {
      expect(calculateTotalDuration('0', '0')).toBe(null);
      expect(calculateTotalDuration(0, 0, 0)).toBe(null);
    });
  });

  describe('formatDuration', () => {
    test('should format seconds to human-readable', () => {
      expect(formatDuration(3255)).toBe('54m'); // 54.25 min
      expect(formatDuration(5400)).toBe('1h 30m'); // 90 min
      expect(formatDuration(3600)).toBe('1h'); // Exactly 1 hour
      expect(formatDuration(2700)).toBe('45m'); // 45 min
    });

    test('should return null for zero/negative/small values', () => {
      expect(formatDuration(0)).toBe(null);
      expect(formatDuration(-100)).toBe(null);
      expect(formatDuration(30)).toBe(null); // Less than 1 minute
      expect(formatDuration(59)).toBe(null); // Less than 1 minute
    });

    test('should show minimum 1 minute for 60+ seconds', () => {
      expect(formatDuration(60)).toBe('1m');
      expect(formatDuration(119)).toBe('1m'); // 1:59 rounds to 1m
    });
  });

  describe('VIS API integration scenarios', () => {
    test('should handle realistic VIS API match data', () => {
      // Typical 2-set match from VIS API
      // Set 1: 25:30 = 1530 seconds
      // Set 2: 28:45 = 1725 seconds
      expect(calculateTotalDuration('1530', '1725')).toBe('54m');

      // Long 3-set match
      // Set 1: 32:15 = 1935 seconds
      // Set 2: 35:40 = 2140 seconds
      // Set 3: 22:30 = 1350 seconds
      expect(calculateTotalDuration('1935', '2140', '1350')).toBe('1h 30m');

      // Quick 2-set match
      // Set 1: 18:20 = 1100 seconds
      // Set 2: 19:45 = 1185 seconds
      expect(calculateTotalDuration('1100', '1185')).toBe('38m');
    });

    test('should handle live match in progress', () => {
      // Only first set complete (1530 seconds = 25:30)
      expect(calculateTotalDuration('1530', undefined, undefined)).toBe('25m');

      // Two sets complete
      expect(calculateTotalDuration('1530', '1725', undefined)).toBe('54m');
    });

    test('should validate quickstart.md scenarios', () => {
      // From quickstart.md validation table:
      // | 2-set match | 1530, 1725 | "54m" |
      expect(calculateTotalDuration('1530', '1725')).toBe('54m');

      // | 3-set match | 1935, 2140, 1350 | "1h 30m" |
      expect(calculateTotalDuration('1935', '2140', '1350')).toBe('1h 30m');

      // | Quick match | 1100, 1185 | "38m" |
      expect(calculateTotalDuration('1100', '1185')).toBe('38m');

      // | No duration | null, null | (nothing) |
      expect(calculateTotalDuration(undefined, undefined)).toBe(null);

      // | Zero duration | 0, 0 | (nothing) |
      expect(calculateTotalDuration('0', '0')).toBe(null);

      // | Cached legacy | "25:30", "28:45" | "54m" (backward compatible) |
      expect(calculateTotalDuration('25:30', '28:45')).toBe('54m');
    });
  });
});