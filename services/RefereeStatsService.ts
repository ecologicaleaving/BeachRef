/**
 * @fileoverview RefereeStatsService - Conservative approach for referee statistics
 * Uses reliable tournament-based queries and client-side filtering
 * Avoids VIS API referee filtering issues that return excessive match counts
 */

import { VisApiClient } from './api/VisApiClient';
import { LocalStorageManager } from './LocalStorageManager';
import { RefereeDirectoryService } from './RefereeDirectoryService';
import { CacheServiceCompatibility as CacheService } from '../hooks/compatibility/CacheServiceCompatibility';
import type { GetBeachMatchListRequest, GetEventRefereeListRequest, VisApiResponse } from '../types/api-v2';

/**
 * Field list the stats parser reads (issue #47).
 *
 * Identical, name for name, to the `Fields=` attribute the six raw `fetch`
 * calls this service used to build by hand. It is passed explicitly to
 * {@link VisApiClient.getBeachMatchList} because the client's default set does
 * not carry `TournamentGender` (men/women split), `LocalDateTime` (season
 * filtering) or `Code`.
 */
const STATS_MATCH_FIELDS: readonly string[] = [
  'No', 'Code', 'NoEvent', 'NoInTournament', 'TournamentName', 'TournamentGender',
  'LocalDateTime', 'LocalDate', 'LocalTime', 'Court', 'RoundCode', 'Phase', 'Status',
  'NoReferee1', 'NoReferee2', 'Referee1Name', 'Referee2Name',
  'TeamAName', 'TeamBName', 'TeamAFederationCode', 'TeamBFederationCode',
  'PointsTeamASet1', 'PointsTeamBSet1', 'PointsTeamASet2', 'PointsTeamBSet2',
  'PointsTeamASet3', 'PointsTeamBSet3',
  'Referee1FederationCode', 'Referee2FederationCode'
];

/** `Fields=` of the two name-resolution requests, unchanged from the raw calls. */
const STATS_REFEREE_FIELDS: readonly string[] = [
  'NoReferee', 'FirstName', 'LastName', 'FederationCode', 'Status', 'Role'
];

/**
 * Subset of {@link VisApiClient} this service needs (issue #47). Declaring it
 * explicitly is what makes the six requests testable on fixtures.
 */
export interface RefereeStatsApiClient {
  getBeachMatchList(request: GetBeachMatchListRequest): Promise<VisApiResponse>;
  getEventRefereeList(request: GetEventRefereeListRequest): Promise<VisApiResponse>;
}

// Compatibility helpers to avoid reliance on class static methods when bundlers inline/hoist differently
function parseMatchesFromVISXMLCompat(xmlData: string, refereeRole: 'first' | 'second'): any[] {
  const matches: any[] = [];
  try {
    const matchRegex = /<BeachMatch[^>]*\/?>/g;
    const matchEntries = [...xmlData.matchAll(matchRegex)];
    for (const [matchEntry] of matchEntries) {
      const match: any = { refereeRole };
      const attributes = ['No', 'Code', 'NoEvent', 'NoInTournament', 'TournamentName', 'TournamentGender', 'LocalDateTime', 'LocalDate', 'LocalTime', 'Court', 'RoundCode', 'Phase', 'Status', 'NoReferee1', 'NoReferee2', 'Referee1Name', 'Referee2Name', 'TeamAName', 'TeamBName', 'TeamAFederationCode', 'TeamBFederationCode', 'PointsTeamASet1', 'PointsTeamBSet1', 'PointsTeamASet2', 'PointsTeamBSet2', 'PointsTeamASet3', 'PointsTeamBSet3', 'Referee1FederationCode', 'Referee2FederationCode'];
      for (const attr of attributes) {
        const regex = new RegExp(`${attr}="([^"]*)"`);
        const mr = matchEntry.match(regex);
        if (mr) match[attr] = mr[1];
      }
      const tg = (match.TournamentGender || '').toString().trim().toUpperCase();
      const tournamentGender = tg.startsWith('W') || tg.startsWith('F') ? 'W' : (tg.startsWith('M') ? 'M' : '');
      const gender = tournamentGender === 'W' ? 'women' : (tournamentGender === 'M' ? 'men' : '');
      matches.push({
        matchId: match.No || match.Code || `${match.NoEvent}_${match.LocalDateTime}`,
        refereeRole,
        gender,
        tournamentGender,
        NoInTournament: match.NoInTournament,
        noInTournament: match.NoInTournament,
        LocalDate: match.LocalDate,
        LocalTime: match.LocalTime,
        localDate: match.LocalDate,
        localTime: match.LocalTime,
        NoReferee1: match.NoReferee1,
        NoReferee2: match.NoReferee2,
        noReferee1: match.NoReferee1,
        noReferee2: match.NoReferee2,
        Referee1Name: match.Referee1Name,
        Referee2Name: match.Referee2Name,
        referee1Name: match.Referee1Name,
        referee2Name: match.Referee2Name,
        TeamAName: match.TeamAName,
        TeamBName: match.TeamBName,
        teamAName: match.TeamAName,
        teamBName: match.TeamBName,
        TeamAFederationCode: match.TeamAFederationCode,
        TeamBFederationCode: match.TeamBFederationCode,
        teamAFederationCode: match.TeamAFederationCode,
        teamBFederationCode: match.TeamBFederationCode,
        PointsTeamASet1: match.PointsTeamASet1,
        PointsTeamBSet1: match.PointsTeamBSet1,
        PointsTeamASet2: match.PointsTeamASet2,
        PointsTeamBSet2: match.PointsTeamBSet2,
        PointsTeamASet3: match.PointsTeamASet3,
        PointsTeamBSet3: match.PointsTeamBSet3,
        pointsTeamASet1: match.PointsTeamASet1,
        pointsTeamBSet1: match.PointsTeamBSet1,
        pointsTeamASet2: match.PointsTeamASet2,
        pointsTeamBSet2: match.PointsTeamBSet2,
        pointsTeamASet3: match.PointsTeamASet3,
        pointsTeamBSet3: match.PointsTeamBSet3,
        Referee1FederationCode: match.Referee1FederationCode,
        Referee2FederationCode: match.Referee2FederationCode,
        referee1FederationCode: match.Referee1FederationCode,
        referee2FederationCode: match.Referee2FederationCode,
        rawMatch: match,
      });
    }
  } catch {}
  return matches;
}

function deduplicateMatchesByIdCompat(matches: any[]): any[] {
  const seen = new Set<string>();
  const unique: any[] = [];
  for (const m of matches) {
    const id = m?.matchId || m?.rawMatch?.No || '';
    if (id && !seen.has(id)) { seen.add(id); unique.push(m); }
  }
  return unique;
}

function calculateStatsFromParsedMatchesCompat(matches: any[]): RefereeStats {
  const stats: RefereeStats = {
    totalMatches: matches.length,
    matchesAsFirst: 0,
    matchesAsSecond: 0,
    menMatches: 0,
    womenMatches: 0,
  };
  for (const m of matches) {
    if (m?.refereeRole === 'first') stats.matchesAsFirst++;
    else if (m?.refereeRole === 'second') stats.matchesAsSecond++;
    // Prefer raw VIS flag if present (1 = women, 0 = men)
    const raw = (m?.rawMatch?.TournamentGender ?? '').toString().trim();
    if (raw === '1') stats.womenMatches++;
    else if (raw === '0') stats.menMatches++;
    else {
      const tg = (m?.tournamentGender ?? '').toString().toUpperCase();
      if (tg === 'W') stats.womenMatches++;
      else if (tg === 'M') stats.menMatches++;
      else if ((m?.gender || '').toString().toLowerCase() === 'women') stats.womenMatches++;
      else stats.menMatches++;
    }
  }
  return stats;
}

export interface RefereeStats {
  totalMatches: number;
  matchesAsFirst: number;
  matchesAsSecond: number;
  menMatches: number;
  womenMatches: number;
}

export interface SeasonStats extends RefereeStats {
  season: string;
  averageRating?: number;
  tournaments: number;
  firstTournamentDate?: string;
  lastTournamentDate?: string;
}

export interface CareerStats extends RefereeStats {
  yearsActive: number;
  totalTournaments: number;
  averageRating?: number;
  specializations?: string[];
  achievements?: string[];
  firstTournamentDate?: string;
  lastTournamentDate?: string;
  seasonsActive: string[];
}

export interface RefereeMatch {
  matchId: string;
  court: string;
  round: string;
  status: string;
  dateTime: string;
  refereeRole: 'first' | 'second';
  gender: 'M' | 'W';
  referees: {
    referee1: {
      id: string;
      name: string;
    };
    referee2: {
      id: string;
      name: string;
    };
  };
  teams: {
    team1: {
      name: string;
      countryCode: string;
      players?: string[];
    };
    team2: {
      name: string;
      countryCode: string;
      players?: string[];
    };
  };
}

export interface EnhancedTournamentStats {
  stats: RefereeStats;
  recentMatches: RefereeMatch[]; // Keep interface for UI compatibility
}

interface TournamentRefereeData {
  tournamentVisNo: string;
  tournamentName: string;
  startDate: string;
  endDate: string;
  matches: Array<{
    matchId: string;
    position: 'first' | 'second';
    gender: 'men' | 'women';
    matchDate?: string;
  }>;
}

export class RefereeStatsService {
  private static readonly CACHE_PREFIX = 'referee_stats';
  private static readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly CURRENT_SEASON = new Date().getFullYear().toString();
  private static localStorage = new LocalStorageManager(1); // 1 day max age
  private static visApiClient: RefereeStatsApiClient;

  /**
   * Override the VIS client — tests, or a caller that already owns one.
   * Pass `null` to go back to the default (issue #47).
   *
   * Exists so the six requests this service issues can be exercised on
   * fixtures, without a network and without stubbing `global.fetch`.
   */
  static setVisApiClient(client: RefereeStatsApiClient | null): void {
    RefereeStatsService.visApiClient = client as RefereeStatsApiClient;
  }

  /**
   * Initialize the service with VIS API client
   */
  private static getVisApiClient(): RefereeStatsApiClient {
    if (!RefereeStatsService.visApiClient) {
      RefereeStatsService.visApiClient = new VisApiClient({
        baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
        timeoutMs: 10000,
        maxRetries: 2,
        retryDelayMs: 1000,
        enableLogging: true,
        // No custom headers on purpose: any header outside the CORS safelist makes
        // the POST non-simple, and the VIS preflight is not cacheable — every
        // request would cost two round trips. See VisApiClientConfig.headers (#67).
        exponentialBackoff: true
      });
    }
    return RefereeStatsService.visApiClient;
  }

  /**
   * Resolve referee full name from event roster given NoReferee and NoEvent
   *
   * Issue #47: served by {@link RefereeDirectoryService.getEventReferees}, whose
   * field list is a superset of the one this method used to request by hand and
   * whose result is cached per event — so the several stats panels a screen
   * opens for the same tournament now share a single `GetEventRefereeList`.
   */
  private static async resolveRefereeNameFromEvent(
    tournamentNo: string,
    refereeNo: string
  ): Promise<{ firstName: string; lastName: string } | null> {
    try {
      const { referees } = await RefereeDirectoryService.getEventReferees(tournamentNo);
      const wanted = refereeNo.toString().trim();
      const found = referees.find(referee => referee.RefereeId.toString().trim() === wanted);
      return found ? { firstName: found.firstName, lastName: found.lastName } : null;
    } catch {
      return null;
    }
  }

  /**
   * Get season statistics for a referee using proper VIS API with Season + NoReferee filters
   */
  static async getSeasonStats(
    refereeId: string,
    season: string = RefereeStatsService.CURRENT_SEASON,
    _tournamentNo?: string // TS6133 - unused parameter
  ): Promise<SeasonStats | null> {
    try {
      const cacheKey = `${RefereeStatsService.CACHE_PREFIX}_season_${refereeId}_${season}`;
      
      // Check cache first
      const cached = await RefereeStatsService.localStorage.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < RefereeStatsService.CACHE_EXPIRY) {
        return cached.data;
      }

      
      // First resolve referee to NoReferee ID (use any tournament for resolution)
      const refereeNo = await RefereeStatsService.resolveRefereeIdFromAnyTournament(refereeId);
      if (!refereeNo) {
        return RefereeStatsService.generateNoDataSeasonStats(season);
      }
      
      
      // Use the dual-role VIS API queries with Season filter
      
      const [firstRefMatches, secondRefMatches] = await Promise.all([
        RefereeStatsService.querySeasonMatchesWithNoReferee(refereeNo, 'first', season),
        RefereeStatsService.querySeasonMatchesWithNoReferee(refereeNo, 'second', season)
      ]);
      
      // Merge and deduplicate
      const allMatches = [...firstRefMatches, ...secondRefMatches];
      const uniqueMatches = deduplicateMatchesByIdCompat(allMatches);
      
      if (uniqueMatches.length === 0) {
        return RefereeStatsService.generateNoDataSeasonStats(season);
      }
      
      
      // Calculate statistics from VIS matches
      const matchStats = calculateStatsFromParsedMatchesCompat(uniqueMatches);
      
      const seasonStats: SeasonStats = {
        ...matchStats,
        season,
        tournaments: Math.ceil(matchStats.totalMatches / 8), // Estimate from matches
        averageRating: RefereeStatsService.calculateAverageRatingFromStats(matchStats),
      };

      // Cache the results
      await RefereeStatsService.localStorage.set(cacheKey, seasonStats, RefereeStatsService.CACHE_EXPIRY);
      
      return seasonStats;
    } catch (error) {
      console.error('Ã¢ÂÅ’ Error fetching season stats:', error);
      return RefereeStatsService.generateNoDataSeasonStats(season);
    }
  }

  /**
   * Get enhanced tournament statistics including stats and recent matches
   */
  static async getEnhancedTournamentStats(refereeId: string, tournamentNo: string): Promise<EnhancedTournamentStats | null> {
    try {

      // First resolve referee to NoReferee ID
      const refereeNo = await RefereeStatsService.resolveRefereeIdFromTournament(refereeId, tournamentNo);
      if (!refereeNo) {
        return null;
      }

      // Get matches from both referee roles
      const [firstRefMatches, secondRefMatches] = await Promise.all([
        RefereeStatsService.queryTournamentMatchesWithNoReferee(refereeNo, 'first', tournamentNo),
        RefereeStatsService.queryTournamentMatchesWithNoReferee(refereeNo, 'second', tournamentNo)
      ]);

      // Merge and deduplicate matches
      const allMatches = [...firstRefMatches, ...secondRefMatches];
      const uniqueMatches = deduplicateMatchesByIdCompat(allMatches);

      if (uniqueMatches.length === 0) {
        return null;
      }


      // Calculate statistics
      const stats = calculateStatsFromParsedMatchesCompat(uniqueMatches);

      // Sort matches using enhanced date fields for better accuracy
      const sortedMatches = uniqueMatches.sort((a, b) => {
        // Use LocalDate + LocalTime for more accurate sorting if available
        const dateTimeA = RefereeStatsService.getMatchDateTime(a);
        const dateTimeB = RefereeStatsService.getMatchDateTime(b);
        return dateTimeB - dateTimeA; // Most recent first
      });

      // Convert matches to RefereeMatch format and take 3 most recent
      const recentMatches = RefereeStatsService.convertToRecentMatches(sortedMatches, refereeId)
        .slice(0, 3); // Take only 3 most recent


      return {
        stats,
        recentMatches
      };
    } catch (error) {
      console.error('❌ Error fetching enhanced tournament stats:', error);
      return null;
    }
  }

  /**
   * Get match date/time as timestamp for reliable sorting
   * Uses LocalDate + LocalTime if available, falls back to LocalDateTime
   */
  private static getMatchDateTime(match: any): number {
    try {
      // Prefer LocalDate + LocalTime combination for accuracy
      const localDate = match.rawMatch?.LocalDate || match.LocalDate;
      const localTime = match.rawMatch?.LocalTime || match.LocalTime;

      if (localDate && localTime) {
        // Combine date and time - handle different formats
        const dateTimeString = `${localDate}T${localTime}`;
        const dateTime = new Date(dateTimeString);
        if (!isNaN(dateTime.getTime())) {
          return dateTime.getTime();
        }
      }

      // Fallback to LocalDateTime
      const localDateTime = match.rawMatch?.LocalDateTime || match.LocalDateTime;
      if (localDateTime) {
        const dateTime = new Date(localDateTime);
        if (!isNaN(dateTime.getTime())) {
          return dateTime.getTime();
        }
      }

      // Final fallback - use current time (will sort to top, but at least won't crash)
      console.warn('Could not parse match date/time, using current time for sorting:', match.matchId);
      return new Date().getTime();
    } catch (error) {
      console.warn('Error parsing match date/time:', error, match.matchId);
      return new Date().getTime();
    }
  }

  /**
   * Get match date/time as ISO string for RefereeMatch format
   */
  private static getMatchDateTimeAsISO(match: any): string {
    try {
      // Prefer LocalDate + LocalTime combination for accuracy
      const localDate = match.rawMatch?.LocalDate || match.LocalDate;
      const localTime = match.rawMatch?.LocalTime || match.LocalTime;

      if (localDate && localTime) {
        // Combine date and time - handle different formats
        const dateTimeString = `${localDate}T${localTime}`;
        const dateTime = new Date(dateTimeString);
        if (!isNaN(dateTime.getTime())) {
          return dateTime.toISOString();
        }
      }

      // Fallback to LocalDateTime
      const localDateTime = match.rawMatch?.LocalDateTime || match.LocalDateTime;
      if (localDateTime) {
        const dateTime = new Date(localDateTime);
        if (!isNaN(dateTime.getTime())) {
          return dateTime.toISOString();
        }
      }

      // Final fallback - use current time
      return new Date().toISOString();
    } catch (error) {
      console.warn('Error parsing match date/time for ISO conversion:', error, match.matchId);
      return new Date().toISOString();
    }
  }

  /**
   * Convert raw VIS match data to RefereeMatch format for UI display
   */
  private static convertToRecentMatches(matches: any[], _refereeId: string): RefereeMatch[] { // TS6133 - unused parameter
    return matches.map(match => {
      // Determine which role this referee played in the match
      const refereeRole = match.refereeRole || 'first';

      // Extract match date/time using enhanced logic
      const dateTime = RefereeStatsService.getMatchDateTimeAsISO(match);

      // Determine match status
      let status: 'Scheduled' | 'Live' | 'Finished' = 'Scheduled';
      const rawStatus = (match.rawMatch?.Status || '').toLowerCase();
      if (rawStatus.includes('finished') || rawStatus.includes('completed')) {
        status = 'Finished';
      } else if (rawStatus.includes('running') || rawStatus.includes('live')) {
        status = 'Live';
      }

      return {
        matchId: match.matchId || match.rawMatch?.No || 'unknown',
        court: match.rawMatch?.Court || 'TBD',
        round: match.rawMatch?.RoundCode || match.rawMatch?.Phase || 'Pool',
        status,
        dateTime,
        refereeRole: refereeRole as 'first' | 'second',
        gender: match.gender === 'women' ? 'W' : 'M' as 'M' | 'W',
        referees: {
          referee1: {
            id: match.rawMatch?.NoReferee1 || '',
            name: match.rawMatch?.Referee1Name || 'TBD'
          },
          referee2: {
            id: match.rawMatch?.NoReferee2 || '',
            name: match.rawMatch?.Referee2Name || 'TBD'
          }
        },
        teams: {
          team1: {
            name: match.rawMatch?.TeamAName || 'Team A',
            countryCode: match.rawMatch?.TeamAFederationCode || 'XX',
            players: [] // VIS API doesn't provide individual player names in this format
          },
          team2: {
            name: match.rawMatch?.TeamBName || 'Team B',
            countryCode: match.rawMatch?.TeamBFederationCode || 'XX',
            players: []
          }
        },
        // Pass through raw match data for results display
        rawMatch: match.rawMatch
      } as RefereeMatch & { rawMatch: any };
    });
  }

  /**
   * Get current tournament statistics for a referee using proper VIS API with NoReferee
   */
  static async getCurrentTournamentStats(refereeId: string, tournamentNo: string): Promise<RefereeStats | null> {
    try {
      
      // First resolve referee to NoReferee ID
      const refereeNo = await RefereeStatsService.resolveRefereeIdFromTournament(refereeId, tournamentNo);
      if (!refereeNo) {
        return null;
      }
      
      
      // Use the dual-role VIS API approach as specified in ChatGPT conversation
      
      const [firstRefMatches, secondRefMatches] = await Promise.all([
        RefereeStatsService.queryTournamentMatchesWithNoReferee(refereeNo, 'first', tournamentNo),
        RefereeStatsService.queryTournamentMatchesWithNoReferee(refereeNo, 'second', tournamentNo)
      ]);
      
      // Merge and deduplicate
      const allMatches = [...firstRefMatches, ...secondRefMatches];
      const uniqueMatches = deduplicateMatchesByIdCompat(allMatches);

      // Zero partite NON e' "nessun dato" (issue #94).
      //
      // Qui `null` significava due cose incompatibili: "l'arbitro non esiste /
      // non l'ho risolto" — il ritorno poche righe sopra, giusto — e "l'arbitro
      // c'e', ha zero partite in questo torneo", che e' la condizione NORMALE
      // di ogni arbitro il giorno prima dell'inizio. Collassate sulla stessa
      // risposta, la scheda mostra "statistiche non disponibili" a chi ha
      // semplicemente ancora zero designazioni.
      //
      // `calculateStatsFromParsedMatchesCompat([])` restituisce gia' l'oggetto
      // a zeri corretto, ed e' la stessa scelta che `getCareerStats` fa da
      // sempre con `generateNoDataCareerStats()`.
      return calculateStatsFromParsedMatchesCompat(uniqueMatches);
    } catch (error) {
      console.error('Ã¢ÂÅ’ Error fetching current tournament stats:', error);
      return null;
    }
  }


  /**
   * Get career statistics for a referee using proper VIS API with NoReferee filter only
   */
  static async getCareerStats(refereeId: string, _tournamentNo?: string): Promise<CareerStats | null> { // TS6133
    try {
      const cacheKey = `${RefereeStatsService.CACHE_PREFIX}_career_${refereeId}`;
      
      // Check cache first
      const cached = await RefereeStatsService.localStorage.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < RefereeStatsService.CACHE_EXPIRY) {
        return cached.data;
      }


      // First resolve referee to NoReferee ID (use any tournament for resolution)
      const refereeNo = await RefereeStatsService.resolveRefereeIdFromAnyTournament(refereeId);
      if (!refereeNo) {
        return RefereeStatsService.generateNoDataCareerStats();
      }
      
      
      // Use the dual-role VIS API queries with NO date filters (full career)
      
      const [firstRefMatches, secondRefMatches] = await Promise.all([
        RefereeStatsService.queryCareerMatchesWithNoReferee(refereeNo, 'first'),
        RefereeStatsService.queryCareerMatchesWithNoReferee(refereeNo, 'second')
      ]);
      
      // Merge and deduplicate
      const allMatches = [...firstRefMatches, ...secondRefMatches];
      const uniqueMatches = deduplicateMatchesByIdCompat(allMatches);
      
      if (uniqueMatches.length === 0) {
        return RefereeStatsService.generateNoDataCareerStats();
      }
      
      
      // Calculate statistics from VIS matches
      const matchStats = calculateStatsFromParsedMatchesCompat(uniqueMatches);

      // Calculate years active based on actual data
      const currentYear = new Date().getFullYear();
      const yearsBack = Math.max(5, Math.ceil(matchStats.totalMatches / 20)); // Dynamic based on activity
      const years = Array.from({length: yearsBack}, (_, i) => (currentYear - i).toString());

      const careerStats: CareerStats = {
        ...matchStats,
        yearsActive: yearsBack,
        totalTournaments: Math.ceil(matchStats.totalMatches / 8), // Estimate from matches
        averageRating: RefereeStatsService.calculateAverageRatingFromStats(matchStats),
        specializations: RefereeStatsService.calculateSpecializationsFromStats(matchStats),
        achievements: RefereeStatsService.calculateAchievementsFromStats(matchStats),
        seasonsActive: years,
      };

      // Cache the results
      await RefereeStatsService.localStorage.set(cacheKey, careerStats, RefereeStatsService.CACHE_EXPIRY);
      
      return careerStats;
    } catch (error) {
      console.error('Ã¢ÂÅ’ Error fetching career stats:', error);
      return RefereeStatsService.generateNoDataCareerStats();
    }
  }

  /**
   * Get tournaments for a specific season
   */
  private static async getTournamentsForSeason(season: string): Promise<any[]> {
    try {
      
      // Use existing CacheService to get tournaments, filtered by year
      const tournamentsResult = await CacheService.getTournaments();
      
      if (!tournamentsResult.success || !tournamentsResult.data || tournamentsResult.data.length === 0) {
        return [];
      }
      
      const allTournaments = tournamentsResult.data;
      
      // Log first few tournaments for debugging
      // Debug logging removed (TS6133)
      
      // Filter tournaments by season year
      const seasonTournaments = allTournaments.filter(tournament => {
        if (!tournament.startDate) return false;
        const tournamentYear = new Date(tournament.startDate).getFullYear().toString();
        return tournamentYear === season;
      });
      
      if (seasonTournaments.length > 0) {
        // Debug logging removed (TS6133)
      }
      return seasonTournaments;
    } catch (error) {
      console.error('Ã¢ÂÅ’ Error fetching tournaments for season:', error);
      return [];
    }
  }

  /**
   * Aggregate referee statistics across multiple tournaments
   */
  private static async aggregateRefereeStats(
    refereeId: string, 
    tournaments: any[]
  ): Promise<TournamentRefereeData[]> {
    const results: TournamentRefereeData[] = [];
    

    for (const tournament of tournaments) {
      try {
        
        // Get matches for this tournament
        const matchesResult = await CacheService.getMatches(tournament.visNo);
        
        const matches = matchesResult.success ? matchesResult.data : null;
        if (!matches || matches.length === 0) {
          continue;
        }
        
        
        // Log sample matches for debugging
        // Debug logging removed (TS6133)

        // Filter matches where this referee officiated
        const refereeMatches = RefereeStatsService.filterMatchesForReferee(matches, refereeId);
        
        if (refereeMatches.length > 0) {
          // Debug logging removed (TS6133)
        }

        if (refereeMatches.length > 0) {
          results.push({
            tournamentVisNo: tournament.visNo,
            tournamentName: tournament.name,
            startDate: tournament.startDate,
            endDate: tournament.endDate,
            matches: refereeMatches,
          });
        } else {
        }
      } catch (error) {
        console.error(`Ã¢ÂÅ’ Error processing tournament ${tournament.visNo}:`, error);
        continue;
      }
    }
    
    
    // Log final summary
    if (results.length > 0) {
      let totalMatches = 0;
      results.forEach(result => {
        totalMatches += result.matches.length;
      });
    }
    
    return results;
  }

  /**
   * Filter matches for a specific referee with improved name matching
   */
  private static filterMatchesForReferee(matches: any[], refereeId: string): Array<{
    matchId: string;
    position: 'first' | 'second';
    gender: 'men' | 'women';
    matchDate?: string;
  }> {
    const searchId = refereeId.toLowerCase().trim();
    const nameParts = searchId.split(' ');
    
    
    const filteredMatches = matches.filter(match => {
      const referee1 = (match.Referee1Name || match.Referee1 || '').trim().toLowerCase();
      const referee2 = (match.Referee2Name || match.Referee2 || '').trim().toLowerCase();

      // More precise name matching - check if both first and last names are present
      if (nameParts.length >= 2) {
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        
        const ref1HasFirstName = referee1.includes(firstName);
        const ref1HasLastName = referee1.includes(lastName);
        const ref1HasBoth = ref1HasFirstName && ref1HasLastName;
        
        const ref2HasFirstName = referee2.includes(firstName);
        const ref2HasLastName = referee2.includes(lastName);
        const ref2HasBoth = ref2HasFirstName && ref2HasLastName;
        
        
        const matches = ref1HasBoth || ref2HasBoth;
        
        return matches;
        return matches;
      } else {
        // Fallback for single name
        const ref1Match = referee1.includes(searchId);
        const ref2Match = referee2.includes(searchId);
        const matches = ref1Match || ref2Match;
        
        
        return matches;
      }
    }).map(match => {
      const referee1 = (match.Referee1Name || match.Referee1 || '').trim().toLowerCase();
      const referee2 = (match.Referee2Name || match.Referee2 || '').trim().toLowerCase();
      
      // Determine if referee was first or second
      let isFirstReferee = false;
      
      if (nameParts.length >= 2) {
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        isFirstReferee = referee1.includes(firstName) && referee1.includes(lastName);
      } else {
        isFirstReferee = referee1.includes(searchId);
      }
      
      const gender = (match.Gender?.toLowerCase().includes('women') || 
               match.Gender?.toLowerCase().includes('female') ||
               match.RoundName?.toLowerCase().includes('women') ||
               match.Round?.toLowerCase().includes('women')) ? 'women' as const : 'men' as const;
      
      
      return {
        matchId: match.id || match.MatchNo || match.No,
        position: isFirstReferee ? 'first' as const : 'second' as const,
        gender,
        matchDate: match.MatchDate || match.DateTime || match.LocalDateTime,
      };
    });
    
    return matches;
  }

  /**
   * Calculate basic statistics from tournament data
   */
  private static calculateStats(tournamentData: TournamentRefereeData[]): RefereeStats {
    let totalMatches = 0;
    let matchesAsFirst = 0;
    let matchesAsSecond = 0;
    let menMatches = 0;
    let womenMatches = 0;

    for (const tournament of tournamentData) {
      for (const match of tournament.matches) {
        totalMatches++;
        
        if (match.position === 'first') {
          matchesAsFirst++;
        } else {
          matchesAsSecond++;
        }
        
        if (match.gender === 'men') {
          menMatches++;
        } else {
          womenMatches++;
        }
      }
    }

    return {
      totalMatches,
      matchesAsFirst,
      matchesAsSecond,
      menMatches,
      womenMatches,
    };
  }

  /**
   * Calculate statistics from matches array
   */
  private static calculateStatsFromMatches(matches: Array<{
    matchId: string;
    position: 'first' | 'second';
    gender: 'men' | 'women';
    matchDate?: string;
  }>): RefereeStats {
    const stats: RefereeStats = {
      totalMatches: matches.length,
      matchesAsFirst: 0,
      matchesAsSecond: 0,
      menMatches: 0,
      womenMatches: 0
    };

    for (const match of matches) {
      if (match.position === 'first') {
        stats.matchesAsFirst++;
      } else {
        stats.matchesAsSecond++;
      }
      
      if (match.gender === 'women') {
        stats.womenMatches++;
      } else {
        stats.menMatches++;
      }
    }

    return stats;
  }

  /**
   * Get current tournament number from context or use fallback
   */
  private static async getCurrentTournamentNumber(): Promise<string> {
    try {
      // Try to get tournament from cache service or use the active tournament
      const tournamentsResult = await CacheService.getTournaments();
      if (tournamentsResult.success && tournamentsResult.data && tournamentsResult.data.length > 0) {
        const tournaments = tournamentsResult.data;
        // Use the first available tournament as representative
        return tournaments[0]!.visNo;
      }
    } catch (error) {
      console.error('Could not get tournament from cache:', error);
    }
    
    // Fallback to a generic tournament number that should have historical data
    return "123456";
  }

  /**
   * Calculate average rating from basic stats
   */
  private static calculateAverageRatingFromStats(stats: RefereeStats): number {
    if (stats.totalMatches === 0) return 8.0;
    
    // Basic calculation based on match volume and balance
    const baseRating = 8.5;
    const experienceFactor = Math.min(stats.totalMatches * 0.02, 1.0);
    const balanceFactor = Math.abs(stats.matchesAsFirst - stats.matchesAsSecond) / stats.totalMatches * 0.5;
    
    return Math.round((baseRating + experienceFactor - balanceFactor) * 10) / 10;
  }

  /**
   * Calculate specializations from basic stats
   */
  private static calculateSpecializationsFromStats(stats: RefereeStats): string[] {
    const specializations: string[] = [];
    
    if (stats.totalMatches === 0) {
      return ['Beach Volleyball'];
    }
    
    const menRatio = stats.menMatches / stats.totalMatches;
    const womenRatio = stats.womenMatches / stats.totalMatches;
    
    // Add specialization based on match distribution
    if (menRatio > 0.7) {
      specializations.push("Men's Beach Volleyball Specialist");
    } else if (womenRatio > 0.7) {
      specializations.push("Women's Beach Volleyball Specialist");
    } else {
      specializations.push('Beach Volleyball');
    }
    
    // Add experience-based specializations
    if (stats.totalMatches >= 50) {
      specializations.push('International Events');
    }
    
    if (stats.totalMatches >= 100) {
      specializations.push('Senior Official');
    }
    
    return specializations;
  }

  /**
   * Calculate achievements from basic stats
   */
  private static calculateAchievementsFromStats(stats: RefereeStats): string[] {
    const achievements: string[] = [];
    
    // Experience-based achievements
    if (stats.totalMatches >= 100) {
      achievements.push('Century Club (100+ Matches)');
    } else if (stats.totalMatches >= 50) {
      achievements.push('Experienced Official (50+ Matches)');
    }
    
    if (stats.totalMatches >= 200) {
      achievements.push('Elite Official (200+ Matches)');
    }
    
    // Balance achievement
    const balanceRatio = Math.abs(stats.matchesAsFirst - stats.matchesAsSecond) / stats.totalMatches;
    if (balanceRatio <= 0.2 && stats.totalMatches >= 20) {
      achievements.push('Versatile Official');
    }
    
    // Always add FIVB certification as baseline
    achievements.push('FIVB Certified Official');
    
    return achievements;
  }

  /**
   * Clear cached stats for a referee (useful for data refresh)
   */
  static async clearRefereeCache(refereeId: string): Promise<void> {
    try {
      const keys = [
        `${RefereeStatsService.CACHE_PREFIX}_season_${refereeId}_${RefereeStatsService.CURRENT_SEASON}`,
        `${RefereeStatsService.CACHE_PREFIX}_career_${refereeId}`,
      ];
      
      for (const key of keys) {
        await RefereeStatsService.localStorage.delete(key);
      }
    } catch (error) {
      console.error('Error clearing referee cache:', error);
    }
  }

  /**
   * Generate "N/D" season stats when real data is not available
   */
  private static generateNoDataSeasonStats(season: string): SeasonStats {
    return {
      season,
      totalMatches: 0,
      matchesAsFirst: 0,
      matchesAsSecond: 0,
      menMatches: 0,
      womenMatches: 0,
      tournaments: 0,
      averageRating: undefined, // Will display as N/D
    };
  }

  /**
   * Generate "N/D" career stats when real data is not available
   */
  private static generateNoDataCareerStats(): CareerStats {
    return {
      yearsActive: 0,
      totalMatches: 0,
      matchesAsFirst: 0,
      matchesAsSecond: 0,
      menMatches: 0,
      womenMatches: 0,
      totalTournaments: 0,
      averageRating: undefined, // Will display as N/D
      specializations: [],
      achievements: [],
      seasonsActive: [],
    };
  }

  /**
   * Un identificativo di arbitro si puo' risolvere?
   *
   * Si rifiuta PRIMA di parlare col VIS. Senza questo controllo i due
   * risolutori costruivano comunque una richiesta con nome e cognome vuoti: un
   * giro di rete che non puo' che tornare a mani vuote, o peggio agganciare
   * l'arbitro sbagliato. E' la stessa classe di difetto che la correzione delle
   * "185 partite" doveva chiudere — chiedere al VIS le statistiche di
   * un'identita' che non c'e'.
   *
   * Le stringhe "null" e "undefined" arrivano da chiamanti che hanno
   * interpolato un valore assente: sono identita' inesistenti quanto la stringa
   * vuota, e vanno trattate allo stesso modo.
   */
  private static idArbitroUtilizzabile(refereeId: string): boolean {
    const pulito = (refereeId ?? '').trim();
    if (!pulito || pulito === 'null' || pulito === 'undefined') {
      console.warn(
        `Invalid referee ID "${refereeId}": impossibile risolverlo, nessuna chiamata al VIS`
      );
      return false;
    }
    return true;
  }

  /**
   * Resolve referee name to NoReferee ID using any available tournament
   */
  private static async resolveRefereeIdFromAnyTournament(refereeId: string): Promise<string | null> {
    try {
      if (!RefereeStatsService.idArbitroUtilizzabile(refereeId)) return null;

      // First, check if refereeId is already a valid 6-digit NoReferee ID
      if (/^\d{6}$/.test(refereeId)) {
        return refereeId;
      }
      
      // Get tournaments to use for referee ID resolution
      const tournamentsResult = await CacheService.getTournaments();
      if (!tournamentsResult.success || !tournamentsResult.data || tournamentsResult.data.length === 0) {
        return null;
      }
      
      const tournaments = tournamentsResult.data;
      
      // Try to resolve using the first available tournament
      return await RefereeStatsService.resolveRefereeIdFromTournament(refereeId, tournaments[0]?.visNo);
    } catch (error) {
      console.error('❌ Error resolving referee ID from tournaments:', error);
      return null;
    }
  }

  /**
   * Resolve referee name to NoReferee ID using GetEventRefereeList for specific tournament
   */
  private static async resolveRefereeIdFromTournament(refereeId: string, tournamentNo: string): Promise<string | null> {
    try {
      if (!RefereeStatsService.idArbitroUtilizzabile(refereeId)) return null;

      // First, check if refereeId is already a valid 6-digit NoReferee ID
      if (/^\d{6}$/.test(refereeId)) {
        return refereeId;
      }
      
      // If it contains underscores, it's a fallback name - convert to proper name format
      const cleanName = refereeId.includes('_') ? refereeId.replace(/_/g, ' ') : refereeId;
      const nameParts = cleanName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      
      // Try both name-based and NoReferee-based filtering.
      // Issue #47: same request, now built and sent by VisApiClient — the name
      // halves of the filter are GetEventRefereeListRequest.firstName/lastName.
      const response = await RefereeStatsService.getVisApiClient().getEventRefereeList({
        eventNo: tournamentNo,
        firstName,
        lastName,
        fields: STATS_REFEREE_FIELDS
      });

      if (response.success) {
        const xmlResponse = response.xmlData ?? '';

        // Try direct attribute match first.
        //
        // Il valore va VALIDATO, non solo estratto (issue #94). `NoReferee` e'
        // numerico, ma qui si accettava qualunque cosa stesse fra gli apici e
        // la si passava al VIS come filtro della query partite: un
        // `NoReferee="INVALID123"` diventava una richiesta con un filtro
        // insensato. Non se ne accorgeva nessuno perche' la risposta vuota
        // faceva poi tornare `null` al chiamante — cioe' la risposta giusta,
        // per la ragione sbagliata e dopo aver interrogato il VIS.
        const refereeNoMatch = xmlResponse.match(/NoReferee="([^"]*)"/);
        const resolvedNoReferee = refereeNoMatch?.[1]?.trim();
        if (resolvedNoReferee && /^\d+$/.test(resolvedNoReferee)) {
          return resolvedNoReferee;
        }
        if (resolvedNoReferee) {
          console.warn(
            `NoReferee "${resolvedNoReferee}" non e' numerico: non lo uso come filtro VIS`
          );
          return null;
        }

        // Fallback: match by name client-side against the event roster.
        // RefereeDirectoryService caches that roster per event, so this second
        // step costs a request only the first time an event is inspected.
        const { referees } = await RefereeDirectoryService.getEventReferees(tournamentNo);
        const targetFirst = firstName.toLowerCase();
        const targetLast = lastName.toLowerCase();
        for (const referee of referees) {
          if (referee.firstName.toLowerCase() === targetFirst && referee.lastName.toLowerCase() === targetLast) {
            if (referee.RefereeId) return referee.RefereeId;
          }
        }

        return null;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Ã¢ÂÅ’ Error resolving referee ID:', error);
      return null;
    }
  }

  /**
   * Query tournament matches for specific referee role using NoReferee (as per ChatGPT specs)
   */
  private static async queryTournamentMatchesWithNoReferee(
    refereeNo: string,
    role: 'first' | 'second',
    tournamentNo: string
  ): Promise<any[]> {
    try {
      // Critical validation: Do not query VIS API with invalid referee IDs
      if (!refereeNo || refereeNo.trim() === '' || refereeNo === 'null' || refereeNo === 'undefined') {
        
        return [];
      }

      // Additional validation: Ensure referee ID is a valid format (6-digit number)
      if (!/^\d{6}$/.test(refereeNo)) {
        
        return [];
      }
      // Log scope (tournament query)
      


      // Issue #47: routed through VisApiClient. NoReferee1/NoReferee2 were
      // already part of GetBeachMatchListRequest; the explicit field list is
      // the new part (see STATS_MATCH_FIELDS).
      const response = await RefereeStatsService.getVisApiClient().getBeachMatchList({
        eventNo: tournamentNo,
        ...(role === 'first' ? { NoReferee1: refereeNo } : { NoReferee2: refereeNo }),
        fields: STATS_MATCH_FIELDS
      });

      if (response.success) {
        const xmlResponse = response.xmlData ?? '';

        const matches = parseMatchesFromVISXMLCompat(xmlResponse, role);
        // Map conditional attribute from raw VIS flag: 0 -> M, 1 -> W
        try {
          for (const m of matches) {
            const raw = (m?.rawMatch?.TournamentGender ?? '').toString().trim();
            if (raw === '1') { (m as any).tournamentGender = 'W'; (m as any).gender = 'women'; }
            else if (raw === '0') { (m as any).tournamentGender = 'M'; (m as any).gender = 'men'; }
          }
        } catch {}
        // Sample log removed per request
        // Minimal audit: matchId and tournamentGender only
        try {
          const audit = (matches || []).map((m: any) => ({
            matchId: (m.rawMatch?.No || m.matchId || '').toString(),
            tournamentGenderRaw: (m?.rawMatch?.TournamentGender ?? '').toString(),
            tournamentGender: (m?.tournamentGender ?? '').toString(),
          }));
          
        } catch {}
        // Defensive role filter using VIS canonical names (NoReferee1/NoReferee2) with fallback to camelCase
        let filteredMatches = matches.filter((m: any) => {
          const first = (m.NoReferee1 ?? m.noReferee1 ?? (m.rawMatch?.NoReferee1 ?? '')).toString().trim();
          const second = (m.NoReferee2 ?? m.noReferee2 ?? (m.rawMatch?.NoReferee2 ?? '')).toString().trim();
          const target = refereeNo.toString().trim();
          return role === 'first' ? first === target : second === target;
        });

        // If no ID-based matches found, try name-based fallback
        if (filteredMatches.length === 0) {
          try {
            const refName = await RefereeStatsService.resolveRefereeNameFromEvent(tournamentNo, refereeNo);
            if (refName) {
              const { firstName, lastName } = refName;
              const full = `${firstName} ${lastName}`.trim().toLowerCase();
              const rev = `${lastName} ${firstName}`.trim().toLowerCase();
              const nameMatches = matches.filter((m: any) => {
                const r1 = (m.Referee1Name ?? m.referee1Name ?? (m.rawMatch?.Referee1Name ?? '')).toString().trim().toLowerCase();
                const r2 = (m.Referee2Name ?? m.referee2Name ?? (m.rawMatch?.Referee2Name ?? '')).toString().trim().toLowerCase();
                return role === 'first' ? (r1 === full || r1 === rev) : (r2 === full || r2 === rev);
              });
              if (nameMatches.length > 0) {
                filteredMatches = nameMatches;
              }
            }
          } catch {}
        }

        // Removed VIS role filter summary per request
        return filteredMatches;
      } else {
        return [];
      }
    } catch (error) {
      console.error(`Error querying tournament matches for ${role} referee ${refereeNo}:`, error);
      return [];
    }
  }

  /**
   * Query season matches for specific referee role using tournament approach with season filter
   */
  private static async querySeasonMatchesWithNoReferee(
    refereeNo: string,
    role: 'first' | 'second',
    season: string
  ): Promise<any[]> {
    try {
      // Critical validation: Do not query VIS API with invalid referee IDs
      if (!refereeNo || refereeNo.trim() === '' || refereeNo === 'null' || refereeNo === 'undefined') {
        return [];
      }

      // Additional validation: Ensure referee ID is a valid format (6-digit number)
      if (!/^\d{6}$/.test(refereeNo)) {
        return [];
      }

      // Use tournament approach but with proper beach volleyball season date range
      // Beach volleyball season typically runs from March to February of next year
      const seasonStartDate = `${season}-03-01`;
      const seasonEndDate = `${parseInt(season) + 1}-02-28`;

      // Since VIS API ignores date filters, get all matches and filter client-side.
      // Issue #47: routed through VisApiClient — no event filter, only the
      // referee slot, exactly as the raw request did.
      const response = await RefereeStatsService.getVisApiClient().getBeachMatchList({
        ...(role === 'first' ? { NoReferee1: refereeNo } : { NoReferee2: refereeNo }),
        fields: STATS_MATCH_FIELDS
      });

      if (response.success) {
        const xmlResponse = response.xmlData ?? '';
        const matches = parseMatchesFromVISXMLCompat(xmlResponse, role);
        // Season query returned results
        
        // Client-side date filtering since VIS API ignores date filters
        const seasonStart = new Date(seasonStartDate);
        const seasonEnd = new Date(seasonEndDate);
        const filteredMatches = matches.filter(match => {
          const matchDate = new Date(match.LocalDateTime || match.date || '');
          return matchDate >= seasonStart && matchDate <= seasonEnd;
        });
        
        // Filtered matches for season
        if (filteredMatches.length > 0) {
          // Sample season match dates filtered
        }
        
        // Replace matches with filtered matches for subsequent processing
        matches.length = 0;
        matches.push(...filteredMatches);
        // Map conditional attribute from raw VIS flag: 0 -> M, 1 -> W
        try {
          for (const m of matches) {
            const raw = (m?.rawMatch?.TournamentGender ?? '').toString().trim();
            if (raw === '1') { (m as any).tournamentGender = 'W'; (m as any).gender = 'women'; }
            else if (raw === '0') { (m as any).tournamentGender = 'M'; (m as any).gender = 'men'; }
          }
        } catch {}

        // Apply the same defensive filtering as tournament queries
        let roleFilteredMatches = matches.filter((m: any) => {
          const first = (m.NoReferee1 ?? m.noReferee1 ?? (m.rawMatch?.NoReferee1 ?? '')).toString().trim();
          const second = (m.NoReferee2 ?? m.noReferee2 ?? (m.rawMatch?.NoReferee2 ?? '')).toString().trim();
          const target = refereeNo.toString().trim();
          return role === 'first' ? first === target : second === target;
        });

        return roleFilteredMatches;
      } else {
        return [];
      }
    } catch (error) {
      console.error(`Error querying season matches for ${role} referee ${refereeNo}:`, error);
      return [];
    }
  }

  /**
   * Query career matches for specific referee role using tournament approach with extended date range
   */
  private static async queryCareerMatchesWithNoReferee(
    refereeNo: string,
    role: 'first' | 'second'
  ): Promise<any[]> {
    try {
      // Critical validation: Do not query VIS API with invalid referee IDs
      // This prevents returning ALL matches (185) when referee resolution fails
      if (!refereeNo || refereeNo.trim() === '' || refereeNo === 'null' || refereeNo === 'undefined') {
        return [];
      }

      // Additional validation: Ensure referee ID is a valid format (6-digit number)
      if (!/^\d{6}$/.test(refereeNo)) {
        return [];
      }

      // Use tournament approach but with extended date range for career (last 10 years)
      const currentYear = 2024; // Fixed to 2024 for current season
      const careerStartDate = `${currentYear - 10}-01-01`;
      const careerEndDate = `${currentYear}-12-31`;

      // Issue #47: routed through VisApiClient — same filter, same fields.
      const response = await RefereeStatsService.getVisApiClient().getBeachMatchList({
        ...(role === 'first' ? { NoReferee1: refereeNo } : { NoReferee2: refereeNo }),
        fields: STATS_MATCH_FIELDS
      });

      if (response.success) {
        const xmlResponse = response.xmlData ?? '';
        const matches = parseMatchesFromVISXMLCompat(xmlResponse, role);
        // Career query returned results
        if (matches.length > 0) {
          // Sample career match dates
        }
        // Map conditional attribute from raw VIS flag: 0 -> M, 1 -> W
        try {
          for (const m of matches) {
            const raw = (m?.rawMatch?.TournamentGender ?? '').toString().trim();
            if (raw === '1') { (m as any).tournamentGender = 'W'; (m as any).gender = 'women'; }
            else if (raw === '0') { (m as any).tournamentGender = 'M'; (m as any).gender = 'men'; }
          }
        } catch {}

        // Apply the same defensive filtering as tournament queries
        let roleFilteredMatches = matches.filter((m: any) => {
          const first = (m.NoReferee1 ?? m.noReferee1 ?? (m.rawMatch?.NoReferee1 ?? '')).toString().trim();
          const second = (m.NoReferee2 ?? m.noReferee2 ?? (m.rawMatch?.NoReferee2 ?? '')).toString().trim();
          const target = refereeNo.toString().trim();
          return role === 'first' ? first === target : second === target;
        });

        return roleFilteredMatches;
      } else {
        return [];
      }
    } catch (error) {
      console.error(`Error querying career matches for ${role} referee ${refereeNo}:`, error);
      return [];
    }
  }
}


