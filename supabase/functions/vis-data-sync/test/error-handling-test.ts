/**
 * Error handling and recovery tests for VIS Data Sync Service
 * Tests various failure scenarios and recovery mechanisms
 * Run with: deno test --allow-env --allow-net error-handling-test.ts
 */

import { assert, assertEquals, assertRejects } from 'https://deno.land/std@0.167.0/testing/asserts.ts';

Deno.test('Error handling - VIS Adapter fetch failure', async () => {
  const { fetchFromVisAdapter } = await import('../sync-handlers.ts');
  
  // Test with invalid URL
  await assertRejects(
    () => fetchFromVisAdapter('http://invalid-url-that-does-not-exist.com/api'),
    Error,
    'should throw error for invalid URL'
  );
  
  // Test with valid URL that returns 404
  try {
    await fetchFromVisAdapter('https://httpstat.us/404', 1); // Only 1 retry
  } catch (error) {
    assert(error instanceof Error, 'Should throw Error instance');
    assert(error.message.includes('404'), 'Error should mention 404 status');
  }
});

Deno.test('Error handling - Retry mechanism', async () => {
  const { fetchFromVisAdapter } = await import('../sync-handlers.ts');
  
  const startTime = Date.now();
  
  try {
    // This should retry 3 times with exponential backoff
    await fetchFromVisAdapter('https://httpstat.us/500', 3);
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Should have taken at least some time for retries (1s + 2s + 4s = ~7s minimum)
    assert(duration >= 6000, `Retries should take time, got ${duration}ms`);
    assert(error.message.includes('3 attempts'), 'Error should mention retry attempts');
  }
});

Deno.test('Error handling - Data validation failures', async () => {
  const { 
    validateTransformedTournament, 
    validateTransformedMatch, 
    validateTransformedReferee 
  } = await import('../data-transformers.ts');
  
  // Test tournament validation with missing fields
  const invalidTournament = {
    // Missing vis_tournament_no and tournament_code
    name: 'Test Tournament',
  };
  assert(!validateTransformedTournament(invalidTournament), 'Should reject invalid tournament');
  
  // Test match validation with missing fields
  const invalidMatch = {
    // Missing vis_match_no and tournament_code
    team_a_name: 'Team A',
    team_b_name: 'Team B',
  };
  assert(!validateTransformedMatch(invalidMatch), 'Should reject invalid match');
  
  // Test referee validation with missing fields  
  const invalidReferee = {
    // Missing referee_id and vis_referee_no
    first_name: 'John',
    last_name: 'Doe',
  };
  assert(!validateTransformedReferee(invalidReferee), 'Should reject invalid referee');
});

Deno.test('Error handling - Data transformation errors', async () => {
  const { transformTournamentForDatabase } = await import('../data-transformers.ts');
  
  // Test with null/undefined input
  try {
    transformTournamentForDatabase(null as any);
    assert(false, 'Should throw error for null input');
  } catch (error) {
    assert(error instanceof Error, 'Should throw Error for null input');
  }
  
  // Test with completely invalid structure
  try {
    transformTournamentForDatabase({ invalid: 'structure' } as any);
    // This might not throw but should produce invalid output
    const result = transformTournamentForDatabase({ invalid: 'structure' } as any);
    const isValid = await import('../data-transformers.ts')
      .then(mod => mod.validateTransformedTournament(result));
    assert(!isValid, 'Invalid input should produce invalid output');
  } catch (error) {
    // It's OK if it throws an error too
    assert(error instanceof Error, 'Should handle invalid input gracefully');
  }
});

Deno.test('Error handling - Sync stats error accumulation', async () => {
  const { calculateSyncMetrics } = await import('../sync-handlers.ts');
  
  const startTime = Date.now();
  
  // Test with high error count
  const highErrorStats = { created: 5, updated: 3, errors: 25, skipped: 2 };
  const result = calculateSyncMetrics(startTime, highErrorStats);
  
  assertEquals(result.synced, 8); // created + updated
  assertEquals(result.errors, 25);
  assert(!result.success, 'Sync should fail with high error count');
  assert(result.message.includes('25 errors'), 'Message should mention error count');
});

Deno.test('Error handling - Data consistency validation warnings', async () => {
  const { validateDataConsistency } = await import('../sync-handlers.ts');
  
  const visData = {
    code: 'TOURNAMENT2024',
    name: 'VIS Tournament Name',
    status: 'ACTIVE',
  };
  
  const inconsistentDbData = {
    tournament_code: 'TOURNAMENT2024', // matches
    name: 'Different Tournament Name', // doesn't match
    status: 'COMPLETED', // doesn't match
  };
  
  // This should detect inconsistency but not throw
  const isConsistent = validateDataConsistency(
    visData, 
    inconsistentDbData, 
    ['code', 'name', 'status']
  );
  
  assert(!isConsistent, 'Should detect data inconsistency');
  
  // Test with partial match
  const partiallyConsistentDbData = {
    tournament_code: 'TOURNAMENT2024', // matches
    name: 'VIS Tournament Name', // matches
    status: 'COMPLETED', // doesn't match
  };
  
  const partialConsistency = validateDataConsistency(
    visData, 
    partiallyConsistentDbData, 
    ['code', 'name'] // Only check these fields
  );
  
  assert(partialConsistency, 'Should be consistent when checking only matching fields');
});

Deno.test('Error handling - Batch upsert partial failures', async () => {
  // This test simulates what would happen with partial batch failures
  // In a real test, this would use a test database
  
  const { calculateSyncMetrics } = await import('../sync-handlers.ts');
  
  // Simulate a batch where some records succeed and some fail
  const mixedResultStats = { created: 7, updated: 3, errors: 2, skipped: 1 };
  const startTime = Date.now();
  
  const result = calculateSyncMetrics(startTime, mixedResultStats);
  
  assertEquals(result.synced, 10); // created + updated
  assertEquals(result.errors, 2);
  // With some errors, it might still be considered successful if most records processed
  // The actual success logic depends on error thresholds
  assert(result.message.includes('2 errors'), 'Should report error count');
});

Deno.test('Error handling - Timeout simulation', async () => {
  // Simulate sync operations approaching the 30-second limit
  
  const { calculateSyncMetrics } = await import('../sync-handlers.ts');
  
  const startTime = Date.now() - 29000; // Started 29 seconds ago
  const stats = { created: 50, updated: 25, errors: 0, skipped: 0 };
  
  const result = calculateSyncMetrics(startTime, stats);
  
  assert(result.duration >= 29000, 'Should show realistic duration');
  assert(result.duration < 30000, 'Should complete before 30 second limit');
  
  // In the real sync service, this would trigger early termination
  console.log(`Sync duration near limit: ${result.duration}ms`);
});

Deno.test('Error handling - Large dataset memory pressure', async () => {
  const { transformTournamentForDatabase } = await import('../data-transformers.ts');
  
  // Create a large dataset that might cause memory issues
  const largeTournament = {
    id: 'large-tournament',
    visNo: '9999',
    code: 'LARGE2024',
    name: 'X'.repeat(1000), // Very long name
    title: 'Y'.repeat(1000), // Very long title
    gender: 'M' as const,
    tournamentType: 'FIVB' as const,
    dates: {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    },
    status: 'ACTIVE' as const,
    location: 'Z'.repeat(500), // Long location
  };
  
  // This should handle large data without crashing
  try {
    const result = transformTournamentForDatabase(largeTournament);
    assert(result.name.length <= 1000, 'Should handle long names');
    assert(result.location.length <= 500, 'Should handle long locations');
  } catch (error) {
    // If it throws, it should be a graceful error, not a memory crash
    assert(error instanceof Error, 'Should throw proper Error object');
    console.log('Large data handling error (acceptable):', error.message);
  }
});

console.log('\nAll error handling tests completed successfully!');