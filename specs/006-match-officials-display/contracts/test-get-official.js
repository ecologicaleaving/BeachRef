/**
 * Test GetOfficial endpoint to retrieve individual official details
 * Try to get name and federation for Personnel IDs
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

console.log('\n🔍 Testing GetOfficial endpoint...\n');

function getOfficial(officialNo) {
  return new Promise((resolve, reject) => {
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetOfficial" No="${officialNo}" />
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

async function testOfficial(role, officialNo) {
  console.log(`${'='.repeat(80)}`);
  console.log(`Testing ${role} - Official No: ${officialNo}`);
  console.log('='.repeat(80) + '\n');

  try {
    const response = await getOfficial(officialNo);

    console.log('Raw Response (first 1000 chars):');
    console.log(response.substring(0, 1000));
    console.log('\n' + '-'.repeat(80) + '\n');

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true
    });

    const result = parser.parse(response);

    console.log('Parsed Structure:');
    console.log(JSON.stringify(result, null, 2).substring(0, 1000));
    console.log('\n' + '-'.repeat(80) + '\n');

    // Try different paths
    const possiblePaths = [
      { path: 'Responses.Official', data: result?.Responses?.Official },
      { path: 'Responses.Officials.Official', data: result?.Responses?.Officials?.Official },
      { path: 'Responses.BeachOfficial', data: result?.Responses?.BeachOfficial },
      { path: 'Official', data: result?.Official }
    ];

    let found = false;
    for (const { path, data } of possiblePaths) {
      if (data) {
        console.log(`✅ Data found at path: ${path}\n`);
        console.log('Official Details:');
        if (typeof data === 'object') {
          Object.entries(data).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });
        } else {
          console.log(`  Value: ${data}`);
        }
        found = true;
        break;
      }
    }

    if (!found) {
      console.log('❌ No official data found in response');
      console.log('\nAvailable keys in Responses:');
      if (result?.Responses) {
        Object.keys(result.Responses).forEach(key => {
          console.log(`  - ${key}`);
        });
      }
    }

    console.log('');

  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }
}

async function main() {
  // Test Personnel IDs from match 203000
  const personnelOfficials = [
    { role: 'Scorer', id: 19 },
    { role: 'Assistant Scorer', id: 26 },
    { role: 'Line Judge 1', id: 3 },
    { role: 'Line Judge 2', id: 10 }
  ];

  for (const { role, id } of personnelOfficials) {
    await testOfficial(role, id);
  }

  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');
  console.log('If GetOfficial works, we have a THREE-STEP process:');
  console.log('  Step 1: GetBeachMatch → Extract Personnel IDs');
  console.log('  Step 2: GetEventOfficialList → Verify IDs exist (optional)');
  console.log('  Step 3: GetOfficial → Fetch name/federation for each ID\n');
  console.log('If GetOfficial fails, scorer/line judge names are NOT available in VIS API.\n');
}

main();
