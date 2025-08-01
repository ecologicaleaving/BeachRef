import { NextRequest, NextResponse } from 'next/server'
import { fetchMatchDetail, fetchTournamentMatches, getTournamentNumber } from '@/lib/vis-client'
import { EnhancedVISApiError, categorizeVISApiError, sanitizeErrorForLogging } from '@/lib/vis-error-handler'
import { logVISApiError, logPerformanceMetrics } from '@/lib/production-logger'
import { BeachMatchDetail, BeachMatch } from '@/lib/types'

// 5-minute cache for match details (balance between freshness and performance)
const matchDetailCache = new Map<string, { data: BeachMatchDetail; timestamp: number }>()
const MATCH_DETAIL_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * GET /api/tournament/[code]/matches/[matchId]
 * 
 * Fetches individual match details using GetBeachMatch VIS API endpoint
 * Implements fallback to basic match data when detailed data unavailable
 * Follows Epic 3 error handling patterns with graceful fallbacks
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing tournament code and match ID
 * @returns JSON response with detailed match data
 */
export async function GET(
  request: NextRequest, 
  { params }: { params: { code: string; matchId: string } }
) {
  const { code, matchId } = params
  const startTime = Date.now()
  const cacheKey = `${code}-${matchId}`
  
  try {
    // Check cache first
    const cached = matchDetailCache.get(cacheKey)
    const now = Date.now()
    
    if (cached && (now - cached.timestamp) < MATCH_DETAIL_CACHE_TTL) {
      return NextResponse.json({
        match: cached.data,
        tournamentCode: code,
        matchId,
        lastUpdated: new Date(cached.timestamp).toISOString(),
        cached: true
      }, {
        headers: {
          'Cache-Control': 'public, max-age=300', // 5 minutes
          'X-Cache': 'HIT',
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      })
    }

    // Try to fetch detailed match data first
    try {
      const matchDetail = await fetchMatchDetail(matchId)
      
      // Update cache
      matchDetailCache.set(cacheKey, {
        data: matchDetail,
        timestamp: now
      })
      
      const duration = Date.now() - startTime
      
      // Log performance metrics
      logPerformanceMetrics('fetchMatchDetail', duration, 'GetBeachMatch', matchId, false, 'full')
      
      return NextResponse.json({
        match: matchDetail,
        tournamentCode: code,
        matchId,
        lastUpdated: new Date().toISOString(),
        cached: false,
        dataSource: 'detailed'
      }, {
        headers: {
          'Cache-Control': 'public, max-age=300', // 5 minutes
          'X-Cache': 'MISS',
          'X-Response-Time': `${duration}ms`,
          'X-Data-Source': 'detailed'
        }
      })

    } catch (detailError) {
      // Fallback: Try to get basic match data from tournament schedule
      console.warn(`Failed to fetch detailed match data for ${matchId}, falling back to basic data:`, detailError)
      
      try {
        const tournamentNumber = await getTournamentNumber(code)
        const matches = await fetchTournamentMatches(tournamentNumber)
        const basicMatch = matches.find(match => match.noInTournament === matchId)
        
        if (!basicMatch) {
          throw new Error(`Match ${matchId} not found in tournament ${code}`)
        }

        // Convert basic match to match detail format with fallback values
        const fallbackMatchDetail: BeachMatchDetail = {
          ...basicMatch,
          pointsTeamASet1: 0,
          pointsTeamBSet1: 0,
          pointsTeamASet2: 0,
          pointsTeamBSet2: 0,
          pointsTeamASet3: undefined,
          pointsTeamBSet3: undefined,
          durationSet1: '00:00',
          durationSet2: '00:00',
          durationSet3: undefined,
          totalDuration: undefined,
          roundName: undefined,
          phase: undefined
        }
        
        // Cache the fallback data with a shorter TTL
        matchDetailCache.set(cacheKey, {
          data: fallbackMatchDetail,
          timestamp: now
        })
        
        const duration = Date.now() - startTime
        
        // Log fallback usage
        logPerformanceMetrics('fetchMatchDetail', duration, 'GetBeachMatchList', matchId, true, 'partial')
        
        return NextResponse.json({
          match: fallbackMatchDetail,
          tournamentCode: code,
          matchId,
          lastUpdated: new Date().toISOString(),
          cached: false,
          dataSource: 'fallback',
          warning: 'Detailed match data unavailable, showing basic information'
        }, {
          headers: {
            'Cache-Control': 'public, max-age=120', // Shorter cache for fallback data
            'X-Cache': 'MISS',
            'X-Response-Time': `${duration}ms`,
            'X-Data-Source': 'fallback'
          }
        })

      } catch (fallbackError) {
        // Both detailed and fallback failed
        throw fallbackError
      }
    }

  } catch (error) {
    // Enhanced error handling following Epic 3 patterns
    const enhancedError = categorizeVISApiError(error, 'GetBeachMatch', {
          tournamentCode: code,
          tournamentNumber: matchId, // Using matchId as identifier
          userAgent: request.headers.get('user-agent') || undefined,
          timestamp: new Date().toISOString()
        })

    // Log error with production logging
    logVISApiError(sanitizeErrorForLogging(enhancedError), 'Match-Detail-API', {
      requestPath: `/api/tournament/${code}/matches/${matchId}`,
      duration: Date.now() - startTime
    })

    // Return appropriate error response based on error category
    if (enhancedError.statusCode === 404) {
      return NextResponse.json({
        error: `Match ${matchId} not found in tournament ${code}`,
        match: null,
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
        error: 'Match detail data unavailable',
        match: null,
        errorType: 'authentication',
        retryable: true,
        userMessage: 'Match details are temporarily unavailable. Please try again later.'
      }, { 
        status: 200, // Return 200 with null data for graceful fallback
        headers: {
          'X-Error-Type': 'authentication'
        }
      })
    }

    // Network or server errors
    if (enhancedError.category.type === 'network' || enhancedError.statusCode && enhancedError.statusCode >= 500) {
      return NextResponse.json({
        error: 'Failed to load match details',
        match: null,
        errorType: enhancedError.category.type,
        retryable: enhancedError.category.recoverable,
        userMessage: 'Match details are temporarily unavailable. Please try again in a few moments.'
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
      error: 'Failed to load match details',
      match: null,
      errorType: enhancedError.category.type,
      retryable: enhancedError.category.recoverable,
      userMessage: 'Unable to load match details at this time.'
    }, { 
      status: enhancedError.statusCode || 500,
      headers: {
        'X-Error-Type': enhancedError.category.type
      }
    })
  }
}

// Utility functions moved to separate module to avoid Next.js API route export restrictions