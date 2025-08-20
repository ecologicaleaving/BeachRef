// Search for Baden tournaments in 2025 EventList
const VIS_BASE_URL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';

async function searchBadenTournaments2025() {
  try {
    console.log('🔍 Searching for Baden tournaments in 2025...');
    
    const eventListRequest = `<Requests>
  <Request Type='GetEventList' Fields='Name StartDate EndDate Code AuxiliaryPersons OfficialFunctions HasVolleyTournament HasBeachTournament'>
    <Filter FirstDate='2025-01-01' LastDate='2025-12-31' HasBeachTournament='1' />
  </Request>
</Requests>`;

    const eventListUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(eventListRequest)}`;
    
    const response = await fetch(eventListUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
        'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
      },
    });
    
    if (!response.ok) {
      console.error(`Request failed: ${response.status}`);
      return;
    }
    
    const xmlText = await response.text();
    console.log(`✅ Got ${xmlText.length} characters from EventList`);
    
    // Search for Baden in tournament names
    const eventMatches = xmlText.match(/<Event[^>]*\/>/g);
    if (!eventMatches) {
      console.error('No Event elements found');
      return;
    }
    
    console.log(`📊 Found ${eventMatches.length} tournaments, searching for "Baden"...`);
    
    const badenTournaments = [];
    
    eventMatches.forEach(eventXml => {
      const extractAttribute = (attr) => {
        const match = eventXml.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
        return match ? match[1] : '';
      };
      
      const name = extractAttribute('Name');
      const code = extractAttribute('Code');
      const no = extractAttribute('No');
      const startDate = extractAttribute('StartDate');
      const endDate = extractAttribute('EndDate');
      
      // Check if this contains "Baden"
      if (name.toLowerCase().includes('baden') || code.toLowerCase().includes('baden')) {
        badenTournaments.push({
          No: no,
          Name: name,
          Code: code,
          StartDate: startDate,
          EndDate: endDate,
          rawXml: eventXml
        });
      }
    });
    
    if (badenTournaments.length === 0) {
      console.log('\n❌ No Baden tournaments found in 2025');
      
      // Show some sample tournament names to help identify what we're looking for
      console.log('\n📋 Sample tournament names found in 2025:');
      eventMatches.slice(0, 15).forEach((event, index) => {
        const name = (event.match(/Name="([^"]*)"/i) || ['', 'N/A'])[1];
        const code = (event.match(/Code="([^"]*)"/i) || ['', 'N/A'])[1];
        const startDate = (event.match(/StartDate="([^"]*)"/i) || ['', 'N/A'])[1];
        console.log(`   ${index + 1}. ${code} - ${name} (${startDate})`);
      });
      
      return;
    }
    
    console.log(`\n🎯 FOUND ${badenTournaments.length} BADEN TOURNAMENT(S) IN 2025:`);
    console.log('='.repeat(60));
    
    badenTournaments.forEach((tournament, index) => {
      console.log(`\n${index + 1}. ${tournament.Name}`);
      console.log(`   No: ${tournament.No}`);
      console.log(`   Code: ${tournament.Code}`);
      console.log(`   Dates: ${tournament.StartDate} to ${tournament.EndDate}`);
      console.log(`   Raw: ${tournament.rawXml}`);
    });
    
    // If we found tournaments, let's get details for the first one
    if (badenTournaments.length > 0) {
      const firstTournament = badenTournaments[0];
      console.log(`\n🔍 Getting details for: ${firstTournament.Code} (No: ${firstTournament.No})`);
      await getEventListByNo(firstTournament.No);
    }
    
  } catch (error) {
    console.error('Error searching Baden tournaments:', error);
  }
}

async function getEventListByNo(tournamentNo) {
  try {
    console.log(`\n📋 Getting EventList for specific tournament No: ${tournamentNo}`);
    
    const eventListRequest = `<Requests>
  <Request Type='GetEventList' Fields='Name StartDate EndDate Code City Country CountryName Location Venue Address AuxiliaryPersons OfficialFunctions HasVolleyTournament HasBeachTournament'>
    <Filter No='${tournamentNo}' HasBeachTournament='1' />
  </Request>
</Requests>`;

    console.log('Request:', eventListRequest);
    
    const eventListUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(eventListRequest)}`;
    
    const response = await fetch(eventListUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
        'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
      },
    });
    
    if (!response.ok) {
      console.error(`GetEventList by No failed: ${response.status}`);
      return;
    }
    
    const xmlText = await response.text();
    console.log(`✅ Response: ${xmlText.length} characters`);
    
    // Check if we get our specific tournament or all tournaments (known issue)
    const eventMatches = xmlText.match(/<Event[^>]*\/>/g);
    if (eventMatches) {
      console.log(`📊 Response contains ${eventMatches.length} events`);
      
      // Try to find our specific tournament
      const targetEvent = eventMatches.find(event => event.includes(`No="${tournamentNo}"`));
      if (targetEvent) {
        console.log(`\n🎯 Found target tournament:`);
        console.log(targetEvent);
        
        // Check for location data
        const locationFields = ['City', 'Country', 'CountryName', 'Location', 'Venue', 'Address'];
        const foundLocation = [];
        
        locationFields.forEach(field => {
          const regex = new RegExp(`${field}="([^"]*)"`, 'i');
          const match = targetEvent.match(regex);
          if (match && match[1].trim()) {
            foundLocation.push(`${field}: "${match[1]}"`);
          }
        });
        
        if (foundLocation.length > 0) {
          console.log(`\n🏠 Location data found:`);
          foundLocation.forEach(loc => console.log(`   ${loc}`));
        } else {
          console.log(`\n❌ No location data found in EventList response`);
        }
        
      } else {
        console.log(`\n❌ Target tournament No=${tournamentNo} not found in response (API returns all)`);
      }
    }
    
  } catch (error) {
    console.error('Error getting EventList by No:', error);
  }
}

// Execute search
searchBadenTournaments2025();