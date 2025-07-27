// VIS API Response Types
export interface VISTournament {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location: VISLocation;
  level: string;
  status: string;
}

export interface VISLocation {
  city: string;
  country: string;
  venue?: string;
}

export interface VISMatch {
  id: string;
  tournamentId: string;
  homeTeam: VISTeam;
  awayTeam: VISTeam;
  startTime: string;
  status: string;
  score?: VISScore;
}

export interface VISTeam {
  id: string;
  name: string;
  players: VISPlayer[];
}

export interface VISPlayer {
  id: string;
  firstName: string;
  lastName: string;
  country: string;
}

export interface VISScore {
  sets: VISSetScore[];
  winner?: string;
}

export interface VISSetScore {
  homeScore: number;
  awayScore: number;
}

// Transformed VisConnect Types
export interface Tournament {
  id: string;
  name: string;
  dates: { start: Date; end: Date };
  location: { city: string; country: string; venue?: string };
  level: TournamentLevel;
  status: TournamentStatus;
  matchCount: number;
}

export interface TournamentDetail extends Tournament {
  matches: Match[];
  description?: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  homeTeam: Team;
  awayTeam: Team;
  startTime: Date;
  status: MatchStatus;
  score?: Score;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  country: string;
}

export interface Score {
  sets: SetScore[];
  winner?: string;
}

export interface SetScore {
  homeScore: number;
  awayScore: number;
}

// Enums
export enum TournamentLevel {
  WORLD_CHAMPIONSHIP = 'world_championship',
  WORLD_TOUR = 'world_tour',
  CONTINENTAL = 'continental',
  NATIONAL = 'national',
  OTHER = 'other'
}

export enum TournamentStatus {
  UPCOMING = 'upcoming',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum MatchStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  FINISHED = 'finished',
  CANCELLED = 'cancelled'
}

// VIS API Configuration
export interface VISConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  rateLimitRpm: number;
  authToken?: string;
}

// Health Check Types
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  responseTime?: number;
  error?: string;
}

export interface VISHealthResponse {
  vis: HealthStatus;
  database: HealthStatus;
  cache: HealthStatus;
  overall: HealthStatus;
}

// Filter Types
export interface TournamentFilters {
  level?: TournamentLevel;
  status?: TournamentStatus;
  startDateFrom?: Date;
  startDateTo?: Date;
  country?: string;
  limit?: number;
  offset?: number;
}

// Error Types
export class VISAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'VISAPIError';
  }
}

export interface VISErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}