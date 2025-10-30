/**
 * Tournament Team Type Definitions
 *
 * Defines entity types for beach volleyball tournament team registrations.
 * Feature: 003-players-entry-list
 */

/**
 * Individual player information within a team
 */
export interface TeamPlayer {
  /** VIS player ID */
  playerNo: number;
  /** Full player name (format: "LASTNAME Firstname") */
  fullName: string;
  /** Player country/federation (ISO 3166-1 alpha-2) */
  countryCode: string;
  /** Optional: Current world ranking */
  ranking?: number;
}

/**
 * Tournament phase classification
 */
export type TeamPhase = 'MainDraw' | 'Qualification';

/**
 * Team entry status
 */
export type TeamStatus = 'Confirmed' | 'Withdrawn' | 'Reserve';

/**
 * Team registration in a beach volleyball tournament
 */
export interface TournamentTeam {
  // Identity
  /** Unique team number within tournament */
  teamNo: number;
  /** Parent tournament identifier */
  tournamentNo: number;

  // Players
  /** First player details */
  player1: TeamPlayer;
  /** Second player details */
  player2: TeamPlayer;

  // Tournament Data
  /** Seed number (null if unseeded) */
  seed: number | null;
  /** Main draw or qualification */
  phaseCode: TeamPhase;
  /** Team gender (Men/Women) */
  gender: 'M' | 'W';

  // Status & Designations
  /** Entry status */
  status: TeamStatus;
  /** Wild card team flag */
  isWildCard: boolean;
  /** Reserve team flag */
  isReserve: boolean;

  // Metadata
  /** ISO 3166-1 alpha-2 country code */
  countryCode: string;
}

/**
 * Filter state for team list display
 */
export interface TeamListFilter {
  gender: 'All' | 'M' | 'W';
  phase: 'All' | 'MainDraw' | 'Qualification';
}

/**
 * Default filter state
 */
export const DEFAULT_TEAM_FILTER: TeamListFilter = {
  gender: 'All',
  phase: 'All',
};

/**
 * Complete state for team list screen
 */
export interface TeamListState {
  // Data
  teams: TournamentTeam[];
  filteredTeams: TournamentTeam[];

  // Filters
  filter: TeamListFilter;

  // UI State
  loading: boolean;
  refreshing: boolean;
  error: string | null;

  // Modal State
  selectedTeam: TournamentTeam | null;
  modalVisible: boolean;
}

/**
 * Cached team list with metadata
 */
export interface CachedTeamList {
  tournamentNo: number;
  teams: TournamentTeam[];
  cachedAt: number;           // Unix timestamp (milliseconds)
  expiresAt: number;          // Unix timestamp (milliseconds)
  tournamentStartDate: string; // ISO date string
}

// Display Constants

/** Team card height for FlatList getItemLayout */
export const TEAM_CARD_HEIGHT = 80;

/** Phase display labels */
export const PHASE_LABELS: Record<TeamPhase, string> = {
  MainDraw: 'Main Draw',
  Qualification: 'Qualification',
};

/** Status display labels */
export const STATUS_LABELS: Record<TeamStatus, string> = {
  Confirmed: 'Confirmed',
  Withdrawn: 'Withdrawn',
  Reserve: 'Reserve',
};

/** Status badge colors */
export const STATUS_COLORS: Record<TeamStatus, string> = {
  Confirmed: 'transparent',
  Withdrawn: '#DC2626', // red-600
  Reserve: '#6B7280',   // gray-500
};

// Type Guards

/**
 * Type guard for validating TeamPlayer objects
 */
export function isValidTeamPlayer(player: unknown): player is TeamPlayer {
  if (typeof player !== 'object' || player === null) return false;
  const p = player as TeamPlayer;

  return (
    typeof p.playerNo === 'number' &&
    typeof p.fullName === 'string' &&
    p.fullName.length > 0 &&
    typeof p.countryCode === 'string'
  );
}

/**
 * Type guard for validating TournamentTeam objects
 */
export function isValidTeam(team: unknown): team is TournamentTeam {
  if (typeof team !== 'object' || team === null) return false;
  const t = team as TournamentTeam;

  return (
    typeof t.teamNo === 'number' &&
    typeof t.tournamentNo === 'number' &&
    isValidTeamPlayer(t.player1) &&
    isValidTeamPlayer(t.player2) &&
    (t.seed === null || typeof t.seed === 'number') &&
    ['MainDraw', 'Qualification'].includes(t.phaseCode) &&
    ['M', 'W'].includes(t.gender) &&
    ['Confirmed', 'Withdrawn', 'Reserve'].includes(t.status) &&
    typeof t.isWildCard === 'boolean' &&
    typeof t.isReserve === 'boolean' &&
    typeof t.countryCode === 'string'
  );
}
