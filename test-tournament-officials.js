/**
 * Test GetBeachTournament for Officials/Referees fields
 * Try tournaments 8239 (men) and 8238 (women) individually
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

async function testTournamentOfficials() {
  console.log('='.repeat(80));
  console.log('🔍 GET TOURNAMENT-LEVEL OFFICIALS/REFEREES');
  console.log('='.repeat(80));
  console.log();

  const searchIds = [155330, 151291, 151534, 150488];

  try {
    for (const [name, tournamentNo] of [['Men', '8239'], ['Women', '8238']]) {
      console.log(`📋 ${name}'s Tournament ${tournamentNo}`);
      console.log('-'.repeat(80));

      // Get ALL fields from BeachTournament
      const request = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachTournament" No="${tournamentNo}" />`;

      console.log('Request:', request);
      console.log();

      const response = await makeVisApiCall(request);
      const data = parser.parse(response);

      if (data.BeachTournament) {
        const tournament = data.BeachTournament;

        console.log('✅ Got BeachTournament data');
        console.log();

        // List all fields
        const allFields = Object.keys(tournament).sort();
        console.log(`Total fields: ${allFields.length}`);
        console.log();

        console.log('All fields:');
        allFields.forEach(field => {
          const value = tournament[field];
          const valueType = typeof value;
          const valueStr = valueType === 'string' && value.length > 100
            ? `(${value.length} chars)`
            : valueType === 'string'
            ? `"${value}"`
            : valueType === 'object'
            ? `{object}`
            : JSON.stringify(value);

          console.log(`  ${field} [${valueType}]: ${valueStr}`);
        });
        console.log();

        // Check for referee/official-related fields
        const refereeFields = allFields.filter(f =>
          f.toLowerCase().includes('referee') ||
          f.toLowerCase().includes('official') ||
          f.toLowerCase().includes('judge')
        );

        if (refereeFields.length > 0) {
          console.log('🎯 Found referee-related fields:');
          refereeFields.forEach(field => {
            const value = tournament[field];
            console.log();
            console.log(`Field: ${field}`);
            console.log(`Type: ${typeof value}`);

            if (typeof value === 'string') {
              console.log(`Length: ${value.length} chars`);

              if (value.includes('&lt;')) {
                console.log('Content appears to be HTML-encoded XML');
                try {
                  const decoded = decodeHtmlEntities(value);
                  console.log('First 500 chars of decoded:');
                  console.log(decoded.substring(0, 500));
                  console.log('...');
                  console.log();

                  const parsed = parser.parse(decoded);
                  console.log('Parsed structure:');
                  console.log(JSON.stringify(parsed, null, 2));
                  console.log();

                  // Search for our IDs
                  const searchInObject = (obj, path = '') => {
                    for (const [key, val] of Object.entries(obj)) {
                      const stringIds = searchIds.map(String);
                      if (searchIds.includes(val) || stringIds.includes(val)) {
                        console.log(`  🎯 FOUND ID ${val} at: ${path ? path + '.' : ''}${key}`);
                        console.log(`     Parent object:`, JSON.stringify(obj, null, 4));
                      } else if (val && typeof val === 'object') {
                        searchInObject(val, path ? `${path}.${key}` : key);
                      }
                    }
                  };
                  searchInObject(parsed);
                } catch (e) {
                  console.log(`Could not parse as XML: ${e.message}`);
                }
              } else {
                console.log('Content:', value);
              }
            } else {
              console.log('Value:', value);
            }
          });
        } else {
          console.log('❌ No referee/official-related fields found');
        }

        // Check specific field names we might expect
        console.log();
        console.log('Checking specific field names:');
        const checkFields = ['Officials', 'Referees', 'Judges', 'Staff', 'Personnel', 'TeamOfficials'];
        checkFields.forEach(fieldName => {
          if (tournament[fieldName]) {
            console.log(`  ✅ ${fieldName}: exists (${typeof tournament[fieldName]})`);
            const value = tournament[fieldName];
            if (typeof value === 'string' && value.length < 200) {
              console.log(`     Value: ${value}`);
            } else if (typeof value === 'string') {
              console.log(`     Length: ${value.length} chars`);
            }
          } else {
            console.log(`  ❌ ${fieldName}: not found`);
          }
        });

      } else if (data.BadParameter) {
        console.log('❌ BadParameter error:', data.BadParameter);
      } else {
        console.log('❌ No BeachTournament in response');
        console.log('Response:', JSON.stringify(data, null, 2));
      }

      console.log();
      console.log();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  console.log('='.repeat(80));
  console.log('✅ Test Complete');
  console.log('='.repeat(80));
}

testTournamentOfficials();
