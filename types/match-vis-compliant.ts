/**
 * @fileoverview VIS-Compliant Match Types
 * 
 * This file contains VIS API specification-compliant match types that replace 
 * the fragmented string-based interfaces with proper numeric types and VIS schema alignment.
 * 
 * Part of VIS Data Structure Alignment Epic - Foundation Types
 */

/**
 * Beach Match Format Enum as required by VIS schema
 * 
 * @description Defines the match format types supported by VIS API
 */
export enum BeachMatchFormat {
  /** Best of 3 sets match format */
  BEST_OF_3 = 'BestOf3',
  /** Best of 5 sets match format */ 
  BEST_OF_5 = 'BestOf5',
  /** Timed match format */
  TIMED = 'Timed'
}

/**
 * VIS-Compliant Match Interface
 * 
 * @description Complete match data structure aligned with official VIS API schema.
 * All numeric fields use proper number types instead of strings, and field names
 * match VIS schema exactly (e.g., TeamAFederationCode vs TeamACountryCode).
 * 
 * @see VIS API Schema Documentation for field specifications
 */
export interface VisCompliantMatch {
  // REQUIRED fields per VIS schema
  
  /** Match number - xs:positiveInteger (required) */
  readonly No: number;
  
  /** Match number within tournament - xs:positiveInteger (required) */  
  readonly NoInTournament: number;
  
  /** Match format - required per VIS schema */
  readonly Format: BeachMatchFormat;
  
  // Core match data with proper types
  
  /** Local match date - xs:date */
  readonly LocalDate?: string;
  
  /** Local match time - xs:time */
  readonly LocalTime?: string;
  
  /** UTC match date - xs:date */
  readonly UtcDate?: string;
  
  /** UTC match time - xs:time */
  readonly UtcTime?: string;
  
  /** Match begin timestamp - xs:dateTime */
  readonly BeginDateTimeUtc?: string;
  
  /** Match end timestamp - xs:dateTime */
  readonly EndDateTimeUtc?: string;
  
  // Team information (VIS-compliant field names)
  
  /** Team A name */
  readonly TeamAName?: string;
  
  /** Team B name */
  readonly TeamBName?: string;
  
  /** Team A player 1 name */
  readonly TeamAPlayer1?: string;
  
  /** Team A player 2 name */
  readonly TeamAPlayer2?: string;
  
  /** Team B player 1 name */
  readonly TeamBPlayer1?: string;
  
  /** Team B player 2 name */  
  readonly TeamBPlayer2?: string;
  
  /** Team A federation code (VIS schema compliant - NOT CountryCode) */
  readonly TeamAFederationCode?: string;
  
  /** Team B federation code (VIS schema compliant - NOT CountryCode) */
  readonly TeamBFederationCode?: string;
  
  /** Team A ranking - xs:byte */
  readonly TeamARanking?: number;
  
  /** Team B ranking - xs:byte */
  readonly TeamBRanking?: number;
  
  // Match results with numeric types (VIS schema compliant)
  
  /** Team A match points - xs:nonNegativeInteger */
  readonly MatchPointsA?: number;
  
  /** Team B match points - xs:nonNegativeInteger */
  readonly MatchPointsB?: number;
  
  /** Team A set 1 points - xs:nonNegativeInteger */
  readonly PointsTeamASet1?: number;
  
  /** Team B set 1 points - xs:nonNegativeInteger */
  readonly PointsTeamBSet1?: number;
  
  /** Team A set 2 points - xs:nonNegativeInteger */
  readonly PointsTeamASet2?: number;
  
  /** Team B set 2 points - xs:nonNegativeInteger */
  readonly PointsTeamBSet2?: number;
  
  /** Team A set 3 points - xs:nonNegativeInteger */
  readonly PointsTeamASet3?: number;
  
  /** Team B set 3 points - xs:nonNegativeInteger */
  readonly PointsTeamBSet3?: number;
  
  /** Winner ranking - xs:byte */
  readonly WinnerRank?: number;
  
  /** Loser ranking - xs:byte */
  readonly LoserRank?: number;
  
  // Location information
  
  /** Court identifier */
  readonly Court?: string;
  
  /** City name */
  readonly City?: string;
  
  /** Venue name */
  readonly Venue?: string;
  
  // Officials with numeric types (VIS schema compliant)
  
  /** Referee 1 number - xs:positiveInteger */
  readonly NoReferee1?: number;
  
  /** Referee 2 number - xs:positiveInteger */
  readonly NoReferee2?: number;
  
  /** Challenge referee number - xs:positiveInteger */
  readonly NoRefereeChallenge?: number;
  
  /** Referee 1 name */
  readonly Referee1Name?: string;
  
  /** Referee 2 name */
  readonly Referee2Name?: string;
  
  /** Referee 1 federation code */
  readonly Referee1FederationCode?: string;
  
  /** Referee 2 federation code */
  readonly Referee2FederationCode?: string;
  
  // Environmental data (VIS schema fields)
  
  /** Temperature in 1/100 °C - xs:short */
  readonly Temperature?: number;
  
  /** Humidity in 1/10 % - xs:nonNegativeInteger */
  readonly Humidity?: number;
  
  /** Number of spectators - xs:nonNegativeInteger */
  readonly NbSpectators?: number;
  
  // Performance statistics (VIS schema fields)
  
  /** Fastest serve by Team A Player 1 in km/h - xs:nonNegativeInteger */
  readonly FastestServeTeamAPlayer1?: number;
  
  /** Fastest serve by Team A Player 2 in km/h - xs:nonNegativeInteger */
  readonly FastestServeTeamAPlayer2?: number;
  
  /** Fastest serve by Team B Player 1 in km/h - xs:nonNegativeInteger */
  readonly FastestServeTeamBPlayer1?: number;
  
  /** Fastest serve by Team B Player 2 in km/h - xs:nonNegativeInteger */
  readonly FastestServeTeamBPlayer2?: number;
  
  // Additional context fields
  
  /** Match version for caching */
  readonly Version?: string;
  
  /** Match status */
  readonly Status?: string;
  
  /** Round identifier */
  readonly Round?: string;
  
  /** Round phase */
  readonly RoundPhase?: string;
  
  /** Round name */
  readonly RoundName?: string;
  
  /** Round code */
  readonly RoundCode?: string;
  
  /** Round bracket */
  readonly RoundBracket?: string;
  
  /** Result type text description */
  readonly ResultTypeText?: string;
  
  // Duration fields (VIS provides in seconds)
  
  /** Set 1 duration in seconds - xs:nonNegativeInteger */
  readonly DurationSet1Seconds?: number;
  
  /** Set 2 duration in seconds - xs:nonNegativeInteger */
  readonly DurationSet2Seconds?: number;
  
  /** Set 3 duration in seconds - xs:nonNegativeInteger */
  readonly DurationSet3Seconds?: number;
  
  // Tournament context (for compatibility with existing system)
  
  /** Tournament gender for filtering */
  readonly tournamentGender?: string;
  
  /** Tournament number for filtering */  
  readonly tournamentNo?: string;
  
  /** Tournament code for filtering */
  readonly tournamentCode?: string;
  
  /** Tournament country for filtering */
  readonly tournamentCountry?: string;
}

/**
 * Type guard to check if a match is VIS-compliant
 * 
 * @param match - Match object to check
 * @returns True if match conforms to VIS-compliant structure
 */
export function isVisCompliantMatch(match: any): match is VisCompliantMatch {
  return (
    match !== null &&
    match !== undefined &&
    typeof match === 'object' &&
    typeof match.No === 'number' &&
    typeof match.NoInTournament === 'number' &&
    match.Format !== null &&
    match.Format !== undefined &&
    Object.values(BeachMatchFormat).includes(match.Format)
  );
}

/**
 * Type guard to check if a match uses legacy string-based types
 * 
 * @param match - Match object to check  
 * @returns True if match uses legacy string types
 */
export function isLegacyMatch(match: any): boolean {
  return (
    match !== null &&
    match !== undefined &&
    typeof match === 'object' &&
    typeof match.No === 'string' &&
    (typeof match.MatchPointsA === 'string' || match.MatchPointsA === undefined)
  );
}

/**
 * Compatibility layer type that can handle both legacy and VIS-compliant matches
 * 
 * @description Union type for gradual migration from legacy string-based matches
 * to VIS-compliant numeric matches. Use type guards to distinguish between formats.
 */
export type MatchCompatibilityLayer = VisCompliantMatch | {
  // Legacy format with string types
  readonly No: string;
  readonly NoInTournament?: string;
  readonly MatchPointsA?: string;
  readonly MatchPointsB?: string;
  readonly NoReferee1?: string;
  readonly NoReferee2?: string;
  readonly TeamARanking?: string;
  readonly TeamBRanking?: string;
  // Include other legacy fields as needed
  [key: string]: any;
};

/**
 * Safely converts legacy string-based match data to VIS-compliant numeric types
 * 
 * @param legacyMatch - Legacy match with string types
 * @returns VIS-compliant match with proper numeric types
 * @throws Error if required numeric conversions fail
 */
export function convertLegacyToVisCompliant(legacyMatch: any): VisCompliantMatch {
  if (isVisCompliantMatch(legacyMatch)) {
    return legacyMatch;
  }

  // Convert required numeric fields with validation
  const No = parseInt(legacyMatch.No, 10);
  const NoInTournament = legacyMatch.NoInTournament 
    ? parseInt(legacyMatch.NoInTournament, 10)
    : 1; // Default to 1 if missing (common in single-tournament contexts)
  
  if (isNaN(No) || No <= 0) {
    throw new Error(`Invalid match number: ${legacyMatch.No}`);
  }
  
  if (isNaN(NoInTournament) || NoInTournament <= 0) {
    throw new Error(`Invalid tournament match number: ${legacyMatch.NoInTournament}`);
  }

  // Convert optional numeric fields safely
  const safeParseInt = (value: string | undefined): number | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) || parsed < 0 ? undefined : parsed; // VIS schema uses nonNegativeInteger for most fields
  };

  return {
    // Required fields
    No,
    NoInTournament,
    Format: BeachMatchFormat.BEST_OF_3, // Default format - TODO: Determine from actual match data in future stories
    
    // Convert numeric fields
    MatchPointsA: safeParseInt(legacyMatch.MatchPointsA),
    MatchPointsB: safeParseInt(legacyMatch.MatchPointsB),
    NoReferee1: safeParseInt(legacyMatch.NoReferee1),
    NoReferee2: safeParseInt(legacyMatch.NoReferee2),
    TeamARanking: safeParseInt(legacyMatch.TeamARanking),
    TeamBRanking: safeParseInt(legacyMatch.TeamBRanking),
    PointsTeamASet1: safeParseInt(legacyMatch.PointsTeamASet1),
    PointsTeamBSet1: safeParseInt(legacyMatch.PointsTeamBSet1),
    PointsTeamASet2: safeParseInt(legacyMatch.PointsTeamASet2),
    PointsTeamBSet2: safeParseInt(legacyMatch.PointsTeamBSet2),
    PointsTeamASet3: safeParseInt(legacyMatch.PointsTeamASet3),
    PointsTeamBSet3: safeParseInt(legacyMatch.PointsTeamBSet3),
    
    // Copy string fields (with VIS-compliant field names)
    LocalDate: legacyMatch.LocalDate,
    LocalTime: legacyMatch.LocalTime,
    TeamAName: legacyMatch.TeamAName,
    TeamBName: legacyMatch.TeamBName,
    TeamAFederationCode: legacyMatch.TeamAFederationCode || legacyMatch.TeamACountryCode,
    TeamBFederationCode: legacyMatch.TeamBFederationCode || legacyMatch.TeamBCountryCode,
    Court: legacyMatch.Court,
    Version: legacyMatch.Version,
    Status: legacyMatch.Status,
    Round: legacyMatch.Round,
    RoundPhase: legacyMatch.RoundPhase,
    RoundName: legacyMatch.RoundName,
    RoundCode: legacyMatch.RoundCode,
    RoundBracket: legacyMatch.RoundBracket,
    Referee1Name: legacyMatch.Referee1Name,
    Referee2Name: legacyMatch.Referee2Name,
    Referee1FederationCode: legacyMatch.Referee1FederationCode,
    Referee2FederationCode: legacyMatch.Referee2FederationCode,
    
    // Tournament context fields
    tournamentGender: legacyMatch.tournamentGender,
    tournamentNo: legacyMatch.tournamentNo,
    tournamentCode: legacyMatch.tournamentCode,
    tournamentCountry: legacyMatch.tournamentCountry,
  };
}

/**
 * Example usage:
 * 
 * ```typescript
 * // Creating a new VIS-compliant match
 * const match: VisCompliantMatch = {
 *   No: 123,
 *   NoInTournament: 45,
 *   Format: BeachMatchFormat.BEST_OF_3,
 *   TeamAFederationCode: 'BRA',
 *   TeamBFederationCode: 'USA',
 *   MatchPointsA: 2,
 *   MatchPointsB: 1
 * };
 * 
 * // Type-safe checking
 * if (isVisCompliantMatch(someMatch)) {
 *   // TypeScript knows this is VisCompliantMatch
 *   console.log(someMatch.No); // number type
 * }
 * 
 * // Converting legacy data
 * const converted = convertLegacyToVisCompliant(legacyStringMatch);
 * ```
 */