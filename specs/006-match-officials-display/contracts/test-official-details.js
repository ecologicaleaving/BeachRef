/**
 * Test GetEventOfficialList with Fields parameter
 * Try to get official names and details
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const eventNo = process.argv[2] || '429';

console.log(`\n🔍 Testing GetEventOfficialList with Fields parameter for Event ${eventNo}...\n`);

function getEventOfficialList(eventNo, fields = '') {
  return new Promise((resolve, reject) => {
    const fieldsAttr = fields ? ` Fields="${fields}"` : '';
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetEventOfficialList" No="${eventNo}"${fieldsAttr} />
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

async function testFields(label, fields) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: ${label}`);
  console.log('='.repeat(80) + '\n');
  console.log(`Fields: ${fields || '(none - default)'}\n`);

  try {
    const response = await getEventOfficialList(eventNo, fields);

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true
    });

    const result = parser.parse(response);
    const officials = result?.Responses?.EventOfficials?.EventOfficial || [];
    const officialArray = Array.isArray(officials) ? officials : [officials];

    console.log(`Officials Found: ${officialArray.length}\n`);

    if (officialArray.length > 0) {
      // Show first official's fields
      console.log('First Official Fields:');
      const firstOfficial = officialArray[0];
      Object.keys(firstOfficial).forEach(key => {
        console.log(`  ${key}: ${firstOfficial[key]}`);
      });
      console.log('');

      // Check for our Personnel IDs
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
        } else {
          console.log(`  ❌ ID ${id}: NOT FOUND`);
        }
      });
    }

  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
  }
}

async function main() {
  // Test 1: No fields (default)
  await testFields('Default (no fields)', '');

  // Test 2: Common fields
  await testFields('Common fields', 'No FirstName LastName Federation Role');

  // Test 3: All possible fields
  await testFields('All fields attempt', 'No FirstName LastName Federation Role NoOfficial OfficialName FederationCode');

  // Test 4: Just Name fields
  await testFields('Just name fields', 'No FirstName LastName');

  console.log('\n' + '='.repeat(80));
  console.log('CONCLUSION');
  console.log('='.repeat(80) + '\n');
  console.log('Based on the tests above, we can determine:');
  console.log('  1. Which Fields parameter format works');
  console.log('  2. Which field names are correct for official details');
  console.log('  3. If GetEventOfficialList can return names and federations\n');
}

main();
