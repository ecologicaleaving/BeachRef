#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

console.log('🏐 Syncing Tournament 1552 Matches');
console.log('=================================\n');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FIVB_APP_ID = '2a9523517c52420da73d927c6d6bab23';

async function syncTournament1552() {
  try {
    console.log('📡 Fetching matches from FIVB API for tournament 1552...');

    // Get matches for tournament 1552 using GetBeachMatchList
    const requestXml = `<Request Type="GetBeachMatchList" Fields="No EventNo LocalDate LocalTime Court Status Round TeamAName TeamBName RefereeId1 RefereeId2"><Filter EventNo="1552" /></Request>`;

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

    // Parse matches from XML
    const matches = parseMatches(xml, '1552');
    console.log(`📊 Parsed ${matches.length} matches from XML`);

    if (matches.length === 0) {
      console.log('⚠️  No matches found for tournament 1552 in FIVB API');
      return;
    }

    // Ensure event exists
    console.log('🏆 Ensuring event 1552 exists...');
    const { error: eventError } = await supabase
      .from('events')
      .upsert({
        id: 1552,
        name: 'Tournament 1552',
        code: '1552',
        country: 'AUTO',
        gender: 'M',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      }, { onConflict: 'id' });

    if (eventError) {
      console.log('Event creation warning:', eventError.message);
    } else {
      console.log('✅ Event 1552 ready');
    }

    // Insert matches
    console.log('💾 Inserting matches into database...');
    const { data: insertedMatches, error: matchError } = await supabase
      .from('matches')
      .upsert(matches, { onConflict: 'vis_match_no' })
      .select('id, vis_match_no, referee_id_1, referee_id_2');

    if (matchError) {
      throw new Error(`Failed to insert matches: ${matchError.message}`);
    }

    console.log(`✅ Inserted ${insertedMatches.length} matches`);

    // Insert referee assignments
    console.log('👨‍⚖️ Creating referee assignments...');
    const refereeAssignments = [];

    for (const match of insertedMatches) {
      if (match.referee_id_1) {
        refereeAssignments.push({
          match_id: match.id,
          referee_id: match.referee_id_1,
          role: 'FIRST'
        });
      }
      if (match.referee_id_2) {
        refereeAssignments.push({
          match_id: match.id,
          referee_id: match.referee_id_2,
          role: 'SECOND'
        });
      }
    }

    if (refereeAssignments.length > 0) {
      const { error: refError } = await supabase
        .from('match_referees')
        .upsert(refereeAssignments, { onConflict: 'match_id,role' });

      if (refError) {
        console.error('Referee assignment error:', refError.message);
      } else {
        console.log(`✅ Created ${refereeAssignments.length} referee assignments`);
      }
    }

    // Verify the data
    console.log('\n🔍 Verifying sync results...');
    const { data: verifyMatches } = await supabase
      .from('matches')
      .select('vis_match_no, team_a_name, team_b_name')
      .eq('tournament_code', '1552')
      .limit(5);

    if (verifyMatches && verifyMatches.length > 0) {
      console.log(`✅ Verified: ${verifyMatches.length} matches now in database for tournament 1552`);
      verifyMatches.forEach(m => {
        console.log(`   - Match ${m.vis_match_no}: ${m.team_a_name} vs ${m.team_b_name}`);
      });
    } else {
      console.log('❌ No matches found in database after sync');
    }

    console.log('\n🎉 Tournament 1552 sync completed successfully!');

  } catch (error) {
    console.error('💥 Sync failed:', error.message);
    throw error;
  }
}

function parseMatches(xml, tournamentCode) {
  const matches = [];
  const matchRegex = /<BeachMatch([^>]*)>/g;
  let match;

  while ((match = matchRegex.exec(xml)) !== null) {
    const attributes = match[1];

    // Extract attributes using simple regex
    const getAttr = (name) => {
      const attrMatch = attributes.match(new RegExp(`${name}="([^"]*)"`, 'i'));
      return attrMatch ? attrMatch[1] : null;
    };

    const matchData = {
      vis_match_no: parseInt(getAttr('No') || '0'),
      event_id: parseInt(getAttr('EventNo') || tournamentCode),
      tournament_code: tournamentCode,
      utc_datetime: parseVISDateTime(getAttr('LocalDate'), getAttr('LocalTime')),
      court: getAttr('Court'),
      status: getAttr('Status') || 'SCHEDULED',
      round_name: getAttr('Round'),
      team_a_name: getAttr('TeamAName'),
      team_b_name: getAttr('TeamBName'),
      referee_id_1: getAttr('RefereeId1') ? parseInt(getAttr('RefereeId1')) : null,
      referee_id_2: getAttr('RefereeId2') ? parseInt(getAttr('RefereeId2')) : null
    };

    if (matchData.vis_match_no && matchData.vis_match_no > 0) {
      matches.push(matchData);
    }
  }

  return matches;
}

function parseVISDateTime(date, time) {
  if (!date) return new Date().toISOString();

  // VIS date format: typically DD/MM/YYYY or YYYY-MM-DD
  let parsedDate;

  if (date.includes('/')) {
    const [day, month, year] = date.split('/');
    parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  } else {
    parsedDate = new Date(date);
  }

  // Add time if provided (format: HH:MM)
  if (time && time.includes(':')) {
    const [hours, minutes] = time.split(':');
    parsedDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  }

  return parsedDate.toISOString();
}

// Run the sync
syncTournament1552()
  .then(() => {
    console.log('\n✅ All done! Recent matches should now appear in the app.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  });