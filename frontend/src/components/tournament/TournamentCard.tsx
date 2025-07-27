import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TournamentCardProps {
  tournament: {
    id: string;
    name: string;
    description?: string;
    status: 'upcoming' | 'live' | 'completed';
    startDate: string;
    endDate?: string;
    location: string;
    participantCount?: number;
    category?: string;
  };
  className?: string;
}

export function TournamentCard({ tournament, className = "" }: TournamentCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'live':
        return 'destructive';
      case 'completed':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'live':
        return 'badge-live';
      case 'completed':
        return 'badge-completed';
      default:
        return 'badge-upcoming';
    }
  };

  return (
    <Card className={`card-subtle hover:shadow-md transition-shadow ${className}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">{tournament.name}</CardTitle>
            {tournament.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {tournament.description}
              </CardDescription>
            )}
          </div>
          <Badge 
            variant={getStatusVariant(tournament.status)}
            className={getStatusClass(tournament.status)}
          >
            {tournament.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {/* Tournament Details */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center text-muted-foreground">
              <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>
                {formatDate(tournament.startDate)}
                {tournament.endDate && tournament.endDate !== tournament.startDate && 
                  ` - ${formatDate(tournament.endDate)}`
                }
              </span>
            </div>
            
            <div className="flex items-center text-muted-foreground">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">{tournament.location}</span>
            </div>
            
            {tournament.participantCount && (
              <div className="flex items-center text-muted-foreground">
                <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>{tournament.participantCount} participants</span>
              </div>
            )}
          </div>

          {/* Category Badge */}
          {tournament.category && (
            <div>
              <Badge variant="outline" className="text-xs">
                {tournament.category}
              </Badge>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <Button asChild variant="outline" size="sm" className="w-full touch-target">
              <Link to={`/tournaments/${tournament.id}`}>
                View Details
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}