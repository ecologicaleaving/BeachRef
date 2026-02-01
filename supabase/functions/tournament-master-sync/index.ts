// Edge Function for Tournament Master Data Synchronization
// Runs daily at 00:00 UTC to sync tournament data from FIVB API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { FIVBAuthenticator} from './auth.ts'
import { TournamentSynchronizer, type FIVBTournament} from './sync.ts'

// TypeScript interfaces now imported from sync.ts module

interface SyncResult {
  success: boolean;
  tournamentsProcessed: number;
  insertsCount: number;
  updatesCount: number;
  errorsCount: number;
  duration: number;
  errors: string[];
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
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2
};

// Remove duplicate interface - now imported from auth.ts

serve(async (_req) => {
  try {
    console.log('Tournament Master Sync: Starting execution');
    const startTime = Date.now();

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Execute the sync process
    const result = await performTournamentSync(supabase);
    
    const duration = Date.now() - startTime;
    console.log(`Tournament Master Sync: Completed in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.success ? 'Tournament sync completed successfully' : 'Tournament sync completed with errors',
        ...result,
        duration
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: result.success ? 200 : 207 // 207 Multi-Status for partial failures
      }
    );

  } catch (error) {
    console.error('Tournament Master Sync: Critical error:', error);
    
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

async function performTournamentSync(supabase: any): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    tournamentsProcessed: 0,
    insertsCount: 0,
    updatesCount: 0,
    errorsCount: 0,
    duration: 0,
    errors: []
  };

  try {
    console.log('Retrieving FIVB API credentials from vault');
    
    // Get FIVB API credentials from Supabase vault using the auth module
    const credentials = await getFIVBCredentialsFromVault(supabase);
    if (!credentials) {
      throw new Error('Failed to retrieve FIVB API credentials');
    }
    
    // Initialize the FIVB authenticator and synchronizer
    const authenticator = new FIVBAuthenticator(credentials);
    const synchronizer = new TournamentSynchronizer(supabase);

    console.log('Fetching tournament data from FIVB API');
    
    // Fetch tournament data from FIVB API with retry logic using authenticator
    const tournaments = await fetchTournamentsWithRetry(authenticator, synchronizer);
    if (!tournaments || tournaments.length === 0) {
      console.log('No tournaments returned from FIVB API');
      result.success = true;
      return result;
    }

    console.log(`Processing ${tournaments.length} tournaments`);
    
    // Process tournaments using the synchronizer
    const syncResult = await synchronizer.processTournamentBatch(tournaments, 50);
    
    result.tournamentsProcessed = syncResult.processed;
    result.insertsCount = syncResult.inserts;
    result.updatesCount = syncResult.updates;
    result.errorsCount = syncResult.errors;
    result.errors = syncResult.errorMessages;

    // Update sync status in database
    await updateSyncStatus(supabase, result);
    
    result.success = result.errorsCount === 0;
    console.log(`Tournament sync result: ${result.tournamentsProcessed} processed, ${result.insertsCount} inserted, ${result.updatesCount} updated, ${result.errorsCount} errors`);
    
    return result;

  } catch (error) {
    console.error('Error in performTournamentSync:', error);
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

// Credential retrieval now handled by getFIVBCredentialsFromVault from auth.ts

async function fetchTournamentsWithRetry(authenticator: FIVBAuthenticator, synchronizer: TournamentSynchronizer): Promise<FIVBTournament[]> {
  for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      console.log(`Attempting to fetch tournaments (attempt ${attempt}/${retryConfig.maxRetries})`);
      
      // Try JWT authentication first
      const tournaments = await fetchTournamentsWithJWT(authenticator, synchronizer);
      if (tournaments) {
        console.log('Successfully fetched tournaments using JWT authentication');
        return tournaments;
      }
      
      // Fallback to request-level authentication
      console.log('JWT authentication failed, trying request-level authentication');
      const fallbackTournaments = await fetchTournamentsWithRequestAuth(authenticator, synchronizer);
      if (fallbackTournaments) {
        console.log('Successfully fetched tournaments using request-level authentication');
        return fallbackTournaments;
      }
      
      throw new Error('Both JWT and request-level authentication failed');
      
    } catch (error) {
      console.error(`Tournament fetch attempt ${attempt} failed:`, error);
      
      if (attempt === retryConfig.maxRetries) {
        throw new Error(`Failed to fetch tournaments after ${retryConfig.maxRetries} attempts: ${error.message}`);
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
        retryConfig.maxDelay
      );
      
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Maximum retry attempts exceeded');
}

async function fetchTournamentsWithJWT(authenticator: FIVBAuthenticator, synchronizer: TournamentSynchronizer): Promise<FIVBTournament[] | null> {
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
      body: `<Request Type="GetBeachTournamentList" />`
    });

    if (!response.ok) {
      console.error(`JWT API request failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const xmlText = await response.text();
    return synchronizer.parseXMLTournaments(xmlText);
    
  } catch (error) {
    console.error('Error in JWT authentication:', error);
    return null;
  }
}

async function fetchTournamentsWithRequestAuth(authenticator: FIVBAuthenticator, synchronizer: TournamentSynchronizer): Promise<FIVBTournament[] | null> {
  try {
    // Create authenticated XML request using authenticator
    const xmlRequest = authenticator.createAuthenticatedXMLRequest('GetBeachTournamentList');

    const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml'
      },
      body: xmlRequest
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();
    return synchronizer.parseXMLTournaments(xmlText);
    
  } catch (error) {
    console.error('Error in request-level authentication:', error);
    throw error;
  }
}

// XML parsing and data processing now handled by TournamentSynchronizer class

// Batch processing and date formatting now handled by TournamentSynchronizer class

async function updateSyncStatus(supabase: any, result: SyncResult): Promise<void> {
  try {
    const syncData = {
      last_sync: new Date().toISOString(),
      next_sync: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Next day
      success_count: result.errorsCount === 0 ? 1 : 0,
      error_count: result.errorsCount > 0 ? 1 : 0,
      last_error: result.errors.length > 0 ? result.errors[0] : null,
      last_error_time: result.errors.length > 0 ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('sync_status')
      .upsert({
        entity_type: 'tournaments',
        sync_frequency: '1 day',
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
        entity_type: 'tournaments',
        sync_frequency: '1 day',
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