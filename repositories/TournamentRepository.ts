/**
 * @fileoverview Tournament Repository Implementation
 * Unified repository layer with legacy compatibility and smart caching
 * Part of EPIC-007 Data Architecture Restructuration - Story 7.2
 */

import { 
  BaseRepository, 
  BaseRepositoryConfig, 
  RepositoryResult, 
  RepositoryError, 
  RepositoryErrorType 
} from './base/BaseRepository';
import { TournamentCore, GenderType, TournamentType, TournamentStatus } from '../types/tournament-v2';
import { Tournament } from '../types/tournament';
import { CacheKey } from '../types/cache-v2';
import { GetEventListRequest } from '../types/api-v2';
// DataTransformationService removed - transformations now handled in simplified hooks
import { VisResponseParser } from '../services/parsing/VisResponseParser';
import { VisApiIntegrationService } from '../services/api/VisApiIntegrationService';
import { featureFlagManager } from '../config/featureFlags';

/**
 * Tournament filtering options for repository queries
 */
export interface TournamentFilters {
  /** Tournament type filter */
  readonly tournamentType?: TournamentType;
  /** Gender filter */
  readonly gender?: GenderType;
  /** Status filter */
  readonly status?: TournamentStatus;
  /** Country code filter */
  readonly countryCode?: string;
  /** Date range filters */
  readonly startDate?: string;
  readonly endDate?: string;
  /** Maximum results limit */
  readonly maxResults?: number;
  /** Include detailed tournament information (affects field optimization) */
  readonly includeDetails?: boolean;
}

/**
 * Tournament repository interface supporting both new and legacy data types
 */
export interface ITournamentRepository {
  // New domain methods using TournamentCore
  getByIdAsync(id: string): Promise<RepositoryResult<TournamentCore | null>>;
  getListAsync(filters?: TournamentFilters): Promise<RepositoryResult<TournamentCore[]>>;
  searchAsync(query: string, filters?: TournamentFilters): Promise<RepositoryResult<TournamentCore[]>>;
  
  // Legacy compatibility methods using Tournament interface
  getLegacyByIdAsync(no: string): Promise<RepositoryResult<Tournament | null>>;
  getLegacyListAsync(): Promise<RepositoryResult<Tournament[]>>;
  
  // Cache management
  invalidateCache(id?: string): Promise<void>;
  warmCache(filters?: TournamentFilters): Promise<void>;
  
  // Performance monitoring
  getCacheMetrics(): Record<string, any>;
}

/**
 * Tournament repository implementation with smart caching and legacy compatibility
 */
export class TournamentRepository extends BaseRepository implements ITournamentRepository {
  private readonly apiIntegrationService: VisApiIntegrationService;

  constructor(config: BaseRepositoryConfig) {
    super(config);
    this.apiIntegrationService = new VisApiIntegrationService(config.apiClient);
  }

  /**
   * Get tournament by stable ID (new domain method)
   */
  async getByIdAsync(id: string): Promise<RepositoryResult<TournamentCore | null>> {
    const monitor = this.startPerformanceMonitoring();
    
    try {
      // Check cache first
      const cacheKey = `tournament:${id}`;
      const cached = await this.config.cacheManager.get<TournamentCore>(cacheKey);
      
      if (cached) {
        const metrics = this.completePerformanceMonitoring(monitor, true, cached.tier);
        this.logPerformanceMetrics('getByIdAsync[cached]', metrics);
        
        return {
          data: cached.data,
          metrics,
          source: 'cache'
        };
      }

      // Extract VIS number from stable ID for API call
      const visNo = this.extractVisNoFromId(id);
      if (!visNo) {
        throw new RepositoryError(
          `Invalid tournament ID format: ${id}`,
          RepositoryErrorType.VALIDATION_ERROR,
          { tournamentId: id }
        );
      }

      // Fetch from API
      const apiRequest: GetEventListRequest = {
        maxResults: 1,
        fields: ['No', 'Name', 'Code', 'Gender', 'Type', 'Status', 'StartDate', 'EndDate', 'City', 'Country']
      };

      const response = await this.config.apiClient.getEventList(apiRequest);
      
      if (!response.success) {
        throw new RepositoryError(
          'Failed to fetch tournament from API',
          RepositoryErrorType.NETWORK_ERROR,
          { tournamentId: id, apiResponse: response }
        );
      }

      // Parse and find matching tournament
      const tournaments = VisResponseParser.parseEventList(response.xmlData);
      const tournament = tournaments.find(t => t.id === id);

      if (tournament) {
        // Cache the result
        await this.config.cacheManager.set(cacheKey, tournament, { ttl: 3600000 }); // 1 hour TTL
      }

      const metrics = this.completePerformanceMonitoring(monitor, false, undefined, 1);
      this.logPerformanceMetrics('getByIdAsync[api]', metrics);

      return {
        data: tournament || null,
        metrics,
        source: 'api'
      };

    } catch (error) {
      throw this.handleError(error, 'getByIdAsync', { tournamentId: id });
    }
  }

  /**
   * Get tournament list with filtering (new domain method)
   */
  async getListAsync(filters: TournamentFilters = {}): Promise<RepositoryResult<TournamentCore[]>> {
    const monitor = this.startPerformanceMonitoring();
    
    try {
      // Generate semantic cache key based on filters
      const cacheKey = this.generateCacheKey(filters);
      
      // Check cache first
      const cached = await this.config.cacheManager.get<TournamentCore[]>(cacheKey);
      
      if (cached) {
        const metrics = this.completePerformanceMonitoring(monitor, true, cached.tier);
        this.logPerformanceMetrics('getListAsync[cached]', metrics);
        
        return {
          data: cached.data,
          metrics,
          source: 'cache'
        };
      }

      // Build API request from filters
      const apiRequest = {
        tournamentType: filters.tournamentType,
        gender: filters.gender,
        status: filters.status,
        countryCode: filters.countryCode,
        startDate: filters.startDate,
        endDate: filters.endDate,
        maxResults: filters.maxResults || 100
      };

      // Use enhanced API integration service with gender merging and field optimization
      const optimizationLevel = filters.includeDetails ? 'extended' : 'essential';
      const apiResult = await this.apiIntegrationService.getTournamentsWithGenderMerging(
        apiRequest,
        optimizationLevel
      );

      const tournaments = apiResult.tournaments;

      // Cache the result with 1 hour TTL for filtered results
      await this.config.cacheManager.set(cacheKey, tournaments, { ttl: 3600000 });

      const metrics = this.completePerformanceMonitoring(monitor, false, undefined, 1);
      this.logPerformanceMetrics('getListAsync[api]', metrics);

      return {
        data: tournaments,
        metrics,
        source: 'api'
      };

    } catch (error) {
      throw this.handleError(error, 'getListAsync', { filters });
    }
  }

  /**
   * Search tournaments by query string
   */
  async searchAsync(query: string, filters: TournamentFilters = {}): Promise<RepositoryResult<TournamentCore[]>> {
    const monitor = this.startPerformanceMonitoring();
    
    try {
      // Get all tournaments with filters first
      const listResult = await this.getListAsync(filters);
      
      // Filter by search query (name, city, country)
      const searchResults = listResult.data.filter(tournament => {
        const searchText = `${tournament.name} ${tournament.city} ${tournament.country}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
      });

      const metrics = this.completePerformanceMonitoring(
        monitor, 
        listResult.source === 'cache', 
        listResult.metrics.cacheTier,
        listResult.metrics.apiCalls
      );
      
      this.logPerformanceMetrics('searchAsync', metrics);

      return {
        data: searchResults,
        metrics,
        source: listResult.source
      };

    } catch (error) {
      throw this.handleError(error, 'searchAsync', { query, filters });
    }
  }

  /**
   * Get tournament by VIS number (legacy compatibility method)
   */
  async getLegacyByIdAsync(no: string): Promise<RepositoryResult<Tournament | null>> {
    const monitor = this.startPerformanceMonitoring();
    
    try {
      // Try to find the tournament in new format first
      const tournaments = await this.getListAsync({ maxResults: 100 });
      const tournamentCore = tournaments.data.find(t => t.visNo === no);
      
      if (!tournamentCore) {
        const metrics = this.completePerformanceMonitoring(monitor, tournaments.source === 'cache');
        return {
          data: null,
          metrics,
          source: tournaments.source
        };
      }

      // Transformation now handled in simplified hooks - direct passthrough
      const transformStart = Date.now();
      const legacyTournament = tournamentCore; // Direct passthrough - transformation in hooks
      const transformationMs = Date.now() - transformStart;

      const metrics = this.completePerformanceMonitoring(
        monitor, 
        tournaments.source === 'cache', 
        tournaments.metrics.cacheTier,
        tournaments.metrics.apiCalls,
        transformationMs
      );
      
      this.logPerformanceMetrics('getLegacyByIdAsync', metrics);

      return {
        data: legacyTournament,
        metrics,
        source: 'transformation'
      };

    } catch (error) {
      throw this.handleError(error, 'getLegacyByIdAsync', { visNo: no });
    }
  }

  /**
   * Get tournament list in legacy format (legacy compatibility method)
   */
  async getLegacyListAsync(): Promise<RepositoryResult<Tournament[]>> {
    const monitor = this.startPerformanceMonitoring();
    
    try {
      // Get tournaments in new format
      const tournamentsResult = await this.getListAsync();
      
      // Transformation now handled in simplified hooks - direct passthrough
      const transformStart = Date.now();
      const legacyTournaments = tournamentsResult.data; // Direct passthrough - transformation in hooks
      const transformationMs = Date.now() - transformStart;

      const metrics = this.completePerformanceMonitoring(
        monitor, 
        tournamentsResult.source === 'cache', 
        tournamentsResult.metrics.cacheTier,
        tournamentsResult.metrics.apiCalls,
        transformationMs
      );
      
      this.logPerformanceMetrics('getLegacyListAsync', metrics);

      return {
        data: legacyTournaments,
        metrics,
        source: 'transformation'
      };

    } catch (error) {
      throw this.handleError(error, 'getLegacyListAsync', {});
    }
  }

  /**
   * Invalidate cached tournament data
   */
  async invalidateCache(id?: string): Promise<void> {
    try {
      if (id) {
        await this.config.cacheManager.delete(`tournament:${id}`);
      } else {
        // Clear all tournament-related cache entries
        await this.config.cacheManager.clear('tournament:*');
      }
    } catch (error) {
      throw this.handleError(error, 'invalidateCache', { tournamentId: id });
    }
  }

  /**
   * Pre-warm cache with tournament data
   */
  async warmCache(filters: TournamentFilters = {}): Promise<void> {
    try {
      // Warm cache by fetching data (which will cache it)
      await this.getListAsync(filters);
    } catch (error) {
      throw this.handleError(error, 'warmCache', { filters });
    }
  }

  /**
   * Get cache performance metrics
   */
  getCacheMetrics(): Record<string, any> {
    return this.config.cacheManager.getMetrics?.() || {};
  }

  /**
   * Generate semantic cache key from filters
   */
  private generateCacheKey(filters: TournamentFilters): string {
    const keyParts = ['tournaments'];
    
    if (filters.tournamentType) keyParts.push(`type:${filters.tournamentType}`);
    if (filters.gender) keyParts.push(`gender:${filters.gender}`);
    if (filters.status) keyParts.push(`status:${filters.status}`);
    if (filters.countryCode) keyParts.push(`country:${filters.countryCode}`);
    if (filters.startDate) keyParts.push(`from:${filters.startDate}`);
    if (filters.endDate) keyParts.push(`to:${filters.endDate}`);
    if (filters.maxResults) keyParts.push(`limit:${filters.maxResults}`);
    
    return keyParts.join('_');
  }

  /**
   * Extract VIS number from stable tournament ID
   */
  private extractVisNoFromId(id: string): string | null {
    // Tournament ID format: "visNo_code_gender_type"
    const parts = id.split('_');
    return parts.length >= 4 ? parts[0] : null;
  }
}