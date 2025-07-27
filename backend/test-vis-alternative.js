#!/usr/bin/env node

const axios = require('axios');

async function testAlternativeApproaches() {
  console.log('🔍 Testing Alternative VIS API Data Access...\n');

  const baseURL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';
  
  // Try XML responses to see if they contain more data
  console.log('1️⃣ Testing XML vs JSON for Tournament Data...');
  
  try {
    const xmlRequest = '<Requests><Request Type="GetTournamentList" Fields="TournamentId,Name,StartDate,EndDate,Country,City,Venue,Sport,Status" /></Requests>';
    
    // Test XML response
    const xmlResponse = await axios.post(baseURL,
      `Request=${encodeURIComponent(xmlRequest)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/xml'
        }
      }
    );
    
    console.log('📄 XML Response (first 2000 chars):');
    console.log(xmlResponse.data.substring(0, 2000));
    
    // Look for any tournament data in XML
    const tournamentMatches = xmlResponse.data.match(/<Tournament[^>]*>[^<]*<\/Tournament>/g);
    if (tournamentMatches && tournamentMatches.length > 0) {
      console.log(`\n🎯 Found ${tournamentMatches.length} tournaments with content`);
      console.log('📋 First few:', tournamentMatches.slice(0, 3));
    }
    
    // Check for tournament attributes
    const attributeMatches = xmlResponse.data.match(/<Tournament[^>]+Name="[^"]*"/g);
    if (attributeMatches) {
      console.log(`\n🏷️ Found tournaments with Name attribute: ${attributeMatches.length}`);
      console.log('📝 Examples:', attributeMatches.slice(0, 5));
    }
    
  } catch (error) {
    console.log('❌ XML test failed:', error.message);
  }
  
  console.log('\n' + '─'.repeat(80));
  
  // Try different field names that might work
  console.log('\n2️⃣ Testing Different Field Combinations...');
  
  const fieldCombinations = [
    'No,Name',
    'TournamentNo,TournamentName',
    'Id,Name',
    'Number,Name',
    'Code,Name',
    'TournamentCode,TournamentName',
    // Try without specific field names
    '*',
    'ALL'
  ];
  
  for (const fields of fieldCombinations) {
    try {
      const xml = `<Requests><Request Type="GetTournamentList" Fields="${fields}" /></Requests>`;
      const response = await axios.post(baseURL,
        `Request=${encodeURIComponent(xml)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }
        }
      );
      
      const data = response.data?.responses?.[0]?.data;
      if (data && data.length > 0) {
        const firstItem = data[0];
        const keys = Object.keys(firstItem);
        
        if (keys.length > 0) {
          console.log(`✅ Fields "${fields}" returned data with keys: ${keys.join(', ')}`);
          console.log(`📝 Example:`, JSON.stringify(firstItem, null, 2));
        } else {
          console.log(`⚠️  Fields "${fields}" returned empty objects`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Fields "${fields}":`, error.response?.data?.responses?.[0]?.errors?.[0]?.code || error.message);
    }
  }
  
  console.log('\n' + '─'.repeat(80));
  
  // Try single request format vs multiple
  console.log('\n3️⃣ Testing Single Request Format...');
  
  const singleRequests = [
    '<Request Type="GetTournamentList" Fields="TournamentId,Name" />',
    '<Request Type="GetTournamentList" />',
    '<Request Type="GetTournamentList" Fields="*" />'
  ];
  
  for (const xml of singleRequests) {
    try {
      const response = await axios.post(baseURL,
        `Request=${encodeURIComponent(xml)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }
        }
      );
      
      console.log(`✅ Single request success:`, typeof response.data);
      console.log(`📊 Data:`, JSON.stringify(response.data, null, 2).substring(0, 500));
      
    } catch (error) {
      console.log(`❌ Single request failed:`, error.response?.data || error.message);
    }
  }
  
  console.log('\n' + '─'.repeat(80));
  
  // Try to access specific tournament by number from the list we know exists
  console.log('\n4️⃣ Testing Specific Tournament Access...');
  
  const tournamentNumbers = [1, 37, 45, 225]; // Various tournament IDs we know exist
  
  for (const tourNo of tournamentNumbers) {
    try {
      const xml = `<Requests><Request Type="GetTournament" No="${tourNo}" Fields="No,Name,StartDate,Country,Sport" /></Requests>`;
      
      const response = await axios.post(baseURL,
        `Request=${encodeURIComponent(xml)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.data?.responses?.[0]?.errors) {
        console.log(`✅ Tournament ${tourNo} data:`, JSON.stringify(response.data, null, 2));
      } else {
        const error = response.data.responses[0].errors[0];
        console.log(`❌ Tournament ${tourNo}: ${error.code} - ${error.detail}`);
      }
      
    } catch (error) {
      console.log(`❌ Tournament ${tourNo} failed:`, error.message);
    }
  }
}

testAlternativeApproaches();