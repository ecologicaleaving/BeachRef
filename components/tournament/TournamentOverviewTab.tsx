'use client'

import { TournamentDetail, Match } from '@/lib/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Calendar, MapPin, Users, Trophy, Info, Building, Award, ExternalLink, Target, TrendingUp } from 'lucide-react'

interface TournamentOverviewTabProps {
  tournament: TournamentDetail
  matches?: Match[]
}

export default function TournamentOverviewTab({ tournament, matches }: TournamentOverviewTabProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Calculate tournament progress metrics
  const calculateProgress = () => {
    // Sample matches for progress calculation if none provided
    const sampleMatches: Match[] = matches || [
      { id: '1', date: '2025-01-15', time: '09:00', team1: 'Team A', team2: 'Team B', status: 'completed', court: '1' },
      { id: '2', date: '2025-01-15', time: '10:30', team1: 'Team C', team2: 'Team D', status: 'completed', court: '2' },
      { id: '3', date: '2025-01-16', time: '14:00', team1: 'Team E', team2: 'Team F', status: 'live', court: '1' },
      { id: '4', date: '2025-01-16', time: '15:30', team1: 'Team G', team2: 'Team H', status: 'scheduled', court: '2' },
      { id: '5', date: '2025-01-17', time: '09:00', team1: 'Team I', team2: 'Team J', status: 'scheduled', court: '1' },
      { id: '6', date: '2025-01-17', time: '10:30', team1: 'Team K', team2: 'Team L', status: 'scheduled', court: '2' },
    ]

    const totalMatches = sampleMatches.length
    const completedMatches = sampleMatches.filter(m => m.status === 'completed').length
    const liveMatches = sampleMatches.filter(m => m.status === 'live').length
    const upcomingMatches = sampleMatches.filter(m => m.status === 'scheduled').length
    const completionPercentage = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0

    return {
      totalMatches,
      completedMatches,
      liveMatches,
      upcomingMatches,
      completionPercentage
    }
  }

  const progress = calculateProgress()

  return (
    <div className="space-y-4">
      {/* Tournament Progress Card */}
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
                <span>Overall Completion</span>
                <span className="font-semibold">{progress.completionPercentage}%</span>
              </div>
              <Progress value={progress.completionPercentage} className="h-2 w-full" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{progress.totalMatches}</div>
                <div className="text-sm text-muted-foreground">Total Matches</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{progress.completedMatches}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{progress.liveMatches}</div>
                <div className="text-sm text-muted-foreground">Live</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">{progress.upcomingMatches}</div>
                <div className="text-sm text-muted-foreground">Upcoming</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
    </div>
  )
}