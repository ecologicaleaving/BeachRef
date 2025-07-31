'use client'

import { TournamentDetail } from '@/lib/types'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Users, Trophy, Clock, Info, Building, Award, ExternalLink, Target } from 'lucide-react'

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
        {/* Basic Tournament Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Tournament Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold mb-3">Dates & Timeline</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Tournament Period</div>
                      <div className="text-muted-foreground">
                        {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                      </div>
                    </div>
                  </div>
                  
                  {tournament.dates?.endDateMainDraw && tournament.dates.endDateMainDraw !== tournament.endDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Main Draw Ends</div>
                        <div className="text-muted-foreground">{formatDate(tournament.dates.endDateMainDraw)}</div>
                      </div>
                    </div>
                  )}
                  
                  {tournament.dates?.endDateQualification && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Qualification Ends</div>
                        <div className="text-muted-foreground">{formatDate(tournament.dates.endDateQualification)}</div>
                      </div>
                    </div>
                  )}
                  
                  {tournament.dates?.deadline && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Entry Deadline</div>
                        <div className="text-muted-foreground">{formatDate(tournament.dates.deadline)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold mb-3">Location & Details</h4>
                <div className="space-y-3">
                  {tournament.venue && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Venue</div>
                        <div className="text-muted-foreground">
                          {tournament.venue}
                          {tournament.city && <div className="text-sm">{tournament.city}</div>}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <div className="font-medium mb-2">Tournament Category</div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{tournament.gender}</Badge>
                      <Badge variant="outline">{tournament.type}</Badge>
                      {tournament.status && (
                        <Badge variant="outline" className="capitalize">{tournament.status}</Badge>
                      )}
                      {tournament.season && (
                        <Badge variant="outline">{tournament.season}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Competition Structure */}
        {tournament.competitionStructure && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Competition Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  {tournament.competitionStructure.nbTeamsMainDraw && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Main Draw Size</div>
                        <div className="text-muted-foreground">{tournament.competitionStructure.nbTeamsMainDraw} teams</div>
                      </div>
                    </div>
                  )}
                  
                  {tournament.competitionStructure.nbTeamsQualification && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Qualification Draw</div>
                        <div className="text-muted-foreground">{tournament.competitionStructure.nbTeamsQualification} teams</div>
                      </div>
                    </div>
                  )}
                  
                  {tournament.competitionStructure.nbWildCards && (
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Wild Cards</div>
                        <div className="text-muted-foreground">{tournament.competitionStructure.nbWildCards} spots</div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  {tournament.competitionStructure.matchFormat && (
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Match Format</div>
                        <div className="text-muted-foreground">{tournament.competitionStructure.matchFormat}</div>
                      </div>
                    </div>
                  )}
                  
                  {tournament.competitionStructure.matchPointsMethod && (
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Points Method</div>
                        <div className="text-muted-foreground">{tournament.competitionStructure.matchPointsMethod}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Points System Information */}
        {tournament.pointsSystem && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Points System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tournament.pointsSystem.entryPointsTemplateNo && (
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Entry Points Template</div>
                      <div className="text-muted-foreground">{tournament.pointsSystem.entryPointsTemplateNo}</div>
                    </div>
                  </div>
                )}
                
                {tournament.pointsSystem.seedPointsTemplateNo && (
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Seeding Points Template</div>
                      <div className="text-muted-foreground">{tournament.pointsSystem.seedPointsTemplateNo}</div>
                    </div>
                  </div>
                )}
                
                {tournament.pointsSystem.earnedPointsTemplateNo && (
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Earned Points Template</div>
                      <div className="text-muted-foreground">{tournament.pointsSystem.earnedPointsTemplateNo}</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tournament Administration */}
        {tournament.administration && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Tournament Administration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tournament.administration.federationCode && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Federation</div>
                      <div className="text-muted-foreground">
                        {tournament.administration.federationCode}
                        {tournament.administration.organizerCode && ` • Organizer: ${tournament.administration.organizerCode}`}
                      </div>
                    </div>
                  </div>
                )}
                
                {tournament.administration.webSite && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Official Website</div>
                      <a 
                        href={tournament.administration.webSite} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline text-muted-foreground"
                      >
                        {tournament.administration.webSite}
                      </a>
                    </div>
                  </div>
                )}
                
                {tournament.administration.buyTicketsUrl && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Tickets</div>
                      <a 
                        href={tournament.administration.buyTicketsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline text-muted-foreground"
                      >
                        Purchase Tickets
                      </a>
                    </div>
                  </div>
                )}
                
                {tournament.administration.isVisManaged !== undefined && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">VIS Managed</div>
                      <div className="text-muted-foreground">{tournament.administration.isVisManaged ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        {tournament.description && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{tournament.description}</p>
            </CardContent>
          </Card>
        )}
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