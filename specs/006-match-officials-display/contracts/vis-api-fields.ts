/**
 * VIS API Field Contracts for Match Officials
 *
 * This file documents the VIS API field names and data types for match officials.
 * These fields will be added to the field selection configuration in types/api-v2.ts
 *
 * IMPORTANT: Field names are assumed based on VIS API naming patterns.
 * MUST be validated with test-match-officials.js script before integration.
 */

/**
 * VIS API Official Field Definitions
 *
 * All field names follow the pattern: No<Role>, <Role>Name, <Role>FederationCode
 */
export interface VisApiOfficialFields {
  // Confirmed fields (already in codebase)
  NoReferee1?: string;              // Int32 in VIS API, string in app
  Referee1Name?: string;            // String
  Referee1FederationCode?: string;  // FederationCode (3-letter country code)

  NoReferee2?: string;              // Int32 in VIS API, string in app
  Referee2Name?: string;            // String
  Referee2FederationCode?: string;  // FederationCode

  // VALIDATED: Challenge Referee fields exist with different naming pattern
  NoRefereeChallenge?: string;              // Int32 in VIS API, string in app
  RefereeChallengeName?: string;            // String (assumed based on Referee1/2 pattern)
  RefereeChallengeFederationCode?: string;  // FederationCode (assumed)

  // VALIDATED: Assistant Challenge Referee (NEW - not in requirements)
  NoRefereeAssistantChallenge?: string;
  RefereeAssistantChallengeName?: string;   // (assumed based on pattern)
  RefereeAssistantChallengeFederationCode?: string;

  // VALIDATED: Reserve Referee (NEW - not in requirements)
  NoRefereeReserve?: string;
  RefereeReserveName?: string;              // (assumed based on pattern)
  RefereeReserveFederationCode?: string;

  // ❌ NOT AVAILABLE: Scorer fields do not exist in VIS API
  // NoScorer?: string;
  // ScorerName?: string;
  // ScorerFederationCode?: string;

  // ❌ NOT AVAILABLE: Assistant Scorer fields do not exist in VIS API
  // NoAssistantScorer?: string;
  // AssistantScorerName?: string;
  // AssistantScorerFederationCode?: string;

  // ❌ NOT AVAILABLE: Line Judge fields do not exist in VIS API
  // NoLineJudge1-4?: string;
  // LineJudge1-4Name?: string;
  // LineJudge1-4FederationCode?: string;
}

/**
 * Field Selection Configuration
 *
 * Add these fields to types/api-v2.ts in the FIELD_SELECTIONS configuration.
 *
 * IMPORTANT: Field count must stay within audit thresholds:
 * - slim mode: ≤10 fields
 * - default mode: ≤20 fields (recommended)
 * - full mode: unlimited
 */
export const OFFICIAL_FIELD_SELECTIONS = {
  /**
   * Slim Mode: Only primary referees (R1, R2) for inline display
   * Used in: Match list views, compact cards
   */
  slim: [
    'Referee1Name',
    'Referee2Name'
  ],

  /**
   * Default Mode: All AVAILABLE officials for match detail views
   * Used in: Match detail screens, full official display
   *
   * Field count: 15 fields (3 fields x 5 referee types)
   * Within recommended 20-field threshold ✅
   */
  default: [
    // Primary referees (already in codebase)
    'NoReferee1',
    'Referee1Name',
    'Referee1FederationCode',
    'NoReferee2',
    'Referee2Name',
    'Referee2FederationCode',

    // Challenge referee (VALIDATED - different field names)
    'NoRefereeChallenge',
    'RefereeChallengeName',
    'RefereeChallengeFederationCode',

    // Assistant Challenge Referee (VALIDATED - bonus feature)
    'NoRefereeAssistantChallenge',
    'RefereeAssistantChallengeName',
    'RefereeAssistantChallengeFederationCode',

    // Reserve Referee (VALIDATED - bonus feature)
    'NoRefereeReserve',
    'RefereeReserveName',
    'RefereeReserveFederationCode'
  ],

  /**
   * Full Mode: Same as default (no additional fields available)
   * Used in: Offline sync, complete data download
   */
  full: [
    ...OFFICIAL_FIELD_SELECTIONS.default
  ]
};

/**
 * VIS API GetBeachMatch Request Example
 *
 * Example XML request with official fields:
 *
 * <Request Type="GetBeachMatch" No="12345" Fields="
 *   No,NoInTournament,LocalDate,LocalTime,Status,Court,
 *   TeamAName,TeamBName,MatchPointsA,MatchPointsB,
 *   Referee1Name,Referee2Name,Referee1FederationCode,Referee2FederationCode,
 *   ScorerName,ScorerFederationCode,AssistantScorerName,AssistantScorerFederationCode,
 *   LineJudge1Name,LineJudge1FederationCode,LineJudge2Name,LineJudge2FederationCode
 * " />
 */

/**
 * Expected VIS API Response Structure
 *
 * Example XML response with officials:
 *
 * <BeachMatch
 *   No="12345"
 *   Referee1Name="John Smith"
 *   NoReferee1="101"
 *   Referee1FederationCode="USA"
 *   Referee2Name="Jane Doe"
 *   NoReferee2="102"
 *   Referee2FederationCode="CAN"
 *   ChallengeRefereeName="Mike Johnson"
 *   NoChallengeReferee="103"
 *   ChallengeRefereeFederationCode="GER"
 *   ScorerName="Sarah Lee"
 *   NoScorer="201"
 *   ScorerFederationCode="KOR"
 *   AssistantScorerName="Tom Wilson"
 *   NoAssistantScorer="202"
 *   AssistantScorerFederationCode="AUS"
 *   LineJudge1Name="Lisa Brown"
 *   NoLineJudge1="301"
 *   LineJudge1FederationCode="USA"
 *   LineJudge2Name="David Kim"
 *   NoLineJudge2="302"
 *   LineJudge2FederationCode="KOR"
 *   ...
 * />
 */

/**
 * Field Name Validation
 *
 * Use this function to validate assumed field names against actual VIS API response.
 * Called from test-match-officials.js script.
 */
export function validateOfficialFields(apiResponse: Record<string, any>): {
  valid: boolean;
  missingFields: string[];
  unexpectedFields: string[];
  validatedFields: string[];
} {
  const expectedFields = [
    // Confirmed fields
    'NoReferee1', 'Referee1Name', 'Referee1FederationCode',
    'NoReferee2', 'Referee2Name', 'Referee2FederationCode',
    'NoChallengeReferee', 'ChallengeRefereeName', 'ChallengeRefereeFederationCode',

    // Assumed fields (to be validated)
    'NoScorer', 'ScorerName', 'ScorerFederationCode',
    'NoAssistantScorer', 'AssistantScorerName', 'AssistantScorerFederationCode',
    'NoLineJudge1', 'LineJudge1Name', 'LineJudge1FederationCode',
    'NoLineJudge2', 'LineJudge2Name', 'LineJudge2FederationCode',
    'NoLineJudge3', 'LineJudge3Name', 'LineJudge3FederationCode',
    'NoLineJudge4', 'LineJudge4Name', 'LineJudge4FederationCode'
  ];

  const actualFields = Object.keys(apiResponse).filter(key =>
    key.includes('Referee') || key.includes('Scorer') || key.includes('LineJudge') || key.includes('Official')
  );

  const missingFields = expectedFields.filter(field => !(field in apiResponse));
  const unexpectedFields = actualFields.filter(field => !expectedFields.includes(field));
  const validatedFields = expectedFields.filter(field => field in apiResponse);

  return {
    valid: missingFields.length === 0,
    missingFields,
    unexpectedFields,
    validatedFields
  };
}

/**
 * Payload Size Estimation
 *
 * Estimates additional payload size from official fields.
 */
export function estimateOfficialPayloadSize(): {
  fieldsPerMatch: number;
  bytesPerMatch: number;
  increasePercentage: number;
} {
  const currentFieldCount = 14;  // Existing default mode fields
  const officialFieldCount = 21; // Official fields (7 officials x 3 fields each)
  const totalFieldCount = currentFieldCount + officialFieldCount;

  const currentBytesPerMatch = 2000;  // ~2KB per match (current)
  const bytesPerField = 60;           // Average bytes per field (name + federation + no)
  const additionalBytes = officialFieldCount * bytesPerField;
  const totalBytesPerMatch = currentBytesPerMatch + additionalBytes;

  const increasePercentage = (additionalBytes / currentBytesPerMatch) * 100;

  return {
    fieldsPerMatch: totalFieldCount,
    bytesPerMatch: totalBytesPerMatch,
    increasePercentage: Math.round(increasePercentage)
  };
}

/**
 * Field Selection Optimization Recommendation
 *
 * Based on payload analysis, recommends field selection strategy.
 */
export function getFieldSelectionRecommendation(): {
  strategy: string;
  reasoning: string;
  fieldsToMove: string[];
} {
  const estimate = estimateOfficialPayloadSize();

  if (estimate.increasePercentage > 20) {
    return {
      strategy: 'Move non-critical fields to full mode',
      reasoning: `Adding officials increases payload by ${estimate.increasePercentage}% (target: <20%). Move Statistics and SetScores to full mode to stay within budget.`,
      fieldsToMove: ['Statistics', 'SetScores', 'Duration']
    };
  }

  return {
    strategy: 'Add officials to default mode as-is',
    reasoning: `Payload increase of ${estimate.increasePercentage}% is within acceptable range (<20%).`,
    fieldsToMove: []
  };
}

/**
 * Integration Checklist
 *
 * Steps to integrate these fields into the codebase:
 *
 * 1. ✅ Run test-match-officials.js to validate field names
 * 2. ⏭️ Update types/match.ts with BeachMatchOfficialFields
 * 3. ⏭️ Update types/referee-v2.ts with new OfficialRole enum values
 * 4. ⏭️ Update types/api-v2.ts with OFFICIAL_FIELD_SELECTIONS
 * 5. ⏭️ Update services/BeachMatchService.ts to extract officials
 * 6. ⏭️ Update services/MatchProcessingService.ts for filtering
 * 7. ⏭️ Create components/entities/Match/MatchOfficialsList.tsx
 * 8. ⏭️ Update components/entities/Match/MatchCard.tsx for inline display
 * 9. ⏭️ Test with npm run audit to check field count compliance
 * 10. ⏭️ Verify cache performance with CachePerformanceMonitor
 */
