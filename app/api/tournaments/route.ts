import { NextRequest, NextResponse } from 'next/server';
import { fetchTournamentsFromVIS } from '@/lib/vis-client';
import { Tournament, VISApiError, PaginatedTournamentResponse } from '@/lib/types';

const CACHE_DURATION = 5 * 60; // 5 minutes in seconds

interface CacheEntry {
  data: Tournament[];
  timestamp: number;
  etag: string;
  year?: number;
}

interface ApiErrorResponse {
  error: string;
  message: string;
  timestamp: string;
  retryAfter?: number;
}

// In-memory cache for tournament data (keyed by year)
const cache = new Map<string, CacheEntry>();

// Helper function to create cache key
function getCacheKey(year?: number): string {
  return year ? `year-${year}` : 'all';
}

// Helper function to paginate tournaments
function paginateTournaments(
  tournaments: Tournament[], 
  page: number, 
  limit: number,
  year: number
): PaginatedTournamentResponse {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedTournaments = tournaments.slice(startIndex, endIndex);
  
  return {
    tournaments: paginatedTournaments,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(tournaments.length / limit),
      totalTournaments: tournaments.length,
      hasNextPage: endIndex < tournaments.length,
      hasPrevPage: page > 1,
      limit,
      year,
    },
  };
}

// Generate ETag for response data
function generateETag(data: Tournament[] | PaginatedTournamentResponse): string {
  const dataString = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `"${Math.abs(hash).toString(16)}"`;
}

// Check if cache is still valid
function isCacheValid(cacheEntry: CacheEntry | undefined): boolean {
  if (!cacheEntry) return false;
  const age = (Date.now() - cacheEntry.timestamp) / 1000;
  return age < CACHE_DURATION;
}

// Log structured data for monitoring
function logRequest(data: {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  cacheHit: boolean;
  visApiDuration?: number;
  error?: string;
  timestamp: string;
  year?: number;
  page?: number;
  limit?: number;
  totalTournaments?: number;
}) {
  console.log(`[API-Tournaments] ${JSON.stringify(data)}`);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    
    // Check if any pagination parameters are provided
    const hasParams = yearParam !== null || pageParam !== null || limitParam !== null;
    
    // Parse and validate parameters
    let year: number | undefined;
    let page: number | undefined;
    let limit: number | undefined;
    
    if (hasParams) {
      // Parse year parameter
      if (yearParam !== null) {
        year = parseInt(yearParam);
        if (isNaN(year) || year < 2023 || year > 2025) {
          return NextResponse.json({
            error: 'Invalid year parameter',
            message: 'Year must be between 2023 and 2025',
            timestamp,
            validRange: [2023, 2024, 2025]
          }, { 
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET',
              'Access-Control-Max-Age': '86400',
            }
          });
        }
      } else {
        year = 2025; // Default year when pagination params are used
      }
      
      // Parse page parameter
      page = pageParam ? parseInt(pageParam) : 1;
      if (isNaN(page) || page < 1) {
        return NextResponse.json({
          error: 'Invalid page parameter',
          message: 'Page must be a positive integer',
          timestamp
        }, { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Max-Age': '86400',
          }
        });
      }
      
      // Parse limit parameter
      limit = limitParam ? parseInt(limitParam) : 20;
      if (isNaN(limit) || limit < 1 || limit > 100) {
        return NextResponse.json({
          error: 'Invalid limit parameter',
          message: 'Limit must be between 1 and 100',
          timestamp
        }, { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Max-Age': '86400',
          }
        });
      }
    }
    
    // Get cache key and check cache
    const cacheKey = getCacheKey(year);
    const cachedData = cache.get(cacheKey);
    const ifNoneMatch = request.headers.get('if-none-match');
    
    if (isCacheValid(cachedData) && cachedData) {
      let responseData: Tournament[] | PaginatedTournamentResponse;
      let etag: string;
      
      if (hasParams) {
        // Return paginated response
        responseData = paginateTournaments(cachedData.data, page!, limit!, year!);
        etag = generateETag(responseData);
      } else {
        // Return all tournaments (backward compatibility)
        responseData = cachedData.data;
        etag = cachedData.etag;
      }
      
      // Return 304 Not Modified if ETag matches
      if (ifNoneMatch === etag) {
        const duration = Date.now() - startTime;
        logRequest({
          endpoint: '/api/tournaments',
          method: 'GET',
          duration,
          status: 304,
          cacheHit: true,
          timestamp,
          year,
          page: hasParams ? page! : undefined,
          limit: hasParams ? limit! : undefined
        });
        
        return new NextResponse(null, {
          status: 304,
          headers: {
            'ETag': etag,
            'Cache-Control': 'public, max-age=300, s-maxage=300',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Max-Age': '86400',
          }
        });
      }
      
      // Return cached data with fresh headers
      const duration = Date.now() - startTime;
      logRequest({
        endpoint: '/api/tournaments',
        method: 'GET',
        duration,
        status: 200,
        cacheHit: true,
        timestamp,
        year,
        page: hasParams ? page! : undefined,
        limit: hasParams ? limit! : undefined,
        totalTournaments: Array.isArray(responseData) ? responseData.length : responseData.tournaments.length
      });
      
      return NextResponse.json(responseData, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, s-maxage=300',
          'ETag': etag,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Max-Age': '86400',
        }
      });
    }
    
    // Cache miss or expired - fetch fresh data from VIS API
    const visStartTime = Date.now();
    const visResponse = await fetchTournamentsFromVIS(year);
    const visApiDuration = Date.now() - visStartTime;
    
    const tournaments = visResponse.tournaments;
    const baseTournamentEtag = generateETag(tournaments);
    
    // Update cache
    cache.set(cacheKey, {
      data: tournaments,
      timestamp: Date.now(),
      etag: baseTournamentEtag,
      year
    });
    
    // Prepare response
    let responseData: Tournament[] | PaginatedTournamentResponse;
    let etag: string;
    
    if (hasParams) {
      // Return paginated response
      responseData = paginateTournaments(tournaments, page!, limit!, year!);
      etag = generateETag(responseData);
    } else {
      // Return all tournaments (backward compatibility)
      responseData = tournaments;
      etag = baseTournamentEtag;
    }
    
    const duration = Date.now() - startTime;
    logRequest({
      endpoint: '/api/tournaments',
      method: 'GET',
      duration,
      status: 200,
      cacheHit: false,
      visApiDuration,
      timestamp,
      year,
      page: hasParams ? page! : undefined,
      limit: hasParams ? limit! : undefined,
      totalTournaments: Array.isArray(responseData) ? responseData.length : responseData.tournaments.length
    });
    
    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'ETag': etag,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Max-Age': '86400',
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    let errorResponse: ApiErrorResponse;
    let status: number;
    
    if (error instanceof VISApiError) {
      // Handle VIS API specific errors
      status = error.statusCode === 404 ? 503 : (error.statusCode || 503);
      errorResponse = {
        error: 'Failed to fetch tournaments',
        message: 'Unable to connect to tournament data service',
        timestamp,
        ...(status === 503 && { retryAfter: 60 })
      };
      
      logRequest({
        endpoint: '/api/tournaments',
        method: 'GET',
        duration,
        status,
        cacheHit: false,
        error: error.message,
        timestamp
      });
    } else {
      // Handle unexpected errors
      status = 500;
      errorResponse = {
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your request',
        timestamp
      };
      
      logRequest({
        endpoint: '/api/tournaments',
        method: 'GET',
        duration,
        status,
        cacheHit: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp
      });
    }
    
    return NextResponse.json(errorResponse, {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Max-Age': '86400',
        ...(status === 503 && { 'Retry-After': '60' })
      }
    });
  }
}