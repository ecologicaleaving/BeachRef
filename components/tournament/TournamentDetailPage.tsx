'use client'

import { TournamentDetail } from '@/lib/types'
import TournamentBreadcrumb from './TournamentBreadcrumb'
import TournamentHeader from './TournamentHeader'
import TournamentDetailTabs from './TournamentDetailTabs'
import TournamentMobileActions from './TournamentMobileActions'

interface TournamentDetailPageProps {
  tournament: TournamentDetail
}

export default function TournamentDetailPage({ tournament }: TournamentDetailPageProps) {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <TournamentBreadcrumb tournament={tournament} />
      <TournamentHeader tournament={tournament} />
      <TournamentDetailTabs tournament={tournament} />
      <TournamentMobileActions tournament={tournament} />
    </div>
  )
}