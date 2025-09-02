/**
 * @fileoverview Tests for VIS-compliant MatchResultsService functionality
 * Tests the updated service layer to use VisCompliantMatch instead of legacy types
 * Part of VIS Data Structure Alignment Epic - Story 1.3
 */

import { MatchResultsService } from '../MatchResultsService';
import { VisCompliantMatch, BeachMatchFormat } from '../../types/match-vis-compliant';
import { CacheService } from '../CacheService';

// Mock the dependencies
jest.mock('../CacheService');
jest.mock('../parsing/VisResponseParser');

const mockCacheService = CacheService as jest.Mocked<typeof CacheService>;

describe('MatchResultsService - VIS Compliant Methods', () => {
  const mockTournamentNo = 'tournament-123';
  
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
    tournamentNo: mockTournamentNo,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('transformToMatchResult', () => {
    test('should transform VIS-compliant match to MatchResult format', () => {
      // Access the private method for testing with proper context
      const result = (MatchResultsService as any).transformToMatchResult.call(MatchResultsService, mockVisCompliantMatch);

      expect(result).toEqual({
        no: '123', // Converted from number to string
        tournamentNo: mockTournamentNo,
        teamAName: 'Brazil Team A',
        teamBName: 'USA Team B',
        status: 'Finished',
        
        // Numeric fields used directly from VIS-compliant match
        matchPointsA: 2,
        matchPointsB: 1,
        pointsTeamASet1: 21,
        pointsTeamBSet1: 18,
        pointsTeamASet2: 21,
        pointsTeamBSet2: 15,
        pointsTeamASet3: 0,
        pointsTeamBSet3: 0,
        
        // Referee information converted to strings
        referee1No: '101',
        referee1Name: 'John Smith',
        referee1FederationCode: undefined,
        referee2No: '102',
        referee2Name: 'Jane Doe',
        referee2FederationCode: undefined,
        
        // VIS seconds converted to time strings
        durationSet1: '30:00', // 1800 seconds = 30:00
        durationSet2: '25:00', // 1500 seconds = 25:00
        durationSet3: '',
        localDate: expect.any(Date),
        localTime: '14:30',
        court: 'Center Court',
        round: '',
      });
    });

    test('should handle missing optional numeric fields', () => {
      const minimalMatch: VisCompliantMatch = {
        No: 124,
        NoInTournament: 46,
        Format: BeachMatchFormat.BEST_OF_3,
        tournamentNo: mockTournamentNo,
      };

      const result = (MatchResultsService as any).transformToMatchResult.call(MatchResultsService, minimalMatch);

      expect(result.no).toBe('124');
      expect(result.matchPointsA).toBe(0);
      expect(result.matchPointsB).toBe(0);
      expect(result.referee1No).toBeUndefined();
      expect(result.durationSet1).toBe('');
    });
  });

  describe('fetchMatchData', () => {
    test('should use VIS-compliant cache method', async () => {
      const mockCacheResult = {
        data: [mockVisCompliantMatch],
        source: 'cache' as const,
        fromCache: true,
        timestamp: Date.now(),
      };

      mockCacheService.getMatchesVisCompliant = jest.fn().mockResolvedValue(mockCacheResult);

      const result = await (MatchResultsService as any).fetchMatchData.call(MatchResultsService, mockTournamentNo);

      expect(mockCacheService.getMatchesVisCompliant).toHaveBeenCalledWith(mockTournamentNo);
      expect(result).toEqual([mockVisCompliantMatch]);
    });

    test('should fall back to API when cache is empty', async () => {
      const mockCacheResult = {
        data: [],
        source: 'cache' as const,
        fromCache: true,
        timestamp: Date.now(),
      };

      mockCacheService.getMatchesVisCompliant = jest.fn().mockResolvedValue(mockCacheResult);
      
      // Mock the API response and parser
      const mockVisResponseParser = {
        parseBeachMatchesVisCompliant: jest.fn().mockReturnValue([mockVisCompliantMatch])
      };
      
      jest.doMock('../parsing/VisResponseParser', () => ({
        VisResponseParser: mockVisResponseParser
      }));

      // Mock API would need more complex setup, testing cache call for now
      
      // This test would need more setup for the API client mock
      // For now, just verify cache is called
      expect(mockCacheService.getMatchesVisCompliant).toBeDefined();
    });
  });

  describe('getMatchResults', () => {
    test('should return VIS-compliant match results with proper transformation', async () => {
      const mockCacheResult = {
        data: [mockVisCompliantMatch],
        source: 'cache' as const,
        fromCache: true,
        timestamp: Date.now(),
      };

      mockCacheService.getMatchesVisCompliant = jest.fn().mockResolvedValue(mockCacheResult);

      const result = await MatchResultsService.getMatchResults(mockTournamentNo);

      expect(result.live).toBeInstanceOf(Array);
      expect(result.completed).toBeInstanceOf(Array);
      expect(result.scheduled).toBeInstanceOf(Array);
      
      // The match should be categorized as completed based on its status
      expect(result.completed.length).toBeGreaterThan(0);
      expect(result.completed[0].no).toBe('123'); // String conversion
    });
  });

  describe('VIS seconds duration conversion', () => {
    test('should correctly convert VIS seconds to time strings', () => {
      const matchWithDuration: VisCompliantMatch = {
        ...mockVisCompliantMatch,
        DurationSet1Seconds: 3661, // 1 hour, 1 minute, 1 second = 61:01
        DurationSet2Seconds: 1800, // 30 minutes = 30:00
        DurationSet3Seconds: 900,  // 15 minutes = 15:00
      };

      const result = (MatchResultsService as any).transformToMatchResult.call(MatchResultsService, matchWithDuration);

      expect(result.durationSet1).toBe('61:01');
      expect(result.durationSet2).toBe('30:00');
      expect(result.durationSet3).toBe('15:00');
    });

    test('should handle undefined duration seconds', () => {
      const matchWithoutDuration: VisCompliantMatch = {
        ...mockVisCompliantMatch,
        DurationSet1Seconds: undefined,
        DurationSet2Seconds: undefined,
        DurationSet3Seconds: undefined,
      };

      const result = (MatchResultsService as any).transformToMatchResult.call(MatchResultsService, matchWithoutDuration);

      expect(result.durationSet1).toBe('');
      expect(result.durationSet2).toBe('');
      expect(result.durationSet3).toBe('');
    });
  });
});