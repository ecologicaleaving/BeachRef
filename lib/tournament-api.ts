import { PaginatedTournamentResponse } from '@/lib/types';

export interface FetchTournamentsOptions {
  year?: number;
  page?: number;
  limit?: number;
}

/**
 * Fetches paginated tournament data from the API
 * Handles both paginated and legacy response formats for backward compatibility
 */
export async function fetchPaginatedTournaments(
  options: FetchTournamentsOptions = {}
): Promise<PaginatedTournamentResponse> {
  const { year = 2025, page = 1, limit = 20 } = options;
  
  // Build query parameters, only including non-default values for cleaner URLs
  const params = new URLSearchParams();
  if (year !== 2025) params.set('year', year.toString());
  if (page !== 1) params.set('page', page.toString());
  if (limit !== 20) params.set('limit', limit.toString());
  
  // Handle both server-side and client-side requests
  const baseUrl = typeof window === 'undefined' 
    ? process.env.NEXTAUTH_URL || 'http://localhost:3000'
    : '';
  
  const url = `${baseUrl}/api/tournaments${params.toString() ? '?' + params.toString() : ''}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Cache-Control': 'max-age=300', // 5-minute cache for better performance
    },
  });
  
  if (!response.ok) {
    // Enhanced error handling with more specific error messages
    let errorMessage = `Failed to fetch tournaments: ${response.status}`;
    
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // If we can't parse the error response, use the status text
      errorMessage = `${errorMessage} ${response.statusText}`;
    }
    
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  
  // Handle backward compatibility: if API returns Tournament[] (legacy format)
  if (Array.isArray(data)) {
    return {
      tournaments: data,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalTournaments: data.length,
        hasNextPage: false,
        hasPrevPage: false,
        limit: data.length,
        year: year,
      },
    };
  }
  
  // New format: PaginatedTournamentResponse
  return data;
}

/**
 * Client-side cache for tournament data to improve navigation performance
 */
interface CacheEntry {
  data: PaginatedTournamentResponse;
  timestamp: number;
}

class TournamentCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 300000; // 5 minutes in milliseconds
  
  private getCacheKey(year: number, page: number, limit: number): string {
    return `tournaments:${year}:${page}:${limit}`;
  }
  
  get(year: number, page: number, limit: number): PaginatedTournamentResponse | null {
    const key = this.getCacheKey(year, page, limit);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  set(year: number, page: number, limit: number, data: PaginatedTournamentResponse): void {
    const key = this.getCacheKey(year, page, limit);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
    
    // Clean up old entries to prevent memory leaks
    this.cleanup();
  }
  
  private cleanup(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.TTL) {
        entriesToDelete.push(key);
      }
    });
    
    entriesToDelete.forEach(key => {
      this.cache.delete(key);
    });
  }
  
  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance
const tournamentCache = new TournamentCache();

/**
 * Cached version of fetchPaginatedTournaments with client-side caching
 * for improved navigation performance
 */
export async function fetchCachedTournaments(
  options: FetchTournamentsOptions = {}
): Promise<PaginatedTournamentResponse> {
  const { year = 2025, page = 1, limit = 20 } = options;
  
  // Check cache first
  const cachedData = tournamentCache.get(year, page, limit);
  if (cachedData) {
    return cachedData;
  }
  
  // Fetch fresh data
  const data = await fetchPaginatedTournaments(options);
  
  // Cache the result
  tournamentCache.set(year, page, limit, data);
  
  return data;
}

/**
 * Prefetch tournament data for adjacent pages to improve navigation speed
 */
export async function prefetchAdjacentPages(
  currentYear: number,
  currentPage: number,
  totalPages: number,
  limit: number = 20
): Promise<void> {
  const prefetchPromises: Promise<PaginatedTournamentResponse>[] = [];
  
  // Prefetch previous page
  if (currentPage > 1) {
    prefetchPromises.push(
      fetchCachedTournaments({
        year: currentYear,
        page: currentPage - 1,
        limit,
      }).catch(() => {
        // Ignore prefetch errors to avoid affecting main functionality
        return {} as PaginatedTournamentResponse;
      })
    );
  }
  
  // Prefetch next page
  if (currentPage < totalPages) {
    prefetchPromises.push(
      fetchCachedTournaments({
        year: currentYear,
        page: currentPage + 1,
        limit,
      }).catch(() => {
        // Ignore prefetch errors to avoid affecting main functionality
        return {} as PaginatedTournamentResponse;
      })
    );
  }
  
  // Execute prefetch requests without waiting for them
  if (prefetchPromises.length > 0) {
    Promise.all(prefetchPromises).catch(() => {
      // Ignore prefetch errors
    });
  }
}

/**
 * Clear tournament cache - useful for data invalidation
 */
export function clearTournamentCache(): void {
  tournamentCache.clear();
}