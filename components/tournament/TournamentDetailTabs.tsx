'use client'

import { TournamentDetail } from '@/lib/types'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Users, Trophy, Clock, Info } from 'lucide-react'

interface TournamentDetailTabsProps {
  tournament: TournamentDetail
}

export default function TournamentDetailTabs({ tournament }: TournamentDetailTabsProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview" className="flex items-center gap-2 min-h-[48px]">
          <Info className="h-4 w-4" />
          <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="schedule" className="flex items-center gap-2 min-h-[48px]">
          <Clock className="h-4 w-4" />
          <span className="hidden sm:inline">Schedule</span>
        </TabsTrigger>
        <TabsTrigger value="results" className="flex items-center gap-2 min-h-[48px]">
          <Trophy className="h-4 w-4" />
          <span className="hidden sm:inline">Results</span>
        </TabsTrigger>
        <TabsTrigger value="teams" className="flex items-center gap-2 min-h-[48px]">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Teams</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Tournament Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Start Date</div>
                    <div className="text-muted-foreground">{formatDate(tournament.startDate)}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">End Date</div>
                    <div className="text-muted-foreground">{formatDate(tournament.endDate)}</div>
                  </div>
                </div>
                
                {tournament.venue && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Venue</div>
                      <div className="text-muted-foreground">{tournament.venue}</div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="font-medium mb-2">Tournament Details</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{tournament.gender}</Badge>
                    <Badge variant="outline">{tournament.type}</Badge>
                    {tournament.status && (
                      <Badge variant="outline" className="capitalize">{tournament.status}</Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Category</div>
                    <div className="text-muted-foreground">{tournament.gender} - {tournament.type}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {tournament.description && (
              <div className="mt-6 pt-4 border-t">
                <div className="font-medium mb-2">Description</div>
                <p className="text-muted-foreground">{tournament.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="schedule" className="space-y-4">
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
              <p>Schedule information will be available in a future update.</p>
              <p className="text-sm mt-2">
                Tournament runs from {formatDate(tournament.startDate)} to {formatDate(tournament.endDate)}
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="results" className="space-y-4">
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
              <p>Results will be available as the tournament progresses.</p>
              {tournament.status === 'upcoming' && (
                <p className="text-sm mt-2">Tournament has not started yet.</p>
              )}
              {tournament.status === 'live' && (
                <p className="text-sm mt-2">Tournament is currently in progress.</p>
              )}
              {tournament.status === 'completed' && (
                <p className="text-sm mt-2">Final results will be displayed here.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="teams" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participating Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Team information will be available in a future update.</p>
              <p className="text-sm mt-2">
                This section will display all participating teams and their rankings.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}