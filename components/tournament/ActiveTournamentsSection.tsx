/**
 * Active Tournaments Section Component for Story 5.2
 * Prominently displays currently active tournaments at the top of the dashboard
 */

'use client';

import { useState, useEffect } from 'react';
import { Tournament } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getActiveTournaments } from '@/utils/temporal-filtering';
import { fetchCachedTournaments } from '@/lib/tournament-api';
import { EnhancedTournamentCard } from './EnhancedTournamentCard';

interface ActiveTournamentsSectionProps {
  currentDate?: Date;
  className?: string;
}


function ActiveTournamentsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
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

function EmptyActiveTournaments() {
  return (
    <Card className="border-dashed border-2 border-border">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          No Active Tournaments
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          There are currently no tournaments happening right now. Check the upcoming tournaments section below for scheduled events.
        </p>
      </CardContent>
    </Card>
  );
}

export function ActiveTournamentsSection({ currentDate = new Date(), className }: ActiveTournamentsSectionProps) {
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActiveTournaments() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get current year tournaments
        const year = currentDate.getFullYear();
        const response = await fetchCachedTournaments({ year, page: 1, limit: 100 }); // Get maximum allowed batch to filter from
        
        if (response && response.tournaments) {
          const active = getActiveTournaments(response.tournaments, currentDate);
          setActiveTournaments(active);
        } else {
          setActiveTournaments([]);
        }
      } catch (err) {
        console.error('Error fetching active tournaments:', err);
        setError('Failed to load active tournaments');
        setActiveTournaments([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchActiveTournaments();
  }, [currentDate]);

  return (
    <section className={cn("mb-8", className)}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Badge variant="destructive" className="animate-pulse">LIVE</Badge>
          Active Tournaments
        </h2>
        <Badge variant="outline">
          {activeTournaments.length} active
        </Badge>
      </div>
      
      {error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center justify-center py-6">
            <AlertCircle className="h-5 w-5 text-destructive mr-2" />
            <span className="text-destructive">{error}</span>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <ActiveTournamentsSkeleton />
      ) : activeTournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTournaments.map(tournament => (
            <EnhancedTournamentCard 
              key={tournament.code}
              tournament={tournament}
              variant="active"
              showTemporalStatus={true}
            />
          ))}
        </div>
      ) : (
        <EmptyActiveTournaments />
      )}
    </section>
  );
}