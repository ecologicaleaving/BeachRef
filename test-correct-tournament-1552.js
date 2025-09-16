#!/usr/bin/env node

const fetch = require('node-fetch');

const FIVB_APP_ID = '2a9523517c52420da73d927c6d6bab23';

async function testCorrectTournamentApi(tournamentNo = '1552', refereeId = '151572') {
  try {
    console.log(`🏐 Testing Tournament ${tournamentNo} with CORRECT API format`);
    console.log('================================================\n');

    // Use the correct format: NoTournament (not EventNo)
    const requestXml = `<Request Type="GetBeachMatchList" Fields="No NoInTournament LocalDate LocalTime Status Court TeamAName TeamBName RefereeId1 RefereeId2 NoReferee1 NoReferee2">
  <Filter NoTournament="${tournamentNo}" />
</Request>`;

    console.log('📡 API Request XML:');
    console.log(requestXml);
    console.log('\n🚀 Calling FIVB API...');

    const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
      method: 'POST',
      headers: {
        'X-FIVB-App-ID': FIVB_APP_ID,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/xml'
      },
      body: 'Request=' + encodeURIComponent(requestXml)
    });

    if (!response.ok) {
      throw new Error(`FIVB API error: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    console.log(`✅ Response received: ${xml.length} characters`);

    // Show raw XML for debugging
    console.log('\n📋 Raw XML Response:');
    console.log(xml);

    // Count matches
    const matchCount = (xml.match(/<BeachMatch/g) || []).length;
    console.log(`\n📊 Found ${matchCount} matches for tournament ${tournamentNo}`);

    if (matchCount > 0) {
      console.log(`\n🎯 SUCCESS! Tournament ${tournamentNo} has matches!`);

      // Show first few matches
      const matchRegex = /<BeachMatch([^>]*)>/g;
      let match;
      let count = 0;

      console.log('\n📋 Sample matches:');
      while ((match = matchRegex.exec(xml)) !== null && count < 3) {
        const attributes = match[1];

        const getAttr = (name) => {
          const attrMatch = attributes.match(new RegExp(`${name}="([^"]*)"`, 'i'));
          return attrMatch ? attrMatch[1] : null;
        };

        const matchNo = getAttr('No');
        const teamA = getAttr('TeamAName');
        const teamB = getAttr('TeamBName');
        const status = getAttr('Status');
        const referee1 = getAttr('NoReferee1');
        const referee2 = getAttr('NoReferee2');

        console.log(`   ${count + 1}. Match ${matchNo}: ${teamA} vs ${teamB} (${status})`);
        if (referee1) console.log(`      Referee 1: ${referee1}`);
        if (referee2) console.log(`      Referee 2: ${referee2}`);

        count++;
      }

      // Check if the specified referee is involved
      const hasReferee = xml.includes(`NoReferee1="${refereeId}"`) || xml.includes(`NoReferee2="${refereeId}"`);
      console.log(`\n👨‍⚖️ Referee ${refereeId} found in matches: ${hasReferee ? 'YES' : 'NO'}`);

      if (hasReferee) {
        console.log(`🎉 Perfect! This explains why the app shows matches for referee ${refereeId}`);
      }

    } else {
      console.log('\n❌ No matches found - tournament might be in preparation phase');
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Get tournament and referee from command line args or use defaults
const tournamentNo = process.argv[2] || '1552';
const refereeId = process.argv[3] || '151572';

console.log(`🎯 Testing with Tournament: ${tournamentNo}, Referee: ${refereeId}`);
console.log('💡 Usage: node test-correct-tournament-1552.js [tournamentNo] [refereeId]\n');

testCorrectTournamentApi(tournamentNo, refereeId);