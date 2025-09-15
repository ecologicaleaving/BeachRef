/**
 * Legacy Tournament Interface
 * Temporary interface to support existing imports while transitioning to tournament-v2
 * This will be deprecated once migration to TournamentCore is complete
 */

export interface Tournament {
  No: string | number;
  Name: string;
  Code?: string;
  City?: string;
  Country?: string;
  CountryCode?: string;
  StartDate?: string;
  EndDate?: string;
  Type?: string;
  Gender?: 'M' | 'W' | 'X';
  Status?: string;

  // Additional properties that might be used by existing code
  Location?: string;
  InfoSchedule?: string;
  InfoLocation?: string;
  visNo?: string;

  // Make it flexible for any additional properties
  [key: string]: any;
}

/**
 * @deprecated Use TournamentCore from tournament-v2.ts for new code
 */
export type LegacyTournament = Tournament;