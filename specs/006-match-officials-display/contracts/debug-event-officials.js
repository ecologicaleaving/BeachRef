/**
 * Debug GetEventOfficialList response structure
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const eventNo = process.argv[2] || '429';

console.log(`\n🔍 Debugging GetEventOfficialList for Event ${eventNo}...\n`);

function getEventOfficialList(eventNo) {
  return new Promise((resolve, reject) => {
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
    const response = await getEventOfficialList(eventNo);

    console.log('Raw XML Response (first 2000 chars):');
    console.log('='.repeat(80));
    console.log(response.substring(0, 2000));
    console.log('='.repeat(80) + '\n');

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true
    });

    const result = parser.parse(response);

    console.log('Parsed Response Structure:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(result, null, 2).substring(0, 2000));
    console.log('='.repeat(80) + '\n');

    // Check all possible paths
    console.log('Checking possible response paths:');
    console.log(`  result: ${result ? 'EXISTS' : 'MISSING'}`);
    console.log(`  result.Responses: ${result?.Responses ? 'EXISTS' : 'MISSING'}`);
    console.log(`  result.Responses.EventOfficialList: ${result?.Responses?.EventOfficialList ? 'EXISTS' : 'MISSING'}`);
    console.log(`  result.Responses.EventOfficials: ${result?.Responses?.EventOfficials ? 'EXISTS' : 'MISSING'}`);
    console.log(`  result.Responses.Officials: ${result?.Responses?.Officials ? 'EXISTS' : 'MISSING'}`);
    console.log(`  result.Responses.EventOfficial: ${result?.Responses?.EventOfficial ? 'EXISTS' : 'MISSING'}`);

    // Show all keys at Responses level
    if (result?.Responses) {
      console.log('\n  Keys in result.Responses:');
      Object.keys(result.Responses).forEach(key => {
        console.log(`    - ${key}: ${typeof result.Responses[key]}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main();
