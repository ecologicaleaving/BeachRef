// Search for tournament by code in EventList and get detailed data
const VIS_BASE_URL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';

async function searchTournamentByCode(searchCode, year) {
  try {
    console.log(`🔍 Step 1: Searching for tournament code "${searchCode}" in ${year}...`);
    
    // Get all tournaments for the year using EventList
    const eventListRequest = `<Requests>
  <Request Type='GetEventList' Fields='Name StartDate EndDate Code AuxiliaryPersons OfficialFunctions HasVolleyTournament HasBeachTournament'>
    <Filter FirstDate='${year}-01-01' LastDate='${year}-12-31' HasBeachTournament='1' />
  </Request>
</Requests>`;

    console.log('📋 EventList Request:');
    console.log(eventListRequest);
    
    const eventListUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(eventListRequest)}`;
    
    const response = await fetch(eventListUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
        'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
      },
    });
    
    if (!response.ok) {
      console.error(`EventList request failed: ${response.status}`);
      return null;
    }
    
    const xmlText = await response.text();
    console.log(`✅ Got ${xmlText.length} characters from EventList`);
    
    // Search for tournament by code
    const eventMatches = xmlText.match(/<Event[^>]*\/>/g);
    if (!eventMatches) {
      console.error('No Event elements found');
      return null;
    }
    
    console.log(`📊 Found ${eventMatches.length} tournaments, searching for code "${searchCode}"...`);
    
    let foundTournament = null;
    
    eventMatches.forEach(eventXml => {
      const extractAttribute = (attr) => {
        const match = eventXml.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
        return match ? match[1] : '';
      };
      
      const code = extractAttribute('Code');
      const name = extractAttribute('Name');
      const no = extractAttribute('No');
      
      // Check if this matches our search code (case insensitive)
      if (code.toLowerCase() === searchCode.toLowerCase()) {
        foundTournament = {
          No: no,
          Name: name,
          Code: code,
          StartDate: extractAttribute('StartDate'),
          EndDate: extractAttribute('EndDate'),
          AuxiliaryPersons: extractAttribute('AuxiliaryPersons'),
          OfficialFunctions: extractAttribute('OfficialFunctions'),
          HasBeachTournament: extractAttribute('HasBeachTournament'),
          HasVolleyTournament: extractAttribute('HasVolleyTournament'),
          rawXml: eventXml
        };
        
        console.log(`\n🎯 FOUND TOURNAMENT WITH CODE "${searchCode}"!`);
        console.log(`   No: ${no}`);
        console.log(`   Name: ${name}`);
        console.log(`   Code: ${code}`);
        console.log(`   Dates: ${foundTournament.StartDate} to ${foundTournament.EndDate}`);
        
        return; // Stop searching
      }
    });
    
    if (!foundTournament) {
      console.log(`\n❌ Tournament with code "${searchCode}" not found in ${year}`);
      
      // Show some sample codes for reference
      console.log('\n📋 Sample tournament codes found:');
      eventMatches.slice(0, 10).forEach((event, index) => {
        const code = (event.match(/Code="([^"]*)"/i) || ['', 'N/A'])[1];
        const name = (event.match(/Name="([^"]*)"/i) || ['', 'N/A'])[1];
        console.log(`   ${index + 1}. ${code} - ${name}`);
      });
      
      return null;
    }
    
    // Step 2: Get detailed tournament data using the No
    console.log(`\n🔍 Step 2: Getting detailed data for tournament No ${foundTournament.No}...`);
    
    await getTournamentDetails(foundTournament);
    
    return foundTournament;
    
  } catch (error) {
    console.error('Error searching tournament:', error);
    return null;
  }
}

async function getTournamentDetails(tournament) {
  try {
    // Method 1: Try GetEventList with specific No (we know this returns all, but let's see if we get richer data)
    console.log('\n🧪 Method 1: GetEventList with specific No...');
    await testGetEventListWithNo(tournament.No);
    
    // Method 2: Try GetBeachTournament 
    console.log('\n🧪 Method 2: GetBeachTournament...');
    await testGetBeachTournament(tournament.No);
    
    // Method 3: Try GetBeachMatchList for matches
    console.log('\n🧪 Method 3: GetBeachMatchList for matches...');
    await testGetBeachMatchList(tournament.No);
    
    // Method 4: Analyze the data we already have from EventList
    console.log('\n📊 Method 4: Analyzing EventList data...');
    analyzeEventListData(tournament);
    
  } catch (error) {
    console.error('Error getting tournament details:', error);
  }
}

async function testGetEventListWithNo(tournamentNo) {
  try {
    const request = `<Requests>
  <Request Type='GetEventList' Fields='Name StartDate EndDate Code City Country CountryName Location Venue Address AuxiliaryPersons OfficialFunctions HasVolleyTournament HasBeachTournament'>
    <Filter No='${tournamentNo}' HasBeachTournament='1' />
  </Request>
</Requests>`;

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
      console.log(`   Response: ${xmlText.length} chars (likely returns all tournaments)`);
      
      // Try to find our specific tournament in the response
      const eventMatches = xmlText.match(/<Event[^>]*\/>/g);
      if (eventMatches) {
        const targetEvent = eventMatches.find(event => event.includes(`No="${tournamentNo}"`));
        if (targetEvent) {
          console.log(`   ✅ Found target tournament: ${targetEvent.substring(0, 200)}...`);
        } else {
          console.log(`   ❌ Target tournament No=${tournamentNo} not found in response`);
        }
      }
    } else {
      console.log(`   ❌ Failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function testGetBeachTournament(tournamentNo) {
  try {
    const request = `<Request Type='GetBeachTournament' No='${tournamentNo}' />`;
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
      console.log(`   ✅ Success: ${xmlText.length} chars`);
      
      // Check if this is actually our tournament or a different one (data mismatch issue)
      const tournamentMatch = xmlText.match(/<BeachTournament[^>]*>/);
      if (tournamentMatch) {
        const name = (tournamentMatch[0].match(/Name="([^"]*)"/i) || ['', 'N/A'])[1];
        const code = (tournamentMatch[0].match(/Code="([^"]*)"/i) || ['', 'N/A'])[1];
        console.log(`   Tournament returned: "${name}" (${code})`);
        
        // Check for location data
        const locationFields = ['City', 'Country', 'CountryName', 'Location', 'Venue', 'Address'];
        const foundLocation = [];
        
        locationFields.forEach(field => {
          const regex = new RegExp(`${field}="([^"]*)"`, 'i');
          const match = tournamentMatch[0].match(regex);
          if (match && match[1].trim()) {
            foundLocation.push(`${field}: "${match[1]}"`);
          }
        });
        
        if (foundLocation.length > 0) {
          console.log(`   🏠 Location data found:`);
          foundLocation.forEach(loc => console.log(`      ${loc}`));
        } else {
          console.log(`   ❌ No location data in GetBeachTournament`);
        }
      }
    } else if (response.status === 401) {
      console.log(`   🔐 Authentication required`);
    } else {
      console.log(`   ❌ Failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function testGetBeachMatchList(tournamentNo) {
  try {
    const request = `<Requests>
  <Request Type='GetBeachMatchList' Fields='No NoInTournament LocalDate LocalTime TeamAName TeamBName Court Venue Location Address Status Round'>
    <Filter NoTournament='${tournamentNo}' />
  </Request>
</Requests>`;

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
        console.log(`   ✅ Found ${matchMatches.length} matches`);
        
        // Check first match for venue data
        const firstMatch = matchMatches[0];
        const venueFields = ['Court', 'Venue', 'Location', 'Address'];
        const foundVenue = [];
        
        venueFields.forEach(field => {
          const regex = new RegExp(`${field}="([^"]*)"`, 'i');
          const match = firstMatch.match(regex);
          if (match && match[1].trim()) {
            foundVenue.push(`${field}: "${match[1]}"`);
          }
        });
        
        if (foundVenue.length > 0) {
          console.log(`   🏟️ Venue data in matches:`);
          foundVenue.forEach(venue => console.log(`      ${venue}`));
        } else {
          console.log(`   ❌ No venue data in matches`);
        }
        
        console.log(`   Sample match: ${firstMatch.substring(0, 150)}...`);
      } else {
        console.log(`   ❌ No matches found`);
      }
    } else {
      console.log(`   ❌ Failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

function analyzeEventListData(tournament) {
  console.log(`\n📊 ANALYZING EVENTLIST DATA FOR ${tournament.Code}:`);
  console.log('='.repeat(50));
  
  console.log(`🏆 Tournament Info:`);
  console.log(`   No: ${tournament.No}`);
  console.log(`   Name: ${tournament.Name}`);
  console.log(`   Code: ${tournament.Code}`);
  console.log(`   Start: ${tournament.StartDate}`);
  console.log(`   End: ${tournament.EndDate}`);
  console.log(`   Beach: ${tournament.HasBeachTournament}`);
  console.log(`   Volleyball: ${tournament.HasVolleyTournament}`);
  
  // Analyze officials
  if (tournament.AuxiliaryPersons && tournament.AuxiliaryPersons.length > 100) {
    console.log(`\n👥 Officials Analysis:`);
    console.log(`   Raw data: ${tournament.AuxiliaryPersons.length} characters`);
    
    try {
      // Decode XML entities
      const decodedXml = tournament.AuxiliaryPersons
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#xD;&#xA;/g, '\n')
        .replace(/&amp;/g, '&');
      
      const personMatches = decodedXml.match(/<AuxiliaryPerson[^>]*\/>/g);
      
      if (personMatches) {
        console.log(`   Total officials: ${personMatches.length}`);
        
        // Nationality analysis
        const nationalities = {};
        personMatches.forEach(personXml => {
          const nationalityMatch = personXml.match(/NationalityCode="([^"]*)"/);
          if (nationalityMatch) {
            const country = nationalityMatch[1];
            nationalities[country] = (nationalities[country] || 0) + 1;
          }
        });
        
        console.log(`   Nationality breakdown:`);
        Object.entries(nationalities)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .forEach(([country, count]) => {
            const percentage = ((count / personMatches.length) * 100).toFixed(1);
            console.log(`      ${country}: ${count} (${percentage}%)`);
          });
        
        // Location inference
        const topCountry = Object.entries(nationalities).sort(([,a], [,b]) => b - a)[0];
        if (topCountry) {
          const [country, count] = topCountry;
          const percentage = ((count / personMatches.length) * 100).toFixed(1);
          
          if (country === 'AT' && percentage > 30) {
            console.log(`\n🇦🇹 LOCATION INFERENCE: ${percentage}% Austrian officials → Likely in AUSTRIA`);
          } else {
            console.log(`\n🌍 LOCATION INFERENCE: Top country ${country} (${percentage}%) → Possibly in ${country}`);
          }
        }
        
        // Show sample officials
        console.log(`\n   Sample officials (first 3):`);
        personMatches.slice(0, 3).forEach((personXml, index) => {
          const extractAttr = (attr) => {
            const match = personXml.match(new RegExp(`${attr}="([^"]*)"`));
            return match ? match[1] : '';
          };
          
          const firstName = extractAttr('FirstName');
          const lastName = extractAttr('LastName');
          const nationality = extractAttr('NationalityCode');
          const functions = extractAttr('Functions');
          const gender = extractAttr('Gender') === '1' ? 'F' : 'M';
          
          console.log(`      ${index + 1}. ${firstName} ${lastName} (${nationality}) - Function ${functions} [${gender}]`);
        });
      }
    } catch (error) {
      console.log(`   ❌ Error parsing officials: ${error.message}`);
    }
  } else {
    console.log(`\n👥 Officials: None or minimal data`);
  }
  
  // Show raw XML
  console.log(`\n🔧 Raw Event XML:`);
  console.log(tournament.rawXml);
}

// Test with WBAD2025
console.log('🏐 TESTING TOURNAMENT SEARCH BY CODE');
console.log('====================================\n');

searchTournamentByCode('WBAD2025', 2025)
  .then(() => {
    console.log('\n✅ Search completed!');
  })
  .catch(error => {
    console.error('❌ Search failed:', error);
  });