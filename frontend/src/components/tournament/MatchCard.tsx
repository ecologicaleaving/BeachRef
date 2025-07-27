import type { Match } from '@/types/tournament.types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Trophy } from 'lucide-react';
import { 
  formatTeamName, 
  formatMatchScore, 
  getMatchStatusVariant, 
  formatMatchTime, 
  formatMatchDate,
  getWinnerName,
  formatMatchDuration
} from '@/utils/match.utils';

interface MatchCardProps {
  match: Match;
  className?: string;
}

export function MatchCard({ match, className }: MatchCardProps) {
  const winnerName = getWinnerName(match);
  
  return (
    <Card className={`transition-shadow hover:shadow-md ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge 
              variant={getMatchStatusVariant(match.status)}
              className={match.status === 'Live' ? 'bg-green-500 text-white' : ''}
            >
              {match.status}
            </Badge>
            <span className="text-sm text-muted-foreground">{match.round}</span>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div>{formatMatchDate(match)}</div>
            <div>{formatMatchTime(match)}</div>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {formatTeamName(match.teams.team1)}
              </span>
              {match.teams.team1.country && (
                <span className="text-xs text-muted-foreground bg-gray-100 px-1 rounded">
                  {match.teams.team1.country}
                </span>
              )}
              {match.winner === 'team1' && (
                <Trophy className="h-4 w-4 text-yellow-500" data-testid="trophy-icon" />
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {formatTeamName(match.teams.team2)}
              </span>
              {match.teams.team2.country && (
                <span className="text-xs text-muted-foreground bg-gray-100 px-1 rounded">
                  {match.teams.team2.country}
                </span>
              )}
              {match.winner === 'team2' && (
                <Trophy className="h-4 w-4 text-yellow-500" data-testid="trophy-icon" />
              )}
            </div>
          </div>
        </div>

        {match.status !== 'Scheduled' && (
          <div className="text-center py-2 border-t border-b bg-gray-50 rounded">
            <div className="font-mono text-sm">
              {formatMatchScore(match)}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{match.court}</span>
            </div>
            {match.duration && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatMatchDuration(match.duration)}</span>
              </div>
            )}
          </div>
          {winnerName && (
            <div className="font-medium text-green-600">
              Winner: {winnerName}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}