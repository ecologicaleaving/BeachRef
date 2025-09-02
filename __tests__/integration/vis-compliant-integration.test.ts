/**
 * @fileoverview VIS-Compliant Interface Integration Tests
 * End-to-end validation of VIS data structure alignment implementation
 * Part of VIS Data Structure Alignment Epic - Story 1.3
 */

import { MatchResultsService } from '../../services/MatchResultsService';
import { RefereeAssignmentsService } from '../../services/RefereeAssignmentsService';
import { VisCompliantMatch, BeachMatchFormat } from '../../types/match-vis-compliant';
import { 
  adaptVisMatchToComponent, 
  adaptMatchesForComponent, 
  isVisCompliantMatchData 
} from '../../utils/MatchInterfaceAdapter';
import { RefereeProfile } from '../../types/RefereeAssignments';

// Mock the dependencies
jest.mock('../../services/CacheService');

describe('VIS-Compliant Interface Integration Tests', () => {
  const mockTournamentNo = 'integration-test-tournament';
  
  const mockVisCompliantMatch: VisCompliantMatch = {
    No: 101,
    NoInTournament: 25,
    Format: BeachMatchFormat.BEST_OF_3,
    TeamAName: 'Integration Team A',
    TeamBName: 'Integration Team B',
    TeamAFederationCode: 'ITA',
    TeamBFederationCode: 'BRA',
    Status: 'Running',
    MatchPointsA: 1,
    MatchPointsB: 0,
    PointsTeamASet1: 21,
    PointsTeamBSet1: 17,
    PointsTeamASet2: 19,
    PointsTeamBSet2: 21,
    DurationSet1Seconds: 1620, // 27 minutes
    DurationSet2Seconds: 1380, // 23 minutes
    LocalDate: '2025-01-15',
    LocalTime: '15:30',
    Court: 'Court 3',
    NoReferee1: 201,
    NoReferee2: 202,
    Referee1Name: 'Integration Ref 1',
    Referee2Name: 'Integration Ref 2',
    tournamentNo: mockTournamentNo,
  };

  describe('Tournament Selection Flow with Unified Interface', () => {
    it('should handle VIS-compliant match data in match results workflow', async () => {
      // Mock cache to return VIS-compliant data
      const mockCacheService = require('../../services/CacheService');
      mockCacheService.CacheService.getMatchesVisCompliant = jest.fn().mockResolvedValue({
        data: [mockVisCompliantMatch],
        source: 'cache' as const,
        fromCache: true,
        timestamp: Date.now(),
      });

      // Execute the service method
      const results = await MatchResultsService.getMatchResults(mockTournamentNo);

      // Verify results structure
      expect(results).toHaveProperty('live');
      expect(results).toHaveProperty('completed');
      expect(results).toHaveProperty('scheduled');

      // Find our match in the appropriate category
      const allMatches = [...results.live, ...results.completed, ...results.scheduled];
      expect(allMatches.length).toBeGreaterThan(0);

      const processedMatch = allMatches.find(m => m.no === '101');
      expect(processedMatch).toBeDefined();
      expect(processedMatch!.teamAName).toBe('Integration Team A');
      expect(processedMatch!.matchPointsA).toBe(1); // Numeric preserved
      expect(processedMatch!.durationSet1).toBe('27:00'); // VIS seconds converted
    });
  });

  describe('Match List Display and Filtering with New Data Structure', () => {
    it('should adapt VIS-compliant matches for component display', () => {
      const adaptedMatch = adaptVisMatchToComponent(mockVisCompliantMatch);

      // Verify computed fields
      expect(adaptedMatch.id).toBe(`${mockTournamentNo}-101`);
      expect(adaptedMatch.matchNumber).toBe('101');
      expect(adaptedMatch.scheduledDateTime).toBe('2025-01-15T15:30:00');

      // Verify team data transformation
      expect(adaptedMatch.team1.teamName).toBe('Integration Team A');
      expect(adaptedMatch.team1.countryCode).toBe('ITA');
      expect(adaptedMatch.team2.teamName).toBe('Integration Team B');
      expect(adaptedMatch.team2.countryCode).toBe('BRA');

      // Verify numeric scores preserved
      expect(adaptedMatch.result.team1Sets).toBe(1);
      expect(adaptedMatch.result.team2Sets).toBe(0);
      expect(adaptedMatch.result.setScores).toEqual([21, 17, 19, 21]);

      // Verify duration conversion
      expect(adaptedMatch.result.duration).toBe(50); // (1620 + 1380) / 60 = 50 minutes
    });

    it('should handle mixed VIS-compliant and legacy data', () => {
      const legacyMatch = {
        No: '102',
        TeamAName: 'Legacy Team A',
        TeamBName: 'Legacy Team B',
        MatchPointsA: '2',
        MatchPointsB: '1',
      };

      const mixedMatches = [mockVisCompliantMatch, legacyMatch];
      const adaptedMatches = adaptMatchesForComponent(mixedMatches);

      expect(adaptedMatches).toHaveLength(2);
      
      // First match should be VIS-compliant adapted
      expect(adaptedMatches[0].id).toBe(`${mockTournamentNo}-101`);
      expect(adaptedMatches[0].matchNumber).toBe('101');
      
      // Second match should be legacy (passed through)
      expect(adaptedMatches[1]).toBe(legacyMatch);
    });
  });

  describe('Referee Assignment Workflows with VIS-Compliant Match Objects', () => {
    it('should process referee assignments with VIS-compliant match data', () => {
      const mockReferee: RefereeProfile = {
        name: 'Integration Ref 1',
        id: '201',
        federationCode: 'ITA'
      };

      const assignment = RefereeAssignmentsService.transformToRefereeAssignment(
        mockVisCompliantMatch, 
        mockReferee
      );

      // Verify VIS numeric fields converted to strings for assignment interface
      expect(assignment.matchNo).toBe('101');
      expect(assignment.matchInTournament).toBe('25');
      expect(assignment.teamAName).toBe('Integration Team A');
      expect(assignment.teamBName).toBe('Integration Team B');
      expect(assignment.refereeRole).toBe('referee1');
      expect(assignment.status).toBe('Running');
    });
  });

  describe('Score Entry and Match Result Submission with Numeric Types', () => {
    it('should handle VIS numeric scores correctly in match result transformation', () => {
      // This tests the transformation path from VIS to MatchResult format
      const transformedMatch = (MatchResultsService as any).transformToMatchResult(mockVisCompliantMatch);

      // Verify numeric fields are preserved correctly
      expect(transformedMatch.matchPointsA).toBe(1);
      expect(transformedMatch.matchPointsB).toBe(0);
      expect(transformedMatch.pointsTeamASet1).toBe(21);
      expect(transformedMatch.pointsTeamBSet1).toBe(17);
      expect(transformedMatch.pointsTeamASet2).toBe(19);
      expect(transformedMatch.pointsTeamBSet2).toBe(21);

      // Verify VIS seconds converted to time strings
      expect(transformedMatch.durationSet1).toBe('27:00');
      expect(transformedMatch.durationSet2).toBe('23:00');

      // Verify referee data preserved
      expect(transformedMatch.referee1Name).toBe('Integration Ref 1');
      expect(transformedMatch.referee2Name).toBe('Integration Ref 2');
    });
  });

  describe('Performance Testing - No Degradation in Match List Rendering', () => {
    it('should process large sets of VIS-compliant matches efficiently', () => {
      // Generate a large set of VIS-compliant matches
      const largeMatchSet = Array.from({ length: 100 }, (_, index) => ({
        ...mockVisCompliantMatch,
        No: index + 1,
        NoInTournament: index + 1,
      }));

      const startTime = performance.now();
      
      // Process all matches through the adapter
      const adaptedMatches = adaptMatchesForComponent(largeMatchSet);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Verify all matches processed
      expect(adaptedMatches).toHaveLength(100);
      
      // Verify performance (should complete in under 50ms for 100 matches)
      expect(processingTime).toBeLessThan(50);
      
      // Spot check first and last matches
      expect(adaptedMatches[0].matchNumber).toBe('1');
      expect(adaptedMatches[99].matchNumber).toBe('100');
    });

    it('should validate type guard performance', () => {
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        isVisCompliantMatchData(mockVisCompliantMatch);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      // Type guard should be very fast (sub-millisecond average)
      expect(avgTime).toBeLessThan(0.1); // 0.1ms average
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid VIS data gracefully', () => {
      const invalidMatch = {
        // Missing required No field
        NoInTournament: 1,
        Format: BeachMatchFormat.BEST_OF_3,
      };

      expect(() => {
        adaptVisMatchToComponent(invalidMatch as any);
      }).toThrow('Missing required VIS match identifiers');
    });

    it('should handle malformed date/time data', () => {
      const malformedMatch = {
        ...mockVisCompliantMatch,
        LocalDate: 'invalid-date',
        LocalTime: '25:99', // Invalid time
      };

      // Should not throw, but should log warning and use fallback
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = adaptVisMatchToComponent(malformedMatch);
      
      // Should have valid ISO string as fallback
      expect(result.scheduledDateTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      consoleSpy.mockRestore();
    });

    it('should handle empty or undefined duration data', () => {
      const matchWithoutDurations = {
        ...mockVisCompliantMatch,
        DurationSet1Seconds: undefined,
        DurationSet2Seconds: undefined,
        DurationSet3Seconds: undefined,
      };

      const result = adaptVisMatchToComponent(matchWithoutDurations);
      
      expect(result.result?.duration).toBeUndefined();
      expect(result.DurationSet1).toBeUndefined();
      expect(result.DurationSet2).toBeUndefined();
      expect(result.DurationSet3).toBeUndefined();
    });
  });
});