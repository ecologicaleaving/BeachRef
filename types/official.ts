/**
 * Official Data Types
 *
 * Types for match officials data from VIS API GetEvent AuxiliaryPersons
 * and Personnel field parsing.
 *
 * @see specs/006-match-officials-display/INVESTIGATION_REPORT.md
 */

/**
 * AuxiliaryPerson from VIS API GetEvent response
 *
 * Structure validated via Match 203000 (Fort Lauderdale 2017)
 * Maps Personnel IDs to official names and details
 */
export interface AuxiliaryPerson {
  /** Personnel ID (tournament-local scope, e.g., 3, 10, 19, 26) */
  No: number;

  /** Official's first name */
  FirstName: string;

  /** Official's last name */
  LastName: string;

  /** Three-letter country/federation code (e.g., "US", "NL", "BRA") */
  NationalityCode: string;

  /**
   * Role function code
   * 2 = Line Judge
   * 4 = Scorer
   * Note: Not used for mapping validation (ID-only matching)
   */
  Functions: number;

  /**
   * Gender code
   * 0 = Male
   * 1 = Female
   */
  Gender: number;
}

/**
 * PersonnelData from VIS API Personnel field
 *
 * Parsed from HTML-entity-encoded XML in BeachMatch.Personnel
 * Contains numeric IDs that map to AuxiliaryPersons
 */
export interface PersonnelData {
  /** Scorer ID (maps to AuxiliaryPerson.No) */
  Scorer?: number;

  /** Assistant Scorer ID (maps to AuxiliaryPerson.No) */
  AssistantScorer?: number;

  /** Line Judge 1 ID (maps to AuxiliaryPerson.No) */
  LineJudge1?: number;

  /** Line Judge 2 ID (maps to AuxiliaryPerson.No) */
  LineJudge2?: number;

  /** Line Judge 3 ID (optional, maps to AuxiliaryPerson.No) */
  LineJudge3?: number;

  /** Line Judge 4 ID (optional, maps to AuxiliaryPerson.No) */
  LineJudge4?: number;
}

/**
 * Complete official information with role
 *
 * Combines AuxiliaryPerson data with assigned role
 * Used for display in UI components
 */
export interface MatchOfficial {
  /** VIS Personnel ID or Referee ID */
  id: number | string;

  /** Official's first name */
  firstName: string;

  /** Official's last name */
  lastName: string;

  /** Full name (computed) */
  fullName: string;

  /** Three-letter country/federation code */
  federationCode: string;

  /** Assigned role for this match */
  role: string;

  /** Role abbreviation for compact display (R1, R2, CR, SC, ASC, LJ1-4) */
  roleAbbreviation: string;

  /** Is this a primary official (R1, R2, CR) vs supporting (Scorer, LJ) */
  isPrimary: boolean;
}
