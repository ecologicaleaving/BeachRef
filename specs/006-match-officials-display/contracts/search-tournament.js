/**
 * Search for a specific tournament by name
 * Usage: node search-tournament.js "tournament name"
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const searchQuery = process.argv.slice(2).join(' ') || 'Hamburg';

console.log(`\n🔍 Searching for tournaments matching: "${searchQuery}"\n`);

function searchTournaments(query) {
  return new Promise((resolve, reject) => {
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetEventList" Fields="No Name StartDate EndDate Status" HasBeachTournament="True">
    <Filter TextFilter="${query}" MaxResults="50" />
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
    const response = await searchTournaments(searchQuery);

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true
    });

    const result = parser.parse(response);
    const events = result?.Responses?.Events?.Event;

    if (!events) {
      console.log(`❌ No tournaments found matching "${searchQuery}"`);
      return;
    }

    const eventArray = Array.isArray(events) ? events : [events];

    // Filter for 2025 tournaments
    const filtered2025 = eventArray.filter(e =>
      e.StartDate && e.StartDate.includes('2025')
    );

    console.log(`✅ Found ${filtered2025.length} tournaments in 2025:\n`);

    filtered2025.forEach((event, index) => {
      console.log(`${index + 1}. Event No: ${event.No}`);
      console.log(`   Name: ${event.Name}`);
      console.log(`   Dates: ${event.StartDate} to ${event.EndDate}`);
      console.log(`   Status: ${event.Status}`);
      console.log('');
    });

    if (filtered2025.length > 0) {
      console.log('\n💡 Use this command to get matches:');
      console.log(`   node get-tournament-matches.js ${filtered2025[0].No}\n`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main();
