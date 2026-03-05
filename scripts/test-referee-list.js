/**
 * Test GetEventRefereeList to find Technical Delegate and Referee Coach
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const eventNo = process.argv[2] || '429';

function getEventRefereeList(eventNo) {
  return new Promise((resolve, reject) => {
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetEventRefereeList" No="${eventNo}" />
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
  console.log(`\n🔍 Testing GetEventRefereeList for Event ${eventNo}...\n`);
  console.log('Looking for: Technical Delegate, Referee Coach, Referees\n');

  const response = await getEventRefereeList(eventNo);

  // Show raw response
  console.log('='.repeat(80));
  console.log('RAW XML RESPONSE (first 3000 chars)');
  console.log('='.repeat(80));
  console.log(response.substring(0, 3000));
  console.log('...\n');

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: true,
  });

  const result = parser.parse(response);

  // Try to find referees
  const referees =
    result?.Responses?.EventReferees?.Referee ||
    result?.Responses?.RefereeList?.Referee ||
    result?.Responses?.Referee ||
    [];

  const refereeArray = Array.isArray(referees)
    ? referees
    : referees
    ? [referees]
    : [];

  console.log('='.repeat(80));
  console.log('PARSED RESULTS');
  console.log('='.repeat(80) + '\n');

  if (refereeArray.length > 0) {
    console.log(`✅ Found ${refereeArray.length} referees\n`);

    // Show first few with all fields
    console.log('Sample referees (with all fields):\n');
    refereeArray.slice(0, 5).forEach((referee, index) => {
      console.log(`${index + 1}. Referee:`);
      Object.keys(referee).forEach((key) => {
        console.log(`   ${key}: ${referee[key]}`);
      });
      console.log('');
    });

    // Group by Role if available
    if (refereeArray[0] && refereeArray[0].Role !== undefined) {
      console.log('\n' + '='.repeat(80));
      console.log('REFEREES GROUPED BY ROLE');
      console.log('='.repeat(80) + '\n');

      const byRole = {};
      refereeArray.forEach((referee) => {
        const role = referee.Role || referee.Function || 'Unknown';
        if (!byRole[role]) byRole[role] = [];
        byRole[role].push(referee);
      });

      Object.keys(byRole)
        .sort()
        .forEach((role) => {
          console.log(`📋 Role/Function: "${role}" (${byRole[role].length} referees)`);
          console.log('-'.repeat(80));
          byRole[role].slice(0, 5).forEach((referee) => {
            const name =
              `${referee.FirstName || ''} ${referee.LastName || ''}`.trim() ||
              'No name';
            const id = referee.NoReferee || referee.No || 'N/A';
            const federation = referee.FederationCode || referee.NationalityCode || 'N/A';
            console.log(`  [${id}] ${name} (${federation})`);
          });
          if (byRole[role].length > 5) {
            console.log(`  ... and ${byRole[role].length - 5} more\n`);
          } else {
            console.log('');
          }
        });

      // Specifically look for technical officials
      console.log('\n' + '='.repeat(80));
      console.log('🎯 TECHNICAL OFFICIALS FOUND:');
      console.log('='.repeat(80) + '\n');

      const technicalRoles = Object.keys(byRole).filter((role) => {
        const r = role.toLowerCase();
        return (
          r.includes('technical') ||
          r.includes('delegate') ||
          r.includes('coach') ||
          r.includes('director') ||
          r.includes('supervisor')
        );
      });

      if (technicalRoles.length > 0) {
        technicalRoles.forEach((role) => {
          console.log(`✅ ${role}:`);
          byRole[role].forEach((referee) => {
            const name =
              `${referee.FirstName || ''} ${referee.LastName || ''}`.trim();
            const federation = referee.FederationCode || referee.NationalityCode || 'N/A';
            console.log(`   - ${name} (${federation})`);
          });
          console.log('');
        });
      } else {
        console.log('❌ No Technical Delegate, Referee Coach, or similar roles found\n');
        console.log('Available roles:');
        Object.keys(byRole).forEach((role) => {
          console.log(`   - ${role}`);
        });
      }
    } else {
      console.log('⚠️  No Role field found in referee data');
    }
  } else {
    console.log('❌ No referees found\n');

    if (result?.Responses) {
      console.log('Available keys in Responses:');
      Object.keys(result.Responses).forEach((key) => {
        console.log(`  - ${key}`);
      });
    }
  }
}

main().catch(console.error);
