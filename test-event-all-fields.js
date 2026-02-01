/**
 * Test ALL fields available on Event 1552 to find referee list
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

function decodeHtmlEntities(text) {
  if (!text) return text;
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

async function testEventAllFields() {
  console.log('='.repeat(80));
  console.log('🔍 GET ALL FIELDS FROM EVENT 1552');
  console.log('='.repeat(80));
  console.log();

  try {
    // Request WITHOUT Fields parameter = get ALL fields
    console.log('📋 Requesting Event 1552 with NO Fields (gets everything)');
    console.log('-'.repeat(80));
    const request = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetEvent" No="1552" />`;

    const response = await makeVisApiCall(request);
    const data = parser.parse(response);

    if (data.Event) {
      const event = data.Event;

      console.log('✅ Got Event data');
      console.log();
      console.log('='.repeat(80));
      console.log('📋 ALL AVAILABLE FIELDS:');
      console.log('='.repeat(80));
      console.log();

      const allFields = Object.keys(event).sort();
      console.log(`Total fields: ${allFields.length}`);
      console.log();

      allFields.forEach(field => {
        const value = event[field];
        const valueType = typeof value;
        const valueStr = valueType === 'string' && value.length > 100
          ? `(${value.length} chars) ${value.substring(0, 100)}...`
          : valueType === 'string'
          ? `"${value}"`
          : valueType === 'object'
          ? `{object with ${Object.keys(value).length} keys}`
          : JSON.stringify(value);

        console.log(`${field} [${valueType}]: ${valueStr}`);
      });

      console.log();
      console.log('='.repeat(80));
      console.log('🎯 REFEREE/OFFICIAL-RELATED FIELDS:');
      console.log('='.repeat(80));
      console.log();

      const refereeFields = allFields.filter(f =>
        f.toLowerCase().includes('referee') ||
        f.toLowerCase().includes('official') ||
        f.toLowerCase().includes('judge')
      );

      if (refereeFields.length === 0) {
        console.log('❌ No referee-related fields found');
      } else {
        console.log(`Found ${refereeFields.length} referee-related fields:`);
        refereeFields.forEach(field => {
          const value = event[field];
          if (typeof value === 'string' && value.length > 200) {
            console.log();
            console.log(`${field}:`);
            console.log('  Length:', value.length, 'chars');
            console.log('  First 300 chars:', value.substring(0, 300));
            console.log('  ...');

            // Try to decode and parse if it looks like XML
            if (value.includes('&lt;')) {
              try {
                const decoded = decodeHtmlEntities(value);
                const parsed = parser.parse(decoded);
                console.log();
                console.log('  Parsed structure:');
                console.log(JSON.stringify(parsed, null, 4));

                // Search for our IDs
                const searchIds = [155330, 151291, '155330', '151291'];
                const searchInObject = (obj, path = '') => {
                  for (const [key, val] of Object.entries(obj)) {
                    if (searchIds.includes(val)) {
                      console.log();
                      console.log(`  🎯 FOUND ID ${val} at: ${path}.${key}`);
                      console.log(`     Context:`, JSON.stringify(obj, null, 4));
                    } else if (val && typeof val === 'object') {
                      searchInObject(val, path ? `${path}.${key}` : key);
                    }
                  }
                };
                searchInObject(parsed);
              } catch (e) {
                console.log('  (Could not parse as XML)');
              }
            }
          } else {
            console.log(`${field}:`, value);
          }
        });
      }
    } else {
      console.log('❌ No Event in response');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  console.log();
  console.log('='.repeat(80));
  console.log('✅ Test Complete');
  console.log('='.repeat(80));
}

testEventAllFields();
