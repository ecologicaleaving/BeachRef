/**
 * Test EVERY possible Challenge Referee field name
 * Request all variants to see what exists
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

async function testAllChallengeRefereeFields() {
  console.log('='.repeat(80));
  console.log('🔍 TEST ALL CHALLENGE REFEREE FIELD VARIANTS');
  console.log('='.repeat(80));
  console.log();

  // Try every possible field name variant
  const fieldVariants = [
    // Standard patterns
    'NoRefereeChallenge',
    'RefereeChallenge',
    'RefereeChallengeName',
    'RefereeChallengeFederationCode',
    'ChallengeReferee',
    'ChallengeRefereeName',
    'ChallengeRefereeFederationCode',
    'NoChallengeReferee',

    // Short forms
    'ChallengeRef',
    'RefChallenge',
    'CR',
    'CRName',
    'CRFederationCode',

    // Video/Review referee patterns
    'VideoReferee',
    'VideoRefereeName',
    'ReviewReferee',
    'ReviewRefereeName',

    // Third referee patterns
    'Referee3',
    'Referee3Name',
    'NoReferee3',
    'ThirdReferee',

    // Official patterns
    'OfficialChallenge',
    'ChallengeOfficial',

    // Complete data patterns
    'ChallengeRefereeData',
    'RefereeChallenge Data',
    'ChallengeRefereeInfo'
  ];

  try {
    console.log(`Testing ${fieldVariants.length} field variants`);
    console.log('Using Men\'s Final (Tournament 8239, Match 44)');
    console.log();
    console.log('Field variants to test:');
    fieldVariants.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    console.log();
    console.log('-'.repeat(80));

    const fieldsString = fieldVariants.join(' ');
    const request = `<?xml version="1.0" encoding="utf-8"?>
<Request Type="GetBeachMatchList" Fields="No NoInTournament RoundName ${fieldsString}">
  <Filter NoTournament="8239" />
</Request>`;

    console.log();
    console.log('Making request...');
    const response = await makeVisApiCall(request);
    const data = parser.parse(response);

    const matches = data.BeachMatches?.BeachMatch || [];
    const matchesArray = Array.isArray(matches) ? matches : [matches];

    // Find Men's Final (Match 44)
    const final = matchesArray.find(m =>
      m.RoundName && m.RoundName.toLowerCase().includes('final 1st')
    );

    if (!final) {
      console.log('❌ Could not find Men\'s Final');
      return;
    }

    console.log('✅ Found Men\'s Final');
    console.log();
    console.log('='.repeat(80));
    console.log('🎯 FIELDS THAT EXIST IN RESPONSE:');
    console.log('='.repeat(80));
    console.log();

    // Check which fields actually have data
    const existingFields = [];
    const emptyFields = [];
    const missingFields = [];

    fieldVariants.forEach(field => {
      if (field in final) {
        const value = final[field];
        if (value !== '' && value !== null && value !== undefined) {
          existingFields.push({ field, value });
          console.log(`✅ ${field}: ${value}`);
        } else {
          emptyFields.push(field);
          console.log(`⚠️  ${field}: (exists but empty)`);
        }
      } else {
        missingFields.push(field);
      }
    });

    console.log();
    console.log('='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log();
    console.log(`Fields with data: ${existingFields.length}`);
    console.log(`Fields that exist but are empty: ${emptyFields.length}`);
    console.log(`Fields that don't exist: ${missingFields.length}`);
    console.log();

    if (existingFields.length > 0) {
      console.log('✅ FIELDS WITH DATA:');
      existingFields.forEach(({ field, value }) => {
        console.log(`  ${field}: ${value}`);
      });
      console.log();

      // Show what the NoRefereeChallenge value is
      if (final.NoRefereeChallenge) {
        console.log('🎯 NoRefereeChallenge ID: ' + final.NoRefereeChallenge);
        console.log();
        console.log('CONCLUSION:');
        console.log('  NoRefereeChallenge field exists with ID ' + final.NoRefereeChallenge);
        console.log('  But NO other Challenge Referee fields contain the name/federation');
        console.log('  This ID must be looked up from another source');
      }
    }

    if (emptyFields.length > 0) {
      console.log('⚠️  EMPTY FIELDS:');
      emptyFields.forEach(field => console.log(`  ${field}`));
      console.log();
    }

    // Show all fields that actually exist in the match
    console.log('='.repeat(80));
    console.log('📋 ALL FIELDS IN MATCH OBJECT:');
    console.log('='.repeat(80));
    console.log();
    const allMatchFields = Object.keys(final).sort();
    console.log(`Total: ${allMatchFields.length} fields`);
    console.log();
    allMatchFields.forEach(field => {
      const value = final[field];
      const valueStr = typeof value === 'string' && value.length > 80
        ? `(${value.length} chars) ${value.substring(0, 80)}...`
        : JSON.stringify(value);
      console.log(`  ${field}: ${valueStr}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  console.log();
  console.log('='.repeat(80));
  console.log('✅ Test Complete');
  console.log('='.repeat(80));
}

testAllChallengeRefereeFields();
