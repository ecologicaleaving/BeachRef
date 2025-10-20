/**
 * VIS API Audit & Optimization Types
 *
 * This file contains all type definitions for the API audit, cache optimization,
 * and payload optimization features.
 *
 * Feature: specs/001-vis-api-optimization
 * Data Model: specs/001-vis-api-optimization/data-model.md
 */

// ============================================================================
// Enums
// ============================================================================

export enum VisApiEndpoint {
  GET_EVENT_LIST = 'GetEventList',
  GET_BEACH_TOURNAMENT_LIST = 'GetBeachTournamentList',
  GET_BEACH_TOURNAMENT = 'GetBeachTournament',
  GET_BEACH_MATCH_LIST = 'GetBeachMatchList',
  GET_BEACH_MATCH = 'GetBeachMatch',
  GET_BEACH_ROUND_LIST = 'GetBeachRoundList',
  GET_EVENT_REFEREE_LIST = 'GetEventRefereeList',
}

export type NetworkType = 'wifi' | 'cellular' | 'offline';
export type RequestSource = 'user' | 'polling' | 'prefetch' | 'cache-refresh';
export type Severity = 'critical' | 'warning' | 'info';
export type FindingCategory = 'malformed' | 'over-fetching' | 'incorrect-parameter' | 'missing-field' | 'excessive-batch';
export type CacheLevel = 'memory' | 'mmkv' | 'async-storage';
export type DataVolatility = 'live' | 'dynamic' | 'semi-static' | 'static';
export type EntityType = 'tournament' | 'match' | 'referee' | 'ranking';
export type FieldMode = 'slim' | 'default' | 'full';
export type UseCase = 'list' | 'detail' | 'polling' | 'prefetch';
export type AppState = 'active' | 'background' | 'inactive';

// ============================================================================
// Entity Interfaces
// ============================================================================

/**
 * API Request (Audit Capture)
 *
 * Represents a captured VIS API call with full request/response details
 * for audit analysis.
 *
 * Purpose: Captures all VIS API requests for validation against documentation (FR-001, FR-002)
 */
export interface ApiRequest {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Unix milliseconds when request initiated */
  timestamp: number;
  /** VIS API endpoint called */
  endpoint: VisApiEndpoint;
  /** Full XML payload sent to VIS API */
  requestXml: string;
  /** HTTP headers */
  requestHeaders: Record<string, string>;
  /** HTTP status code (200, 400, 500, etc.) */
  responseStatus: number;
  /** XML response body */
  responseBody: string;
  /** Milliseconds from request to response */
  responseTime: number;
  /** Bytes of request + response combined */
  payloadSize: number;
  /** Count of fields requested in Fields attribute */
  fieldCount: number;
  /** Whether response was served from cache */
  cacheHit: boolean;
  /** Connection type during request */
  networkType: NetworkType;
  /** What triggered the request */
  source: RequestSource;
}

/**
 * Audit Finding
 *
 * Represents an identified issue with API request format, field selection,
 * or over-fetching.
 *
 * Purpose: Documents malformed requests and optimization opportunities (FR-003, FR-004)
 */
export interface AuditFinding {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Reference to API Request */
  apiRequestId: string;
  /** Issue severity level */
  severity: Severity;
  /** Issue type */
  category: FindingCategory;
  /** Specific problem description */
  issue: string;
  /** Correct format per VIS documentation */
  expectedFormat: string;
  /** What was sent/received */
  actualFormat: string;
  /** How to fix the issue */
  recommendation: string;
  /** Quantified impact */
  impactAssessment: {
    /** Error rate as decimal (0-1) */
    errorRate: number;
    /** Additional bytes due to this issue */
    payloadIncrease: number;
    /** VIS API endpoints affected */
    affectedEndpoints: string[];
  };
  /** When finding was identified (Unix ms) */
  timestamp: number;
  /** Whether issue has been fixed */
  resolved: boolean;
}

/**
 * Cache Entry
 *
 * Represents cached API response data with metadata for expiration
 * and invalidation tracking.
 *
 * Purpose: Multi-level cache storage with adaptive TTL (FR-008, FR-013)
 */
export interface CacheEntry {
  /** Cache key (query-based) */
  key: string;
  /** Cached response data (JSON-serializable) */
  value: any;
  /** Storage tier */
  level: CacheLevel;
  /** Unix ms when data becomes stale */
  stalenessTimestamp: number;
  /** Unix ms when data expires and should be purged */
  expirationTimestamp: number;
  /** When cache entry was created (Unix ms) */
  createdAt: number;
  /** Most recent access time (Unix ms) */
  lastAccessedAt: number;
  /** Total number of times accessed */
  accessCount: number;
  /** How frequently data changes */
  dataVolatility: DataVolatility;
  /** What type of data */
  entityType: EntityType;
  /** Status if applicable (e.g., 'Running', 'Scheduled', 'Finished') */
  entityStatus: string | null;
}

/**
 * Field Selection Strategy
 *
 * Defines which fields to request based on context (list/detail,
 * network type, use case).
 *
 * Purpose: Context-aware payload optimization (FR-016, FR-017, FR-018, FR-019)
 */
export interface FieldSelectionStrategy {
  /** Field selection mode */
  mode: FieldMode;
  /** Which API endpoint this applies to */
  endpoint: VisApiEndpoint;
  /** What triggered the request */
  useCase: UseCase;
  /** Specific fields to request (null = all fields) */
  fields: string[] | null;
  /** When this strategy applies */
  networkType: NetworkType | 'any';
  /** Expected response size in bytes */
  estimatedPayloadSize: number;
  /** Count of fields requested */
  fieldCount: number;
}

/**
 * Polling Configuration
 *
 * Defines adaptive polling behavior based on entity status and app state.
 *
 * Purpose: Status-based adaptive polling (FR-009, FR-010, FR-011)
 */
export interface PollingConfiguration {
  /** Type of entity being polled */
  entityType: EntityType;
  /** Specific entity identifier */
  entityId: string;
  /** Current status (e.g., 'Running', 'Scheduled', 'Finished') */
  entityStatus: string;
  /** Polling interval in milliseconds (null = disabled) */
  intervalMs: number | null;
  /** Whether polling is currently active */
  enabled: boolean;
  /** Interval when app backgrounded (null = pause) */
  backgroundInterval: number | null;
  /** Unix ms of most recent poll */
  lastPollTimestamp: number;
  /** Unix ms when next poll scheduled */
  nextPollTimestamp: number;
  /** Total polls executed */
  pollCount: number;
  /** Current app state */
  appState: AppState;
}

/**
 * Audit Report
 *
 * Aggregated summary of audit findings for developer review.
 *
 * Purpose: Consolidated audit output (FR-004, SC-001, SC-002, SC-007)
 */
export interface AuditReport {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Unix ms when report generated */
  generatedAt: number;
  /** Audit period start time (Unix ms) */
  periodStart: number;
  /** Audit period end time (Unix ms) */
  periodEnd: number;
  /** API requests captured */
  totalRequests: number;
  /** Requests with format errors */
  malformedRequests: number;
  /** Requests with excessive fields */
  overFetchingInstances: number;
  /** Average payload size in bytes */
  averagePayloadSize: number;
  /** Average response time in milliseconds */
  averageResponseTime: number;
  /** Cache hit rate (0-1) */
  cacheHitRate: number;
  /** All issues discovered */
  findings: AuditFinding[];
  /** Prioritized fix suggestions */
  recommendations: string[];
  /** Compliance score (0-100) */
  complianceScore: number;
}

// ============================================================================
// TTL Configuration Constants
// ============================================================================

/**
 * TTL (Time-To-Live) mappings based on data volatility
 *
 * - live: 5s (match scores during play)
 * - dynamic: 15s (match lists with status changes)
 * - semi-static: 120s (tournament lists)
 * - static: 24h (archived tournaments)
 */
export const TTL_MAP: Record<DataVolatility, number> = {
  live: 5000,           // 5 seconds
  dynamic: 15000,       // 15 seconds
  'semi-static': 120000, // 2 minutes
  static: 86400000,     // 24 hours
};

/**
 * Polling interval mappings based on entity status
 *
 * - Running: 3-5s (live match in progress)
 * - Scheduled: 30-60s (match scheduled but not started)
 * - Finished: null (polling disabled)
 */
export const POLLING_INTERVALS: Record<string, number | null> = {
  Running: 5000,    // 5 seconds
  Scheduled: 60000, // 1 minute
  Finished: null,   // Disabled
};
