/**
 * Optimized API Response Types
 * Part of API Client Response Types Optimization Refactoring
 * Provides consistent, type-safe response handling across all API clients
 */

// ================================
// Base Response Interfaces
// ================================

/**
 * Base structure for all API responses
 */
export interface BaseApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: string;
  requestId?: string;
}

/**
 * Standardized API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  status?: number;
  retryable?: boolean;
}

/**
 * Success response with typed data
 */
export interface ApiSuccessResponse<T> extends BaseApiResponse<T> {
  success: true;
  data: T;
  error?: never;
}

/**
 * Error response with detailed error information
 */
export interface ApiErrorResponse extends BaseApiResponse<never> {
  success: false;
  data?: never;
  error: ApiError;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ================================
// VIS API Specific Responses
// ================================

/**
 * VIS API XML response wrapper
 */
export interface VisApiXmlResponse {
  xmlData: string;
  parsedData?: Record<string, any>;
  contentLength: number;
  parseTime?: number;
}

/**
 * Enhanced VIS API response with metadata
 */
export interface VisApiResponse<T = unknown> extends BaseApiResponse<T> {
  metadata: {
    responseSize: number;
    parseTime: number;
    cacheHit: boolean;
    apiVersion: string;
  };
}

// ================================
// Domain-Specific Response Types
// ================================

/**
 * Tournament list response
 */
export interface TournamentListResponse {
  tournaments: TournamentResponseDTO[];
  totalCount: number;
  lastUpdated: string;
  hasMore: boolean;
}

export interface TournamentResponseDTO {
  id: string | number;
  name: string;
  code?: string;
  location?: {
    city?: string;
    country?: string;
    countryCode?: string;
  };
  dates: {
    start?: string;
    end?: string;
  };
  type?: string;
  gender?: 'M' | 'W' | 'X';
  status?: string;
  visNo?: string;
  // Additional properties for backward compatibility
  [key: string]: any;
}

/**
 * Match list response
 */
export interface MatchListResponse {
  matches: MatchResponseDTO[];
  totalCount: number;
  lastUpdated: string;
  courtInfo?: CourtInfo[];
}

export interface MatchResponseDTO {
  id: string | number;
  eventNo: string | number;
  matchNo: string | number;
  courtNo?: string | number;
  status: MatchStatus;
  teams: {
    teamA: TeamInfo;
    teamB: TeamInfo;
  };
  score?: MatchScore;
  timing: {
    scheduled?: string;
    actual?: string;
    duration?: number;
  };
  referees?: RefereeAssignment[];
  metadata?: {
    round?: string;
    phase?: string;
    importance?: 'normal' | 'important' | 'final';
  };
}

export interface TeamInfo {
  id?: string;
  name: string;
  players?: PlayerInfo[];
  country?: string;
  seed?: number;
}

export interface PlayerInfo {
  id?: string;
  name: string;
  role?: 'player' | 'substitute';
}

export interface MatchScore {
  sets: SetScore[];
  winner?: 'A' | 'B';
  status: 'in_progress' | 'completed' | 'cancelled';
}

export interface SetScore {
  teamA: number;
  teamB: number;
  completed: boolean;
}

export type MatchStatus =
  | 'scheduled'
  | 'live'
  | 'warmup'
  | 'completed'
  | 'cancelled'
  | 'postponed';

/**
 * Referee assignment response
 */
export interface RefereeListResponse {
  referees: RefereeResponseDTO[];
  assignments?: RefereeAssignmentResponseDTO[];
  totalCount: number;
  lastUpdated: string;
}

export interface RefereeResponseDTO {
  id: string | number;
  name: string;
  firstName?: string;
  lastName?: string;
  federation?: string;
  country?: string;
  level?: string;
  certifications?: string[];
  contact?: {
    email?: string;
    phone?: string;
  };
  availability?: {
    status: 'available' | 'busy' | 'unavailable';
    from?: string;
    to?: string;
  };
}

export interface RefereeAssignmentResponseDTO {
  id?: string;
  refereeId: string | number;
  matchId: string | number;
  role: 'R1' | 'R2' | 'line_judge' | 'scorer';
  status: 'assigned' | 'confirmed' | 'declined' | 'completed';
  assignedAt: string;
  confirmedAt?: string;
}

export interface RefereeAssignment {
  refereeId: string | number;
  role: 'R1' | 'R2' | 'line_judge' | 'scorer';
  name?: string;
  status?: 'assigned' | 'confirmed' | 'declined';
}

export interface CourtInfo {
  courtNo: string | number;
  name?: string;
  status?: 'active' | 'maintenance' | 'closed';
  currentMatch?: string | number;
}

// ================================
// Response Validation Types
// ================================

/**
 * Response validation result
 */
export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  value: unknown;
}

/**
 * Response validator function type
 */
export type ResponseValidator<T> = (data: unknown) => ValidationResult<T>;

// ================================
// Batch Response Types
// ================================

/**
 * Batch API request response
 */
export interface BatchApiResponse<T = unknown> {
  success: boolean;
  results: BatchResponseItem<T>[];
  summary: BatchSummary;
  timestamp: string;
}

export interface BatchResponseItem<T = unknown> {
  requestId: string;
  success: boolean;
  data?: T;
  error?: ApiError;
  duration: number;
}

export interface BatchSummary {
  total: number;
  successful: number;
  failed: number;
  totalDuration: number;
  averageDuration: number;
}

// ================================
// Caching Response Types
// ================================

/**
 * Cached response metadata
 */
export interface CachedResponseMetadata {
  cachedAt: string;
  expiresAt: string;
  cacheKey: string;
  size: number;
  hitCount: number;
  source: 'memory' | 'storage' | 'api';
}

/**
 * Response with caching information
 */
/**
 * `ApiResponse<T>` e' una *union* discriminata (`ApiSuccessResponse | ApiErrorResponse`).
 * Un'`interface ... extends` su una union non eredita i membri: il tipo risultante
 * perdeva `success`, `data` ed `error`, ed erano quelli gli accessi che i consumer
 * facevano (issue #49). Intersezione invece di extends: la discriminazione su
 * `success` continua a funzionare e i campi tornano visibili.
 */
export type CachedApiResponse<T> = ApiResponse<T> & {
  cache: CachedResponseMetadata;
};

// ================================
// Performance Monitoring Types
// ================================

/**
 * API response performance metrics
 */
export interface ResponsePerformanceMetrics {
  requestDuration: number;
  responseSizeBytes: number;
  parseDuration?: number;
  validationDuration?: number;
  cacheWriteDuration?: number;
  memoryUsage?: {
    before: number;
    after: number;
    peak: number;
  };
}

/**
 * Response with performance metrics
 */
/** Vedi la nota su `CachedApiResponse`: intersezione, non `extends`, perche' `ApiResponse<T>` e' una union. */
export type InstrumentedApiResponse<T> = ApiResponse<T> & {
  performance: ResponsePerformanceMetrics;
};

// ================================
// Streaming Response Types
// ================================

/**
 * Server-sent events response
 */
export interface StreamResponse<T> {
  event: string;
  data: T;
  timestamp: string;
  id?: string;
}

/**
 * Real-time subscription response
 */
export interface SubscriptionResponse<T> {
  type: 'data' | 'error' | 'complete' | 'heartbeat';
  payload?: T;
  error?: ApiError;
  subscriptionId: string;
  timestamp: string;
}

// ================================
// Response Transformation Types
// ================================

/**
 * Raw API response before processing
 */
export interface RawApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string | ArrayBuffer | Blob;
  url: string;
  redirected: boolean;
}

/**
 * Response transformation result
 */
export interface TransformationResult<TInput, TOutput> {
  original: TInput;
  transformed: TOutput;
  transformations: string[];
  warnings: string[];
}

// ================================
// Response Builder Types
// ================================

/**
 * Helper for building typed responses
 */
export class ApiResponseBuilder<T> {
  private response: Partial<ApiResponse<T>> = {};

  static success<T>(data: T): ApiResponseBuilder<T> {
    return new ApiResponseBuilder<T>().setSuccess(data);
  }

  static error<T>(error: ApiError): ApiResponseBuilder<T> {
    return new ApiResponseBuilder<T>().setError(error);
  }

  setSuccess(data: T): this {
    this.response = {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
    return this;
  }

  setError(error: ApiError): this {
    this.response = {
      success: false,
      error,
      timestamp: new Date().toISOString()
    };
    return this;
  }

  setRequestId(requestId: string): this {
    this.response.requestId = requestId;
    return this;
  }

  build(): ApiResponse<T> {
    if (!this.response.timestamp) {
      this.response.timestamp = new Date().toISOString();
    }
    return this.response as ApiResponse<T>;
  }
}

// ================================
// Utility Types
// ================================

/**
 * Extract data type from response type
 */
export type ExtractResponseData<T> = T extends ApiResponse<infer U> ? U : never;

/**
 * Make response fields optional for partial updates
 */
export type PartialResponse<T> = Partial<T> & Pick<T, 'success' | 'timestamp'>;

/**
 * Response type for paginated data
 */
export interface PaginatedResponse<T> extends BaseApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Search response with metadata
 */
export interface SearchResponse<T> extends PaginatedResponse<T> {
  query: {
    searchTerm: string;
    filters: Record<string, any>;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
  facets?: Record<string, Array<{ value: string; count: number }>>;
}