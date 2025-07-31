'use client'

import { TournamentDetail } from '@/lib/types'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CountryFlag } from '@/components/ui/CountryFlag'
import { Calendar, MapPin, Users } from 'lucide-react'

interface TournamentHeaderProps {
  tournament: TournamentDetail
}

export default function TournamentHeader({ tournament }: TournamentHeaderProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date unavailable'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch (error) {
      console.warn('[TournamentHeader] Invalid date format:', dateString)
      return 'Invalid date'
    }
  }

  const getStatusVariant = (status?: string) => {
    switch (status) {
      case 'live': return 'default'
      case 'completed': return 'secondary'
      case 'upcoming': return 'outline'
      default: return 'outline'
    }
  }

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
            <h1 className="text-2xl font-bold text-foreground">
              {tournament.name}
            </h1>
            
            <div className="flex flex-wrap gap-2">
              {tournament.status && (
                <Badge variant={getStatusVariant(tournament.status)} className="capitalize">
                  {tournament.status}
                </Badge>
              )}
              <Badge variant={getGenderVariant(tournament.gender)}>
                {tournament.gender}
              </Badge>
              <Badge variant="outline">
                {tournament.type}
              </Badge>
            </div>
          </div>
          
          {tournament.countryCode && (
            <CountryFlag 
              countryCode={tournament.countryCode} 
              className="w-12 h-12 rounded shadow-sm" 
            />
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Dates</div>
              <div className="text-muted-foreground">
                {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
              </div>
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
          
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Category</div>
              <div className="text-muted-foreground">{tournament.gender} - {tournament.type}</div>
            </div>
          </div>
        </div>
        
        {tournament.description && (
          <div className="mt-4 pt-4 border-t">
            <div className="font-medium mb-2">Description</div>
            <p className="text-muted-foreground">{tournament.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}