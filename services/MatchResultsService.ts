import AsyncStorage from '@react-native-async-storage/async-storage';
import { BeachMatch } from '../types/match';
import { MatchResult, MatchResultsStatus, MatchResultsCache } from '../types/MatchResults';
import { CacheServiceCompatibility as CacheService } from '../hooks/compatibility/CacheServiceCompatibility';

export class MatchResultsService {
  private static readonly MATCH_RESULTS_CACHE_KEY = '@match_results_cache';
  private static readonly CACHE_EXPIRY_MINUTES_LIVE = 0.5; // 30 seconds for live matches
  private static readonly CACHE_EXPIRY_MINUTES_COMPLETED = 15; // 15 minutes for completed matches

  /**
   * Get match results for a specific tournament
   */
  static async getMatchResults(tournamentNo: string, forceRefresh = false): Promise<MatchResultsStatus> {
    
    try {
      // Try cache first if not forcing refresh
      if (!forceRefresh) {
        const cachedData = await this.getCachedMatchResults(tournamentNo);
        if (cachedData) {
          return cachedData;
        }
      } else {
      }

      // Fetch match data from API/Cache
      const matches = await this.fetchMatchData(tournamentNo);
      
      // Transform and categorize matches
      const matchResults = matches.map(match => this.transformToMatchResult(match));
      const categorizedResults = this.categorizeMatches(matchResults);
      
      // Cache the results
      await this.cacheMatchResults(tournamentNo, categorizedResults);
      
      return categorizedResults;
    } catch (error) {
      // console.error('MatchResultsService: Failed to get match results:', error);
      // console.error('MatchResultsService: Error type:', error instanceof Error ? error.constructor.name : typeof error);
      // console.error('MatchResultsService: Error message:', error instanceof Error ? error.message : String(error));
      
      // Try to return cached data as fallback, even if expired
      const cachedData = await this.getCachedMatchResults(tournamentNo);
      if (cachedData) {
        return cachedData;
      }
      
      // If no cached data available, provide sample results for testing
      if (error instanceof Error && (error.message.includes('Premature close') || error.message.includes('timeout'))) {
        return this.getSampleMatchResults(tournamentNo);
      }
      
      throw error;
    }
  }

  /**
   * Get live matches only (for focused updates)
   */
  static async getLiveMatches(tournamentNo: string): Promise<MatchResult[]> {
    const results = await this.getMatchResults(tournamentNo, true); // Always refresh live matches
    return results.live;
  }

  /**
   * Get completed matches only
   */
  static async getCompletedMatches(tournamentNo: string): Promise<MatchResult[]> {
    const results = await this.getMatchResults(tournamentNo);
    return results.completed;
  }

  /**
   * Transform FIVB match data to MatchResult format
   */
  private static transformToMatchResult(match: BeachMatch): MatchResult {
    const normalizedStatus = this.normalizeMatchStatus(match.Status);
    
    return {
      no: match.No || '',
      tournamentNo: match.tournamentNo || '',
      teamAName: match.TeamAName || 'Team A',
      teamBName: match.TeamBName || 'Team B',
      status: normalizedStatus,
      
      // Parse scoring data using helper method
      matchPointsA: this.parseNumericField(match.MatchPointsA),
      matchPointsB: this.parseNumericField(match.MatchPointsB),
      pointsTeamASet1: this.parseNumericField(match.PointsTeamASet1),
      pointsTeamBSet1: this.parseNumericField(match.PointsTeamBSet1),
      pointsTeamASet2: this.parseNumericField(match.PointsTeamASet2),
      pointsTeamBSet2: this.parseNumericField(match.PointsTeamBSet2),
      pointsTeamASet3: this.parseNumericField(match.PointsTeamASet3),
      pointsTeamBSet3: this.parseNumericField(match.PointsTeamBSet3),
      
      // Referee information
      referee1No: match.NoReferee1 || undefined,
      referee1Name: match.Referee1Name || undefined,
      referee1FederationCode: match.Referee1FederationCode || undefined,
      referee2No: match.NoReferee2 || undefined,
      referee2Name: match.Referee2Name || undefined,
      referee2FederationCode: match.Referee2FederationCode || undefined,
      
      // Match metadata
      durationSet1: match.DurationSet1 || '',
      durationSet2: match.DurationSet2 || '',
      durationSet3: match.DurationSet3 || '',
      localDate: this.parseDateField(match.LocalDate),
      localTime: match.LocalTime || '',
      court: match.Court || '',
      round: match.Round || '',
    };
  }

  /**
   * Safely parse numeric fields from API data
   */
  private static parseNumericField(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Safely parse date fields from API data
   */
  private static parseDateField(dateValue: unknown): Date {
    if (!dateValue) return new Date();
    
    try {
      const parsed = new Date(dateValue as string);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    } catch (error) {
      // console.warn('Failed to parse date field:', dateValue, error);
      return new Date();
    }
  }

  /**
   * Normalize match status to consistent values
   */
  private static normalizeMatchStatus(status?: string): 'Scheduled' | 'Running' | 'Finished' | 'Cancelled' {
    if (!status) return 'Scheduled';
    
    // Handle numeric status codes from FIVB API
    const statusCode = parseInt(status, 10);
    if (!isNaN(statusCode)) {
      
      // FIVB Status codes mapping (based on API documentation and testing)
      switch (statusCode) {
        case 0: // Scheduled/Not started
        case 1: // Scheduled
        case 5: // Warm up
          return 'Scheduled';
        case 10: // Running/Live
        case 11: // Running
        case 12: // Running - Set break
          return 'Running';
        case 15: // Finished/Final
        case 16: // Finished
          return 'Finished';
        case 20: // Cancelled
        case 21: // Postponed
        case 25: // Walkover
          return 'Cancelled';
        default:
          // console.warn(`MatchResultsService: Unknown status code ${statusCode}, defaulting to Scheduled`);
          return 'Scheduled';
      }
    }
    
    // Handle text-based status values (fallback for other data sources)
    const normalizedStatus = status.toLowerCase();
    
    if (normalizedStatus.includes('running') || normalizedStatus.includes('active') || normalizedStatus.includes('live')) {
      return 'Running';
    }
    
    if (normalizedStatus.includes('finished') || normalizedStatus.includes('final') || normalizedStatus.includes('complete')) {
      return 'Finished';
    }
    
    if (normalizedStatus.includes('cancelled') || normalizedStatus.includes('postponed')) {
      return 'Cancelled';
    }
    
    return 'Scheduled';
  }

  /**
   * Categorize matches by status
   */
  private static categorizeMatches(matches: MatchResult[]): MatchResultsStatus {
    const live: MatchResult[] = [];
    const completed: MatchResult[] = [];
    const scheduled: MatchResult[] = [];

    matches.forEach(match => {
      if (match.status === 'Running') {
        live.push(match);
      } else if (match.status === 'Finished') {
        completed.push(match);
      } else if (match.status === 'Scheduled') {
        scheduled.push(match);
      }
      // Note: Cancelled matches are not displayed per UI requirements
    });

    // Sort live matches by time (earliest first)
    live.sort((a, b) => new Date(a.localDate).getTime() - new Date(b.localDate).getTime());
    
    // Sort completed matches by time (most recent first)
    completed.sort((a, b) => new Date(b.localDate).getTime() - new Date(a.localDate).getTime());
    
    // Sort scheduled matches by time (earliest first)
    scheduled.sort((a, b) => new Date(a.localDate).getTime() - new Date(b.localDate).getTime());

    return { live, completed, scheduled };
  }

  /**
   * Fetch match data using existing cache/API infrastructure
   */
  private static async fetchMatchData(tournamentNo: string): Promise<BeachMatch[]> {
    
    try {
      // Use CacheService if available, otherwise fall back to direct API
      const cachedMatches = await CacheService.getMatchesFromSupabase?.(tournamentNo);
      if (cachedMatches && cachedMatches.length > 0) {
        return cachedMatches;
      }
    } catch (error) {
      // console.warn('MatchResultsService: Cache service unavailable, using direct API:', error);
    }

    try {
      // Fallback to direct API call with timeout
      const matches = await Promise.race([
        VisApiService.getBeachMatchList(tournamentNo),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('API timeout after 30 seconds')), 30000)
        )
      ]);
      return matches;
    } catch (error) {
      // console.error('MatchResultsService: Direct API call failed:', error);
      
      // If it's a network error, provide empty array instead of failing
      if (error instanceof Error && (error.message.includes('Premature close') || error.message.includes('timeout'))) {
        return [];
      }
      
      throw error;
    }
  }

  /**
   * Cache match results data
   */
  private static async cacheMatchResults(tournamentNo: string, results: MatchResultsStatus): Promise<void> {
    try {
      const cacheData: MatchResultsCache = {
        tournamentNo,
        data: results,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(
        `${this.MATCH_RESULTS_CACHE_KEY}_${tournamentNo}`, 
        JSON.stringify(cacheData)
      );
    } catch (error) {
      // console.warn('Failed to cache match results:', error);
    }
  }

  /**
   * Get cached match results if valid
   */
  private static async getCachedMatchResults(tournamentNo: string): Promise<MatchResultsStatus | null> {
    try {
      const cached = await AsyncStorage.getItem(`${this.MATCH_RESULTS_CACHE_KEY}_${tournamentNo}`);
      if (!cached) return null;

      const cacheData: MatchResultsCache = JSON.parse(cached);
      const now = Date.now();
      const cacheAge = now - cacheData.timestamp;
      
      // Use different TTL based on whether we have live matches
      const hasLiveMatches = cacheData.data.live.length > 0;
      const maxAge = hasLiveMatches 
        ? this.CACHE_EXPIRY_MINUTES_LIVE * 60 * 1000 
        : this.CACHE_EXPIRY_MINUTES_COMPLETED * 60 * 1000;

      if (cacheAge > maxAge) {
        return null; // Cache expired
      }

      return cacheData.data;
    } catch (error) {
      // console.warn('Failed to get cached match results:', error);
      return null;
    }
  }

  /**
   * Clear cached match results data
   */
  static async clearMatchResultsCache(tournamentNo?: string): Promise<void> {
    try {
      if (tournamentNo) {
        await AsyncStorage.removeItem(`${this.MATCH_RESULTS_CACHE_KEY}_${tournamentNo}`);
      } else {
        // Clear all match results caches
        const keys = await AsyncStorage.getAllKeys();
        const matchResultKeys = keys.filter(key => key.startsWith(this.MATCH_RESULTS_CACHE_KEY));
        await AsyncStorage.multiRemove(matchResultKeys);
      }
    } catch (error) {
      // console.error('Failed to clear match results cache:', error);
    }
  }

  /**
   * Get refresh interval based on match status
   */
  static getRefreshInterval(results: MatchResultsStatus): number {
    // If there are live matches, refresh every 30 seconds
    if (results.live.length > 0) {
      return 30000;
    }
    
    // If there are scheduled matches, refresh every 5 minutes
    if (results.scheduled.length > 0) {
      return 300000;
    }
    
    // Otherwise refresh every 30 minutes
    return 1800000;
  }

  /**
   * Format score for display
   */
  static formatScore(match: MatchResult): string {
    const sets: string[] = [];
    
    // Add set 1 if played
    if (match.pointsTeamASet1 > 0 || match.pointsTeamBSet1 > 0) {
      sets.push(`${match.pointsTeamASet1}-${match.pointsTeamBSet1}`);
    }
    
    // Add set 2 if played
    if (match.pointsTeamASet2 > 0 || match.pointsTeamBSet2 > 0) {
      sets.push(`${match.pointsTeamASet2}-${match.pointsTeamBSet2}`);
    }
    
    // Add set 3 if played
    if (match.pointsTeamASet3 > 0 || match.pointsTeamBSet3 > 0) {
      sets.push(`${match.pointsTeamASet3}-${match.pointsTeamBSet3}`);
    }
    
    return sets.join(', ') || '0-0';
  }

  /**
   * Get match duration for display
   */
  static getMatchDuration(match: MatchResult): string {
    const durations: string[] = [];
    
    if (match.durationSet1) durations.push(match.durationSet1);
    if (match.durationSet2) durations.push(match.durationSet2);
    if (match.durationSet3) durations.push(match.durationSet3);
    
    if (durations.length === 0) return '';
    
    return `Duration: ${durations.join(', ')}`;
  }

  /**
   * Format referees for display
   */
  static formatReferees(match: MatchResult): string {
    const referees: string[] = [];
    
    if (match.referee1Name) {
      let ref1 = match.referee1Name;
      if (match.referee1FederationCode) {
        ref1 += ` (${match.referee1FederationCode})`;
      }
      referees.push(ref1);
    }
    
    if (match.referee2Name) {
      let ref2 = match.referee2Name;
      if (match.referee2FederationCode) {
        ref2 += ` (${match.referee2FederationCode})`;
      }
      referees.push(ref2);
    }
    
    return referees.join(' • ') || 'Referees TBD';
  }

  /**
   * Get match result summary (who won)
   */
  static getMatchResultSummary(match: MatchResult): { winner: string; loser: string; setsWon: string; winnerCountryCode?: string; loserCountryCode?: string } | null {
    if (match.status !== 'Finished') return null;
    
    const teamAWon = match.matchPointsA > match.matchPointsB;
    const winner = teamAWon ? match.teamAName : match.teamBName;
    const loser = teamAWon ? match.teamBName : match.teamAName;
    const winnerCountryCode = teamAWon ? match.teamACountryCode : match.teamBCountryCode;
    const loserCountryCode = teamAWon ? match.teamBCountryCode : match.teamACountryCode;
    const setsWon = `${Math.max(match.matchPointsA, match.matchPointsB)}-${Math.min(match.matchPointsA, match.matchPointsB)}`;
    
    return { winner, loser, setsWon, winnerCountryCode, loserCountryCode };
  }

  /**
   * Get sample match results for testing when API is unavailable
   */
  static getSampleMatchResults(tournamentNo: string): MatchResultsStatus {
    
    const sampleLiveMatch: MatchResult = {
      no: 'M001',
      tournamentNo,
      teamAName: 'Smith/Johnson',
      teamBName: 'Garcia/Rodriguez',
      status: 'Running',
      matchPointsA: 1,
      matchPointsB: 0,
      pointsTeamASet1: 21,
      pointsTeamBSet1: 19,
      pointsTeamASet2: 15,
      pointsTeamBSet2: 18,
      pointsTeamASet3: 0,
      pointsTeamBSet3: 0,
      referee1No: 'R001',
      referee1Name: 'John Wilson',
      referee1FederationCode: 'USA',
      referee2No: 'R002',
      referee2Name: 'Maria Santos',
      referee2FederationCode: 'BRA',
      durationSet1: '22:15',
      durationSet2: '25:30',
      durationSet3: '',
      localDate: new Date(),
      localTime: '14:30',
      court: 'Court 1',
      round: 'Pool A',
    };

    const sampleCompletedMatch: MatchResult = {
      no: 'M002',
      tournamentNo,
      teamAName: 'Anderson/Brown',
      teamBName: 'Williams/Davis',
      status: 'Finished',
      matchPointsA: 2,
      matchPointsB: 1,
      pointsTeamASet1: 21,
      pointsTeamBSet1: 17,
      pointsTeamASet2: 19,
      pointsTeamBSet2: 21,
      pointsTeamASet3: 15,
      pointsTeamBSet3: 12,
      referee1No: 'R003',
      referee1Name: 'Carlos Martinez',
      referee1FederationCode: 'ESP',
      referee2No: 'R004',
      referee2Name: 'Anna Mueller',
      referee2FederationCode: 'GER',
      durationSet1: '20:45',
      durationSet2: '23:12',
      durationSet3: '18:30',
      localDate: new Date(Date.now() - 3600000), // 1 hour ago
      localTime: '13:15',
      court: 'Court 2',
      round: 'Pool B',
    };

    return {
      live: [sampleLiveMatch],
      completed: [sampleCompletedMatch],
      scheduled: []
    };
  }
}