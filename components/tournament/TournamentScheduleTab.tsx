'use client'

/**
 * Tournament Schedule Tab Component
 * 
 * Updated to use Story 4.1 schedule components foundation.
 * Integrates with the new TournamentSchedule component system.
 * 
 * Features:
 * - Uses new schedule component architecture from Story 4.1
 * - Mock data integration (will be replaced with VIS API in Story 4.3)
 * - Consistent with tournament detail tab structure
 * - Mobile-responsive design with accessible touch targets
 * - Loading and empty state handling
 */

import React from 'react'
import { TournamentDetail } from '@/lib/types'
import TournamentSchedule from './schedule/TournamentSchedule'

interface TournamentScheduleTabProps {
  tournament: TournamentDetail
}

export default function TournamentScheduleTab({ tournament }: TournamentScheduleTabProps) {
  return (
    <div className="space-y-4">
      <TournamentSchedule 
        tournamentCode={tournament.code}
        tournamentName={tournament.name}
      />
    </div>
  )
}