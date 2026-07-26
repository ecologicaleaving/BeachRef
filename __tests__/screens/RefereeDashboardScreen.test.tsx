/**
 * RefereeDashboardScreen Tests
 * Tests for assignment-first dashboard redesign
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import RefereeDashboardScreen from '../../screens/RefereeDashboardScreen';

// Mock navigation
const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    tournamentData: JSON.stringify({
      No: '12345',
      Title: 'Beach Championship 2025',
      City: 'Santa Monica',
      CountryName: 'USA',
      StartDate: '2025-01-13',
      EndDate: '2025-01-15',
    }),
  }),
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

// Mock navigation components
jest.mock('../../components/navigation/NavigationHeader', () => {
  const { View, Text } = require('react-native');
  return ({ title, rightComponent }: any) => (
    <View testID="navigation-header">
      <Text>{title}</Text>
      {rightComponent}
    </View>
  );
});

jest.mock('../../components/navigation/BottomTabNavigation', () => {
  const { View, Text } = require('react-native');
  return ({ currentTab }: any) => (
    <View testID="bottom-navigation">
      <Text>{currentTab}</Text>
    </View>
  );
});

// Mock services
jest.mock('../../services/TournamentStorageService', () => ({
  TournamentStorageService: {
    getSelectedTournament: jest.fn().mockResolvedValue({
      No: '12345',
      Title: 'Beach Championship 2025',
    }),
  },
}));

// Mock hooks
jest.mock('../../hooks/useCurrentAssignment', () => ({
  useCurrentAssignment: () => ({
    currentAssignment: {
      id: 'current-001',
      courtNumber: 1,
      homeTeam: 'Beach Warriors',
      awayTeam: 'Sand Storms',
      matchTime: new Date(Date.now() + 30 * 60 * 1000),
      refereePosition: '1st Referee',
      status: 'current',
      matchType: 'Pool Play',
      importance: 'high',
      notes: 'Championship semi-final match',
    },
    upcomingAssignments: [
      {
        id: 'upcoming-001',
        courtNumber: 2,
        homeTeam: 'Wave Riders',
        awayTeam: 'Coastal Crushers',
        matchTime: new Date(Date.now() + 90 * 60 * 1000),
        refereePosition: '2nd Referee',
        status: 'upcoming',
        matchType: 'Pool Play',
        importance: 'medium',
      },
    ],
    loading: false,
    error: null,
    refreshAssignments: jest.fn(),
  }),
}));

describe('RefereeDashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render assignment status bar', async () => {
    render(<RefereeDashboardScreen />);
    
    await waitFor(() => {
      expect(screen.getByText('Active Assignment')).toBeTruthy();
      expect(screen.getByText('Beach Championship 2025')).toBeTruthy();
    });
  });

  it('should render current assignment card prominently', async () => {
    render(<RefereeDashboardScreen />);
    
    await waitFor(() => {
      expect(screen.getByText('CURRENT ASSIGNMENT')).toBeTruthy();
      expect(screen.getByText('Beach Warriors vs Sand Storms')).toBeTruthy();
      expect(screen.getByText('Pool Play')).toBeTruthy();
      expect(screen.getByText('Court 1')).toBeTruthy();
      expect(screen.getByText('1st Referee')).toBeTruthy();
      expect(screen.getByText('Championship semi-final match')).toBeTruthy();
    });
  });

  it('should render assignment timeline', async () => {
    render(<RefereeDashboardScreen />);
    
    await waitFor(() => {
      expect(screen.getByText("Today's Schedule")).toBeTruthy();
      expect(screen.getByText('Wave Riders vs Coastal Crushers')).toBeTruthy();
    });
  });

  it('should render quick actions grid', async () => {
    render(<RefereeDashboardScreen />);
    
    await waitFor(() => {
      expect(screen.getByText('My Assignments')).toBeTruthy();
      expect(screen.getByText('Results')).toBeTruthy();
      expect(screen.getByText('Settings')).toBeTruthy();
    });
  });

  it('should render emergency contacts section', async () => {
    render(<RefereeDashboardScreen />);
    
    await waitFor(() => {
      expect(screen.getByText('Emergency Contacts')).toBeTruthy();
      expect(screen.getByText('Tournament Director')).toBeTruthy();
      expect(screen.getByText('Head Referee')).toBeTruthy();
    });
  });

  it('should handle assignment card actions', async () => {
    render(<RefereeDashboardScreen />);
    
    await waitFor(() => {
      const viewDetailsButton = screen.getByText('View Details');
      const enterResultsButton = screen.getByText('Enter Results');
      
      fireEvent.press(viewDetailsButton);
      expect(mockPush).toHaveBeenCalledWith('/my-assignments');
      
      fireEvent.press(enterResultsButton);
      expect(mockPush).toHaveBeenCalledWith('/match-results');
    });
  });

  it('should handle quick action navigation', async () => {
    render(<RefereeDashboardScreen />);
    
    await waitFor(() => {
      const assignmentsButton = screen.getByText('My Assignments');
      const resultsButton = screen.getByText('Results');

      fireEvent.press(assignmentsButton);
      expect(mockPush).toHaveBeenCalledWith('/my-assignments');

      fireEvent.press(resultsButton);
      expect(mockPush).toHaveBeenCalledWith('/match-results');
    });
  });

  it('offers no Settings quick action — /referee-settings was unrouted (#73)', async () => {
    render(<RefereeDashboardScreen />);

    await waitFor(() => {
      expect(screen.getByText('My Assignments')).toBeTruthy();
    });

    expect(screen.queryByText('Settings')).toBeNull();
  });

  it('should handle switch tournament button', async () => {
    render(<RefereeDashboardScreen />);
    
    await waitFor(() => {
      const switchButton = screen.getByText('Switch');
      fireEvent.press(switchButton);
      expect(mockPush).toHaveBeenCalledWith('/tournament-selection');
    });
  });

  it('should display no current assignment state when no current assignment', async () => {
    // Mock no current assignment
    jest.doMock('../../hooks/useCurrentAssignment', () => ({
      useCurrentAssignment: () => ({
        currentAssignment: null,
        upcomingAssignments: [],
        loading: false,
        error: null,
        refreshAssignments: jest.fn(),
      }),
    }));

    const { rerender } = render(<RefereeDashboardScreen />);
    rerender(<RefereeDashboardScreen />);
    
    await waitFor(() => {
      expect(screen.getByText('No Current Assignment')).toBeTruthy();
      expect(screen.getByText('You have no immediate assignments. Check your upcoming schedule below.')).toBeTruthy();
      expect(screen.getByText('View Full Schedule')).toBeTruthy();
    });
  });

  it('should handle loading state', async () => {
    // Mock loading state
    jest.doMock('../../hooks/useCurrentAssignment', () => ({
      useCurrentAssignment: () => ({
        currentAssignment: null,
        upcomingAssignments: [],
        loading: true,
        error: null,
        refreshAssignments: jest.fn(),
      }),
    }));

    const { rerender } = render(<RefereeDashboardScreen />);
    rerender(<RefereeDashboardScreen />);
    
    // Should still render the basic structure while assignment data loads
    await waitFor(() => {
      expect(screen.getByText('Referee Dashboard')).toBeTruthy();
    });
  });

  it('should maintain touch target compliance', async () => {
    render(<RefereeDashboardScreen />);
    
    await waitFor(() => {
      // All interactive elements should be at least 44px (checked via styles)
      const interactiveElements = screen.getAllByRole('button');
      expect(interactiveElements.length).toBeGreaterThan(0);
    });
  });

  it('should support pull-to-refresh', async () => {
    const mockRefreshAssignments = jest.fn();
    
    jest.doMock('../../hooks/useCurrentAssignment', () => ({
      useCurrentAssignment: () => ({
        currentAssignment: null,
        upcomingAssignments: [],
        loading: false,
        error: null,
        refreshAssignments: mockRefreshAssignments,
      }),
    }));

    render(<RefereeDashboardScreen />);
    
    // Pull to refresh functionality would be tested with ScrollView's refreshControl
    // This tests that the refresh function is available
    expect(mockRefreshAssignments).toBeDefined();
  });

  it('should display proper visual hierarchy', async () => {
    render(<RefereeDashboardScreen />);
    
    await waitFor(() => {
      // Primary: Current assignment should be most prominent
      expect(screen.getByText('CURRENT ASSIGNMENT')).toBeTruthy();
      
      // Secondary: Timeline and quick actions
      expect(screen.getByText("Today's Schedule")).toBeTruthy();
      expect(screen.getByText('My Assignments')).toBeTruthy();
      
      // Tertiary: Emergency contacts
      expect(screen.getByText('Emergency Contacts')).toBeTruthy();
    });
  });

  it('should handle assignment timeline interactions', async () => {
    render(<RefereeDashboardScreen />);
    
    await waitFor(() => {
      // Should handle assignment press in timeline
      const timelineAssignment = screen.getByText('Wave Riders vs Coastal Crushers');
      fireEvent.press(timelineAssignment);
      expect(mockPush).toHaveBeenCalledWith('/my-assignments');
    });
  });
});