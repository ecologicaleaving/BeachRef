#!/usr/bin/env node

const axios = require('axios');

async function discoverVISTypes() {
  console.log('🔍 Discovering VIS API Request Types...\n');

  const baseURL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';
  
  // Common VIS request types to test
  const requestTypes = [
    'GetServiceInformation',
    'GetTournamentList',
    'GetTournamentInfo', 
    'GetTournaments',
    'GetMatches',
    'GetMatchInfo',
    'GetPlayers',
    'GetTeams',
    'GetRankings',
    'GetCompetitions',
    'GetEvents',
    'GetSchedule'
  ];

  for (const type of requestTypes) {
    try {
      console.log(`🧪 Testing: ${type}`);
      
      // Test both single and multiple request formats
      const singleRequest = `<Request Type="${type}" />`;
      const multipleRequest = `<Requests><Request Type="${type}" /></Requests>`;
      
      for (const [format, xml] of [['Single', singleRequest], ['Multiple', multipleRequest]]) {
        try {
          const response = await axios.post(baseURL,
            `Request=${encodeURIComponent(xml)}`,
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
              },
              timeout: 5000
            }
          );
          
          if (!response.data?.responses?.[0]?.errors) {
            console.log(`✅ ${format} ${type}: SUCCESS`);
            console.log(`   Response:`, JSON.stringify(response.data, null, 2));
          } else {
            const error = response.data.responses[0].errors[0];
            if (error.code !== 'BadParameter' || error.detail !== 'Type') {
              console.log(`⚠️  ${format} ${type}: ${error.code} - ${error.detail}`);
            }
          }
        } catch (error) {
          // Ignore network errors
        }
      }
      
    } catch (error) {
      // Continue testing other types
    }
  }
  
  console.log('\n🎯 Now testing with sample tournament data request...');
  
  // Try a more specific approach - check if we need credentials
  try {
    const testRequest = `<Requests><Request Type="GetTournamentList" /></Requests>`;
    const response = await axios.post(baseURL,
      `Request=${encodeURIComponent(testRequest)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('📋 Tournament List Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Tournament List Error:', error.response?.data || error.message);
  }
}

discoverVISTypes();