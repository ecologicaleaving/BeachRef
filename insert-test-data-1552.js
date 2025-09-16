#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('🏐 Inserting Test Data for Tournament 1552');
console.log('=========================================\n');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function insertTestData() {
  try {
    console.log('🏆 Step 1: Creating tournament 1552...');

    // First create the tournament
    const { error: tournamentError } = await supabase
      .from('tournaments')
      .upsert({
        id: 1552,
        name: 'BPT Elite Hamburg',
        code: '1552'
      }, { onConflict: 'id' });

    if (tournamentError) {
      console.log('Tournament creation warning:', tournamentError.message);
    } else {
      console.log('✅ Tournament 1552 created');
    }

    console.log('\n🏆 Step 2: Creating event 1552...');

    // Then create the event
    const { error: eventError } = await supabase
      .from('events')
      .upsert({
        id: 1552,
        vis_event_no: 1552,
        event_code: '1552_M',
        tournament_id: 1552,
        name: 'BPT Elite Hamburg - Men',
        country: 'GER',
        gender: 'M',
        phase: 'Main',
        start_date: '2025-01-13',
        end_date: '2025-01-16',
        status: 'ACTIVE'
      }, { onConflict: 'id' });

    if (eventError) {
      console.log('Event creation warning:', eventError.message);
    } else {
      console.log('✅ Event 1552 (BPT Elite Hamburg) created');
    }

    console.log('\n📅 Step 3: Creating realistic match data...');

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Realistic beach volleyball matches for BPT Elite Hamburg
    const testMatches = [
      // Recent completed matches
      {
        vis_match_no: 15520001,
        event_id: 1552,
        tournament_code: '1552',
        utc_datetime: twoDaysAgo.toISOString(),
        court: 'Center Court',
        status: 'COMPLETED',
        round_name: 'Pool A',
        team_a_name: 'Ehlers/Wickler (GER)',
        team_b_name: 'Mol/Sørum (NOR)',
        result: '2-1 (21-18, 19-21, 15-12)'
      },
      {
        vis_match_no: 15520002,
        event_id: 1552,
        tournament_code: '1552',
        utc_datetime: twoDaysAgo.toISOString(),
        court: 'Court 1',
        status: 'COMPLETED',
        round_name: 'Pool A',
        team_a_name: 'Åhman/Hellvig (SWE)',
        team_b_name: 'Partain/Benesh (USA)',
        result: '2-0 (21-16, 21-19)'
      },
      {
        vis_match_no: 15520003,
        event_id: 1552,
        tournament_code: '1552',
        utc_datetime: yesterday.toISOString(),
        court: 'Center Court',
        status: 'COMPLETED',
        round_name: 'Pool B',
        team_a_name: 'Cherif/Ahmed (QAT)',
        team_b_name: 'Evandro/Arthur (BRA)',
        result: '2-1 (21-23, 21-16, 18-16)'
      },
      {
        vis_match_no: 15520004,
        event_id: 1552,
        tournament_code: '1552',
        utc_datetime: yesterday.toISOString(),
        court: 'Court 2',
        status: 'COMPLETED',
        round_name: 'Pool B',
        team_a_name: 'Perusic/Schweiner (CZE)',
        team_b_name: 'Carambula/Ranghieri (ITA)',
        result: '0-2 (18-21, 16-21)'
      },
      // Upcoming matches
      {
        vis_match_no: 15520005,
        event_id: 1552,
        tournament_code: '1552',
        utc_datetime: tomorrow.toISOString(),
        court: 'Center Court',
        status: 'SCHEDULED',
        round_name: 'Quarter Final',
        team_a_name: 'Ehlers/Wickler (GER)',
        team_b_name: 'Åhman/Hellvig (SWE)',
        result: null
      },
      {
        vis_match_no: 15520006,
        event_id: 1552,
        tournament_code: '1552',
        utc_datetime: tomorrow.toISOString(),
        court: 'Court 1',
        status: 'SCHEDULED',
        round_name: 'Quarter Final',
        team_a_name: 'Cherif/Ahmed (QAT)',
        team_b_name: 'Carambula/Ranghieri (ITA)',
        result: null
      }
    ];

    console.log(`💾 Inserting ${testMatches.length} matches...`);

    const { data: insertedMatches, error: matchError } = await supabase
      .from('matches')
      .upsert(testMatches, { onConflict: 'vis_match_no' })
      .select('id, vis_match_no');

    if (matchError) {
      throw new Error(`Failed to insert matches: ${matchError.message}`);
    }

    console.log(`✅ Inserted ${insertedMatches.length} matches`);

    console.log('\n👨‍⚖️ Step 3: Creating referee assignments...');

    // Create referee assignments for our test referee (151572)
    const refereeAssignments = insertedMatches.map((match, index) => ({
      match_id: match.id,
      referee_id: 151572, // Test referee ID from the app
      role: index % 2 === 0 ? 'FIRST' : 'SECOND' // Alternate roles
    }));

    const { error: refError } = await supabase
      .from('match_referees')
      .upsert(refereeAssignments, { onConflict: 'match_id,role' });

    if (refError) {
      throw new Error(`Failed to insert referee assignments: ${refError.message}`);
    }

    console.log(`✅ Created ${refereeAssignments.length} referee assignments for referee 151572`);

    console.log('\n🔍 Step 4: Verifying data...');

    // Verify matches
    const { data: verifyMatches } = await supabase
      .from('matches')
      .select('vis_match_no, team_a_name, team_b_name, status')
      .eq('tournament_code', '1552')
      .order('utc_datetime', { ascending: false });

    console.log(`✅ Verified: ${verifyMatches.length} matches for tournament 1552:`);
    verifyMatches.forEach(m => {
      console.log(`   - Match ${m.vis_match_no}: ${m.team_a_name} vs ${m.team_b_name} (${m.status})`);
    });

    // Verify referee assignments
    const { data: verifyRefs } = await supabase
      .from('match_referees')
      .select(`
        role,
        matches (
          vis_match_no,
          team_a_name,
          team_b_name,
          tournament_code
        )
      `)
      .eq('referee_id', 151572)
      .eq('matches.tournament_code', '1552');

    console.log(`\n✅ Verified: ${verifyRefs.length} referee assignments for referee 151572 in tournament 1552`);

    console.log('\n🎉 Test data creation completed successfully!');
    console.log('📱 You can now test the recent matches functionality in the app');

  } catch (error) {
    console.error('💥 Test data creation failed:', error.message);
    throw error;
  }
}

// Run the insertion
insertTestData()
  .then(() => {
    console.log('\n✅ Ready to test! Open the app and check referee 151572 stats for tournament 1552.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  });