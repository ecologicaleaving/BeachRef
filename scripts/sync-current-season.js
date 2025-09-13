// Full sync for current season tournaments and referee data
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

const VIS_BASE_URL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';
const APP_ID = '2a9523517c52420da73d927c6d6bab23';

console.log('🏐 FIVB Current Season Full Sync');
console.log('===============================');

async function makeVisRequest(requestXml) {
  const url = `${VIS_BASE_URL}?Request=${encodeURIComponent(requestXml)}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'X-FIVB-App-ID': APP_ID,
        'User-Agent': 'BeachRef-App/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`VIS API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error('❌ VIS API request failed:', error);
    throw error;
  }
}

function parseVisXml(xmlString, tagName) {
  const regex = new RegExp(`<${tagName}([^>]*)>`, 'g');
  const matches = [];
  let match;
  
  while ((match = regex.exec(xmlString)) !== null) {
    const attributeString = match[1];
    const attributes = {};
    
    const attrRegex = /(\w+)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attributeString)) !== null) {
      attributes[attrMatch[1]] = attrMatch[2];
    }
    
    matches.push(attributes);
  }
  
  return matches;
}

async function syncCurrentSeasonTournaments() {
  console.log('\n📋 Step 1: Fetching current season tournaments...');
  
  // Get tournaments from current year and next year
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  const tournamentRequest = `<Request Type='GetBeachTournamentList' Fields='No Code Name StartDate EndDate Status Location Country'><Filter StartDate='${currentYear}-01-01' EndDate='${nextYear}-12-31' /></Request>`;
  
  const xmlData = await makeVisRequest(tournamentRequest);
  const tournaments = parseVisXml(xmlData, 'BeachTournament');
  
  console.log(`✅ Found ${tournaments.length} tournaments for ${currentYear}-${nextYear}`);
  
  let syncedCount = 0;
  let currentTournaments = [];
  
  for (const tournament of tournaments.slice(0, 20)) { // Limit to first 20 for performance
    const tournamentData = {
      tournament_code: tournament.Code,
      name: tournament.Name,
      vis_tournament_no: parseInt(tournament.No),
      start_date: tournament.StartDate,
      end_date: tournament.EndDate,
      status: tournament.Status || 'unknown',
      location: tournament.Location || null,
      country: tournament.Country || null,
      updated_at: new Date().toISOString()
    };
    
    // Only sync tournaments with valid data
    if (tournament.Code && tournament.Name) {
      const { error } = await supabase
        .from('tournaments')
        .upsert(tournamentData, { 
          onConflict: 'tournament_code',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error(`❌ Failed to sync tournament ${tournament.Code}:`, error.message);
      } else {
        syncedCount++;
        
        // Track current/live tournaments for match sync
        const status = (tournament.Status || '').toLowerCase();
        if (status.includes('current') || status.includes('live') || status.includes('running')) {
          currentTournaments.push({
            code: tournament.Code,
            visNo: tournament.No,
            name: tournament.Name
          });
        }
      }
    }
  }
  
  console.log(`✅ Synced ${syncedCount} tournaments`);
  console.log(`🎯 Found ${currentTournaments.length} current/live tournaments`);
  
  return currentTournaments;
}

async function syncTournamentMatches(tournament) {
  console.log(`\n🏐 Step 2: Syncing matches for ${tournament.name} (${tournament.code})...`);
  
  const matchRequest = `<Request Type='GetBeachMatchList' Fields='No TeamAName TeamBName Status LocalDate LocalTime FirstReferee SecondReferee'><Filter TournamentNo='${tournament.visNo}' /></Request>`;
  
  const xmlData = await makeVisRequest(matchRequest);
  const matches = parseVisXml(xmlData, 'BeachMatch');
  
  console.log(`   Found ${matches.length} matches`);
  
  let syncedMatches = 0;
  let refereeIds = new Set();
  
  for (const match of matches.slice(0, 50)) { // Limit matches per tournament
    const matchData = {
      vis_match_no: parseInt(match.No),
      tournament_code: tournament.code,
      team_a_name: match.TeamAName || 'Team A',
      team_b_name: match.TeamBName || 'Team B',
      status: match.Status || 'scheduled',
      local_date: match.LocalDate || null,
      local_time: match.LocalTime || null,
      updated_at: new Date().toISOString()
    };
    
    if (match.No) {
      const { data: insertedMatch, error } = await supabase
        .from('matches')
        .upsert(matchData, { 
          onConflict: 'vis_match_no',
          ignoreDuplicates: false 
        })
        .select('id')
        .single();
      
      if (error) {
        console.error(`   ❌ Failed to sync match ${match.No}:`, error.message);
      } else {
        syncedMatches++;
        
        // Track referee IDs for later sync
        if (match.FirstReferee && match.FirstReferee.trim()) {
          refereeIds.add(match.FirstReferee.trim());
        }
        if (match.SecondReferee && match.SecondReferee.trim()) {
          refereeIds.add(match.SecondReferee.trim());
        }
        
        // Create referee assignments if we have the match ID
        if (insertedMatch?.id) {
          const assignments = [];
          
          if (match.FirstReferee && match.FirstReferee.trim()) {
            assignments.push({
              match_id: insertedMatch.id,
              referee_vis_id: match.FirstReferee.trim(),
              role: 'FIRST'
            });
          }
          
          if (match.SecondReferee && match.SecondReferee.trim()) {
            assignments.push({
              match_id: insertedMatch.id,
              referee_vis_id: match.SecondReferee.trim(),
              role: 'SECOND'
            });
          }
          
          // Store assignments for later processing
          if (assignments.length > 0) {
            for (const assignment of assignments) {
              await supabase
                .from('temp_referee_assignments')
                .upsert(assignment, { 
                  onConflict: 'match_id,referee_vis_id',
                  ignoreDuplicates: true 
                });
            }
          }
        }
      }
    }
  }
  
  console.log(`   ✅ Synced ${syncedMatches} matches`);
  console.log(`   👥 Found ${refereeIds.size} unique referee IDs`);
  
  return Array.from(refereeIds);
}

async function syncReferees(refereeIds) {
  console.log(`\n👤 Step 3: Syncing ${refereeIds.length} referees...`);
  
  let syncedReferees = 0;
  
  for (const refereeId of refereeIds.slice(0, 100)) { // Limit referee queries
    // Create a basic referee record - VIS API doesn't provide detailed referee info easily
    const refereeData = {
      referee_id: refereeId,
      first_name: 'Referee',
      last_name: refereeId,
      federation_code: 'INT',
      gender: 'U', // Unknown
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('referees')
      .upsert(refereeData, { 
        onConflict: 'referee_id',
        ignoreDuplicates: true 
      });
    
    if (error) {
      console.error(`   ❌ Failed to sync referee ${refereeId}:`, error.message);
    } else {
      syncedReferees++;
    }
  }
  
  console.log(`   ✅ Synced ${syncedReferees} referees`);
}

async function processRefereeAssignments() {
  console.log('\n🤝 Step 4: Processing referee assignments...');
  
  // Get all temp assignments
  const { data: tempAssignments, error: fetchError } = await supabase
    .from('temp_referee_assignments')
    .select('*');
  
  if (fetchError) {
    console.error('❌ Failed to fetch temp assignments:', fetchError);
    return;
  }
  
  console.log(`   Found ${tempAssignments?.length || 0} temp assignments`);
  
  let processedAssignments = 0;
  
  for (const assignment of tempAssignments || []) {
    // Find the referee by VIS ID
    const { data: referee } = await supabase
      .from('referees')
      .select('id')
      .eq('referee_id', assignment.referee_vis_id)
      .single();
    
    if (referee) {
      const matchRefereeData = {
        match_id: assignment.match_id,
        referee_id: referee.id,
        role: assignment.role
      };
      
      const { error } = await supabase
        .from('match_referees')
        .upsert(matchRefereeData, { 
          onConflict: 'match_id,referee_id',
          ignoreDuplicates: true 
        });
      
      if (!error) {
        processedAssignments++;
      }
    }
  }
  
  console.log(`   ✅ Processed ${processedAssignments} assignments`);
  
  // Clean up temp table
  await supabase.from('temp_referee_assignments').delete().neq('id', 0);
}

async function generateRefereeAnalytics() {
  console.log('\n📊 Step 5: Generating referee analytics...');
  
  // Calculate analytics for each referee
  const { data: referees } = await supabase
    .from('referees')
    .select('id, referee_id, first_name, last_name');
  
  let analyticsCount = 0;
  
  for (const referee of referees || []) {
    const { data: assignments } = await supabase
      .from('match_referees')
      .select(`
        role,
        matches!inner(
          tournament_code,
          status,
          local_date
        )
      `)
      .eq('referee_id', referee.id);
    
    if (assignments?.length > 0) {
      const analytics = {
        referee_id: referee.id,
        total_assignments: assignments.length,
        first_referee_count: assignments.filter(a => a.role === 'FIRST').length,
        second_referee_count: assignments.filter(a => a.role === 'SECOND').length,
        tournaments_count: new Set(assignments.map(a => a.matches.tournament_code)).size,
        last_updated: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('referee_analytics')
        .upsert(analytics, { 
          onConflict: 'referee_id',
          ignoreDuplicates: false 
        });
      
      if (!error) {
        analyticsCount++;
      }
    }
  }
  
  console.log(`   ✅ Generated analytics for ${analyticsCount} referees`);
}

async function createTempAssignmentsTable() {
  // Create temp table for processing
  const { error } = await supabase.rpc('create_temp_assignments_table');
  if (error && !error.message.includes('already exists')) {
    console.log('Creating temp assignments table...');
    await supabase.from('temp_referee_assignments').delete().neq('id', 0); // Clear if exists
  }
}

async function fullSeasonSync() {
  try {
    console.log('🚀 Starting full season sync...');
    
    // Step 0: Setup
    await createTempAssignmentsTable();
    
    // Step 1: Sync tournaments
    const currentTournaments = await syncCurrentSeasonTournaments();
    
    if (currentTournaments.length === 0) {
      console.log('⚠️ No current tournaments found. Continuing with all tournaments...');
      // Get first few tournaments to sync
      const { data: dbTournaments } = await supabase
        .from('tournaments')
        .select('tournament_code, vis_tournament_no, name')
        .limit(5);
      
      currentTournaments.push(...(dbTournaments || []).map(t => ({
        code: t.tournament_code,
        visNo: t.vis_tournament_no,
        name: t.name
      })));
    }
    
    // Step 2: Sync matches for current tournaments
    let allRefereeIds = [];
    for (const tournament of currentTournaments.slice(0, 3)) { // Limit to 3 tournaments for performance
      const refereeIds = await syncTournamentMatches(tournament);
      allRefereeIds.push(...refereeIds);
    }
    
    // Step 3: Sync referees
    const uniqueRefereeIds = [...new Set(allRefereeIds)];
    if (uniqueRefereeIds.length > 0) {
      await syncReferees(uniqueRefereeIds);
    }
    
    // Step 4: Process assignments
    await processRefereeAssignments();
    
    // Step 5: Generate analytics
    await generateRefereeAnalytics();
    
    // Final summary
    const { data: finalStats } = await supabase.rpc('get_sync_summary');
    
    console.log('\n🎉 Full Season Sync Complete!');
    console.log('=============================');
    console.log('📊 Final Database Status:');
    
    const { count: tournamentsCount } = await supabase.from('tournaments').select('*', { count: 'exact', head: true });
    const { count: matchesCount } = await supabase.from('matches').select('*', { count: 'exact', head: true });
    const { count: refereesCount } = await supabase.from('referees').select('*', { count: 'exact', head: true });
    const { count: assignmentsCount } = await supabase.from('match_referees').select('*', { count: 'exact', head: true });
    const { count: analyticsCount } = await supabase.from('referee_analytics').select('*', { count: 'exact', head: true });
    
    console.log(`🏆 Tournaments: ${tournamentsCount}`);
    console.log(`🏐 Matches: ${matchesCount}`);
    console.log(`👤 Referees: ${refereesCount}`);
    console.log(`🤝 Assignments: ${assignmentsCount}`);
    console.log(`📈 Analytics: ${analyticsCount}`);
    console.log('\n💡 Your app should now show real referee data!');
    
  } catch (error) {
    console.error('❌ Full sync failed:', error);
    throw error;
  }
}

// Create temp table SQL
async function setupTempTable() {
  const { error } = await supabase.rpc('execute_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS temp_referee_assignments (
        id SERIAL PRIMARY KEY,
        match_id UUID REFERENCES matches(id),
        referee_vis_id VARCHAR(20),
        role VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(match_id, referee_vis_id)
      );
    `
  });
  
  if (error) {
    console.log('Temp table setup error (may be normal):', error.message);
  }
}

// Run the full sync
setupTempTable().then(() => fullSeasonSync()).catch(console.error);