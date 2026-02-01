/**
 * Test Event No 1552 (vs Tournament No 1552)
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

function decodeHtmlEntities(text) {
  if (!text) return text;
  return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

async function testEvent1552() {
  console.log('='.repeat(80));
  console.log('🔍 TESTING EVENT No 1552 (Hamburg 2025)');
  console.log('='.repeat(80));
  console.log();

  try {
    // TEST 1: GetEvent
    console.log('📋 TEST 1: GetEvent No="1552"');
    console.log('-'.repeat(80));
    const eventRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetEvent" No="1552" Fields="No Name StartDate EndDate City Country Gender" />`;

    const eventResponse = await makeVisApiCall(eventRequest);
    console.log('Response:', eventResponse);
    const eventData = parser.parse(eventResponse);
    console.log('Parsed:');
    console.log(JSON.stringify(eventData, null, 2));
    console.log();

    // TEST 2: GetBeachMatchList with NoEvent
    console.log('📋 TEST 2: GetBeachMatchList with NoEvent="1552"');
    console.log('-'.repeat(80));
    const matchesRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatchList" NoEvent="1552" Fields="No NoInTournament RoundName TeamAName TeamBName Referee1Name Referee2Name RefereeChallengeName RefereeChallengeFederationCode Personnel" />`;

    const matchesResponse = await makeVisApiCall(matchesRequest);
    console.log('Response (first 1000 chars):', matchesResponse.substring(0, 1000));

    const matchesData = parser.parse(matchesResponse);
    const matches = matchesData.BeachMatches?.BeachMatch || matchesData.BeachMatchList?.BeachMatch || [];
    const matchesArray = Array.isArray(matches) ? matches : (matches.No ? [matches] : []);

    console.log(`✅ Found ${matchesArray.length} matches`);
    console.log();

    if (matchesArray.length > 0) {
      // Find finals
      const finals = matchesArray.filter(m =>
        m.RoundName && typeof m.RoundName === 'string' && (
          m.RoundName.toLowerCase().includes('final') ||
          m.RoundName.toLowerCase().includes('gold') ||
          m.RoundName.toLowerCase().includes('bronze')
        )
      );

      console.log(`🏆 Found ${finals.length} final matches:`);
      console.log('='.repeat(80));

      finals.forEach((match, idx) => {
        console.log();
        console.log(`FINAL MATCH ${idx + 1}: ${match.RoundName}`);
        console.log('-'.repeat(80));
        console.log(`Match No: ${match.No} (In Tournament: ${match.NoInTournament})`);
        console.log(`Teams: ${match.TeamAName} vs ${match.TeamBName}`);
        console.log();
        console.log(`R1: ${match.Referee1Name || '(not assigned)'}`);
        console.log(`R2: ${match.Referee2Name || '(not assigned)'}`);
        console.log();

        if (match.RefereeChallengeName) {
          console.log('🎯 CHALLENGE REFEREE:');
          console.log(`  Name: ${match.RefereeChallengeName}`);
          console.log(`  Federation: ${match.RefereeChallengeFederationCode || 'N/A'}`);
        } else {
          console.log('ℹ️  No Challenge Referee assigned');
        }
        console.log();

        if (match.Personnel) {
          console.log('📋 PERSONNEL FIELD:');
          console.log(`  Length: ${match.Personnel.length} chars`);
          console.log(`  First 200 chars: ${match.Personnel.substring(0, 200)}...`);

          try {
            const decoded = decodeHtmlEntities(match.Personnel);
            const personnelData = parser.parse(decoded);
            console.log('  Parsed:');
            console.log(JSON.stringify(personnelData, null, 4));
          } catch (e) {
            console.log('  (Could not parse)');
          }
        }

        console.log('='.repeat(80));
      });

      // Show sample
      console.log();
      console.log('📋 SAMPLE OF ALL MATCHES (first 15):');
      console.log('-'.repeat(80));
      matchesArray.slice(0, 15).forEach((m, i) => {
        const cr = m.RefereeChallengeName ? `[CR: ${m.RefereeChallengeName}]` : '';
        console.log(`${i + 1}. Match ${m.NoInTournament}: ${m.RoundName} - ${m.TeamAName || 'TBD'} vs ${m.TeamBName || 'TBD'} ${cr}`);
      });
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

testEvent1552();
