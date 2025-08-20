// Get all possible fields from matches to find phase/round information
const VIS_BASE_URL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';

async function analyzeAllMatchFields() {
  try {
    console.log('🔍 ANALYZING ALL MATCH FIELDS FOR PHASE INFORMATION');
    console.log('='.repeat(60));
    
    const badenTournamentNo = '8371'; // WBAD2025
    
    // Try with extensive fields list including potential phase/round fields
    const fields = 'No NoInTournament TeamAName TeamBName Round Phase RoundPhase Status LocalDate LocalTime Court Venue Location Address City Country MatchPointsA MatchPointsB PointsTeamASet1 PointsTeamBSet1 PointsTeamASet2 PointsTeamBSet2 PointsTeamASet3 PointsTeamBSet3 DurationSet1 DurationSet2 DurationSet3 NoReferee1 NoReferee2 Referee1Name Referee2Name';
    
    console.log(`🎯 Testing with extensive fields list:`);
    console.log(fields);
    
    const request = `<Request Type='GetBeachMatchList' Fields='${fields}'><Filter NoTournament='${badenTournamentNo}' /></Request>`;
    const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(request)}`;
    
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
    
    // Analyze what fields actually have data
    const fieldAnalysis = {};
    const sampleMatch = matchMatches[0];
    
    console.log('\n🔧 ANALYZING FIRST MATCH FOR ALL FIELDS:');
    console.log('='.repeat(50));
    console.log(`Sample match XML: ${sampleMatch}`);
    
    // Extract all attributes from the first match
    const attributeMatches = sampleMatch.match(/(\w+)="([^"]*)"/g);
    if (attributeMatches) {
      console.log(`\n📊 FOUND ${attributeMatches.length} ATTRIBUTES IN MATCH:`);
      
      attributeMatches.forEach(attr => {
        const [full, field, value] = attr.match(/(\w+)="([^"]*)"/);
        const hasValue = value && value.trim() !== '';
        const status = hasValue ? '✅' : '❌';
        
        console.log(`${status} ${field}: "${value}"`);
        
        fieldAnalysis[field] = {
          hasValue,
          value,
          count: 0
        };
      });
    }
    
    // Check all matches for field consistency
    console.log('\n📈 ANALYZING FIELD CONSISTENCY ACROSS ALL MATCHES:');
    console.log('='.repeat(50));
    
    const allFields = Object.keys(fieldAnalysis);
    
    matchMatches.forEach(matchXml => {
      allFields.forEach(field => {
        const regex = new RegExp(`${field}="([^"]*)"`, 'i');
        const match = matchXml.match(regex);
        if (match && match[1] && match[1].trim()) {
          fieldAnalysis[field].count++;
        }
      });
    });
    
    // Display field analysis
    allFields.forEach(field => {
      const analysis = fieldAnalysis[field];
      const percentage = ((analysis.count / matchMatches.length) * 100).toFixed(1);
      const status = analysis.count > 0 ? '✅' : '❌';
      
      console.log(`${status} ${field}: ${analysis.count}/${matchMatches.length} matches (${percentage}%) - Sample: "${analysis.value}"`);
    });
    
    // Look for potential phase/round patterns in match numbers or other fields
    console.log('\n🧠 ANALYZING MATCH PATTERNS FOR PHASES:');
    console.log('='.repeat(50));
    
    const matchNumbers = [];
    const teams = new Set();
    const dates = new Set();
    const times = new Set();
    
    matchMatches.forEach(matchXml => {
      const extractAttr = (attr) => {
        const match = matchXml.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
        return match ? match[1] : '';
      };
      
      const noInTournament = extractAttr('NoInTournament');
      const teamA = extractAttr('TeamAName');
      const teamB = extractAttr('TeamBName');
      const date = extractAttr('LocalDate');
      const time = extractAttr('LocalTime');
      
      if (noInTournament) matchNumbers.push(parseInt(noInTournament));
      if (teamA) teams.add(teamA);
      if (teamB) teams.add(teamB);
      if (date) dates.add(date);
      if (time) times.add(time);
    });
    
    console.log(`📊 Tournament Structure Analysis:`);
    console.log(`   Total matches: ${matchMatches.length}`);
    console.log(`   Unique teams: ${teams.size}`);
    console.log(`   Match numbers range: ${Math.min(...matchNumbers)} to ${Math.max(...matchNumbers)}`);
    console.log(`   Tournament dates: ${Array.from(dates).sort().join(', ')}`);
    console.log(`   Match times: ${Array.from(times).sort().join(', ')}`);
    
    // Try to infer tournament phases by match sequence
    console.log('\n🎯 INFERRING TOURNAMENT PHASES BY MATCH SEQUENCE:');
    console.log('='.repeat(50));
    
    // Group matches by date
    const matchesByDate = {};
    matchMatches.forEach(matchXml => {
      const extractAttr = (attr) => {
        const match = matchXml.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
        return match ? match[1] : '';
      };
      
      const date = extractAttr('LocalDate');
      const noInTournament = extractAttr('NoInTournament');
      const teamA = extractAttr('TeamAName');
      const teamB = extractAttr('TeamBName');
      const time = extractAttr('LocalTime');
      
      if (!matchesByDate[date]) matchesByDate[date] = [];
      matchesByDate[date].push({
        no: parseInt(noInTournament),
        teamA,
        teamB,
        time
      });
    });
    
    Object.entries(matchesByDate).forEach(([date, dayMatches]) => {
      dayMatches.sort((a, b) => a.no - b.no);
      console.log(`\n📅 ${date} (${dayMatches.length} matches):`);
      dayMatches.slice(0, 5).forEach(match => {
        console.log(`   Match #${match.no}: ${match.teamA} vs ${match.teamB} (${match.time})`);
      });
      if (dayMatches.length > 5) {
        console.log(`   ... and ${dayMatches.length - 5} more matches`);
      }
    });
    
    // Check status meanings
    console.log('\n📋 STATUS ANALYSIS:');
    console.log('='.repeat(30));
    console.log('Status "15" likely means: Scheduled/Upcoming matches');
    console.log('(Common VIS status codes: 1=Live, 2=Finished, 15=Scheduled, etc.)');
    
  } catch (error) {
    console.error('Error analyzing match fields:', error);
  }
}

// Execute
analyzeAllMatchFields();