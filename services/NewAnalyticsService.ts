/**
 * New Analytics Service
 * Story 001.3: Schema Cleanup and Rollout Management - Task 2
 * Uses new analytics Edge Function endpoints with feature flag support
 */

import { DeploymentFeatureFlags } from './DeploymentFeatureFlags';
import { ErrorLogger } from './ErrorLogger';
import { AnalyticsService } from './AnalyticsService';

export interface AnalyticsQueryParams {
  startDate: string;
  endDate: string;
  refereeIds?: string[];
  tournamentCode?: string;
  federation?: string;
}

export interface AnalyticsQueryResponse {
  referee_id: string;
  total_assignments: number;
  first_referee_count: number;
  second_referee_count: number;
  challenge_referee_count: number;
  tournaments_worked: string[];
  performance_score?: number;
  date_range: {
    start: string;
    end: string;
  };
}

export interface AnalyticsExportOptions {
  format: 'json' | 'csv';
  includeHeaders?: boolean;
  dateFormat?: 'iso' | 'readable';
}

export interface AnalyticsHealthStatus {
  status: 'healthy' | 'degraded' | 'failed';
  response_time_ms: number;
  endpoints: {
    query: 'healthy' | 'failed';
    export: 'healthy' | 'failed';
    monitoring: 'healthy' | 'failed';
  };
  cache_status: 'active' | 'disabled' | 'failed';
}

export class NewAnalyticsService {
  private static instance: NewAnalyticsService | null = null;
  private featureFlags: DeploymentFeatureFlags;
  private errorLogger: ErrorLogger;
  private legacyService: AnalyticsService;
  private readonly baseUrl: string;

  private constructor() {
    this.featureFlags = DeploymentFeatureFlags.getInstance();
    this.errorLogger = ErrorLogger.getInstance();
    this.legacyService = AnalyticsService.getInstance();
    
    // Use EXPO_PUBLIC prefix for client-side access in React Native
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('EXPO_PUBLIC_SUPABASE_URL environment variable is required');
    }
    this.baseUrl = `${supabaseUrl}/functions/v1`;
  }

  /**
   * Get the singleton instance of NewAnalyticsService
   */
  public static getInstance(): NewAnalyticsService {
    if (!NewAnalyticsService.instance) {
      NewAnalyticsService.instance = new NewAnalyticsService();
    }
    return NewAnalyticsService.instance;
  }

  /**
   * Query analytics data using new or legacy endpoint based on feature flag
   */
  async queryAnalytics(params: AnalyticsQueryParams): Promise<AnalyticsQueryResponse[]> {
    const startTime = performance.now();

    try {
      // Check feature flag to determine which service to use
      if (!this.featureFlags.isNewAnalyticsEndpointsEnabled()) {
        return await this.queryLegacyAnalytics(params);
      }

      return await this.queryNewAnalytics(params);
    } catch (error) {
      const endTime = performance.now();
      await this.errorLogger.logError({
        entity_type: 'new_analytics_service',
        error: error as Error,
        context: { 
          operation: 'query_analytics',
          params,
          response_time_ms: endTime - startTime,
          using_new_endpoints: this.featureFlags.isNewAnalyticsEndpointsEnabled()
        }
      });
      throw error;
    }
  }

  /**
   * Query analytics using new Edge Function endpoints
   */
  private async queryNewAnalytics(params: AnalyticsQueryParams): Promise<AnalyticsQueryResponse[]> {
    const queryUrl = new URL(`${this.baseUrl}/analytics-query`);
    
    // Add query parameters
    queryUrl.searchParams.append('startDate', params.startDate);
    queryUrl.searchParams.append('endDate', params.endDate);
    
    if (params.refereeIds && params.refereeIds.length > 0) {
      const list = params.refereeIds.map(String);
      // Send both for compatibility; server supports either
      if (list.length === 1) {
        queryUrl.searchParams.append('refereeId', list[0]);
      }
      queryUrl.searchParams.append('refereeIds', list.join(','));
    }
    
    if (params.tournamentCode) {
      queryUrl.searchParams.append('tournamentCode', params.tournamentCode);
    }
    
    if (params.federation) {
      queryUrl.searchParams.append('federationCode', params.federation);
    }

    // Use anonymous key for client-side requests in React Native
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) {
      throw new Error('EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable is required');
    }

    try {
      const fullUrl = queryUrl.toString();
      // Build a raw-like HTTP request log without exposing full URL or token
      const host = queryUrl.host;
      const pathWithQuery = queryUrl.pathname + (queryUrl.search || '');
      const maskedToken = (anonKey.length > 12)
        ? `${anonKey.slice(0, 6)}…${anonKey.slice(-4)}`
        : '***';
      const requestHeaders = {
        Authorization: `Bearer ${maskedToken}`,
        'Content-Type': 'application/json',
        'x-client-info': 'vistest-mobile/1.0',
      } as const;
      console.log('📝 analytics-request', {
        method: 'GET',
        host,
        path: pathWithQuery,
        headers: requestHeaders,
        params: {
          startDate: queryUrl.searchParams.get('startDate'),
          endDate: queryUrl.searchParams.get('endDate'),
          refereeIds: queryUrl.searchParams.get('refereeIds'),
          tournamentCode: queryUrl.searchParams.get('tournamentCode'),
          federationCode: queryUrl.searchParams.get('federationCode'),
        },
        // Raw HTTP preview
        raw:
`GET ${pathWithQuery} HTTP/1.1\n`+
`Host: ${host}\n`+
`Authorization: Bearer ${maskedToken}\n`+
`Content-Type: application/json\n`+
`x-client-info: vistest-mobile/1.0\n`,
      });

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
          'x-client-info': 'vistest-mobile/1.0'
        },
        // Add timeout for better error handling
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`Analytics query failed: ${response.status} ${response.statusText}`);
      }

      const raw = await response.text();
      // Log raw (truncate to avoid huge logs)
      console.log('📥 analytics-query raw', raw.slice(0, 2000));

      let parsed: any;
      try {
        parsed = raw ? JSON.parse(raw) : {};
      } catch (e) {
        console.warn('⚠️ analytics-query JSON parse error', (e as any)?.message);
        return [];
      }

      const results: AnalyticsQueryResponse[] = parsed?.data ?? parsed?.results ?? [];
      console.log('📊 analytics-query parsed', {
        count: Array.isArray(results) ? results.length : 'n/a',
        meta: parsed?.meta || null,
      });

      return Array.isArray(results) ? results : [];
    } catch (error) {
      // Handle timeout and network errors gracefully
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new Error('Analytics query timed out. Please try again.');
      }
      if (error.message.includes('fetch')) {
        throw new Error('Network error occurred while querying analytics. Please check your connection.');
      }
      throw error;
    }
  }

  /**
   * Query analytics using legacy service (fallback)
   */
  private async queryLegacyAnalytics(params: AnalyticsQueryParams): Promise<AnalyticsQueryResponse[]> {
    console.log('🧮 legacy analytics params', params);
    const legacyResults = await this.legacyService.aggregateRefereeAnalytics(
      params.startDate,
      params.endDate,
      params.refereeIds
    );
    console.log('🧮 legacy analytics result count', legacyResults?.length || 0);

    // Transform legacy results to new interface format
    return legacyResults.map(result => ({
      referee_id: result.referee_id,
      total_assignments: result.total_assignments,
      first_referee_count: result.first_referee_count,
      second_referee_count: result.second_referee_count,
      challenge_referee_count: result.challenge_referee_count,
      tournaments_worked: result.tournaments_worked,
      performance_score: result.performance_score,
      date_range: {
        start: params.startDate,
        end: params.endDate
      }
    }));
  }

  /**
   * Export analytics data in various formats
   */
  async exportAnalytics(
    params: AnalyticsQueryParams, 
    options: AnalyticsExportOptions = { format: 'json' }
  ): Promise<string | object[]> {
    const startTime = performance.now();

    try {
      // Check feature flag to determine which service to use
      if (!this.featureFlags.isNewAnalyticsEndpointsEnabled()) {
        return await this.exportLegacyAnalytics(params, options);
      }

      return await this.exportNewAnalytics(params, options);
    } catch (error) {
      const endTime = performance.now();
      await this.errorLogger.logError({
        entity_type: 'new_analytics_service',
        error: error as Error,
        context: { 
          operation: 'export_analytics',
          params,
          options,
          response_time_ms: endTime - startTime,
          using_new_endpoints: this.featureFlags.isNewAnalyticsEndpointsEnabled()
        }
      });
      throw error;
    }
  }

  /**
   * Export analytics using new Edge Function endpoint
   */
  private async exportNewAnalytics(
    params: AnalyticsQueryParams, 
    options: AnalyticsExportOptions
  ): Promise<string | object[]> {
    const exportUrl = new URL(`${this.baseUrl}/analytics-export`);
    
    // Add query parameters
    exportUrl.searchParams.append('startDate', params.startDate);
    exportUrl.searchParams.append('endDate', params.endDate);
    exportUrl.searchParams.append('format', options.format);
    
    if (params.refereeIds && params.refereeIds.length > 0) {
      exportUrl.searchParams.append('refereeIds', params.refereeIds.join(','));
    }
    
    if (params.tournamentCode) {
      exportUrl.searchParams.append('tournamentCode', params.tournamentCode);
    }
    
    if (params.federation) {
      exportUrl.searchParams.append('federation', params.federation);
    }

    if (options.includeHeaders !== undefined) {
      exportUrl.searchParams.append('includeHeaders', options.includeHeaders.toString());
    }

    if (options.dateFormat) {
      exportUrl.searchParams.append('dateFormat', options.dateFormat);
    }

    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) {
      throw new Error('EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable is required');
    }

    const response = await fetch(exportUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'x-client-info': 'vistest-mobile/1.0'
      },
      signal: AbortSignal.timeout(60000) // 60 second timeout for exports
    });

    if (!response.ok) {
      throw new Error(`Analytics export failed: ${response.status} ${response.statusText}`);
    }

    if (options.format === 'csv') {
      return await response.text();
    } else {
      return await response.json();
    }
  }

  /**
   * Export analytics using legacy service (fallback)
   */
  private async exportLegacyAnalytics(
    params: AnalyticsQueryParams, 
    options: AnalyticsExportOptions
  ): Promise<string | object[]> {
    const data = await this.queryLegacyAnalytics(params);
    
    if (options.format === 'csv') {
      return this.convertToCSV(data, options.includeHeaders !== false);
    } else {
      return data;
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: AnalyticsQueryResponse[], includeHeaders: boolean = true): string {
    if (data.length === 0) {
      return includeHeaders ? 'referee_id,total_assignments,first_referee_count,second_referee_count,challenge_referee_count,tournaments_worked,performance_score\n' : '';
    }

    const headers = ['referee_id', 'total_assignments', 'first_referee_count', 'second_referee_count', 'challenge_referee_count', 'tournaments_worked', 'performance_score'];
    
    // More efficient CSV generation with proper escaping
    const escapeCSVValue = (value: any): string => {
      if (value == null) return '';
      const stringValue = String(value);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };
    
    const csvRows = data.map(row => [
      escapeCSVValue(row.referee_id),
      escapeCSVValue(row.total_assignments),
      escapeCSVValue(row.first_referee_count),
      escapeCSVValue(row.second_referee_count),
      escapeCSVValue(row.challenge_referee_count),
      escapeCSVValue(row.tournaments_worked.join(';')),
      escapeCSVValue(row.performance_score || '')
    ]);

    const lines = includeHeaders ? [headers, ...csvRows] : csvRows;
    return lines.map(row => row.join(',')).join('\n');
  }

  /**
   * Get analytics system health status
   */
  async getHealthStatus(): Promise<AnalyticsHealthStatus> {
    const startTime = performance.now();
    
    try {
      // Check feature flag to determine which service to use
      if (!this.featureFlags.isNewAnalyticsEndpointsEnabled()) {
        return await this.getLegacyHealthStatus();
      }

      return await this.getNewHealthStatus();
    } catch (error) {
      const endTime = performance.now();
      await this.errorLogger.logError({
        entity_type: 'new_analytics_service',
        error: error as Error,
        context: { 
          operation: 'get_health_status',
          response_time_ms: endTime - startTime,
          using_new_endpoints: this.featureFlags.isNewAnalyticsEndpointsEnabled()
        }
      });

      return {
        status: 'failed',
        response_time_ms: endTime - startTime,
        endpoints: {
          query: 'failed',
          export: 'failed',
          monitoring: 'failed'
        },
        cache_status: 'failed'
      };
    }
  }

  /**
   * Get health status from new endpoints
   */
  private async getNewHealthStatus(): Promise<AnalyticsHealthStatus> {
    const startTime = performance.now();
    
    try {
      const healthUrl = `${this.baseUrl}/analytics-health`;
      
      const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      if (!anonKey) {
        throw new Error('EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable is required');
      }

      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
          'x-client-info': 'vistest-mobile/1.0'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout for health checks
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const healthData = await response.json();
      const endTime = performance.now();

      return {
        status: healthData.status || 'healthy',
        response_time_ms: endTime - startTime,
        endpoints: healthData.endpoints || {
          query: 'healthy',
          export: 'healthy',
          monitoring: 'healthy'
        },
        cache_status: this.featureFlags.isAnalyticsCacheEnabled() ? 'active' : 'disabled'
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        status: 'failed',
        response_time_ms: endTime - startTime,
        endpoints: {
          query: 'failed',
          export: 'failed',
          monitoring: 'failed'
        },
        cache_status: 'failed'
      };
    }
  }

  /**
   * Get health status from legacy service
   */
  private async getLegacyHealthStatus(): Promise<AnalyticsHealthStatus> {
    const startTime = performance.now();
    
    try {
      // Test legacy service with a simple query
      await this.legacyService.aggregateRefereeAnalytics(
        new Date().toISOString().split('T')[0] + ' 00:00:00',
        new Date().toISOString().split('T')[0] + ' 23:59:59',
        ['1'] // Test with single referee ID
      );
      
      const endTime = performance.now();

      return {
        status: 'healthy',
        response_time_ms: endTime - startTime,
        endpoints: {
          query: 'healthy',
          export: 'healthy',
          monitoring: 'healthy'
        },
        cache_status: 'active' // Legacy service has built-in caching
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        status: 'failed',
        response_time_ms: endTime - startTime,
        endpoints: {
          query: 'failed',
          export: 'failed',
          monitoring: 'failed'
        },
        cache_status: 'failed'
      };
    }
  }

  /**
   * Get monitoring dashboard data
   */
  async getMonitoringData(): Promise<any> {
    try {
      // Check feature flag to determine which service to use
      if (!this.featureFlags.isNewAnalyticsEndpointsEnabled()) {
        return await this.getLegacyMonitoringData();
      }

      return await this.getNewMonitoringData();
    } catch (error) {
      await this.errorLogger.logError({
        entity_type: 'new_analytics_service',
        error: error as Error,
        context: { 
          operation: 'get_monitoring_data',
          using_new_endpoints: this.featureFlags.isNewAnalyticsEndpointsEnabled()
        }
      });
      throw error;
    }
  }

  /**
   * Get monitoring data from new endpoint
   */
  private async getNewMonitoringData(): Promise<any> {
    const monitoringUrl = `${this.baseUrl}/analytics-monitoring`;
    
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) {
      throw new Error('EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable is required');
    }

    const response = await fetch(monitoringUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'x-client-info': 'vistest-mobile/1.0'
      },
      signal: AbortSignal.timeout(15000) // 15 second timeout for monitoring
    });

    if (!response.ok) {
      throw new Error(`Monitoring data request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get monitoring data from legacy service (limited)
   */
  private async getLegacyMonitoringData(): Promise<any> {
    // Legacy service doesn't have comprehensive monitoring
    // Return basic status information
    const config = this.legacyService.getConfig();
    
    return {
      service_type: 'legacy',
      configuration: config,
      status: 'active',
      performance_monitoring: config.enablePerformanceMonitoring,
      last_check: new Date().toISOString()
    };
  }

  /**
   * Emergency rollback - switch to legacy service immediately
   */
  async emergencyRollback(): Promise<void> {
    await this.featureFlags.emergencyRollback();
    
    // Log rollback event
    await this.errorLogger.logError({
      entity_type: 'analytics_service_rollback',
      error: new Error('Analytics service emergency rollback executed'),
      context: { 
        operation: 'emergency_rollback',
        timestamp: new Date().toISOString(),
        service: 'NewAnalyticsService'
      }
    });
  }

  /**
   * Get current service configuration and status
   */
  getServiceStatus(): {
    using_new_endpoints: boolean;
    feature_flags: any;
    service_health: 'unknown' | 'checking';
    last_health_check?: string;
  } {
    return {
      using_new_endpoints: this.featureFlags.isNewAnalyticsEndpointsEnabled(),
      feature_flags: this.featureFlags.getAllFlags(),
      service_health: 'unknown', // Would be updated by periodic health checks
      last_health_check: undefined // Would be updated by periodic health checks
    };
  }
}
