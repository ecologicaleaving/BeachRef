/**
 * @fileoverview TanStack Query TypeScript Extensions
 * Type extensions and utilities for TanStack Query integration
 * Integrates with existing domain models from tournament-v2.ts and match-v2.ts
 */

import { UseQueryResult, UseMutationResult, QueryKey } from '@tanstack/react-query';
import { TournamentCore } from './tournament-v2';
import { BeachMatchCore } from './match-v2';

/**
 * Base API response wrapper for consistency
 */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
}

/**
 * Paginated API response for large datasets
 */
export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Tournament query parameters matching existing API patterns
 */
export interface TournamentQueryParams {
  season?: number;
  gender?: 'M' | 'W';
  type?: string;
  country?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

/**
 * Match query parameters for tournament-specific queries
 */
export interface MatchQueryParams {
  tournamentId?: string;
  tournamentCode?: string;
  eventId?: number;
  status?: string;
  courtNumber?: string;
  refereeId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

/**
 * Referee query parameters for assignment queries
 */
export interface RefereeQueryParams {
  tournamentCode?: string;
  assignmentStatus?: string;
  federationCode?: string;
  limit?: number;
  offset?: number;
}

/**
 * Query result helpers with proper error types
 */
export type TournamentQueryResult = UseQueryResult<TournamentCore[], Error>;
export type MatchQueryResult = UseQueryResult<BeachMatchCore[], Error>;
export type SingleTournamentQueryResult = UseQueryResult<TournamentCore, Error>;
export type SingleMatchQueryResult = UseQueryResult<BeachMatchCore, Error>;

/**
 * Mutation result helpers for data updates
 */
export type TournamentMutationResult<TData = unknown, TVariables = unknown> = 
  UseMutationResult<TData, Error, TVariables>;

/**
 * Query key factory for consistent cache management
 * Aligned with existing cache service patterns
 */
export const queryKeyFactory = {
  // Tournament queries
  tournaments: {
    all: ['tournaments'] as const,
    lists: () => ['tournaments', 'list'] as const,
    list: (params: TournamentQueryParams) => ['tournaments', 'list', params] as const,
    details: () => ['tournaments', 'detail'] as const,
    detail: (id: string) => ['tournaments', 'detail', id] as const,
  },
  
  // Match queries
  matches: {
    all: ['matches'] as const,
    lists: () => ['matches', 'list'] as const,
    list: (params: MatchQueryParams) => ['matches', 'list', params] as const,
    details: () => ['matches', 'detail'] as const,
    detail: (id: string) => ['matches', 'detail', id] as const,
    byTournament: (tournamentId: string) => ['matches', 'tournament', tournamentId] as const,
  },
  
  // Referee queries
  referees: {
    all: ['referees'] as const,
    lists: () => ['referees', 'list'] as const,
    list: (params: RefereeQueryParams) => ['referees', 'list', params] as const,
    assignments: () => ['referees', 'assignments'] as const,
    assignment: (params: RefereeQueryParams) => ['referees', 'assignments', params] as const,
  },
} as const;

/**
 * Cache strategy configuration for different data types
 * Aligned with current cache expiration patterns
 */
export const cacheStrategies = {
  // Live data (today/yesterday, active tournaments)
  live: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // 30 seconds
    refetchIntervalInBackground: false,
  },
  
  // Historical data (completed tournaments/matches)
  historical: {
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchInterval: false,
    refetchIntervalInBackground: false,
  },
  
  // Static reference data (referee info, tournament metadata)
  static: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchInterval: false,
    refetchIntervalInBackground: false,
  },
} as const;

/**
 * Query options factory for consistent configuration
 */
export const createQueryOptions = {
  /**
   * Creates query options for live/active data
   */
  live: <T>(queryKey: QueryKey, queryFn: () => Promise<T>) => ({
    queryKey,
    queryFn,
    ...cacheStrategies.live,
  }),
  
  /**
   * Creates query options for historical/completed data
   */
  historical: <T>(queryKey: QueryKey, queryFn: () => Promise<T>) => ({
    queryKey,
    queryFn,
    ...cacheStrategies.historical,
  }),
  
  /**
   * Creates query options for static reference data
   */
  static: <T>(queryKey: QueryKey, queryFn: () => Promise<T>) => ({
    queryKey,
    queryFn,
    ...cacheStrategies.static,
  }),
};

/**
 * Error types for TanStack Query operations
 */
export interface QueryError extends Error {
  status?: number;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Network error specific to VIS API calls
 */
export interface VisApiError extends QueryError {
  endpoint?: string;
  requestId?: string;
  retryable?: boolean;
}

/**
 * Utility type for query states
 */
export type QueryState = 'loading' | 'error' | 'success' | 'idle';

/**
 * Hook return type helper for consistent hook interfaces
 */
export interface QueryHookReturn<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
  isFetching: boolean;
  isStale: boolean;
}

/**
 * Offline sync status for persistence integration
 */
export interface OfflineSyncStatus {
  isOnline: boolean;
  lastSyncTime?: string;
  pendingMutations: number;
  failedQueries: string[];
}

/**
 * Query client configuration extensions
 */
export interface QueryClientConfig {
  defaultStaleTime: number;
  defaultGcTime: number;
  maxRetries: number;
  retryDelay: number;
  persisterThrottleTime: number;
  offlineRetryCount: number;
}