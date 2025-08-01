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
import { BeachMatch } from '@/lib/types'
import ScheduleByDay from './ScheduleByDay'
import TournamentScheduleSkeleton from './TournamentScheduleSkeleton'
import EmptySchedule from './EmptySchedule'
import MatchDetailDialog from './MatchDetailDialog'

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
  const [matches, setMatches] = useState<BeachMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<BeachMatch | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const fetchScheduleData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Story 4.3: Real VIS API integration
      const response = await fetch(`/api/tournament/${tournamentCode}/schedule`)
      
      if (!response.ok) {
        // Handle error responses gracefully
        const errorData = await response.json()
        if (response.status === 404) {
          throw new Error(`Tournament ${tournamentCode} not found`)
        } else if (errorData.userMessage) {
          throw new Error(errorData.userMessage)
        } else {
          throw new Error(errorData.error || 'Failed to load tournament schedule')
        }
      }
      
      const data = await response.json()
      setMatches(data.matches || [])
      
      // Log performance for monitoring
      if (data.cached) {
        console.log(`Tournament schedule loaded from cache in ${response.headers.get('X-Response-Time')}`)
      } else {
        console.log(`Tournament schedule loaded from API in ${response.headers.get('X-Response-Time')}`)
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load schedule'
      setError(errorMessage)
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

  const handleMatchClick = (match: BeachMatch) => {
    setSelectedMatch(match)
    setIsDialogOpen(true)
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setSelectedMatch(null)
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
        onMatchClick={handleMatchClick}
      />
      
      <MatchDetailDialog
        match={selectedMatch}
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        tournamentCode={tournamentCode}
      />
    </div>
  )
}