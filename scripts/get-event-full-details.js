/**
 * Get full event details to find Technical Delegate and Referee Coach fields
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const eventNo = process.argv[2] || '1719';

function getEvent(eventNo) {
  return new Promise((resolve, reject) => {
    // Request ALL fields (no Fields parameter = all available)
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

async function main() {
  console.log(`\n🔍 Getting FULL event details for Event ${eventNo}...\n`);

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

  console.log('Event:', event.Name);
  console.log('City:', event.City || 'N/A');
  console.log('Dates:', event.StartDate, 'to', event.EndDate);
  console.log('');

  console.log('='.repeat(80));
  console.log('ALL EVENT FIELDS (alphabetically)');
  console.log('='.repeat(80) + '\n');

  const keys = Object.keys(event).sort();
  keys.forEach((key) => {
    const value = event[key];
    const valueStr =
      typeof value === 'string'
        ? value.length > 100
          ? value.substring(0, 100) + '...'
          : value
        : JSON.stringify(value);
    console.log(`${key.padEnd(35)}: ${valueStr}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('🎯 OFFICIAL/DELEGATE/COACH RELATED FIELDS');
  console.log('='.repeat(80) + '\n');

  const officialKeys = keys.filter((key) => {
    const k = key.toLowerCase();
    return (
      k.includes('offic') ||
      k.includes('delegate') ||
      k.includes('coach') ||
      k.includes('director') ||
      k.includes('supervisor') ||
      k.includes('referee') ||
      k.includes('td') ||
      k.includes('rc')
    );
  });

  if (officialKeys.length > 0) {
    console.log('Found these fields:\n');
    officialKeys.forEach((key) => {
      console.log(`✅ ${key}:`);
      const value = event[key];
      if (typeof value === 'string' && value.length < 500) {
        console.log(`   ${value}\n`);
      } else if (typeof value === 'string') {
        console.log(`   ${value.substring(0, 200)}...\n`);
      } else {
        console.log(`   ${JSON.stringify(value, null, 2)}\n`);
      }
    });
  } else {
    console.log('❌ No official/delegate/coach fields found in event data\n');
    console.log(
      'This suggests Technical Delegate and Referee Coach are stored elsewhere,'
    );
    console.log('possibly in a separate EventRefereeAssignment or similar structure.\n');
  }
}

main().catch(console.error);
