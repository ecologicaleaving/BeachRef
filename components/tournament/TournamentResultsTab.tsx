'use client'

import { useState, useEffect, useCallback } from 'react'
import { BeachMatch, TournamentDetail } from '@/lib/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Trophy, TrendingUp } from 'lucide-react'
import MatchDetailDialog from './schedule/MatchDetailDialog'

interface TournamentResultsTabProps {
  tournament: TournamentDetail
}

// Utility function to calculate match winner from BeachMatch data
const calculateMatchWinner = (match: BeachMatch) => {
  // Use matchPointsA and matchPointsB which represent sets won
  if (match.matchPointsA > match.matchPointsB) {
    return {
      winner: match.teamAName,
      winnerSets: match.matchPointsA,
      loserSets: match.matchPointsB
    }
  } else if (match.matchPointsB > match.matchPointsA) {
    return {
      winner: match.teamBName,
      winnerSets: match.matchPointsB,
      loserSets: match.matchPointsA
    }
  } else {
    return {
      winner: '',
      winnerSets: 0,
      loserSets: 0
    }
  }
}

// Smart detection: determine if match is completed based on scores
const isMatchCompleted = (match: BeachMatch) => {
  return match.matchPointsA > 0 || match.matchPointsB > 0 || match.status === 'completed'
}

export default function TournamentResultsTab({ tournament }: TournamentResultsTabProps) {
  const [matches, setMatches] = useState<BeachMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<BeachMatch | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const openMatchDialog = (match: BeachMatch) => {
    setSelectedMatch(match)
    setIsDialogOpen(true)
  }

  const closeMatchDialog = () => {
    setIsDialogOpen(false)
    setSelectedMatch(null)
  }

  const fetchMatchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch match data from the same API endpoint as schedule
      const response = await fetch(`/api/tournament/${tournament.code}/schedule`)
      
      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 404) {
          throw new Error(`Tournament ${tournament.code} not found`)
        } else if (errorData.userMessage) {
          throw new Error(errorData.userMessage)
        } else {
          throw new Error(errorData.error || 'Failed to load tournament matches')
        }
      }
      
      const data = await response.json()
      setMatches(data.matches || [])
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load matches'
      setError(errorMessage)
      console.error('Error fetching match data for results:', err)
    } finally {
      setLoading(false)
    }
  }, [tournament.code])

  useEffect(() => {
    fetchMatchData()
  }, [fetchMatchData])


  // Use fetched match data
  const allMatches: BeachMatch[] = matches

  // Filter completed matches only using smart detection
  const completedMatches = allMatches.filter(match => isMatchCompleted(match))
  
  // Calculate progress
  const totalMatches = allMatches.length
  const completedCount = completedMatches.length
  const liveMatches = allMatches.filter(match => match.status === 'live').length
  const upcomingMatches = totalMatches - completedCount - liveMatches
  const completionPercentage = totalMatches > 0 ? Math.round((completedCount / totalMatches) * 100) : 0

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Tournament Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading tournament results...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Tournament Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Error loading results: {error}</p>
            <Button 
              variant="outline" 
              onClick={fetchMatchData}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (completedMatches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Tournament Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Results will be available as matches are completed.</p>
            <p className="text-sm mt-2">
              {totalMatches > 0 
                ? `${totalMatches} matches scheduled, ${liveMatches} in progress`
                : 'Check back during the tournament for live updates.'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Tournament Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tournament Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Matches Completed</span>
                  <span className="font-semibold">{completionPercentage}%</span>
                </div>
                <Progress value={completionPercentage} className="h-2 w-full" />
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{liveMatches}</div>
                  <div className="text-sm text-muted-foreground">Live</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-600">{upcomingMatches}</div>
                  <div className="text-sm text-muted-foreground">Upcoming</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Match Results ({completedMatches.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Teams</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Round</TableHead>
                    <TableHead>Court</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedMatches.map((match) => {
                    const { winner, winnerSets, loserSets } = calculateMatchWinner(match)

                    return (
                      <TableRow key={match.noInTournament}>
                        <TableCell>
                          <div className="font-medium">
                            {new Date(match.localDate).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {match.localTime}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className={`font-medium ${winner === match.teamAName ? 'text-green-600' : ''}`}>
                              {match.teamAName}
                            </div>
                            <div className="text-muted-foreground text-sm">vs</div>
                            <div className={`font-medium ${winner === match.teamBName ? 'text-green-600' : ''}`}>
                              {match.teamBName}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">
                            <Badge variant="outline" className="font-semibold">
                              {winnerSets}-{loserSets}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Sets: {match.matchPointsA}-{match.matchPointsB}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Match {match.noInTournament}</Badge>
                        </TableCell>
                        <TableCell>{match.court}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="min-h-[48px] min-w-[48px]"
                            onClick={() => openMatchDialog(match)}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <MatchDetailDialog 
        match={selectedMatch}
        isOpen={isDialogOpen}
        onClose={closeMatchDialog}
        tournamentCode={tournament.code}
      />
    </>
  )
}