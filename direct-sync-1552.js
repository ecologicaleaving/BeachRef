#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

console.log('🏐 Direct Sync for Tournament 1552');
console.log('=================================\n');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FIVB_APP_ID = '2a9523517c52420da73d927c6d6bab23';

async function directSync() {
  try {
    const tournamentCode = '1552';

    console.log('📡 Step 1: Fetching matches from FIVB API...');

    // Use the correct API format that we confirmed works
    const requestXml = `<Request Type="GetBeachMatchList" Fields="No NoInTournament TournamentGender TeamAName TeamBName LocalDate LocalTime Court Status Round MatchPointsA MatchPointsB PointsTeamASet1 PointsTeamBSet1 PointsTeamASet2 PointsTeamBSet2 PointsTeamASet3 PointsTeamBSet3 NoReferee1 NoReferee2 Referee1Name Referee2Name Referee1FederationCode Referee2FederationCode">
    <Filter NoEvent="${tournamentCode}" IncludeReferees="true" />
</Request>`;

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
    console.log(`✅ Received ${xml.length} characters`);

    // Parse matches
    const matches = parseMatches(xml, tournamentCode);
    console.log(`📊 Parsed ${matches.length} matches`);

    if (matches.length === 0) {
      console.log('❌ No matches to sync');
      return;
    }

    console.log('\n🏆 Step 2: Creating tournament and event...');

    // Create tournament
    const { error: tournamentError } = await supabase
      .from('tournaments')
      .upsert({
        id: parseInt(tournamentCode),
        vis_tournament_no: parseInt(tournamentCode),
        tournament_code: tournamentCode,
        name: 'BPT Elite Hamburg',
        country: 'GER',
        season: '2025',
        gender: 'M',
        type: 'Elite',
        status: 'ACTIVE'
      }, { onConflict: 'id' });

    if (tournamentError && !tournamentError.message.includes('duplicate key')) {
      console.log('Tournament error:', tournamentError.message);
    }

    // Create event
    const { error: eventError } = await supabase
      .from('events')
      .upsert({
        id: parseInt(tournamentCode),
        vis_event_no: parseInt(tournamentCode),
        event_code: `${tournamentCode}_M`,
        tournament_id: parseInt(tournamentCode),
        name: 'BPT Elite Hamburg - Men',
        country: 'GER',
        gender: 'M',
        phase: 'Main',
        start_date: '2025-08-27',
        end_date: '2025-08-31',
        status: 'ACTIVE'
      }, { onConflict: 'id' });

    if (eventError && !eventError.message.includes('duplicate key')) {
      console.log('Event error:', eventError.message);
    } else {
      console.log('✅ Tournament and event ready');
    }

    console.log('\n💾 Step 3: Inserting matches...');

    // Extract referee data before inserting matches
    const refereeData = matches.map(m => ({
      vis_match_no: m.vis_match_no,
      referee_1: m._referee_1,
      referee_2: m._referee_2
    }));

    // Clean match data (remove referee fields for database)
    const cleanMatches = matches.map(m => {
      const { _referee_1, _referee_2, ...clean } = m;
      return clean;
    });

    const { data: insertedMatches, error: matchError } = await supabase
      .from('matches')
      .upsert(cleanMatches, { onConflict: 'vis_match_no' })
      .select('id, vis_match_no');

    if (matchError) {
      throw new Error(`Match insert failed: ${matchError.message}`);
    }

    console.log(`✅ Inserted ${insertedMatches.length} matches`);

    console.log('\n👨‍⚖️ Step 4: Creating referee assignments...');

    // Create referee assignments using the extracted referee data
    const refereeAssignments = [];
    for (const match of insertedMatches) {
      const refData = refereeData.find(r => r.vis_match_no === match.vis_match_no);
      if (refData?.referee_1) {
        refereeAssignments.push({
          match_id: match.id,
          referee_id: refData.referee_1,
          role: 'FIRST'
        });
      }
      if (refData?.referee_2) {
        refereeAssignments.push({
          match_id: match.id,
          referee_id: refData.referee_2,
          role: 'SECOND'
        });
      }
    }

    if (refereeAssignments.length > 0) {
      const { error: refError } = await supabase
        .from('match_referees')
        .upsert(refereeAssignments, { onConflict: 'match_id,role' });

      if (refError) {
        console.log('Referee assignment warning:', refError.message);
      } else {
        console.log(`✅ Created ${refereeAssignments.length} referee assignments`);
      }
    }

    console.log('\n🔍 Step 5: Verification...');

    // Check matches for referee 151572
    const { data: referee151572Matches } = await supabase
      .from('match_referees')
      .select(`
        role,
        matches (
          vis_match_no,
          team_a_name,
          team_b_name,
          utc_datetime
        )
      `)
      .eq('referee_id', 151572)
      .eq('matches.tournament_code', tournamentCode)
      .limit(5);

    console.log(`\n✅ Success! Found ${referee151572Matches?.length || 0} matches for referee 151572 in tournament 1552:`);

    if (referee151572Matches && referee151572Matches.length > 0) {
      referee151572Matches.forEach((assignment, i) => {
        const match = assignment.matches;
        console.log(`   ${i + 1}. Match ${match.vis_match_no}: ${match.team_a_name} vs ${match.team_b_name} (${assignment.role})`);
      });

      console.log('\n🎉 PERFECT! The recent matches functionality should now work in the app!');
    } else {
      console.log('\n⚠️  No matches found for referee 151572. Check if this referee is in the data.');
    }

  } catch (error) {
    console.error('💥 Direct sync failed:', error.message);
    throw error;
  }
}

function parseMatches(xml, tournamentCode) {
  const matches = [];
  const matchRegex = /<BeachMatch([^>]*)>/g;
  let match;

  while ((match = matchRegex.exec(xml)) !== null) {
    const attributes = match[1];

    const getAttr = (name) => {
      const attrMatch = attributes.match(new RegExp(`${name}="([^"]*)"`, 'i'));
      return attrMatch ? attrMatch[1] : null;
    };

    const matchData = {
      vis_match_no: parseInt(getAttr('No') || '0'),
      event_id: parseInt(tournamentCode),
      tournament_code: tournamentCode,
      utc_datetime: parseVISDateTime(getAttr('LocalDate'), getAttr('LocalTime')),
      court: getAttr('Court'),
      status: getAttr('Status') || 'SCHEDULED',
      round_name: getAttr('Round'),
      team_a_name: getAttr('TeamAName'),
      team_b_name: getAttr('TeamBName'),
      // Store referee IDs separately for match_referees table
      _referee_1: getAttr('NoReferee1') ? parseInt(getAttr('NoReferee1')) : null,
      _referee_2: getAttr('NoReferee2') ? parseInt(getAttr('NoReferee2')) : null
    };

    if (matchData.vis_match_no && matchData.vis_match_no > 0) {
      matches.push(matchData);
    }
  }

  return matches;
}

function parseVISDateTime(date, time) {
  if (!date) return new Date().toISOString();

  let parsedDate;
  if (date.includes('-')) {
    // YYYY-MM-DD format
    parsedDate = new Date(date);
  } else if (date.includes('/')) {
    // DD/MM/YYYY format
    const [day, month, year] = date.split('/');
    parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  } else {
    parsedDate = new Date(date);
  }

  if (time && time.includes(':')) {
    const [hours, minutes] = time.split(':');
    parsedDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  }

  return parsedDate.toISOString();
}

directSync()
  .then(() => {
    console.log('\n✅ Sync complete! Test the recent matches in the app now.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  });