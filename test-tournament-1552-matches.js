#!/usr/bin/env node

const fetch = require('node-fetch');

const FIVB_APP_ID = '2a9523517c52420da73d927c6d6bab23';

async function testTournament1552Matches() {
  try {
    console.log('🏐 Testing Tournament 1552 Matches');
    console.log('=================================\n');

    // Try different approaches to get matches for tournament 1552
    console.log('📡 Approach 1: GetBeachMatchList with EventNo filter...');

    const requestXml1 = `<Request Type="GetBeachMatchList" Fields="No EventNo LocalDate LocalTime Court Status Round TeamAName TeamBName RefereeId1 RefereeId2"><Filter EventNo="1552" /></Request>`;

    const response1 = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
      method: 'POST',
      headers: {
        'X-FIVB-App-ID': FIVB_APP_ID,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/xml'
      },
      body: 'Request=' + encodeURIComponent(requestXml1)
    });

    if (response1.ok) {
      const xml1 = await response1.text();
      console.log(`✅ Response 1: ${xml1.length} characters`);

      // Count matches
      const matchCount1 = (xml1.match(/<BeachMatch/g) || []).length;
      console.log(`📊 Found ${matchCount1} matches using EventNo filter`);

      if (matchCount1 > 0 && matchCount1 < 100) {
        console.log('🎯 This looks reasonable! Sample XML:');
        console.log(xml1.substring(0, 1000) + '...');
      }
    } else {
      console.log(`❌ Approach 1 failed: ${response1.status} ${response1.statusText}`);
    }

    console.log('\n📡 Approach 2: GetBeachMatchList without filter (to see structure)...');

    const requestXml2 = `<Request Type="GetBeachMatchList" Fields="No EventNo LocalDate LocalTime Court Status Round TeamAName TeamBName RefereeId1 RefereeId2" />`;

    const response2 = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
      method: 'POST',
      headers: {
        'X-FIVB-App-ID': FIVB_APP_ID,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/xml'
      },
      body: 'Request=' + encodeURIComponent(requestXml2)
    });

    if (response2.ok) {
      const xml2 = await response2.text();
      console.log(`✅ Response 2: ${xml2.length} characters`);

      // Look for EventNo="1552" in the XML
      const has1552 = xml2.includes('EventNo="1552"');
      console.log(`🔍 Contains EventNo="1552": ${has1552}`);

      if (has1552) {
        // Extract a sample match with EventNo="1552"
        const match1552Regex = /<BeachMatch[^>]*EventNo="1552"[^>]*>/g;
        const matches1552 = xml2.match(match1552Regex);
        if (matches1552) {
          console.log(`🎯 Found ${matches1552.length} matches for EventNo="1552"`);
          console.log('Sample match:', matches1552[0]);
        }
      }

      // Check what EventNo values are actually present
      const eventNoRegex = /EventNo="([^"]*)"/g;
      const eventNos = new Set();
      let match;
      while ((match = eventNoRegex.exec(xml2)) !== null) {
        eventNos.add(match[1]);
        if (eventNos.size > 20) break; // Don't collect too many
      }

      console.log('📋 Sample EventNo values found:', Array.from(eventNos).slice(0, 10));
    } else {
      console.log(`❌ Approach 2 failed: ${response2.status} ${response2.statusText}`);
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testTournament1552Matches();