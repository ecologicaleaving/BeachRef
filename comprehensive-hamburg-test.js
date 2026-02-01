/**
 * Comprehensive test for Hamburg 2025 Tournament 1552
 * Try multiple approaches to get match data
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
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

async function comprehensiveTest() {
  console.log('='.repeat(80));
  console.log('🔍 COMPREHENSIVE HAMBURG 2025 TEST (Tournament 1552)');
  console.log('='.repeat(80));
  console.log();

  try {
    // APPROACH 1: GetBeachTournament to check tournament metadata
    console.log('📋 APPROACH 1: GetBeachTournament');
    console.log('-'.repeat(80));
    const tournamentRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachTournament" No="1552" Fields="No Name StartDate EndDate NoOfMatches Status" />`;

    console.log('Request:', tournamentRequest);
    const tournamentResponse = await makeVisApiCall(tournamentRequest);
    console.log('Response:', tournamentResponse.substring(0, 500));
    console.log();

    const tournamentData = parser.parse(tournamentResponse);
    if (tournamentData.BeachTournament) {
      console.log('✅ Tournament Data:');
      console.log(JSON.stringify(tournamentData.BeachTournament, null, 2));
      console.log();
    }

    // APPROACH 2: GetBeachMatchList with Filter
    console.log('📋 APPROACH 2: GetBeachMatchList with <Filter>');
    console.log('-'.repeat(80));
    const matchesRequest1 = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatchList" Fields="No NoInTournament RoundName TeamAName TeamBName RefereeChallengeName RefereeChallengeFederationCode">
  <Filter NoTournament="1552" />
</Request>`;

    console.log('Request:', matchesRequest1);
    const matchesResponse1 = await makeVisApiCall(matchesRequest1);
    console.log('Response:', matchesResponse1.substring(0, 500));
    const matches1 = parser.parse(matchesResponse1);
    console.log('Parsed:', JSON.stringify(matches1, null, 2).substring(0, 300));
    console.log();

    // APPROACH 3: GetBeachMatchList with NoTournament attribute (no Filter)
    console.log('📋 APPROACH 3: GetBeachMatchList with NoTournament attribute');
    console.log('-'.repeat(80));
    const matchesRequest2 = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatchList" NoTournament="1552" Fields="No NoInTournament RoundName TeamAName TeamBName RefereeChallengeName" />`;

    console.log('Request:', matchesRequest2);
    const matchesResponse2 = await makeVisApiCall(matchesRequest2);
    console.log('Response (first 1000 chars):', matchesResponse2.substring(0, 1000));

    const matches2 = parser.parse(matchesResponse2);
    if (matches2.BeachMatches || matches2.BeachMatchList) {
      const matchesArray = matches2.BeachMatches?.BeachMatch || matches2.BeachMatchList?.BeachMatch || [];
      const arr = Array.isArray(matchesArray) ? matchesArray : [matchesArray];

      console.log(`✅ Found ${arr.length} matches!`);
      console.log();

      // Find finals
      const finals = arr.filter(m =>
        m.RoundName && (
          m.RoundName.toLowerCase().includes('final') ||
          m.RoundName.toLowerCase().includes('gold') ||
          m.RoundName.toLowerCase().includes('bronze')
        )
      );

      console.log(`🏆 Found ${finals.length} final matches:`);
      console.log('-'.repeat(80));

      finals.forEach((match, idx) => {
        console.log();
        console.log(`FINAL MATCH ${idx + 1}:`);
        console.log(`  Match No: ${match.No}`);
        console.log(`  Round: ${match.RoundName}`);
        console.log(`  Teams: ${match.TeamAName} vs ${match.TeamBName}`);

        if (match.RefereeChallengeName) {
          console.log(`  🎯 CHALLENGE REFEREE: ${match.RefereeChallengeName} (${match.RefereeChallengeFederationCode || 'N/A'})`);
        } else {
          console.log(`  ℹ️  No Challenge Referee`);
        }
      });

      // Show sample of all matches
      console.log();
      console.log('📋 SAMPLE OF ALL MATCHES (first 10):');
      console.log('-'.repeat(80));
      arr.slice(0, 10).forEach(m => {
        console.log(`Match ${m.NoInTournament || m.No}: ${m.RoundName} - ${m.TeamAName || 'TBD'} vs ${m.TeamBName || 'TBD'}`);
      });
    } else {
      console.log('❌ No matches found');
    }
    console.log();

    // APPROACH 4: GetEvent to check EventNo and AuxiliaryPersons
    console.log('📋 APPROACH 4: GetEvent (for Personnel mapping)');
    console.log('-'.repeat(80));
    const eventRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetEvent" No="1552" Fields="No Name StartDate EndDate AuxiliaryPersons" />`;

    console.log('Request:', eventRequest);
    const eventResponse = await makeVisApiCall(eventRequest);
    console.log('Response (first 500 chars):', eventResponse.substring(0, 500));

    const eventData = parser.parse(eventResponse);
    if (eventData.Event?.AuxiliaryPersons) {
      console.log('✅ Found AuxiliaryPersons field');
      const decoded = decodeHtmlEntities(eventData.Event.AuxiliaryPersons);
      const auxData = parser.parse(decoded);
      const persons = auxData.AuxiliaryPersons?.AuxiliaryPerson || [];
      const personsArray = Array.isArray(persons) ? persons : [persons];
      console.log(`Found ${personsArray.length} auxiliary persons (for Personnel ID mapping)`);

      // Show first 5
      console.log('First 5 persons:');
      personsArray.slice(0, 5).forEach(p => {
        console.log(`  ID ${p.No}: ${p.FirstName} ${p.LastName} (${p.NationalityCode}) - Functions: ${p.Functions}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  console.log();
  console.log('='.repeat(80));
  console.log('✅ Comprehensive Test Complete');
  console.log('='.repeat(80));
}

comprehensiveTest();
