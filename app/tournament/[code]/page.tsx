import { notFound } from 'next/navigation'
import { TournamentDetail } from '@/lib/types'
import TournamentDetailPage from '@/components/tournament/TournamentDetailPage'

interface TournamentPageProps {
  params: {
    code: string
  }
}

async function fetchTournamentDetail(code: string): Promise<TournamentDetail> {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000'
  
  const response = await fetch(`${baseUrl}/api/tournament/${code}`, {
    next: { revalidate: 300 } // 5-minute cache
  })

  if (!response.ok) {
    if (response.status === 404) {
      notFound()
    }
    throw new Error(`Failed to fetch tournament: ${response.status}`)
  }

  return await response.json()
}

export default async function TournamentPage({ params }: TournamentPageProps) {
  const tournament = await fetchTournamentDetail(params.code)

  return <TournamentDetailPage tournament={tournament} />
}

export async function generateMetadata({ params }: TournamentPageProps) {
  try {
    const tournament = await fetchTournamentDetail(params.code)
    
    return {
      title: `${tournament.name} - BeachRef`,
      description: `Tournament details for ${tournament.name} in ${tournament.countryCode}`,
    }
  } catch {
    return {
      title: 'Tournament Not Found - BeachRef',
      description: 'Tournament details not available',
    }
  }
}