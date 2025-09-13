/**
 * Analytics Service
 * Provides backend analytics data aggregation, validation, and cleanup
 * Story 4.1: Analytics Data Collection Infrastructure
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ErrorLogger } from './ErrorLogger';

/**
 * Analytics aggregation result interface
 */
export interface AnalyticsAggregation {
  referee_id: string;
  date: string;
  total_assignments: number;
  first_referee_count: number;
  second_referee_count: number;
  challenge_referee_count: number;
  tournaments_worked: string[];
  performance_score?: number;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  validation_type: string;
  issue_count: number;
  description: string;
}

/**
 * Cleanup result interface
 */
export interface CleanupResult {
  cleanup_type: string;
  records_deleted: number;
}

/**
 * Analytics configuration interface
 */
export interface AnalyticsServiceConfig {
  enableBackgroundAggregation?: boolean;
  enableDataValidation?: boolean;
  enablePerformanceMonitoring?: boolean;
  aggregationBatchSize?: number;
  maxRetryAttempts?: number;
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  aggregation_time_ms: number;
  records_processed: number;
  validation_time_ms?: number;
  cleanup_time_ms?: number;
  errors_encountered: number;
}

export class AnalyticsService {
  private static instance: AnalyticsService | null = null;
  private supabase: SupabaseClient;
  private errorLogger: ErrorLogger;
  private config: AnalyticsServiceConfig;

  private constructor(config: AnalyticsServiceConfig = {}) {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[AnalyticsService] Supabase credentials not available, analytics will be disabled');
      // Create a mock supabase client that doesn't actually connect
      this.supabase = null as any;
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
    this.errorLogger = ErrorLogger.getInstance();
    
    this.config = {
      enableBackgroundAggregation: true,
      enableDataValidation: true,
      enablePerformanceMonitoring: true,
      aggregationBatchSize: 100,
      maxRetryAttempts: 3,
      ...config
    };
  }

  /**
   * Get the singleton instance of AnalyticsService
   */
  public static getInstance(config?: AnalyticsServiceConfig): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService(config);
    }
    return AnalyticsService.instance;
  }

  /**
   * Aggregate referee analytics for a specific date range
   * Enhanced with memory optimization and batch processing
   */
  async aggregateRefereeAnalytics(
    startDate: string,
    endDate: string,
    refereeIds?: string[]
  ): Promise<AnalyticsAggregation[]> {
    if (!this.supabase) {
      console.warn('[AnalyticsService] Supabase not available, returning empty analytics');
      return [];
    }

    const startTime = performance.now();
    let recordsProcessed = 0;
    let errorsEncountered = 0;

    try {
      // Enhanced query with better field selection for performance
      let query = this.supabase
        .from('match_referees')
        .select(`
          referee_id,
          role,
          matches!inner(
            id,
            tournament_code,
            utc_datetime
          )
        `)
        .gte('matches.utc_datetime', startDate)
        .lte('matches.utc_datetime', endDate);

      // Optimize query for large referee sets
      if (refereeIds && refereeIds.length > 0) {
        // Process in batches for large referee ID lists to prevent query size limits
        if (refereeIds.length > this.config.aggregationBatchSize!) {
          const aggregationPromises = [];
          for (let i = 0; i < refereeIds.length; i += this.config.aggregationBatchSize!) {
            const batch = refereeIds.slice(i, i + this.config.aggregationBatchSize!);
            aggregationPromises.push(this.aggregateRefereeAnalytics(startDate, endDate, batch));
          }
          const batchResults = await Promise.all(aggregationPromises);
          return batchResults.flat();
        }
        query = query.in('referee_id', refereeIds);
      }

      const { data: assignmentData, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch assignment data: ${error.message}`);
      }

      if (!assignmentData) {
        return [];
      }

      recordsProcessed = assignmentData.length;

      // Group assignments by referee and date with optimized role counting
      const aggregationMap = new Map<string, AnalyticsAggregation>();

      for (const assignment of assignmentData) {
        try {
          const refereeId = assignment.referee_id;
          const match = assignment.matches;
          const role = assignment.role; // Now available from enhanced query
          const date = new Date(match.utc_datetime).toISOString().split('T')[0];
          const key = `${refereeId}-${date}`;

          if (!aggregationMap.has(key)) {
            aggregationMap.set(key, {
              referee_id: refereeId,
              date,
              total_assignments: 0,
              first_referee_count: 0,
              second_referee_count: 0,
              challenge_referee_count: 0,
              tournaments_worked: []
            });
          }

          const agg = aggregationMap.get(key)!;
          agg.total_assignments++;

          // Count role-specific assignments directly from query data
          switch (role) {
            case 'FIRST':
              agg.first_referee_count++;
              break;
            case 'SECOND':
              agg.second_referee_count++;
              break;
            case 'CHALLENGE':
              agg.challenge_referee_count++;
              break;
          }
          
          // Add tournament to list if not already present
          if (!agg.tournaments_worked.includes(match.tournament_code)) {
            agg.tournaments_worked.push(match.tournament_code);
          }
        } catch (assignmentError) {
          errorsEncountered++;
          await this.errorLogger.logError({
            entity_type: 'analytics_aggregation',
            error: assignmentError as Error,
            context: { assignment, operation: 'process_assignment' }
          });
        }
      }

      // Role counts are now calculated directly from the query data
      // This eliminates the need for additional database calls per referee
      const aggregations = Array.from(aggregationMap.values());

      // Record performance metrics
      if (this.config.enablePerformanceMonitoring) {
        const endTime = performance.now();
        const metrics: PerformanceMetrics = {
          aggregation_time_ms: endTime - startTime,
          records_processed: recordsProcessed,
          errors_encountered: errorsEncountered
        };

        await this.recordPerformanceMetrics('referee_aggregation', metrics);
      }

      return aggregations;
    } catch (error) {
      await this.errorLogger.logError({
        entity_type: 'analytics_service',
        error: error as Error,
        context: { 
          operation: 'aggregate_referee_analytics',
          startDate,
          endDate,
          refereeIds 
        }
      });
      throw error;
    }
  }

  /**
   * Store aggregated analytics data
   */
  async storeAggregatedData(aggregations: AnalyticsAggregation[]): Promise<void> {
    if (aggregations.length === 0) return;

    try {
      // Upsert aggregated data
      const { error } = await this.supabase
        .from('referee_analytics')
        .upsert(
          aggregations.map(agg => ({
            referee_id: parseInt(agg.referee_id),
            date: agg.date,
            total_assignments: agg.total_assignments,
            first_referee_count: agg.first_referee_count,
            second_referee_count: agg.second_referee_count,
            challenge_referee_count: agg.challenge_referee_count,
            tournaments_worked: agg.tournaments_worked,
            performance_score: agg.performance_score
          })),
          { 
            onConflict: 'referee_id,date',
            ignoreDuplicates: false 
          }
        );

      if (error) {
        throw new Error(`Failed to store aggregated data: ${error.message}`);
      }
    } catch (error) {
      await this.errorLogger.logError({
        entity_type: 'analytics_service',
        error: error as Error,
        context: { 
          operation: 'store_aggregated_data',
          recordCount: aggregations.length 
        }
      });
      throw error;
    }
  }

  /**
   * Run data validation checks
   */
  async validateAnalyticsData(): Promise<ValidationResult[]> {
    const startTime = performance.now();

    try {
      const { data: validationResults, error } = await this.supabase.rpc('validate_analytics_data');

      if (error) {
        throw new Error(`Data validation failed: ${error.message}`);
      }

      // Record performance metrics
      if (this.config.enablePerformanceMonitoring) {
        const endTime = performance.now();
        const metrics: PerformanceMetrics = {
          aggregation_time_ms: 0,
          records_processed: 0,
          validation_time_ms: endTime - startTime,
          errors_encountered: 0
        };

        await this.recordPerformanceMetrics('data_validation', metrics);
      }

      return validationResults || [];
    } catch (error) {
      await this.errorLogger.logError({
        entity_type: 'analytics_service',
        error: error as Error,
        context: { operation: 'validate_analytics_data' }
      });
      throw error;
    }
  }

  /**
   * Clean up old analytics data based on retention policy
   */
  async cleanupOldData(): Promise<CleanupResult[]> {
    const startTime = performance.now();

    try {
      const { data: cleanupResults, error } = await this.supabase.rpc('cleanup_old_analytics_data');

      if (error) {
        throw new Error(`Data cleanup failed: ${error.message}`);
      }

      // Record performance metrics
      if (this.config.enablePerformanceMonitoring) {
        const endTime = performance.now();
        const totalDeleted = cleanupResults?.reduce((sum: number, result: any) => 
          sum + (result.records_deleted || 0), 0) || 0;

        const metrics: PerformanceMetrics = {
          aggregation_time_ms: 0,
          records_processed: totalDeleted,
          cleanup_time_ms: endTime - startTime,
          errors_encountered: 0
        };

        await this.recordPerformanceMetrics('data_cleanup', metrics);
      }

      return cleanupResults || [];
    } catch (error) {
      await this.errorLogger.logError({
        entity_type: 'analytics_service',
        error: error as Error,
        context: { operation: 'cleanup_old_data' }
      });
      throw error;
    }
  }

  /**
   * Run daily analytics aggregation process
   */
  async runDailyAggregation(date?: string): Promise<void> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const startDate = `${targetDate} 00:00:00`;
    const endDate = `${targetDate} 23:59:59`;

    try {
      // Run aggregation for the target date
      const aggregations = await this.aggregateRefereeAnalytics(startDate, endDate);
      
      // Store the aggregated data
      await this.storeAggregatedData(aggregations);
      
      // Run validation if enabled
      if (this.config.enableDataValidation) {
        const validationResults = await this.validateAnalyticsData();
        
        // Log any validation issues
        for (const result of validationResults) {
          if (result.issue_count > 0) {
            await this.errorLogger.logError({
              entity_type: 'analytics_validation',
              error: new Error(`Validation issue: ${result.description}`),
              context: { 
                validation_type: result.validation_type,
                issue_count: result.issue_count,
                date: targetDate 
              }
            });
          }
        }
      }

    } catch (error) {
      await this.errorLogger.logError({
        entity_type: 'analytics_service',
        error: error as Error,
        context: { 
          operation: 'run_daily_aggregation',
          targetDate 
        }
      });
      throw error;
    }
  }

  /**
   * Calculate performance score for referee based on assignments and completion
   */
  async calculatePerformanceScore(refereeId: string, dateRange: { start: string; end: string }): Promise<number> {
    try {
      // Get referee analytics data for the date range
      const { data: analyticsData, error } = await this.supabase
        .from('referee_analytics')
        .select('*')
        .eq('referee_id', refereeId)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);

      if (error) {
        throw new Error(`Failed to fetch analytics data: ${error.message}`);
      }

      if (!analyticsData || analyticsData.length === 0) {
        return 0;
      }

      // Calculate performance score based on various factors
      let totalScore = 0;
      let weights = 0;

      for (const record of analyticsData) {
        let dayScore = 0;
        let dayWeight = 0;

        // Factor 1: Assignment completion (base score)
        const assignmentScore = Math.min(record.total_assignments * 10, 100);
        dayScore += assignmentScore * 0.4; // 40% weight
        dayWeight += 0.4;

        // Factor 2: Role diversity (higher scores for varied roles)
        const roleCount = [
          record.first_referee_count > 0 ? 1 : 0,
          record.second_referee_count > 0 ? 1 : 0,
          record.challenge_referee_count > 0 ? 1 : 0
        ].reduce((sum, val) => sum + val, 0);
        
        const diversityScore = roleCount * 33.33; // Max 100 for all three roles
        dayScore += diversityScore * 0.3; // 30% weight
        dayWeight += 0.3;

        // Factor 3: Tournament coverage (more tournaments = higher score)
        const tournamentScore = Math.min(record.tournaments_worked.length * 25, 100);
        dayScore += tournamentScore * 0.3; // 30% weight
        dayWeight += 0.3;

        totalScore += dayScore;
        weights += dayWeight;
      }

      // Calculate final weighted average
      const finalScore = weights > 0 ? totalScore / weights : 0;
      return Math.round(Math.min(Math.max(finalScore, 0), 100)); // Clamp between 0-100
    } catch (error) {
      await this.errorLogger.logError({
        entity_type: 'analytics_service',
        error: error as Error,
        context: { 
          operation: 'calculate_performance_score',
          refereeId,
          dateRange 
        }
      });
      throw error;
    }
  }

  /**
   * Record performance metrics for analytics operations
   */
  private async recordPerformanceMetrics(operation: string, metrics: PerformanceMetrics): Promise<void> {
    try {
      await this.supabase
        .from('analytics_events')
        .insert({
          event_type: 'performance_metric',
          event_data: {
            operation,
            ...metrics,
            timestamp: new Date().toISOString()
          }
        });
    } catch (error) {
      // Don't throw - performance metrics are not critical
      console.warn('Failed to record performance metrics:', error);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AnalyticsServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): AnalyticsServiceConfig {
    return { ...this.config };
  }
}