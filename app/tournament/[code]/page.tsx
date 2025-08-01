import { notFound } from 'next/navigation'
import { TournamentDetail } from '@/lib/types'
import TournamentDetailPage from '@/components/tournament/TournamentDetailPage'
import TournamentDetailErrorBoundary from '@/components/error/TournamentDetailErrorBoundary'
import { fetchTournamentDetailFromVIS } from '@/lib/vis-client'
import { logUserExperienceError } from '@/lib/production-logger'

interface TournamentPageProps {
  params: {
    code: string
  }
}

async function fetchTournamentDetail(code: string): Promise<TournamentDetail> {
  console.log(`[Tournament Page] Fetching tournament detail with enhanced error handling for code: ${code}`)
  
  try {
    // Use the enhanced VIS client with comprehensive error handling
    const tournament = await fetchTournamentDetailFromVIS(code)
    
    console.log(`[Tournament Page] Successfully fetched tournament: ${tournament.name} (${code})`)
    return tournament
    
  } catch (error) {
    console.error(`[Tournament Page] Error fetching tournament ${code}:`, error)
    
    // Log user experience error for monitoring
    logUserExperienceError('data_unavailable', code, {
      pathname: `/tournament/${code}`
    })
    
    // Check if it's a 404 (tournament not found)
    if (error instanceof Error && error.message.includes('not found')) {
      notFound()
    }
    
    // Let error boundary handle other errors
    throw error
  }
}

export default async function TournamentPage({ params }: TournamentPageProps) {
  try {
    const tournament = await fetchTournamentDetail(params.code)
    
    // Wrap the page in error boundary for client-side error handling
    return (
      <TournamentDetailErrorBoundary tournamentCode={params.code}>
        <TournamentDetailPage tournament={tournament} />
      </TournamentDetailErrorBoundary>
    )
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