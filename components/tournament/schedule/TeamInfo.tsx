'use client'

/**
 * Team Info Component
 * 
 * Displays comprehensive team information including names, seeding,
 * confederation, and tournament statistics.
 * 
 * Features:
 * - Team names and player details
 * - Seeding information and tournament ranking
 * - Confederation and federation information
 * - Tournament performance data
 * - Responsive grid layout for mobile and desktop
 * - Visual team comparison layout
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MockBeachMatchDetail } from '@/lib/mock-schedule-data'
import { Users, Trophy, Globe, TrendingUp } from 'lucide-react'

interface TeamInfoProps {
  match: MockBeachMatchDetail
}

interface TeamData {
  name: string
  seed?: number
  confederation?: string
  ranking?: number
  isWinner: boolean
}

export default function TeamInfo({ match }: TeamInfoProps) {
  const isCompleted = match.status === 'completed'
  const matchWinner = isCompleted && match.matchPointsA > match.matchPointsB ? 'A' : 
                     isCompleted && match.matchPointsB > match.matchPointsA ? 'B' : null

  const teamA: TeamData = {
    name: match.teamAName,
    seed: match.teamASeed,
    confederation: match.teamAConfederation,
    ranking: match.teamARanking,
    isWinner: matchWinner === 'A'
  }

  const teamB: TeamData = {
    name: match.teamBName,
    seed: match.teamBSeed,
    confederation: match.teamBConfederation,
    ranking: match.teamBRanking,
    isWinner: matchWinner === 'B'
  }

  const formatSeed = (seed?: number) => {
    if (!seed) return 'Unseeded'
    return `#${seed}`
  }

  const formatRanking = (ranking?: number) => {
    if (!ranking) return 'Unranked'
    return `#${ranking}`
  }

  const TeamCard = ({ team, side }: { team: TeamData; side: 'A' | 'B' }) => (
    <Card className={`${team.isWinner ? 'ring-2 ring-green-200 bg-green-50' : ''}`}>
      <CardContent className="p-4">
        <div className="text-center space-y-3">
          {/* Winner Badge */}
          {team.isWinner && (
            <div className="flex justify-center">
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <Trophy className="h-3 w-3 mr-1" />
                Winner
              </Badge>
            </div>
          )}

          {/* Team Name */}
          <div>
            <h3 className={`text-lg font-semibold ${team.isWinner ? 'text-green-800' : 'text-gray-900'}`}>
              {team.name}
            </h3>
            <p className="text-sm text-gray-600">Team {side}</p>
          </div>

          {/* Team Stats Grid */}
          <div className="space-y-2 text-sm">
            {/* Seeding */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Seed:
              </span>
              <Badge variant="outline" className="text-xs">
                {formatSeed(team.seed)}
              </Badge>
            </div>

            {/* World Ranking */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                Ranking:
              </span>
              <Badge variant="outline" className="text-xs">
                {formatRanking(team.ranking)}
              </Badge>
            </div>

            {/* Confederation */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Federation:
              </span>
              <Badge variant="secondary" className="text-xs">
                {team.confederation || 'Unknown'}
              </Badge>
            </div>
          </div>

          {/* Match Performance */}
          {isCompleted && (
            <div className="pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Sets Won:</span>
                  <span className="font-medium">
                    {side === 'A' ? match.matchPointsA : match.matchPointsB}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          <TeamCard team={teamA} side="A" />
          
          {/* VS Divider */}
          <div className="hidden md:flex items-center justify-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-12 h-12 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-sm font-bold text-gray-600">VS</span>
            </div>
          </div>
          
          <TeamCard team={teamB} side="B" />
        </div>

        {/* Match Context */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <p className="text-gray-600">Round</p>
              <p className="font-medium">{match.roundName}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">Phase</p>
              <Badge variant="outline" className="capitalize">
                {match.phase.replace(/([A-Z])/g, ' $1').trim()}
              </Badge>
            </div>
            <div className="text-center">
              <p className="text-gray-600">Match Number</p>
              <p className="font-medium">{match.noInTournament}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}