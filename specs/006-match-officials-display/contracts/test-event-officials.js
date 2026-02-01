/**
 * Test GetEventOfficialList endpoint
 * Retrieve official list for Event 429 to map Personnel IDs to names
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const eventNo = process.argv[2] || '429';

console.log(`\n🔍 Testing GetEventOfficialList for Event ${eventNo}...\n`);

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

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true
    });

    const result = parser.parse(response);
    const officials = result?.Responses?.EventOfficialList?.EventOfficial || [];

    console.log('Event Official List Results:');
    console.log(`  Event No: ${eventNo}`);
    console.log(`  Officials Found: ${Array.isArray(officials) ? officials.length : (officials ? 1 : 0)}`);
    console.log('');

    console.log('=' .repeat(80));
    console.log('OFFICIAL MAPPING FOR PERSONNEL IDs');
    console.log('='.repeat(80) + '\n');

    // Personnel IDs from match 203000
    const personnelIds = {
      Scorer: 19,
      AssistantScorer: 26,
      LineJudge1: 3,
      LineJudge2: 10
    };

    console.log('Looking for these Personnel IDs:\n');
    Object.entries(personnelIds).forEach(([role, id]) => {
      console.log(`  ${role.padEnd(20)} ID: ${id}`);
    });
    console.log('\n' + '-'.repeat(80) + '\n');

    // Convert to array if single official
    const officialArray = Array.isArray(officials) ? officials : (officials ? [officials] : []);

    if (officialArray.length === 0) {
      console.log('❌ No officials found for this event\n');
      return;
    }

    // Map IDs to officials
    const mappedOfficials = {};
    Object.entries(personnelIds).forEach(([role, id]) => {
      const official = officialArray.find(o => o.NoOfficial === id.toString() || o.NoOfficial === id);
      if (official) {
        mappedOfficials[role] = official;
        console.log(`✅ ${role.padEnd(20)} [ID: ${id}]`);
        console.log(`   Name: ${official.FirstName || ''} ${official.LastName || ''}`);
        console.log(`   Federation: ${official.Federation || 'N/A'}`);
        console.log(`   Role: ${official.Role || 'N/A'}`);
        console.log('');
      } else {
        console.log(`❌ ${role.padEnd(20)} [ID: ${id}] - NOT FOUND in official list\n`);
      }
    });

    console.log('=' .repeat(80));
    console.log('ALL OFFICIALS IN EVENT');
    console.log('='.repeat(80) + '\n');

    // Show all officials for reference
    console.log(`Total Officials: ${officialArray.length}\n`);
    officialArray.slice(0, 20).forEach(official => {
      console.log(`ID: ${official.NoOfficial?.toString().padEnd(5)} | ${(official.FirstName || '').padEnd(15)} ${(official.LastName || '').padEnd(15)} | ${official.Federation || 'N/A'} | ${official.Role || 'N/A'}`);
    });

    if (officialArray.length > 20) {
      console.log(`\n... and ${officialArray.length - 20} more officials\n`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('VERDICT');
    console.log('='.repeat(80) + '\n');

    const matchedCount = Object.keys(mappedOfficials).length;
    const totalPersonnel = Object.keys(personnelIds).length;

    if (matchedCount === totalPersonnel) {
      console.log('✅ SUCCESS: All Personnel IDs successfully mapped to official names!\n');
      console.log('This confirms the TWO-STEP process works:');
      console.log('  Step 1: GetBeachMatch → Extract Personnel IDs');
      console.log('  Step 2: GetEventOfficialList → Map IDs to names\n');
    } else if (matchedCount > 0) {
      console.log(`⚠️  PARTIAL: ${matchedCount}/${totalPersonnel} Personnel IDs mapped\n`);
      console.log('Some IDs may be invalid or officials not in this event list.\n');
    } else {
      console.log('❌ FAILURE: No Personnel IDs could be mapped to officials\n');
      console.log('Possible issues:');
      console.log('  - NoOfficial field has different name');
      console.log('  - IDs are from different event');
      console.log('  - API response structure different than expected\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main();
