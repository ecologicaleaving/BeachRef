/**
 * useCurrentAssignment Hook
 * Detects and manages the referee's current assignment
 */

import { useState, useEffect } from 'react';
import { Assignment } from '../types/assignments';

interface CurrentAssignmentState {
  currentAssignment: Assignment | null;
  upcomingAssignments: Assignment[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export const useCurrentAssignment = (): CurrentAssignmentState & {
  refreshAssignments: () => void;
  updateAssignmentStatus: (assignmentId: string, status: string) => void;
} => {
  const [state, setState] = useState<CurrentAssignmentState>({
    currentAssignment: null,
    upcomingAssignments: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });

  // Mock current assignment for demonstration
  const mockCurrentAssignment: Assignment = {
    id: 'current-001',
    courtNumber: 1,
    homeTeam: 'Beach Warriors',
    awayTeam: 'Sand Storms',
    matchTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    refereePosition: '1st Referee',
    status: 'current',
    matchType: 'Pool Play',
    importance: 'high',
    notes: 'Championship semi-final match',
    matchResult: null,
    tournamentInfo: {
      name: 'Beach Volleyball Championship 2025',
      location: 'Santa Monica, CA',
      court: 'Center Court',
    }
  };

  // Mock upcoming assignments
  const mockUpcomingAssignments: Assignment[] = [
    {
      id: 'upcoming-001',
      courtNumber: 2,
      homeTeam: 'Wave Riders',
      awayTeam: 'Coastal Crushers',
      matchTime: new Date(Date.now() + 90 * 60 * 1000), // 1.5 hours from now
      refereePosition: '2nd Referee',
      status: 'upcoming',
      matchType: 'Pool Play',
      importance: 'medium',
      notes: null,
      matchResult: null,
      tournamentInfo: {
        name: 'Beach Volleyball Championship 2025',
        location: 'Santa Monica, CA',
        court: 'Court 2',
      }
    },
    {
      id: 'upcoming-002',
      courtNumber: 1,
      homeTeam: 'Spike Masters',
      awayTeam: 'Net Ninjas',
      matchTime: new Date(Date.now() + 150 * 60 * 1000), // 2.5 hours from now
      refereePosition: '1st Referee',
      status: 'upcoming',
      matchType: 'Elimination',
      importance: 'high',
      notes: 'Final match of the day',
      matchResult: null,
      tournamentInfo: {
        name: 'Beach Volleyball Championship 2025',
        location: 'Santa Monica, CA',
        court: 'Center Court',
      }
    }
  ];

  const getCurrentAssignment = (): Assignment | null => {
    // In a real implementation, this would query the assignment API
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    
    // Return current assignment if within 30 minutes of match time
    if (mockCurrentAssignment.matchTime <= thirtyMinutesFromNow) {
      return mockCurrentAssignment;
    }
    
    return null;
  };

  const getUpcomingAssignments = (): Assignment[] => {
    // In a real implementation, this would query the assignment API
    // Filter to next 2-3 upcoming assignments
    return mockUpcomingAssignments.slice(0, 3);
  };

  const refreshAssignments = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const currentAssignment = getCurrentAssignment();
      const upcomingAssignments = getUpcomingAssignments();
      
      setState({
        currentAssignment,
        upcomingAssignments,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load assignments',
      }));
    }
  };

  const updateAssignmentStatus = async (_assignmentId: string, _status: string) => {
    try {
      // In a real implementation, this would call the assignment update API
      // TODO: Use _assignmentId and _status to update assignment

      // Refresh assignments after status update
      await refreshAssignments();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update assignment status',
      }));
    }
  };

  // Load assignments on mount and set up refresh interval
  useEffect(() => {
    refreshAssignments();
    
    // Refresh assignments every 30 seconds for real-time updates
    const interval = setInterval(refreshAssignments, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    ...state,
    refreshAssignments,
    updateAssignmentStatus,
  };
};