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

// ============================================================================
// Event Officials (issue #40) — auxiliary personnel + match assignments
// ============================================================================

/**
 * Auxiliary function derived from the VIS `Functions` attribute of an
 * `<AuxiliaryPerson>` entry.
 *
 * Codes are not documented by FIVB; they were decoded empirically over two
 * distinct events (EventNo 1719 and 1525, 123/124 matches covered).
 * See {@link AUXILIARY_FUNCTION_CODE_MAP}.
 */
export enum AuxiliaryFunction {
  /** Functions="4" — scorer / assistant scorer pool */
  SCORER = 'Scorer',
  /** Functions="2" — line judge pool */
  LINE_JUDGE = 'LineJudge',
  /** Any code not present in {@link AUXILIARY_FUNCTION_CODE_MAP} */
  UNKNOWN = 'Unknown'
}

/**
 * VIS `Functions` code → {@link AuxiliaryFunction}.
 *
 * Only `2` and `4` have ever been observed. An unknown code MUST NOT crash the
 * caller: {@link mapAuxiliaryFunctionCode} maps it to
 * {@link AuxiliaryFunction.UNKNOWN} while the raw code stays available on
 * {@link EventAuxiliaryOfficial.functionCode}, so a new code surfaces in the
 * data instead of silently disappearing (issue #40, AC7).
 */
export const AUXILIARY_FUNCTION_CODE_MAP: Readonly<Record<string, AuxiliaryFunction>> = {
  '2': AuxiliaryFunction.LINE_JUDGE,
  '4': AuxiliaryFunction.SCORER
};

/**
 * Map a raw VIS `Functions` code to a typed role. Never throws.
 */
export function mapAuxiliaryFunctionCode(code: string | number | undefined | null): AuxiliaryFunction {
  if (code === undefined || code === null || code === '') {
    return AuxiliaryFunction.UNKNOWN;
  }
  return AUXILIARY_FUNCTION_CODE_MAP[String(code).trim()] ?? AuxiliaryFunction.UNKNOWN;
}

/**
 * A single person from the event-level `AuxiliaryPersons` roster.
 * This is the only source of *names* for scorers and line judges.
 */
export interface EventAuxiliaryOfficial {
  /** Event-scoped id (`No`), the value referenced by match `Personnel` */
  readonly no: string;
  readonly firstName: string;
  readonly lastName: string;
  /** 2-letter nationality code (VIS `NationalityCode`, e.g. 'BR') */
  readonly nationalityCode: string;
  /** VIS gender code as returned ('0' = male, '1' = female) */
  readonly gender: string;
  /** Raw `Functions` attribute, kept verbatim for traceability */
  readonly functionCode: string;
  /** Decoded role, {@link AuxiliaryFunction.UNKNOWN} for unmapped codes */
  readonly function: AuxiliaryFunction;
}

/**
 * One resolved official slot of a match.
 */
export interface MatchOfficialAssignment {
  /** Slot the person occupies in this match */
  readonly role: OfficialRole;
  /** Event-scoped auxiliary person id taken from `Personnel` */
  readonly officialNo: string;
  /** `true` when the id was found in the event roster */
  readonly resolved: boolean;
  readonly firstName: string;
  readonly lastName: string;
  readonly nationalityCode: string;
  /** Ready-to-render label; falls back to `#<id>` when unresolved */
  readonly displayName: string;
  readonly function: AuxiliaryFunction;
}

/**
 * Officials of a single match, names already resolved.
 */
export interface MatchOfficials {
  readonly eventNo: string;
  readonly matchNo: string;
  /** `false` when the match carries no `Personnel` attribute at all */
  readonly hasPersonnelData: boolean;
  readonly assignments: readonly MatchOfficialAssignment[];
  /** Roles the public VIS API cannot provide — see {@link UNAVAILABLE_EVENT_OFFICIAL_ROLES} */
  readonly unavailableRoles: readonly string[];
  /** Populated when the lookup failed; `assignments` is then empty */
  readonly error?: string;
}

/**
 * Event-level roster of auxiliary officials.
 */
export interface EventOfficialsRoster {
  readonly eventNo: string;
  readonly eventName: string;
  readonly auxiliaryOfficials: readonly EventAuxiliaryOfficial[];
  /** ISO timestamp of retrieval */
  readonly retrievedAt: string;
  /** Roles the public VIS API cannot provide — see {@link UNAVAILABLE_EVENT_OFFICIAL_ROLES} */
  readonly unavailableRoles: readonly string[];
  /** Populated when the lookup failed; `auxiliaryOfficials` is then empty */
  readonly error?: string;
}

/**
 * Officials of every match of a tournament plus the roster they resolve against.
 */
export interface TournamentOfficials {
  readonly eventNo: string;
  readonly roster: EventOfficialsRoster;
  readonly matches: readonly MatchOfficials[];
  /** Number of VIS calls actually issued (cache hits excluded) — issue #40 AC4 */
  readonly apiCallCount: number;
  readonly error?: string;
}

/**
 * **Known VIS limitation — do not re-investigate (issue #40, AC8).**
 *
 * The names of the *referee coach* and the *technical delegate* are NOT
 * obtainable from the public VIS API. Verified at all three levels (event,
 * tournament, match) on two distinct events, probing ~60 candidate field names.
 *
 * `GetEventOfficialList` returns exactly 2 `EventOfficial` entities per event —
 * almost certainly those two roles — but exposes only `No` and `Version`, with
 * every other requested attribute silently ignored. The singular
 * `GetEventOfficial` answers `<NotInNewFormat id="1008" />`.
 *
 * Consumers should render these roles as *unavailable*, not as missing data.
 */
export const UNAVAILABLE_EVENT_OFFICIAL_ROLES: readonly string[] = [
  'RefereeCoach',
  'TechnicalDelegate'
] as const;