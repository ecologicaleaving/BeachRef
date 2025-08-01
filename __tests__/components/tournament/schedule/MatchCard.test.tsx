/**
 * Tests for MatchCard Component
 * 
 * Tests the match card display component with team information,
 * court details, timing, and status integration.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import MatchCard from '@/components/tournament/schedule/MatchCard'
import { MockBeachMatch } from '@/lib/mock-schedule-data'

const mockMatch: MockBeachMatch = {
  noInTournament: "M001",
  localDate: "2025-08-15",
  localTime: "09:00",
  teamAName: "Smith/Jones",
  teamBName: "Wilson/Davis",
  court: "Court 1",
  status: "scheduled"
}

describe('MatchCard', () => {
  it('renders match information correctly', () => {
    render(<MatchCard match={mockMatch} />)
    
    expect(screen.getByText('Smith/Jones')).toBeInTheDocument()
    expect(screen.getByText('Wilson/Davis')).toBeInTheDocument()
    expect(screen.getByText('vs')).toBeInTheDocument()
    expect(screen.getByText('09:00')).toBeInTheDocument()
    expect(screen.getByText('Court 1')).toBeInTheDocument()
    expect(screen.getByText('M001')).toBeInTheDocument()
  })

  it('displays status badge correctly', () => {
    render(<MatchCard match={mockMatch} />)
    
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
  })

  it('includes proper ARIA label for accessibility', () => {
    render(<MatchCard match={mockMatch} />)
    
    const card = screen.getByRole('article')
    expect(card).toHaveAttribute('aria-label', 'Match M001: Smith/Jones vs Wilson/Davis')
  })

  it('displays clock and location icons', () => {
    const { container } = render(<MatchCard match={mockMatch} />)
    
    const icons = container.querySelectorAll('svg[aria-hidden="true"]')
    expect(icons.length).toBeGreaterThanOrEqual(2) // Clock and MapPin icons
  })

  it('applies hover effects with transition classes', () => {
    const { container } = render(<MatchCard match={mockMatch} />)
    
    const card = container.querySelector('.hover\\:shadow-md')
    expect(card).toBeInTheDocument()
    expect(card).toHaveClass('transition-shadow')
  })

  it('handles long team names with truncation', () => {
    const longNameMatch: MockBeachMatch = {
      ...mockMatch,
      teamAName: "Very Long Team Name That Should Be Truncated/Partner",
      teamBName: "Another Very Long Team Name/Another Partner"
    }
    
    render(<MatchCard match={longNameMatch} />)
    
    const teamElements = screen.getAllByText(/Very Long Team Name/)
    teamElements.forEach(element => {
      expect(element).toHaveClass('truncate')
    })
  })

  it('applies custom className correctly', () => {
    const { container } = render(<MatchCard match={mockMatch} className="custom-class" />)
    
    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('renders different match statuses correctly', () => {
    const statuses = ['scheduled', 'live', 'completed', 'cancelled'] as const
    
    statuses.forEach(status => {
      const matchWithStatus = { ...mockMatch, status }
      render(<MatchCard match={matchWithStatus} />)
      
      // Status should be rendered in the MatchStatus component
      expect(screen.getByText(status.charAt(0).toUpperCase() + status.slice(1))).toBeInTheDocument()
    })
  })
})