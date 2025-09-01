/**
 * LiveScoreCard Component Tests
 * Part of EPIC-001 Live Score Display - Story 1.2
 * 
 * Tests for the main LiveScoreCard component including:
 * - Rendering with live data vs fallback data
 * - Loading and error states
 * - Match status handling
 * - Performance and accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { LiveScoreCard } from '../../live-score/LiveScoreCard';
import { BeachLive, BeachMatchStatus } from '../../../types/beach-live';
import { BeachMatch } from '../../../types/match';

// Mock data for testing
const mockBeachLive: BeachLive = {
  version: 1,
  pollDelay: 5000,
  isBallInPlay: true,
  isMatchPointTeamA: false,
  isMatchPointTeamB: false,
  isSetPointTeamA: true,
  isSetPointTeamB: false,
  noServingTeam: 1,
  noServingPlayer: 1,
  noTeamAtLeft: 1,
  noTeamAtRight: 2,
  match: {
    no: 42,
    noInTournament: 1,
    status: BeachMatchStatus.IN_PROGRESS,
    dateTime: '2025-08-25T14:30:00Z',
    court: {
      no: 1,
      name: 'Center Court',
      surface: 'Sand',
    },
    round: {
      no: 1,
      name: 'Pool A',
      phase: 'Pool',
      type: 'Pool' as any,
    },
    durationMinutes: 45,
  },
  sets: [
    {
      no: 1,
      pointsTeamA: 21,
      pointsTeamB: 19,
      status: 'Finished' as any,
      durationMinutes: 25,
    },
    {
      no: 2,
      pointsTeamA: 18,
      pointsTeamB: 21,
      status: 'InProgress' as any,
      durationMinutes: 20,
    },
  ],
  teamA: {
    no: 1,
    name: 'Team USA',
    federationCode: 'USA',
    players: [
      {
        no: 1,
        name: 'Player A1',
        position: 'Left' as any,
        isServing: true,
      },
      {
        no: 2,
        name: 'Player A2',
        position: 'Right' as any,
        isServing: false,
      },
    ],
    matchPoints: 1,
    isServing: true,
    timeoutsRemaining: 1,
  },
  teamB: {
    no: 2,
    name: 'Team Brazil',
    federationCode: 'BRA',
    players: [
      {
        no: 3,
        name: 'Player B1',
        position: 'Left' as any,
        isServing: false,
      },
      {
        no: 4,
        name: 'Player B2',
        position: 'Right' as any,
        isServing: false,
      },
    ],
    matchPoints: 1,
    isServing: false,
    timeoutsRemaining: 1,
  },
  tournament: {
    no: 1,
    name: 'Test Tournament',
    code: 'TEST2025',
    city: 'Test City',
    country: 'Test Country',
    federation: 'FIVB',
  },
};

const mockFallbackMatch: BeachMatch = {
  No: '42',
  NoInTournament: '1',
  LocalDate: '2025-08-25',
  LocalTime: '14:30',
  TeamAName: 'Team USA Static',
  TeamBName: 'Team Brazil Static',
  TeamACountryCode: 'USA',
  TeamBCountryCode: 'BRA',
  TeamAFederationCode: 'USA',
  TeamBFederationCode: 'BRA',
  Court: '1',
  MatchPointsA: '1',
  MatchPointsB: '1',
  PointsTeamASet1: '21',
  PointsTeamBSet1: '19',
  PointsTeamASet2: '18',
  PointsTeamBSet2: '21',
  Status: 'InProgress',
  Round: 'Pool A',
  Version: '1.0',
};

describe('LiveScoreCard', () => {
  const defaultProps = {
    matchNo: 42,
    testID: 'live-score-card-test',
  };

  describe('Rendering', () => {
    it('renders with live data correctly', () => {
      render(
        <LiveScoreCard 
          {...defaultProps}
          beachLive={mockBeachLive}
        />
      );

      expect(screen.getByText('Match 42')).toBeTruthy();
      expect(screen.getByText('LIVE')).toBeTruthy();
      expect(screen.getByText('Team USA')).toBeTruthy();
      expect(screen.getByText('Team Brazil')).toBeTruthy();
      expect(screen.getByText('18')).toBeTruthy();
      expect(screen.getByText('21')).toBeTruthy();
      expect(screen.getByText('Live Data')).toBeTruthy();
    });

    it('renders with fallback data when no live data', () => {
      render(
        <LiveScoreCard 
          {...defaultProps}
          fallbackMatch={mockFallbackMatch}
        />
      );

      expect(screen.getByText('Match 42')).toBeTruthy();
      expect(screen.getByText('Team USA Static')).toBeTruthy();
      expect(screen.getByText('Team Brazil Static')).toBeTruthy();
      expect(screen.getByText('Static')).toBeTruthy();
    });

    it('renders loading state correctly', () => {
      render(
        <LiveScoreCard 
          {...defaultProps}
          loading={true}
        />
      );

      expect(screen.getByText('Loading...')).toBeTruthy();
      expect(screen.getByText('Loading live scores...')).toBeTruthy();
    });

    it('renders error state correctly', () => {
      const mockError = new Error('Test error');
      
      render(
        <LiveScoreCard 
          {...defaultProps}
          error={mockError}
        />
      );

      expect(screen.getByText('Error')).toBeTruthy();
      expect(screen.getByText('Unable to load match data')).toBeTruthy();
    });

    it('renders error state with retry button when onRefresh provided', () => {
      const mockError = new Error('Test error');
      const mockOnRefresh = jest.fn();
      
      render(
        <LiveScoreCard 
          {...defaultProps}
          error={mockError}
          onRefresh={mockOnRefresh}
        />
      );

      const retryButton = screen.getByText('Tap to retry');
      expect(retryButton).toBeTruthy();
      
      fireEvent.press(retryButton);
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Match Status Display', () => {
    it('shows correct status for in-progress match', () => {
      render(
        <LiveScoreCard 
          {...defaultProps}
          beachLive={mockBeachLive}
        />
      );

      expect(screen.getByText('LIVE')).toBeTruthy();
    });

    it('shows correct status for completed match', () => {
      const completedMatch = {
        ...mockBeachLive,
        match: {
          ...mockBeachLive.match,
          status: BeachMatchStatus.FINISHED,
        },
      };

      render(
        <LiveScoreCard 
          {...defaultProps}
          beachLive={completedMatch}
        />
      );

      expect(screen.getByText('FINISHED')).toBeTruthy();
    });

    it('shows correct status for scheduled match', () => {
      const scheduledMatch = {
        ...mockBeachLive,
        match: {
          ...mockBeachLive.match,
          status: BeachMatchStatus.SCHEDULED,
        },
      };

      render(
        <LiveScoreCard 
          {...defaultProps}
          beachLive={scheduledMatch}
        />
      );

      expect(screen.getByText('SCHEDULED')).toBeTruthy();
    });

    it('shows correct status for cancelled match', () => {
      const cancelledMatch = {
        ...mockBeachLive,
        match: {
          ...mockBeachLive.match,
          status: BeachMatchStatus.CANCELLED,
        },
      };

      render(
        <LiveScoreCard 
          {...defaultProps}
          beachLive={cancelledMatch}
        />
      );

      expect(screen.getByText('CANCELLED')).toBeTruthy();
    });
  });

  describe('Score Display', () => {
    it('displays current set scores correctly', () => {
      render(
        <LiveScoreCard 
          {...defaultProps}
          beachLive={mockBeachLive}
        />
      );

      // Should show current set scores (set 2: 18-21)
      expect(screen.getByText('18')).toBeTruthy();
      expect(screen.getByText('21')).toBeTruthy();
    });

    it('displays fallback scores correctly', () => {
      render(
        <LiveScoreCard 
          {...defaultProps}
          fallbackMatch={mockFallbackMatch}
        />
      );

      // Should show most recent set scores
      expect(screen.getByText('18')).toBeTruthy();
      expect(screen.getByText('21')).toBeTruthy();
    });

    it('handles zero scores correctly', () => {
      const zeroScoreMatch = {
        ...mockBeachLive,
        sets: [
          {
            no: 1,
            pointsTeamA: 0,
            pointsTeamB: 0,
            status: 'InProgress' as any,
          },
        ],
      };

      render(
        <LiveScoreCard 
          {...defaultProps}
          beachLive={zeroScoreMatch}
        />
      );

      const scores = screen.getAllByText('0');
      expect(scores).toHaveLength(2); // Both teams have 0
    });
  });

  describe('Match Details', () => {
    it('displays match time correctly', () => {
      render(
        <LiveScoreCard 
          {...defaultProps}
          beachLive={mockBeachLive}
        />
      );

      expect(screen.getByText('02:30 PM')).toBeTruthy(); // UTC time converted to local
    });

    it('displays court information', () => {
      render(
        <LiveScoreCard 
          {...defaultProps}
          beachLive={mockBeachLive}
        />
      );

      expect(screen.getByText('Court 1')).toBeTruthy();
    });

    it('displays round information', () => {
      render(
        <LiveScoreCard 
          {...defaultProps}
          beachLive={mockBeachLive}
        />
      );

      expect(screen.getByText('Pool A')).toBeTruthy();
    });

    it('handles missing match details gracefully', () => {
      const incompleteMatch = {
        ...mockBeachLive,
        match: {
          ...mockBeachLive.match,
          court: undefined,
          round: undefined,
        },
      };

      render(
        <LiveScoreCard 
          {...defaultProps}
          beachLive={incompleteMatch}
        />
      );

      expect(screen.getByText('Court TBD')).toBeTruthy();
      expect(screen.getByText('Round TBD')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility label', () => {
      render(
        <LiveScoreCard 
          {...defaultProps}
          beachLive={mockBeachLive}
        />
      );

      const card = screen.getByLabelText(/Match 42: Team USA 18 - 21 Team Brazil, Status: LIVE/);
      expect(card).toBeTruthy();
    });

    it('has proper accessibility role', () => {
      render(
        <LiveScoreCard 
          {...defaultProps}
          beachLive={mockBeachLive}
        />
      );

      const card = screen.getByRole('button');
      expect(card).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('does not re-render when version is unchanged', () => {
      const renderSpy = jest.fn();
      const TestComponent = (props: any) => {
        renderSpy();
        return <LiveScoreCard {...props} />;
      };

      const { rerender } = render(
        <TestComponent {...defaultProps} beachLive={mockBeachLive} />
      );

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Same version should not trigger re-render
      rerender(
        <TestComponent {...defaultProps} beachLive={mockBeachLive} />
      );

      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('re-renders when version changes', () => {
      const renderSpy = jest.fn();
      const TestComponent = (props: any) => {
        renderSpy();
        return <LiveScoreCard {...props} />;
      };

      const { rerender } = render(
        <TestComponent {...defaultProps} beachLive={mockBeachLive} />
      );

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Different version should trigger re-render
      const updatedBeachLive = { ...mockBeachLive, version: 2 };
      rerender(
        <TestComponent {...defaultProps} beachLive={updatedBeachLive} />
      );

      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('handles missing team names gracefully', () => {
      const incompleteTeams = {
        ...mockBeachLive,
        teamA: { ...mockBeachLive.teamA, name: '' },
        teamB: { ...mockBeachLive.teamB, name: '' },
      };

      render(
        <LiveScoreCard 
          {...defaultProps}
          beachLive={incompleteTeams}
        />
      );

      expect(screen.getByText('Team A')).toBeTruthy();
      expect(screen.getByText('Team B')).toBeTruthy();
    });

    it('handles empty sets array', () => {
      const noSets = {
        ...mockBeachLive,
        sets: [],
      };

      render(
        <LiveScoreCard 
          {...defaultProps}
          beachLive={noSets}
        />
      );

      const scores = screen.getAllByText('0');
      expect(scores).toHaveLength(2);
    });

    it('handles null/undefined beachLive with fallback', () => {
      render(
        <LiveScoreCard 
          {...defaultProps}
          beachLive={undefined}
          fallbackMatch={mockFallbackMatch}
        />
      );

      expect(screen.getByText('Team USA Static')).toBeTruthy();
      expect(screen.getByText('Team Brazil Static')).toBeTruthy();
      expect(screen.getByText('Static')).toBeTruthy();
    });
  });
});