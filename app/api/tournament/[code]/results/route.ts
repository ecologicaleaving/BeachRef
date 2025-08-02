import { NextRequest, NextResponse } from 'next/server'
import { fetchTournamentRanking, getTournamentNumber } from '@/lib/vis-client'
import { categorizeVISApiError, sanitizeErrorForLogging } from '@/lib/vis-error-handler'
import { logVISApiError, logPerformanceMetrics } from '@/lib/production-logger'
import { TournamentRanking } from '@/lib/types'

// 10-minute cache for results data (more stable after completion)
const resultsCache = new Map<string, { data: TournamentRanking[]; timestamp: number }>()
const RESULTS_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

/**
 * GET /api/tournament/[code]/results
 * 
 * Fetches tournament rankings using GetBeachTournamentRanking VIS API endpoint
 * Implements 10-minute caching for results data (more stable after completion)
 * Follows Epic 3 error handling patterns with graceful fallbacks
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing tournament code
 * @returns JSON response with tournament ranking data
 */
export async function GET(request: NextRequest, { params }: { params: { code: string } }) {
  const { code } = params
  const startTime = Date.now()
  
  try {
    // Check cache first
    const cached = resultsCache.get(code)
    const now = Date.now()
    
    if (cached && (now - cached.timestamp) < RESULTS_CACHE_TTL) {
      return NextResponse.json({
        rankings: cached.data,
        tournamentCode: code,
        lastUpdated: new Date(cached.timestamp).toISOString(),
        totalTeams: cached.data.length,
        cached: true
      }, {
        headers: {
          'Cache-Control': 'public, max-age=600', // 10 minutes
          'X-Cache': 'HIT',
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      })
    }

    // Get tournament number (following Epic 3 pattern)
    const tournamentNumber = await getTournamentNumber(code)
    
    // Fetch tournament rankings using the new VIS API client function
    const rankings = await fetchTournamentRanking(tournamentNumber)
    
    // Update cache
    resultsCache.set(code, {
      data: rankings,
      timestamp: now
    })
    
    const duration = Date.now() - startTime
    
    // Log performance metrics
    logPerformanceMetrics('fetchTournamentResults', duration, 'GetBeachTournamentRanking', code, false, 'full')
    
    return NextResponse.json({
      rankings,
      tournamentCode: code,
      tournamentNumber,
      lastUpdated: new Date().toISOString(),
      totalTeams: rankings.length
    }, {
      headers: {
        'Cache-Control': 'public, max-age=600', // 10 minutes
        'X-Cache': 'MISS',
        'X-Response-Time': `${duration}ms`
      }
    })

  } catch (error) {
    // Enhanced error handling following Epic 3 patterns
    const enhancedError = categorizeVISApiError(error, 'GetBeachTournamentRanking', {
          tournamentCode: code,
          userAgent: request.headers.get('user-agent') || undefined,
          timestamp: new Date().toISOString()
        })

    // Log error with production logging
    logVISApiError(sanitizeErrorForLogging(enhancedError), 'Tournament-Results-API', {
      requestPath: `/api/tournament/${code}/results`,
      duration: Date.now() - startTime
    })

    // Return appropriate error response based on error category
    if (enhancedError.statusCode === 404) {
      return NextResponse.json({
        error: `Tournament ${code} results not found`,
        rankings: [],
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
        error: 'Tournament results data unavailable',
        rankings: [],
        errorType: 'authentication',
        retryable: true,
        userMessage: 'Tournament results are temporarily unavailable. Please try again later.'
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
        error: 'Failed to load tournament results',
        rankings: [],
        errorType: enhancedError.category.type,
        retryable: enhancedError.category.recoverable,
        userMessage: 'Results data is temporarily unavailable. Please try again in a few moments.'
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
      error: 'Failed to load tournament results',
      rankings: [],
      errorType: enhancedError.category.type,
      retryable: enhancedError.category.recoverable,
      userMessage: 'Unable to load tournament results at this time.'
    }, { 
      status: enhancedError.statusCode || 500,
      headers: {
        'X-Error-Type': enhancedError.category.type
      }
    })
  }
}