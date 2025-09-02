/**
 * @fileoverview Unit tests for VisDurationParser
 * Tests VIS seconds-based duration parsing and formatting
 * Part of VIS Data Structure Alignment Epic - Story 1.2
 */

import {
  calculateTotalDurationFromSeconds,
  formatDurationFromSeconds,
  convertSecondsToTimeString,
  parseTimeStringToSeconds,
  calculateMixedFormatDuration,
  convertLegacyDurationsToVisSeconds
} from '../VisDurationParser';

describe('VisDurationParser', () => {
  describe('calculateTotalDurationFromSeconds', () => {
    test('should calculate total duration from VIS seconds fields', () => {
      // Test case from existing tests: 25:30 + 28:45 + 18:20 = 1530 + 1725 + 1100 = 4355 seconds
      expect(calculateTotalDurationFromSeconds(1530, 1725, 1100))
        .toBe('1h 12m'); // 4355 seconds = 72.58 minutes = 1h 12m (floored)
      
      // Test case: 22:15 + 24:30 = 1335 + 1470 = 2805 seconds  
      expect(calculateTotalDurationFromSeconds(1335, 1470))
        .toBe('46m'); // 2805 seconds = 46.75 minutes = 46m (floored)
      
      // Single set
      expect(calculateTotalDurationFromSeconds(2700)) // 45:00 = 2700 seconds
        .toBe('45m');
    });

    test('should handle incomplete match data with VIS seconds', () => {
      expect(calculateTotalDurationFromSeconds(1530, undefined, undefined))
        .toBe('25m'); // Only first set: 1530 seconds = 25.5 minutes = 25m
      
      expect(calculateTotalDurationFromSeconds(undefined, 1725, undefined))
        .toBe('28m'); // Only second set: 1725 seconds = 28.75 minutes = 28m
      
      expect(calculateTotalDurationFromSeconds(undefined, undefined, 1100))
        .toBe('18m'); // Only third set: 1100 seconds = 18.33 minutes = 18m
    });

    test('should return null for no valid durations', () => {
      expect(calculateTotalDurationFromSeconds()).toBe(null);
      expect(calculateTotalDurationFromSeconds(undefined, undefined, undefined)).toBe(null);
      expect(calculateTotalDurationFromSeconds(0, 0, 0)).toBe(null);
      expect(calculateTotalDurationFromSeconds(-100, NaN, 0)).toBe(null);
    });

    test('should ignore invalid durations and use valid ones', () => {
      expect(calculateTotalDurationFromSeconds(1530, NaN, 1100))
        .toBe('43m'); // 1530 + 1100 = 2630 seconds = 43.8 minutes = 43m
      
      expect(calculateTotalDurationFromSeconds(-500, 1725, 0))
        .toBe('28m'); // Only middle duration is valid: 1725 seconds = 28.75 minutes = 28m
      
      expect(calculateTotalDurationFromSeconds(0, 1725, 1100))
        .toBe('47m'); // Zero duration ignored: 1725 + 1100 = 2825 seconds = 47.08 minutes = 47m
    });

    test('should handle large durations correctly', () => {
      // 3 hours exactly: 3 * 3600 = 10800 seconds
      expect(calculateTotalDurationFromSeconds(3600, 3600, 3600))
        .toBe('3h');
      
      // 65:30 + 70:45 = 3930 + 4245 = 8175 seconds = 136.25 minutes = 2h 16m
      expect(calculateTotalDurationFromSeconds(3930, 4245))
        .toBe('2h 16m');
    });
  });

  describe('formatDurationFromSeconds', () => {
    test('should format seconds to human-readable duration', () => {
      expect(formatDurationFromSeconds(0)).toBe('0m');
      expect(formatDurationFromSeconds(60)).toBe('1m'); // 1 minute
      expect(formatDurationFromSeconds(3600)).toBe('1h'); // 1 hour
      expect(formatDurationFromSeconds(3660)).toBe('1h 1m'); // 1 hour 1 minute
      expect(formatDurationFromSeconds(7200)).toBe('2h'); // 2 hours
      expect(formatDurationFromSeconds(7320)).toBe('2h 2m'); // 2 hours 2 minutes
    });

    test('should handle fractional seconds by flooring to complete minutes', () => {
      expect(formatDurationFromSeconds(119)).toBe('1m'); // 119 seconds = 1.98 minutes = 1m (floored)
      expect(formatDurationFromSeconds(3659)).toBe('1h'); // 3659 seconds = 60.98 minutes = 60m = 1h (exactly 1 hour)
      expect(formatDurationFromSeconds(3661)).toBe('1h 1m'); // 3661 seconds = 61.01 minutes = 1h 1m
    });

    test('should handle negative and invalid inputs', () => {
      expect(formatDurationFromSeconds(-100)).toBe('0m');
      expect(formatDurationFromSeconds(NaN)).toBe('0m');
    });
  });

  describe('convertSecondsToTimeString', () => {
    test('should convert seconds to mm:ss format', () => {
      expect(convertSecondsToTimeString(1530)).toBe('25:30'); // 25 minutes 30 seconds
      expect(convertSecondsToTimeString(345)).toBe('5:45'); // 5 minutes 45 seconds
      expect(convertSecondsToTimeString(30)).toBe('0:30'); // 30 seconds
      expect(convertSecondsToTimeString(3600)).toBe('60:00'); // 1 hour
      expect(convertSecondsToTimeString(3661)).toBe('61:01'); // 1 hour 1 minute 1 second
    });

    test('should handle edge cases', () => {
      expect(convertSecondsToTimeString(60)).toBe('1:00'); // Exactly 1 minute
      expect(convertSecondsToTimeString(1)).toBe('0:01'); // 1 second
      expect(convertSecondsToTimeString(59)).toBe('0:59'); // 59 seconds
    });

    test('should return null for invalid inputs', () => {
      expect(convertSecondsToTimeString(0)).toBe(null);
      expect(convertSecondsToTimeString(-100)).toBe(null);
      expect(convertSecondsToTimeString(NaN)).toBe(null);
      expect(convertSecondsToTimeString(null as any)).toBe(null);
      expect(convertSecondsToTimeString(undefined as any)).toBe(null);
    });
  });

  describe('parseTimeStringToSeconds (backward compatibility)', () => {
    test('should parse valid time strings correctly', () => {
      expect(parseTimeStringToSeconds('25:30')).toBe(1530); // 25*60 + 30 = 1530 seconds
      expect(parseTimeStringToSeconds('5:45')).toBe(345); // 5*60 + 45 = 345 seconds
      expect(parseTimeStringToSeconds('0:30')).toBe(30); // 30 seconds
      expect(parseTimeStringToSeconds('60:00')).toBe(3600); // 1 hour
    });

    test('should return 0 for invalid formats', () => {
      expect(parseTimeStringToSeconds('')).toBe(0);
      expect(parseTimeStringToSeconds('25')).toBe(0); // Missing seconds
      expect(parseTimeStringToSeconds('25:60')).toBe(0); // Invalid seconds (>= 60)
      expect(parseTimeStringToSeconds('25:5')).toBe(0); // Single digit seconds
      expect(parseTimeStringToSeconds('invalid')).toBe(0);
    });

    test('should handle null/undefined inputs', () => {
      expect(parseTimeStringToSeconds(null as any)).toBe(0);
      expect(parseTimeStringToSeconds(undefined as any)).toBe(0);
    });
  });

  describe('calculateMixedFormatDuration (transition support)', () => {
    test('should prefer VIS seconds over string formats', () => {
      expect(calculateMixedFormatDuration({
        durationSet1Seconds: 1530, // 25:30 in seconds
        durationSet1String: '20:00', // Different string value should be ignored
        durationSet2Seconds: 1725, // 28:45 in seconds
      })).toBe('54m'); // Should use seconds: (1530 + 1725) / 60 = 54.25 = 54m
    });

    test('should fallback to string parsing when VIS seconds unavailable', () => {
      expect(calculateMixedFormatDuration({
        durationSet1String: '25:30', // Should parse to 1530 seconds
        durationSet2String: '28:45', // Should parse to 1725 seconds
      })).toBe('54m'); // (1530 + 1725) / 60 = 54.25 = 54m
    });

    test('should handle mixed availability of formats', () => {
      expect(calculateMixedFormatDuration({
        durationSet1Seconds: 1530, // VIS seconds available
        durationSet2String: '28:45', // Only string available
        durationSet3String: '18:20', // Only string available
      })).toBe('1h 12m'); // 1530 + 1725 + 1100 = 4355 seconds = 1h 12m
    });

    test('should return null when no valid durations available', () => {
      expect(calculateMixedFormatDuration({})).toBe(null);
      expect(calculateMixedFormatDuration({
        durationSet1String: 'invalid',
        durationSet2String: '',
        durationSet3Seconds: 0,
      })).toBe(null);
    });
  });

  describe('convertLegacyDurationsToVisSeconds (migration utility)', () => {
    test('should convert valid time strings to VIS seconds fields', () => {
      const result = convertLegacyDurationsToVisSeconds('25:30', '28:45', '18:20');
      
      expect(result).toEqual({
        DurationSet1Seconds: 1530, // 25*60 + 30
        DurationSet2Seconds: 1725, // 28*60 + 45  
        DurationSet3Seconds: 1100, // 18*60 + 20
      });
    });

    test('should handle partial data', () => {
      const result = convertLegacyDurationsToVisSeconds('25:30', undefined, '18:20');
      
      expect(result).toEqual({
        DurationSet1Seconds: 1530,
        DurationSet3Seconds: 1100,
      });
    });

    test('should exclude invalid time strings', () => {
      const result = convertLegacyDurationsToVisSeconds('invalid', '28:45', '');
      
      expect(result).toEqual({
        DurationSet2Seconds: 1725,
      });
    });

    test('should return empty object when no valid durations', () => {
      const result = convertLegacyDurationsToVisSeconds('invalid', '', undefined);
      expect(result).toEqual({});
    });
  });

  describe('integration scenarios with VIS data', () => {
    test('should handle realistic beach volleyball match durations from VIS seconds', () => {
      // Typical 2-set match (21-19, 21-17): 28:45 + 25:30 = 1725 + 1530 = 3255 seconds
      expect(calculateTotalDurationFromSeconds(1725, 1530))
        .toBe('54m'); // 3255 seconds = 54.25 minutes = 54m
      
      // Long 3-set match (21-19, 19-21, 15-13): 32:15 + 35:40 + 22:30 = 1935 + 2140 + 1350 = 5425 seconds
      expect(calculateTotalDurationFromSeconds(1935, 2140, 1350))
        .toBe('1h 30m'); // 5425 seconds = 90.41 minutes = 1h 30m
      
      // Quick 2-set match (21-8, 21-12): 18:20 + 19:45 = 1100 + 1185 = 2285 seconds
      expect(calculateTotalDurationFromSeconds(1100, 1185))
        .toBe('38m'); // 2285 seconds = 38.08 minutes = 38m
    });

    test('should handle incomplete live match scenarios with VIS seconds', () => {
      // Match in progress - only first set complete
      expect(calculateTotalDurationFromSeconds(1530, undefined, undefined))
        .toBe('25m'); // 1530 seconds = 25.5 minutes = 25m
      
      // Match in progress - two sets complete
      expect(calculateTotalDurationFromSeconds(1530, 1725, undefined))
        .toBe('54m'); // 3255 seconds = 54.25 minutes = 54m
    });

    test('should maintain consistency with legacy formatter output', () => {
      // These test cases should produce the same results as MatchDurationFormatter
      // when given equivalent input data converted to seconds
      
      // Legacy test: calculateTotalDuration('25:30', '28:45', '18:20') -> '1h 12m'
      // Converted to VIS seconds: 1530, 1725, 1100
      expect(calculateTotalDurationFromSeconds(1530, 1725, 1100))
        .toBe('1h 12m');
      
      // Legacy test: calculateTotalDuration('22:15', '24:30') -> '46m'  
      // Converted to VIS seconds: 1335, 1470
      expect(calculateTotalDurationFromSeconds(1335, 1470))
        .toBe('46m');
        
      // Legacy test: calculateTotalDuration('45:00') -> '45m'
      // Converted to VIS seconds: 2700
      expect(calculateTotalDurationFromSeconds(2700))
        .toBe('45m');
    });
  });
});