// Edge Function for Match Schedule Synchronization
// Runs every 15 minutes (:00, :15, :30, :45) to sync match data from FIVB API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { FIVBAuthenticator, getFIVBCredentialsFromVault, type FIVBCredentials } from '../_shared/auth.ts'
import { MatchSynchronizer, type FIVBMatch, type MatchSyncResult, type ActiveTournament } from './sync.ts'
import { CacheManager } from './cache.ts'

interface SyncResult {
  success: boolean;
  tournamentsProcessed: number;
  matchesProcessed: number;
  insertsCount: number;
  updatesCount: number;
  errorsCount: number;
  duration: number;
  errors: string[];
  tournamentResults: TournamentSyncResult[];
}

interface TournamentSyncResult {
  tournamentNo: string;
  tournamentName: string;
  success: boolean;
  matchesProcessed: number;
  error?: string;
  executionTime: number;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// Retry configuration with exponential backoff
const retryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 2000, // 2 seconds
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2
};

// Performance and concurrency configuration
const BATCH_SIZE = 100;
const CONCURRENCY_LIMIT = 5;
const MAX_PROCESSING_TIME = 10 * 60 * 1000; // 10 minutes

serve(async (req) => {
  try {
    console.log('Match Schedule Sync: Starting execution');
    const startTime = Date.now();

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Execute the sync process with timeout
    const result = await Promise.race([
      performMatchScheduleSync(supabase),
      new Promise<SyncResult>((_, reject) => 
        setTimeout(() => reject(new Error('Sync timeout exceeded')), MAX_PROCESSING_TIME)
      )
    ]);
    
    const duration = Date.now() - startTime;
    console.log(`Match Schedule Sync: Completed in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.success ? 'Match schedule sync completed successfully' : 'Match schedule sync completed with errors',
        ...result,
        duration
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: result.success ? 200 : 207 // 207 Multi-Status for partial failures
      }
    );

  } catch (error) {
    console.error('Match Schedule Sync: Critical error:', error);
    
    // Try to update sync status with error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await updateSyncStatusWithError(supabase, error.message);
    } catch (statusError) {
      console.error('Failed to update sync status with critical error:', statusError);
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Critical sync failure',
        details: error.message
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function performMatchScheduleSync(supabase: any): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    tournamentsProcessed: 0,
    matchesProcessed: 0,
    insertsCount: 0,
    updatesCount: 0,
    errorsCount: 0,
    duration: 0,
    errors: [],
    tournamentResults: []
  };

  try {
    console.log('Retrieving FIVB API credentials from vault');
    
    // Get FIVB API credentials from Supabase vault
    const credentials = await getFIVBCredentialsFromVault(supabase);
    if (!credentials) {
      throw new Error('Failed to retrieve FIVB API credentials');
    }
    
    // Initialize components
    const authenticator = new FIVBAuthenticator(credentials);
    const matchSynchronizer = new MatchSynchronizer(supabase);
    const cacheManager = new CacheManager();

    console.log('Discovering active tournaments');
    
    // Discover active tournaments that need match synchronization
    const activeTournaments = await matchSynchronizer.discoverActiveTournaments();
    if (!activeTournaments || activeTournaments.length === 0) {
      console.log('No active tournaments found requiring match synchronization');
      result.success = true;
      await updateSyncStatus(supabase, result);
      return result;
    }

    console.log(`Processing match schedules for ${activeTournaments.length} active tournaments`);
    
    // Process tournaments with concurrency control
    const tournamentChunks = chunkArray(activeTournaments, CONCURRENCY_LIMIT);
    
    for (const chunk of tournamentChunks) {
      const chunkResults = await Promise.all(
        chunk.map(tournament => 
          processTournamentMatches(tournament, authenticator, matchSynchronizer, cacheManager)
        )
      );
      
      // Aggregate results
      for (const tournamentResult of chunkResults) {
        result.tournamentResults.push(tournamentResult);
        result.tournamentsProcessed++;
        
        if (tournamentResult.success) {
          result.matchesProcessed += tournamentResult.matchesProcessed;
          // Note: Insert/update counts would be aggregated from match synchronizer results
        } else {
          result.errorsCount++;
          result.errors.push(`Tournament ${tournamentResult.tournamentNo}: ${tournamentResult.error}`);
        }
      }
    }

    // Update sync status in database
    await updateSyncStatus(supabase, result);
    
    result.success = result.errorsCount === 0 || result.errorsCount < result.tournamentsProcessed / 2; // Allow up to 50% failures
    console.log(`Match schedule sync result: ${result.tournamentsProcessed} tournaments processed, ${result.matchesProcessed} matches processed, ${result.errorsCount} errors`);
    
    return result;

  } catch (error) {
    console.error('Error in performMatchScheduleSync:', error);
    result.errors.push(`Critical sync error: ${error.message}`);
    result.errorsCount++;
    
    // Try to update sync status with error
    try {
      await updateSyncStatusWithError(supabase, error.message);
    } catch (statusError) {
      console.error('Failed to update sync status with error:', statusError);
    }
    
    return result;
  }
}

async function processTournamentMatches(
  tournament: ActiveTournament,
  authenticator: FIVBAuthenticator,
  matchSynchronizer: MatchSynchronizer,
  cacheManager: CacheManager
): Promise<TournamentSyncResult> {
  const startTime = Date.now();
  
  try {
    console.log(`Processing matches for tournament ${tournament.no}: ${tournament.name}`);
    
    // Fetch match data from FIVB API with retry logic
    const matches = await fetchTournamentMatchesWithRetry(
      tournament.no, 
      authenticator, 
      matchSynchronizer
    );
    
    if (!matches || matches.length === 0) {
      console.log(`No matches found for tournament ${tournament.no}`);
      return {
        tournamentNo: tournament.no,
        tournamentName: tournament.name,
        success: true,
        matchesProcessed: 0,
        executionTime: Date.now() - startTime
      };
    }

    console.log(`Processing ${matches.length} matches for tournament ${tournament.no}`);
    
    // Process matches in batches
    const syncResult = await matchSynchronizer.processMatchBatch(matches, tournament.no, BATCH_SIZE);
    
    // Calculate and set dynamic cache TTL
    const ttl = cacheManager.calculateMatchesTTL(matches);
    console.log(`Setting cache TTL for tournament ${tournament.no}: ${ttl}`);
    
    // Setup real-time subscriptions for live matches if needed
    const liveMatches = matches.filter(m => m.Status === 'Running');
    if (liveMatches.length > 0) {
      console.log(`Setting up real-time subscriptions for ${liveMatches.length} live matches in tournament ${tournament.no}`);
      await matchSynchronizer.setupRealtimeSubscriptions(tournament.no);
    }
    
    return {
      tournamentNo: tournament.no,
      tournamentName: tournament.name,
      success: syncResult.errors === 0,
      matchesProcessed: syncResult.processed,
      error: syncResult.errors > 0 ? syncResult.errorMessages[0] : undefined,
      executionTime: Date.now() - startTime
    };

  } catch (error) {
    console.error(`Error processing tournament ${tournament.no}:`, error);
    
    return {
      tournamentNo: tournament.no,
      tournamentName: tournament.name,
      success: false,
      matchesProcessed: 0,
      error: error.message,
      executionTime: Date.now() - startTime
    };
  }
}

async function fetchTournamentMatchesWithRetry(
  tournamentNo: string,
  authenticator: FIVBAuthenticator,
  matchSynchronizer: MatchSynchronizer
): Promise<FIVBMatch[]> {
  for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      console.log(`Fetching matches for tournament ${tournamentNo} (attempt ${attempt}/${retryConfig.maxRetries})`);
      
      // Try JWT authentication first
      const matches = await fetchMatchesWithJWT(tournamentNo, authenticator, matchSynchronizer);
      if (matches) {
        console.log(`Successfully fetched ${matches.length} matches using JWT authentication`);
        return matches;
      }
      
      // Fallback to request-level authentication
      console.log('JWT authentication failed, trying request-level authentication');
      const fallbackMatches = await fetchMatchesWithRequestAuth(tournamentNo, authenticator, matchSynchronizer);
      if (fallbackMatches) {
        console.log(`Successfully fetched ${fallbackMatches.length} matches using request-level authentication`);
        return fallbackMatches;
      }
      
      throw new Error('Both JWT and request-level authentication failed');
      
    } catch (error) {
      console.error(`Tournament ${tournamentNo} fetch attempt ${attempt} failed:`, error);
      
      if (attempt === retryConfig.maxRetries) {
        throw new Error(`Failed to fetch matches for tournament ${tournamentNo} after ${retryConfig.maxRetries} attempts: ${error.message}`);
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
        retryConfig.maxDelay
      );
      
      console.log(`Retrying tournament ${tournamentNo} in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Maximum retry attempts exceeded');
}

async function fetchMatchesWithJWT(
  tournamentNo: string,
  authenticator: FIVBAuthenticator,
  matchSynchronizer: MatchSynchronizer
): Promise<FIVBMatch[] | null> {
  try {
    // Get JWT token from authenticator
    const tokenResult = await authenticator.getJWTToken();
    if (!tokenResult.success || !tokenResult.token) {
      console.error('Failed to get JWT token:', tokenResult.error);
      return null;
    }
    
    const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Authorization': `Bearer ${tokenResult.token}`
      },
      body: `<Request Type="GetBeachMatchList" TournamentNo="${tournamentNo}" />`
    });

    if (!response.ok) {
      console.error(`JWT API request failed for tournament ${tournamentNo}: ${response.status} ${response.statusText}`);
      return null;
    }

    const xmlText = await response.text();
    return matchSynchronizer.parseXMLMatches(xmlText);
    
  } catch (error) {
    console.error(`Error in JWT authentication for tournament ${tournamentNo}:`, error);
    return null;
  }
}

async function fetchMatchesWithRequestAuth(
  tournamentNo: string,
  authenticator: FIVBAuthenticator,
  matchSynchronizer: MatchSynchronizer
): Promise<FIVBMatch[] | null> {
  try {
    // Create authenticated XML request using authenticator
    const xmlRequest = authenticator.createAuthenticatedXMLRequest('GetBeachMatchList', { 
      TournamentNo: tournamentNo 
    });

    const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml'
      },
      body: xmlRequest
    });

    if (!response.ok) {
      throw new Error(`API request failed for tournament ${tournamentNo}: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();
    return matchSynchronizer.parseXMLMatches(xmlText);
    
  } catch (error) {
    console.error(`Error in request-level authentication for tournament ${tournamentNo}:`, error);
    throw error;
  }
}

async function updateSyncStatus(supabase: any, result: SyncResult): Promise<void> {
  try {
    const syncData = {
      last_sync: new Date().toISOString(),
      next_sync: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // Next 15 minutes
      success_count: result.errorsCount === 0 ? 1 : 0,
      error_count: result.errorsCount > 0 ? 1 : 0,
      last_error: result.errors.length > 0 ? result.errors[0] : null,
      last_error_time: result.errors.length > 0 ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('sync_status')
      .upsert({
        entity_type: 'matches_schedule',
        sync_frequency: '15 minutes',
        ...syncData
      }, { onConflict: 'entity_type' });

    if (error) {
      console.error('Error updating sync status:', error);
    } else {
      console.log('Sync status updated successfully');
    }
    
  } catch (error) {
    console.error('Error in updateSyncStatus:', error);
  }
}

async function updateSyncStatusWithError(supabase: any, errorMessage: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('sync_status')
      .upsert({
        entity_type: 'matches_schedule',
        sync_frequency: '15 minutes',
        error_count: 1,
        last_error: errorMessage,
        last_error_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'entity_type' });

    if (error) {
      console.error('Error updating sync status with error:', error);
    }
    
  } catch (error) {
    console.error('Error in updateSyncStatusWithError:', error);
  }
}

// Utility function to chunk arrays for batch processing
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}