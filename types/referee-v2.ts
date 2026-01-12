/**
 * @fileoverview VIS API Referee & Official Types v2
 * VIS-compliant referee and official data structures
 * Part of Referee List Extraction - Brownfield Enhancement Epic
 */

import { VisApiRequestBase } from './api-v2';

/**
 * Official role types from VIS API
 */
export enum OfficialRole {
  /** Head referee/first referee */
  REFEREE_1 = 'Referee1',
  /** Second referee */
  REFEREE_2 = 'Referee2',
  /** Challenge referee */
  CHALLENGE_REFEREE = 'ChallengeReferee',
  /** Assistant Challenge Referee (bonus feature) */
  ASSISTANT_CHALLENGE_REFEREE = 'AssistantChallengeReferee',
  /** Reserve Referee (bonus feature) */
  RESERVE_REFEREE = 'ReserveReferee',
  /** Match scorer */
  SCORER = 'Scorer',
  /** Assistant scorer */
  ASSISTANT_SCORER = 'AssistantScorer',
  /** Line judge 1 */
  LINE_JUDGE_1 = 'LineJudge1',
  /** Line judge 2 */
  LINE_JUDGE_2 = 'LineJudge2',
  /** Line judge 3 (optional) */
  LINE_JUDGE_3 = 'LineJudge3',
  /** Line judge 4 (optional) */
  LINE_JUDGE_4 = 'LineJudge4',
  /** Technical official */
  TECHNICAL_OFFICIAL = 'TechnicalOfficial',
  /** Tournament director */
  TOURNAMENT_DIRECTOR = 'TournamentDirector',
  /** Match commissioner */
  MATCH_COMMISSIONER = 'MatchCommissioner'
}

/**
 * Official status types from VIS API
 */
export enum OfficialStatus {
  /** Active and available for assignments */
  ACTIVE = 'Active',
  /** Not available for assignments */
  INACTIVE = 'Inactive',
  /** Temporarily suspended */
  SUSPENDED = 'Suspended',
  /** Available but with restrictions */
  RESTRICTED = 'Restricted'
}

/**
 * Official type classification from VIS API
 */
export enum OfficialType {
  /** Certified referee */
  REFEREE = 'Referee',
  /** Technical official */
  TECHNICAL = 'Technical',
  /** Administrative official */
  ADMINISTRATIVE = 'Administrative'
}

/**
 * VIS API Official data structure
 * Maps directly to GetEventOfficialList response fields
 */
export interface RefereeOfficial {
  /** Unique identifier (alias for noOfficial) - TS2339 fix */
  readonly id?: string;
  /** Federation code (e.g., 'ITA', 'USA') */
  readonly federationCode: string;
  /** Official's first name */
  readonly firstName: string;
  /** Gender (M/W) */
  readonly gender: 'M' | 'W';
  /** Official's last name */
  readonly lastName: string;
  /** Official identification number (NoOfficial from VIS) */
  readonly noOfficial: string;
  /** Official role in the event */
  readonly role: OfficialRole;
  /** Current status */
  readonly status: OfficialStatus;
  /** Type classification */
  readonly type: OfficialType;
}

/**
 * VIS API Referee data structure with extended fields
 * Maps directly to GetEventRefereeList response fields
 */
export interface EventReferee {
  /** Unique identifier (alias for RefereeId) - TS2339 fix */
  readonly id?: string;
  /** Federation code (e.g., 'ITA', 'USA') */
  readonly federationCode: string;
  /** Referee's first name */
  readonly firstName: string;
  /** Gender (M/W) */
  readonly gender: 'M' | 'W';
  /** Referee's last name */
  readonly lastName: string;
  /** Referee ID - 6-digit number from NoReferee VIS field */
  readonly RefereeId: string;
  /** Current status */
  readonly status: OfficialStatus;
  /** Type classification */
  readonly type: OfficialType;
  /** Theory test results/score */
  readonly theoryTest?: string;
  /** Referee strong points/skills */
  readonly strongPoints?: string;
  /** Areas needing improvement */
  readonly weakPoints?: string;
}

/**
 * GetEventOfficialList request parameters
 * For retrieving officials list for a specific event
 */
export interface GetEventOfficialListRequest extends VisApiRequestBase {
  /** Event number to get officials for */
  readonly eventNo: string;
  /** Fields to include in response */
  readonly fields?: readonly string[];
}

/**
 * GetEventRefereeList request parameters  
 * For retrieving referee list for a specific event
 */
export interface GetEventRefereeListRequest extends VisApiRequestBase {
  /** Event number to get referees for */
  readonly eventNo: string;
  /** Fields to include in response */
  readonly fields?: readonly string[];
}

/**
 * Official list response structure
 */
export interface OfficialListResponse {
  /** List of officials */
  readonly officials: readonly RefereeOfficial[];
  /** Total count of officials */
  readonly totalCount: number;
  /** Request timestamp */
  readonly timestamp: string;
}

/**
 * Referee list response structure
 */
export interface RefereeListResponse {
  /** List of referees */
  readonly referees: readonly EventReferee[];
  /** Total count of referees */
  readonly totalCount: number;
  /** Request timestamp */  
  readonly timestamp: string;
}

/**
 * Combined referee and official data for tournament context
 */
export interface TournamentRefereeData {
  /** All officials for the tournament */
  readonly officials: readonly RefereeOfficial[];
  /** All referees for the tournament */
  readonly referees: readonly EventReferee[];
  /** Tournament/event number */
  readonly eventNo: string;
  /** Data retrieval timestamp */
  readonly timestamp: string;
  /** Cache expiration timestamp */
  readonly expiresAt: string;
}

/**
 * Type guard to check if official is a referee
 */
export function isReferee(official: RefereeOfficial): boolean {
  return official.type === OfficialType.REFEREE;
}

/**
 * Type guard to check if official is active
 */
export function isActiveOfficial(official: RefereeOfficial | EventReferee): boolean {
  return official.status === OfficialStatus.ACTIVE;
}

/**
 * Get full display name for official
 */
export function getOfficialDisplayName(official: RefereeOfficial | EventReferee): string {
  return `${official.firstName} ${official.lastName}`;
}

/**
 * Get display name with federation for official
 */
export function getOfficialFullDisplayName(official: RefereeOfficial | EventReferee): string {
  return `${official.firstName} ${official.lastName} (${official.federationCode})`;
}