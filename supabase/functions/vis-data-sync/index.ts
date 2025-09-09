import { serve } from 'std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  fetchFromVisAdapter, 
  batchUpsert, 
  calculateSyncMetrics, 
  logSyncOperation, 
  SyncStats 
} from './sync-handlers.ts';
import { 
  transformTournamentForDatabase, 
  validateTransformedTournament,
  transformMatchForDatabase,
  validateTransformedMatch,
  transformRefereeForDatabase,
  validateTransformedReferee,
  transformRefereeAssignments 
} from './data-transformers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interface for sync response
interface SyncResponse {
  success: boolean;
  synced: number;
  errors: number;
  duration: number;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing database configuration' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get VIS Adapter URL from environment or construct from current request
    const visAdapterUrl = Deno.env.get('VIS_ADAPTER_URL') || 
      `${url.protocol}//${url.host}/functions/v1/vis-adapter`;

    // Route handling
    switch (path) {
      case '/sync/tournaments':
        if (req.method === 'POST') {
          return await handleTournamentSync(supabase, visAdapterUrl);
        }
        break;

      case '/sync/matches':
        if (req.method === 'POST') {
          const tournamentCode = url.searchParams.get('tournamentCode');
          return await handleMatchSync(supabase, visAdapterUrl, tournamentCode);
        }
        break;

      case '/sync/referees':
        if (req.method === 'POST') {
          const tournamentCode = url.searchParams.get('tournamentCode');
          return await handleRefereeSync(supabase, visAdapterUrl, tournamentCode);
        }
        break;

      case '/sync/full':
        if (req.method === 'POST') {
          return await handleFullSync(supabase, visAdapterUrl);
        }
        break;

      case '/health':
        return new Response(
          JSON.stringify({
            status: 'healthy',
            service: 'vis-data-sync',
            timestamp: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );

      default:
        return new Response(
          JSON.stringify({ error: 'Endpoint not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('VIS Data Sync Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function handleTournamentSync(supabase: any, visAdapterUrl: string): Promise<Response> {
  const startTime = Date.now();
  const stats: SyncStats = { created: 0, updated: 0, errors: 0, skipped: 0 };
  
  try {
    // Fetch tournament data from VIS Adapter
    console.log('Fetching tournament data from VIS Adapter...');
    const visAdapterResponse = await fetchFromVisAdapter(`${visAdapterUrl}/vis/tournaments`);
    
    if (!Array.isArray(visAdapterResponse)) {
      throw new Error('VIS Adapter returned invalid tournament data format');
    }
    
    console.log(`Retrieved ${visAdapterResponse.length} tournaments from VIS Adapter`);
    
    // Transform VIS tournament DTOs to database format
    const transformedTournaments = [];
    for (const visTournament of visAdapterResponse) {
      try {
        const dbTournament = transformTournamentForDatabase(visTournament);
        
        if (validateTransformedTournament(dbTournament)) {
          transformedTournaments.push(dbTournament);
        } else {
          console.warn('Skipping invalid tournament data:', visTournament.code);
          stats.skipped++;
        }
      } catch (error) {
        console.error('Error transforming tournament:', visTournament.code, error);
        stats.errors++;
      }
    }
    
    if (transformedTournaments.length === 0) {
      const result = calculateSyncMetrics(startTime, stats);
      return new Response(
        JSON.stringify(result),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Batch upsert tournaments to database
    console.log(`Upserting ${transformedTournaments.length} tournaments to database...`);
    const upsertStats = await batchUpsert(
      supabase,
      'tournaments',
      transformedTournaments,
      ['vis_tournament_no'] // Conflict resolution on VIS tournament number
    );
    
    // Merge stats
    stats.created += upsertStats.created;
    stats.updated += upsertStats.updated;
    stats.errors += upsertStats.errors;
    stats.skipped += upsertStats.skipped;
    
    // Perform data consistency validation
    if (stats.created > 0 || stats.updated > 0) {
      await validateTournamentDataConsistency(supabase, visAdapterResponse, stats);
    }
    
    const result = calculateSyncMetrics(startTime, stats);
    await logSyncOperation(supabase, 'tournament-sync', result, {
      totalFromVis: visAdapterResponse.length,
      transformedCount: transformedTournaments.length,
    });
    
    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 207, // 207 Multi-Status for partial success
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    console.error('Tournament sync failed:', error);
    stats.errors++;
    
    const result = calculateSyncMetrics(startTime, stats);
    result.success = false;
    result.message = `Tournament sync failed: ${error.message}`;
    
    await logSyncOperation(supabase, 'tournament-sync', result, { error: error.message });
    
    return new Response(
      JSON.stringify(result),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

async function validateTournamentDataConsistency(supabase: any, visData: any[], stats: SyncStats): Promise<void> {
  try {
    // Sample a few tournaments for validation
    const sampleSize = Math.min(5, visData.length);
    const sampleIndices = Array.from({ length: sampleSize }, (_, i) => 
      Math.floor((i * visData.length) / sampleSize)
    );
    
    for (const index of sampleIndices) {
      const visTournament = visData[index];
      const { data: dbTournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('vis_tournament_no', parseInt(visTournament.visNo))
        .single();
      
      if (dbTournament) {
        const isConsistent = (
          dbTournament.tournament_code === visTournament.code &&
          dbTournament.name === (visTournament.name || visTournament.title)
        );
        
        if (!isConsistent) {
          console.warn('Data consistency check failed for tournament:', visTournament.code);
          // Don't increment error count for consistency warnings
        }
      }
    }
    
    console.log('Tournament data consistency validation completed');
  } catch (error) {
    console.error('Data consistency validation failed:', error);
    // Don't throw - this is a warning, not a blocking error
  }
}

async function handleMatchSync(supabase: any, visAdapterUrl: string, tournamentCode: string | null): Promise<Response> {
  const startTime = Date.now();
  const stats: SyncStats = { created: 0, updated: 0, errors: 0, skipped: 0 };
  
  if (!tournamentCode) {
    const result = calculateSyncMetrics(startTime, { ...stats, errors: 1 });
    result.message = 'Tournament code parameter is required';
    return new Response(
      JSON.stringify(result),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
  
  try {
    // First, get the tournament ID from database
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('id, vis_tournament_no, tournament_code')
      .eq('tournament_code', tournamentCode)
      .single();
    
    if (tournamentError || !tournament) {
      stats.errors++;
      const result = calculateSyncMetrics(startTime, stats);
      result.message = `Tournament not found in database: ${tournamentCode}. Run tournament sync first.`;
      return new Response(
        JSON.stringify(result),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Fetch match data from VIS Adapter
    console.log(`Fetching match data for tournament ${tournamentCode} from VIS Adapter...`);
    const visAdapterResponse = await fetchFromVisAdapter(
      `${visAdapterUrl}/vis/matches?tournamentCode=${tournamentCode}`
    );
    
    if (!Array.isArray(visAdapterResponse)) {
      throw new Error('VIS Adapter returned invalid match data format');
    }
    
    console.log(`Retrieved ${visAdapterResponse.length} matches from VIS Adapter`);
    
    // Transform and process matches
    const transformedEvents: any[] = [];
    const transformedMatches: any[] = [];
    const refereeAssignments: any[] = [];
    const eventMap = new Map<number, number>(); // VIS event no -> DB event id
    
    for (const visMatch of visAdapterResponse) {
      try {
        const transformed = transformMatchForDatabase(visMatch, tournament.id);
        
        // Handle event creation/lookup
        if (transformed.event && !eventMap.has(transformed.event.vis_event_no)) {
          // Check if event already exists
          const { data: existingEvent } = await supabase
            .from('events')
            .select('id, vis_event_no')
            .eq('vis_event_no', transformed.event.vis_event_no)
            .eq('tournament_id', tournament.id)
            .single();
          
          if (existingEvent) {
            eventMap.set(transformed.event.vis_event_no, existingEvent.id);
          } else {
            transformedEvents.push(transformed.event);
          }
        }
        
        if (validateTransformedMatch(transformed.match)) {
          transformedMatches.push(transformed.match);
          
          // Store referee assignments for later processing
          for (const assignment of transformed.refereeAssignments) {
            refereeAssignments.push({
              ...assignment,
              matchVisNo: transformed.match.vis_match_no,
            });
          }
        } else {
          console.warn('Skipping invalid match data:', visMatch.matchCode);
          stats.skipped++;
        }
      } catch (error) {
        console.error('Error transforming match:', visMatch.matchCode, error);
        stats.errors++;
      }
    }
    
    // Batch upsert events first
    if (transformedEvents.length > 0) {
      console.log(`Upserting ${transformedEvents.length} events to database...`);
      const eventStats = await batchUpsert(
        supabase,
        'events',
        transformedEvents,
        ['vis_event_no', 'tournament_id']
      );
      
      // Get event IDs for new events
      for (const event of transformedEvents) {
        const { data: newEvent } = await supabase
          .from('events')
          .select('id, vis_event_no')
          .eq('vis_event_no', event.vis_event_no)
          .eq('tournament_id', tournament.id)
          .single();
        
        if (newEvent) {
          eventMap.set(event.vis_event_no, newEvent.id);
        }
      }
    }
    
    // Update matches with event IDs
    for (const match of transformedMatches) {
      const eventId = eventMap.get(parseInt(match.vis_match_no)); // Using match vis_no as event identifier
      if (eventId) {
        match.event_id = eventId;
      }
    }
    
    // Batch upsert matches
    if (transformedMatches.length > 0) {
      console.log(`Upserting ${transformedMatches.length} matches to database...`);
      const matchStats = await batchUpsert(
        supabase,
        'matches',
        transformedMatches,
        ['vis_match_no']
      );
      
      stats.created += matchStats.created;
      stats.updated += matchStats.updated;
      stats.errors += matchStats.errors;
      stats.skipped += matchStats.skipped;
    }
    
    // Handle referee assignments
    await processRefereeAssignments(supabase, refereeAssignments, stats);
    
    // Validate data consistency
    if (stats.created > 0 || stats.updated > 0) {
      await validateMatchDataConsistency(supabase, visAdapterResponse, tournamentCode, stats);
    }
    
    const result = calculateSyncMetrics(startTime, stats);
    await logSyncOperation(supabase, 'match-sync', result, {
      tournamentCode,
      totalFromVis: visAdapterResponse.length,
      transformedMatches: transformedMatches.length,
      transformedEvents: transformedEvents.length,
    });
    
    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 207,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    console.error('Match sync failed:', error);
    stats.errors++;
    
    const result = calculateSyncMetrics(startTime, stats);
    result.success = false;
    result.message = `Match sync failed: ${error.message}`;
    
    await logSyncOperation(supabase, 'match-sync', result, { 
      tournamentCode, 
      error: error.message 
    });
    
    return new Response(
      JSON.stringify(result),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

async function processRefereeAssignments(supabase: any, assignments: any[], stats: SyncStats): Promise<void> {
  try {
    if (assignments.length === 0) return;
    
    console.log(`Processing ${assignments.length} referee assignments...`);
    
    // For now, we'll skip referee assignments until referees are synced
    // This is a chicken-and-egg problem that we'll handle in the full sync
    console.log('Referee assignments skipped - referees must be synced first');
    
  } catch (error) {
    console.error('Error processing referee assignments:', error);
    stats.errors++;
  }
}

async function validateMatchDataConsistency(
  supabase: any, 
  visData: any[], 
  tournamentCode: string, 
  stats: SyncStats
): Promise<void> {
  try {
    // Sample validation for match data consistency
    const sampleSize = Math.min(3, visData.length);
    const sampleIndices = Array.from({ length: sampleSize }, (_, i) => 
      Math.floor((i * visData.length) / sampleSize)
    );
    
    for (const index of sampleIndices) {
      const visMatch = visData[index];
      const { data: dbMatch } = await supabase
        .from('matches')
        .select('*')
        .eq('vis_match_no', parseInt(visMatch.visNo))
        .single();
      
      if (dbMatch) {
        const isConsistent = (
          dbMatch.tournament_code === visMatch.tournamentCode &&
          dbMatch.team_a_name === visMatch.team1.teamName &&
          dbMatch.team_b_name === visMatch.team2.teamName
        );
        
        if (!isConsistent) {
          console.warn('Data consistency check failed for match:', visMatch.matchCode);
        }
      }
    }
    
    console.log('Match data consistency validation completed');
  } catch (error) {
    console.error('Match data consistency validation failed:', error);
  }
}

async function handleRefereeSync(supabase: any, visAdapterUrl: string, tournamentCode: string | null): Promise<Response> {
  const startTime = Date.now();
  const stats: SyncStats = { created: 0, updated: 0, errors: 0, skipped: 0 };
  
  if (!tournamentCode) {
    const result = calculateSyncMetrics(startTime, { ...stats, errors: 1 });
    result.message = 'Tournament code parameter is required';
    return new Response(
      JSON.stringify(result),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
  
  try {
    // Verify tournament exists in database
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('id, tournament_code')
      .eq('tournament_code', tournamentCode)
      .single();
    
    if (tournamentError || !tournament) {
      stats.errors++;
      const result = calculateSyncMetrics(startTime, stats);
      result.message = `Tournament not found in database: ${tournamentCode}. Run tournament sync first.`;
      return new Response(
        JSON.stringify(result),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Fetch referee data from VIS Adapter
    console.log(`Fetching referee data for tournament ${tournamentCode} from VIS Adapter...`);
    const visAdapterResponse = await fetchFromVisAdapter(
      `${visAdapterUrl}/vis/referees?tournamentCode=${tournamentCode}`
    );
    
    if (!Array.isArray(visAdapterResponse)) {
      throw new Error('VIS Adapter returned invalid referee data format');
    }
    
    console.log(`Retrieved ${visAdapterResponse.length} referees from VIS Adapter`);
    
    // Transform referee data
    const transformedReferees: any[] = [];
    const allAssignments: any[] = [];
    
    for (const visReferee of visAdapterResponse) {
      try {
        const dbReferee = transformRefereeForDatabase(visReferee);
        
        if (validateTransformedReferee(dbReferee)) {
          transformedReferees.push(dbReferee);
          
          // Store assignments for later processing
          if (visReferee.assignments && visReferee.assignments.length > 0) {
            for (const assignment of visReferee.assignments) {
              allAssignments.push({
                ...assignment,
                refereeId: dbReferee.referee_id,
                refereeVisNo: dbReferee.vis_referee_no,
              });
            }
          }
        } else {
          console.warn('Skipping invalid referee data:', visReferee.visRefereeNo);
          stats.skipped++;
        }
      } catch (error) {
        console.error('Error transforming referee:', visReferee.visRefereeNo, error);
        stats.errors++;
      }
    }
    
    // Batch upsert referees
    if (transformedReferees.length > 0) {
      console.log(`Upserting ${transformedReferees.length} referees to database...`);
      const refereeStats = await batchUpsert(
        supabase,
        'referees',
        transformedReferees,
        ['referee_id'] // Use referee_id as conflict resolution
      );
      
      stats.created += refereeStats.created;
      stats.updated += refereeStats.updated;
      stats.errors += refereeStats.errors;
      stats.skipped += refereeStats.skipped;
    }
    
    // Process referee assignments to match_referees table
    if (allAssignments.length > 0) {
      await processRefereeAssignmentsForRefereeSync(supabase, allAssignments, stats);
    }
    
    // Calculate referee performance metrics (basic implementation)
    if (transformedReferees.length > 0) {
      await calculateRefereePerformanceMetrics(supabase, transformedReferees, tournamentCode, stats);
    }
    
    // Validate data consistency
    if (stats.created > 0 || stats.updated > 0) {
      await validateRefereeDataConsistency(supabase, visAdapterResponse, tournamentCode, stats);
    }
    
    const result = calculateSyncMetrics(startTime, stats);
    await logSyncOperation(supabase, 'referee-sync', result, {
      tournamentCode,
      totalFromVis: visAdapterResponse.length,
      transformedReferees: transformedReferees.length,
      assignments: allAssignments.length,
    });
    
    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 207,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    console.error('Referee sync failed:', error);
    stats.errors++;
    
    const result = calculateSyncMetrics(startTime, stats);
    result.success = false;
    result.message = `Referee sync failed: ${error.message}`;
    
    await logSyncOperation(supabase, 'referee-sync', result, { 
      tournamentCode, 
      error: error.message 
    });
    
    return new Response(
      JSON.stringify(result),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

async function processRefereeAssignmentsForRefereeSync(supabase: any, assignments: any[], stats: SyncStats): Promise<void> {
  try {
    if (assignments.length === 0) return;
    
    console.log(`Processing ${assignments.length} referee assignments...`);
    
    // Build match_referees records
    const matchReferees: any[] = [];
    
    for (const assignment of assignments) {
      try {
        // Find the match by match code
        const { data: match } = await supabase
          .from('matches')
          .select('id')
          .eq('vis_match_no', assignment.matchId)
          .single();
        
        // Find the referee by referee ID
        const { data: referee } = await supabase
          .from('referees')
          .select('id')
          .eq('referee_id', assignment.refereeId)
          .single();
        
        if (match && referee) {
          matchReferees.push({
            match_id: match.id,
            referee_id: referee.id,
            role: assignment.function || 'FIRST',
          });
        }
      } catch (error) {
        console.warn('Error processing referee assignment:', assignment, error);
        stats.errors++;
      }
    }
    
    // Batch upsert match_referees
    if (matchReferees.length > 0) {
      const assignmentStats = await batchUpsert(
        supabase,
        'match_referees',
        matchReferees,
        ['match_id', 'referee_id'] // Prevent duplicate assignments
      );
      
      console.log(`Successfully processed ${assignmentStats.created} referee assignments`);
    }
    
  } catch (error) {
    console.error('Error processing referee assignments:', error);
    stats.errors++;
  }
}

async function calculateRefereePerformanceMetrics(
  supabase: any, 
  referees: any[], 
  tournamentCode: string, 
  stats: SyncStats
): Promise<void> {
  try {
    // Basic performance metrics calculation
    console.log(`Calculating performance metrics for ${referees.length} referees...`);
    
    // For now, we'll just log this - more complex metrics would be calculated here
    // This could include:
    // - Number of matches assigned
    // - Performance ratings
    // - Availability trends
    // - Geographic distribution
    
    console.log('Referee performance metrics calculation completed (placeholder)');
    
  } catch (error) {
    console.error('Error calculating referee performance metrics:', error);
    // Don't increment errors - this is a nice-to-have feature
  }
}

async function validateRefereeDataConsistency(
  supabase: any, 
  visData: any[], 
  tournamentCode: string, 
  stats: SyncStats
): Promise<void> {
  try {
    // Sample validation for referee data consistency
    const sampleSize = Math.min(3, visData.length);
    const sampleIndices = Array.from({ length: sampleSize }, (_, i) => 
      Math.floor((i * visData.length) / sampleSize)
    );
    
    for (const index of sampleIndices) {
      const visReferee = visData[index];
      const { data: dbReferee } = await supabase
        .from('referees')
        .select('*')
        .eq('referee_id', visReferee.visRefereeNo)
        .single();
      
      if (dbReferee) {
        const isConsistent = (
          dbReferee.first_name === visReferee.firstName &&
          dbReferee.last_name === visReferee.lastName
        );
        
        if (!isConsistent) {
          console.warn('Data consistency check failed for referee:', visReferee.visRefereeNo);
        }
      }
    }
    
    console.log('Referee data consistency validation completed');
  } catch (error) {
    console.error('Referee data consistency validation failed:', error);
  }
}

async function handleFullSync(supabase: any, visAdapterUrl: string): Promise<Response> {
  const startTime = Date.now();
  const overallStats: SyncStats = { created: 0, updated: 0, errors: 0, skipped: 0 };
  const syncResults: any[] = [];
  
  try {
    console.log('Starting full synchronization...');
    
    // Step 1: Sync tournaments first (required for other syncs)
    console.log('Step 1: Syncing tournaments...');
    try {
      const tournamentResponse = await handleTournamentSync(supabase, visAdapterUrl);
      const tournamentResult = await tournamentResponse.json();
      syncResults.push({ step: 'tournaments', ...tournamentResult });
      
      overallStats.created += tournamentResult.synced || 0;
      overallStats.errors += tournamentResult.errors || 0;
    } catch (error) {
      console.error('Tournament sync failed in full sync:', error);
      overallStats.errors++;
      syncResults.push({
        step: 'tournaments',
        success: false,
        error: error.message,
      });
    }
    
    // Step 2: Get all tournament codes for subsequent syncs
    const { data: tournaments, error: tournamentsError } = await supabase
      .from('tournaments')
      .select('tournament_code')
      .limit(50); // Limit to avoid timeout
    
    if (tournamentsError || !tournaments || tournaments.length === 0) {
      throw new Error('No tournaments found in database after tournament sync. Cannot proceed with full sync.');
    }
    
    console.log(`Found ${tournaments.length} tournaments for detailed sync`);
    
    // Step 3: Sync matches and referees for each tournament
    const tournamentCodes = tournaments.slice(0, 10); // Limit to first 10 tournaments for performance
    
    for (const tournament of tournamentCodes) {
      const tournamentCode = tournament.tournament_code;
      
      try {
        // Sync matches for this tournament
        console.log(`Step 2.${tournamentCodes.indexOf(tournament) + 1}: Syncing matches for ${tournamentCode}...`);
        const matchResponse = await handleMatchSync(supabase, visAdapterUrl, tournamentCode);
        const matchResult = await matchResponse.json();
        syncResults.push({ step: `matches-${tournamentCode}`, ...matchResult });
        
        overallStats.created += matchResult.synced || 0;
        overallStats.errors += matchResult.errors || 0;
        
        // Sync referees for this tournament  
        console.log(`Step 3.${tournamentCodes.indexOf(tournament) + 1}: Syncing referees for ${tournamentCode}...`);
        const refereeResponse = await handleRefereeSync(supabase, visAdapterUrl, tournamentCode);
        const refereeResult = await refereeResponse.json();
        syncResults.push({ step: `referees-${tournamentCode}`, ...refereeResult });
        
        overallStats.created += refereeResult.synced || 0;
        overallStats.errors += refereeResult.errors || 0;
        
        // Check if we're approaching the 30-second limit
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime > 25000) { // 25 seconds
          console.log('Approaching time limit, stopping full sync...');
          break;
        }
        
      } catch (error) {
        console.error(`Error syncing data for tournament ${tournamentCode}:`, error);
        overallStats.errors++;
        syncResults.push({
          step: `tournament-${tournamentCode}`,
          success: false,
          error: error.message,
        });
      }
    }
    
    // Step 4: Performance optimization and monitoring
    await optimizeSyncPerformance(supabase, overallStats);
    
    const result = calculateSyncMetrics(startTime, overallStats);
    result.message = `Full sync completed: ${syncResults.length} operations executed`;
    
    await logSyncOperation(supabase, 'full-sync', result, {
      totalOperations: syncResults.length,
      tournamentsProcessed: tournamentCodes.length,
      detailedResults: syncResults,
    });
    
    return new Response(
      JSON.stringify({
        ...result,
        details: syncResults,
        tournamentsProcessed: tournamentCodes.length,
      }),
      {
        status: result.success ? 200 : 207,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    console.error('Full sync failed:', error);
    overallStats.errors++;
    
    const result = calculateSyncMetrics(startTime, overallStats);
    result.success = false;
    result.message = `Full sync failed: ${error.message}`;
    
    await logSyncOperation(supabase, 'full-sync', result, { 
      error: error.message,
      completedOperations: syncResults,
    });
    
    return new Response(
      JSON.stringify({
        ...result,
        details: syncResults,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

async function optimizeSyncPerformance(supabase: any, stats: SyncStats): Promise<void> {
  try {
    console.log('Optimizing sync performance...');
    
    // Run basic database maintenance if needed
    // This could include:
    // - VACUUM ANALYZE on key tables
    // - Updating table statistics
    // - Checking index usage
    
    // For now, we'll just log performance metrics
    console.log('Performance optimization completed', {
      totalSynced: stats.created + stats.updated,
      errorRate: stats.errors / Math.max(stats.created + stats.updated + stats.errors, 1),
    });
    
  } catch (error) {
    console.error('Performance optimization failed:', error);
    // Don't throw - this is a nice-to-have
  }
}