/**
 * Test GetEvent endpoint for AuxiliaryPersons
 * User suggestion: GetEvent should have AuxiliaryPersons field
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const eventNo = process.argv[2] || '429'; // Event from Match 203000

console.log(`\n🔍 Testing GetEvent for Event ${eventNo}...\n`);

function getEvent(eventNo, fields = '') {
  return new Promise((resolve, reject) => {
    const fieldsAttr = fields ? ` Fields="${fields}"` : '';
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetEvent" No="${eventNo}"${fieldsAttr} />
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

async function testGetEvent(label, fields) {
  console.log(`${'='.repeat(80)}`);
  console.log(`TEST: ${label}`);
  console.log('='.repeat(80));
  console.log(`Fields: ${fields || '(none - default)'}\n`);

  try {
    const response = await getEvent(eventNo, fields);

    console.log('Raw XML Response (first 3000 chars):');
    console.log(response.substring(0, 3000));
    console.log('...\n');

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true
    });

    const result = parser.parse(response);
    const event = result?.Responses?.Event || {};

    // Check for AuxiliaryPersons
    console.log('Checking for AuxiliaryPersons field...');
    if (event.AuxiliaryPersons !== undefined) {
      console.log('✅ AuxiliaryPersons field EXISTS!\n');
      console.log('Type:', typeof event.AuxiliaryPersons);
      console.log('Length:', event.AuxiliaryPersons ? event.AuxiliaryPersons.length : 0);
      console.log('');

      if (event.AuxiliaryPersons && event.AuxiliaryPersons.length > 0) {
        console.log('🎯 BREAKTHROUGH! AuxiliaryPersons contains data:\n');
        console.log(event.AuxiliaryPersons.substring(0, 2000));
        console.log('...\n');

        // Try to parse if it's XML
        try {
          const auxParser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '',
            parseAttributeValue: true
          });
          const auxData = auxParser.parse(event.AuxiliaryPersons);
          console.log('Parsed AuxiliaryPersons:');
          console.log(JSON.stringify(auxData, null, 2).substring(0, 2000));
          console.log('');
        } catch (e) {
          console.log('(Not XML or failed to parse)');
        }
      } else {
        console.log('❌ AuxiliaryPersons is empty\n');
      }
    } else {
      console.log('❌ AuxiliaryPersons field NOT FOUND\n');
    }

    // Search all keys for Personnel/Official/Scorer
    console.log('All Event fields containing Personnel/Official/Scorer/Judge:');
    const searchTerms = ['Personnel', 'Official', 'Scorer', 'Judge', 'Auxiliary', 'Staff'];
    Object.keys(event).forEach(key => {
      if (searchTerms.some(term => key.includes(term))) {
        const value = event[key];
        console.log(`  ${key}:`);
        if (typeof value === 'string') {
          console.log(`    ${value.substring(0, 200)}${value.length > 200 ? '...' : ''}`);
        } else {
          console.log(`    ${value}`);
        }
      }
    });
    console.log('');

    // Show all keys
    console.log(`Total fields in Event: ${Object.keys(event).length}`);
    console.log('All keys:', Object.keys(event).join(', '));
    console.log('');

  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }
}

async function main() {
  console.log(`Testing Event ${eventNo} (from Match 203000 - Fort Lauderdale 2017)\n`);

  // Test 1: Default
  await testGetEvent('Default (no fields)', '');

  // Test 2: Request AuxiliaryPersons explicitly
  await testGetEvent('Request AuxiliaryPersons', 'No AuxiliaryPersons');

  // Test 3: Request all personnel fields
  await testGetEvent('All personnel fields', 'No AuxiliaryPersons Personnel Officials Scorers LineJudges');

  console.log('='.repeat(80));
  console.log('VERDICT');
  console.log('='.repeat(80) + '\n');
  console.log('If AuxiliaryPersons contains data with Personnel IDs 3, 10, 19, 26,');
  console.log('we can map them to names and SOLVE the scorer/line judge problem!\n');
}

main();
