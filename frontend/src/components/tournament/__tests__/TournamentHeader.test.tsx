import { render, screen } from '@testing-library/react';
import { TournamentHeader } from '../TournamentHeader';
import { Tournament } from '@/types/tournament.types';

// Mock the date utils
jest.mock('@/utils/date.utils', () => ({
  formatTournamentDate: (date: Date) => date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric' 
  })
}));

const mockTournament: Tournament = {
  id: 'tournament-1',
  name: 'FIVB Beach Volleyball World Championships',
  dates: {
    start: new Date('2024-01-15'),
    end: new Date('2024-01-20')
  },
  location: {
    city: 'Miami',
    country: 'USA',
    venue: 'South Beach Arena'
  },
  level: 'World Tour',
  status: 'Live',
  matchCount: 32,
  prizeMoney: 50000,
  surface: 'Sand',
  gender: 'Men'
};

describe('TournamentHeader', () => {
  it('should render tournament name and status', () => {
    render(<TournamentHeader tournament={mockTournament} />);

    expect(screen.getByText('FIVB Beach Volleyball World Championships')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('should render tournament metadata badges', () => {
    render(<TournamentHeader tournament={mockTournament} />);

    expect(screen.getByText('World Tour')).toBeInTheDocument();
    expect(screen.getByText('Miami, USA')).toBeInTheDocument();
  });

  it('should render tournament details', () => {
    render(<TournamentHeader tournament={mockTournament} />);

    expect(screen.getByText('Surface:')).toBeInTheDocument();
    expect(screen.getByText('Sand')).toBeInTheDocument();
    expect(screen.getByText('Gender:')).toBeInTheDocument();
    expect(screen.getByText('Men')).toBeInTheDocument();
  });

  it('should render venue when provided', () => {
    render(<TournamentHeader tournament={mockTournament} />);

    expect(screen.getByText('Venue:')).toBeInTheDocument();
    expect(screen.getByText('South Beach Arena')).toBeInTheDocument();
  });

  it('should render prize money when provided', () => {
    render(<TournamentHeader tournament={mockTournament} />);

    expect(screen.getByText('Prize Money:')).toBeInTheDocument();
    expect(screen.getByText('$50,000')).toBeInTheDocument();
  });

  it('should not render venue when not provided', () => {
    const tournamentWithoutVenue = {
      ...mockTournament,
      location: {
        ...mockTournament.location,
        venue: undefined
      }
    };

    render(<TournamentHeader tournament={tournamentWithoutVenue} />);

    expect(screen.queryByText('Venue:')).not.toBeInTheDocument();
  });

  it('should not render prize money when not provided', () => {
    const tournamentWithoutPrize = {
      ...mockTournament,
      prizeMoney: undefined
    };

    render(<TournamentHeader tournament={tournamentWithoutPrize} />);

    expect(screen.queryByText('Prize Money:')).not.toBeInTheDocument();
  });

  it('should apply live status styling', () => {
    render(<TournamentHeader tournament={mockTournament} />);

    const liveStatus = screen.getByText('Live');
    expect(liveStatus).toHaveClass('bg-orange-500', 'text-white');
  });

  it('should render different status variants correctly', () => {
    const statuses: Tournament['status'][] = ['Upcoming', 'Completed', 'Cancelled'];
    
    statuses.forEach(status => {
      const tournament = { ...mockTournament, status };
      const { rerender } = render(<TournamentHeader tournament={tournament} />);
      
      expect(screen.getByText(status)).toBeInTheDocument();
      
      rerender(<div />); // Clear the component
    });
  });

  it('should display tournament level with trophy icon', () => {
    render(<TournamentHeader tournament={mockTournament} />);

    const levelBadge = screen.getByText('World Tour').closest('span');
    expect(levelBadge).toBeInTheDocument();
    
    // Check for Trophy icon (lucide-react trophy)
    const trophyIcon = levelBadge?.querySelector('svg');
    expect(trophyIcon).toBeInTheDocument();
  });

  it('should display location with map pin icon', () => {
    render(<TournamentHeader tournament={mockTournament} />);

    const locationBadge = screen.getByText('Miami, USA').closest('span');
    expect(locationBadge).toBeInTheDocument();
    
    // Check for MapPin icon
    const mapIcon = locationBadge?.querySelector('svg');
    expect(mapIcon).toBeInTheDocument();
  });

  it('should display dates with calendar icon', () => {
    render(<TournamentHeader tournament={mockTournament} />);

    // The dates should be formatted and displayed
    const dateElement = screen.getByText(/Jan 15, 2024 - Jan 20, 2024/);
    const dateBadge = dateElement.closest('span');
    expect(dateBadge).toBeInTheDocument();
    
    // Check for Calendar icon
    const calendarIcon = dateBadge?.querySelector('svg');
    expect(calendarIcon).toBeInTheDocument();
  });
});