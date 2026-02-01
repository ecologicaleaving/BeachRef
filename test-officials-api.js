/**
 * Test script to explore match officials data from VIS API
 * Hamburg Tournament #1552, Match #44 (Women's Final)
 */

const VIS_API_URL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';

async function testOfficialsAPI() {
  console.log('='.repeat(80));
  console.log('🏐 VIS API MATCH OFFICIALS INVESTIGATION');
  console.log('='.repeat(80));
  console.log();

  const matchNo = '44';
  const tournamentNo = '1552'; // Hamburg Elite 16 2025

  // Test 1: GetBeachMatch with Personnel field
  console.log('📋 TEST 1: GetBeachMatch with Personnel field');
  console.log('-'.repeat(80));

  const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatch" No="${matchNo}" NoTournament="${tournamentNo}" Fields="No MatchDate Referee1Name Referee2Name Personnel" />`;

  try {
    const formData = `Request=${encodeURIComponent(xmlRequest)}`;

    const response = await fetch(VIS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseText = await response.text();

    console.log('Full XML Response:');
    console.log('='.repeat(80));
    console.log(responseText);
    console.log('='.repeat(80));
    console.log();

    // Extract and analyze Personnel field
    const personnelMatch = responseText.match(/<Personnel>(.*?)<\/Personnel>/s);
    if (personnelMatch) {
      console.log('✅ Personnel field found!');
      console.log();
      console.log('Raw Personnel XML (HTML-encoded):');
      console.log('-'.repeat(80));
      console.log(personnelMatch[1]);
      console.log('-'.repeat(80));
      console.log();

      // Decode HTML entities
      const decoded = personnelMatch[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');

      console.log('Decoded Personnel XML:');
      console.log('-'.repeat(80));
      console.log(decoded);
      console.log('-'.repeat(80));
      console.log();

      // Look for specific official roles
      console.log('🔍 Searching for official role fields:');
      console.log('-'.repeat(80));
      const roles = [
        'ChallengeReferee',
        'RefereeChallenge',
        'Scorer',
        'AssistantScorer',
        'LineJudge1',
        'LineJudge2',
        'LineJudge3',
        'LineJudge4',
        'Line1',
        'Line2',
      ];

      roles.forEach(role => {
        const regex = new RegExp(`<${role}[> ]`, 'i');
        const found = regex.test(decoded);
        console.log(`  ${role.padEnd(20)} ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);

        if (found) {
          // Extract the value
          const valueRegex = new RegExp(`<${role}>([^<]*)</${role}>`, 'i');
          const match = decoded.match(valueRegex);
          if (match) {
            console.log(`    → Value: "${match[1]}"`);
          }
        }
      });
      console.log('-'.repeat(80));

    } else {
      console.log('❌ NO Personnel field in response');
    }

    console.log();

    // Test 2: Get tournament AuxiliaryPersons (officials lookup)
    console.log();
    console.log('📋 TEST 2: GetEvent AuxiliaryPersons (Officials Lookup)');
    console.log('-'.repeat(80));

    const eventRequest = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetEvent" No="${tournamentNo}" Fields="No Name AuxiliaryPersons" />`;

    const eventResponse = await fetch(VIS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `Request=${encodeURIComponent(eventRequest)}`
    });

    const eventText = await eventResponse.text();

    // Extract AuxiliaryPersons
    const auxMatch = eventText.match(/<AuxiliaryPersons>(.*?)<\/AuxiliaryPersons>/s);
    if (auxMatch) {
      console.log('✅ AuxiliaryPersons found!');
      console.log();

      // Decode HTML entities
      const decoded = auxMatch[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');

      console.log('Decoded AuxiliaryPersons XML:');
      console.log('-'.repeat(80));
      console.log(decoded);
      console.log('-'.repeat(80));

    } else {
      console.log('❌ NO AuxiliaryPersons field in response');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }

  console.log();
  console.log('='.repeat(80));
  console.log('✅ Investigation Complete');
  console.log('='.repeat(80));
}

// Run the test
testOfficialsAPI();
