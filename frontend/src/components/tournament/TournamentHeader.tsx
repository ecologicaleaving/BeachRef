import type { Tournament } from '@/types/tournament.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Trophy } from 'lucide-react';
import { formatTournamentDate } from '@/utils/date.utils';

interface TournamentHeaderProps {
  tournament: Tournament;
}

export function TournamentHeader({ tournament }: TournamentHeaderProps) {
  const getStatusVariant = (status: Tournament['status']) => {
    switch (status) {
      case 'Upcoming':
        return 'default';
      case 'Completed':
        return 'secondary';
      case 'Cancelled':
        return 'destructive';
      case 'Live':
        return 'default'; // Will be styled with custom orange variant
      default:
        return 'default';
    }
  };

  const getLevelVariant = (): 'outline' => 'outline';

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-2xl md:text-3xl">{tournament.name}</CardTitle>
          <Badge 
            variant={getStatusVariant(tournament.status)}
            className={tournament.status === 'Live' ? 'bg-orange-500 text-white' : ''}
          >
            {tournament.status}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant={getLevelVariant()}>
            <Trophy className="h-4 w-4 mr-1" />
            {tournament.level}
          </Badge>
          <Badge variant="outline">
            <Calendar className="h-4 w-4 mr-1" />
            {formatTournamentDate(tournament.dates.start)} - {formatTournamentDate(tournament.dates.end)}
          </Badge>
          <Badge variant="outline">
            <MapPin className="h-4 w-4 mr-1" />
            {tournament.location.city}, {tournament.location.country}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium">Surface:</span>
            <div className="text-muted-foreground">{tournament.surface}</div>
          </div>
          <div>
            <span className="font-medium">Gender:</span>
            <div className="text-muted-foreground">{tournament.gender}</div>
          </div>
          {tournament.location.venue && (
            <div>
              <span className="font-medium">Venue:</span>
              <div className="text-muted-foreground">{tournament.location.venue}</div>
            </div>
          )}
          {tournament.prizeMoney && (
            <div>
              <span className="font-medium">Prize Money:</span>
              <div className="text-muted-foreground">
                ${tournament.prizeMoney.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}