'use client'

/**
 * Tournament Results Component
 * 
 * Main container for tournament results display including rankings,
 * progress tracking, and completed matches.
 * 
 * Features:
 * - Data fetching with loading and error states
 * - Tournament rankings with team information
 * - Progress indicator showing completion percentage
 * - Integration with existing error handling patterns
 * - Mobile-responsive design
 */

import React, { useState, useEffect, useCallback } from 'react'
import { TournamentRanking } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trophy, AlertCircle } from 'lucide-react'
import TournamentProgress from './TournamentProgress'
import TournamentRankings from './TournamentRankings'
import EmptyResults from './EmptyResults'
import TournamentResultsSkeleton from './TournamentResultsSkeleton'

interface TournamentResultsProps {
  tournamentCode: string
  tournamentName?: string
  className?: string
}

export default function TournamentResults({ 
  tournamentCode, 
  tournamentName,
  className = '' 
}: TournamentResultsProps) {
  const [rankings, setRankings] = useState<TournamentRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchResultsData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/tournament/${tournamentCode}/results`)
      
      if (!response.ok) {
        // Handle error responses gracefully
        const errorData = await response.json()
        if (response.status === 404) {
          throw new Error(`Tournament ${tournamentCode} results not found`)
        } else if (errorData.userMessage) {
          throw new Error(errorData.userMessage)
        } else {
          throw new Error(errorData.error || 'Failed to load tournament results')
        }
      }
      
      const data = await response.json()
      setRankings(data.rankings || [])
      
      // Log performance for monitoring
      if (data.cached) {
        console.log(`Tournament results loaded from cache in ${response.headers.get('X-Response-Time')}`)
      } else {
        console.log(`Tournament results loaded from API in ${response.headers.get('X-Response-Time')}`)
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load results'
      setError(errorMessage)
      console.error('Error fetching results data:', err)
    } finally {
      setLoading(false)
    }
  }, [tournamentCode])

  useEffect(() => {
    fetchResultsData()
  }, [fetchResultsData])

  const handleRetry = () => {
    fetchResultsData()
  }

  if (loading) {
    return (
      <div className={className}>
        <TournamentResultsSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Error Loading Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button 
                variant="outline" 
                onClick={handleRetry}
                className="min-h-[48px]"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (rankings.length === 0) {
    return (
      <div className={className}>
        <EmptyResults 
          tournamentName={tournamentName} 
          onRetry={handleRetry}
        />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <TournamentProgress 
        rankings={rankings}
        tournamentCode={tournamentCode}
      />
      <TournamentRankings 
        rankings={rankings}
        tournamentCode={tournamentCode}
      />
    </div>
  )
}