/**
 * Show Challenge Referee and Personnel data from Hamburg 2025 Match 44 (Women's Final)
 * Tournament: 1552 (Hamburg Elite 16 2025)
 * Match: 44
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

async function showMatch44Officials() {
  console.log('='.repeat(80));
  console.log('🏐 HAMBURG 2025 MATCH 44 - OFFICIALS DATA');
  console.log('='.repeat(80));
  console.log();

  const tournamentNo = '1552'; // Hamburg Elite 16 2025
  const matchNo = '44'; // Women's Final

  try {
    // STEP 1: Get match with all referee and personnel fields
    console.log('📋 STEP 1: Fetching Match 44...');
    console.log('-'.repeat(80));

    const matchRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatch" No="${matchNo}" NoTournament="${tournamentNo}"
         Fields="No NoInTournament RoundName Round Status TeamAName TeamBName
                 Referee1Name Referee1FederationCode
                 Referee2Name Referee2FederationCode
                 RefereeChallengeName RefereeChallengeFederationCode
                 Personnel EventNo" />`;

    const matchResponse = await makeVisApiCall(matchRequest);
    const matchData = parser.parse(matchResponse);

    const match = matchData.BeachMatch;

    if (!match) {
      console.log('❌ No match found');
      console.log('Raw response:');
      console.log(matchResponse);
      return;
    }

    console.log(`✅ Found Match ${match.NoInTournament || match.No}: ${match.RoundName || 'Unknown Round'}`);
    console.log(`   ${match.TeamAName || '?'} vs ${match.TeamBName || '?'} [${match.Status || 'Unknown'}]`);
    console.log();

    // STEP 2: Show Challenge Referee
    console.log('📋 STEP 2: CHALLENGE REFEREE');
    console.log('-'.repeat(80));
    if (match.RefereeChallengeName) {
      console.log(`✅ Challenge Referee: ${match.RefereeChallengeName} (${match.RefereeChallengeFederationCode || 'N/A'})`);
    } else {
      console.log('ℹ️  No Challenge Referee assigned for this match');
    }
    console.log();

    // STEP 3: Show Main Referees
    console.log('📋 STEP 3: MAIN REFEREES');
    console.log('-'.repeat(80));
    console.log(`R1: ${match.Referee1Name || '(not assigned)'} ${match.Referee1FederationCode ? `(${match.Referee1FederationCode})` : ''}`);
    console.log(`R2: ${match.Referee2Name || '(not assigned)'} ${match.Referee2FederationCode ? `(${match.Referee2FederationCode})` : ''}`);
    console.log();

    // STEP 4: Show Personnel Field (raw)
    console.log('📋 STEP 4: PERSONNEL FIELD (Scorer, Assistant Scorer, Line Judges)');
    console.log('-'.repeat(80));

    if (match.Personnel) {
      console.log('✅ Personnel field found!');
      console.log();
      console.log('Raw Personnel XML (HTML-encoded):');
      console.log(match.Personnel);
      console.log();

      // Decode HTML entities
      const decodedPersonnel = decodeHtmlEntities(match.Personnel);
      console.log('Decoded Personnel XML:');
      console.log(decodedPersonnel);
      console.log();

      // Parse Personnel XML
      const personnelData = parser.parse(decodedPersonnel);
      console.log('Parsed Personnel Data:');
      console.log(JSON.stringify(personnelData, null, 2));
      console.log();

      // STEP 5: Get AuxiliaryPersons to map IDs to names
      if (match.EventNo) {
        console.log('📋 STEP 5: MAPPING PERSONNEL IDs TO NAMES');
        console.log('-'.repeat(80));
        console.log(`Event No: ${match.EventNo}`);
        console.log();

        const eventRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetEvent" No="${match.EventNo}" Fields="No Name AuxiliaryPersons" />`;

        const eventResponse = await makeVisApiCall(eventRequest);
        const eventData = parser.parse(eventResponse);

        if (eventData.Event?.AuxiliaryPersons) {
          const auxPersonsEncoded = eventData.Event.AuxiliaryPersons;
          const auxPersonsDecoded = decodeHtmlEntities(auxPersonsEncoded);
          const auxPersonsData = parser.parse(auxPersonsDecoded);

          const auxPersons = auxPersonsData.AuxiliaryPersons?.AuxiliaryPerson || [];
          console.log(`✅ Found ${Array.isArray(auxPersons) ? auxPersons.length : 1} auxiliary persons in tournament`);
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

showMatch44Officials();
