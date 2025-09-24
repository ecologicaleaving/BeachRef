/**
 * @fileoverview BeachMatchLiveDTO - Complete beach volleyball match data structure
 *
 * Based on the reference template from docs/Guidelines/reference/beachMatchLiveDTO.md
 * This represents the complete, normalized structure for beach volleyball match data
 * combining static match data with live updates.
 *
 * Data Pipeline:
 * 1. GetBeachMatch(no) → core data (tournament, round, set scores, referees, status)
 * 2. GetBeachTournament(code) → DefaultTimeZone, dates, venue info
 * 3. GetBeachMatchLiveScore(no) → live status, real-time scores, serve speeds, etc.
 * 4. GetBeachMatchStatistics(no) → team and player statistics
 * 5. (Optional) BeachMatchPersonnel → additional officials
 */

// ── ENUM ──────────────────────────────────────────────────────────────────────
export type BeachMatchStatus =
  | "Scheduled" | "ReadyToStart"
  | "InSet1" | "Set1Finished"
  | "InSet2" | "Set2Finished"
  | "InSet3" | "Set3Finished"
  | "InSet4" | "Set4Finished"
  | "InSet5" | "Set5Finished"
  | "Finished" | "OfficialResult" | "Corrected" | "Closed";

export type ResultType =
  | "Normal"
  | "ForfeitA" | "ForfeitB" | "ForfeitBoth"
  | "InjuryA"  | "InjuryB"  | "InjuryBoth"
  | "OutA"     | "OutB"     | "OutBoth"
  | "DisqualifiedA" | "DisqualifiedB" | "DisqualifiedBoth";

// ── CORE ──────────────────────────────────────────────────────────────────────
export interface BeachMatchLiveDTO {
  matchNo: number;
  noInTournament?: string; // Match number within tournament for badge display
  tournamentGender?: 'M' | 'W' | 'MIXED'; // Tournament gender for badge styling
  tournament: {
    code: string;
    name?: string;
    city?: string;
    venue?: string;
    startDate?: string;
    endDate?: string;
    defaultTimeZone?: string;
  };
  round: {
    code?: string;
    name?: string;
    bracket?: string;
    phase?: string;
  };
  schedule: {
    localDate?: string;
    localTime?: string;
    utcBegin?: string | null;
    utcEnd?: string | null;
    duration?: string | number | null;
    localTimeOffsetMin?: number | null;
    localDateTimeDisplay?: string;
  };
  venue: {
    court?: string;
    temperature?: number | null;
    humidity?: number | null;
    spectators?: number | null;
  };
  status: {
    state: BeachMatchStatus;
    resultType?: ResultType;
    resultText?: string;
  };
  teams: {
    home: TeamSide;
    away: TeamSide;
  };
  score: {
    sets: Array<SetScore>;
    totalSets?: { home: number; away: number } | null;
    fastestServeKmh?: {
      home?: { p1?: number | null; p2?: number | null };
      away?: { p1?: number | null; p2?: number | null };
    };
    lastServeSpeedKmh?: number | null;
    servingPlayerNo?: number | null;
    matchPoints?: { home: number; away: number } | null;
    setDurations?: number[] | string[] | null;
  };
  officials?: {
    firstReferee?: Official | null;
    secondReferee?: Official | null;
    others?: Official[];
  };
  rankings?: {
    winnerRank?: number | null;
    loserRank?: number | null;
  };
  statistics?: {
    team?: {
      home?: TeamStatistics | null;
      away?: TeamStatistics | null;
    };
    players?: PlayerStatisticsEntry[];
  };
  audit?: {
    lastChangeAt?: string | null;
    lastChangeBy?: string | null;
    liveRefreshDelaySec?: number | null;
    liveVersion?: number | null;
  };
}

export interface TeamSide {
  teamName?: string;
  federationCode?: string;
  seedMainDraw?: number | null;
  seedQualification?: number | null;
  type?: string | null;
  setWon?: number | null;
  players: [Player, Player];
}

export interface Player {
  noPlayer?: number | null;
  name?: string;
  federationCode?: string | null;
  shirtNo?: number | null;
}

export interface SetScore {
  setNo: number;
  home: number | null;
  away: number | null;
}

export interface Official {
  no?: number | null;
  name?: string | null;
  federationCode?: string | null;
}

// ── STATISTICS ────────────────────────────────────────────────────────────────
export interface TeamStatistics {
  spikePoint?: number; spikeFault?: number; spikeContinue?: number;
  blockPoint?: number; blockFault?: number; blockContinue?: number;
  servePoint?: number; serveFault?: number; serveContinue?: number; serveKey?: number;
  receptionExcellent?: number; receptionFault?: number; receptionContinue?: number;
  digExcellent?: number; digFault?: number; digContinue?: number; digKey?: number;
  setPoint?: number; setFault?: number; setContinue?: number;
  backSpikePoint?: number; backSpikeFault?: number; backSpikeContinue?: number;
  opponentFault?: number; opponentContinue?: number;
  teamFault?: number;
}

export interface PlayerStatisticsEntry {
  team: "home" | "away";
  playerNo?: number | null;
  shirtNo?: number | null;
  name?: string | null;
  federationCode?: string | null;
  spikePoint?: number; spikeFault?: number; spikeContinue?: number;
  blockPoint?: number; blockFault?: number; blockContinue?: number;
  servePoint?: number; serveFault?: number; serveContinue?: number;
  receptionExcellent?: number; receptionFault?: number; receptionContinue?: number;
  digExcellent?: number; digFault?: number; digContinue?: number;
  setPoint?: number; setFault?: number; setContinue?: number;
}

// ── HELPER TYPES ──────────────────────────────────────────────────────────────

/**
 * Parameters for building a BeachMatchLiveDTO
 */
export interface BeachMatchLiveDTOParams {
  matchNo: number;
  tournamentNo?: number;
  includeTournamentInfo?: boolean;
  includeStatistics?: boolean;
  includeOfficials?: boolean;
  matchData?: any; // Optional existing match data to avoid API calls
}

/**
 * Status mapping from VIS numeric codes to BeachMatchStatus
 */
export const VIS_STATUS_TO_BEACH_MATCH_STATUS: Record<number, BeachMatchStatus> = {
  1: "Scheduled",
  2: "ReadyToStart",
  3: "InSet1",
  4: "Set1Finished",
  5: "InSet2",
  6: "Set2Finished",
  7: "InSet3",
  8: "Set3Finished",
  9: "InSet4",
  10: "Set4Finished",
  11: "InSet5",
  12: "Finished",
  13: "OfficialResult",
  14: "Corrected",
  15: "Closed"
};

/**
 * Result type mapping from VIS numeric codes to ResultType
 */
export const VIS_RESULT_TYPE_TO_RESULT_TYPE: Record<number, ResultType> = {
  0: "Normal",
  1: "ForfeitA",
  2: "ForfeitB",
  3: "ForfeitBoth",
  4: "InjuryA",
  5: "InjuryB",
  6: "InjuryBoth",
  7: "OutA",
  8: "OutB",
  9: "OutBoth",
  10: "DisqualifiedA",
  11: "DisqualifiedB",
  12: "DisqualifiedBoth"
};

/**
 * Type guard to check if an object is a valid BeachMatchLiveDTO
 */
export function isBeachMatchLiveDTO(obj: any): obj is BeachMatchLiveDTO {
  return typeof obj === 'object' &&
         obj !== null &&
         typeof obj.matchNo === 'number' &&
         typeof obj.tournament === 'object' &&
         typeof obj.status === 'object' &&
         typeof obj.teams === 'object' &&
         typeof obj.score === 'object';
}

/**
 * Creates a minimal BeachMatchLiveDTO with required fields
 */
export function createMinimalBeachMatchLiveDTO(matchNo: number): BeachMatchLiveDTO {
  return {
    matchNo,
    tournament: {
      code: "unknown"
    },
    round: {},
    schedule: {},
    venue: {},
    status: {
      state: "Scheduled"
    },
    teams: {
      home: {
        players: [{ name: "" }, { name: "" }]
      },
      away: {
        players: [{ name: "" }, { name: "" }]
      }
    },
    score: {
      sets: []
    }
  };
}