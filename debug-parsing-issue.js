/**
 * Debug the GetBeachMatch parsing issue
 */

const testParseMatchFromGetBeachMatchResponse = (xmlData) => {
  try {
    if (!xmlData || typeof xmlData !== 'string') {
      console.log('❌ Input validation failed:', { xmlData: !!xmlData, type: typeof xmlData });
      return null;
    }

    console.log('✅ Input validation passed');
    console.log('📄 XML Data preview:', xmlData.substring(0, 500));

    // The GetBeachMatch response actually returns BeachMatches with BeachMatch elements
    const singleMatchPattern = /<BeachMatch[^>]*>([\s\S]*?)<\/BeachMatch>/i;
    const matchMatch = xmlData.match(singleMatchPattern);

    console.log('🔍 Looking for BeachMatch pattern in XML...');
    console.log('📊 Pattern match result:', matchMatch ? 'FOUND' : 'NOT FOUND');

    if (matchMatch) {
      console.log('🎯 Found match XML:', matchMatch[0].substring(0, 300));

      // Extract match attributes and content
      const matchXml = matchMatch[0];

      // Parse using similar logic to VisResponseParser but for single match
      const matchData = {};

      // Extract basic match attributes
      const noMatch = matchXml.match(/No="([^"]*)"/i);
      if (noMatch) {
        matchData.visNo = noMatch[1];
        console.log('🆔 Match No:', matchData.visNo);
      }

      const tournamentMatch = matchXml.match(/NoTournament="([^"]*)"/i);
      if (tournamentMatch) {
        matchData.tournamentId = tournamentMatch[1];
        console.log('🏆 Tournament ID:', matchData.tournamentId);
      }

      const courtMatch = matchXml.match(/Court="([^"]*)"/i);
      if (courtMatch) {
        matchData.courtNumber = courtMatch[1];
        console.log('🏐 Court:', matchData.courtNumber);
      }

      const dateTimeMatch = matchXml.match(/DateTime="([^"]*)"/i);
      if (dateTimeMatch) {
        matchData.scheduledDateTime = dateTimeMatch[1];
        console.log('📅 DateTime:', matchData.scheduledDateTime);
      }

      const roundMatch = matchXml.match(/Round="([^"]*)"/i);
      if (roundMatch) {
        matchData.round = roundMatch[1];
        console.log('🏁 Round:', matchData.round);
      }

      const phaseMatch = matchXml.match(/Phase="([^"]*)"/i);
      if (phaseMatch) {
        matchData.phaseCode = phaseMatch[1];
        console.log('📊 Phase:', matchData.phaseCode);
      }

      // Extract team data from Team elements
      const teamPattern = /<Team[^>]*TeamNo="([AB])"[^>]*>([\s\S]*?)<\/Team>/gi;
      let teamMatch;
      let teamCount = 0;

      console.log('👥 Looking for teams...');

      while ((teamMatch = teamPattern.exec(matchXml)) !== null) {
        teamCount++;
        const teamLetter = teamMatch[1]; // 'A' or 'B'
        const teamXml = teamMatch[2];

        console.log(`🔍 Found Team ${teamLetter}:`, teamXml.substring(0, 200));

        const teamData = {};

        // Extract team name from the Team element attributes
        const teamElementMatch = teamMatch[0].match(/<Team[^>]*Name="([^"]*)"[^>]*>/i);
        if (teamElementMatch) {
          teamData.teamName = teamElementMatch[1];
          console.log(`  📛 Team ${teamLetter} Name:`, teamData.teamName);
        }

        const federationElementMatch = teamMatch[0].match(/<Team[^>]*Federation="([^"]*)"[^>]*>/i);
        if (federationElementMatch) {
          teamData.federationCode = federationElementMatch[1];
          console.log(`  🏳️ Team ${teamLetter} Federation:`, teamData.federationCode);
        }

        // Extract players
        const playerPattern = /<Player[^>]*Name="([^"]*)"[^>]*\/>/gi;
        const players = [];
        let playerMatch;

        while ((playerMatch = playerPattern.exec(teamXml)) !== null) {
          players.push(playerMatch[1]);
          console.log(`    👤 Player: ${playerMatch[1]}`);
        }

        if (players.length >= 2) {
          teamData.player1Name = players[0];
          teamData.player2Name = players[1];
        }

        // Assign to team1 or team2
        if (teamLetter === 'A') {
          matchData.team1 = teamData;
          console.log('✅ Assigned team1:', teamData);
        } else {
          matchData.team2 = teamData;
          console.log('✅ Assigned team2:', teamData);
        }
      }

      console.log(`📊 Total teams found: ${teamCount}`);

      // Check validation condition
      const hasValidTeams = matchData && matchData.team1 && matchData.team2;
      console.log('🔍 Validation check:');
      console.log('  - matchData exists:', !!matchData);
      console.log('  - team1 exists:', !!matchData.team1);
      console.log('  - team2 exists:', !!matchData.team2);
      console.log('  - hasValidTeams:', hasValidTeams);

      if (hasValidTeams) {
        console.log('✅ Match parsing successful!');
        console.log('📋 Final matchData:', JSON.stringify(matchData, null, 2));
        return matchData;
      } else {
        console.log('❌ Match parsing failed validation - missing teams');
        console.log('🔍 matchData.team1:', matchData.team1);
        console.log('🔍 matchData.team2:', matchData.team2);
        return null;
      }
    } else {
      console.log('❌ No BeachMatch element found in XML');

      // Let's check what patterns are available
      console.log('🔍 Checking alternative patterns...');
      const beachMatchSelfClosing = /<BeachMatch[^>]*\/>/gi;
      const selfClosingMatches = xmlData.match(beachMatchSelfClosing);
      console.log('  Self-closing BeachMatch tags:', selfClosingMatches ? selfClosingMatches.length : 0);

      const anyBeachMatch = /BeachMatch/gi;
      const anyMatches = xmlData.match(anyBeachMatch);
      console.log('  Any BeachMatch text:', anyMatches ? anyMatches.length : 0);

      return null;
    }

  } catch (error) {
    console.error('❌ Parse error:', error.message);
    console.error('📍 Error stack:', error.stack);
    throw error;
  }
};

// Test with sample GetBeachMatch response (should contain BeachMatches wrapper)
const sampleGetBeachMatchXML = `<BeachMatches NbItems="1" Version="49084178">
  <BeachMatch No="499645" Version="49082508" Court="1" DateTime="2024-09-20T10:30:00" Round="Pool A" Phase="1">
    <Team TeamNo="A" Name="TEAM1/PLAYER1" Federation="ITA">
      <Player Name="PLAYER1" Federation="ITA" />
      <Player Name="PLAYER2" Federation="ITA" />
    </Team>
    <Team TeamNo="B" Name="TEAM2/PLAYER3" Federation="USA">
      <Player Name="PLAYER3" Federation="USA" />
      <Player Name="PLAYER4" Federation="USA" />
    </Team>
    <Result Set1A="21" Set1B="19" Set2A="21" Set2B="15" />
  </BeachMatch>
</BeachMatches>`;

console.log('='.repeat(60));
console.log('🧪 Testing GetBeachMatch parsing with sample XML');
console.log('='.repeat(60));

try {
  const result = testParseMatchFromGetBeachMatchResponse(sampleGetBeachMatchXML);
  console.log('\n🎯 Final result:', result ? 'SUCCESS' : 'FAILURE');
  if (result) {
    console.log('📊 Teams found:', { team1: !!result.team1, team2: !!result.team2 });
  }
} catch (error) {
  console.error('💥 Test failed:', error);
}