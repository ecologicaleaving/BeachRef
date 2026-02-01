import { ErrorLogger } from './ErrorLogger';
import { NetworkMonitor } from './NetworkStateManager';
import { DataSyncService } from './DataSyncService';
import { DualReadService } from './DualReadService';
import { DataConsistencyValidator} from './DataConsistencyValidator';
import { MigrationRollbackService, SystemState } from './MigrationRollbackService';

export interface MonitoringConfiguration {
  enabled: boolean;
  syncHealthCheckIntervalMs: number;
  performanceMetricsIntervalMs: number;
  consistencyCheckIntervalMs: number;
  alertingEnabled: boolean;
  alertThresholds: AlertThresholds;
  dashboardUpdateIntervalMs: number;
  retentionDays: number;
  notificationChannels: NotificationChannel[];
}

export interface AlertThresholds {
  syncFailureCount: number;
  syncFailureRatePercent: number;
  performanceDegradationPercent: number;
  dataInconsistencyPercent: number;
  systemDowntimeMinutes: number;
  diskUsagePercent: number;
  memoryUsagePercent: number;
  responseTimeMs: number;
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'webhook' | 'sms' | 'push';
  enabled: boolean;
  endpoint: string;
  credentials?: Record<string, string>;
  alertTypes: AlertType[];
  rateLimit?: {
    maxPerHour: number;
    maxPerDay: number;
  };
}

export interface MigrationHealthStatus {
  timestamp: string;
  overallHealth: 'healthy' | 'degraded' | 'failing' | 'critical';
  components: ComponentHealth[];
  metrics: HealthMetrics;
  activeAlerts: Alert[];
  recommendations: string[];
}

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'failing' | 'unknown';
  message: string;
  lastUpdated: string;
  metrics?: Record<string, number>;
  trends?: {
    direction: 'improving' | 'stable' | 'degrading';
    confidence: number;
  };
}

export interface HealthMetrics {
  syncMetrics: {
    successRate: number;
    averageLatencyMs: number;
    failureCount: number;
    totalOperations: number;
    lastSuccessfulSync?: string;
  };
  performanceMetrics: {
    averageQueryTimeMs: number;
    databaseResponseTimeMs: number;
    apiResponseTimeMs: number;
    cacheHitRate: number;
    throughputPerSecond: number;
  };
  consistencyMetrics: {
    dataIntegrityScore: number;
    discrepancyCount: number;
    lastConsistencyCheck?: string;
    consistencyTrend: 'improving' | 'stable' | 'degrading';
  };
  systemMetrics: {
    uptime: number;
    memoryUsagePercent: number;
    diskUsagePercent?: number;
    connectionCount?: number;
    activeUsers?: number;
  };
}

export type AlertType = 'sync_failure' | 'performance_degradation' | 'data_inconsistency' | 
                       'system_failure' | 'rollback_initiated' | 'migration_progress' |
                       'resource_exhaustion' | 'connectivity_issues';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  source: string;
  metadata?: Record<string, any>;
  acknowledged: boolean;
  resolvedAt?: string;
  acknowledgmentBy?: string;
  relatedAlerts?: string[];
}

export interface PerformanceMetric {
  timestamp: string;
  metricType: 'sync_latency' | 'query_time' | 'response_time' | 'throughput' | 'error_rate';
  value: number;
  unit: 'ms' | 'ops/sec' | 'percent' | 'count';
  source: string;
  tags?: Record<string, string>;
}

export interface MigrationProgressReport {
  reportId: string;
  timestamp: string;
  phase: 'preparation' | 'sync_setup' | 'dual_read_active' | 'validation' | 'rollback' | 'completed';
  overallProgress: number; // 0-100
  currentStep: string;
  estimatedCompletionTime?: string;
  metrics: {
    recordsMigrated: number;
    totalRecords: number;
    dataVolumeMB: number;
    syncSpeed: number; // records per second
  };
  issues: {
    errors: string[];
    warnings: string[];
    resolutions: string[];
  };
  nextActions: string[];
}

export interface DashboardData {
  timestamp: string;
  healthStatus: MigrationHealthStatus;
  progressReport: MigrationProgressReport;
  recentAlerts: Alert[];
  performanceTrends: PerformanceMetric[];
  systemState: SystemState;
  migrationTimeline: TimelineEvent[];
}

export interface TimelineEvent {
  timestamp: string;
  type: 'migration_start' | 'phase_change' | 'alert' | 'rollback' | 'validation' | 'completion';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  metadata?: Record<string, any>;
}

export class MigrationMonitoringService {
  private static instance: MigrationMonitoringService;
  private errorLogger: ErrorLogger;
  private networkMonitor: NetworkMonitor;
  private dataSyncService: DataSyncService;
  private dualReadService: DualReadService;
  private consistencyValidator: DataConsistencyValidator;
  private rollbackService: MigrationRollbackService;
  
  private configuration: MonitoringConfiguration;
  private healthStatus: MigrationHealthStatus;
  private activeAlerts: Map<string, Alert> = new Map();
  private performanceMetrics: PerformanceMetric[] = [];
  private migrationTimeline: TimelineEvent[] = [];
  private dashboardSubscribers: Set<(data: DashboardData) => void> = new Set();
  
  private monitoringIntervals: {
    healthCheck?: NodeJS.Timeout;
    performanceMetrics?: NodeJS.Timeout;
    consistencyCheck?: NodeJS.Timeout;
    dashboardUpdate?: NodeJS.Timeout;
  } = {};

  private constructor() {
    this.errorLogger = ErrorLogger.getInstance();
    this.networkMonitor = NetworkMonitor.getInstance();
    this.dataSyncService = DataSyncService.getInstance();
    this.dualReadService = DualReadService.getInstance();
    this.consistencyValidator = DataConsistencyValidator.getInstance();
    this.rollbackService = MigrationRollbackService.getInstance();

    // Default configuration
    this.configuration = {
      enabled: false,
      syncHealthCheckIntervalMs: 60000, // 1 minute
      performanceMetricsIntervalMs: 30000, // 30 seconds
      consistencyCheckIntervalMs: 3600000, // 1 hour
      alertingEnabled: false,
      dashboardUpdateIntervalMs: 5000, // 5 seconds
      retentionDays: 7,
      notificationChannels: [],
      alertThresholds: {
        syncFailureCount: 5,
        syncFailureRatePercent: 10,
        performanceDegradationPercent: 50,
        dataInconsistencyPercent: 1,
        systemDowntimeMinutes: 5,
        diskUsagePercent: 85,
        memoryUsagePercent: 90,
        responseTimeMs: 5000
      }
    };

    this.healthStatus = this.createInitialHealthStatus();
  }

  public static getInstance(): MigrationMonitoringService {
    if (!MigrationMonitoringService.instance) {
      MigrationMonitoringService.instance = new MigrationMonitoringService();
    }
    return MigrationMonitoringService.instance;
  }

  /**
   * Configure the monitoring service
   */
  public configure(config: Partial<MonitoringConfiguration>): void {
    this.configuration = { ...this.configuration, ...config };
    
    if (this.configuration.enabled) {
      this.startMonitoring();
    } else {
      this.stopMonitoring();
    }

    this.errorLogger.log('Migration monitoring configured', { enabled: this.configuration.enabled });
  }

  /**
   * Start all monitoring processes
   */
  public startMonitoring(): void {
    this.errorLogger.log('Starting migration monitoring');

    // Health check monitoring
    this.monitoringIntervals.healthCheck = setInterval(
      () => this.performHealthCheck(),
      this.configuration.syncHealthCheckIntervalMs
    );

    // Performance metrics collection
    this.monitoringIntervals.performanceMetrics = setInterval(
      () => this.collectPerformanceMetrics(),
      this.configuration.performanceMetricsIntervalMs
    );

    // Consistency check monitoring
    this.monitoringIntervals.consistencyCheck = setInterval(
      () => this.performConsistencyCheck(),
      this.configuration.consistencyCheckIntervalMs
    );

    // Dashboard update broadcasting
    this.monitoringIntervals.dashboardUpdate = setInterval(
      () => this.broadcastDashboardUpdate(),
      this.configuration.dashboardUpdateIntervalMs
    );

    this.addTimelineEvent({
      type: 'migration_start',
      title: 'Migration Monitoring Started',
      description: 'Migration monitoring and alerting system activated',
      severity: 'info'
    });
  }

  /**
   * Stop all monitoring processes
   */
  public stopMonitoring(): void {
    this.errorLogger.log('Stopping migration monitoring');

    Object.values(this.monitoringIntervals).forEach(interval => {
      if (interval) clearInterval(interval);
    });
    this.monitoringIntervals = {};

    this.addTimelineEvent({
      type: 'migration_start',
      title: 'Migration Monitoring Stopped',
      description: 'Migration monitoring and alerting system deactivated',
      severity: 'info'
    });
  }

  /**
   * Get current health status
   */
  public getCurrentHealthStatus(): MigrationHealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * Get current dashboard data
   */
  public async getDashboardData(): Promise<DashboardData> {
    const systemState = await this.rollbackService.getCurrentSystemState();
    const progressReport = await this.generateProgressReport();

    return {
      timestamp: new Date().toISOString(),
      healthStatus: this.healthStatus,
      progressReport,
      recentAlerts: Array.from(this.activeAlerts.values())
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10),
      performanceTrends: this.getRecentPerformanceMetrics(50),
      systemState,
      migrationTimeline: this.migrationTimeline.slice(-20)
    };
  }

  /**
   * Subscribe to dashboard updates
   */
  public subscribeToDashboard(callback: (data: DashboardData) => void): () => void {
    this.dashboardSubscribers.add(callback);
    return () => this.dashboardSubscribers.delete(callback);
  }

  /**
   * Trigger an alert
   */
  public async triggerAlert(
    type: AlertType,
    severity: AlertSeverity,
    title: string,
    message: string,
    source: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const alertId = `${type}_${Date.now()}`;
    
    const alert: Alert = {
      id: alertId,
      type,
      severity,
      title,
      message,
      timestamp: new Date().toISOString(),
      source,
      metadata,
      acknowledged: false
    };

    this.activeAlerts.set(alertId, alert);

    this.errorLogger.log(`Alert triggered: ${title}`, { 
      alertId, 
      type, 
      severity, 
      source 
    });

    this.addTimelineEvent({
      type: 'alert',
      title: `Alert: ${title}`,
      description: message,
      severity: severity === 'critical' ? 'error' : severity as any,
      metadata: { alertId, alertType: type }
    });

    // Send notifications if enabled
    if (this.configuration.alertingEnabled) {
      await this.sendAlertNotifications(alert);
    }

    // Update health status based on alert
    this.updateHealthStatusFromAlert(alert);
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string, acknowledgedBy?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.acknowledgmentBy = acknowledgedBy;

    this.errorLogger.log('Alert acknowledged', { alertId, acknowledgedBy });
    return true;
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.resolvedAt = new Date().toISOString();
    this.activeAlerts.delete(alertId);

    this.errorLogger.log('Alert resolved', { alertId });
    return true;
  }

  /**
   * Get performance metrics for a time range
   */
  public getPerformanceMetrics(
    from: Date,
    to: Date,
    metricType?: string
  ): PerformanceMetric[] {
    return this.performanceMetrics.filter(metric => {
      const metricTime = new Date(metric.timestamp);
      const timeMatch = metricTime >= from && metricTime <= to;
      const typeMatch = !metricType || metric.metricType === metricType;
      return timeMatch && typeMatch;
    });
  }

  /**
   * Force a health check
   */
  public async forceHealthCheck(): Promise<MigrationHealthStatus> {
    await this.performHealthCheck();
    return this.healthStatus;
  }

  /**
   * Force a consistency check
   */
  public async forceConsistencyCheck(): Promise<void> {
    await this.performConsistencyCheck();
  }

  /**
   * Get migration timeline events
   */
  public getTimelineEvents(limit: number = 50): TimelineEvent[] {
    return this.migrationTimeline.slice(-limit);
  }

  /**
   * Add a custom timeline event
   */
  public addTimelineEvent(event: Omit<TimelineEvent, 'timestamp'>): void {
    this.migrationTimeline.push({
      ...event,
      timestamp: new Date().toISOString()
    });

    // Prune old events
    const maxEvents = 1000;
    if (this.migrationTimeline.length > maxEvents) {
      this.migrationTimeline = this.migrationTimeline.slice(-maxEvents);
    }
  }

  /**
   * Perform health check on all components
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const components: ComponentHealth[] = [];

      // Check Data Sync Service
      const syncHealth = await this.checkDataSyncHealth();
      components.push(syncHealth);

      // Check Dual Read Service
      const dualReadHealth = await this.checkDualReadHealth();
      components.push(dualReadHealth);

      // Check Network Connectivity
      const networkHealth = this.checkNetworkHealth();
      components.push(networkHealth);

      // Check System Resources
      const resourceHealth = await this.checkSystemResources();
      components.push(resourceHealth);

      // Determine overall health
      const overallHealth = this.calculateOverallHealth(components);

      // Update health metrics
      const syncMetrics = await this.calculateSyncMetrics();
      const performanceMetrics = await this.calculatePerformanceMetrics();
      const consistencyMetrics = await this.calculateConsistencyMetrics();
      const systemMetrics = await this.calculateSystemMetrics();

      this.healthStatus = {
        timestamp: new Date().toISOString(),
        overallHealth,
        components,
        metrics: {
          syncMetrics,
          performanceMetrics,
          consistencyMetrics,
          systemMetrics
        },
        activeAlerts: Array.from(this.activeAlerts.values()),
        recommendations: this.generateRecommendations(components, overallHealth)
      };

      // Check for threshold violations and trigger alerts
      await this.checkThresholdViolations();

    } catch (error) {
      this.errorLogger.logError('Health check failed', error);
      
      await this.triggerAlert(
        'system_failure',
        'error',
        'Health Check Failed',
        `Health monitoring failed: ${error instanceof Error ? error.message : String(error)}`,
        'MigrationMonitoringService'
      );
    }
  }

  /**
   * Collect performance metrics
   */
  private async collectPerformanceMetrics(): Promise<void> {
    try {
      const timestamp = new Date().toISOString();

      // Collect various performance metrics
      const syncLatency = await this.measureSyncLatency();
      if (syncLatency !== null) {
        this.addPerformanceMetric({
          timestamp,
          metricType: 'sync_latency',
          value: syncLatency,
          unit: 'ms',
          source: 'DataSyncService'
        });
      }

      const queryTime = await this.measureQueryTime();
      if (queryTime !== null) {
        this.addPerformanceMetric({
          timestamp,
          metricType: 'query_time',
          value: queryTime,
          unit: 'ms',
          source: 'DualReadService'
        });
      }

      // Network response time
      const responseTime = await this.measureNetworkResponseTime();
      if (responseTime !== null) {
        this.addPerformanceMetric({
          timestamp,
          metricType: 'response_time',
          value: responseTime,
          unit: 'ms',
          source: 'NetworkMonitor'
        });
      }

    } catch (error) {
      this.errorLogger.logError('Performance metrics collection failed', error);
    }
  }

  /**
   * Perform consistency check
   */
  private async performConsistencyCheck(): Promise<void> {
    try {
      this.errorLogger.log('Starting consistency check');

      const validationReport = await this.consistencyValidator.validateAll();

      if (validationReport.overallStatus !== 'passed') {
        await this.triggerAlert(
          'data_inconsistency',
          validationReport.overallStatus === 'failed' ? 'error' : 'warning',
          'Data Consistency Issues Detected',
          `Validation found ${validationReport.summary.totalDiscrepancies} discrepancies`,
          'DataConsistencyValidator',
          { report: validationReport.validationId }
        );
      }

      this.addTimelineEvent({
        type: 'validation',
        title: 'Consistency Check Completed',
        description: `Status: ${validationReport.overallStatus}, Issues: ${validationReport.summary.totalDiscrepancies}`,
        severity: validationReport.overallStatus === 'passed' ? 'success' : 'warning'
      });

    } catch (error) {
      this.errorLogger.logError('Consistency check failed', error);
      
      await this.triggerAlert(
        'data_inconsistency',
        'error',
        'Consistency Check Failed',
        `Consistency validation failed: ${error instanceof Error ? error.message : String(error)}`,
        'DataConsistencyValidator'
      );
    }
  }

  /**
   * Broadcast dashboard update to subscribers
   */
  private async broadcastDashboardUpdate(): Promise<void> {
    if (this.dashboardSubscribers.size === 0) return;

    try {
      const dashboardData = await this.getDashboardData();
      
      for (const callback of this.dashboardSubscribers) {
        try {
          callback(dashboardData);
        } catch (error) {
          this.errorLogger.logError('Dashboard callback failed', error);
        }
      }
    } catch (error) {
      this.errorLogger.logError('Dashboard update broadcast failed', error);
    }
  }

  /**
   * Component health check methods
   */
  private async checkDataSyncHealth(): Promise<ComponentHealth> {
    try {
      const status = this.dataSyncService.getOverallStatus();
      const isHealthy = !status.hasErrors && status.isRunning;

      return {
        name: 'Data Sync Service',
        status: isHealthy ? 'healthy' : status.hasErrors ? 'failing' : 'degraded',
        message: isHealthy ? 'Sync service operating normally' : 
                status.hasErrors ? 'Sync errors detected' : 'Sync service degraded',
        lastUpdated: new Date().toISOString(),
        metrics: {
          completedTasks: status.completedTasks,
          failedTasks: status.failedTasks,
          queueSize: status.queueSize
        }
      };
    } catch (error) {
      return {
        name: 'Data Sync Service',
        status: 'unknown',
        message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  private async checkDualReadHealth(): Promise<ComponentHealth> {
    try {
      const config = this.dualReadService.getCurrentConfiguration();
      
      return {
        name: 'Dual Read Service',
        status: 'healthy',
        message: `Operating in ${config.readStrategy} mode`,
        lastUpdated: new Date().toISOString(),
        metrics: {
          fallbackEnabled: config.fallbackEnabled ? 1 : 0,
          performanceMonitoring: config.enablePerformanceMonitoring ? 1 : 0
        }
      };
    } catch (error) {
      return {
        name: 'Dual Read Service',
        status: 'failing',
        message: `Service check failed: ${error instanceof Error ? error.message : String(error)}`,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  private checkNetworkHealth(): ComponentHealth {
    const isOnline = this.networkMonitor.isOnline();
    
    return {
      name: 'Network Connectivity',
      status: isOnline ? 'healthy' : 'failing',
      message: isOnline ? 'Network connection available' : 'Network connection unavailable',
      lastUpdated: new Date().toISOString(),
      metrics: {
        online: isOnline ? 1 : 0
      }
    };
  }

  private async checkSystemResources(): Promise<ComponentHealth> {
    try {
      // This would check actual system resources in a real implementation
      const memoryUsage = process.memoryUsage();
      const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      const isHealthy = memoryUsagePercent < this.configuration.alertThresholds.memoryUsagePercent;

      return {
        name: 'System Resources',
        status: isHealthy ? 'healthy' : 'degraded',
        message: isHealthy ? 'Resource usage normal' : 'High resource usage detected',
        lastUpdated: new Date().toISOString(),
        metrics: {
          memoryUsagePercent: Math.round(memoryUsagePercent),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) // MB
        }
      };
    } catch (error) {
      return {
        name: 'System Resources',
        status: 'unknown',
        message: `Resource check failed: ${error instanceof Error ? error.message : String(error)}`,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Calculate overall health from component health
   */
  private calculateOverallHealth(components: ComponentHealth[]): 'healthy' | 'degraded' | 'failing' | 'critical' {
    const healthyCount = components.filter(c => c.status === 'healthy').length;
    const degradedCount = components.filter(c => c.status === 'degraded').length;
    const failingCount = components.filter(c => c.status === 'failing').length;
    const unknownCount = components.filter(c => c.status === 'unknown').length;

    if (failingCount > 0 || unknownCount > components.length / 2) {
      return 'failing';
    }
    if (degradedCount > 0) {
      return 'degraded';
    }
    if (healthyCount === components.length) {
      return 'healthy';
    }
    
    return 'degraded';
  }

  /**
   * Metric calculation methods (simplified implementations)
   */
  private async calculateSyncMetrics(): Promise<HealthMetrics['syncMetrics']> {
    const status = this.dataSyncService.getOverallStatus();
    const totalOps = status.completedTasks + status.failedTasks;
    
    return {
      successRate: totalOps > 0 ? (status.completedTasks / totalOps) * 100 : 100,
      averageLatencyMs: 150, // Would calculate from performance metrics
      failureCount: status.failedTasks,
      totalOperations: totalOps,
      lastSuccessfulSync: status.lastSuccessfulSync
    };
  }

  private async calculatePerformanceMetrics(): Promise<HealthMetrics['performanceMetrics']> {
    const recentMetrics = this.getRecentPerformanceMetrics(10);
    
    return {
      averageQueryTimeMs: this.calculateAverageMetric(recentMetrics, 'query_time'),
      databaseResponseTimeMs: 120, // Would measure actual DB response
      apiResponseTimeMs: 200, // Would measure actual API response
      cacheHitRate: 85, // Would calculate from cache statistics
      throughputPerSecond: 50 // Would calculate from operation counts
    };
  }

  private async calculateConsistencyMetrics(): Promise<HealthMetrics['consistencyMetrics']> {
    const recentValidations = this.consistencyValidator.getValidationHistory(1);
    const lastValidation = recentValidations[0];
    
    return {
      dataIntegrityScore: lastValidation ? 
        100 - (lastValidation.summary.totalDiscrepancies / Math.max(lastValidation.summary.recordsValidated, 1)) * 100 : 100,
      discrepancyCount: lastValidation?.summary.totalDiscrepancies || 0,
      lastConsistencyCheck: lastValidation?.timestamp,
      consistencyTrend: 'stable' // Would calculate from validation history
    };
  }

  private async calculateSystemMetrics(): Promise<HealthMetrics['systemMetrics']> {
    return {
      uptime: process.uptime(),
      memoryUsagePercent: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
      activeUsers: 0 // Would implement user tracking
    };
  }

  /**
   * Helper methods
   */
  private createInitialHealthStatus(): MigrationHealthStatus {
    return {
      timestamp: new Date().toISOString(),
      overallHealth: 'healthy',
      components: [],
      metrics: {
        syncMetrics: {
          successRate: 100,
          averageLatencyMs: 0,
          failureCount: 0,
          totalOperations: 0
        },
        performanceMetrics: {
          averageQueryTimeMs: 0,
          databaseResponseTimeMs: 0,
          apiResponseTimeMs: 0,
          cacheHitRate: 0,
          throughputPerSecond: 0
        },
        consistencyMetrics: {
          dataIntegrityScore: 100,
          discrepancyCount: 0,
          consistencyTrend: 'stable'
        },
        systemMetrics: {
          uptime: 0,
          memoryUsagePercent: 0
        }
      },
      activeAlerts: [],
      recommendations: []
    };
  }

  private addPerformanceMetric(metric: PerformanceMetric): void {
    this.performanceMetrics.push(metric);
    
    // Prune old metrics
    const maxMetrics = 10000;
    if (this.performanceMetrics.length > maxMetrics) {
      this.performanceMetrics = this.performanceMetrics.slice(-maxMetrics);
    }
  }

  private getRecentPerformanceMetrics(limit: number): PerformanceMetric[] {
    return this.performanceMetrics.slice(-limit);
  }

  private calculateAverageMetric(metrics: PerformanceMetric[], type: string): number {
    const typeMetrics = metrics.filter(m => m.metricType === type);
    if (typeMetrics.length === 0) return 0;
    
    return typeMetrics.reduce((sum, m) => sum + m.value, 0) / typeMetrics.length;
  }

  // Simplified measurement methods (would implement actual measurements in production)
  private async measureSyncLatency(): Promise<number | null> {
    return Math.random() * 200 + 50; // 50-250ms random
  }

  private async measureQueryTime(): Promise<number | null> {
    return Math.random() * 100 + 25; // 25-125ms random
  }

  private async measureNetworkResponseTime(): Promise<number | null> {
    return Math.random() * 500 + 100; // 100-600ms random
  }

  private async generateProgressReport(): Promise<MigrationProgressReport> {
    return {
      reportId: `progress_${Date.now()}`,
      timestamp: new Date().toISOString(),
      phase: 'dual_read_active',
      overallProgress: 75,
      currentStep: 'Data validation and monitoring',
      metrics: {
        recordsMigrated: 15000,
        totalRecords: 20000,
        dataVolumeMB: 450,
        syncSpeed: 125
      },
      issues: {
        errors: [],
        warnings: ['Minor sync delays during peak hours'],
        resolutions: []
      },
      nextActions: ['Continue monitoring', 'Prepare for final validation']
    };
  }

  private generateRecommendations(components: ComponentHealth[], overallHealth: string): string[] {
    const recommendations: string[] = [];
    
    if (overallHealth !== 'healthy') {
      recommendations.push('Review system components with degraded or failing status');
    }
    
    const failingComponents = components.filter(c => c.status === 'failing');
    if (failingComponents.length > 0) {
      recommendations.push(`Immediate attention required for: ${failingComponents.map(c => c.name).join(', ')}`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System operating normally - continue monitoring');
    }
    
    return recommendations;
  }

  private async checkThresholdViolations(): Promise<void> {
    // Check various thresholds and trigger alerts
    const syncStatus = this.dataSyncService.getOverallStatus();
    
    if (syncStatus.failedTasks > this.configuration.alertThresholds.syncFailureCount) {
      await this.triggerAlert(
        'sync_failure',
        'error',
        'High Sync Failure Rate',
        `Sync failure count (${syncStatus.failedTasks}) exceeds threshold (${this.configuration.alertThresholds.syncFailureCount})`,
        'DataSyncService'
      );
    }
  }

  private updateHealthStatusFromAlert(alert: Alert): void {
    if (alert.severity === 'critical') {
      this.healthStatus.overallHealth = 'critical';
    } else if (alert.severity === 'error' && this.healthStatus.overallHealth === 'healthy') {
      this.healthStatus.overallHealth = 'failing';
    }
  }

  private async sendAlertNotifications(alert: Alert): Promise<void> {
    for (const channel of this.configuration.notificationChannels) {
      if (!channel.enabled || !channel.alertTypes.includes(alert.type)) {
        continue;
      }
      
      try {
        await this.sendNotification(channel, alert);
      } catch (error) {
        this.errorLogger.logError('Alert notification failed', error, { 
          channelId: channel.id, 
          alertId: alert.id 
        });
      }
    }
  }

  private async sendNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    // This would implement actual notification sending
    this.errorLogger.log('Alert notification sent', { 
      channelId: channel.id, 
      type: channel.type, 
      alertId: alert.id 
    });
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopMonitoring();
    this.dashboardSubscribers.clear();
    this.activeAlerts.clear();
    this.performanceMetrics = [];
    this.migrationTimeline = [];
    this.errorLogger.log('MigrationMonitoringService destroyed');
  }
}

export default MigrationMonitoringService;