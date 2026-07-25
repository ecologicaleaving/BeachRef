/**
 * @fileoverview VIS API request/response types v2
 * Unified VIS API client interfaces and types
 * Part of EPIC-007 Data Architecture Restructuration
 */

/**
 * VIS API endpoint types
 */
export enum VisApiEndpoint {
  /** Primary endpoint for event/tournament lists */
  GET_EVENT_LIST = 'GetEventList',
  /** VIS compliant tournament list endpoint */
  GET_BEACH_TOURNAMENT_LIST = 'GetBeachTournamentList',
  /** Fallback endpoint for tournament location details */
  GET_BEACH_TOURNAMENT = 'GetBeachTournament',
  /** Endpoint for officials/referee data */
  GET_EVENT = 'GetEvent',
  /** Endpoint for match data */
  GET_BEACH_MATCH_LIST = 'GetBeachMatchList',
  /** Endpoint for round data */
  GET_BEACH_ROUND = 'GetBeachRound',
  /** VIS compliant round list endpoint */
  GET_BEACH_ROUND_LIST = 'GetBeachRoundList',
  /** Endpoint for individual match data */
  GET_BEACH_MATCH = 'GetBeachMatch',
  /** Endpoint for match status/live polling */
  GET_BEACH_MATCH_STATUS = 'GetBeachMatchStatus',
  /** Endpoint for live score data */
  GET_BEACH_LIVE = 'GetBeachLive',
  /** Endpoint for batch requests */
  BATCH_REQUEST = 'BatchRequest',
  /** Endpoint for event official lists */
  GET_EVENT_OFFICIAL_LIST = 'GetEventOfficialList',
  /** Endpoint for event referee lists */
  GET_EVENT_REFEREE_LIST = 'GetEventRefereeList',
  /** Endpoint for general referee lists */
  GET_REFEREE_LIST = 'GetRefereeList',
  /** Endpoint for a single referee's details (issue #46) */
  GET_REFEREE = 'GetReferee',
  /** Endpoint for image lookups — used to resolve referee portraits (issue #46) */
  GET_IMAGE_LIST = 'GetImageList',
  /** Endpoint issuing a one-shot token for a referee's ID card PDF (issue #46) */
  GET_REFEREE_ID_CARD = 'GetRefereeIdCard'
}

/**
 * Base VIS API request interface
 */
export interface VisApiRequestBase {
  /** Request ID for tracking */
  readonly requestId?: string;
  /** Request timestamp */
  readonly timestamp?: string;
  /** Request timeout in ms */
  readonly timeoutMs?: number;
  /** Audit metadata (VIS API Optimization - T011) */
  readonly _audit?: {
    /** Request source for tracking (user/polling/prefetch/cache-refresh) */
    readonly source?: 'user' | 'polling' | 'prefetch' | 'cache-refresh';
    /** Field selection mode (slim/default/full) */
    readonly fieldMode?: 'slim' | 'default' | 'full';
    /** Whether to capture for audit analysis (__DEV__ only) */
    readonly captureForAudit?: boolean;
  };
}

/**
 * GetEventList request parameters
 * Primary endpoint for tournament data
 */
export interface GetEventListRequest extends VisApiRequestBase {
  /** Filter by tournament type */
  readonly tournamentType?: string;
  /** Filter by gender (M, W, MIXED) */
  readonly gender?: string;
  /** Start date filter (ISO format) */
  readonly startDate?: string;
  /** End date filter (ISO format) */
  readonly endDate?: string;
  /** Filter by country code */
  readonly countryCode?: string;
  /** Filter by status */
  readonly status?: string;
  /** Maximum number of results */
  readonly maxResults?: number;
  /** Fields to include in response */
  readonly fields?: readonly string[];
}

/**
 * GetBeachTournamentList request parameters
 * VIS compliant tournament list endpoint
 */
export interface GetBeachTournamentListRequest extends VisApiRequestBase {
  /** Filter by start date (YYYY-MM-DD format) */
  readonly dateFrom?: string;
  /** Filter by end date (YYYY-MM-DD format) */
  readonly dateTo?: string;
  /** Filter by tournament status */
  readonly status?: string;
  /** Filter by gender (M, W) */
  readonly gender?: string;
  /** Filter by country code */
  readonly countryCode?: string;
  /** Maximum number of results */
  readonly maxResults?: number;
  /** Fields to include in response */
  readonly fields?: readonly string[];
}

/**
 * GetBeachTournament request parameters
 * Fallback endpoint for location details
 */
export interface GetBeachTournamentRequest extends VisApiRequestBase {
  /** Tournament number from VIS */
  readonly tournamentNo: string;
  /** Include location details */
  readonly includeLocation?: boolean;
  /** Include venue information */
  readonly includeVenue?: boolean;
  /** Include contact information */
  readonly includeContacts?: boolean;
}

/**
 * GetEvent request parameters
 * For officials/referee data
 */
export interface GetEventRequest extends VisApiRequestBase {
  /** Event number from VIS */
  readonly eventNo: string;
  /** Explicit field selection (omitted → VIS returns its default field set) */
  readonly fields?: readonly string[];
  /** Include officials list */
  readonly includeOfficials?: boolean;
  /** Include referee assignments */
  readonly includeReferees?: boolean;
  /** Include technical officials */
  readonly includeTechnicalOfficials?: boolean;
}

/**
 * GetBeachMatchList request parameters
 * For match data
 */
export interface GetBeachMatchListRequest extends VisApiRequestBase {
  /** Tournament number from VIS (omit when filtering by {@link eventNo}) */
  readonly tournamentNo?: string;
  /**
   * Event number from VIS — filters `NoEvent` instead of `NoTournament`,
   * returning every match of the event in one call (issue #40).
   */
  readonly eventNo?: string;
  /** Filter by court number */
  readonly courtNo?: string;
  /** Filter by match status */
  readonly status?: string;
  /** Start date for matches */
  readonly startDate?: string;
  /** End date for matches */
  readonly endDate?: string;
  /** Include match results */
  readonly includeResults?: boolean;
  /** Include referee assignments */
  readonly includeReferees?: boolean;
  /** Filter by first referee ID (NoReferee1 = RefereeId) */
  readonly NoReferee1?: string;
  /** Filter by second referee ID (NoReferee2 = RefereeId) */
  readonly NoReferee2?: string;
}

/**
 * GetBeachMatch request parameters
 * For individual match data with full details
 */
export interface GetBeachMatchRequest extends VisApiRequestBase {
  /** Match number from VIS */
  readonly matchNo: number;
  /** Tournament number from VIS */
  readonly tournamentNo?: number;
  /** Include tournament context for timezone normalization */
  readonly includeTournamentContext?: boolean;
  /** Include detailed match results */
  readonly includeResults?: boolean;
  /** Include referee assignments */
  readonly includeReferees?: boolean;
  /** Include team details */
  readonly includeTeamDetails?: boolean;
  /** Include set-by-set scores */
  readonly includeSetScores?: boolean;
  /** Include match statistics */
  readonly includeStatistics?: boolean;
}

/**
 * GetBeachMatchStatus request parameters
 * For lightweight live polling of match state and current scores
 */
export interface GetBeachMatchStatusRequest extends VisApiRequestBase {
  /** Match number from VIS */
  readonly matchNo: number;
  /** Last known version for bandwidth optimization */
  readonly lastVersion?: number;
  /** Include timeout information */
  readonly includeTimeouts?: boolean;
  /** Include serving team information */
  readonly includeServingInfo?: boolean;
  /** Tournament context for timezone normalization */
  readonly includeTournamentContext?: boolean;
}

/**
 * GetBeachRound request parameters
 * For round data
 */
export interface GetBeachRoundRequest extends VisApiRequestBase {
  /** Tournament number from VIS */
  readonly tournamentNo: string;
  /** Round number from VIS */
  readonly roundNo: string;
  /** Include teams information */
  readonly includeTeams?: boolean;
  /** Include matches in round */
  readonly includeMatches?: boolean;
}

/**
 * GetBeachRoundList request parameters
 * VIS compliant round list endpoint
 */
export interface GetBeachRoundListRequest extends VisApiRequestBase {
  /** Tournament number from VIS */
  readonly tournamentNo: string;
  /** Include teams information */
  readonly includeTeams?: boolean;
  /** Include matches in round */
  readonly includeMatches?: boolean;
  /** Fields to include in response */
  readonly fields?: readonly string[];
}

/**
 * GetBeachLiveRequest parameters
 * For live score data
 */
export interface GetBeachLiveRequest extends VisApiRequestBase {
  /** Match number from VIS */
  readonly matchNo: number;
  /** Version number for bandwidth optimization */
  readonly version?: number;
  /** Options for data filtering */
  readonly options?: readonly string[];
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
 * GetRefereeList request parameters (issue #46)
 * For retrieving the global referee directory, optionally narrowed by sport.
 */
export interface GetRefereeListRequest extends VisApiRequestBase {
  /** VIS sport code — `BV` for beach volleyball. Omit for every sport. */
  readonly sport?: string;
  /** Fields to include in response */
  readonly fields?: readonly string[];
}

/**
 * GetReferee request parameters (issue #46)
 * For retrieving a single referee's full record.
 */
export interface GetRefereeRequest extends VisApiRequestBase {
  /** Referee number (`NoReferee`) */
  readonly refereeNo: string;
  /** Fields to include in response */
  readonly fields?: readonly string[];
}

/**
 * GetImageList request parameters (issue #46)
 * Only ever used here to resolve the portrait of a person: `dataType` 61 is the
 * referee entity and `imageType` 15 is the portrait.
 */
export interface GetImageListRequest extends VisApiRequestBase {
  /** VIS entity type the image belongs to */
  readonly dataType: string;
  /** Identifier of that entity */
  readonly dataNo: string;
  /** VIS image type */
  readonly imageType: string;
  /** Fields to include in response */
  readonly fields?: readonly string[];
}

/**
 * GetRefereeIdCard request parameters (issue #46)
 */
export interface GetRefereeIdCardRequest extends VisApiRequestBase {
  /** Referee number (`NoReferee`) */
  readonly refereeNo: string;
  /** `Volley` or `Beach` */
  readonly volleyType: string;
}

/**
 * Batch request item for combining multiple API calls
 */
export interface BatchRequestItem {
  /** Request type/endpoint */
  readonly type: VisApiEndpoint;
  /** Request parameters */
  readonly request: VisApiRequestBase;
  /** Optional request ID for tracking */
  readonly requestId?: string;
}

/**
 * Batch request parameters
 * Combines multiple API requests into a single call
 */
export interface BatchRequest extends VisApiRequestBase {
  /** Array of individual requests to batch */
  readonly requests: readonly BatchRequestItem[];
  /** Strategy for handling partial failures */
  readonly failureStrategy?: 'fail_all' | 'continue_on_partial';
}

/**
 * Individual response item in batch response
 */
export interface BatchResponseItem {
  /** Original request ID if provided */
  readonly requestId?: string;
  /** Request type that was executed */
  readonly type: VisApiEndpoint;
  /** Whether this individual request succeeded */
  readonly success: boolean;
  /** Response data if successful */
  readonly data?: any;
  /** Error information if failed */
  readonly error?: VisApiErrorResponse;
}

/**
 * Batch response containing multiple individual responses
 */
export interface BatchResponse extends VisApiResponseBase {
  readonly success: true; // Batch operation itself succeeded (even with partial failures)
  /** Array of individual response results */
  readonly results: readonly BatchResponseItem[];
  /** Whether any requests in the batch failed */
  readonly hasPartialFailures: boolean;
}

/**
 * Tournament detail batch request convenience interface
 * Combines GetBeachTournament + GetBeachMatchList + GetBeachRoundList
 */
export interface TournamentDetailBatchRequest extends VisApiRequestBase {
  /** Tournament number to fetch details for */
  readonly tournamentNo: string;
  /** Whether to include match list */
  readonly includeMatches?: boolean;
  /** Whether to include round list */
  readonly includeRounds?: boolean;
  /** Whether to include tournament details */
  readonly includeTournamentDetails?: boolean;
}

/**
 * VIS API response base interface
 */
export interface VisApiResponseBase {
  /** Response timestamp */
  readonly timestamp: string;
  /** Response success status */
  readonly success: boolean;
  /** Error message if request failed */
  readonly error?: string;
  /** Response duration in ms */
  readonly durationMs: number;
  /** Response size in bytes */
  readonly sizeBytes?: number;
}

/**
 * VIS API error response
 */
export interface VisApiErrorResponse extends VisApiResponseBase {
  readonly success: false;
  /** Error code */
  readonly errorCode: string;
  /** Detailed error message */
  readonly error: string;
  /** Error details */
  readonly details?: Record<string, any>;
}

/**
 * VIS API success response with XML data
 */
export interface VisApiSuccessResponse extends VisApiResponseBase {
  readonly success: true;
  /** Raw XML response data */
  readonly xmlData: string;
  /** Parsed response metadata */
  readonly metadata?: Record<string, any>;
}

/**
 * VIS API response union type
 */
export type VisApiResponse = VisApiSuccessResponse | VisApiErrorResponse;

/**
 * API client configuration
 */
export interface VisApiClientConfig {
  /** Base URL for VIS API */
  readonly baseUrl: string;
  /** API timeout in milliseconds */
  readonly timeoutMs: number;
  /** Maximum retry attempts */
  readonly maxRetries: number;
  /** Retry delay in milliseconds */
  readonly retryDelayMs: number;
  /** Enable exponential backoff */
  readonly exponentialBackoff: boolean;
  /** Request headers */
  readonly headers?: Record<string, string>;
  /** Enable request/response logging */
  readonly enableLogging: boolean;
}

/**
 * API client interface
 */
export interface IVisApiClient {
  /**
   * Get event list (primary endpoint)
   * @param request - GetEventList request parameters
   * @returns Promise with XML response
   */
  getEventList(request: GetEventListRequest): Promise<VisApiResponse>;
  
  /**
   * Get beach tournament list (VIS compliant endpoint)
   * @param request - GetBeachTournamentList request parameters
   * @returns Promise with XML response
   */
  getBeachTournamentList(request: GetBeachTournamentListRequest): Promise<VisApiResponse>;
  
  /**
   * Get beach tournament details (fallback endpoint)
   * @param request - GetBeachTournament request parameters
   * @returns Promise with XML response
   */
  getBeachTournament(request: GetBeachTournamentRequest): Promise<VisApiResponse>;
  
  /**
   * Get event officials data
   * @param request - GetEvent request parameters
   * @returns Promise with XML response
   */
  getEvent(request: GetEventRequest): Promise<VisApiResponse>;
  
  /**
   * Get beach match list
   * @param request - GetBeachMatchList request parameters
   * @returns Promise with XML response
   */
  getBeachMatchList(request: GetBeachMatchListRequest): Promise<VisApiResponse>;
  
  /**
   * Get individual beach match with full details
   * @param request - GetBeachMatch request parameters
   * @returns Promise with XML response
   */
  getBeachMatch(request: GetBeachMatchRequest): Promise<VisApiResponse>;

  /**
   * Get lightweight match status for live polling
   * @param request - GetBeachMatchStatus request parameters
   * @returns Promise with XML response containing current match state
   */
  getBeachMatchStatus(request: GetBeachMatchStatusRequest): Promise<VisApiResponse>;

  /**
   * Get beach round data
   * @param request - GetBeachRound request parameters
   * @returns Promise with XML response
   */
  getBeachRound(request: GetBeachRoundRequest): Promise<VisApiResponse>;
  
  /**
   * Get beach round list (VIS compliant endpoint)
   * @param request - GetBeachRoundList request parameters
   * @returns Promise with XML response
   */
  getBeachRoundList(request: GetBeachRoundListRequest): Promise<VisApiResponse>;
  
  /**
   * Get beach live score data
   * @param request - GetBeachLiveRequest request parameters
   * @returns Promise with XML response
   */
  getBeachLive(request: GetBeachLiveRequest): Promise<VisApiResponse>;
  
  /**
   * Execute batch request with multiple API calls
   * @param request - BatchRequest with multiple requests
   * @returns Promise with batch response
   */
  executeBatchRequest(request: BatchRequest): Promise<BatchResponse>;
  
  /**
   * Get tournament details using batch request
   * @param request - TournamentDetailBatchRequest with tournament ID and options
   * @returns Promise with batch response containing tournament, matches, and rounds
   */
  getTournamentDetailBatch(request: TournamentDetailBatchRequest): Promise<BatchResponse>;
  
  /**
   * Get event official list using dedicated VIS API endpoint
   * @param request - GetEventOfficialList request parameters  
   * @returns Promise with XML response containing official list
   */
  getEventOfficialList(request: GetEventOfficialListRequest): Promise<VisApiResponse>;
  
  /**
   * Get event referee list using dedicated VIS API endpoint
   * @param request - GetEventRefereeList request parameters
   * @returns Promise with XML response containing referee list
   */
  getEventRefereeList(request: GetEventRefereeListRequest): Promise<VisApiResponse>;

  /**
   * Alias for getBeachMatchList - fetch matches for a tournament
   * @param request - GetBeachMatchList request parameters
   * @returns Promise with XML response
   */
  fetchMatchesForTournament?(request: GetBeachMatchListRequest): Promise<VisApiResponse>;

  /**
   * Alias for getEventList - get tournaments
   * @param request - GetEventList request parameters
   * @returns Promise with XML response
   */
  getTournaments?(request: GetEventListRequest): Promise<VisApiResponse>;

  /**
   * Test API connectivity
   * @returns Promise with connection status
   */
  testConnection(): Promise<boolean>;
  
  /**
   * Get optimized field selection based on context and mode
   * @param endpoint - API endpoint
   * @param strategy - Field selection strategy
   * @returns Optimized field array
   */
  getOptimizedFields(endpoint: VisApiEndpoint, strategy: FieldSelectionStrategy): readonly string[];
  
  /**
   * Get API client configuration
   * @returns Current client configuration
   */
  getConfig(): VisApiClientConfig;
}

/**
 * Request retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  readonly maxAttempts: number;
  /** Base delay between retries in ms */
  readonly baseDelayMs: number;
  /** Maximum delay between retries in ms */
  readonly maxDelayMs: number;
  /** Enable exponential backoff */
  readonly exponentialBackoff: boolean;
  /** Jitter factor for randomizing delays */
  readonly jitterFactor: number;
  /** HTTP status codes that should trigger retry */
  readonly retryableStatusCodes: readonly number[];
}

/**
 * Request monitoring interface
 */
export interface RequestMonitor {
  /** Total requests made */
  readonly totalRequests: number;
  /** Successful requests */
  readonly successfulRequests: number;
  /** Failed requests */
  readonly failedRequests: number;
  /** Average response time in ms */
  readonly avgResponseTimeMs: number;
  /** Requests by endpoint */
  readonly requestsByEndpoint: Record<VisApiEndpoint, number>;
  /** Error counts by type */
  readonly errorsByType: Record<string, number>;
  /** Last request timestamp */
  readonly lastRequestTimestamp: string;
}

/**
 * Field selection for optimized API requests
 */
export interface FieldSelection {
  /** Tournament fields to include */
  readonly tournamentFields?: readonly string[];
  /** Match fields to include */
  readonly matchFields?: readonly string[];
  /** Official fields to include */
  readonly officialFields?: readonly string[];
  /** Location fields to include */
  readonly locationFields?: readonly string[];
}

/**
 * Type guard to check if response is successful
 * @param response - VIS API response
 * @returns True if response is successful
 */
export function isSuccessResponse(response: VisApiResponse): response is VisApiSuccessResponse {
  return response.success === true;
}

/**
 * Type guard to check if response is an error
 * @param response - VIS API response
 * @returns True if response is an error
 */
export function isErrorResponse(response: VisApiResponse): response is VisApiErrorResponse {
  return response.success === false;
}

/**
 * Default field selections for optimized requests
 */
export const DEFAULT_FIELD_SELECTIONS: Record<VisApiEndpoint, readonly string[]> = {
  [VisApiEndpoint.GET_EVENT_LIST]: [
    'No', 'Name', 'Code', 'City', 'Country', 'CountryCode',
    'StartDate', 'EndDate', 'Type', 'Gender', 'Status', 'DefaultTimeZone'
  ],
  [VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST]: [
    'No', 'Name', 'CountryCode', 'City', 'StartDate', 'EndDate', 'Gender', 'Level', 'Status', 'DefaultTimeZone'
  ],
  [VisApiEndpoint.GET_BEACH_TOURNAMENT]: [
    'Location', 'Venue', 'Address', 'ContactName', 'ContactEmail',
    'Courts', 'Surface', 'Website', 'DefaultTimeZone'
  ],
  [VisApiEndpoint.GET_EVENT]: [
    'Officials', 'Referees', 'TechnicalOfficials', 'OfficialFunctions'
  ],
  [VisApiEndpoint.GET_BEACH_MATCH_LIST]: [
    'MatchNo', 'Court', 'DateTime', 'Status', 'Team1', 'Team2',
    'Result', 'Round', 'Phase', 'Referees', 'TournamentGender',
    'Referee1Name', 'Referee2Name', 'Referee1FederationCode', 'Referee2FederationCode'
  ],
  [VisApiEndpoint.GET_BEACH_MATCH]: [
    'No', 'NoInTournament', 'LocalDate', 'LocalTime', 'Status', 'Court',
    'TeamA', 'TeamB', 'TeamAName', 'TeamBName', 'TeamAFederationCode', 'TeamBFederationCode',
    'MatchPointsA', 'MatchPointsB', 'RoundName', 'Round', 'RoundPhase',
    'Referee1Name', 'Referee2Name', 'Referee1FederationCode', 'Referee2FedereeCode',
    'Sets', 'SetScores', 'Statistics', 'Duration', 'TournamentGender',
    'StartTime', 'EndTime'
  ],
  [VisApiEndpoint.GET_BEACH_MATCH_STATUS]: [
    'No', 'Status', 'CurrentSet', 'PointsA', 'PointsB', 'ServingTeam',
    'TimeoutsA', 'TimeoutsB', 'TechnicalTimeout', 'LastUpdate', 'Version'
  ],
  [VisApiEndpoint.GET_BEACH_ROUND]: [
    'RoundNo', 'Name', 'Teams', 'Matches', 'Status'
  ],
  [VisApiEndpoint.GET_BEACH_ROUND_LIST]: [
    'No', 'Name', 'Phase', 'Order'
  ],
  [VisApiEndpoint.GET_BEACH_LIVE]: [
    'Version', 'PollDelay', 'Match', 'Sets', 'TeamA', 'TeamB',
    'ServingTeam', 'ServingPlayer', 'BallInPlay', 'Tournament'
  ],
  [VisApiEndpoint.BATCH_REQUEST]: [
    'BatchId', 'RequestCount', 'Results', 'Success', 'Errors'
  ],
  [VisApiEndpoint.GET_EVENT_OFFICIAL_LIST]: [
    'NoOfficial', 'FirstName', 'LastName', 'Role', 'Status'
  ],
  [VisApiEndpoint.GET_EVENT_REFEREE_LIST]: [
    'NoReferee', 'FirstName', 'LastName', 'FederationCode', 'Gender', 'Type', 'Status'
  ],
  [VisApiEndpoint.GET_REFEREE_LIST]: [
    'NoReferee', 'FirstName', 'LastName', 'FederationCode', 'Gender', 'Type', 'Status'
  ],
  [VisApiEndpoint.GET_REFEREE]: [
    'NoReferee', 'FirstName', 'LastName', 'FederationCode', 'Gender', 'Type', 'Status'
  ],
  // The only thing read out of these two responses. GetRefereeIdCard takes no
  // `Fields` attribute at all — its builder does not emit one — but every
  // endpoint must declare a non-empty selection (see the field-selection tests).
  [VisApiEndpoint.GET_IMAGE_LIST]: ['No'],
  [VisApiEndpoint.GET_REFEREE_ID_CARD]: ['Token']
} as const;

/**
 * Slim field selections for bandwidth optimization during frequent polling
 */
export const SLIM_FIELD_SELECTIONS: Record<VisApiEndpoint, readonly string[]> = {
  [VisApiEndpoint.GET_EVENT_LIST]: [
    'No', 'Name', 'StartDate', 'EndDate', 'Status'
  ],
  [VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST]: [
    'No', 'Name', 'StartDate', 'EndDate', 'Status'
  ],
  [VisApiEndpoint.GET_BEACH_TOURNAMENT]: [
    'No', 'Name', 'Status'
  ],
  [VisApiEndpoint.GET_EVENT]: [
    'No', 'Status'
  ],
  [VisApiEndpoint.GET_BEACH_MATCH_LIST]: [
    'MatchNo', 'Status', 'DateTime'
  ],
  [VisApiEndpoint.GET_BEACH_MATCH]: [
    'No', 'Status', 'LocalDate', 'LocalTime'
  ],
  [VisApiEndpoint.GET_BEACH_MATCH_STATUS]: [
    'No', 'Status', 'PointsA', 'PointsB'
  ],
  [VisApiEndpoint.GET_BEACH_ROUND]: [
    'RoundNo', 'Status'
  ],
  [VisApiEndpoint.GET_BEACH_ROUND_LIST]: [
    'No', 'Name', 'Order'
  ],
  [VisApiEndpoint.GET_BEACH_LIVE]: [
    'Version', 'PollDelay', 'Status'
  ],
  [VisApiEndpoint.BATCH_REQUEST]: [
    'BatchId', 'Success', 'Errors'
  ],
  [VisApiEndpoint.GET_EVENT_OFFICIAL_LIST]: [
    'FirstName', 'LastName', 'NoOfficial', 'Role', 'Status'
  ],
  [VisApiEndpoint.GET_EVENT_REFEREE_LIST]: [
    'FirstName', 'LastName', 'NoReferee', 'FederationCode', 'Status'
  ],
  [VisApiEndpoint.GET_REFEREE_LIST]: [
    'FirstName', 'LastName', 'NoReferee', 'FederationCode', 'Status'
  ],
  [VisApiEndpoint.GET_REFEREE]: [
    'FirstName', 'LastName', 'NoReferee', 'FederationCode', 'Status'
  ],
  [VisApiEndpoint.GET_IMAGE_LIST]: ['No'],
  [VisApiEndpoint.GET_REFEREE_ID_CARD]: ['Token']
} as const;

/**
 * Match polling status for adaptive interval management
 */
export enum MatchPollingStatus {
  RUNNING = 'Running',
  SCHEDULED = 'Scheduled', 
  FINISHED = 'Finished'
}

/**
 * Field selection mode for bandwidth optimization
 */
export enum FieldSelectionMode {
  FULL = 'full',
  SLIM = 'slim', 
  CUSTOM = 'custom'
}

/**
 * Match status polling configuration
 */
export interface MatchStatusPollingConfig {
  readonly status: MatchPollingStatus;
  readonly intervalMs: number;
  readonly shouldPoll: boolean;
  readonly fieldSelectionMode: FieldSelectionMode;
}

/**
 * Field selection strategy for context-aware optimization
 */
export interface FieldSelectionStrategy {
  readonly mode: FieldSelectionMode;
  readonly customFields?: readonly string[];
  readonly contextHint?: 'list' | 'detail' | 'polling';
}

/**
 * Adaptive polling request with status awareness
 */
export interface AdaptivePollingRequest extends VisApiRequestBase {
  readonly matchNo: number;
  readonly currentStatus?: MatchPollingStatus;
  readonly fieldSelectionMode?: FieldSelectionMode;
  readonly enableAdaptivePolling?: boolean;
}

/**
 * Standard retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  exponentialBackoff: true,
  jitterFactor: 0.1,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504]
} as const;