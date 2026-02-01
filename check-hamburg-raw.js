/**
 * Raw check of Hamburg tournament 1552
 */

const https = require('https');

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

async function checkHamburgRaw() {
  console.log('='.repeat(80));
  console.log('🔍 RAW CHECK: Hamburg Tournament 1552');
  console.log('='.repeat(80));
  console.log();

  try {
    // Try 1: Simple GetBeachMatchList with minimal fields
    console.log('📋 Try 1: GetBeachMatchList with minimal fields');
    console.log('-'.repeat(80));
    const request1 = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatchList" Fields="No">
  <Filter NoTournament="1552" />
</Request>`;

    const response1 = await makeVisApiCall(request1);
    console.log('Response:');
    console.log(response1);
    console.log();

    // Try 2: GetEvent to check tournament details
    console.log('📋 Try 2: GetEvent for tournament 1552');
    console.log('-'.repeat(80));
    const request2 = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetEvent" No="1552" Fields="No Name StartDate EndDate NoOfMatches" />`;

    const response2 = await makeVisApiCall(request2);
    console.log('Response:');
    console.log(response2);
    console.log();

    // Try 3: GetBeachMatchList without filter
    console.log('📋 Try 3: GetBeachMatchList with just NoTournament attribute');
    console.log('-'.repeat(80));
    const request3 = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatchList" NoTournament="1552" Fields="No RoundName TeamAName TeamBName" />`;

    const response3 = await makeVisApiCall(request3);
    console.log('Response:');
    console.log(response3);
    console.log();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  console.log();
  console.log('='.repeat(80));
  console.log('✅ Check Complete');
  console.log('='.repeat(80));
}

checkHamburgRaw();
