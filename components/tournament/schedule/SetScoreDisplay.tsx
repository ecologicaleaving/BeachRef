'use client'

/**
 * Set Score Display Component
 * 
 * Displays set-by-set score breakdown for beach volleyball matches.
 * Shows set scores with visual indicators for set winners.
 * 
 * Features:
 * - Clear set score display format (21-19, 21-17, 15-13)
 * - Visual indicators for set winners (green highlighting)
 * - Supports 2-set and 3-set match formats
 * - Set duration display for each set
 * - Responsive grid layout for mobile and desktop
 * - Handles matches without score data (scheduled/live matches)
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MockBeachMatchDetail } from '@/lib/mock-schedule-data'
import { Trophy, Clock } from 'lucide-react'

interface SetScoreDisplayProps {
  match: MockBeachMatchDetail
}

interface SetData {
  setNumber: number
  scoreA: number
  scoreB: number
  duration: string
  winner: 'A' | 'B' | null
}

export default function SetScoreDisplay({ match }: SetScoreDisplayProps) {
  // Don't show scores for scheduled matches
  if (match.status === 'scheduled') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Set Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-center py-4">
            Set scores will be available once the match begins.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Collect set data
  const sets: SetData[] = []
  
  // Set 1
  if (match.pointsTeamASet1 !== undefined && match.pointsTeamBSet1 !== undefined) {
    sets.push({
      setNumber: 1,
      scoreA: match.pointsTeamASet1,
      scoreB: match.pointsTeamBSet1,
      duration: match.durationSet1,
      winner: match.pointsTeamASet1 > match.pointsTeamBSet1 ? 'A' : 'B'
    })
  }
  
  // Set 2
  if (match.pointsTeamASet2 !== undefined && match.pointsTeamBSet2 !== undefined) {
    sets.push({
      setNumber: 2,
      scoreA: match.pointsTeamASet2,
      scoreB: match.pointsTeamBSet2,
      duration: match.durationSet2,
      winner: match.pointsTeamASet2 > match.pointsTeamBSet2 ? 'A' : 'B'
    })
  }
  
  // Set 3 (if exists)
  if (match.pointsTeamASet3 !== undefined && match.pointsTeamBSet3 !== undefined) {
    sets.push({
      setNumber: 3,
      scoreA: match.pointsTeamASet3,
      scoreB: match.pointsTeamBSet3,
      duration: match.durationSet3 || '0:00',
      winner: match.pointsTeamASet3 > match.pointsTeamBSet3 ? 'A' : 'B'
    })
  }

  if (sets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Set Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-center py-4">
            No set scores available for this match.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Set Scores
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sets.map((set) => (
            <Card key={set.setNumber} className="border-2 border-gray-100">
              <CardContent className="p-4">
                <div className="text-center mb-3">
                  <h4 className="font-semibold text-gray-900">
                    Set {set.setNumber}
                  </h4>
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mt-1">
                    <Clock className="h-3 w-3" />
                    <span>{set.duration}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {/* Team A Score */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 truncate">
                      {match.teamAName}
                    </div>
                    <div className={`text-lg font-bold px-2 py-1 rounded ${
                      set.winner === 'A' 
                        ? 'bg-green-100 text-green-800' 
                        : 'text-gray-700'
                    }`}>
                      {set.scoreA}
                    </div>
                  </div>
                  
                  {/* Team B Score */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 truncate">
                      {match.teamBName}
                    </div>
                    <div className={`text-lg font-bold px-2 py-1 rounded ${
                      set.winner === 'B' 
                        ? 'bg-green-100 text-green-800' 
                        : 'text-gray-700'
                    }`}>
                      {set.scoreB}
                    </div>
                  </div>
                </div>
                
                {/* Set Winner Badge */}
                <div className="text-center mt-3">
                  <Badge 
                    variant="secondary" 
                    className="bg-green-50 text-green-700 border-green-200"
                  >
                    {set.winner === 'A' ? match.teamAName : match.teamBName} wins
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Match Summary */}
        {match.status === 'completed' && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-800 rounded-lg">
              <Trophy className="h-4 w-4" />
              <span className="font-semibold">
                Final Score: {match.matchPointsA} - {match.matchPointsB}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}