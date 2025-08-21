/**
 * Script browser per testare VIS API
 * Incolla questo codice nella console del browser nella pagina del torneo
 */

async function testVisApiInBrowser() {
  console.log('🔍 Testing VIS API from browser...');
  
  // Prova a ottenere il numero del torneo dalla pagina corrente
  let tournamentNo = null;
  
  // Cerca nei parametri URL
  const urlParams = new URLSearchParams(window.location.search);
  const tournamentData = urlParams.get('tournamentData');
  
  if (tournamentData) {
    try {
      const parsed = JSON.parse(decodeURIComponent(tournamentData));
      tournamentNo = parsed.visNo;
      console.log(`📋 Found tournament number: ${tournamentNo}`);
    } catch (e) {
      console.log('⚠️  Could not parse tournament data from URL');
    }
  }
  
  // Se non trovato, chiedi all'utente
  if (!tournamentNo) {
    tournamentNo = prompt('Enter tournament number (visNo):');
    if (!tournamentNo) {
      console.log('❌ No tournament number provided');
      return;
    }
  }
  
  console.log(`🚀 Testing tournament: ${tournamentNo}`);
  
  try {
    // Test chiamata API
    const response = await fetch('https://www.volleyballworld.net/vis2009/XmlRequest.asmx/GetData', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `Function=GetBeachMatchList&TournamentNo=${tournamentNo}`
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const xmlData = await response.text();
    console.log(`✅ Response received (${xmlData.length} characters)`);
    
    // Analisi rapida
    const matchMatches = xmlData.match(/<BeachMatch[^>]*>.*?<\/BeachMatch>/gs) || 
                        xmlData.match(/<BeachMatch[^>]*\/>/gs);
    
    if (!matchMatches) {
      console.log('❌ No BeachMatch nodes found');
      console.log('📄 Raw response (first 500 chars):');
      console.log(xmlData.substring(0, 500) + '...');
      return;
    }
    
    console.log(`📋 Found ${matchMatches.length} matches`);
    
    // Analizza i primi 3 match
    console.log('\n📊 SAMPLE MATCHES:');
    const samplesToShow = Math.min(3, matchMatches.length);
    
    for (let i = 0; i < samplesToShow; i++) {
      const matchXml = matchMatches[i];
      console.log(`\n🏐 Match ${i + 1}:`);
      
      // Estrai attributi
      const attributes = {};
      const attrRegex = /(\w+)=["']([^"']*)["']/g;
      let match;
      
      while ((match = attrRegex.exec(matchXml)) !== null) {
        attributes[match[1]] = match[2];
      }
      
      // Mostra attributi principali
      const mainAttrs = ['No', 'MatchNo', 'Status', 'LocalDate', 'LocalTime', 'Court'];
      mainAttrs.forEach(attr => {
        if (attributes[attr]) {
          console.log(`  ${attr}: ${attributes[attr]}`);
        }
      });
      
      // Cerca campi risultato
      const resultAttrs = Object.keys(attributes).filter(attr => 
        attr.toLowerCase().includes('point') || 
        attr.toLowerCase().includes('score') || 
        attr.toLowerCase().includes('set') ||
        attr.toLowerCase().includes('result')
      );
      
      if (resultAttrs.length > 0) {
        console.log(`  🎯 RESULT FIELDS:`);
        resultAttrs.forEach(attr => {
          console.log(`    ${attr}: ${attributes[attr]}`);
        });
      } else {
        console.log(`  ⚠️  No result fields found`);
      }
    }
    
    // Statistiche sui campi risultato
    console.log('\n📈 RESULT FIELD ANALYSIS:');
    const allResultFields = new Set();
    let matchesWithResults = 0;
    
    matchMatches.forEach(matchXml => {
      const attrRegex = /(\w+)=["']([^"']*)["']/g;
      let match;
      let hasResults = false;
      
      while ((match = attrRegex.exec(matchXml)) !== null) {
        const attr = match[1];
        if (attr.toLowerCase().includes('point') || 
            attr.toLowerCase().includes('score') || 
            attr.toLowerCase().includes('set') ||
            attr.toLowerCase().includes('result')) {
          allResultFields.add(attr);
          hasResults = true;
        }
      }
      
      if (hasResults) matchesWithResults++;
    });
    
    console.log(`Matches with results: ${matchesWithResults}/${matchMatches.length}`);
    console.log(`Result fields found: ${Array.from(allResultFields).sort().join(', ')}`);
    
    // Salva il raw XML nel sessionStorage per analisi
    sessionStorage.setItem(`vis-response-${tournamentNo}`, xmlData);
    console.log(`💾 Raw XML saved to sessionStorage['vis-response-${tournamentNo}']`);
    
  } catch (error) {
    console.error('❌ API Test failed:', error);
  }
}

// Esegui il test automaticamente
console.log('🔧 VIS API Browser Test loaded');
console.log('📞 Run: testVisApiInBrowser()');

// Esporta la funzione globalmente
window.testVisApiInBrowser = testVisApiInBrowser;