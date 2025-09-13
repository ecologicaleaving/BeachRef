/**
 * Console script to fetch current season tournaments
 * Run with: node fetch-tournaments-console.js
 */

const https = require('https');
const querystring = require('querystring');

async function fetchTournaments() {
  console.log('🏐 Fetching current season tournaments...');
  
  const currentYear = new Date().getFullYear();
  
  const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request xmlns="Vis.Webservice">
  <Password />
  <Request>
    <Filter Type="BPT" />
    <Fields>
      <Field>No</Field>
      <Field>Name</Field>
      <Field>BeginDate</Field>
      <Field>EndDate</Field>
      <Field>Country</Field>
      <Field>City</Field>
      <Field>Code</Field>
      <Field>Type</Field>
    </Fields>
  </Request>
</Request>`;

  const postData = querystring.stringify({
    'Request': xmlRequest
  });

  const options = {
    hostname: 'www.fivb.org',
    port: 443,
    path: '/Vis2009/XmlRequest.asmx/GetEventList',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          console.log('📡 Response received, parsing...');
          
          // Simple XML parsing for attributes
          const tournaments = [];
          const eventMatches = data.match(/<Event[^>]+>/g);
          
          if (eventMatches) {
            console.log(`📊 Found ${eventMatches.length} tournaments`);
            
            eventMatches.forEach(eventTag => {
              const tournament = {};
              
              // Extract attributes using regex
              const attrs = ['No', 'Name', 'Code', 'Type', 'Country', 'City', 'BeginDate', 'EndDate'];
              attrs.forEach(attr => {
                const match = eventTag.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
                tournament[attr.toLowerCase()] = match ? match[1] : '';
              });
              
              // Filter for current season
              if (tournament.begindate && tournament.begindate.includes(currentYear.toString())) {
                tournaments.push(tournament);
              }
            });
            
            // Sort by date
            tournaments.sort((a, b) => new Date(a.begindate) - new Date(b.begindate));
            
            console.log(`\n🎯 Current season (${currentYear}) tournaments:`);
            console.log(`📈 Total: ${tournaments.length} tournaments\n`);
            
            // Display table-like format
            tournaments.forEach((t, i) => {
              console.log(`${(i + 1).toString().padStart(2)}. ${t.name}`);
              console.log(`    📍 ${t.city}, ${t.country}`);
              console.log(`    📅 ${t.begindate} - ${t.enddate}`);
              console.log(`    🏆 ${t.code} (${t.type})`);
              console.log(`    🆔 Tournament #${t.no}`);
              console.log('');
            });
            
            console.log(`\n✅ Found ${tournaments.length} tournaments for ${currentYear} season`);
            resolve(tournaments);
          } else {
            console.log('❌ No tournament data found in response');
            console.log('Raw response:', data.substring(0, 500));
            resolve([]);
          }
        } catch (error) {
          console.error('❌ Error parsing response:', error);
          reject(error);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Request failed: ${e.message}`);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// Run the function
fetchTournaments().catch(console.error);