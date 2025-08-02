'use client'

/**
 * Tournament Results Tab Component
 * 
 * Updated to use Story 4.4 results components foundation.
 * Integrates with the new TournamentResults component system.
 * 
 * Features:
 * - Uses new results component architecture from Story 4.4
 * - Real VIS API integration with GetBeachTournamentRanking
 * - Consistent with tournament detail tab structure
 * - Mobile-responsive design with accessible touch targets
 * - Loading and empty state handling
 */

import React from 'react'
import { TournamentDetail } from '@/lib/types'
import TournamentResults from './results/TournamentResults'

interface TournamentResultsTabProps {
  tournament: TournamentDetail
}

export default function TournamentResultsTab({ tournament }: TournamentResultsTabProps) {
  return (
    <div className="space-y-4">
      <TournamentResults 
        tournamentCode={tournament.code}
        tournamentName={tournament.name}
      />
    </div>
  )
}