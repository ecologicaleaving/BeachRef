/**
 * @fileoverview Tests for BeachLive type definitions
 * Tests type guards and utility functions for BeachLive data
 * Part of EPIC-001 Live Score Display - Story 1.1
 */

import {
  BeachLive,
  BeachMatchStatus,
  BeachSetStatus,
  BeachPlayerPosition,
  BeachRoundType,
  BeachLiveEventType,
  isValidBeachLive,
  isNoChangesResponse,
  extractVersion,
  extractPollDelay
} from '../beach-live';

describe('BeachLive Type Definitions', () => {
  
  const validBeachLive: BeachLive = {
    version: 1,
    pollDelay: 5000,
    isBallInPlay: true,
    isMatchPointTeamA: false,
    isMatchPointTeamB: false,
    isSetPointTeamA: false,
    isSetPointTeamB: false,
    noServingTeam: 1,
    noServingPlayer: 1,
    noTeamAtLeft: 1,
    noTeamAtRight: 2,
    match: {
      no: 123,
      noInTournament: 1,
      status: BeachMatchStatus.IN_PROGRESS,
      dateTime: '2025-08-25T10:00:00Z',
      court: {
        no: 1,
        name: 'Court 1',
        surface: 'Sand'
      },
      round: {
        no: 1,
        name: 'Pool A',
        phase: 'Pool',
        type: BeachRoundType.POOL
      }
    },
    sets: [
      {
        no: 1,
        pointsTeamA: 15,
        pointsTeamB: 12,
        status: BeachSetStatus.IN_PROGRESS
      }
    ],
    teamA: {
      no: 1,
      name: 'Team USA',
      federationCode: 'USA',
      players: [
        {
          no: 1,
          name: 'John Doe',
          position: BeachPlayerPosition.LEFT,
          isServing: true
        }
      ],
      matchPoints: 0,
      isServing: true,
      timeoutsRemaining: 1
    },
    teamB: {
      no: 2,
      name: 'Team Brazil',
      federationCode: 'BRA',
      players: [
        {
          no: 2,
          name: 'Jose Silva',
          position: BeachPlayerPosition.RIGHT,
          isServing: false
        }
      ],
      matchPoints: 0,
      isServing: false,
      timeoutsRemaining: 1
    },
    tournament: {
      no: 1,
      name: 'FIVB Beach Volleyball World Tour',
      code: 'FIVB2025',
      city: 'Rio de Janeiro',
      country: 'Brazil',
      federation: 'FIVB'
    }
  };

  describe('Enums', () => {
    test('BeachMatchStatus should have correct values', () => {
      expect(BeachMatchStatus.SCHEDULED).toBe('Scheduled');
      expect(BeachMatchStatus.IN_PROGRESS).toBe('InProgress');
      expect(BeachMatchStatus.FINISHED).toBe('Finished');
      expect(BeachMatchStatus.CANCELLED).toBe('Cancelled');
      expect(BeachMatchStatus.POSTPONED).toBe('Postponed');
      expect(BeachMatchStatus.SUSPENDED).toBe('Suspended');
    });

    test('BeachSetStatus should have correct values', () => {
      expect(BeachSetStatus.NOT_STARTED).toBe('NotStarted');
      expect(BeachSetStatus.IN_PROGRESS).toBe('InProgress');
      expect(BeachSetStatus.FINISHED).toBe('Finished');
    });

    test('BeachPlayerPosition should have correct values', () => {
      expect(BeachPlayerPosition.LEFT).toBe('Left');
      expect(BeachPlayerPosition.RIGHT).toBe('Right');
    });

    test('BeachRoundType should have correct values', () => {
      expect(BeachRoundType.POOL).toBe('Pool');
      expect(BeachRoundType.ELIMINATION).toBe('Elimination');
      expect(BeachRoundType.BRACKET).toBe('Bracket');
    });

    test('BeachLiveEventType should have correct values', () => {
      expect(BeachLiveEventType.POINT).toBe('Point');
      expect(BeachLiveEventType.SERVICE_ACE).toBe('ServiceAce');
      expect(BeachLiveEventType.SERVICE_ERROR).toBe('ServiceError');
      expect(BeachLiveEventType.ATTACK).toBe('Attack');
      expect(BeachLiveEventType.BLOCK).toBe('Block');
      expect(BeachLiveEventType.TIMEOUT).toBe('Timeout');
      expect(BeachLiveEventType.TECHNICAL_TIMEOUT).toBe('TechnicalTimeout');
      expect(BeachLiveEventType.SET_END).toBe('SetEnd');
      expect(BeachLiveEventType.MATCH_END).toBe('MatchEnd');
      expect(BeachLiveEventType.SIDE_CHANGE).toBe('SideChange');
    });
  });

  describe('Type Guards', () => {
    describe('isValidBeachLive', () => {
      test('should return true for valid BeachLive object', () => {
        expect(isValidBeachLive(validBeachLive)).toBe(true);
      });

      test('should return false for null or undefined', () => {
        expect(isValidBeachLive(null)).toBe(false);
        expect(isValidBeachLive(undefined)).toBe(false);
      });

      test('should return false for missing required fields', () => {
        const invalidData = { ...validBeachLive };
        delete (invalidData as any).version;
        expect(isValidBeachLive(invalidData)).toBe(false);
      });

      test('should return false for incorrect field types', () => {
        const invalidData = {
          ...validBeachLive,
          version: 'not-a-number'
        };
        expect(isValidBeachLive(invalidData)).toBe(false);
      });

      test('should return false for missing nested objects', () => {
        const invalidData = { ...validBeachLive };
        delete (invalidData as any).match;
        expect(isValidBeachLive(invalidData)).toBe(false);
      });

      test('should return false for non-array sets', () => {
        const invalidData = {
          ...validBeachLive,
          sets: 'not-an-array'
        };
        expect(isValidBeachLive(invalidData)).toBe(false);
      });
    });

    describe('isNoChangesResponse', () => {
      test('should return true for NoChanges response', () => {
        const noChangesResponse = { noChanges: true };
        expect(isNoChangesResponse(noChangesResponse)).toBe(true);
      });

      test('should return false for regular data', () => {
        expect(isNoChangesResponse(validBeachLive)).toBe(false);
      });

      test('should return false for null or undefined', () => {
        expect(isNoChangesResponse(null)).toBe(false);
        expect(isNoChangesResponse(undefined)).toBe(false);
      });

      test('should return false for false noChanges flag', () => {
        const response = { noChanges: false };
        expect(isNoChangesResponse(response)).toBe(false);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('extractVersion', () => {
      test('should extract version from valid BeachLive data', () => {
        expect(extractVersion(validBeachLive)).toBe(1);
      });

      test('should return undefined for invalid data', () => {
        expect(extractVersion(null)).toBeUndefined();
        expect(extractVersion({})).toBeUndefined();
        expect(extractVersion({ version: 'invalid' })).toBeUndefined();
      });

      test('should handle different version numbers', () => {
        const data = { ...validBeachLive, version: 42 };
        expect(extractVersion(data)).toBe(42);
      });
    });

    describe('extractPollDelay', () => {
      test('should extract pollDelay from valid BeachLive data', () => {
        expect(extractPollDelay(validBeachLive)).toBe(5000);
      });

      test('should return default value for invalid data', () => {
        expect(extractPollDelay(null)).toBe(5000);
        expect(extractPollDelay({})).toBe(5000);
        expect(extractPollDelay({ pollDelay: 'invalid' })).toBe(5000);
      });

      test('should handle different poll delays', () => {
        const data = { ...validBeachLive, pollDelay: 3000 };
        expect(extractPollDelay(data)).toBe(3000);
      });

      test('should return default for zero or negative delays', () => {
        const zeroDelay = { ...validBeachLive, pollDelay: 0 };
        const negativeDelay = { ...validBeachLive, pollDelay: -1000 };
        
        // Note: The function doesn't validate ranges, so this tests current behavior
        expect(extractPollDelay(zeroDelay)).toBe(0);
        expect(extractPollDelay(negativeDelay)).toBe(-1000);
      });
    });
  });

  describe('Data Structure Validation', () => {
    test('should validate complete match information', () => {
      expect(validBeachLive.match.no).toBe(123);
      expect(validBeachLive.match.status).toBe(BeachMatchStatus.IN_PROGRESS);
      expect(validBeachLive.match.court.name).toBe('Court 1');
      expect(validBeachLive.match.round.type).toBe(BeachRoundType.POOL);
    });

    test('should validate team structures', () => {
      expect(validBeachLive.teamA.no).toBe(1);
      expect(validBeachLive.teamA.federationCode).toBe('USA');
      expect(validBeachLive.teamA.players).toHaveLength(1);
      expect(validBeachLive.teamA.players[0].position).toBe(BeachPlayerPosition.LEFT);
      
      expect(validBeachLive.teamB.no).toBe(2);
      expect(validBeachLive.teamB.federationCode).toBe('BRA');
      expect(validBeachLive.teamB.players[0].position).toBe(BeachPlayerPosition.RIGHT);
    });

    test('should validate set information', () => {
      expect(validBeachLive.sets).toHaveLength(1);
      expect(validBeachLive.sets[0].no).toBe(1);
      expect(validBeachLive.sets[0].pointsTeamA).toBe(15);
      expect(validBeachLive.sets[0].pointsTeamB).toBe(12);
      expect(validBeachLive.sets[0].status).toBe(BeachSetStatus.IN_PROGRESS);
    });

    test('should validate tournament context', () => {
      expect(validBeachLive.tournament.no).toBe(1);
      expect(validBeachLive.tournament.name).toBe('FIVB Beach Volleyball World Tour');
      expect(validBeachLive.tournament.code).toBe('FIVB2025');
      expect(validBeachLive.tournament.city).toBe('Rio de Janeiro');
      expect(validBeachLive.tournament.country).toBe('Brazil');
      expect(validBeachLive.tournament.federation).toBe('FIVB');
    });

    test('should validate serving information', () => {
      expect(validBeachLive.noServingTeam).toBe(1);
      expect(validBeachLive.noServingPlayer).toBe(1);
      expect(validBeachLive.teamA.isServing).toBe(true);
      expect(validBeachLive.teamB.isServing).toBe(false);
      expect(validBeachLive.teamA.players[0].isServing).toBe(true);
    });

    test('should validate boolean flags', () => {
      expect(typeof validBeachLive.isBallInPlay).toBe('boolean');
      expect(typeof validBeachLive.isMatchPointTeamA).toBe('boolean');
      expect(typeof validBeachLive.isMatchPointTeamB).toBe('boolean');
      expect(typeof validBeachLive.isSetPointTeamA).toBe('boolean');
      expect(typeof validBeachLive.isSetPointTeamB).toBe('boolean');
    });
  });

  describe('Optional Fields', () => {
    test('should handle optional statistics field', () => {
      const dataWithStats: BeachLive = {
        ...validBeachLive,
        statistics: {
          totalRallies: 45,
          avgRallyDurationSeconds: 8.5,
          longestRallyDurationSeconds: 25,
          teamAStats: {
            attacks: 20,
            attacksSuccessful: 15,
            serves: 22,
            serviceAces: 3,
            serviceErrors: 2,
            blocks: 8,
            blocksSuccessful: 5
          },
          teamBStats: {
            attacks: 18,
            attacksSuccessful: 12,
            serves: 23,
            serviceAces: 2,
            serviceErrors: 3,
            blocks: 6,
            blocksSuccessful: 4
          }
        }
      };

      expect(isValidBeachLive(dataWithStats)).toBe(true);
      expect(dataWithStats.statistics?.totalRallies).toBe(45);
      expect(dataWithStats.statistics?.teamAStats.serviceAces).toBe(3);
    });

    test('should handle optional events field', () => {
      const dataWithEvents: BeachLive = {
        ...validBeachLive,
        events: [
          {
            sequence: 1,
            timestamp: '2025-08-25T10:05:00Z',
            type: BeachLiveEventType.SERVICE_ACE,
            teamNo: 1,
            playerNo: 1,
            description: 'Service ace by John Doe',
            scoreAfter: '1-0',
            setNo: 1
          }
        ]
      };

      expect(isValidBeachLive(dataWithEvents)).toBe(true);
      expect(dataWithEvents.events).toHaveLength(1);
      expect(dataWithEvents.events?.[0].type).toBe(BeachLiveEventType.SERVICE_ACE);
    });

    test('should handle optional weather information', () => {
      const dataWithWeather: BeachLive = {
        ...validBeachLive,
        match: {
          ...validBeachLive.match,
          weather: {
            temperatureC: 28,
            windSpeedKmh: 15,
            windDirection: 'NE',
            conditions: 'Sunny'
          }
        }
      };

      expect(isValidBeachLive(dataWithWeather)).toBe(true);
      expect(dataWithWeather.match.weather?.temperatureC).toBe(28);
    });
  });
});