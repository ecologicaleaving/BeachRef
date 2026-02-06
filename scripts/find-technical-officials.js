/**
 * Find Technical Officials (Technical Delegate, Referee Coach, etc.)
 * Not line judges/scorers - looking for high-level officials
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const eventNo = process.argv[2] || '429';

function getEvent(eventNo) {
  return new Promise((resolve, reject) => {
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetEvent" No="${eventNo}" />
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

function decodeHtmlEntities(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#xD;&#xA;/g, '\n')
    .replace(/&amp;/g, '&');
}

async function main() {
  console.log(`\n🔍 Searching for Technical Officials in Event ${eventNo}...\n`);

  const response = await getEvent(eventNo);

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: true,
  });

  const result = parser.parse(response);
  const event = result?.Responses?.Event;

  if (!event) {
    console.log('❌ Event not found');
    return;
  }

  console.log('Event Info:');
  console.log(`  Name: ${event.Name || 'N/A'}`);
  console.log(`  City: ${event.City || 'N/A'}`);
  console.log(`  Country: ${event.CountryName || 'N/A'}`);
  console.log(`  Dates: ${event.StartDate} to ${event.EndDate}\n`);

  // Parse AuxiliaryPersons
  if (event.AuxiliaryPersons) {
    const decoded = decodeHtmlEntities(event.AuxiliaryPersons);
    const auxResult = parser.parse(decoded);
    const persons = auxResult?.AuxiliaryPersons?.AuxiliaryPerson || [];
    const personArray = Array.isArray(persons) ? persons : [persons];

    console.log('='.repeat(80));
    console.log('AUXILIARY PERSONS BY FUNCTION CODE');
    console.log('='.repeat(80) + '\n');

    // Group by Functions code
    const byFunction = {};
    personArray.forEach((person) => {
      const func = person.Functions || 'Unknown';
      if (!byFunction[func]) byFunction[func] = [];
      byFunction[func].push(person);
    });

    // Show each function group
    Object.keys(byFunction)
      .sort()
      .forEach((func) => {
        console.log(`\n📋 Function Code: ${func} (${byFunction[func].length} persons)`);
        console.log('-'.repeat(80));
        byFunction[func].slice(0, 5).forEach((person) => {
          console.log(
            `  ${person.FirstName} ${person.LastName} (${person.NationalityCode})`
          );
        });
        if (byFunction[func].length > 5) {
          console.log(`  ... and ${byFunction[func].length - 5} more`);
        }
    });
  }

  // Check for other official-related fields
  console.log('\n\n='.repeat(80));
  console.log('OTHER OFFICIAL FIELDS IN EVENT');
  console.log('='.repeat(80) + '\n');

  const officialFields = [
    'TechnicalDelegate',
    'RefereeDelegate',
    'RefereeCoach',
    'TournamentDirector',
    'Supervisor',
    'Officials',
    'EventOfficials',
  ];

  officialFields.forEach((field) => {
    if (event[field]) {
      console.log(`✅ ${field}:`);
      console.log(`   ${JSON.stringify(event[field]).substring(0, 200)}\n`);
    }
  });

  // Show all top-level keys
  console.log('\n='.repeat(80));
  console.log('ALL EVENT FIELDS (for reference)');
  console.log('='.repeat(80) + '\n');

  const keys = Object.keys(event).sort();
  console.log('Total fields:', keys.length);
  console.log('\nFields containing "offic", "delegate", "coach", "director":\n');

  keys.forEach((key) => {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('offic') ||
      lowerKey.includes('delegate') ||
      lowerKey.includes('coach') ||
      lowerKey.includes('director') ||
      lowerKey.includes('supervisor')
    ) {
      console.log(`  - ${key}`);
    }
  });
}

main().catch(console.error);
