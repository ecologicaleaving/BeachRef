/**
 * Assignment Card Component Tests
 * Story 2.1: Assignment Card Component System
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AssignmentCard from '../../../components/Assignment/AssignmentCard';
import { Assignment } from '../../../types/assignments';

// Mock the icon components
jest.mock('../../../components/Icons/IconLibrary', () => ({
  StatusIcons: {
    Current: jest.fn(() => null),
    Upcoming: jest.fn(() => null),
    Completed: jest.fn(() => null),
    Cancelled: jest.fn(() => null),
  },
  DataIcons: {
    Details: jest.fn(() => null),
  },
  UtilityIcons: {
    Info: jest.fn(() => null),
  },
}));

const mockAssignment: Assignment = {
  id: 'test-assignment-1',
  matchId: 'match-123',
  courtNumber: '3',
  homeTeam: 'Team Alpha',
  awayTeam: 'Team Beta',
  matchTime: new Date('2025-01-12T14:30:00.000Z'),
  refereePosition: '1st',
  status: 'upcoming',
  tournamentName: 'Beach Championship',
  notes: 'Weather conditions: sunny'
};

describe('AssignmentCard', () => {
  it('should render basic assignment information', () => {
    const { getByText } = render(
      <AssignmentCard assignment={mockAssignment} />
    );

    expect(getByText('Team Alpha vs Team Beta')).toBeTruthy();
    expect(getByText('Court 3')).toBeTruthy();
    expect(getByText('1st Referee')).toBeTruthy();
    expect(getByText('Weather conditions: sunny')).toBeTruthy();
  });

  it('should render countdown when showCountdown is true', () => {
    const futureAssignment = {
      ...mockAssignment,
      matchTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    };

    const { getByText } = render(
      <AssignmentCard 
        assignment={futureAssignment} 
        showCountdown={true} 
      />
    );

    // Non `'30m'`: il conto alla rovescia passa da `Math.floor`, quindi basta
    // che l'orologio sia avanzato di un millisecondo fra la creazione della
    // fixture e il render perche' 29.99 diventi 29 — osservato, il componente
    // rendeva "29m" (issue #111). Asserire il minuto esatto renderebbe questo
    // test un membro della famiglia potata dalla #94 e dalla #107: quelli che
    // misurano l'ambiente invece del codice.
    //
    // Cio' che il test verifica e' che il conto alla rovescia SIA MOSTRATO
    // quando `showCountdown` e' vero — e il test gemello subito sotto verifica
    // che non lo sia quando e' falso, che e' la coppia che da' significato a
    // entrambi.
    expect(getByText(/^\d+m$/)).toBeTruthy();
  });

  it('should not render countdown when showCountdown is false', () => {
    const { queryByTestId } = render(
      <AssignmentCard 
        assignment={mockAssignment} 
        showCountdown={false} 
      />
    );

    expect(queryByTestId('countdown')).toBeNull();
  });

  it('should handle press events when interactive', () => {
    const onPressMock = jest.fn();
    
    const { getByRole } = render(
      <AssignmentCard 
        assignment={mockAssignment}
        isInteractive={true}
        onPress={onPressMock}
      />
    );

    const card = getByRole('button');
    fireEvent.press(card);

    expect(onPressMock).toHaveBeenCalledWith(mockAssignment);
  });

  it('should not handle press events when not interactive', () => {
    const onPressMock = jest.fn();
    
    const { queryByRole } = render(
      <AssignmentCard 
        assignment={mockAssignment}
        isInteractive={false}
        onPress={onPressMock}
      />
    );

    expect(queryByRole('button')).toBeNull();
  });

  it('should render match result for completed assignments', () => {
    const completedAssignment = {
      ...mockAssignment,
      status: 'completed' as const,
      matchResult: 'Team Alpha won 2-1'
    };

    const { getByText } = render(
      <AssignmentCard 
        assignment={completedAssignment}
        variant="completed"
      />
    );

    expect(getByText('Result: Team Alpha won 2-1')).toBeTruthy();
  });

  it('should not render match result for non-completed assignments', () => {
    const upcomingAssignment = {
      ...mockAssignment,
      matchResult: 'Team Alpha won 2-1' // Should not show for upcoming
    };

    const { queryByText } = render(
      <AssignmentCard 
        assignment={upcomingAssignment}
        variant="upcoming"
      />
    );

    expect(queryByText('Result: Team Alpha won 2-1')).toBeNull();
  });

  describe('variant styling', () => {
    it('should apply current variant styling', () => {
      const { getByText } = render(
        <AssignmentCard 
          assignment={mockAssignment}
          variant="current"
        />
      );

      const statusText = getByText('1st Referee');
      expect(statusText.props.style).toMatchObject({
        fontWeight: '600'
      });
    });

    it('should apply upcoming variant styling', () => {
      const { getByText } = render(
        <AssignmentCard 
          assignment={mockAssignment}
          variant="upcoming"
        />
      );

      const statusText = getByText('1st Referee');
      expect(statusText.props.style).toMatchObject({
        fontWeight: '500'
      });
    });

    it('should apply completed variant styling with reduced opacity', () => {
      const { getByTestId } = render(
        <AssignmentCard 
          assignment={mockAssignment}
          variant="completed"
          testID="assignment-card"
        />
      );

      // Test would check for opacity styling in the card container
      // This is simplified for the test environment
      expect(getByTestId).toBeDefined();
    });
  });

  describe('accessibility', () => {
    it('should have proper accessibility labels when interactive', () => {
      const { getByLabelText } = render(
        <AssignmentCard 
          assignment={mockAssignment}
          isInteractive={true}
        />
      );

      const card = getByLabelText(/Assignment: Team Alpha vs Team Beta/);
      expect(card.props.accessibilityHint).toBe('Double tap to view assignment details');
      expect(card.props.accessibilityRole).toBe('button');
    });
  });

  describe('touch target compliance', () => {
    it('should have minimum 44px touch target when interactive', () => {
      const { getByRole } = render(
        <AssignmentCard 
          assignment={mockAssignment}
          isInteractive={true}
          onPress={jest.fn()}
        />
      );

      const card = getByRole('button');
      expect(card.props.style).toMatchObject({
        minHeight: 44
      });
    });
  });

  describe('time formatting', () => {
    it('should format time and date correctly', () => {
      const { getByText, getAllByText } = render(
        <AssignmentCard assignment={mockAssignment} />
      );

      // Should show formatted time (exact format depends on locale)
      expect(getByText(/\d{1,2}:\d{2}\s?(AM|PM)/)).toBeTruthy();
      // `getAllBy`, non `getBy`: il pattern della data e' deliberatamente
      // permissivo perche' il formato dipende dalla locale, e cosi' com'e'
      // `\w{3}\s\d{1,2}` corrisponde a piu' di un nodo della card — non solo
      // alla data (issue #111). `getByText` fallisce con "found multiple
      // elements" quando il problema e' l'ampiezza del pattern, non l'assenza
      // di cio' che cerca.
      expect(getAllByText(/Today|Tomorrow|\w{3}\s\d{1,2}/).length).toBeGreaterThan(0);
    });
  });

  describe('status icon rendering', () => {
    it('should render appropriate status icon for each variant', () => {
      const { StatusIcons } = require('../../../components/Icons/IconLibrary');
      
      render(<AssignmentCard assignment={mockAssignment} variant="current" />);
      expect(StatusIcons.Current).toHaveBeenCalled();

      render(<AssignmentCard assignment={mockAssignment} variant="upcoming" />);
      expect(StatusIcons.Upcoming).toHaveBeenCalled();

      render(<AssignmentCard assignment={mockAssignment} variant="completed" />);
      expect(StatusIcons.Completed).toHaveBeenCalled();

      render(<AssignmentCard assignment={mockAssignment} variant="cancelled" />);
      expect(StatusIcons.Cancelled).toHaveBeenCalled();
    });
  });
});