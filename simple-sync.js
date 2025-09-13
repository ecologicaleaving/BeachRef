// Simple sync script that works with current database schema
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

const VIS_BASE_URL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';

console.log('🏐 Simple VIS Sync - Current Schema Compatible');
console.log('==============================================');

async function makeVisRequest(requestXml) {
  const url = `${VIS_BASE_URL}?Request=${encodeURIComponent(requestXml)}`;
  
  try {
    const response = await fetch(url, {
      headers: {
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
    
    const attrRegex = /(\\w+)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attributeString)) !== null) {
      attributes[attrMatch[1]] = attrMatch[2];
    }
    
    matches.push(attributes);
  }
  
  return matches;
}

async function syncCurrentTournaments() {
  console.log('\\n📋 Step 1: Syncing current tournaments...');
  
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  const tournamentRequest = `<Request Type='GetBeachTournamentList' Fields='No Code Name StartDate EndDate Status'><Filter StartDate='${currentYear}-01-01' EndDate='${nextYear}-12-31' /></Request>`;
  
  const xmlData = await makeVisRequest(tournamentRequest);
  const tournaments = parseVisXml(xmlData, 'BeachTournament');
  
  console.log(`✅ Found ${tournaments.length} tournaments for ${currentYear}-${nextYear}`);
  
  let syncedCount = 0;
  let currentTournaments = [];
  
  // Get first 10 tournaments to avoid overwhelming the database
  for (const tournament of tournaments.slice(0, 10)) {
    const tournamentData = {
      tournament_code: tournament.Code,
      name: tournament.Name,
      vis_tournament_no: parseInt(tournament.No) || 0,
      start_date: tournament.StartDate,
      end_date: tournament.EndDate,
      status: tournament.Status || 'unknown',
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
  console.log(`\\n🏐 Step 2: Syncing matches for ${tournament.name}...`);
  
  const matchRequest = `<Request Type='GetBeachMatchList' Fields='No TeamAName TeamBName Status LocalDate LocalTime FirstReferee SecondReferee'><Filter TournamentNo='${tournament.visNo}' /></Request>`;
  
  const xmlData = await makeVisRequest(matchRequest);
  const matches = parseVisXml(xmlData, 'BeachMatch');
  
  console.log(`   Found ${matches.length} matches`);
  
  let syncedMatches = 0;
  let refereeNames = new Set();
  
  // Limit matches to avoid overwhelming
  for (const match of matches.slice(0, 20)) {
    const matchData = {
      vis_match_no: parseInt(match.No) || 0,
      tournament_code: tournament.code,
      team_a_name: match.TeamAName || 'Team A',
      team_b_name: match.TeamBName || 'Team B',
      status: match.Status || 'scheduled',
      utc_datetime: match.LocalDate ? `${match.LocalDate}T${match.LocalTime || '00:00'}:00Z` : null,
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
        
        // Track referee names for later processing
        if (match.FirstReferee && match.FirstReferee.trim()) {
          refereeNames.add(match.FirstReferee.trim());
        }
        if (match.SecondReferee && match.SecondReferee.trim()) {
          refereeNames.add(match.SecondReferee.trim());
        }
        
        // Create referee assignments
        if (insertedMatch?.id) {
          const assignments = [];
          
          if (match.FirstReferee && match.FirstReferee.trim()) {
            assignments.push({
              match_id: insertedMatch.id,
              referee_id: match.FirstReferee.trim(),
              role: 'FIRST'
            });
          }
          
          if (match.SecondReferee && match.SecondReferee.trim()) {
            assignments.push({
              match_id: insertedMatch.id,
              referee_id: match.SecondReferee.trim(), 
              role: 'SECOND'
            });
          }
          
          // Insert assignments
          for (const assignment of assignments) {
            const { error: assignError } = await supabase
              .from('match_referees')
              .upsert(assignment, {
                onConflict: 'match_id,referee_id',
                ignoreDuplicates: true
              });
            
            if (assignError) {
              console.error(`   ❌ Failed to create assignment:`, assignError.message);
            }
          }
        }
      }
    }
  }
  
  console.log(`   ✅ Synced ${syncedMatches} matches`);
  console.log(`   👥 Found ${refereeNames.size} unique referees`);
  
  return Array.from(refereeNames);
}

async function syncReferees(refereeNames) {
  console.log(`\\n👤 Step 3: Syncing ${refereeNames.length} referees...`);
  
  let syncedReferees = 0;
  
  for (const refereeName of refereeNames.slice(0, 50)) {
    // Split name into first and last
    const nameParts = refereeName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const refereeData = {
      referee_id: refereeName,
      first_name: firstName,
      last_name: lastName,
      federation_code: 'INT',
      gender: 'U', // Unknown
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('referees')
      .upsert(refereeData, { 
        onConflict: 'referee_id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error(`   ❌ Failed to sync referee ${refereeName}:`, error.message);
    } else {
      syncedReferees++;
    }
  }
  
  console.log(`   ✅ Synced ${syncedReferees} referees`);
}

async function generateRefereeAnalytics() {
  console.log('\\n📊 Step 4: Generating referee analytics...');
  
  // Get all referees
  const { data: referees } = await supabase
    .from('referees')
    .select('referee_id, first_name, last_name');
  
  let analyticsCount = 0;
  
  for (const referee of referees || []) {
    // Count assignments for this referee
    const { data: assignments } = await supabase
      .from('match_referees')
      .select(`
        role,
        matches!inner(
          tournament_code,
          status,
          utc_datetime
        )
      `)
      .eq('referee_id', referee.referee_id);
    
    if (assignments?.length > 0) {
      const analytics = {
        referee_id: referee.referee_id,
        date: new Date().toISOString().split('T')[0],
        total_assignments: assignments.length,
        first_referee_count: assignments.filter(a => a.role === 'FIRST').length,
        second_referee_count: assignments.filter(a => a.role === 'SECOND').length,
        challenge_referee_count: assignments.filter(a => a.role === 'CHALLENGE').length,
        tournaments_worked: [...new Set(assignments.map(a => a.matches.tournament_code))],
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('referee_analytics')
        .upsert(analytics, { 
          onConflict: 'referee_id,date',
          ignoreDuplicates: false 
        });
      
      if (!error) {
        analyticsCount++;
      }
    }
  }
  
  console.log(`   ✅ Generated analytics for ${analyticsCount} referees`);
}

async function simpleSync() {
  try {
    console.log('🚀 Starting simple VIS sync...');
    
    // Step 1: Sync tournaments
    const currentTournaments = await syncCurrentTournaments();
    
    // Step 2: Sync matches for current tournaments (limit to 2 for demo)
    let allRefereeNames = [];
    for (const tournament of currentTournaments.slice(0, 2)) {
      const refereeNames = await syncTournamentMatches(tournament);
      allRefereeNames.push(...refereeNames);
    }
    
    // If no current tournaments, use existing tournaments
    if (allRefereeNames.length === 0) {
      console.log('\\n⚠️ No current tournaments found. Using existing tournaments...');
      const { data: dbTournaments } = await supabase
        .from('tournaments')
        .select('tournament_code, vis_tournament_no, name')
        .limit(2);
      
      for (const tournament of dbTournaments || []) {
        const refereeNames = await syncTournamentMatches({
          code: tournament.tournament_code,
          visNo: tournament.vis_tournament_no,
          name: tournament.name
        });
        allRefereeNames.push(...refereeNames);
      }
    }
    
    // Step 3: Sync referees
    const uniqueRefereeNames = [...new Set(allRefereeNames)];
    if (uniqueRefereeNames.length > 0) {
      await syncReferees(uniqueRefereeNames);
    }
    
    // Step 4: Generate analytics
    await generateRefereeAnalytics();
    
    // Final summary
    console.log('\\n🎉 Simple Sync Complete!');
    console.log('========================');
    
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
    console.log('\\n💡 Your app should now show real referee data!');
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

simpleSync().catch(console.error);