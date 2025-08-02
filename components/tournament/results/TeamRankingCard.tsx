'use client'

/**
 * Team Ranking Card Component
 * 
 * Individual team ranking card showing position, team names, 
 * player information, confederation, and points earned.
 * 
 * Features:
 * - Medal positions highlighting (1st, 2nd, 3rd)
 * - Team names and player composition
 * - Confederation code and points information
 * - Prize money display (if available)
 * - Responsive design with proper touch targets
 * - Accessibility support with proper ARIA labels
 */

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TournamentRanking } from '@/lib/types'
import { Trophy, Users, Award, Globe, TrendingUp } from 'lucide-react'

interface TeamRankingCardProps {
  ranking: TournamentRanking
  tournamentCode: string
  className?: string
}

export default function TeamRankingCard({ 
  ranking, 
  tournamentCode,
  className = '' 
}: TeamRankingCardProps) {
  
  // Determine medal class and icon based on position
  const getMedalInfo = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          badgeClass: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-yellow-500',
          iconColor: 'text-yellow-600',
          bgClass: 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200',
          icon: <Award className="h-4 w-4" />
        }
      case 2:
        return {
          badgeClass: 'bg-gradient-to-r from-gray-400 to-gray-600 text-white border-gray-500',
          iconColor: 'text-gray-600',
          bgClass: 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200',
          icon: <Award className="h-4 w-4" />
        }
      case 3:
        return {
          badgeClass: 'bg-gradient-to-r from-amber-600 to-amber-800 text-white border-amber-700',
          iconColor: 'text-amber-700',
          bgClass: 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200',
          icon: <Award className="h-4 w-4" />
        }
      default:
        return {
          badgeClass: 'bg-gray-100 text-gray-700 border-gray-300',
          iconColor: 'text-gray-600',
          bgClass: '',
          icon: <Trophy className="h-4 w-4" />
        }
    }
  }

  const medalInfo = getMedalInfo(ranking.rank)
  const isMedalPosition = ranking.rank <= 3

  return (
    <Card 
      className={`transition-all duration-200 hover:shadow-md ${isMedalPosition ? medalInfo.bgClass : ''} ${className}`}
      role="article"
      aria-label={`Team ranking ${ranking.rank}: ${ranking.teamName}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Rank Badge */}
          <div className="flex-shrink-0">
            <Badge 
              variant="outline" 
              className={`text-lg font-bold flex items-center gap-1 ${medalInfo.badgeClass}`}
            >
              {medalInfo.icon}
              #{ranking.rank}
            </Badge>
          </div>

          {/* Team Information */}
          <div className="flex-1 min-w-0">
            {/* Team Name */}
            <h3 className={`font-semibold text-lg truncate ${isMedalPosition ? 'text-gray-900' : 'text-gray-800'}`}>
              {ranking.teamName}
            </h3>
            
            {/* Player Names */}
            <div className="flex items-center gap-1 mt-1">
              <Users className="h-3 w-3 text-gray-500 flex-shrink-0" />
              <p className="text-sm text-gray-600 truncate">
                {ranking.player1Name} / {ranking.player2Name}
              </p>
            </div>
            
            {/* Confederation and Points */}
            <div className="flex items-center gap-4 mt-2">
              {ranking.confederationCode && (
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3 text-gray-500" />
                  <Badge variant="secondary" className="text-xs">
                    {ranking.confederationCode}
                  </Badge>
                </div>
              )}
              
              {ranking.earnedPointsTeam > 0 && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-600">
                    {ranking.earnedPointsTeam} pts
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Prize Money (if available) */}
          {ranking.earningsTeam && ranking.earningsTeam > 0 && (
            <div className="flex-shrink-0 text-right">
              <div className="text-sm text-gray-600">Prize</div>
              <div className="font-semibold text-green-600">
                ${ranking.earningsTeam.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Additional Information for Medal Positions */}
        {isMedalPosition && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-center">
              <Badge 
                variant="outline" 
                className={`${medalInfo.badgeClass} flex items-center gap-1`}
              >
                <Trophy className="h-3 w-3" />
                {ranking.rank === 1 ? 'Gold Medal' : 
                 ranking.rank === 2 ? 'Silver Medal' : 
                 'Bronze Medal'}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}