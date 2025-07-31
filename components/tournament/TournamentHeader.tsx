'use client'

import { TournamentDetail } from '@/lib/types'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CountryFlag } from '@/components/ui/CountryFlag'
import { Calendar, MapPin, Users, Building, Trophy, ExternalLink } from 'lucide-react'

interface TournamentHeaderProps {
  tournament: TournamentDetail
}

export default function TournamentHeader({ tournament }: TournamentHeaderProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusVariant = (status?: string) => {
    switch (status) {
      case 'live': return 'default'
      case 'completed': return 'secondary'
      case 'upcoming': return 'outline'
      default: return 'outline'
    }
  }

  // Enhanced tournament status calculation using actual phase dates
  const getEnhancedTournamentStatus = (tournament: TournamentDetail): 'upcoming' | 'live' | 'completed' => {
    const now = new Date()
    const startDate = new Date(tournament.startDate)
    const endDate = new Date(tournament.endDate)
    const mainDrawEnd = tournament.dates?.endDateMainDraw ? new Date(tournament.dates.endDateMainDraw) : endDate
    
    // Handle invalid dates gracefully
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return 'upcoming' // Default to upcoming if dates are invalid
    }
    
    if (now < startDate) return 'upcoming'
    if (now >= startDate && now <= mainDrawEnd) return 'live'
    return 'completed'
  }

  const currentStatus = tournament.status || getEnhancedTournamentStatus(tournament)

  const getGenderVariant = (gender: string) => {
    switch (gender) {
      case 'Men': return 'default'
      case 'Women': return 'secondary'
      case 'Mixed': return 'outline'
      default: return 'outline'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {tournament.title || tournament.name}
              </h1>
              {tournament.venue && tournament.city && (
                <p className="text-lg text-muted-foreground mt-1">
                  {tournament.venue}, {tournament.city}
                  {tournament.countryName && ` • ${tournament.countryName}`}
                </p>
              )}
              {tournament.administration?.federationCode && (
                <p className="text-sm text-muted-foreground">
                  Federation: {tournament.administration.federationCode}
                  {tournament.administration.organizerCode && ` • Organizer: ${tournament.administration.organizerCode}`}
                </p>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant={getStatusVariant(currentStatus)} className="capitalize">
                {currentStatus}
              </Badge>
              <Badge variant={getGenderVariant(tournament.gender)}>
                {tournament.gender}
              </Badge>
              <Badge variant="outline">
                {tournament.type}
              </Badge>
              {tournament.season && (
                <Badge variant="outline">
                  {tournament.season}
                </Badge>
              )}
            </div>
          </div>
          
          <CountryFlag 
            countryCode={tournament.countryCode} 
            className="w-12 h-12 rounded shadow-sm" 
          />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Tournament Dates</div>
              <div className="text-muted-foreground">
                {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
              </div>
              {tournament.dates?.endDateMainDraw && tournament.dates.endDateMainDraw !== tournament.endDate && (
                <div className="text-xs text-muted-foreground">
                  Main Draw: {formatDate(tournament.dates.endDateMainDraw)}
                </div>
              )}
            </div>
          </div>
          
          {tournament.venue && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Venue</div>
                <div className="text-muted-foreground">
                  {tournament.venue}
                  {tournament.city && <div className="text-xs">{tournament.city}</div>}
                </div>
              </div>
            </div>
          )}
          
          {tournament.competitionStructure?.nbTeamsMainDraw && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Draw Size</div>
                <div className="text-muted-foreground">
                  Main: {tournament.competitionStructure.nbTeamsMainDraw} teams
                  {tournament.competitionStructure.nbTeamsQualification && (
                    <div className="text-xs">
                      Qual: {tournament.competitionStructure.nbTeamsQualification} teams
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tournament.competitionStructure?.matchFormat && (
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Format</div>
                <div className="text-muted-foreground">{tournament.competitionStructure.matchFormat}</div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Information Section */}
        {(tournament.dates?.deadline || tournament.administration?.webSite || tournament.description) && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {tournament.dates?.deadline && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="font-medium">Entry Deadline:</span>
                  <span className="text-muted-foreground ml-1">{formatDate(tournament.dates.deadline)}</span>
                </div>
              </div>
            )}

            {tournament.administration?.webSite && (
              <div className="flex items-center gap-2 text-sm">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="font-medium">Official Website:</span>
                  <a 
                    href={tournament.administration.webSite} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline ml-1"
                  >
                    {tournament.administration.webSite}
                  </a>
                </div>
              </div>
            )}

            {tournament.administration?.buyTicketsUrl && (
              <div className="flex items-center gap-2 text-sm">
                <Building className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="font-medium">Tickets:</span>
                  <a 
                    href={tournament.administration.buyTicketsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline ml-1"
                  >
                    Purchase Tickets
                  </a>
                </div>
              </div>
            )}

            {tournament.description && (
              <div className="mt-3">
                <div className="font-medium mb-2">Description</div>
                <p className="text-muted-foreground">{tournament.description}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}