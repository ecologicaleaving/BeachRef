# BeachRef - Intelligent Caching Strategy

## Problemi Risolti nell'Implementazione Attuale

### ❌ Problemi Attuali
1. **4 livelli di cache** inutilmente complessi (Memory → LocalStorage → Supabase → API)
2. **Cache keys instabili** con timestamp che impediscono il caching efficace  
3. **Nessuna invalidation strategy** - cache mai aggiornata
4. **TTL inconsistenti** - alcuni dati cached troppo a lungo, altri troppo poco
5. **Cache pollution** - dati stale mai rimossi

### ✅ Nuova Strategia Intelligente
1. **2 livelli ottimizzati**: Hot Memory + Persistent Storage
2. **Cache keys stabili** basati su semantic content
3. **Smart invalidation** con dependency tracking
4. **Adaptive TTL** basato su tipo di dati e attività
5. **Automatic cleanup** con size-based eviction

## 1. Core Cache Architecture

```typescript
/**
 * Multi-tier intelligent cache manager
 * Tier 1: Hot memory cache (15min-2h TTL)
 * Tier 2: Persistent storage cache (6h-24h TTL)
 */
interface ICacheManager {
  // Core operations
  get<T>(key: string): Promise<CachedData<T> | null>;
  set<T>(key: string, data: T, options: CacheOptions): Promise<void>;
  invalidate(pattern: string): Promise<void>;
  
  // Batch operations for performance
  getMany<T>(keys: string[]): Promise<Map<string, CachedData<T>>>;
  setMany<T>(entries: Map<string, T>, options: CacheOptions): Promise<void>;
  
  // Statistics and health
  getStats(): Promise<CacheStats>;
  cleanup(): Promise<void>;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: number;
  source: 'memory' | 'storage' | 'api';
}

interface CacheOptions {
  ttl: string;              // '30s', '15m', '6h', '24h'  
  priority?: CachePriority; // HIGH, MEDIUM, LOW
  tags?: string[];          // Per dependency invalidation
  compress?: boolean;       // Per large objects
}

enum CachePriority {
  HIGH = 'high',           // Live matches, active tournaments
  MEDIUM = 'medium',       // Tournament details, scheduled matches  
  LOW = 'low'             // Historical data, completed tournaments
}

interface CacheStats {
  memory: {
    hitRate: number;
    entries: number;
    sizeBytes: number;
  };
  storage: {
    hitRate: number;
    entries: number; 
    sizeBytes: number;
  };
  totalRequests: number;
  avgResponseTime: number;
}
```

## 2. Smart Cache Manager Implementation

```typescript
class SmartCacheManager implements ICacheManager {
  
  constructor(
    private memoryCache: IMemoryCache,
    private storageCache: IStorageCache,
    private config: SmartCacheConfig
  ) {}
  
  async get<T>(key: string): Promise<CachedData<T> | null> {
    const startTime = Date.now();
    
    try {
      // Tier 1: Hot memory cache
      const memoryResult = await this.memoryCache.get<T>(key);
      if (memoryResult && !this.isExpired(memoryResult)) {
        this.recordHit('memory', Date.now() - startTime);
        return memoryResult;
      }
      
      // Tier 2: Persistent storage
      const storageResult = await this.storageCache.get<T>(key);
      if (storageResult && !this.isExpired(storageResult)) {
        // Promote to memory cache for fast access
        await this.promoteToMemory(key, storageResult);
        this.recordHit('storage', Date.now() - startTime);
        return storageResult;
      }
      
      this.recordMiss(Date.now() - startTime);
      return null;
      
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      this.recordMiss(Date.now() - startTime);
      return null;
    }
  }
  
  async set<T>(key: string, data: T, options: CacheOptions): Promise<void> {
    try {
      const now = Date.now();
      const ttlMs = this.parseTtl(options.ttl);
      
      const cachedData: CachedData<T> = {
        data,
        timestamp: now,
        expiresAt: now + ttlMs,
        version: 1,
        source: 'api'
      };
      
      // Determine memory cache TTL (shorter for hot access)
      const memoryTtl = this.getMemoryTtl(options.ttl, options.priority);
      const memoryTtlMs = this.parseTtl(memoryTtl);
      
      const memoryCachedData = {
        ...cachedData,
        expiresAt: now + memoryTtlMs
      };
      
      // Store in both tiers
      await Promise.all([
        this.memoryCache.set(key, memoryCachedData, {
          ttl: memoryTtl,
          priority: options.priority || CachePriority.MEDIUM
        }),
        this.storageCache.set(key, cachedData, options)
      ]);
      
      // Track dependencies for smart invalidation
      if (options.tags) {
        await this.trackDependencies(key, options.tags);
      }
      
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      // Don't throw - caching failures shouldn't break the app
    }
  }
  
  async getMany<T>(keys: string[]): Promise<Map<string, CachedData<T>>> {
    const results = new Map<string, CachedData<T>>();
    
    // Try to get all from memory first
    const memoryResults = await this.memoryCache.getMany<T>(keys);
    const memoryMisses: string[] = [];
    
    keys.forEach(key => {
      const memoryResult = memoryResults.get(key);
      if (memoryResult && !this.isExpired(memoryResult)) {
        results.set(key, memoryResult);
      } else {
        memoryMisses.push(key);
      }
    });
    
    // Get memory misses from storage
    if (memoryMisses.length > 0) {
      const storageResults = await this.storageCache.getMany<T>(memoryMisses);
      
      storageResults.forEach((data, key) => {
        if (data && !this.isExpired(data)) {
          results.set(key, data);
          // Async promote to memory (don't await)
          this.promoteToMemory(key, data).catch(err => 
            console.warn(`Failed to promote ${key} to memory:`, err)
          );
        }
      });
    }
    
    return results;
  }
  
  async setMany<T>(entries: Map<string, T>, options: CacheOptions): Promise<void> {
    const memoryEntries = new Map<string, CachedData<T>>();
    const storageEntries = new Map<string, CachedData<T>>();
    
    const now = Date.now();
    const ttlMs = this.parseTtl(options.ttl);
    const memoryTtl = this.getMemoryTtl(options.ttl, options.priority);
    const memoryTtlMs = this.parseTtl(memoryTtl);
    
    entries.forEach((data, key) => {
      const cachedData: CachedData<T> = {
        data,
        timestamp: now,
        expiresAt: now + ttlMs,
        version: 1,
        source: 'api'
      };
      
      memoryEntries.set(key, {
        ...cachedData,
        expiresAt: now + memoryTtlMs
      });
      
      storageEntries.set(key, cachedData);
    });
    
    // Batch store in both tiers
    await Promise.all([
      this.memoryCache.setMany(memoryEntries, {
        ttl: memoryTtl,
        priority: options.priority || CachePriority.MEDIUM
      }),
      this.storageCache.setMany(storageEntries, options)
    ]);
  }
  
  async invalidate(pattern: string): Promise<void> {
    try {
      console.log(`Invalidating cache pattern: ${pattern}`);
      
      // Support different invalidation patterns
      if (pattern.includes('*')) {
        // Glob pattern - invalidate matching keys
        await this.invalidateByGlob(pattern);
      } else if (pattern.startsWith('tag:')) {
        // Tag-based invalidation
        const tag = pattern.replace('tag:', '');
        await this.invalidateByTag(tag);
      } else {
        // Direct key invalidation
        await this.invalidateKey(pattern);
      }
      
    } catch (error) {
      console.error(`Cache invalidation error for pattern ${pattern}:`, error);
    }
  }
  
  async cleanup(): Promise<void> {
    console.log('Running cache cleanup...');
    
    try {
      await Promise.all([
        this.memoryCache.cleanup(),
        this.storageCache.cleanup()
      ]);
      
      // Clean dependency tracking
      await this.cleanupDependencies();
      
      console.log('Cache cleanup completed');
      
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }
  
  // Private methods
  
  private async promoteToMemory<T>(key: string, data: CachedData<T>): Promise<void> {
    // Promote storage hit to memory for faster access
    const memoryTtl = Math.min(
      data.expiresAt - Date.now(),
      this.parseTtl('15m') // Max 15min in memory
    );
    
    if (memoryTtl > 0) {
      await this.memoryCache.set(key, {
        ...data,
        expiresAt: Date.now() + memoryTtl
      }, {
        ttl: `${Math.floor(memoryTtl / 1000)}s`
      });
    }
  }
  
  private isExpired<T>(cached: CachedData<T>): boolean {
    return Date.now() > cached.expiresAt;
  }
  
  private getMemoryTtl(storageTtl: string, priority?: CachePriority): string {
    // Memory cache has shorter TTL for efficient memory usage
    const multiplier = this.getMemoryTtlMultiplier(priority);
    const storageTtlMs = this.parseTtl(storageTtl);
    const memoryTtlMs = storageTtlMs * multiplier;
    
    // Cap memory TTL
    const maxMemoryTtl = this.parseTtl('2h');
    const cappedTtlMs = Math.min(memoryTtlMs, maxMemoryTtl);
    
    return `${Math.floor(cappedTtlMs / 1000)}s`;
  }
  
  private getMemoryTtlMultiplier(priority?: CachePriority): number {
    switch (priority) {
      case CachePriority.HIGH: return 0.5;    // 50% of storage TTL
      case CachePriority.MEDIUM: return 0.25; // 25% of storage TTL
      case CachePriority.LOW: return 0.1;     // 10% of storage TTL
      default: return 0.25;
    }
  }
  
  private parseTtl(ttl: string): number {
    const unit = ttl.slice(-1);
    const value = parseInt(ttl.slice(0, -1));
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: throw new Error(`Invalid TTL format: ${ttl}`);
    }
  }
  
  private async trackDependencies(key: string, tags: string[]): Promise<void> {
    // Store key-to-tags mapping for invalidation
    for (const tag of tags) {
      await this.storageCache.addToSet(`deps:${tag}`, key);
    }
  }
  
  private async invalidateByTag(tag: string): Promise<void> {
    const dependentKeys = await this.storageCache.getSet(`deps:${tag}`);
    if (dependentKeys && dependentKeys.length > 0) {
      await Promise.all([
        this.memoryCache.deleteMany(dependentKeys),
        this.storageCache.deleteMany(dependentKeys)
      ]);
      
      // Clean up dependency tracking
      await this.storageCache.delete(`deps:${tag}`);
    }
  }
  
  private async invalidateByGlob(pattern: string): Promise<void> {
    const keys = await this.storageCache.getKeysByPattern(pattern);
    if (keys.length > 0) {
      await Promise.all([
        this.memoryCache.deleteMany(keys),
        this.storageCache.deleteMany(keys)
      ]);
    }
  }
  
  private async invalidateKey(key: string): Promise<void> {
    await Promise.all([
      this.memoryCache.delete(key),
      this.storageCache.delete(key)
    ]);
  }
}
```

## 3. Cache Key Strategy

```typescript
/**
 * Intelligent cache key builder with stable, semantic keys
 */
class CacheKeyBuilder {
  
  /**
   * Build stable cache key for tournament list
   * Keys are stable and semantic - no timestamps!
   */
  static tournamentList(filters: TournamentFilters): string {
    const parts = ['tournaments'];
    
    // Add filter components in consistent order
    if (filters.year) {
      parts.push(`year_${filters.year}`);
    } else if (filters.currentlyActive) {
      // Use date bucket for active tournaments to get some cache freshness
      const bucket = Math.floor(Date.now() / (6 * 60 * 60 * 1000)); // 6-hour buckets
      parts.push(`active_${bucket}`);
    } else {
      parts.push('current');
    }
    
    if (filters.tournamentType && filters.tournamentType !== 'ALL') {
      parts.push(`type_${filters.tournamentType.toLowerCase()}`);
    }
    
    if (filters.gender && filters.gender !== 'ALL') {
      parts.push(`gender_${filters.gender.toLowerCase()}`);
    }
    
    return parts.join('_');
  }
  
  /**
   * Build cache key for tournament details
   */
  static tournamentDetails(tournamentId: string): string {
    return `tournament_${tournamentId}_details`;
  }
  
  /**
   * Build cache key for tournament matches with time sensitivity
   */
  static tournamentMatches(tournamentId: string, timeSensitive: boolean = true): string {
    let key = `tournament_${tournamentId}_matches`;
    
    if (timeSensitive) {
      // 1-hour buckets for match data (updates frequently)
      const bucket = Math.floor(Date.now() / (60 * 60 * 1000));
      key += `_${bucket}`;
    }
    
    return key;
  }
  
  /**
   * Build cache key with dependency tags
   */
  static withTags(baseKey: string, tags: string[]): { key: string; tags: string[] } {
    return {
      key: baseKey,
      tags: tags
    };
  }
  
  /**
   * Build cache key for live match data  
   */
  static liveMatch(matchId: string): string {
    // Very short buckets for live data (5 minutes)
    const bucket = Math.floor(Date.now() / (5 * 60 * 1000));
    return `live_match_${matchId}_${bucket}`;
  }
  
  /**
   * Build cache key for referee assignments
   */
  static refereeAssignments(tournamentId: string): string {
    return `referee_assignments_${tournamentId}`;
  }
}
```

## 4. Domain-Specific Cache Policies

```typescript
/**
 * Cache policies tailored per domain data types
 */
class CachePolicyManager {
  
  /**
   * Get cache policy for tournament data
   */
  static getTournamentListPolicy(filters: TournamentFilters): CacheOptions {
    if (filters.currentlyActive) {
      // Active tournaments change more frequently
      return {
        ttl: '6h',
        priority: CachePriority.HIGH,
        tags: ['tournaments', 'active'],
        compress: true
      };
    } else if (filters.year && filters.year < new Date().getFullYear()) {
      // Historical data is stable
      return {
        ttl: '24h', 
        priority: CachePriority.LOW,
        tags: ['tournaments', `year_${filters.year}`],
        compress: true
      };
    } else {
      // Current/future tournaments
      return {
        ttl: '12h',
        priority: CachePriority.MEDIUM,
        tags: ['tournaments', 'current'],
        compress: true
      };
    }
  }
  
  /**
   * Get cache policy for tournament details
   */
  static getTournamentDetailsPolicy(tournament: Tournament): CacheOptions {
    const tags = [`tournament_${tournament.id}`, 'tournament_details'];
    
    if (tournament.status === TournamentStatus.COMPLETED) {
      // Completed tournaments don't change
      return {
        ttl: '24h',
        priority: CachePriority.LOW,
        tags,
        compress: true
      };
    } else if (tournament.status === TournamentStatus.UPCOMING) {
      // Upcoming tournaments change occasionally
      return {
        ttl: '12h',
        priority: CachePriority.MEDIUM,
        tags,
        compress: true
      };
    } else {
      // Active tournaments change frequently
      return {
        ttl: '2h',
        priority: CachePriority.HIGH,
        tags: [...tags, 'active'],
        compress: true
      };
    }
  }
  
  /**
   * Get cache policy for match data
   */
  static getMatchListPolicy(matches: BeachMatch[]): CacheOptions {
    const hasLiveMatches = matches.some(m => m.status === MatchStatus.LIVE);
    const hasScheduledMatches = matches.some(m => m.status === MatchStatus.SCHEDULED);
    
    if (hasLiveMatches) {
      // Live matches need very short cache
      return {
        ttl: '30s',
        priority: CachePriority.HIGH,
        tags: ['matches', 'live']
      };
    } else if (hasScheduledMatches) {
      // Scheduled matches change less frequently
      return {
        ttl: '15m',
        priority: CachePriority.MEDIUM,
        tags: ['matches', 'scheduled']
      };
    } else {
      // Finished matches are stable
      return {
        ttl: '6h',
        priority: CachePriority.LOW,
        tags: ['matches', 'finished'],
        compress: true
      };
    }
  }
  
  /**
   * Get cache policy for referee assignments
   */
  static getRefereeAssignmentsPolicy(tournamentId: string): CacheOptions {
    return {
      ttl: '1h', // Referee assignments can change
      priority: CachePriority.MEDIUM,
      tags: [`tournament_${tournamentId}`, 'referee_assignments']
    };
  }
}
```

## 5. Cache-Aware Repository

```typescript
/**
 * Repository con smart caching integration  
 */
class CachedTournamentRepository implements ITournamentRepository {
  
  constructor(
    private apiService: TournamentApiService,
    private cacheManager: ICacheManager
  ) {}
  
  async findByFilters(filters: TournamentFilters): Promise<Tournament[]> {
    // Build stable cache key
    const cacheKey = CacheKeyBuilder.tournamentList(filters);
    console.log(`Tournament list cache key: ${cacheKey}`);
    
    try {
      // Check cache first
      const cached = await this.cacheManager.get<Tournament[]>(cacheKey);
      if (cached) {
        console.log(`Cache hit: ${cached.data.length} tournaments from ${cached.source}`);
        return cached.data;
      }
      
      console.log('Cache miss - fetching from API');
      
      // Fetch from API
      const tournaments = await this.apiService.getTournaments(filters);
      
      // Get appropriate cache policy  
      const cachePolicy = CachePolicyManager.getTournamentListPolicy(filters);
      
      // Cache the result
      await this.cacheManager.set(cacheKey, tournaments, cachePolicy);
      
      console.log(`Cached ${tournaments.length} tournaments with policy:`, cachePolicy);
      return tournaments;
      
    } catch (error) {
      console.error('Failed to get tournaments:', error);
      
      // Try to return stale data
      const stale = await this.getStaleData<Tournament[]>(cacheKey);
      if (stale) {
        console.log(`Returning ${stale.length} tournaments from stale cache`);
        return stale;
      }
      
      throw error;
    }
  }
  
  async findById(id: string): Promise<Tournament | null> {
    const cacheKey = CacheKeyBuilder.tournamentDetails(id);
    
    try {
      // Check cache first
      const cached = await this.cacheManager.get<Tournament>(cacheKey);
      if (cached) {
        console.log(`Tournament details cache hit for ${id}`);
        return cached.data;
      }
      
      console.log(`Cache miss for tournament ${id} - fetching from API`);
      
      // Fetch from API
      const tournament = await this.apiService.getTournamentDetails(id);
      if (!tournament) return null;
      
      // Get cache policy based on tournament status
      const cachePolicy = CachePolicyManager.getTournamentDetailsPolicy(tournament);
      
      // Cache with dependencies
      const { key, tags } = CacheKeyBuilder.withTags(cacheKey, [
        `tournament_${id}`,
        'tournament_details',
        `status_${tournament.status}`
      ]);
      
      await this.cacheManager.set(key, tournament, { ...cachePolicy, tags });
      
      return tournament;
      
    } catch (error) {
      console.error(`Failed to get tournament ${id}:`, error);
      return null;
    }
  }
  
  async getTournamentMatches(tournamentId: string): Promise<BeachMatch[]> {
    // Check if we should use time-sensitive cache key
    const timeSensitive = await this.shouldUseTimeSensitiveCache(tournamentId);
    const cacheKey = CacheKeyBuilder.tournamentMatches(tournamentId, timeSensitive);
    
    try {
      const cached = await this.cacheManager.get<BeachMatch[]>(cacheKey);
      if (cached) {
        console.log(`Match list cache hit: ${cached.data.length} matches`);
        return cached.data;
      }
      
      console.log(`Cache miss for matches ${tournamentId} - fetching from API`);
      
      const matches = await this.apiService.getTournamentMatches(tournamentId);
      
      // Get adaptive cache policy based on match status
      const cachePolicy = CachePolicyManager.getMatchListPolicy(matches);
      
      await this.cacheManager.set(cacheKey, matches, cachePolicy);
      
      return matches;
      
    } catch (error) {
      console.error(`Failed to get matches for ${tournamentId}:`, error);
      throw error;
    }
  }
  
  /**
   * Invalidate tournament-related cache  
   */
  async invalidateTournament(tournamentId: string): Promise<void> {
    console.log(`Invalidating cache for tournament ${tournamentId}`);
    
    await Promise.all([
      // Invalidate tournament details
      this.cacheManager.invalidate(`tournament_${tournamentId}_details`),
      
      // Invalidate tournament matches
      this.cacheManager.invalidate(`tournament_${tournamentId}_matches*`),
      
      // Invalidate by tags
      this.cacheManager.invalidate(`tag:tournament_${tournamentId}`),
      
      // Invalidate tournament lists that might contain this tournament
      this.cacheManager.invalidate('tournaments_*')
    ]);
  }
  
  /**
   * Batch invalidation for efficiency
   */
  async invalidateByTournamentStatus(status: TournamentStatus): Promise<void> {
    await this.cacheManager.invalidate(`tag:status_${status}`);
  }
  
  // Private helpers
  
  private async shouldUseTimeSensitiveCache(tournamentId: string): Promise<boolean> {
    // Quick check if tournament has active/live matches
    // This could be cached itself with very short TTL
    const quickCacheKey = `tournament_${tournamentId}_has_live`;
    const cached = await this.cacheManager.get<boolean>(quickCacheKey);
    
    if (cached !== null) {
      return cached.data;
    }
    
    // Default to time-sensitive for unknown tournaments
    return true;
  }
  
  private async getStaleData<T>(cacheKey: string): Promise<T | null> {
    // Try to get stale data from storage as fallback
    try {
      const cached = await this.cacheManager.get<T>(cacheKey);
      return cached?.data || null;
    } catch {
      return null;
    }
  }
}
```

## 6. Performance Monitoring & Analytics

```typescript
/**
 * Cache performance monitoring
 */
class CachePerformanceMonitor {
  private stats = {
    hits: 0,
    misses: 0,
    avgResponseTime: 0,
    responses: [] as number[]
  };
  
  recordHit(source: 'memory' | 'storage', responseTime: number): void {
    this.stats.hits++;
    this.recordResponseTime(responseTime);
    
    console.log(`Cache hit from ${source} (${responseTime}ms)`);
  }
  
  recordMiss(responseTime: number): void {
    this.stats.misses++;
    this.recordResponseTime(responseTime);
  }
  
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }
  
  getAverageResponseTime(): number {
    return this.stats.avgResponseTime;
  }
  
  private recordResponseTime(responseTime: number): void {
    this.stats.responses.push(responseTime);
    
    // Keep only last 100 responses for rolling average
    if (this.stats.responses.length > 100) {
      this.stats.responses.shift();
    }
    
    // Calculate rolling average
    this.stats.avgResponseTime = this.stats.responses.reduce((a, b) => a + b, 0) / this.stats.responses.length;
  }
}
```

## Vantaggi della Strategia Intelligente

### 🚀 Performance Improvements
- **90% hit rate atteso** con cache keys stabili
- **Sub-10ms response time** per cache hits 
- **Adaptive TTL** basato su data volatility
- **Batch operations** per ridurre overhead

### 💾 Memory Efficiency  
- **2-tier architecture** elimina complessità inutile
- **Size-based eviction** previene memory leaks
- **Compression automatica** per oggetti grandi
- **Priority-based caching** ottimizza memory usage

### 🔧 Smart Invalidation
- **Tag-based invalidation** per dependency management
- **Pattern-based cleanup** per bulk operations
- **Automatic stale detection** con TTL dinamici
- **Event-driven updates** per real-time data

### 📊 Observability
- **Hit rate monitoring** per performance tuning  
- **Response time tracking** per ottimizzazioni
- **Cache size analytics** per capacity planning
- **Error rate monitoring** per reliability

Questa strategia riduce drasticamente la complessità mantenendo performance eccellenti e fornisce una base solida per la crescita futura della vostra app BeachRef.