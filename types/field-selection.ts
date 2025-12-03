/**
 * Field Selection Configuration
 *
 * Defines context-aware field selection modes for VIS API payload optimization.
 *
 * Feature: specs/001-vis-api-optimization
 * Purpose: Reduce payload sizes by 40%+ through intelligent field selection (FR-016 - FR-023)
 */

import { VisApiEndpoint, FieldMode, UseCase, NetworkType } from './audit';

// ============================================================================
// Field Mode Definitions
// ============================================================================

/**
 * FIELD_MODES
 *
 * Preset field selection strategies for each VIS API endpoint.
 *
 * **Modes:**
 * - **slim**: List views, cellular networks, offline (6-8 fields)
 * - **default**: Standard detail views on WiFi (10-15 fields)
 * - **full**: Offline sync, complete data (all fields)
 *
 * **Validation:**
 * - Slim mode: fieldCount <= 10 for lists, <= 5 for polling
 * - Default mode: fieldCount <= 20 for lists, <= 15 for details
 * - Full mode: unrestricted (null = all fields)
 */
export const FIELD_MODES: Record<FieldMode, Record<string, string[] | null>> = {
  // ========================================================================
  // SLIM MODE: Mobile data, list views, thumbnails (6-8 fields)
  // ========================================================================
  slim: {
    // Tournament Lists (8 fields)
    [VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST]: [
      'No',
      'Name',
      'City',
      'StartDate',
      'EndDate',
      'Gender',
      'Level',
      'Status',
    ],
    [VisApiEndpoint.GET_EVENT_LIST]: [
      'No',
      'Name',
      'City',
      'StartDate',
      'EndDate',
      'Gender',
      'Level',
      'Status',
    ],

    // Match Lists (6 fields)
    [VisApiEndpoint.GET_BEACH_MATCH_LIST]: [
      'No',
      'TeamA',
      'TeamB',
      'Status',
      'Court',
      'StartDateTime',
    ],

    // Live Match Polling (5 fields) - Minimal for real-time updates
    [VisApiEndpoint.GET_BEACH_MATCH]: [
      'No',
      'Status',
      'SetScore',
      'RallyScore',
      'ServingTeam',
    ],

    // Round Lists (6 fields)
    [VisApiEndpoint.GET_BEACH_ROUND_LIST]: [
      'No',
      'Name',
      'Status',
      'MatchCount',
      'PhaseCode',
      'Sequence',
    ],

    // Referee Lists (8 fields)
    [VisApiEndpoint.GET_EVENT_REFEREE_LIST]: [
      'No',
      'FirstName',
      'FamilyName',
      'Function',
      'Nationality',
      'Status',
      'Level',
      'Gender',
    ],

    // Tournament Detail (8 fields)
    [VisApiEndpoint.GET_BEACH_TOURNAMENT]: [
      'No',
      'Name',
      'City',
      'StartDate',
      'EndDate',
      'Location',
      'Status',
      'NoOfMatches',
    ],
  },

  // ========================================================================
  // DEFAULT MODE: WiFi, standard detail views (10-15 fields)
  // ========================================================================
  default: {
    // Tournament Lists (10 fields)
    [VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST]: [
      'No',
      'Name',
      'City',
      'StartDate',
      'EndDate',
      'Location',
      'Status',
      'NoOfMatches',
      'Gender',
      'Level',
    ],
    [VisApiEndpoint.GET_EVENT_LIST]: [
      'No',
      'Name',
      'City',
      'StartDate',
      'EndDate',
      'Location',
      'Status',
      'NoOfMatches',
      'Gender',
      'Level',
    ],

    // Match Lists (10 fields)
    [VisApiEndpoint.GET_BEACH_MATCH_LIST]: [
      'No',
      'TeamA',
      'TeamB',
      'Status',
      'Court',
      'StartDateTime',
      'ScoreA',
      'ScoreB',
      'Phase',
      'Round',
    ],

    // Match Detail (15 fields)
    [VisApiEndpoint.GET_BEACH_MATCH]: [
      'No',
      'NoRound',
      'Court',
      'StartDateTime',
      'Status',
      'TeamA',
      'TeamB',
      'ScoreA',
      'ScoreB',
      'Phase',
      'SetScore',
      'RallyScore',
      'ServingTeam',
      'Duration',
      'Remarks',
    ],

    // Round Lists (10 fields)
    [VisApiEndpoint.GET_BEACH_ROUND_LIST]: [
      'No',
      'Name',
      'Status',
      'MatchCount',
      'PhaseCode',
      'Sequence',
      'StartDateTime',
      'EndDateTime',
      'Description',
      'Type',
    ],

    // Referee Lists (12 fields)
    [VisApiEndpoint.GET_EVENT_REFEREE_LIST]: [
      'No',
      'FirstName',
      'FamilyName',
      'Function',
      'Nationality',
      'Status',
      'Level',
      'Gender',
      'Email',
      'Phone',
      'Assignments',
      'Rating',
    ],

    // Tournament Detail (12 fields)
    [VisApiEndpoint.GET_BEACH_TOURNAMENT]: [
      'No',
      'Name',
      'City',
      'StartDate',
      'EndDate',
      'Location',
      'Status',
      'NoOfMatches',
      'Gender',
      'Level',
      'Organizer',
      'Description',
    ],
  },

  // ========================================================================
  // FULL MODE: Offline sync, complete data (all fields)
  // ========================================================================
  full: {
    [VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST]: null, // All fields
    [VisApiEndpoint.GET_EVENT_LIST]: null,
    [VisApiEndpoint.GET_BEACH_MATCH_LIST]: null,
    [VisApiEndpoint.GET_BEACH_MATCH]: null,
    [VisApiEndpoint.GET_BEACH_ROUND_LIST]: null,
    [VisApiEndpoint.GET_EVENT_REFEREE_LIST]: null,
    [VisApiEndpoint.GET_BEACH_TOURNAMENT]: null,
  },
};

// ============================================================================
// Field Selection Helpers
// ============================================================================

/**
 * Get fields for a specific endpoint and mode
 *
 * @param endpoint - VIS API endpoint
 * @param mode - Field selection mode (slim/default/full)
 * @returns Array of field names or null for all fields
 *
 * @example
 * ```typescript
 * const fields = getFieldsForEndpoint(VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST, 'slim');
 * // Returns: ['No', 'Name', 'City', 'StartDate', 'EndDate', 'Gender', 'Level', 'Status']
 * ```
 */
export function getFieldsForEndpoint(
  endpoint: VisApiEndpoint,
  mode: FieldMode
): string[] | null {
  return FIELD_MODES[mode][endpoint] || null;
}

/**
 * Get field count for validation
 *
 * @param fields - Array of field names or null
 * @returns Number of fields (0 if null, meaning all fields)
 */
export function getFieldCount(fields: string[] | null): number {
  return fields === null ? 0 : fields.length;
}

/**
 * Validate field count against thresholds
 *
 * @param fieldCount - Number of fields requested
 * @param mode - Field selection mode
 * @param useCase - Use case (list/detail/polling/prefetch)
 * @returns True if field count is valid, false otherwise
 *
 * @example
 * ```typescript
 * validateFieldCount(8, 'slim', 'list'); // true (<=10 for slim lists)
 * validateFieldCount(25, 'slim', 'list'); // false (>10 for slim lists)
 * ```
 */
export function validateFieldCount(
  fieldCount: number,
  mode: FieldMode,
  useCase: UseCase
): boolean {
  if (mode === 'full') return true; // No limit for full mode

  if (mode === 'slim') {
    if (useCase === 'list') return fieldCount <= 10;
    if (useCase === 'polling') return fieldCount <= 5;
    return fieldCount <= 10; // Default slim threshold
  }

  if (mode === 'default') {
    if (useCase === 'list') return fieldCount <= 20;
    if (useCase === 'detail') return fieldCount <= 15;
    return fieldCount <= 20; // Default threshold
  }

  return false;
}

/**
 * Determine field mode based on network type
 *
 * @param networkType - Current network connection type
 * @returns Recommended field mode
 *
 * @example
 * ```typescript
 * getFieldModeForNetwork('cellular'); // 'slim'
 * getFieldModeForNetwork('wifi');     // 'default'
 * getFieldModeForNetwork('offline');  // 'slim'
 * ```
 */
export function getFieldModeForNetwork(networkType: NetworkType): FieldMode {
  if (networkType === 'offline') return 'slim';
  if (networkType === 'cellular') return 'slim';
  return 'default'; // WiFi
}
