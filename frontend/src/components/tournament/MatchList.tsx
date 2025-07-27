import type { Match } from '@/types/tournament.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MatchCard } from './MatchCard';
import { 
  formatTeamName, 
  formatMatchScore, 
  getMatchStatusVariant, 
  formatMatchTime, 
  formatMatchDate
} from '@/utils/match.utils';
import { Trophy, Calendar } from 'lucide-react';

interface MatchListProps {
  matches: Match[];
}

export function MatchList({ matches }: MatchListProps) {
  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No matches available for this tournament.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Matches ({matches.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Round</TableHead>
                <TableHead>Date/Time</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Court</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((match) => (
                <TableRow key={match.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Badge 
                      variant={getMatchStatusVariant(match.status)}
                      className={match.status === 'Live' ? 'bg-green-500 text-white' : ''}
                    >
                      {match.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{match.round}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{formatMatchDate(match)}</div>
                      <div className="text-muted-foreground">{formatMatchTime(match)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {formatTeamName(match.teams.team1)}
                        </span>
                        {match.teams.team1.country && (
                          <span className="text-xs text-muted-foreground bg-gray-100 px-1 rounded">
                            {match.teams.team1.country}
                          </span>
                        )}
                        {match.winner === 'team1' && (
                          <Trophy className="h-3 w-3 text-yellow-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {formatTeamName(match.teams.team2)}
                        </span>
                        {match.teams.team2.country && (
                          <span className="text-xs text-muted-foreground bg-gray-100 px-1 rounded">
                            {match.teams.team2.country}
                          </span>
                        )}
                        {match.winner === 'team2' && (
                          <Trophy className="h-3 w-3 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="font-mono text-sm">
                      {formatMatchScore(match)}
                    </div>
                  </TableCell>
                  <TableCell>{match.court}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}