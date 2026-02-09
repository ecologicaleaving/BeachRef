/**
 * Test Script: Officials API Exploration (Pure JavaScript)
 *
 * Tests the VIS API endpoints for tournament officials:
 * - GetEventOfficialList
 * - GetEventRefereeList
 *
 * Target: João Pessoa 2026 March tournament
 */

const { XMLParser } = require('fast-xml-parser');

const API_BASE_URL = 'https://www.fivb.org/VisSDK/VisWebService/';

async function makeVisApiCall(xmlRequest) {
  const formData = `Request=${encodeURIComponent(xmlRequest)}`;

  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.text();
}

async function findJoaoPessoa2026() {
  console.log('🔍 Searching for João Pessoa 2026 March tournament...\n');

  const xmlRequest = `<Request Type="GetEventList" Fields="No Name City StartDate EndDate Gender Status">
  <Filter StartDate="2026-03-01" EndDate="2026-03-31" HasBeachTournament="True" />
</Request>`;

  const xmlResponse = await makeVisApiCall(xmlRequest);

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: true,
  });

  const result = parser.parse(xmlResponse);
  const events = result?.BVBRBeachVolleyBallRoot?.Event;

  if (!events) {
    console.log('❌ No tournaments found for March 2026');
    return null;
  }

  const eventArray = Array.isArray(events) ? events : [events];

  // Filter for João Pessoa (case-insensitive, handle special characters)
  const joaoPessoaTournaments = eventArray.filter((event) => {
    const city = (event.City || '').toLowerCase();
    return city.includes('joao') || city.includes('joão');
  });

  if (joaoPessoaTournaments.length === 0) {
    console.log('❌ No João Pessoa tournaments found in March 2026');
    console.log('📋 Available tournaments:');
    eventArray.forEach((event) => {
      console.log(
        `   - ${event.Name} (${event.City}) - ${event.StartDate} to ${event.EndDate}`
      );
    });
    return null;
  }

  console.log('✅ Found João Pessoa tournaments:\n');
  joaoPessoaTournaments.forEach((event, index) => {
    console.log(`${index + 1}. ${event.Name}`);
    console.log(`   Event No: ${event.No}`);
    console.log(`   City: ${event.City}`);
    console.log(`   Dates: ${event.StartDate} to ${event.EndDate}`);
    console.log(`   Gender: ${event.Gender}`);
    console.log(`   Status: ${event.Status}\n`);
  });

  return joaoPessoaTournaments;
}

async function testOfficialsList(eventNo, tournamentName) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing Officials APIs for: ${tournamentName}`);
  console.log(`Event No: ${eventNo}`);
  console.log('='.repeat(80));

  // Test 1: GetEventOfficialList
  console.log('\n📋 Test 1: GetEventOfficialList');
  console.log('-'.repeat(80));

  try {
    const xmlRequest1 = `<Request Type="GetEventOfficialList" Fields="NoOfficial FirstName LastName Role Status FederationCode"><Filter NoEvent="${eventNo}" /></Request>`;

    const xmlResponse1 = await makeVisApiCall(xmlRequest1);

    console.log('✅ GetEventOfficialList - SUCCESS\n');

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true,
    });

    const result = parser.parse(xmlResponse1);
    const officials =
      result?.BVBRBeachVolleyBallRoot?.EventOfficials?.Official;

    if (officials) {
      const officialArray = Array.isArray(officials)
        ? officials
        : [officials];
      console.log(`📊 Total Officials: ${officialArray.length}\n`);

      console.log('Officials List:');
      officialArray.forEach((official, index) => {
        console.log(
          `\n${index + 1}. ${official.FirstName} ${official.LastName}`
        );
        console.log(`   NoOfficial: ${official.NoOfficial}`);
        console.log(`   Role: ${official.Role}`);
        console.log(`   Status: ${official.Status || 'N/A'}`);
        console.log(`   Federation: ${official.FederationCode || 'N/A'}`);
      });
    } else {
      console.log('⚠️  No officials found in response');
    }

    // Show raw XML sample (first 1000 chars)
    console.log('\n📄 Raw XML Response (sample):');
    console.log(xmlResponse1.substring(0, 1500) + '...');
  } catch (error) {
    console.log('❌ GetEventOfficialList - EXCEPTION');
    console.error(error.message);
  }

  // Test 2: GetEventRefereeList
  console.log('\n\n📋 Test 2: GetEventRefereeList');
  console.log('-'.repeat(80));

  try {
    const xmlRequest2 = `<Request Type="GetEventRefereeList" Fields="NoReferee FirstName LastName Gender Role Status FederationCode"><Filter NoEvent="${eventNo}" /></Request>`;

    const xmlResponse2 = await makeVisApiCall(xmlRequest2);

    console.log('✅ GetEventRefereeList - SUCCESS\n');

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true,
    });

    const result = parser.parse(xmlResponse2);
    const referees =
      result?.BVBRBeachVolleyBallRoot?.EventReferees?.Referee;

    if (referees) {
      const refereeArray = Array.isArray(referees) ? referees : [referees];
      console.log(`📊 Total Referees: ${refereeArray.length}\n`);

      console.log('Referees List:');
      refereeArray.forEach((referee, index) => {
        console.log(
          `\n${index + 1}. ${referee.FirstName} ${referee.LastName}`
        );
        console.log(`   NoReferee: ${referee.NoReferee}`);
        console.log(`   Gender: ${referee.Gender === 0 ? 'Male' : 'Female'}`);
        console.log(`   Role: ${referee.Role || 'N/A'}`);
        console.log(`   Status: ${referee.Status || 'N/A'}`);
        console.log(`   Federation: ${referee.FederationCode || 'N/A'}`);
      });
    } else {
      console.log('⚠️  No referees found in response');
    }

    // Show raw XML sample (first 1000 chars)
    console.log('\n📄 Raw XML Response (sample):');
    console.log(xmlResponse2.substring(0, 1500) + '...');
  } catch (error) {
    console.log('❌ GetEventRefereeList - EXCEPTION');
    console.error(error.message);
  }
}

async function main() {
  console.log('🏐 BeachRef Officials API Testing Tool');
  console.log('='.repeat(80));
  console.log('Target: João Pessoa 2026 March\n');

  // Step 1: Find João Pessoa tournaments
  const tournaments = await findJoaoPessoa2026();

  if (!tournaments || tournaments.length === 0) {
    console.log('\n❌ No tournaments found. Exiting.');
    return;
  }

  // Step 2: Test officials APIs for each tournament found
  for (const tournament of tournaments) {
    await testOfficialsList(tournament.No.toString(), tournament.Name);
  }

  console.log('\n\n✅ Testing complete!');
  console.log('='.repeat(80));
}

// Run the script
main().catch(console.error);
