/**
 * Test the Personnel field in BeachMatch
 * This might contain scorer and line judge data
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const matchNo = process.argv[2] || '252';

console.log(`\n🔍 Testing Personnel field for Match ${matchNo}...\n`);

function getBeachMatch(matchNo) {
  return new Promise((resolve, reject) => {
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetBeachMatch" No="${matchNo}" Fields="No Personnel" />
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

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true
    });

    const result = parser.parse(response);
    const matchData = result?.Responses?.BeachMatch || {};

    console.log('Match No:', matchData.No);
    console.log('\nPersonnel field value:');
    console.log('Type:', typeof matchData.Personnel);
    console.log('Value:', matchData.Personnel);
    console.log('\nLength:', matchData.Personnel ? matchData.Personnel.length : 0);

    if (matchData.Personnel && matchData.Personnel.length > 0) {
      console.log('\n✅ Personnel field contains data!');
      console.log('\nFull value:');
      console.log(matchData.Personnel);
    } else {
      console.log('\n❌ Personnel field is empty for this match');
      console.log('   Try a different match number with assigned officials');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main();
