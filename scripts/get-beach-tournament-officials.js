/**
 * Get BeachTournament details to find Technical Delegate and Referee Coach
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const tournamentNo = process.argv[2] || '8962'; // From Event 1719

function getBeachTournament(tournamentNo) {
  return new Promise((resolve, reject) => {
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetBeachTournament" No="${tournamentNo}" />
</Requests>`;

    const postData = `Request=${encodeURIComponent(xmlRequest)}`;

    const options = {
      hostname: 'www.fivb.org',
      port: 443,
      path: '/vis2009/XmlRequest.asmx',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log(`\n🔍 Getting BeachTournament ${tournamentNo} details...\n`);

  const response = await getBeachTournament(tournamentNo);

  console.log('Raw response (first 2000 chars):');
  console.log('='.repeat(80));
  console.log(response.substring(0, 2000));
  console.log('...\n');

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: true,
  });

  const result = parser.parse(response);
  const tournament = result?.Responses?.BeachTournament;

  if (!tournament) {
    console.log('❌ Tournament not found');
    return;
  }

  console.log('='.repeat(80));
  console.log('BEACH TOURNAMENT DETAILS');
  console.log('='.repeat(80) + '\n');

  console.log('Tournament:', tournament.Name || 'N/A');
  console.log('No:', tournament.No);
  console.log('Gender:', tournament.Gender === 0 ? 'Men' : 'Women');
  console.log('');

  console.log('='.repeat(80));
  console.log('ALL FIELDS (alphabetically)');
  console.log('='.repeat(80) + '\n');

  const keys = Object.keys(tournament).sort();
  keys.forEach((key) => {
    const value = tournament[key];
    const valueStr =
      typeof value === 'string'
        ? value.length > 100
          ? value.substring(0, 100) + '...'
          : value
        : JSON.stringify(value);
    console.log(`${key.padEnd(35)}: ${valueStr}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('🎯 OFFICIAL/DELEGATE/COACH FIELDS');
  console.log('='.repeat(80) + '\n');

  const officialKeys = keys.filter((key) => {
    const k = key.toLowerCase();
    return (
      k.includes('offic') ||
      k.includes('delegate') ||
      k.includes('coach') ||
      k.includes('director') ||
      k.includes('supervisor') ||
      k.includes('td') ||
      k.includes('rc') ||
      k.includes('referee')
    );
  });

  if (officialKeys.length > 0) {
    console.log('✅ Found these fields:\n');
    officialKeys.forEach((key) => {
      console.log(`${key.padEnd(35)}: ${tournament[key]}`);
    });
  } else {
    console.log('❌ No Technical Delegate or Referee Coach fields found');
    console.log('\nThis might mean these roles are assigned at a different level');
    console.log('or through a different API endpoint.\n');
  }
}

main().catch(console.error);
