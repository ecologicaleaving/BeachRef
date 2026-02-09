/**
 * Decode Event Content field to see if it contains Technical Officials
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const eventNo = process.argv[2] || '1719';

function getEvent(eventNo) {
  return new Promise((resolve, reject) => {
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetEvent" No="${eventNo}" Fields="No Name Content" />
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
  console.log(`\n🔍 Decoding Event Content for Event ${eventNo}...\n`);

  const response = await getEvent(eventNo);

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: true,
  });

  const result = parser.parse(response);
  const event = result?.Responses?.Event;

  if (!event || !event.Content) {
    console.log('❌ No Content field found');
    return;
  }

  console.log('Event:', event.Name);
  console.log('Content field length:', event.Content.length, 'characters\n');

  // Decode HTML entities
  const decoded = decodeHtmlEntities(event.Content);

  console.log('='.repeat(80));
  console.log('DECODED CONTENT XML');
  console.log('='.repeat(80));
  console.log(decoded);
  console.log('='.repeat(80) + '\n');

  // Parse the content XML
  try {
    const contentResult = parser.parse(decoded);

    console.log('Parsed Content Structure:');
    console.log(JSON.stringify(contentResult, null, 2));

    // Look for official-related fields
    const searchForOfficials = (obj, path = '') => {
      const officials = [];

      if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach((key) => {
          const fullPath = path ? `${path}.${key}` : key;
          const k = key.toLowerCase();

          if (
            k.includes('official') ||
            k.includes('delegate') ||
            k.includes('coach') ||
            k.includes('director') ||
            k.includes('referee')
          ) {
            officials.push({
              path: fullPath,
              value: obj[key],
            });
          }

          // Recurse
          if (typeof obj[key] === 'object') {
            const nested = searchForOfficials(obj[key], fullPath);
            officials.push(...nested);
          }
        });
      }

      return officials;
    };

    const officialFields = searchForOfficials(contentResult);

    if (officialFields.length > 0) {
      console.log('\n\n' + '='.repeat(80));
      console.log('🎯 FOUND OFFICIAL-RELATED FIELDS IN CONTENT:');
      console.log('='.repeat(80) + '\n');

      officialFields.forEach((field) => {
        console.log(`Path: ${field.path}`);
        console.log(
          `Value: ${JSON.stringify(field.value, null, 2).substring(0, 500)}\n`
        );
      });
    } else {
      console.log('\n❌ No official-related fields found in Content');
    }
  } catch (error) {
    console.log('\n❌ Failed to parse Content XML:', error.message);
  }
}

main().catch(console.error);
