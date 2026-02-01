/**
 * Simple VIS API debugging script
 * Shows what data is actually available from the API
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

// Try to get a list of current events/tournaments
function getEventList() {
  return new Promise((resolve, reject) => {
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetEventList" Fields="No Name StartDate EndDate Status" HasBeachTournament="True">
    <Filter MaxResults="5" />
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
  console.log('\n🔍 VIS API Debug Script\n');
  console.log('Fetching recent tournaments...\n');

  try {
    const response = await getEventList();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      parseAttributeValue: true
    });

    const result = parser.parse(response);

    // Navigate through the direct XML structure (not SOAP)
    const events = result?.Responses?.Events?.Event;

    if (!events) {
      console.log('❌ No events found or unexpected response structure');
      console.log('\nRaw response (first 500 chars):');
      console.log(response.substring(0, 500));
      console.log('\nParsed result structure:');
      console.log(JSON.stringify(result, null, 2).substring(0, 1000));
      return;
    }

    const eventArray = Array.isArray(events) ? events : [events];

    console.log(`✅ Found ${eventArray.length} recent beach volleyball tournaments:\n`);

    eventArray.forEach((event, index) => {
      console.log(`${index + 1}. Event No: ${event.No}`);
      console.log(`   Name: ${event.Name}`);
      console.log(`   Status: ${event.Status}`);
      console.log(`   Dates: ${event.StartDate} to ${event.EndDate}`);
      console.log('');
    });

    console.log('\n💡 Next steps:');
    console.log('   1. Pick a tournament number from above');
    console.log('   2. Get matches for that tournament');
    console.log('   3. Test with actual match numbers\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main();
