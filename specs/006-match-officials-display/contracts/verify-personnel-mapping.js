/**
 * VERIFICATION: Map Personnel IDs to AuxiliaryPersons names
 *
 * Match 203000 Personnel field:
 *   Scorer="19", AssistantScorer="26", LineJudge1="3", LineJudge2="10"
 *
 * GetEvent (429) AuxiliaryPersons should contain these IDs with names
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

console.log('\n🔍 VERIFICATION: Personnel ID to Name Mapping\n');
console.log('='.repeat(80));
console.log('Match 203000 Personnel IDs:');
console.log('  Scorer: 19');
console.log('  Assistant Scorer: 26');
console.log('  Line Judge 1: 3');
console.log('  Line Judge 2: 10');
console.log('='.repeat(80) + '\n');

function getEvent(eventNo) {
  return new Promise((resolve, reject) => {
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetEvent" No="${eventNo}" Fields="No AuxiliaryPersons" />
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
    console.log('Step 1: Fetching Event 429 AuxiliaryPersons...\n');

    const response = await getEvent('429');

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true
    });

    const result = parser.parse(response);
    const event = result?.Responses?.Event || {};

    if (!event.AuxiliaryPersons) {
      console.log('❌ FAILED: No AuxiliaryPersons field in response\n');
      return;
    }

    console.log('✅ AuxiliaryPersons field found\n');
    console.log('Step 2: Parsing AuxiliaryPersons XML...\n');

    // Decode HTML entities and parse XML
    const auxXml = event.AuxiliaryPersons
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#xD;&#xA;/g, '\n');

    const auxParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true
    });

    const auxData = auxParser.parse(auxXml);
    const persons = auxData?.AuxiliaryPersons?.AuxiliaryPerson || [];
    const personArray = Array.isArray(persons) ? persons : [persons];

    console.log(`✅ Parsed ${personArray.length} auxiliary persons\n`);

    console.log('Step 3: Mapping Personnel IDs to Names...\n');
    console.log('='.repeat(80));

    const personnelMapping = {
      'Scorer': { id: 19, person: null },
      'Assistant Scorer': { id: 26, person: null },
      'Line Judge 1': { id: 3, person: null },
      'Line Judge 2': { id: 10, person: null }
    };

    // Map IDs to persons
    Object.entries(personnelMapping).forEach(([role, data]) => {
      const person = personArray.find(p => p.No === data.id);
      if (person) {
        personnelMapping[role].person = person;
      }
    });

    // Display results
    let successCount = 0;
    Object.entries(personnelMapping).forEach(([role, data]) => {
      if (data.person) {
        console.log(`✅ ${role.padEnd(20)} [ID: ${data.id}]`);
        console.log(`   Name: ${data.person.FirstName} ${data.person.LastName}`);
        console.log(`   Nationality: ${data.person.NationalityCode}`);
        console.log(`   Gender: ${data.person.Gender === 1 ? 'Female' : 'Male'}`);
        console.log(`   Functions: ${data.person.Functions}`);
        console.log('');
        successCount++;
      } else {
        console.log(`❌ ${role.padEnd(20)} [ID: ${data.id}] - NOT FOUND`);
        console.log('');
      }
    });

    console.log('='.repeat(80));
    console.log('FINAL VERDICT');
    console.log('='.repeat(80) + '\n');

    if (successCount === 4) {
      console.log('🎉 SUCCESS! All 4 Personnel IDs mapped to names!\n');
      console.log('The Complete Solution:');
      console.log('  Step 1: GetBeachMatch → Extract Personnel XML and EventNo');
      console.log('  Step 2: Parse Personnel XML → Get IDs (3, 10, 19, 26)');
      console.log('  Step 3: GetEvent (EventNo) → Get AuxiliaryPersons XML');
      console.log('  Step 4: Parse AuxiliaryPersons → Map IDs to names\n');
      console.log('✅ ALL match officials CAN BE IMPLEMENTED with names!\n');
      console.log('This includes:');
      console.log('  ✅ Challenge Referee (from BeachMatch fields)');
      console.log('  ✅ Scorer (from Personnel → AuxiliaryPersons)');
      console.log('  ✅ Assistant Scorer (from Personnel → AuxiliaryPersons)');
      console.log('  ✅ Line Judges (from Personnel → AuxiliaryPersons)\n');
    } else {
      console.log(`⚠️  PARTIAL: ${successCount}/4 Personnel IDs mapped\n`);
      console.log('Some IDs could not be resolved.\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main();
