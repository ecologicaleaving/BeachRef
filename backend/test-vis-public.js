#!/usr/bin/env node

const axios = require('axios');

async function explorePublicData() {
  console.log('🔍 Exploring VIS API Public Data Access...\n');

  const baseURL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';
  
  // Test various request types to see what's publicly accessible
  const requestTypes = [
    { name: 'Service Info', xml: '<Request Type="GetServiceInformation" />' },
    { name: 'Tournament List', xml: '<Requests><Request Type="GetTournamentList" Fields="TournamentId,Name,StartDate,EndDate,Country,City,Venue,Sport,Status" /></Requests>' },
    { name: 'Competition List', xml: '<Requests><Request Type="GetCompetitionList" Fields="CompetitionId,Name" /></Requests>' },
    { name: 'Ranking List', xml: '<Requests><Request Type="GetRankingList" Fields="RankingId,Name" /></Requests>' },
    { name: 'Player Search', xml: '<Requests><Request Type="GetPlayerList" Fields="PlayerId,Name" /></Requests>' },
    { name: 'Team List', xml: '<Requests><Request Type="GetTeamList" Fields="TeamId,Name" /></Requests>' },
    { name: 'Match List', xml: '<Requests><Request Type="GetMatchList" Fields="MatchId,Date" /></Requests>' },
    { name: 'Event List', xml: '<Requests><Request Type="GetEventList" Fields="EventId,Name" /></Requests>' },
    
    // Try specific tournament details (using first few tournament IDs)
    { name: 'Tournament 1 Details', xml: '<Requests><Request Type="GetTournament" TournamentId="1" Fields="TournamentId,Name,StartDate,EndDate,Sport" /></Requests>' },
    { name: 'Tournament Info 1', xml: '<Requests><Request Type="GetTournamentInfo" TournamentId="1" /></Requests>' },
    
    // Try different approaches for tournament data
    { name: 'Tournament Search', xml: '<Requests><Request Type="SearchTournaments" Fields="TournamentId,Name" /></Requests>' },
    { name: 'Current Tournaments', xml: '<Requests><Request Type="GetCurrentTournaments" Fields="TournamentId,Name,Sport" /></Requests>' },
    
    // Try public rankings/standings
    { name: 'World Rankings', xml: '<Requests><Request Type="GetWorldRankings" Sport="Beach Volleyball" /></Requests>' },
    { name: 'Rankings', xml: '<Requests><Request Type="GetRankings" Sport="Volleyball" /></Requests>' },
    
    // Try recent matches
    { name: 'Recent Matches', xml: '<Requests><Request Type="GetRecentMatches" Sport="Beach Volleyball" /></Requests>' },
    { name: 'Live Matches', xml: '<Requests><Request Type="GetLiveMatches" /></Requests>' }
  ];

  for (const test of requestTypes) {
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
      
      if (response.data?.responses?.[0]?.errors) {
        const error = response.data.responses[0].errors[0];
        console.log(`❌ Error: ${error.code} - ${error.detail}`);
      } else if (response.data?.data) {
        // Single request format
        console.log(`✅ SUCCESS (single): Got data!`);
        console.log(`📊 Data:`, JSON.stringify(response.data.data, null, 2));
      } else if (response.data?.responses?.[0]?.data) {
        // Multiple request format
        const data = response.data.responses[0].data;
        console.log(`✅ SUCCESS (multiple): Got ${Array.isArray(data) ? data.length : 1} items`);
        
        if (Array.isArray(data) && data.length > 0) {
          console.log(`📋 First item:`, JSON.stringify(data[0], null, 2));
          
          // Look for non-empty objects
          const nonEmpty = data.filter(item => Object.keys(item).length > 0);
          if (nonEmpty.length > 0) {
            console.log(`🎯 Found ${nonEmpty.length} items with data!`);
            console.log(`📝 Example with data:`, JSON.stringify(nonEmpty[0], null, 2));
          }
        } else if (!Array.isArray(data)) {
          console.log(`📝 Single item:`, JSON.stringify(data, null, 2));
        }
      } else if (response.data?.responses?.[0]) {
        const responseData = response.data.responses[0];
        console.log(`✅ SUCCESS: Response structure`);
        console.log(`📋 Keys:`, Object.keys(responseData));
        console.log(`📄 Data:`, JSON.stringify(responseData, null, 2));
      } else {
        console.log(`⚠️  Unexpected response structure`);
        console.log(`📄 Raw:`, JSON.stringify(response.data, null, 2));
      }
      
    } catch (error) {
      if (error.response?.data) {
        console.log(`❌ HTTP Error:`, JSON.stringify(error.response.data, null, 2));
      } else {
        console.log(`❌ Network Error:`, error.message);
      }
    }
    
    console.log('─'.repeat(80));
  }
  
  console.log('\n🎯 Summary: Testing Guest Access Patterns...');
  
  // Test guest access explicitly
  const guestTests = [
    {
      name: 'Explicit Guest Request',
      xml: '<Requests Username="Guest"><Request Type="GetTournamentList" Fields="TournamentId,Name" /></Requests>'
    },
    {
      name: 'Public Tournament Info',
      xml: '<Request Type="GetPublicTournaments" />'
    },
    {
      name: 'Basic Tournament Data',
      xml: '<Request Type="GetTournamentList" />'
    }
  ];
  
  for (const test of guestTests) {
    try {
      console.log(`\n🔓 Testing: ${test.name}`);
      
      const response = await axios.post(baseURL,
        `Request=${encodeURIComponent(test.xml)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }
        }
      );
      
      console.log(`📊 Response:`, JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.log(`❌ Error:`, error.response?.data || error.message);
    }
  }
}

explorePublicData();