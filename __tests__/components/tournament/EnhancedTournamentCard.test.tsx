/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EnhancedTournamentCard } from '../../../components/tournament/EnhancedTournamentCard';
import { Tournament } from '../../../lib/types';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock temporal filtering utility
jest.mock('../../../utils/temporal-filtering', () => ({
  calculateTournamentTemporalStatus: jest.fn(() => ({
    status: 'active',
    daysFromNow: 0,
    displayText: 'Active Now',
    priority: 1
  }))
}));

const mockTournament: Tournament = {
  code: 'TEST001',
  name: 'Test Tournament',
  countryCode: 'BR',
  startDate: '2025-08-01',
  endDate: '2025-08-03',
  gender: 'Men',
  type: 'Elite'
};

describe('EnhancedTournamentCard', () => {
  it('renders tournament card with basic information', () => {
    render(
      <EnhancedTournamentCard 
        tournament={mockTournament}
        variant="active"
        showTemporalStatus={false}
      />
    );

    expect(screen.getByText('Test Tournament')).toBeInTheDocument();
    expect(screen.getByText('BR')).toBeInTheDocument();
    expect(screen.getByText('Men Elite')).toBeInTheDocument();
  });

  it('shows temporal status when enabled', () => {
    render(
      <EnhancedTournamentCard 
        tournament={mockTournament}
        variant="active"
        showTemporalStatus={true}
      />
    );

    expect(screen.getByText('Active Now')).toBeInTheDocument();
  });

  it('applies correct styling for active variant', () => {
    const { container } = render(
      <EnhancedTournamentCard 
        tournament={mockTournament}
        variant="active"
      />
    );

    const card = container.querySelector('.tournament-card');
    expect(card).toHaveClass('border-l-destructive');
  });

  it('applies correct styling for upcoming variant', () => {
    const { container } = render(
      <EnhancedTournamentCard 
        tournament={mockTournament}
        variant="upcoming"
      />
    );

    const card = container.querySelector('.tournament-card');
    expect(card).toHaveClass('border-l-blue-500');
  });

  it('applies correct styling for past variant', () => {
    const { container } = render(
      <EnhancedTournamentCard 
        tournament={mockTournament}
        variant="past"
      />
    );

    const card = container.querySelector('.tournament-card');
    expect(card).toHaveClass('border-l-muted-foreground');
  });

  it('shows action buttons when enabled', () => {
    render(
      <EnhancedTournamentCard 
        tournament={mockTournament}
        variant="active"
        showActions={true}
      />
    );

    expect(screen.getByText('View Details')).toBeInTheDocument();
    expect(screen.getByText('Watch Live')).toBeInTheDocument();
  });

  it('hides action buttons when disabled', () => {
    render(
      <EnhancedTournamentCard 
        tournament={mockTournament}
        variant="upcoming"
        showActions={false}
      />
    );

    expect(screen.queryByText('View Details')).not.toBeInTheDocument();
  });

  it('shows priority indicator for active tournaments', () => {
    const { container } = render(
      <EnhancedTournamentCard 
        tournament={mockTournament}
        variant="active"
        showTemporalStatus={true}
      />
    );

    const indicator = container.querySelector('.animate-pulse');
    expect(indicator).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    render(
      <EnhancedTournamentCard 
        tournament={mockTournament}
        variant="active"
      />
    );

    // Should format dates to readable format
    expect(screen.getByText(/Aug 1, 2025 - Aug 3, 2025/)).toBeInTheDocument();
  });

  it('displays tournament code', () => {
    render(
      <EnhancedTournamentCard 
        tournament={mockTournament}
        variant="active"
      />
    );

    expect(screen.getByText('TEST001')).toBeInTheDocument();
  });
});