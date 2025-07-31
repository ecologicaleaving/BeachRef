import { NextRequest, NextResponse } from 'next/server'
import { fetchTournamentDetailFromVISEnhanced } from '@/lib/vis-client'
import { VISApiError, TournamentDetail } from '@/lib/types'

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
  
  // Emergency deployment verification
  console.log(`[Tournament Detail API] EMERGENCY MODE v2 - Processing request for: ${code} at ${new Date().toISOString()}`)
  
  if (!code || typeof code !== 'string') {
    return NextResponse.json(
      { error: 'Tournament code is required' },
      { status: 400 }
    )
  }

  try {
    // Check for cache bypass parameter (for debugging)
    const url = new URL(request.url)
    const bypassCache = url.searchParams.get('nocache') === 'true'
    
    // Check cache first (unless bypassed)
    const cached = cache.get(code)
    const now = Date.now()
    
    if (cached && (now - cached.timestamp) < CACHE_TTL && !bypassCache) {
      console.log(`[Tournament Detail API] Cache hit for tournament: ${code}`)
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, max-age=300', // 5 minutes
          'X-Cache': 'HIT'
        }
      })
    }
    
    if (bypassCache) {
      console.log(`[Tournament Detail API] CACHE BYPASSED for debugging: ${code}`)
    }

    console.log(`[Tournament Detail API] Cache miss, fetching enhanced data from VIS API for: ${code}`)
    
    // Fetch enhanced tournament data using two-step API integration
    const tournament = await fetchTournamentDetailFromVISEnhanced(code)
    
    // DEBUG: Log the complete tournament object structure
    console.log(`[Tournament Detail API] DEBUG - Raw tournament object for ${code}:`, JSON.stringify(tournament, null, 2))
    
    // DEBUG: Validate required fields
    const requiredFields = ['code', 'name', 'countryCode', 'startDate', 'endDate', 'gender', 'type']
    const missingFields = requiredFields.filter(field => !tournament[field as keyof typeof tournament])
    if (missingFields.length > 0) {
      console.error(`[Tournament Detail API] CRITICAL - Missing required fields for ${code}:`, missingFields)
    }
    
    // DEBUG: Check for problematic values
    if (tournament.startDate && isNaN(new Date(tournament.startDate).getTime())) {
      console.error(`[Tournament Detail API] CRITICAL - Invalid startDate for ${code}:`, tournament.startDate)
    }
    if (tournament.endDate && isNaN(new Date(tournament.endDate).getTime())) {
      console.error(`[Tournament Detail API] CRITICAL - Invalid endDate for ${code}:`, tournament.endDate)
    }
    
    // Update cache
    cache.set(code, {
      data: tournament,
      timestamp: now
    })

    // Clean up old cache entries (simple cleanup)
    const cacheEntries = Array.from(cache.entries())
    for (const [cacheKey, value] of cacheEntries) {
      if ((now - value.timestamp) > CACHE_TTL) {
        cache.delete(cacheKey)
      }
    }

    console.log(`[Tournament Detail API] Successfully fetched tournament: ${tournament.name} (${code})`)
    console.log(`[Tournament Detail API] Tournament object keys: ${Object.keys(tournament).join(', ')}`)
    
    return NextResponse.json(tournament, {
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutes
        'X-Cache': 'MISS'
      }
    })

  } catch (error) {
    console.error(`[Tournament Detail API] Error fetching tournament ${code}:`, error)
    console.error(`[Tournament Detail API] Error stack:`, error instanceof Error ? error.stack : 'No stack trace')
    console.error(`[Tournament Detail API] Error type:`, error?.constructor?.name || typeof error)
    
    if (error instanceof VISApiError) {
      console.error(`[Tournament Detail API] VISApiError details:`, {
        message: error.message,
        statusCode: error.statusCode,
        originalError: error.originalError
      })
      
      if (error.statusCode === 404) {
        return NextResponse.json(
          { error: `Tournament with code ${code} not found` },
          { status: 404 }
        )
      }
      
      // For 401 errors, provide more context but don't expose internal details
      if (error.statusCode === 401) {
        console.error(`[Tournament Detail API] Authentication error for ${code}, fallback should have handled this:`, error)
        return NextResponse.json(
          { error: 'Tournament data temporarily unavailable' },
          { status: 503 } // Service Unavailable instead of auth error
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch tournament details', details: error.message },
        { status: error.statusCode || 500 }
      )
    }
    
    // Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[Tournament Detail API] Unexpected error for ${code}:`, errorMessage)
    console.error(`[Tournament Detail API] Full error object:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    
    return NextResponse.json(
      { error: 'Internal server error', debug: process.env.NODE_ENV === 'development' ? errorMessage : undefined },
      { status: 500 }
    )
  }
}