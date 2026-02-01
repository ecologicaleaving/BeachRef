/**
 * Find Hamburg 2025 tournaments in VIS API
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '_text',
  parseAttributeValue: true
});

function makeVisApiCall(xmlRequest) {
  return new Promise((resolve, reject) => {
    const formData = `Request=${encodeURIComponent(xmlRequest)}`;

    const options = {
      hostname: 'www.fivb.org',
      port: 443,
      path: '/Vis2009/XmlRequest.asmx',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(formData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.write(formData);
    req.end();
  });
}

async function findHamburg2025() {
  console.log('='.repeat(80));
  console.log('🔍 SEARCHING FOR HAMBURG TOURNAMENTS (2024-2025)');
  console.log('='.repeat(80));
  console.log();

  try {
    // Search for all tournaments (no date filter to see what's available)
    const request = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetEventList" Fields="No Name City Country StartDate EndDate Gender Level" />`;

    const response = await makeVisApiCall(request);

    console.log('Raw API Response (first 500 chars):');
    console.log(response.substring(0, 500));
    console.log();

    const data = parser.parse(response);

    console.log('Parsed Data Structure:');
    console.log(JSON.stringify(data, null, 2).substring(0, 500));
    console.log();

    const events = data.Events?.Event || [];
    const eventsArray = Array.isArray(events) ? events : [events];

    console.log(`Found ${eventsArray.length} total tournaments`);
    console.log();

    // Filter for Hamburg (check both City and Name fields)
    const hamburgEvents = eventsArray.filter(e =>
      (e.City && e.City.toLowerCase().includes('hamburg')) ||
      (e.Name && e.Name.toLowerCase().includes('hamburg'))
    );

    console.log(`Found ${hamburgEvents.length} Hamburg tournaments:`);
    console.log('-'.repeat(80));

    hamburgEvents.forEach(event => {
      console.log(`Tournament No: ${event.No}`);
      console.log(`  Name: ${event.Name}`);
      console.log(`  City: ${event.City}`);
      console.log(`  Country: ${event.Country}`);
      console.log(`  Start: ${event.StartDate}`);
      console.log(`  End: ${event.EndDate}`);
      console.log(`  Gender: ${event.Gender === 0 ? 'Men' : event.Gender === 1 ? 'Women' : 'Mixed'}`);
      console.log(`  Level: ${event.Level}`);
      console.log();
    });

    if (hamburgEvents.length === 0) {
      console.log('⚠️  No Hamburg tournaments found');
      console.log();
      console.log('Sample of available tournaments (last 50):');
      console.log('-'.repeat(80));
      eventsArray.slice(-50).forEach(event => {
        console.log(`${event.No}: ${event.Name} - ${event.City || 'N/A'} (${event.StartDate || 'N/A'})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  console.log();
  console.log('='.repeat(80));
  console.log('✅ Search Complete');
  console.log('='.repeat(80));
}

findHamburg2025();
