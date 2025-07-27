import { render, screen } from '@testing-library/react';
import { MatchCard } from '../MatchCard';
import type { Match } from '@/types/tournament.types';

// Mock the match utils
jest.mock('@/utils/match.utils', () => ({
  formatTeamName: (team: { player1: string; player2: string }) => team.player2 ? `${team.player1} / ${team.player2}` : team.player1,
  formatMatchScore: (match: { score?: Record<string, unknown> }) => match.score?.set1 ? '21-19, 18-21, 15-13' : '-',
  getMatchStatusVariant: (status: string) => status === 'Live' ? 'default' : 'secondary',
  formatMatchTime: () => '10:00',
  formatMatchDate: () => 'Jan 15',
  getWinnerName: (match: { winner?: string }) => match.winner === 'team1' ? 'John Doe / Jane Smith' : null,
  formatMatchDuration: (duration?: number) => duration ? `${duration}m` : '-'
}));

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

describe('MatchCard', () => {
  it('should render match basic information', () => {
    render(<MatchCard match={mockMatch} />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Quarterfinal')).toBeInTheDocument();
    expect(screen.getByText('Jan 15')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
  });

  it('should render team names and countries', () => {
    render(<MatchCard match={mockMatch} />);

    expect(screen.getByText('John Doe / Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Mike Johnson / Sarah Wilson')).toBeInTheDocument();
    expect(screen.getByText('USA')).toBeInTheDocument();
    expect(screen.getByText('BRA')).toBeInTheDocument();
  });

  it('should render score for non-scheduled matches', () => {
    render(<MatchCard match={mockMatch} />);

    expect(screen.getByText('21-19, 18-21, 15-13')).toBeInTheDocument();
  });

  it('should not render score for scheduled matches', () => {
    const scheduledMatch = {
      ...mockMatch,
      status: 'Scheduled' as const,
      score: {}
    };

    render(<MatchCard match={scheduledMatch} />);

    expect(screen.queryByText('21-19, 18-21, 15-13')).not.toBeInTheDocument();
  });

  it('should render court and duration information', () => {
    render(<MatchCard match={mockMatch} />);

    expect(screen.getByText('Center Court')).toBeInTheDocument();
    expect(screen.getByText('85m')).toBeInTheDocument();
  });

  it('should render winner information for completed matches', () => {
    render(<MatchCard match={mockMatch} />);

    expect(screen.getByText('Winner: John Doe / Jane Smith')).toBeInTheDocument();
  });

  it('should not render winner for non-completed matches', () => {
    const liveMatch = {
      ...mockMatch,
      status: 'Live' as const,
      winner: undefined
    };

    render(<MatchCard match={liveMatch} />);

    expect(screen.queryByText(/Winner:/)).not.toBeInTheDocument();
  });

  it('should render trophy icon for winning team', () => {
    render(<MatchCard match={mockMatch} />);

    // Should have trophy icon next to team1 (winner)
    const trophyIcons = screen.getAllByTestId('trophy-icon');
    expect(trophyIcons).toHaveLength(1);
  });

  it('should handle matches without team countries', () => {
    const matchWithoutCountries = {
      ...mockMatch,
      teams: {
        team1: {
          ...mockMatch.teams.team1,
          country: ''
        },
        team2: {
          ...mockMatch.teams.team2,
          country: ''
        }
      }
    };

    render(<MatchCard match={matchWithoutCountries} />);

    expect(screen.getByText('John Doe / Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Mike Johnson / Sarah Wilson')).toBeInTheDocument();
    expect(screen.queryByText('USA')).not.toBeInTheDocument();
    expect(screen.queryByText('BRA')).not.toBeInTheDocument();
  });

  it('should handle matches without duration', () => {
    const matchWithoutDuration = {
      ...mockMatch,
      duration: undefined
    };

    render(<MatchCard match={matchWithoutDuration} />);

    expect(screen.queryByText('85m')).not.toBeInTheDocument();
  });

  it('should apply live status styling', () => {
    const liveMatch = {
      ...mockMatch,
      status: 'Live' as const
    };

    render(<MatchCard match={liveMatch} />);

    const liveStatus = screen.getByText('Live');
    expect(liveStatus).toHaveClass('bg-green-500', 'text-white');
  });

  it('should apply custom className', () => {
    const { container } = render(<MatchCard match={mockMatch} className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });
});