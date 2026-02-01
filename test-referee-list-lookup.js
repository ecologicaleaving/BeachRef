/**
 * Test Referee List Lookup for Challenge Referees
 * Hamburg 2025 - Look up NoRefereeChallenge IDs: 155330, 151291
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

async function testRefereeListLookup() {
  console.log('='.repeat(80));
  console.log('🔍 REFEREE LIST LOOKUP - CHALLENGE REFEREES');
  console.log('='.repeat(80));
  console.log();
  console.log('Looking for:');
  console.log('  Men\'s Final: NoRefereeChallenge = 155330');
  console.log('  Women\'s Final: NoRefereeChallenge = 151291');
  console.log();

  try {
    // APPROACH 1: Try GetEvent with Referees field
    console.log('📋 APPROACH 1: GetEvent with Referees field (Event 1552)');
    console.log('-'.repeat(80));
    const eventRequest1 = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetEvent" No="1552" Fields="No Name Referees" />`;

    const eventResponse1 = await makeVisApiCall(eventRequest1);
    const eventData1 = parser.parse(eventResponse1);

    if (eventData1.Event?.Referees) {
      console.log('✅ Referees field exists');
      const decoded = decodeHtmlEntities(eventData1.Event.Referees);
      console.log('Raw Referees data (first 500 chars):');
      console.log(decoded.substring(0, 500));
      console.log('...');
      console.log();

      try {
        const refData = parser.parse(decoded);
        console.log('Parsed structure:');
        console.log(JSON.stringify(refData, null, 2));
        console.log();

        // Look for our IDs
        const searchIds = [155330, 151291];
        let found = false;

        if (refData.Referees?.Referee) {
          const refs = Array.isArray(refData.Referees.Referee)
            ? refData.Referees.Referee
            : [refData.Referees.Referee];

          console.log(`Found ${refs.length} referees in list`);
          console.log();

          searchIds.forEach(id => {
            const ref = refs.find(r => r.No === id || r.No === String(id));
            if (ref) {
              found = true;
              console.log(`✅ FOUND ID ${id}:`);
              console.log(`   Name: ${ref.FirstName} ${ref.LastName}`);
              console.log(`   Federation: ${ref.NationalityCode || ref.FederationCode || 'N/A'}`);
              console.log(`   All fields:`, JSON.stringify(ref, null, 4));
              console.log();
            }
          });

          if (!found) {
            console.log('❌ IDs 155330 and 151291 not found in Referees list');
            console.log();
            console.log('Sample referees (first 5):');
            refs.slice(0, 5).forEach(r => {
              console.log(`  ID ${r.No}: ${r.FirstName || ''} ${r.LastName || ''} (${r.NationalityCode || r.FederationCode || 'N/A'})`);
            });
          }
        } else {
          console.log('⚠️  No Referee array in Referees structure');
        }
      } catch (e) {
        console.log(`❌ Failed to parse Referees XML: ${e.message}`);
      }
    } else {
      console.log('❌ No Referees field in Event');
    }
    console.log();

    // APPROACH 2: Check AuxiliaryPersons (where Personnel comes from)
    console.log('📋 APPROACH 2: AuxiliaryPersons (Event 1552)');
    console.log('-'.repeat(80));
    const eventRequest2 = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetEvent" No="1552" Fields="No Name AuxiliaryPersons" />`;

    const eventResponse2 = await makeVisApiCall(eventRequest2);
    const eventData2 = parser.parse(eventResponse2);

    if (eventData2.Event?.AuxiliaryPersons) {
      const decoded = decodeHtmlEntities(eventData2.Event.AuxiliaryPersons);
      const auxData = parser.parse(decoded);

      if (auxData.AuxiliaryPersons?.AuxiliaryPerson) {
        const persons = Array.isArray(auxData.AuxiliaryPersons.AuxiliaryPerson)
          ? auxData.AuxiliaryPersons.AuxiliaryPerson
          : [auxData.AuxiliaryPersons.AuxiliaryPerson];

        console.log(`✅ Found ${persons.length} auxiliary persons`);
        console.log();

        const searchIds = [155330, 151291];
        let found = false;

        searchIds.forEach(id => {
          const person = persons.find(p => p.No === id || p.No === String(id));
          if (person) {
            found = true;
            console.log(`✅ FOUND ID ${id} IN AUXILIARY PERSONS:`);
            console.log(`   Name: ${person.FirstName} ${person.LastName}`);
            console.log(`   Federation: ${person.NationalityCode || 'N/A'}`);
            console.log(`   Functions: ${person.Functions || 'N/A'}`);
            console.log(`   All fields:`, JSON.stringify(person, null, 4));
            console.log();
          }
        });

        if (!found) {
          console.log('❌ IDs 155330 and 151291 not found in AuxiliaryPersons');
          console.log();
          console.log('Sample persons (first 10):');
          persons.slice(0, 10).forEach(p => {
            console.log(`  ID ${p.No}: ${p.FirstName || ''} ${p.LastName || ''} (${p.NationalityCode || 'N/A'}) - ${p.Functions || 'N/A'}`);
          });
        }
      }
    } else {
      console.log('❌ No AuxiliaryPersons field');
    }
    console.log();

    // APPROACH 3: Try GetBeachOfficialList or GetOfficialList
    console.log('📋 APPROACH 3: Try GetBeachOfficialList (Event 1552)');
    console.log('-'.repeat(80));
    const officialRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachOfficialList">
  <Filter NoEvent="1552" />
</Request>`;

    try {
      const officialResponse = await makeVisApiCall(officialRequest);
      const officialData = parser.parse(officialResponse);

      console.log('Response structure:');
      console.log(JSON.stringify(officialData, null, 2));
      console.log();

      // Look for our IDs in whatever structure comes back
      const searchInObject = (obj, path = '') => {
        const searchIds = [155330, 151291, '155330', '151291'];

        for (const [key, value] of Object.entries(obj)) {
          if (value && typeof value === 'object') {
            searchInObject(value, `${path}.${key}`);
          } else if (searchIds.includes(value)) {
            console.log(`✅ FOUND ID ${value} at path: ${path}.${key}`);
            console.log(`   Context:`, JSON.stringify(obj, null, 4));
          }
        }
      };

      searchInObject(officialData);
    } catch (e) {
      console.log(`❌ GetBeachOfficialList failed: ${e.message}`);
    }
    console.log();

    // APPROACH 4: Check tournament-specific referee lists
    console.log('📋 APPROACH 4: Tournament-specific GetBeachMatchList with ALL referee fields');
    console.log('-'.repeat(80));

    for (const [name, tournamentNo] of [['Men', '8239'], ['Women', '8238']]) {
      console.log(`\n${name}'s Tournament ${tournamentNo}:`);
      const matchRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatchList" Fields="No NoInTournament RoundName NoReferee1 NoReferee2 NoRefereeChallenge Referee1Name Referee2Name RefereeChallengeName">
  <Filter NoTournament="${tournamentNo}" />
</Request>`;

      const matchResponse = await makeVisApiCall(matchRequest);
      const matchData = parser.parse(matchResponse);
      const matches = matchData.BeachMatches?.BeachMatch || [];
      const matchesArray = Array.isArray(matches) ? matches : [matches];

      // Find finals with NoRefereeChallenge
      const finalsWithChallenge = matchesArray.filter(m =>
        m.RoundName?.toLowerCase().includes('final') && m.NoRefereeChallenge
      );

      if (finalsWithChallenge.length > 0) {
        console.log(`  Found ${finalsWithChallenge.length} finals with Challenge Referee:`);
        finalsWithChallenge.forEach(m => {
          console.log(`    Match ${m.NoInTournament}: ${m.RoundName}`);
          console.log(`      NoRefereeChallenge: ${m.NoRefereeChallenge}`);
          console.log(`      R1: ${m.Referee1Name} (ID: ${m.NoReferee1})`);
          console.log(`      R2: ${m.Referee2Name} (ID: ${m.NoReferee2})`);
          console.log(`      CR Name Field: ${m.RefereeChallengeName || '(empty)'}`);
        });
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

testRefereeListLookup();
