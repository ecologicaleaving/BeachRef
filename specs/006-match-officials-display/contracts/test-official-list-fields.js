/**
 * Test GetOfficialList with Fields parameter to get official names
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

console.log('\n🔍 Testing GetOfficialList with Fields parameter...\n');

function getOfficialList(no, fields = '') {
  return new Promise((resolve, reject) => {
    const fieldsAttr = fields ? ` Fields="${fields}"` : '';
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetOfficialList" No="${no}"${fieldsAttr} />
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

async function testFields(label, no, fields) {
  console.log(`${'='.repeat(80)}`);
  console.log(`TEST: ${label}`);
  console.log('='.repeat(80));
  console.log(`No: ${no}`);
  console.log(`Fields: ${fields || '(none - default)'}\n`);

  try {
    const response = await getOfficialList(no, fields);

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true
    });

    const result = parser.parse(response);
    const officials = result?.Responses?.Officials?.Official || [];
    const officialArray = Array.isArray(officials) ? officials : (officials ? [officials] : []);

    if (officialArray.length === 0) {
      console.log('❌ No officials returned\n');
      return;
    }

    console.log(`Officials Found: ${officialArray.length}\n`);

    // Show first official's fields
    console.log('First Official Fields:');
    const firstOfficial = officialArray[0];
    Object.keys(firstOfficial).forEach(key => {
      console.log(`  ${key}: ${firstOfficial[key]}`);
    });
    console.log('');

    // Check for Personnel IDs (3, 10, 19, 26)
    const personnelIds = [3, 10, 19, 26];
    console.log('Personnel ID Matches:');
    personnelIds.forEach(id => {
      const official = officialArray.find(o => o.No === id);
      if (official) {
        console.log(`  ✅ ID ${id}:`);
        Object.keys(official).forEach(key => {
          if (key !== 'No' && key !== 'Version') {
            console.log(`     ${key}: ${official[key]}`);
          }
        });
        console.log('');
      } else {
        console.log(`  ❌ ID ${id}: NOT FOUND\n`);
      }
    });

  } catch (error) {
    console.error(`  ❌ Error: ${error.message}\n`);
  }
}

async function main() {
  const tournamentNo = '429';

  // Test 1: Default (no fields)
  await testFields('Default - no fields', tournamentNo, '');

  // Test 2: Request name fields
  await testFields('Request name fields', tournamentNo, 'No FirstName LastName Federation');

  // Test 3: Request all possible fields
  await testFields('Request all fields', tournamentNo, 'No FirstName LastName FullName Name Federation FederationCode Role Type');

  // Test 4: Wildcard
  await testFields('Wildcard (*)', tournamentNo, '*');

  console.log('='.repeat(80));
  console.log('CONCLUSION');
  console.log('='.repeat(80) + '\n');
  console.log('If Fields parameter works, we should see names in the response.');
  console.log('If not, GetOfficialList has the same limitation as GetEventOfficialList.\n');
}

main();
