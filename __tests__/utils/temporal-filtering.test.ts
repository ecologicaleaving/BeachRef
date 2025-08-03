/**
 * @jest-environment jsdom
 */

import {
  calculateTournamentTemporalStatus,
  filterTournamentsByTimelineRange,
  getActiveTournaments,
  getTournamentsInDateRange,
  sortTournamentsByTemporalRelevance,
  calculateTimelineRange,
  formatTemporalDisplay,
  isTournamentUpcoming,
  isTournamentRecentlyCompleted
} from '../../utils/temporal-filtering';
import { Tournament } from '../../lib/types';

// Mock tournament data for testing (Test date: 2025-08-02)
const mockTournaments: Tournament[] = [
  {
    code: 'ACTIVE_001',
    name: 'Current Tournament',
    countryCode: 'BR',
    startDate: '2025-08-01', // Started Aug 1 (yesterday from Aug 2)
    endDate: '2025-08-03',   // Ends Aug 3 (tomorrow from Aug 2)
    gender: 'Men',
    type: 'Elite'
  },
  {
    code: 'UPCOMING_001',
    name: 'Future Tournament',
    countryCode: 'US',
    startDate: '2025-08-10', // Starts Aug 10 (8 days from Aug 2)
    endDate: '2025-08-12',
    gender: 'Women',
    type: 'Professional'
  },
  {
    code: 'PAST_001',
    name: 'Completed Tournament',
    countryCode: 'IT',
    startDate: '2025-07-20', // Started Jul 20
    endDate: '2025-07-22',   // Ended Jul 22 (11 days before Aug 2)
    gender: 'Mixed',
    type: 'Elite'
  },
  {
    code: 'UPCOMING_SOON',
    name: 'Tomorrow Tournament',
    countryCode: 'FR',
    startDate: '2025-08-03', // Starts Aug 3 (tomorrow from Aug 2)
    endDate: '2025-08-05',
    gender: 'Men',
    type: 'Professional'
  },
  {
    code: 'PAST_RECENT',
    name: 'Recently Ended',
    countryCode: 'DE',
    startDate: '2025-07-30', // Started Jul 30
    endDate: '2025-08-01',   // Ended Aug 1 (yesterday from Aug 2)
    gender: 'Women',
    type: 'Elite'
  }
];

// Fixed test date: August 2, 2025
const testDate = new Date('2025-08-02T12:00:00Z');

describe('Temporal Filtering Utilities - Story 5.2', () => {
  describe('calculateTournamentTemporalStatus', () => {
    it('should identify active tournaments correctly', () => {
      const status = calculateTournamentTemporalStatus(mockTournaments[0], testDate);
      
      expect(status.status).toBe('active');
      expect(status.priority).toBe(1);
      expect(status.displayText).toBe('Ends tomorrow');
    });

    it('should identify upcoming tournaments correctly', () => {
      const status = calculateTournamentTemporalStatus(mockTournaments[1], testDate);
      
      expect(status.status).toBe('upcoming');
      expect(status.priority).toBe(2);
      expect(status.daysFromNow).toBe(8);
      expect(status.displayText).toBe('Starts in 8 days');
    });

    it('should identify past tournaments correctly', () => {
      const status = calculateTournamentTemporalStatus(mockTournaments[2], testDate);
      
      expect(status.status).toBe('past');
      expect(status.priority).toBe(3);
      expect(status.displayText).toBe('Ended 11 days ago');
    });

    it('should handle edge cases for display text', () => {
      // Tomorrow tournament (Aug 3 from Aug 2)
      const tomorrowStatus = calculateTournamentTemporalStatus(mockTournaments[3], testDate);
      expect(tomorrowStatus.displayText).toBe('Starts tomorrow');
      
      // Recently ended tournament (ended Aug 1 from Aug 2)
      const recentStatus = calculateTournamentTemporalStatus(mockTournaments[4], testDate);
      expect(recentStatus.displayText).toBe('Ended yesterday');
    });
  });

  describe('filterTournamentsByTimelineRange', () => {
    it('should filter tournaments by timeline range correctly', () => {
      const result = filterTournamentsByTimelineRange(mockTournaments, testDate, 20);
      
      expect(result.active).toHaveLength(1);
      expect(result.active[0].code).toBe('ACTIVE_001');
      
      expect(result.upcoming).toHaveLength(2);
      expect(result.upcoming.map(t => t.code)).toContain('UPCOMING_SOON');
      expect(result.upcoming.map(t => t.code)).toContain('UPCOMING_001');
      
      expect(result.past).toHaveLength(2);
      expect(result.past.map(t => t.code)).toContain('PAST_RECENT');
      expect(result.past.map(t => t.code)).toContain('PAST_001');
      
      expect(result.total).toHaveLength(5);
    });

    it('should respect the range limit', () => {
      const result = filterTournamentsByTimelineRange(mockTournaments, testDate, 1);
      
      expect(result.upcoming).toHaveLength(1);
      expect(result.upcoming[0].code).toBe('UPCOMING_SOON'); // Closest upcoming
      
      expect(result.past).toHaveLength(1);
      expect(result.past[0].code).toBe('PAST_RECENT'); // Most recent past
    });

    it('should sort upcoming tournaments by proximity', () => {
      const result = filterTournamentsByTimelineRange(mockTournaments, testDate, 20);
      
      // First upcoming should be the closest (tomorrow)
      expect(result.upcoming[0].code).toBe('UPCOMING_SOON');
      // Second should be further out
      expect(result.upcoming[1].code).toBe('UPCOMING_001');
    });
  });

  describe('getActiveTournaments', () => {
    it('should return only active tournaments', () => {
      const active = getActiveTournaments(mockTournaments, testDate);
      
      expect(active).toHaveLength(1);
      expect(active[0].code).toBe('ACTIVE_001');
    });

    it('should return empty array when no active tournaments', () => {
      const futureDate = new Date('2025-09-01');
      const active = getActiveTournaments(mockTournaments, futureDate);
      
      expect(active).toHaveLength(0);
    });
  });

  describe('getTournamentsInDateRange', () => {
    it('should return tournaments within date range', () => {
      const startDate = new Date('2025-08-01');
      const endDate = new Date('2025-08-05');
      
      const tournaments = getTournamentsInDateRange(mockTournaments, startDate, endDate);
      
      // Should include: ACTIVE_001 (Aug 1-3), UPCOMING_SOON (Aug 3-5), PAST_RECENT (ends Aug 1)
      expect(tournaments).toHaveLength(3);
      expect(tournaments.map(t => t.code)).toContain('ACTIVE_001');
      expect(tournaments.map(t => t.code)).toContain('UPCOMING_SOON');
      expect(tournaments.map(t => t.code)).toContain('PAST_RECENT');
    });

    it('should handle overlapping tournaments', () => {
      const startDate = new Date('2025-08-01');
      const endDate = new Date('2025-08-02');
      
      const tournaments = getTournamentsInDateRange(mockTournaments, startDate, endDate);
      
      // Should include active tournament that spans the range
      expect(tournaments.map(t => t.code)).toContain('ACTIVE_001');
    });
  });

  describe('sortTournamentsByTemporalRelevance', () => {
    it('should sort tournaments by temporal relevance', () => {
      const sorted = sortTournamentsByTemporalRelevance(mockTournaments, testDate);
      
      // Active tournaments first
      expect(sorted[0].code).toBe('ACTIVE_001');
      
      // Then upcoming by proximity
      expect(sorted[1].code).toBe('UPCOMING_SOON');
      expect(sorted[2].code).toBe('UPCOMING_001');
      
      // Then past by recency
      expect(sorted[3].code).toBe('PAST_RECENT');
      expect(sorted[4].code).toBe('PAST_001');
    });
  });

  describe('calculateTimelineRange', () => {
    it('should calculate correct date range', () => {
      const { startDate, endDate } = calculateTimelineRange(testDate, 30, 30);
      
      const expectedStart = new Date('2025-07-03'); // 30 days before
      const expectedEnd = new Date('2025-09-01');   // 30 days after
      
      expect(startDate.toDateString()).toBe(expectedStart.toDateString());
      expect(endDate.toDateString()).toBe(expectedEnd.toDateString());
    });
  });

  describe('formatTemporalDisplay', () => {
    it('should format temporal display text correctly', () => {
      expect(formatTemporalDisplay(mockTournaments[0], testDate)).toBe('Ends tomorrow');
      expect(formatTemporalDisplay(mockTournaments[1], testDate)).toBe('Starts in 8 days');
      expect(formatTemporalDisplay(mockTournaments[2], testDate)).toBe('Ended 11 days ago');
      expect(formatTemporalDisplay(mockTournaments[3], testDate)).toBe('Starts tomorrow');
    });
  });

  describe('isTournamentUpcoming', () => {
    it('should identify upcoming tournaments within timeframe', () => {
      expect(isTournamentUpcoming(mockTournaments[3], 7, testDate)).toBe(true);  // Tomorrow (1 day)
      expect(isTournamentUpcoming(mockTournaments[1], 7, testDate)).toBe(false); // 8 days away > 7 day window
      expect(isTournamentUpcoming(mockTournaments[1], 10, testDate)).toBe(true); // 8 days away < 10 day window
    });

    it('should not identify active or past tournaments as upcoming', () => {
      expect(isTournamentUpcoming(mockTournaments[0], 7, testDate)).toBe(false); // Active
      expect(isTournamentUpcoming(mockTournaments[2], 7, testDate)).toBe(false); // Past
    });
  });

  describe('isTournamentRecentlyCompleted', () => {
    it('should identify recently completed tournaments', () => {
      expect(isTournamentRecentlyCompleted(mockTournaments[4], 7, testDate)).toBe(true);  // Ended yesterday
      expect(isTournamentRecentlyCompleted(mockTournaments[2], 7, testDate)).toBe(false); // Ended 11 days ago
      expect(isTournamentRecentlyCompleted(mockTournaments[2], 15, testDate)).toBe(true); // Ended 11 days ago with 15 day window
    });

    it('should not identify active or upcoming tournaments as recently completed', () => {
      expect(isTournamentRecentlyCompleted(mockTournaments[0], 7, testDate)).toBe(false); // Active
      expect(isTournamentRecentlyCompleted(mockTournaments[1], 7, testDate)).toBe(false); // Upcoming
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty tournament arrays', () => {
      const result = filterTournamentsByTimelineRange([], testDate, 20);
      
      expect(result.active).toHaveLength(0);
      expect(result.upcoming).toHaveLength(0);
      expect(result.past).toHaveLength(0);
      expect(result.total).toHaveLength(0);
    });

    it('should handle invalid date strings gracefully', () => {
      const invalidTournament: Tournament = {
        code: 'INVALID',
        name: 'Invalid Tournament',
        countryCode: 'XX',
        startDate: 'invalid-date',
        endDate: 'invalid-date',
        gender: 'Men',
        type: 'Elite'
      };

      // Should not throw an error
      expect(() => {
        calculateTournamentTemporalStatus(invalidTournament, testDate);
      }).not.toThrow();
    });

    it('should handle zero range values', () => {
      const result = filterTournamentsByTimelineRange(mockTournaments, testDate, 0);
      
      expect(result.upcoming).toHaveLength(0);
      expect(result.past).toHaveLength(0);
      expect(result.active).toHaveLength(1); // Active tournaments always included
    });
  });
});