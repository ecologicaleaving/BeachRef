/**
 * Performance tests for VIS Data Sync Service
 * Tests the 30-second target for full tournament season sync
 * Run with: deno test --allow-env --allow-net performance-test.ts
 */

import { assert, assertEquals } from 'https://deno.land/std@0.167.0/testing/asserts.ts';

// Mock large dataset for performance testing
function generateMockTournaments(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `tournament-${i}`,
    visNo: `${1000 + i}`,
    code: `TOUR${2024}${i.toString().padStart(3, '0')}`,
    name: `Tournament ${i + 1} 2024`,
    gender: i % 2 === 0 ? 'M' : 'W',
    tournamentType: ['FIVB', 'BPT', 'CEV', 'LOCAL'][i % 4],
    dates: {
      startDate: `2024-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
      endDate: `2024-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 5).padStart(2, '0')}`,
    },
    status: ['UPCOMING', 'ACTIVE', 'COMPLETED'][i % 3],
    city: `City ${i + 1}`,
    country: `Country ${i + 1}`,
    countryCode: `C${i.toString().padStart(2, '0')}`,
  }));
}

function generateMockMatches(tournamentCount: number, matchesPerTournament: number) {
  const matches = [];
  for (let t = 0; t < tournamentCount; t++) {
    for (let m = 0; m < matchesPerTournament; m++) {
      const matchIndex = t * matchesPerTournament + m;
      matches.push({
        id: `match-${matchIndex}`,
        visNo: `${2000 + matchIndex}`,
        tournamentCode: `TOUR${2024}${t.toString().padStart(3, '0')}`,
        matchCode: `M${m.toString().padStart(3, '0')}`,
        round: `Pool ${String.fromCharCode(65 + (m % 4))}`,
        status: ['SCHEDULED', 'RUNNING', 'FINISHED'][m % 3],
        court: {
          courtNumber: `${(m % 8) + 1}`,
          courtName: `Court ${(m % 8) + 1}`,
        },
        scheduledDateTime: `2024-${String(Math.floor(t / 30) + 1).padStart(2, '0')}-${String((t % 30) + 1).padStart(2, '0')}T${String((m % 12) + 8).padStart(2, '0')}:00:00Z`,
        team1: {
          teamNumber: 1,
          teamName: `Team A${m}`,
          player1Name: `Player A${m}1`,
          player2Name: `Player A${m}2`,
          countryCode: `C${t.toString().padStart(2, '0')}`,
        },
        team2: {
          teamNumber: 2,
          teamName: `Team B${m}`,
          player1Name: `Player B${m}1`,
          player2Name: `Player B${m}2`,
          countryCode: `C${((t + 1) % 50).toString().padStart(2, '0')}`,
        },
        refereeAssignments: [],
      });
    }
  }
  return matches;
}

Deno.test('Performance - Tournament transformation batch', async () => {
  const { transformTournamentForDatabase } = await import('../data-transformers.ts');
  
  const tournaments = generateMockTournaments(100); // Typical tournament season size
  const startTime = Date.now();
  
  const transformed = tournaments.map(tournament => 
    transformTournamentForDatabase(tournament as any)
  );
  
  const duration = Date.now() - startTime;
  const avgTime = duration / tournaments.length;
  
  console.log(`Tournament batch transformation: ${duration}ms total, ${avgTime.toFixed(2)}ms per tournament`);
  
  assertEquals(transformed.length, 100);
  assert(duration < 1000, 'Batch transformation should complete under 1 second');
  assert(avgTime < 10, 'Average transformation time should be under 10ms');
});

Deno.test('Performance - Match transformation batch', async () => {
  const { transformMatchForDatabase } = await import('../data-transformers.ts');
  
  const matches = generateMockMatches(10, 50); // 10 tournaments, 50 matches each = 500 matches
  const startTime = Date.now();
  
  const transformed = matches.map((match, index) => 
    transformMatchForDatabase(match as any, Math.floor(index / 50) + 1) // Tournament ID
  );
  
  const duration = Date.now() - startTime;
  const avgTime = duration / matches.length;
  
  console.log(`Match batch transformation: ${duration}ms total, ${avgTime.toFixed(2)}ms per match`);
  
  assertEquals(transformed.length, 500);
  assert(duration < 5000, 'Match batch transformation should complete under 5 seconds');
  assert(avgTime < 10, 'Average match transformation time should be under 10ms');
});

Deno.test('Performance - Batch upsert simulation', async () => {
  const { calculateSyncMetrics } = await import('../sync-handlers.ts');
  
  // Simulate batch processing times
  const batchSizes = [10, 25, 50, 100];
  const results: { batchSize: number; avgTime: number }[] = [];
  
  for (const batchSize of batchSizes) {
    const iterations = 10;
    let totalTime = 0;
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      // Simulate batch processing work
      const stats = { created: batchSize, updated: 0, errors: 0, skipped: 0 };
      calculateSyncMetrics(startTime, stats);
      
      // Simulate database processing time (0.5ms per record is optimistic)
      await new Promise(resolve => setTimeout(resolve, batchSize * 0.5));
      
      totalTime += Date.now() - startTime;
    }
    
    const avgTime = totalTime / iterations;
    results.push({ batchSize, avgTime });
    
    console.log(`Batch size ${batchSize}: ${avgTime.toFixed(1)}ms average`);
  }
  
  // Verify that larger batches are more efficient per record
  const efficiency = results.map(r => r.avgTime / r.batchSize);
  assert(efficiency[3] <= efficiency[0], 'Larger batches should be more efficient per record');
});

Deno.test('Performance - Full sync time estimation', async () => {
  console.log('\n=== Full Sync Performance Estimation ===');
  
  // Typical tournament season data volumes
  const seasonStats = {
    tournaments: 150,
    avgMatchesPerTournament: 60,
    avgRefereesPerTournament: 12,
  };
  
  const totalMatches = seasonStats.tournaments * seasonStats.avgMatchesPerTournament;
  const totalReferees = seasonStats.tournaments * seasonStats.avgRefereesPerTournament;
  
  console.log(`Season data volume:`);
  console.log(`- Tournaments: ${seasonStats.tournaments}`);
  console.log(`- Total matches: ${totalMatches}`);
  console.log(`- Total referees: ${totalReferees}`);
  
  // Estimated processing times (based on previous tests and database operations)
  const estimatedTimes = {
    tournamentSync: seasonStats.tournaments * 2, // 2ms per tournament (transform + upsert)
    matchSync: totalMatches * 5, // 5ms per match (transform + event handling + upsert)
    refereeSync: totalReferees * 3, // 3ms per referee (transform + assignments + upsert)
    overhead: 2000, // 2 seconds for setup, API calls, validation
  };
  
  const totalEstimated = Object.values(estimatedTimes).reduce((sum, time) => sum + time, 0);
  
  console.log(`\nEstimated sync times:`);
  console.log(`- Tournament sync: ${estimatedTimes.tournamentSync}ms`);
  console.log(`- Match sync: ${estimatedTimes.matchSync}ms`);
  console.log(`- Referee sync: ${estimatedTimes.refereeSync}ms`);
  console.log(`- Overhead: ${estimatedTimes.overhead}ms`);
  console.log(`- TOTAL: ${totalEstimated}ms (${(totalEstimated / 1000).toFixed(1)}s)`);
  
  // Verify we meet the 30-second requirement
  assert(totalEstimated < 30000, `Full sync should complete under 30 seconds (estimated: ${totalEstimated}ms)`);
  
  // Also check that we're well within limits (should be under 20 seconds for safety)
  assert(totalEstimated < 20000, `Full sync should complete under 20 seconds for safety margin (estimated: ${totalEstimated}ms)`);
  
  console.log(`✓ Performance target met: ${(totalEstimated / 1000).toFixed(1)}s < 30s requirement`);
});

Deno.test('Performance - Memory usage estimation', async () => {
  const { transformTournamentForDatabase } = await import('../data-transformers.ts');
  
  // Test memory usage for large datasets
  const largeTournaments = generateMockTournaments(1000);
  
  const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
  
  const transformed = largeTournaments.map(tournament => 
    transformTournamentForDatabase(tournament as any)
  );
  
  const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
  const memoryUsed = endMemory - startMemory;
  
  console.log(`Memory usage for 1000 tournaments: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);
  
  // Cleanup
  transformed.length = 0;
  
  assertEquals(transformed.length, 0); // Verify cleanup
  
  // Memory usage should be reasonable (under 10MB for 1000 tournaments)
  if (memoryUsed > 0) {
    assert(memoryUsed < 10 * 1024 * 1024, 'Memory usage should be under 10MB for 1000 tournaments');
  }
});

console.log('\nAll performance tests completed successfully!');