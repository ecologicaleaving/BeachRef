/**
 * Search João Pessoa tournaments in past years
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

function makeVisApiCall(xmlRequest) {
  return new Promise((resolve, reject) => {
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

async function searchByCity(city, year) {
  console.log(`\n🔍 Searching for "${city}" tournaments in ${year}...\n`);

  const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetEventList" StartDate="${year}-01-01" EndDate="${year}-12-31" />
</Requests>`;

  const response = await makeVisApiCall(xmlRequest);

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: true,
  });

  const result = parser.parse(response);
  const events = result?.Responses?.EventList?.Event || [];
  const eventArray = Array.isArray(events) ? events : events ? [events] : [];

  console.log(`Total tournaments in ${year}: ${eventArray.length}`);

  // Filter by city
  const filtered = eventArray.filter((event) => {
    const eventCity = (event.City || '').toLowerCase();
    const eventName = (event.Name || '').toLowerCase();
    const searchCity = city.toLowerCase();
    return eventCity.includes(searchCity) || eventName.includes(searchCity);
  });

  if (filtered.length > 0) {
    console.log(`\n✅ Found ${filtered.length} "${city}" tournament(s):\n`);
    filtered.forEach((event, index) => {
      console.log(`${index + 1}. ${event.Name}`);
      console.log(`   Event No: ${event.No}`);
      console.log(`   City: ${event.City}`);
      console.log(`   Dates: ${event.StartDate} to ${event.EndDate}`);
      console.log(`   Gender: ${event.Gender || 'N/A'}\n`);
    });
  } else {
    console.log(`\n❌ No "${city}" tournaments found in ${year}`);
  }

  return filtered;
}

async function main() {
  console.log('🏐 João Pessoa Tournament Search (Historical)');
  console.log('='.repeat(80) + '\n');

  const cities = ['joao pessoa', 'joão pessoa', 'joao'];
  const years = [2024, 2023, 2022, 2021, 2020, 2019];

  let found = false;

  for (const year of years) {
    for (const city of cities) {
      const tournaments = await searchByCity(city, year);
      if (tournaments && tournaments.length > 0) {
        found = true;
        console.log('\n' + '='.repeat(80));
        console.log('✅ FOUND! Use these commands to test officials:');
        console.log('='.repeat(80) + '\n');
        tournaments.forEach((t) => {
          console.log(`Event No: ${t.No} - ${t.Name}`);
          console.log(
            `  node specs/006-match-officials-display/contracts/test-get-event.js ${t.No}\n`
          );
        });
        return; // Exit after first successful find
      }
    }
  }

  if (!found) {
    console.log('\n❌ No João Pessoa tournaments found in years 2019-2024');
    console.log('\nUsing example Event 429 (Fort Lauderdale 2017) for demonstration');
  }
}

main().catch(console.error);
