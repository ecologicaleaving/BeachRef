import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import NodeCache from 'node-cache';
// import * as xml2js from 'xml2js'; // Not needed for JSON responses
import { config } from '../config/environment';
import { visCircuitBreaker, retryWithBackoff } from '../middleware/error.middleware';
import { visLogger } from '../utils/logger';
import {
  VISTournament,
  Tournament,
  TournamentDetail,
  TournamentFilters,
  Match,
  HealthStatus,
  VISConfig,
  VISAPIError,
  TournamentLevel,
  TournamentStatus,
  MatchStatus
} from '../types/vis.types';
import { Match as TournamentMatch } from '../types/tournament.types';

// Extend axios config to include metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: { startTime: number };
  }
}

export class VISService {
  private client: AxiosInstance;
  private cache: NodeCache;
  private visConfig: VISConfig;

  constructor() {
    this.visConfig = {
      baseURL: config.visApi.url,
      timeout: config.visApi.timeout,
      retryAttempts: 3,
      rateLimitRpm: config.rateLimit.maxRequests,
      authToken: config.visApi.key
    };

    this.cache = new NodeCache({ 
      stdTTL: config.cache.ttl,
      checkperiod: 60 
    });

    this.client = axios.create({
      baseURL: this.visConfig.baseURL,
      timeout: this.visConfig.timeout,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        ...(this.visConfig.authToken && {
          'X-FIVB-App-ID': this.visConfig.authToken
        })
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        const requestId = config.headers['x-request-id'] as string;
        visLogger.request(config.method?.toUpperCase() || 'GET', config.url || '', requestId);
        config.metadata = { startTime: Date.now() };
        return config;
      },
      (error) => {
        visLogger.error('Request setup failed', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        const startTime = response.config.metadata?.startTime || Date.now();
        const responseTime = Date.now() - startTime;
        const requestId = response.config.headers['x-request-id'] as string;
        
        visLogger.response(
          response.config.method?.toUpperCase() || 'GET',
          response.config.url || '',
          response.status,
          responseTime,
          requestId
        );
        
        return response;
      },
      (error) => {
        const startTime = error.config?.metadata?.startTime || Date.now();
        const responseTime = Date.now() - startTime;
        const requestId = error.config?.headers['x-request-id'] as string;
        
        if (error.response) {
          visLogger.response(
            error.config.method?.toUpperCase() || 'GET',
            error.config.url || '',
            error.response.status,
            responseTime,
            requestId
          );
          
          const visError = new VISAPIError(
            `VIS API Error: ${error.response.data?.message || error.message}`,
            error.response.status,
            error
          );
          visLogger.error('VIS API request failed', visError, { 
            status: error.response.status,
            url: error.config.url 
          });
          throw visError;
        } else if (error.request) {
          const visError = new VISAPIError(
            'VIS API Network Error: No response received',
            0,
            error
          );
          visLogger.error('VIS API network error', visError);
          throw visError;
        } else {
          const visError = new VISAPIError(
            `VIS API Request Setup Error: ${error.message}`,
            0,
            error
          );
          visLogger.error('VIS API request setup error', visError);
          throw visError;
        }
      }
    );
  }

  async healthCheck(): Promise<HealthStatus> {
    const cacheKey = 'vis_health_check';
    const cached = this.cache.get<HealthStatus>(cacheKey);
    
    if (cached) {
      visLogger.cache('hit', cacheKey, true);
      return cached;
    }

    visLogger.cache('miss', cacheKey, false);

    try {
      const healthStatus = await visCircuitBreaker.execute(async () => {
        const startTime = Date.now();
        
        // VIS health check using GetServiceInformation request
        const xmlRequest = `<Request Type='GetServiceInformation' />`;
        
        // Use retry logic for health check
        const response = await retryWithBackoff(
          () => this.makeVISRequest(xmlRequest),
          2, // Max 2 retries for health check
          500, // 500ms base delay
          2000 // 2s max delay
        );
        
        const responseTime = Date.now() - startTime;
        
        // Check if we got a valid VIS JSON response
        const responseData = response.data;
        const isHealthy = responseData && (
          responseData.id === 'FivbVis' || 
          (responseData.responses && responseData.responses.length > 0)
        );
        
        const status: HealthStatus = {
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          responseTime
        };

        visLogger.health(status.status, responseTime);
        return status;
      });

      // Cache for 30 seconds
      this.cache.set(cacheKey, healthStatus, 30);
      return healthStatus;
      
    } catch (error) {
      const healthStatus: HealthStatus = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof VISAPIError ? error.message : 'Unknown error'
      };

      visLogger.health('unhealthy', undefined, healthStatus.error);

      // Cache failed status for shorter time (10 seconds)
      this.cache.set(cacheKey, healthStatus, 10);
      return healthStatus;
    }
  }

  async getTournamentCount(): Promise<number> {
    const cacheKey = 'tournament_count';
    const cached = this.cache.get<number>(cacheKey);
    
    if (cached !== undefined) {
      return cached;
    }

    try {
      // VIS XML request to get tournament list with count
      const xmlRequest = `<Requests><Request Type='GetTournaments' Fields='TournamentId' /></Requests>`;
      
      const response = await this.makeVISRequest(xmlRequest);
      
      // Extract tournament count from VIS JSON response
      let count = 0;
      if (response.data?.responses?.[0]?.tournaments) {
        const tournaments = response.data.responses[0].tournaments;
        count = Array.isArray(tournaments) ? tournaments.length : 1;
      }
      
      // Cache for 5 minutes
      this.cache.set(cacheKey, count, 300);
      return count;
      
    } catch (error) {
      visLogger.error('Failed to get tournament count', error as Error, { method: 'getTournamentCount' });
      throw error;
    }
  }

  async getTournaments(filters: TournamentFilters = {}): Promise<Tournament[]> {
    const cacheKey = `tournaments_${JSON.stringify(filters)}`;
    const cached = this.cache.get<Tournament[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const tournaments = await visCircuitBreaker.execute(async () => {
        // Build VIS XML request for tournaments
        const xmlRequest = this.buildTournamentXMLRequest(filters);
        
        // Use retry logic for tournament requests
        const response = await retryWithBackoff(
          () => this.makeVISRequest(xmlRequest),
          3, // Max 3 retries
          1000, // 1s base delay
          5000 // 5s max delay
        );
        
        // Extract tournaments from VIS JSON response
        return this.extractTournamentsFromJSONResponse(response.data);
      });
      
      // Cache for 5 minutes
      this.cache.set(cacheKey, tournaments, 300);
      
      // Store fallback data with longer TTL (1 hour)
      this.cache.set(`${cacheKey}_fallback`, tournaments, 3600);
      
      return tournaments;
      
    } catch (error) {
      visLogger.error('Failed to get tournaments', error as Error, { method: 'getTournaments', filters });
      
      // Try to return cached data as fallback
      const fallbackData = this.cache.get<Tournament[]>(`${cacheKey}_fallback`);
      if (fallbackData) {
        visLogger.info('Returning cached fallback data for tournaments', { filters });
        return fallbackData;
      }
      
      throw error;
    }
  }

  async getTournamentById(id: string): Promise<TournamentDetail | null> {
    const cacheKey = `tournament_${id}`;
    const cached = this.cache.get<TournamentDetail>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const tournament = await visCircuitBreaker.execute(async () => {
        // Build VIS XML request for specific tournament
        const xmlRequest = `<Requests><Request Type='GetTournamentInfo' TournamentId='${id}' /></Requests>`;
        
        // Use retry logic for tournament detail requests
        const response = await retryWithBackoff(
          () => this.makeVISRequest(xmlRequest),
          3, // Max 3 retries
          1000, // 1s base delay
          5000 // 5s max delay
        );
        
        // Extract tournament detail from VIS JSON response
        if (!response.data?.responses?.[0]) {
          return null;
        }

        return this.transformTournamentDetail(response.data.responses[0]);
      });
      
      if (!tournament) {
        return null;
      }
      
      // Cache for 3 minutes (per story requirements)
      this.cache.set(cacheKey, tournament, 180);
      
      // Store fallback data with longer TTL (1 hour)
      this.cache.set(`${cacheKey}_fallback`, tournament, 3600);
      
      return tournament;
      
    } catch (error) {
      if (error instanceof VISAPIError && error.statusCode === 404) {
        return null;
      }
      visLogger.error(`Failed to get tournament ${id}`, error as Error, { method: 'getTournamentById', tournamentId: id });
      
      // Try to return cached data as fallback
      const fallbackData = this.cache.get<TournamentDetail>(`${cacheKey}_fallback`);
      if (fallbackData) {
        visLogger.info('Returning cached fallback data for tournament', { tournamentId: id });
        return fallbackData;
      }
      
      throw error;
    }
  }

  async getTournamentMatches(tournamentId: string): Promise<TournamentMatch[]> {
    const cacheKey = `tournament_matches_${tournamentId}`;
    const cached = this.cache.get<TournamentMatch[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const matches = await visCircuitBreaker.execute(async () => {
        // Build VIS XML request for tournament matches
        const xmlRequest = `<Requests><Request Type='GetMatches' TournamentId='${tournamentId}' Fields='MatchId,TournamentId,Team1Players,Team2Players,StartTime,Status,Score,Round,Court' /></Requests>`;
        
        // Use retry logic for match requests
        const response = await retryWithBackoff(
          () => this.makeVISRequest(xmlRequest),
          3, // Max 3 retries
          1000, // 1s base delay
          5000 // 5s max delay
        );
        
        // Extract matches from VIS JSON response
        return this.extractMatchesFromJSONResponse(response.data, tournamentId);
      });
      
      // Cache for 2 minutes (per story requirements)
      this.cache.set(cacheKey, matches, 120);
      
      // Store fallback data with longer TTL (30 minutes)
      this.cache.set(`${cacheKey}_fallback`, matches, 1800);
      
      return matches;
      
    } catch (error) {
      visLogger.error(`Failed to get matches for tournament ${tournamentId}`, error as Error, { 
        method: 'getTournamentMatches', 
        tournamentId 
      });
      
      // Try to return cached data as fallback
      const fallbackData = this.cache.get<TournamentMatch[]>(`${cacheKey}_fallback`);
      if (fallbackData) {
        visLogger.info('Returning cached fallback data for tournament matches', { tournamentId });
        return fallbackData;
      }
      
      throw error;
    }
  }

  private buildTournamentXMLRequest(filters: TournamentFilters): string {
    // Build VIS XML request for GetTournaments
    const fields = 'TournamentId,Name,StartDate,EndDate,Country,City,Venue,Level,Status';
    let xmlRequest = `<Requests><Request Type='GetTournaments' Fields='${fields}'`;
    
    // Add filters as attributes
    if (filters.country) xmlRequest += ` Country='${filters.country}'`;
    if (filters.startDateFrom) xmlRequest += ` StartDateFrom='${filters.startDateFrom.toISOString().split('T')[0]}'`;
    if (filters.startDateTo) xmlRequest += ` StartDateTo='${filters.startDateTo.toISOString().split('T')[0]}'`;
    if (filters.limit) xmlRequest += ` MaxResults='${filters.limit}'`;
    
    xmlRequest += ' /></Requests>';
    return xmlRequest;
  }

  private extractTournamentsFromJSONResponse(responseData: any): Tournament[] {
    const tournaments: Tournament[] = [];
    
    try {
      const response = responseData?.responses?.[0];
      if (!response) return tournaments;
      
      const tournamentData = response.tournaments;
      if (!tournamentData) return tournaments;
      
      // Handle both single tournament and array of tournaments
      const tournamentArray = Array.isArray(tournamentData) ? tournamentData : [tournamentData];
      
      for (const visTournament of tournamentArray) {
        const tournament = this.transformJSONTournament(visTournament);
        if (tournament) {
          tournaments.push(tournament);
        }
      }
    } catch (error) {
      visLogger.error('Failed to extract tournaments from VIS JSON response', error as Error, { responseData });
    }
    
    return tournaments;
  }

  private transformJSONTournament(visTournament: any): Tournament | null {
    try {
      return {
        id: visTournament.tournamentId || visTournament.id,
        name: visTournament.name || 'Unknown Tournament',
        dates: {
          start: new Date(visTournament.startDate),
          end: new Date(visTournament.endDate)
        },
        location: {
          city: visTournament.city || '',
          country: visTournament.country || '',
          venue: visTournament.venue || ''
        },
        level: this.mapTournamentLevel(visTournament.level || ''),
        status: this.mapTournamentStatus(visTournament.status || ''),
        matchCount: 0 // Will be populated separately if needed
      };
    } catch (error) {
      visLogger.error('Failed to transform VIS JSON tournament', error as Error, { visTournament });
      return null;
    }
  }

  private transformTournament(visTournament: VISTournament): Tournament {
    return {
      id: visTournament.id,
      name: visTournament.name,
      dates: {
        start: new Date(visTournament.startDate),
        end: new Date(visTournament.endDate)
      },
      location: {
        city: visTournament.location.city,
        country: visTournament.location.country,
        venue: visTournament.location.venue
      },
      level: this.mapTournamentLevel(visTournament.level),
      status: this.mapTournamentStatus(visTournament.status),
      matchCount: 0 // Will be populated separately if needed
    };
  }

  private transformTournamentDetail(visTournamentInfo: any): TournamentDetail {
    const tournament = this.transformJSONTournament(visTournamentInfo);
    
    if (!tournament) {
      throw new VISAPIError('Failed to transform tournament detail', 0);
    }
    
    return {
      ...tournament,
      matches: [], // Will be populated separately with GetMatches request
      description: visTournamentInfo.description || undefined
    };
  }

  private extractMatchesFromJSONResponse(responseData: any, tournamentId: string): TournamentMatch[] {
    const matches: TournamentMatch[] = [];
    
    try {
      const response = responseData?.responses?.[0];
      if (!response) return matches;
      
      const matchData = response.matches;
      if (!matchData) return matches;
      
      // Handle both single match and array of matches
      const matchArray = Array.isArray(matchData) ? matchData : [matchData];
      
      for (const visMatch of matchArray) {
        const match = this.transformJSONMatch(visMatch, tournamentId);
        if (match) {
          matches.push(match);
        }
      }
    } catch (error) {
      visLogger.error('Failed to extract matches from VIS JSON response', error as Error, { responseData, tournamentId });
    }
    
    return matches;
  }

  private transformJSONMatch(visMatch: any, tournamentId: string): TournamentMatch | null {
    try {
      // Parse team information
      const team1Players = this.parseTeamPlayers(visMatch.team1Players || visMatch.Team1Players);
      const team2Players = this.parseTeamPlayers(visMatch.team2Players || visMatch.Team2Players);
      
      // Parse score information
      const score = this.parseMatchScore(visMatch.score || visMatch.Score);
      
      // Determine winner if match is completed
      let winner: 'team1' | 'team2' | undefined;
      if (visMatch.status?.toLowerCase() === 'completed' && score) {
        winner = this.determineWinner(score);
      }

      return {
        id: visMatch.matchId || visMatch.id,
        tournamentId,
        teams: {
          team1: {
            player1: team1Players[0] || 'Unknown Player',
            player2: team1Players[1] || '',
            country: visMatch.team1Country || visMatch.Team1Country || ''
          },
          team2: {
            player1: team2Players[0] || 'Unknown Player',
            player2: team2Players[1] || '',
            country: visMatch.team2Country || visMatch.Team2Country || ''
          }
        },
        score,
        status: this.mapMatchStatus(visMatch.status || visMatch.Status),
        scheduledTime: new Date(visMatch.startTime || visMatch.StartTime || new Date()),
        actualStartTime: visMatch.actualStartTime ? new Date(visMatch.actualStartTime) : undefined,
        duration: visMatch.duration ? parseInt(visMatch.duration, 10) : undefined,
        round: visMatch.round || visMatch.Round || 'Unknown Round',
        court: visMatch.court || visMatch.Court || 'Unknown Court',
        winner
      };
    } catch (error) {
      visLogger.error('Failed to transform VIS JSON match', error as Error, { visMatch, tournamentId });
      return null;
    }
  }

  private parseTeamPlayers(playersString: string): string[] {
    if (!playersString) return [];
    
    // Handle different player name formats from VIS API
    // Format could be: "Player1/Player2" or "Player1, Player2" or just "Player1"
    const players = playersString.split(/[/,]/).map(p => p.trim()).filter(p => p.length > 0);
    return players;
  }

  private parseMatchScore(scoreData: any): { set1?: { team1: number; team2: number; }; set2?: { team1: number; team2: number; }; set3?: { team1: number; team2: number; }; } {
    const score: { set1?: { team1: number; team2: number; }; set2?: { team1: number; team2: number; }; set3?: { team1: number; team2: number; }; } = {};
    
    if (!scoreData) return score;
    
    try {
      // Handle different score formats from VIS API
      if (typeof scoreData === 'string') {
        // Format: "21-19, 18-21, 15-13"
        const sets = scoreData.split(',').map(s => s.trim());
        sets.forEach((setScore, index) => {
          const scores = setScore.split('-').map(s => parseInt(s.trim(), 10));
          if (scores.length === 2 && !isNaN(scores[0]) && !isNaN(scores[1])) {
            const setKey = `set${index + 1}` as 'set1' | 'set2' | 'set3';
            if (index < 3) {
              score[setKey] = { team1: scores[0], team2: scores[1] };
            }
          }
        });
      } else if (scoreData.sets) {
        // Handle object format with sets array
        scoreData.sets.forEach((set: any, index: number) => {
          const setKey = `set${index + 1}` as 'set1' | 'set2' | 'set3';
          if (index < 3) {
            score[setKey] = {
              team1: parseInt(set.team1Score || set.homeScore || '0', 10),
              team2: parseInt(set.team2Score || set.awayScore || '0', 10)
            };
          }
        });
      }
    } catch (error) {
      visLogger.error('Failed to parse match score', error as Error, { scoreData });
    }
    
    return score;
  }

  private mapMatchStatus(visStatus: string): 'Scheduled' | 'Live' | 'Completed' | 'Postponed' {
    switch (visStatus?.toLowerCase()) {
      case 'scheduled':
      case 'upcoming':
        return 'Scheduled';
      case 'live':
      case 'ongoing':
      case 'in_progress':
        return 'Live';
      case 'completed':
      case 'finished':
        return 'Completed';
      case 'postponed':
      case 'cancelled':
        return 'Postponed';
      default:
        return 'Scheduled';
    }
  }

  private determineWinner(score: { set1?: { team1: number; team2: number; }; set2?: { team1: number; team2: number; }; set3?: { team1: number; team2: number; }; }): 'team1' | 'team2' | undefined {
    let team1Sets = 0;
    let team2Sets = 0;
    
    [score.set1, score.set2, score.set3].forEach(set => {
      if (set) {
        if (set.team1 > set.team2) team1Sets++;
        else if (set.team2 > set.team1) team2Sets++;
      }
    });
    
    if (team1Sets > team2Sets) return 'team1';
    if (team2Sets > team1Sets) return 'team2';
    return undefined;
  }

  private mapTournamentLevel(visLevel: string): TournamentLevel {
    switch (visLevel.toLowerCase()) {
      case 'world championship':
      case 'world_championship':
        return TournamentLevel.WORLD_CHAMPIONSHIP;
      case 'world tour':
      case 'world_tour':
        return TournamentLevel.WORLD_TOUR;
      case 'continental':
        return TournamentLevel.CONTINENTAL;
      case 'national':
        return TournamentLevel.NATIONAL;
      default:
        return TournamentLevel.OTHER;
    }
  }

  private mapTournamentStatus(visStatus: string): TournamentStatus {
    switch (visStatus.toLowerCase()) {
      case 'upcoming':
      case 'scheduled':
        return TournamentStatus.UPCOMING;
      case 'ongoing':
      case 'live':
      case 'in_progress':
        return TournamentStatus.ONGOING;
      case 'completed':
      case 'finished':
        return TournamentStatus.COMPLETED;
      case 'cancelled':
        return TournamentStatus.CANCELLED;
      default:
        return TournamentStatus.UPCOMING;
    }
  }

  // Utility method to clear cache
  clearCache(pattern?: string): void {
    if (pattern) {
      const keys = this.cache.keys().filter(key => key.includes(pattern));
      this.cache.del(keys);
    } else {
      this.cache.flushAll();
    }
  }

  // Get cache statistics
  getCacheStats(): { keys: number; hits: number; misses: number } {
    return this.cache.getStats();
  }

  // Helper method to make VIS XML requests
  private async makeVISRequest(xmlRequest: string): Promise<AxiosResponse> {
    try {
      // VIS accepts the Request parameter in query string, form data, or HTTP payload
      // Using POST with form data as recommended in documentation
      const response = await this.client.post('', 
        `Request=${encodeURIComponent(xmlRequest)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      return response;
    } catch (error) {
      visLogger.error('VIS XML request failed', error as Error, { xmlRequest });
      throw error;
    }
  }


  // Helper method to parse VIS JSON responses (no longer needed with direct JSON)
  // private async parseVISResponse(xmlData: string): Promise<any> {
  //   return new Promise((resolve, reject) => {
  //     xml2js.parseString(xmlData, { explicitArray: false, ignoreAttrs: false }, (err: any, result: any) => {
  //       if (err) {
  //         visLogger.error('XML parsing failed', err, { xmlData });
  //         reject(new VISAPIError('Failed to parse VIS XML response', 0, err));
  //       } else {
  //         resolve(result);
  //       }
  //     });
  //   });
  // }
}

// Export singleton instance
export const visService = new VISService();