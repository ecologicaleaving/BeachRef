import { notFound } from 'next/navigation'
import { TournamentDetail } from '@/lib/types'
import TournamentDetailPage from '@/components/tournament/TournamentDetailPage'
import { fetchTournamentsFromVIS, fetchTournamentDetailByNumber } from '@/lib/vis-client'

interface TournamentPageProps {
  params: {
    code: string
  }
}

async function fetchTournamentDetail(code: string): Promise<TournamentDetail> {
  console.log(`[Tournament Page] Fetching tournament detail for code: ${code} directly from VIS`)
  
  try {
    // Step 1: Get tournament number from tournament code
    console.log(`[Tournament Page] Step 1: Getting tournament number for code ${code}`)
    const tournamentsResponse = await fetchTournamentsFromVIS(2025)
    const basicTournament = tournamentsResponse.tournaments.find(t => t.code === code)
    
    if (!basicTournament) {
      console.log(`[Tournament Page] Tournament ${code} not found in 2025 tournaments`)
      notFound()
    }
    
    console.log(`[Tournament Page] Found basic tournament:`, basicTournament)
    
    let tournament: TournamentDetail
    
    if (!basicTournament.tournamentNo) {
      console.log(`[Tournament Page] No tournament number found for ${code}, using basic data`)
      // Fallback to basic tournament data
      tournament = {
        ...basicTournament,
        status: 'upcoming' as const,
        venue: undefined,
        description: undefined
      }
      console.log(`[Tournament Page] Using basic tournament data:`, tournament)
    } else {
      console.log(`[Tournament Page] Step 2: Fetching detailed data using tournament number ${basicTournament.tournamentNo}`)
      tournament = await fetchTournamentDetailByNumber(basicTournament.tournamentNo)
      console.log(`[Tournament Page] Enhanced tournament data:`, tournament)
    }
    
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