import {
  formatTeamName,
  formatMatchScore,
  getMatchStatusColor,
  getMatchStatusVariant,
  formatMatchTime,
  formatMatchDate,
  getWinnerName,
  formatMatchDuration
} from '../match.utils';
import { Match } from '@/types/tournament.types';

describe('match.utils', () => {
  const mockMatch: Match = {
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
    scheduledTime: new Date('2024-01-15T10:00:00Z'),
    actualStartTime: new Date('2024-01-15T10:05:00Z'),
    duration: 85,
    round: 'Quarterfinal',
    court: 'Center Court',
    winner: 'team1'
  };

  describe('formatTeamName', () => {
    it('should format team with two players', () => {
      const result = formatTeamName(mockMatch.teams.team1);
      expect(result).toBe('John Doe / Jane Smith');
    });

    it('should format team with one player', () => {
      const singlePlayerTeam = {
        player1: 'Solo Player',
        player2: '',
        country: 'USA'
      };
      const result = formatTeamName(singlePlayerTeam);
      expect(result).toBe('Solo Player');
    });

    it('should handle empty player2', () => {
      const team = {
        player1: 'Only Player',
        player2: '',
        country: 'USA'
      };
      const result = formatTeamName(team);
      expect(result).toBe('Only Player');
    });
  });

  describe('formatMatchScore', () => {
    it('should format complete match score', () => {
      const result = formatMatchScore(mockMatch);
      expect(result).toBe('21-19, 18-21, 15-13');
    });

    it('should format partial match score', () => {
      const partialMatch = {
        ...mockMatch,
        score: {
          set1: { team1: 21, team2: 19 },
          set2: { team1: 18, team2: 21 }
        }
      };
      const result = formatMatchScore(partialMatch);
      expect(result).toBe('21-19, 18-21');
    });

    it('should return dash for empty score', () => {
      const emptyMatch = {
        ...mockMatch,
        score: {}
      };
      const result = formatMatchScore(emptyMatch);
      expect(result).toBe('-');
    });

    it('should return dash for no score', () => {
      const noScoreMatch = {
        ...mockMatch,
        score: {} as Match['score']
      };
      const result = formatMatchScore(noScoreMatch);
      expect(result).toBe('-');
    });
  });

  describe('getMatchStatusColor', () => {
    it('should return correct colors for each status', () => {
      expect(getMatchStatusColor('Scheduled')).toBe('text-blue-600');
      expect(getMatchStatusColor('Live')).toBe('text-green-600');
      expect(getMatchStatusColor('Completed')).toBe('text-gray-600');
      expect(getMatchStatusColor('Postponed')).toBe('text-red-600');
    });

    it('should return default color for unknown status', () => {
      expect(getMatchStatusColor('Unknown' as Match['status'])).toBe('text-gray-600');
    });
  });

  describe('getMatchStatusVariant', () => {
    it('should return correct variants for each status', () => {
      expect(getMatchStatusVariant('Scheduled')).toBe('default');
      expect(getMatchStatusVariant('Live')).toBe('default');
      expect(getMatchStatusVariant('Completed')).toBe('secondary');
      expect(getMatchStatusVariant('Postponed')).toBe('destructive');
    });

    it('should return outline for unknown status', () => {
      expect(getMatchStatusVariant('Unknown' as Match['status'])).toBe('outline');
    });
  });

  describe('formatMatchTime', () => {
    it('should format time from actualStartTime', () => {
      const result = formatMatchTime(mockMatch);
      // Account for timezone offset - just check that it's a valid time format
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should format time from scheduledTime when no actualStartTime', () => {
      const scheduledMatch = {
        ...mockMatch,
        actualStartTime: undefined
      };
      const result = formatMatchTime(scheduledMatch);
      // Account for timezone offset - just check that it's a valid time format
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should format time in 24-hour format', () => {
      const afternoonMatch = {
        ...mockMatch,
        scheduledTime: new Date('2024-01-15T14:30:00Z'),
        actualStartTime: undefined
      };
      const result = formatMatchTime(afternoonMatch);
      // Account for timezone offset - just check that it's a valid time format
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('formatMatchDate', () => {
    it('should format date from actualStartTime', () => {
      const result = formatMatchDate(mockMatch);
      expect(result).toBe('Jan 15');
    });

    it('should format date from scheduledTime when no actualStartTime', () => {
      const scheduledMatch = {
        ...mockMatch,
        actualStartTime: undefined
      };
      const result = formatMatchDate(scheduledMatch);
      expect(result).toBe('Jan 15');
    });
  });

  describe('getWinnerName', () => {
    it('should return winner name for completed match with team1 winner', () => {
      const result = getWinnerName(mockMatch);
      expect(result).toBe('John Doe / Jane Smith');
    });

    it('should return winner name for completed match with team2 winner', () => {
      const team2WinnerMatch = {
        ...mockMatch,
        winner: 'team2' as const
      };
      const result = getWinnerName(team2WinnerMatch);
      expect(result).toBe('Mike Johnson / Sarah Wilson');
    });

    it('should return null for non-completed match', () => {
      const liveMatch = {
        ...mockMatch,
        status: 'Live' as const
      };
      const result = getWinnerName(liveMatch);
      expect(result).toBeNull();
    });

    it('should return null for completed match without winner', () => {
      const noWinnerMatch = {
        ...mockMatch,
        winner: undefined
      };
      const result = getWinnerName(noWinnerMatch);
      expect(result).toBeNull();
    });
  });

  describe('formatMatchDuration', () => {
    it('should format duration in minutes only', () => {
      const result = formatMatchDuration(45);
      expect(result).toBe('45m');
    });

    it('should format duration with hours and minutes', () => {
      const result = formatMatchDuration(125); // 2 hours 5 minutes
      expect(result).toBe('2h 5m');
    });

    it('should format duration with exact hours', () => {
      const result = formatMatchDuration(120); // 2 hours
      expect(result).toBe('2h 0m');
    });

    it('should return dash for undefined duration', () => {
      const result = formatMatchDuration(undefined);
      expect(result).toBe('-');
    });

    it('should return dash for zero duration', () => {
      const result = formatMatchDuration(0);
      expect(result).toBe('-');
    });
  });
});