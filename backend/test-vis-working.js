#!/usr/bin/env node

const axios = require('axios');

async function testWorkingRequests() {
  console.log('🧪 Testing VIS API Working Request Types...\n');

  const baseURL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';
  
  // Test known working patterns based on previous discoveries
  const workingTests = [
    {
      name: 'Tournament List (all fields)',
      xml: '<Requests><Request Type="GetTournamentList" Fields="TournamentId,Name,StartDate,EndDate,Country,City,Venue,Sport,Status" /></Requests>'
    },
    {
      name: 'Tournament List (minimal fields)',
      xml: '<Requests><Request Type="GetTournamentList" Fields="TournamentId,Name" /></Requests>'
    },
    {
      name: 'Tournament List (JSON, all fields)', 
      xml: '<Requests><Request Type="GetTournamentList" Fields="TournamentId,Name,StartDate,EndDate,Country,City,Venue,Sport,Status" /></Requests>',
      accept: 'application/json'
    }
  ];

  for (const test of workingTests) {
    try {
      console.log(`🧪 Testing: ${test.name}`);
      
      const response = await axios.post(baseURL,
        `Request=${encodeURIComponent(test.xml)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': test.accept || 'application/xml'
          },
          timeout: 15000
        }
      );
      
      if (test.accept === 'application/json') {
        console.log('✅ JSON Response received');
        
        const responseData = response.data?.responses?.[0];
        if (responseData?.data) {
          console.log(`   📊 Found ${responseData.data.length} tournaments`);
          
          // Check if any tournaments have actual data
          const nonEmptyTournaments = responseData.data.filter(t => Object.keys(t).length > 0);
          console.log(`   📈 Non-empty tournaments: ${nonEmptyTournaments.length}`);
          
          if (nonEmptyTournaments.length > 0) {
            console.log('   🎯 First tournament with data:');
            console.log(JSON.stringify(nonEmptyTournaments[0], null, 4));
          } else {
            console.log('   ⚠️  All tournaments are empty objects - may need authentication');
          }
        }
      } else {
        console.log('✅ XML Response received');
        
        // Extract some tournament info from XML
        const tournamentMatches = response.data.match(/<Tournament[^>]*>/g);
        if (tournamentMatches) {
          console.log(`   📊 Found ${tournamentMatches.length} tournaments`);
          console.log(`   📋 First few: ${tournamentMatches.slice(0, 3).join(' ')}`);
          
          // Check if any have name attributes
          const withNames = tournamentMatches.filter(t => t.includes('Name='));
          if (withNames.length > 0) {
            console.log(`   📝 Tournaments with names: ${withNames.length}`);
            console.log(`   🎯 Example: ${withNames[0]}`);
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ Error in ${test.name}:`, error.response?.data || error.message);
    }
    
    console.log('─'.repeat(60));
  }
  
  // Try to understand what fields are actually available
  console.log('\n🔍 Testing different field combinations...');
  
  const fieldTests = [
    'TournamentId',
    'TournamentId,Name',
    'TournamentId,TournamentName', 
    'No,Name',
    'TournamentNo,TournamentName'
  ];
  
  for (const fields of fieldTests) {
    try {
      const xml = `<Requests><Request Type="GetTournamentList" Fields="${fields}" /></Requests>`;
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
      
      const responseData = response.data?.responses?.[0];
      if (responseData?.data?.[0] && Object.keys(responseData.data[0]).length > 0) {
        console.log(`✅ Fields "${fields}" returned data:`);
        console.log(JSON.stringify(responseData.data[0], null, 2));
      } else {
        console.log(`⚠️  Fields "${fields}" returned empty objects`);
      }
      
    } catch (error) {
      console.log(`❌ Fields "${fields}" failed:`, error.response?.data?.responses?.[0]?.errors || error.message);
    }
  }
}

testWorkingRequests();