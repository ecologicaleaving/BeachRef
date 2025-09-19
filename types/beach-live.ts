/**
 * @fileoverview BeachLive type definitions for VIS API GetBeachLiveRequest
 * Based on VIS SDK BeachLive schema
 * Part of EPIC-001 Live Score Display - Story 1.1
 */

/**
 * Main BeachLive response from VIS API
 * Contains live match state and scoring information
 */
export interface BeachLive {
  /** Version number for bandwidth optimization */
  readonly version: number;
  
  /** Server-suggested polling delay in milliseconds */
  readonly pollDelay: number;
  
  /** Whether the ball is currently in play */
  readonly isBallInPlay: boolean;
  
  /** Whether Team A has match point */
  readonly isMatchPointTeamA: boolean;
  
  /** Whether Team B has match point */
  readonly isMatchPointTeamB: boolean;
  
  /** Whether Team A has set point */
  readonly isSetPointTeamA: boolean;
  
  /** Whether Team B has set point */
  readonly isSetPointTeamB: boolean;
  
  /** Number of the serving team (1 or 2) */
  readonly noServingTeam: number;
  
  /** Number of the serving player */
  readonly noServingPlayer: number;
  
  /** Number of team positioned at left side */
  readonly noTeamAtLeft: number;
  
  /** Number of team positioned at right side */
  readonly noTeamAtRight: number;
  
  /** Match information */
  readonly match: BeachLiveMatch;
  
  /** Set scores and details */
  readonly sets: readonly BeachLiveSet[];
  
  /** Team A details */
  readonly teamA: BeachLiveTeam;
  
  /** Team B details */
  readonly teamB: BeachLiveTeam;
  
  /** Tournament context */
  readonly tournament: BeachLiveTournament;
  
  /** Optional match statistics */
  readonly statistics?: BeachLiveStatistics;
  
  /** Match events timeline */
  readonly events?: readonly BeachLiveEvent[];

  /** Telemetry and debugging metadata */
  readonly telemetry?: BeachLiveTelemetry;
}

/** Telemetry metadata for BeachLive responses */
export interface BeachLiveTelemetry {
  readonly rawSetAttributes?: Record<number, Record<string, string>>;
}

/**
 * Match information within BeachLive
 */
export interface BeachLiveMatch {
  /** Match number */
  readonly no: number;
  
  /** Match number within tournament */
  readonly noInTournament: number;
  
  /** Current match status */
  readonly status: BeachMatchStatus;
  
  /** Match date and time */
  readonly dateTime: string;
  
  /** Court information */
  readonly court: BeachLiveCourt;
  
  /** Current round information */
  readonly round: BeachLiveRound;
  
  /** Duration of match in minutes */
  readonly durationMinutes?: number;
  
  /** Weather conditions */
  readonly weather?: BeachLiveWeather;
}

/**
 * Set information with scores
 */
export interface BeachLiveSet {
  /** Set number (1, 2, 3) */
  readonly no: number;
  
  /** Team A points in this set */
  readonly pointsTeamA: number;
  
  /** Team B points in this set */
  readonly pointsTeamB: number;
  
  /** Set status */
  readonly status: BeachSetStatus;
  
  /** Set duration in minutes */
  readonly durationMinutes?: number;
  
  /** Technical timeouts taken */
  readonly technicalTimeouts?: readonly BeachLiveTechnicalTimeout[];
  /** Set duration in seconds */
  readonly durationSeconds?: number;
  /** Offset from match start in seconds */
  readonly beginTimeOffsetSeconds?: number;
  /** VIS-reported timeouts for Team A */
  readonly nbTimeoutTeamA?: number;
  /** VIS-reported timeouts for Team B */
  readonly nbTimeoutTeamB?: number;
  /** VIS challenges requested by Team A */
  readonly nbChallengeRequestedTeamA?: number;
  /** VIS challenges requested by Team B */
  readonly nbChallengeRequestedTeamB?: number;
  /** VIS challenges used by Team A */
  readonly nbChallengeUsedTeamA?: number;
  /** VIS challenges used by Team B */
  readonly nbChallengeUsedTeamB?: number;
  /** Rally points credited to Team A */
  readonly pointsRallyTeamA?: number;
  /** Rally points credited to Team B */
  readonly pointsRallyTeamB?: number;
  /** Raw VIS attribute map for telemetry */
  readonly rawAttributes?: Record<string, string>;
}

/**
 * Team information within BeachLive
 */
export interface BeachLiveTeam {
  /** Team number (1 or 2) */
  readonly no: number;
  
  /** Team name */
  readonly name: string;
  
  /** Country/federation code */
  readonly federationCode: string;
  
  /** Team players */
  readonly players: readonly BeachLivePlayer[];
  
  /** Total match points won */
  readonly matchPoints: number;
  
  /** Current serving status */
  readonly isServing: boolean;
  
  /** Timeouts remaining */
  readonly timeoutsRemaining: number;
}

/**
 * Player information within team
 */
export interface BeachLivePlayer {
  /** Player number */
  readonly no: number;
  
  /** Player name */
  readonly name: string;
  
  /** Player position on court */
  readonly position: BeachPlayerPosition;
  
  /** Whether player is currently serving */
  readonly isServing: boolean;
  
  /** Player statistics for this match */
  readonly statistics?: BeachLivePlayerStatistics;
}

/**
 * Tournament context within BeachLive
 */
export interface BeachLiveTournament {
  /** Tournament number */
  readonly no: number;
  
  /** Tournament name */
  readonly name: string;
  
  /** Tournament code */
  readonly code: string;
  
  /** Host city */
  readonly city: string;
  
  /** Host country */
  readonly country: string;
  
  /** Federation organizing the tournament */
  readonly federation: string;
}

/**
 * Court information
 */
export interface BeachLiveCourt {
  /** Court number */
  readonly no: number;
  
  /** Court name */
  readonly name: string;
  
  /** Court surface type */
  readonly surface: string;
  
  /** Court dimensions */
  readonly dimensions?: BeachCourtDimensions;
}

/**
 * Round information
 */
export interface BeachLiveRound {
  /** Round number */
  readonly no: number;
  
  /** Round name */
  readonly name: string;
  
  /** Phase of tournament */
  readonly phase: string;
  
  /** Round type */
  readonly type: BeachRoundType;
}

/**
 * Technical timeout information
 */
export interface BeachLiveTechnicalTimeout {
  /** Timeout number */
  readonly no: number;
  
  /** Team that called the timeout */
  readonly teamNo: number;
  
  /** Duration in seconds */
  readonly durationSeconds: number;
  
  /** Set number when called */
  readonly setNo: number;
  
  /** Score when called */
  readonly scoreWhenCalled: string;
}

/**
 * Weather conditions
 */
export interface BeachLiveWeather {
  /** Temperature in Celsius */
  readonly temperatureC?: number;
  
  /** Wind speed in km/h */
  readonly windSpeedKmh?: number;
  
  /** Wind direction */
  readonly windDirection?: string;
  
  /** Weather conditions */
  readonly conditions?: string;
}

/**
 * Court dimensions
 */
export interface BeachCourtDimensions {
  /** Length in meters */
  readonly lengthM: number;
  
  /** Width in meters */
  readonly widthM: number;
  
  /** Net height in meters */
  readonly netHeightM: number;
}

/**
 * Match statistics
 */
export interface BeachLiveStatistics {
  /** Total rally count */
  readonly totalRallies: number;
  
  /** Average rally duration */
  readonly avgRallyDurationSeconds: number;
  
  /** Longest rally */
  readonly longestRallyDurationSeconds: number;
  
  /** Team A statistics */
  readonly teamAStats: BeachLiveTeamStatistics;
  
  /** Team B statistics */
  readonly teamBStats: BeachLiveTeamStatistics;
}

/**
 * Team statistics
 */
export interface BeachLiveTeamStatistics {
  /** Total attacks */
  readonly attacks: number;
  
  /** Successful attacks */
  readonly attacksSuccessful: number;
  
  /** Total serves */
  readonly serves: number;
  
  /** Service aces */
  readonly serviceAces: number;
  
  /** Service errors */
  readonly serviceErrors: number;
  
  /** Total blocks */
  readonly blocks: number;
  
  /** Successful blocks */
  readonly blocksSuccessful: number;
}

/**
 * Player statistics
 */
export interface BeachLivePlayerStatistics {
  /** Points scored */
  readonly points: number;
  
  /** Attacks attempted */
  readonly attacks: number;
  
  /** Successful attacks */
  readonly attacksSuccessful: number;
  
  /** Service attempts */
  readonly serves: number;
  
  /** Service aces */
  readonly serviceAces: number;
  
  /** Service errors */
  readonly serviceErrors: number;
  
  /** Block attempts */
  readonly blocks: number;
  
  /** Successful blocks */
  readonly blocksSuccessful: number;
}

/**
 * Live match event
 */
export interface BeachLiveEvent {
  /** Event sequence number */
  readonly sequence: number;
  
  /** Event timestamp */
  readonly timestamp: string;
  
  /** Event type */
  readonly type: BeachLiveEventType;
  
  /** Team involved in event */
  readonly teamNo?: number;
  
  /** Player involved in event */
  readonly playerNo?: number;
  
  /** Event description */
  readonly description: string;
  
  /** Score after event */
  readonly scoreAfter: string;
  
  /** Set number when event occurred */
  readonly setNo: number;
}

/**
 * Match status enumeration
 */
export enum BeachMatchStatus {
  SCHEDULED = 'Scheduled',
  IN_PROGRESS = 'InProgress',
  FINISHED = 'Finished',
  CANCELLED = 'Cancelled',
  POSTPONED = 'Postponed',
  SUSPENDED = 'Suspended'
}

/**
 * Set status enumeration
 */
export enum BeachSetStatus {
  NOT_STARTED = 'NotStarted',
  IN_PROGRESS = 'InProgress',
  FINISHED = 'Finished'
}

/**
 * Player position enumeration
 */
export enum BeachPlayerPosition {
  LEFT = 'Left',
  RIGHT = 'Right'
}

/**
 * Round type enumeration
 */
export enum BeachRoundType {
  POOL = 'Pool',
  ELIMINATION = 'Elimination',
  BRACKET = 'Bracket'
}

/**
 * Live event type enumeration
 */
export enum BeachLiveEventType {
  POINT = 'Point',
  SERVICE_ACE = 'ServiceAce',
  SERVICE_ERROR = 'ServiceError',
  ATTACK = 'Attack',
  BLOCK = 'Block',
  TIMEOUT = 'Timeout',
  TECHNICAL_TIMEOUT = 'TechnicalTimeout',
  SET_END = 'SetEnd',
  MATCH_END = 'MatchEnd',
  SIDE_CHANGE = 'SideChange'
}

/**
 * Type guard to check if BeachLive response contains actual data
 * @param data - Potential BeachLive data
 * @returns True if data is valid BeachLive
 */
export function isValidBeachLive(data: any): data is BeachLive {
  return (
    data &&
    typeof data.version === 'number' &&
    typeof data.pollDelay === 'number' &&
    typeof data.isBallInPlay === 'boolean' &&
    data.match &&
    Array.isArray(data.sets) &&
    data.teamA &&
    data.teamB
  );
}

/**
 * Type guard to check if response indicates no changes
 * @param data - API response data
 * @returns True if no changes since last version
 */
export function isNoChangesResponse(data: any): boolean {
  return data && data.noChanges === true;
}

/**
 * Extract version number from BeachLive response
 * @param data - BeachLive response data
 * @returns Version number or undefined
 */
export function extractVersion(data: BeachLive | any): number | undefined {
  return isValidBeachLive(data) ? data.version : undefined;
}

/**
 * Extract poll delay from BeachLive response
 * @param data - BeachLive response data
 * @returns Poll delay in milliseconds or default value
 */
export function extractPollDelay(data: BeachLive | any): number {
  return isValidBeachLive(data) ? data.pollDelay : 5000; // Default 5 seconds
}






