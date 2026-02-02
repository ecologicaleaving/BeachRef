/**
 * Database Service
 *
 * Provides type-safe CRUD operations for Supabase database.
 * Handles lazy loading persistence strategy.
 */

import { getSupabaseClient, isSupabaseAvailable } from './SupabaseClient';
import {
  mapMatchToDb,
  mapDbToMatch,
  mapTournamentToDb,
  mapDbToTournament,
  extractYearFromTournament,
  extractYearFromMatch,
} from './DatabaseMapper';
import { BeachMatchCore } from '../../types/match-v2';
import { TournamentCore } from '../../types/tournament-v2';
import { DbMatch, DbTournament, MatchQueryFilters, QueryResult } from '../../types/database';

/**
 * Database Service
 *
 * Core database operations with lazy loading strategy.
 * All methods gracefully handle Supabase unavailability.
 */
export class DatabaseService {
  private static instance: DatabaseService | null = null;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // =========================================================================
  // MATCH OPERATIONS
  // =========================================================================

  /**
   * Get matches from database with year-aware filtering
   *
   * Fixes João Pessoa bug by filtering matches by year
   *
   * @param filters - Query filters including tournament code and year
   * @returns Matches from database or empty array if not found
   */
  async getMatches(filters: MatchQueryFilters): Promise<BeachMatchCore[]> {
    if (!isSupabaseAvailable()) {
      console.log('[DatabaseService] Supabase not available, skipping DB query');
      return [];
    }

    const supabase = getSupabaseClient();
    if (!supabase) return [];

    try {
      let query = supabase
        .from('matches')
        .select('*')
        .order('utc_datetime', { ascending: false });

      // Apply tournament filter with year suffix (João Pessoa fix)
      if (filters.tournamentCode && filters.year) {
        const tournamentCodeWithYear = `${filters.tournamentCode}_${filters.year}`;
        query = query.eq('tournament_code', tournamentCodeWithYear);
      } else if (filters.tournamentCode) {
        // Fallback: filter by tournament code prefix
        query = query.like('tournament_code', `${filters.tournamentCode}%`);
      }

      // Apply date range filter (additional year safety)
      if (filters.year) {
        query = query
          .gte('utc_datetime', `${filters.year}-01-01`)
          .lte('utc_datetime', `${filters.year}-12-31`);
      }

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[DatabaseService] Failed to get matches:', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log(`[DatabaseService] No matches found in DB for filters:`, filters);
        return [];
      }

      console.log(`[DatabaseService] ✅ Found ${data.length} matches in DB for tournament ${filters.tournamentCode}`);

      // Map to domain objects
      return data.map(mapDbToMatch);
    } catch (error) {
      console.error('[DatabaseService] Error getting matches:', error);
      return [];
    }
  }

  /**
   * Save matches to database (lazy loading persistence)
   *
   * Called automatically after fetching from VIS API
   *
   * @param matches - Matches to save
   * @param eventId - Event ID for foreign key (default: 1 for now, TODO: proper event resolution)
   * @returns Success status
   */
  async saveMatches(matches: BeachMatchCore[], eventId: number = 1): Promise<boolean> {
    if (!isSupabaseAvailable()) {
      console.log('[DatabaseService] Supabase not available, skipping DB save');
      return false;
    }

    if (matches.length === 0) {
      console.log('[DatabaseService] No matches to save');
      return true;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      // Map to database schema
      const dbMatches = matches.map(match => mapMatchToDb(match, eventId));

      // Upsert with conflict resolution on vis_match_no
      const { error } = await supabase
        .from('matches')
        .upsert(dbMatches, {
          onConflict: 'vis_match_no',
          ignoreDuplicates: false, // Update existing matches
        });

      if (error) {
        console.error('[DatabaseService] Failed to save matches:', error);
        return false;
      }

      console.log(`[DatabaseService] ✅ Saved ${matches.length} matches to DB`);
      return true;
    } catch (error) {
      console.error('[DatabaseService] Error saving matches:', error);
      return false;
    }
  }

  /**
   * Delete matches by tournament (useful for cache invalidation)
   *
   * @param tournamentCode - Tournament code
   * @param year - Year filter
   * @returns Success status
   */
  async deleteMatchesByTournament(tournamentCode: string, year: number): Promise<boolean> {
    if (!isSupabaseAvailable()) {
      return false;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const tournamentCodeWithYear = `${tournamentCode}_${year}`;

      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('tournament_code', tournamentCodeWithYear);

      if (error) {
        console.error('[DatabaseService] Failed to delete matches:', error);
        return false;
      }

      console.log(`[DatabaseService] Deleted matches for tournament ${tournamentCode} year ${year}`);
      return true;
    } catch (error) {
      console.error('[DatabaseService] Error deleting matches:', error);
      return false;
    }
  }

  // =========================================================================
  // TOURNAMENT OPERATIONS
  // =========================================================================

  /**
   * Get tournament from database
   *
   * @param visNo - VIS tournament number
   * @returns Tournament or null if not found
   */
  async getTournament(visNo: string): Promise<TournamentCore | null> {
    if (!isSupabaseAvailable()) {
      return null;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('vis_no', visNo)
        .single();

      if (error || !data) {
        return null;
      }

      return mapDbToTournament(data);
    } catch (error) {
      console.error('[DatabaseService] Error getting tournament:', error);
      return null;
    }
  }

  /**
   * Save tournament to database (lazy loading persistence)
   *
   * Called automatically after fetching from VIS API
   *
   * @param tournament - Tournament to save
   * @returns Success status
   */
  async saveTournament(tournament: TournamentCore): Promise<boolean> {
    if (!isSupabaseAvailable()) {
      return false;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const dbTournament = mapTournamentToDb(tournament);

      const { error } = await supabase
        .from('tournaments')
        .upsert([dbTournament], {
          onConflict: 'vis_no',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error('[DatabaseService] Failed to save tournament:', error);
        return false;
      }

      console.log(`[DatabaseService] ✅ Saved tournament ${tournament.name} to DB`);
      return true;
    } catch (error) {
      console.error('[DatabaseService] Error saving tournament:', error);
      return false;
    }
  }

  /**
   * Save multiple tournaments to database
   *
   * @param tournaments - Tournaments to save
   * @returns Success status
   */
  async saveTournaments(tournaments: TournamentCore[]): Promise<boolean> {
    if (!isSupabaseAvailable() || tournaments.length === 0) {
      return false;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const dbTournaments = tournaments.map(mapTournamentToDb);

      const { error } = await supabase
        .from('tournaments')
        .upsert(dbTournaments, {
          onConflict: 'vis_no',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error('[DatabaseService] Failed to save tournaments:', error);
        return false;
      }

      console.log(`[DatabaseService] ✅ Saved ${tournaments.length} tournaments to DB`);
      return true;
    } catch (error) {
      console.error('[DatabaseService] Error saving tournaments:', error);
      return false;
    }
  }

  // =========================================================================
  // HEALTH & DIAGNOSTICS
  // =========================================================================

  /**
   * Check database connectivity
   */
  async checkConnection(): Promise<boolean> {
    if (!isSupabaseAvailable()) {
      return false;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('tournaments')
        .select('id')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getStatistics(): Promise<{
    tournamentCount: number;
    matchCount: number;
    refereeCount: number;
    totalSize: number;
    lastUpdate: string;
    oldestData: string;
    byYear: {
      [year: string]: {
        tournaments: number;
        matches: number;
      };
    };
  }> {
    if (!isSupabaseAvailable()) {
      return {
        tournamentCount: 0,
        matchCount: 0,
        refereeCount: 0,
        totalSize: 0,
        lastUpdate: '',
        oldestData: '',
        byYear: {},
      };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        tournamentCount: 0,
        matchCount: 0,
        refereeCount: 0,
        totalSize: 0,
        lastUpdate: '',
        oldestData: '',
        byYear: {},
      };
    }

    try {
      const [tournamentResult, matchResult, refereeResult, matchesData, tournamentsData] = await Promise.all([
        supabase.from('tournaments').select('*', { count: 'exact', head: true }),
        supabase.from('matches').select('*', { count: 'exact', head: true }),
        supabase.from('referees').select('*', { count: 'exact', head: true }),
        supabase.from('matches').select('year, updated_at').order('updated_at', { ascending: false }),
        supabase.from('tournaments').select('year, updated_at').order('updated_at', { ascending: false }),
      ]);

      // Calculate by year statistics
      const byYear: { [year: string]: { tournaments: number; matches: number } } = {};

      // Count tournaments by year
      if (tournamentsData.data) {
        tournamentsData.data.forEach((t: any) => {
          const year = t.year?.toString() || 'unknown';
          if (!byYear[year]) {
            byYear[year] = { tournaments: 0, matches: 0 };
          }
          byYear[year].tournaments++;
        });
      }

      // Count matches by year
      if (matchesData.data) {
        matchesData.data.forEach((m: any) => {
          const year = m.year?.toString() || 'unknown';
          if (!byYear[year]) {
            byYear[year] = { tournaments: 0, matches: 0 };
          }
          byYear[year].matches++;
        });
      }

      // Get last update and oldest data timestamps
      const lastUpdate = matchesData.data?.[0]?.updated_at || tournamentsData.data?.[0]?.updated_at || '';
      const oldestMatch = matchesData.data?.[matchesData.data.length - 1]?.updated_at || '';
      const oldestTournament = tournamentsData.data?.[tournamentsData.data.length - 1]?.updated_at || '';
      const oldestData = oldestMatch && oldestTournament
        ? (new Date(oldestMatch) < new Date(oldestTournament) ? oldestMatch : oldestTournament)
        : (oldestMatch || oldestTournament);

      // Estimate total size (rough approximation: avg 2KB per match, 1KB per tournament, 0.5KB per referee)
      const totalSize = (matchResult.count || 0) * 2048 + (tournamentResult.count || 0) * 1024 + (refereeResult.count || 0) * 512;

      return {
        tournamentCount: tournamentResult.count || 0,
        matchCount: matchResult.count || 0,
        refereeCount: refereeResult.count || 0,
        totalSize,
        lastUpdate,
        oldestData,
        byYear,
      };
    } catch (error) {
      console.error('[DatabaseService] Error getting statistics:', error);
      return {
        tournamentCount: 0,
        matchCount: 0,
        refereeCount: 0,
        totalSize: 0,
        lastUpdate: '',
        oldestData: '',
        byYear: {},
      };
    }
  }
}

// Export singleton instance
export const databaseService = DatabaseService.getInstance();
