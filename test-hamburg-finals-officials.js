/**
 * Test Hamburg 2025 Finals for Challenge Referee and Personnel Data
 * Uses correct tournament IDs: 8239 (Men's) and 8238 (Women's)
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

async function testHamburgFinalsOfficials() {
  console.log('='.repeat(80));
  console.log('🏐 HAMBURG 2025 FINALS - CHALLENGE REFEREE & PERSONNEL TEST');
  console.log('='.repeat(80));
  console.log();

  try {
    // STEP 1: Get AuxiliaryPersons mapping from Event 1552
    console.log('📋 STEP 1: Getting AuxiliaryPersons from Event 1552');
    console.log('-'.repeat(80));
    const eventRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetEvent" No="1552" Fields="No Name AuxiliaryPersons" />`;

    const eventResponse = await makeVisApiCall(eventRequest);
    const eventData = parser.parse(eventResponse);

    let auxiliaryPersonsMap = {};
    if (eventData.Event?.AuxiliaryPersons) {
      const decoded = decodeHtmlEntities(eventData.Event.AuxiliaryPersons);
      const auxData = parser.parse(decoded);
      const persons = auxData.AuxiliaryPersons?.AuxiliaryPerson || [];
      const personsArray = Array.isArray(persons) ? persons : [persons];

      personsArray.forEach(p => {
        auxiliaryPersonsMap[p.No] = {
          name: `${p.FirstName} ${p.LastName}`,
          federation: p.NationalityCode,
          gender: p.Gender === 0 ? 'M' : 'F',
          functions: p.Functions
        };
      });

      console.log(`✅ Found ${personsArray.length} auxiliary persons for mapping`);
      console.log();
    }

    // STEP 2: Query Men's Tournament (8239)
    console.log('📋 STEP 2: Querying Men\'s Tournament (8239) Finals');
    console.log('-'.repeat(80));
    const menRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatchList" Fields="No NoInTournament RoundName RoundPhase Status TeamAName TeamBName Referee1Name Referee2Name Referee1FederationCode Referee2FederationCode RefereeChallengeName RefereeChallengeFederationCode Personnel">
  <Filter NoTournament="8239" IncludeResults="true" IncludeReferees="true" />
</Request>`;

    const menResponse = await makeVisApiCall(menRequest);
    const menData = parser.parse(menResponse);
    const menMatches = menData.BeachMatches?.BeachMatch || [];
    const menMatchesArray = Array.isArray(menMatches) ? menMatches : [menMatches];

    console.log(`✅ Found ${menMatchesArray.length} men's matches`);

    // Find finals (Final 1st Place, Final 3rd Place, Semifinals)
    const menFinals = menMatchesArray.filter(m =>
      m.RoundName?.toLowerCase().includes('final')
    );

    console.log(`🏆 Found ${menFinals.length} men's final/medal matches`);
    console.log();

    // STEP 3: Query Women's Tournament (8238)
    console.log('📋 STEP 3: Querying Women\'s Tournament (8238) Finals');
    console.log('-'.repeat(80));
    const womenRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatchList" Fields="No NoInTournament RoundName RoundPhase Status TeamAName TeamBName Referee1Name Referee2Name Referee1FederationCode Referee2FederationCode RefereeChallengeName RefereeChallengeFederationCode Personnel">
  <Filter NoTournament="8238" IncludeResults="true" IncludeReferees="true" />
</Request>`;

    const womenResponse = await makeVisApiCall(womenRequest);
    const womenData = parser.parse(womenResponse);
    const womenMatches = womenData.BeachMatches?.BeachMatch || [];
    const womenMatchesArray = Array.isArray(womenMatches) ? womenMatches : [womenMatches];

    console.log(`✅ Found ${womenMatchesArray.length} women's matches`);

    const womenFinals = womenMatchesArray.filter(m =>
      m.RoundName?.toLowerCase().includes('final')
    );

    console.log(`🏆 Found ${womenFinals.length} women's final/medal matches`);
    console.log();

    // STEP 4: Display Finals with Officials
    console.log('='.repeat(80));
    console.log('🏆 FINALS MATCHES WITH OFFICIALS');
    console.log('='.repeat(80));
    console.log();

    // Men's Finals
    if (menFinals.length > 0) {
      console.log('👨 MEN\'S FINALS:');
      console.log('-'.repeat(80));

      menFinals.forEach((match, idx) => {
        console.log();
        console.log(`Match ${idx + 1}: ${match.RoundName}`);
        console.log(`  Match No: ${match.No} (In Tournament: ${match.NoInTournament})`);
        console.log(`  Teams: ${match.TeamAName} vs ${match.TeamBName}`);
        console.log(`  Status: ${match.Status}`);
        console.log();

        console.log('  PRIMARY REFEREES:');
        console.log(`    R1: ${match.Referee1Name || '(not assigned)'} ${match.Referee1FederationCode ? `(${match.Referee1FederationCode})` : ''}`);
        console.log(`    R2: ${match.Referee2Name || '(not assigned)'} ${match.Referee2FederationCode ? `(${match.Referee2FederationCode})` : ''}`);
        console.log();

        if (match.RefereeChallengeName) {
          console.log('  🎯 CHALLENGE REFEREE:');
          console.log(`    Name: ${match.RefereeChallengeName}`);
          console.log(`    Federation: ${match.RefereeChallengeFederationCode || 'N/A'}`);
          console.log();
        } else {
          console.log('  ℹ️  No Challenge Referee assigned');
          console.log();
        }

        if (match.Personnel) {
          try {
            const decoded = decodeHtmlEntities(match.Personnel);
            const personnelData = parser.parse(decoded);
            const personnel = personnelData.Personnel || {};

            console.log('  📋 MATCH PERSONNEL:');

            if (personnel.Scorer && auxiliaryPersonsMap[personnel.Scorer]) {
              const scorer = auxiliaryPersonsMap[personnel.Scorer];
              console.log(`    Scorer: ${scorer.name} (${scorer.federation})`);
            }

            if (personnel.AssistantScorer && auxiliaryPersonsMap[personnel.AssistantScorer]) {
              const assistScorer = auxiliaryPersonsMap[personnel.AssistantScorer];
              console.log(`    Assistant Scorer: ${assistScorer.name} (${assistScorer.federation})`);
            }

            if (personnel.LineJudge1 && auxiliaryPersonsMap[personnel.LineJudge1]) {
              const lj1 = auxiliaryPersonsMap[personnel.LineJudge1];
              console.log(`    Line Judge 1: ${lj1.name} (${lj1.federation})`);
            }

            if (personnel.LineJudge2 && auxiliaryPersonsMap[personnel.LineJudge2]) {
              const lj2 = auxiliaryPersonsMap[personnel.LineJudge2];
              console.log(`    Line Judge 2: ${lj2.name} (${lj2.federation})`);
            }

            console.log();
            console.log('  Raw Personnel IDs:');
            console.log(JSON.stringify(personnel, null, 4));
          } catch (e) {
            console.log('  ⚠️  Could not parse Personnel field');
          }
        } else {
          console.log('  ℹ️  No Personnel field');
        }

        console.log();
        console.log('-'.repeat(80));
      });
    }

    // Women's Finals
    if (womenFinals.length > 0) {
      console.log();
      console.log('👩 WOMEN\'S FINALS:');
      console.log('-'.repeat(80));

      womenFinals.forEach((match, idx) => {
        console.log();
        console.log(`Match ${idx + 1}: ${match.RoundName}`);
        console.log(`  Match No: ${match.No} (In Tournament: ${match.NoInTournament})`);
        console.log(`  Teams: ${match.TeamAName} vs ${match.TeamBName}`);
        console.log(`  Status: ${match.Status}`);
        console.log();

        console.log('  PRIMARY REFEREES:');
        console.log(`    R1: ${match.Referee1Name || '(not assigned)'} ${match.Referee1FederationCode ? `(${match.Referee1FederationCode})` : ''}`);
        console.log(`    R2: ${match.Referee2Name || '(not assigned)'} ${match.Referee2FederationCode ? `(${match.Referee2FederationCode})` : ''}`);
        console.log();

        if (match.RefereeChallengeName) {
          console.log('  🎯 CHALLENGE REFEREE:');
          console.log(`    Name: ${match.RefereeChallengeName}`);
          console.log(`    Federation: ${match.RefereeChallengeFederationCode || 'N/A'}`);
          console.log();
        } else {
          console.log('  ℹ️  No Challenge Referee assigned');
          console.log();
        }

        if (match.Personnel) {
          try {
            const decoded = decodeHtmlEntities(match.Personnel);
            const personnelData = parser.parse(decoded);
            const personnel = personnelData.Personnel || {};

            console.log('  📋 MATCH PERSONNEL:');

            if (personnel.Scorer && auxiliaryPersonsMap[personnel.Scorer]) {
              const scorer = auxiliaryPersonsMap[personnel.Scorer];
              console.log(`    Scorer: ${scorer.name} (${scorer.federation})`);
            }

            if (personnel.AssistantScorer && auxiliaryPersonsMap[personnel.AssistantScorer]) {
              const assistScorer = auxiliaryPersonsMap[personnel.AssistantScorer];
              console.log(`    Assistant Scorer: ${assistScorer.name} (${assistScorer.federation})`);
            }

            if (personnel.LineJudge1 && auxiliaryPersonsMap[personnel.LineJudge1]) {
              const lj1 = auxiliaryPersonsMap[personnel.LineJudge1];
              console.log(`    Line Judge 1: ${lj1.name} (${lj1.federation})`);
            }

            if (personnel.LineJudge2 && auxiliaryPersonsMap[personnel.LineJudge2]) {
              const lj2 = auxiliaryPersonsMap[personnel.LineJudge2];
              console.log(`    Line Judge 2: ${lj2.name} (${lj2.federation})`);
            }

            console.log();
            console.log('  Raw Personnel IDs:');
            console.log(JSON.stringify(personnel, null, 4));
          } catch (e) {
            console.log('  ⚠️  Could not parse Personnel field');
          }
        } else {
          console.log('  ℹ️  No Personnel field');
        }

        console.log();
        console.log('-'.repeat(80));
      });
    }

    // Summary
    console.log();
    console.log('='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Men's Finals: ${menFinals.length}`);
    console.log(`Total Women's Finals: ${womenFinals.length}`);
    console.log(`Auxiliary Persons Available: ${Object.keys(auxiliaryPersonsMap).length}`);

    const menWithChallenge = menFinals.filter(m => m.RefereeChallengeName).length;
    const womenWithChallenge = womenFinals.filter(m => m.RefereeChallengeName).length;
    console.log(`Finals with Challenge Referee: ${menWithChallenge + womenWithChallenge} total (${menWithChallenge} men's, ${womenWithChallenge} women's)`);

    const menWithPersonnel = menFinals.filter(m => m.Personnel).length;
    const womenWithPersonnel = womenFinals.filter(m => m.Personnel).length;
    console.log(`Finals with Personnel Data: ${menWithPersonnel + womenWithPersonnel} total (${menWithPersonnel} men's, ${womenWithPersonnel} women's)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  console.log();
  console.log('='.repeat(80));
  console.log('✅ Test Complete');
  console.log('='.repeat(80));
}

testHamburgFinalsOfficials();
