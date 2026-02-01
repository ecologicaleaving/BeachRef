/**
 * Complete Officials Data Test - Hamburg 2025 Finals
 * Shows Challenge Referee + Personnel (Scorer/Line Judges) with names
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

async function showCompleteOfficialsData() {
  console.log('='.repeat(80));
  console.log('🏐 COMPLETE OFFICIALS DATA - HAMBURG 2025 FINALS');
  console.log('='.repeat(80));
  console.log();

  try {
    // STEP 1: Get AuxiliaryPersons for mapping Personnel IDs
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
          firstName: p.FirstName,
          lastName: p.LastName,
          federation: p.NationalityCode,
          functions: p.Functions
        };
      });

      console.log(`✅ Found ${personsArray.length} auxiliary persons`);
    } else {
      console.log('❌ No AuxiliaryPersons found');
    }
    console.log();

    // STEP 2: Get Men's Final (Match 44)
    console.log('📋 STEP 2: Getting Men\'s Final (Tournament 8239, Match 44)');
    console.log('-'.repeat(80));
    const menRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatchList" Fields="No NoInTournament RoundName TeamAName TeamBName Referee1Name Referee2Name Referee1FederationCode Referee2FederationCode RefereeChallengeName RefereeChallengeFederationCode NoRefereeChallenge Personnel EventNo">
  <Filter NoTournament="8239" />
</Request>`;

    const menResponse = await makeVisApiCall(menRequest);
    const menData = parser.parse(menResponse);
    const menMatches = menData.BeachMatches?.BeachMatch || [];
    const menMatchesArray = Array.isArray(menMatches) ? menMatches : [menMatches];
    const menFinal = menMatchesArray.find(m =>
      m.RoundName && m.RoundName.toLowerCase().includes('final 1st')
    );

    if (!menFinal) {
      console.log('❌ Men\'s final not found');
    } else {
      console.log('✅ Found Men\'s Final');
      console.log();
      console.log('='.repeat(80));
      console.log('👨 MEN\'S FINAL - COMPLETE OFFICIALS DATA');
      console.log('='.repeat(80));
      console.log();
      console.log(`Match: ${menFinal.TeamAName} vs ${menFinal.TeamBName}`);
      console.log(`Match No: ${menFinal.No} (In Tournament: ${menFinal.NoInTournament})`);
      console.log();

      // Primary Referees
      console.log('PRIMARY REFEREES:');
      console.log(`  R1: ${menFinal.Referee1Name || '(none)'} (${menFinal.Referee1FederationCode || 'N/A'})`);
      console.log(`  R2: ${menFinal.Referee2Name || '(none)'} (${menFinal.Referee2FederationCode || 'N/A'})`);
      console.log();

      // Challenge Referee
      console.log('CHALLENGE REFEREE:');
      if (menFinal.RefereeChallengeName) {
        console.log(`  ✅ Name: ${menFinal.RefereeChallengeName}`);
        console.log(`  ✅ Federation: ${menFinal.RefereeChallengeFederationCode || 'N/A'}`);
        if (menFinal.NoRefereeChallenge) {
          console.log(`  ✅ ID: ${menFinal.NoRefereeChallenge}`);
        }
      } else {
        console.log(`  ❌ NOT ASSIGNED (field RefereeChallengeName: ${menFinal.RefereeChallengeName === undefined ? 'does not exist' : 'exists but empty'})`);
        if (menFinal.NoRefereeChallenge !== undefined) {
          console.log(`  ℹ️  NoRefereeChallenge field exists: ${menFinal.NoRefereeChallenge || '(empty)'}`);
        }
      }
      console.log();

      // Personnel (Scorer, Line Judges)
      console.log('PERSONNEL (SCORER, LINE JUDGES):');
      if (menFinal.Personnel) {
        console.log(`  ✅ Personnel field exists (${menFinal.Personnel.length} chars)`);
        console.log(`  Raw: ${menFinal.Personnel.substring(0, 150)}...`);
        console.log();

        try {
          const decoded = decodeHtmlEntities(menFinal.Personnel);
          const personnelData = parser.parse(decoded);
          const personnel = personnelData.Personnel || {};

          console.log('  Parsed Personnel IDs:');
          console.log(`    Scorer: ${personnel.Scorer || '(none)'}`);
          console.log(`    Assistant Scorer: ${personnel.AssistantScorer || '(none)'}`);
          console.log(`    Line Judge 1: ${personnel.LineJudge1 || '(none)'}`);
          console.log(`    Line Judge 2: ${personnel.LineJudge2 || '(none)'}`);
          console.log();

          console.log('  Mapped to Names:');

          if (personnel.Scorer && auxiliaryPersonsMap[personnel.Scorer]) {
            const p = auxiliaryPersonsMap[personnel.Scorer];
            console.log(`    ✅ Scorer: ${p.firstName} ${p.lastName} (${p.federation})`);
          } else if (personnel.Scorer) {
            console.log(`    ⚠️  Scorer: ID ${personnel.Scorer} (no name mapping found)`);
          }

          if (personnel.AssistantScorer && auxiliaryPersonsMap[personnel.AssistantScorer]) {
            const p = auxiliaryPersonsMap[personnel.AssistantScorer];
            console.log(`    ✅ Assistant Scorer: ${p.firstName} ${p.lastName} (${p.federation})`);
          } else if (personnel.AssistantScorer) {
            console.log(`    ⚠️  Assistant Scorer: ID ${personnel.AssistantScorer} (no name mapping found)`);
          }

          if (personnel.LineJudge1 && auxiliaryPersonsMap[personnel.LineJudge1]) {
            const p = auxiliaryPersonsMap[personnel.LineJudge1];
            console.log(`    ✅ Line Judge 1: ${p.firstName} ${p.lastName} (${p.federation})`);
          } else if (personnel.LineJudge1) {
            console.log(`    ⚠️  Line Judge 1: ID ${personnel.LineJudge1} (no name mapping found)`);
          }

          if (personnel.LineJudge2 && auxiliaryPersonsMap[personnel.LineJudge2]) {
            const p = auxiliaryPersonsMap[personnel.LineJudge2];
            console.log(`    ✅ Line Judge 2: ${p.firstName} ${p.lastName} (${p.federation})`);
          } else if (personnel.LineJudge2) {
            console.log(`    ⚠️  Line Judge 2: ID ${personnel.LineJudge2} (no name mapping found)`);
          }

        } catch (e) {
          console.log(`  ❌ Failed to parse Personnel XML: ${e.message}`);
        }
      } else {
        console.log(`  ❌ Personnel field: ${menFinal.Personnel === undefined ? 'does not exist' : 'exists but empty'}`);
      }
    }

    console.log();
    console.log();

    // STEP 3: Get Women's Final (Match 44)
    console.log('📋 STEP 3: Getting Women\'s Final (Tournament 8238, Match 44)');
    console.log('-'.repeat(80));
    const womenRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatchList" Fields="No NoInTournament RoundName TeamAName TeamBName Referee1Name Referee2Name Referee1FederationCode Referee2FederationCode RefereeChallengeName RefereeChallengeFederationCode NoRefereeChallenge Personnel EventNo">
  <Filter NoTournament="8238" />
</Request>`;

    const womenResponse = await makeVisApiCall(womenRequest);
    const womenData = parser.parse(womenResponse);
    const womenMatches = womenData.BeachMatches?.BeachMatch || [];
    const womenMatchesArray = Array.isArray(womenMatches) ? womenMatches : [womenMatches];
    const womenFinal = womenMatchesArray.find(m =>
      m.RoundName && m.RoundName.toLowerCase().includes('final 1st')
    );

    if (!womenFinal) {
      console.log('❌ Women\'s final not found');
    } else {
      console.log('✅ Found Women\'s Final');
      console.log();
      console.log('='.repeat(80));
      console.log('👩 WOMEN\'S FINAL - COMPLETE OFFICIALS DATA');
      console.log('='.repeat(80));
      console.log();
      console.log(`Match: ${womenFinal.TeamAName} vs ${womenFinal.TeamBName}`);
      console.log(`Match No: ${womenFinal.No} (In Tournament: ${womenFinal.NoInTournament})`);
      console.log();

      // Primary Referees
      console.log('PRIMARY REFEREES:');
      console.log(`  R1: ${womenFinal.Referee1Name || '(none)'} (${womenFinal.Referee1FederationCode || 'N/A'})`);
      console.log(`  R2: ${womenFinal.Referee2Name || '(none)'} (${womenFinal.Referee2FederationCode || 'N/A'})`);
      console.log();

      // Challenge Referee
      console.log('CHALLENGE REFEREE:');
      if (womenFinal.RefereeChallengeName) {
        console.log(`  ✅ Name: ${womenFinal.RefereeChallengeName}`);
        console.log(`  ✅ Federation: ${womenFinal.RefereeChallengeFederationCode || 'N/A'}`);
        if (womenFinal.NoRefereeChallenge) {
          console.log(`  ✅ ID: ${womenFinal.NoRefereeChallenge}`);
        }
      } else {
        console.log(`  ❌ NOT ASSIGNED (field RefereeChallengeName: ${womenFinal.RefereeChallengeName === undefined ? 'does not exist' : 'exists but empty'})`);
        if (womenFinal.NoRefereeChallenge !== undefined) {
          console.log(`  ℹ️  NoRefereeChallenge field exists: ${womenFinal.NoRefereeChallenge || '(empty)'}`);
        }
      }
      console.log();

      // Personnel (Scorer, Line Judges)
      console.log('PERSONNEL (SCORER, LINE JUDGES):');
      if (womenFinal.Personnel) {
        console.log(`  ✅ Personnel field exists (${womenFinal.Personnel.length} chars)`);
        console.log(`  Raw: ${womenFinal.Personnel.substring(0, 150)}...`);
        console.log();

        try {
          const decoded = decodeHtmlEntities(womenFinal.Personnel);
          const personnelData = parser.parse(decoded);
          const personnel = personnelData.Personnel || {};

          console.log('  Parsed Personnel IDs:');
          console.log(`    Scorer: ${personnel.Scorer || '(none)'}`);
          console.log(`    Assistant Scorer: ${personnel.AssistantScorer || '(none)'}`);
          console.log(`    Line Judge 1: ${personnel.LineJudge1 || '(none)'}`);
          console.log(`    Line Judge 2: ${personnel.LineJudge2 || '(none)'}`);
          console.log();

          console.log('  Mapped to Names:');

          if (personnel.Scorer && auxiliaryPersonsMap[personnel.Scorer]) {
            const p = auxiliaryPersonsMap[personnel.Scorer];
            console.log(`    ✅ Scorer: ${p.firstName} ${p.lastName} (${p.federation})`);
          } else if (personnel.Scorer) {
            console.log(`    ⚠️  Scorer: ID ${personnel.Scorer} (no name mapping found)`);
          }

          if (personnel.AssistantScorer && auxiliaryPersonsMap[personnel.AssistantScorer]) {
            const p = auxiliaryPersonsMap[personnel.AssistantScorer];
            console.log(`    ✅ Assistant Scorer: ${p.firstName} ${p.lastName} (${p.federation})`);
          } else if (personnel.AssistantScorer) {
            console.log(`    ⚠️  Assistant Scorer: ID ${personnel.AssistantScorer} (no name mapping found)`);
          }

          if (personnel.LineJudge1 && auxiliaryPersonsMap[personnel.LineJudge1]) {
            const p = auxiliaryPersonsMap[personnel.LineJudge1];
            console.log(`    ✅ Line Judge 1: ${p.firstName} ${p.lastName} (${p.federation})`);
          } else if (personnel.LineJudge1) {
            console.log(`    ⚠️  Line Judge 1: ID ${personnel.LineJudge1} (no name mapping found)`);
          }

          if (personnel.LineJudge2 && auxiliaryPersonsMap[personnel.LineJudge2]) {
            const p = auxiliaryPersonsMap[personnel.LineJudge2];
            console.log(`    ✅ Line Judge 2: ${p.firstName} ${p.lastName} (${p.federation})`);
          } else if (personnel.LineJudge2) {
            console.log(`    ⚠️  Line Judge 2: ID ${personnel.LineJudge2} (no name mapping found)`);
          }

        } catch (e) {
          console.log(`  ❌ Failed to parse Personnel XML: ${e.message}`);
        }
      } else {
        console.log(`  ❌ Personnel field: ${womenFinal.Personnel === undefined ? 'does not exist' : 'exists but empty'}`);
      }
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

showCompleteOfficialsData();
