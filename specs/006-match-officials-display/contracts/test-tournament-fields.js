/**
 * Test GetBeachTournament with various Fields parameters
 * to see if we can retrieve personnel/official data
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const tournamentNo = process.argv[2] || '429';

console.log(`\n🔍 Testing GetBeachTournament Fields parameter for Tournament ${tournamentNo}...\n`);

function getBeachTournament(tournamentNo, fields = '') {
  return new Promise((resolve, reject) => {
    const fieldsAttr = fields ? ` Fields="${fields}"` : '';
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetBeachTournament" No="${tournamentNo}"${fieldsAttr} />
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
  console.log(`${'='.repeat(80)}`);
  console.log(`TEST: ${label}`);
  console.log('='.repeat(80));
  console.log(`Fields: ${fields || '(none - default)'}\n`);

  try {
    const response = await getBeachTournament(tournamentNo, fields);

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true
    });

    const result = parser.parse(response);
    const tournament = result?.Responses?.BeachTournament || {};

    // Check for official-related fields
    const officialFields = Object.keys(tournament).filter(key =>
      ['Official', 'Personnel', 'Scorer', 'Judge', 'Referee', 'Staff', 'Persons'].some(term =>
        key.includes(term)
      )
    );

    if (officialFields.length > 0) {
      console.log('✅ Found official-related fields:\n');
      officialFields.forEach(field => {
        const value = tournament[field];
        console.log(`  ${field}:`);
        if (typeof value === 'string' && value.length > 0) {
          console.log(`    ${value.substring(0, 500)}`);
        } else if (typeof value === 'object') {
          console.log(JSON.stringify(value, null, 2).substring(0, 500));
        } else {
          console.log(`    ${value || '(empty)'}`);
        }
        console.log('');
      });
    } else {
      console.log('❌ No official-related fields in response\n');
    }

    // Show all available keys
    console.log(`Total fields in response: ${Object.keys(tournament).length}\n`);

  } catch (error) {
    console.error(`  ❌ Error: ${error.message}\n`);
  }
}

async function main() {
  // Test 1: No fields (default)
  await testFields('Default (no fields)', '');

  // Test 2: Request Officials/Personnel explicitly
  await testFields('Officials request', 'No Officials Personnel EventAuxiliaryPersons');

  // Test 3: Request all possible official fields
  await testFields('All official fields', 'No Officials Personnel Referees Scorers LineJudges Staff EventAuxiliaryPersons OfficialList');

  // Test 4: Request all fields (wildcard)
  await testFields('All fields (*)', '*');

  console.log('='.repeat(80));
  console.log('CONCLUSION');
  console.log('='.repeat(80) + '\n');
  console.log('Based on the tests above:');
  console.log('  1. Can GetBeachTournament provide official names?');
  console.log('  2. Which field contains personnel data?');
  console.log('  3. Is there a way to get scorer/line judge details?\n');
}

main();
