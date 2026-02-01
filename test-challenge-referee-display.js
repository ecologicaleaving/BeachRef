/**
 * Test script to demonstrate Challenge Referee display
 * Using Fort Lauderdale 2017 - Match 203000 (validated in investigation)
 */

const https = require('https');

// Build XML request for GetBeachMatch with all referee fields
function buildRequest(matchNo, eventNo) {
  return `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatch" No="${matchNo}" NoTournament="${eventNo}"
         Fields="No Date
                 Referee1Name Referee1FederationCode
                 Referee2Name Referee2FederationCode
                 RefereeChallengeName RefereeChallengeFederationCode
                 RefereeAssistantChallengeName RefereeAssistantChallengeFederationCode
                 RefereeReserveName RefereeReserveFederationCode
                 TeamAName TeamBName Status" />`;
}

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

async function testChallengeReferee() {
  console.log('='.repeat(80));
  console.log('🏐 CHALLENGE REFEREE DISPLAY TEST');
  console.log('='.repeat(80));
  console.log();
  console.log('Match: Fort Lauderdale 2017 - Men\'s Final');
  console.log('Match No: 203000');
  console.log('Event No: 429');
  console.log();

  try {
    const xmlRequest = buildRequest('203000', '429');
    const response = await makeVisApiCall(xmlRequest);

    // Extract fields using regex
    const extractField = (xml, fieldName) => {
      const regex = new RegExp(`<${fieldName}>([^<]*)</${fieldName}>`, 'i');
      const match = xml.match(regex);
      return match ? match[1] : null;
    };

    console.log('📋 MATCH OFFICIALS:');
    console.log('='.repeat(80));
    console.log();

    // Teams
    const teamA = extractField(response, 'TeamAName');
    const teamB = extractField(response, 'TeamBName');
    const status = extractField(response, 'Status');
    console.log(`Match: ${teamA} vs ${teamB}`);
    console.log(`Status: ${status}`);
    console.log();

    // Main Referees
    console.log('PRIMARY REFEREES:');
    console.log('-'.repeat(80));
    const ref1Name = extractField(response, 'Referee1Name');
    const ref1Fed = extractField(response, 'Referee1FederationCode');
    const ref2Name = extractField(response, 'Referee2Name');
    const ref2Fed = extractField(response, 'Referee2FederationCode');

    console.log(`  R1: ${ref1Name || '(not assigned)'} ${ref1Fed ? `(${ref1Fed})` : ''}`);
    console.log(`  R2: ${ref2Name || '(not assigned)'} ${ref2Fed ? `(${ref2Fed})` : ''}`);
    console.log();

    // Challenge Referee (THIS IS WHAT YOU WANT TO SEE)
    console.log('CHALLENGE REFEREE:');
    console.log('-'.repeat(80));
    const crName = extractField(response, 'RefereeChallengeName');
    const crFed = extractField(response, 'RefereeChallengeFederationCode');

    if (crName) {
      console.log(`  ✅ CR: ${crName} (${crFed})`);
    } else {
      console.log(`  ℹ️  No Challenge Referee assigned for this match`);
    }
    console.log();

    // Bonus: Assistant Challenge Referee
    console.log('ASSISTANT CHALLENGE REFEREE:');
    console.log('-'.repeat(80));
    const acrName = extractField(response, 'RefereeAssistantChallengeName');
    const acrFed = extractField(response, 'RefereeAssistantChallengeFederationCode');

    if (acrName) {
      console.log(`  ✅ ACR: ${acrName} (${acrFed})`);
    } else {
      console.log(`  ℹ️  No Assistant Challenge Referee assigned`);
    }
    console.log();

    // Bonus: Reserve Referee
    console.log('RESERVE REFEREE:');
    console.log('-'.repeat(80));
    const rrName = extractField(response, 'RefereeReserveName');
    const rrFed = extractField(response, 'RefereeReserveFederationCode');

    if (rrName) {
      console.log(`  ✅ RR: ${rrName} (${rrFed})`);
    } else {
      console.log(`  ℹ️  No Reserve Referee assigned`);
    }
    console.log();

    // Show raw XML for verification
    console.log('RAW API RESPONSE:');
    console.log('='.repeat(80));
    console.log(response);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log();
  console.log('='.repeat(80));
  console.log('✅ Test Complete');
  console.log('='.repeat(80));
}

testChallengeReferee();
