import { render, screen, fireEvent } from '@testing-library/react'
import { TournamentDetail, Match } from '@/lib/types'
import TournamentScheduleTab from '@/components/tournament/TournamentScheduleTab'

// Mock data
const mockTournament: TournamentDetail = {
  code: 'TEST2025',
  name: 'Test Tournament',
  startDate: '2025-01-15',
  endDate: '2025-01-17',
  gender: 'Men',
  type: 'World Tour',
  location: 'Test Beach',
  year: 2025
}

const mockMatches: Match[] = [
  {
    id: '1',
    date: '2025-01-15',
    time: '09:00',
    team1: 'Team A',
    team2: 'Team B',
    status: 'scheduled',
    court: 'Court 1',
    round: 'Pool A'
  },
  {
    id: '2',
    date: '2025-01-15',
    time: '10:30',
    team1: 'Team C',
    team2: 'Team D',
    status: 'completed',
    court: 'Court 2',
    round: 'Pool A',
    result: {
      set1: { team1: 21, team2: 19 },
      set2: { team1: 21, team2: 16 }
    }
  }
]

describe('TournamentScheduleTab', () => {
  it('renders tournament schedule with accordion', () => {
    render(<TournamentScheduleTab tournament={mockTournament} matches={mockMatches} />)
    
    expect(screen.getByText('Tournament Schedule')).toBeInTheDocument()
    expect(screen.getByText(/Wednesday, January 15/)).toBeInTheDocument()
    expect(screen.getByText('2 matches')).toBeInTheDocument()
  })

  it('displays empty state when no matches provided', () => {
    render(<TournamentScheduleTab tournament={mockTournament} matches={[]} />)
    
    expect(screen.getByText('Schedule information will be available when tournament details are loaded.')).toBeInTheDocument()
  })

  it('opens match detail dialog when details button is clicked', async () => {
    render(<TournamentScheduleTab tournament={mockTournament} matches={mockMatches} />)
    
    // First expand accordion to access buttons
    const accordionTrigger = screen.getByRole('button', { name: /Wednesday, January 15/ })
    fireEvent.click(accordionTrigger)
    
    // Find and click details button
    const detailsButtons = screen.getAllByText('Details')
    fireEvent.click(detailsButtons[0])
    
    // Check if dialog opened (match title should be visible)
    expect(screen.getByText('Team A vs Team B')).toBeInTheDocument()
  })

  it('renders match statuses with correct badges', async () => {
    render(<TournamentScheduleTab tournament={mockTournament} matches={mockMatches} />)
    
    // Expand accordion
    const accordionTrigger = screen.getByRole('button', { name: /Wednesday, January 15/ })
    fireEvent.click(accordionTrigger)
    
    expect(screen.getByText('scheduled')).toBeInTheDocument()
    expect(screen.getByText('completed')).toBeInTheDocument()
  })

  it('maintains minimum touch targets for mobile', async () => {
    render(<TournamentScheduleTab tournament={mockTournament} matches={mockMatches} />)
    
    // Expand accordion
    const accordionTrigger = screen.getByRole('button', { name: /Wednesday, January 15/ })
    fireEvent.click(accordionTrigger)
    
    const detailsButtons = screen.getAllByText('Details')
    const button = detailsButtons[0]
    
    // Check minimum touch target size (48px)
    expect(button).toHaveClass('min-h-[48px]', 'min-w-[48px]')
  })
})