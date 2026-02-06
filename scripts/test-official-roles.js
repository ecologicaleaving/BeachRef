/**
 * Test GetEventOfficialList to find Technical Delegate and Referee Coach
 * This is different from AuxiliaryPersons (which has line judges/scorers)
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const eventNo = process.argv[2] || '429';

function getEventOfficialList(eventNo) {
  return new Promise((resolve, reject) => {
    // Request with ALL fields to see what's available
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetEventOfficialList" No="${eventNo}" />
</Requests>`;

    const postData = `Request=${encodeURIComponent(xmlRequest)}`;

    const options = {
      hostname: 'www.fivb.org',
      port: 443,
      path: '/vis2009/XmlRequest.asmx',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log(`\n🔍 Testing GetEventOfficialList for Event ${eventNo}...\n`);
  console.log('Looking for: Technical Delegate, Referee Coach, Tournament Director\n');

  const response = await getEventOfficialList(eventNo);

  // Show raw response first
  console.log('='.repeat(80));
  console.log('RAW XML RESPONSE (first 2000 chars)');
  console.log('='.repeat(80));
  console.log(response.substring(0, 2000));
  console.log('...\n');

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: true,
  });

  const result = parser.parse(response);

  // Try different possible paths
  const paths = [
    'Responses.EventOfficialList.EventOfficial',
    'Responses.EventOfficials.EventOfficial',
    'Responses.EventOfficialList.Official',
    'Responses.Officials.Official',
    'Responses.EventOfficial',
  ];

  let officials = null;
  let foundPath = null;

  for (const path of paths) {
    const parts = path.split('.');
    let current = result;
    let failed = false;

    for (const part of parts) {
      if (current && current[part]) {
        current = current[part];
      } else {
        failed = true;
        break;
      }
    }

    if (!failed && current) {
      officials = current;
      foundPath = path;
      break;
    }
  }

  console.log('='.repeat(80));
  console.log('PARSED RESULTS');
  console.log('='.repeat(80) + '\n');

  if (officials) {
    console.log(`✅ Found officials at path: ${foundPath}\n`);

    const officialArray = Array.isArray(officials)
      ? officials
      : [officials];

    console.log(`Total officials: ${officialArray.length}\n`);

    // Show sample of first few officials with ALL fields
    console.log('Sample officials (with all fields):\n');
    officialArray.slice(0, 5).forEach((official, index) => {
      console.log(`${index + 1}. Official:`);
      Object.keys(official).forEach((key) => {
        console.log(`   ${key}: ${official[key]}`);
      });
      console.log('');
    });

    // Group by Role if available
    if (officialArray[0] && officialArray[0].Role !== undefined) {
      console.log('\n' + '='.repeat(80));
      console.log('OFFICIALS GROUPED BY ROLE');
      console.log('='.repeat(80) + '\n');

      const byRole = {};
      officialArray.forEach((official) => {
        const role = official.Role || 'Unknown';
        if (!byRole[role]) byRole[role] = [];
        byRole[role].push(official);
      });

      Object.keys(byRole)
        .sort()
        .forEach((role) => {
          console.log(`📋 Role: ${role} (${byRole[role].length} officials)`);
          console.log('-'.repeat(80));
          byRole[role].slice(0, 3).forEach((official) => {
            const name = `${official.FirstName || ''} ${official.LastName || ''}`.trim();
            const id = official.NoOfficial || official.No || 'N/A';
            console.log(`  [${id}] ${name || 'No name'}`);
          });
          if (byRole[role].length > 3) {
            console.log(`  ... and ${byRole[role].length - 3} more\n`);
          } else {
            console.log('');
          }
        });
    }
  } else {
    console.log('❌ No officials found in response\n');
    console.log('Available keys in Responses:');
    if (result?.Responses) {
      Object.keys(result.Responses).forEach((key) => {
        console.log(`  - ${key}`);
      });
    }
  }
}

main().catch(console.error);
