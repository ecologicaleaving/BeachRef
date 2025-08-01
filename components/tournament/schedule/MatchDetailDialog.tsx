'use client'

/**
 * Match Detail Dialog Component
 * 
 * Displays comprehensive match information in a modal dialog.
 * Shows set scores, match timing, team information, and court details.
 * 
 * Features:
 * - Responsive dialog layout for mobile and desktop
 * - Proper dialog accessibility with focus management
 * - ESC key handling and close button
 * - Comprehensive match data display
 * - Loading states during data fetching
 * - Error handling for failed data requests
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { BeachMatch, BeachMatchDetail } from '@/lib/types'
import { Loader2 } from 'lucide-react'
import SetScoreDisplay from './SetScoreDisplay'
import MatchTiming from './MatchTiming'
import TeamInfo from './TeamInfo'
import CourtVenueInfo from './CourtVenueInfo'

// Utility function for date formatting
function formatDisplayDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long', 
    day: 'numeric'
  })
}

interface MatchDetailDialogProps {
  match: BeachMatch | null
  isOpen: boolean
  onClose: () => void
  tournamentCode: string
}

export default function MatchDetailDialog({ match, isOpen, onClose, tournamentCode }: MatchDetailDialogProps) {
  const [matchDetail, setMatchDetail] = useState<BeachMatchDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMatchDetail = useCallback(async (matchId: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Story 4.3: Real VIS API integration for match details
      const response = await fetch(`/api/tournament/${tournamentCode}/matches/${matchId}`)
      
      if (!response.ok) {
        // Handle error responses gracefully
        const errorData = await response.json()
        if (response.status === 404) {
          throw new Error(`Match ${matchId} not found`)
        } else if (errorData.userMessage) {
          throw new Error(errorData.userMessage)
        } else {
          throw new Error(errorData.error || 'Failed to load match details')
        }
      }
      
      const data = await response.json()
      
      if (data.match) {
        setMatchDetail(data.match)
        
        // Log performance and data source for monitoring
        const responseTime = response.headers.get('X-Response-Time')
        const dataSource = response.headers.get('X-Data-Source')
        console.log(`Match detail loaded from ${dataSource} in ${responseTime}`)
        
        if (data.warning) {
          console.warn('Match detail warning:', data.warning)
        }
      } else {
        throw new Error('No match data received')
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load match details. Please try again.'
      setError(errorMessage)
      console.error('Error fetching match detail:', err)
    } finally {
      setIsLoading(false)
    }
  }, [tournamentCode])

  useEffect(() => {
    if (isOpen && match) {
      fetchMatchDetail(match.noInTournament)
    } else {
      // Reset state when dialog closes
      setMatchDetail(null)
      setError(null)
    }
  }, [isOpen, match, fetchMatchDetail])

  const handleClose = () => {
    onClose()
  }

  if (!match) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto sm:max-w-md md:max-w-lg lg:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Match Details - {match.teamAName} vs {match.teamBName}
          </DialogTitle>
          <DialogDescription>
            {matchDetail?.roundName || 'Tournament Match'} • {match.court} • {formatDisplayDate(match.localDate)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-gray-600">Loading match details...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 min-h-[48px] min-w-[48px]"
                onClick={() => fetchMatchDetail(match.noInTournament)}
              >
                Retry
              </Button>
            </div>
          )}

          {matchDetail && (
            <>
              <TeamInfo match={matchDetail} />
              <SetScoreDisplay match={matchDetail} />
              <MatchTiming match={matchDetail} />
              <CourtVenueInfo match={matchDetail} />
            </>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <div className="flex items-center text-sm text-gray-500">
            Match {match.noInTournament}
          </div>
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="min-h-[48px] min-w-[48px]"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}