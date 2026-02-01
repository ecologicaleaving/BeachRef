/**
 * Test to get ALL fields from Hamburg 2025 Finals
 * Request ALL fields to see exact field names
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '_text',
  parseAttributeValue: true
});

function makeVisApiCall(xmlRequest) {
  return new Promise((resolve, reject) => {
    const formData = `Request=${encodeURIComponent(xmlRequest)}`;

    const options = {
      hostname: 'www.fivb.org',
      port: 443,
      path: '/Vis2009/XmlRequest.asmx',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(formData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.write(formData);
    req.end();
  });
}

async function testAllFields() {
  console.log('='.repeat(80));
  console.log('🔍 GET ALL FIELDS FROM HAMBURG 2025 MEN\'S FINAL');
  console.log('='.repeat(80));
  console.log();

  try {
    // Query Men's Final (Match 44) with NO Fields parameter to get ALL fields
    console.log('📋 Requesting Men\'s Final (Match 44) with ALL fields');
    console.log('-'.repeat(80));

    // Request with minimal Fields to see what's available
    const request = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatchList" Fields="No">
  <Filter NoTournament="8239" />
</Request>`;

    console.log('Request:', request);
    console.log();

    const response = await makeVisApiCall(request);
    const data = parser.parse(response);

    const matches = data.BeachMatches?.BeachMatch || [];
    const matchesArray = Array.isArray(matches) ? matches : [matches];

    console.log(`Got ${matchesArray.length} matches`);
    console.log();

    // Show what match numbers we got
    console.log('Match numbers available:');
    matchesArray.slice(0, 5).forEach(m => {
      console.log(`  Match ${m.NoInTournament || m.No}: ${m.RoundName || 'unknown'}`);
    });
    console.log();

    // Find the final (Match 44)
    let menFinal = matchesArray.find(m => m.NoInTournament === 44 || m.No === '495298');

    if (!menFinal) {
      console.log('❌ Could not find Match 44 (Men\'s Final)');
      console.log('Looking for any final match...');

      // Try to find any final
      menFinal = matchesArray.find(m =>
        m.RoundName && m.RoundName.toLowerCase().includes('final 1st')
      );

      if (!menFinal) {
        console.log('❌ Could not find any final match');
        return;
      } else {
        console.log('✅ Found a final match, using that instead');
      }
    }

    console.log('✅ Found Men\'s Final (Match 44)');
    console.log(`   ${menFinal.TeamAName} vs ${menFinal.TeamBName}`);
    console.log();
    console.log('='.repeat(80));
    console.log('📋 ALL AVAILABLE FIELDS:');
    console.log('='.repeat(80));
    console.log();

    // List ALL fields
    const allFields = Object.keys(menFinal).sort();

    console.log(`Total fields: ${allFields.length}`);
    console.log();

    allFields.forEach(field => {
      const value = menFinal[field];
      const valueStr = typeof value === 'string' && value.length > 100
        ? value.substring(0, 100) + '...'
        : JSON.stringify(value);

      console.log(`${field}: ${valueStr}`);
    });

    console.log();
    console.log('='.repeat(80));
    console.log('🎯 REFEREE-RELATED FIELDS:');
    console.log('='.repeat(80));
    console.log();

    // Show all referee-related fields
    const refereeFields = allFields.filter(f =>
      f.toLowerCase().includes('referee') ||
      f.toLowerCase().includes('official') ||
      f.toLowerCase().includes('challenge')
    );

    if (refereeFields.length === 0) {
      console.log('❌ No referee-related fields found');
    } else {
      refereeFields.forEach(field => {
        console.log(`${field}: ${menFinal[field]}`);
      });
    }

    console.log();
    console.log('='.repeat(80));
    console.log('📋 PERSONNEL FIELD:');
    console.log('='.repeat(80));
    console.log();

    if (menFinal.Personnel) {
      console.log('Raw Personnel:');
      console.log(menFinal.Personnel);
    } else {
      console.log('❌ No Personnel field');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  console.log();
  console.log('='.repeat(80));
  console.log('✅ Test Complete');
  console.log('='.repeat(80));
}

testAllFields();
