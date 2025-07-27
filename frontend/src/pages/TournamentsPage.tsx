import { useState } from 'react';
import { TournamentList } from '@/components/tournament/TournamentList';
import type { TournamentQueryParams } from '@/types/tournament.types';

export function TournamentsPage() {
  const [params, setParams] = useState<TournamentQueryParams>({
    page: 1,
    limit: 10
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Tournaments</h1>
        <p className="text-muted-foreground">Browse and filter volleyball tournaments from around the world</p>
      </div>

      {/* Tournament List with Integrated Filters */}
      <TournamentList params={params} onParamsChange={setParams} />
    </div>
  );
}