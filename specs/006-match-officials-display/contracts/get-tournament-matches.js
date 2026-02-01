/**
 * Get matches from a specific tournament
 * Usage: node get-tournament-matches.js [eventNo]
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const eventNo = process.argv[2] || '222'; // Beach Volleyball World Championships 2015

console.log(`\n🔍 Fetching matches for Event No: ${eventNo}\n`);

function getBeachMatchList(eventNo) {
  return new Promise((resolve, reject) => {
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetBeachMatchList" EventNo="${eventNo}" Fields="No NoInTournament LocalDate LocalTime Status Court TeamAName TeamBName">
    <Filter MaxResults="10" />
  </Request>
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

async function main() {
  try {
    const response = await getBeachMatchList(eventNo);

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true
    });

    const result = parser.parse(response);
    const matches = result?.Responses?.BeachMatches?.BeachMatch;

    if (!matches) {
      console.log('❌ No matches found for this tournament');
      console.log('\nRaw response (first 500 chars):');
      console.log(response.substring(0, 500));
      console.log('\nParsed structure:');
      console.log(JSON.stringify(result, null, 2).substring(0, 1000));
      return;
    }

    const matchArray = Array.isArray(matches) ? matches : [matches];

    console.log(`✅ Found ${matchArray.length} matches:\n`);

    matchArray.forEach((match, index) => {
      console.log(`${index + 1}. Match No: ${match.No}`);
      console.log(`   Tournament Match: ${match.NoInTournament || 'N/A'}`);
      console.log(`   Date: ${match.LocalDate} ${match.LocalTime || ''}`);
      console.log(`   Status: ${match.Status}`);
      console.log(`   Court: ${match.Court || 'N/A'}`);
      console.log(`   Teams: ${match.TeamAName || 'N/A'} vs ${match.TeamBName || 'N/A'}`);
      console.log('');
    });

    console.log('\n💡 Use one of these match numbers with test-match-officials.js');
    console.log(`   Example: node test-match-officials.js ${matchArray[0].No}\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main();
