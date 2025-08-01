'use client'

import { useState } from 'react'
import { Match, TournamentDetail } from '@/lib/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Trophy, TrendingUp } from 'lucide-react'
import MatchDetailDialog from './MatchDetailDialog'

interface TournamentResultsTabProps {
  tournament: TournamentDetail
  matches?: Match[]
}

// Utility function to calculate match winner
const calculateMatchWinner = (match: Match) => {
  if (!match.result) {
    return { winner: '', winnerSets: 0, loserSets: 0 }
  }

  const team1Sets = [
    match.result.set1.team1 > match.result.set1.team2 ? 1 : 0,
    match.result.set2.team1 > match.result.set2.team2 ? 1 : 0,
    match.result.set3 ? (match.result.set3.team1 > match.result.set3.team2 ? 1 : 0) : 0
  ].reduce((a, b) => a + b, 0)
  
  const team2Sets = [
    match.result.set1.team2 > match.result.set1.team1 ? 1 : 0,
    match.result.set2.team2 > match.result.set2.team1 ? 1 : 0,
    match.result.set3 ? (match.result.set3.team2 > match.result.set3.team1 ? 1 : 0) : 0
  ].reduce((a, b) => a + b, 0)
  
  if (team1Sets > team2Sets) {
    return {
      winner: match.team1,
      winnerSets: team1Sets,
      loserSets: team2Sets
    }
  } else {
    return {
      winner: match.team2,
      winnerSets: team2Sets,
      loserSets: team1Sets
    }
  }
}

export default function TournamentResultsTab({ tournament, matches }: TournamentResultsTabProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const openMatchDialog = (match: Match) => {
    setSelectedMatch(match)
    setIsDialogOpen(true)
  }

  const closeMatchDialog = () => {
    setIsDialogOpen(false)
    setSelectedMatch(null)
  }


  // Generate sample data if no matches provided (for now)
  const sampleMatches: Match[] = matches || [
    {
      id: '1',
      date: '2025-01-15',
      time: '09:00',
      team1: 'Team USA A',
      team2: 'Team BRA A',
      status: 'completed',
      court: 'Court 1',
      round: 'Pool A',
      result: {
        set1: { team1: 21, team2: 19 },
        set2: { team1: 21, team2: 16 }
      }
    },
    {
      id: '2',
      date: '2025-01-15',
      time: '10:30',
      team1: 'Team GER A',
      team2: 'Team FRA A',
      status: 'completed',
      court: 'Court 2',
      round: 'Pool A',
      result: {
        set1: { team1: 18, team2: 21 },
        set2: { team1: 21, team2: 19 },
        set3: { team1: 13, team2: 15 }
      }
    },
    {
      id: '3',
      date: '2025-01-16',
      time: '14:00',
      team1: 'Team NOR A',
      team2: 'Team POL A',
      status: 'completed',
      court: 'Court 1',
      round: 'Pool B',
      result: {
        set1: { team1: 21, team2: 12 },
        set2: { team1: 21, team2: 18 }
      }
    }
  ]

  // Filter completed matches only
  const completedMatches = sampleMatches.filter(match => match.status === 'completed')
  
  // Calculate progress
  const totalMatches = sampleMatches.length + 3 // Assume some upcoming matches
  const completedCount = completedMatches.length
  const completionPercentage = Math.round((completedCount / totalMatches) * 100)

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
            <p className="text-sm mt-2">Check back during the tournament for live updates.</p>
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
                  <div className="text-2xl font-bold text-orange-600">1</div>
                  <div className="text-sm text-muted-foreground">Live</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-600">{totalMatches - completedCount - 1}</div>
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
                      <TableRow key={match.id}>
                        <TableCell>
                          <div className="font-medium">
                            {new Date(match.date).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {match.time}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className={`font-medium ${winner === match.team1 ? 'text-green-600' : ''}`}>
                              {match.team1}
                            </div>
                            <div className="text-muted-foreground text-sm">vs</div>
                            <div className={`font-medium ${winner === match.team2 ? 'text-green-600' : ''}`}>
                              {match.team2}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">
                            <Badge variant="outline" className="font-semibold">
                              {winnerSets}-{loserSets}
                            </Badge>
                          </div>
                          {match.result && (
                            <div className="text-xs text-muted-foreground mt-1">
                              ({match.result.set1.team1}-{match.result.set1.team2}, {match.result.set2.team1}-{match.result.set2.team2}
                              {match.result.set3 && `, ${match.result.set3.team1}-${match.result.set3.team2}`})
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{match.round}</Badge>
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
      />
    </>
  )
}