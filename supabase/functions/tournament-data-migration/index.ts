import { serve } from 'std/http/server.ts';
import { createClient } from 'supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  const visAdapterUrl = Deno.env.get('VIS_ADAPTER_URL') || 'http://localhost:8000';
  
  try {
    console.log('Fetching tournament data from VIS adapter...');
    const response = await fetch(`${visAdapterUrl}/vis/tournaments`, {
      method: 'GET',
      headers: {
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

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

    // Health check endpoint
    if (path === '/health' && req.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          service: 'tournament-data-migration',
          timestamp: new Date().toISOString(),
          environment: {
            supabase_configured: !!supabaseUrl,
            service_key_configured: !!supabaseServiceKey,
            vis_adapter_url: Deno.env.get('VIS_ADAPTER_URL') || 'http://localhost:8000',
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Migration endpoint
    if (path === '/migrate' && req.method === 'POST') {
      console.log('Starting tournament data migration...');

      // Fetch tournament data from VIS adapter
      const visTournaments = await fetchTournamentDataFromVIS();

      if (visTournaments.length === 0) {
        return new Response(
          JSON.stringify({
            error: 'No tournament data available',
            message: 'VIS adapter returned no tournaments',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      // Perform migration
      const migrationResult = await migrateTournamentData(supabaseClient, visTournaments);

      return new Response(
        JSON.stringify({
          ...migrationResult,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: migrationResult.success ? 200 : 500,
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

    // Status endpoint - check current database state
    if (path === '/status' && req.method === 'GET') {
      try {
        // Get tournament count and sample data
        const { count: totalCount, error: countError } = await supabaseClient
          .from('tournaments')
          .select('*', { count: 'exact', head: true });

        if (countError) {
          throw new Error(`Failed to count tournaments: ${countError.message}`);
        }

        // Get sample tournaments
        const { data: sampleTournaments, error: sampleError } = await supabaseClient
          .from('tournaments')
          .select('vis_tournament_no, tournament_code, name, country, gender, season, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        if (sampleError) {
          throw new Error(`Failed to fetch sample tournaments: ${sampleError.message}`);
        }

        // Run data validation
        const { data: validationResults, error: validationError } = await supabaseClient
          .rpc('validate_tournament_data');

        return new Response(
          JSON.stringify({
            status: 'success',
            database: {
              totalTournaments: totalCount || 0,
              sampleTournaments: sampleTournaments || [],
              validationResults: validationResults || [],
            },
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );

      } catch (error) {
        return new Response(
          JSON.stringify({
            error: 'Database status check failed',
            message: error.message,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    }

    // Route not found
    return new Response(
      JSON.stringify({
        error: 'Route not found',
        message: `${req.method} ${path} is not a valid endpoint`,
        availableEndpoints: [
          'GET /health - Health check',
          'POST /migrate - Start data migration',
          'POST /rollback - Rollback migration',
          'GET /status - Check database status',
        ],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
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