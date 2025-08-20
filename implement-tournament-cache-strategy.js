// Implement the correct tournament cache strategy
const VIS_BASE_URL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';

async function implementTournamentCacheStrategy() {
  try {
    console.log('🚀 IMPLEMENTING TOURNAMENT CACHE STRATEGY');
    console.log('='.repeat(60));
    
    // Step 1: Get tournament list with essential fields for cache
    console.log('🔍 Step 1: Getting tournament list for cache update...');
    const tournamentList = await getTournamentListForCache();
    
    if (!tournamentList || tournamentList.length === 0) {
      console.log('❌ No tournaments found');
      return;
    }
    
    console.log(`✅ Found ${tournamentList.length} tournaments for cache`);
    
    // Step 2: Test detailed retrieval for Baden tournament
    console.log('\n🔍 Step 2: Testing detailed retrieval...');
    const badenTournament = tournamentList.find(t => 
      t.Name.toLowerCase().includes('baden') || 
      t.Code.toLowerCase().includes('bad')
    );
    
    if (badenTournament) {
      console.log(`🎯 Found Baden tournament: ${badenTournament.Code} (No: ${badenTournament.No})`);
      await getTournamentDetailsByNo(badenTournament.No);
    } else {
      console.log('❌ Baden tournament not found in list');
      
      // Show sample tournaments
      console.log('\n📋 Sample tournaments in cache:');
      tournamentList.slice(0, 10).forEach((t, index) => {
        console.log(`   ${index + 1}. ${t.Code} - ${t.Name} (${t.CountryCode}) [${t.StartDateQualification || 'No date'}]`);
      });
    }
    
    return {
      cacheData: tournamentList,
      testTournament: badenTournament
    };
    
  } catch (error) {
    console.error('Error implementing tournament cache strategy:', error);
  }
}

async function getTournamentListForCache() {
  try {
    console.log('📋 Getting GetBeachTournamentList with cache-optimized fields...');
    
    // Use exact fields from your example
    const fields = 'No Code CountryCode StartDateQualification Name';
    const xmlRequest = `<Request Type="GetBeachTournamentList" Fields="${fields}" />`;
    
    console.log('🔧 Request XML:');
    console.log(xmlRequest);
    
    const encodedRequest = encodeURIComponent(xmlRequest);
    const requestUrl = `${VIS_BASE_URL}?Request=${encodedRequest}`;
    
    console.log('🌐 Request URL:');
    console.log(requestUrl);
    
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
        'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
      },
    });
    
    if (!response.ok) {
      console.error(`GetBeachTournamentList failed: ${response.status}`);
      return null;
    }
    
    const xmlText = await response.text();
    console.log(`✅ Response: ${xmlText.length} characters`);
    
    // Parse tournaments
    const tournamentMatches = xmlText.match(/<BeachTournament[^>]*\/>/g);
    if (!tournamentMatches) {
      console.error('No BeachTournament elements found');
      return null;
    }
    
    console.log(`📊 Parsing ${tournamentMatches.length} tournaments...`);
    
    const tournaments = tournamentMatches.map(tournamentXml => {
      const extractAttribute = (attr) => {
        const match = tournamentXml.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
        return match ? match[1] : '';
      };
      
      return {
        No: extractAttribute('No'),
        Code: extractAttribute('Code'),
        Name: extractAttribute('Name'),
        CountryCode: extractAttribute('CountryCode'),
        StartDateQualification: extractAttribute('StartDateQualification'),
        // Additional fields that might be present
        StartDate: extractAttribute('StartDate'),
        EndDate: extractAttribute('EndDate'),
        CountryName: extractAttribute('CountryName'),
        Status: extractAttribute('Status'),
        Version: extractAttribute('Version')
      };
    });
    
    // Filter out tournaments without essential data
    const validTournaments = tournaments.filter(t => t.No && t.Code && t.Name);
    
    console.log(`✅ Valid tournaments for cache: ${validTournaments.length}`);
    
    // Show sample cache data structure
    console.log('\n📈 CACHE DATA STRUCTURE SAMPLE:');
    validTournaments.slice(0, 5).forEach((tournament, index) => {
      console.log(`${index + 1}. Tournament No: ${tournament.No}`);
      console.log(`   Code: ${tournament.Code}`);
      console.log(`   Name: ${tournament.Name}`);
      console.log(`   Country: ${tournament.CountryCode} (${tournament.CountryName || 'N/A'})`);
      console.log(`   StartDate: ${tournament.StartDate || tournament.StartDateQualification || 'N/A'}`);
      console.log('');
    });
    
    return validTournaments;
    
  } catch (error) {
    console.error('Error getting tournament list for cache:', error);
    return null;
  }
}

async function getTournamentDetailsByNo(tournamentNo) {
  try {
    console.log(`🔍 Getting detailed data for tournament No: ${tournamentNo}...`);
    
    // Use GetBeachTournament for detailed data
    const xmlRequest = `<Request Type="GetBeachTournament" No="${tournamentNo}" />`;
    
    console.log('🔧 Detail request XML:');
    console.log(xmlRequest);
    
    const encodedRequest = encodeURIComponent(xmlRequest);
    const requestUrl = `${VIS_BASE_URL}?Request=${encodedRequest}`;
    
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
        'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
      },
    });
    
    console.log(`📡 Response status: ${response.status}`);
    
    if (response.status === 401) {
      console.log('🔐 Authentication required for GetBeachTournament (expected)');
      console.log('💡 Fallback to GetBeachMatchList for venue data...');
      await getVenueDataFromMatches(tournamentNo);
      return null;
    }
    
    if (!response.ok) {
      console.error(`GetBeachTournament failed: ${response.status}`);
      return null;
    }
    
    const xmlText = await response.text();
    console.log(`✅ Tournament details: ${xmlText.length} characters`);
    
    // Parse tournament details
    const tournamentMatch = xmlText.match(/<BeachTournament[^>]*>/);
    if (tournamentMatch) {
      console.log('🏆 TOURNAMENT DETAILS:');
      console.log(tournamentMatch[0]);
      
      // Extract key fields
      const extractAttr = (attr) => {
        const match = tournamentMatch[0].match(new RegExp(`${attr}="([^"]*)"`, 'i'));
        return match ? match[1] : '';
      };
      
      const details = {
        No: extractAttr('No'),
        Code: extractAttr('Code'),
        Name: extractAttr('Name'),
        Title: extractAttr('Title'),
        StartDate: extractAttr('StartDate'),
        EndDate: extractAttr('EndDate'),
        Location: extractAttr('Location'),
        City: extractAttr('City'),
        Country: extractAttr('Country'),
        CountryName: extractAttr('CountryName'),
        CountryCode: extractAttr('CountryCode'),
        Venue: extractAttr('Venue'),
        Address: extractAttr('Address'),
        Status: extractAttr('Status')
      };
      
      console.log('\n📊 EXTRACTED DETAILS:');
      Object.entries(details).forEach(([key, value]) => {
        const status = value ? '✅' : '❌';
        console.log(`${status} ${key}: "${value}"`);
      });
      
      return details;
    }
    
    return null;
    
  } catch (error) {
    console.error('Error getting tournament details:', error);
    return null;
  }
}

async function getVenueDataFromMatches(tournamentNo) {
  try {
    console.log(`🏟️ Getting venue data from matches for tournament No: ${tournamentNo}...`);
    
    const fields = 'No TeamAName TeamBName Court Venue Location Address City Country RoundPhase Status';
    const xmlRequest = `<Request Type="GetBeachMatchList" Fields="${fields}"><Filter NoTournament="${tournamentNo}" /></Request>`;
    
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
      const matchMatches = xmlText.match(/<BeachMatch[^>]*\/>/g);
      
      if (matchMatches && matchMatches.length > 0) {
        console.log(`✅ Found ${matchMatches.length} matches`);
        
        const firstMatch = matchMatches[0];
        const extractAttr = (attr) => {
          const match = firstMatch.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
          return match ? match[1] : '';
        };
        
        console.log('🏟️ VENUE DATA FROM MATCHES:');
        console.log(`   Venue: "${extractAttr('Venue')}"`);
        console.log(`   City: "${extractAttr('City')}"`);
        console.log(`   Country: "${extractAttr('Country')}"`);
        console.log(`   Location: "${extractAttr('Location')}"`);
        console.log(`   Address: "${extractAttr('Address')}"`);
        console.log(`   Court: "${extractAttr('Court')}"`);
        console.log(`   RoundPhase: "${extractAttr('RoundPhase')}"`);
        console.log(`   Status: "${extractAttr('Status')}"`);
        
        return {
          venue: extractAttr('Venue'),
          city: extractAttr('City'),
          country: extractAttr('Country'),
          location: extractAttr('Location'),
          address: extractAttr('Address'),
          court: extractAttr('Court'),
          roundPhase: extractAttr('RoundPhase'),
          totalMatches: matchMatches.length
        };
      } else {
        console.log('❌ No matches found for venue data');
      }
    } else {
      console.log(`❌ GetBeachMatchList failed: ${response.status}`);
    }
    
    return null;
    
  } catch (error) {
    console.error('Error getting venue data from matches:', error);
    return null;
  }
}

// Execute the strategy
implementTournamentCacheStrategy()
  .then(result => {
    console.log('\n🎉 CACHE STRATEGY IMPLEMENTATION COMPLETE!');
    if (result) {
      console.log(`📊 Cache data: ${result.cacheData?.length || 0} tournaments`);
      console.log(`🎯 Test tournament: ${result.testTournament?.Code || 'Not found'}`);
    }
  })
  .catch(error => {
    console.error('❌ Cache strategy implementation failed:', error);
  });