'use client'

/**
 * Match Card Component
 * 
 * Displays individual match information in a card format.
 * Shows team names, court assignment, match timing, and status.
 * 
 * Features:
 * - Mobile-responsive design with 48px touch targets
 * - Team vs team display with clear visual hierarchy
 * - Court and time information prominently displayed
 * - Status indicator integration
 * - Hover effects for better interactivity
 * - Accessibility support with proper ARIA labels
 */

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Clock } from 'lucide-react'
import { BeachMatch } from '@/lib/types'
import MatchStatus from './MatchStatus'

interface MatchCardProps {
  match: BeachMatch
  className?: string
  onMatchClick?: (match: BeachMatch) => void
}

export default function MatchCard({ match, className = '', onMatchClick }: MatchCardProps) {
  const handleClick = () => {
    onMatchClick?.(match)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
    }
  }

  // Smart detection: if scores exist, treat as completed
  const hasScores = match.matchPointsA > 0 || match.matchPointsB > 0
  const actualStatus = hasScores ? 'completed' : match.status
  const isCompleted = actualStatus === 'completed'

  return (
    <Card 
      className={`hover:shadow-md transition-shadow duration-200 cursor-pointer ${className}`}
      role="button"
      tabIndex={0}
      aria-label={`View details for match ${match.noInTournament}: ${match.teamAName} vs ${match.teamBName}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Match Details */}
          <div className="flex-1 min-w-0">
            {/* Time and Court Info */}
            <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span className="font-medium">{match.localTime}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                <span>{match.court}</span>
              </div>
              <div className="text-xs text-gray-500">
                {match.noInTournament}
              </div>
            </div>

            {/* Team Matchup */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className={`font-semibold truncate ${
                    isCompleted && match.matchPointsA > match.matchPointsB 
                      ? 'text-green-700' 
                      : 'text-gray-900'
                  }`}>
                    {match.teamAName}
                  </div>
                </div>
                {isCompleted && (
                  <div className={`text-lg font-bold ${
                    match.matchPointsA > match.matchPointsB 
                      ? 'text-green-700' 
                      : 'text-gray-600'
                  }`}>
                    {match.matchPointsA}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-center">
                <div className="text-sm text-gray-500 font-medium">
                  {isCompleted ? '-' : 'vs'}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className={`font-semibold truncate ${
                    isCompleted && match.matchPointsB > match.matchPointsA 
                      ? 'text-green-700' 
                      : 'text-gray-900'
                  }`}>
                    {match.teamBName}
                  </div>
                </div>
                {isCompleted && (
                  <div className={`text-lg font-bold ${
                    match.matchPointsB > match.matchPointsA 
                      ? 'text-green-700' 
                      : 'text-gray-600'
                  }`}>
                    {match.matchPointsB}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex-shrink-0">
            <MatchStatus status={actualStatus} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}