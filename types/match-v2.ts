/**
 * @fileoverview Stable Match Domain Model v2
 * Immutable, type-safe beach volleyball match domain models
 * Part of EPIC-007 Data Architecture Restructuration
 */

import { VisEntity } from './tournament-v2';

/**
 * Match status mapping VIS status values precisely
 * Based on VIS API documentation and BeachMatchStatusType enum
 */
export enum MatchStatus {
  /** Match is scheduled but not started */
  SCHEDULED = 'SCHEDULED',
  /** Match is currently in progress */
  RUNNING = 'RUNNING',
  /** Match has finished normally */
  FINISHED = 'FINISHED',
  /** Match was interrupted and not completed */
  INTERRUPTED = 'INTERRUPTED',
  /** Match was cancelled before completion */
  CANCELLED = 'CANCELLED',
  /** Match was postponed to later time */
  POSTPONED = 'POSTPONED',
  /** Match time/date to be determined */
  TBD = 'TBD'
}

/**
 * Match result for score handling
 */
export interface MatchResult {
  /** Team 1 sets won */
  readonly team1Sets: number;
  /** Team 2 sets won */
  readonly team2Sets: number;
  /** Set scores array [set1_team1, set1_team2, set2_team1, set2_team2, ...] */
  readonly setScores: readonly number[];
  /** Match duration in minutes */
  readonly duration?: number;
  /** Winner team number (1 or 2) */
  readonly winner?: 1 | 2;
  /** True if match ended in forfeit */
  readonly forfeit?: boolean;
}

/**
 * Court information structure
 */
export interface CourtInfo {
  /** Court number/identifier */
  readonly courtNumber: string;
  /** Court name if available */
  readonly courtName?: string;
  /** Court surface type */
  readonly surface?: string;
  /** Court location description */
  readonly location?: string;
}

/**
 * Referee assignment for match officials
 */
export interface RefereeAssignment {
  /** Referee ID */
  readonly refereeId: string;
  /** Referee name */
  readonly refereeName: string;
  /** Referee function/role */
  readonly function: string;
  /** Federation/country code */
  readonly federationCode?: string;
  /** Assignment status */
  readonly status: 'ASSIGNED' | 'CONFIRMED' | 'DECLINED' | 'PENDING';
}

/**
 * Team information for match
 */
export interface MatchTeam {
  /** Team number in match (1 or 2) */
  readonly teamNumber: 1 | 2;
  /** Team name/identifier */
  readonly teamName: string;
  /** Player 1 name */
  readonly player1Name: string;
  /** Player 2 name */
  readonly player2Name: string;
  /** Team country code */
  readonly countryCode?: string;
  /** Team ranking if available */
  readonly ranking?: number;
}

/**
 * Core Beach Match domain model - immutable and type-safe
 */
export interface BeachMatchCore extends VisEntity {
  /** Tournament ID this match belongs to */
  readonly tournamentId: string;
  
  /** Match code/number within tournament */
  readonly matchCode: string;
  
  /** Match round/phase (e.g., "Pool A", "Quarterfinal") */
  readonly round: string;
  
  /** Match phase code for bracket position */
  readonly phaseCode?: string;
  
  /** Current match status */
  readonly status: MatchStatus;
  
  /** Court information */
  readonly court: CourtInfo;
  
  /** Scheduled match date/time in ISO format */
  readonly scheduledDateTime: string;
  
  /** Actual start time if match has started */
  readonly actualStartTime?: string;
  
  /** Actual end time if match has finished */
  readonly actualEndTime?: string;
  
  /** Team 1 information */
  readonly team1: MatchTeam;
  
  /** Team 2 information */
  readonly team2: MatchTeam;
  
  /** Match result if completed */
  readonly result?: MatchResult;
  
  /** Assigned referees */
  readonly refereeAssignments: readonly RefereeAssignment[];
  
  /** Match notes or special conditions */
  readonly notes?: string;
  
  /** Weather conditions if relevant */
  readonly weather?: string;
  
  /** Match importance level */
  readonly importance?: 'LOW' | 'MEDIUM' | 'HIGH' | 'FINAL';
  
  /** Match number within tournament for display (NoInTournament from VIS API) */
  readonly noInTournament?: string;
  
  /** Team A position/seed in main draw bracket */
  readonly teamAPositionInMainDraw?: string;
  
  /** Team B position/seed in main draw bracket */
  readonly teamBPositionInMainDraw?: string;
}

/**
 * Generates stable, immutable ID for matches
 * Format: {tournamentId}_{courtNumber}_{scheduledDateTime}_{matchCode}
 * 
 * @param tournamentId - Tournament ID this match belongs to
 * @param courtNumber - Court number/identifier
 * @param scheduledDateTime - Scheduled date/time in ISO format
 * @param matchCode - Match code within tournament
 * @returns Stable match ID
 */
export function generateMatchId(
  tournamentId: string,
  courtNumber: string,
  scheduledDateTime: string,
  matchCode: string
): string {
  const cleanCourt = courtNumber.replace(/[^a-zA-Z0-9]/g, '');
  const cleanCode = matchCode.replace(/[^a-zA-Z0-9]/g, '');
  const dateHash = new Date(scheduledDateTime).getTime().toString();
  
  return `${tournamentId}_court${cleanCourt}_${dateHash}_${cleanCode}`.toLowerCase();
}

/**
 * Type guard to check if an object is a valid BeachMatchCore
 * 
 * @param obj - Object to validate
 * @returns True if object is valid BeachMatchCore
 */
export function isBeachMatchCore(obj: any): obj is BeachMatchCore {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.visNo === 'string' &&
    typeof obj.tournamentId === 'string' &&
    typeof obj.matchCode === 'string' &&
    typeof obj.round === 'string' &&
    Object.values(MatchStatus).includes(obj.status) &&
    obj.court &&
    typeof obj.court.courtNumber === 'string' &&
    typeof obj.scheduledDateTime === 'string' &&
    obj.team1 &&
    obj.team2 &&
    typeof obj.team1.teamNumber === 'number' &&
    typeof obj.team2.teamNumber === 'number' &&
    Array.isArray(obj.refereeAssignments)
  );
}

/**
 * Maps VIS API match status to MatchStatus enum
 * Based on VIS BeachMatchStatusType values
 * 
 * @param visStatus - VIS API match status
 * @returns Mapped MatchStatus
 */
export function mapVisMatchStatus(visStatus?: string): MatchStatus {
  if (!visStatus) return MatchStatus.SCHEDULED;
  
  const status = visStatus.toLowerCase().trim();
  
  // Map VIS status values to our enum
  switch (status) {
    case 'running':
    case 'live':
    case 'in_progress':
      return MatchStatus.RUNNING;
    case 'finished':
    case 'completed':
    case 'final':
      return MatchStatus.FINISHED;
    case 'interrupted':
    case 'suspended':
      return MatchStatus.INTERRUPTED;
    case 'cancelled':
    case 'canceled':
      return MatchStatus.CANCELLED;
    case 'postponed':
    case 'delayed':
      return MatchStatus.POSTPONED;
    case 'tbd':
    case 'to_be_determined':
      return MatchStatus.TBD;
    case 'scheduled':
    case 'upcoming':
    default:
      return MatchStatus.SCHEDULED;
  }
}

/**
 * Calculates match duration from start and end times
 * 
 * @param startTime - Match start time in ISO format
 * @param endTime - Match end time in ISO format
 * @returns Duration in minutes, or undefined if times are invalid
 */
export function calculateMatchDuration(startTime?: string, endTime?: string): number | undefined {
  if (!startTime || !endTime) return undefined;
  
  try {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    
    if (isNaN(start) || isNaN(end) || end <= start) return undefined;
    
    return Math.round((end - start) / (1000 * 60)); // Duration in minutes
  } catch {
    return undefined;
  }
}

/**
 * Determines match importance based on round/phase
 * 
 * @param round - Match round description
 * @param phaseCode - Match phase code
 * @returns Match importance level
 */
export function determineMatchImportance(round: string, phaseCode?: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'FINAL' {
  const lowerRound = round.toLowerCase();
  
  if (lowerRound.includes('final') && !lowerRound.includes('semi')) {
    return 'FINAL';
  }
  
  if (lowerRound.includes('semifinal') || lowerRound.includes('semi-final')) {
    return 'HIGH';
  }
  
  if (lowerRound.includes('quarterfinal') || lowerRound.includes('quarter-final') || 
      lowerRound.includes('bronze') || lowerRound.includes('medal')) {
    return 'HIGH';
  }
  
  if (lowerRound.includes('pool') || lowerRound.includes('group')) {
    return 'LOW';
  }
  
  return 'MEDIUM';
}