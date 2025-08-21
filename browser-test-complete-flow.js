// Test complete flow: GetBeachTournament → GetBeachMatchList
async function testCompleteFlow() {
  var baseUrl = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';
  var eventNo = '1602'; // BPT Elite Montreal
  
  console.log('Testing complete flow for EventNo:', eventNo);
  
  // Step 1: Get BeachTournament details
  console.log('\nStep 1: Getting BeachTournament details...');
  var q = String.fromCharCode(34);
  var tournamentRequest = '<Request Type=' + q + 'GetBeachTournament' + q + ' Fields=' + q + 'No Name Code' + q + '>';
  tournamentRequest += '<Filter No=' + q + eventNo + q + ' /></Request>';
  
  try {
    var response1 = await fetch(baseUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: 'Request=' + encodeURIComponent(tournamentRequest)
    });
    
    var text1 = await response1.text();
    console.log('BeachTournament response length:', text1.length);
    console.log('BeachTournament response preview:', text1.substring(0, 500));
    
    // Extract tournament No from BeachTournament response
    var tournamentNoMatch = text1.match(/<BeachTournament[^>]*No="([^"]*)"[^>]*>/);
    if (tournamentNoMatch) {
      var actualTournamentNo = tournamentNoMatch[1];
      console.log('Found actual tournament No:', actualTournamentNo);
      
      // Step 2: Get matches using the actual tournament No
      console.log('\nStep 2: Getting matches for tournament No:', actualTournamentNo);
      
      var matchRequest = '<Request Type=' + q + 'GetBeachMatchList' + q + ' Fields=' + q + 'No LocalDate LocalTime Status Court TeamAName TeamBName' + q + '>';
      matchRequest += '<Filter TournamentNo=' + q + actualTournamentNo + q + ' /></Request>';
      
      var response2 = await fetch(baseUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: 'Request=' + encodeURIComponent(matchRequest)
      });
      
      var text2 = await response2.text();
      console.log('Match response length:', text2.length);
      console.log('Match response preview:', text2.substring(0, 500));
      
      if (text2.includes('<BeachMatch')) {
        var matchCount = (text2.match(/<BeachMatch/g) || []).length;
        console.log('SUCCESS! Found', matchCount, 'matches using complete flow');
        
        var firstMatch = text2.match(/<BeachMatch[^>]*>/);
        if (firstMatch) {
          console.log('First match:', firstMatch[0]);
        }
      } else {
        console.log('No matches found with complete flow');
      }
      
    } else {
      console.log('Could not extract tournament No from BeachTournament response');
      console.log('Full BeachTournament response:', text1);
    }
    
  } catch (error) {
    console.error('Error in complete flow test:', error);
  }
}

// Compare with direct approach
async function compareWithDirectApproach() {
  var baseUrl = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';
  var eventNo = '1602';
  
  console.log('\n=== COMPARISON: Direct approach (EventNo as TournamentNo) ===');
  
  var q = String.fromCharCode(34);
  var directRequest = '<Request Type=' + q + 'GetBeachMatchList' + q + ' Fields=' + q + 'No LocalDate LocalTime Status' + q + '>';
  directRequest += '<Filter TournamentNo=' + q + eventNo + q + ' /></Request>';
  
  try {
    var response = await fetch(baseUrl, {
      method: 'POST',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: 'Request=' + encodeURIComponent(directRequest)
    });
    
    var text = await response.text();
    console.log('Direct approach response length:', text.length);
    
    if (text.includes('<BeachMatch')) {
      var matchCount = (text.match(/<BeachMatch/g) || []).length;
      console.log('Direct approach found', matchCount, 'matches');
    } else {
      console.log('Direct approach found no matches');
    }
    
  } catch (error) {
    console.error('Error in direct approach:', error);
  }
}

// Run both tests
console.log('=== TESTING COMPLETE FLOW vs DIRECT APPROACH ===');
testCompleteFlow().then(() => {
  return compareWithDirectApproach();
}).then(() => {
  console.log('\n=== TESTS COMPLETED ===');
});