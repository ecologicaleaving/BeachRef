// Simple test script for mock VIS service
const { MockVISService } = require('./dist/services/mock-vis.service.js');

async function testMockService() {
  console.log('Testing Mock VIS Service...\n');
  
  const mockService = new MockVISService();
  
  try {
    // Test health check
    console.log('1. Health Check:');
    const health = await mockService.healthCheck();
    console.log(JSON.stringify(health, null, 2));
    
    // Test tournament count
    console.log('\n2. Tournament Count:');
    const count = await mockService.getTournamentCount();
    console.log(`Total tournaments: ${count}`);
    
    // Test get tournaments
    console.log('\n3. Get Tournaments:');
    const tournaments = await mockService.getTournaments();
    console.log(`Found ${tournaments.length} tournaments:`);
    tournaments.forEach(t => {
      console.log(`- ${t.name} (${t.location.city}, ${t.location.country})`);
    });
    
    // Test get tournament by ID
    console.log('\n4. Get Tournament by ID:');
    const tournament = await mockService.getTournamentById('mock-001');
    console.log(`Tournament: ${tournament?.name}`);
    console.log(`Description: ${tournament?.description}`);
    
    // Test get tournament matches
    console.log('\n5. Get Tournament Matches:');
    const matches = await mockService.getTournamentMatches('mock-001');
    console.log(`Found ${matches.length} matches for tournament mock-001:`);
    matches.forEach(m => {
      console.log(`- ${m.teams.team1.player1}/${m.teams.team1.player2} vs ${m.teams.team2.player1}/${m.teams.team2.player2} (${m.status})`);
    });
    
    console.log('\n✅ All mock service tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMockService();