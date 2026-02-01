/**
 * Query Hamburg 2025 Tournament 1552 matches with Challenge Referee data
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
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

async function showHamburg1552Matches() {
  console.log('='.repeat(80));
  console.log('🏐 HAMBURG 2025 (Tournament 1552) - CHALLENGE REFEREE DATA');
  console.log('='.repeat(80));
  console.log();

  try {
    // Use the EXACT format that the app uses
    const matchesRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatchList" Fields="No NoInTournament RoundName Status TeamAName TeamBName Referee1Name Referee1FederationCode Referee2Name Referee2FederationCode RefereeChallengeName RefereeChallengeFederationCode Personnel EventNo">
  <Filter NoTournament="1552" />
</Request>`;

    console.log('📤 Request:');
    console.log(matchesRequest);
    console.log();

    const response = await makeVisApiCall(matchesRequest);

    // Parse response
    const data = parser.parse(response);

    if (data.NoData) {
      console.log('❌ No match data found');
      console.log('Raw response:', response);
      return;
    }

    const matches = data.BeachMatchList?.BeachMatch || data.BeachMatches?.BeachMatch || [];
    const matchesArray = Array.isArray(matches) ? matches : [matches];

    console.log(`✅ Found ${matchesArray.length} matches`);
    console.log();

    // Find finals
    const finals = matchesArray.filter(m =>
      m.RoundName && (
        m.RoundName.toLowerCase().includes('final') ||
        m.RoundName.toLowerCase().includes('gold') ||
        m.RoundName.toLowerCase().includes('bronze')
      )
    );

    console.log(`🏆 Found ${finals.length} final/medal matches`);
    console.log('='.repeat(80));
    console.log();

    // Show finals with Challenge Referee
    finals.forEach((match, idx) => {
      console.log(`MATCH ${idx + 1}: ${match.RoundName}`);
      console.log('-'.repeat(80));
      console.log(`Match No: ${match.No} (${match.NoInTournament})`);
      console.log(`Teams: ${match.TeamAName} vs ${match.TeamBName}`);
      console.log(`Status: ${match.Status}`);
      console.log();

      console.log('PRIMARY REFEREES:');
      console.log(`  R1: ${match.Referee1Name || '(not assigned)'} ${match.Referee1FederationCode ? `(${match.Referee1FederationCode})` : ''}`);
      console.log(`  R2: ${match.Referee2Name || '(not assigned)'} ${match.Referee2FederationCode ? `(${match.Referee2FederationCode})` : ''}`);
      console.log();

      if (match.RefereeChallengeName) {
        console.log('🎯 CHALLENGE REFEREE:');
        console.log(`  Name: ${match.RefereeChallengeName}`);
        console.log(`  Federation: ${match.RefereeChallengeFederationCode || 'N/A'}`);
        console.log();
      } else {
        console.log('ℹ️  No Challenge Referee assigned');
        console.log();
      }

      if (match.Personnel) {
        console.log('📋 PERSONNEL FIELD (Scorer, Line Judges):');
        console.log(`  Raw (first 100 chars): ${match.Personnel.substring(0, 100)}...`);
        console.log();

        try {
          const decodedPersonnel = decodeHtmlEntities(match.Personnel);
          const personnelData = parser.parse(decodedPersonnel);
          console.log('  Parsed Personnel IDs:');
          console.log(JSON.stringify(personnelData, null, 4));
          console.log();
        } catch (e) {
          console.log('  (Could not parse Personnel XML)');
          console.log();
        }
      } else {
        console.log('ℹ️  No Personnel field');
        console.log();
      }

      console.log('='.repeat(80));
      console.log();
    });

    // Show sample of other matches
    console.log('📋 SAMPLE OF OTHER MATCHES:');
    console.log('-'.repeat(80));
    matchesArray.slice(0, 10).forEach(m => {
      const cr = m.RefereeChallengeName ? `CR: ${m.RefereeChallengeName}` : 'No CR';
      console.log(`Match ${m.NoInTournament}: ${m.RoundName} - ${m.TeamAName} vs ${m.TeamBName} (${cr})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  console.log();
  console.log('='.repeat(80));
  console.log('✅ Query Complete');
  console.log('='.repeat(80));
}

showHamburg1552Matches();
