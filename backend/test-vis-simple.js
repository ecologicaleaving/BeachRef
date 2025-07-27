#!/usr/bin/env node

const axios = require('axios');

async function testSimpleVIS() {
  console.log('🔍 Testing VIS API Request Types...\n');

  const baseURL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';
  
  const requests = [
    {
      name: 'Simple GetTournaments',
      xml: '<Request Type="GetTournaments" />'
    },
    {
      name: 'GetTournaments with Fields',
      xml: '<Request Type="GetTournaments" Fields="TournamentId,Name" />'
    },
    {
      name: 'GetTournaments Multiple Format',
      xml: '<Requests><Request Type="GetTournaments" Fields="TournamentId,Name" /></Requests>'
    },
    {
      name: 'GetTournaments with Date Filter',
      xml: '<Requests><Request Type="GetTournaments" Fields="TournamentId,Name,StartDate" StartDateFrom="2025-01-01" /></Requests>'
    }
  ];

  for (const test of requests) {
    try {
      console.log(`🧪 Testing: ${test.name}`);
      console.log(`📤 Request: ${test.xml}`);
      
      const response = await axios.post(baseURL,
        `Request=${encodeURIComponent(test.xml)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );
      
      console.log('✅ Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data?.responses?.[0]?.tournaments) {
        const tournaments = response.data.responses[0].tournaments;
        console.log(`🏆 Found ${Array.isArray(tournaments) ? tournaments.length : 1} tournament(s)`);
      }
      
    } catch (error) {
      console.log('❌ Error:', error.response?.data || error.message);
    }
    
    console.log('─'.repeat(60));
  }
}

testSimpleVIS();