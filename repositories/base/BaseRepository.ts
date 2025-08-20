/**
 * @fileoverview Base Repository Interface
 * Common patterns and interfaces for repository layer
 * Part of EPIC-007 Data Architecture Restructuration - Story 7.2
 */

import { SmartCacheManager } from '../../services/cache/SmartCacheManager';
import { VisApiClient } from '../../services/api/VisApiClient';
import { NetworkMonitor } from '../../services/NetworkMonitor';
import { ErrorLogger } from '../../services/ErrorLogger';

/**
 * Base repository configuration interface
 */
export interface BaseRepositoryConfig {
  /** Cache manager for data caching */
  readonly cacheManager: SmartCacheManager;
  /** API client for data fetching */
  readonly apiClient: VisApiClient;
  /** Network monitoring service */
  readonly networkMonitor: NetworkMonitor;
  /** Error logging service */
  readonly errorLogger: ErrorLogger;
  /** Enable performance monitoring */
  readonly enablePerformanceMonitoring?: boolean;
}

/**
 * Repository error types
 */
export enum RepositoryErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  TRANSFORMATION_ERROR = 'TRANSFORMATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  TIMEOUT = 'TIMEOUT'
}

/**
 * Repository error with context
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly type: RepositoryErrorType,
    public readonly context: Record<string, any> = {},
    public readonly originalError?: Error
  ) {
    super(`Repository Error (${type}): ${message}`);
    this.name = 'RepositoryError';
  }
}

/**
 * Performance metrics for repository operations
 */
export interface RepositoryPerformanceMetrics {
  /** Operation start time */
  readonly startTime: number;
  /** Operation end time */
  readonly endTime: number;
  /** Total duration in milliseconds */
  readonly durationMs: number;
  /** Whether data was served from cache */
  readonly cacheHit: boolean;
  /** Cache tier used (1 = memory, 2 = persistent) */
  readonly cacheTier?: number;
  /** API calls made during operation */
  readonly apiCalls: number;
  /** Data transformation time */
  readonly transformationMs?: number;
}

/**
 * Repository operation result with performance metrics
 */
export interface RepositoryResult<T> {
  /** The result data */
  readonly data: T;
  /** Performance metrics for the operation */
  readonly metrics: RepositoryPerformanceMetrics;
  /** Source of the data */
  readonly source: 'cache' | 'api' | 'transformation';
}

/**
 * Base repository abstract class
 * Provides common functionality for all repositories
 */
export abstract class BaseRepository {
  protected readonly config: BaseRepositoryConfig;
  protected readonly performanceMonitoring: boolean;

  constructor(config: BaseRepositoryConfig) {
    this.config = config;
    this.performanceMonitoring = config.enablePerformanceMonitoring ?? true;
  }

  /**
   * Start performance monitoring for an operation
   */
  protected startPerformanceMonitoring(): { startTime: number } {
    return { startTime: Date.now() };
  }

  /**
   * Complete performance monitoring and create metrics
   */
  protected completePerformanceMonitoring(
    monitor: { startTime: number },
    cacheHit: boolean,
    cacheTier?: number,
    apiCalls: number = 0,
    transformationMs?: number
  ): RepositoryPerformanceMetrics {
    const endTime = Date.now();
    return {
      startTime: monitor.startTime,
      endTime,
      durationMs: endTime - monitor.startTime,
      cacheHit,
      cacheTier,
      apiCalls,
      transformationMs
    };
  }

  /**
   * Handle repository errors with logging and context
   */
  protected handleError(
    error: any,
    operation: string,
    context: Record<string, any> = {}
  ): RepositoryError {
    const repositoryError = error instanceof RepositoryError 
      ? error 
      : new RepositoryError(
          `Failed ${operation}`,
          this.determineErrorType(error),
          context,
          error
        );

    this.config.errorLogger?.logError?.(repositoryError, {
      operation,
      repository: this.constructor.name,
      ...context
    });

    return repositoryError;
  }

  /**
   * Determine error type from error instance
   */
  private determineErrorType(error: any): RepositoryErrorType {
    if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('network')) {
      return RepositoryErrorType.NETWORK_ERROR;
    }
    if (error?.code === 'TIMEOUT' || error?.message?.includes('timeout')) {
      return RepositoryErrorType.TIMEOUT;
    }
    if (error?.message?.includes('cache')) {
      return RepositoryErrorType.CACHE_ERROR;
    }
    if (error?.message?.includes('transform')) {
      return RepositoryErrorType.TRANSFORMATION_ERROR;
    }
    if (error?.message?.includes('validation')) {
      return RepositoryErrorType.VALIDATION_ERROR;
    }
    return RepositoryErrorType.NETWORK_ERROR;
  }

  /**
   * Check network connectivity
   */
  protected async isOnline(): Promise<boolean> {
    return this.config.networkMonitor?.isConnected?.() ?? true;
  }

  /**
   * Log performance metrics if monitoring is enabled
   */
  protected logPerformanceMetrics(
    operation: string,
    metrics: RepositoryPerformanceMetrics
  ): void {
    if (!this.performanceMonitoring) return;

    console.log(`Repository Performance [${operation}]:`, {
      duration: `${metrics.durationMs}ms`,
      cacheHit: metrics.cacheHit,
      cacheTier: metrics.cacheTier,
      apiCalls: metrics.apiCalls,
      transformationTime: metrics.transformationMs ? `${metrics.transformationMs}ms` : 'N/A'
    });
  }
}