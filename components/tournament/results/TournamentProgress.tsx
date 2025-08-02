'use client'

/**
 * Tournament Progress Component
 * 
 * Displays tournament completion progress using shadcn Progress component.
 * Shows completion percentage, phase indicators, and tournament status.
 * 
 * Features:
 * - Tournament completion percentage calculation
 * - Visual progress bar with shadcn Progress component
 * - Phase indicators (qualification, main draw, finals)
 * - Tournament status information
 * - Mobile-responsive design
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { TournamentRanking } from '@/lib/types'
import { TrendingUp, Trophy, Users, Calendar } from 'lucide-react'

interface TournamentProgressProps {
  rankings: TournamentRanking[]
  tournamentCode: string
}

export default function TournamentProgress({ rankings, tournamentCode }: TournamentProgressProps) {
  const [scheduleData, setScheduleData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch schedule data to calculate completion percentage
    const fetchScheduleData = async () => {
      try {
        const response = await fetch(`/api/tournament/${tournamentCode}/schedule`)
        if (response.ok) {
          const data = await response.json()
          setScheduleData(data)
        }
      } catch (error) {
        console.error('Failed to fetch schedule data for progress:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchScheduleData()
  }, [tournamentCode])

  // Calculate tournament statistics
  const totalTeams = rankings.length
  const mainDrawTeams = rankings.filter(r => r.phase === 'mainDraw').length
  const qualificationTeams = rankings.filter(r => r.phase === 'qualification').length
  
  // Calculate completion percentage based on schedule data
  let completionPercentage = 0
  let totalMatches = 0
  let completedMatches = 0
  
  if (scheduleData && scheduleData.matches) {
    totalMatches = scheduleData.matches.length
    completedMatches = scheduleData.matches.filter((match: any) => 
      match.matchPointsA > 0 || match.matchPointsB > 0 || match.status === 'completed'
    ).length
    completionPercentage = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0
  }

  const isCompleted = completionPercentage === 100
  const hasRankings = rankings.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Tournament Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Tournament Completion</span>
              <span className="text-sm font-semibold">
                {loading ? '...' : `${completionPercentage}%`}
              </span>
            </div>
            <Progress 
              value={loading ? 0 : completionPercentage} 
              className="h-3 w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Started</span>
              <span className={isCompleted ? 'text-green-600 font-medium' : ''}>
                {isCompleted ? 'Completed' : 'In Progress'}
              </span>
            </div>
          </div>

          {/* Tournament Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {loading ? '...' : totalMatches}
              </div>
              <div className="text-sm text-gray-600">Total Matches</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {loading ? '...' : completedMatches}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {totalTeams}
              </div>
              <div className="text-sm text-gray-600">Teams</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {mainDrawTeams}
              </div>
              <div className="text-sm text-gray-600">Main Draw</div>
            </div>
          </div>

          {/* Phase Information */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Tournament Phases
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {qualificationTeams > 0 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Qualification</span>
                  </div>
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                    {qualificationTeams} teams
                  </Badge>
                </div>
              )}
              
              {mainDrawTeams > 0 && (
                <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">Main Draw</span>
                  </div>
                  <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                    {mainDrawTeams} teams
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Tournament Status */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-600">Status:</span>
              </div>
              <Badge 
                variant={isCompleted ? "default" : "secondary"}
                className={isCompleted ? "bg-green-100 text-green-800 border-green-200" : ""}
              >
                {loading ? 'Loading...' : 
                 isCompleted ? 'Tournament Completed' :
                 hasRankings ? 'Results Available' : 'In Progress'}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}