// Find Baden 2025 tournament in the cache data
const VIS_BASE_URL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';

async function findBaden2025InCache() {
  try {
    console.log('🔍 SEARCHING FOR BADEN 2025 IN TOURNAMENT CACHE');
    console.log('='.repeat(60));
    
    // Get tournament list
    const fields = 'No Code CountryCode StartDateQualification Name StartDate EndDate';
    const xmlRequest = `<Request Type="GetBeachTournamentList" Fields="${fields}" />`;
    const encodedRequest = encodeURIComponent(xmlRequest);
    const requestUrl = `${VIS_BASE_URL}?Request=${encodedRequest}`;
    
    const response = await fetch(requestUrl, {
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
    const tournamentMatches = xmlText.match(/<BeachTournament[^>]*\/>/g);
    
    if (!tournamentMatches) {
      console.error('No tournaments found');
      return;
    }
    
    console.log(`📊 Analyzing ${tournamentMatches.length} tournaments for Baden 2025...`);
    
    // Search for Baden tournaments
    const badenTournaments = [];
    const badenRelatedTournaments = [];
    
    tournamentMatches.forEach(tournamentXml => {
      const extractAttr = (attr) => {
        const match = tournamentXml.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
        return match ? match[1] : '';
      };
      
      const no = extractAttr('No');
      const code = extractAttr('Code');
      const name = extractAttr('Name');
      const countryCode = extractAttr('CountryCode');
      const startDate = extractAttr('StartDate');
      const startDateQualification = extractAttr('StartDateQualification');
      const endDate = extractAttr('EndDate');
      
      // Check for Baden in name or code
      if (name.toLowerCase().includes('baden') || code.toLowerCase().includes('baden') || code.toLowerCase().includes('bad')) {
        badenTournaments.push({
          No: no,
          Code: code,
          Name: name,
          CountryCode: countryCode,
          StartDate: startDate,
          StartDateQualification: startDateQualification,
          EndDate: endDate,
          xml: tournamentXml
        });
      }
      
      // Also check for Austrian tournaments in 2025
      if (countryCode === 'AT' && (startDate?.includes('2025') || startDateQualification?.includes('2025'))) {
        badenRelatedTournaments.push({
          No: no,
          Code: code,
          Name: name,
          CountryCode: countryCode,
          StartDate: startDate,
          StartDateQualification: startDateQualification,
          EndDate: endDate
        });
      }
    });
    
    console.log('\n🎯 BADEN TOURNAMENTS FOUND:');
    console.log('='.repeat(40));
    
    if (badenTournaments.length > 0) {
      badenTournaments.forEach((tournament, index) => {
        const year = tournament.StartDate?.substring(0, 4) || tournament.StartDateQualification?.substring(0, 4) || 'Unknown';
        console.log(`\n${index + 1}. ${tournament.Name}`);
        console.log(`   No: ${tournament.No}`);
        console.log(`   Code: ${tournament.Code}`);
        console.log(`   Country: ${tournament.CountryCode}`);
        console.log(`   Year: ${year}`);
        console.log(`   StartDate: ${tournament.StartDate || 'N/A'}`);
        console.log(`   StartDateQualification: ${tournament.StartDateQualification || 'N/A'}`);
        console.log(`   EndDate: ${tournament.EndDate || 'N/A'}`);
      });
      
      // Find 2025 Baden tournaments
      const baden2025 = badenTournaments.filter(t => 
        t.StartDate?.includes('2025') || t.StartDateQualification?.includes('2025')
      );
      
      if (baden2025.length > 0) {
        console.log('\n🏆 BADEN 2025 TOURNAMENTS:');
        baden2025.forEach((tournament, index) => {
          console.log(`\n🎯 ${index + 1}. ${tournament.Name}`);
          console.log(`   No: ${tournament.No} ← Use this for GetBeachTournament`);
          console.log(`   Code: ${tournament.Code}`);
          console.log(`   Dates: ${tournament.StartDate} to ${tournament.EndDate}`);
          
          // Test detailed retrieval
          console.log('   🔍 Testing detailed retrieval...');
          testDetailedRetrieval(tournament.No);
        });
      } else {
        console.log('\n❌ No Baden 2025 tournaments found');
      }
    } else {
      console.log('❌ No Baden tournaments found');
    }
    
    console.log('\n🇦🇹 AUSTRIAN 2025 TOURNAMENTS (possible Baden):');
    console.log('='.repeat(50));
    
    if (badenRelatedTournaments.length > 0) {
      badenRelatedTournaments.slice(0, 10).forEach((tournament, index) => {
        console.log(`${index + 1}. ${tournament.Code} - ${tournament.Name}`);
        console.log(`   No: ${tournament.No} | Dates: ${tournament.StartDate || tournament.StartDateQualification || 'N/A'}`);
      });
      
      if (badenRelatedTournaments.length > 10) {
        console.log(`   ... and ${badenRelatedTournaments.length - 10} more Austrian 2025 tournaments`);
      }
    } else {
      console.log('❌ No Austrian 2025 tournaments found');
    }
    
  } catch (error) {
    console.error('Error finding Baden 2025:', error);
  }
}

async function testDetailedRetrieval(tournamentNo) {
  try {
    const xmlRequest = `<Request Type="GetBeachTournament" No="${tournamentNo}" />`;
    const encodedRequest = encodeURIComponent(xmlRequest);
    const requestUrl = `${VIS_BASE_URL}?Request=${encodedRequest}`;
    
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
        'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
      },
    });
    
    if (response.ok) {
      const xmlText = await response.text();
      if (xmlText.length > 100) {
        console.log(`   ✅ GetBeachTournament works (${xmlText.length} chars)`);
        
        // Extract key info
        const nameMatch = xmlText.match(/Name="([^"]*)"/);
        const titleMatch = xmlText.match(/Title="([^"]*)"/);
        const cityMatch = xmlText.match(/DefaultCity="([^"]*)"/);
        const venueMatch = xmlText.match(/DefaultVenue="([^"]*)"/);
        
        if (nameMatch) console.log(`   📍 Name: ${nameMatch[1]}`);
        if (titleMatch) console.log(`   🏆 Title: ${titleMatch[1]}`);
        if (cityMatch && cityMatch[1]) console.log(`   🏙️ City: ${cityMatch[1]}`);
        if (venueMatch && venueMatch[1]) console.log(`   🏟️ Venue: ${venueMatch[1]}`);
      } else {
        console.log(`   ❌ Empty response`);
      }
    } else if (response.status === 401) {
      console.log(`   🔐 Auth required (expected)`);
    } else {
      console.log(`   ❌ Failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

// Execute search
findBaden2025InCache();