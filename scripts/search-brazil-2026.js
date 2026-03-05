/**
 * Search Brazil tournaments in 2026 (wider search for João Pessoa)
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

async function searchBrazil(year, month) {
  console.log(`\n🔍 Searching Brazil tournaments in ${month}/${year}...\n`);

  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;

  // Try with CountryCode filter
  const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetEventList" StartDate="${startDate}" EndDate="${endDate}" CountryCode="BRA" />
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

  console.log(`Found ${eventArray.length} Brazil tournaments in ${month}/${year}\n`);

  if (eventArray.length > 0) {
    console.log('Brazil Tournaments:\n');
    eventArray.forEach((event, index) => {
      const city = event.City || 'Unknown';
      const isJoaoPessoa = city.toLowerCase().includes('joao') ||
                          city.toLowerCase().includes('joão') ||
                          city.toLowerCase().includes('pessoa');

      const marker = isJoaoPessoa ? '🎯 ' : '   ';

      console.log(`${marker}${index + 1}. ${event.Name}`);
      console.log(`     Event No: ${event.No}`);
      console.log(`     City: ${city}`);
      console.log(`     Dates: ${event.StartDate} to ${event.EndDate}`);
      console.log(`     Gender: ${event.Gender || 'N/A'}\n`);
    });
  }

  return eventArray;
}

async function main() {
  console.log('🏐 Brazil Tournament Search 2026');
  console.log('='.repeat(80));

  // Search different months in 2026
  const months = [3, 2, 4, 1, 5]; // March first, then nearby months

  let allTournaments = [];

  for (const month of months) {
    const tournaments = await searchBrazil(2026, month);
    allTournaments = allTournaments.concat(tournaments);
  }

  // Also try 2025
  console.log('\n' + '='.repeat(80));
  console.log('Also checking 2025...');
  console.log('='.repeat(80));

  for (const month of [11, 12, 10]) {
    const tournaments = await searchBrazil(2025, month);
    allTournaments = allTournaments.concat(tournaments);
  }

  // Find João Pessoa
  const joaoPessoa = allTournaments.filter((event) => {
    const city = (event.City || '').toLowerCase();
    const name = (event.Name || '').toLowerCase();
    return (
      city.includes('joao') ||
      city.includes('joão') ||
      city.includes('pessoa') ||
      name.includes('joao') ||
      name.includes('joão')
    );
  });

  if (joaoPessoa.length > 0) {
    console.log('\n\n' + '='.repeat(80));
    console.log('🎯 JOÃO PESSOA TOURNAMENTS FOUND!');
    console.log('='.repeat(80) + '\n');

    joaoPessoa.forEach((t) => {
      console.log(`Event No: ${t.No}`);
      console.log(`Name: ${t.Name}`);
      console.log(`City: ${t.City}`);
      console.log(`Dates: ${t.StartDate} to ${t.EndDate}`);
      console.log(
        `\n  Test command:\n  node scripts/find-technical-officials.js ${t.No}\n`
      );
    });
  } else {
    console.log('\n\n❌ No João Pessoa tournaments found in 2025-2026');
  }
}

main().catch(console.error);
