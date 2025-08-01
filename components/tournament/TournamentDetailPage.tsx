'use client'

import { TournamentDetail } from '@/lib/types'
import TournamentBreadcrumb from './TournamentBreadcrumb'
import TournamentHeader from './TournamentHeader'
import TournamentDetailTabs from './TournamentDetailTabs'
import TournamentMobileActions from './TournamentMobileActions'
import FloatingNavigationButton from './FloatingNavigationButton'

interface TournamentDetailPageProps {
  tournament: TournamentDetail
}

export default function TournamentDetailPage({ tournament }: TournamentDetailPageProps) {
  // Defensive programming: validate tournament data
  if (!tournament) {
    console.error('[TournamentDetailPage] Tournament data is null or undefined')
    throw new Error('Tournament data is required but was not provided')
  }

  if (!tournament.code || !tournament.name) {
    console.error('[TournamentDetailPage] Tournament data is missing required fields:', tournament)
    throw new Error('Tournament data is incomplete - missing required fields')
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6" key={tournament.code}>
      <TournamentBreadcrumb tournament={tournament} />
      <TournamentHeader tournament={tournament} />
      <TournamentDetailTabs tournament={tournament} />
      <TournamentMobileActions tournament={tournament} />
      <FloatingNavigationButton />
    </div>
  )
}