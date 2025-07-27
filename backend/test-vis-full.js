#!/usr/bin/env node

const axios = require('axios');

async function testFullResponse() {
  console.log('🔍 Testing VIS API Full Response Structure...\n');

  const baseURL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';
  
  try {
    const tournamentRequest = `<Requests>
      <Request Type="GetTournamentList" 
               Fields="TournamentId,Name,StartDate,EndDate,Country,City,Venue" />
    </Requests>`;
    
    const response = await axios.post(baseURL,
      `Request=${encodeURIComponent(tournamentRequest)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('📊 FULL RESPONSE STRUCTURE:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Extract and analyze the first few tournament entries
    const responseData = response.data.responses[0];
    if (responseData.data && responseData.data.length > 0) {
      console.log('\n🏆 FIRST 3 TOURNAMENT OBJECTS:');
      for (let i = 0; i < Math.min(3, responseData.data.length); i++) {
        console.log(`\nTournament ${i + 1}:`);
        console.log('Keys:', Object.keys(responseData.data[i]));
        console.log('Values:', JSON.stringify(responseData.data[i], null, 2));
      }
      
      // Check for tournaments with actual data
      const nonEmptyTournaments = responseData.data.filter(t => Object.keys(t).length > 0);
      console.log(`\n📈 Stats: ${nonEmptyTournaments.length} non-empty / ${responseData.data.length} total`);
      
      if (nonEmptyTournaments.length > 0) {
        console.log('\n🎯 FIRST NON-EMPTY TOURNAMENT:');
        console.log(JSON.stringify(nonEmptyTournaments[0], null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testFullResponse();