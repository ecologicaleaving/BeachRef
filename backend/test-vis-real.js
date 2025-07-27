#!/usr/bin/env node

const axios = require('axios');

async function testVISAPI() {
  console.log('🏐 Testing VIS API with Beach Volleyball Tournaments 2025...\n');

  const baseURL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';
  
  try {
    // Test 1: Health check
    console.log('1️⃣ Testing Health Check...');
    const healthRequest = '<Request Type="GetServiceInformation" />';
    const healthResponse = await axios.post(baseURL, 
      `Request=${encodeURIComponent(healthRequest)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );
    console.log('✅ Health Check Response:', healthResponse.data);
    console.log('');

    // Test 2: Get Beach Volleyball Tournaments for 2025
    console.log('2️⃣ Testing Beach Volleyball Tournaments 2025...');
    const tournamentRequest = `<Requests>
      <Request Type="GetTournaments" 
               Fields="TournamentId,Name,StartDate,EndDate,Country,City,Venue,Level,Status"
               StartDateFrom="2025-01-01"
               StartDateTo="2025-12-31"
               Sport="Beach Volleyball"
               MaxResults="20" />
    </Requests>`;
    
    const tournamentsResponse = await axios.post(baseURL,
      `Request=${encodeURIComponent(tournamentRequest)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('✅ Tournaments Response Structure:', typeof tournamentsResponse.data);
    console.log('✅ Raw Response:', JSON.stringify(tournamentsResponse.data, null, 2));
    
    // Parse the response
    if (tournamentsResponse.data?.responses?.[0]?.tournaments) {
      const tournaments = tournamentsResponse.data.responses[0].tournaments;
      console.log(`\n🏆 Found ${Array.isArray(tournaments) ? tournaments.length : 1} Beach Volleyball Tournament(s):`);
      
      const tournamentArray = Array.isArray(tournaments) ? tournaments : [tournaments];
      tournamentArray.slice(0, 5).forEach((tournament, index) => {
        console.log(`\n${index + 1}. ${tournament.name || 'Unknown Tournament'}`);
        console.log(`   📅 ${tournament.startDate} - ${tournament.endDate}`);
        console.log(`   📍 ${tournament.city}, ${tournament.country}`);
        console.log(`   🏟️  ${tournament.venue || 'TBD'}`);
        console.log(`   📊 Level: ${tournament.level || 'Unknown'}`);
        console.log(`   ⭐ Status: ${tournament.status || 'Unknown'}`);
      });
    } else {
      console.log('❌ No tournaments found in response structure');
    }

  } catch (error) {
    console.error('❌ Error testing VIS API:', error.response?.status, error.response?.data || error.message);
    
    if (error.response?.data) {
      console.log('📄 Full Error Response:', error.response.data);
    }
  }
}

testVISAPI();