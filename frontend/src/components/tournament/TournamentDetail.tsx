import { TournamentDetailResponse } from '@/types/tournament.types';
import { TournamentHeader } from './TournamentHeader';
import { TournamentStats } from './TournamentStats';
import { MatchList } from './MatchList';
import { Separator } from '@/components/ui/separator';

interface TournamentDetailProps {
  tournamentDetail: TournamentDetailResponse;
}

export function TournamentDetail({ tournamentDetail }: TournamentDetailProps) {
  const { tournament, matches, statistics } = tournamentDetail;

  return (
    <div className="space-y-6">
      {/* Tournament Header */}
      <TournamentHeader tournament={tournament} />
      
      <Separator />
      
      {/* Tournament Statistics */}
      <TournamentStats statistics={statistics} />
      
      <Separator />
      
      {/* Match Listings */}
      <MatchList matches={matches} />
    </div>
  );
}