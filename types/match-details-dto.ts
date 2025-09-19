/**
 * @fileoverview Match Details DTO type definitions for VIS API integration
 *
 * BeachMatchDTO: Stable match metadata from GetBeachMatch endpoint
 * BeachMatchLiveDTO: Lightweight polling data from GetBeachMatchStatus + BeachLive
 *
 * Based on VIS Web Service documentation and fivbvis community client patterns
 */

/**
 * Stable match metadata - loaded once or updated rarely
 * Source: GetBeachMatch(No=<matchId>)
 */
export type BeachMatchDTO = {
  // Match & round identification
  no: number;                    // Match ID (No)
  tournamentNo?: number;         // NoTournament
  roundCode?: string;            // RoundCode
  roundName?: string;            // RoundName
  roundPhase?: string;           // RoundPhase (remapped from "Beach Match Round Phase")
  bracket?: string;              // RoundBracket
  status: string;                // Status (remapped from "Beach Match Status")
  resultType?: string;           // ResultType (remapped from "Beach Match Result Type")

  // Timing & timezone
  beginDateTimeUtc?: string;     // BeginDateTimeUtc (ISO format)
  endDateTimeUtc?: string;       // EndDateTimeUtc (ISO format)
  localDate?: string;            // LocalDate
  localTime?: string;            // LocalTime
  localTimeOffset?: string;      // LocalTimeOffset (e.g. +02:00)
  timeZone?: string;             // TimeZone (timezone name)

  // Venue / court
  court?: string;                // Court
  venue?: string;                // Venue
  city?: string;                 // City

  // Teams
  teamA: {
    no?: number;                 // NoTeamA
    name?: string;               // TeamAName
    federation?: string;         // TeamAFederationCode
    players?: {                  // Players (if exposed)
      a1?: number;               // NoPlayerA1
      a2?: number;               // NoPlayerA2
    }
  };
  teamB: {
    no?: number;                 // NoTeamB
    name?: string;               // TeamBName
    federation?: string;         // TeamBFederationCode
    players?: {
      b1?: number;               // NoPlayerB1
      b2?: number;               // NoPlayerB2
    }
  };

  // Referees (if present)
  referees?: {
    first?: { no?: number; name?: string; federation?: string };
    second?: { no?: number; name?: string; federation?: string };
    challenge?: { no?: number; name?: string } | null;
  };

  // Closed set scores + summary
  sets?: Array<{ set: number; a: number; b: number; durationSec?: number }>;
  setsResultsText?: string;      // Official summary string

  // Other metadata
  format?: string;               // "Beach Match Format"
  liveStreamUri?: string | null; // Streaming link if present
  acquisitionMethod?: string;    // "Beach Match Acquisition Method"
  tournamentType?: string;       // "Beach Tournament Type"
  tournamentGender?: string;     // "Event Gender"
  version?: number;              // Version (for caching)
};

/**
 * Lightweight live polling data
 * Primary source: GetBeachMatchStatus(No=<matchId>)
 * Optional play-by-play: BeachLive element from "Beach Live_xsd" schema
 */
export type BeachMatchLiveDTO = {
  // Current state snapshot (from MatchStatus)
  status: string;           // e.g. InSet1, InSet2, Finished...
  currentSet?: number;      // Current set in progress
  points: {                 // Current set score
    a: number | null;
    b: number | null;
  };
  teamServing?: "A" | "B" | null;
  timeouts?: { a: number; b: number; technical?: boolean }; // Counts/flags
  lastUpdate?: string;      // Timestamp/version for deduplication
  // Closed set summary (if exposed by MatchStatus)
  closedSets?: Array<{ set: number; a: number; b: number }>;

  // Play-by-play (optional, from BeachLive)
  liveFeed?: {
    available: boolean;
    events?: Array<{
      set: number;                  // SetNumber
      rally?: number;               // RallyNumber/sequence
      ts?: string;                  // Timestamp if present
      servingTeam?: "A" | "B" | null;
      action?: string;              // EventType/Action (point, ace, fault, TO...)
      detail?: string | null;       // Description/player if available
      scoreAfter?: { a: number; b: number }; // PointsA/B after event
    }>;
  };
};

/**
 * Procedural workflow types for DTO population
 */

/**
 * Step 1: Bootstrap parameters for GetBeachMatch
 */
export type BeachMatchBootstrapParams = {
  matchNo: number;
  includeTournamentTimezone?: boolean;
};

/**
 * Step 2: Polling parameters for GetBeachMatchStatus
 */
export type BeachMatchPollingParams = {
  matchNo: number;
  lastVersion?: number;
  currentStatus?: string;
};

/**
 * Step 3: Play-by-play parameters for BeachLive endpoint
 */
export type BeachMatchLiveFeedParams = {
  matchNo: number;
  lastSequence?: number;
};

/**
 * Polling configuration based on match status
 */
export type BeachMatchPollingConfig = {
  interval: number;        // Polling interval in milliseconds
  maxRetries: number;      // Max consecutive failures before backing off
  backoffMultiplier: number; // Backoff factor for failures
};

/**
 * Status-based polling intervals
 */
export const BEACH_MATCH_POLLING_INTERVALS = {
  IN_SET: 3000,           // 3s during active sets (InSet1, InSet2, InSet3)
  BETWEEN_SETS: 10000,    // 10s between sets
  FINISHED: 15000,        // 15s when finished (reduce frequency)
  OFFICIAL_RESULT: 30000, // 30s when official (minimal polling)
  DEFAULT: 5000           // 5s default fallback
} as const;

/**
 * VIS endpoint mapping for DTO population
 */
export type VISEndpointMapping = {
  beachMatch: 'GetBeachMatch';      // → BeachMatchDTO
  matchStatus: 'GetBeachMatchStatus'; // → BeachMatchLiveDTO.status/points
  beachLive: 'GetBeachLive';        // → BeachMatchLiveDTO.liveFeed (optional)
  tournament: 'GetBeachTournament'; // → timezone normalization
};

/**
 * Type guards for DTO validation
 */

export function isValidBeachMatchDTO(data: any): data is BeachMatchDTO {
  return (
    data &&
    typeof data.no === 'number' &&
    typeof data.status === 'string' &&
    data.teamA &&
    data.teamB
  );
}

export function isValidBeachMatchLiveDTO(data: any): data is BeachMatchLiveDTO {
  return (
    data &&
    typeof data.status === 'string' &&
    data.points &&
    (data.points.a === null || typeof data.points.a === 'number') &&
    (data.points.b === null || typeof data.points.b === 'number')
  );
}

/**
 * Utility functions for status-based polling logic
 */

export function getPollingInterval(status: string): number {
  const upperStatus = status.toUpperCase();

  if (upperStatus.includes('INSET')) {
    return BEACH_MATCH_POLLING_INTERVALS.IN_SET;
  }
  if (upperStatus === 'FINISHED') {
    return BEACH_MATCH_POLLING_INTERVALS.FINISHED;
  }
  if (upperStatus === 'OFFICIALRESULT') {
    return BEACH_MATCH_POLLING_INTERVALS.OFFICIAL_RESULT;
  }
  if (upperStatus.includes('BETWEEN') || upperStatus.includes('BREAK')) {
    return BEACH_MATCH_POLLING_INTERVALS.BETWEEN_SETS;
  }

  return BEACH_MATCH_POLLING_INTERVALS.DEFAULT;
}

export function shouldPoll(status: string): boolean {
  const upperStatus = status.toUpperCase();
  return !upperStatus.includes('CANCELLED') && !upperStatus.includes('POSTPONED');
}

/**
 * Data transformation utilities
 */

export function extractClosedSets(beachMatchDTO: BeachMatchDTO): Array<{ set: number; a: number; b: number }> {
  return beachMatchDTO.sets?.map(set => ({
    set: set.set,
    a: set.a,
    b: set.b
  })) || [];
}

export function mergePollingData(
  baseDTO: BeachMatchDTO,
  liveDTO: BeachMatchLiveDTO
): BeachMatchDTO & { live: BeachMatchLiveDTO } {
  return {
    ...baseDTO,
    status: liveDTO.status, // Live status takes precedence
    live: liveDTO
  };
}