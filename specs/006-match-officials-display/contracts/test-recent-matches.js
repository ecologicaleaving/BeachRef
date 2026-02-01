/**
 * Test Personnel field with recent matches
 * Look for populated Personnel data that might contain scorer/line judge info
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

console.log('\n🔍 Testing Personnel field with recent matches...\n');

function getBeachMatch(matchNo) {
  return new Promise((resolve, reject) => {
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetBeachMatch" No="${matchNo}" />
</Requests>`;

    const postData = `Request=${encodeURIComponent(xmlRequest)}`;

    const options = {
      hostname: 'www.fivb.org',
      port: 443,
      path: '/vis2009/XmlRequest.asmx',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testMatch(matchNo) {
  try {
    const response = await getBeachMatch(matchNo);

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true
    });

    const result = parser.parse(response);
    const matchData = result?.Responses?.BeachMatch || {};

    if (!matchData.No) {
      return { matchNo, found: false, error: 'Match not found' };
    }

    // Check for official-related fields
    const officialFields = {};
    const keywords = ['Referee', 'Scorer', 'LineJudge', 'Official', 'Challenge', 'Personnel'];

    Object.keys(matchData).forEach(key => {
      if (keywords.some(keyword => key.includes(keyword))) {
        const value = matchData[key];
        if (value && value !== '' && value !== 0) {
          officialFields[key] = value;
        }
      }
    });

    return {
      matchNo,
      found: true,
      date: matchData.LocalDate,
      tournament: matchData.TournamentName,
      teams: `${matchData.TeamAName || 'N/A'} vs ${matchData.TeamBName || 'N/A'}`,
      personnel: matchData.Personnel,
      personnelLength: matchData.Personnel ? matchData.Personnel.length : 0,
      populatedOfficialFields: officialFields,
      totalFields: Object.keys(matchData).length
    };

  } catch (error) {
    return { matchNo, found: false, error: error.message };
  }
}

async function main() {
  // Test range of recent matches (high numbers = more recent)
  // Start from a recent range and test 20 matches
  const startMatch = 200000;
  const testMatches = [];

  // Test matches at intervals
  for (let i = 0; i < 20; i++) {
    testMatches.push(startMatch + (i * 500));
  }

  console.log(`Testing ${testMatches.length} recent matches for Personnel data...\n`);

  const results = [];
  for (const matchNo of testMatches) {
    process.stdout.write(`Testing match ${matchNo}...`);
    const result = await testMatch(matchNo);
    results.push(result);

    if (result.found) {
      console.log(' ✓');
      if (result.personnelLength > 0) {
        console.log(`  🎯 PERSONNEL DATA FOUND! (${result.personnelLength} chars)`);
      }
    } else {
      console.log(' ✗');
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');

  const foundMatches = results.filter(r => r.found);
  const withPersonnel = foundMatches.filter(r => r.personnelLength > 0);
  const withOfficials = foundMatches.filter(r => Object.keys(r.populatedOfficialFields || {}).length > 0);

  console.log(`Total Matches Tested: ${testMatches.length}`);
  console.log(`Matches Found: ${foundMatches.length}`);
  console.log(`Matches with Personnel Data: ${withPersonnel.length}`);
  console.log(`Matches with Any Official Data: ${withOfficials.length}\n`);

  if (withPersonnel.length > 0) {
    console.log('✅ MATCHES WITH PERSONNEL DATA:\n');
    withPersonnel.forEach(m => {
      console.log(`  Match ${m.matchNo}:`);
      console.log(`    Date: ${m.date}`);
      console.log(`    Teams: ${m.teams}`);
      console.log(`    Personnel: ${m.personnel.substring(0, 100)}...`);
      console.log('');
    });
  }

  if (withOfficials.length > 0) {
    console.log('\n📋 MATCHES WITH POPULATED OFFICIAL FIELDS:\n');
    withOfficials.slice(0, 5).forEach(m => {
      console.log(`  Match ${m.matchNo} (${m.date}):`);
      Object.entries(m.populatedOfficialFields).forEach(([key, value]) => {
        console.log(`    ${key}: ${value}`);
      });
      console.log('');
    });
  } else {
    console.log('\n❌ NO MATCHES FOUND WITH POPULATED OFFICIAL FIELDS\n');
    console.log('Next steps:');
    console.log('  1. Try different match number ranges');
    console.log('  2. Query GetBeachMatchList for recent tournaments');
    console.log('  3. Check if scorer/line judge data exists in VIS API\n');
  }
}

main();
