/**
 * Test script per VIS API - Beach Matches
 * Questo script testa la chiamata GetBeachMatchList e mostra i dati XML grezzi
 */

const https = require('https');
const fs = require('fs');

// Configurazione VIS API
const VIS_API_CONFIG = {
  host: 'www.volleyballworld.net',
  path: '/vis2009/XmlRequest.asmx/GetData',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'BeachRef-App/1.0'
  }
};

/**
 * Test GetBeachMatchList per un torneo specifico
 * @param {string} tournamentNo - Numero del torneo VIS
 */
async function testGetBeachMatchList(tournamentNo) {
  console.log(`🔍 Testing GetBeachMatchList for tournament: ${tournamentNo}`);
  
  const requestData = `Function=GetBeachMatchList&TournamentNo=${tournamentNo}`;
  
  return new Promise((resolve, reject) => {
    const req = https.request(VIS_API_CONFIG, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`✅ Response received (${data.length} characters)`);
        
        // Salva la risposta raw in un file
        const filename = `vis-response-${tournamentNo}-${Date.now()}.xml`;
        fs.writeFileSync(filename, data, 'utf8');
        console.log(`💾 Raw response saved to: ${filename}`);
        
        // Analizza i match per trovare campi risultato
        analyzeMatchData(data, tournamentNo);
        
        resolve(data);
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      reject(error);
    });
    
    req.write(requestData);
    req.end();
  });
}

/**
 * Analizza i dati dei match per trovare campi risultato
 * @param {string} xmlData - Dati XML dalla VIS API
 * @param {string} tournamentNo - Numero torneo
 */
function analyzeMatchData(xmlData, tournamentNo) {
  console.log('\n📊 ANALYSIS RESULTS:');
  console.log('='.repeat(50));
  
  // Trova tutti i match
  const matchMatches = xmlData.match(/<BeachMatch[^>]*>.*?<\/BeachMatch>/gs) || 
                      xmlData.match(/<BeachMatch[^>]*\/>/gs);
  
  if (!matchMatches) {
    console.log('❌ No BeachMatch nodes found');
    return;
  }
  
  console.log(`📋 Found ${matchMatches.length} matches`);
  
  // Analizza i primi 5 match per vedere la struttura
  const samplesToAnalyze = Math.min(5, matchMatches.length);
  
  for (let i = 0; i < samplesToAnalyze; i++) {
    const matchXml = matchMatches[i];
    console.log(`\n🏐 MATCH ${i + 1}:`);
    console.log('-'.repeat(30));
    
    // Estrai attributi principali
    const attributes = extractAllAttributes(matchXml);
    
    // Mostra tutti gli attributi
    Object.keys(attributes).sort().forEach(attr => {
      console.log(`  ${attr}: ${attributes[attr]}`);
    });
    
    // Cerca specificamente campi di risultato
    const resultFields = [
      'MatchPointsA', 'MatchPointsB', 
      'SetA', 'SetB', 'SetsA', 'SetsB',
      'ScoreA', 'ScoreB', 'PointsA', 'PointsB',
      'Result', 'Score', 'Sets', 'Points'
    ];
    
    const foundResultFields = resultFields.filter(field => attributes[field]);
    if (foundResultFields.length > 0) {
      console.log(`  🎯 RESULT FIELDS FOUND: ${foundResultFields.join(', ')}`);
    } else {
      console.log(`  ⚠️  No standard result fields found`);
    }
  }
  
  // Statistiche generali sui campi risultato
  console.log('\n📈 RESULT FIELD STATISTICS:');
  console.log('-'.repeat(30));
  
  const allResultFields = new Set();
  let matchesWithResults = 0;
  
  matchMatches.forEach(matchXml => {
    const attributes = extractAllAttributes(matchXml);
    let hasResults = false;
    
    Object.keys(attributes).forEach(attr => {
      if (attr.toLowerCase().includes('point') || 
          attr.toLowerCase().includes('score') || 
          attr.toLowerCase().includes('set') ||
          attr.toLowerCase().includes('result')) {
        allResultFields.add(attr);
        hasResults = true;
      }
    });
    
    if (hasResults) matchesWithResults++;
  });
  
  console.log(`Matches with result fields: ${matchesWithResults}/${matchMatches.length}`);
  console.log(`Unique result-related fields: ${Array.from(allResultFields).sort().join(', ')}`);
}

/**
 * Estrae tutti gli attributi da un elemento XML
 * @param {string} xmlElement - Elemento XML
 * @returns {Object} Oggetto con tutti gli attributi
 */
function extractAllAttributes(xmlElement) {
  const attributes = {};
  
  // Regex per estrarre tutti gli attributi
  const attrRegex = /(\w+)=["']([^"']*)["']/g;
  let match;
  
  while ((match = attrRegex.exec(xmlElement)) !== null) {
    attributes[match[1]] = match[2];
  }
  
  return attributes;
}

/**
 * Test con tornei di esempio
 */
async function runTests() {
  console.log('🚀 VIS API Test Script');
  console.log('=' .repeat(50));
  
  // Esempi di tornei (sostituisci con tornei reali)
  const testTournaments = [
    '12345', // Sostituisci con un numero di torneo reale
    '67890'  // Aggiungi altri tornei se necessario
  ];
  
  // Se hai un torneo specifico da testare, usalo
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const tournamentNo = args[0];
    console.log(`Using tournament from argument: ${tournamentNo}`);
    await testGetBeachMatchList(tournamentNo);
  } else {
    console.log('❗ Usage: node test-vis-api.js <tournament_number>');
    console.log('Example: node test-vis-api.js 12345');
    console.log('\nTip: Check your tournament detail screen to find the tournament number');
  }
}

// Esegui i test
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testGetBeachMatchList,
  analyzeMatchData
};