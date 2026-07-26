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

/**
 * Filtri torneo in formato legacy, consumati dal livello di compatibilita'
 * (`hooks/compatibility/*`) che li traduce nei filtri del nuovo sistema a hook.
 *
 * `status`, `gender` e `country` erano gia' letti da entrambi i traduttori ma non
 * erano dichiarati qui (issue #49): 10 TS2339 su un'unica interfaccia incompleta.
 * I tipi rispecchiano i valori che i traduttori sanno effettivamente mappare.
 */
export interface FilterOptions {
  recentOnly?: boolean;
  year?: number;
  currentlyActive?: boolean;
  tournamentType?: string;
  status?: 'active' | 'completed' | 'upcoming';
  gender?: 'M' | 'W';
  country?: string;
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