/**
 * Debug the VisResponseParser issue with GetBeachMatchList response
 */

const testParseBeachMatches = () => {
  console.log('Testing parseBeachMatches with sample VIS response');

  // Create a simplified version of the parsing logic
  const parseBeachMatchesSimple = (xmlResponse, tournamentId, tournamentTimezone) => {
    try {
      console.log('Input XML length:', xmlResponse.length);
      console.log('Tournament ID:', tournamentId);
      console.log('XML preview:', xmlResponse.substring(0, 500));

      // Extract BeachMatch nodes from XML
      const matchMatches = xmlResponse.match(/<BeachMatch[^>]*>.*?<\/BeachMatch>/gs) ||
                          xmlResponse.match(/<BeachMatch[^>]*\/>/gs); // Handle self-closing tags

      if (!matchMatches) {
        console.log('❌ No matches found in XML');
        return [];
      }

      console.log('✅ Found matches:', matchMatches.length);
      console.log('First match XML:', matchMatches[0].substring(0, 200));

      return matchMatches;

    } catch (error) {
      console.error('❌ Parse error:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  };

  // Test with a sample VIS response structure
  const sampleXML = `<BeachMatches NbItems="52" Version="49084178">
    <BeachMatch No="499649" Version="49082507" Court="1" DateTime="2024-09-20T08:00:00" Round="Pool A" Phase="1">
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
    <BeachMatch No="499650" Version="49082508" />
  </BeachMatches>`;

  try {
    const result = parseBeachMatchesSimple(sampleXML, '8243', undefined);
    console.log('✅ Parse successful, found', result.length, 'matches');
  } catch (error) {
    console.error('❌ Parse failed:', error);
  }
};

// Run the test
testParseBeachMatches();