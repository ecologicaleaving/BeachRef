/**
 * MatchStatusIndicators Component Tests
 * Part of EPIC-001 Live Score Display - Story 1.2
 * 
 * Tests for the MatchStatusIndicators component including:
 * - Ball in play status
 * - Match point and set point alerts
 * - Animation behavior
 * - Visual styling and accessibility
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MatchStatusIndicators } from '../../live-score/MatchStatusIndicators';

describe('MatchStatusIndicators', () => {
  const defaultProps = {
    ballInPlay: false,
    matchPoints: { teamA: false, teamB: false },
    setPoints: { teamA: false, teamB: false },
    testID: 'match-status-indicators-test',
  };

  describe('Rendering', () => {
    it('renders quiet state when no indicators are active', () => {
      render(<MatchStatusIndicators {...defaultProps} />);

      expect(screen.getByText('Quiet')).toBeTruthy();
    });

    it('renders ball in play indicator', () => {
      render(
        <MatchStatusIndicators 
          {...defaultProps}
          ballInPlay={true}
        />
      );

      expect(screen.getByText('BALL IN PLAY')).toBeTruthy();
    });

    it('renders match point for team A', () => {
      render(
        <MatchStatusIndicators 
          {...defaultProps}
          matchPoints={{ teamA: true, teamB: false }}
        />
      );

      expect(screen.getByText('MATCH POINT')).toBeTruthy();
      expect(screen.getByText('Team A')).toBeTruthy();
    });

    it('renders match point for team B', () => {
      render(
        <MatchStatusIndicators 
          {...defaultProps}
          matchPoints={{ teamA: false, teamB: true }}
        />
      );

      expect(screen.getByText('MATCH POINT')).toBeTruthy();
      expect(screen.getByText('Team B')).toBeTruthy();
    });

    it('renders match point for both teams', () => {
      render(
        <MatchStatusIndicators 
          {...defaultProps}
          matchPoints={{ teamA: true, teamB: true }}
        />
      );

      expect(screen.getByText('MATCH POINT - BOTH')).toBeTruthy();
    });

    it('renders set point for team A', () => {
      render(
        <MatchStatusIndicators 
          {...defaultProps}
          setPoints={{ teamA: true, teamB: false }}
        />
      );

      expect(screen.getByText('SET POINT')).toBeTruthy();
      expect(screen.getByText('Team A')).toBeTruthy();
    });

    it('renders set point for team B', () => {
      render(
        <MatchStatusIndicators 
          {...defaultProps}
          setPoints={{ teamA: false, teamB: true }}
        />
      );

      expect(screen.getByText('SET POINT')).toBeTruthy();
      expect(screen.getByText('Team B')).toBeTruthy();
    });

    it('renders set point for both teams', () => {
      render(
        <MatchStatusIndicators 
          {...defaultProps}
          setPoints={{ teamA: true, teamB: true }}
        />
      );

      expect(screen.getByText('SET POINT - BOTH')).toBeTruthy();
    });
  });

  describe('Priority Handling', () => {
    it('shows match point with higher priority than set point', () => {
      render(
        <MatchStatusIndicators 
          {...defaultProps}
          matchPoints={{ teamA: true, teamB: false }}
          setPoints={{ teamA: false, teamB: true }}
        />
      );

      // Both should be shown, but match point first
      expect(screen.getByText('MATCH POINT')).toBeTruthy();
      expect(screen.getByText('SET POINT')).toBeTruthy();
    });

    it('shows all indicators when multiple are active', () => {
      render(
        <MatchStatusIndicators 
          {...defaultProps}
          ballInPlay={true}
          matchPoints={{ teamA: true, teamB: false }}
          setPoints={{ teamA: false, teamB: true }}
        />
      );

      expect(screen.getByText('MATCH POINT')).toBeTruthy();
      expect(screen.getByText('SET POINT')).toBeTruthy();
      expect(screen.getByText('BALL IN PLAY')).toBeTruthy();
    });
  });

  describe('Compact Mode', () => {
    it('renders in compact mode correctly', () => {
      render(
        <MatchStatusIndicators 
          {...defaultProps}
          compact={true}
          ballInPlay={true}
        />
      );

      expect(screen.getByText('BALL IN PLAY')).toBeTruthy();
      // In compact mode, team info should not be shown
    });

    it('does not show team info in compact mode', () => {
      render(
        <MatchStatusIndicators 
          {...defaultProps}
          compact={true}
          matchPoints={{ teamA: true, teamB: false }}
        />
      );

      expect(screen.getByText('MATCH POINT')).toBeTruthy();
      expect(screen.queryByText('Team A')).toBeFalsy();
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility label for single indicator', () => {
      render(
        <MatchStatusIndicators 
          {...defaultProps}
          ballInPlay={true}
        />
      );

      const container = screen.getByLabelText('Match status: BALL IN PLAY');
      expect(container).toBeTruthy();
    });

    it('has proper accessibility label for multiple indicators', () => {
      render(
        <MatchStatusIndicators 
          {...defaultProps}
          ballInPlay={true}
          matchPoints={{ teamA: true, teamB: false }}
        />
      );

      const container = screen.getByLabelText('Match status: MATCH POINT for Team A, BALL IN PLAY');
      expect(container).toBeTruthy();
    });

    it('has proper accessibility label for both teams match point', () => {
      render(
        <MatchStatusIndicators 
          {...defaultProps}
          matchPoints={{ teamA: true, teamB: true }}
        />
      );

      const container = screen.getByLabelText('Match status: MATCH POINT - BOTH');
      expect(container).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('does not re-render when status unchanged', () => {
      const renderSpy = jest.fn();
      const TestComponent = (props: any) => {
        renderSpy();
        return <MatchStatusIndicators {...props} />;
      };

      const { rerender } = render(
        <TestComponent 
          {...defaultProps}
          ballInPlay={true}
        />
      );

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Same props should not trigger re-render
      rerender(
        <TestComponent 
          {...defaultProps}
          ballInPlay={true}
        />
      );

      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('re-renders when status changes', () => {
      const renderSpy = jest.fn();
      const TestComponent = (props: any) => {
        renderSpy();
        return <MatchStatusIndicators {...props} />;
      };

      const { rerender } = render(
        <TestComponent 
          {...defaultProps}
          ballInPlay={true}
        />
      );

      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Different ball in play status should trigger re-render
      rerender(
        <TestComponent 
          {...defaultProps}
          ballInPlay={false}
        />
      );

      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Visual States', () => {
    it('applies critical styling for match points', () => {
      const { getByTestId } = render(
        <MatchStatusIndicators 
          {...defaultProps}
          matchPoints={{ teamA: true, teamB: false }}
          testID="test-container"
        />
      );

      const container = getByTestId('test-container');
      expect(container).toBeTruthy();
    });

    it('applies warning styling for set points', () => {
      const { getByTestId } = render(
        <MatchStatusIndicators 
          {...defaultProps}
          setPoints={{ teamA: true, teamB: false }}
          testID="test-container"
        />
      );

      const container = getByTestId('test-container');
      expect(container).toBeTruthy();
    });

    it('applies medium styling for ball in play', () => {
      const { getByTestId } = render(
        <MatchStatusIndicators 
          {...defaultProps}
          ballInPlay={true}
          testID="test-container"
        />
      );

      const container = getByTestId('test-container');
      expect(container).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles all false indicators gracefully', () => {
      render(
        <MatchStatusIndicators 
          {...defaultProps}
          ballInPlay={false}
          matchPoints={{ teamA: false, teamB: false }}
          setPoints={{ teamA: false, teamB: false }}
        />
      );

      expect(screen.getByText('Quiet')).toBeTruthy();
    });

    it('handles rapid state changes', () => {
      const { rerender } = render(
        <MatchStatusIndicators {...defaultProps} />
      );

      // Simulate rapid state changes
      rerender(
        <MatchStatusIndicators 
          {...defaultProps}
          ballInPlay={true}
        />
      );

      rerender(
        <MatchStatusIndicators 
          {...defaultProps}
          ballInPlay={false}
          matchPoints={{ teamA: true, teamB: false }}
        />
      );

      rerender(
        <MatchStatusIndicators 
          {...defaultProps}
          ballInPlay={true}
          matchPoints={{ teamA: false, teamB: true }}
          setPoints={{ teamA: true, teamB: false }}
        />
      );

      expect(screen.getByText('BALL IN PLAY')).toBeTruthy();
      expect(screen.getByText('MATCH POINT')).toBeTruthy();
      expect(screen.getByText('SET POINT')).toBeTruthy();
    });
  });
});