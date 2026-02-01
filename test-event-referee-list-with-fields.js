/**
 * Test GetEventRefereeList WITH FIELDS - Get referee details
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

async function testEventRefereeListWithFields() {
  console.log('='.repeat(80));
  console.log('🎯 GetEventRefereeList WITH FIELDS - Hamburg 2025');
  console.log('='.repeat(80));
  console.log();
  console.log('Looking for Challenge Referee IDs: 155330, 151291, 151534, 150488');
  console.log();

  const searchIds = [155330, 151291, 151534, 150488];

  try {
    // Request WITH FIELDS parameter
    console.log('📋 Requesting GetEventRefereeList with Fields (Event 1552)');
    console.log('-'.repeat(80));

    const request = `<Requests>
  <Request Type="GetEventRefereeList"
           Fields="No NoReferee FirstName LastName FederationCode Gender Level">
    <Filter NoEvent="1552"/>
  </Request>
</Requests>`;

    console.log('Request:', request);
    console.log();

    const response = await makeVisApiCall(request);

    // Show raw XML for debugging
    console.log('Raw XML response (first 1000 chars):');
    console.log(response.substring(0, 1000));
    console.log('...');
    console.log();

    const data = parser.parse(response);

    // Parse the referee list
    if (data.Responses?.EventReferees?.EventReferee) {
      const referees = Array.isArray(data.Responses.EventReferees.EventReferee)
        ? data.Responses.EventReferees.EventReferee
        : [data.Responses.EventReferees.EventReferee];

      console.log(`✅ Found ${referees.length} referees in Event 1552`);
      console.log();

      // Show first referee to see all available fields
      if (referees.length > 0) {
        console.log('📋 Fields in first referee:');
        const firstReferee = referees[0];
        Object.keys(firstReferee).forEach(field => {
          console.log(`  - ${field}: ${firstReferee[field]}`);
        });
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
          const noReferee = r.NoReferee;
          return noReferee === searchId || noReferee === String(searchId);
        });

        if (referee) {
          foundReferees[searchId] = referee;
          console.log(`✅ FOUND ID ${searchId}:`);
          console.log(`   Name: ${referee.FirstName || ''} ${referee.LastName || ''}`);
          console.log(`   Federation: ${referee.FederationCode || 'N/A'}`);
          console.log(`   Gender: ${referee.Gender === 0 ? 'M' : referee.Gender === 1 ? 'F' : referee.Gender}`);
          console.log(`   Level: ${referee.Level || 'N/A'}`);
          console.log();
        }
      });

      const notFoundIds = searchIds.filter(id => !foundReferees[id]);
      if (notFoundIds.length > 0) {
        console.log('⚠️  Not found: ' + notFoundIds.join(', '));
        console.log();
        console.log('All referee IDs in event (first 20):');
        referees.slice(0, 20).forEach(r => {
          console.log(`  NoReferee ${r.NoReferee}: ${r.FirstName || ''} ${r.LastName || ''} (${r.FederationCode || 'N/A'})`);
        });
        console.log();
      }

      // Show final mapping
      console.log('='.repeat(80));
      console.log('📊 FINAL MAPPING - CHALLENGE REFEREES');
      console.log('='.repeat(80));
      console.log();

      if (Object.keys(foundReferees).length > 0) {
        console.log('✅ SUCCESS! Challenge Referee names found via GetEventRefereeList:');
        console.log();
        Object.entries(foundReferees).forEach(([id, referee]) => {
          console.log(`NoRefereeChallenge ID ${id}:`);
          console.log(`  Full Name: ${referee.FirstName} ${referee.LastName}`);
          console.log(`  Federation: ${referee.FederationCode}`);
          console.log(`  Display: ${referee.FirstName} ${referee.LastName} (${referee.FederationCode})`);
          console.log();
        });

        console.log('IMPLEMENTATION STRATEGY:');
        console.log('  1. Call GetEventRefereeList for the event with Fields:');
        console.log('     "NoReferee FirstName LastName FederationCode"');
        console.log('  2. Build a map: NoReferee → {firstName, lastName, federationCode}');
        console.log('  3. Cache this map for the entire event (reuse for all matches)');
        console.log('  4. When displaying match with NoRefereeChallenge:');
        console.log('     - Look up match.NoRefereeChallenge in the map');
        console.log('     - Display: firstName lastName (federationCode)');
        console.log();
        console.log('This is the SAME approach as all-referees.tsx (line 447-486)');
      } else {
        console.log('❌ No Challenge Referee IDs found in GetEventRefereeList');
        console.log();
        console.log('POSSIBLE REASONS:');
        console.log('  - Challenge Referees might not be in the event referee list');
        console.log('  - They might be from a different event or not assigned to event');
        console.log('  - GetEventRefereeList might only return match referees, not challenge referees');
      }

    } else if (data.Responses?.BadParameter) {
      console.log('❌ BadParameter error:', JSON.stringify(data.Responses.BadParameter, null, 2));
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

testEventRefereeListWithFields();
