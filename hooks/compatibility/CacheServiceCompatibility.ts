/**
 * Backward Compatibility Layer for CacheService
 * Provides wrapper functions that match existing CacheService interfaces
 * while using new hook-based data management internally
 */

import { TournamentCore, GenderType } from '../../types/tournament-v2';
import { BeachMatch } from '../../types/match';
import { CacheResult, FilterOptions } from '../../types/cache';
import { TournamentRefereeData } from '../../types/referee-v2';
import type { TournamentDTO, MatchDTO, RefereeDTO } from '../../services/DualReadService';
// Import as type only to prevent circular dependency - we'll get instance dynamically
import { queryClient } from '../../lib/queryClient';
import { queryPerformanceMonitor } from '../../lib/queryPerformance';

// Feature flag for gradual migration - made configurable for testing
let USE_NEW_HOOKS = process.env.EXPO_PUBLIC_USE_NEW_HOOKS === 'true' || false;

/**
 * Transform new TournamentDTO to legacy TournamentCore format
 */
function transformTournamentToLegacy(dto: TournamentDTO): TournamentCore {
  return {
    TournamentNo: dto.visNo,
    TournamentName: dto.name,
    Gender: dto.gender as GenderType,
    TournamentType: dto.tournamentType,
    StartDate: dto.dates.startDate,
    EndDate: dto.dates.endDate,
    City: dto.city || '',
    Country: dto.country || '',
    Status: dto.status,
    // Add other required legacy fields with defaults
    Season: new Date(dto.dates.startDate).getFullYear(),
    CountryCode: dto.countryCode || '',
    Location: dto.location || dto.city || '',
  } as TournamentCore;
}

/**
 * Transform new MatchDTO to legacy BeachMatch format
 */
function transformMatchToLegacy(dto: MatchDTO): BeachMatch {
  return {
    MatchNo: dto.visNo,
    TournamentNo: dto.tournamentCode,
    Round: dto.round,
    Status: dto.status,
    CourtNumber: dto.court?.courtNumber || '1',
    ScheduledTime: dto.scheduledDateTime,
    Team1Name: dto.team1?.teamName || 'Team 1',
    Team2Name: dto.team2?.teamName || 'Team 2',
    Team1Country: dto.team1?.countryCode || '',
    Team2Country: dto.team2?.countryCode || '',
    // Add other required legacy fields with defaults
    MatchInTournament: dto.matchCode,
    LocalDate: new Date(dto.scheduledDateTime),
    LocalTime: new Date(dto.scheduledDateTime).toLocaleTimeString(),
    Court: dto.court?.courtName || dto.court?.courtNumber || '1',
  } as BeachMatch;
}

/**
 * Transform new RefereeDTO to legacy TournamentRefereeData format
 */
function transformRefereeToLegacy(dto: RefereeDTO): TournamentRefereeData {
  return {
    tournamentNo: dto.assignments?.[0]?.tournamentCode || '',
    referees: [{
      federationCode: dto.federationCode,
      firstName: dto.firstName,
      lastName: dto.lastName,
      gender: dto.gender,
      RefereeId: dto.refereeId,
      status: dto.status,
      type: dto.type,
    }]
  } as TournamentRefereeData;
}

/**
 * Transform legacy FilterOptions to new hook filters
 */
function transformFiltersToNew(filters?: FilterOptions) {
  if (!filters) return undefined;
  
  return {
    season: filters.year,
    gender: filters.gender,
    country: filters.country,
    status: filters.status === 'active' ? 'ACTIVE' : 
            filters.status === 'completed' ? 'COMPLETED' : 
            filters.status === 'upcoming' ? 'UPCOMING' : undefined,
  };
}

/**
 * Compatibility wrapper for CacheService.getTournaments
 * Maintains exact same interface while using new DualReadService internally
 */
export class CacheServiceCompatibility {
  // Get DualReadService instance dynamically to prevent circular dependency
  private static getDualReadService() {
    const { DualReadService } = require('../../services/DualReadService');
    return DualReadService.getInstance();
  }

  // Service initialization moved to initialize() method to avoid static block timing issues
  private static initialized = false;

  /**
   * Ensure service is properly initialized
   */
  private static ensureInitialized(): void {
    if (!this.initialized) {
      CacheServiceCompatibility.getDualReadService().configure({
        readStrategy: 'db_first',
        fallbackEnabled: true,
        enablePerformanceMonitoring: true
      });
      this.initialized = true;
    }
  }

  /**
   * Get tournaments with backward compatibility
   * Matches CacheService.getTournaments interface exactly
   */
  static async getTournaments(filters?: FilterOptions): Promise<CacheResult<TournamentCore[]>> {
    // Ensure service is initialized
    this.ensureInitialized();
    
    const startTime = Date.now();
    
    try {
      if (USE_NEW_HOOKS) {
        // Use new hook-based system
        const newFilters = transformFiltersToNew(filters);
        const result = await CacheServiceCompatibility.getDualReadService().getTournaments(newFilters);
        
        if (!result) {
          throw new Error('DualReadService returned undefined result');
        }
        
        const legacyData = result.data ? 
          result.data.map(transformTournamentToLegacy) : [];

        return {
          data: legacyData,
          source: result.source === 'database' ? 'supabase' : 
                  result.source === 'api' ? 'api' : 'memory',
          tier: result.source === 'database' ? 'supabase' : 'api',
          cached: result.source !== 'api',
          timestamp: result.timestamp,
          ttl: 24 * 60 * 60 * 1000, // 24 hours
          cacheKey: `tournaments_${filters?.year || 'recent'}`,
          requestId: `compat_${Date.now()}`,
          performance: {
            memoryHit: result.source === 'cache',
            localStorageHit: false, // Legacy field
            supabaseHit: result.source === 'database',
            apiHit: result.source === 'api',
            totalTime: result.performance.queryTime,
            cacheTime: result.source !== 'api' ? result.performance.queryTime : 0,
            networkTime: result.source === 'api' ? result.performance.queryTime : 0
          }
        };
      } else {
        // Fallback to original CacheService (would be imported)
        throw new Error('Legacy CacheService fallback not implemented in compatibility layer');
      }
    } catch (error) {
      // Performance tracking for errors
      queryPerformanceMonitor.trackQuery(
        ['cache-compatibility', 'tournaments'],
        startTime,
        Date.now(),
        null,
        error as Error
      );
      
      throw error;
    }
  }

  /**
   * Get matches with backward compatibility
   * Matches CacheService.getMatches interface exactly
   */
  static async getMatches(tournamentNo: string): Promise<CacheResult<BeachMatch[]>> {
    // Ensure service is initialized
    this.ensureInitialized();
    
    const startTime = Date.now();
    
    try {
      if (USE_NEW_HOOKS) {
        // Use new hook-based system
        const result = await CacheServiceCompatibility.getDualReadService().getMatches({
          tournamentCode: tournamentNo
        });
        
        if (!result) {
          throw new Error('DualReadService returned undefined result for matches');
        }
        
        const legacyData = result.data ? 
          result.data.map(transformMatchToLegacy) : [];

        return {
          data: legacyData,
          source: result.source === 'database' ? 'supabase' : 
                  result.source === 'api' ? 'api' : 'memory',
          tier: result.source === 'database' ? 'supabase' : 'api',
          cached: result.source !== 'api',
          timestamp: result.timestamp,
          ttl: 15 * 60 * 1000, // 15 minutes for matches
          cacheKey: `matches_${tournamentNo}`,
          requestId: `compat_${Date.now()}`,
          performance: {
            memoryHit: result.source === 'cache',
            localStorageHit: false, // Legacy field
            supabaseHit: result.source === 'database',
            apiHit: result.source === 'api',
            totalTime: result.performance.queryTime,
            cacheTime: result.source !== 'api' ? result.performance.queryTime : 0,
            networkTime: result.source === 'api' ? result.performance.queryTime : 0
          }
        };
      } else {
        // Fallback to original CacheService
        throw new Error('Legacy CacheService fallback not implemented in compatibility layer');
      }
    } catch (error) {
      // Performance tracking for errors
      queryPerformanceMonitor.trackQuery(
        ['cache-compatibility', 'matches'],
        startTime,
        Date.now(),
        null,
        error as Error
      );
      
      throw error;
    }
  }

  /**
   * Get referee data with backward compatibility
   * Matches CacheService.getRefereeData interface exactly
   */
  static async getRefereeData(tournamentNo: string): Promise<CacheResult<TournamentRefereeData>> {
    // Ensure service is initialized
    this.ensureInitialized();
    
    const startTime = Date.now();
    
    try {
      if (USE_NEW_HOOKS) {
        // Use new hook-based system
        const result = await CacheServiceCompatibility.getDualReadService().getReferees({
          tournamentCodes: [tournamentNo],
          includeAssignments: true
        });
        
        if (!result) {
          throw new Error('DualReadService returned undefined result for referees');
        }
        
        // Transform to legacy format - take first referee as primary data
        const legacyData = result.data && result.data.length > 0 ? 
          transformRefereeToLegacy(result.data[0]) : 
          { tournamentNo, referees: [] } as TournamentRefereeData;

        return {
          data: legacyData,
          source: result.source === 'database' ? 'supabase' : 
                  result.source === 'api' ? 'api' : 'memory',
          tier: result.source === 'database' ? 'supabase' : 'api',
          cached: result.source !== 'api',
          timestamp: result.timestamp,
          ttl: 24 * 60 * 60 * 1000, // 24 hours for referees
          cacheKey: `referees_${tournamentNo}`,
          requestId: `compat_${Date.now()}`,
          performance: {
            memoryHit: result.source === 'cache',
            localStorageHit: false, // Legacy field
            supabaseHit: result.source === 'database',
            apiHit: result.source === 'api',
            totalTime: result.performance.queryTime,
            cacheTime: result.source !== 'api' ? result.performance.queryTime : 0,
            networkTime: result.source === 'api' ? result.performance.queryTime : 0
          }
        };
      } else {
        // Fallback to original CacheService
        throw new Error('Legacy CacheService fallback not implemented in compatibility layer');
      }
    } catch (error) {
      // Performance tracking for errors
      queryPerformanceMonitor.trackQuery(
        ['cache-compatibility', 'referees'],
        startTime,
        Date.now(),
        null,
        error as Error
      );
      
      throw error;
    }
  }

  /**
   * Clear cache with backward compatibility
   */
  static async clearCache(keys?: string[]): Promise<void> {
    // Ensure service is initialized
    this.ensureInitialized();
    
    if (USE_NEW_HOOKS) {
      // Clear TanStack Query cache
      if (keys) {
        keys.forEach(key => {
          if (key.includes('tournaments')) {
            queryClient.removeQueries({ queryKey: ['tournaments'] });
          } else if (key.includes('matches')) {
            queryClient.removeQueries({ queryKey: ['matches'] });
          } else if (key.includes('referees')) {
            queryClient.removeQueries({ queryKey: ['referees'] });
          }
        });
      } else {
        // Clear all caches
        queryClient.clear();
      }
      
      // Also clear dual read service cache
      const cacheTypes = keys ? 
        keys.map(k => k.includes('tournaments') ? 'tournaments' : 
                    k.includes('matches') ? 'matches' : 
                    k.includes('referees') ? 'referees' : 'tournaments') :
        ['tournaments', 'matches', 'referees'];
      
      for (const type of cacheTypes) {
        await CacheServiceCompatibility.getDualReadService().invalidateCache(type as any);
      }
    } else {
      // Would call original CacheService.clearCache
      throw new Error('Legacy CacheService fallback not implemented in compatibility layer');
    }
  }

  /**
   * Get cache stats with backward compatibility
   */
  static async getCacheStats(): Promise<{
    memory: { entries: number; size: number; hitRate: number };
    localStorage: { entries: number; size: number; hitRate: number };
    performance: { avgResponseTime: number; totalRequests: number };
  }> {
    if (USE_NEW_HOOKS) {
      // Get performance metrics from DualReadService
      const performanceMetrics = CacheServiceCompatibility.getDualReadService().getPerformanceMetrics();
      
      // Calculate aggregated stats
      let totalRequests = 0;
      let totalTime = 0;
      
      performanceMetrics.forEach(metrics => {
        totalRequests += metrics.totalRequests;
        totalTime += metrics.avgDbTime + metrics.avgApiTime;
      });
      
      return {
        memory: { 
          entries: performanceMetrics.size, 
          size: 0, // Not easily calculable with new system
          hitRate: 0.8 // Estimated based on cache strategy
        },
        localStorage: { 
          entries: 0, // Not used in new system
          size: 0, 
          hitRate: 0 
        },
        performance: { 
          avgResponseTime: totalRequests > 0 ? totalTime / totalRequests : 0, 
          totalRequests 
        }
      };
    } else {
      // Would call original CacheService.getCacheStats
      throw new Error('Legacy CacheService fallback not implemented in compatibility layer');
    }
  }

  /**
   * Initialize cache service (backward compatibility)
   */
  static initialize(config?: any): void {
    // Configure DualReadService with provided config
    CacheServiceCompatibility.getDualReadService().configure({
      readStrategy: 'db_first',
      fallbackEnabled: true,
      enablePerformanceMonitoring: true,
      ...config
    });
  }

  /**
   * Check if using new hook system
   */
  static isUsingNewHooks(): boolean {
    return USE_NEW_HOOKS;
  }

  /**
   * Enable new hook system (migration helper)
   */
  static enableNewHooks(): void {
    // Set feature flag to true
    USE_NEW_HOOKS = true;
    process.env.EXPO_PUBLIC_USE_NEW_HOOKS = 'true';
  }

  /**
   * Disable new hook system (rollback helper)
   */
  static disableNewHooks(): void {
    // Set feature flag to false
    USE_NEW_HOOKS = false;
    process.env.EXPO_PUBLIC_USE_NEW_HOOKS = 'false';
  }
}

export default CacheServiceCompatibility;