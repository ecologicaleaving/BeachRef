// Check what data is available from GetBeachTournamentList for Baden tournament
const VIS_BASE_URL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';

async function checkTournamentListData() {
  try {
    console.log('🔍 Getting tournament data from GetBeachTournamentList...');
    
    // Use GetBeachTournamentList with all possible fields
    const xmlRequest = `<Request Type='GetBeachTournamentList' Fields='No Code Name Title StartDate EndDate Location City Country CountryName CountryCode Venue Address Status Version HasEntryList HasMatchList HasPlayerList HasTeamList' />`;
    
    console.log('📋 Request with all fields:');
    console.log(xmlRequest);
    
    const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
    
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
    console.log(`✅ Got ${xmlText.length} characters from GetBeachTournamentList`);
    
    // Find Baden tournament
    const tournamentMatches = xmlText.match(/<BeachTournament[^>]*\/>/g);
    if (!tournamentMatches) {
      console.error('No BeachTournament elements found');
      return;
    }
    
    console.log(`📊 Found ${tournamentMatches.length} tournaments, searching for Baden...`);
    
    let badenTournament = null;
    
    tournamentMatches.forEach(tournamentXml => {
      const extractAttribute = (attr) => {
        const match = tournamentXml.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
        return match ? match[1] : '';
      };
      
      const name = extractAttribute('Name');
      const code = extractAttribute('Code');
      
      // Check if this is Baden tournament
      if (name.toLowerCase().includes('baden') || code.toLowerCase().includes('bad')) {
        badenTournament = {
          xml: tournamentXml,
          extracted: {}
        };
        
        // Extract all attributes
        const allFields = [
          'No', 'Code', 'Name', 'Title', 'StartDate', 'EndDate', 
          'Location', 'City', 'Country', 'CountryName', 'CountryCode',
          'Venue', 'Address', 'Status', 'Version', 
          'HasEntryList', 'HasMatchList', 'HasPlayerList', 'HasTeamList'
        ];
        
        allFields.forEach(field => {
          badenTournament.extracted[field] = extractAttribute(field);
        });
      }
    });
    
    if (!badenTournament) {
      console.log('\n❌ No Baden tournament found in GetBeachTournamentList');
      
      // Show some sample tournaments
      console.log('\n📋 Sample tournaments found:');
      tournamentMatches.slice(0, 10).forEach((tournament, index) => {
        const name = (tournament.match(/Name="([^"]*)"/i) || ['', 'N/A'])[1];
        const code = (tournament.match(/Code="([^"]*)"/i) || ['', 'N/A'])[1];
        console.log(`   ${index + 1}. ${code} - ${name}`);
      });
      
      return;
    }
    
    console.log('\n🎯 BADEN TOURNAMENT DATA FROM GetBeachTournamentList:');
    console.log('='.repeat(60));
    
    // Display all extracted data
    Object.entries(badenTournament.extracted).forEach(([field, value]) => {
      const displayValue = value || '(empty)';
      const status = value ? '✅' : '❌';
      console.log(`${status} ${field}: ${displayValue}`);
    });
    
    console.log('\n🔧 Raw XML:');
    console.log(badenTournament.xml);
    
    // Summary of available data
    const availableFields = Object.entries(badenTournament.extracted)
      .filter(([field, value]) => value && value.trim())
      .map(([field]) => field);
      
    const emptyFields = Object.entries(badenTournament.extracted)
      .filter(([field, value]) => !value || !value.trim())
      .map(([field]) => field);
    
    console.log('\n📈 SUMMARY:');
    console.log(`✅ Available fields (${availableFields.length}): ${availableFields.join(', ')}`);
    console.log(`❌ Empty fields (${emptyFields.length}): ${emptyFields.join(', ')}`);
    
    // Check for specific location fields
    const locationFields = ['Location', 'City', 'Country', 'CountryName', 'CountryCode', 'Venue', 'Address'];
    const foundLocationFields = locationFields.filter(field => 
      badenTournament.extracted[field] && badenTournament.extracted[field].trim()
    );
    
    console.log('\n🏠 LOCATION DATA ANALYSIS:');
    if (foundLocationFields.length > 0) {
      console.log('✅ Location fields found:');
      foundLocationFields.forEach(field => {
        console.log(`   ${field}: "${badenTournament.extracted[field]}"`);
      });
    } else {
      console.log('❌ NO location data available in GetBeachTournamentList');
    }
    
  } catch (error) {
    console.error('Error checking tournament list data:', error);
  }
}

// Execute
checkTournamentListData();