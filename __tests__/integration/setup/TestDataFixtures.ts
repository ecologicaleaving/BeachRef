/**
 * Test data fixtures for integration testing
 * Story 3.5: Integration Testing & Performance Validation
 */

import { TournamentDTO, MatchDTO, RefereeDTO, EventDTO } from '../../../services/DualReadService';

/**
 * Generate test tournament data with various statuses and seasons
 */
export function createTestTournaments(testId: string): TournamentDTO[] {
  const baseYear = new Date().getFullYear();
  
  return [
    {
      id: `tournament-active-${testId}`,
      visNo: '1001',
      tournamentCode: `TEST_ACTIVE_${testId}`,
      name: `Test Active Tournament ${testId}`,
      title: `Test Active Tournament ${testId}`,
      gender: 'M',
      tournamentType: 'FIVB',
      dates: {
        startDate: `${baseYear}-03-01`,
        endDate: `${baseYear}-03-07`,
        startDateMainDraw: `${baseYear}-03-03`,
      },
      status: 'ACTIVE',
      city: 'Test City',
      country: 'Test Country',
      countryCode: 'TC',
      location: 'Test Beach Arena',
    },
    {
      id: `tournament-upcoming-${testId}`,
      visNo: '1002', 
      tournamentCode: `TEST_UPCOMING_${testId}`,
      name: `Test Upcoming Tournament ${testId}`,
      title: `Test Upcoming Tournament ${testId}`,
      gender: 'W',
      tournamentType: 'BPT',
      dates: {
        startDate: `${baseYear + 1}-06-15`,
        endDate: `${baseYear + 1}-06-21`,
        startDateMainDraw: `${baseYear + 1}-06-17`,
      },
      status: 'UPCOMING',
      city: 'Future City',
      country: 'Future Country', 
      countryCode: 'FC',
      location: 'Future Beach Complex',
    },
    {
      id: `tournament-completed-${testId}`,
      visNo: '1003',
      tournamentCode: `TEST_COMPLETED_${testId}`,
      name: `Test Completed Tournament ${testId}`,
      title: `Test Completed Tournament ${testId}`, 
      gender: 'M',
      tournamentType: 'CEV',
      dates: {
        startDate: `${baseYear - 1}-09-10`,
        endDate: `${baseYear - 1}-09-16`,
        startDateMainDraw: `${baseYear - 1}-09-12`,
      },
      status: 'COMPLETED',
      city: 'Past City',
      country: 'Past Country',
      countryCode: 'PC',
      location: 'Historic Beach Stadium',
    },
  ];
}

/**
 * Generate test match data with different phases and referee assignments
 */
export function createTestMatches(testId: string, tournamentCode: string): MatchDTO[] {
  const baseDate = new Date();
  
  return [
    {
      id: `match-scheduled-${testId}`,
      visNo: '2001',
      tournamentCode,
      matchCode: 'M001',
      round: 'Pool A',
      phaseCode: 'POOL',
      status: 'SCHEDULED',
      court: {
        courtNumber: '1',
        courtName: 'Center Court',
        surface: 'Sand',
        location: 'Main Arena',
      },
      scheduledDateTime: new Date(baseDate.getTime() + 86400000).toISOString(), // Tomorrow
      team1: {
        teamNumber: 1,
        teamName: 'Team Alpha',
        player1Name: 'Player A1',
        player2Name: 'Player A2',
        countryCode: 'TC',
        ranking: 5,
      },
      team2: {
        teamNumber: 2,
        teamName: 'Team Beta',
        player1Name: 'Player B1', 
        player2Name: 'Player B2',
        countryCode: 'FC',
        ranking: 8,
      },
      refereeAssignments: [
        {
          refereeId: `ref-001-${testId}`,
          refereeName: 'Test Referee 1',
          function: 'FIRST',
          federationCode: 'FIVB',
          status: 'ASSIGNED',
        },
      ],
    },
    {
      id: `match-running-${testId}`,
      visNo: '2002',
      tournamentCode,
      matchCode: 'M002',
      round: 'Pool B',
      phaseCode: 'POOL',
      status: 'RUNNING',
      court: {
        courtNumber: '2',
        courtName: 'Court 2',
        surface: 'Sand',
        location: 'Side Arena',
      },
      scheduledDateTime: new Date(baseDate.getTime() - 3600000).toISOString(), // 1 hour ago
      actualStartTime: new Date(baseDate.getTime() - 3000000).toISOString(), // 50 minutes ago
      team1: {
        teamNumber: 1,
        teamName: 'Team Gamma',
        player1Name: 'Player G1',
        player2Name: 'Player G2', 
        countryCode: 'PC',
        ranking: 3,
      },
      team2: {
        teamNumber: 2,
        teamName: 'Team Delta',
        player1Name: 'Player D1',
        player2Name: 'Player D2',
        countryCode: 'TC',
        ranking: 12,
      },
      result: {
        team1Sets: 1,
        team2Sets: 0,
        setScores: [21, 18],  // Flat array format
        sets: [
          { set: 1, a: 21, b: 18 },
        ],
        duration: 2400, // 40 minutes
      },
      refereeAssignments: [
        {
          refereeId: `ref-002-${testId}`,
          refereeName: 'Test Referee 2',
          function: 'FIRST',
          federationCode: 'CEV',
          status: 'CONFIRMED',
        },
      ],
    },
    {
      id: `match-finished-${testId}`,
      visNo: '2003',
      tournamentCode,
      matchCode: 'M003',
      round: 'Quarterfinals',
      phaseCode: 'KNOCKOUT',
      status: 'FINISHED',
      court: {
        courtNumber: '1',
        courtName: 'Center Court',
        surface: 'Sand',
        location: 'Main Arena',
      },
      scheduledDateTime: new Date(baseDate.getTime() - 86400000).toISOString(), // Yesterday
      actualStartTime: new Date(baseDate.getTime() - 86000000).toISOString(), // ~24h ago
      actualEndTime: new Date(baseDate.getTime() - 82800000).toISOString(), // ~23h ago
      team1: {
        teamNumber: 1,
        teamName: 'Team Epsilon',
        player1Name: 'Player E1',
        player2Name: 'Player E2',
        countryCode: 'FC',
        ranking: 1,
      },
      team2: {
        teamNumber: 2,
        teamName: 'Team Zeta',
        player1Name: 'Player Z1',
        player2Name: 'Player Z2',
        countryCode: 'PC',
        ranking: 4,
      },
      result: {
        team1Sets: 2,
        team2Sets: 1,
        setScores: [21, 17, 19, 21, 15, 13],  // Flat array format
        sets: [
          { set: 1, a: 21, b: 17 },
          { set: 2, a: 19, b: 21 },
          { set: 3, a: 15, b: 13 },
        ],
        winner: 1,
        duration: 5400, // 90 minutes
        forfeit: false,
      },
      refereeAssignments: [
        {
          refereeId: `ref-001-${testId}`,
          refereeName: 'Test Referee 1',
          function: 'FIRST',
          federationCode: 'FIVB',
          status: 'CONFIRMED',
        },
      ],
    },
  ];
}

/**
 * Generate test referee data with assignment status and performance metrics
 */
export function createTestReferees(testId: string): RefereeDTO[] {
  return [
    {
      id: `ref-001-${testId}`,
      visRefereeNo: `3001`,
      firstName: 'Test',
      lastName: 'Referee One',
      gender: 'M',
      federation: 'FIVB',
      birthdate: '1985-05-15',
      assignments: [
        {
          matchId: `2001`,
          matchCode: 'M001', 
          tournamentCode: `TEST_ACTIVE_${testId}`,
          function: 'FIRST',
          status: 'ASSIGNED',
          court: '1',
          scheduledTime: new Date(Date.now() + 86400000).toISOString(),
        },
        {
          matchId: `2003`,
          matchCode: 'M003',
          tournamentCode: `TEST_ACTIVE_${testId}`,
          function: 'FIRST', 
          status: 'CONFIRMED',
          court: '1',
          scheduledTime: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
    },
    {
      id: `ref-002-${testId}`,
      visRefereeNo: `3002`,
      firstName: 'Test',
      lastName: 'Referee Two',
      gender: 'F',
      federation: 'CEV',
      birthdate: '1990-08-22',
      assignments: [
        {
          matchId: `2002`,
          matchCode: 'M002',
          tournamentCode: `TEST_ACTIVE_${testId}`,
          function: 'FIRST',
          status: 'CONFIRMED',
          court: '2',
          scheduledTime: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
    },
    {
      id: `ref-003-${testId}`,
      visRefereeNo: `3003`,
      firstName: 'Test',
      lastName: 'Referee Three',
      gender: 'M',
      federation: 'BPT',
      birthdate: '1988-12-03',
      assignments: [],
    },
  ];
}

/**
 * Generate test event data linking tournaments and matches
 */
export function createTestEvents(testId: string, tournamentCode: string): EventDTO[] {
  return [
    {
      id: `event-main-${testId}`,
      visEventNo: 4001,
      tournamentCode,
      name: `${tournamentCode} Main Draw`,
      gender: 'M',
      phase: 'Main Draw',
      country: 'Test Country',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 604800000).toISOString().split('T')[0], // +7 days
      status: 'ACTIVE',
    },
    {
      id: `event-qualification-${testId}`,
      visEventNo: 4002,
      tournamentCode,
      name: `${tournamentCode} Qualification`,
      gender: 'M',
      phase: 'Qualification',
      country: 'Test Country',
      startDate: new Date(Date.now() - 172800000).toISOString().split('T')[0], // -2 days
      endDate: new Date().toISOString().split('T')[0],
      status: 'COMPLETED',
    },
  ];
}

/**
 * Create complete test dataset for integration testing
 */
export function createCompleteTestDataset(testId: string) {
  const tournaments = createTestTournaments(testId);
  const activeTournamentCode = tournaments[0].tournamentCode;
  
  return {
    tournaments,
    matches: createTestMatches(testId, activeTournamentCode),
    referees: createTestReferees(testId),
    events: createTestEvents(testId, activeTournamentCode),
    testId,
  };
}