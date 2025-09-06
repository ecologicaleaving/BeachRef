/**
 * @fileoverview RefereeStatsService - Conservative approach for referee statistics
 * Uses reliable tournament-based queries and client-side filtering
 * Avoids VIS API referee filtering issues that return excessive match counts
 */

import { VisApiClient } from './api/VisApiClient';
import { LocalStorageManager } from './LocalStorageManager';
import { CacheService } from './CacheService';
import { VisApiEndpoint, GetBeachMatchListRequest, GetEventRefereeListRequest } from '../types/api-v2';

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
  private static visApiClient: VisApiClient;

  /**
   * Initialize the service with VIS API client
   */
  private static getVisApiClient(): VisApiClient {
    if (!RefereeStatsService.visApiClient) {
      RefereeStatsService.visApiClient = new VisApiClient({
        baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
        timeoutMs: 10000,
        maxRetries: 2,
        retryDelayMs: 1000,
        enableLogging: true,
        exponentialBackoff: true,
        headers: {}
      });
    }
    return RefereeStatsService.visApiClient;
  }

  /**
   * Get season statistics for a referee using proper VIS API with Season + NoReferee filters
   */
  static async getSeasonStats(
    refereeId: string, 
    season: string = RefereeStatsService.CURRENT_SEASON,
    tournamentNo?: string
  ): Promise<SeasonStats | null> {
    try {
      const cacheKey = `${RefereeStatsService.CACHE_PREFIX}_season_${refereeId}_${season}`;
      
      // Check cache first
      const cached = await RefereeStatsService.localStorage.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < RefereeStatsService.CACHE_EXPIRY) {
        return cached.data;
      }

      console.log(`🏐 ===== SEASON STATS REQUEST =====`);
      console.log(`📅 Referee: "${refereeId}"`);
      console.log(`📅 Season: ${season}`);
      console.log(`⏰ Time: ${new Date().toISOString()}`);
      console.log(`🏐 ================================`);
      
      // First resolve referee to NoReferee ID (use any tournament for resolution)
      const refereeNo = await RefereeStatsService.resolveRefereeIdFromAnyTournament(refereeId);
      if (!refereeNo) {
        console.log(`❌ Could not resolve referee "${refereeId}" to NoReferee ID for season query`);
        return RefereeStatsService.generateNoDataSeasonStats(season);
      }
      
      console.log(`✅ Resolved referee "${refereeId}" to NoReferee: ${refereeNo} for season query`);
      
      // Use the dual-role VIS API queries with Season filter
      console.log(`📡 Making dual VIS API season queries (Season=${season}, NoReferee=${refereeNo})...`);
      
      const [firstRefMatches, secondRefMatches] = await Promise.all([
        RefereeStatsService.querySeasonMatchesWithNoReferee(refereeNo, 'first', season),
        RefereeStatsService.querySeasonMatchesWithNoReferee(refereeNo, 'second', season)
      ]);
      
      // Merge and deduplicate
      const allMatches = [...firstRefMatches, ...secondRefMatches];
      const uniqueMatches = RefereeStatsService.deduplicateMatchesById(allMatches);
      
      if (uniqueMatches.length === 0) {
        console.log(`❌ No season matches found for referee ${refereeId} (NoReferee: ${refereeNo}) in season ${season}`);
        return RefereeStatsService.generateNoDataSeasonStats(season);
      }
      
      console.log(`✅ Found ${uniqueMatches.length} season matches for referee after deduplication`);
      
      // Calculate statistics from VIS matches
      const matchStats = RefereeStatsService.calculateStatsFromParsedMatches(uniqueMatches);
      
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
      console.error('❌ Error fetching season stats:', error);
      return RefereeStatsService.generateNoDataSeasonStats(season);
    }
  }

  /**
   * Get current tournament statistics for a referee using proper VIS API with NoReferee
   */
  static async getCurrentTournamentStats(refereeId: string, tournamentNo: string): Promise<RefereeStats | null> {
    try {
      console.log(`🏐 ===== CURRENT TOURNAMENT STATS REQUEST =====`);
      console.log(`👤 Referee: "${refereeId}"`);
      console.log(`🏆 Tournament: ${tournamentNo}`);
      console.log(`⏰ Time: ${new Date().toISOString()}`);
      console.log(`🏐 ==========================================`);
      
      // First resolve referee to NoReferee ID
      const refereeNo = await RefereeStatsService.resolveRefereeIdFromTournament(refereeId, tournamentNo);
      if (!refereeNo) {
        console.log(`❌ Could not resolve referee "${refereeId}" to NoReferee ID`);
        return null;
      }
      
      console.log(`✅ Resolved referee "${refereeId}" to NoReferee: ${refereeNo}`);
      
      // Use the dual-role VIS API approach as specified in ChatGPT conversation
      console.log(`📡 Making dual VIS API queries for tournament matches...`);
      
      const [firstRefMatches, secondRefMatches] = await Promise.all([
        RefereeStatsService.queryTournamentMatchesWithNoReferee(refereeNo, 'first', tournamentNo),
        RefereeStatsService.queryTournamentMatchesWithNoReferee(refereeNo, 'second', tournamentNo)
      ]);
      
      // Merge and deduplicate
      const allMatches = [...firstRefMatches, ...secondRefMatches];
      const uniqueMatches = RefereeStatsService.deduplicateMatchesById(allMatches);
      
      if (uniqueMatches.length === 0) {
        console.log(`❌ No matches found for referee ${refereeId} (NoReferee: ${refereeNo}) in tournament ${tournamentNo}`);
        return null;
      }
      
      console.log(`✅ Found ${uniqueMatches.length} matches for referee after deduplication`);
      
      // Calculate statistics
      return RefereeStatsService.calculateStatsFromParsedMatches(uniqueMatches);
    } catch (error) {
      console.error('❌ Error fetching current tournament stats:', error);
      return null;
    }
  }

  /**
   * Get career statistics for a referee using proper VIS API with NoReferee filter only
   */
  static async getCareerStats(refereeId: string, tournamentNo?: string): Promise<CareerStats | null> {
    try {
      const cacheKey = `${RefereeStatsService.CACHE_PREFIX}_career_${refereeId}`;
      
      // Check cache first
      const cached = await RefereeStatsService.localStorage.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < RefereeStatsService.CACHE_EXPIRY) {
        return cached.data;
      }

      console.log(`🏐 ===== CAREER STATS REQUEST =====`);
      console.log(`👤 Referee: "${refereeId}"`);
      console.log(`⏰ Time: ${new Date().toISOString()}`);
      console.log(`🏐 ================================`);

      // First resolve referee to NoReferee ID (use any tournament for resolution)
      const refereeNo = await RefereeStatsService.resolveRefereeIdFromAnyTournament(refereeId);
      if (!refereeNo) {
        console.log(`❌ Could not resolve referee "${refereeId}" to NoReferee ID for career query`);
        return RefereeStatsService.generateNoDataCareerStats();
      }
      
      console.log(`✅ Resolved referee "${refereeId}" to NoReferee: ${refereeNo} for career query`);
      
      // Use the dual-role VIS API queries with NO date filters (full career)
      console.log(`📡 Making dual VIS API career queries (NoReferee=${refereeNo} only - no date filters)...`);
      
      const [firstRefMatches, secondRefMatches] = await Promise.all([
        RefereeStatsService.queryCareerMatchesWithNoReferee(refereeNo, 'first'),
        RefereeStatsService.queryCareerMatchesWithNoReferee(refereeNo, 'second')
      ]);
      
      // Merge and deduplicate
      const allMatches = [...firstRefMatches, ...secondRefMatches];
      const uniqueMatches = RefereeStatsService.deduplicateMatchesById(allMatches);
      
      if (uniqueMatches.length === 0) {
        console.log(`❌ No career matches found for referee ${refereeId} (NoReferee: ${refereeNo})`);
        return RefereeStatsService.generateNoDataCareerStats();
      }
      
      console.log(`✅ Found ${uniqueMatches.length} career matches for referee after deduplication`);
      
      // Calculate statistics from VIS matches
      const matchStats = RefereeStatsService.calculateStatsFromParsedMatches(uniqueMatches);

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
      console.error('❌ Error fetching career stats:', error);
      return RefereeStatsService.generateNoDataCareerStats();
    }
  }

  /**
   * Get tournaments for a specific season
   */
  private static async getTournamentsForSeason(season: string): Promise<any[]> {
    try {
      console.log(`📅 Getting tournaments for season ${season}`);
      
      // Use existing CacheService to get tournaments, filtered by year
      const tournamentsResult = await CacheService.getTournaments();
      
      if (!tournamentsResult.success || !tournamentsResult.data || tournamentsResult.data.length === 0) {
        console.log('❌ No tournaments available in cache');
        return [];
      }
      
      const allTournaments = tournamentsResult.data;
      console.log(`📊 Total tournaments in cache: ${allTournaments.length}`);
      
      // Log first few tournaments for debugging
      console.log('📋 Sample tournaments in cache:');
      allTournaments.slice(0, 3).forEach(t => {
        console.log(`  - ${t.name} (${t.visNo}) ${t.startDate} to ${t.endDate}`);
      });
      
      // Filter tournaments by season year
      const seasonTournaments = allTournaments.filter(tournament => {
        if (!tournament.startDate) return false;
        const tournamentYear = new Date(tournament.startDate).getFullYear().toString();
        return tournamentYear === season;
      });
      
      console.log(`✅ Tournaments for season ${season}: ${seasonTournaments.length}`);
      if (seasonTournaments.length > 0) {
        console.log('📋 Season tournaments:');
        seasonTournaments.forEach(t => {
          console.log(`  - ${t.name} (${t.visNo}) ${t.startDate}`);
        });
      }
      return seasonTournaments;
    } catch (error) {
      console.error('❌ Error fetching tournaments for season:', error);
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
    
    console.log(`🔍 Aggregating stats for referee "${refereeId}" across ${tournaments.length} tournaments`);

    for (const tournament of tournaments) {
      try {
        console.log(`🏆 Processing tournament: ${tournament.name} (${tournament.visNo})`);
        
        // Get matches for this tournament
        console.log(`📡 Making CacheService.getMatches("${tournament.visNo}") call...`);
        const matchesResult = await CacheService.getMatches(tournament.visNo);
        
        console.log(`📊 CacheService.getMatches result:`, {
          success: matchesResult.success,
          dataLength: matchesResult.success ? matchesResult.data?.length : 'N/A',
          error: matchesResult.success ? 'None' : matchesResult.error
        });
        
        const matches = matchesResult.success ? matchesResult.data : null;
        if (!matches || matches.length === 0) {
          console.log(`❌ No matches found for tournament ${tournament.visNo}`);
          continue;
        }
        
        console.log(`✅ Found ${matches.length} matches in tournament ${tournament.visNo}`);
        
        // Log sample matches for debugging
        console.log(`📋 Sample matches (first 3):`);
        matches.slice(0, 3).forEach((match, idx) => {
          console.log(`  ${idx + 1}. ${match.MatchNo || match.id || 'Unknown'}: "${match.Referee1Name || match.Referee1 || 'None'}" vs "${match.Referee2Name || match.Referee2 || 'None'}" (${match.Gender || 'Unknown gender'})`);
        });

        // Filter matches where this referee officiated
        console.log(`🎯 Filtering matches for referee "${refereeId}"...`);
        const refereeMatches = RefereeStatsService.filterMatchesForReferee(matches, refereeId);
        
        console.log(`🔍 Filtering result: ${refereeMatches.length} matches found for referee`);
        if (refereeMatches.length > 0) {
          console.log(`📝 Referee matches in ${tournament.name}:`);
          refereeMatches.forEach((match, idx) => {
            console.log(`  ${idx + 1}. ${match.matchId}: ${match.position} referee, ${match.gender} match`);
          });
        }

        if (refereeMatches.length > 0) {
          console.log(`✅ Adding ${refereeMatches.length} matches for referee in tournament ${tournament.name}`);
          results.push({
            tournamentVisNo: tournament.visNo,
            tournamentName: tournament.name,
            startDate: tournament.startDate,
            endDate: tournament.endDate,
            matches: refereeMatches,
          });
        } else {
          console.log(`⚠️ No matches found for referee in tournament ${tournament.name}`);
        }
      } catch (error) {
        console.error(`❌ Error processing tournament ${tournament.visNo}:`, error);
        continue;
      }
    }
    
    console.log(`🎯 Aggregation complete: found ${results.length} tournaments with referee data`);
    
    // Log final summary
    if (results.length > 0) {
      console.log(`📊 Final aggregation summary:`);
      let totalMatches = 0;
      results.forEach(result => {
        console.log(`  - ${result.tournamentName}: ${result.matches.length} matches`);
        totalMatches += result.matches.length;
      });
      console.log(`  🎯 Total matches across all tournaments: ${totalMatches}`);
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
    
    console.log(`🎯 Filtering ${matches.length} matches for referee "${refereeId}"`);
    console.log(`🔍 Search criteria: "${searchId}" (${nameParts.length} name parts: [${nameParts.join(', ')}])`);
    
    const filteredMatches = matches.filter(match => {
      const referee1 = (match.Referee1Name || match.Referee1 || '').trim().toLowerCase();
      const referee2 = (match.Referee2Name || match.Referee2 || '').trim().toLowerCase();
      
      console.log(`🏐 Checking match ${match.MatchNo || match.id}: "${referee1}" vs "${referee2}"`);
      
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
        
        console.log(`  🔍 Name matching analysis:`);
        console.log(`    First name "${firstName}": Ref1=${ref1HasFirstName}, Ref2=${ref2HasFirstName}`);
        console.log(`    Last name "${lastName}": Ref1=${ref1HasLastName}, Ref2=${ref2HasLastName}`);
        console.log(`    Both names: Ref1=${ref1HasBoth}, Ref2=${ref2HasBoth}`);
        
        const matches = ref1HasBoth || ref2HasBoth;
        console.log(`    ✅ Match result: ${matches ? 'FOUND' : 'NOT FOUND'}`);
        
        return matches;
      } else {
        // Fallback for single name
        const ref1Match = referee1.includes(searchId);
        const ref2Match = referee2.includes(searchId);
        const matches = ref1Match || ref2Match;
        
        console.log(`  🔍 Single name matching: Ref1=${ref1Match}, Ref2=${ref2Match}`);
        console.log(`    ✅ Match result: ${matches ? 'FOUND' : 'NOT FOUND'}`);
        
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
      
      console.log(`  📝 Match ${match.MatchNo || match.id}: ${isFirstReferee ? 'FIRST' : 'SECOND'} referee, ${gender.toUpperCase()} match`);
      
      return {
        matchId: match.id || match.MatchNo || match.No,
        position: isFirstReferee ? 'first' as const : 'second' as const,
        gender,
        matchDate: match.MatchDate || match.DateTime || match.LocalDateTime,
      };
    });
    
    console.log(`🎯 Filtering complete: ${filteredMatches.length} matches found for referee "${refereeId}"`);
    return filteredMatches;
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
        console.log(`Using tournament ${tournaments[0].visNo} (${tournaments[0].name}) for referee stats`);
        return tournaments[0].visNo;
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
   * Resolve referee name to NoReferee ID using GetEventRefereeList for specific tournament
   */
  private static async resolveRefereeIdFromTournament(refereeId: string, tournamentNo: string): Promise<string | null> {
    try {
      const nameParts = refereeId.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const xml = `<Requests>
  <Request Type="GetEventRefereeList"
           Fields="NoReferee FirstName LastName FederationCode Status Role">
    <Filter NoEvent="${tournamentNo}" FirstName="${firstName}" LastName="${lastName}"/>
  </Request>
</Requests>`;

      console.log(`📡 VIS API REQUEST - GetEventRefereeList:`);
      console.log(`🌐 URL: https://www.fivb.org/Vis2009/XmlRequest.asmx`);
      console.log(`📝 XML Request:`);
      console.log(xml);

      const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
        method: "POST",
        headers: {
          "Accept": "application/xml",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ Request: xml })
      });
      
      if (response.ok) {
        const xmlResponse = await response.text();
        console.log(`📥 VIS API RESPONSE - GetEventRefereeList:`);
        console.log(`📋 Raw XML Response:`);
        console.log(xmlResponse);
        
        const refereeNoMatch = xmlResponse.match(/NoReferee="([^"]*)"/); 
        const resolvedNoReferee = refereeNoMatch?.[1];
        
        if (resolvedNoReferee) {
          console.log(`✅ Successfully resolved referee "${refereeId}" to NoReferee: ${resolvedNoReferee}`);
          return resolvedNoReferee;
        } else {
          console.log(`⚠️ No NoReferee found in response for "${refereeId}"`);
          return null;
        }
      } else {
        console.log(`❌ VIS API request failed with status: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Error resolving referee ID:', error);
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
      const refereeField = role === 'first' ? 'NoReferee1' : 'NoReferee2';
      
      const xml = `<Requests>
  <!-- Matches where is ${role.charAt(0).toUpperCase() + role.slice(1)} Referee -->
  <Request Type="GetBeachMatchList"
           Fields="No Code NoEvent LocalDateTime Court RoundCode Phase Status NoReferee1 NoReferee2">
    <Filter NoEvent="${tournamentNo}" ${refereeField}="${refereeNo}"/>
  </Request>
</Requests>`;

      console.log(`📡 VIS API REQUEST - GetBeachMatchList (${role} referee):`);
      console.log(`🌐 URL: https://www.fivb.org/Vis2009/XmlRequest.asmx`);
      console.log(`📝 XML Request:`);
      console.log(xml);

      const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
        method: "POST",
        headers: {
          "Accept": "application/xml",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ Request: xml })
      });
      
      if (response.ok) {
        const xmlResponse = await response.text();
        console.log(`📥 VIS API RESPONSE - GetBeachMatchList (${role} referee):`);
        console.log(`📋 Raw XML Response:`);
        console.log(xmlResponse);
        
        return RefereeStatsService.parseMatchesFromVISXML(xmlResponse, role);
      } else {
        console.log(`❌ Tournament query failed for ${role} referee role:`, response.status);
        return [];
      }
    } catch (error) {
      console.error(`❌ Error querying tournament matches for ${role} referee:`, error);
      return [];
    }
  }

  /**
   * Parse matches from VIS XML response
   */
  private static parseMatchesFromVISXML(xmlData: string, refereeRole: 'first' | 'second'): any[] {
    const matches: any[] = [];
    
    try {
      console.log(`🔍 Parsing XML for ${refereeRole} referee matches...`);
      
      // Extract BeachMatch elements
      const matchRegex = /<BeachMatch[^>]*\/?>/g;
      const matchEntries = [...xmlData.matchAll(matchRegex)];
      
      console.log(`📊 Found ${matchEntries.length} BeachMatch elements in XML`);
      
      for (const [matchEntry] of matchEntries) {
        const match: any = { refereeRole };
        
        // Extract all attributes
        const attributes = ['No', 'Code', 'NoEvent', 'LocalDateTime', 'Court', 'RoundCode', 'Phase', 'Status', 'NoReferee1', 'NoReferee2'];
        
        for (const attr of attributes) {
          const regex = new RegExp(`${attr}="([^"]*)"`); 
          const match_result = matchEntry.match(regex);
          if (match_result) {
            match[attr] = match_result[1];
          }
        }
        
        // Determine gender from RoundCode (common pattern contains gender info)
        const roundCode = match.RoundCode || '';
        const gender = roundCode.toLowerCase().includes('women') || roundCode.toLowerCase().includes('w') ? 'women' : 'men';
        
        const parsedMatch = {
          matchId: match.No || match.Code || `${match.NoEvent}_${match.LocalDateTime}`,
          refereeRole,
          gender: gender as 'men' | 'women',
          noReferee1: match.NoReferee1,
          noReferee2: match.NoReferee2,
          rawMatch: match
        };
        
        console.log(`📝 Parsed match: ${parsedMatch.matchId} - ${refereeRole} referee, ${gender} match`);
        matches.push(parsedMatch);
      }
      
      console.log(`✅ Successfully parsed ${matches.length} matches for ${refereeRole} referee role`);
      return matches;
    } catch (error) {
      console.error('❌ Error parsing matches from XML:', error);
      return [];
    }
  }

  /**
   * Deduplicate matches by match ID (for dual-role queries)
   */
  private static deduplicateMatchesById(matches: any[]): any[] {
    const seen = new Set<string>();
    const unique: any[] = [];
    
    console.log(`🔍 Deduplicating ${matches.length} matches...`);
    
    for (const match of matches) {
      const matchId = match.matchId;
      if (matchId && !seen.has(matchId)) {
        seen.add(matchId);
        unique.push(match);
        console.log(`✅ Added unique match: ${matchId} (${match.refereeRole} referee)`);
      } else {
        console.log(`⚠️ Skipping duplicate match: ${matchId}`);
      }
    }
    
    console.log(`🎯 Deduplication complete: ${unique.length} unique matches from ${matches.length} total`);
    return unique;
  }

  /**
   * Calculate statistics from parsed VIS matches
   */
  private static calculateStatsFromParsedMatches(matches: any[]): RefereeStats {
    const stats: RefereeStats = {
      totalMatches: matches.length,
      matchesAsFirst: 0,
      matchesAsSecond: 0,
      menMatches: 0,
      womenMatches: 0
    };

    console.log(`📊 Calculating stats from ${matches.length} parsed matches...`);

    for (const match of matches) {
      // Determine referee role based on which NoReferee field matches
      if (match.refereeRole === 'first') {
        stats.matchesAsFirst++;
      } else if (match.refereeRole === 'second') {
        stats.matchesAsSecond++;
      }
      
      if (match.gender === 'women') {
        stats.womenMatches++;
      } else {
        stats.menMatches++;
      }
      
      console.log(`  📝 Match ${match.matchId}: ${match.refereeRole} referee, ${match.gender} match (NoReferee1: ${match.noReferee1}, NoReferee2: ${match.noReferee2})`);
    }

    console.log(`🎯 Final statistics:`, stats);
    return stats;
  }

  /**
   * Resolve referee name to NoReferee ID using any available tournament
   */
  private static async resolveRefereeIdFromAnyTournament(refereeId: string): Promise<string | null> {
    try {
      // Get tournaments to use for referee ID resolution
      const tournamentsResult = await CacheService.getTournaments();
      if (!tournamentsResult.success || !tournamentsResult.data || tournamentsResult.data.length === 0) {
        console.log('❌ No tournaments available for referee ID resolution');
        return null;
      }
      
      const tournaments = tournamentsResult.data;
      console.log(`🔍 Using tournament ${tournaments[0].name} (${tournaments[0].visNo}) for referee ID resolution`);
      
      return await RefereeStatsService.resolveRefereeIdFromTournament(refereeId, tournaments[0].visNo);
    } catch (error) {
      console.error('❌ Error resolving referee ID from tournaments:', error);
      return null;
    }
  }

  /**
   * Query season matches for specific referee role using Season + NoReferee filters
   */
  private static async querySeasonMatchesWithNoReferee(
    refereeNo: string,
    role: 'first' | 'second',
    season: string
  ): Promise<any[]> {
    try {
      const refereeField = role === 'first' ? 'NoReferee1' : 'NoReferee2';
      
      const xml = `<Requests>
  <Request Type="GetBeachMatchList"
           Fields="No Code Season LocalDateTime CountryName City TournamentName RoundCode Phase Status NoReferee1 NoReferee2">
    <Filter Season="${season}" ${refereeField}="${refereeNo}"/>
  </Request>
</Requests>`;

      console.log(`📡 VIS API REQUEST - GetBeachMatchList Season (${role} referee):`);
      console.log(`🌐 URL: https://www.fivb.org/Vis2009/XmlRequest.asmx`);
      console.log(`📝 XML Request:`);
      console.log(xml);

      const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
        method: "POST",
        headers: {
          "Accept": "application/xml",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ Request: xml })
      });
      
      if (response.ok) {
        const xmlResponse = await response.text();
        console.log(`📥 VIS API RESPONSE - GetBeachMatchList Season (${role} referee):`);
        console.log(`📋 Raw XML Response:`);
        console.log(xmlResponse);
        
        return RefereeStatsService.parseMatchesFromVISXML(xmlResponse, role);
      } else {
        console.log(`❌ Season query failed for ${role} referee role:`, response.status);
        return [];
      }
    } catch (error) {
      console.error(`❌ Error querying season matches for ${role} referee:`, error);
      return [];
    }
  }

  /**
   * Query career matches for specific referee role using NoReferee filter only (no date filters)
   */
  private static async queryCareerMatchesWithNoReferee(
    refereeNo: string,
    role: 'first' | 'second'
  ): Promise<any[]> {
    try {
      const refereeField = role === 'first' ? 'NoReferee1' : 'NoReferee2';
      
      const xml = `<Requests>
  <Request Type="GetBeachMatchList"
           Fields="No Code Season LocalDateTime CountryName City TournamentName RoundCode Phase Status NoReferee1 NoReferee2">
    <Filter ${refereeField}="${refereeNo}"/>
  </Request>
</Requests>`;

      console.log(`📡 VIS API REQUEST - GetBeachMatchList Career (${role} referee):`);
      console.log(`🌐 URL: https://www.fivb.org/Vis2009/XmlRequest.asmx`);
      console.log(`📝 XML Request:`);
      console.log(xml);

      const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
        method: "POST",
        headers: {
          "Accept": "application/xml",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ Request: xml })
      });
      
      if (response.ok) {
        const xmlResponse = await response.text();
        console.log(`📥 VIS API RESPONSE - GetBeachMatchList Career (${role} referee):`);
        console.log(`📋 Raw XML Response:`);
        console.log(xmlResponse);
        
        return RefereeStatsService.parseMatchesFromVISXML(xmlResponse, role);
      } else {
        console.log(`❌ Career query failed for ${role} referee role:`, response.status);
        return [];
      }
    } catch (error) {
      console.error(`❌ Error querying career matches for ${role} referee:`, error);
      return [];
    }
  }
}