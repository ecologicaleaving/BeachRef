import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { VISIntegrationClient, VISRateLimiter, VISResponseCache } from './vis-integration.ts';
import { DatabaseSyncClient } from './sync-client.ts';
import { SyncMonitor, SyncProfiler } from './monitoring.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface TournamentMigrationData {
  vis_tournament_no: number;
  tournament_code: string;
  name: string;
  country?: string;
  city?: string;
  season?: number;
  gender?: 'M' | 'W';
  type?: string;
  start_qualification?: string;
  start_main_draw?: string;
  status?: string;
}

interface VISTournamentDTO {
  id: string;
  visNo: string;
  code: string;
  name: string;
  title?: string;
  gender: 'M' | 'W' | 'MIXED';
  tournamentType: 'FIVB' | 'BPT' | 'CEV' | 'LOCAL';
  dates: {
    startDate: string;
    endDate: string;
    startDateQualification?: string;
    startDateMainDraw?: string;
  };
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  city?: string;
  country?: string;
  countryCode?: string;
  location?: string;
  NoEvent?: string;
}

interface MigrationResult {
  success: boolean;
  message: string;
  processed: number;
  inserted: number;
  updated: number;
  errors: string[];
  duplicates: number;
}

interface SyncResponse {
  success: boolean;
  message: string;
  data?: any;
  metrics?: {
    duration: number;
    recordsProcessed: number;
    errors: number;
  };
}

interface SyncStatus {
  syncId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  recordsProcessed: number;
  errors: string[];
  lastError?: string;
}

/**
 * Transform VIS Tournament DTO to database format
 */
function transformTournamentData(visTournament: VISTournamentDTO): TournamentMigrationData {
  // Parse VIS tournament number
  const visNo = parseInt(visTournament.visNo);
  if (isNaN(visNo)) {
    throw new Error(`Invalid VIS tournament number: ${visTournament.visNo}`);
  }

  // Normalize gender (exclude MIXED for database compatibility)
  let gender: 'M' | 'W' | undefined;
  if (visTournament.gender === 'M') {
    gender = 'M';
  } else if (visTournament.gender === 'W') {
    gender = 'W';
  }

  // Extract season from start date
  let season: number | undefined;
  if (visTournament.dates.startDate) {
    try {
      const startDate = new Date(visTournament.dates.startDate);
      if (!isNaN(startDate.getTime())) {
        season = startDate.getFullYear();
      }
    } catch (error) {
      console.warn(`Failed to parse start date for tournament ${visTournament.code}:`, error);
    }
  }

  // Map tournament type
  const type = visTournament.tournamentType || 'LOCAL';

  // Map status
  let status: string | undefined;
  switch (visTournament.status) {
    case 'UPCOMING':
      status = 'upcoming';
      break;
    case 'ACTIVE':
      status = 'active';
      break;
    case 'COMPLETED':
      status = 'completed';
      break;
    case 'CANCELLED':
      status = 'cancelled';
      break;
    default:
      status = 'upcoming';
  }

  // Parse qualification and main draw dates
  let startQualification: string | undefined;
  let startMainDraw: string | undefined;

  if (visTournament.dates.startDateQualification) {
    try {
      const qualDate = new Date(visTournament.dates.startDateQualification);
      if (!isNaN(qualDate.getTime())) {
        startQualification = qualDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
    } catch (error) {
      console.warn(`Invalid qualification date for ${visTournament.code}:`, error);
    }
  }

  if (visTournament.dates.startDateMainDraw) {
    try {
      const mainDrawDate = new Date(visTournament.dates.startDateMainDraw);
      if (!isNaN(mainDrawDate.getTime())) {
        startMainDraw = mainDrawDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
    } catch (error) {
      console.warn(`Invalid main draw date for ${visTournament.code}:`, error);
    }
  }

  return {
    vis_tournament_no: visNo,
    tournament_code: visTournament.code,
    name: visTournament.name,
    country: visTournament.country || visTournament.countryCode,
    city: visTournament.city,
    season,
    gender,
    type,
    start_qualification: startQualification,
    start_main_draw: startMainDraw,
    status,
  };
}

/**
 * Validate tournament data before insertion
 */
function validateTournamentData(tournament: TournamentMigrationData): string[] {
  const errors: string[] = [];

  if (!tournament.vis_tournament_no || tournament.vis_tournament_no <= 0) {
    errors.push('Invalid or missing VIS tournament number');
  }

  if (!tournament.tournament_code || tournament.tournament_code.trim().length === 0) {
    errors.push('Invalid or missing tournament code');
  }

  if (!tournament.name || tournament.name.trim().length === 0) {
    errors.push('Invalid or missing tournament name');
  }

  if (tournament.gender && !['M', 'W'].includes(tournament.gender)) {
    errors.push(`Invalid gender value: ${tournament.gender}`);
  }

  if (tournament.season && (tournament.season < 2020 || tournament.season > 2030)) {
    errors.push(`Invalid season year: ${tournament.season}`);
  }

  // Validate date formats
  if (tournament.start_qualification) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(tournament.start_qualification)) {
      errors.push('Invalid start_qualification date format');
    }
  }

  if (tournament.start_main_draw) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(tournament.start_main_draw)) {
      errors.push('Invalid start_main_draw date format');
    }
  }

  return errors;
}

/**
 * Fetch tournament data from VIS adapter
 */
async function fetchTournamentDataFromVIS(): Promise<VISTournamentDTO[]> {
  const visAdapterUrl = Deno.env.get('VIS_ADAPTER_URL') || 
    `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/functions/v1/vis-adapter`;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  try {
    console.log('Fetching tournament data from VIS adapter...');
    const response = await fetch(`${visAdapterUrl}/vis/tournaments?mode=upsert`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`VIS adapter request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid response format from VIS adapter');
    }

    console.log(`Retrieved ${data.data.length} tournaments from VIS adapter`);
    return data.data as VISTournamentDTO[];
    
  } catch (error) {
    console.error('Failed to fetch tournament data from VIS adapter:', error);
    throw new Error(`VIS adapter fetch failed: ${error.message}`);
  }
}

/**
 * Migrate tournament data to database
 */
async function migrateTournamentData(
  supabaseClient: any,
  tournaments: VISTournamentDTO[]
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    message: '',
    processed: 0,
    inserted: 0,
    updated: 0,
    errors: [],
    duplicates: 0,
  };

  console.log(`Starting migration of ${tournaments.length} tournaments...`);

  // Process tournaments in batches to avoid memory issues
  const batchSize = 50;
  const batches = Math.ceil(tournaments.length / batchSize);

  for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
    const startIndex = batchIndex * batchSize;
    const endIndex = Math.min(startIndex + batchSize, tournaments.length);
    const batch = tournaments.slice(startIndex, endIndex);

    console.log(`Processing batch ${batchIndex + 1}/${batches} (${startIndex + 1}-${endIndex})`);

    for (const visTournament of batch) {
      result.processed++;

      try {
        // Transform VIS data to database format
        const tournamentData = transformTournamentData(visTournament);

        // Validate data
        const validationErrors = validateTournamentData(tournamentData);
        if (validationErrors.length > 0) {
          result.errors.push(`Tournament ${tournamentData.tournament_code}: ${validationErrors.join(', ')}`);
          continue;
        }

        // Check if tournament already exists
        const { data: existing, error: selectError } = await supabaseClient
          .from('tournaments')
          .select('id, vis_tournament_no, updated_at')
          .eq('vis_tournament_no', tournamentData.vis_tournament_no)
          .single();

        if (selectError && selectError.code !== 'PGRST116') {
          // PGRST116 is "not found" which is expected for new records
          result.errors.push(`Failed to check existing tournament ${tournamentData.tournament_code}: ${selectError.message}`);
          continue;
        }

        if (existing) {
          // Tournament exists - update if needed
          const { error: updateError } = await supabaseClient
            .from('tournaments')
            .update({
              tournament_code: tournamentData.tournament_code,
              name: tournamentData.name,
              country: tournamentData.country,
              city: tournamentData.city,
              season: tournamentData.season,
              gender: tournamentData.gender,
              type: tournamentData.type,
              start_qualification: tournamentData.start_qualification,
              start_main_draw: tournamentData.start_main_draw,
              status: tournamentData.status,
            })
            .eq('vis_tournament_no', tournamentData.vis_tournament_no);

          if (updateError) {
            result.errors.push(`Failed to update tournament ${tournamentData.tournament_code}: ${updateError.message}`);
          } else {
            result.updated++;
            console.log(`Updated tournament: ${tournamentData.tournament_code}`);
          }
        } else {
          // New tournament - insert
          const { error: insertError } = await supabaseClient
            .from('tournaments')
            .insert([tournamentData]);

          if (insertError) {
            // Check if it's a duplicate key error
            if (insertError.code === '23505') {
              result.duplicates++;
              console.log(`Duplicate tournament skipped: ${tournamentData.tournament_code}`);
            } else {
              result.errors.push(`Failed to insert tournament ${tournamentData.tournament_code}: ${insertError.message}`);
            }
          } else {
            result.inserted++;
            console.log(`Inserted tournament: ${tournamentData.tournament_code}`);
          }
        }

      } catch (error) {
        result.errors.push(`Processing error for tournament ${visTournament.code}: ${error.message}`);
        console.error(`Error processing tournament ${visTournament.code}:`, error);
      }
    }

    // Small delay between batches to avoid overwhelming the database
    if (batchIndex < batches - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Generate final result message
  if (result.errors.length > 0) {
    result.success = false;
    result.message = `Migration completed with ${result.errors.length} errors. Processed: ${result.processed}, Inserted: ${result.inserted}, Updated: ${result.updated}, Duplicates: ${result.duplicates}`;
  } else {
    result.message = `Migration completed successfully. Processed: ${result.processed}, Inserted: ${result.inserted}, Updated: ${result.updated}, Duplicates: ${result.duplicates}`;
  }

  console.log(result.message);
  return result;
}

/**
 * Record sync status for monitoring
 */
async function recordSyncStatus(supabaseClient: any, status: SyncStatus) {
  const { error } = await supabaseClient
    .from('sync_status')
    .upsert({
      sync_id: status.syncId,
      status: status.status,
      start_time: status.startTime,
      end_time: status.endTime,
      records_processed: status.recordsProcessed,
      errors: status.errors,
      last_error: status.lastError,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'sync_id'
    });

  if (error) {
    console.error('Failed to record sync status:', error);
  }
}

/**
 * Sync matches data from VIS Adapter
 */
async function syncMatches(visAdapterUrl: string, serviceRoleKey: string, supabaseClient: any) {
  console.log('Fetching matches from VIS Adapter');
  
  const response = await fetch(`${visAdapterUrl}/vis/matches?mode=upsert`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`VIS Adapter matches request failed: ${response.status} ${response.statusText}`);
  }

  const visData = await response.json();
  console.log(`Received ${visData.data?.length || 0} matches from VIS Adapter`);

  if (!visData.success || !visData.data) {
    throw new Error(`VIS Adapter returned error: ${visData.message}`);
  }

  let recordsProcessed = 0;
  const errors: string[] = [];

  for (const match of visData.data) {
    try {
      // Create event if needed and insert match with proper event relationship
      const { error } = await supabaseClient
        .from('matches')
        .upsert({
          vis_match_no: match.visMatchNo,
          tournament_code: match.tournamentCode,
          match_no: match.matchNo,
          round_name: match.roundName,
          team1_player1: match.team1?.player1,
          team1_player2: match.team1?.player2,
          team2_player1: match.team2?.player1,
          team2_player2: match.team2?.player2,
          court: match.court,
          match_date: match.matchDate,
          match_time: match.matchTime,
          status: match.status,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'vis_match_no'
        });

      if (error) {
        console.error(`Match upsert error for ${match.visMatchNo}:`, error);
        errors.push(`Match ${match.visMatchNo}: ${error.message}`);
      } else {
        recordsProcessed++;
      }
    } catch (error) {
      console.error(`Match processing error for ${match.visMatchNo}:`, error);
      errors.push(`Match ${match.visMatchNo}: ${error.message}`);
    }
  }

  console.log(`Match sync completed: ${recordsProcessed} processed, ${errors.length} errors`);
  return { recordsProcessed, errors };
}

/**
 * Sync referees data from VIS Adapter
 */
async function syncReferees(visAdapterUrl: string, serviceRoleKey: string, supabaseClient: any) {
  console.log('Fetching referees from VIS Adapter');
  
  const response = await fetch(`${visAdapterUrl}/vis/referees?mode=upsert`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`VIS Adapter referees request failed: ${response.status} ${response.statusText}`);
  }

  const visData = await response.json();
  console.log(`Received ${visData.data?.length || 0} referees from VIS Adapter`);

  if (!visData.success || !visData.data) {
    throw new Error(`VIS Adapter returned error: ${visData.message}`);
  }

  let recordsProcessed = 0;
  const errors: string[] = [];

  for (const referee of visData.data) {
    try {
      const { error } = await supabaseClient
        .from('referees')
        .upsert({
          vis_referee_no: referee.visRefereeNo,
          first_name: referee.firstName,
          last_name: referee.lastName,
          gender: referee.gender,
          federation: referee.federation,
          birthdate: referee.birthdate,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'vis_referee_no'
        });

      if (error) {
        console.error(`Referee upsert error for ${referee.visRefereeNo}:`, error);
        errors.push(`Referee ${referee.visRefereeNo}: ${error.message}`);
      } else {
        recordsProcessed++;
      }
    } catch (error) {
      console.error(`Referee processing error for ${referee.visRefereeNo}:`, error);
      errors.push(`Referee ${referee.visRefereeNo}: ${error.message}`);
    }
  }

  console.log(`Referee sync completed: ${recordsProcessed} processed, ${errors.length} errors`);
  return { recordsProcessed, errors };
}

/**
 * Rollback migration (delete all inserted records)
 */
async function rollbackMigration(supabaseClient: any): Promise<{ success: boolean; message: string; deletedCount: number }> {
  try {
    console.log('Starting migration rollback...');
    
    // Get count before deletion
    const { count: totalCount, error: countError } = await supabaseClient
      .from('tournaments')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to count tournaments: ${countError.message}`);
    }

    // Delete all tournaments
    const { error: deleteError } = await supabaseClient
      .from('tournaments')
      .delete()
      .neq('id', 0); // Delete all records

    if (deleteError) {
      throw new Error(`Failed to delete tournaments: ${deleteError.message}`);
    }

    console.log(`Successfully deleted ${totalCount} tournaments`);

    return {
      success: true,
      message: `Rollback completed successfully. Deleted ${totalCount} tournaments.`,
      deletedCount: totalCount || 0,
    };

  } catch (error) {
    console.error('Rollback failed:', error);
    return {
      success: false,
      message: `Rollback failed: ${error.message}`,
      deletedCount: 0,
    };
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          error: 'Missing Supabase configuration',
          message: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Authentication check - require service role for all operations except health
    const authHeader = req.headers.get('Authorization');
    if (path !== '/health' && !authHeader?.includes('service_role')) {
      return new Response(
        JSON.stringify({ success: false, message: 'Service role authentication required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[${new Date().toISOString()}] ${method} ${path}`);

    // Main sync endpoint - triggers complete data synchronization
    if (path === '/sync' && method === 'POST') {
      const startTime = Date.now();
      const syncId = `sync_${Date.now()}`;
      
      try {
        // Record sync start in monitoring table
        await recordSyncStatus(supabaseClient, {
          syncId,
          status: 'running',
          startTime: new Date().toISOString(),
          recordsProcessed: 0,
          errors: []
        });

        console.log(`[${syncId}] Starting complete data synchronization`);
        
        // Get VIS Adapter base URL from environment
        const visAdapterUrl = Deno.env.get('VIS_ADAPTER_URL') || 
          `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/functions/v1/vis-adapter`;
        
        let totalRecordsProcessed = 0;
        const errors: string[] = [];

        // Initialize clients and monitoring
        const visClient = VISIntegrationClient.fromEnvironment();
        const rateLimiter = new VISRateLimiter(60); // 60 requests per minute
        const responseCache = new VISResponseCache(5); // 5-minute cache
        const syncClient = new DatabaseSyncClient(supabaseClient, 100);
        const monitor = new SyncMonitor(supabaseClient);
        const profiler = new SyncProfiler();

        // Start monitoring and profiling
        monitor.startSync(syncId);
        profiler.startProfiling(syncId);

        // Sync tournaments
        try {
          console.log(`[${syncId}] Syncing tournaments data`);
          profiler.startPhase(syncId, 'tournaments-fetch');
          
          await rateLimiter.waitIfNeeded();
          const visTournaments = await visClient.fetchTournaments();
          
          profiler.endPhase(syncId, 'tournaments-fetch');
          profiler.startPhase(syncId, 'tournaments-sync');
          
          const tournamentsResult = await syncClient.syncTournaments(visTournaments);
          totalRecordsProcessed += tournamentsResult.recordsProcessed;
          
          monitor.updateProgress(syncId, {
            recordsProcessed: totalRecordsProcessed,
            recordsInserted: tournamentsResult.recordsInserted,
            recordsUpdated: tournamentsResult.recordsUpdated,
            recordsSkipped: tournamentsResult.recordsSkipped,
            errors: tournamentsResult.errors,
          });
          
          if (tournamentsResult.errors.length > 0) {
            errors.push(...tournamentsResult.errors);
          }
          
          profiler.endPhase(syncId, 'tournaments-sync');
        } catch (error) {
          console.error(`[${syncId}] Tournament sync error:`, error);
          errors.push(`Tournament sync failed: ${error.message}`);
        }

        // Sync matches
        try {
          console.log(`[${syncId}] Syncing matches data`);
          profiler.startPhase(syncId, 'matches-fetch');
          
          await rateLimiter.waitIfNeeded();
          const visMatches = await visClient.fetchMatches();
          
          profiler.endPhase(syncId, 'matches-fetch');
          profiler.startPhase(syncId, 'matches-sync');
          
          const matchesResult = await syncClient.syncMatches(visMatches);
          totalRecordsProcessed += matchesResult.recordsProcessed;
          
          monitor.updateProgress(syncId, {
            recordsProcessed: totalRecordsProcessed,
            recordsInserted: matchesResult.recordsInserted + (monitor.getMetrics(syncId)?.recordsInserted || 0),
            recordsUpdated: matchesResult.recordsUpdated + (monitor.getMetrics(syncId)?.recordsUpdated || 0),
            recordsSkipped: matchesResult.recordsSkipped + (monitor.getMetrics(syncId)?.recordsSkipped || 0),
            errors: matchesResult.errors,
          });
          
          if (matchesResult.errors.length > 0) {
            errors.push(...matchesResult.errors);
          }
          
          profiler.endPhase(syncId, 'matches-sync');
        } catch (error) {
          console.error(`[${syncId}] Match sync error:`, error);
          errors.push(`Match sync failed: ${error.message}`);
        }

        // Sync referees
        try {
          console.log(`[${syncId}] Syncing referees data`);
          profiler.startPhase(syncId, 'referees-fetch');
          
          await rateLimiter.waitIfNeeded();
          const visReferees = await visClient.fetchReferees();
          
          profiler.endPhase(syncId, 'referees-fetch');
          profiler.startPhase(syncId, 'referees-sync');
          
          const refereesResult = await syncClient.syncReferees(visReferees);
          totalRecordsProcessed += refereesResult.recordsProcessed;
          
          monitor.updateProgress(syncId, {
            recordsProcessed: totalRecordsProcessed,
            recordsInserted: refereesResult.recordsInserted + (monitor.getMetrics(syncId)?.recordsInserted || 0),
            recordsUpdated: refereesResult.recordsUpdated + (monitor.getMetrics(syncId)?.recordsUpdated || 0),
            recordsSkipped: refereesResult.recordsSkipped + (monitor.getMetrics(syncId)?.recordsSkipped || 0),
            errors: refereesResult.errors,
          });
          
          if (refereesResult.errors.length > 0) {
            errors.push(...refereesResult.errors);
          }
          
          profiler.endPhase(syncId, 'referees-sync');
        } catch (error) {
          console.error(`[${syncId}] Referee sync error:`, error);
          errors.push(`Referee sync failed: ${error.message}`);
        }

        const endTime = Date.now();
        const duration = endTime - startTime;
        const finalStatus = errors.length === 0 ? 'completed' : 'failed';

        // Complete monitoring and profiling
        const finalMetrics = monitor.completeSync(syncId, finalStatus === 'completed', errors);
        const performanceProfile = profiler.getProfile(syncId);
        
        console.log(`[${syncId}] Sync ${finalStatus} - Duration: ${duration}ms, Records: ${totalRecordsProcessed}, Errors: ${errors.length}`);
        console.log(`[${syncId}] Performance Profile:`, performanceProfile);

        // Clean up profiler
        profiler.clearProfile(syncId);

        const response: SyncResponse = {
          success: finalStatus === 'completed',
          message: `Sync ${finalStatus}. Processed ${totalRecordsProcessed} records in ${duration}ms`,
          data: { syncId, totalRecordsProcessed, errors },
          metrics: {
            duration,
            recordsProcessed: totalRecordsProcessed,
            errors: errors.length
          }
        };

        return new Response(JSON.stringify(response), {
          status: finalStatus === 'completed' ? 200 : 207, // 207 Multi-Status for partial success
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (error) {
        console.error(`[${syncId}] Sync failed:`, error);
        
        await recordSyncStatus(supabaseClient, {
          syncId,
          status: 'failed',
          startTime: new Date(startTime).toISOString(),
          endTime: new Date().toISOString(),
          recordsProcessed: 0,
          errors: [error.message],
          lastError: error.message
        });

        return new Response(
          JSON.stringify({
            success: false,
            message: `Sync failed: ${error.message}`,
            data: { syncId, error: error.message }
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Health check endpoint
    if (path === '/health' && method === 'GET') {
      const monitor = new SyncMonitor(supabaseClient);
      const healthCheck = await monitor.performHealthCheck();
      
      return new Response(
        JSON.stringify({
          success: healthCheck.healthy,
          message: healthCheck.healthy ? 'Sync service healthy' : 'Sync service has issues',
          data: {
            serviceStatus: healthCheck.status,
            responseTime: healthCheck.responseTime,
            details: healthCheck.details,
            checks: healthCheck.checks,
            timestamp: new Date().toISOString()
          }
        }),
        {
          status: healthCheck.healthy ? 200 : 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Rollback endpoint
    if (path === '/rollback' && req.method === 'POST') {
      console.log('Starting migration rollback...');

      const rollbackResult = await rollbackMigration(supabaseClient);

      return new Response(
        JSON.stringify({
          ...rollbackResult,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: rollbackResult.success ? 200 : 500,
        }
      );
    }

    // Sync status endpoint
    if (path === '/status' && method === 'GET') {
      const { data: syncHistory } = await supabaseClient
        .from('sync_status')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(10);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Sync status retrieved',
          data: { syncHistory }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Legacy migration endpoint (for backward compatibility)
    if (path === '/migrate' && method === 'POST') {
      console.log('Legacy migration endpoint - redirecting to /sync');
      
      // Redirect to the new sync endpoint
      const syncRequest = new Request(req.url.replace('/migrate', '/sync'), {
        method: 'POST',
        headers: req.headers,
        body: req.body,
      });
      
      // Process the request as if it came to /sync
      return await fetch(syncRequest.url, {
        method: syncRequest.method,
        headers: Object.fromEntries(syncRequest.headers.entries()),
      });
    }

    // 404 for unknown endpoints
    return new Response(
      JSON.stringify({
        success: false,
        message: `Endpoint not found: ${method} ${path}`,
        data: {
          availableEndpoints: [
            'POST /sync - Trigger complete data synchronization',
            'GET /health - Service health check',
            'GET /status - Sync status and history',
            'POST /rollback - Rollback migration (legacy)',
          ]
        }
      }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Tournament migration error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});