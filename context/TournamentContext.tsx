'use client'

/**
 * Tournament Context
 * 
 * Shared tournament state management for cross-tab data consistency.
 * Provides tournament details, schedule data, and results data to all tabs.
 * 
 * Features:
 * - Centralized tournament state management
 * - Cross-tab data synchronization
 * - Consistent tournament information across all tabs
 * - Error state management
 * - Data refresh capabilities
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { TournamentDetail, BeachMatch, TournamentRanking } from '@/lib/types'

interface TournamentContextValue {
  tournamentDetail: TournamentDetail | null
  scheduleData: BeachMatch[] | null
  resultsData: TournamentRanking[] | null
  isLoading: boolean
  error: string | null
  refreshTournamentData: () => Promise<void>
  setScheduleData: (data: BeachMatch[]) => void
  setResultsData: (data: TournamentRanking[]) => void
}

const TournamentContext = createContext<TournamentContextValue | undefined>(undefined)

interface TournamentProviderProps {
  children: ReactNode
  tournamentCode: string
  initialTournamentDetail: TournamentDetail
}

export function TournamentProvider({ 
  children, 
  tournamentCode, 
  initialTournamentDetail 
}: TournamentProviderProps) {
  const [tournamentDetail, setTournamentDetail] = useState<TournamentDetail | null>(initialTournamentDetail)
  const [scheduleData, setScheduleData] = useState<BeachMatch[] | null>(null)
  const [resultsData, setResultsData] = useState<TournamentRanking[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshTournamentData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Refresh tournament detail if needed
      const detailResponse = await fetch(`/api/tournament/${tournamentCode}`)
      if (detailResponse.ok) {
        const detailData = await detailResponse.json()
        setTournamentDetail(detailData)
      }
    } catch (err) {
      console.error('Error refreshing tournament data:', err)
      setError('Failed to refresh tournament data')
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize tournament detail if not provided
  useEffect(() => {
    if (!tournamentDetail && tournamentCode) {
      refreshTournamentData()
    }
  }, [tournamentCode, tournamentDetail])

  const contextValue: TournamentContextValue = {
    tournamentDetail,
    scheduleData,
    resultsData,
    isLoading,
    error,
    refreshTournamentData,
    setScheduleData,
    setResultsData
  }

  return (
    <TournamentContext.Provider value={contextValue}>
      {children}
    </TournamentContext.Provider>
  )
}

export function useTournament() {
  const context = useContext(TournamentContext)
  if (context === undefined) {
    throw new Error('useTournament must be used within a TournamentProvider')
  }
  return context
}