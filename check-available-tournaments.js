#!/usr/bin/env node

const fetch = require('node-fetch');

const FIVB_APP_ID = '2a9523517c52420da73d927c6d6bab23';

async function checkAvailableTournaments() {
  try {
    console.log('🔍 Checking available tournaments from FIVB API...');

    // Get list of events/tournaments
    const requestXml = '<Request Type="GetEventList" Fields="No Name Country Gender"><Filter Season="2025" Gender="M" /></Request>';

    const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
      method: 'POST',
      headers: {
        'X-FIVB-App-ID': FIVB_APP_ID,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/xml'
      },
      body: 'Request=' + encodeURIComponent(requestXml)
    });

    if (!response.ok) {
      throw new Error(`FIVB API error: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    console.log(`✅ Received XML data (${xml.length} characters)`);

    // Parse events to find tournament numbers
    const eventRegex = /<Event([^>]*)>/g;
    const events = [];
    let match;

    while ((match = eventRegex.exec(xml)) !== null) {
      const attributes = match[1];

      const getAttr = (name) => {
        const attrMatch = attributes.match(new RegExp(`${name}="([^"]*)"`, 'i'));
        return attrMatch ? attrMatch[1] : null;
      };

      const event = {
        no: getAttr('No'),
        name: getAttr('Name'),
        country: getAttr('Country'),
        gender: getAttr('Gender')
      };

      if (event.no) {
        events.push(event);
      }
    }

    console.log(`\n📊 Found ${events.length} tournaments:`);

    // Look for tournament 1552 specifically
    const tournament1552 = events.find(e => e.no === '1552');
    if (tournament1552) {
      console.log(`\n🎯 Found Tournament 1552: ${tournament1552.name} (${tournament1552.country})`);
    } else {
      console.log(`\n❌ Tournament 1552 not found in current season`);
      console.log('\n📋 Available tournaments containing "1552" or similar:');
      const similar = events.filter(e => e.no.includes('155') || e.name.toLowerCase().includes('1552'));
      if (similar.length > 0) {
        similar.forEach(e => console.log(`   - ${e.no}: ${e.name} (${e.country})`));
      } else {
        console.log('   None found');
      }
    }

    // Show first 10 tournaments for reference
    console.log('\n📝 First 10 available tournaments:');
    events.slice(0, 10).forEach(e => {
      console.log(`   - ${e.no}: ${e.name} (${e.country})`);
    });

    // Show tournaments with numbers close to 1552
    console.log('\n🔢 Tournaments with IDs close to 1552:');
    const closeNumbers = events.filter(e => {
      const num = parseInt(e.no);
      return num >= 1540 && num <= 1560;
    });

    if (closeNumbers.length > 0) {
      closeNumbers.forEach(e => console.log(`   - ${e.no}: ${e.name} (${e.country})`));
    } else {
      console.log('   None found in range 1540-1560');
    }

  } catch (error) {
    console.error('💥 Check failed:', error.message);
  }
}

checkAvailableTournaments();