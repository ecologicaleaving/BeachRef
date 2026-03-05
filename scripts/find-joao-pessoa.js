/**
 * Find João Pessoa tournaments
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

async function searchTournaments(year, month) {
  console.log(`\n🔍 Searching for tournaments in ${month}/${year}...\n`);

  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;

  const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetEventList" StartDate="${startDate}" EndDate="${endDate}" />
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

  console.log(`Found ${eventArray.length} tournaments in ${month}/${year}\n`);

  // Filter for João Pessoa
  const joaoPessoa = eventArray.filter((event) => {
    const city = (event.City || '').toLowerCase();
    const name = (event.Name || '').toLowerCase();
    return city.includes('joao') || city.includes('joão') || name.includes('joao') || name.includes('joão');
  });

  if (joaoPessoa.length > 0) {
    console.log('✅ João Pessoa tournaments found:\n');
    joaoPessoa.forEach((event, index) => {
      console.log(`${index + 1}. ${event.Name}`);
      console.log(`   Event No: ${event.No}`);
      console.log(`   City: ${event.City}`);
      console.log(`   Country: ${event.CountryName || event.Country || 'N/A'}`);
      console.log(`   Dates: ${event.StartDate} to ${event.EndDate}`);
      console.log(`   Gender: ${event.Gender || 'N/A'}`);
      console.log(`   Status: ${event.Status || 'N/A'}\n`);
    });
  } else {
    console.log('❌ No João Pessoa tournaments found\n');
    console.log('📋 Sample of tournaments found:');
    eventArray.slice(0, 10).forEach((event) => {
      console.log(`   - ${event.Name} (${event.City || 'Unknown city'})`);
    });
  }

  return joaoPessoa;
}

async function main() {
  console.log('🏐 BeachRef Tournament Search');
  console.log('='.repeat(80));

  // Search different years
  const searches = [
    { year: 2026, month: 3 },
    { year: 2025, month: 3 },
    { year: 2024, month: 3 },
    { year: 2024, month: 11 }, // Try November too
  ];

  for (const { year, month } of searches) {
    const tournaments = await searchTournaments(year, month);
    if (tournaments && tournaments.length > 0) {
      console.log(`\n${'='.repeat(80)}`);
      console.log('FOUND TOURNAMENTS - Use these Event Numbers for testing:');
      console.log('='.repeat(80));
      tournaments.forEach((t) => {
        console.log(`Event No: ${t.No} - ${t.Name}`);
        console.log(
          `  node specs/006-match-officials-display/contracts/test-event-officials.js ${t.No}\n`
        );
      });
      break; // Stop after first successful search
    }
  }

  console.log('\n✅ Search complete!');
}

main().catch(console.error);
