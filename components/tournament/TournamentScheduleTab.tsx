'use client'

import { useState, useMemo } from 'react'
import { Match, TournamentDetail } from '@/lib/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Clock, Calendar } from 'lucide-react'
import MatchDetailDialog from './MatchDetailDialog'

interface TournamentScheduleTabProps {
  tournament: TournamentDetail
  matches?: Match[]
}

export default function TournamentScheduleTab({ tournament, matches }: TournamentScheduleTabProps) {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusVariant = (status: Match['status']) => {
    switch (status) {
      case 'live':
        return 'destructive'
      case 'completed':
        return 'default'
      default:
        return 'outline'
    }
  }

  // Generate sample data if no matches provided (for now)
  const sampleMatches: Match[] = useMemo(() => matches || [
    {
      id: '1',
      date: '2025-01-15',
      time: '09:00',
      team1: 'Team USA A',
      team2: 'Team BRA A',
      status: 'scheduled',
      court: 'Court 1',
      round: 'Pool A'
    },
    {
      id: '2',
      date: '2025-01-15',
      time: '10:30',
      team1: 'Team GER A',
      team2: 'Team FRA A',
      status: 'scheduled',
      court: 'Court 2',
      round: 'Pool A'
    },
    {
      id: '3',
      date: '2025-01-16',
      time: '14:00',
      team1: 'Team USA A',
      team2: 'Team GER A',
      status: 'completed',
      court: 'Court 1',
      round: 'Pool A',
      result: {
        set1: { team1: 21, team2: 19 },
        set2: { team1: 21, team2: 16 }
      }
    }
  ], [matches])

  // Group matches by date (memoized for performance)
  const { groupedMatches, sortedDates } = useMemo(() => {
    const grouped = sampleMatches.reduce((acc, match) => {
      const date = match.date
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(match)
      return acc
    }, {} as Record<string, Match[]>)

    const sorted = Object.keys(grouped).sort()
    
    return {
      groupedMatches: grouped,
      sortedDates: sorted
    }
  }, [sampleMatches])

  if (!matches && sampleMatches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tournament Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Schedule information will be available when tournament details are loaded.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tournament Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {sortedDates.map((date) => {
              const dayMatches = groupedMatches[date]
              return (
                <AccordionItem key={date} value={date} className="border border-border rounded-lg mb-2">
                  <AccordionTrigger className="hover:no-underline px-4 py-3 [&[data-state=open]]:border-b">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="font-semibold text-left">{formatDate(date)}</span>
                      </div>
                      <Badge variant="outline" className="ml-2 min-w-[80px] justify-center">
                        {dayMatches.length} matches
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-3">
                    <div className="overflow-x-auto">
                      <Table className="min-w-[600px] md:min-w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Teams</TableHead>
                            <TableHead>Court</TableHead>
                            <TableHead>Round</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dayMatches.map((match) => (
                            <TableRow key={match.id}>
                              <TableCell className="font-medium">{match.time}</TableCell>
                              <TableCell>
                                <div className="font-medium">
                                  {match.team1} <span className="text-muted-foreground">vs</span> {match.team2}
                                </div>
                              </TableCell>
                              <TableCell>{match.court}</TableCell>
                              <TableCell>{match.round}</TableCell>
                              <TableCell>
                                <Badge variant={getStatusVariant(match.status)} className="capitalize">
                                  {match.status}
                                </Badge>
                              </TableCell>
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
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </CardContent>
      </Card>

      <MatchDetailDialog 
        match={selectedMatch}
        isOpen={isDialogOpen}
        onClose={closeMatchDialog}
      />
    </>
  )
}