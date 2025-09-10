/**
 * @fileoverview Database Sync Client for Tournament Data Migration
 * Handles all database operations for syncing VIS data to Supabase PostgreSQL
 */

import { VISTournamentDTO, VISMatchDTO, VISRefereeDTO } from './vis-integration.ts';

export interface DatabaseSyncResult {
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: string[];
}

export interface TournamentRecord {
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
  updated_at: string;
}

export interface MatchRecord {
  vis_match_no: number;
  tournament_code: string;
  event_id?: number;
  match_no?: string;
  round_name?: string;
  team1_player1?: string;
  team1_player2?: string;
  team2_player1?: string;
  team2_player2?: string;
  court?: string;
  match_date?: string;
  match_time?: string;
  status?: string;
  score_team1_set1?: number;
  score_team2_set1?: number;
  score_team1_set2?: number;
  score_team2_set2?: number;
  score_team1_set3?: number;
  score_team2_set3?: number;
  updated_at: string;
}

export interface RefereeRecord {
  vis_referee_no: number;
  first_name?: string;
  last_name?: string;
  gender?: 'M' | 'F';
  federation?: string;
  birthdate?: string;
  updated_at: string;
}

export interface EventRecord {
  tournament_code: string;
  event_no: number;
  event_name?: string;
  gender?: string;
  category?: string;
  created_at: string;
}

export class DatabaseSyncClient {
  private supabaseClient: any;
  private batchSize: number;

  constructor(supabaseClient: any, batchSize: number = 100) {
    this.supabaseClient = supabaseClient;
    this.batchSize = batchSize;
  }

  /**
   * Sync tournament data to database
   */
  async syncTournaments(tournaments: VISTournamentDTO[]): Promise<DatabaseSyncResult> {
    console.log(`Starting tournament sync for ${tournaments.length} tournaments`);
    
    const result: DatabaseSyncResult = {
      recordsProcessed: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
    };

    // Process tournaments in batches
    const batches = this.createBatches(tournaments, this.batchSize);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing tournament batch ${batchIndex + 1}/${batches.length} (${batch.length} records)`);
      
      for (const visTournament of batch) {
        result.recordsProcessed++;
        
        try {
          const tournamentRecord = this.transformTournament(visTournament);
          const syncResult = await this.upsertTournament(tournamentRecord);
          
          if (syncResult.inserted) {
            result.recordsInserted++;
          } else if (syncResult.updated) {
            result.recordsUpdated++;
          } else {
            result.recordsSkipped++;
          }
          
        } catch (error) {
          console.error(`Tournament sync error for ${visTournament.code}:`, error);
          result.errors.push(`Tournament ${visTournament.code}: ${error.message}`);
        }
      }
    }

    console.log(`Tournament sync completed: ${result.recordsProcessed} processed, ${result.recordsInserted} inserted, ${result.recordsUpdated} updated, ${result.errors.length} errors`);
    return result;
  }

  /**
   * Sync match data to database
   */
  async syncMatches(matches: VISMatchDTO[]): Promise<DatabaseSyncResult> {
    console.log(`Starting match sync for ${matches.length} matches`);
    
    const result: DatabaseSyncResult = {
      recordsProcessed: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
    };

    // Process matches in batches
    const batches = this.createBatches(matches, this.batchSize);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing match batch ${batchIndex + 1}/${batches.length} (${batch.length} records)`);
      
      for (const visMatch of batch) {
        result.recordsProcessed++;
        
        try {
          // Ensure event exists for the match
          const eventId = await this.ensureEventExists(visMatch);
          
          if (!eventId) {
            result.errors.push(`Match ${visMatch.visMatchNo}: Failed to create or find event`);
            continue;
          }
          
          const matchRecord = this.transformMatch(visMatch, eventId);
          const syncResult = await this.upsertMatch(matchRecord);
          
          if (syncResult.inserted) {
            result.recordsInserted++;
          } else if (syncResult.updated) {
            result.recordsUpdated++;
          } else {
            result.recordsSkipped++;
          }
          
        } catch (error) {
          console.error(`Match sync error for ${visMatch.visMatchNo}:`, error);
          result.errors.push(`Match ${visMatch.visMatchNo}: ${error.message}`);
        }
      }
    }

    console.log(`Match sync completed: ${result.recordsProcessed} processed, ${result.recordsInserted} inserted, ${result.recordsUpdated} updated, ${result.errors.length} errors`);
    return result;
  }

  /**
   * Sync referee data to database
   */
  async syncReferees(referees: VISRefereeDTO[]): Promise<DatabaseSyncResult> {
    console.log(`Starting referee sync for ${referees.length} referees`);
    
    const result: DatabaseSyncResult = {
      recordsProcessed: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
    };

    // Process referees in batches
    const batches = this.createBatches(referees, this.batchSize);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing referee batch ${batchIndex + 1}/${batches.length} (${batch.length} records)`);
      
      for (const visReferee of batch) {
        result.recordsProcessed++;
        
        try {
          const refereeRecord = this.transformReferee(visReferee);
          const syncResult = await this.upsertReferee(refereeRecord);
          
          if (syncResult.inserted) {
            result.recordsInserted++;
          } else if (syncResult.updated) {
            result.recordsUpdated++;
          } else {
            result.recordsSkipped++;
          }
          
        } catch (error) {
          console.error(`Referee sync error for ${visReferee.visRefereeNo}:`, error);
          result.errors.push(`Referee ${visReferee.visRefereeNo}: ${error.message}`);
        }
      }
    }

    console.log(`Referee sync completed: ${result.recordsProcessed} processed, ${result.recordsInserted} inserted, ${result.recordsUpdated} updated, ${result.errors.length} errors`);
    return result;
  }

  /**
   * Transform VIS tournament data to database format
   */
  private transformTournament(visTournament: VISTournamentDTO): TournamentRecord {
    const visNo = parseInt(visTournament.visNo);
    if (isNaN(visNo)) {
      throw new Error(`Invalid VIS tournament number: ${visTournament.visNo}`);
    }

    // Normalize gender (exclude MIXED for database compatibility)
    let gender: 'M' | 'W' | undefined;
    if (visTournament.gender === 'M' || visTournament.gender === 'W') {
      gender = visTournament.gender;
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

    // Parse qualification and main draw dates
    let startQualification: string | undefined;
    let startMainDraw: string | undefined;

    if (visTournament.dates.startDateQualification) {
      try {
        const qualDate = new Date(visTournament.dates.startDateQualification);
        if (!isNaN(qualDate.getTime())) {
          startQualification = qualDate.toISOString().split('T')[0];
        }
      } catch (error) {
        console.warn(`Invalid qualification date for ${visTournament.code}:`, error);
      }
    }

    if (visTournament.dates.startDateMainDraw) {
      try {
        const mainDrawDate = new Date(visTournament.dates.startDateMainDraw);
        if (!isNaN(mainDrawDate.getTime())) {
          startMainDraw = mainDrawDate.toISOString().split('T')[0];
        }
      } catch (error) {
        console.warn(`Invalid main draw date for ${visTournament.code}:`, error);
      }
    }

    // Map status
    const statusMap = {
      'UPCOMING': 'upcoming',
      'ACTIVE': 'active',
      'COMPLETED': 'completed',
      'CANCELLED': 'cancelled',
    };

    return {
      vis_tournament_no: visNo,
      tournament_code: visTournament.code,
      name: visTournament.name,
      country: visTournament.country || visTournament.countryCode,
      city: visTournament.city,
      season,
      gender,
      type: visTournament.tournamentType,
      start_qualification: startQualification,
      start_main_draw: startMainDraw,
      status: statusMap[visTournament.status] || 'upcoming',
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Transform VIS match data to database format
   */
  private transformMatch(visMatch: VISMatchDTO, eventId: number): MatchRecord {
    return {
      vis_match_no: visMatch.visMatchNo,
      tournament_code: visMatch.tournamentCode,
      event_id: eventId,
      match_no: visMatch.matchNo,
      round_name: visMatch.roundName,
      team1_player1: visMatch.team1?.player1,
      team1_player2: visMatch.team1?.player2,
      team2_player1: visMatch.team2?.player1,
      team2_player2: visMatch.team2?.player2,
      court: visMatch.court,
      match_date: visMatch.matchDate,
      match_time: visMatch.matchTime,
      status: visMatch.status,
      score_team1_set1: visMatch.scoreTeam1Set1,
      score_team2_set1: visMatch.scoreTeam2Set1,
      score_team1_set2: visMatch.scoreTeam1Set2,
      score_team2_set2: visMatch.scoreTeam2Set2,
      score_team1_set3: visMatch.scoreTeam1Set3,
      score_team2_set3: visMatch.scoreTeam2Set3,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Transform VIS referee data to database format
   */
  private transformReferee(visReferee: VISRefereeDTO): RefereeRecord {
    return {
      vis_referee_no: visReferee.visRefereeNo,
      first_name: visReferee.firstName,
      last_name: visReferee.lastName,
      gender: visReferee.gender,
      federation: visReferee.federation,
      birthdate: visReferee.birthdate,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Upsert tournament record
   */
  private async upsertTournament(tournament: TournamentRecord): Promise<{ inserted: boolean; updated: boolean }> {
    // Check if tournament exists
    const { data: existing, error: selectError } = await this.supabaseClient
      .from('tournaments')
      .select('id, updated_at')
      .eq('vis_tournament_no', tournament.vis_tournament_no)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      throw new Error(`Failed to check existing tournament: ${selectError.message}`);
    }

    const { error: upsertError } = await this.supabaseClient
      .from('tournaments')
      .upsert(tournament, {
        onConflict: 'vis_tournament_no',
      });

    if (upsertError) {
      throw new Error(`Failed to upsert tournament: ${upsertError.message}`);
    }

    return {
      inserted: !existing,
      updated: !!existing,
    };
  }

  /**
   * Upsert match record
   */
  private async upsertMatch(match: MatchRecord): Promise<{ inserted: boolean; updated: boolean }> {
    // Check if match exists
    const { data: existing, error: selectError } = await this.supabaseClient
      .from('matches')
      .select('id, updated_at')
      .eq('vis_match_no', match.vis_match_no)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      throw new Error(`Failed to check existing match: ${selectError.message}`);
    }

    const { error: upsertError } = await this.supabaseClient
      .from('matches')
      .upsert(match, {
        onConflict: 'vis_match_no',
      });

    if (upsertError) {
      throw new Error(`Failed to upsert match: ${upsertError.message}`);
    }

    return {
      inserted: !existing,
      updated: !!existing,
    };
  }

  /**
   * Upsert referee record
   */
  private async upsertReferee(referee: RefereeRecord): Promise<{ inserted: boolean; updated: boolean }> {
    // Check if referee exists
    const { data: existing, error: selectError } = await this.supabaseClient
      .from('referees')
      .select('id, updated_at')
      .eq('vis_referee_no', referee.vis_referee_no)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      throw new Error(`Failed to check existing referee: ${selectError.message}`);
    }

    const { error: upsertError } = await this.supabaseClient
      .from('referees')
      .upsert(referee, {
        onConflict: 'vis_referee_no',
      });

    if (upsertError) {
      throw new Error(`Failed to upsert referee: ${upsertError.message}`);
    }

    return {
      inserted: !existing,
      updated: !!existing,
    };
  }

  /**
   * Ensure event exists for a match, create if necessary
   */
  private async ensureEventExists(visMatch: VISMatchDTO): Promise<number | null> {
    // Check if event exists
    const { data: event, error: eventError } = await this.supabaseClient
      .from('events')
      .select('id')
      .eq('tournament_code', visMatch.tournamentCode)
      .eq('event_no', visMatch.eventNo)
      .single();

    if (event) {
      return event.id;
    }

    if (eventError && eventError.code !== 'PGRST116') {
      throw new Error(`Failed to check existing event: ${eventError.message}`);
    }

    // Create the event
    const eventRecord: EventRecord = {
      tournament_code: visMatch.tournamentCode,
      event_no: visMatch.eventNo,
      event_name: visMatch.eventName || `Event ${visMatch.eventNo}`,
      gender: visMatch.gender,
      category: visMatch.category,
      created_at: new Date().toISOString(),
    };

    const { data: newEvent, error: createEventError } = await this.supabaseClient
      .from('events')
      .insert(eventRecord)
      .select('id')
      .single();

    if (createEventError) {
      throw new Error(`Failed to create event: ${createEventError.message}`);
    }

    console.log(`Created new event ${visMatch.eventNo} for tournament ${visMatch.tournamentCode}`);
    return newEvent.id;
  }

  /**
   * Get database statistics for monitoring
   */
  async getDatabaseStats(): Promise<{
    tournaments: number;
    events: number;
    matches: number;
    referees: number;
    lastSync: string | null;
  }> {
    const [tournaments, events, matches, referees, lastSync] = await Promise.all([
      this.getTableCount('tournaments'),
      this.getTableCount('events'),
      this.getTableCount('matches'),
      this.getTableCount('referees'),
      this.getLastSyncTime(),
    ]);

    return {
      tournaments,
      events,
      matches,
      referees,
      lastSync,
    };
  }

  /**
   * Validate data integrity across related tables
   */
  async validateDataIntegrity(): Promise<{
    orphanedMatches: number;
    missingTournamentRefs: number;
    duplicateVisNumbers: number;
  }> {
    // Check for matches without valid events
    const { count: orphanedMatches } = await this.supabaseClient
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .not('event_id', 'in', `(SELECT id FROM events)`);

    // Check for events without valid tournaments
    const { count: missingTournamentRefs } = await this.supabaseClient
      .from('events')
      .select('id', { count: 'exact', head: true })
      .not('tournament_id', 'in', `(SELECT id FROM tournaments)`);

    // Check for duplicate VIS numbers
    const { data: duplicateChecks } = await this.supabaseClient
      .rpc('validate_tournament_data');

    const duplicateVisNumbers = duplicateChecks?.reduce((total: number, check: any) => {
      return total + (check.validation_result.includes('duplicate') ? check.record_count : 0);
    }, 0) || 0;

    return {
      orphanedMatches: orphanedMatches || 0,
      missingTournamentRefs: missingTournamentRefs || 0,
      duplicateVisNumbers,
    };
  }

  /**
   * Get record count for a table
   */
  private async getTableCount(tableName: string): Promise<number> {
    const { count, error } = await this.supabaseClient
      .from(tableName)
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.warn(`Failed to get count for table ${tableName}:`, error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Get timestamp of last successful sync
   */
  private async getLastSyncTime(): Promise<string | null> {
    const { data, error } = await this.supabaseClient
      .from('sync_status')
      .select('end_time')
      .eq('status', 'completed')
      .order('end_time', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data.end_time;
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    return batches;
  }
}