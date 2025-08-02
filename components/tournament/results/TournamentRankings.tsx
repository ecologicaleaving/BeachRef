'use client'

/**
 * Tournament Rankings Component
 * 
 * Main rankings display container showing team positions, names, 
 * player information, and points earned.
 * 
 * Features:
 * - Rankings display with position indicators
 * - Team information with player names
 * - Confederation and points information
 * - Medal positions highlighting (1st, 2nd, 3rd)
 * - Responsive grid layout for mobile and desktop
 * - Expandable view for large tournaments
 */

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TournamentRanking } from '@/lib/types'
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react'
import TeamRankingCard from './TeamRankingCard'

interface TournamentRankingsProps {
  rankings: TournamentRanking[]
  tournamentCode: string
}

export default function TournamentRankings({ rankings, tournamentCode }: TournamentRankingsProps) {
  const [showAll, setShowAll] = useState(false)
  
  // Show top 10 by default, expand on demand for large tournaments
  const INITIAL_DISPLAY_COUNT = 10
  const shouldShowExpand = rankings.length > INITIAL_DISPLAY_COUNT
  const displayedRankings = showAll ? rankings : rankings.slice(0, INITIAL_DISPLAY_COUNT)
  
  // Sort rankings by position
  const sortedRankings = displayedRankings.sort((a, b) => a.rank - b.rank)
  
  // Separate by phases if both exist
  const mainDrawRankings = sortedRankings.filter(r => r.phase === 'mainDraw')
  const qualificationRankings = sortedRankings.filter(r => r.phase === 'qualification')
  
  const RankingSection = ({ 
    title, 
    rankings, 
    icon 
  }: { 
    title: string
    rankings: TournamentRanking[]
    icon?: React.ReactNode 
  }) => (
    <div className="space-y-4">
      {rankings.length > 0 && (
        <>
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
            {icon}
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <span className="text-sm text-gray-500">({rankings.length} teams)</span>
          </div>
          <div className="space-y-3">
            {rankings.map((ranking) => (
              <TeamRankingCard 
                key={ranking.noTeam} 
                ranking={ranking}
                tournamentCode={tournamentCode}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Tournament Rankings
          <span className="text-sm font-normal text-gray-500">
            ({rankings.length} teams)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Main Draw Rankings */}
          {mainDrawRankings.length > 0 && (
            <RankingSection 
              title="Main Draw Results"
              rankings={mainDrawRankings}
              icon={<Trophy className="h-5 w-5 text-purple-600" />}
            />
          )}
          
          {/* Qualification Rankings */}
          {qualificationRankings.length > 0 && (
            <RankingSection 
              title="Qualification Results"
              rankings={qualificationRankings}
              icon={<Trophy className="h-5 w-5 text-blue-600" />}
            />
          )}
          
          {/* Show More/Less Button */}
          {shouldShowExpand && (
            <div className="pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                onClick={() => setShowAll(!showAll)}
                className="w-full min-h-[48px] flex items-center gap-2"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show All Teams ({rankings.length})
                  </>
                )}
              </Button>
            </div>
          )}
          
          {/* Tournament Summary */}
          <div className="pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="font-semibold text-gray-900">
                  {rankings.filter(r => r.rank <= 3).length}
                </div>
                <div className="text-gray-600">Medal Positions</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  {rankings.filter(r => r.earnedPointsTeam > 0).length}
                </div>
                <div className="text-gray-600">Teams with Points</div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <div className="font-semibold text-gray-900">
                  {rankings.filter(r => r.confederationCode).length}
                </div>
                <div className="text-gray-600">Federations</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}