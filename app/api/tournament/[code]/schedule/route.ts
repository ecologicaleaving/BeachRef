import { NextRequest, NextResponse } from 'next/server'
import { fetchTournamentMatches, getTournamentNumber } from '@/lib/vis-client'
import { EnhancedVISApiError, categorizeVISApiError, sanitizeErrorForLogging } from '@/lib/vis-error-handler'
import { logVISApiError, logPerformanceMetrics } from '@/lib/production-logger'
import { BeachMatch } from '@/lib/types'

// 2-minute cache for schedule data (frequent updates during live tournaments)
const scheduleCache = new Map<string, { data: BeachMatch[]; timestamp: number }>()
const SCHEDULE_CACHE_TTL = 2 * 60 * 1000 // 2 minutes

/**
 * GET /api/tournament/[code]/schedule
 * 
 * Fetches tournament match schedule using GetBeachMatchList VIS API endpoint
 * Implements 2-minute caching for performance during live tournaments
 * Follows Epic 3 error handling patterns with graceful fallbacks
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing tournament code
 * @returns JSON response with match schedule data
 */
export async function GET(request: NextRequest, { params }: { params: { code: string } }) {
  const { code } = params
  const startTime = Date.now()
  
  try {
    // Check cache first
    const cached = scheduleCache.get(code)
    const now = Date.now()
    
    if (cached && (now - cached.timestamp) < SCHEDULE_CACHE_TTL) {
      return NextResponse.json({
        matches: cached.data,
        tournamentCode: code,
        lastUpdated: new Date(cached.timestamp).toISOString(),
        totalMatches: cached.data.length,
        cached: true
      }, {
        headers: {
          'Cache-Control': 'public, max-age=120', // 2 minutes
          'X-Cache': 'HIT',
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      })
    }

    // Get tournament number (following Epic 3 pattern)
    const tournamentNumber = await getTournamentNumber(code)
    
    // Fetch match schedule using the new VIS API client function
    const matches = await fetchTournamentMatches(tournamentNumber)
    
    // Update cache
    scheduleCache.set(code, {
      data: matches,
      timestamp: now
    })
    
    const duration = Date.now() - startTime
    
    // Log performance metrics
    logPerformanceMetrics('fetchTournamentSchedule', duration, 'GetBeachMatchList', code, false, 'full')
    
    return NextResponse.json({
      matches,
      tournamentCode: code,
      tournamentNumber,
      lastUpdated: new Date().toISOString(),
      totalMatches: matches.length,
      cached: false
    }, {
      headers: {
        'Cache-Control': 'public, max-age=120', // 2 minutes
        'X-Cache': 'MISS',
        'X-Response-Time': `${duration}ms`
      }
    })

  } catch (error) {
    // Enhanced error handling following Epic 3 patterns
    const enhancedError = categorizeVISApiError(error, 'GetBeachMatchList', {
          tournamentCode: code,
          userAgent: request.headers.get('user-agent') || undefined,
          timestamp: new Date().toISOString()
        })

    // Log error with production logging
    logVISApiError(sanitizeErrorForLogging(enhancedError), 'Tournament-Schedule-API', {
      requestPath: `/api/tournament/${code}/schedule`,
      duration: Date.now() - startTime
    })

    // Return appropriate error response based on error category
    if (enhancedError.statusCode === 404) {
      return NextResponse.json({
        error: `Tournament ${code} not found`,
        matches: [],
        errorType: 'not_found',
        retryable: false
      }, { 
        status: 404,
        headers: {
          'X-Error-Type': 'not_found'
        }
      })
    }

    if (enhancedError.statusCode === 401) {
      return NextResponse.json({
        error: 'Tournament schedule data unavailable',
        matches: [],
        errorType: 'authentication',
        retryable: true,
        userMessage: 'Tournament schedule is temporarily unavailable. Please try again later.'
      }, { 
        status: 200, // Return 200 with empty data for graceful fallback
        headers: {
          'X-Error-Type': 'authentication'
        }
      })
    }

    // Network or server errors
    if (enhancedError.category.type === 'network' || enhancedError.statusCode && enhancedError.statusCode >= 500) {
      return NextResponse.json({
        error: 'Failed to load tournament schedule',
        matches: [],
        errorType: enhancedError.category.type,
        retryable: enhancedError.category.recoverable,
        userMessage: 'Schedule data is temporarily unavailable. Please try again in a few moments.'
      }, { 
        status: enhancedError.statusCode || 500,
        headers: {
          'X-Error-Type': enhancedError.category.type,
          'Retry-After': '60' // Suggest retry after 1 minute
        }
      })
    }

    // Default error response
    return NextResponse.json({
      error: 'Failed to load tournament schedule',
      matches: [],
      errorType: enhancedError.category.type,
      retryable: enhancedError.category.recoverable,
      userMessage: 'Unable to load tournament schedule at this time.'
    }, { 
      status: enhancedError.statusCode || 500,
      headers: {
        'X-Error-Type': enhancedError.category.type
      }
    })
  }
}

// Utility functions moved to separate module to avoid Next.js API route export restrictions