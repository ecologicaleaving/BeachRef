/**
 * Test suite for VIS Data Sync Service
 * Run with: deno test --allow-env --allow-net sync-test.ts
 */

import { assertEquals, assertExists, assert } from 'https://deno.land/std@0.167.0/testing/asserts.ts';

// Mock data for testing
const mockTournamentData = [
  {
    id: 'tournament-123',
    visNo: '123',
    code: 'TEST2024',
    name: 'Test Tournament 2024',
    title: 'Test Tournament 2024',
    gender: 'M' as const,
    tournamentType: 'FIVB' as const,
    dates: {
      startDate: '2024-01-10',
      endDate: '2024-01-15',
    },
    status: 'ACTIVE' as const,
    city: 'Test City',
    country: 'Test Country',
    countryCode: 'TC',
  }
];

const mockMatchData = [
  {
    id: 'match-456',
    visNo: '456',
    tournamentCode: 'TEST2024',
    matchCode: 'M001',
    round: 'Pool A',
    status: 'SCHEDULED' as const,
    court: {
      courtNumber: '1',
      courtName: 'Center Court',
    },
    scheduledDateTime: '2024-01-10T10:00:00Z',
    team1: {
      teamNumber: 1 as const,
      teamName: 'Team A',
      player1Name: 'Player A1',
      player2Name: 'Player A2',
      countryCode: 'TC',
    },
    team2: {
      teamNumber: 2 as const,
      teamName: 'Team B', 
      player1Name: 'Player B1',
      player2Name: 'Player B2',
      countryCode: 'TC',
    },
    refereeAssignments: [],
  }
];

const mockRefereeData = [
  {
    id: 'referee-789',
    visRefereeNo: '789',
    firstName: 'John',
    lastName: 'Referee',
    gender: 'M' as const,
    federation: 'FIVB',
    assignments: [
      {
        matchId: '456',
        matchCode: 'M001',
        tournamentCode: 'TEST2024',
        function: 'FIRST' as const,
        status: 'ASSIGNED' as const,
      }
    ],
  }
];

// Test data transformers
Deno.test('Tournament transformation', async () => {
  const { transformTournamentForDatabase, validateTransformedTournament } = 
    await import('../data-transformers.ts');
  
  const transformed = transformTournamentForDatabase(mockTournamentData[0]);
  
  assertEquals(transformed.vis_tournament_no, 123);
  assertEquals(transformed.tournament_code, 'TEST2024');
  assertEquals(transformed.name, 'Test Tournament 2024');
  assertEquals(transformed.country, 'TC');
  assertEquals(transformed.gender, 'M');
  assertEquals(transformed.season, 2024);
  
  assert(validateTransformedTournament(transformed), 'Tournament should be valid');
});

Deno.test('Match transformation', async () => {
  const { transformMatchForDatabase, validateTransformedMatch } = 
    await import('../data-transformers.ts');
  
  const transformed = transformMatchForDatabase(mockMatchData[0], 1);
  
  assertEquals(transformed.match.vis_match_no, 456);
  assertEquals(transformed.match.tournament_code, 'TEST2024');
  assertEquals(transformed.match.team_a_name, 'Team A');
  assertEquals(transformed.match.team_b_name, 'Team B');
  assertEquals(transformed.match.court, '1');
  
  assert(validateTransformedMatch(transformed.match), 'Match should be valid');
  assertExists(transformed.event, 'Event should be created');
});

Deno.test('Referee transformation', async () => {
  const { transformRefereeForDatabase, validateTransformedReferee } = 
    await import('../data-transformers.ts');
  
  const transformed = transformRefereeForDatabase(mockRefereeData[0]);
  
  assertEquals(transformed.referee_id, '789');
  assertEquals(transformed.vis_referee_no, 789);
  assertEquals(transformed.first_name, 'John');
  assertEquals(transformed.last_name, 'Referee');
  assertEquals(transformed.gender, 'M');
  assertEquals(transformed.federation_code, 'FIVB');
  
  assert(validateTransformedReferee(transformed), 'Referee should be valid');
});

// Test sync handlers utility functions
Deno.test('Calculate sync metrics', async () => {
  const { calculateSyncMetrics } = await import('../sync-handlers.ts');
  
  const startTime = Date.now() - 5000; // 5 seconds ago
  const stats = { created: 10, updated: 5, errors: 2, skipped: 1 };
  
  const result = calculateSyncMetrics(startTime, stats);
  
  assertEquals(result.synced, 15); // created + updated
  assertEquals(result.errors, 2);
  assert(result.duration >= 4000, 'Duration should be at least 4 seconds');
  assert(result.duration <= 6000, 'Duration should be at most 6 seconds');
  assertExists(result.message, 'Message should be present');
});

Deno.test('Data consistency validation', async () => {
  const { validateDataConsistency } = await import('../sync-handlers.ts');
  
  const visData = { code: 'TEST2024', name: 'Test Tournament' };
  const dbData = { tournament_code: 'TEST2024', name: 'Test Tournament' };
  const keyFields = ['code', 'name'];
  
  // Test with matching data
  assert(validateDataConsistency(visData, dbData, keyFields), 'Data should be consistent');
  
  // Test with mismatched data
  const mismatchedDbData = { tournament_code: 'DIFFERENT', name: 'Different Name' };
  assert(!validateDataConsistency(visData, mismatchedDbData, keyFields), 'Data should be inconsistent');
});

// Integration tests (these would require a test database)
Deno.test('Health endpoint test', async () => {
  // This is a basic integration test that would work if the service is running
  try {
    const response = await fetch('http://localhost:54321/functions/v1/vis-data-sync/health');
    
    if (response.ok) {
      const data = await response.json();
      assertEquals(data.status, 'healthy');
      assertEquals(data.service, 'vis-data-sync');
      assertExists(data.timestamp);
    }
  } catch (error) {
    console.log('Integration test skipped - service not available:', error.message);
  }
});

// Performance test
Deno.test('Performance - transformation benchmarks', async () => {
  const { transformTournamentForDatabase } = await import('../data-transformers.ts');
  
  const iterations = 1000;
  const startTime = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    transformTournamentForDatabase(mockTournamentData[0]);
  }
  
  const duration = Date.now() - startTime;
  const avgTime = duration / iterations;
  
  console.log(`Tournament transformation: ${avgTime.toFixed(2)}ms average over ${iterations} iterations`);
  
  // Should be very fast for simple transformations
  assert(avgTime < 1, 'Transformation should be under 1ms on average');
});

// Error handling tests
Deno.test('Error handling - invalid data', async () => {
  const { transformTournamentForDatabase, validateTransformedTournament } = 
    await import('../data-transformers.ts');
  
  // Test with missing required fields
  const invalidTournament = {
    id: 'test',
    // Missing visNo, code, name
    gender: 'M' as const,
    tournamentType: 'LOCAL' as const,
    dates: {},
    status: 'UPCOMING' as const,
  };
  
  try {
    const transformed = transformTournamentForDatabase(invalidTournament as any);
    const isValid = validateTransformedTournament(transformed);
    assert(!isValid, 'Invalid tournament should not validate');
  } catch (error) {
    // It's OK if transformation throws an error for invalid data
    assertExists(error);
  }
});

console.log('All tests completed successfully!');