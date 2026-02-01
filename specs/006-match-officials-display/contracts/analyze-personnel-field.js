/**
 * Analyze Personnel field structure
 * Match 203000 has Personnel data with Scorer and LineJudges!
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const matchNo = process.argv[2] || '203000';

console.log(`\n🔍 Analyzing Personnel field for Match ${matchNo}...\n`);

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

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true
    });

    const result = parser.parse(response);
    const matchData = result?.Responses?.BeachMatch || {};

    console.log('Match Information:');
    console.log(`  Match No: ${matchData.No}`);
    console.log(`  Date: ${matchData.LocalDate} ${matchData.LocalTime || ''}`);
    console.log(`  Tournament: ${matchData.TournamentName || 'N/A'}`);
    console.log(`  Teams: ${matchData.TeamAName || 'N/A'} vs ${matchData.TeamBName || 'N/A'}`);
    console.log(`  Event No: ${matchData.NoEvent}`);
    console.log('');

    console.log('=' .repeat(80));
    console.log('PERSONNEL FIELD ANALYSIS');
    console.log('='.repeat(80) + '\n');

    console.log('Raw Personnel Field:');
    console.log(matchData.Personnel);
    console.log('');

    // Parse Personnel XML
    if (matchData.Personnel && matchData.Personnel.length > 0) {
      console.log('Parsing Personnel XML...\n');

      const personnelParser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        parseAttributeValue: true
      });

      const personnelData = personnelParser.parse(matchData.Personnel);
      const personnel = personnelData?.Personnel || {};

      console.log('Parsed Personnel Data:');
      console.log(JSON.stringify(personnel, null, 2));
      console.log('');

      console.log('=' .repeat(80));
      console.log('OFFICIAL IDs FOUND');
      console.log('='.repeat(80) + '\n');

      if (personnel.Scorer) {
        console.log(`✅ Scorer ID: ${personnel.Scorer}`);
      }
      if (personnel.AssistantScorer) {
        console.log(`✅ Assistant Scorer ID: ${personnel.AssistantScorer}`);
      }
      if (personnel.LineJudge1) {
        console.log(`✅ Line Judge 1 ID: ${personnel.LineJudge1}`);
      }
      if (personnel.LineJudge2) {
        console.log(`✅ Line Judge 2 ID: ${personnel.LineJudge2}`);
      }
      if (personnel.LineJudge3) {
        console.log(`✅ Line Judge 3 ID: ${personnel.LineJudge3}`);
      }
      if (personnel.LineJudge4) {
        console.log(`✅ Line Judge 4 ID: ${personnel.LineJudge4}`);
      }

      console.log('');
      console.log('=' .repeat(80));
      console.log('NEXT STEPS');
      console.log('='.repeat(80) + '\n');

      console.log('The Personnel field contains NUMERIC IDs, not names.');
      console.log('To get names, we need to:');
      console.log('');
      console.log('1. Use GetEventOfficialList endpoint with EventNo:', matchData.NoEvent);
      console.log('2. Match NoOfficial from official list with IDs in Personnel field');
      console.log('3. Build a mapping of ID -> Official Name');
      console.log('');
      console.log('This is a TWO-STEP process:');
      console.log('  Step 1: GetBeachMatch → Get Personnel IDs');
      console.log('  Step 2: GetEventOfficialList → Get Official Names for those IDs');
      console.log('');

    } else {
      console.log('❌ Personnel field is empty for this match');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main();
