/**
 * Test alternative VIS API endpoints for personnel/official data
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const tournamentNo = '429';

console.log('\n🔍 Testing alternative VIS API endpoints for official data...\n');

function testEndpoint(type, no, fields = '') {
  return new Promise((resolve, reject) => {
    const fieldsAttr = fields ? ` Fields="${fields}"` : '';
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="${type}" No="${no}"${fieldsAttr} />
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

async function testRequestType(type, no, fields = '') {
  console.log(`${'='.repeat(80)}`);
  console.log(`Testing: ${type}`);
  console.log('='.repeat(80));

  try {
    const response = await testEndpoint(type, no, fields);

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true
    });

    const result = parser.parse(response);

    // Check for NoData or error
    if (result?.Responses?.NoData !== undefined) {
      console.log('❌ Endpoint returned: <NoData />\n');
      return;
    }

    if (result?.Responses?.Error) {
      console.log(`❌ Endpoint returned error: ${result.Responses.Error}\n`);
      return;
    }

    // Show available keys
    if (result?.Responses) {
      console.log('✅ Endpoint exists! Response keys:');
      Object.keys(result.Responses).forEach(key => {
        console.log(`  - ${key}`);
      });
      console.log('');

      // Show first 1000 chars of response
      console.log('Response preview:');
      console.log(JSON.stringify(result, null, 2).substring(0, 1000));
      console.log('...\n');
    }

  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }
}

async function main() {
  console.log(`Using Tournament No: ${tournamentNo}\n`);

  // Test various endpoint names
  const endpoints = [
    'GetTournamentOfficials',
    'GetBeachTournamentOfficials',
    'GetTournamentPersonnel',
    'GetBeachTournamentPersonnel',
    'GetTournamentStaff',
    'GetEventPersonnel',
    'GetBeachEventOfficials',
    'GetOfficialList',
    'GetPersonnelList'
  ];

  for (const endpoint of endpoints) {
    await testRequestType(endpoint, tournamentNo);
  }

  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');
  console.log('Tested ' + endpoints.length + ' alternative endpoint names.');
  console.log('If any returned data (not NoData), we found a working endpoint!\n');
}

main();
