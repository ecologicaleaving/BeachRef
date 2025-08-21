/**
 * Test script to get match list from tournament ID 8368
 * This should be much smaller than using EventNo 1602
 */

// Simple one-liner test
fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
  method: 'POST',
  headers: {'Content-Type': 'application/x-www-form-urlencoded'},
  body: 'Request=' + encodeURIComponent('<Request Type="GetBeachMatchList" Fields="No LocalDate LocalTime Status TeamAName TeamBName Court"><Filter TournamentNo="8368" /></Request>')
}).then(r => r.text()).then(t => {
  const matches = (t.match(/<BeachMatch/g) || []).length;
  console.log('🏐 Tournament 8368 Results:');
  console.log('📊 Size:', (t.length/1024/1024).toFixed(2) + 'MB');
  console.log('📊 Matches:', matches);
  console.log('📄 Sample:', t.substring(0, 1000));
  if (t.length < 1000000) console.log('✅ SUCCESS! Reasonable size!');
  else console.log('❌ Still too big!');
});

// More detailed version
async function testTournament8368() {
  console.log('🏐 Testing GetBeachMatchList with Tournament ID 8368...');
  
  const xmlRequest = `<Request Type="GetBeachMatchList" Fields="No LocalDate LocalTime Status TeamAName TeamBName Court RoundName">
  <Filter TournamentNo="8368" IncludeResults="true" IncludeReferees="false" />
</Request>`;

  console.log('📋 XML Request:', xmlRequest);
  
  try {
    const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: `Request=${encodeURIComponent(xmlRequest)}`
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const responseText = await response.text();
    const matchCount = (responseText.match(/<BeachMatch/g) || []).length;
    
    console.log('📊 Tournament 8368 Match List Results:');
    console.log('- Status:', response.status);
    console.log('- Size:', (responseText.length / 1024 / 1024).toFixed(2) + 'MB');
    console.log('- Character count:', responseText.length.toLocaleString());
    console.log('- Match count:', matchCount);
    
    if (responseText.length > 1000000) { // > 1MB
      console.log('⚠️ Response is still large! Analyzing...');
      
      // Check for common bloat causes
      const attributes = responseText.match(/\w+="[^"]*"/g) || [];
      console.log('- Total attributes:', attributes.length.toLocaleString());
      
      const longAttributes = attributes.filter(attr => attr.length > 100);
      if (longAttributes.length > 0) {
        console.log('- Long attributes (>100 chars):', longAttributes.length);
        console.log('- Sample long attribute:', longAttributes[0]);
      }
    } else {
      console.log('✅ Response size looks reasonable!');
    }
    
    console.log('📄 Response sample (first 1000 chars):');
    console.log(responseText.substring(0, 1000));
    
    // Extract some sample matches
    const beachMatches = responseText.match(/<BeachMatch[^>]*>/g) || [];
    if (beachMatches.length > 0) {
      console.log('🏐 Sample matches (first 3):');
      beachMatches.slice(0, 3).forEach((match, i) => {
        console.log(`${i + 1}.`, match);
      });
    }
    
    return {
      success: true,
      tournamentNo: '8368',
      sizeMB: (responseText.length / 1024 / 1024).toFixed(2),
      sizeKB: (responseText.length / 1024).toFixed(2),
      matchCount: matchCount,
      responseLength: responseText.length,
      responseText: responseText
    };
    
  } catch (error) {
    console.error('❌ Tournament 8368 test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Compare with EventNo 1602 (the problematic one)
async function compareTournamentSizes() {
  console.log('🧪 Comparing EventNo 1602 vs TournamentNo 8368...\n');
  
  // Test 1: EventNo 1602 (should be huge)
  console.log('--- Test 1: EventNo 1602 (problematic) ---');
  try {
    const eventResponse = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: 'Request=' + encodeURIComponent('<Request Type="GetBeachMatchList" Fields="No LocalDate LocalTime Status TeamAName TeamBName"><Filter TournamentNo="1602" /></Request>')
    });
    const eventText = await eventResponse.text();
    const eventMatches = (eventText.match(/<BeachMatch/g) || []).length;
    
    console.log('EventNo 1602 results:');
    console.log('- Size:', (eventText.length / 1024 / 1024).toFixed(2) + 'MB');
    console.log('- Matches:', eventMatches);
  } catch (error) {
    console.log('EventNo 1602 failed:', error.message);
  }
  
  // Small delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: TournamentNo 8368 (should be reasonable)
  console.log('\n--- Test 2: TournamentNo 8368 (should be better) ---');
  const tournamentResult = await testTournament8368();
  
  console.log('\n=== COMPARISON SUMMARY ===');
  console.log('Expected: TournamentNo 8368 should be much smaller than EventNo 1602');
  
  return tournamentResult;
}

// Export functions for console use
if (typeof window !== 'undefined') {
  window.testTournament8368 = testTournament8368;
  window.compareTournamentSizes = compareTournamentSizes;
}

console.log(`
🏐 Tournament 8368 Test Scripts Loaded!

Quick test (copy and paste):
fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'Request='+encodeURIComponent('<Request Type="GetBeachMatchList" Fields="No LocalDate LocalTime TeamAName TeamBName"><Filter TournamentNo="8368" /></Request>')}).then(r=>r.text()).then(t=>{const m=(t.match(/<BeachMatch/g)||[]).length;console.log('Size:',(t.length/1024/1024).toFixed(2)+'MB','Matches:',m);})

Or run detailed tests:
- testTournament8368()        // Detailed analysis of tournament 8368
- compareTournamentSizes()    // Compare EventNo 1602 vs TournamentNo 8368
`);