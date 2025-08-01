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
import { MockBeachMatch, MockBeachMatchDetail, getMockMatchDetail, formatDisplayDate } from '@/lib/mock-schedule-data'
import { Loader2 } from 'lucide-react'
import SetScoreDisplay from './SetScoreDisplay'
import MatchTiming from './MatchTiming'
import TeamInfo from './TeamInfo'
import CourtVenueInfo from './CourtVenueInfo'

interface MatchDetailDialogProps {
  match: MockBeachMatch | null
  isOpen: boolean
  onClose: () => void
}

export default function MatchDetailDialog({ match, isOpen, onClose }: MatchDetailDialogProps) {
  const [matchDetail, setMatchDetail] = useState<MockBeachMatchDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMatchDetail = useCallback(async (matchId: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const detail = await getMockMatchDetail(matchId)
      setMatchDetail(detail)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load match details. Please try again.'
      setError(errorMessage)
      console.error('Error fetching match detail:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

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