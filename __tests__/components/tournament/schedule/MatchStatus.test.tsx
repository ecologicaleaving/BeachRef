/**
 * Tests for MatchStatus Component
 * 
 * Tests the match status indicator component with different status types,
 * accessibility features, and visual consistency.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import MatchStatus from '@/components/tournament/schedule/MatchStatus'

describe('MatchStatus', () => {
  it('renders scheduled status correctly', () => {
    render(<MatchStatus status="scheduled" />)
    
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
    expect(screen.getByLabelText('Match is scheduled')).toBeInTheDocument()
  })

  it('renders live status correctly', () => {
    render(<MatchStatus status="live" />)
    
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.getByLabelText('Match is currently live')).toBeInTheDocument()
  })

  it('renders completed status correctly', () => {
    render(<MatchStatus status="completed" />)
    
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByLabelText('Match has been completed')).toBeInTheDocument()
  })

  it('renders cancelled status correctly', () => {
    render(<MatchStatus status="cancelled" />)
    
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    expect(screen.getByLabelText('Match has been cancelled')).toBeInTheDocument()
  })

  it('applies custom className correctly', () => {
    const { container } = render(<MatchStatus status="scheduled" className="custom-class" />)
    
    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('includes proper ARIA attributes for accessibility', () => {
    render(<MatchStatus status="live" />)
    
    const badge = screen.getByLabelText('Match is currently live')
    expect(badge).toHaveAttribute('aria-label', 'Match is currently live')
  })

  it('renders icon for each status type', () => {
    const statuses = ['scheduled', 'live', 'completed', 'cancelled'] as const
    
    statuses.forEach(status => {
      const { container } = render(<MatchStatus status={status} />)
      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })
})