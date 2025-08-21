/**
 * Test script for GetBeachTournament API call with EventNo 1602
 * Run this in browser console to see what GetBeachTournament returns
 */

async function testGetBeachTournament() {
  console.log('🏐 Testing GetBeachTournament API call with EventNo 1602...');
  
  const eventNo = '1602'; // The EventNo from GetEventList
  
  // XML request matching our code exactly
  const xmlRequest = `<Request Type="GetBeachTournament" No="${eventNo}" Fields="No Code Name" />`;

  console.log('📋 XML Request:', xmlRequest);
  
  try {
    // Make the API call directly
    const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `Request=${encodeURIComponent(xmlRequest)}`
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const responseText = await response.text();
    
    console.log('📊 GetBeachTournament Response Stats:');
    console.log('- Status:', response.status);
    console.log('- Size:', (responseText.length / 1024).toFixed(2) + 'KB');
    console.log('- Length:', responseText.length, 'characters');
    
    console.log('📄 Full Response:');
    console.log(responseText);
    
    // Try to extract the No attribute
    const tournamentNoMatch = responseText.match(/<BeachTournament[^>]*\sNo="([^"]*)"[^>]*>/);
    console.log('🔍 Tournament No extraction:');
    console.log('- Regex match:', tournamentNoMatch);
    
    if (tournamentNoMatch) {
      const realTournamentNo = tournamentNoMatch[1];
      console.log('✅ FOUND REAL TOURNAMENT NUMBER:', realTournamentNo);
      console.log('✅ EventNo 1602 → TournamentNo', realTournamentNo);
      
      // Test what happens if we use this number in GetBeachMatchList
      console.log('🧪 Now test GetBeachMatchList with this real tournament number!');
      console.log('🧪 Run: testGetBeachMatchListWithRealNumber("' + realTournamentNo + '")');
      
      return {
        success: true,
        eventNo: eventNo,
        realTournamentNo: realTournamentNo,
        responseText: responseText
      };
    } else {
      console.warn('⚠️ Could not extract No attribute from response');
      console.log('🔍 Looking for any BeachTournament tag:');
      const anyBeachTournament = responseText.match(/<BeachTournament[^>]*>/);
      console.log('- BeachTournament tag found:', anyBeachTournament);
      
      return {
        success: false,
        error: 'No tournament number found',
        responseText: responseText
      };
    }
    
  } catch (error) {
    console.error('❌ GetBeachTournament API call failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function testGetBeachMatchListWithRealNumber(realTournamentNo) {
  console.log('🏐 Testing GetBeachMatchList with REAL tournament number:', realTournamentNo);
  
  // Minimal XML request for GetBeachMatchList
  const xmlRequest = `<Request Type="GetBeachMatchList" Fields="No LocalDate LocalTime Status TeamAName TeamBName">
  <Filter TournamentNo="${realTournamentNo}" />
</Request>`;

  console.log('📋 XML Request:', xmlRequest);
  
  try {
    const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `Request=${encodeURIComponent(xmlRequest)}`
    });
    
    const responseText = await response.text();
    const matchCount = (responseText.match(/<BeachMatch/g) || []).length;
    
    console.log('📊 GetBeachMatchList Results with REAL TournamentNo:');
    console.log('- Size:', (responseText.length / 1024 / 1024).toFixed(2) + 'MB');
    console.log('- Match count:', matchCount);
    console.log('- Expected: ~160 matches, ~100KB');
    
    if (responseText.length > 1000000) { // > 1MB
      console.log('⚠️ Still too big! Something is wrong with the tournament number or API');
    } else {
      console.log('✅ Response size looks reasonable!');
    }
    
    console.log('📄 Response Sample (first 1000 chars):');
    console.log(responseText.substring(0, 1000));
    
    return {
      success: true,
      tournamentNo: realTournamentNo,
      sizeMB: (responseText.length / 1024 / 1024).toFixed(2),
      matchCount: matchCount,
      responseText: responseText
    };
    
  } catch (error) {
    console.error('❌ GetBeachMatchList with real tournament number failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function testBothCalls() {
  console.log('🧪 Testing complete flow: GetBeachTournament → GetBeachMatchList');
  
  // Step 1: Get real tournament number
  const tournamentResult = await testGetBeachTournament();
  
  if (tournamentResult.success && tournamentResult.realTournamentNo) {
    console.log('\n--- Step 2: Testing GetBeachMatchList with real tournament number ---');
    
    // Step 2: Use real tournament number for GetBeachMatchList
    const matchResult = await testGetBeachMatchListWithRealNumber(tournamentResult.realTournamentNo);
    
    console.log('\n=== FINAL COMPARISON ===');
    console.log('EventNo 1602 → TournamentNo', tournamentResult.realTournamentNo);
    
    if (matchResult.success) {
      console.log('Match data size:', matchResult.sizeMB + 'MB');
      console.log('Match count:', matchResult.matchCount);
      
      if (parseFloat(matchResult.sizeMB) < 1.0) {
        console.log('✅ SUCCESS! Response size is reasonable');
      } else {
        console.log('❌ STILL TOO BIG! Even with real tournament number');
      }
    }
    
  } else {
    console.log('❌ Could not get real tournament number, cannot test GetBeachMatchList');
  }
}

// Export functions for console use
window.testGetBeachTournament = testGetBeachTournament;
window.testGetBeachMatchListWithRealNumber = testGetBeachMatchListWithRealNumber;
window.testBothCalls = testBothCalls;

console.log(`
🏐 GetBeachTournament Test Scripts Loaded!

Run these in console:
- testGetBeachTournament()                                // Get real tournament number from EventNo 1602
- testGetBeachMatchListWithRealNumber("REAL_NUMBER")     // Test with extracted real tournament number
- testBothCalls()                                        // Run complete flow automatically

This will show you:
1. What GetBeachTournament returns for EventNo 1602
2. What the real tournament number is
3. If GetBeachMatchList with real tournament number is smaller
`);