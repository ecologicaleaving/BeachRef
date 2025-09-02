/**
 * @deprecated Use VisCompliantMatch from types/match-vis-compliant.ts instead
 * This interface will be removed in a future version as part of VIS data structure alignment
 */
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
  // Additional fields for multi-tournament filtering
  tournamentGender?: string;
  tournamentNo?: string;
  tournamentCode?: string;
  tournamentCountry?: string;
}