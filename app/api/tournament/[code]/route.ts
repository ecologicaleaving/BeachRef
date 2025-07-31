import { NextRequest, NextResponse } from 'next/server'
import { fetchTournamentDetailFromVIS } from '@/lib/vis-client'
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
  
  if (!code || typeof code !== 'string') {
    return NextResponse.json(
      { error: 'Tournament code is required' },
      { status: 400 }
    )
  }

  try {
    // Check cache first
    const cached = cache.get(code)
    const now = Date.now()
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      console.log(`[Tournament Detail API] Cache hit for tournament: ${code}`)
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, max-age=300', // 5 minutes
          'X-Cache': 'HIT'
        }
      })
    }

    console.log(`[Tournament Detail API] Cache miss, fetching from VIS API for: ${code}`)
    
    // Fetch from VIS API
    const tournament = await fetchTournamentDetailFromVIS(code)
    
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
    
    return NextResponse.json(tournament, {
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutes
        'X-Cache': 'MISS'
      }
    })

  } catch (error) {
    console.error(`[Tournament Detail API] Error fetching tournament ${code}:`, error)
    
    if (error instanceof VISApiError) {
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
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}