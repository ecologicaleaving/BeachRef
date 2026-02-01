/**
 * Test GetEventRefereeList - The CORRECT API for referee lists
 * Use the same approach as all-referees.tsx (line 447)
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

async function testEventRefereeList() {
  console.log('='.repeat(80));
  console.log('🎯 TEST GetEventRefereeList - Hamburg 2025');
  console.log('='.repeat(80));
  console.log();
  console.log('Looking for Challenge Referee IDs: 155330, 151291, 151534, 150488');
  console.log();

  const searchIds = [155330, 151291, 151534, 150488];

  try {
    // Use GetEventRefereeList with ALL fields to see what's available
    console.log('📋 Requesting ALL fields from GetEventRefereeList (Event 1552)');
    console.log('-'.repeat(80));

    const request = `<Requests>
  <Request Type="GetEventRefereeList">
    <Filter NoEvent="1552"/>
  </Request>
</Requests>`;

    console.log('Request:', request);
    console.log();

    const response = await makeVisApiCall(request);
    const data = parser.parse(response);

    console.log('Response structure:');
    console.log(JSON.stringify(data, null, 2).substring(0, 500));
    console.log('...');
    console.log();

    // Parse the referee list
    if (data.EventReferees?.EventReferee) {
      const referees = Array.isArray(data.EventReferees.EventReferee)
        ? data.EventReferees.EventReferee
        : [data.EventReferees.EventReferee];

      console.log(`✅ Found ${referees.length} referees in Event 1552`);
      console.log();

      // Show first referee to see all available fields
      if (referees.length > 0) {
        console.log('📋 Fields available in EventReferee:');
        const firstReferee = referees[0];
        Object.keys(firstReferee).forEach(field => {
          console.log(`  - ${field}`);
        });
        console.log();
        console.log('Sample referee (first one):');
        console.log(JSON.stringify(firstReferee, null, 2));
        console.log();
      }

      // Search for our Challenge Referee IDs
      console.log('='.repeat(80));
      console.log('🎯 SEARCHING FOR CHALLENGE REFEREE IDs');
      console.log('='.repeat(80));
      console.log();

      const foundReferees = {};

      searchIds.forEach(searchId => {
        const referee = referees.find(r => {
          const noReferee = r.NoReferee || r.No;
          return noReferee === searchId || noReferee === String(searchId);
        });

        if (referee) {
          foundReferees[searchId] = referee;
          console.log(`✅ FOUND ID ${searchId}:`);
          console.log(`   Name: ${referee.FirstName || ''} ${referee.LastName || ''}`);
          console.log(`   Federation: ${referee.FederationCode || referee.NationalityCode || 'N/A'}`);
          console.log(`   Gender: ${referee.Gender === 0 ? 'M' : referee.Gender === 1 ? 'F' : referee.Gender}`);
          console.log(`   All fields:`, JSON.stringify(referee, null, 4));
          console.log();
        }
      });

      const notFoundIds = searchIds.filter(id => !foundReferees[id]);
      if (notFoundIds.length > 0) {
        console.log('❌ Not found: ' + notFoundIds.join(', '));
        console.log();
        console.log('Sample referees (first 10):');
        referees.slice(0, 10).forEach(r => {
          console.log(`  ID ${r.NoReferee || r.No}: ${r.FirstName || ''} ${r.LastName || ''} (${r.FederationCode || r.NationalityCode || 'N/A'})`);
        });
      }

      // Show final mapping
      console.log();
      console.log('='.repeat(80));
      console.log('📊 FINAL MAPPING - CHALLENGE REFEREES');
      console.log('='.repeat(80));
      console.log();

      if (Object.keys(foundReferees).length > 0) {
        console.log('✅ SUCCESS! Challenge Referee names found:');
        console.log();
        Object.entries(foundReferees).forEach(([id, referee]) => {
          console.log(`ID ${id}:`);
          console.log(`  Name: ${referee.FirstName} ${referee.LastName}`);
          console.log(`  Federation: ${referee.FederationCode || referee.NationalityCode}`);
          console.log();
        });

        console.log('IMPLEMENTATION STRATEGY:');
        console.log('  1. Call GetEventRefereeList for the event (e.g., Event 1552)');
        console.log('  2. Build a map: NoReferee → {firstName, lastName, federationCode}');
        console.log('  3. When displaying match with NoRefereeChallenge:');
        console.log('     - Look up NoRefereeChallenge in the referee map');
        console.log('     - Display: firstName lastName (federationCode)');
        console.log('  4. Cache the referee map for the entire event to avoid repeated API calls');
      } else {
        console.log('❌ No Challenge Referee IDs found in GetEventRefereeList');
      }

    } else if (data.BadParameter) {
      console.log('❌ BadParameter error:', JSON.stringify(data.BadParameter, null, 2));
    } else {
      console.log('❌ Unexpected response structure');
      console.log(JSON.stringify(data, null, 2));
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

testEventRefereeList();
