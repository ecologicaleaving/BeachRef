/**
 * @fileoverview Tests for MatchInterfaceAdapter utilities
 * Validates VIS-compliant data transformation to component formats
 * Part of VIS Data Structure Alignment Epic - Story 1.3
 */

import {
  adaptVisMatchToComponent,
  adaptVisMatchToMatchInfo,
  adaptMatchesForComponent,
  isVisCompliantMatchData
} from '../MatchInterfaceAdapter';
import { VisCompliantMatch, BeachMatchFormat } from '../../types/match-vis-compliant';
import { MatchStatus } from '../../types/match-v2';

describe('MatchInterfaceAdapter', () => {
  const mockVisCompliantMatch: VisCompliantMatch = {
    No: 123,
    NoInTournament: 45,
    Format: BeachMatchFormat.BEST_OF_3,
    TeamAName: 'Brazil Team A',
    TeamBName: 'USA Team B',
    TeamAFederationCode: 'BRA',
    TeamBFederationCode: 'USA',
    Status: 'Finished',
    MatchPointsA: 2,
    MatchPointsB: 1,
    PointsTeamASet1: 21,
    PointsTeamBSet1: 18,
    PointsTeamASet2: 21,
    PointsTeamBSet2: 15,
    DurationSet1Seconds: 1800, // 30 minutes
    DurationSet2Seconds: 1500, // 25 minutes
    LocalDate: '2024-01-15',
    LocalTime: '14:30',
    Court: 'Center Court',
    NoReferee1: 101,
    NoReferee2: 102,
    Referee1Name: 'John Smith',
    Referee2Name: 'Jane Doe',
    tournamentNo: 'tournament-123',
  };

  const mockLegacyMatch = {
    No: '123',
    TeamAName: 'Brazil Team A',
    TeamBName: 'USA Team B',
    MatchPointsA: '2',
    MatchPointsB: '1',
  };

  describe('isVisCompliantMatchData', () => {
    it('should identify VIS-compliant match data correctly', () => {
      expect(isVisCompliantMatchData(mockVisCompliantMatch)).toBe(true);
    });

    it('should identify legacy match data correctly', () => {
      expect(isVisCompliantMatchData(mockLegacyMatch)).toBe(false);
    });

    it('should handle null/undefined data', () => {
      expect(isVisCompliantMatchData(null)).toBe(false);
      expect(isVisCompliantMatchData(undefined)).toBe(false);
      expect(isVisCompliantMatchData({})).toBe(false);
    });
  });

  describe('adaptVisMatchToComponent', () => {
    it('should transform VIS-compliant match to component format', () => {
      const result = adaptVisMatchToComponent(mockVisCompliantMatch);

      expect(result.id).toBe('tournament-123-123');
      expect(result.matchNumber).toBe('123');
      expect(result.scheduledDateTime).toBe('2024-01-15T14:30:00');
      expect(result.status).toBe(MatchStatus.FINISHED);
      
      // Test court transformation
      expect(result.court).toEqual({
        courtNumber: 'Center Court'
      });
      
      // Test team information
      expect(result.team1).toEqual({
        teamName: 'Brazil Team A',
        countryCode: 'BRA',
        player1Name: undefined,
        player2Name: undefined,
        ranking: undefined
      });
      
      // Test match result transformation
      expect(result.result).toEqual({
        team1Sets: 2,
        team2Sets: 1,
        winner: 1, // Team 1 won (2 sets)
        setScores: [21, 18, 21, 15],
        duration: 55 // (1800 + 1500) / 60 = 55 minutes
      });
      
      // Test referee assignments
      expect(result.refereeAssignments).toEqual([
        {
          refereeName: 'John Smith',
          federationCode: undefined
        },
        {
          refereeName: 'Jane Doe',
          federationCode: undefined
        }
      ]);
      
      // Test VIS duration conversion to legacy format
      expect(result.DurationSet1).toBe('30:00'); // 1800 seconds = 30:00
      expect(result.DurationSet2).toBe('25:00'); // 1500 seconds = 25:00
    });

    it('should handle minimal VIS match data', () => {
      const minimalMatch: VisCompliantMatch = {
        No: 124,
        NoInTournament: 46,
        Format: BeachMatchFormat.BEST_OF_3,
        tournamentNo: 'tournament-124',
      };

      const result = adaptVisMatchToComponent(minimalMatch);
      
      expect(result.id).toBe('tournament-124-124');
      expect(result.matchNumber).toBe('124');
      expect(result.status).toBe(MatchStatus.SCHEDULED);
      expect(result.team1.teamName).toBe('Team A');
      expect(result.team2.teamName).toBe('Team B');
      expect(result.result).toBeUndefined();
    });
  });

  describe('adaptVisMatchToMatchInfo', () => {
    it('should transform VIS-compliant match to MatchInfo format', () => {
      const result = adaptVisMatchToMatchInfo(mockVisCompliantMatch);

      expect(result).toEqual({
        matchId: '#45', // Uses NoInTournament
        teamA: 'Brazil Team A',
        teamB: 'USA Team B',
        teamAFederationCode: 'BRA',
        teamBFederationCode: 'USA',
        time: '14:30',
        date: 'Jan 15', // Formatted date
        court: 'Center Court',
        round: 'TBD',
        status: 'completed' // Mapped from 'Finished'
      });
    });

    it('should handle different VIS status values', () => {
      const runningMatch = { ...mockVisCompliantMatch, Status: 'Running' };
      const result1 = adaptVisMatchToMatchInfo(runningMatch);
      expect(result1.status).toBe('live');

      const scheduledMatch = { ...mockVisCompliantMatch, Status: 'Scheduled' };
      const result2 = adaptVisMatchToMatchInfo(scheduledMatch);
      expect(result2.status).toBe('scheduled');

      const cancelledMatch = { ...mockVisCompliantMatch, Status: 'Cancelled' };
      const result3 = adaptVisMatchToMatchInfo(cancelledMatch);
      expect(result3.status).toBe('cancelled');
    });
  });

  describe('adaptMatchesForComponent', () => {
    it('should handle mixed VIS-compliant and legacy matches', () => {
      const mixedMatches = [mockVisCompliantMatch, mockLegacyMatch];
      const result = adaptMatchesForComponent(mixedMatches);

      expect(result).toHaveLength(2);
      
      // First match should be transformed from VIS-compliant
      expect(result[0].id).toBe('tournament-123-123');
      expect(result[0].matchNumber).toBe('123');
      
      // Second match should be returned as-is (legacy)
      expect(result[1]).toBe(mockLegacyMatch);
    });

    it('should handle empty array', () => {
      const result = adaptMatchesForComponent([]);
      expect(result).toEqual([]);
    });

    it('should handle all VIS-compliant matches', () => {
      const visMatches = [mockVisCompliantMatch];
      const result = adaptMatchesForComponent(visMatches);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('tournament-123-123');
    });

    it('should handle all legacy matches', () => {
      const legacyMatches = [mockLegacyMatch];
      const result = adaptMatchesForComponent(legacyMatches);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockLegacyMatch);
    });
  });

  describe('edge cases', () => {
    it('should handle invalid date formats gracefully', () => {
      const matchWithInvalidDate = {
        ...mockVisCompliantMatch,
        LocalDate: 'invalid-date'
      };

      const result = adaptVisMatchToComponent(matchWithInvalidDate);
      // Should fallback to current ISO timestamp when date is invalid
      expect(result.scheduledDateTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle missing duration data', () => {
      const matchWithoutDuration = {
        ...mockVisCompliantMatch,
        DurationSet1Seconds: undefined,
        DurationSet2Seconds: undefined
      };

      const result = adaptVisMatchToComponent(matchWithoutDuration);
      expect(result.DurationSet1).toBeUndefined();
      expect(result.DurationSet2).toBeUndefined();
      expect(result.result?.duration).toBeUndefined();
    });

    it('should handle missing referee data', () => {
      const matchWithoutReferees = {
        ...mockVisCompliantMatch,
        Referee1Name: undefined,
        Referee2Name: undefined
      };

      const result = adaptVisMatchToComponent(matchWithoutReferees);
      expect(result.refereeAssignments).toBeUndefined();
    });

    it('should handle error isolation in adaptMatchesForComponent gracefully', () => {
      // Test that the function properly handles mixed data and continues processing
      const mixedMatches = [
        mockVisCompliantMatch, // valid VIS - should be adapted
        { No: 456, NoInTournament: 78, Format: 'BestOf3' }, // minimal VIS - should be adapted
        mockLegacyMatch, // valid legacy - should pass through
        mockVisCompliantMatch // valid VIS - should be adapted
      ];

      const result = adaptMatchesForComponent(mixedMatches);
      
      // All matches should be processed successfully
      expect(result).toHaveLength(4);
      expect(result[0]).toHaveProperty('id'); // VIS adapted
      expect(result[1]).toHaveProperty('id'); // VIS adapted
      expect(result[2]).toEqual(mockLegacyMatch); // Legacy passed through
      expect(result[3]).toHaveProperty('id'); // VIS adapted
    });

    it('should handle empty or null input gracefully', () => {
      expect(adaptMatchesForComponent([])).toEqual([]);
      expect(adaptMatchesForComponent(null as any)).toEqual([]);
      expect(adaptMatchesForComponent(undefined as any)).toEqual([]);
    });
  });
});