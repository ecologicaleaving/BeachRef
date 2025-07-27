// Enhanced Tournament Types for Story 2.1
export interface Tournament {
  id: string;
  name: string;
  dates: {
    start: Date;
    end: Date;
  };
  location: {
    city: string;
    country: string;
    venue?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  level: 'World Tour' | 'Continental' | 'National' | 'Regional';
  status: 'Upcoming' | 'Live' | 'Completed' | 'Cancelled';
  matchCount: number;
  prizeMoney?: number;
  surface: 'Sand' | 'Indoor';
  gender: 'Men' | 'Women' | 'Mixed';
}

// Match Types for Story 2.3
export interface Match {
  id: string;
  tournamentId: string;
  teams: {
    team1: {
      player1: string;
      player2: string;
      country: string;
    };
    team2: {
      player1: string;
      player2: string;
      country: string;
    };
  };
  score: {
    set1?: { team1: number; team2: number; };
    set2?: { team1: number; team2: number; };
    set3?: { team1: number; team2: number; };
  };
  status: 'Scheduled' | 'Live' | 'Completed' | 'Postponed';
  scheduledTime: Date;
  actualStartTime?: Date;
  duration?: number;
  round: string;
  court: string;
  winner?: 'team1' | 'team2';
}

// Tournament Detail Response for Story 2.3
export interface TournamentDetailResponse {
  tournament: Tournament;
  matches: Match[];
  statistics: {
    totalMatches: number;
    completedMatches: number;
    upcomingMatches: number;
    liveMatches: number;
  };
}

export interface PaginatedTournamentResponse {
  tournaments: Tournament[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TournamentQueryParams {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  location?: string;
  type?: string;
  search?: string;
  // Enhanced filter parameters for Story 2.2
  locations?: string; // Comma-separated string
  types?: string; // Comma-separated tournament levels
  surface?: string;
  gender?: string;
  statuses?: string; // Comma-separated status values
}