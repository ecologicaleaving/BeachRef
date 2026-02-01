/**
 * Find Hamburg BPT 2025 tournament
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

async function findHamburgBPT2025() {
  console.log('='.repeat(80));
  console.log('🔍 SEARCHING FOR HAMBURG BPT 2025');
  console.log('='.repeat(80));
  console.log();

  try {
    const eventsRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetEventList" Fields="No Name StartDate EndDate Gender" />`;

    const eventsResponse = await makeVisApiCall(eventsRequest);
    const eventsData = parser.parse(eventsResponse);
    const events = eventsData.Events?.Event || [];
    const eventsArray = Array.isArray(events) ? events : [events];

    // Find all Hamburg tournaments in 2025
    const hamburg2025 = eventsArray.filter(e =>
      e.Name &&
      e.Name.toLowerCase().includes('hamburg') &&
      e.StartDate &&
      e.StartDate.startsWith('2025')
    );

    console.log(`Found ${hamburg2025.length} Hamburg tournaments in 2025:`);
    console.log('-'.repeat(80));
    hamburg2025.forEach(t => {
      console.log(`No: ${t.No}`);
      console.log(`  Name: ${t.Name}`);
      console.log(`  Start: ${t.StartDate}`);
      console.log(`  End: ${t.EndDate}`);
      console.log(`  Gender: ${t.Gender === 0 ? 'Men' : t.Gender === 1 ? 'Women' : 'Mixed'}`);
      console.log();
    });

    // Check each for matches
    for (const tournament of hamburg2025) {
      console.log(`\n📋 Checking matches in ${tournament.Name} (No: ${tournament.No})...`);
      console.log('-'.repeat(80));

      const matchesRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatchList" Fields="No NoInTournament RoundName TeamAName TeamBName Status">
  <Filter NoTournament="${tournament.No}" />
</Request>`;

      const matchesResponse = await makeVisApiCall(matchesRequest);
      const matchesData = parser.parse(matchesResponse);

      if (matchesData.NoData) {
        console.log('  ❌ No match data');
        continue;
      }

      const matches = matchesData.BeachMatchList?.BeachMatch || [];
      const matchesArray = Array.isArray(matches) ? matches : [matches];

      console.log(`  ✅ Found ${matchesArray.length} matches`);

      // Show first 5 matches
      console.log('\n  Sample matches:');
      matchesArray.slice(0, 5).forEach(m => {
        console.log(`    Match ${m.NoInTournament}: ${m.RoundName} - ${m.TeamAName} vs ${m.TeamBName}`);
      });

      // Find finals
      const finals = matchesArray.filter(m =>
        m.RoundName && m.RoundName.toLowerCase().includes('final')
      );

      if (finals.length > 0) {
        console.log(`\n  🏆 Found ${finals.length} final matches:`);
        finals.forEach(f => {
          console.log(`    Match ${f.NoInTournament}: ${f.RoundName} - ${f.TeamAName} vs ${f.TeamBName}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  console.log();
  console.log('='.repeat(80));
  console.log('✅ Search Complete');
  console.log('='.repeat(80));
}

findHamburgBPT2025();
