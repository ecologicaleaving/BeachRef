// Try to get venue data for Baden tournament
const VIS_BASE_URL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';

async function getVenueData() {
  try {
    console.log('🏟️ TESTING VENUE DATA RETRIEVAL FOR BADEN TOURNAMENT');
    console.log('='.repeat(60));
    
    // We know Baden tournament details:
    const badenTournamentNo8371 = '8371'; // From GetBeachTournamentList
    const badenTournamentNo1601 = '1601'; // From GetEventList
    
    console.log(`🎯 Baden Tournament Numbers:`);
    console.log(`   From GetBeachTournamentList: No=${badenTournamentNo8371} (WBAD2025)`);
    console.log(`   From GetEventList: No=${badenTournamentNo1601} (BVB-BAD2025)`);
    
    // Method 1: Try GetEventVenueList
    console.log('\n🧪 Method 1: GetEventVenueList...');
    await testGetEventVenueList(badenTournamentNo8371);
    await testGetEventVenueList(badenTournamentNo1601);
    
    // Method 2: Try GetVenueList (general venue list)
    console.log('\n🧪 Method 2: GetVenueList...');
    await testGetVenueList();
    
    // Method 3: Try GetBeachEvent with venue fields
    console.log('\n🧪 Method 3: GetBeachEvent with venue fields...');
    await testGetBeachEvent(badenTournamentNo8371);
    await testGetBeachEvent(badenTournamentNo1601);
    
    // Method 4: Try GetBeachMatchList for venue in matches
    console.log('\n🧪 Method 4: GetBeachMatchList venue data...');
    await testGetBeachMatchListVenue(badenTournamentNo8371);
    await testGetBeachMatchListVenue(badenTournamentNo1601);
    
  } catch (error) {
    console.error('Error getting venue data:', error);
  }
}

async function testGetEventVenueList(tournamentNo) {
  try {
    console.log(`\n   📍 GetEventVenueList for tournament No=${tournamentNo}:`);
    
    const request = `<Request Type='GetEventVenueList' NoEvent='${tournamentNo}' />`;
    const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(request)}`;
    
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
        'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
      },
    });
    
    if (response.ok) {
      const xmlText = await response.text();
      console.log(`      ✅ Response: ${xmlText.length} chars`);
      
      // Look for venue data
      const venueMatches = xmlText.match(/<Venue[^>]*>/g);
      if (venueMatches && venueMatches.length > 0) {
        console.log(`      🏟️ Found ${venueMatches.length} venues:`);
        venueMatches.slice(0, 3).forEach((venue, index) => {
          console.log(`         ${index + 1}. ${venue.substring(0, 100)}...`);
        });
      } else {
        console.log(`      ❌ No venue data found`);
      }
    } else {
      console.log(`      ❌ Failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
  }
}

async function testGetVenueList() {
  try {
    console.log(`\n   📍 GetVenueList (general venues):`);
    
    // Try with country filter for Austria
    const request = `<Request Type='GetVenueList' Country='AT' />`;
    const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(request)}`;
    
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
        'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
      },
    });
    
    if (response.ok) {
      const xmlText = await response.text();
      console.log(`      ✅ Response: ${xmlText.length} chars`);
      
      // Look for Austrian venues
      const venueMatches = xmlText.match(/<Venue[^>]*>/g);
      if (venueMatches && venueMatches.length > 0) {
        console.log(`      🇦🇹 Found ${venueMatches.length} Austrian venues:`);
        
        // Look specifically for venues that might contain "Baden"
        const badenVenues = venueMatches.filter(venue => 
          venue.toLowerCase().includes('baden')
        );
        
        if (badenVenues.length > 0) {
          console.log(`      🎯 Baden-related venues:`);
          badenVenues.forEach((venue, index) => {
            console.log(`         ${index + 1}. ${venue}`);
          });
        } else {
          console.log(`      ❌ No Baden-related venues found`);
          console.log(`      📋 Sample Austrian venues:`);
          venueMatches.slice(0, 5).forEach((venue, index) => {
            console.log(`         ${index + 1}. ${venue.substring(0, 150)}...`);
          });
        }
      } else {
        console.log(`      ❌ No venue data found`);
      }
    } else {
      console.log(`      ❌ Failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
  }
}

async function testGetBeachEvent(tournamentNo) {
  try {
    console.log(`\n   📍 GetBeachEvent with venue fields for No=${tournamentNo}:`);
    
    const request = `<Request Type='GetBeachEvent' Fields='No Name Location City Country Venue Address' No='${tournamentNo}' />`;
    const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(request)}`;
    
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
        'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
      },
    });
    
    if (response.ok) {
      const xmlText = await response.text();
      console.log(`      ✅ Response: ${xmlText.length} chars`);
      
      if (xmlText.length > 10) {
        // Check for location data
        const locationFields = ['Location', 'City', 'Country', 'Venue', 'Address'];
        const foundLocation = [];
        
        locationFields.forEach(field => {
          const regex = new RegExp(`${field}="([^"]*)"`, 'i');
          const match = xmlText.match(regex);
          if (match && match[1].trim()) {
            foundLocation.push(`${field}: "${match[1]}"`);
          }
        });
        
        if (foundLocation.length > 0) {
          console.log(`      🏠 Location data found:`);
          foundLocation.forEach(loc => console.log(`         ${loc}`));
        } else {
          console.log(`      ❌ No location data in response`);
        }
        
        console.log(`      📄 Full response: ${xmlText.substring(0, 200)}...`);
      } else {
        console.log(`      ❌ Empty response`);
      }
    } else {
      console.log(`      ❌ Failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
  }
}

async function testGetBeachMatchListVenue(tournamentNo) {
  try {
    console.log(`\n   📍 GetBeachMatchList venue data for No=${tournamentNo}:`);
    
    const fields = 'No TeamAName TeamBName Court Venue Location Address City Country';
    const request = `<Request Type='GetBeachMatchList' Fields='${fields}'><Filter NoTournament='${tournamentNo}' /></Request>`;
    const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(request)}`;
    
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
        'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
      },
    });
    
    if (response.ok) {
      const xmlText = await response.text();
      const matchMatches = xmlText.match(/<BeachMatch[^>]*\/>/g);
      
      if (matchMatches && matchMatches.length > 0) {
        console.log(`      ✅ Found ${matchMatches.length} matches`);
        
        // Check first few matches for venue data
        const firstMatch = matchMatches[0];
        const venueFields = ['Court', 'Venue', 'Location', 'Address', 'City', 'Country'];
        const foundVenue = [];
        
        venueFields.forEach(field => {
          const regex = new RegExp(`${field}="([^"]*)"`, 'i');
          const match = firstMatch.match(regex);
          if (match && match[1].trim()) {
            foundVenue.push(`${field}: "${match[1]}"`);
          }
        });
        
        if (foundVenue.length > 0) {
          console.log(`      🏟️ Venue data in matches:`);
          foundVenue.forEach(venue => console.log(`         ${venue}`));
        } else {
          console.log(`      ❌ No venue data in matches`);
        }
        
        console.log(`      📋 Sample match: ${firstMatch.substring(0, 100)}...`);
      } else {
        console.log(`      ❌ No matches found`);
      }
    } else {
      console.log(`      ❌ Failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`      ❌ Error: ${error.message}`);
  }
}

// Execute
getVenueData();