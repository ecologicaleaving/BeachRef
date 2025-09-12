/**
 * Analytics Middleware for VIS Adapter
 * Provides transparent analytics data collection without impacting response formats
 * Integrates with Supabase database for storing analytics events
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Analytics event types for VIS Adapter requests
export interface AnalyticsEvent {
  event_type: string;
  user_context?: Record<string, any>;
  event_data?: Record<string, any>;
  timestamp?: string;
}

// Analytics configuration
interface AnalyticsConfig {
  enablePerformanceMonitoring?: boolean;
  enableRequestLogging?: boolean;
  enableErrorTracking?: boolean;
  enableUserContextTracking?: boolean;
}

export class AnalyticsMiddleware {
  private supabase: any;
  private config: AnalyticsConfig;

  constructor(config: AnalyticsConfig = {}) {
    this.config = {
      enablePerformanceMonitoring: true,
      enableRequestLogging: true,
      enableErrorTracking: true,
      enableUserContextTracking: false, // Privacy compliance - disabled by default
      ...config
    };

    // Initialize Supabase client for analytics storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
  }

  /**
   * Log analytics event to database
   * Non-blocking operation - failures don't impact main functionality
   * Enhanced with input validation and sanitization
   */
  private async logEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Input validation and sanitization
      if (!event.event_type || typeof event.event_type !== 'string') {
        console.warn('Analytics event rejected: invalid event_type');
        return;
      }

      // Sanitize event type to prevent injection
      const sanitizedEventType = event.event_type.replace(/[^\w\-_]/g, '').substring(0, 50);
      
      // Validate and limit JSON payload sizes to prevent abuse
      const sanitizedUserContext = this.sanitizeJsonPayload(event.user_context);
      const sanitizedEventData = this.sanitizeJsonPayload(event.event_data);

      await this.supabase
        .from('analytics_events')
        .insert({
          event_type: sanitizedEventType,
          user_context: sanitizedUserContext,
          event_data: sanitizedEventData,
          timestamp: event.timestamp || new Date().toISOString()
        });
    } catch (error) {
      // Graceful degradation - analytics failure doesn't impact main functionality
      console.warn('Analytics event logging failed:', error.message);
    }
  }

  /**
   * Sanitize JSON payload to prevent oversized payloads and potential attacks
   */
  private sanitizeJsonPayload(payload: any): any {
    if (!payload) return null;
    
    try {
      const jsonString = JSON.stringify(payload);
      // Limit payload size to 10KB to prevent database bloat and potential DoS
      if (jsonString.length > 10240) {
        return { truncated: true, size: jsonString.length };
      }
      return payload;
    } catch (error) {
      return { error: 'Invalid JSON payload' };
    }
  }

  /**
   * Track tournament data requests
   */
  async trackTournamentRequest(
    request: Request,
    params: URLSearchParams,
    responseData?: any,
    performanceMetrics?: { duration: number; success: boolean }
  ): Promise<void> {
    if (!this.config.enableRequestLogging) return;

    const event: AnalyticsEvent = {
      event_type: 'tournament_data_request',
      event_data: {
        endpoint: '/vis/tournaments',
        method: request.method,
        parameters: {
          season: params.get('season'),
          gender: params.get('gender'),
          country: params.get('country')
        },
        response_summary: responseData ? {
          tournament_count: Array.isArray(responseData) ? responseData.length : 0,
          has_results: !!responseData
        } : null,
        performance: performanceMetrics,
        user_agent: request.headers.get('user-agent'),
        client_info: request.headers.get('x-client-info')
      }
    };

    if (this.config.enableUserContextTracking) {
      event.user_context = {
        ip_hash: await this.hashIP(this.getClientIP(request)),
        session_id: request.headers.get('x-session-id')
      };
    }

    await this.logEvent(event);
  }

  /**
   * Track match data requests
   */
  async trackMatchRequest(
    request: Request,
    params: URLSearchParams,
    responseData?: any,
    performanceMetrics?: { duration: number; success: boolean }
  ): Promise<void> {
    if (!this.config.enableRequestLogging) return;

    const event: AnalyticsEvent = {
      event_type: 'match_data_request',
      event_data: {
        endpoint: '/vis/matches',
        method: request.method,
        parameters: {
          tournamentCode: params.get('tournamentCode'),
          round: params.get('round'),
          eventNo: params.get('eventNo')
        },
        response_summary: responseData ? {
          match_count: Array.isArray(responseData) ? responseData.length : 0,
          has_referee_assignments: responseData && Array.isArray(responseData) ? 
            responseData.some((match: any) => match.refereeAssignments?.length > 0) : false
        } : null,
        performance: performanceMetrics,
        user_agent: request.headers.get('user-agent'),
        client_info: request.headers.get('x-client-info')
      }
    };

    if (this.config.enableUserContextTracking) {
      event.user_context = {
        ip_hash: await this.hashIP(this.getClientIP(request)),
        session_id: request.headers.get('x-session-id')
      };
    }

    await this.logEvent(event);
  }

  /**
   * Track referee data requests
   */
  async trackRefereeRequest(
    request: Request,
    params: URLSearchParams,
    responseData?: any,
    performanceMetrics?: { duration: number; success: boolean }
  ): Promise<void> {
    if (!this.config.enableRequestLogging) return;

    const event: AnalyticsEvent = {
      event_type: 'referee_data_request',
      event_data: {
        endpoint: '/vis/referees',
        method: request.method,
        parameters: {
          tournamentCode: params.get('tournamentCode'),
          country: params.get('country'),
          eventNo: params.get('eventNo')
        },
        response_summary: responseData ? {
          referee_count: Array.isArray(responseData) ? responseData.length : 0,
          has_assignments: responseData && Array.isArray(responseData) ? 
            responseData.some((ref: any) => ref.assignments?.length > 0) : false
        } : null,
        performance: performanceMetrics,
        user_agent: request.headers.get('user-agent'),
        client_info: request.headers.get('x-client-info')
      }
    };

    if (this.config.enableUserContextTracking) {
      event.user_context = {
        ip_hash: await this.hashIP(this.getClientIP(request)),
        session_id: request.headers.get('x-session-id')
      };
    }

    await this.logEvent(event);
  }

  /**
   * Track API errors for monitoring and improvement
   */
  async trackError(
    request: Request,
    error: Error,
    context: { endpoint: string; parameters?: Record<string, any> }
  ): Promise<void> {
    if (!this.config.enableErrorTracking) return;

    const event: AnalyticsEvent = {
      event_type: 'api_error',
      event_data: {
        endpoint: context.endpoint,
        error_message: error.message,
        error_type: error.constructor.name,
        parameters: context.parameters,
        user_agent: request.headers.get('user-agent'),
        client_info: request.headers.get('x-client-info')
      }
    };

    if (this.config.enableUserContextTracking) {
      event.user_context = {
        ip_hash: await this.hashIP(this.getClientIP(request)),
        session_id: request.headers.get('x-session-id')
      };
    }

    await this.logEvent(event);
  }

  /**
   * Track performance metrics for VIS API calls
   */
  async trackPerformanceMetric(
    endpoint: string,
    operation: string,
    duration: number,
    success: boolean,
    additionalData?: Record<string, any>
  ): Promise<void> {
    if (!this.config.enablePerformanceMonitoring) return;

    const event: AnalyticsEvent = {
      event_type: 'performance_metric',
      event_data: {
        endpoint,
        operation,
        duration_ms: duration,
        success,
        ...additionalData
      }
    };

    await this.logEvent(event);
  }

  /**
   * Create performance tracker for measuring request duration
   */
  createPerformanceTracker() {
    const startTime = performance.now();
    
    return {
      finish: (success: boolean = true) => ({
        duration: Math.round(performance.now() - startTime),
        success
      })
    };
  }

  /**
   * Privacy-compliant IP hashing
   */
  private async hashIP(ip: string): Promise<string> {
    if (!ip) return 'unknown';
    
    const encoder = new TextEncoder();
    const data = encoder.encode(ip + Deno.env.get('ANALYTICS_SALT'));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 12);
  }

  /**
   * Extract client IP with privacy considerations
   */
  private getClientIP(request: Request): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
           request.headers.get('x-real-ip') ||
           'unknown';
  }

  /**
   * Middleware wrapper for VIS Adapter handlers
   */
  wrapHandler<T>(
    handler: (request: Request, params: URLSearchParams) => Promise<T>,
    eventType: 'tournament' | 'match' | 'referee'
  ) {
    return async (request: Request, params: URLSearchParams): Promise<T> => {
      const tracker = this.createPerformanceTracker();
      let result: T;
      let error: Error | null = null;

      try {
        result = await handler(request, params);
        
        // Track successful request
        const metrics = tracker.finish(true);
        
        switch (eventType) {
          case 'tournament':
            await this.trackTournamentRequest(request, params, result, metrics);
            break;
          case 'match':
            await this.trackMatchRequest(request, params, result, metrics);
            break;
          case 'referee':
            await this.trackRefereeRequest(request, params, result, metrics);
            break;
        }
        
        return result;
      } catch (err) {
        error = err as Error;
        const metrics = tracker.finish(false);
        
        // Track error
        await this.trackError(request, error, {
          endpoint: `/vis/${eventType}s`,
          parameters: Object.fromEntries(params.entries())
        });
        
        throw error;
      }
    };
  }

  /**
   * Get analytics configuration for debugging
   */
  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  /**
   * Update analytics configuration
   */
  updateConfig(newConfig: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export singleton instance for VIS Adapter
export const analyticsMiddleware = new AnalyticsMiddleware({
  enablePerformanceMonitoring: true,
  enableRequestLogging: true,
  enableErrorTracking: true,
  enableUserContextTracking: false // Privacy compliance
});