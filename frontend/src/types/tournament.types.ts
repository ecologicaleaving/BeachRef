// Tournament Types for Frontend
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
  surface?: Tournament['surface'];
  gender?: Tournament['gender'];
  statuses?: string; // Comma-separated status values
  // Story 1.3: Referee filtering capability
  referees?: string; // Comma-separated referee names/IDs
}

export interface TournamentFilters {
  search?: string;
  location?: string;
  dateFrom?: Date;
  dateTo?: Date;
  level?: Tournament['level'];
  status?: Tournament['status'];
  surface?: Tournament['surface'];
  gender?: Tournament['gender'];
  // Enhanced filter model for Story 2.2
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  locations?: string[]; // Array of countries/cities
  types?: Tournament['level'][];
  statuses?: Tournament['status'][];
  // Story 1.3: Referee filtering capability
  referees?: string[]; // Array of referee names/IDs for filtering
}

export interface FilterOptions {
  locations: { value: string; label: string }[];
  types: { value: Tournament['level']; label: string }[];
  surfaces: { value: Tournament['surface']; label: string }[];
  genders: { value: Tournament['gender']; label: string }[];
  statuses: { value: Tournament['status']; label: string }[];
}

// Referee Types for Story 1.1
export type RefereeLevel = 'International' | 'Continental' | 'National';

export interface Referee {
  id: string;
  name: string;
  country?: string;
  level?: RefereeLevel;
  certifications?: string[];
}

// Type guard for referee level validation
export const isValidRefereeLevel = (level: string): level is RefereeLevel => {
  return ['International', 'Continental', 'National'].includes(level);
};

// Helper type for match referee structure
export interface MatchReferees {
  main?: Referee;
  assistant?: Referee;
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
  // Story 1.1: Added referee information
  referees?: MatchReferees;
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

// Story 1.3: Referee search response for autocomplete
export interface RefereeSearchResponse {
  referees: Array<{
    name: string;
    country?: string;
    matchCount: number;
  }>;
}