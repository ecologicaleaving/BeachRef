/**
 * @fileoverview Sync Monitoring and Health Check Module
 * Provides comprehensive monitoring, metrics collection, and health checks for data synchronization
 */

export interface SyncMetrics {
  syncId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: string[];
  performanceMetrics: {
    averageRecordsPerSecond: number;
    peakMemoryUsage?: number;
    networkLatency: number;
    databaseLatency: number;
  };
}

export interface HealthCheckResult {
  service: string;
  healthy: boolean;
  status: 'operational' | 'degraded' | 'down';
  responseTime: number;
  details: string;
  checks: {
    visAdapter: boolean;
    database: boolean;
    authentication: boolean;
    diskSpace?: boolean;
    memory?: boolean;
  };
}

export interface AlertConfig {
  enabled: boolean;
  syncFailureThreshold: number;
  responseTimeThreshold: number;
  errorRateThreshold: number;
  webhookUrl?: string;
  emailRecipients?: string[];
}

export class SyncMonitor {
  private supabaseClient: any;
  private metrics: Map<string, SyncMetrics> = new Map();
  private alertConfig: AlertConfig;

  constructor(supabaseClient: any, alertConfig: AlertConfig = { enabled: false, syncFailureThreshold: 3, responseTimeThreshold: 30000, errorRateThreshold: 0.1 }) {
    this.supabaseClient = supabaseClient;
    this.alertConfig = alertConfig;
  }

  /**
   * Start monitoring a sync operation
   */
  startSync(syncId: string): void {
    const metrics: SyncMetrics = {
      syncId,
      startTime: new Date(),
      status: 'running',
      recordsProcessed: 0,
      recordsInserted: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      errors: [],
      performanceMetrics: {
        averageRecordsPerSecond: 0,
        networkLatency: 0,
        databaseLatency: 0,
      },
    };

    this.metrics.set(syncId, metrics);
    console.log(`Started monitoring sync: ${syncId}`);
  }

  /**
   * Update sync progress
   */
  updateProgress(syncId: string, update: {
    recordsProcessed?: number;
    recordsInserted?: number;
    recordsUpdated?: number;
    recordsSkipped?: number;
    errors?: string[];
  }): void {
    const metrics = this.metrics.get(syncId);
    if (!metrics) {
      console.warn(`No metrics found for sync: ${syncId}`);
      return;
    }

    if (update.recordsProcessed !== undefined) metrics.recordsProcessed = update.recordsProcessed;
    if (update.recordsInserted !== undefined) metrics.recordsInserted = update.recordsInserted;
    if (update.recordsUpdated !== undefined) metrics.recordsUpdated = update.recordsUpdated;
    if (update.recordsSkipped !== undefined) metrics.recordsSkipped = update.recordsSkipped;
    if (update.errors) metrics.errors.push(...update.errors);

    // Update performance metrics
    const elapsed = Date.now() - metrics.startTime.getTime();
    if (elapsed > 0 && metrics.recordsProcessed > 0) {
      metrics.performanceMetrics.averageRecordsPerSecond = metrics.recordsProcessed / (elapsed / 1000);
    }

    this.metrics.set(syncId, metrics);
  }

  /**
   * Complete sync monitoring
   */
  completeSync(syncId: string, success: boolean, finalErrors: string[] = []): SyncMetrics | null {
    const metrics = this.metrics.get(syncId);
    if (!metrics) {
      console.warn(`No metrics found for sync: ${syncId}`);
      return null;
    }

    metrics.endTime = new Date();
    metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime();
    metrics.status = success ? 'completed' : 'failed';
    metrics.errors.push(...finalErrors);

    // Final performance calculations
    if (metrics.duration > 0 && metrics.recordsProcessed > 0) {
      metrics.performanceMetrics.averageRecordsPerSecond = metrics.recordsProcessed / (metrics.duration / 1000);
    }

    console.log(`Completed monitoring sync: ${syncId} - Status: ${metrics.status}, Duration: ${metrics.duration}ms, Records: ${metrics.recordsProcessed}`);

    // Store metrics in database for historical analysis
    this.storeSyncMetrics(metrics);

    // Check for alerts
    if (this.alertConfig.enabled) {
      this.checkAlerts(metrics);
    }

    return metrics;
  }

  /**
   * Get current sync metrics
   */
  getMetrics(syncId: string): SyncMetrics | null {
    return this.metrics.get(syncId) || null;
  }

  /**
   * Get all active sync operations
   */
  getActiveSyncs(): SyncMetrics[] {
    return Array.from(this.metrics.values()).filter(m => m.status === 'running');
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    const result: HealthCheckResult = {
      service: 'tournament-data-migration',
      healthy: true,
      status: 'operational',
      responseTime: 0,
      details: '',
      checks: {
        visAdapter: false,
        database: false,
        authentication: false,
      },
    };

    const checkResults: string[] = [];

    try {
      // Test VIS Adapter connectivity
      const visAdapterStart = Date.now();
      const visAdapterUrl = Deno.env.get('VIS_ADAPTER_URL') || 
        `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/functions/v1/vis-adapter`;
      
      try {
        const response = await fetch(`${visAdapterUrl}/health`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          signal: AbortSignal.timeout(5000),
        });
        
        result.checks.visAdapter = response.ok;
        if (response.ok) {
          checkResults.push('VIS Adapter: OK');
        } else {
          checkResults.push(`VIS Adapter: Failed (${response.status})`);
          result.healthy = false;
        }
      } catch (error) {
        result.checks.visAdapter = false;
        checkResults.push(`VIS Adapter: Error (${error.message})`);
        result.healthy = false;
      }

      // Test database connectivity
      try {
        const { error: dbError } = await this.supabaseClient
          .from('sync_status')
          .select('id')
          .limit(1);
        
        result.checks.database = !dbError;
        if (!dbError) {
          checkResults.push('Database: OK');
        } else {
          checkResults.push(`Database: Error (${dbError.message})`);
          result.healthy = false;
        }
      } catch (error) {
        result.checks.database = false;
        checkResults.push(`Database: Error (${error.message})`);
        result.healthy = false;
      }

      // Test authentication
      try {
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        result.checks.authentication = !!serviceKey && serviceKey.length > 50;
        
        if (result.checks.authentication) {
          checkResults.push('Authentication: OK');
        } else {
          checkResults.push('Authentication: Invalid service key');
          result.healthy = false;
        }
      } catch (error) {
        result.checks.authentication = false;
        checkResults.push(`Authentication: Error (${error.message})`);
        result.healthy = false;
      }

      // Check system resources (optional)
      try {
        const memInfo = await this.getMemoryUsage();
        result.checks.memory = memInfo.usagePercent < 90;
        
        if (result.checks.memory) {
          checkResults.push(`Memory: OK (${memInfo.usagePercent.toFixed(1)}%)`);
        } else {
          checkResults.push(`Memory: High usage (${memInfo.usagePercent.toFixed(1)}%)`);
          result.status = 'degraded';
        }
      } catch (error) {
        checkResults.push('Memory: Unable to check');
      }

    } catch (error) {
      result.healthy = false;
      result.status = 'down';
      checkResults.push(`System Error: ${error.message}`);
    }

    result.responseTime = Date.now() - startTime;
    result.details = checkResults.join(', ');
    
    if (!result.healthy) {
      result.status = 'down';
    } else if (result.status !== 'degraded') {
      result.status = 'operational';
    }

    return result;
  }

  /**
   * Get sync performance statistics
   */
  async getSyncStatistics(days: number = 7): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    averageDuration: number;
    averageRecordsPerSync: number;
    errorRate: number;
    trendsOverTime: Array<{
      date: string;
      syncs: number;
      successRate: number;
      avgDuration: number;
    }>;
  }> {
    try {
      // Get sync statistics from database
      const { data: stats, error } = await this.supabaseClient
        .rpc('get_sync_performance_metrics', { days_back: days });

      if (error) {
        throw new Error(`Failed to get sync statistics: ${error.message}`);
      }

      const totalSyncs = stats?.reduce((sum: number, day: any) => sum + day.total_syncs, 0) || 0;
      const successfulSyncs = stats?.reduce((sum: number, day: any) => sum + day.successful_syncs, 0) || 0;
      const failedSyncs = stats?.reduce((sum: number, day: any) => sum + day.failed_syncs, 0) || 0;
      
      const averageDuration = stats?.length > 0 
        ? stats.reduce((sum: number, day: any) => sum + (day.average_duration?.totalMilliseconds || 0), 0) / stats.length 
        : 0;

      const averageRecordsPerSync = stats?.length > 0
        ? stats.reduce((sum: number, day: any) => sum + day.total_records_processed, 0) / totalSyncs
        : 0;

      const errorRate = totalSyncs > 0 ? failedSyncs / totalSyncs : 0;

      const trendsOverTime = stats?.map((day: any) => ({
        date: day.sync_date,
        syncs: day.total_syncs,
        successRate: day.success_rate / 100,
        avgDuration: day.average_duration?.totalMilliseconds || 0,
      })) || [];

      return {
        totalSyncs,
        successfulSyncs,
        failedSyncs,
        averageDuration,
        averageRecordsPerSync,
        errorRate,
        trendsOverTime,
      };

    } catch (error) {
      console.error('Error getting sync statistics:', error);
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        averageDuration: 0,
        averageRecordsPerSync: 0,
        errorRate: 0,
        trendsOverTime: [],
      };
    }
  }

  /**
   * Clean up old monitoring data
   */
  async cleanupOldData(daysToKeep: number = 30): Promise<{ deletedRecords: number; errors: string[] }> {
    const errors: string[] = [];
    let deletedRecords = 0;

    try {
      // Clean up old sync status records
      const { data, error } = await this.supabaseClient
        .rpc('cleanup_old_sync_status', { days_to_keep: daysToKeep });

      if (error) {
        errors.push(`Failed to cleanup sync status: ${error.message}`);
      } else if (data?.[0]) {
        deletedRecords += data[0].deleted_count || 0;
      }

      // Clean up in-memory metrics older than 24 hours
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      for (const [syncId, metrics] of this.metrics.entries()) {
        if (metrics.startTime.getTime() < oneDayAgo && metrics.status !== 'running') {
          this.metrics.delete(syncId);
        }
      }

    } catch (error) {
      errors.push(`Cleanup error: ${error.message}`);
    }

    return { deletedRecords, errors };
  }

  /**
   * Store sync metrics in database for historical analysis
   */
  private async storeSyncMetrics(metrics: SyncMetrics): Promise<void> {
    try {
      const { error } = await this.supabaseClient
        .from('sync_status')
        .upsert({
          sync_id: metrics.syncId,
          status: metrics.status,
          start_time: metrics.startTime.toISOString(),
          end_time: metrics.endTime?.toISOString(),
          records_processed: metrics.recordsProcessed + metrics.recordsInserted + metrics.recordsUpdated + metrics.recordsSkipped,
          errors: metrics.errors,
          last_error: metrics.errors[metrics.errors.length - 1] || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'sync_id'
        });

      if (error) {
        console.error('Failed to store sync metrics:', error);
      }
    } catch (error) {
      console.error('Error storing sync metrics:', error);
    }
  }

  /**
   * Check for alert conditions and trigger notifications
   */
  private async checkAlerts(metrics: SyncMetrics): Promise<void> {
    const alerts: string[] = [];

    // Check sync failure
    if (metrics.status === 'failed') {
      const recentFailures = await this.getRecentFailureCount();
      if (recentFailures >= this.alertConfig.syncFailureThreshold) {
        alerts.push(`Sync failure threshold exceeded: ${recentFailures} failures`);
      }
    }

    // Check response time
    if (metrics.duration && metrics.duration > this.alertConfig.responseTimeThreshold) {
      alerts.push(`Sync duration exceeded threshold: ${metrics.duration}ms > ${this.alertConfig.responseTimeThreshold}ms`);
    }

    // Check error rate
    const errorRate = metrics.errors.length / Math.max(metrics.recordsProcessed, 1);
    if (errorRate > this.alertConfig.errorRateThreshold) {
      alerts.push(`Error rate exceeded threshold: ${(errorRate * 100).toFixed(2)}% > ${(this.alertConfig.errorRateThreshold * 100)}%`);
    }

    // Send alerts if any conditions are met
    if (alerts.length > 0) {
      await this.sendAlerts(metrics.syncId, alerts);
    }
  }

  /**
   * Get count of recent sync failures
   */
  private async getRecentFailureCount(hoursBack: number = 24): Promise<number> {
    try {
      const { count, error } = await this.supabaseClient
        .from('sync_status')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('start_time', new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('Error getting recent failure count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getRecentFailureCount:', error);
      return 0;
    }
  }

  /**
   * Send alert notifications
   */
  private async sendAlerts(syncId: string, alerts: string[]): Promise<void> {
    const alertMessage = `Sync Alert - ${syncId}\n\n${alerts.join('\n')}`;
    
    console.warn('SYNC ALERT:', alertMessage);

    // Send webhook notification if configured
    if (this.alertConfig.webhookUrl) {
      try {
        await fetch(this.alertConfig.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            syncId,
            alerts,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (error) {
        console.error('Failed to send webhook alert:', error);
      }
    }

    // Email notifications would be implemented here if needed
    // This would require integration with an email service
  }

  /**
   * Get memory usage information
   */
  private async getMemoryUsage(): Promise<{ used: number; total: number; usagePercent: number }> {
    try {
      // In Deno, we can use performance API to get memory info
      const memInfo = (performance as any).memory;
      
      if (memInfo) {
        const used = memInfo.usedJSHeapSize;
        const total = memInfo.totalJSHeapSize;
        const usagePercent = (used / total) * 100;
        
        return { used, total, usagePercent };
      }
      
      // Fallback for environments without detailed memory info
      return { used: 0, total: 0, usagePercent: 0 };
    } catch (error) {
      console.warn('Unable to get memory usage:', error);
      return { used: 0, total: 0, usagePercent: 0 };
    }
  }
}

/**
 * Performance profiler for detailed sync operation analysis
 */
export class SyncProfiler {
  private profiles: Map<string, { phase: string; startTime: number; endTime?: number }[]> = new Map();

  /**
   * Start profiling a sync operation
   */
  startProfiling(syncId: string): void {
    this.profiles.set(syncId, []);
  }

  /**
   * Record start of a sync phase
   */
  startPhase(syncId: string, phase: string): void {
    const profile = this.profiles.get(syncId);
    if (!profile) return;

    profile.push({
      phase,
      startTime: Date.now(),
    });
  }

  /**
   * Record end of a sync phase
   */
  endPhase(syncId: string, phase: string): void {
    const profile = this.profiles.get(syncId);
    if (!profile) return;

    const phaseRecord = profile.find(p => p.phase === phase && !p.endTime);
    if (phaseRecord) {
      phaseRecord.endTime = Date.now();
    }
  }

  /**
   * Get profiling results
   */
  getProfile(syncId: string): Array<{ phase: string; duration: number }> {
    const profile = this.profiles.get(syncId);
    if (!profile) return [];

    return profile
      .filter(p => p.endTime)
      .map(p => ({
        phase: p.phase,
        duration: p.endTime! - p.startTime,
      }));
  }

  /**
   * Clear profiling data
   */
  clearProfile(syncId: string): void {
    this.profiles.delete(syncId);
  }
}