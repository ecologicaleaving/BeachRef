/**
 * Test script to explore VIS API Personnel structure
 * for Challenge Referee, Scorer, Assistant Scorer, and Line Judges
 */

const fetch = require('node-fetch');

async function testPersonnelStructure() {
  console.log('=== VIS API Personnel Structure Test ===\n');

  // Using Hamburg tournament (has match #44 with officials)
  const tournamentNo = '17520';
  const matchNo = '44';

  const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetBeachMatchList" Fields="No MatchDate Referee1Name Referee2Name Personnel">
    <Filter TournamentNo="${tournamentNo}" MatchNo="${matchNo}" />
  </Request>
</Requests>`;

  try {
    const response = await fetch('https://www.fivb.com/Vis2009/XmlRequest.asmx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `Request=${encodeURIComponent(xmlRequest)}`
    });

    const xmlText = await response.text();

    console.log('Full XML Response:');
    console.log('='.repeat(80));
    console.log(xmlText);
    console.log('='.repeat(80));
    console.log();

    // Parse and extract Personnel section
    const personnelMatch = xmlText.match(/<Personnel>(.*?)<\/Personnel>/s);
    if (personnelMatch) {
      console.log('✓ Personnel section found!');
      console.log();
      console.log('Personnel XML:');
      console.log('-'.repeat(80));
      console.log(personnelMatch[0]);
      console.log('-'.repeat(80));
      console.log();

      // Look for specific roles
      const roles = [
        'ChallengeReferee',
        'Scorer',
        'AssistantScorer',
        'LineJudge',
        'Referee',
        'Person',
        'Function'
      ];

      console.log('Checking for role fields:');
      roles.forEach(role => {
        const regex = new RegExp(`<${role}[> ]`, 'i');
        const found = regex.test(personnelMatch[0]);
        console.log(`  ${role}: ${found ? '✓ FOUND' : '✗ NOT FOUND'}`);
      });

    } else {
      console.log('✗ No Personnel section found in response');
    }

    // Also check for any other official-related fields
    console.log();
    console.log('All referee/official related fields in response:');
    const refereeFields = xmlText.match(/<([^>]*(?:referee|official|scorer|judge|personnel)[^>]*)>/gi) || [];
    refereeFields.forEach(field => console.log(`  ${field}`));

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

testPersonnelStructure();
