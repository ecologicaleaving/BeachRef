import { render, screen, fireEvent } from '@testing-library/react'
import { Match } from '@/lib/types'
import MatchDetailDialog from '@/components/tournament/MatchDetailDialog'

const mockMatch: Match = {
  id: '1',
  date: '2025-01-15',
  time: '14:00',
  team1: 'Team A',
  team2: 'Team B',
  status: 'completed',
  court: 'Court 1',
  round: 'Semifinals',
  result: {
    set1: { team1: 21, team2: 19 },
    set2: { team1: 19, team2: 21 },
    set3: { team1: 15, team2: 13 }
  }
}

const mockScheduledMatch: Match = {
  id: '2',
  date: '2025-01-16',
  time: '10:00',
  team1: 'Team C',
  team2: 'Team D',
  status: 'scheduled',
  court: 'Court 2',
  round: 'Finals'
}

describe('MatchDetailDialog', () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  it('renders completed match with result table', () => {
    render(
      <MatchDetailDialog 
        match={mockMatch} 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    )

    expect(screen.getByText('Team A vs Team B')).toBeInTheDocument()
    expect(screen.getByText(/January 15, 2025 at 14:00/)).toBeInTheDocument()
    expect(screen.getByText(/Court 1/)).toBeInTheDocument()
    expect(screen.getByText(/Semifinals/)).toBeInTheDocument()
    
    // Check result table
    expect(screen.getByText('Match Result')).toBeInTheDocument()
    expect(screen.getByText('Set 1')).toBeInTheDocument()
    expect(screen.getByText('Set 2')).toBeInTheDocument()
    expect(screen.getByText('Set 3')).toBeInTheDocument()
    
    // Check scores
    expect(screen.getByText('21')).toBeInTheDocument()
    expect(screen.getByText('19')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('13')).toBeInTheDocument()
  })

  it('renders scheduled match without result', () => {
    render(
      <MatchDetailDialog 
        match={mockScheduledMatch} 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    )

    expect(screen.getByText('Team C vs Team D')).toBeInTheDocument()
    expect(screen.getByText('Match has not been completed yet.')).toBeInTheDocument()
    expect(screen.getByText('Match is scheduled to begin at 10:00')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(
      <MatchDetailDialog 
        match={mockMatch} 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    )

    const closeButton = screen.getByRole('button', { name: 'Close' })
    fireEvent.click(closeButton)
    
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('has proper dialog structure', () => {
    render(
      <MatchDetailDialog 
        match={mockMatch} 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    )

    // Check dialog has title and description
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Team A vs Team B')).toBeInTheDocument()
    expect(screen.getByText(/January 15, 2025 at 14:00/)).toBeInTheDocument()
  })

  it('maintains minimum touch target for close button', () => {
    render(
      <MatchDetailDialog 
        match={mockMatch} 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    )

    const closeButton = screen.getByRole('button', { name: 'Close' })
    expect(closeButton).toHaveClass('min-h-[48px]')
  })

  it('returns null when match is null', () => {
    const { container } = render(
      <MatchDetailDialog 
        match={null} 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    )

    expect(container.firstChild).toBeNull()
  })
})