/**
 * Optimized API Client
 * Part of API Client Response Types Optimization Refactoring
 * Provides type-safe, validated API calls with performance monitoring
 */

import {
  ApiResponse,
  TournamentListResponse,
  MatchListResponse,
  RefereeListResponse,
  InstrumentedApiResponse,
  ResponsePerformanceMetrics,
  BatchApiResponse,
  BatchResponseItem,
  CachedApiResponse,
  CachedResponseMetadata
} from '../../types/api-responses';
import { ResponseValidator } from './ResponseValidator';
import { ErrorReportingService } from '../error/ErrorReportingService';

/**
 * Configuration for API client
 */
export interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enablePerformanceMonitoring: boolean;
  enableCaching: boolean;
  defaultHeaders: Record<string, string>;
}

/**
 * Request options for API calls
 */
export interface ApiRequestOptions {
  timeout?: number;
  retryAttempts?: number;
  skipCache?: boolean;
  skipValidation?: boolean;
  context?: Record<string, any>;
  performanceTracking?: boolean;
}

/**
 * Optimized API client with type safety and performance monitoring
 */
export class OptimizedApiClient {
  private config: ApiClientConfig;
  private errorReporting: ErrorReportingService;
  private performanceCache = new Map<string, ResponsePerformanceMetrics[]>();
  private responseCache = new Map<string, CachedApiResponse<any>>();

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = {
      baseUrl: '',
      timeout: 10000,
      retryAttempts: 3,
      retryDelay: 1000,
      enablePerformanceMonitoring: true,
      enableCaching: true,
      defaultHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      ...config
    };

    this.errorReporting = ErrorReportingService.getInstance();
  }

  /**
   * Make a typed API request with validation and performance monitoring
   */
  async request<T>(
    url: string,
    options: RequestInit & ApiRequestOptions = {}
  ): Promise<InstrumentedApiResponse<T>> {
    const startTime = performance.now();
    const memoryBefore = this.getMemoryUsage();

    try {
      // Check cache first
      if (!options.skipCache && this.config.enableCaching) {
        const cached = this.getCachedResponse<T>(url);
        if (cached) {
          return this.addPerformanceMetrics(cached, {
            requestDuration: 0,
            responseSizeBytes: cached.cache.size,
            memoryUsage: { before: memoryBefore, after: memoryBefore, peak: memoryBefore }
          });
        }
      }

      // Prepare request
      const requestUrl = url.startsWith('http') ? url : `${this.config.baseUrl}${url}`;
      const requestOptions: RequestInit = {
        ...options,
        headers: {
          ...this.config.defaultHeaders,
          ...options.headers
        },
        signal: this.createTimeoutSignal(options.timeout || this.config.timeout)
      };

      // Make request with retries
      const response = await this.requestWithRetry(requestUrl, requestOptions, options);
      const responseText = await response.text();
      const responseSizeBytes = new Blob([responseText]).size;

      // Parse response
      const parseStartTime = performance.now();
      let parsedData: unknown;
      try {
        parsedData = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        // Handle non-JSON responses
        parsedData = responseText;
      }
      const parseDuration = performance.now() - parseStartTime;

      // Validate response structure
      const validationStartTime = performance.now();
      const apiResponse = ResponseValidator.transformRawResponse<T>(
        response,
        parsedData,
        options.skipValidation ? undefined : undefined // Will add specific validators later
      );
      const validationDuration = performance.now() - validationStartTime;

      // Cache successful responses
      if (apiResponse.success && this.config.enableCaching && !options.skipCache) {
        await this.cacheResponse(url, apiResponse, responseSizeBytes);
      }

      // Calculate performance metrics
      const endTime = performance.now();
      const memoryAfter = this.getMemoryUsage();

      const performanceMetrics: ResponsePerformanceMetrics = {
        requestDuration: endTime - startTime,
        responseSizeBytes,
        parseDuration,
        validationDuration,
        memoryUsage: {
          before: memoryBefore,
          after: memoryAfter,
          peak: Math.max(memoryBefore, memoryAfter)
        }
      };

      // Store performance data
      if (this.config.enablePerformanceMonitoring) {
        this.recordPerformanceMetrics(url, performanceMetrics);
      }

      return {
        ...apiResponse,
        performance: performanceMetrics
      };

    } catch (error) {
      // Report error
      await this.errorReporting.reportError(error as Error, {
        url,
        options: options.context,
        apiClient: 'OptimizedApiClient'
      });

      const errorResponse = ResponseValidator.handleApiError(error, { url, options });
      const performanceMetrics: ResponsePerformanceMetrics = {
        requestDuration: performance.now() - startTime,
        responseSizeBytes: 0,
        memoryUsage: {
          before: memoryBefore,
          after: this.getMemoryUsage(),
          peak: memoryBefore
        }
      };

      return {
        ...errorResponse,
        performance: performanceMetrics
      } as InstrumentedApiResponse<T>;
    }
  }

  /**
   * Get tournaments with validation
   */
  async getTournaments(options?: ApiRequestOptions): Promise<InstrumentedApiResponse<TournamentListResponse>> {
    const response = await this.request<TournamentListResponse>('/tournaments', {
      method: 'GET',
      ...options
    });

    // Add custom validation if response is successful
    if (response.success && response.data) {
      const validation = ResponseValidator.validateTournamentList(response.data.tournaments);
      if (!validation.isValid) {
        const errorResponse = ResponseValidator.handleApiError(
          new Error('Tournament validation failed'),
          { validationErrors: validation.errors }
        );
        return {
          ...errorResponse,
          performance: response.performance
        } as InstrumentedApiResponse<TournamentListResponse>;
      }
    }

    return response;
  }

  /**
   * Get matches with validation
   */
  async getMatches(
    tournamentId: string | number,
    options?: ApiRequestOptions
  ): Promise<InstrumentedApiResponse<MatchListResponse>> {
    const response = await this.request<MatchListResponse>(`/tournaments/${tournamentId}/matches`, {
      method: 'GET',
      ...options
    });

    // Add custom validation if response is successful
    if (response.success && response.data) {
      const validation = ResponseValidator.validateMatchList(response.data.matches);
      if (!validation.isValid) {
        const errorResponse = ResponseValidator.handleApiError(
          new Error('Match validation failed'),
          { validationErrors: validation.errors }
        );
        return {
          ...errorResponse,
          performance: response.performance
        } as InstrumentedApiResponse<MatchListResponse>;
      }
    }

    return response;
  }

  /**
   * Get referees with validation
   */
  async getReferees(options?: ApiRequestOptions): Promise<InstrumentedApiResponse<RefereeListResponse>> {
    const response = await this.request<RefereeListResponse>('/referees', {
      method: 'GET',
      ...options
    });

    // Add custom validation if response is successful
    if (response.success && response.data) {
      const validation = ResponseValidator.validateRefereeList(response.data.referees);
      if (!validation.isValid) {
        const errorResponse = ResponseValidator.handleApiError(
          new Error('Referee validation failed'),
          { validationErrors: validation.errors }
        );
        return {
          ...errorResponse,
          performance: response.performance
        } as InstrumentedApiResponse<RefereeListResponse>;
      }
    }

    return response;
  }

  /**
   * Batch API requests with performance monitoring
   */
  async batchRequest<T>(
    requests: { url: string; options?: RequestInit & ApiRequestOptions }[],
    options?: { concurrency?: number; continueOnError?: boolean }
  ): Promise<BatchApiResponse<T>> {
    const startTime = performance.now();
    const results: BatchResponseItem<T>[] = [];
    const concurrency = options?.concurrency || 5;
    const continueOnError = options?.continueOnError ?? true;

    // Process requests in batches
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);

      const batchPromises = batch.map(async (req, index) => {
        const itemStartTime = performance.now();
        const requestId = `batch_${i + index}_${Date.now()}`;

        try {
          const response = await this.request<T>(req.url, {
            ...req.options,
            context: { ...req.options?.context, requestId }
          });

          return {
            requestId,
            success: response.success,
            data: response.success ? response.data : undefined,
            error: response.success ? undefined : response.error,
            duration: performance.now() - itemStartTime
          };
        } catch (error) {
          const errorResponse = ResponseValidator.handleApiError(error, { requestId });
          return {
            requestId,
            success: false,
            error: errorResponse.error,
            duration: performance.now() - itemStartTime
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else if (continueOnError) {
          results.push({
            requestId: `error_${Date.now()}`,
            success: false,
            error: {
              code: 'BATCH_ERROR',
              message: 'Batch request failed',
              details: { reason: result.reason }
            },
            duration: 0
          });
        } else {
          throw result.reason;
        }
      });
    }

    const endTime = performance.now();
    const totalDuration = endTime - startTime;
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    return {
      success: failed === 0,
      results,
      summary: {
        total: results.length,
        successful,
        failed,
        totalDuration,
        averageDuration: totalDuration / results.length
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStatistics(): Record<string, {
    averageResponse: number;
    medianResponse: number;
    p95Response: number;
    totalRequests: number;
    averageSize: number;
  }> {
    const stats: Record<string, any> = {};

    for (const [url, metrics] of this.performanceCache.entries()) {
      const durations = metrics.map(m => m.requestDuration).sort((a, b) => a - b);
      const sizes = metrics.map(m => m.responseSizeBytes);

      stats[url] = {
        averageResponse: durations.reduce((a, b) => a + b, 0) / durations.length,
        medianResponse: durations[Math.floor(durations.length / 2)],
        p95Response: durations[Math.floor(durations.length * 0.95)],
        totalRequests: metrics.length,
        averageSize: sizes.reduce((a, b) => a + b, 0) / sizes.length
      };
    }

    return stats;
  }

  /**
   * Clear performance cache
   */
  clearPerformanceCache(): void {
    this.performanceCache.clear();
  }

  /**
   * Clear response cache
   */
  clearResponseCache(): void {
    this.responseCache.clear();
  }

  // Private helper methods

  private async requestWithRetry(
    url: string,
    options: RequestInit,
    apiOptions: ApiRequestOptions
  ): Promise<Response> {
    const maxAttempts = apiOptions.retryAttempts ?? this.config.retryAttempts;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(url, options);

        // Don't retry on client errors (4xx)
        if (!response.ok && response.status >= 400 && response.status < 500) {
          return response;
        }

        // Return successful responses and server errors on last attempt
        if (response.ok || attempt === maxAttempts) {
          return response;
        }

        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain error types
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          // Network error, can retry
        } else {
          throw error;
        }
      }

      // Wait before retry
      if (attempt < maxAttempts) {
        await new Promise(resolve =>
          setTimeout(resolve, this.config.retryDelay * attempt)
        );
      }
    }

    throw lastError!;
  }

  private createTimeoutSignal(timeout: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller.signal;
  }

  private getCachedResponse<T>(url: string): CachedApiResponse<T> | null {
    const cached = this.responseCache.get(url);
    if (!cached) return null;

    // Check if cache is expired
    const now = new Date();
    const expiresAt = new Date(cached.cache.expiresAt);
    if (now > expiresAt) {
      this.responseCache.delete(url);
      return null;
    }

    // Update hit count
    cached.cache.hitCount++;
    return cached as CachedApiResponse<T>;
  }

  private async cacheResponse<T>(
    url: string,
    response: ApiResponse<T>,
    size: number
  ): Promise<void> {
    const cacheMetadata: CachedResponseMetadata = {
      cachedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      cacheKey: url,
      size,
      hitCount: 0,
      source: 'api'
    };

    const cachedResponse: CachedApiResponse<T> = {
      ...response,
      cache: cacheMetadata
    };

    this.responseCache.set(url, cachedResponse);

    // Clean up old cache entries if cache gets too large
    if (this.responseCache.size > 100) {
      const oldestEntries = Array.from(this.responseCache.entries())
        .sort(([, a], [, b]) =>
          new Date(a.cache.cachedAt).getTime() - new Date(b.cache.cachedAt).getTime()
        )
        .slice(0, 20);

      oldestEntries.forEach(([key]) => this.responseCache.delete(key));
    }
  }

  private recordPerformanceMetrics(url: string, metrics: ResponsePerformanceMetrics): void {
    if (!this.performanceCache.has(url)) {
      this.performanceCache.set(url, []);
    }

    const urlMetrics = this.performanceCache.get(url)!;
    urlMetrics.push(metrics);

    // Keep only last 100 metrics per URL
    if (urlMetrics.length > 100) {
      urlMetrics.splice(0, urlMetrics.length - 100);
    }
  }

  private addPerformanceMetrics<T>(
    response: ApiResponse<T>,
    metrics: ResponsePerformanceMetrics
  ): InstrumentedApiResponse<T> {
    return {
      ...response,
      performance: metrics
    };
  }

  private getMemoryUsage(): number {
    // Simplified memory usage - in real implementation might use performance.measureUserAgentSpecificMemory
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize || 0;
    }
    return 0;
  }
}

/**
 * Factory function to create configured API client instances
 */
export function createApiClient(config?: Partial<ApiClientConfig>): OptimizedApiClient {
  return new OptimizedApiClient(config);
}

/**
 * Default API client instance for the application
 */
export const defaultApiClient = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
  enablePerformanceMonitoring: true,
  enableCaching: true
});