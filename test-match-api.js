/**
 * Test script for GetBeachMatchList API call
 * Run this in browser console to debug the 51MB response issue
 */

async function testGetBeachMatchList() {
  console.log('🏐 Testing GetBeachMatchList API call...');
  
  // Replace with actual tournament number from your tournament selection
  const tournamentNo = '503'; // Change this to the tournament you're testing
  
  // Minimal XML request matching documentation exactly
  const xmlRequest = `<Request Type="GetBeachMatchList" Fields="No NoInTournament LocalDate LocalTime Status Court TeamAName TeamBName">
  <Filter TournamentNo="${tournamentNo}" IncludeResults="true" IncludeReferees="false" />
</Request>`;

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
    
    console.log('📊 Response Stats:');
    console.log('- Status:', response.status);
    console.log('- Size:', (responseText.length / 1024 / 1024).toFixed(2) + 'MB');
    console.log('- Length:', responseText.length, 'characters');
    
    // Count actual matches
    const matchCount = (responseText.match(/<BeachMatch/g) || []).length;
    console.log('- Match count:', matchCount);
    
    // Show first 2000 characters to see what we're getting
    console.log('📄 Response Sample (first 2000 chars):');
    console.log(responseText.substring(0, 2000));
    
    // If still huge, let's see what's taking up space
    if (responseText.length > 1000000) { // > 1MB
      console.log('⚠️ Response is huge! Analyzing content...');
      
      // Look for patterns that might be causing bloat
      const soapEnvelope = responseText.match(/<soap:Envelope[\s\S]*<\/soap:Envelope>/);
      if (soapEnvelope) {
        console.log('- SOAP envelope size:', (soapEnvelope[0].length / 1024).toFixed(2) + 'KB');
      }
      
      // Check for repeated patterns
      const beachMatches = responseText.match(/<BeachMatches[\s\S]*<\/BeachMatches>/);
      if (beachMatches) {
        console.log('- BeachMatches content size:', (beachMatches[0].length / 1024 / 1024).toFixed(2) + 'MB');
      }
      
      // Look for any obvious bloat patterns
      const attributeMatches = responseText.match(/\w+="[^"]*"/g) || [];
      console.log('- Total attributes found:', attributeMatches.length);
      
      // Check for long attribute values
      const longAttributes = attributeMatches.filter(attr => attr.length > 100);
      if (longAttributes.length > 0) {
        console.log('- Long attributes (>100 chars):', longAttributes.length);
        console.log('- Sample long attribute:', longAttributes[0]);
      }
    }
    
    return {
      success: true,
      size: responseText.length,
      sizeMB: (responseText.length / 1024 / 1024).toFixed(2),
      matchCount: matchCount,
      responseText: responseText
    };
    
  } catch (error) {
    console.error('❌ API call failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test with different tournament numbers
async function testMultipleTournaments() {
  console.log('🧪 Testing multiple tournament numbers...');
  
  // Test with a few different tournament numbers
  const tournamentNumbers = ['503', '504', '505'];
  
  for (const tournamentNo of tournamentNumbers) {
    console.log(`\n--- Testing Tournament ${tournamentNo} ---`);
    const result = await testGetBeachMatchList();
    
    if (result.success) {
      console.log(`Tournament ${tournamentNo}: ${result.matchCount} matches, ${result.sizeMB}MB`);
    } else {
      console.log(`Tournament ${tournamentNo}: FAILED - ${result.error}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Test with absolutely minimal request
async function testMinimalRequest() {
  console.log('🔬 Testing absolutely minimal request...');
  
  const tournamentNo = '503'; // Change this
  
  // Absolutely minimal fields
  const xmlRequest = `<Request Type="GetBeachMatchList" Fields="No">
  <Filter TournamentNo="${tournamentNo}" />
</Request>`;

  console.log('📋 Minimal XML Request:', xmlRequest);
  
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
    
    console.log('📊 Minimal Request Results:');
    console.log('- Size:', (responseText.length / 1024 / 1024).toFixed(2) + 'MB');
    console.log('- Match count:', matchCount);
    console.log('- First 1000 chars:', responseText.substring(0, 1000));
    
    return { size: responseText.length, matchCount };
    
  } catch (error) {
    console.error('❌ Minimal request failed:', error);
  }
}

// Export functions for console use
window.testGetBeachMatchList = testGetBeachMatchList;
window.testMultipleTournaments = testMultipleTournaments;
window.testMinimalRequest = testMinimalRequest;

console.log(`
🏐 GetBeachMatchList Test Scripts Loaded!

Run these in console:
- testGetBeachMatchList()     // Test single tournament
- testMultipleTournaments()   // Test multiple tournaments  
- testMinimalRequest()        // Test with minimal fields

Make sure to change the tournamentNo variable to match your tournament!
`);