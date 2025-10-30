export interface BeachMatch {
  No: string;
  NoInTournament?: string;
  LocalDate?: string;
  LocalTime?: string;
  TeamAName?: string;
  TeamBName?: string;
  TeamACountryCode?: string;
  TeamBCountryCode?: string;
  TeamAFederationCode?: string;
  TeamBFederationCode?: string;
  Court?: string;
  MatchPointsA?: string;
  MatchPointsB?: string;
  PointsTeamASet1?: string;
  PointsTeamBSet1?: string;
  PointsTeamASet2?: string;
  PointsTeamBSet2?: string;
  PointsTeamASet3?: string;
  PointsTeamBSet3?: string;
  DurationSet1?: string;
  DurationSet2?: string;
  DurationSet3?: string;
  StartTime?: string;  // Match start time (HH:MM format)
  EndTime?: string;    // Match end time (HH:MM format)
  Version?: string;
  Status?: string;
  Round?: string;
  RoundPhase?: string;
  RoundName?: string;
  RoundCode?: string;
  RoundBracket?: string;
  NoReferee1?: string;
  NoReferee2?: string;
  Referee1Name?: string;
  Referee2Name?: string;
  Referee1FederationCode?: string;
  Referee2FederationCode?: string;
  // Additional fields for multi-tournament filtering
  tournamentGender?: string;
  tournamentNo?: string;
  tournamentCode?: string;
  tournamentCountry?: string;
}

/**
 * Real-time match duration state for live matches
 * Calculated client-side, synced with 5-second polling
 */
export interface MatchDuration {
  matchNo: string;                    // Match identifier (BeachMatch.No)
  totalMinutes: number;               // Total duration in minutes
  currentSetMinutes: number | null;   // Current set duration (null if finished)
  set1Duration: number | null;        // Set 1 duration in minutes (null if not started)
  set2Duration: number | null;        // Set 2 duration in minutes (null if not started)
  set3Duration: number | null;        // Set 3 duration in minutes (null if not started)
  isLive: boolean;                    // True if match is currently running
  lastUpdated: number;                // Timestamp of last update (milliseconds)
}