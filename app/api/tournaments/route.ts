import { NextRequest, NextResponse } from 'next/server';
import { fetchTournamentsFromVIS } from '@/lib/vis-client';
import { Tournament, VISApiError } from '@/lib/types';

const CACHE_DURATION = 5 * 60; // 5 minutes in seconds

interface CacheEntry {
  data: Tournament[];
  timestamp: number;
  etag: string;
}

interface ApiErrorResponse {
  error: string;
  message: string;
  timestamp: string;
  retryAfter?: number;
}

// In-memory cache for tournament data
let cache: CacheEntry | null = null;

// Generate ETag for response data
function generateETag(tournaments: Tournament[]): string {
  const dataString = JSON.stringify(tournaments);
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `"${Math.abs(hash).toString(16)}"`;
}

// Check if cache is still valid
function isCacheValid(cacheEntry: CacheEntry | null): boolean {
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
}) {
  console.log(`[API-Tournaments] ${JSON.stringify(data)}`);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    // Check for conditional request with If-None-Match header
    const ifNoneMatch = request.headers.get('if-none-match');
    
    // Check cache validity
    if (isCacheValid(cache) && cache) {
      const etag = cache.etag;
      
      // Return 304 Not Modified if ETag matches
      if (ifNoneMatch === etag) {
        const duration = Date.now() - startTime;
        logRequest({
          endpoint: '/api/tournaments',
          method: 'GET',
          duration,
          status: 304,
          cacheHit: true,
          timestamp
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
        timestamp
      });
      
      return NextResponse.json(cache.data, {
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
    const visResponse = await fetchTournamentsFromVIS();
    const visApiDuration = Date.now() - visStartTime;
    
    const tournaments = visResponse.tournaments;
    const etag = generateETag(tournaments);
    
    // Update cache
    cache = {
      data: tournaments,
      timestamp: Date.now(),
      etag
    };
    
    const duration = Date.now() - startTime;
    logRequest({
      endpoint: '/api/tournaments',
      method: 'GET',
      duration,
      status: 200,
      cacheHit: false,
      visApiDuration,
      timestamp
    });
    
    return NextResponse.json(tournaments, {
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