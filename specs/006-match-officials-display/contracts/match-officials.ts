/**
 * Match Officials TypeScript Contracts
 *
 * This file defines TypeScript interfaces for match officials display feature.
 * These contracts will be integrated into the existing BeachRef type system.
 *
 * Integration paths:
 * - types/match.ts (extend BeachMatch interface)
 * - types/referee-v2.ts (extend OfficialRole enum)
 */

/**
 * Extended Official Role Enumeration
 *
 * Add these values to the existing OfficialRole enum in types/referee-v2.ts
 */
export enum OfficialRole {
  // Existing values (keep as-is)
  REFEREE_1 = 'Referee1',
  REFEREE_2 = 'Referee2',
  CHALLENGE_REFEREE = 'ChallengeReferee',
  TECHNICAL_OFFICIAL = 'TechnicalOfficial',
  TOURNAMENT_DIRECTOR = 'TournamentDirector',
  MATCH_COMMISSIONER = 'MatchCommissioner',

  // NEW: Add these to existing enum
  SCORER = 'Scorer',
  ASSISTANT_SCORER = 'AssistantScorer',
  LINE_JUDGE_1 = 'LineJudge1',
  LINE_JUDGE_2 = 'LineJudge2',
  LINE_JUDGE_3 = 'LineJudge3',
  LINE_JUDGE_4 = 'LineJudge4',
}

/**
 * Official Entity
 *
 * Represents a single official assigned to a match.
 * This is a derived structure (not directly from VIS API).
 */
export interface Official {
  /** VIS API official identifier (NoReferee1, NoScorer, NoLineJudge1, etc.) */
  readonly no: string;

  /** Official's full name */
  readonly name: string;

  /** Optional 2-3 letter federation code (e.g., "USA", "ITA") */
  readonly federation?: string;

  /** Official's role in this match */
  readonly role: OfficialRole;
}

/**
 * Match Officials Collection
 *
 * Organized grouping of all officials for a match.
 * This is a derived structure created by BeachMatchService.extractOfficials().
 */
export interface MatchOfficials {
  /** Primary referees (always displayed) */
  primaryReferees: {
    first?: Official;   // Referee 1
    second?: Official;  // Referee 2
  };

  /** Challenge referee (optional, high-level tournaments only) */
  challengeReferee?: Official;

  /** Scoring officials */
  scoringOfficials: {
    scorer?: Official;
    assistantScorer?: Official;
  };

  /** Line judges (0-4, ordered by position) */
  lineJudges: Official[];
}

/**
 * BeachMatch Extensions
 *
 * Add these optional fields to the existing BeachMatch interface in types/match.ts
 *
 * IMPORTANT: All fields are optional to maintain backward compatibility.
 * Existing code that doesn't access these fields will continue to work.
 */
export interface BeachMatchOfficialFields {
  // Scorer
  NoScorer?: string;
  ScorerName?: string;
  ScorerFederationCode?: string;

  // Assistant Scorer
  NoAssistantScorer?: string;
  AssistantScorerName?: string;
  AssistantScorerFederationCode?: string;

  // Line Judge 1
  NoLineJudge1?: string;
  LineJudge1Name?: string;
  LineJudge1FederationCode?: string;

  // Line Judge 2
  NoLineJudge2?: string;
  LineJudge2Name?: string;
  LineJudge2FederationCode?: string;

  // Line Judge 3
  NoLineJudge3?: string;
  LineJudge3Name?: string;
  LineJudge3FederationCode?: string;

  // Line Judge 4
  NoLineJudge4?: string;
  LineJudge4Name?: string;
  LineJudge4FederationCode?: string;
}

/**
 * Official Role Display Metadata
 *
 * Helper interface for UI components to display official roles consistently.
 */
export interface OfficialRoleMetadata {
  role: OfficialRole;
  displayLabel: string;      // e.g., "Referee 1", "Challenge Referee"
  abbreviation: string;       // e.g., "R1", "CR", "LJ1"
  priority: number;           // Display order (1 = first, 12 = last)
  category: 'primary' | 'challenge' | 'scoring' | 'lineJudge' | 'other';
}

/**
 * Official Role Metadata Lookup
 *
 * Maps each OfficialRole to its display metadata.
 * Use this for consistent labeling across the app.
 */
export const OFFICIAL_ROLE_METADATA: Record<OfficialRole, OfficialRoleMetadata> = {
  [OfficialRole.REFEREE_1]: {
    role: OfficialRole.REFEREE_1,
    displayLabel: 'Referee 1',
    abbreviation: 'R1',
    priority: 1,
    category: 'primary'
  },
  [OfficialRole.REFEREE_2]: {
    role: OfficialRole.REFEREE_2,
    displayLabel: 'Referee 2',
    abbreviation: 'R2',
    priority: 2,
    category: 'primary'
  },
  [OfficialRole.CHALLENGE_REFEREE]: {
    role: OfficialRole.CHALLENGE_REFEREE,
    displayLabel: 'Challenge Referee',
    abbreviation: 'CR',
    priority: 3,
    category: 'challenge'
  },
  [OfficialRole.SCORER]: {
    role: OfficialRole.SCORER,
    displayLabel: 'Scorer',
    abbreviation: 'SC',
    priority: 4,
    category: 'scoring'
  },
  [OfficialRole.ASSISTANT_SCORER]: {
    role: OfficialRole.ASSISTANT_SCORER,
    displayLabel: 'Assistant Scorer',
    abbreviation: 'AS',
    priority: 5,
    category: 'scoring'
  },
  [OfficialRole.LINE_JUDGE_1]: {
    role: OfficialRole.LINE_JUDGE_1,
    displayLabel: 'Line Judge 1',
    abbreviation: 'LJ1',
    priority: 6,
    category: 'lineJudge'
  },
  [OfficialRole.LINE_JUDGE_2]: {
    role: OfficialRole.LINE_JUDGE_2,
    displayLabel: 'Line Judge 2',
    abbreviation: 'LJ2',
    priority: 7,
    category: 'lineJudge'
  },
  [OfficialRole.LINE_JUDGE_3]: {
    role: OfficialRole.LINE_JUDGE_3,
    displayLabel: 'Line Judge 3',
    abbreviation: 'LJ3',
    priority: 8,
    category: 'lineJudge'
  },
  [OfficialRole.LINE_JUDGE_4]: {
    role: OfficialRole.LINE_JUDGE_4,
    displayLabel: 'Line Judge 4',
    abbreviation: 'LJ4',
    priority: 9,
    category: 'lineJudge'
  },
  [OfficialRole.TECHNICAL_OFFICIAL]: {
    role: OfficialRole.TECHNICAL_OFFICIAL,
    displayLabel: 'Technical Official',
    abbreviation: 'TO',
    priority: 10,
    category: 'other'
  },
  [OfficialRole.TOURNAMENT_DIRECTOR]: {
    role: OfficialRole.TOURNAMENT_DIRECTOR,
    displayLabel: 'Tournament Director',
    abbreviation: 'TD',
    priority: 11,
    category: 'other'
  },
  [OfficialRole.MATCH_COMMISSIONER]: {
    role: OfficialRole.MATCH_COMMISSIONER,
    displayLabel: 'Match Commissioner',
    abbreviation: 'MC',
    priority: 12,
    category: 'other'
  }
};

/**
 * Helper Functions
 */

/**
 * Get display metadata for an official role
 */
export function getRoleMetadata(role: OfficialRole): OfficialRoleMetadata {
  return OFFICIAL_ROLE_METADATA[role];
}

/**
 * Format official name for display
 */
export function formatOfficialName(official: Official, format: 'full' | 'lastNameOnly' = 'full'): string {
  if (format === 'lastNameOnly') {
    const parts = official.name.split(' ');
    return parts[parts.length - 1];
  }
  return official.name;
}

/**
 * Format official with role label
 */
export function formatOfficialWithRole(official: Official, useLongLabel: boolean = true): string {
  const metadata = getRoleMetadata(official.role);
  const label = useLongLabel ? metadata.displayLabel : metadata.abbreviation;
  return `${label}: ${official.name}`;
}

/**
 * Check if an official is a line judge
 */
export function isLineJudge(role: OfficialRole): boolean {
  return [
    OfficialRole.LINE_JUDGE_1,
    OfficialRole.LINE_JUDGE_2,
    OfficialRole.LINE_JUDGE_3,
    OfficialRole.LINE_JUDGE_4
  ].includes(role);
}

/**
 * Get all officials from a MatchOfficials object as a flat array
 */
export function flattenOfficials(matchOfficials: MatchOfficials): Official[] {
  const officials: Official[] = [];

  if (matchOfficials.primaryReferees.first) {
    officials.push(matchOfficials.primaryReferees.first);
  }
  if (matchOfficials.primaryReferees.second) {
    officials.push(matchOfficials.primaryReferees.second);
  }
  if (matchOfficials.challengeReferee) {
    officials.push(matchOfficials.challengeReferee);
  }
  if (matchOfficials.scoringOfficials.scorer) {
    officials.push(matchOfficials.scoringOfficials.scorer);
  }
  if (matchOfficials.scoringOfficials.assistantScorer) {
    officials.push(matchOfficials.scoringOfficials.assistantScorer);
  }
  officials.push(...matchOfficials.lineJudges);

  return officials;
}

/**
 * Sort officials by display priority
 */
export function sortOfficialsByPriority(officials: Official[]): Official[] {
  return [...officials].sort((a, b) => {
    const aPriority = getRoleMetadata(a.role).priority;
    const bPriority = getRoleMetadata(b.role).priority;
    return aPriority - bPriority;
  });
}
