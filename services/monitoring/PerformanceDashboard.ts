/**
 * @fileoverview Performance Dashboard Service
 * Real-time performance monitoring and automated regression detection
 * Part of EPIC-007 Data Architecture Restructuration - Story 7.2 Task 5
 */

import { RepositoryFactory, PerformanceComparison } from '../../repositories/RepositoryFactory';

/**
 * Performance metrics snapshot
 */
export interface PerformanceSnapshot {
  readonly timestamp: string;
  readonly metrics: {
    readonly tournament: {
      readonly legacy?: RepositoryMetrics;
      readonly new?: RepositoryMetrics;
    };
    readonly match: {
      readonly legacy?: RepositoryMetrics;
      readonly new?: RepositoryMetrics;
    };
  };
  readonly comparisons: {
    readonly tournament?: PerformanceComparison;
    readonly match?: PerformanceComparison;
  };
  readonly alerts: PerformanceAlert[];
}

/**
 * Repository performance metrics
 */
export interface RepositoryMetrics {
  readonly averageResponseTime: number;
  readonly cacheHitRate: number;
  readonly errorRate: number;
  readonly throughput: number;
  readonly memoryUsage?: number;
  readonly activeConnections?: number;
}

/**
 * Performance alert types
 */
export interface PerformanceAlert {
  readonly id: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly type: 'response_time' | 'error_rate' | 'cache_hit_rate' | 'throughput' | 'memory' | 'regression';
  readonly message: string;
  readonly threshold: number;
  readonly actualValue: number;
  readonly timestamp: string;
  readonly repositoryType: 'tournament' | 'match';
  readonly implementation: 'legacy' | 'new';
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  /** Update interval in milliseconds */
  readonly updateInterval: number;
  /** Performance thresholds for alerts */
  readonly thresholds: {
    readonly responseTime: {
      readonly warning: number;
      readonly critical: number;
    };
    readonly errorRate: {
      readonly warning: number;
      readonly critical: number;
    };
    readonly cacheHitRate: {
      readonly warning: number;
      readonly critical: number;
    };
    readonly throughput: {
      readonly warning: number;
      readonly critical: number;
    };
  };
  /** Enable automated regression detection */
  readonly enableRegressionDetection: boolean;
  /** Regression detection sensitivity (percentage change) */
  readonly regressionThreshold: number;
  /** Maximum alerts to keep in memory */
  readonly maxAlerts: number;
}

/**
 * Performance dashboard for real-time monitoring
 * Provides automated regression detection and alerting
 */
export class PerformanceDashboard {
  private readonly repositoryFactory: RepositoryFactory;
  private readonly config: DashboardConfig;
  private readonly snapshots: PerformanceSnapshot[] = [];
  private readonly alerts: PerformanceAlert[] = [];
  private intervalId?: NodeJS.Timeout;
  private alertListeners: Array<(alert: PerformanceAlert) => void> = [];

  constructor(repositoryFactory: RepositoryFactory, config: DashboardConfig) {
    this.repositoryFactory = repositoryFactory;
    this.config = config;
  }

  /**
   * Start real-time monitoring
   */
  startMonitoring(): void {
    if (this.intervalId) {
      // console.warn('Performance monitoring already started');
      return;
    }

    this.intervalId = setInterval(() => {
      this.captureSnapshot();
    }, this.config.updateInterval);

    // console.log(`Performance monitoring started with ${this.config.updateInterval}ms interval`);
  }

  /**
   * Stop real-time monitoring
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      // console.log('Performance monitoring stopped');
    }
  }

  /**
   * Get current performance snapshot
   */
  getCurrentSnapshot(): PerformanceSnapshot {
    return this.captureSnapshot();
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(hours: number = 24): PerformanceSnapshot[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.snapshots.filter(snapshot => 
      new Date(snapshot.timestamp) >= cutoffTime
    );
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    // Return alerts from last 24 hours
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.alerts.filter(alert => 
      new Date(alert.timestamp) >= cutoffTime
    );
  }

  /**
   * Add alert listener
   */
  onAlert(listener: (alert: PerformanceAlert) => void): void {
    this.alertListeners.push(listener);
  }

  /**
   * Remove alert listener
   */
  removeAlertListener(listener: (alert: PerformanceAlert) => void): void {
    const index = this.alertListeners.indexOf(listener);
    if (index > -1) {
      this.alertListeners.splice(index, 1);
    }
  }

  /**
   * Generate performance report
   */
  generateReport(hours: number = 24): {
    summary: {
      totalSnapshots: number;
      totalAlerts: number;
      alertsBySeverity: Record<string, number>;
      averageResponseTime: {
        tournament: { legacy?: number; new?: number };
        match: { legacy?: number; new?: number };
      };
      improvementMetrics: {
        tournament?: PerformanceComparison;
        match?: PerformanceComparison;
      };
    };
    recommendations: string[];
  } {
    const history = this.getPerformanceHistory(hours);
    const activeAlerts = this.getActiveAlerts();

    // Calculate averages
    const tournamentLegacyTimes = history.map(s => s.metrics.tournament.legacy?.averageResponseTime).filter(Boolean);
    const tournamentNewTimes = history.map(s => s.metrics.tournament.new?.averageResponseTime).filter(Boolean);
    const matchLegacyTimes = history.map(s => s.metrics.match.legacy?.averageResponseTime).filter(Boolean);
    const matchNewTimes = history.map(s => s.metrics.match.new?.averageResponseTime).filter(Boolean);

    // Get latest comparisons
    const latestSnapshot = history[history.length - 1];
    const tournamentComparison = latestSnapshot?.comparisons.tournament;
    const matchComparison = latestSnapshot?.comparisons.match;

    // Count alerts by severity
    const alertsBySeverity = activeAlerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Generate recommendations
    const recommendations = this.generateRecommendations(activeAlerts, tournamentComparison, matchComparison);

    return {
      summary: {
        totalSnapshots: history.length,
        totalAlerts: activeAlerts.length,
        alertsBySeverity,
        averageResponseTime: {
          tournament: {
            legacy: tournamentLegacyTimes.length > 0 ? tournamentLegacyTimes.reduce((a, b) => a + b, 0) / tournamentLegacyTimes.length : undefined,
            new: tournamentNewTimes.length > 0 ? tournamentNewTimes.reduce((a, b) => a + b, 0) / tournamentNewTimes.length : undefined
          },
          match: {
            legacy: matchLegacyTimes.length > 0 ? matchLegacyTimes.reduce((a, b) => a + b, 0) / matchLegacyTimes.length : undefined,
            new: matchNewTimes.length > 0 ? matchNewTimes.reduce((a, b) => a + b, 0) / matchNewTimes.length : undefined
          }
        },
        improvementMetrics: {
          tournament: tournamentComparison,
          match: matchComparison
        }
      },
      recommendations
    };
  }

  /**
   * Clear performance data (for testing or reset)
   */
  clearData(): void {
    this.snapshots.length = 0;
    this.alerts.length = 0;
  }

  /**
   * Capture performance snapshot
   */
  private captureSnapshot(): PerformanceSnapshot {
    const timestamp = new Date().toISOString();

    // Get comparisons from repository factory
    const tournamentComparison = this.repositoryFactory.getPerformanceComparison('tournament');
    const matchComparison = this.repositoryFactory.getPerformanceComparison('match');

    // Extract metrics from comparisons
    const metrics = {
      tournament: {
        legacy: tournamentComparison?.legacy,
        new: tournamentComparison?.new
      },
      match: {
        legacy: matchComparison?.legacy,
        new: matchComparison?.new
      }
    };

    // Detect performance issues and regressions
    const alerts = this.detectPerformanceIssues(metrics, timestamp);

    const snapshot: PerformanceSnapshot = {
      timestamp,
      metrics,
      comparisons: {
        tournament: tournamentComparison,
        match: matchComparison
      },
      alerts
    };

    // Store snapshot
    this.snapshots.push(snapshot);

    // Keep only recent snapshots to prevent memory issues
    if (this.snapshots.length > 1000) {
      this.snapshots.splice(0, this.snapshots.length - 1000);
    }

    // Store alerts and notify listeners
    alerts.forEach(alert => {
      this.alerts.push(alert);
      this.alertListeners.forEach(listener => listener(alert));
    });

    // Keep only recent alerts
    if (this.alerts.length > this.config.maxAlerts) {
      this.alerts.splice(0, this.alerts.length - this.config.maxAlerts);
    }

    return snapshot;
  }

  /**
   * Detect performance issues and regressions
   */
  private detectPerformanceIssues(
    metrics: PerformanceSnapshot['metrics'], 
    timestamp: string
  ): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    // Check tournament metrics
    if (metrics.tournament.legacy) {
      alerts.push(...this.checkMetricsThresholds(metrics.tournament.legacy, 'tournament', 'legacy', timestamp));
    }
    if (metrics.tournament.new) {
      alerts.push(...this.checkMetricsThresholds(metrics.tournament.new, 'tournament', 'new', timestamp));
    }

    // Check match metrics
    if (metrics.match.legacy) {
      alerts.push(...this.checkMetricsThresholds(metrics.match.legacy, 'match', 'legacy', timestamp));
    }
    if (metrics.match.new) {
      alerts.push(...this.checkMetricsThresholds(metrics.match.new, 'match', 'new', timestamp));
    }

    // Check for regressions if enabled
    if (this.config.enableRegressionDetection) {
      alerts.push(...this.detectRegressions(timestamp));
    }

    return alerts;
  }

  /**
   * Check metrics against thresholds
   */
  private checkMetricsThresholds(
    metrics: RepositoryMetrics,
    repositoryType: 'tournament' | 'match',
    implementation: 'legacy' | 'new',
    timestamp: string
  ): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    // Response time alerts
    if (metrics.averageResponseTime > this.config.thresholds.responseTime.critical) {
      alerts.push(this.createAlert(
        'response_time',
        'critical',
        `Critical response time: ${metrics.averageResponseTime.toFixed(2)}ms`,
        this.config.thresholds.responseTime.critical,
        metrics.averageResponseTime,
        repositoryType,
        implementation,
        timestamp
      ));
    } else if (metrics.averageResponseTime > this.config.thresholds.responseTime.warning) {
      alerts.push(this.createAlert(
        'response_time',
        'medium',
        `High response time: ${metrics.averageResponseTime.toFixed(2)}ms`,
        this.config.thresholds.responseTime.warning,
        metrics.averageResponseTime,
        repositoryType,
        implementation,
        timestamp
      ));
    }

    // Error rate alerts
    if (metrics.errorRate > this.config.thresholds.errorRate.critical) {
      alerts.push(this.createAlert(
        'error_rate',
        'critical',
        `Critical error rate: ${(metrics.errorRate * 100).toFixed(2)}%`,
        this.config.thresholds.errorRate.critical,
        metrics.errorRate,
        repositoryType,
        implementation,
        timestamp
      ));
    } else if (metrics.errorRate > this.config.thresholds.errorRate.warning) {
      alerts.push(this.createAlert(
        'error_rate',
        'medium',
        `High error rate: ${(metrics.errorRate * 100).toFixed(2)}%`,
        this.config.thresholds.errorRate.warning,
        metrics.errorRate,
        repositoryType,
        implementation,
        timestamp
      ));
    }

    // Cache hit rate alerts (low cache hit rate is bad)
    if (metrics.cacheHitRate < this.config.thresholds.cacheHitRate.critical) {
      alerts.push(this.createAlert(
        'cache_hit_rate',
        'critical',
        `Critical cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(2)}%`,
        this.config.thresholds.cacheHitRate.critical,
        metrics.cacheHitRate,
        repositoryType,
        implementation,
        timestamp
      ));
    } else if (metrics.cacheHitRate < this.config.thresholds.cacheHitRate.warning) {
      alerts.push(this.createAlert(
        'cache_hit_rate',
        'medium',
        `Low cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(2)}%`,
        this.config.thresholds.cacheHitRate.warning,
        metrics.cacheHitRate,
        repositoryType,
        implementation,
        timestamp
      ));
    }

    return alerts;
  }

  /**
   * Detect performance regressions
   */
  private detectRegressions(timestamp: string): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    // Need at least 2 snapshots to detect regression
    if (this.snapshots.length < 2) {
      return alerts;
    }

    const current = this.snapshots[this.snapshots.length - 1];
    const previous = this.snapshots[this.snapshots.length - 2];

    // Check tournament regressions
    if (current.metrics.tournament.new && previous.metrics.tournament.new) {
      const regressionAlerts = this.detectMetricRegressions(
        previous.metrics.tournament.new,
        current.metrics.tournament.new,
        'tournament',
        'new',
        timestamp
      );
      alerts.push(...regressionAlerts);
    }

    // Check match regressions
    if (current.metrics.match.new && previous.metrics.match.new) {
      const regressionAlerts = this.detectMetricRegressions(
        previous.metrics.match.new,
        current.metrics.match.new,
        'match',
        'new',
        timestamp
      );
      alerts.push(...regressionAlerts);
    }

    return alerts;
  }

  /**
   * Detect regressions in specific metrics
   */
  private detectMetricRegressions(
    previous: RepositoryMetrics,
    current: RepositoryMetrics,
    repositoryType: 'tournament' | 'match',
    implementation: 'legacy' | 'new',
    timestamp: string
  ): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    // Response time regression (increase is bad)
    const responseTimeChange = ((current.averageResponseTime - previous.averageResponseTime) / previous.averageResponseTime) * 100;
    if (responseTimeChange > this.config.regressionThreshold) {
      alerts.push(this.createAlert(
        'regression',
        'high',
        `Response time regression: ${responseTimeChange.toFixed(2)}% increase`,
        this.config.regressionThreshold,
        responseTimeChange,
        repositoryType,
        implementation,
        timestamp
      ));
    }

    // Error rate regression (increase is bad)
    const errorRateChange = ((current.errorRate - previous.errorRate) / previous.errorRate) * 100;
    if (errorRateChange > this.config.regressionThreshold) {
      alerts.push(this.createAlert(
        'regression',
        'high',
        `Error rate regression: ${errorRateChange.toFixed(2)}% increase`,
        this.config.regressionThreshold,
        errorRateChange,
        repositoryType,
        implementation,
        timestamp
      ));
    }

    // Cache hit rate regression (decrease is bad)
    const cacheHitRateChange = ((previous.cacheHitRate - current.cacheHitRate) / previous.cacheHitRate) * 100;
    if (cacheHitRateChange > this.config.regressionThreshold) {
      alerts.push(this.createAlert(
        'regression',
        'high',
        `Cache hit rate regression: ${cacheHitRateChange.toFixed(2)}% decrease`,
        this.config.regressionThreshold,
        cacheHitRateChange,
        repositoryType,
        implementation,
        timestamp
      ));
    }

    return alerts;
  }

  /**
   * Create performance alert
   */
  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    threshold: number,
    actualValue: number,
    repositoryType: 'tournament' | 'match',
    implementation: 'legacy' | 'new',
    timestamp: string
  ): PerformanceAlert {
    return {
      id: `${type}_${repositoryType}_${implementation}_${Date.now()}`,
      severity,
      type,
      message,
      threshold,
      actualValue,
      timestamp,
      repositoryType,
      implementation
    };
  }

  /**
   * Generate recommendations based on performance data
   */
  private generateRecommendations(
    alerts: PerformanceAlert[],
    tournamentComparison?: PerformanceComparison,
    matchComparison?: PerformanceComparison
  ): string[] {
    const recommendations: string[] = [];

    // Response time recommendations
    const responseTimeAlerts = alerts.filter(a => a.type === 'response_time');
    if (responseTimeAlerts.length > 0) {
      recommendations.push('Consider optimizing database queries and adding more caching layers');
      recommendations.push('Review API field selection to reduce response payload size');
    }

    // Error rate recommendations
    const errorRateAlerts = alerts.filter(a => a.type === 'error_rate');
    if (errorRateAlerts.length > 0) {
      recommendations.push('Investigate error patterns and implement circuit breaker mechanisms');
      recommendations.push('Add more comprehensive error handling and retry logic');
    }

    // Cache hit rate recommendations
    const cacheAlerts = alerts.filter(a => a.type === 'cache_hit_rate');
    if (cacheAlerts.length > 0) {
      recommendations.push('Review cache TTL settings and increase cache warming frequency');
      recommendations.push('Consider implementing more aggressive cache pre-population strategies');
    }

    // Regression recommendations
    const regressionAlerts = alerts.filter(a => a.type === 'regression');
    if (regressionAlerts.length > 0) {
      recommendations.push('Roll back recent changes and investigate performance impact');
      recommendations.push('Enable feature flag fallback to previous implementation');
    }

    // Implementation comparison recommendations
    if (tournamentComparison && tournamentComparison.improvement.responseTime < -10) {
      recommendations.push('Consider rolling back tournament repository to legacy implementation');
    }
    if (matchComparison && matchComparison.improvement.responseTime < -10) {
      recommendations.push('Consider rolling back match repository to legacy implementation');
    }

    return recommendations;
  }
}

/**
 * Default dashboard configuration
 */
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  updateInterval: 30000, // 30 seconds
  thresholds: {
    responseTime: {
      warning: 500, // 500ms
      critical: 1000 // 1 second
    },
    errorRate: {
      warning: 0.01, // 1%
      critical: 0.05 // 5%
    },
    cacheHitRate: {
      warning: 0.80, // 80%
      critical: 0.60 // 60%
    },
    throughput: {
      warning: 10, // 10 requests/second
      critical: 5 // 5 requests/second
    }
  },
  enableRegressionDetection: true,
  regressionThreshold: 15, // 15% change
  maxAlerts: 1000
};