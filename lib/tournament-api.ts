import { PaginatedTournamentResponse } from '@/lib/types';
import { NextRequest } from 'next/server';

export interface FetchTournamentsOptions {
  year?: number;
  page?: number;
  limit?: number;
}

/**
 * Fetches paginated tournament data from the API
 * Uses direct API handler import for SSR and HTTP fetch for client-side
 */
export async function fetchPaginatedTournaments(
  options: FetchTournamentsOptions = {}
): Promise<PaginatedTournamentResponse> {
  const { year = 2025, page = 1, limit = 20 } = options;
  
  // Build query parameters
  const params = new URLSearchParams();
  if (year !== 2025) params.set('year', year.toString());
  if (page !== 1) params.set('page', page.toString());
  if (limit !== 20) params.set('limit', limit.toString());
  
  if (typeof window === 'undefined') {
    // Server-side: Use direct API handler import (no HTTP call)
    const { GET } = await import('@/app/api/tournaments/route');
    const url = `http://localhost:3000/api/tournaments${params.toString() ? '?' + params.toString() : ''}`;
    const request = new NextRequest(url, { method: 'GET' });
    const response = await GET(request);
    return response.json();
  } else {
    // Client-side: Use relative URL HTTP fetch
    const url = `/api/tournaments${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'max-age=300',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tournaments: ${response.status}`);
    }
    
    return response.json();
  }
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
  
  // Debug logging for 2025 year
  if (year === 2025) {
    console.log('fetchCachedTournaments: Requesting 2025 data', { year, page, limit });
  }
  
  // Check cache first
  const cachedData = tournamentCache.get(year, page, limit);
  if (cachedData) {
    if (year === 2025) {
      console.log('fetchCachedTournaments: Found 2025 data in cache', cachedData);
    }
    return cachedData;
  }
  
  // Fetch fresh data
  if (year === 2025) {
    console.log('fetchCachedTournaments: Fetching fresh 2025 data from API');
  }
  const data = await fetchPaginatedTournaments(options);
  
  // Cache the result
  tournamentCache.set(year, page, limit, data);
  
  if (year === 2025) {
    console.log('fetchCachedTournaments: Cached 2025 data', data);
  }
  
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
        // Return a valid empty response structure for prefetch errors
        return {
          tournaments: [],
          pagination: {
            currentPage: currentPage - 1,
            totalPages: 1,
            totalTournaments: 0,
            hasNextPage: false,
            hasPrevPage: false,
            limit: limit,
            year: currentYear
          }
        } as PaginatedTournamentResponse;
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
        // Return a valid empty response structure for prefetch errors
        return {
          tournaments: [],
          pagination: {
            currentPage: currentPage + 1,
            totalPages: 1,
            totalTournaments: 0,
            hasNextPage: false,
            hasPrevPage: false,
            limit: limit,
            year: currentYear
          }
        } as PaginatedTournamentResponse;
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