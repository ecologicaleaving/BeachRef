import { visService } from '../vis.service';
import { visCircuitBreaker, retryWithBackoff } from '../../middleware/error.middleware';
import { VISAPIError } from '../../types/vis.types';

// Mock the external dependencies
jest.mock('../../middleware/error.middleware');
jest.mock('../../utils/logger');

const mockVisCircuitBreaker = visCircuitBreaker as jest.Mocked<typeof visCircuitBreaker>;
const mockRetryWithBackoff = retryWithBackoff as jest.MockedFunction<typeof retryWithBackoff>;

describe.skip('VISService - Match Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockVisCircuitBreaker.execute.mockImplementation(async (fn) => fn());
    mockRetryWithBackoff.mockImplementation(async (fn) => fn());
  });

  describe('getTournamentMatches', () => {
    const mockVISMatchResponse = {
      responses: [{
        matches: [
          {
            matchId: 'match-1',
            team1Players: 'John Doe/Jane Smith',
            team2Players: 'Mike Johnson/Sarah Wilson',
            team1Country: 'USA',
            team2Country: 'BRA',
            startTime: '2024-01-15T10:00:00Z',
            status: 'Completed',
            score: '21-19, 18-21, 15-13',
            round: 'Quarterfinal',
            court: 'Center Court'
          },
          {
            matchId: 'match-2',
            team1Players: 'Carlos Silva/Roberto Santos',
            team2Players: 'Alex Anderson/Tom Thompson',
            team1Country: 'ESP',
            team2Country: 'GER',
            startTime: '2024-01-15T14:00:00Z',
            status: 'Scheduled',
            round: 'Semifinal',
            court: 'Court 2'
          }
        ]
      }]
    };

    it('should fetch and transform tournament matches successfully', async () => {
      // Mock the internal makeVISRequest method
      const mockMakeVISRequest = jest.spyOn(visService as any, 'makeVISRequest');
      mockMakeVISRequest.mockResolvedValue({ data: mockVISMatchResponse });

      const result = await visService.getTournamentMatches('tournament-1');

      expect(result).toHaveLength(2);
      
      // Check first match transformation
      expect(result[0]).toMatchObject({
        id: 'match-1',
        tournamentId: 'tournament-1',
        teams: {
          team1: {
            player1: 'John Doe',
            player2: 'Jane Smith',
            country: 'USA'
          },
          team2: {
            player1: 'Mike Johnson',
            player2: 'Sarah Wilson',
            country: 'BRA'
          }
        },
        score: {
          set1: { team1: 21, team2: 19 },
          set2: { team1: 18, team2: 21 },
          set3: { team1: 15, team2: 13 }
        },
        status: 'Completed',
        round: 'Quarterfinal',
        court: 'Center Court',
        winner: 'team1'
      });

      // Check second match transformation
      expect(result[1]).toMatchObject({
        id: 'match-2',
        tournamentId: 'tournament-1',
        status: 'Scheduled',
        round: 'Semifinal',
        court: 'Court 2'
      });

      mockMakeVISRequest.mockRestore();
    });

    it('should handle single match response', async () => {
      const singleMatchResponse = {
        responses: [{
          matches: {
            matchId: 'match-1',
            team1Players: 'Player One',
            team2Players: 'Player Two',
            startTime: '2024-01-15T10:00:00Z',
            status: 'Live',
            round: 'Final',
            court: 'Center Court'
          }
        }]
      };

      const mockMakeVISRequest = jest.spyOn(visService as any, 'makeVISRequest');
      mockMakeVISRequest.mockResolvedValue({ data: singleMatchResponse });

      const result = await visService.getTournamentMatches('tournament-1');

      expect(result).toHaveLength(1);
      expect(result[0].teams.team1.player1).toBe('Player One');
      expect(result[0].teams.team1.player2).toBe('');

      mockMakeVISRequest.mockRestore();
    });

    it('should return empty array when no matches found', async () => {
      const emptyResponse = {
        responses: [{}]
      };

      const mockMakeVISRequest = jest.spyOn(visService as any, 'makeVISRequest');
      mockMakeVISRequest.mockResolvedValue({ data: emptyResponse });

      const result = await visService.getTournamentMatches('tournament-1');

      expect(result).toEqual([]);

      mockMakeVISRequest.mockRestore();
    });

    it('should use circuit breaker and retry logic', async () => {
      const mockMakeVISRequest = jest.spyOn(visService as any, 'makeVISRequest');
      mockMakeVISRequest.mockResolvedValue({ data: mockVISMatchResponse });

      await visService.getTournamentMatches('tournament-1');

      expect(mockVisCircuitBreaker.execute).toHaveBeenCalledTimes(1);
      expect(mockRetryWithBackoff).toHaveBeenCalledWith(
        expect.any(Function),
        3, // Max 3 retries
        1000, // 1s base delay
        5000 // 5s max delay
      );

      mockMakeVISRequest.mockRestore();
    });

    it('should cache results for 2 minutes', async () => {
      const mockMakeVISRequest = jest.spyOn(visService as any, 'makeVISRequest');
      mockMakeVISRequest.mockResolvedValue({ data: mockVISMatchResponse });

      // First call
      const result1 = await visService.getTournamentMatches('tournament-1');
      
      // Second call should use cache
      const result2 = await visService.getTournamentMatches('tournament-1');

      expect(result1).toEqual(result2);
      expect(mockMakeVISRequest).toHaveBeenCalledTimes(1); // Only called once due to caching

      mockMakeVISRequest.mockRestore();
    });
  });

  describe('Match transformation utilities', () => {
    describe('parseTeamPlayers', () => {
      it('should parse slash-separated player names', () => {
        const parseTeamPlayers = (visService as any).parseTeamPlayers.bind(visService);
        
        expect(parseTeamPlayers('John Doe/Jane Smith')).toEqual(['John Doe', 'Jane Smith']);
        expect(parseTeamPlayers('Single Player')).toEqual(['Single Player']);
        expect(parseTeamPlayers('')).toEqual([]);
        expect(parseTeamPlayers(null)).toEqual([]);
      });

      it('should parse comma-separated player names', () => {
        const parseTeamPlayers = (visService as any).parseTeamPlayers.bind(visService);
        
        expect(parseTeamPlayers('John Doe, Jane Smith')).toEqual(['John Doe', 'Jane Smith']);
        expect(parseTeamPlayers('Player One,Player Two')).toEqual(['Player One', 'Player Two']);
      });
    });

    describe('parseMatchScore', () => {
      it('should parse string score format', () => {
        const parseMatchScore = (visService as any).parseMatchScore.bind(visService);
        
        const result = parseMatchScore('21-19, 18-21, 15-13');
        expect(result).toEqual({
          set1: { team1: 21, team2: 19 },
          set2: { team1: 18, team2: 21 },
          set3: { team1: 15, team2: 13 }
        });
      });

      it('should handle partial scores', () => {
        const parseMatchScore = (visService as any).parseMatchScore.bind(visService);
        
        const result = parseMatchScore('21-19, 18-21');
        expect(result).toEqual({
          set1: { team1: 21, team2: 19 },
          set2: { team1: 18, team2: 21 }
        });
      });

      it('should return empty object for invalid scores', () => {
        const parseMatchScore = (visService as any).parseMatchScore.bind(visService);
        
        expect(parseMatchScore('')).toEqual({});
        expect(parseMatchScore(null)).toEqual({});
        expect(parseMatchScore('invalid')).toEqual({});
      });
    });

    describe('determineWinner', () => {
      it('should determine winner correctly', () => {
        const determineWinner = (visService as any).determineWinner.bind(visService);
        
        // Team 1 wins 2-1
        const score1 = {
          set1: { team1: 21, team2: 19 },
          set2: { team1: 18, team2: 21 },
          set3: { team1: 15, team2: 13 }
        };
        expect(determineWinner(score1)).toBe('team1');

        // Team 2 wins 2-0
        const score2 = {
          set1: { team1: 19, team2: 21 },
          set2: { team1: 18, team2: 21 }
        };
        expect(determineWinner(score2)).toBe('team2');

        // Tie 1-1 (no winner)
        const score3 = {
          set1: { team1: 21, team2: 19 },
          set2: { team1: 18, team2: 21 }
        };
        expect(determineWinner(score3)).toBeUndefined();
      });
    });
  });
});