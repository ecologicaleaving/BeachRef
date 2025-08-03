/**
 * Temporal Tournament Display Component for Story 5.2
 * Displays tournaments organized by temporal relevance (upcoming and past)
 */

'use client';

import { useState, useEffect } from 'react';
import { Tournament } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, History, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  filterTournamentsByTimelineRange,
  TemporalTournamentGroups 
} from '@/utils/temporal-filtering';
import { fetchCachedTournaments } from '@/lib/tournament-api';
import { EnhancedTournamentCard } from './EnhancedTournamentCard';

interface TemporalTournamentDisplayProps {
  filter: 'timeline' | 'year' | 'all';
  range: number;
  currentDate: Date;
  className?: string;
}


function TournamentSectionSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="tournament-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="flex items-center">
              <Skeleton className="h-4 w-4 mr-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyTournamentSection({ 
  type, 
  range 
}: { 
  type: 'upcoming' | 'past'; 
  range: number;
}) {
  const messages = {
    upcoming: {
      title: 'No Upcoming Tournaments',
      description: `No tournaments scheduled within the next ${range} tournaments from today.`
    },
    past: {
      title: 'No Recent Tournaments',
      description: `No tournaments found within the last ${range} tournaments before today.`
    }
  };

  return (
    <Card className="border-dashed border-2 border-border">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-3" />
        <h4 className="text-base font-medium text-foreground mb-2">
          {messages[type].title}
        </h4>
        <p className="text-sm text-muted-foreground max-w-md">
          {messages[type].description}
        </p>
      </CardContent>
    </Card>
  );
}

export function TemporalTournamentDisplay({ 
  filter, 
  range, 
  currentDate, 
  className 
}: TemporalTournamentDisplayProps) {
  const [filteredTournaments, setFilteredTournaments] = useState<TemporalTournamentGroups>({
    active: [],
    upcoming: [],
    past: [],
    total: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAndFilterTournaments() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get tournaments from current year and adjacent years for better coverage
        const year = currentDate.getFullYear();
        const promises = [
          fetchCachedTournaments({ year: year - 1, page: 1, limit: 500 }),
          fetchCachedTournaments({ year: year, page: 1, limit: 500 }),
          fetchCachedTournaments({ year: year + 1, page: 1, limit: 500 })
        ];
        
        const responses = await Promise.allSettled(promises);
        
        // Combine successful responses
        const allTournaments: Tournament[] = [];
        responses.forEach(response => {
          if (response.status === 'fulfilled' && response.value?.tournaments) {
            allTournaments.push(...response.value.tournaments);
          }
        });
        
        if (allTournaments.length === 0) {
          setFilteredTournaments({
            active: [],
            upcoming: [],
            past: [],
            total: []
          });
          return;
        }

        // Apply temporal filtering
        const filtered = filterTournamentsByTimelineRange(allTournaments, currentDate, range);
        setFilteredTournaments(filtered);
        
      } catch (err) {
        console.error('Error fetching tournaments for temporal display:', err);
        setError('Failed to load tournaments');
        setFilteredTournaments({
          active: [],
          upcoming: [],
          past: [],
          total: []
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchAndFilterTournaments();
  }, [currentDate, range, filter]);

  if (error) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center justify-center py-6">
            <AlertCircle className="h-5 w-5 text-destructive mr-2" />
            <span className="text-destructive">{error}</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-8", className)}>
      {/* Upcoming Tournaments Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Upcoming Tournaments
          </h2>
          <Badge variant="secondary">
            {filteredTournaments.upcoming.length} tournaments
          </Badge>
        </div>
        
        {isLoading ? (
          <TournamentSectionSkeleton count={Math.min(range, 6)} />
        ) : filteredTournaments.upcoming.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTournaments.upcoming.map(tournament => (
              <EnhancedTournamentCard
                key={tournament.code}
                tournament={tournament}
                variant="upcoming"
                showTemporalStatus={true}
              />
            ))}
          </div>
        ) : (
          <EmptyTournamentSection type="upcoming" range={range} />
        )}
      </section>
      
      {/* Past Tournaments Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <History className="h-5 w-5 text-gray-500" />
            Recent Tournaments
          </h2>
          <Badge variant="outline">
            {filteredTournaments.past.length} tournaments
          </Badge>
        </div>
        
        {isLoading ? (
          <TournamentSectionSkeleton count={Math.min(range, 6)} />
        ) : filteredTournaments.past.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTournaments.past.map(tournament => (
              <EnhancedTournamentCard
                key={tournament.code}
                tournament={tournament}
                variant="past"
                showTemporalStatus={true}
              />
            ))}
          </div>
        ) : (
          <EmptyTournamentSection type="past" range={range} />
        )}
      </section>
    </div>
  );
}