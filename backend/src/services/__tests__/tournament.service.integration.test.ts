import { tournamentService } from '../tournament.service';
import { visService } from '../vis.service';
import { TournamentDetailResponse } from '../../types/tournament.types';

jest.mock('../vis.service');

const mockVisService = visService as jest.Mocked<typeof visService>;

describe('TournamentService Integration Tests', () => {
  const mockTournamentDetail = {
    id: 'tournament-1',
    name: 'Test Tournament',
    dates: {
      start: new Date('2024-01-15'),
      end: new Date('2024-01-20')
    },
    location: {
      city: 'Miami',
      country: 'USA',
      venue: 'South Beach Arena'
    },
    level: 'World Tour' as const,
    status: 'Live' as const,
    matchCount: 32,
    prizeMoney: 50000,
    surface: 'Sand' as const,
    gender: 'Men' as const
  };

  const mockMatches = [
    {
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
      status: 'Completed' as const,
      scheduledTime: new Date('2024-01-15T10:00:00Z'),
      actualStartTime: new Date('2024-01-15T10:05:00Z'),
      duration: 85,
      round: 'Quarterfinal',
      court: 'Center Court',
      winner: 'team1' as const
    },
    {
      id: 'match-2',
      tournamentId: 'tournament-1',
      teams: {
        team1: {
          player1: 'Carlos Silva',
          player2: 'Roberto Santos',
          country: 'ESP'
        },
        team2: {
          player1: 'Alex Anderson',
          player2: 'Tom Thompson',
          country: 'GER'
        }
      },
      score: {},
      status: 'Scheduled' as const,
      scheduledTime: new Date('2024-01-15T14:00:00Z'),
      round: 'Semifinal',
      court: 'Court 2'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTournamentById', () => {
    it('should return tournament detail with matches and statistics', async () => {
      mockVisService.getTournamentById.mockResolvedValue(mockTournamentDetail);
      mockVisService.getTournamentMatches.mockResolvedValue(mockMatches);

      const result = await tournamentService.getTournamentById('tournament-1');

      expect(result).toBeDefined();
      expect(result!.tournament).toEqual(mockTournamentDetail);
      expect(result!.matches).toEqual(mockMatches);
      expect(result!.statistics).toEqual({
        totalMatches: 2,
        completedMatches: 1,
        upcomingMatches: 1,
        liveMatches: 0
      });
    });

    it('should return null when tournament is not found', async () => {
      mockVisService.getTournamentById.mockResolvedValue(null);

      const result = await tournamentService.getTournamentById('nonexistent');

      expect(result).toBeNull();
      expect(mockVisService.getTournamentMatches).not.toHaveBeenCalled();
    });

    it('should calculate statistics correctly for different match statuses', async () => {
      const mixedMatches = [
        { ...mockMatches[0], status: 'Completed' as const },
        { ...mockMatches[1], status: 'Live' as const },
        { ...mockMatches[0], id: 'match-3', status: 'Scheduled' as const },
        { ...mockMatches[0], id: 'match-4', status: 'Postponed' as const }
      ];

      mockVisService.getTournamentById.mockResolvedValue(mockTournamentDetail);
      mockVisService.getTournamentMatches.mockResolvedValue(mixedMatches);

      const result = await tournamentService.getTournamentById('tournament-1');

      expect(result!.statistics).toEqual({
        totalMatches: 4,
        completedMatches: 1,
        upcomingMatches: 1,
        liveMatches: 1
      });
    });

    it('should handle VIS service errors', async () => {
      const error = new Error('VIS API unavailable');
      mockVisService.getTournamentById.mockRejectedValue(error);

      await expect(tournamentService.getTournamentById('tournament-1')).rejects.toThrow('VIS API unavailable');
    });

    it('should handle match fetching errors after successful tournament fetch', async () => {
      mockVisService.getTournamentById.mockResolvedValue(mockTournamentDetail);
      mockVisService.getTournamentMatches.mockRejectedValue(new Error('Match fetch failed'));

      await expect(tournamentService.getTournamentById('tournament-1')).rejects.toThrow('Match fetch failed');
    });
  });
});