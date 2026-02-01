/**
 * Test GetBeachTournament endpoint for personnel/official data
 * Check if tournament-level data includes official names
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

// Tournament from Match 203000 (has Personnel data)
const tournamentNo = process.argv[2] || '429'; // Fort Lauderdale 2017

console.log(`\n🔍 Testing GetBeachTournament for Tournament ${tournamentNo}...\n`);

function getBeachTournament(tournamentNo) {
  return new Promise((resolve, reject) => {
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetBeachTournament" No="${tournamentNo}" />
</Requests>`;

    const postData = `Request=${encodeURIComponent(xmlRequest)}`;

    const options = {
      hostname: 'www.fivb.org',
      port: 443,
      path: '/vis2009/XmlRequest.asmx',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  try {
    console.log('Step 1: Fetching tournament data...');
    const response = await getBeachTournament(tournamentNo);

    console.log('\nRaw XML Response (first 3000 chars):');
    console.log('='.repeat(80));
    console.log(response.substring(0, 3000));
    console.log('='.repeat(80) + '\n');

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true
    });

    const result = parser.parse(response);

    console.log('Step 2: Parsing response structure...\n');
    console.log('Available keys in Responses:');
    if (result?.Responses) {
      Object.keys(result.Responses).forEach(key => {
        const value = result.Responses[key];
        const type = Array.isArray(value) ? `array[${value.length}]` : typeof value;
        console.log(`  - ${key}: ${type}`);
      });
    }
    console.log('');

    // Check for official-related fields
    console.log('Step 3: Searching for official/personnel data...\n');

    const searchKeys = ['Official', 'Personnel', 'Scorer', 'Judge', 'Referee', 'Staff'];
    let foundData = {};

    function searchObject(obj, path = '') {
      if (!obj || typeof obj !== 'object') return;

      Object.keys(obj).forEach(key => {
        const fullPath = path ? `${path}.${key}` : key;
        const value = obj[key];

        // Check if key matches our search terms
        if (searchKeys.some(term => key.includes(term))) {
          foundData[fullPath] = value;
        }

        // Recursively search nested objects (but limit depth)
        if (typeof value === 'object' && path.split('.').length < 3) {
          searchObject(value, fullPath);
        }
      });
    }

    searchObject(result.Responses);

    if (Object.keys(foundData).length > 0) {
      console.log('✅ Found official/personnel-related fields:\n');
      Object.entries(foundData).forEach(([path, value]) => {
        console.log(`Path: ${path}`);
        if (Array.isArray(value)) {
          console.log(`  Type: array with ${value.length} items`);
          if (value.length > 0) {
            console.log(`  First item:`, JSON.stringify(value[0], null, 2).substring(0, 500));
          }
        } else if (typeof value === 'object') {
          console.log(`  Value:`, JSON.stringify(value, null, 2).substring(0, 500));
        } else {
          console.log(`  Value: ${value}`);
        }
        console.log('');
      });
    } else {
      console.log('❌ No official/personnel data found in tournament response\n');
    }

    console.log('='.repeat(80));
    console.log('DETAILED STRUCTURE ANALYSIS');
    console.log('='.repeat(80) + '\n');

    // Show full structure (limited depth)
    console.log('Full Response Structure (first 5000 chars):');
    console.log(JSON.stringify(result, null, 2).substring(0, 5000));
    console.log('');

    // Specific search for Personnel IDs we need (3, 10, 19, 26)
    console.log('='.repeat(80));
    console.log('SEARCHING FOR PERSONNEL IDs (3, 10, 19, 26)');
    console.log('='.repeat(80) + '\n');

    const personnelIds = [3, 10, 19, 26];
    const jsonStr = JSON.stringify(result);

    personnelIds.forEach(id => {
      const searchPatterns = [
        `"No":"${id}"`,
        `"No":${id}`,
        `"NoOfficial":"${id}"`,
        `"NoOfficial":${id}`,
        `"ID":"${id}"`,
        `"ID":${id}`
      ];

      let found = false;
      searchPatterns.forEach(pattern => {
        if (jsonStr.includes(pattern)) {
          console.log(`✅ Found ID ${id} with pattern: ${pattern}`);
          found = true;
        }
      });

      if (!found) {
        console.log(`❌ ID ${id} not found in tournament data`);
      }
    });

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main();
