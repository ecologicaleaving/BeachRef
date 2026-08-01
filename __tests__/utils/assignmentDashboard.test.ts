/**
 * Assignment Dashboard Utilities Tests
 * Tests for assignment detection and dashboard optimization functions
 */

import {
  getCurrentAssignment,
  getUpcomingAssignments,
  getTodayAssignments,
  hasUrgentAssignment,
  getNextAssignment,
  processDashboardAssignments,
  formatAssignmentTimeForDashboard,
  getDashboardPriority,
  shouldScrollToAssignment,
  getEmergencyContacts,
} from '../../utils/assignmentDashboard';
import { Assignment } from '../../types/assignments';

// Mock assignments for testing
const mockAssignments: Assignment[] = [
  {
    id: 'current-001',
    courtNumber: 1,
    homeTeam: 'Team A',
    awayTeam: 'Team B',
    matchTime: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
    refereePosition: '1st Referee',
    status: 'current',
    matchType: 'Pool Play',
    importance: 'high',
  },
  {
    id: 'upcoming-001',
    courtNumber: 2,
    homeTeam: 'Team C',
    awayTeam: 'Team D',
    matchTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    refereePosition: '2nd Referee',
    status: 'upcoming',
    matchType: 'Elimination',
    importance: 'medium',
  },
  {
    id: 'upcoming-002',
    courtNumber: 1,
    homeTeam: 'Team E',
    awayTeam: 'Team F',
    matchTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now (urgent)
    refereePosition: '1st Referee',
    status: 'upcoming',
    matchType: 'Final',
    importance: 'high',
  },
  {
    id: 'completed-001',
    courtNumber: 3,
    homeTeam: 'Team G',
    awayTeam: 'Team H',
    matchTime: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    refereePosition: '1st Referee',
    status: 'completed',
    matchType: 'Pool Play',
    importance: 'low',
    matchResult: '21-18, 19-21, 15-13',
  },
  {
    id: 'tomorrow-001',
    courtNumber: 1,
    homeTeam: 'Team I',
    awayTeam: 'Team J',
    matchTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow
    refereePosition: '1st Referee',
    status: 'upcoming',
    matchType: 'Pool Play',
    importance: 'medium',
  },
];

describe('assignmentDashboard utilities', () => {
  describe('getCurrentAssignment', () => {
    it('should return explicitly current assignment', () => {
      const result = getCurrentAssignment(mockAssignments);
      expect(result).toBeDefined();
      expect(result?.id).toBe('current-001');
      expect(result?.status).toBe('current');
    });

    it('should return upcoming assignment if within 30 minutes and no explicit current', () => {
      const assignmentsWithoutCurrent = mockAssignments.filter(a => a.status !== 'current');
      const result = getCurrentAssignment(assignmentsWithoutCurrent);
      expect(result).toBeDefined();
      expect(result?.id).toBe('upcoming-002'); // 5 minutes from now
    });

    it('should return null if no current or near assignments', () => {
      const farAssignments = mockAssignments.filter(a => 
        a.status !== 'current' && a.id !== 'upcoming-002'
      );
      const result = getCurrentAssignment(farAssignments);
      expect(result).toBeNull();
    });
  });

  describe('getUpcomingAssignments', () => {
    it('should return upcoming assignments sorted by time', () => {
      const result = getUpcomingAssignments(mockAssignments);
      expect(result).toHaveLength(2); // Default limit of 3, but only 2 upcoming today
      expect(result[0].id).toBe('upcoming-002'); // Earliest first
      expect(result[1].id).toBe('upcoming-001');
    });

    it('should respect the limit parameter', () => {
      const result = getUpcomingAssignments(mockAssignments, 1);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('upcoming-002');
    });

    it('should exclude past assignments', () => {
      const result = getUpcomingAssignments(mockAssignments);
      expect(result.every(a => a.matchTime > new Date())).toBe(true);
    });
  });

  describe('getTodayAssignments', () => {
    it('should return assignments scheduled for today', () => {
      const result = getTodayAssignments(mockAssignments);
      // Should include current, upcoming, and completed from today
      expect(result.length).toBeGreaterThan(0);
      
      const today = new Date();
      result.forEach(assignment => {
        const assignmentDate = new Date(assignment.matchTime);
        expect(assignmentDate.toDateString()).toBe(today.toDateString());
      });
    });

    it('should sort assignments by time', () => {
      const result = getTodayAssignments(mockAssignments);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].matchTime.getTime()).toBeGreaterThanOrEqual(
          result[i - 1].matchTime.getTime()
        );
      }
    });
  });

  describe('hasUrgentAssignment', () => {
    it('should return true when assignment starts within 15 minutes', () => {
      const result = hasUrgentAssignment(mockAssignments);
      expect(result).toBe(true); // upcoming-002 is 5 minutes away
    });

    it('should return false when no urgent assignments', () => {
      const nonUrgentAssignments = mockAssignments.filter(a => a.id !== 'upcoming-002');
      const result = hasUrgentAssignment(nonUrgentAssignments);
      expect(result).toBe(false);
    });
  });

  describe('getNextAssignment', () => {
    it('should return next assignment after current', () => {
      const currentAssignment = mockAssignments.find(a => a.id === 'current-001')!;
      const result = getNextAssignment(mockAssignments, currentAssignment);
      expect(result).toBeDefined();
      expect(result?.id).toBe('upcoming-002'); // Next chronologically
    });

    it('should return earliest upcoming when no current assignment', () => {
      const result = getNextAssignment(mockAssignments, null);
      expect(result).toBeDefined();
      expect(result?.id).toBe('upcoming-002');
    });

    it('should return null when no future assignments', () => {
      const pastAssignments = mockAssignments.filter(a => a.status === 'completed');
      const result = getNextAssignment(pastAssignments, null);
      expect(result).toBeNull();
    });
  });

  describe('processDashboardAssignments', () => {
    it('should process assignments into dashboard data structure', () => {
      const result = processDashboardAssignments(mockAssignments);
      
      expect(result).toHaveProperty('currentAssignment');
      expect(result).toHaveProperty('upcomingAssignments');
      expect(result).toHaveProperty('todayAssignments');
      expect(result).toHaveProperty('hasUrgentAssignment');
      expect(result).toHaveProperty('nextAssignment');
      
      expect(result.currentAssignment?.id).toBe('current-001');
      expect(result.hasUrgentAssignment).toBe(true);
      expect(result.upcomingAssignments).toHaveLength(2);
      expect(result.nextAssignment?.id).toBe('upcoming-002');
    });
  });

  describe('formatAssignmentTimeForDashboard', () => {
    // The clock is frozen for this test. It reads `new Date()` here and the
    // function under test reads `Date.now()` a moment later, so any millisecond
    // elapsing between the two turns "30 min" into "29 min" — which is exactly
    // how this suite came to be flaky in a full parallel run while passing in
    // isolation (issue #61, AC8). Freezing time removes the race rather than
    // widening the assertion.
    beforeEach(() => {
      jest.useFakeTimers({ now: new Date('2026-06-01T12:00:00Z') });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should format time correctly for different durations', () => {
      const now = new Date();

      // 30 minutes from now
      const thirtyMin = new Date(now.getTime() + 30 * 60 * 1000);
      expect(formatAssignmentTimeForDashboard(thirtyMin)).toBe('30 min');
      
      // 90 minutes from now
      const ninetyMin = new Date(now.getTime() + 90 * 60 * 1000);
      expect(formatAssignmentTimeForDashboard(ninetyMin)).toBe('1h 30m');
      
      // Past time should use standard format
      const pastTime = new Date(now.getTime() - 60 * 60 * 1000);
      const result = formatAssignmentTimeForDashboard(pastTime);
      expect(result).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
    });
  });

  describe('getDashboardPriority', () => {
    it('should return primary for current assignments', () => {
      const currentAssignment = mockAssignments.find(a => a.status === 'current')!;
      const result = getDashboardPriority(currentAssignment);
      expect(result).toBe('primary');
    });

    it('should return secondary for high importance upcoming', () => {
      const highImportanceUpcoming = mockAssignments.find(
        a => a.status === 'upcoming' && a.importance === 'high'
      )!;
      const result = getDashboardPriority(highImportanceUpcoming);
      expect(result).toBe('secondary');
    });

    it('should return tertiary for far future assignments', () => {
      const farAssignment = mockAssignments.find(a => a.id === 'tomorrow-001')!;
      const result = getDashboardPriority(farAssignment);
      expect(result).toBe('tertiary');
    });
  });

  describe('shouldScrollToAssignment', () => {
    it('should scroll to current assignments', () => {
      const currentAssignment = mockAssignments.find(a => a.status === 'current')!;
      const result = shouldScrollToAssignment(currentAssignment);
      expect(result).toBe(true);
    });

    it('should scroll to urgent upcoming assignments', () => {
      const urgentAssignment = mockAssignments.find(a => a.id === 'upcoming-002')!;
      const result = shouldScrollToAssignment(urgentAssignment);
      expect(result).toBe(true);
    });

    it('should not scroll to far future assignments', () => {
      const farAssignment = mockAssignments.find(a => a.id === 'upcoming-001')!;
      const result = shouldScrollToAssignment(farAssignment);
      expect(result).toBe(false);
    });
  });

  describe('getEmergencyContacts', () => {
    it('should return emergency contact list', () => {
      const result = getEmergencyContacts();
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      
      result.forEach(contact => {
        expect(contact).toHaveProperty('name');
        expect(contact).toHaveProperty('role');
        expect(contact).toHaveProperty('phone');
        expect(contact).toHaveProperty('available24h');
      });
    });

    it('should include tournament director', () => {
      const result = getEmergencyContacts();
      const tournamentDirector = result.find(c => c.role === 'Main Contact');
      expect(tournamentDirector).toBeDefined();
      expect(tournamentDirector?.name).toBe('Tournament Director');
    });

    it('should include emergency services', () => {
      const result = getEmergencyContacts();
      const emergency = result.find(c => c.phone === '911');
      expect(emergency).toBeDefined();
      expect(emergency?.available24h).toBe(true);
    });
  });
});