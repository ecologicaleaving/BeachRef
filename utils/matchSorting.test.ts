/**
 * Unit tests for match sorting utilities
 *
 * These tests ensure robust, timezone-safe sorting that prevents regressions
 * when refactoring the match list components.
 */

import { BeachMatchCore } from '../types/match-v2';
import {
  toEpochMsSafe,
  compareWithinDay,
  compareDatePanels,
  sortMatchGroups
} from './matchSorting';

// Test helper to create mock matches
const createMockMatch = (
  id: string,
  options: {
    scheduledDateTime?: string;
    utcScheduledDateTime?: string;
    epochMs?: number;
    gender?: 'M' | 'W' | 'X';
  } = {}
): BeachMatchCore => ({
  id,
  visNo: id,
  version: 1,
  lastUpdated: new Date().toISOString(),
  tournamentId: 'test-tournament',
  matchCode: id,
  round: 'Pool',
  phaseCode: 'POOL',
  status: 'Scheduled' as any,
  court: {
    courtNumber: '1',
    courtName: 'Court 1',
    surface: 'Sand',
    location: 'Main',
  },
  scheduledDateTime: options.scheduledDateTime || '2025-01-15T10:00:00Z',
  team1: {
    teamNumber: '1',
    teamName: 'Team A',
    player1Name: 'Player 1',
    player2Name: 'Player 2',
    countryCode: 'US',
  },
  team2: {
    teamNumber: '2',
    teamName: 'Team B',
    player1Name: 'Player 3',
    player2Name: 'Player 4',
    countryCode: 'BR',
  },
  refereeAssignments: [],
  // Enhanced fields based on options
  utcScheduledDateTime: options.utcScheduledDateTime,
  ...(options.epochMs && {
    scheduled: { epochMs: options.epochMs }
  }),
  ...(options.gender && {
    tournamentGender: options.gender
  }),
});

describe('toEpochMsSafe', () => {
  test('prioritizes utcScheduledDateTime when available', () => {
    const match = createMockMatch('test', {
      scheduledDateTime: '2025-01-15T10:00:00-03:00', // Brazil time
      utcScheduledDateTime: '2025-01-15T13:00:00Z',   // UTC equivalent
    });

    const result = toEpochMsSafe(match);
    expect(result).toBe(Date.parse('2025-01-15T13:00:00Z'));
  });

  test('falls back to enhanced epoch from scheduled field', () => {
    const epochMs = Date.parse('2025-01-15T14:00:00Z');
    const match = createMockMatch('test', { epochMs });

    const result = toEpochMsSafe(match);
    expect(result).toBe(epochMs);
  });

  test('falls back to scheduledDateTime when enhanced fields unavailable', () => {
    const match = createMockMatch('test', {
      scheduledDateTime: '2025-01-15T15:30:00Z'
    });

    const result = toEpochMsSafe(match);
    expect(result).toBe(Date.parse('2025-01-15T15:30:00Z'));
  });

  test('returns null for invalid date strings', () => {
    const match = createMockMatch('test', {
      scheduledDateTime: 'invalid-date'
    });

    const result = toEpochMsSafe(match);
    expect(result).toBeNull();
  });

  test('handles timezone-safe dateTimeTournament field', () => {
    const match = createMockMatch('test', {});
    // Remove the default scheduledDateTime to test the fallback chain
    delete (match as any).scheduledDateTime;

    // Simulate enhanced timezone field
    (match as any).scheduled = {
      dateTimeTournament: '2025-01-15T16:00:00-03:00'
    };

    const result = toEpochMsSafe(match);
    // Should use the dateTimeTournament field when scheduledDateTime is not available
    const expected = Date.parse('2025-01-15T16:00:00-03:00');
    expect(result).toBe(expected);
  });
});

describe('compareWithinDay', () => {
  test('sorts by time in ascending order (earliest first)', () => {
    const match1 = createMockMatch('match1', {
      scheduledDateTime: '2025-01-15T08:00:00Z'
    });
    const match2 = createMockMatch('match2', {
      scheduledDateTime: '2025-01-15T09:30:00Z'
    });
    const match3 = createMockMatch('match3', {
      scheduledDateTime: '2025-01-15T11:00:00Z'
    });

    const matches = [match3, match1, match2].sort(compareWithinDay);
    expect(matches.map(m => m.id)).toEqual(['match1', 'match2', 'match3']);
  });

  test('sorts by gender when times are equal (M before W)', () => {
    const time = '2025-01-15T10:00:00Z';
    const womenMatch = createMockMatch('women', {
      scheduledDateTime: time,
      gender: 'W'
    });
    const menMatch = createMockMatch('men', {
      scheduledDateTime: time,
      gender: 'M'
    });
    const mixedMatch = createMockMatch('mixed', {
      scheduledDateTime: time,
      gender: 'X'
    });

    const matches = [mixedMatch, womenMatch, menMatch].sort(compareWithinDay);
    expect(matches.map(m => m.id)).toEqual(['men', 'women', 'mixed']);
  });

  test('uses stable tie-breaker on match ID', () => {
    const time = '2025-01-15T10:00:00Z';
    const matchB = createMockMatch('match-b', {
      scheduledDateTime: time,
      gender: 'M'
    });
    const matchA = createMockMatch('match-a', {
      scheduledDateTime: time,
      gender: 'M'
    });

    const matches = [matchB, matchA].sort(compareWithinDay);
    expect(matches.map(m => m.id)).toEqual(['match-a', 'match-b']);
  });

  test('handles matches with missing time data gracefully', () => {
    const withTime = createMockMatch('with-time', {
      scheduledDateTime: '2025-01-15T12:00:00Z'
    });
    const noTime = createMockMatch('no-time', {
      scheduledDateTime: 'invalid-date'
    });

    const matches = [noTime, withTime].sort(compareWithinDay);

    // Match with valid time should sort before match without time
    expect(matches[0].id).toBe('with-time');
    expect(matches[1].id).toBe('no-time');
  });

  test('respects enhanced timezone-aware epoch timestamps', () => {
    const epoch1 = Date.parse('2025-01-15T10:00:00Z'); // 10:00 UTC
    const epoch2 = Date.parse('2025-01-15T11:00:00Z'); // 11:00 UTC

    const match1 = createMockMatch('early', { epochMs: epoch1 });
    const match2 = createMockMatch('late', { epochMs: epoch2 });

    const matches = [match2, match1].sort(compareWithinDay);
    expect(matches.map(m => m.id)).toEqual(['early', 'late']);
  });
});

describe('compareDatePanels', () => {
  test('sorts dates in descending order by default (newest first)', () => {
    const result = compareDatePanels('2025-01-15', '2025-01-16');
    expect(result).toBeGreaterThan(0); // 2025-01-16 comes before 2025-01-15
  });

  test('sorts dates in ascending order when specified', () => {
    const result = compareDatePanels('2025-01-15', '2025-01-16', 'asc');
    expect(result).toBeLessThan(0); // 2025-01-15 comes before 2025-01-16
  });

  test('handles same dates correctly', () => {
    const result = compareDatePanels('2025-01-15', '2025-01-15');
    expect(result).toBe(0);
  });
});

describe('sortMatchGroups', () => {
  test('sorts date panels correctly while maintaining chronological order within panels', () => {
    const jan15_match1 = createMockMatch('jan15-1', {
      scheduledDateTime: '2025-01-15T08:00:00Z'
    });
    const jan15_match2 = createMockMatch('jan15-2', {
      scheduledDateTime: '2025-01-15T10:00:00Z'
    });
    const jan16_match1 = createMockMatch('jan16-1', {
      scheduledDateTime: '2025-01-16T09:00:00Z'
    });
    const jan16_match2 = createMockMatch('jan16-2', {
      scheduledDateTime: '2025-01-16T11:00:00Z'
    });

    const groups: Array<[string, BeachMatchCore[]]> = [
      ['2025-01-15', [jan15_match2, jan15_match1]], // Intentionally reversed
      ['2025-01-16', [jan16_match2, jan16_match1]], // Intentionally reversed
    ];

    const result = sortMatchGroups(groups, 'desc');

    // Check date panel order (desc = newest first)
    expect(result[0][0]).toBe('2025-01-16');
    expect(result[1][0]).toBe('2025-01-15');

    // Check matches within panels are chronological (earliest first)
    expect(result[0][1].map(m => m.id)).toEqual(['jan16-1', 'jan16-2']);
    expect(result[1][1].map(m => m.id)).toEqual(['jan15-1', 'jan15-2']);
  });

  test('does not mutate original arrays', () => {
    const originalMatches = [
      createMockMatch('late', { scheduledDateTime: '2025-01-15T11:00:00Z' }),
      createMockMatch('early', { scheduledDateTime: '2025-01-15T08:00:00Z' })
    ];
    const groups: Array<[string, BeachMatchCore[]]> = [
      ['2025-01-15', originalMatches]
    ];

    const result = sortMatchGroups(groups);

    // Original array should remain unchanged
    expect(originalMatches[0].id).toBe('late');
    expect(originalMatches[1].id).toBe('early');

    // Result should be sorted
    expect(result[0][1][0].id).toBe('early');
    expect(result[0][1][1].id).toBe('late');
  });

  test('handles tournament timezone context', () => {
    const brazilTime1 = createMockMatch('brazil1', {
      scheduledDateTime: '2025-01-15T10:00:00-03:00' // 13:00 UTC
    });
    const brazilTime2 = createMockMatch('brazil2', {
      scheduledDateTime: '2025-01-15T08:00:00-03:00' // 11:00 UTC
    });

    const groups: Array<[string, BeachMatchCore[]]> = [
      ['2025-01-15', [brazilTime1, brazilTime2]]
    ];

    const result = sortMatchGroups(groups, 'desc', 'America/Sao_Paulo');

    // Should sort by UTC time (brazil2 is earlier in UTC)
    expect(result[0][1].map(m => m.id)).toEqual(['brazil2', 'brazil1']);
  });
});

describe('Integration: Real-world scenarios', () => {
  test('mixed data quality scenarios', () => {
    const perfectMatch = createMockMatch('perfect', {
      scheduledDateTime: '2025-01-15T10:00:00-03:00', // 13:00 UTC
      utcScheduledDateTime: '2025-01-15T13:00:00Z',
      epochMs: Date.parse('2025-01-15T13:00:00Z'),
      gender: 'M'
    });

    const partialMatch = createMockMatch('partial', {
      scheduledDateTime: '2025-01-15T11:00:00-03:00', // 14:00 UTC
      gender: 'W'
    });

    const legacyMatch = createMockMatch('legacy', {
      scheduledDateTime: '2025-01-15T15:00:00Z', // 15:00 UTC (latest)
    });

    const matches = [legacyMatch, perfectMatch, partialMatch].sort(compareWithinDay);

    // Should sort by time regardless of data quality (13:00, 14:00, 15:00 UTC)
    expect(matches.map(m => m.id)).toEqual(['perfect', 'partial', 'legacy']);
  });

  test('sortOrder isolation: does not affect within-day sorting', () => {
    const early = createMockMatch('early', {
      scheduledDateTime: '2025-01-15T08:00:00Z'
    });
    const late = createMockMatch('late', {
      scheduledDateTime: '2025-01-15T10:00:00Z'
    });

    const groups: Array<[string, BeachMatchCore[]]> = [
      ['2025-01-15', [late, early]] // Intentionally wrong order
    ];

    // Test both sort orders - within-day sorting should be consistent
    const ascResult = sortMatchGroups(groups, 'asc');
    const descResult = sortMatchGroups(groups, 'desc');

    // Both should have same within-day order (chronological)
    expect(ascResult[0][1].map(m => m.id)).toEqual(['early', 'late']);
    expect(descResult[0][1].map(m => m.id)).toEqual(['early', 'late']);
  });
});