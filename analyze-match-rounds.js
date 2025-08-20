// Analyze match Round field values in Baden tournament to understand phases
const VIS_BASE_URL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';

async function analyzeMatchRounds() {
  try {
    console.log('🔍 ANALYZING MATCH ROUNDS/PHASES IN BADEN TOURNAMENT');
    console.log('='.repeat(60));
    
    const badenTournamentNo = '8371'; // WBAD2025
    
    console.log(`🎯 Analyzing tournament No=${badenTournamentNo} (WBAD2025 - BPT Challenge Baden)`);
    
    // Get all matches with Round field
    const fields = 'No NoInTournament TeamAName TeamBName Round Status LocalDate LocalTime Court Venue';
    const request = `<Request Type='GetBeachMatchList' Fields='${fields}'><Filter NoTournament='${badenTournamentNo}' /></Request>`;
    const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(request)}`;
    
    console.log('\n📋 Request:');
    console.log(`GetBeachMatchList with Fields: ${fields}`);
    
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
        'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
      },
    });
    
    if (!response.ok) {
      console.error(`Request failed: ${response.status}`);
      return;
    }
    
    const xmlText = await response.text();
    const matchMatches = xmlText.match(/<BeachMatch[^>]*\/>/g);
    
    if (!matchMatches || matchMatches.length === 0) {
      console.log('❌ No matches found');
      return;
    }
    
    console.log(`\n✅ Found ${matchMatches.length} matches`);
    
    // Analyze Round values
    const roundAnalysis = {};
    const statusAnalysis = {};
    const matchDetails = [];
    
    matchMatches.forEach(matchXml => {
      const extractAttribute = (attr) => {
        const match = matchXml.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
        return match ? match[1] : '';
      };
      
      const round = extractAttribute('Round');
      const status = extractAttribute('Status');
      const teamA = extractAttribute('TeamAName');
      const teamB = extractAttribute('TeamBName');
      const court = extractAttribute('Court');
      const localDate = extractAttribute('LocalDate');
      const localTime = extractAttribute('LocalTime');
      const noInTournament = extractAttribute('NoInTournament');
      
      // Count rounds
      if (round) {
        roundAnalysis[round] = (roundAnalysis[round] || 0) + 1;
      }
      
      // Count statuses
      if (status) {
        statusAnalysis[status] = (statusAnalysis[status] || 0) + 1;
      }
      
      matchDetails.push({
        NoInTournament: noInTournament,
        Round: round,
        Status: status,
        TeamA: teamA,
        TeamB: teamB,
        Court: court,
        Date: localDate,
        Time: localTime,
        xml: matchXml
      });
    });
    
    // Display Round analysis
    console.log('\n🏆 ROUND/PHASE ANALYSIS:');
    console.log('='.repeat(40));
    
    if (Object.keys(roundAnalysis).length > 0) {
      const sortedRounds = Object.entries(roundAnalysis)
        .sort(([,a], [,b]) => b - a); // Sort by count descending
      
      sortedRounds.forEach(([round, count]) => {
        const percentage = ((count / matchMatches.length) * 100).toFixed(1);
        console.log(`   Round "${round}": ${count} matches (${percentage}%)`);
      });
      
      console.log(`\n📊 Total unique rounds: ${Object.keys(roundAnalysis).length}`);
      
      // Show examples of each round
      console.log('\n📋 ROUND EXAMPLES:');
      Object.keys(roundAnalysis).forEach(round => {
        const exampleMatch = matchDetails.find(match => match.Round === round);
        if (exampleMatch) {
          console.log(`\n   Round "${round}":`);
          console.log(`      Match #${exampleMatch.NoInTournament}: ${exampleMatch.TeamA} vs ${exampleMatch.TeamB}`);
          console.log(`      Date: ${exampleMatch.Date} ${exampleMatch.Time} | Court: ${exampleMatch.Court} | Status: ${exampleMatch.Status}`);
        }
      });
    } else {
      console.log('❌ No Round data found in matches');
    }
    
    // Display Status analysis
    console.log('\n📈 MATCH STATUS ANALYSIS:');
    console.log('='.repeat(40));
    
    if (Object.keys(statusAnalysis).length > 0) {
      Object.entries(statusAnalysis)
        .sort(([,a], [,b]) => b - a)
        .forEach(([status, count]) => {
          const percentage = ((count / matchMatches.length) * 100).toFixed(1);
          console.log(`   Status "${status}": ${count} matches (${percentage}%)`);
        });
    }
    
    // Show sample match data
    console.log('\n🔧 SAMPLE MATCH DATA:');
    console.log('='.repeat(40));
    matchDetails.slice(0, 5).forEach((match, index) => {
      console.log(`\n${index + 1}. Match #${match.NoInTournament}:`);
      console.log(`   Teams: ${match.TeamA} vs ${match.TeamB}`);
      console.log(`   Round: "${match.Round}" | Status: "${match.Status}"`);
      console.log(`   When: ${match.Date} ${match.Time} | Court: ${match.Court}`);
      console.log(`   XML: ${match.xml.substring(0, 120)}...`);
    });
    
    // Try to identify tournament structure
    console.log('\n🏗️ TOURNAMENT STRUCTURE ANALYSIS:');
    console.log('='.repeat(40));
    
    const rounds = Object.keys(roundAnalysis);
    if (rounds.length > 0) {
      console.log(`📊 Tournament appears to have ${rounds.length} different phases/rounds:`);
      rounds.forEach((round, index) => {
        const count = roundAnalysis[round];
        console.log(`   ${index + 1}. "${round}" (${count} matches)`);
      });
      
      // Try to interpret round types
      console.log('\n🧠 ROUND INTERPRETATION:');
      rounds.forEach(round => {
        let interpretation = 'Unknown phase';
        
        if (round.toLowerCase().includes('pool') || round.toLowerCase().includes('group')) {
          interpretation = '🔄 Group/Pool stage';
        } else if (round.toLowerCase().includes('qualification') || round.toLowerCase().includes('qualif')) {
          interpretation = '🎯 Qualification round';
        } else if (round.toLowerCase().includes('elimination') || round.toLowerCase().includes('elim')) {
          interpretation = '⚡ Elimination round';
        } else if (round.toLowerCase().includes('final')) {
          interpretation = '🏆 Final round';
        } else if (round.toLowerCase().includes('semi')) {
          interpretation = '🥉 Semi-final';
        } else if (round.toLowerCase().includes('quarter')) {
          interpretation = '🎖️ Quarter-final';
        } else if (/^\d+$/.test(round)) {
          interpretation = `📊 Round ${round} (numeric)`;
        }
        
        console.log(`      "${round}" → ${interpretation}`);
      });
    }
    
  } catch (error) {
    console.error('Error analyzing match rounds:', error);
  }
}

// Execute
analyzeMatchRounds();