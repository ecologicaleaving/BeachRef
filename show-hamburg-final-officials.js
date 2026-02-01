/**
 * Show Challenge Referee and Personnel data from Hamburg 2025 Final
 * Tournament: 1552 (Hamburg Elite 16 2025)
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

async function showHamburgFinalOfficials() {
  console.log('='.repeat(80));
  console.log('🏐 HAMBURG 2025 FINAL - MATCH OFFICIALS DATA');
  console.log('='.repeat(80));
  console.log();

  const tournamentNo = '1552'; // Hamburg Elite 16 2025

  try {
    // STEP 1: Get all matches to find the finals
    console.log('📋 STEP 1: Finding Finals...');
    console.log('-'.repeat(80));

    const matchListRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatchList" Fields="No NoInTournament RoundName Round Status TeamAName TeamBName Referee1Name Referee2Name RefereeChallengeName RefereeChallengeFederationCode Personnel EventNo">
  <Filter NoTournament="${tournamentNo}" IncludeResults="true" />
</Request>`;

    const matchListResponse = await makeVisApiCall(matchListRequest);
    const matchListData = parser.parse(matchListResponse);

    const matches = matchListData.BeachMatches?.BeachMatch || [];
    console.log(`Found ${matches.length} matches`);
    console.log();

    // Find finals (men's and women's)
    const finals = matches.filter(m =>
      m.RoundName && (
        m.RoundName.toLowerCase().includes('final') ||
        m.RoundName.toLowerCase().includes('gold')
      )
    );

    console.log(`Found ${finals.length} final matches:`);
    finals.forEach(m => {
      console.log(`  Match ${m.NoInTournament}: ${m.RoundName} - ${m.TeamAName} vs ${m.TeamBName} [${m.Status}]`);
    });
    console.log();

    if (finals.length === 0) {
      console.log('⚠️  No finals found. Showing last 5 matches instead:');
      const lastMatches = matches.slice(-5);
      lastMatches.forEach(m => {
        console.log(`  Match ${m.NoInTournament}: ${m.RoundName} - ${m.TeamAName} vs ${m.TeamBName} [${m.Status}]`);
      });
      console.log();
    }

    // Use first final or last match
    const targetMatch = finals[0] || matches[matches.length - 1];

    if (!targetMatch) {
      console.log('❌ No matches found in tournament');
      return;
    }

    console.log();
    console.log('='.repeat(80));
    console.log(`🎯 ANALYZING MATCH ${targetMatch.NoInTournament}: ${targetMatch.RoundName}`);
    console.log('='.repeat(80));
    console.log();

    // STEP 2: Show Challenge Referee
    console.log('📋 STEP 2: CHALLENGE REFEREE');
    console.log('-'.repeat(80));
    if (targetMatch.RefereeChallengeName) {
      console.log(`✅ Challenge Referee: ${targetMatch.RefereeChallengeName} (${targetMatch.RefereeChallengeFederationCode || 'N/A'})`);
    } else {
      console.log('ℹ️  No Challenge Referee assigned for this match');
    }
    console.log();

    // STEP 3: Show Main Referees
    console.log('📋 STEP 3: MAIN REFEREES');
    console.log('-'.repeat(80));
    console.log(`R1: ${targetMatch.Referee1Name || '(not assigned)'}`);
    console.log(`R2: ${targetMatch.Referee2Name || '(not assigned)'}`);
    console.log();

    // STEP 4: Show Personnel Field (raw)
    console.log('📋 STEP 4: PERSONNEL FIELD (Scorer, Assistant Scorer, Line Judges)');
    console.log('-'.repeat(80));

    if (targetMatch.Personnel) {
      console.log('✅ Personnel field found!');
      console.log();
      console.log('Raw Personnel XML (HTML-encoded):');
      console.log(targetMatch.Personnel);
      console.log();

      // Decode HTML entities
      const decodedPersonnel = decodeHtmlEntities(targetMatch.Personnel);
      console.log('Decoded Personnel XML:');
      console.log(decodedPersonnel);
      console.log();

      // Parse Personnel XML
      const personnelData = parser.parse(decodedPersonnel);
      console.log('Parsed Personnel Data:');
      console.log(JSON.stringify(personnelData, null, 2));
      console.log();

      // STEP 5: Get AuxiliaryPersons to map IDs to names
      if (targetMatch.EventNo) {
        console.log('📋 STEP 5: MAPPING PERSONNEL IDs TO NAMES');
        console.log('-'.repeat(80));
        console.log(`Event No: ${targetMatch.EventNo}`);
        console.log();

        const eventRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetEvent" No="${targetMatch.EventNo}" Fields="No Name AuxiliaryPersons" />`;

        const eventResponse = await makeVisApiCall(eventRequest);
        const eventData = parser.parse(eventResponse);

        if (eventData.Event?.AuxiliaryPersons) {
          const auxPersonsEncoded = eventData.Event.AuxiliaryPersons;
          const auxPersonsDecoded = decodeHtmlEntities(auxPersonsEncoded);
          const auxPersonsData = parser.parse(auxPersonsDecoded);

          const auxPersons = auxPersonsData.AuxiliaryPersons?.AuxiliaryPerson || [];
          console.log(`✅ Found ${auxPersons.length} auxiliary persons in tournament`);
          console.log();

          // Map Personnel IDs to names
          const personnel = personnelData.Personnel || {};

          const roles = [
            { field: 'Scorer', label: 'Scorer (SC)', id: personnel.Scorer },
            { field: 'AssistantScorer', label: 'Assistant Scorer (ASC)', id: personnel.AssistantScorer },
            { field: 'LineJudge1', label: 'Line Judge 1 (LJ1)', id: personnel.LineJudge1 },
            { field: 'LineJudge2', label: 'Line Judge 2 (LJ2)', id: personnel.LineJudge2 },
            { field: 'LineJudge3', label: 'Line Judge 3 (LJ3)', id: personnel.LineJudge3 },
            { field: 'LineJudge4', label: 'Line Judge 4 (LJ4)', id: personnel.LineJudge4 }
          ];

          console.log('PERSONNEL MAPPING (ID → Name):');
          console.log('-'.repeat(80));

          roles.forEach(role => {
            if (role.id) {
              const official = Array.isArray(auxPersons)
                ? auxPersons.find(p => p.No === role.id)
                : (auxPersons.No === role.id ? auxPersons : null);

              if (official) {
                console.log(`${role.label}:`);
                console.log(`  ID: ${role.id}`);
                console.log(`  Name: ${official.FirstName} ${official.LastName}`);
                console.log(`  Nationality: ${official.NationalityCode}`);
                console.log(`  Gender: ${official.Gender === 0 ? 'Male' : 'Female'}`);
                console.log(`  Functions Code: ${official.Functions}`);
                console.log();
              } else {
                console.log(`${role.label}: ID ${role.id} (⚠️  NOT FOUND in AuxiliaryPersons)`);
                console.log();
              }
            }
          });

        } else {
          console.log('❌ No AuxiliaryPersons field in Event response');
        }
      } else {
        console.log('⚠️  No EventNo available - cannot map Personnel IDs');
      }

    } else {
      console.log('ℹ️  No Personnel field in this match (Scorer/Line Judges not assigned)');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  console.log();
  console.log('='.repeat(80));
  console.log('✅ Investigation Complete');
  console.log('='.repeat(80));
}

showHamburgFinalOfficials();
