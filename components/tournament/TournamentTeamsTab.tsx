'use client'

import { Team, TournamentDetail } from '@/lib/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Users } from 'lucide-react'

interface TournamentTeamsTabProps {
  tournament: TournamentDetail
  teams?: Team[]
}

export default function TournamentTeamsTab({ tournament, teams }: TournamentTeamsTabProps) {
  // Generate sample data if no teams provided (for now)
  const sampleTeams: Team[] = teams || [
    {
      id: '1',
      name: 'Team USA A',
      country: 'USA',
      players: [
        { name: 'Jake Gibb', position: 'Blocker' },
        { name: 'Casey Patterson', position: 'Defender' }
      ]
    },
    {
      id: '2',
      name: 'Team Brazil A',
      country: 'BRA',
      players: [
        { name: 'Alison Cerutti', position: 'Blocker' },
        { name: 'Bruno Schmidt', position: 'Defender' }
      ]
    },
    {
      id: '3',
      name: 'Team Germany A',
      country: 'GER',
      players: [
        { name: 'Julius Thole', position: 'Blocker' },
        { name: 'Clemens Wickler', position: 'Defender' }
      ]
    },
    {
      id: '4',
      name: 'Team France A',
      country: 'FRA',
      players: [
        { name: 'Quincy Aye', position: 'Blocker' },
        { name: 'Adrian Carambula', position: 'Defender' }
      ]
    },
    {
      id: '5',
      name: 'Team Norway A',
      country: 'NOR',
      players: [
        { name: 'Anders Mol', position: 'Blocker' },
        { name: 'Christian Sørum', position: 'Defender' }
      ]
    },
    {
      id: '6',
      name: 'Team Poland A',
      country: 'POL',
      players: [
        { name: 'Bartosz Losiak', position: 'Blocker' },
        { name: 'Piotr Kantor', position: 'Defender' }
      ]
    }
  ]

  const displayTeams = teams || sampleTeams

  if (displayTeams.length === 0) {
    return (
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
            <p>Team information will be available when tournament details are loaded.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participating Teams ({displayTeams.length})
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayTeams.map((team) => (
          <Card key={team.id} className="p-4">
            <CardHeader className="pb-2 px-0">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={`https://flagcdn.com/w80/${team.country.toLowerCase()}.png`} 
                    alt={`${team.country} flag`}
                    onError={(e) => {
                      // Fallback to initials if flag fails to load
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <AvatarFallback className="text-sm font-semibold">
                    {team.country}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm leading-tight truncate">{team.name}</h3>
                  <p className="text-xs text-muted-foreground">{team.country}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0 pt-2">
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Players</h4>
                {team.players.map((player, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {player.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{player.name}</div>
                      {player.position && (
                        <div className="text-xs text-muted-foreground">{player.position}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}