/**
 * Get single referee details to see all available fields including Role
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const refereeNo = process.argv[2] || '150693'; // From Event 1719

function getReferee(refereeNo) {
  return new Promise((resolve, reject) => {
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetReferee" No="${refereeNo}" />
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
  console.log(`\n🔍 Getting referee details for NoReferee ${refereeNo}...\n`);

  const response = await getReferee(refereeNo);

  console.log('='.repeat(80));
  console.log('RAW XML RESPONSE');
  console.log('='.repeat(80));
  console.log(response.substring(0, 3000));
  console.log('...\n');

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: true,
  });

  const result = parser.parse(response);
  const referee = result?.Responses?.Referee;

  if (referee) {
    console.log('='.repeat(80));
    console.log('ALL REFEREE FIELDS');
    console.log('='.repeat(80) + '\n');

    Object.keys(referee)
      .sort()
      .forEach((key) => {
        console.log(`${key.padEnd(30)}: ${referee[key]}`);
      });

    // Look for role-related fields
    console.log('\n' + '='.repeat(80));
    console.log('ROLE/FUNCTION FIELDS');
    console.log('='.repeat(80) + '\n');

    const roleKeys = Object.keys(referee).filter((key) => {
      const k = key.toLowerCase();
      return (
        k.includes('role') ||
        k.includes('function') ||
        k.includes('position') ||
        k.includes('type') ||
        k.includes('category')
      );
    });

    if (roleKeys.length > 0) {
      roleKeys.forEach((key) => {
        console.log(`✅ ${key}: ${referee[key]}`);
      });
    } else {
      console.log('❌ No Role/Function fields found in referee data');
    }
  } else {
    console.log('❌ No referee data found\n');
    console.log('Response structure:', JSON.stringify(result, null, 2).substring(0, 1000));
  }
}

main().catch(console.error);
