import React from 'react'
import { render, screen } from '@testing-library/react'
import { useSearchParams } from 'next/navigation'
import TournamentBreadcrumb from '@/components/tournament/TournamentBreadcrumb'
import { TournamentDetail } from '@/lib/types'

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}))

const mockSearchParams = {
  get: jest.fn(),
}

const mockTournament: TournamentDetail = {
  code: 'BRA2024-001',
  name: 'Rio de Janeiro Open',
  countryCode: 'BRA',
  startDate: '2024-05-15',
  endDate: '2024-05-18',
  gender: 'Mixed',
  type: '4-Star',
  status: 'upcoming',
}

describe('TournamentBreadcrumb', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
  })

  it('renders basic breadcrumb with tournament name', () => {
    mockSearchParams.get.mockReturnValue(null)
    
    render(<TournamentBreadcrumb tournament={mockTournament} />)
    
    expect(screen.getByText('Tournaments 2025')).toBeInTheDocument()
    expect(screen.getByText('Rio de Janeiro Open')).toBeInTheDocument()
  })

  it('displays tournament count when provided', () => {
    mockSearchParams.get.mockReturnValue('2024')
    
    render(<TournamentBreadcrumb tournament={mockTournament} totalCount={150} />)
    
    expect(screen.getByText('Tournaments 2024 (150)')).toBeInTheDocument()
  })

  it('displays current position when provided', () => {
    mockSearchParams.get.mockReturnValue(null)
    
    render(
      <TournamentBreadcrumb 
        tournament={mockTournament} 
        totalCount={100} 
        currentPosition={25} 
      />
    )
    
    expect(screen.getByText('Rio de Janeiro Open (25 of 100)')).toBeInTheDocument()
  })

  it('preserves year from search params in context', () => {
    mockSearchParams.get.mockImplementation((key) => {
      if (key === 'year') return '2023'
      return null
    })
    
    render(<TournamentBreadcrumb tournament={mockTournament} totalCount={75} />)
    
    expect(screen.getByText('Tournaments 2023 (75)')).toBeInTheDocument()
  })

  it('generates correct return URL with search parameters', () => {
    mockSearchParams.get.mockImplementation((key) => {
      switch (key) {
        case 'year': return '2024'
        case 'page': return '2'
        case 'gender': return 'women'
        default: return null
      }
    })
    
    render(<TournamentBreadcrumb tournament={mockTournament} />)
    
    const link = screen.getByRole('link', { name: /tournaments/i })
    expect(link).toHaveAttribute('href', '/?year=2024&page=2&gender=women')
  })

  it('handles missing tournament name gracefully', () => {
    mockSearchParams.get.mockReturnValue(null)
    const invalidTournament = { ...mockTournament, name: '' }
    
    render(<TournamentBreadcrumb tournament={invalidTournament} />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.getByText('Tournaments 2025')).toBeInTheDocument()
  })

  it('has responsive truncation classes', () => {
    mockSearchParams.get.mockReturnValue(null)
    
    render(<TournamentBreadcrumb tournament={mockTournament} />)
    
    const tournamentPage = screen.getByText('Rio de Janeiro Open')
    expect(tournamentPage).toHaveClass('max-w-[200px]', 'sm:max-w-[300px]', 'md:max-w-[400px]', 'truncate')
  })

  it('links have proper hover styles', () => {
    mockSearchParams.get.mockReturnValue(null)
    
    render(<TournamentBreadcrumb tournament={mockTournament} />)
    
    const link = screen.getByRole('link', { name: /tournaments/i })
    expect(link).toHaveClass('hover:text-foreground', 'transition-colors')
  })
})