'use client'

/**
 * Tournament Schedule Component
 * 
 * Main container for tournament match schedule display.
 * Handles data fetching, loading states, and empty states.
 * 
 * Features:
 * - Data fetching with loading and error states
 * - Schedule organization by day using ScheduleByDay component
 * - Empty state handling for tournaments without matches
 * - Mobile-responsive design
 * - Error handling with retry functionality
 */

import React, { useState, useEffect, useCallback } from 'react'
import { MockBeachMatch, getMockScheduleData } from '@/lib/mock-schedule-data'
import ScheduleByDay from './ScheduleByDay'
import TournamentScheduleSkeleton from './TournamentScheduleSkeleton'
import EmptySchedule from './EmptySchedule'

interface TournamentScheduleProps {
  tournamentCode: string
  tournamentName?: string
  className?: string
}

export default function TournamentSchedule({ 
  tournamentCode, 
  tournamentName,
  className = '' 
}: TournamentScheduleProps) {
  const [matches, setMatches] = useState<MockBeachMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchScheduleData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // In Story 4.3, this will be replaced with real VIS API call
      const scheduleData = await getMockScheduleData(tournamentCode)
      setMatches(scheduleData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule')
      console.error('Error fetching schedule data:', err)
    } finally {
      setLoading(false)
    }
  }, [tournamentCode])

  useEffect(() => {
    fetchScheduleData()
  }, [fetchScheduleData])

  const handleRetry = () => {
    fetchScheduleData()
  }

  if (loading) {
    return (
      <div className={className}>
        <TournamentScheduleSkeleton 
          dayCount={3}
          matchesPerDay={4}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <EmptySchedule 
          type="loading-error"
          tournamentName={tournamentName}
          onRetry={handleRetry}
        />
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className={className}>
        <EmptySchedule 
          type="no-matches"
          tournamentName={tournamentName}
        />
      </div>
    )
  }

  return (
    <div className={className}>
      <ScheduleByDay 
        matches={matches}
        defaultOpenDays={[]} // Let ScheduleByDay determine default
      />
    </div>
  )
}