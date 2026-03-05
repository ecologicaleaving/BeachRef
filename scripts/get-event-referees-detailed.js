/**
 * Get detailed referee information for an event
 * Uses GetEventRefereeList with Fields parameter to get names and roles
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const eventNo = process.argv[2] || '1719';

function getEventRefereeListDetailed(eventNo) {
  return new Promise((resolve, reject) => {
    // Request with specific fields to get names and roles
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetEventRefereeList" No="${eventNo}" Fields="NoReferee FirstName LastName NationalityCode FederationCode Role Function Gender Status" />
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
  console.log(`\n🔍 Getting detailed referees for Event ${eventNo}...\n`);

  const response = await getEventRefereeListDetailed(eventNo);

  // Show raw response
  console.log('='.repeat(80));
  console.log('RAW XML RESPONSE (first 2000 chars)');
  console.log('='.repeat(80));
  console.log(response.substring(0, 2000));
  console.log('...\n');

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: true,
  });

  const result = parser.parse(response);

  // Navigate to referees
  const referees =
    result?.Responses?.EventReferees?.EventReferee ||
    result?.Responses?.EventReferees?.Referee ||
    result?.Responses?.Referees?.Referee ||
    [];

  const refereeArray = Array.isArray(referees)
    ? referees
    : referees
    ? [referees]
    : [];

  console.log('='.repeat(80));
  console.log('REFEREE RESULTS');
  console.log('='.repeat(80) + '\n');

  if (refereeArray.length > 0) {
    console.log(`✅ Found ${refereeArray.length} referees\n`);

    // Show sample with all fields
    console.log('Sample (first 3):\n');
    refereeArray.slice(0, 3).forEach((ref, i) => {
      console.log(`${i + 1}.`);
      Object.keys(ref).forEach((key) => {
        console.log(`   ${key}: ${ref[key]}`);
      });
      console.log('');
    });

    // Check if we have Role or Function field
    const hasRole = refereeArray.some((r) => r.Role || r.Function);

    if (hasRole) {
      // Group by Role/Function
      console.log('\n' + '='.repeat(80));
      console.log('GROUPED BY ROLE/FUNCTION');
      console.log('='.repeat(80) + '\n');

      const byRole = {};
      refereeArray.forEach((ref) => {
        const role = ref.Role || ref.Function || 'No Role';
        if (!byRole[role]) byRole[role] = [];
        byRole[role].push(ref);
      });

      Object.keys(byRole)
        .sort()
        .forEach((role) => {
          console.log(`\n📋 ${role} (${byRole[role].length})`);
          console.log('-'.repeat(80));
          byRole[role].slice(0, 10).forEach((ref) => {
            const name =
              `${ref.FirstName || ''} ${ref.LastName || ''}`.trim() ||
              'No name';
            const fed = ref.FederationCode || ref.NationalityCode || 'N/A';
            const id = ref.NoReferee || ref.No || '';
            console.log(`  [${id}] ${name} (${fed})`);
          });
          if (byRole[role].length > 10) {
            console.log(`  ... and ${byRole[role].length - 10} more`);
          }
        });

      // Highlight technical officials
      console.log('\n\n' + '='.repeat(80));
      console.log('🎯 TECHNICAL OFFICIALS (Technical Delegate, Referee Coach, etc.)');
      console.log('='.repeat(80) + '\n');

      const technicalRoles = Object.keys(byRole).filter((role) => {
        const r = role.toLowerCase();
        return (
          r.includes('technical') ||
          r.includes('delegate') ||
          r.includes('coach') ||
          r.includes('director') ||
          r.includes('supervisor') ||
          r.includes('td') ||
          r.includes('rc')
        );
      });

      if (technicalRoles.length > 0) {
        technicalRoles.forEach((role) => {
          console.log(`✅ ${role}:`);
          byRole[role].forEach((ref) => {
            const name =
              `${ref.FirstName || ''} ${ref.LastName || ''}`.trim();
            const fed = ref.FederationCode || ref.NationalityCode || 'N/A';
            console.log(`   - ${name} (${fed})`);
          });
          console.log('');
        });
      } else {
        console.log('❌ No technical officials found in these roles:\n');
        Object.keys(byRole).forEach((role) => {
          console.log(`   - ${role}`);
        });
      }
    } else {
      console.log('⚠️  No Role or Function field in referee data\n');
      console.log('This might mean Fields parameter was ignored.');
    }
  } else {
    console.log('❌ No referees found or Fields parameter not working\n');
  }
}

main().catch(console.error);
