#!/usr/bin/env node

const axios = require('axios');

async function testTournaments() {
  console.log('🏐 Testing VIS API Tournament Data for 2025...\n');

  const baseURL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';
  
  try {
    // Test GetTournamentList with required Fields parameter
    console.log('1️⃣ Testing GetTournamentList with Fields...');
    
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
        },
        timeout: 15000
      }
    );
    
    console.log('✅ Response Status:', response.status);
    console.log('✅ Response Type:', typeof response.data);
    
    if (response.data?.responses?.[0]?.errors) {
      console.log('❌ API Errors:', response.data.responses[0].errors);
    } else if (response.data?.responses?.[0]) {
      const responseData = response.data.responses[0];
      console.log('✅ Raw Response Keys:', Object.keys(responseData));
      
      // Check for tournaments in different possible locations
      const possibleKeys = ['tournaments', 'tournamentList', 'data', 'tournament'];
      let tournaments = null;
      
      for (const key of possibleKeys) {
        if (responseData[key]) {
          tournaments = responseData[key];
          console.log(`🎯 Found tournaments under key: "${key}"`);
          break;
        }
      }
      
      if (tournaments) {
        const tournamentArray = Array.isArray(tournaments) ? tournaments : [tournaments];
        console.log(`\n🏆 Found ${tournamentArray.length} tournament(s):`);
        
        // Show first few tournaments
        tournamentArray.slice(0, 5).forEach((tournament, index) => {
          console.log(`\n${index + 1}. Tournament ID: ${tournament.tournamentId || tournament.id}`);
          console.log(`   Name: ${tournament.name || 'Unknown'}`);
          console.log(`   Dates: ${tournament.startDate} - ${tournament.endDate}`);
          console.log(`   Location: ${tournament.city}, ${tournament.country}`);
          console.log(`   Venue: ${tournament.venue || 'TBD'}`);
          console.log(`   Raw Data:`, JSON.stringify(tournament, null, 2));
        });
        
        // Filter for 2025 beach volleyball tournaments
        const beachVolleyball2025 = tournamentArray.filter(t => {
          const startDate = new Date(t.startDate);
          const year = startDate.getFullYear();
          const name = (t.name || '').toLowerCase();
          return year === 2025 && (name.includes('beach') || name.includes('volleyball'));
        });
        
        if (beachVolleyball2025.length > 0) {
          console.log(`\n🏖️ Found ${beachVolleyball2025.length} Beach Volleyball tournaments in 2025:`);
          beachVolleyball2025.forEach((tournament, index) => {
            console.log(`${index + 1}. ${tournament.name} - ${tournament.city}, ${tournament.country}`);
          });
        }
        
      } else {
        console.log('❌ No tournaments found in response');
        console.log('📄 Full Response:', JSON.stringify(response.data, null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Error testing tournaments:', error.response?.status, error.response?.data || error.message);
    
    if (error.response?.data) {
      console.log('📄 Full Error Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testTournaments();