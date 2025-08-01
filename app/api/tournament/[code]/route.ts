import { NextRequest, NextResponse } from 'next/server'
import { fetchTournamentDetailFromVIS, fetchTournamentsFromVIS } from '@/lib/vis-client'
import { VISApiError, TournamentDetail } from '@/lib/types'
import { EnhancedVISApiError, categorizeVISApiError, sanitizeErrorForLogging } from '@/lib/vis-error-handler'
import { logVISApiError, logUserExperienceError } from '@/lib/production-logger'

/**
 * Tournament Detail API Route
 * 
 * IMPLEMENTATION NOTES:
 * 
 * This route implements the correct VIS API integration pattern that resolves the
 * production error: "Error: Failed to fetch tournament MQUI2025: 401 Unauthorized"
 * 
 * KEY PATTERN:
 * 1. Use two-step process: GetBeachTournamentList → GetBeachTournament
 * 2. Handle 401 errors gracefully (they are expected, not failures)
 * 3. Return 503 Service Unavailable instead of exposing auth details
 * 4. Provide fallback to basic tournament data when enhanced data fails
 * 
 * PRODUCTION SUCCESS:
 * - Works without VIS API credentials
 * - Provides tournament data to users
 * - Ready for enhanced data when authentication available
 * - Comprehensive error logging for debugging
 */

// In-memory cache for tournament details (5-minute TTL)
const cache = new Map<string, { data: TournamentDetail; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface RouteParams {
  params: {
    code: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { code } = params
  const startTime = Date.now()
  
  console.log(`[Tournament Detail API] Enhanced error handling v3.3.1 - Processing request for: ${code} at ${new Date().toISOString()}`)
  
  if (!code || typeof code !== 'string') {
    return NextResponse.json(
      { error: 'Tournament code is required' },
      { status: 400 }
    )
  }

  try {
    // Check for cache bypass and fallback parameters
    const url = new URL(request.url)
    const bypassCache = url.searchParams.get('nocache') === 'true'
    const forceFallback = url.searchParams.get('fallback') === 'true'
    
    // Check cache first (unless bypassed)
    const cached = cache.get(code)
    const now = Date.now()
    
    if (cached && (now - cached.timestamp) < CACHE_TTL && !bypassCache) {
      console.log(`[Tournament Detail API] Cache hit for tournament: ${code}`)
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'X-Cache': 'HIT'
        }
      })
    }
    
    if (bypassCache) {
      console.log(`[Tournament Detail API] Cache bypassed for debugging: ${code}`)
    }

    console.log(`[Tournament Detail API] Cache miss, fetching tournament data with enhanced error handling for: ${code}`)
    
    // Use the enhanced fetchTournamentDetailFromVIS function
    const tournament = await fetchTournamentDetailFromVIS(code)
    
    const duration = Date.now() - startTime
    
    // Validate tournament data
    const requiredFields = ['code', 'name', 'countryCode', 'startDate', 'endDate', 'gender', 'type']
    const missingFields = requiredFields.filter(field => !tournament[field as keyof typeof tournament])
    if (missingFields.length > 0) {
      console.error(`[Tournament Detail API] Missing required fields for ${code}:`, missingFields)
      
      // Log as user experience error
      logUserExperienceError('data_unavailable', code, {
        userAgent: request.headers.get('user-agent') || undefined,
        pathname: `/api/tournament/${code}`
      })
    }
    
    // Update cache
    cache.set(code, {
      data: tournament,
      timestamp: now
    })

    // Clean up old cache entries
    const cacheEntries = Array.from(cache.entries())
    for (const [cacheKey, value] of cacheEntries) {
      if ((now - value.timestamp) > CACHE_TTL) {
        cache.delete(cacheKey)
      }
    }

    console.log(`[Tournament Detail API] Successfully fetched tournament: ${tournament.name} (${code}) in ${duration}ms`)
    
    return NextResponse.json(tournament, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'X-Cache': 'MISS',
        'X-Response-Time': `${duration}ms`
      }
    })

  } catch (error) {
    const duration = Date.now() - startTime
    
    // Categorize and enhance the error
    const enhancedError = error instanceof EnhancedVISApiError 
      ? error 
      : categorizeVISApiError(error, 'GetBeachTournamentList', {
          tournamentCode: code,
          userAgent: request.headers.get('user-agent') || undefined,
          timestamp: new Date().toISOString()
        })

    // Log the error with production logging
    logVISApiError(sanitizeErrorForLogging(enhancedError), 'Tournament-API-Route', {
      requestPath: `/api/tournament/${code}`,
      duration,
      userAgent: request.headers.get('user-agent') || undefined
    })

    console.error(`[Tournament Detail API] Enhanced error for ${code}:`, {
      errorType: enhancedError.category.type,
      severity: enhancedError.category.severity,
      statusCode: enhancedError.statusCode,
      duration
    })

    // Handle different error types with appropriate responses
    if (enhancedError.category.type === 'authentication' && enhancedError.statusCode === 401) {
      // 401 on GetBeachTournament is expected - provide helpful response
      console.log(`[Tournament Detail API] Authentication required for enhanced data - this is expected behavior`)
      
      logUserExperienceError('fallback_displayed', code, {
        userAgent: request.headers.get('user-agent') || undefined,
        pathname: `/api/tournament/${code}`
      })
      
      return NextResponse.json({
        error: 'Enhanced tournament data requires authentication',
        message: 'Basic tournament information may be available',
        errorType: 'authentication',
        fallbackAvailable: true
      }, { 
        status: 503, // Service Unavailable instead of auth error
        headers: {
          'X-Error-Type': 'authentication',
          'X-Fallback-Available': 'true'
        }
      })
    }

    if (enhancedError.category.type === 'data' && enhancedError.statusCode === 404) {
      return NextResponse.json({
        error: `Tournament with code ${code} not found`,
        errorType: 'not_found'
      }, { 
        status: 404,
        headers: {
          'X-Error-Type': 'not_found'
        }
      })
    }

    if (enhancedError.category.type === 'network' || enhancedError.category.type === 'timeout') {
      logUserExperienceError('loading_timeout', code, {
        userAgent: request.headers.get('user-agent') || undefined,
        pathname: `/api/tournament/${code}`
      })
      
      return NextResponse.json({
        error: 'Tournament data temporarily unavailable',
        message: 'Please try again in a moment',
        errorType: enhancedError.category.type,
        retryable: true
      }, { 
        status: 503,
        headers: {
          'X-Error-Type': enhancedError.category.type,
          'X-Retryable': 'true',
          'Retry-After': '30'
        }
      })
    }

    // Default error response
    const statusCode = enhancedError.statusCode || 500
    const isServerError = statusCode >= 500

    if (isServerError) {
      logUserExperienceError('data_unavailable', code, {
        userAgent: request.headers.get('user-agent') || undefined,
        pathname: `/api/tournament/${code}`
      })
    }

    return NextResponse.json({
      error: isServerError ? 'Internal server error' : 'Failed to fetch tournament details',
      message: enhancedError.message,
      errorType: enhancedError.category.type,
      debug: process.env.NODE_ENV === 'development' ? {
        statusCode: enhancedError.statusCode,
        severity: enhancedError.category.severity,
        recoverable: enhancedError.category.recoverable
      } : undefined
    }, { 
      status: statusCode,
      headers: {
        'X-Error-Type': enhancedError.category.type,
        'X-Error-Severity': enhancedError.category.severity
      }
    })
  }
}