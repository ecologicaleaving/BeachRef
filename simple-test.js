// Simple inline test - copy and paste this directly in console

// Test GetBeachTournament with EventNo 1602
(async () => {
  console.log('🏐 Testing GetBeachTournament with EventNo 1602...');
  
  const xmlRequest = `<Request Type="GetBeachTournament" No="1602" Fields="No Code Name" />`;
  console.log('📋 Request:', xmlRequest);
  
  try {
    const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `Request=${encodeURIComponent(xmlRequest)}`
    });
    
    const responseText = await response.text();
    console.log('📊 Size:', (responseText.length / 1024).toFixed(2) + 'KB');
    console.log('📄 Response:', responseText);
    
    // Extract tournament number
    const match = responseText.match(/<BeachTournament[^>]*\sNo="([^"]*)"[^>]*>/);
    if (match) {
      console.log('✅ Real Tournament Number:', match[1]);
      
      // Now test GetBeachMatchList with this real number
      const realNo = match[1];
      console.log('\n🏐 Testing GetBeachMatchList with real number:', realNo);
      
      const matchRequest = `<Request Type="GetBeachMatchList" Fields="No LocalDate LocalTime TeamAName TeamBName">
  <Filter TournamentNo="${realNo}" />
</Request>`;
      
      const matchResponse = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `Request=${encodeURIComponent(matchRequest)}`
      });
      
      const matchText = await matchResponse.text();
      const matchCount = (matchText.match(/<BeachMatch/g) || []).length;
      
      console.log('📊 Match Results:');
      console.log('- Size:', (matchText.length / 1024 / 1024).toFixed(2) + 'MB');
      console.log('- Matches:', matchCount);
      console.log('- Sample:', matchText.substring(0, 1000));
      
      if (matchText.length > 1000000) {
        console.log('❌ Still too big!');
      } else {
        console.log('✅ Size looks good!');
      }
      
    } else {
      console.log('❌ No tournament number found in response');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();