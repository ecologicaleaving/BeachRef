import { TournamentCore, GenderType, TournamentType, TournamentStatus } from '../types/tournament-v2';
import { BeachMatch } from '../types/match';
import { CachedData, CacheConfiguration, CacheResult, FilterOptions, CacheTier } from '../types/cache';
import { MemoryCacheManager } from './MemoryCacheManager';
import { LocalStorageManager } from './LocalStorageManager';
import { CacheStatsService } from './CacheStatsService';
import { supabase } from './supabase';
import { NetworkMonitor } from './NetworkMonitor';
import { VisApiClient } from './api/VisApiClient';
import { VisApiClientConfig, DEFAULT_RETRY_CONFIG } from '../types/api-v2';
import { TournamentRefereeData } from '../types/referee-v2';

/**
 * Multi-tier cache service with intelligent fallback logic
 * Implements Memory → Local Storage → Supabase → API fallback strategy
 */
export class CacheService {
  private static memoryCache: MemoryCacheManager;
  private static localStorage: LocalStorageManager;
  private static stats: CacheStatsService;
  private static config: CacheConfiguration;
  private static networkMonitor: NetworkMonitor;
  private static initialized = false;

  /**
   * Initialize cache service with configuration
   */
  static initialize(config?: Partial<CacheConfiguration>): void {
    if (this.initialized) return;

    this.config = {
      memoryMaxSize: 50, // MB
      memoryMaxEntries: 1000,
      localStorageMaxAge: 7, // days
      defaultTTL: {
        tournaments: 24 * 60 * 60 * 1000, // 24 hours
        matchesScheduled: 15 * 60 * 1000, // 15 minutes
        matchesLive: 30 * 1000, // 30 seconds
        matchesFinished: 24 * 60 * 60 * 1000, // 24 hours
        referees: 24 * 60 * 60 * 1000 // 24 hours
      },
      ...config
    };

    this.memoryCache = new MemoryCacheManager(
      this.config.memoryMaxSize,
      this.config.memoryMaxEntries
    );
    this.localStorage = new LocalStorageManager(this.config.localStorageMaxAge);
    this.stats = CacheStatsService.getInstance();
    this.networkMonitor = NetworkMonitor.getInstance();

    this.initialized = true;
  }

  /**
   * Get singleton instance for compatibility with DualReadService
   * Returns a wrapper that provides instance methods for the static class
   */
  static getInstance() {
    this.ensureInitialized();
    return {
      getTournaments: (filters?: FilterOptions) => this.getTournaments(filters),
      getMatches: (tournamentCode: string) => this.getMatches(tournamentCode),
      getRefereeData: (tournamentCode: string) => this.getRefereeData(tournamentCode),
      clearCache: () => this.clearCache(),
      getCacheStats: () => this.getCacheStats(),
      invalidate: (pattern: string) => this.invalidate(pattern),
    };
  }

  /**
   * Get tournaments with multi-tier fallback
   */
  static async getTournaments(filters?: FilterOptions): Promise<CacheResult<TournamentCore[]>> {
    this.ensureInitialized();
    const requestId = this.generateRequestId();
    
    // Create stable cache key for proper caching
    const baseCacheKey = filters?.year ? `tournaments_${filters.year}` : `tournaments_recent`;
    
    // console.log(`🏐 CacheService: Using cache key: ${baseCacheKey}`);

    this.stats.startTimer(requestId);

    try {
      // Tier 1: Memory Cache
      const memoryResult = this.getFromMemory(baseCacheKey);
      if (memoryResult) {
        this.stats.recordHit('memory', requestId);
        
        // Apply client-side filtering for memory cache
        const filteredMemoryResult = this.applyTournamentFilters(memoryResult, filters);
        
        return {
          data: filteredMemoryResult,
          source: 'memory',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Tier 2: Local Storage
      const localResult = await this.getFromLocalStorage(baseCacheKey);
      if (localResult) {
        // Apply client-side filtering for local storage cache
        const filteredLocalResult = this.applyTournamentFilters(localResult, filters);
        
        // Update memory cache with filtered result
        this.setInMemory(baseCacheKey, filteredLocalResult, this.config.defaultTTL.tournaments);
        this.stats.recordHit('localStorage', requestId);
        return {
          data: filteredLocalResult,
          source: 'localStorage',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Tier 2.5: Offline Storage (when network is unavailable)
      if (!this.networkMonitor.isConnected) {
        // console.log('Network unavailable, checking offline storage for tournaments');
        const offlineResult = await this.getFromOfflineStorage(baseCacheKey);
        if (offlineResult) {
          this.stats.recordHit('offline', requestId);
          return {
            data: offlineResult,
            source: 'offline',
            fromCache: true,
            timestamp: Date.now()
          };
        }
        
        // If no offline data and network unavailable, throw specific error
        throw new Error('No cached data available offline');
      }

      // Tier 3: Supabase Cache (when network available)
      try {
        const supabaseResult = await this.getTournamentsFromSupabase(filters);
        if (supabaseResult && supabaseResult.length > 0) {
          // Update higher tier caches and offline storage
          await this.setLocalStorage(baseCacheKey, supabaseResult, this.config.defaultTTL.tournaments);
          await this.setOfflineStorage(baseCacheKey, supabaseResult);
          this.setInMemory(baseCacheKey, supabaseResult, this.config.defaultTTL.tournaments);
          this.stats.recordHit('supabase', requestId);
          return {
            data: supabaseResult,
            source: 'supabase',
            fromCache: true,
            timestamp: Date.now()
          };
        }
      } catch (supabaseError) {
        // console.warn('Supabase cache unavailable (DNS/connection issue), falling back to API:', supabaseError);
        // Continue to API fallback - this is expected behavior for graceful degradation
      }

      // Tier 4: Direct API Fallback (only when network available)
      const apiResult = await this.getTournamentsFromAPI(filters);
      
      // Apply deduplication to fresh API data before caching
      // console.log(`🏐 CacheService: API returned ${apiResult.length} tournaments, applying merging...`);
      
      // Log Baden tournaments before merging
      apiResult.forEach(t => {
        if (t.name?.toLowerCase().includes('baden')) {
          // console.log(`🏐 BADEN BEFORE MERGE:`, JSON.stringify(t, null, 2));
        }
      });
      
      const mergedApiResult = this.deduplicateTournaments(apiResult);
      // console.log(`🏐 CacheService: After merging: ${mergedApiResult.length} tournaments`);
      
      // Log first few merged tournaments for debugging
      mergedApiResult.slice(0, 3).forEach(t => {
        const merged = (t as any)._mergedTournaments || [];
      });
      
      // Update all cache tiers including offline storage with merged data
      await this.updateSupabaseCache(mergedApiResult);
      await this.setLocalStorage(baseCacheKey, mergedApiResult, this.config.defaultTTL.tournaments);
      await this.setOfflineStorage(baseCacheKey, mergedApiResult);
      this.setInMemory(baseCacheKey, mergedApiResult, this.config.defaultTTL.tournaments);
      
      this.stats.recordHit('api', requestId);
      return {
        data: mergedApiResult,
        source: 'api',
        fromCache: false,
        timestamp: Date.now()
      };

    } catch (error) {
      // console.error('CacheService.getTournaments error:', error);
      
      // Final fallback: try offline storage first, then stale data
      const offlineData = await this.getFromOfflineStorage(baseCacheKey);
      if (offlineData) {
        return {
          data: offlineData,
          source: 'offline',
          fromCache: true,
          timestamp: Date.now()
        };
      }
      
      const staleData = await this.getStaleData(baseCacheKey);
      if (staleData) {
        return {
          data: staleData,
          source: 'localStorage',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      throw error;
    }
  }

  /**
   * Get referee data with 24-hour TTL multi-tier caching
   */
  static async getRefereeData(tournamentNo: string): Promise<CacheResult<TournamentRefereeData>> {
    this.ensureInitialized();
    const requestId = this.generateRequestId();
    const cacheKey = this.generateCacheKey('referees', { tournamentNo });

    this.stats.startTimer(requestId);

    try {
      // Tier 1: Memory Cache
      const memoryResult = this.getRefereesFromMemory(cacheKey);
      if (memoryResult) {
        this.stats.recordHit('memory', requestId);
        return {
          data: memoryResult,
          source: 'memory',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Tier 2: Local Storage
      const localResult = await this.getRefereesFromLocalStorage(cacheKey);
      if (localResult) {
        this.setInMemory(cacheKey, localResult, this.config.defaultTTL.referees);
        this.stats.recordHit('localStorage', requestId);
        return {
          data: localResult,
          source: 'localStorage',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Tier 2.5: Offline Storage (when network is unavailable)
      if (!this.networkMonitor.isConnected) {
        const offlineResult = await this.getRefereesFromOfflineStorage(cacheKey);
        if (offlineResult) {
          this.stats.recordHit('offline', requestId);
          return {
            data: offlineResult,
            source: 'offline',
            fromCache: true,
            timestamp: Date.now()
          };
        }
        
        throw new Error('No cached referee data available offline');
      }

      // Tier 4: Direct API Fallback (only when network available)
      const apiResult = await this.getRefereesFromAPI(tournamentNo);
      
      // Update all cache tiers with fresh data
      await this.setLocalStorage(cacheKey, apiResult, this.config.defaultTTL.referees);
      await this.setOfflineStorage(cacheKey, apiResult);
      this.setInMemory(cacheKey, apiResult, this.config.defaultTTL.referees);
      
      this.stats.recordHit('api', requestId);
      return {
        data: apiResult,
        source: 'api',
        fromCache: false,
        timestamp: Date.now()
      };

    } catch (error) {
      // Final fallback: try offline storage first, then stale data
      const offlineData = await this.getRefereesFromOfflineStorage(cacheKey);
      if (offlineData) {
        return {
          data: offlineData,
          source: 'offline',
          fromCache: true,
          timestamp: Date.now()
        };
      }
      
      const staleData = await this.getStaleData(cacheKey);
      if (staleData) {
        return {
          data: staleData,
          source: 'localStorage',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      throw error;
    }
  }

  /**
   * Get matches with dynamic TTL based on match status
   */
  static async getMatches(tournamentNo: string): Promise<CacheResult<BeachMatch[]>> {
    this.ensureInitialized();
    const requestId = this.generateRequestId();
    const cacheKey = this.generateCacheKey('matches', { tournamentNo });

    this.stats.startTimer(requestId);

    try {
      // Tier 1: Memory Cache with performance monitoring
      const memoryStartTime = performance.now();
      const memoryResult = this.getFromMemory(cacheKey);
      if (memoryResult) {
        const memoryDuration = performance.now() - memoryStartTime;
        // console.log(`Memory cache hit for matches in ${memoryDuration.toFixed(2)}ms`);
        this.stats.recordHit('memory', requestId);
        return {
          data: memoryResult,
          source: 'memory',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Tier 2: Local Storage with performance monitoring
      const localStartTime = performance.now();
      const localResult = await this.getFromLocalStorage(cacheKey);
      if (localResult) {
        const localDuration = performance.now() - localStartTime;
        // console.log(`Local storage cache hit for matches in ${localDuration.toFixed(2)}ms`);
        const ttl = this.calculateMatchesTTL(localResult);
        this.setInMemory(cacheKey, localResult, ttl);
        this.stats.recordHit('localStorage', requestId);
        return {
          data: localResult,
          source: 'localStorage',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Tier 2.5: Offline Storage (when network is unavailable)
      if (!this.networkMonitor.isConnected) {
        // console.log('Network unavailable, checking offline storage for matches');
        const offlineResult = await this.getFromOfflineStorage(cacheKey);
        if (offlineResult) {
          this.stats.recordHit('offline', requestId);
          return {
            data: offlineResult,
            source: 'offline',
            fromCache: true,
            timestamp: Date.now()
          };
        }
        
        // If no offline data and network unavailable, throw specific error
        throw new Error('No cached match data available offline');
      }

      // Tier 3: Supabase Cache with enhanced error handling and performance monitoring (when network available)
      try {
        const supabaseStartTime = performance.now();
        const supabaseResult = await this.getMatchesFromSupabase(tournamentNo);
        if (supabaseResult && supabaseResult.length > 0) {
          const supabaseDuration = performance.now() - supabaseStartTime;
          // console.log(`Supabase cache hit for matches in ${supabaseDuration.toFixed(2)}ms`);
          const ttl = this.calculateMatchesTTL(supabaseResult);
          await this.setLocalStorage(cacheKey, supabaseResult, ttl);
          await this.setOfflineStorage(cacheKey, supabaseResult);
          this.setInMemory(cacheKey, supabaseResult, ttl);
          this.stats.recordHit('supabase', requestId);
          return {
            data: supabaseResult,
            source: 'supabase',
            fromCache: true,
            timestamp: Date.now()
          };
        }
      } catch (supabaseError) {
        // console.warn('Supabase cache unavailable for matches (DNS/connection issue), falling back to API:', supabaseError);
        // Continue to API fallback - this is expected behavior for graceful degradation
      }

      // Tier 4: Direct API Fallback (only when network available)
      const apiResult = await this.getMatchesFromAPI(tournamentNo);
      const ttl = this.calculateMatchesTTL(apiResult);
      
      // Update all cache tiers including offline storage
      await this.updateMatchesCache(tournamentNo, apiResult);
      await this.setLocalStorage(cacheKey, apiResult, ttl);
      await this.setOfflineStorage(cacheKey, apiResult);
      this.setInMemory(cacheKey, apiResult, ttl);
      
      this.stats.recordHit('api', requestId);
      return {
        data: apiResult,
        source: 'api',
        fromCache: false,
        timestamp: Date.now()
      };

    } catch (error) {
      // console.error('CacheService.getMatches error:', error);
      
      // Final fallback: try offline storage first, then stale data
      const offlineData = await this.getFromOfflineStorage(cacheKey);
      if (offlineData) {
        return {
          data: offlineData,
          source: 'offline',
          fromCache: true,
          timestamp: Date.now()
        };
      }
      
      const staleData = await this.getStaleData(cacheKey);
      if (staleData) {
        return {
          data: staleData,
          source: 'localStorage',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      throw error;
    }
  }

  // Memory cache operations
  static getFromMemory(key: string): any | null {
    const entry = this.memoryCache.get(key);
    return entry ? entry.data : null;
  }

  static setInMemory(key: string, data: any, ttl: number): void {
    this.memoryCache.set(key, data, ttl);
  }

  static clearMemoryCache(key?: string): void {
    if (key) {
      this.memoryCache.delete(key);
    } else {
      this.memoryCache.clear();
    }
  }

  // Local storage operations
  static async getFromLocalStorage(key: string): Promise<any | null> {
    const cachedData = await this.localStorage.get(key);
    return cachedData ? cachedData.data : null;
  }

  static async setLocalStorage(key: string, data: any, ttl: number): Promise<void> {
    await this.localStorage.set(key, data, ttl);
  }

  static async clearLocalStorage(key?: string): Promise<void> {
    if (key) {
      await this.localStorage.delete(key);
    } else {
      await this.localStorage.clear();
    }
  }

  // Offline storage operations
  static async getFromOfflineStorage(key: string): Promise<any | null> {
    return await this.localStorage.getOffline(key);
  }

  static async setOfflineStorage(key: string, data: any): Promise<void> {
    await this.localStorage.setOffline(key, data);
  }

  static async clearOfflineStorage(key?: string): Promise<void> {
    if (key) {
      await this.localStorage.deleteOffline(key);
    } else {
      await this.localStorage.clearOffline();
    }
  }

  static get isNetworkConnected(): boolean {
    this.ensureInitialized();
    return this.networkMonitor.isConnected;
  }

  static async getNetworkStatus(): Promise<{
    isConnected: boolean;
    type: string | null;
    isInternetReachable: boolean | null;
  }> {
    this.ensureInitialized();
    return await this.networkMonitor.getNetworkState();
  }

  // Supabase cache operations
  static async getTournamentsFromSupabase(filters?: FilterOptions): Promise<TournamentCore[]> {
    // Skip Supabase if not available (development mode)
    if (!supabase) {
      // console.log('Supabase not available, skipping cache tier');
      throw new Error('Supabase not available');
    }
    
    try {
      let query = supabase.from('tournaments').select('*');

      // Apply filters matching API behavior
      if (filters?.currentlyActive) {
        query = query.eq('status', 'Running');
      }
      
      if (filters?.year) {
        // Filter by year using JSONB dates field
        const yearStart = `${filters.year}-01-01`;
        const yearEnd = `${filters.year}-12-31`;
        query = query
          .gte('dates->>startDate', yearStart)
          .lte('dates->>startDate', yearEnd);
      }

      if (filters?.tournamentType && filters.tournamentType !== 'ALL') {
        // Filter by tournament type (FIVB, BPT, CEV, LOCAL)
        query = query.eq('tournament_type', filters.tournamentType);
      }

      // For historical data (previous years), use more relaxed freshness requirements
      const currentYear = new Date().getFullYear();
      const isHistoricalQuery = filters?.year && filters.year < currentYear;
      
      if (!isHistoricalQuery) {
        // For current year data, maintain 24-hour freshness requirement
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('last_synced', twentyFourHoursAgo);
      } else {
        // For historical data, use 30-day freshness to allow cached data
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('last_synced', thirtyDaysAgo);
        // console.log(`🏐 Using relaxed freshness for historical year ${filters.year} (30 days)`);
      }

      // Apply recent-only filter at database level when possible
      if (filters?.recentOnly) {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const oneMonthFromNow = new Date();
        oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
        
        query = query
          .gte('dates->>startDate', oneMonthAgo.toISOString().split('T')[0])
          .lte('dates->>startDate', oneMonthFromNow.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) {
        // console.error('Supabase tournaments query error:', error);
        return [];
      }

      return this.mapSupabaseTournaments(data || []);
    } catch (error) {
      // console.error('getTournamentsFromSupabase error:', error);
      return [];
    }
  }

  static async getMatchesFromSupabase(tournamentNo: string): Promise<BeachMatch[]> {
    // Skip Supabase if not available (development mode)
    if (!supabase) {
      // console.log('Supabase not available, skipping matches cache tier');
      throw new Error('Supabase not available');
    }
    
    try {
      let query = supabase
        .from('matches')
        .select('*')
        .eq('tournament_no', tournamentNo);

      // Apply intelligent freshness checking based on match types
      // For live matches, data must be very fresh (last 30 seconds)
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
      
      // Get all matches first to analyze their status
      const { data: allMatches, error: allError } = await query;
      if (allError) {
        // console.error('Supabase matches query error:', allError);
        return [];
      }

      const mappedMatches = this.mapSupabaseMatches(allMatches || []);
      
      // Check if we have live matches - if so, apply strict freshness
      const hasLiveMatches = mappedMatches.some(m => this.isLiveMatch(m));
      
      if (hasLiveMatches) {
        // For tournaments with live matches, only return data that's very fresh
        const freshQuery = await supabase
          .from('matches')
          .select('*')
          .eq('tournament_no', tournamentNo)
          .gte('last_synced', thirtySecondsAgo);

        const { data: freshData, error: freshError } = freshQuery;
        if (freshError || !freshData || freshData.length === 0) {
          // console.log('Live matches detected but data not fresh enough, falling back to API');
          return [];
        }
        
        // console.log(`Returning fresh match data for tournament ${tournamentNo} with live matches`);
        return this.mapSupabaseMatches(freshData);
      }

      // For non-live matches, apply standard freshness (15 minutes for scheduled, 24 hours for finished)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const hasScheduledMatches = mappedMatches.some(m => this.isScheduledMatch(m));
      const freshnessThreshold = hasScheduledMatches ? fifteenMinutesAgo : twentyFourHoursAgo;
      
      const standardQuery = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_no', tournamentNo)
        .gte('last_synced', freshnessThreshold);

      const { data, error } = standardQuery;
      if (error) {
        // console.error('Supabase matches freshness query error:', error);
        return [];
      }

      if (!data || data.length === 0) {
        // console.log(`Match data for tournament ${tournamentNo} not fresh enough, will fetch from API`);
        return [];
      }

      // console.log(`Returning cached match data for tournament ${tournamentNo} (fresh within threshold)`);
      return this.mapSupabaseMatches(data);
    } catch (error) {
      // console.error('getMatchesFromSupabase error:', error);
      return [];
    }
  }

  static async updateSupabaseCache(tournaments: TournamentCore[]): Promise<void> {
    // Skip Supabase if not available (development mode)
    if (!supabase) {
      // console.log('Supabase not available, skipping cache update');
      return;
    }
    
    // This would be handled by background sync jobs in production
    // For now, we'll skip direct Supabase updates from client
    // console.log('updateSupabaseCache: Would update', tournaments.length, 'tournaments');
  }

  static async updateMatchesCache(tournamentNo: string, matches: BeachMatch[]): Promise<void> {
    // This would be handled by background sync jobs in production
    // console.log('updateMatchesCache: Would update', matches.length, 'matches for tournament', tournamentNo);
  }

  // Utility methods
  static isFresh(data: CachedData, maxAge: number): boolean {
    return Date.now() - data.timestamp < maxAge;
  }

  static generateCacheKey(type: string, filters?: any): string {
    if (!filters) return type;
    const filterString = JSON.stringify(filters);
    // Use btoa for React Native compatibility instead of Buffer
    const base64 = typeof btoa !== 'undefined' 
      ? btoa(filterString) 
      : Buffer.from(filterString).toString('base64');
    return `${type}_${base64.replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  static getCacheStats() {
    return this.stats.getDetailedMetrics();
  }

  // Private helper methods
  private static ensureInitialized(): void {
    if (!this.initialized) {
      this.initialize();
    }
  }

  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private static async getTournamentsFromAPI(filters?: FilterOptions): Promise<TournamentCore[]> {
    // console.log('CacheService: getTournamentsFromAPI called, bypassing cache to call direct API');
    // console.log('CacheService: Filters passed to API:', JSON.stringify(filters));
    // console.log('CacheService: Starting direct API call...');
    
    const config: VisApiClientConfig = {
      baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
      timeoutMs: 10000,
      maxRetries: 3,
      retryDelayMs: 1000,
      exponentialBackoff: true,
      enableLogging: true
    };
    
    const visApi = new VisApiClient(config, DEFAULT_RETRY_CONFIG);
    
    const startTime = Date.now();
    // console.log('🏐 CacheService: Making API call to VIS with:', {
    //   tournamentType: filters?.tournamentType || 'BPT',
    //   year: filters?.year,
    //   maxResults: 50
    // });
    
    const response = await visApi.getEventList({
      tournamentType: filters?.tournamentType || 'BPT',
      maxResults: 100  // Increase to get more tournaments
    });
    
    const duration = Date.now() - startTime;
    
    if (!response.success) {
      // console.error('CacheService: API call failed:', response.error);
      return [];
    }
    
    // Parse XML response to TournamentCore objects
    const result = this.parseXmlToTournaments(response.xmlData);
    
    // console.log(`CacheService: Direct API call completed in ${duration}ms, got ${result.length} tournaments`);
    if (filters?.year) {
      // console.log(`CacheService: API result for year ${filters.year}: ${result.length} tournaments`);
    }
    return result;
  }

  private static async getMatchesFromAPI(tournamentNo: string): Promise<BeachMatch[]> {
    console.log(`📡 CacheService: Starting API call for tournament ${tournamentNo}`);
    const config: VisApiClientConfig = {
      baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
      timeoutMs: 45000, // Increase to 45 seconds for old tournaments with lots of data
      maxRetries: 2, // Reduce retries to avoid long delays
      retryDelayMs: 2000,
      exponentialBackoff: true,
      enableLogging: true
    };
    
    const visApi = new VisApiClient(config, DEFAULT_RETRY_CONFIG);
    const response = await visApi.getBeachMatchList({
      tournamentNo,
      includeResults: true,
      includeReferees: true
    });
    
    if (!response.success) {
      console.error(`❌ CacheService: Match API call failed for tournament ${tournamentNo}:`, response.error);
      console.error(`❌ This could be due to timeout, network issues, or tournament data unavailability`);
      return [];
    }
    
    console.log(`✅ CacheService: Match API call succeeded for tournament ${tournamentNo}`);
    
    // Parse XML response to BeachMatch objects using VisResponseParser
    try {
      const { VisResponseParser } = await import('./parsing/VisResponseParser');
      const matches = VisResponseParser.parseBeachMatches(response.xmlData, tournamentNo);
      console.log(`✅ CacheService: Parsed ${matches.length} matches for tournament ${tournamentNo}`);
      
      // Log referee data in first few matches to debug referee extraction
      if (matches.length > 0) {
        console.log(`🏐 CacheService: Sample match data for referee debugging:`, {
          totalMatches: matches.length,
          sampleMatch1: {
            id: matches[0]?.id,
            Referee1Name: matches[0]?.Referee1Name,
            Referee2Name: matches[0]?.Referee2Name,
            allKeys: Object.keys(matches[0] || {})
          },
          sampleMatch2: matches.length > 1 ? {
            id: matches[1]?.id,
            Referee1Name: matches[1]?.Referee1Name,
            Referee2Name: matches[1]?.Referee2Name
          } : 'No second match'
        });
      }
      
      return matches;
    } catch (error) {
      console.error(`❌ CacheService: Failed to parse matches for tournament ${tournamentNo}:`, error);
      return [];
    }
  }

  // Referee cache tier methods
  private static getRefereesFromMemory(cacheKey: string): TournamentRefereeData | null {
    const entry = this.memoryCache.get(cacheKey);
    return entry ? entry.data : null;
  }

  private static async getRefereesFromLocalStorage(cacheKey: string): Promise<TournamentRefereeData | null> {
    const cachedData = await this.localStorage.get(cacheKey);
    return cachedData ? cachedData.data : null;
  }

  private static async getRefereesFromOfflineStorage(cacheKey: string): Promise<TournamentRefereeData | null> {
    return await this.localStorage.getOffline(cacheKey);
  }

  private static async getRefereesFromAPI(tournamentNo: string): Promise<TournamentRefereeData> {
    const config: VisApiClientConfig = {
      baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
      timeoutMs: 10000,
      maxRetries: 3,
      retryDelayMs: 1000,
      exponentialBackoff: true,
      enableLogging: true
    };
    
    const visApi = new VisApiClient(config, DEFAULT_RETRY_CONFIG);
    const timestamp = new Date().toISOString();
    
    try {
      // Make parallel calls for officials and referees
      const [officialsResponse, refereesResponse] = await Promise.all([
        visApi.getEventOfficialList({
          eventNo: tournamentNo,
          fields: ['NoOfficial', 'FirstName', 'LastName', 'Role', 'Status']
        }),
        visApi.getEventRefereeList({
          eventNo: tournamentNo,
          fields: ['NoReferee', 'FirstName', 'LastName', 'Gender', 'Role', 'Status']
        })
      ]);
      
      if (!officialsResponse.success || !refereesResponse.success) {
        throw new Error('Failed to fetch referee data from API');
      }
      
      // Log XML responses for debugging
      console.log('=== OFFICIALS XML RESPONSE ===');
      console.log('Tournament:', tournamentNo);
      console.log('Response XML:', officialsResponse.xmlData);
      console.log('===============================');
      
      console.log('=== REFEREES XML RESPONSE ===');
      console.log('Tournament:', tournamentNo);
      console.log('Response XML:', refereesResponse.xmlData);
      console.log('==============================');
      
      // Parse responses and create combined data structure
      const officials = this.parseOfficialListXml(officialsResponse.xmlData);
      const referees = this.parseRefereeListXml(refereesResponse.xmlData);
      
      return {
        officials,
        referees,
        eventNo: tournamentNo,
        timestamp,
        expiresAt: new Date(Date.now() + this.config.defaultTTL.referees).toISOString()
      };
      
    } catch (error) {
      console.error('CacheService: Referee API call failed:', error);
      console.log('=== REFEREE API ERROR DETAILS ===');
      console.log('Tournament:', tournamentNo);
      console.log('Error:', error);
      console.log('=================================');
      
      // Return empty structure for fallback compatibility
      return {
        officials: [],
        referees: [],
        eventNo: tournamentNo,
        timestamp,
        expiresAt: new Date(Date.now() + this.config.defaultTTL.referees).toISOString()
      };
    }
  }

  private static parseOfficialListXml(xmlData: string): any[] {
    return this.parseXmlList(xmlData, 'Official', {
      federationCode: 'FederationCode',
      firstName: 'FirstName',
      gender: 'Gender',
      lastName: 'LastName',
      noOfficial: 'NoOfficial',
      role: 'Role',
      status: 'Status',
      type: 'Type'
    }, ['noOfficial', 'firstName', 'lastName']);
  }

  private static parseRefereeListXml(xmlData: string): any[] {
    return this.parseXmlList(xmlData, 'Referee', {
      federationCode: 'FederationCode',
      firstName: 'FirstName',
      gender: 'Gender',
      lastName: 'LastName',
      RefereeId: 'NoReferee', // Map NoReferee from XML to RefereeId variable
      status: 'Status',
      type: 'Type',
      theoryTest: 'TheoryTest',
      strongPoints: 'StrongPoints',
      weakPoints: 'WeakPoints'
    }, ['RefereeId', 'firstName', 'lastName']); // Use RefereeId as required field
  }

  /**
   * Generic XML list parser to reduce code duplication
   * Extracts elements and maps XML tags to object properties
   */
  private static parseXmlList(
    xmlData: string, 
    elementName: string, 
    fieldMapping: Record<string, string>, 
    requiredFields: string[]
  ): any[] {
    try {
      const items: any[] = [];
      
      // Parse elements from XML structure
      const elementRegex = new RegExp(`<${elementName}>(.*?)<\/${elementName}>`, 'gs');
      const elementMatches = xmlData.match(elementRegex) || [];
      
      elementMatches.forEach(elementMatch => {
        try {
          const getValue = (tagName: string): string => {
            const regex = new RegExp(`<${tagName}>([^<]*)<\/${tagName}>`, 'i');
            const result = elementMatch.match(regex);
            return result ? result[1] || '' : '';
          };
          
          const item: any = {};
          
          // Map all fields from XML to object properties
          Object.entries(fieldMapping).forEach(([objectKey, xmlTag]) => {
            const value = getValue(xmlTag);
            if (xmlTag === 'TheoryTest' || xmlTag === 'StrongPoints' || xmlTag === 'WeakPoints') {
              item[objectKey] = value || undefined;
            } else {
              item[objectKey] = value;
            }
          });
          
          // Only include items with required fields populated
          const hasRequiredFields = requiredFields.every(field => item[field]);
          if (hasRequiredFields) {
            items.push(item);
          }
        } catch (parseError) {
          console.warn(`Failed to parse ${elementName.toLowerCase()} entry:`, parseError);
        }
      });
      
      return items;
    } catch (error) {
      console.error(`${elementName} XML parsing failed:`, error);
      return [];
    }
  }

  private static calculateMatchesTTL(matches: BeachMatch[]): number {
    // Check for live matches first - they require the most frequent updates
    const hasLiveMatches = matches.some(m => this.isLiveMatch(m));
    if (hasLiveMatches) {
      // console.log('Live matches detected, using 30-second TTL');
      return this.config.defaultTTL.matchesLive; // 30 seconds
    }

    // Check for scheduled/upcoming matches - moderate update frequency
    const hasScheduledMatches = matches.some(m => this.isScheduledMatch(m));
    if (hasScheduledMatches) {
      // console.log('Scheduled matches detected, using 15-minute TTL');
      return this.config.defaultTTL.matchesScheduled; // 15 minutes
    }

    // All matches are finished - stable data, long TTL
    // console.log('All matches finished, using 24-hour TTL');
    return this.config.defaultTTL.matchesFinished; // 24 hours
  }

  /**
   * Check if a match is live and requires frequent updates
   */
  private static isLiveMatch(match: BeachMatch): boolean {
    const status = match.Status?.toLowerCase();
    return status === 'live' || 
           status === 'inprogress' || 
           status === 'running';
  }

  /**
   * Check if a match is scheduled/upcoming
   */
  private static isScheduledMatch(match: BeachMatch): boolean {
    const status = match.Status?.toLowerCase();
    return status === 'scheduled' || 
           status === 'upcoming';
  }

  /**
   * Check if a match is finished
   */
  private static isFinishedMatch(match: BeachMatch): boolean {
    const status = match.Status?.toLowerCase();
    return status === 'finished' || 
           status === 'completed';
  }

  private static async getStaleData(key: string): Promise<any | null> {
    try {
      // Try to get data regardless of expiration
      const value = await this.localStorage.get(key);
      return value ? value.data : null;
    } catch {
      return null;
    }
  }

  private static mapSupabaseTournaments(data: any[]): TournamentCore[] {
    return data.map(item => ({
      // VisEntity required fields
      id: `tournament_${item.No || item.no}`,
      visNo: (item.No || item.no)?.toString() || '',
      version: 1,
      lastUpdated: new Date().toISOString(),
      // TournamentCore fields
      code: item.Code || item.code || '',
      name: item.Name || item.name || '',
      title: item.Title || item.title,
      gender: item.Gender || item.gender || 'Mixed',
      tournamentType: item.Type || item.type || 'BPT',
      dates: {
        startDate: item.StartDate || item.start_date || '',
        endDate: item.EndDate || item.end_date || ''
      },
      status: item.Status || item.status || 'ACTIVE',
      city: item.City || item.city,
      country: item.Country || item.country,
      countryCode: item.CountryCode || item.country_code,
      location: item.Location || item.location
    }));
  }

  private static mapSupabaseMatches(data: any[]): BeachMatch[] {
    return data.map(item => ({
      No: item.No || item.no,
      NoInTournament: item.NoInTournament || item.no_in_tournament,
      TeamAName: item.TeamAName || item.team_a_name,
      TeamBName: item.TeamBName || item.team_b_name,
      LocalDate: item.LocalDate || item.local_date,
      LocalTime: item.LocalTime || item.local_time,
      Court: item.Court || item.court,
      Status: item.Status || item.status,
      Round: item.Round || item.round,
      MatchPointsA: (item.MatchPointsA || item.match_points_a)?.toString(),
      MatchPointsB: (item.MatchPointsB || item.match_points_b)?.toString(),
      PointsTeamASet1: (item.PointsTeamASet1 || item.points_team_a_set1)?.toString(),
      PointsTeamBSet1: (item.PointsTeamBSet1 || item.points_team_b_set1)?.toString(),
      PointsTeamASet2: (item.PointsTeamASet2 || item.points_team_a_set2)?.toString(),
      PointsTeamBSet2: (item.PointsTeamBSet2 || item.points_team_b_set2)?.toString(),
      PointsTeamASet3: (item.PointsTeamASet3 || item.points_team_a_set3)?.toString(),
      PointsTeamBSet3: (item.PointsTeamBSet3 || item.points_team_b_set3)?.toString(),
      DurationSet1: item.DurationSet1 || item.duration_set1,
      DurationSet2: item.DurationSet2 || item.duration_set2,
      DurationSet3: item.DurationSet3 || item.duration_set3,
      NoReferee1: item.NoReferee1 || item.no_referee1,
      NoReferee2: item.NoReferee2 || item.no_referee2,
      Referee1Name: item.Referee1Name || item.referee1_name,
      Referee2Name: item.Referee2Name || item.referee2_name,
      Referee1FederationCode: item.Referee1FederationCode || item.referee1_federation_code,
      Referee2FederationCode: item.Referee2FederationCode || item.referee2_federation_code,
      tournamentNo: item.tournamentNo || item.tournament_no
    }));
  }

  /**
   * Cleanup operations
   */
  static async cleanup(): Promise<{
    memoryCleanedEntries: number;
    localStorageCleanedEntries: number;
  }> {
    const memoryCleanedEntries = this.memoryCache.cleanupExpired();
    const localStorageCleanedEntries = await this.localStorage.cleanup();

    return {
      memoryCleanedEntries,
      localStorageCleanedEntries
    };
  }

  /**
   * Invalidate cache entries by pattern
   */
  static async invalidate(pattern: string): Promise<void> {
    // Clear from memory cache
    const memoryKeys = this.memoryCache.getKeysByPattern(pattern);
    memoryKeys.forEach(key => this.memoryCache.delete(key));

    // Clear from local storage
    const localKeys = await this.localStorage.getKeysByPattern(pattern);
    for (const key of localKeys) {
      await this.localStorage.delete(key);
    }
  }

  /**
   * Invalidate match cache for a specific tournament (used by real-time updates)
   */
  static async invalidateMatchCache(tournamentNo: string): Promise<void> {
    const matchesKey = this.generateCacheKey('matches', { tournamentNo });
    
    // Clear from memory cache
    this.memoryCache.delete(matchesKey);
    
    // Clear from local storage
    await this.localStorage.delete(matchesKey);
    
    // console.log(`Invalidated match cache for tournament ${tournamentNo}`);
  }

  /**
   * Get tournaments with offline-first strategy
   * Prioritizes offline storage when network is unavailable
   */
  static async getTournamentsOffline(filters?: FilterOptions): Promise<CacheResult<TournamentCore[]>> {
    this.ensureInitialized();
    const requestId = this.generateRequestId();
    const cacheKey = this.generateCacheKey('tournaments', filters);

    this.stats.startTimer(requestId);

    try {
      // Priority 1: Memory cache
      const memoryResult = this.getFromMemory(cacheKey);
      if (memoryResult) {
        this.stats.recordHit('memory', requestId);
        return {
          data: memoryResult,
          source: 'memory',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Priority 2: Offline storage (persistent cache)
      const offlineResult = await this.getFromOfflineStorage(cacheKey);
      if (offlineResult) {
        // Update memory cache
        this.setInMemory(cacheKey, offlineResult, this.config.defaultTTL.tournaments);
        this.stats.recordHit('offline', requestId);
        return {
          data: offlineResult,
          source: 'offline',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Priority 3: Local storage (if available and not expired)
      const localResult = await this.getFromLocalStorage(cacheKey);
      if (localResult) {
        this.setInMemory(cacheKey, localResult, this.config.defaultTTL.tournaments);
        this.stats.recordHit('localStorage', requestId);
        return {
          data: localResult,
          source: 'localStorage',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Priority 4: Only attempt network if available
      if (this.networkMonitor.isConnected) {
        return await this.getTournaments(filters);
      }

      // No data available and network offline
      throw new Error('No tournament data available offline');

    } catch (error) {
      // console.error('CacheService.getTournamentsOffline error:', error);
      throw error;
    }
  }

  /**
   * Get matches with offline-first strategy
   * Prioritizes offline storage when network is unavailable
   */
  static async getMatchesOffline(tournamentNo: string): Promise<CacheResult<BeachMatch[]>> {
    this.ensureInitialized();
    const requestId = this.generateRequestId();
    const cacheKey = this.generateCacheKey('matches', { tournamentNo });

    this.stats.startTimer(requestId);

    try {
      // Priority 1: Memory cache
      const memoryResult = this.getFromMemory(cacheKey);
      if (memoryResult) {
        this.stats.recordHit('memory', requestId);
        return {
          data: memoryResult,
          source: 'memory',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Priority 2: Offline storage (persistent cache)
      const offlineResult = await this.getFromOfflineStorage(cacheKey);
      if (offlineResult) {
        const ttl = this.calculateMatchesTTL(offlineResult);
        this.setInMemory(cacheKey, offlineResult, ttl);
        this.stats.recordHit('offline', requestId);
        return {
          data: offlineResult,
          source: 'offline',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Priority 3: Local storage (if available and not expired)
      const localResult = await this.getFromLocalStorage(cacheKey);
      if (localResult) {
        const ttl = this.calculateMatchesTTL(localResult);
        this.setInMemory(cacheKey, localResult, ttl);
        this.stats.recordHit('localStorage', requestId);
        return {
          data: localResult,
          source: 'localStorage',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Priority 4: Only attempt network if available
      if (this.networkMonitor.isConnected) {
        return await this.getMatches(tournamentNo);
      }

      // No data available and network offline
      throw new Error('No match data available offline');

    } catch (error) {
      // console.error('CacheService.getMatchesOffline error:', error);
      throw error;
    }
  }

  /**
   * Get storage usage information for offline management
   */
  static async getStorageUsage(): Promise<{
    totalSize: number;
    offlineSize: number;
    cacheSize: number;
    isNearLimit: boolean;
  }> {
    this.ensureInitialized();
    return await this.localStorage.getStorageUsage();
  }

  /**
   * Manually trigger storage quota enforcement
   */
  static async enforceStorageQuota(): Promise<number> {
    this.ensureInitialized();
    return await this.localStorage.enforceStorageQuota();
  }

  /**
   * Get partial tournaments with graceful fallback handling
   * Returns available data even if some tournaments fail to load
   */
  static async getTournamentsGraceful(filters?: FilterOptions): Promise<{
    tournaments: TournamentCore[];
    source: CacheTier;
    errors: string[];
    isPartial: boolean;
    fromCache: boolean;
    timestamp: number;
  }> {
    this.ensureInitialized();
    const errors: string[] = [];

    try {
      // First try the normal flow
      const result = await this.getTournaments(filters);
      return {
        tournaments: result.data,
        source: result.source,
        errors: [],
        isPartial: false,
        fromCache: result.fromCache,
        timestamp: result.timestamp,
      };
    } catch (primaryError) {
      // console.warn('Primary tournament load failed:', primaryError);
      errors.push(`Primary load failed: ${primaryError.message}`);

      // Try offline-first as fallback
      try {
        if (!this.networkMonitor.isConnected || this.networkMonitor) {
          const offlineResult = await this.getTournamentsOffline(filters);
          return {
            tournaments: offlineResult.data,
            source: offlineResult.source,
            errors,
            isPartial: true,
            fromCache: true,
            timestamp: offlineResult.timestamp,
          };
        }
      } catch (offlineError) {
        // console.warn('Offline tournament load failed:', offlineError);
        errors.push(`Offline load failed: ${offlineError.message}`);
      }

      // Last resort: try to get any cached data, even expired
      try {
        const cacheKeys = await this.localStorage.getKeysByPattern('tournaments*');
        if (cacheKeys.length > 0) {
          // Get the most recent cached tournaments
          const cachedData = await this.localStorage.get(cacheKeys[0]);
          if (cachedData) {
            // console.log('Using expired cached tournaments as last resort');
            errors.push('Using expired cached data');
            return {
              tournaments: cachedData.data,
              source: 'localStorage',
              errors,
              isPartial: true,
              fromCache: true,
              timestamp: cachedData.timestamp,
            };
          }
        }
      } catch (cacheError) {
        errors.push(`Cache fallback failed: ${cacheError.message}`);
      }

      // Return empty result with error information
      return {
        tournaments: [],
        source: 'localStorage',
        errors,
        isPartial: true,
        fromCache: true,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get partial matches with graceful fallback handling
   */
  static async getMatchesGraceful(tournamentNo: string): Promise<{
    matches: BeachMatch[];
    source: CacheTier;
    errors: string[];
    isPartial: boolean;
    fromCache: boolean;
    timestamp: number;
  }> {
    this.ensureInitialized();
    const errors: string[] = [];

    try {
      // First try the normal flow
      const result = await this.getMatches(tournamentNo);
      return {
        matches: result.data,
        source: result.source,
        errors: [],
        isPartial: false,
        fromCache: result.fromCache,
        timestamp: result.timestamp,
      };
    } catch (primaryError) {
      // console.warn(`Primary match load failed for tournament ${tournamentNo}:`, primaryError);
      errors.push(`Primary load failed: ${primaryError.message}`);

      // Try offline-first as fallback
      try {
        const offlineResult = await this.getMatchesOffline(tournamentNo);
        return {
          matches: offlineResult.data,
          source: offlineResult.source,
          errors,
          isPartial: true,
          fromCache: true,
          timestamp: offlineResult.timestamp,
        };
      } catch (offlineError) {
        // console.warn(`Offline match load failed for tournament ${tournamentNo}:`, offlineError);
        errors.push(`Offline load failed: ${offlineError.message}`);
      }

      // Last resort: try to get any cached match data
      try {
        const cacheKey = this.generateCacheKey('matches', { tournamentNo });
        const cachedData = await this.getStaleData(cacheKey);
        if (cachedData) {
          // console.log(`Using stale cached matches for tournament ${tournamentNo} as last resort`);
          errors.push('Using expired cached data');
          return {
            matches: cachedData,
            source: 'localStorage',
            errors,
            isPartial: true,
            fromCache: true,
            timestamp: Date.now(),
          };
        }
      } catch (cacheError) {
        errors.push(`Cache fallback failed: ${cacheError.message}`);
      }

      // Return empty result with error information
      return {
        matches: [],
        source: 'localStorage',
        errors,
        isPartial: true,
        fromCache: true,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Apply client-side filtering to tournaments (used for cached data)
   */
  private static applyTournamentFilters(tournaments: TournamentCore[], filters?: FilterOptions): TournamentCore[] {
    if (!filters) return tournaments;

    let filtered = tournaments;

    // Apply year filter
    if (filters.year) {
      // console.log(`🏐 CacheService: Applying client-side year filter for ${filters.year}`);
      const beforeCount = filtered.length;
      
      filtered = filtered.filter(tournament => {
        if (!tournament.dates.startDate) return false;
        
        try {
          const startDate = new Date(tournament.dates.startDate);
          const tournamentYear = startDate.getFullYear();
          return tournamentYear === filters.year;
        } catch (error) {
          // console.warn(`Invalid date for tournament ${tournament.visNo}: ${tournament.dates.startDate}`);
          return false;
        }
      });
      
      // console.log(`🏐 CacheService: Year filter result: ${beforeCount} → ${filtered.length} tournaments for year ${filters.year}`);
    }

    // Apply tournament type filter
    if (filters.tournamentType && filters.tournamentType !== 'ALL') {
      filtered = filtered.filter(tournament => {
        const name = (tournament.name || '').toUpperCase();
        const type = (tournament.tournamentType || '').toUpperCase();
        const allText = `${name} ${type}`.trim();
        
        return type.includes(filters.tournamentType!) || allText.includes(filters.tournamentType!);
      });
    }

    // Apply currently active filter
    if (filters.currentlyActive) {
      const now = new Date();
      filtered = filtered.filter(tournament => {
        if (!tournament.dates.startDate || !tournament.dates.endDate) return false;
        
        try {
          const startDate = new Date(tournament.dates.startDate);
          const endDate = new Date(tournament.dates.endDate);
          return startDate <= now && now <= endDate;
        } catch {
          return false;
        }
      });
    }

    // Apply recent-only filter
    if (filters.recentOnly) {
      const today = new Date();
      const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      const oneMonthFromNow = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
      
      filtered = filtered.filter(tournament => {
        if (!tournament.dates.startDate) return false;
        
        try {
          const startDate = new Date(tournament.dates.startDate);
          return startDate >= oneMonthAgo && startDate <= oneMonthFromNow;
        } catch {
          return false;
        }
      });
    }

    // Deduplicate tournaments with same name but different gender codes
    const merged = this.deduplicateTournaments(filtered);
    
    return merged;
  }

  /**
   * Merge tournaments that have the same base name but different gender codes
   */
  private static deduplicateTournaments(tournaments: TournamentCore[]): TournamentCore[] {
    // console.log(`🏐 deduplicateTournaments: Processing ${tournaments.length} tournaments`);
    const tournamentGroups = new Map<string, TournamentCore[]>();
    
    // Group tournaments by their base characteristics
    tournaments.forEach((tournament, index) => {
      const name = (tournament.name || '').toLowerCase().trim();
      const location = (
        (typeof tournament.location === 'object' && tournament.location?.city) || 
        (typeof tournament.location === 'object' && tournament.location?.country) ||
        (tournament as any).city || 
        (tournament as any).country || 
        ''
      ).toLowerCase().trim();
      const startDate = tournament.dates.startDate || '';
      
      // More robust key generation - remove common gender indicators and normalize
      const cleanName = name
        .replace(/\b(men|women|male|female|boys|girls|m|w)\b/gi, '')
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '') // Remove special characters
        .trim()
        .toLowerCase();
      
      // Normalize location and date for better matching
      const normalizedLocation = location.replace(/[^\w\s]/g, '').toLowerCase();
      const normalizedDate = startDate; // Keep original date format
      
      // Create a key based on cleaned name, location, and start date
      const key = `${cleanName}_${normalizedLocation}_${normalizedDate}`;
      
      // Debug logging for first few tournaments and specific cases
      if (index < 5 || name.includes('baden')) {
        // console.log(`🏐 GROUPING [${index}]: "${tournament.name}" -> clean: "${cleanName}" -> key: "${key}"`);
        if (name.includes('baden')) {
          // console.log(`🏐 BADEN DEBUG: Original: "${tournament.name}", Location: "${location}", StartDate: "${startDate}"`);
        }
      }
      
      if (!tournamentGroups.has(key)) {
        tournamentGroups.set(key, []);
      }
      tournamentGroups.get(key)!.push(tournament);
    });
    
    const result: TournamentCore[] = [];
    
    // console.log(`🏐 GROUPING RESULT: Found ${tournamentGroups.size} unique tournament groups`);
    
    // Show some sample groups for debugging
    let groupIndex = 0;
    
    // Process each group
    tournamentGroups.forEach((group, key) => {
      if (groupIndex < 3 || key.includes('baden')) {
        // console.log(`🏐 GROUP ${groupIndex}: "${key}" has ${group.length} tournaments: ${group.map(t => t.name).join(' | ')}`);
      }
      groupIndex++;
      
      if (group.length === 1) {
        // Single tournament - no merging needed
        result.push(group[0]);
      } else {
        // Multiple tournaments - merge them
        // console.log(`🏐 MERGING ${group.length} tournaments: ${group.map(t => `"${t.name}" (${t.code})`).join(', ')}`);
        
        // Choose the representative tournament (most complete data)
        const representative = group.reduce((best, current) => {
          const currentScore = this.getTournamentCompletenessScore(current);
          const bestScore = this.getTournamentCompletenessScore(best);
          return currentScore > bestScore ? current : best;
        });
        
        // Create merged tournament that combines all gender variants
        const mergedTournament = {
          ...representative,
          // Create a unified name that indicates it includes both genders
          name: this.createMergedTournamentName(group),
          // Store all the merged tournaments for match loading
          _mergedTournaments: group.map(t => ({
            visNo: t.visNo,
            name: t.name,
            code: t.code,
            dates: {
              startDate: t.dates.startDate,
              endDate: t.dates.endDate
            }
          }))
        };
        
        // console.log(`🏐 MERGED RESULT: "${mergedTournament.name}" includes ${group.length} gender variants`);
        result.push(mergedTournament);
      }
    });
    
    // console.log(`🏐 FINAL MERGE RESULT: ${tournaments.length} -> ${result.length} tournaments`);
    
    // Secondary deduplication pass - for exact name matches that might have been missed
    const finalResult = this.secondaryDeduplication(result);
    // console.log(`🏐 SECONDARY DEDUP: ${result.length} -> ${finalResult.length} tournaments`);
    
    return finalResult;
  }
  
  /**
   * Secondary deduplication for exact name matches
   */
  private static secondaryDeduplication(tournaments: TournamentCore[]): TournamentCore[] {
    const nameGroups = new Map<string, TournamentCore[]>();
    
    // Group by exact name (case insensitive)
    tournaments.forEach(tournament => {
      const exactName = (tournament.name || '').toLowerCase().trim();
      
      if (!nameGroups.has(exactName)) {
        nameGroups.set(exactName, []);
      }
      nameGroups.get(exactName)!.push(tournament);
    });
    
    const result: TournamentCore[] = [];
    
    nameGroups.forEach((group, name) => {
      if (group.length === 1) {
        result.push(group[0]);
      } else {
        // console.log(`🏐 SECONDARY MERGE: "${name}" has ${group.length} exact duplicates`);
        
        // For exact name matches, merge them all
        const representative = group.reduce((best, current) => {
          const currentScore = this.getTournamentCompletenessScore(current);
          const bestScore = this.getTournamentCompletenessScore(best);
          return currentScore > bestScore ? current : best;
        });
        
        // Merge all the _mergedTournaments arrays
        const allMerged: any[] = [];
        group.forEach(t => {
          const merged = (t as any)._mergedTournaments || [{ visNo: t.visNo, name: t.name, code: t.code }];
          allMerged.push(...merged);
        });
        
        const mergedTournament = {
          ...representative,
          _mergedTournaments: allMerged
        };
        
        // console.log(`🏐 SECONDARY MERGED: "${name}" -> ${allMerged.length} total tournaments`);
        result.push(mergedTournament);
      }
    });
    
    return result;
  }

  /**
   * Create a unified name for merged tournaments
   */
  private static createMergedTournamentName(tournaments: TournamentCore[]): string {
    // Get the base name (without gender indicators)
    const baseName = tournaments[0].name || '';
    const cleanName = baseName
      .replace(/\b(men|women|male|female|boys|girls|m|w)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Check what genders are included
    const hasWomen = tournaments.some(t => 
      /\b(women|female|girls|w)\b/i.test(t.name || '') ||
      /\b(women|female|girls|w)\b/i.test(t.code || '')
    );
    const hasMen = tournaments.some(t => 
      /\b(men|male|boys|m)\b/i.test(t.name || '') ||
      /\b(men|male|boys|m)\b/i.test(t.code || '')
    );
    
    if (hasWomen && hasMen) {
      return `${cleanName} (Mixed)`;
    } else if (hasWomen) {
      return `${cleanName} (Women)`;
    } else if (hasMen) {
      return `${cleanName} (Men)`;
    } else {
      return cleanName;
    }
  }
  

  /**
   * Calculate completeness score for a tournament (higher score = more complete data)
   */
  private static getTournamentCompletenessScore(tournament: TournamentCore): number {
    let score = 0;
    
    if (tournament.name) score += 2;
    if (tournament.title) score += 2;
    if (tournament.location) score += 1;
    if (tournament.city) score += 1;
    if (tournament.country) score += 1;
    if (tournament.dates.startDate) score += 2;
    if (tournament.dates.endDate) score += 2;
    if (tournament.status) score += 1;
    if (tournament.code) score += 1;
    
    return score;
  }

  /**
   * Clear all caches (memory and local storage)
   */
  static async clearCache(): Promise<void> {
    this.ensureInitialized();
    // console.log('🏐 CacheService: Clearing all caches');
    
    // Clear memory cache
    this.memoryCache.clear();
    
    // Clear local storage cache
    await this.localStorage.clear();
    
    // console.log('🏐 CacheService: All caches cleared');
  }

  /**
   * Parse XML tournament data to TournamentCore objects
   */
  private static parseXmlToTournaments(xmlData: string): TournamentCore[] {
    try {
      // console.log('🏐 CacheService: Parsing XML tournaments...');
      // console.log('🏐 XML sample:', xmlData.substring(0, 500));
      
      const tournaments: TournamentCore[] = [];
      
      // Parse Event elements (FIVB VIS XML structure)
      const eventRegex = /<Event>(.*?)<\/Event>/gs;
      const eventMatches = xmlData.match(eventRegex) || [];
      
      // console.log(`🏐 Found ${eventMatches.length} event entries in XML`);
      
      eventMatches.forEach((eventMatch, index) => {
        try {
          // Extract values from XML elements
          const getValue = (tagName: string): string => {
            const regex = new RegExp(`<${tagName}>([^<]*)<\/${tagName}>`, 'i');
            const result = eventMatch.match(regex);
            return result ? result[1] : '';
          };
          
          const visNo = getValue('No');
          const code = getValue('Code');
          const name = getValue('Name');
          const startDate = getValue('StartDate');
          const endDate = getValue('EndDate');
          const status = getValue('Status') || 'Draft';
          const country = getValue('Country');
          const city = getValue('City');
          
          // Extract BeachTournament info if available
          const beachTournamentMatch = eventMatch.match(/<BeachTournament>(.*?)<\/BeachTournament>/s);
          let gender = 'Mixed';
          let courts = 0;
          
          if (beachTournamentMatch) {
            const beachTournamentXml = beachTournamentMatch[1];
            const getBeachValue = (tagName: string): string => {
              const regex = new RegExp(`<${tagName}>([^<]*)<\/${tagName}>`, 'i');
              const result = beachTournamentXml.match(regex);
              return result ? result[1] : '';
            };
            
            gender = getBeachValue('Gender') || 'Mixed';
            courts = parseInt(getBeachValue('NoOfCourts')) || 0;
          }
          
          if (visNo && name) {
            const tournament: TournamentCore = {
              id: `tournament_${visNo}_${code || visNo}`,
              visNo,
              code: code || visNo,
              name,
              title: name,
              gender: gender === 'W' ? GenderType.W : gender === 'M' ? GenderType.M : GenderType.MIXED,
              tournamentType: code?.includes('BPT') ? TournamentType.BPT : code?.includes('FIVB') ? TournamentType.FIVB : TournamentType.LOCAL,
              status: status === 'Draft' ? TournamentStatus.UPCOMING : status === 'Active' ? TournamentStatus.ACTIVE : TournamentStatus.UPCOMING,
              dates: {
                startDate: startDate || '',
                endDate: endDate || startDate || ''
              },
              city: city || undefined,
              country: country || undefined,
              courts: courts ? parseInt(courts) : undefined,
              version: 1,
              lastUpdated: new Date().toISOString()
            };
            
            tournaments.push(tournament);
            
            if (index < 3) {
              // console.log(`🏐 Parsed tournament ${index + 1}:`, tournament);
            }
          }
        } catch (parseError) {
          // console.warn(`🏐 Failed to parse tournament ${index}:`, parseError);
        }
      });
      
      // console.log(`🏐 Successfully parsed ${tournaments.length} tournaments`);
      return tournaments;
      
    } catch (error) {
      // console.error('🏐 XML parsing failed:', error);
      return [];
    }
  }

  /**
   * Cache live score data with shorter TTL
   * @param matchNo - Match number
   * @param liveData - BeachLive data to cache
   */
  static setLiveScore(matchNo: number, liveData: any): void {
    this.ensureInitialized();
    
    const key = `live_score_${matchNo}`;
    const ttl = this.config.defaultTTL.matchesLive; // 30 seconds
    
    // Store in memory cache for immediate access
    this.setInMemory(key, liveData, ttl);
    
    // Update stats
    this.stats.recordHit('memory');
  }

  /**
   * Get cached live score data
   * @param matchNo - Match number
   * @returns Cached live score data or null
   */
  static getLiveScore(matchNo: number): any | null {
    this.ensureInitialized();
    
    const key = `live_score_${matchNo}`;
    const cached = this.getFromMemory(key);
    
    if (cached) {
      this.stats.recordHit('memory');
      return cached;
    }
    return null;
  }

  /**
   * Clear cached live score data for a match
   * @param matchNo - Match number
   */
  static clearLiveScore(matchNo: number): void {
    this.ensureInitialized();
    
    const key = `live_score_${matchNo}`;
    this.memoryCache.delete(key);
  }

  /**
   * Clear all cached live score data
   * Note: This clears entire memory cache. More specific clearing would require extending MemoryCacheManager
   */
  static clearAllLiveScores(): void {
    this.ensureInitialized();
    
    // For now, we'll just clear individual live score keys as they're accessed
    // A full implementation would require extending MemoryCacheManager to support key filtering
    console.log('clearAllLiveScores: Individual match clearing is preferred over bulk operations');
  }
}
