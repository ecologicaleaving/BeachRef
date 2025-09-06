export interface CachedData {
  data: any;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  memoryHits: number;
  supabaseHits: number;
  localHits: number;
  offlineHits: number;
  apiCalls: number;
  totalRequests: number;
  hitRatio: number;
}

export interface FilterOptions {
  recentOnly?: boolean;
  year?: number;
  currentlyActive?: boolean;
  tournamentType?: string;
}

export interface MemoryCacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheConfiguration {
  memoryMaxSize: number; // in MB
  memoryMaxEntries: number;
  localStorageMaxAge: number; // in days
  defaultTTL: {
    tournaments: number; // in milliseconds
    matchesScheduled: number;
    matchesLive: number;
    matchesFinished: number;
    referees: number;
  };
}

export type CacheTier = 'memory' | 'localStorage' | 'offline' | 'supabase' | 'api';

export interface CacheResult<T> {
  data: T;
  source: CacheTier;
  fromCache: boolean;
  timestamp: number;
}