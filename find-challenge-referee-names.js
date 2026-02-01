/**
 * Find Challenge Referee names by searching ALL matches
 * Look for where IDs 155330 and 151291 appear as Referee1 or Referee2
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

async function findChallengeRefereeNames() {
  console.log('='.repeat(80));
  console.log('🔍 FIND CHALLENGE REFEREE NAMES');
  console.log('='.repeat(80));
  console.log();
  console.log('Searching for Challenge Referee IDs: 155330, 151291');
  console.log('Strategy: Find where these IDs appear as Referee1 or Referee2');
  console.log();

  const searchIds = [155330, 151291];
  const foundReferees = {};

  try {
    // Search both tournaments
    for (const [name, tournamentNo] of [['Men', '8239'], ['Women', '8238']]) {
      console.log(`📋 Searching ${name}'s Tournament ${tournamentNo}...`);
      console.log('-'.repeat(80));

      const request = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatchList" Fields="No NoInTournament RoundName NoReferee1 Referee1Name Referee1FederationCode NoReferee2 Referee2Name Referee2FederationCode">
  <Filter NoTournament="${tournamentNo}" />
</Request>`;

      const response = await makeVisApiCall(request);
      const data = parser.parse(response);
      const matches = data.BeachMatches?.BeachMatch || [];
      const matchesArray = Array.isArray(matches) ? matches : [matches];

      console.log(`Got ${matchesArray.length} matches`);

      // Search for our IDs
      searchIds.forEach(searchId => {
        matchesArray.forEach(match => {
          if (match.NoReferee1 === searchId || match.NoReferee1 === String(searchId)) {
            if (!foundReferees[searchId]) {
              foundReferees[searchId] = {
                id: searchId,
                name: match.Referee1Name,
                federationCode: match.Referee1FederationCode,
                foundIn: []
              };
            }
            foundReferees[searchId].foundIn.push({
              tournament: name,
              matchNo: match.NoInTournament,
              round: match.RoundName,
              position: 'R1'
            });
          }

          if (match.NoReferee2 === searchId || match.NoReferee2 === String(searchId)) {
            if (!foundReferees[searchId]) {
              foundReferees[searchId] = {
                id: searchId,
                name: match.Referee2Name,
                federationCode: match.Referee2FederationCode,
                foundIn: []
              };
            }
            foundReferees[searchId].foundIn.push({
              tournament: name,
              matchNo: match.NoInTournament,
              round: match.RoundName,
              position: 'R2'
            });
          }
        });
      });

      console.log();
    }

    // Display results
    console.log('='.repeat(80));
    console.log('🎯 RESULTS');
    console.log('='.repeat(80));
    console.log();

    if (Object.keys(foundReferees).length === 0) {
      console.log('❌ Challenge Referee IDs NOT FOUND as primary referees');
      console.log();
      console.log('This means Challenge Referees are NOT in the match referee pool.');
      console.log('They might be:');
      console.log('  1. Stored in a separate officials list');
      console.log('  2. Fetched from a different API endpoint');
      console.log('  3. Only accessible through GetEvent Officials field (not tested yet)');
    } else {
      searchIds.forEach(id => {
        if (foundReferees[id]) {
          const ref = foundReferees[id];
          console.log(`✅ ID ${id}: ${ref.name} (${ref.federationCode})`);
          console.log(`   Found as primary referee in ${ref.foundIn.length} matches:`);
          ref.foundIn.slice(0, 5).forEach(match => {
            console.log(`     - ${match.tournament}'s Match ${match.matchNo} (${match.round}): Position ${match.position}`);
          });
          if (ref.foundIn.length > 5) {
            console.log(`     ... and ${ref.foundIn.length - 5} more matches`);
          }
          console.log();
        } else {
          console.log(`❌ ID ${id}: NOT FOUND`);
          console.log();
        }
      });
    }

    // Now show where they are Challenge Referees
    console.log('='.repeat(80));
    console.log('🎯 CHALLENGE REFEREE ASSIGNMENTS');
    console.log('='.repeat(80));
    console.log();

    for (const [name, tournamentNo] of [['Men', '8239'], ['Women', '8238']]) {
      console.log(`${name}'s Tournament:`);

      const request = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatchList" Fields="No NoInTournament RoundName NoRefereeChallenge Referee1Name Referee2Name">
  <Filter NoTournament="${tournamentNo}" />
</Request>`;

      const response = await makeVisApiCall(request);
      const data = parser.parse(response);
      const matches = data.BeachMatches?.BeachMatch || [];
      const matchesArray = Array.isArray(matches) ? matches : [matches];

      const finalsWithChallenge = matchesArray.filter(m =>
        m.RoundName?.toLowerCase().includes('final') && m.NoRefereeChallenge
      );

      finalsWithChallenge.forEach(match => {
        const challengeId = match.NoRefereeChallenge;
        const challengeName = foundReferees[challengeId]?.name || '(unknown)';
        const challengeFed = foundReferees[challengeId]?.federationCode || '(unknown)';

        console.log();
        console.log(`  Match ${match.NoInTournament}: ${match.RoundName}`);
        console.log(`    Primary Refs: ${match.Referee1Name} / ${match.Referee2Name}`);
        console.log(`    Challenge Referee: ${challengeName} (${challengeFed}) [ID: ${challengeId}]`);
      });

      console.log();
    }

    // Summary
    console.log('='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log();

    if (Object.keys(foundReferees).length > 0) {
      console.log('✅ SUCCESS! Found Challenge Referee names:');
      searchIds.forEach(id => {
        if (foundReferees[id]) {
          console.log(`   ID ${id}: ${foundReferees[id].name} (${foundReferees[id].federationCode})`);
        }
      });
      console.log();
      console.log('IMPLEMENTATION STRATEGY:');
      console.log('  1. Fetch all matches for the tournament');
      console.log('  2. Build a map: refereeId → {name, federation}');
      console.log('  3. When displaying match with NoRefereeChallenge, look up in map');
      console.log('  4. Display Challenge Referee name and federation');
    } else {
      console.log('❌ Challenge Referee IDs not found in match referee assignments');
      console.log();
      console.log('NEXT STEPS:');
      console.log('  1. Check if there is a GetOfficials or GetRefereeList API');
      console.log('  2. Check Event Officials field (requires finding correct field name)');
      console.log('  3. May need to contact VIS API support for guidance');
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

findChallengeRefereeNames();
