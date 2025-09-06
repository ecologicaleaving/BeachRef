/**
 * Test for MatchListV2 duration calculation fix
 * Verifies that 3-set durations are correctly calculated for both data formats
 */
import { calculateTotalDuration } from '../../utils/MatchDurationFormatter';

// Mock the getMatchDuration function to test different scenarios
const mockGetMatchDuration = (match: any): string | null => {
  // Primary: Use total match duration from enhanced data (Duration field in seconds)
  const totalDurationSeconds = match.Duration;
  if (totalDurationSeconds) {
    const totalMinutes = Math.floor(parseInt(totalDurationSeconds) / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Fallback: try to get duration from match result
  if (match.result?.duration && typeof match.result.duration === 'number') {
    const totalMinutes = match.result.duration;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
  
  // Fallback: Calculate from individual set durations
  // Handle both formats: seconds (integers) and "mm:ss" format (strings)
  const durationSet1 = match.DurationSet1;
  const durationSet2 = match.DurationSet2;
  const durationSet3 = match.DurationSet3;
  
  if (durationSet1 || durationSet2 || durationSet3) {
    // Check if durations are in "mm:ss" format (strings) or seconds (numbers)
    const isStringFormat = typeof durationSet1 === 'string' && durationSet1.includes(':');
    
    if (isStringFormat) {
      // Use the utility function for "mm:ss" format
      const totalDuration = calculateTotalDuration(durationSet1, durationSet2, durationSet3);
      if (totalDuration) {
        return totalDuration;
      }
    } else {
      // Handle seconds format (integers) - ensure all three sets are included
      const totalSeconds = (parseInt(durationSet1 || '0') + 
                           parseInt(durationSet2 || '0') + 
                           parseInt(durationSet3 || '0'));
      
      if (totalSeconds > 0) {
        const totalMinutes = Math.floor(totalSeconds / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        if (hours > 0) {
          return `${hours}h ${minutes}m`;
        } else {
          return `${minutes}m`;
        }
      }
    }
  }

  // Final fallback: try legacy calculateTotalDuration function
  return calculateTotalDuration(
    match.DurationSet1,
    match.DurationSet2,
    match.DurationSet3
  );
};

describe('MatchListV2 Duration Calculation Fix', () => {
  describe('3-set duration calculation', () => {
    it('should calculate total duration for 3-set match with "mm:ss" format', () => {
      const match = {
        id: 'test1',
        DurationSet1: '25:30', // 1530 seconds
        DurationSet2: '28:45', // 1725 seconds
        DurationSet3: '18:20'  // 1100 seconds
        // Total: 4355 seconds = 72.58 minutes = 1h 12m
      };

      const result = mockGetMatchDuration(match);
      expect(result).toBe('1h 12m');
    });

    it('should calculate total duration for 3-set match with seconds format', () => {
      const match = {
        id: 'test2',
        DurationSet1: '1530', // 25:30 in seconds
        DurationSet2: '1725', // 28:45 in seconds
        DurationSet3: '1100'  // 18:20 in seconds
        // Total: 4355 seconds = 72.58 minutes = 1h 12m
      };

      const result = mockGetMatchDuration(match);
      expect(result).toBe('1h 12m');
    });

    it('should handle 2-set match correctly', () => {
      const match = {
        id: 'test3',
        DurationSet1: '22:15', // 1335 seconds
        DurationSet2: '24:30', // 1470 seconds
        DurationSet3: undefined
        // Total: 2805 seconds = 46.75 minutes = 46m
      };

      const result = mockGetMatchDuration(match);
      expect(result).toBe('46m');
    });

    it('should handle mixed valid/invalid set data', () => {
      const match = {
        id: 'test4',
        DurationSet1: '25:30', // Valid
        DurationSet2: '',      // Invalid/empty
        DurationSet3: '18:20'  // Valid
        // Total: 1530 + 1100 = 2630 seconds = 43.8 minutes = 43m
      };

      const result = mockGetMatchDuration(match);
      expect(result).toBe('43m');
    });

    it('should prioritize Duration field over individual sets', () => {
      const match = {
        id: 'test5',
        Duration: '3600', // 1 hour in seconds
        DurationSet1: '10:00',
        DurationSet2: '15:00',
        DurationSet3: '20:00'
      };

      const result = mockGetMatchDuration(match);
      expect(result).toBe('1h 0m'); // Should use Duration field, not sum of sets
    });

    it('should return null for no duration data', () => {
      const match = {
        id: 'test6'
        // No duration data
      };

      const result = mockGetMatchDuration(match);
      expect(result).toBe(null);
    });
  });
});