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
import {
  DbReadDomain,
  DB_READ_DOMAINS,
  clearDbUnavailable,
  isDbReadEnabled,
  markDbUnavailable,
  setDbReadOverride,
} from '../../services/flags/DbReadFlags';

// The gradual-migration flag now lives in `services/flags/DbReadFlags` and is
// resolved per read domain. `EXPO_PUBLIC_USE_NEW_HOOKS` is gone: it was a
// second, all-or-nothing gate that nobody set, and having two switches for one
// decision is how the decision ends up being taken by accident.

/** Shape `DualReadService.getTournaments` accepts. */
interface DualReadTournamentFilters {
  season?: number;
  gender?: 'M' | 'W';
  country?: string;
  status?: string;
}

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
function transformFiltersToNew(filters?: FilterOptions): DualReadTournamentFilters | undefined {
  if (!filters) return undefined;

  const status = filters.status === 'active' ? 'ACTIVE' :
                 filters.status === 'completed' ? 'COMPLETED' :
                 filters.status === 'upcoming' ? 'UPCOMING' : undefined;

  // Built by assignment, not as an object literal: the project compiles with
  // `exactOptionalPropertyTypes`, under which an explicit `undefined` value is
  // not the same thing as an absent optional key. This only started mattering
  // when DualReadService stopped being reached through an untyped `require()`
  // (issue #45) and its parameter types became visible here.
  const gender = filters.gender;
  const country = filters.country;

  const next: DualReadTournamentFilters = {};
  if (filters.year !== undefined) next.season = filters.year;
  if (gender !== undefined) next.gender = gender;
  if (country !== undefined) next.country = country;
  if (status !== undefined) next.status = status;

  return next;
}

/**
 * Compatibility wrapper for CacheService.getTournaments
 * Maintains exact same interface while using new DualReadService internally
 */
export class CacheServiceCompatibility {
  /**
   * `DualReadService` is loaded with a **dynamic `import()`**, not a static one
   * and not `require()` (issue #45).
   *
   * Two reasons, in this order:
   *
   * 1. **Bundle.** Metro resolves `require()` statically exactly like `import`:
   *    a `require()` inside a method defers *execution*, never *loading*. With
   *    `require()` here, `services/DualReadService.ts` sat in the web entry
   *    chunk — the chunk whose parse time is the bulk of the residual LCP
   *    (issue #38). `import()` puts it in its own async chunk instead.
   * 2. **Circular dependency**, the original reason for the lazy access. Still
   *    holds: `DualReadService` reaches back into this compatibility layer.
   *
   * The service is **not** dead code and must not be removed: issue #54 turns
   * Supabase on for the web, and this is the DB-first read path it will drive.
   * Until then `new DualReadService()` throws `supabaseUrl is required.` in the
   * constructor (no `EXPO_PUBLIC_SUPABASE_URL` in the web build) — which is the
   * actual mechanism by which the DB branch is inert today and everything falls
   * back to the VIS API. Keeping the rejection identical to the previous
   * behaviour is deliberate: it used to be a synchronous `throw` inside an
   * `async` method, i.e. already a rejected promise to every caller.
   */
  private static dualReadModulePromise: Promise<typeof import('../../services/DualReadService')> | null = null;

  private static async getDualReadService() {
    if (!CacheServiceCompatibility.dualReadModulePromise) {
      CacheServiceCompatibility.dualReadModulePromise = import('../../services/DualReadService');
    }
    const { DualReadService } = await CacheServiceCompatibility.dualReadModulePromise;
    return DualReadService.getInstance();
  }

  /**
   * The gate of issue #54, phase 2.
   *
   * Returns the dual-read service **only** when the caller's domain has been
   * explicitly switched to the database. Three outcomes, all of them safe:
   *
   * - flag off (the default, and the state of production today) → `null`, and
   *   `DualReadService` is not even imported, so no Supabase client is built
   *   and no chunk is fetched;
   * - flag on and the service builds → the service, configured `db_first` with
   *   `fallbackEnabled`;
   * - flag on and anything throws → the runtime kill switch is armed, every
   *   domain falls back for a cooldown, and this returns `null`.
   *
   * The third case is the one that matters and the one that could not exist
   * before: construction failure used to propagate as a rejected promise from
   * `getInstance()` itself.
   */
  private static async getGatedDualReadService(domain: DbReadDomain) {
    if (!isDbReadEnabled(domain)) {
      return null;
    }

    try {
      const service = await CacheServiceCompatibility.getDualReadService();
      service.configure({
        readStrategy: 'db_first',
        fallbackEnabled: true,
        enablePerformanceMonitoring: true,
      });
      clearDbUnavailable();
      return service;
    } catch (error) {
      markDbUnavailable(
        `${domain}: ${(error as Error)?.message ?? 'unknown DualReadService failure'}`
      );
      return null;
    }
  }

  /**
   * The rejection every read path takes when the database is not its source.
   *
   * A rejection — rather than a silent VIS fetch from in here — is deliberate:
   * it is byte-for-byte the behaviour callers already handle today, because
   * today `getInstance()` throws `supabaseUrl is required.` before any of these
   * methods can do anything. Note also that `DualReadService`'s own "API"
   * fallback is **not** the VIS: it is a Supabase Edge Function behind
   * `EXPO_PUBLIC_EDGE_URL`, which is unset. The real VIS fallback has always
   * lived in this class's callers, and it is reached by rejecting.
   */
  private static disabledError(domain: DbReadDomain): Error {
    return new Error(
      `[CacheServiceCompatibility] database reads for "${domain}" are disabled ` +
        `(issue #54 flag); the caller must use the VIS API path`
    );
  }


  /**
   * Get tournaments with backward compatibility
   * Matches CacheService.getTournaments interface exactly
   */
  static async getTournaments(filters?: FilterOptions): Promise<CacheResult<TournamentCore[]>> {
    const startTime = Date.now();

    try {
      const service = await CacheServiceCompatibility.getGatedDualReadService('tournaments');
      if (service) {
        // Use new hook-based system
        const newFilters = transformFiltersToNew(filters);
        const result = await service.getTournaments(newFilters);

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
        throw CacheServiceCompatibility.disabledError('tournaments');
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
    const startTime = Date.now();

    try {
      const service = await CacheServiceCompatibility.getGatedDualReadService('matches');
      if (service) {
        const normalizedTournamentNo = `${tournamentNo}`.trim();
        const numericEventNo = /^\d+$/.test(normalizedTournamentNo)
          ? Number(normalizedTournamentNo)
          : undefined;

        let resolvedTournamentCode: string | null = null;
        if (numericEventNo !== undefined) {
          try {
            const { TournamentCodeResolver } = require('../../services/TournamentCodeResolver');
            resolvedTournamentCode = await TournamentCodeResolver.getInstance().resolve({
              visNo: normalizedTournamentNo
            });
          } catch {
            resolvedTournamentCode = null;
          }
        }

        const matchFilters: { tournamentCode?: string; eventNo?: number } = {};
        if (numericEventNo !== undefined) {
          matchFilters.eventNo = numericEventNo;
        }
        if (resolvedTournamentCode) {
          matchFilters.tournamentCode = resolvedTournamentCode;
        } else if (numericEventNo === undefined) {
          matchFilters.tournamentCode = normalizedTournamentNo;
        }

        // Use new hook-based system
        const result = await service.getMatches(matchFilters);

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
          cacheKey: `matches_${resolvedTournamentCode || normalizedTournamentNo}`,
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
        throw CacheServiceCompatibility.disabledError('matches');
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
    const startTime = Date.now();

    try {
      const service = await CacheServiceCompatibility.getGatedDualReadService('referees');
      if (service) {
        // Use new hook-based system
        const result = await service.getReferees({
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
        throw CacheServiceCompatibility.disabledError('referees');
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
  /**
   * Invalida la cache delle partite di un torneo.
   *
   * ESISTEVA GIA' UN CHIAMANTE, e non questo metodo:
   * `RealtimeSubscriptionService.invalidateMatchCache` faceva
   * `CacheService.invalidateMatchCache(tournamentNo)` su questa classe, che
   * non lo espone. Ogni aggiornamento dal vivo sollevava quindi un TypeError,
   * raccolto da un catch muto: la cache non veniva mai invalidata e l'app
   * mostrava punteggi vecchi proprio durante il live, cioe' l'unico momento in
   * cui il realtime serve a qualcosa.
   *
   * E' la famiglia dei "membri che il modulo non espone" gia' documentata in
   * CLAUDE.md dopo le issue #71 e #73 — questa stava sul percorso caldo.
   */
  static async invalidateMatchCache(tournamentNo: string): Promise<void> {
    // Le partite del torneo, piu' la voce specifica se la chiave la distingue.
    queryClient.removeQueries({ queryKey: ['matches', tournamentNo] });
    await CacheServiceCompatibility.clearCache(['matches']);
  }

  static async clearCache(keys?: string[]): Promise<void> {
    // The TanStack Query side is unconditional: it is local state and clearing
    // it is correct regardless of where reads come from. Only the DualRead
    // invalidation — which touches Supabase — is gated, per domain.
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

    const cacheTypes: DbReadDomain[] = keys
      ? keys.map(k => k.includes('matches') ? 'matches'
                    : k.includes('referees') ? 'referees'
                    : 'tournaments')
      : [...DB_READ_DOMAINS];

    for (const type of cacheTypes) {
      const service = await CacheServiceCompatibility.getGatedDualReadService(type);
      if (!service) continue;
      await service.invalidateCache(type as any);
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
    const statsService = await CacheServiceCompatibility.getGatedDualReadService('tournaments');
    if (statsService) {
      // Get performance metrics from DualReadService
      const performanceMetrics = statsService.getPerformanceMetrics();

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
      throw CacheServiceCompatibility.disabledError('tournaments');
    }
  }

  /**
   * Initialize cache service (backward compatibility)
   */
  static initialize(config?: any): void {
    // Configure DualReadService with provided config.
    // The signature stays `void` (it is public API for the existing callers);
    // since DualReadService is now loaded lazily this can only be scheduled,
    // not awaited. A failure here is not fatal: every read re-checks the gate
    // and every consumer already falls back to the VIS API.
    //
    // Gated (issue #54): with every domain flagged off — the default — this
    // does not import DualReadService at all, so no Supabase client is built
    // and no async chunk is fetched at startup.
    if (DB_READ_DOMAINS.every(domain => !isDbReadEnabled(domain))) {
      return;
    }

    void (async () => {
      try {
        const service = await CacheServiceCompatibility.getDualReadService();
        service.configure({
          readStrategy: 'db_first',
          fallbackEnabled: true,
          enablePerformanceMonitoring: true,
          ...config
        });
      } catch (error) {
        if (__DEV__) {
          console.warn('[CacheServiceCompatibility] initialize() could not configure DualReadService:', error);
        }
      }
    })();
  }

  /**
   * Set live score for a match (compatibility method)
   * This method provides backward compatibility for live score storage
   */
  static setLiveScore(matchNumber: string | number, liveData: any): void {
    // Convert string to number if needed
    const matchNo = typeof matchNumber === 'string' ? parseInt(matchNumber, 10) : matchNumber;

    try {
      // Store live score data in TanStack Query cache with standardized key
      const liveScoreKey = ['live-score', matchNo];

      // Set the data with a short TTL (5 seconds for live data)
      queryClient.setQueryData(liveScoreKey, liveData, {
        updatedAt: Date.now(),
      });

      // Also store with alternative key for backward compatibility
      queryClient.setQueryData(['liveScore', matchNo], liveData, {
        updatedAt: Date.now(),
      });


    } catch (error) {
      console.error(`Error caching live score for match ${matchNo}:`, error);
    }
  }

  /**
   * Get live score for a match (compatibility method)
   * This method provides backward compatibility for live score access
   */
  static getLiveScore(matchNumber: string | number): any {
    // Convert string to number if needed
    const matchNo = typeof matchNumber === 'string' ? parseInt(matchNumber, 10) : matchNumber;

    // Try to get live score from the polling service cache
    try {
      // Access the global live score polling service cache
      // This requires accessing the cache through the query client
      const liveScoreKey = ['live-score', matchNo];
      const cachedData = queryClient.getQueryData(liveScoreKey);

      if (cachedData) {
        return cachedData;
      }

      // Fallback: Try to get from TanStack Query cache with different key patterns
      const alternativeKeys = [
        ['liveScore', matchNo],
        ['live_score', matchNo],
        [`match_${matchNo}_live`],
        [`live-${matchNo}`]
      ];

      for (const key of alternativeKeys) {
        const data = queryClient.getQueryData(key);
        if (data) {
          return data;
        }
      }

      // No cached live score found
      console.log(`❌ No live score found in cache for match ${matchNo}`);
      return null;

    } catch (error) {
      // If there's an error accessing the cache, return null
      console.warn(`Error retrieving live score for match ${matchNo}:`, error);
      return null;
    }
  }

  /**
   * Is any read domain served by the database?
   *
   * @deprecated The question is now per-domain. Use
   * `isDbReadEnabled(domain)` from `services/flags/DbReadFlags`.
   */
  static isUsingNewHooks(): boolean {
    return DB_READ_DOMAINS.some(domain => isDbReadEnabled(domain));
  }

  /**
   * @deprecated Kept as the migration helper it always was, now expressed in
   * terms of the issue #54 flag: it switches **every** domain to the database.
   * Prefer `setDbReadOverride(['tournaments'])` — the whole point of the flag
   * is that activation happens one domain at a time.
   */
  static enableNewHooks(): void {
    setDbReadOverride('all');
  }

  /**
   * @deprecated The rollback of AC6. Equivalent to `setDbReadOverride('off')`
   * or `__beachrefDbReads.off()` in the browser console.
   */
  static disableNewHooks(): void {
    setDbReadOverride('off');
  }
}

export default CacheServiceCompatibility;
