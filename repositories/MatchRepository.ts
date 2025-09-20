/**
 * @fileoverview Match Repository Implementation
 * Repository for match data with referee assignment support and real-time updates
 * Part of EPIC-007 Data Architecture Restructuration - Story 7.2
 */

import { 
  BaseRepository, 
  BaseRepositoryConfig, 
  RepositoryResult, 
  RepositoryError, 
  RepositoryErrorType 
} from './base/BaseRepository';
import { BeachMatchCore, MatchStatus, MatchResult, CourtInfo } from '../types/match-v2';
import { BeachMatch } from '../types/match';
import { CacheKey } from '../types/cache-v2';
import { GetBeachMatchListRequest } from '../types/api-v2';
// DataTransformationService removed - transformations now handled in simplified hooks
import { VisResponseParser } from '../services/parsing/VisResponseParser';
import { featureFlagManager } from '../config/featureFlags';

/**
 * Match filtering options for repository queries
 */
export interface MatchFilters {
  /** Tournament ID filter */
  readonly tournamentId?: string;
  /** Court number filter */
  readonly courtNo?: string;
  /** Match status filter */
  readonly status?: MatchStatus;
  /** Date range filters */
  readonly startDate?: string;
  readonly endDate?: string;
  /** Round filter */
  readonly round?: string;
  /** Phase filter */
  readonly phaseCode?: string;
  /** Include only matches with referee assignments */
  readonly withRefereeAssignments?: boolean;
  /** Maximum results limit */
  readonly maxResults?: number;
}

/**
 * Court-based search filters
 */
export interface CourtSearchFilters {
  /** Court numbers to include */
  readonly courtNumbers?: string[];
  /** Surface type filter */
  readonly surface?: string;
  /** Location filter */
  readonly location?: string;
}

/**
 * Match repository interface supporting both new and legacy data types
 */
export interface IMatchRepository {
  // New domain methods using BeachMatchCore
  getByIdAsync(id: string): Promise<RepositoryResult<BeachMatchCore | null>>;
  getListAsync(filters?: MatchFilters): Promise<RepositoryResult<BeachMatchCore[]>>;
  getByTournamentAsync(tournamentId: string, filters?: MatchFilters): Promise<RepositoryResult<BeachMatchCore[]>>;
  getByCourtAsync(courtFilters: CourtSearchFilters, dateFilters?: MatchFilters): Promise<RepositoryResult<BeachMatchCore[]>>;
  searchAsync(query: string, filters?: MatchFilters): Promise<RepositoryResult<BeachMatchCore[]>>;
  
  // Legacy compatibility methods using BeachMatch interface
  getLegacyByIdAsync(visNo: string): Promise<RepositoryResult<BeachMatch | null>>;
  getLegacyListAsync(tournamentNo?: string): Promise<RepositoryResult<BeachMatch[]>>;
  
  // Real-time updates and cache management
  invalidateMatchCache(matchId?: string, tournamentId?: string): Promise<void>;
  refreshMatchData(matchId: string): Promise<RepositoryResult<BeachMatchCore | null>>;
  warmCacheForTournament(tournamentId: string): Promise<void>;
  
  // Referee assignment operations
  getMatchesWithRefereeAssignments(tournamentId: string): Promise<RepositoryResult<BeachMatchCore[]>>;
  getMatchesByReferee(refereeId: string): Promise<RepositoryResult<BeachMatchCore[]>>;
  
  // Performance monitoring
  getCacheMetrics(): Record<string, any>;
}

/**
 * Match repository implementation with referee support and real-time updates
 */
export class MatchRepository extends BaseRepository implements IMatchRepository {
  constructor(config: BaseRepositoryConfig) {
    super(config);
  }

  /**
   * Get match by stable ID (new domain method)
   */
  async getByIdAsync(id: string): Promise<RepositoryResult<BeachMatchCore | null>> {
    const monitor = this.startPerformanceMonitoring();
    
    try {
      // Check cache first
      const cacheKey = `match:${id}`;
      const cached = await this.config.cacheManager.get<BeachMatchCore>(cacheKey);
      
      if (cached) {
        const metrics = this.completePerformanceMonitoring(monitor, true, cached.tier);
        this.logPerformanceMetrics('getByIdAsync[cached]', metrics);
        
        return {
          data: cached.data,
          metrics,
          source: 'cache'
        };
      }

      // Extract tournament ID and match info from stable ID for API call
      const { tournamentId, visNo } = this.parseMatchId(id);
      if (!tournamentId || !visNo) {
        throw new RepositoryError(
          `Invalid match ID format: ${id}`,
          RepositoryErrorType.VALIDATION_ERROR,
          { matchId: id }
        );
      }

      // Fetch matches from tournament
      const tournamentMatches = await this.getByTournamentAsync(tournamentId);
      const match = tournamentMatches.data.find(m => m.id === id);

      const metrics = this.completePerformanceMonitoring(
        monitor, 
        tournamentMatches.source === 'cache', 
        tournamentMatches.metrics.cacheTier,
        tournamentMatches.metrics.apiCalls
      );
      
      this.logPerformanceMetrics('getByIdAsync[tournament]', metrics);

      return {
        data: match || null,
        metrics,
        source: tournamentMatches.source
      };

    } catch (error) {
      throw this.handleError(error, 'getByIdAsync', { matchId: id });
    }
  }

  /**
   * Get match list with filtering
   */
  async getListAsync(filters: MatchFilters = {}): Promise<RepositoryResult<BeachMatchCore[]>> {
    const monitor = this.startPerformanceMonitoring();
    
    try {
      // If tournament ID is specified, use tournament-specific method
      if (filters.tournamentId) {
        return await this.getByTournamentAsync(filters.tournamentId, filters);
      }

      // General match search requires tournament context
      throw new RepositoryError(
        'Tournament ID is required for match queries',
        RepositoryErrorType.VALIDATION_ERROR,
        { filters }
      );

    } catch (error) {
      throw this.handleError(error, 'getListAsync', { filters });
    }
  }

  /**
   * Get matches for a specific tournament
   */
  async getByTournamentAsync(
    tournamentId: string, 
    filters: MatchFilters = {}
  ): Promise<RepositoryResult<BeachMatchCore[]>> {
    const monitor = this.startPerformanceMonitoring();
    
    try {
      // Generate cache key based on tournament and filters
      const cacheKey = this.generateTournamentMatchesCacheKey(tournamentId, filters);
      
      // Check cache first
      const cached = await this.config.cacheManager.get<BeachMatchCore[]>(cacheKey);
      
      if (cached) {
        const metrics = this.completePerformanceMonitoring(monitor, true, cached.tier);
        this.logPerformanceMetrics('getByTournamentAsync[cached]', metrics);
        
        return {
          data: cached.data,
          metrics,
          source: 'cache'
        };
      }

      // Extract VIS tournament number from stable tournament ID
      const tournamentNo = this.extractTournamentNoFromId(tournamentId);
      if (!tournamentNo) {
        throw new RepositoryError(
          `Invalid tournament ID format: ${tournamentId}`,
          RepositoryErrorType.VALIDATION_ERROR,
          { tournamentId }
        );
      }

      // Build API request from filters
      const apiRequest: GetBeachMatchListRequest = {
        tournamentNo,
        courtNo: filters.courtNo,
        status: filters.status,
        startDate: filters.startDate,
        endDate: filters.endDate,
        includeResults: true,
        includeReferees: true
      };

      const response = await this.config.apiClient.getBeachMatchList(apiRequest);
      
      if (!response.success) {
        throw new RepositoryError(
          'Failed to fetch matches from API',
          RepositoryErrorType.NETWORK_ERROR,
          { tournamentId, apiResponse: response }
        );
      }

      // Parse response
      const matches = VisResponseParser.parseBeachMatches(response.xmlData, tournamentId, undefined);

      // Apply additional filters
      let filteredMatches = matches;
      if (filters.round) {
        filteredMatches = filteredMatches.filter(m => 
          m.round.toLowerCase().includes(filters.round!.toLowerCase())
        );
      }
      if (filters.phaseCode) {
        filteredMatches = filteredMatches.filter(m => m.phaseCode === filters.phaseCode);
      }
      if (filters.withRefereeAssignments) {
        filteredMatches = filteredMatches.filter(m => 
          m.refereeAssignments && m.refereeAssignments.length > 0
        );
      }
      if (filters.maxResults) {
        filteredMatches = filteredMatches.slice(0, filters.maxResults);
      }

      // Cache the result with 30 minute TTL for match data
      await this.config.cacheManager.set(cacheKey, filteredMatches, { ttl: 1800000 });

      const metrics = this.completePerformanceMonitoring(monitor, false, undefined, 1);
      this.logPerformanceMetrics('getByTournamentAsync[api]', metrics);

      return {
        data: filteredMatches,
        metrics,
        source: 'api'
      };

    } catch (error) {
      throw this.handleError(error, 'getByTournamentAsync', { tournamentId, filters });
    }
  }

  /**
   * Get matches by court with advanced filtering
   */
  async getByCourtAsync(
    courtFilters: CourtSearchFilters, 
    dateFilters: MatchFilters = {}
  ): Promise<RepositoryResult<BeachMatchCore[]>> {
    const monitor = this.startPerformanceMonitoring();
    
    try {
      if (!dateFilters.tournamentId) {
        throw new RepositoryError(
          'Tournament ID is required for court-based queries',
          RepositoryErrorType.VALIDATION_ERROR,
          { courtFilters }
        );
      }

      // Get all matches for tournament first
      const tournamentMatches = await this.getByTournamentAsync(dateFilters.tournamentId, dateFilters);
      
      // Filter by court criteria
      let courtMatches = tournamentMatches.data;

      if (courtFilters.courtNumbers) {
        courtMatches = courtMatches.filter(match => 
          courtFilters.courtNumbers!.includes(match.court.courtNumber)
        );
      }

      if (courtFilters.surface) {
        courtMatches = courtMatches.filter(match => 
          match.court.surface?.toLowerCase().includes(courtFilters.surface!.toLowerCase())
        );
      }

      if (courtFilters.location) {
        courtMatches = courtMatches.filter(match => 
          match.court.location?.toLowerCase().includes(courtFilters.location!.toLowerCase())
        );
      }

      const metrics = this.completePerformanceMonitoring(
        monitor, 
        tournamentMatches.source === 'cache', 
        tournamentMatches.metrics.cacheTier,
        tournamentMatches.metrics.apiCalls
      );
      
      this.logPerformanceMetrics('getByCourtAsync', metrics);

      return {
        data: courtMatches,
        metrics,
        source: tournamentMatches.source
      };

    } catch (error) {
      throw this.handleError(error, 'getByCourtAsync', { courtFilters, dateFilters });
    }
  }

  /**
   * Search matches by query string
   */
  async searchAsync(query: string, filters: MatchFilters = {}): Promise<RepositoryResult<BeachMatchCore[]>> {
    const monitor = this.startPerformanceMonitoring();
    
    try {
      if (!filters.tournamentId) {
        throw new RepositoryError(
          'Tournament ID is required for match search',
          RepositoryErrorType.VALIDATION_ERROR,
          { query }
        );
      }

      // Get matches for tournament
      const tournamentMatches = await this.getByTournamentAsync(filters.tournamentId, filters);
      
      // Search across match fields
      const searchResults = tournamentMatches.data.filter(match => {
        const searchText = `
          ${match.round} 
          ${match.phaseCode} 
          ${match.court.courtName} 
          ${match.team1.teamName} 
          ${match.team1.player1Name} 
          ${match.team1.player2Name}
          ${match.team2.teamName} 
          ${match.team2.player1Name} 
          ${match.team2.player2Name}
          ${match.notes}
        `.toLowerCase();
        
        return searchText.includes(query.toLowerCase());
      });

      const metrics = this.completePerformanceMonitoring(
        monitor, 
        tournamentMatches.source === 'cache', 
        tournamentMatches.metrics.cacheTier,
        tournamentMatches.metrics.apiCalls
      );
      
      this.logPerformanceMetrics('searchAsync', metrics);

      return {
        data: searchResults,
        metrics,
        source: tournamentMatches.source
      };

    } catch (error) {
      throw this.handleError(error, 'searchAsync', { query, filters });
    }
  }

  /**
   * Get match by VIS number (legacy compatibility)
   */
  async getLegacyByIdAsync(visNo: string): Promise<RepositoryResult<BeachMatch | null>> {
    const monitor = this.startPerformanceMonitoring();
    
    try {
      // This requires tournament context, which we don't have from visNo alone
      // This is a limitation of the legacy interface design
      throw new RepositoryError(
        'Legacy match retrieval by VIS number requires tournament context',
        RepositoryErrorType.VALIDATION_ERROR,
        { visNo, recommendation: 'Use getLegacyListAsync with tournament number' }
      );

    } catch (error) {
      throw this.handleError(error, 'getLegacyByIdAsync', { visNo });
    }
  }

  /**
   * Get match list in legacy format (legacy compatibility)
   */
  async getLegacyListAsync(tournamentNo?: string): Promise<RepositoryResult<BeachMatch[]>> {
    const monitor = this.startPerformanceMonitoring();
    
    try {
      if (!tournamentNo) {
        throw new RepositoryError(
          'Tournament number is required for legacy match queries',
          RepositoryErrorType.VALIDATION_ERROR,
          {}
        );
      }

      // Convert tournament number to stable ID (simplified - in production would need proper lookup)
      const tournamentId = `${tournamentNo}_unknown_m_local`; // Simplified for legacy compatibility
      
      // Get matches in new format
      const matchesResult = await this.getByTournamentAsync(tournamentId);
      
      // Transform to legacy format
      // Transformation now handled in simplified hooks - direct passthrough
      const transformStart = Date.now();
      const legacyMatches = matchesResult.data; // Direct passthrough - transformation in hooks
      const transformationMs = Date.now() - transformStart;

      const metrics = this.completePerformanceMonitoring(
        monitor, 
        matchesResult.source === 'cache', 
        matchesResult.metrics.cacheTier,
        matchesResult.metrics.apiCalls,
        transformationMs
      );
      
      this.logPerformanceMetrics('getLegacyListAsync', metrics);

      return {
        data: legacyMatches,
        metrics,
        source: 'transformation'
      };

    } catch (error) {
      throw this.handleError(error, 'getLegacyListAsync', { tournamentNo });
    }
  }

  /**
   * Invalidate match cache data
   */
  async invalidateMatchCache(matchId?: string, tournamentId?: string): Promise<void> {
    try {
      if (matchId) {
        await this.config.cacheManager.delete(`match:${matchId}`);
      }
      
      if (tournamentId) {
        // Clear all match cache entries for the tournament
        await this.config.cacheManager.clear(`tournament:${tournamentId}:matches:*`);
      }
      
      if (!matchId && !tournamentId) {
        // Clear all match-related cache entries
        await this.config.cacheManager.clear('match:*');
        await this.config.cacheManager.clear('tournament:*:matches:*');
      }
    } catch (error) {
      throw this.handleError(error, 'invalidateMatchCache', { matchId, tournamentId });
    }
  }

  /**
   * Refresh match data from API (force cache invalidation)
   */
  async refreshMatchData(matchId: string): Promise<RepositoryResult<BeachMatchCore | null>> {
    try {
      // Invalidate cache first
      await this.invalidateMatchCache(matchId);
      
      // Fetch fresh data
      return await this.getByIdAsync(matchId);
      
    } catch (error) {
      throw this.handleError(error, 'refreshMatchData', { matchId });
    }
  }

  /**
   * Warm cache for all matches in a tournament
   */
  async warmCacheForTournament(tournamentId: string): Promise<void> {
    try {
      // Warm cache by fetching all matches (which will cache them)
      await this.getByTournamentAsync(tournamentId);
    } catch (error) {
      throw this.handleError(error, 'warmCacheForTournament', { tournamentId });
    }
  }

  /**
   * Get matches that have referee assignments
   */
  async getMatchesWithRefereeAssignments(tournamentId: string): Promise<RepositoryResult<BeachMatchCore[]>> {
    return await this.getByTournamentAsync(tournamentId, { withRefereeAssignments: true });
  }

  /**
   * Get matches assigned to a specific referee
   */
  async getMatchesByReferee(refereeId: string): Promise<RepositoryResult<BeachMatchCore[]>> {
    const monitor = this.startPerformanceMonitoring();
    
    try {
      // This would require searching across multiple tournaments
      // For now, throw an error indicating this needs tournament context
      throw new RepositoryError(
        'Referee-based match queries require tournament context',
        RepositoryErrorType.VALIDATION_ERROR,
        { refereeId, recommendation: 'Use getMatchesWithRefereeAssignments and filter by referee' }
      );

    } catch (error) {
      throw this.handleError(error, 'getMatchesByReferee', { refereeId });
    }
  }

  /**
   * Get cache performance metrics
   */
  getCacheMetrics(): Record<string, any> {
    return this.config.cacheManager.getMetrics?.() || {};
  }

  /**
   * Generate cache key for tournament matches
   */
  private generateTournamentMatchesCacheKey(tournamentId: string, filters: MatchFilters): string {
    const keyParts = [`tournament:${tournamentId}:matches`];
    
    if (filters.courtNo) keyParts.push(`court:${filters.courtNo}`);
    if (filters.status) keyParts.push(`status:${filters.status}`);
    if (filters.round) keyParts.push(`round:${filters.round}`);
    if (filters.phaseCode) keyParts.push(`phase:${filters.phaseCode}`);
    if (filters.startDate) keyParts.push(`from:${filters.startDate}`);
    if (filters.endDate) keyParts.push(`to:${filters.endDate}`);
    if (filters.withRefereeAssignments) keyParts.push('with-refs');
    if (filters.maxResults) keyParts.push(`limit:${filters.maxResults}`);
    
    return keyParts.join('_');
  }

  /**
   * Parse match ID to extract tournament ID and VIS number
   */
  private parseMatchId(id: string): { tournamentId: string; visNo: string } | { tournamentId: null; visNo: null } {
    // Match ID format: "tournamentId_courtX_date_matchCode"
    const parts = id.split('_');
    if (parts.length < 4) {
      return { tournamentId: null, visNo: null };
    }
    
    // Reconstruct tournament ID (first 4 parts of tournament ID)
    const tournamentId = parts.slice(0, 4).join('_');
    const matchCode = parts[parts.length - 1];
    
    return { tournamentId, visNo: matchCode };
  }

  /**
   * Extract VIS tournament number from stable tournament ID
   */
  private extractTournamentNoFromId(tournamentId: string): string | null {
    // Tournament ID format: "visNo_code_gender_type"
    const parts = tournamentId.split('_');
    return parts.length >= 4 ? parts[0] : null;
  }
}