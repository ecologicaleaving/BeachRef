/**
 * Test Script: Officials API Exploration
 *
 * Tests the VIS API endpoints for tournament officials:
 * - GetEventOfficialList
 * - GetEventRefereeList
 *
 * Target: João Pessoa 2026 March tournament
 */

import { VisApiClient } from '../services/api/VisApiClient';
import { VisApiClientConfig } from '../types/api-v2';

const API_CONFIG: VisApiClientConfig = {
  baseUrl: 'https://www.fivb.org/VisSDK/VisWebService/',
  timeoutMs: 30000,
  maxRetries: 3,
  retryDelayMs: 1000,
  exponentialBackoff: true,
  enableLogging: true,
  headers: {}
};

async function findJoaoPessoa2026() {
  console.log('🔍 Searching for João Pessoa 2026 March tournament...\n');

  const client = new VisApiClient(API_CONFIG);

  // Search for tournaments in João Pessoa, March 2026
  const response = await client.getEventList({
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    fields: ['No', 'Name', 'City', 'StartDate', 'EndDate', 'Gender', 'Status']
  });

  if (!response.success) {
    console.error('❌ Failed to fetch tournaments:', response);
    return null;
  }

  // Parse the XML response
  const XMLParser = require('fast-xml-parser').XMLParser;
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: true
  });

  const result = parser.parse(response.xmlData);
  const events = result?.BVBRBeachVolleyBallRoot?.Event;

  if (!events) {
    console.log('❌ No tournaments found for March 2026');
    return null;
  }

  const eventArray = Array.isArray(events) ? events : [events];

  // Filter for João Pessoa
  const joaoPessoaTournaments = eventArray.filter((event: any) =>
    event.City && event.City.toLowerCase().includes('joão pessoa')
  );

  if (joaoPessoaTournaments.length === 0) {
    console.log('❌ No João Pessoa tournaments found in March 2026');
    console.log('📋 Available tournaments:');
    eventArray.forEach((event: any) => {
      console.log(`   - ${event.Name} (${event.City}) - ${event.StartDate} to ${event.EndDate}`);
    });
    return null;
  }

  console.log('✅ Found João Pessoa tournaments:\n');
  joaoPessoaTournaments.forEach((event: any, index: number) => {
    console.log(`${index + 1}. ${event.Name}`);
    console.log(`   Event No: ${event.No}`);
    console.log(`   City: ${event.City}`);
    console.log(`   Dates: ${event.StartDate} to ${event.EndDate}`);
    console.log(`   Gender: ${event.Gender}`);
    console.log(`   Status: ${event.Status}\n`);
  });

  return joaoPessoaTournaments;
}

async function testOfficialsList(eventNo: string, tournamentName: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing Officials APIs for: ${tournamentName}`);
  console.log(`Event No: ${eventNo}`);
  console.log('='.repeat(80));

  const client = new VisApiClient(API_CONFIG);

  // Test 1: GetEventOfficialList
  console.log('\n📋 Test 1: GetEventOfficialList');
  console.log('-'.repeat(80));

  try {
    const officialListResponse = await client.getEventOfficialList({
      eventNo: eventNo
    });

    if (officialListResponse.success) {
      console.log('✅ GetEventOfficialList - SUCCESS\n');

      // Parse response
      const XMLParser = require('fast-xml-parser').XMLParser;
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        parseAttributeValue: true
      });

      const result = parser.parse(officialListResponse.xmlData);
      const officials = result?.BVBRBeachVolleyBallRoot?.EventOfficials?.Official;

      if (officials) {
        const officialArray = Array.isArray(officials) ? officials : [officials];
        console.log(`📊 Total Officials: ${officialArray.length}\n`);

        console.log('Officials List:');
        officialArray.forEach((official: any, index: number) => {
          console.log(`\n${index + 1}. ${official.FirstName} ${official.LastName}`);
          console.log(`   NoOfficial: ${official.NoOfficial}`);
          console.log(`   Role: ${official.Role}`);
          console.log(`   Status: ${official.Status || 'N/A'}`);
          console.log(`   Federation: ${official.FederationCode || 'N/A'}`);
        });
      } else {
        console.log('⚠️  No officials found in response');
      }

      // Show raw XML sample (first 1000 chars)
      console.log('\n📄 Raw XML Response (sample):');
      console.log(officialListResponse.xmlData.substring(0, 1000));

    } else {
      console.log('❌ GetEventOfficialList - FAILED');
      console.log('Error:', officialListResponse);
    }
  } catch (error) {
    console.log('❌ GetEventOfficialList - EXCEPTION');
    console.error(error);
  }

  // Test 2: GetEventRefereeList
  console.log('\n\n📋 Test 2: GetEventRefereeList');
  console.log('-'.repeat(80));

  try {
    const refereeListResponse = await client.getEventRefereeList({
      eventNo: eventNo
    });

    if (refereeListResponse.success) {
      console.log('✅ GetEventRefereeList - SUCCESS\n');

      // Parse response
      const XMLParser = require('fast-xml-parser').XMLParser;
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        parseAttributeValue: true
      });

      const result = parser.parse(refereeListResponse.xmlData);
      const referees = result?.BVBRBeachVolleyBallRoot?.EventReferees?.Referee;

      if (referees) {
        const refereeArray = Array.isArray(referees) ? referees : [referees];
        console.log(`📊 Total Referees: ${refereeArray.length}\n`);

        console.log('Referees List:');
        refereeArray.forEach((referee: any, index: number) => {
          console.log(`\n${index + 1}. ${referee.FirstName} ${referee.LastName}`);
          console.log(`   NoReferee: ${referee.NoReferee}`);
          console.log(`   Gender: ${referee.Gender === 0 ? 'Male' : 'Female'}`);
          console.log(`   Role: ${referee.Role || 'N/A'}`);
          console.log(`   Status: ${referee.Status || 'N/A'}`);
          console.log(`   Federation: ${referee.FederationCode || 'N/A'}`);
        });
      } else {
        console.log('⚠️  No referees found in response');
      }

      // Show raw XML sample (first 1000 chars)
      console.log('\n📄 Raw XML Response (sample):');
      console.log(refereeListResponse.xmlData.substring(0, 1000));

    } else {
      console.log('❌ GetEventRefereeList - FAILED');
      console.log('Error:', refereeListResponse);
    }
  } catch (error) {
    console.log('❌ GetEventRefereeList - EXCEPTION');
    console.error(error);
  }
}

async function main() {
  console.log('🏐 BeachRef Officials API Testing Tool');
  console.log('=' .repeat(80));
  console.log('Target: João Pessoa 2026 March\n');

  // Step 1: Find João Pessoa tournaments
  const tournaments = await findJoaoPessoa2026();

  if (!tournaments || tournaments.length === 0) {
    console.log('\n❌ No tournaments found. Exiting.');
    return;
  }

  // Step 2: Test officials APIs for each tournament found
  for (const tournament of tournaments) {
    await testOfficialsList(tournament.No.toString(), tournament.Name);
  }

  console.log('\n\n✅ Testing complete!');
  console.log('=' .repeat(80));
}

// Run the script
main().catch(console.error);
