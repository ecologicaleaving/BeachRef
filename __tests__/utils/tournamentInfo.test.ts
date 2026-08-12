/**
 * Tournament Info Utilities Tests
 * Story 2.3: Tournament Info Panel System
 */

import {
  formatTournamentDate,
  formatTournamentDateRange,
  formatScheduleTime,
  getTournamentStatusText,
  isTournamentActive,
  getTournamentProgress,
  getUpcomingMatches,
  getCurrentMatch,
  getMatchDuration,
  getScheduleItemStatusText,
  isScheduleItemUpcoming,
  isScheduleItemCurrent,
  getActiveWeatherAlerts,
  getWeatherAlertIcon,
  formatWeatherAlertDuration,
  getWeatherAlertPriority,
  formatWeatherAlertTime,
  getWeatherAlertSeverityColor,
  getCourtByNumber,
  getCourtsWithConditions,
  formatCourtConditions,
  getTimeUntilMatch,
  shouldShowTimeWarning,
  createPanelSectionId,
  isPanelSectionCollapsed,
  togglePanelSection,
  validateTournamentInfo,
  validateScheduleItem
} from '../../utils/tournamentInfo';

import {
  TournamentInfo,
  ScheduleItem,
  WeatherAlert,
  CourtInfo
} from '../../types/tournamentInfo';
import { designTokens } from '../../theme/tokens';

// Mock data
const mockTournamentInfo: TournamentInfo = {
  tournamentId: 'T001',
  name: 'FIVB Beach Volleyball World Championships',
  location: 'Rio de Janeiro',
  venue: 'Copacabana Beach',
  startDate: new Date('2024-01-15T08:00:00Z'),
  endDate: new Date('2024-01-22T20:00:00Z'),
  timezone: 'America/Sao_Paulo',
  type: 'beach',
  status: 'active',
  organizerId: 'ORG001',
  organizerName: 'FIVB',
  director: {
    name: 'Maria Silva',
    phone: '+55-21-9999-8888',
    email: 'maria.silva@fivb.org',
    emergencyPhone: '+55-21-1111-2222',
    role: 'Tournament Director'
  }
};

const mockScheduleItems: ScheduleItem[] = [
  {
    matchId: 'M001',
    courtId: 'C001',
    courtNumber: '1',
    scheduledTime: new Date('2024-01-20T14:00:00Z'),
    estimatedDuration: 90,
    teamA: 'Brazil',
    teamB: 'USA',
    round: 'Pool A',
    refereePosition: 'first',
    status: 'scheduled'
  },
  {
    matchId: 'M002',
    courtId: 'C002',
    courtNumber: '2',
    scheduledTime: new Date('2024-01-20T16:00:00Z'),
    estimatedDuration: 75,
    teamA: 'Italy',
    teamB: 'Germany',
    round: 'Pool B',
    refereePosition: 'second',
    status: 'in-progress',
    actualStartTime: new Date('2024-01-20T16:05:00Z')
  },
  {
    matchId: 'M003',
    courtId: 'C001',
    courtNumber: '1',
    scheduledTime: new Date('2024-01-20T18:00:00Z'),
    estimatedDuration: 80,
    teamA: 'France',
    teamB: 'Japan',
    round: 'Pool C',
    refereePosition: 'first',
    status: 'completed',
    actualStartTime: new Date('2024-01-20T18:00:00Z'),
    actualEndTime: new Date('2024-01-20T19:25:00Z')
  }
];

const mockWeatherAlerts: WeatherAlert[] = [
  {
    id: 'W001',
    type: 'warning',
    severity: 'high',
    title: 'Strong Wind Warning',
    description: 'Wind speeds expected to reach 25-30 km/h',
    issuedAt: new Date('2024-01-20T10:00:00Z'),
    expiresAt: new Date('2024-01-20T18:00:00Z'),
    affectedCourts: ['1', '2']
  },
  {
    id: 'W002',
    type: 'advisory',
    severity: 'low',
    title: 'UV Index Advisory',
    description: 'High UV levels expected this afternoon',
    issuedAt: new Date('2024-01-20T08:00:00Z'),
    expiresAt: new Date('2024-01-20T19:00:00Z')
  },
  {
    id: 'W003',
    type: 'warning',
    severity: 'critical',
    title: 'Thunderstorm Warning',
    description: 'Severe thunderstorm approaching',
    issuedAt: new Date('2024-01-19T20:00:00Z'),
    expiresAt: new Date('2024-01-19T22:00:00Z')
  }
];

const mockCourts: CourtInfo[] = [
  {
    courtId: 'C001',
    courtNumber: '1',
    location: 'Beach North',
    type: 'main',
    conditions: 'Good sand conditions',
    specialRequirements: ['Wind protection'],
    surfaceType: 'Sand',
    netHeight: 2.43,
    dimensions: '16m x 8m'
  },
  {
    courtId: 'C002',
    courtNumber: '2',
    location: 'Beach South',
    type: 'main',
    conditions: 'Slightly windy',
    surfaceType: 'Sand',
    netHeight: 2.43
  },
  {
    courtId: 'C003',
    courtNumber: '3',
    location: 'Practice Area',
    type: 'practice',
    surfaceType: 'Sand'
  }
];

describe('Tournament Info Utilities', () => {
  beforeEach(() => {
    // Set up consistent date for tests
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-20T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Date and Time Formatting', () => {
    test('formatTournamentDate should format date correctly', () => {
      const date = new Date('2024-01-15T08:00:00Z');
      const formatted = formatTournamentDate(date);
      expect(formatted).toMatch(/January 15, 2024/);
    });

    test('formatTournamentDateRange should handle same day', () => {
      const date = new Date('2024-01-15T08:00:00Z');
      const range = formatTournamentDateRange(date, date);
      expect(range).toMatch(/January 15, 2024/);
    });

    test('formatTournamentDateRange should handle different days', () => {
      const startDate = new Date('2024-01-15T08:00:00Z');
      const endDate = new Date('2024-01-22T20:00:00Z');
      const range = formatTournamentDateRange(startDate, endDate);
      expect(range).toMatch(/January 15.*22, 2024/);
    });

    test('formatScheduleTime should format time correctly', () => {
      const date = new Date('2024-01-20T14:30:00Z');
      const formatted = formatScheduleTime(date);
      expect(formatted).toMatch(/\d{1,2}:\d{2} [AP]M/);
    });
  });

  describe('Tournament Status', () => {
    test('getTournamentStatusText should return correct text', () => {
      expect(getTournamentStatusText('upcoming')).toBe('Upcoming');
      expect(getTournamentStatusText('active')).toBe('In Progress');
      expect(getTournamentStatusText('completed')).toBe('Completed');
      expect(getTournamentStatusText('cancelled')).toBe('Cancelled');
    });

    test('isTournamentActive should correctly identify active tournaments', () => {
      const currentDate = new Date('2024-01-18T12:00:00Z');
      expect(isTournamentActive(mockTournamentInfo, currentDate)).toBe(true);
      
      const beforeDate = new Date('2024-01-14T12:00:00Z');
      expect(isTournamentActive(mockTournamentInfo, beforeDate)).toBe(false);
      
      const afterDate = new Date('2024-01-25T12:00:00Z');
      expect(isTournamentActive(mockTournamentInfo, afterDate)).toBe(false);
    });

    test('getTournamentProgress should calculate progress correctly', () => {
      const midDate = new Date('2024-01-18T14:00:00Z'); // Roughly middle of tournament
      const progress = getTournamentProgress(mockTournamentInfo, midDate);
      expect(progress).toBeGreaterThan(30);
      expect(progress).toBeLessThan(70);
    });
  });

  describe('Schedule Management', () => {
    test('getUpcomingMatches should return scheduled matches in order', () => {
      const currentTime = new Date('2024-01-20T13:00:00Z');
      const upcoming = getUpcomingMatches(mockScheduleItems, currentTime, 2);
      
      expect(upcoming).toHaveLength(1);
      expect(upcoming[0].matchId).toBe('M001');
      expect(upcoming[0].status).toBe('scheduled');
    });

    test('getCurrentMatch should find in-progress match', () => {
      const currentTime = new Date('2024-01-20T16:30:00Z');
      const current = getCurrentMatch(mockScheduleItems, currentTime);
      
      expect(current).not.toBeNull();
      expect(current?.matchId).toBe('M002');
      expect(current?.status).toBe('in-progress');
    });

    test('getMatchDuration should calculate duration correctly', () => {
      // Completed match with actual times
      const completedMatch = mockScheduleItems[2];
      const duration = getMatchDuration(completedMatch);
      expect(duration).toBe('1h 25m');
      
      // Scheduled match with estimated duration
      const scheduledMatch = mockScheduleItems[0];
      const estimatedDuration = getMatchDuration(scheduledMatch);
      expect(estimatedDuration).toBe('~1h 30m');
    });

    test('getScheduleItemStatusText should return correct status text', () => {
      expect(getScheduleItemStatusText('scheduled')).toBe('Scheduled');
      expect(getScheduleItemStatusText('in-progress')).toBe('In Progress');
      expect(getScheduleItemStatusText('completed')).toBe('Completed');
    });

    test('isScheduleItemUpcoming should identify upcoming matches', () => {
      const currentTime = new Date('2024-01-20T13:00:00Z');
      expect(isScheduleItemUpcoming(mockScheduleItems[0], currentTime)).toBe(true);
      expect(isScheduleItemUpcoming(mockScheduleItems[1], currentTime)).toBe(false);
    });

    test('isScheduleItemCurrent should identify current matches', () => {
      const currentTime = new Date('2024-01-20T16:30:00Z');
      expect(isScheduleItemCurrent(mockScheduleItems[1], currentTime)).toBe(true);
      expect(isScheduleItemCurrent(mockScheduleItems[0], currentTime)).toBe(false);
    });
  });

  describe('Weather Alerts', () => {
    test('getActiveWeatherAlerts should filter and sort alerts', () => {
      const currentTime = new Date('2024-01-20T14:00:00Z');
      const active = getActiveWeatherAlerts(mockWeatherAlerts, currentTime);
      
      expect(active).toHaveLength(2); // W001 and W002 are active, W003 expired
      expect(active[0].severity).toBe('high'); // Should be sorted by severity
    });

    test('getWeatherAlertIcon should return appropriate icons', () => {
      expect(getWeatherAlertIcon('warning', 'critical')).toBe('alert-triangle');
      expect(getWeatherAlertIcon('warning', 'low')).toBe('alert-circle');
      expect(getWeatherAlertIcon('watch', 'medium')).toBe('eye');
      expect(getWeatherAlertIcon('advisory', 'low')).toBe('info');
    });

    test('formatWeatherAlertDuration should format duration correctly', () => {
      const issuedAt = new Date('2024-01-20T10:00:00Z');
      const expiresAt = new Date('2024-01-20T13:00:00Z');
      
      expect(formatWeatherAlertDuration(issuedAt, expiresAt)).toBe('3 hours');
      expect(formatWeatherAlertDuration(issuedAt)).toBe('Until further notice');
    });

    test('getWeatherAlertPriority should return correct priority', () => {
      expect(getWeatherAlertPriority({ ...mockWeatherAlerts[0], severity: 'critical' })).toBe(4);
      expect(getWeatherAlertPriority({ ...mockWeatherAlerts[0], severity: 'high' })).toBe(3);
      expect(getWeatherAlertPriority({ ...mockWeatherAlerts[0], severity: 'medium' })).toBe(2);
      expect(getWeatherAlertPriority({ ...mockWeatherAlerts[0], severity: 'low' })).toBe(1);
    });

    test('formatWeatherAlertTime should format time correctly', () => {
      const date = new Date('2024-01-20T14:30:00Z');
      const result = formatWeatherAlertTime(date);
      expect(result).toMatch(/\d{1,2}:\d{2}\s?[AP]M/);
    });

    test('getWeatherAlertSeverityColor should return correct colors', () => {
      expect(getWeatherAlertSeverityColor('critical')).toBe('#DC2626');
      expect(getWeatherAlertSeverityColor('high')).toBe('#D97706');
      // Legati ai TOKEN, non a un esadecimale copiato: la tavolozza e' stata
      // ricalcolata per il contrasto AAA e questi due valori sono cambiati.
      // Un test che fotografa il colore si rompe a ogni ritocco del design e
      // non dice nulla su cio' che conta, cioe' che la gravita' media e quella
      // bassa peschino dal sistema invece che da costanti sparse.
      expect(getWeatherAlertSeverityColor('medium')).toBe(designTokens.linkTokens.default);
      expect(getWeatherAlertSeverityColor('low')).toBe(designTokens.neutrals.textSecondary);
      expect(getWeatherAlertSeverityColor('unknown' as any)).toBe(designTokens.neutrals.textSecondary);
    });
  });

  describe('Court Management', () => {
    test('getCourtByNumber should find court by number', () => {
      const court = getCourtByNumber(mockCourts, '1');
      expect(court).not.toBeNull();
      expect(court?.courtId).toBe('C001');
      
      const nonExistent = getCourtByNumber(mockCourts, '99');
      expect(nonExistent).toBeNull();
    });

    test('getCourtsWithConditions should filter courts with conditions', () => {
      const courtsWithConditions = getCourtsWithConditions(mockCourts);
      expect(courtsWithConditions).toHaveLength(2);
    });

    test('formatCourtConditions should format court information', () => {
      const formatted = formatCourtConditions(mockCourts[0]);
      expect(formatted).toContain('Good sand conditions');
      expect(formatted).toContain('Surface: Sand');
      expect(formatted).toContain('Net: 2.43m');
    });
  });

  describe('Time Management', () => {
    test('getTimeUntilMatch should calculate time correctly', () => {
      const currentTime = new Date('2024-01-20T13:00:00Z');
      const matchTime = new Date('2024-01-20T14:00:00Z');
      
      expect(getTimeUntilMatch(matchTime, currentTime)).toBe('1h');
      
      const pastTime = new Date('2024-01-20T12:00:00Z');
      expect(getTimeUntilMatch(pastTime, currentTime)).toBe('Now');
    });

    test('shouldShowTimeWarning should identify upcoming matches', () => {
      const currentTime = new Date('2024-01-20T13:50:00Z');
      const matchTime = new Date('2024-01-20T14:00:00Z');
      
      expect(shouldShowTimeWarning(matchTime, currentTime)).toBe(true);
      
      const laterMatch = new Date('2024-01-20T15:00:00Z');
      expect(shouldShowTimeWarning(laterMatch, currentTime)).toBe(false);
    });
  });

  describe('Panel Utilities', () => {
    test('createPanelSectionId should create consistent IDs', () => {
      const id = createPanelSectionId('Tournament Info', 'Weather Alerts');
      expect(id).toBe('tournament-info-weather-alerts');
    });

    test('isPanelSectionCollapsed should check collapsed state', () => {
      const collapsedSections = new Set(['section-1', 'section-2']);
      
      expect(isPanelSectionCollapsed('section-1', collapsedSections)).toBe(true);
      expect(isPanelSectionCollapsed('section-3', collapsedSections)).toBe(false);
    });

    test('togglePanelSection should toggle section state', () => {
      const collapsedSections = new Set(['section-1']);
      
      const afterToggle1 = togglePanelSection('section-1', collapsedSections);
      expect(afterToggle1.has('section-1')).toBe(false);
      
      const afterToggle2 = togglePanelSection('section-2', collapsedSections);
      expect(afterToggle2.has('section-2')).toBe(true);
      expect(afterToggle2.has('section-1')).toBe(true);
    });
  });

  describe('Validation', () => {
    test('validateTournamentInfo should validate required fields', () => {
      const validTournament = { ...mockTournamentInfo };
      expect(validateTournamentInfo(validTournament)).toHaveLength(0);
      
      const invalidTournament = {
        ...mockTournamentInfo,
        name: '',
        endDate: new Date('2024-01-10T20:00:00Z') // Before start date
      };
      const errors = validateTournamentInfo(invalidTournament);
      expect(errors).toContain('Tournament name is required');
      expect(errors).toContain('End date must be after start date');
    });

    test('validateScheduleItem should validate required fields', () => {
      const validItem = { ...mockScheduleItems[0] };
      expect(validateScheduleItem(validItem)).toHaveLength(0);
      
      const invalidItem = {
        ...mockScheduleItems[0],
        teamA: '',
        teamB: '',
        actualStartTime: new Date('2024-01-20T19:00:00Z'),
        actualEndTime: new Date('2024-01-20T18:00:00Z') // Before start time
      };
      const errors = validateScheduleItem(invalidItem);
      expect(errors).toContain('Team A name is required');
      expect(errors).toContain('Team B name is required');
      expect(errors).toContain('Match end time must be after start time');
    });
  });
});