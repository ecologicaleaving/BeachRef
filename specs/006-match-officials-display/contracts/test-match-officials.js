/**
 * VIS API Match Officials Test Script
 *
 * This standalone Node.js script tests the VIS API to validate assumed field names
 * for match officials before integration into the BeachRef codebase.
 *
 * User Requirement: "before implementing any call you have to test it and show me the test result"
 *
 * Usage:
 *   node test-match-officials.js [matchNo]
 *
 * Example:
 *   node test-match-officials.js 12345
 *
 * If no matchNo provided, prompts for input or uses a default test match.
 */

const https = require('https');
const { XMLParser } = require('fast-xml-parser');

// VIS API Configuration
const VIS_API_URL = 'www.fivb.org';
const VIS_API_PATH = '/vis2009/XmlRequest.asmx';

// Expected official field names (UPDATED based on test results)
const EXPECTED_FIELDS = {
  primaryReferees: [
    'NoReferee1', 'Referee1Name', 'Referee1FederationCode',
    'NoReferee2', 'Referee2Name', 'Referee2FederationCode'
  ],
  challengeReferee: [
    'NoRefereeChallenge', 'RefereeChallengeName', 'RefereeChallengeFederationCode'
  ],
  assistantChallengeReferee: [
    'NoRefereeAssistantChallenge', 'RefereeAssistantChallengeName', 'RefereeAssistantChallengeFederationCode'
  ],
  reserveReferee: [
    'NoRefereeReserve', 'RefereeReserveName', 'RefereeReserveFederationCode'
  ]
};

/**
 * Build VIS API XML request
 *
 * Request WITHOUT field restrictions to get ALL available fields
 */
function buildXmlRequest(matchNo) {
  return `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetBeachMatch" No="${matchNo}" />
</Requests>`;
}

/**
 * Execute VIS API request
 */
function executeVisApiRequest(xmlRequest) {
  return new Promise((resolve, reject) => {
    const postData = `Request=${encodeURIComponent(xmlRequest)}`;

    const options = {
      hostname: VIS_API_URL,
      port: 443,
      path: VIS_API_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Parse XML response
 */
function parseXmlResponse(xmlResponse) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: true,
    trimValues: true
  });

  const result = parser.parse(xmlResponse);
  return result;
}

/**
 * Extract official fields from parsed response
 */
function extractOfficialFields(matchData) {
  const officialFields = {};

  // Extract all fields containing referee, scorer, or line judge keywords
  const keywords = ['Referee', 'Scorer', 'LineJudge', 'Official', 'Challenge'];

  Object.keys(matchData).forEach(key => {
    if (keywords.some(keyword => key.includes(keyword))) {
      officialFields[key] = matchData[key];
    }
  });

  return officialFields;
}

/**
 * Validate field names against expectations
 */
function validateFields(actualFields) {
  const allExpected = [
    ...EXPECTED_FIELDS.primaryReferees,
    ...EXPECTED_FIELDS.challengeReferee,
    ...EXPECTED_FIELDS.scorer,
    ...EXPECTED_FIELDS.assistantScorer,
    ...EXPECTED_FIELDS.lineJudges
  ];

  const actualFieldNames = Object.keys(actualFields);

  const validated = {};
  const missing = [];
  const unexpected = [];

  // Check expected fields
  allExpected.forEach(field => {
    if (actualFieldNames.includes(field)) {
      validated[field] = actualFields[field];
    } else {
      missing.push(field);
    }
  });

  // Check for unexpected fields (might be new or different naming)
  actualFieldNames.forEach(field => {
    if (!allExpected.includes(field)) {
      unexpected.push(field);
    }
  });

  return {
    validated,
    missing,
    unexpected,
    totalExpected: allExpected.length,
    totalValidated: Object.keys(validated).length,
    totalMissing: missing.length,
    totalUnexpected: unexpected.length
  };
}

/**
 * Format test results for display
 */
function formatResults(matchNo, matchData, officialFields, validation) {
  const border = '═'.repeat(80);
  const line = '─'.repeat(80);

  console.log('\n' + border);
  console.log('  VIS API Match Officials Field Validation Test');
  console.log(border + '\n');

  // Match Info
  console.log('📋 Match Information:');
  console.log(`  Match No:        ${matchNo}`);
  console.log(`  Tournament:      ${matchData.TournamentName || 'N/A'}`);
  console.log(`  Date:            ${matchData.LocalDate || 'N/A'} ${matchData.LocalTime || ''}`);
  console.log(`  Teams:           ${matchData.TeamAName || 'N/A'} vs ${matchData.TeamBName || 'N/A'}`);
  console.log(`  Status:          ${matchData.Status || 'N/A'}\n`);

  // Validation Summary
  console.log(line);
  console.log('✅ Validation Summary:\n');
  console.log(`  Total Expected Fields:    ${validation.totalExpected}`);
  console.log(`  ✓ Validated (Found):      ${validation.totalValidated} (${Math.round((validation.totalValidated / validation.totalExpected) * 100)}%)`);
  console.log(`  ✗ Missing:                ${validation.totalMissing}`);
  console.log(`  ⚠ Unexpected:             ${validation.totalUnexpected}\n`);

  // Validated Fields (Found)
  if (validation.totalValidated > 0) {
    console.log(line);
    console.log('✅ VALIDATED FIELDS (Found in API response):\n');

    Object.entries(validation.validated).forEach(([field, value]) => {
      const category = getFieldCategory(field);
      console.log(`  ${category.padEnd(20)} ${field.padEnd(35)} = ${value || '(null)'}`);
    });
    console.log('');
  }

  // Missing Fields
  if (validation.totalMissing > 0) {
    console.log(line);
    console.log('❌ MISSING FIELDS (Not found in API response):\n');

    validation.missing.forEach(field => {
      const category = getFieldCategory(field);
      console.log(`  ${category.padEnd(20)} ${field}`);
    });
    console.log('\n  ⚠️  NOTE: Missing fields may indicate:');
    console.log('      1. Officials not assigned for this match');
    console.log('      2. Field names are different than expected');
    console.log('      3. Fields require specific VIS API permissions\n');
  }

  // Unexpected Fields
  if (validation.totalUnexpected > 0) {
    console.log(line);
    console.log('⚠️  UNEXPECTED FIELDS (Found but not in our expected list):\n');

    validation.unexpected.forEach(field => {
      const value = officialFields[field];
      console.log(`  ${field.padEnd(40)} = ${value || '(null)'}`);
    });
    console.log('\n  💡 These fields may be useful additions or alternative names.\n');
  }

  // Final Verdict
  console.log(line);
  console.log('📊 FINAL VERDICT:\n');

  if (validation.totalValidated >= validation.totalExpected * 0.7) {
    console.log('  ✅ TEST PASSED');
    console.log(`     ${validation.totalValidated}/${validation.totalExpected} fields validated (${Math.round((validation.totalValidated / validation.totalExpected) * 100)}%)`);
    console.log('     Field naming assumptions are mostly correct.');
    console.log('     Safe to proceed with integration.\n');
  } else if (validation.totalValidated >= validation.totalExpected * 0.5) {
    console.log('  ⚠️  TEST WARNING');
    console.log(`     ${validation.totalValidated}/${validation.totalExpected} fields validated (${Math.round((validation.totalValidated / validation.totalExpected) * 100)}%)`);
    console.log('     Some expected fields are missing.');
    console.log('     Review missing fields before integration.\n');
  } else {
    console.log('  ❌ TEST FAILED');
    console.log(`     ${validation.totalValidated}/${validation.totalExpected} fields validated (${Math.round((validation.totalValidated / validation.totalExpected) * 100)}%)`);
    console.log('     Field naming assumptions are incorrect.');
    console.log('     DO NOT proceed with integration - investigate field names.\n');
  }

  console.log(border + '\n');

  // Recommendations
  console.log('📝 Next Steps:\n');
  if (validation.totalMissing > 0) {
    console.log('  1. Review missing fields - they may need different field names');
    console.log('  2. Check unexpected fields for alternative naming patterns');
  }
  if (validation.totalUnexpected > 0) {
    console.log('  3. Consider adding unexpected fields if they provide useful official data');
  }
  console.log('  4. Update contracts/vis-api-fields.ts with validated field names');
  console.log('  5. Show these results to the user for approval before integration');
  console.log('  6. Proceed with implementing MatchOfficials feature\n');
}

/**
 * Helper: Categorize field by official type
 */
function getFieldCategory(fieldName) {
  if (fieldName.includes('Referee1') || fieldName.includes('Referee2')) {
    return '[Primary Referee]';
  }
  if (fieldName.includes('RefereeAssistantChallenge') || fieldName.includes('AssistantChallenge')) {
    return '[Assistant Challenge Referee]';
  }
  if (fieldName.includes('RefereeChallenge') || fieldName.includes('Challenge')) {
    return '[Challenge Referee]';
  }
  if (fieldName.includes('RefereeReserve') || fieldName.includes('Reserve')) {
    return '[Reserve Referee]';
  }
  return '[Other Official]';
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🔍 VIS API Match Officials Test Script');
  console.log('   Testing assumed field names before integration...\n');

  // Get match number from command line or prompt
  let matchNo = process.argv[2];

  if (!matchNo) {
    console.log('❗ No match number provided.');
    console.log('   Usage: node test-match-officials.js [matchNo]');
    console.log('   Example: node test-match-officials.js 12345\n');

    // Use a default test match (can be updated)
    matchNo = '1'; // Replace with actual test match number
    console.log(`   Using default test match: ${matchNo}\n`);
  }

  try {
    // Step 1: Build request
    console.log(`📡 Step 1: Building VIS API request for match ${matchNo}...`);
    const xmlRequest = buildXmlRequest(matchNo);
    console.log('   ✓ Request built (unrestricted fields)\n');

    // Step 2: Execute request
    console.log('📡 Step 2: Executing VIS API request...');
    const xmlResponse = await executeVisApiRequest(xmlRequest);
    console.log('   ✓ Response received\n');

    // Step 3: Parse response
    console.log('📋 Step 3: Parsing XML response...');
    const parsedResponse = parseXmlResponse(xmlResponse);

    // Navigate to BeachMatch element (direct structure, not SOAP)
    const matchData = parsedResponse?.Responses?.BeachMatch || {};

    if (!matchData.No) {
      console.log('\nResponse structure received:');
      console.log(JSON.stringify(parsedResponse, null, 2).substring(0, 500));
      throw new Error('Invalid response structure - BeachMatch element not found');
    }

    console.log(`   ✓ Match data parsed (${Object.keys(matchData).length} fields total)\n`);

    // Step 4: Extract official fields
    console.log('🔍 Step 4: Extracting official-related fields...');
    const officialFields = extractOfficialFields(matchData);
    console.log(`   ✓ Found ${Object.keys(officialFields).length} official-related fields\n`);

    // Step 5: Validate against expectations
    console.log('✅ Step 5: Validating field names...');
    const validation = validateFields(officialFields);
    console.log('   ✓ Validation complete\n');

    // Step 6: Display results
    formatResults(matchNo, matchData, officialFields, validation);

    // Exit with appropriate code
    const successRate = validation.totalValidated / validation.totalExpected;
    if (successRate >= 0.7) {
      process.exit(0); // Success
    } else if (successRate >= 0.5) {
      process.exit(1); // Warning
    } else {
      process.exit(2); // Failure
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED\n');
    console.error('Error:', error.message);
    console.error('\nPossible causes:');
    console.error('  - Match number does not exist');
    console.error('  - VIS API is unavailable');
    console.error('  - Network connection issue');
    console.error('  - Invalid API URL or path\n');
    process.exit(3);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  buildXmlRequest,
  executeVisApiRequest,
  parseXmlResponse,
  extractOfficialFields,
  validateFields
};
