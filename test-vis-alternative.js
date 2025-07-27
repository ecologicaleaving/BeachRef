#!/usr/bin/env node
const axios = require('axios');

async function testAlternativeApproaches() {
  console.log('🔍 Testing Alternative VIS API Data Access...\n');
  
  const baseURL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';
  
  // Try XML responses to see if they contain more data
  const xmlTests = [
    { name: 'Tournament List (XML)', endpoint: '/GetTournamentList' },
    { name: 'Player List (XML)', endpoint: '/GetPlayerList' },
    { name: 'Match List (XML)', endpoint: '/GetMatchList' },
    { name: 'Event List (XML)', endpoint: '/GetEventList' }
  ];
  
  for (const test of xmlTests) {
    try {
      console.log(`📋 ${test.name}:`);
      const response = await axios.get(`${baseURL}${test.endpoint}`, {
        headers: {
          'Accept': 'application/xml, text/xml',
          'User-Agent': 'Mozilla/5.0 (compatible; VIS-Explorer/1.0)'
        },
        timeout: 10000
      });
      
      const data = response.data;
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${response.headers['content-type']}`);
      console.log(`   Data length: ${data.length} chars`);
      
      // Parse XML to see if it contains actual data
      if (data.includes('<')) {
        const xmlContent = data.substring(0, 500);
        console.log(`   XML preview: ${xmlContent}...`);
        
        // Check for actual tournament data patterns
        if (data.includes('<Tournament') || data.includes('<Player') || data.includes('<Match')) {
          console.log(`   ✅ Contains structured data elements!`);
        } else {
          console.log(`   ❌ No structured data elements found`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log('');
  }
  
  // Test specific tournament details with different approaches
  console.log('🏐 Testing Tournament Detail Access:\n');
  
  const tournamentTests = [
    { name: 'Tournament by ID', endpoint: '/GetTournament', params: '?No=1' },
    { name: 'Tournament Info', endpoint: '/GetTournamentInfo', params: '?No=1' },
    { name: 'Tournament by recent', endpoint: '/GetTournament', params: '?No=346' }
  ];
  
  for (const test of tournamentTests) {
    try {
      console.log(`🏆 ${test.name}:`);
      const response = await axios.get(`${baseURL}${test.endpoint}${test.params}`, {
        headers: {
          'Accept': 'application/xml, text/xml',
          'User-Agent': 'Mozilla/5.0 (compatible; VIS-Explorer/1.0)'
        },
        timeout: 10000
      });
      
      const data = response.data;
      console.log(`   Status: ${response.status}`);
      console.log(`   Data length: ${data.length} chars`);
      
      if (data.length > 100) {
        console.log(`   Preview: ${data.substring(0, 200)}...`);
        
        // Look for tournament details
        if (data.includes('<Name>') || data.includes('<Location>') || data.includes('<Date>')) {
          console.log(`   ✅ Contains tournament details!`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log('');
  }
  
  // Test with different parameters
  console.log('🔧 Testing Parameter Variations:\n');
  
  const paramTests = [
    { name: 'Tournament with Year', endpoint: '/GetTournamentList', params: '?Year=2024' },
    { name: 'Matches Recent', endpoint: '/GetMatchList', params: '?Recent=1' },
    { name: 'Players by Country', endpoint: '/GetPlayerList', params: '?Country=USA' }
  ];
  
  for (const test of paramTests) {
    try {
      console.log(`⚙️ ${test.name}:`);
      const response = await axios.get(`${baseURL}${test.endpoint}${test.params}`, {
        headers: {
          'Accept': 'application/xml, text/xml',
          'User-Agent': 'Mozilla/5.0 (compatible; VIS-Explorer/1.0)'
        },
        timeout: 10000
      });
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Data length: ${response.data.length} chars`);
      
      if (response.data.length > 200) {
        console.log(`   ✅ Returned substantial data`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log('');
  }
}

// Run the tests
testAlternativeApproaches()
  .then(() => {
    console.log('✅ Alternative VIS API exploration complete!');
  })
  .catch(error => {
    console.error('❌ Error during testing:', error.message);
  });