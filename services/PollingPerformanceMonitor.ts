/**
 * @fileoverview PollingPerformanceMonitor for tracking adaptive polling performance
 * Monitors bandwidth savings and request reduction from optimization strategies
 * Part of Story 1.3: Optimize Polling and Field Selection
 */

import { MatchPollingStatus, FieldSelectionMode, VisApiEndpoint } from '../types/api-v2';

/**
 * Performance metrics for adaptive polling
 */
export interface PollingPerformanceMetrics {
  /** Total number of requests made */
  totalRequests: number;
  /** Requests saved through adaptive polling */
  requestsSaved: number;
  /** Percentage of requests saved */
  requestSavingsPercent: number;
  /** Estimated bandwidth saved in bytes */
  bandwidthSavedBytes: number;
  /** Percentage of bandwidth saved */
  bandwidthSavingsPercent: number;
  /** Average polling interval used (ms) */
  avgPollingIntervalMs: number;
  /** Traditional polling interval for comparison (ms) */
  traditionalPollingIntervalMs: number;
  /** Metrics by match status */
  byStatus: Record<MatchPollingStatus, StatusMetrics>;
  /** Metrics by field selection mode */
  byFieldSelection: Record<FieldSelectionMode, FieldSelectionMetrics>;
  /** Metrics by endpoint */
  byEndpoint: Record<VisApiEndpoint, EndpointMetrics>;
}

/**
 * Metrics for a specific match status
 */
export interface StatusMetrics {
  /** Number of requests for this status */
  requestCount: number;
  /** Total time spent polling in this status (ms) */
  totalPollingTimeMs: number;
  /** Average interval for this status (ms) */
  avgIntervalMs: number;
  /** Number of matches that used this status */
  matchCount: number;
}

/**
 * Metrics for field selection optimization
 */
export interface FieldSelectionMetrics {
  /** Number of requests using this field selection mode */
  requestCount: number;
  /** Average field count per request */
  avgFieldCount: number;
  /** Estimated bytes saved per request */
  avgBytesSavedPerRequest: number;
  /** Total bytes saved */
  totalBytesSaved: number;
}

/**
 * Metrics for specific endpoints
 */
export interface EndpointMetrics {
  /** Number of requests to this endpoint */
  requestCount: number;
  /** Average response size (bytes) */
  avgResponseSizeBytes: number;
  /** Field selection optimization usage */
  fieldOptimizationUsage: Record<FieldSelectionMode, number>;
}

/**
 * Performance tracking event
 */
export interface PerformanceEvent {
  /** Timestamp of the event */
  timestamp: Date;
  /** Type of event */
  eventType: 'request' | 'interval_change' | 'field_optimization';
  /** Match number */
  matchNo?: number;
  /** Endpoint used */
  endpoint?: VisApiEndpoint;
  /** Match status */
  status?: MatchPollingStatus;
  /** Field selection mode */
  fieldSelectionMode?: FieldSelectionMode;
  /** Polling interval used (ms) */
  intervalMs?: number;
  /** Field count in request */
  fieldCount?: number;
  /** Response size (bytes) */
  responseSizeBytes?: number;
  /** Whether request was saved due to optimization */
  requestSaved?: boolean;
}

/**
 * Performance monitor for adaptive polling and field selection optimization
 */
export class PollingPerformanceMonitor {
  private events: PerformanceEvent[] = [];
  private readonly maxEvents = 10000; // Keep last 10k events
  private readonly defaultPollingInterval = 5000; // Traditional 5s polling
  private readonly avgFieldSizes: Record<VisApiEndpoint, number> = {
    [VisApiEndpoint.GET_EVENT_LIST]: 50, // avg bytes per field
    [VisApiEndpoint.GET_BEACH_TOURNAMENT_LIST]: 45,
    [VisApiEndpoint.GET_BEACH_TOURNAMENT]: 60,
    [VisApiEndpoint.GET_EVENT]: 40,
    [VisApiEndpoint.GET_BEACH_MATCH_LIST]: 55,
    [VisApiEndpoint.GET_BEACH_MATCH]: 75, // Individual match has more detailed data
    [VisApiEndpoint.GET_BEACH_ROUND]: 35,
    [VisApiEndpoint.GET_BEACH_ROUND_LIST]: 30,
    [VisApiEndpoint.GET_BEACH_LIVE]: 80,
    [VisApiEndpoint.BATCH_REQUEST]: 100,
    [VisApiEndpoint.GET_EVENT_OFFICIAL_LIST]: 45,
    [VisApiEndpoint.GET_EVENT_REFEREE_LIST]: 50
  };

  /**
   * Record a polling request event
   */
  recordRequest(event: Omit<PerformanceEvent, 'timestamp' | 'eventType'>): void {
    this.addEvent({
      ...event,
      timestamp: new Date(),
      eventType: 'request'
    });
  }

  /**
   * Record a polling interval change
   */
  recordIntervalChange(matchNo: number, oldIntervalMs: number, newIntervalMs: number, status: MatchPollingStatus): void {
    this.addEvent({
      timestamp: new Date(),
      eventType: 'interval_change',
      matchNo,
      status,
      intervalMs: newIntervalMs
    });
  }

  /**
   * Record field selection optimization
   */
  recordFieldOptimization(
    endpoint: VisApiEndpoint,
    mode: FieldSelectionMode,
    fieldCount: number,
    estimatedBytesSaved: number
  ): void {
    this.addEvent({
      timestamp: new Date(),
      eventType: 'field_optimization',
      endpoint,
      fieldSelectionMode: mode,
      fieldCount,
      responseSizeBytes: estimatedBytesSaved
    });
  }

  /**
   * Get comprehensive performance metrics
   */
  getMetrics(timeRangeMs: number = 24 * 60 * 60 * 1000): PollingPerformanceMetrics {
    const cutoffTime = new Date(Date.now() - timeRangeMs);
    const recentEvents = this.events.filter(event => event.timestamp >= cutoffTime);

    const requestEvents = recentEvents.filter(e => e.eventType === 'request');
    const intervalEvents = recentEvents.filter(e => e.eventType === 'interval_change');
    const fieldEvents = recentEvents.filter(e => e.eventType === 'field_optimization');

    // Calculate basic metrics
    const totalRequests = requestEvents.length;
    const requestsSaved = requestEvents.filter(e => e.requestSaved).length;
    const requestSavingsPercent = totalRequests > 0 ? (requestsSaved / totalRequests) * 100 : 0;

    // Calculate bandwidth savings
    const totalBytesSaved = fieldEvents.reduce((sum, e) => sum + (e.responseSizeBytes || 0), 0);
    const estimatedTotalBytes = this.estimateTotalBandwidth(requestEvents);
    const bandwidthSavingsPercent = estimatedTotalBytes > 0 ? (totalBytesSaved / estimatedTotalBytes) * 100 : 0;

    // Calculate average intervals
    const intervals = intervalEvents.map(e => e.intervalMs || this.defaultPollingInterval);
    const avgPollingIntervalMs = intervals.length > 0 ? 
      intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length :
      this.defaultPollingInterval;

    return {
      totalRequests,
      requestsSaved,
      requestSavingsPercent: Math.round(requestSavingsPercent * 100) / 100,
      bandwidthSavedBytes: totalBytesSaved,
      bandwidthSavingsPercent: Math.round(bandwidthSavingsPercent * 100) / 100,
      avgPollingIntervalMs: Math.round(avgPollingIntervalMs),
      traditionalPollingIntervalMs: this.defaultPollingInterval,
      byStatus: this.getStatusMetrics(recentEvents),
      byFieldSelection: this.getFieldSelectionMetrics(fieldEvents),
      byEndpoint: this.getEndpointMetrics(requestEvents)
    };
  }

  /**
   * Get performance metrics by match status
   */
  private getStatusMetrics(events: PerformanceEvent[]): Record<MatchPollingStatus, StatusMetrics> {
    const metrics: Record<MatchPollingStatus, StatusMetrics> = {
      [MatchPollingStatus.RUNNING]: { requestCount: 0, totalPollingTimeMs: 0, avgIntervalMs: 3000, matchCount: 0 },
      [MatchPollingStatus.SCHEDULED]: { requestCount: 0, totalPollingTimeMs: 0, avgIntervalMs: 30000, matchCount: 0 },
      [MatchPollingStatus.FINISHED]: { requestCount: 0, totalPollingTimeMs: 0, avgIntervalMs: 0, matchCount: 0 }
    };

    const intervalEvents = events.filter(e => e.eventType === 'interval_change');
    const matchesByStatus: Record<MatchPollingStatus, Set<number>> = {
      [MatchPollingStatus.RUNNING]: new Set(),
      [MatchPollingStatus.SCHEDULED]: new Set(),
      [MatchPollingStatus.FINISHED]: new Set()
    };

    intervalEvents.forEach(event => {
      if (event.status && event.matchNo) {
        const status = event.status;
        metrics[status].requestCount++;
        matchesByStatus[status].add(event.matchNo);
        
        if (event.intervalMs) {
          metrics[status].totalPollingTimeMs += event.intervalMs;
        }
      }
    });

    // Update match counts and average intervals
    Object.keys(metrics).forEach(statusKey => {
      const status = statusKey as MatchPollingStatus;
      metrics[status].matchCount = matchesByStatus[status].size;
      
      if (metrics[status].requestCount > 0) {
        metrics[status].avgIntervalMs = Math.round(
          metrics[status].totalPollingTimeMs / metrics[status].requestCount
        );
      }
    });

    return metrics;
  }

  /**
   * Get performance metrics by field selection mode
   */
  private getFieldSelectionMetrics(fieldEvents: PerformanceEvent[]): Record<FieldSelectionMode, FieldSelectionMetrics> {
    const metrics: Record<FieldSelectionMode, FieldSelectionMetrics> = {
      [FieldSelectionMode.FULL]: { requestCount: 0, avgFieldCount: 0, avgBytesSavedPerRequest: 0, totalBytesSaved: 0 },
      [FieldSelectionMode.SLIM]: { requestCount: 0, avgFieldCount: 0, avgBytesSavedPerRequest: 0, totalBytesSaved: 0 },
      [FieldSelectionMode.CUSTOM]: { requestCount: 0, avgFieldCount: 0, avgBytesSavedPerRequest: 0, totalBytesSaved: 0 }
    };

    fieldEvents.forEach(event => {
      if (event.fieldSelectionMode) {
        const mode = event.fieldSelectionMode;
        metrics[mode].requestCount++;
        metrics[mode].avgFieldCount += event.fieldCount || 0;
        metrics[mode].totalBytesSaved += event.responseSizeBytes || 0;
      }
    });

    // Calculate averages
    Object.keys(metrics).forEach(modeKey => {
      const mode = modeKey as FieldSelectionMode;
      if (metrics[mode].requestCount > 0) {
        metrics[mode].avgFieldCount = Math.round(metrics[mode].avgFieldCount / metrics[mode].requestCount);
        metrics[mode].avgBytesSavedPerRequest = Math.round(
          metrics[mode].totalBytesSaved / metrics[mode].requestCount
        );
      }
    });

    return metrics;
  }

  /**
   * Get performance metrics by endpoint
   */
  private getEndpointMetrics(requestEvents: PerformanceEvent[]): Record<VisApiEndpoint, EndpointMetrics> {
    const metrics: Partial<Record<VisApiEndpoint, EndpointMetrics>> = {};

    requestEvents.forEach(event => {
      if (event.endpoint) {
        const endpoint = event.endpoint;
        
        if (!metrics[endpoint]) {
          metrics[endpoint] = {
            requestCount: 0,
            avgResponseSizeBytes: 0,
            fieldOptimizationUsage: {
              [FieldSelectionMode.FULL]: 0,
              [FieldSelectionMode.SLIM]: 0,
              [FieldSelectionMode.CUSTOM]: 0
            }
          };
        }

        metrics[endpoint]!.requestCount++;
        metrics[endpoint]!.avgResponseSizeBytes += event.responseSizeBytes || 0;
        
        if (event.fieldSelectionMode) {
          metrics[endpoint]!.fieldOptimizationUsage[event.fieldSelectionMode]++;
        }
      }
    });

    // Calculate averages
    Object.keys(metrics).forEach(endpointKey => {
      const endpoint = endpointKey as VisApiEndpoint;
      const metric = metrics[endpoint]!;
      
      if (metric.requestCount > 0) {
        metric.avgResponseSizeBytes = Math.round(metric.avgResponseSizeBytes / metric.requestCount);
      }
    });

    return metrics as Record<VisApiEndpoint, EndpointMetrics>;
  }

  /**
   * Estimate total bandwidth usage for comparison
   */
  private estimateTotalBandwidth(requestEvents: PerformanceEvent[]): number {
    return requestEvents.reduce((total, event) => {
      if (event.endpoint && event.fieldCount) {
        const avgFieldSize = this.avgFieldSizes[event.endpoint];
        return total + (event.fieldCount * avgFieldSize);
      }
      return total + 1000; // Default estimate
    }, 0);
  }

  /**
   * Add event to the collection with memory management
   */
  private addEvent(event: PerformanceEvent): void {
    this.events.push(event);
    
    // Maintain memory by keeping only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  /**
   * Get performance summary for quick overview
   */
  getPerformanceSummary(timeRangeMs: number = 60 * 60 * 1000): {
    requestSavingsPercent: number;
    bandwidthSavingsPercent: number;
    avgIntervalMs: number;
    activeMatches: number;
    totalEvents: number;
  } {
    const metrics = this.getMetrics(timeRangeMs);
    const activeMatches = Object.values(metrics.byStatus).reduce((sum, status) => sum + status.matchCount, 0);
    
    return {
      requestSavingsPercent: metrics.requestSavingsPercent,
      bandwidthSavingsPercent: metrics.bandwidthSavingsPercent,
      avgIntervalMs: metrics.avgPollingIntervalMs,
      activeMatches,
      totalEvents: this.events.filter(e => 
        e.timestamp >= new Date(Date.now() - timeRangeMs)
      ).length
    };
  }

  /**
   * Clear all collected metrics
   */
  clearMetrics(): void {
    this.events = [];
  }

  /**
   * Export metrics data for analysis
   */
  exportMetrics(timeRangeMs: number = 24 * 60 * 60 * 1000): {
    metrics: PollingPerformanceMetrics;
    rawEvents: PerformanceEvent[];
  } {
    const cutoffTime = new Date(Date.now() - timeRangeMs);
    const recentEvents = this.events.filter(event => event.timestamp >= cutoffTime);
    
    return {
      metrics: this.getMetrics(timeRangeMs),
      rawEvents: recentEvents
    };
  }
}

/**
 * Singleton instance for application-wide performance monitoring
 */
export const pollingPerformanceMonitor = new PollingPerformanceMonitor();