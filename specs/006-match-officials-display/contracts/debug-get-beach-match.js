/**
 * Debug GetBeachMatch response structure
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const matchNo = process.argv[2] || '252';

console.log(`\n🔍 Getting BeachMatch ${matchNo}...\n`);

function getBeachMatch(matchNo) {
  return new Promise((resolve, reject) => {
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetBeachMatch" No="${matchNo}" />
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
    const response = await getBeachMatch(matchNo);

    console.log('Raw XML (first 1000 chars):');
    console.log(response.substring(0, 1000));
    console.log('\n...\n');

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true
    });

    const result = parser.parse(response);

    console.log('Parsed JSON structure:');
    console.log(JSON.stringify(result, null, 2).substring(0, 2000));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main();
