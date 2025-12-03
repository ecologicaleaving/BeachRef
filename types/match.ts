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
  // Challenge Referee fields (specs/006-match-officials-display)
  NoRefereeChallenge?: string;
  RefereeChallengeName?: string;
  RefereeChallengeFederationCode?: string;
  // Assistant Challenge Referee (bonus feature)
  NoRefereeAssistantChallenge?: string;
  RefereeAssistantChallengeName?: string;
  RefereeAssistantChallengeFederationCode?: string;
  // Reserve Referee (bonus feature)
  NoRefereeReserve?: string;
  RefereeReserveName?: string;
  RefereeReserveFederationCode?: string;
  /**
   * Personnel field containing HTML-entity-encoded XML with scorer/line judge IDs
   * Format: <Personnel Scorer="19" AssistantScorer="26" LineJudge1="3" LineJudge2="10" />
   * Requires HTML entity decoding and XML parsing
   */
  Personnel?: string;
  /**
   * Event number for cross-reference to GetEvent AuxiliaryPersons
   * Used to map Personnel IDs to official names
   * Note: VIS API returns NoEvent (not EventNo) - both are provided for compatibility
   */
  NoEvent?: string; // Official VIS API field name
  EventNo?: string; // Alias for backward compatibility
  /**
   * Match officials - Reference IDs from Personnel field (T046)
   * These are AuxiliaryPerson No values that need to be resolved to names
   */
  scorerNo?: string;
  assistantScorerNo?: string;
  lineJudge1No?: string;
  lineJudge2No?: string;
  // Referee assignment data
  refereeAssignments?: any[]; // Referee assignments for this match (using any[] for flexibility)
  // Additional fields for multi-tournament filtering
  tournamentGender?: string;
  tournamentNo?: string;
  tournamentCode?: string;
  tournamentCountry?: string;
}

/**
 * Set score structure for beach volleyball matches
 * Represents the score for a single set with team points and set number
 */
export type SetScore = {
  a: number;          // Team A points
  b: number;          // Team B points
  set: number;        // Set number (1, 2, or 3)
};

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