#!/usr/bin/env node

const axios = require('axios');

async function testTournamentDetails() {
  console.log('🏐 Testing VIS API Tournament Details...\n');

  const baseURL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';
  
  try {
    // Step 1: Get a tournament ID from the list
    console.log('1️⃣ Getting tournament IDs...');
    const listRequest = `<Requests><Request Type="GetTournamentList" Fields="TournamentId" /></Requests>`;
    
    const listResponse = await axios.post(baseURL,
      `Request=${encodeURIComponent(listRequest)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/xml'
        }
      }
    );
    
    // Extract tournament numbers from XML
    const tournamentNumbers = [];
    const tournamentMatches = listResponse.data.match(/Tournament No="(\d+)"/g);
    if (tournamentMatches) {
      tournamentNumbers.push(...tournamentMatches.map(match => match.match(/No="(\d+)"/)[1]));
    }
    
    console.log(`✅ Found ${tournamentNumbers.length} tournaments`);
    console.log(`📋 First 5 tournament IDs: ${tournamentNumbers.slice(0, 5).join(', ')}`);
    
    // Step 2: Get detailed info for a few tournaments
    console.log('\n2️⃣ Getting tournament details...');
    
    for (let i = 0; i < Math.min(3, tournamentNumbers.length); i++) {
      const tournamentId = tournamentNumbers[i];
      console.log(`\n🔍 Getting details for Tournament ${tournamentId}:`);
      
      try {
        const detailRequest = `<Requests>
          <Request Type="GetTournamentInfo" 
                   TournamentId="${tournamentId}" 
                   Fields="TournamentId,Name,StartDate,EndDate,Country,City,Venue,Sport" />
        </Requests>`;
        
        const detailResponse = await axios.post(baseURL,
          `Request=${encodeURIComponent(detailRequest)}`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json'
            },
            timeout: 10000
          }
        );
        
        console.log(`   📄 Response for Tournament ${tournamentId}:`);
        console.log(JSON.stringify(detailResponse.data, null, 4));
        
        // Check if this is a beach volleyball tournament
        const response = detailResponse.data?.responses?.[0];
        if (response && !response.errors) {
          const tournament = response.data || response;
          const sport = tournament.sport || '';
          const name = tournament.name || '';
          
          if (sport.toLowerCase().includes('beach') || name.toLowerCase().includes('beach')) {
            console.log(`   🏖️ BEACH VOLLEYBALL TOURNAMENT FOUND!`);
            console.log(`   Name: ${name}`);
            console.log(`   Sport: ${sport}`);
            console.log(`   Dates: ${tournament.startDate} - ${tournament.endDate}`);
            console.log(`   Location: ${tournament.city}, ${tournament.country}`);
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Error getting tournament ${tournamentId}:`, error.response?.data || error.message);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testTournamentDetails();