/**
 * Check what rounds exist in Hamburg 2025 tournaments
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

async function checkRounds() {
  console.log('='.repeat(80));
  console.log('🔍 CHECKING HAMBURG 2025 ROUNDS');
  console.log('='.repeat(80));
  console.log();

  try {
    // Query Men's Tournament (8239)
    console.log('👨 MEN\'S TOURNAMENT (8239):');
    console.log('-'.repeat(80));
    const menRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatchList" Fields="No NoInTournament RoundName RoundPhase Round Status">
  <Filter NoTournament="8239" />
</Request>`;

    const menResponse = await makeVisApiCall(menRequest);
    const menData = parser.parse(menResponse);
    const menMatches = menData.BeachMatches?.BeachMatch || [];
    const menMatchesArray = Array.isArray(menMatches) ? menMatches : [menMatches];

    // Group by round
    const menRounds = {};
    menMatchesArray.forEach(m => {
      const key = `${m.RoundName} (Phase: ${m.RoundPhase}, Round: ${m.Round})`;
      if (!menRounds[key]) {
        menRounds[key] = [];
      }
      menRounds[key].push(m);
    });

    console.log(`Total matches: ${menMatchesArray.length}`);
    console.log();
    console.log('Rounds:');
    Object.entries(menRounds).forEach(([round, matches]) => {
      console.log(`  ${round}: ${matches.length} matches`);
    });
    console.log();

    // Query Women's Tournament (8238)
    console.log('👩 WOMEN\'S TOURNAMENT (8238):');
    console.log('-'.repeat(80));
    const womenRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatchList" Fields="No NoInTournament RoundName RoundPhase Round Status">
  <Filter NoTournament="8238" />
</Request>`;

    const womenResponse = await makeVisApiCall(womenRequest);
    const womenData = parser.parse(womenResponse);
    const womenMatches = womenData.BeachMatches?.BeachMatch || [];
    const womenMatchesArray = Array.isArray(womenMatches) ? womenMatches : [womenMatches];

    const womenRounds = {};
    womenMatchesArray.forEach(m => {
      const key = `${m.RoundName} (Phase: ${m.RoundPhase}, Round: ${m.Round})`;
      if (!womenRounds[key]) {
        womenRounds[key] = [];
      }
      womenRounds[key].push(m);
    });

    console.log(`Total matches: ${womenMatchesArray.length}`);
    console.log();
    console.log('Rounds:');
    Object.entries(womenRounds).forEach(([round, matches]) => {
      console.log(`  ${round}: ${matches.length} matches`);
    });
    console.log();

    // Find finals by name
    console.log('='.repeat(80));
    console.log('🏆 MATCHES WITH "FINAL" IN NAME:');
    console.log('='.repeat(80));
    console.log();

    const menFinalsLike = menMatchesArray.filter(m =>
      m.RoundName && m.RoundName.toLowerCase().includes('final')
    );
    const womenFinalsLike = womenMatchesArray.filter(m =>
      m.RoundName && m.RoundName.toLowerCase().includes('final')
    );

    console.log(`Men's: ${menFinalsLike.length} matches`);
    menFinalsLike.forEach(m => {
      console.log(`  Match ${m.NoInTournament}: ${m.RoundName} (Phase: ${m.RoundPhase}, Round: ${m.Round})`);
    });

    console.log();
    console.log(`Women's: ${womenFinalsLike.length} matches`);
    womenFinalsLike.forEach(m => {
      console.log(`  Match ${m.NoInTournament}: ${m.RoundName} (Phase: ${m.RoundPhase}, Round: ${m.Round})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  console.log();
  console.log('='.repeat(80));
  console.log('✅ Check Complete');
  console.log('='.repeat(80));
}

checkRounds();
