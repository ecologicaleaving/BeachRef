import { notFound } from 'next/navigation'
import { TournamentDetail } from '@/lib/types'
import TournamentDetailPage from '@/components/tournament/TournamentDetailPage'

interface TournamentPageProps {
  params: {
    code: string
  }
}

async function fetchTournamentDetail(code: string): Promise<TournamentDetail> {
  // Robust base URL determination with multiple fallbacks
  let baseUrl: string
  
  if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`
  } else if (process.env.NEXT_PUBLIC_SITE_URL) {
    baseUrl = process.env.NEXT_PUBLIC_SITE_URL
  } else if (typeof window !== 'undefined') {
    // Client-side fallback
    baseUrl = window.location.origin
  } else {
    // Server-side fallback
    baseUrl = 'http://localhost:3000'
  }
  
  const apiUrl = `${baseUrl}/api/tournament/${code}`
  
  console.log(`[Tournament Page] Fetching tournament detail for code: ${code} from ${apiUrl}`)
  
  try {
    const response = await fetch(apiUrl, {
      next: { revalidate: 300 }, // 5-minute cache
      headers: {
        'Content-Type': 'application/json',
      }
    })

    console.log(`[Tournament Page] API response status: ${response.status} for tournament: ${code}`)

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[Tournament Page] Tournament not found: ${code}`)
        notFound()
      }
      
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error(`[Tournament Page] API error for ${code}: ${response.status} - ${errorText}`)
      throw new Error(`Failed to fetch tournament ${code}: ${response.status} ${response.statusText}`)
    }

    const tournament = await response.json()
    console.log(`[Tournament Page] Successfully fetched tournament: ${tournament.name} (${code})`)
    return tournament
    
  } catch (error) {
    console.error(`[Tournament Page] Error fetching tournament ${code}:`, error)
    throw error
  }
}

export default async function TournamentPage({ params }: TournamentPageProps) {
  try {
    const tournament = await fetchTournamentDetail(params.code)
    return <TournamentDetailPage tournament={tournament} />
  } catch (error) {
    console.error(`[Tournament Page] Failed to render tournament page for ${params.code}:`, error)
    throw error // Let Next.js error boundary handle it
  }
}

export async function generateMetadata({ params }: TournamentPageProps) {
  try {
    console.log(`[Tournament Metadata] Generating metadata for tournament: ${params.code}`)
    const tournament = await fetchTournamentDetail(params.code)
    
    return {
      title: `${tournament.name} - BeachRef`,
      description: `Tournament details for ${tournament.name} in ${tournament.countryCode}`,
    }
  } catch (error) {
    console.error(`[Tournament Metadata] Failed to generate metadata for ${params.code}:`, error)
    return {
      title: 'Tournament Not Found - BeachRef',
      description: 'Tournament details not available',
    }
  }
}