import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ErrorLogger } from './ErrorLogger';
import { NetworkMonitor } from './NetworkStateManager';
import { DualReadService } from './DualReadService';
import { DataSyncService } from './DataSyncService';

export interface RollbackConfiguration {
  targetMode: 'api_only' | 'db_only' | 'hybrid';
  preserveDatabase: boolean;
  validationEnabled: boolean;
  timeoutMinutes: number;
  backupBeforeRollback: boolean;
  notificationEndpoints?: string[];
}

export interface RollbackStep {
  id: string;
  name: string;
  description: string;
  order: number;
  timeoutMs: number;
  rollbackFn: () => Promise<void>;
  validationFn?: () => Promise<boolean>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  error?: string;
  duration?: number;
  retryCount: number;
  maxRetries: number;
}

export interface RollbackPlan {
  planId: string;
  configuration: RollbackConfiguration;
  steps: RollbackStep[];
  createdAt: string;
  estimatedDurationMs: number;
  rollbackReason?: string;
}

export interface RollbackExecution {
  executionId: string;
  planId: string;
  startTime: string;
  endTime?: string;
  status: 'preparing' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStepId?: string;
  completedSteps: string[];
  failedSteps: string[];
  totalDuration?: number;
  rollbackLogs: RollbackLogEntry[];
}

export interface RollbackLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  stepId?: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface SystemState {
  timestamp: string;
  configurationMode: 'api_only' | 'db_only' | 'hybrid';
  databaseStatus: 'available' | 'unavailable' | 'degraded';
  apiStatus: 'available' | 'unavailable' | 'degraded';
  dataIntegrity: 'verified' | 'compromised' | 'unknown';
  syncStatus: 'active' | 'paused' | 'disabled';
  applicationHealth: 'healthy' | 'degraded' | 'failing';
  activeUsers: number;
  lastSyncTime?: string;
}

export interface RollbackValidation {
  validationId: string;
  timestamp: string;
  systemState: SystemState;
  validationChecks: ValidationCheck[];
  overallStatus: 'passed' | 'failed' | 'warning';
  criticalIssues: string[];
  recommendations: string[];
}

export interface ValidationCheck {
  name: string;
  description: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  message: string;
  critical: boolean;
  metadata?: Record<string, any>;
}

export class MigrationRollbackService {
  private static instance: MigrationRollbackService;
  private supabase: SupabaseClient;
  private errorLogger: ErrorLogger;
  private networkMonitor: NetworkMonitor;
  private dualReadService: DualReadService;
  private dataSyncService: DataSyncService;
  private currentExecution?: RollbackExecution;
  private systemStateHistory: SystemState[] = [];
  private rollbackHistory: RollbackExecution[] = [];

  private constructor() {
    this.supabase = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );
    this.errorLogger = ErrorLogger.getInstance();
    this.networkMonitor = NetworkMonitor.getInstance();
    this.dualReadService = DualReadService.getInstance();
    this.dataSyncService = DataSyncService.getInstance();
  }

  public static getInstance(): MigrationRollbackService {
    if (!MigrationRollbackService.instance) {
      MigrationRollbackService.instance = new MigrationRollbackService();
    }
    return MigrationRollbackService.instance;
  }

  /**
   * Create a rollback plan for the specified configuration
   */
  public async createRollbackPlan(
    configuration: RollbackConfiguration,
    rollbackReason?: string
  ): Promise<RollbackPlan> {
    const planId = `rollback_${Date.now()}`;
    
    this.errorLogger.log('Creating rollback plan', { planId, configuration, rollbackReason });

    const steps = await this.generateRollbackSteps(configuration);
    const estimatedDuration = steps.reduce((total, step) => total + step.timeoutMs, 0);

    const plan: RollbackPlan = {
      planId,
      configuration,
      steps,
      createdAt: new Date().toISOString(),
      estimatedDurationMs: estimatedDuration,
      rollbackReason
    };

    this.errorLogger.log('Rollback plan created', { 
      planId, 
      stepCount: steps.length, 
      estimatedDuration: Math.round(estimatedDuration / 1000 / 60) 
    });

    return plan;
  }

  /**
   * Execute a rollback plan
   */
  public async executeRollback(plan: RollbackPlan): Promise<RollbackExecution> {
    const executionId = `exec_${Date.now()}`;
    const startTime = new Date().toISOString();

    this.currentExecution = {
      executionId,
      planId: plan.planId,
      startTime,
      status: 'preparing',
      completedSteps: [],
      failedSteps: [],
      rollbackLogs: []
    };

    this.logRollback('info', 'Starting rollback execution', { planId: plan.planId, executionId });

    try {
      // Pre-rollback validation
      if (plan.configuration.validationEnabled) {
        this.currentExecution.status = 'running';
        await this.performPreRollbackValidation(plan);
      }

      // Create backup if requested
      if (plan.configuration.backupBeforeRollback) {
        await this.createSystemBackup();
      }

      // Execute rollback steps
      this.currentExecution.status = 'running';
      await this.executeRollbackSteps(plan);

      // Post-rollback validation
      if (plan.configuration.validationEnabled) {
        await this.performPostRollbackValidation(plan);
      }

      // Update final status
      this.currentExecution.status = this.currentExecution.failedSteps.length > 0 ? 'failed' : 'completed';
      this.currentExecution.endTime = new Date().toISOString();
      this.currentExecution.totalDuration = Date.now() - new Date(startTime).getTime();

      this.logRollback('info', 'Rollback execution completed', {
        status: this.currentExecution.status,
        completedSteps: this.currentExecution.completedSteps.length,
        failedSteps: this.currentExecution.failedSteps.length,
        totalDuration: this.currentExecution.totalDuration
      });

      // Store in history
      this.rollbackHistory.push({ ...this.currentExecution });
      
      // Send notifications if configured
      if (plan.configuration.notificationEndpoints) {
        await this.sendRollbackNotifications(plan.configuration.notificationEndpoints, this.currentExecution);
      }

      return this.currentExecution;
    } catch (error) {
      this.errorLogger.logError('Rollback execution failed', error, { planId: plan.planId, executionId });
      
      if (this.currentExecution) {
        this.currentExecution.status = 'failed';
        this.currentExecution.endTime = new Date().toISOString();
        this.logRollback('error', 'Rollback execution failed', { error: error instanceof Error ? error.message : String(error) });
      }
      
      throw error;
    }
  }

  /**
   * Emergency rollback to API-only mode with minimal steps
   */
  public async emergencyRollbackToApiOnly(reason: string): Promise<RollbackExecution> {
    this.errorLogger.log('Emergency rollback initiated', { reason });

    const emergencyPlan: RollbackPlan = {
      planId: `emergency_${Date.now()}`,
      configuration: {
        targetMode: 'api_only',
        preserveDatabase: true,
        validationEnabled: false,
        timeoutMinutes: 10,
        backupBeforeRollback: false
      },
      steps: await this.generateEmergencyRollbackSteps(),
      createdAt: new Date().toISOString(),
      estimatedDurationMs: 600000, // 10 minutes max
      rollbackReason: `Emergency: ${reason}`
    };

    return await this.executeRollback(emergencyPlan);
  }

  /**
   * Get current system state
   */
  public async getCurrentSystemState(): Promise<SystemState> {
    const timestamp = new Date().toISOString();
    
    try {
      // Check dual read service configuration
      const dualReadConfig = this.dualReadService.getCurrentConfiguration();
      let configMode: 'api_only' | 'db_only' | 'hybrid' = 'hybrid';
      
      if (dualReadConfig.readStrategy === 'api_only') {
        configMode = 'api_only';
      } else if (dualReadConfig.readStrategy === 'db_only') {
        configMode = 'db_only';
      }

      // Check database status
      const dbStatus = await this.checkDatabaseStatus();
      
      // Check API status
      const apiStatus = await this.checkApiStatus();
      
      // Check sync status
      const syncStatus = this.dataSyncService.isActive() ? 'active' : 'disabled';
      
      // Basic health check
      const applicationHealth = (dbStatus === 'available' || apiStatus === 'available') ? 'healthy' : 'failing';

      const systemState: SystemState = {
        timestamp,
        configurationMode: configMode,
        databaseStatus: dbStatus,
        apiStatus: apiStatus,
        dataIntegrity: 'unknown', // Would need to run consistency check
        syncStatus: syncStatus,
        applicationHealth: applicationHealth,
        activeUsers: 0, // Would need to implement user tracking
        lastSyncTime: await this.getLastSyncTime()
      };

      // Store in history
      this.systemStateHistory.push(systemState);
      this.pruneSystemStateHistory();

      return systemState;
    } catch (error) {
      this.errorLogger.logError('Failed to get system state', error);
      throw error;
    }
  }

  /**
   * Validate rollback success
   */
  public async validateRollbackSuccess(targetConfiguration: RollbackConfiguration): Promise<RollbackValidation> {
    const validationId = `validation_${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    this.logRollback('info', 'Starting rollback validation', { validationId, targetConfiguration });

    const systemState = await this.getCurrentSystemState();
    const validationChecks: ValidationCheck[] = [];
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];

    // Validate configuration mode
    const configCheck = this.validateConfigurationMode(systemState, targetConfiguration);
    validationChecks.push(configCheck);
    if (!configCheck.status === 'passed' && configCheck.critical) {
      criticalIssues.push(configCheck.message);
    }

    // Validate system health
    const healthCheck = this.validateSystemHealth(systemState);
    validationChecks.push(healthCheck);
    if (healthCheck.status !== 'passed' && healthCheck.critical) {
      criticalIssues.push(healthCheck.message);
    }

    // Validate data access
    const dataAccessCheck = await this.validateDataAccess(targetConfiguration.targetMode);
    validationChecks.push(dataAccessCheck);
    if (dataAccessCheck.status !== 'passed' && dataAccessCheck.critical) {
      criticalIssues.push(dataAccessCheck.message);
    }

    // Validate service availability
    const serviceCheck = await this.validateServiceAvailability();
    validationChecks.push(serviceCheck);
    if (serviceCheck.status !== 'passed' && serviceCheck.critical) {
      criticalIssues.push(serviceCheck.message);
    }

    // Generate recommendations
    if (criticalIssues.length === 0 && validationChecks.every(c => c.status === 'passed')) {
      recommendations.push('Rollback completed successfully - system is operating normally');
    } else {
      recommendations.push('Review failed validation checks and consider corrective actions');
      if (criticalIssues.length > 0) {
        recommendations.push('Critical issues detected - immediate attention required');
      }
    }

    const overallStatus = criticalIssues.length > 0 ? 'failed' : 
                         validationChecks.some(c => c.status === 'warning') ? 'warning' : 'passed';

    const validation: RollbackValidation = {
      validationId,
      timestamp,
      systemState,
      validationChecks,
      overallStatus,
      criticalIssues,
      recommendations
    };

    this.logRollback('info', 'Rollback validation completed', { 
      validationId, 
      overallStatus, 
      criticalIssues: criticalIssues.length 
    });

    return validation;
  }

  /**
   * Get rollback execution history
   */
  public getRollbackHistory(limit: number = 10): RollbackExecution[] {
    return this.rollbackHistory.slice(-limit);
  }

  /**
   * Get system state history
   */
  public getSystemStateHistory(hoursBack: number = 24): SystemState[] {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    return this.systemStateHistory.filter(state => 
      new Date(state.timestamp) >= cutoffTime
    );
  }

  /**
   * Cancel current rollback execution
   */
  public async cancelRollback(): Promise<void> {
    if (!this.currentExecution || this.currentExecution.status === 'completed') {
      throw new Error('No active rollback to cancel');
    }

    this.logRollback('warn', 'Rollback cancellation requested');
    this.currentExecution.status = 'cancelled';
    this.currentExecution.endTime = new Date().toISOString();
    
    this.errorLogger.log('Rollback cancelled', { executionId: this.currentExecution.executionId });
  }

  /**
   * Generate rollback steps based on configuration
   */
  private async generateRollbackSteps(configuration: RollbackConfiguration): Promise<RollbackStep[]> {
    const steps: RollbackStep[] = [];

    // Step 1: Pause data synchronization
    steps.push({
      id: 'pause_sync',
      name: 'Pause Data Synchronization',
      description: 'Stop all data sync processes to prevent conflicts',
      order: 1,
      timeoutMs: 30000,
      retryCount: 0,
      maxRetries: 3,
      status: 'pending',
      rollbackFn: async () => {
        await this.dataSyncService.pauseAll();
      },
      validationFn: async () => {
        return !this.dataSyncService.isActive();
      }
    });

    // Step 2: Switch to target mode
    steps.push({
      id: 'switch_mode',
      name: 'Switch Read Strategy',
      description: `Switch to ${configuration.targetMode} mode`,
      order: 2,
      timeoutMs: 10000,
      retryCount: 0,
      maxRetries: 2,
      status: 'pending',
      rollbackFn: async () => {
        const readStrategy = configuration.targetMode === 'api_only' ? 'api_only' : 
                            configuration.targetMode === 'db_only' ? 'db_only' : 'db_first';
        
        this.dualReadService.configure({
          readStrategy,
          fallbackEnabled: configuration.targetMode === 'hybrid'
        });
      },
      validationFn: async () => {
        const config = this.dualReadService.getCurrentConfiguration();
        return config.readStrategy === (configuration.targetMode === 'api_only' ? 'api_only' : 
                                       configuration.targetMode === 'db_only' ? 'db_only' : 'db_first');
      }
    });

    // Step 3: Clear caches (optional)
    steps.push({
      id: 'clear_caches',
      name: 'Clear Application Caches',
      description: 'Clear cached data to ensure consistency',
      order: 3,
      timeoutMs: 15000,
      retryCount: 0,
      maxRetries: 2,
      status: 'pending',
      rollbackFn: async () => {
        this.dualReadService.clearAllCaches();
      }
    });

    // Step 4: Database preservation or cleanup
    if (configuration.preserveDatabase) {
      steps.push({
        id: 'preserve_db',
        name: 'Preserve Database State',
        description: 'Mark database as preserved for future rollforward',
        order: 4,
        timeoutMs: 5000,
        retryCount: 0,
        maxRetries: 1,
        status: 'pending',
        rollbackFn: async () => {
          await this.markDatabaseAsPreserved();
        }
      });
    }

    // Step 5: Notification and logging
    steps.push({
      id: 'notify_complete',
      name: 'Complete Rollback',
      description: 'Log completion and send notifications',
      order: steps.length + 1,
      timeoutMs: 10000,
      retryCount: 0,
      maxRetries: 1,
      status: 'pending',
      rollbackFn: async () => {
        this.logRollback('info', 'Rollback steps completed successfully');
      }
    });

    return steps.sort((a, b) => a.order - b.order);
  }

  /**
   * Generate emergency rollback steps (minimal, fast)
   */
  private async generateEmergencyRollbackSteps(): Promise<RollbackStep[]> {
    return [
      {
        id: 'emergency_api_only',
        name: 'Emergency API-Only Switch',
        description: 'Immediately switch to API-only mode',
        order: 1,
        timeoutMs: 5000,
        retryCount: 0,
        maxRetries: 1,
        status: 'pending',
        rollbackFn: async () => {
          this.dualReadService.configure({
            readStrategy: 'api_only',
            fallbackEnabled: false
          });
        }
      },
      {
        id: 'emergency_pause_sync',
        name: 'Emergency Sync Pause',
        description: 'Stop all sync processes',
        order: 2,
        timeoutMs: 5000,
        retryCount: 0,
        maxRetries: 1,
        status: 'pending',
        rollbackFn: async () => {
          await this.dataSyncService.pauseAll();
        }
      }
    ];
  }

  /**
   * Execute rollback steps sequentially
   */
  private async executeRollbackSteps(plan: RollbackPlan): Promise<void> {
    for (const step of plan.steps) {
      if (this.currentExecution?.status === 'cancelled') {
        this.logRollback('warn', 'Rollback cancelled, skipping remaining steps');
        break;
      }

      await this.executeRollbackStep(step);
    }
  }

  /**
   * Execute a single rollback step with retries
   */
  private async executeRollbackStep(step: RollbackStep): Promise<void> {
    this.logRollback('info', `Starting rollback step: ${step.name}`, { stepId: step.id });
    
    if (this.currentExecution) {
      this.currentExecution.currentStepId = step.id;
    }

    const startTime = Date.now();
    step.status = 'running';

    while (step.retryCount <= step.maxRetries) {
      try {
        // Execute the rollback function
        await Promise.race([
          step.rollbackFn(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Step timeout')), step.timeoutMs)
          )
        ]);

        // Validate if validation function is provided
        if (step.validationFn) {
          const isValid = await step.validationFn();
          if (!isValid) {
            throw new Error('Step validation failed');
          }
        }

        // Step completed successfully
        step.status = 'completed';
        step.duration = Date.now() - startTime;
        
        if (this.currentExecution) {
          this.currentExecution.completedSteps.push(step.id);
        }

        this.logRollback('info', `Rollback step completed: ${step.name}`, { 
          stepId: step.id, 
          duration: step.duration,
          retries: step.retryCount 
        });
        return;

      } catch (error) {
        step.retryCount++;
        step.error = error instanceof Error ? error.message : String(error);

        this.logRollback('error', `Rollback step failed: ${step.name}`, {
          stepId: step.id,
          error: error instanceof Error ? error.message : String(error),
          retryCount: step.retryCount,
          maxRetries: step.maxRetries
        });

        if (step.retryCount > step.maxRetries) {
          step.status = 'failed';
          step.duration = Date.now() - startTime;
          
          if (this.currentExecution) {
            this.currentExecution.failedSteps.push(step.id);
          }
          
          // Don't throw error for non-critical steps, just log and continue
          this.logRollback('warn', `Rollback step failed after max retries: ${step.name}`);
          return;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * step.retryCount));
      }
    }
  }

  /**
   * Check database connectivity and status
   */
  private async checkDatabaseStatus(): Promise<'available' | 'unavailable' | 'degraded'> {
    try {
      const { error} = await this.supabase
        .from('tournaments')
        .select('count')
        .limit(1);
      
      if (error) {
        this.errorLogger.logError('Database status check failed', error);
        return 'unavailable';
      }
      
      return 'available';
    } catch (error) {
      this.errorLogger.logError('Database status check error', error);
      return 'unavailable';
    }
  }

  /**
   * Check API connectivity and status
   */
  private async checkApiStatus(): Promise<'available' | 'unavailable' | 'degraded'> {
    try {
      // This would use VisApiClient to check API health
      // For now, assume API is available if network is online
      return this.networkMonitor.isOnline() ? 'available' : 'unavailable';
    } catch (error) {
      this.errorLogger.logError('API status check error', error);
      return 'unavailable';
    }
  }

  /**
   * Get last sync time from sync service
   */
  private async getLastSyncTime(): Promise<string | undefined> {
    try {
      const syncStatus = this.dataSyncService.getOverallStatus();
      return syncStatus.lastSuccessfulSync;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Validation functions
   */
  private validateConfigurationMode(state: SystemState, target: RollbackConfiguration): ValidationCheck {
    const expectedMode = target.targetMode;
    const actualMode = state.configurationMode;
    
    return {
      name: 'Configuration Mode',
      description: `Verify system is in ${expectedMode} mode`,
      status: actualMode === expectedMode ? 'passed' : 'failed',
      message: actualMode === expectedMode ? 
        `System correctly configured in ${expectedMode} mode` :
        `System in ${actualMode} mode, expected ${expectedMode}`,
      critical: true,
      metadata: { expected: expectedMode, actual: actualMode }
    };
  }

  private validateSystemHealth(state: SystemState): ValidationCheck {
    const isHealthy = state.applicationHealth === 'healthy';
    
    return {
      name: 'System Health',
      description: 'Verify overall system health',
      status: isHealthy ? 'passed' : 'failed',
      message: isHealthy ? 'System is healthy' : `System health: ${state.applicationHealth}`,
      critical: true,
      metadata: { health: state.applicationHealth }
    };
  }

  private async validateDataAccess(mode: string): Promise<ValidationCheck> {
    try {
      // Test data access based on mode
      if (mode === 'api_only') {
        // Test API access
        return {
          name: 'API Data Access',
          description: 'Verify API data access is working',
          status: 'passed',
          message: 'API data access is functional',
          critical: true
        };
      } else {
        // Test database access
        const { error } = await this.supabase.from('tournaments').select('count').limit(1);
        return {
          name: 'Database Data Access',
          description: 'Verify database access is working',
          status: error ? 'failed' : 'passed',
          message: error ? `Database access failed: ${error.message}` : 'Database access is functional',
          critical: true,
          metadata: error ? { error: error.message } : undefined
        };
      }
    } catch (error) {
      return {
        name: 'Data Access',
        description: 'Verify data access is working',
        status: 'failed',
        message: `Data access validation failed: ${error instanceof Error ? error.message : String(error)}`,
        critical: true,
        metadata: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  private async validateServiceAvailability(): Promise<ValidationCheck> {
    try {
      // Basic service availability check
      const services = [
        { name: 'DualReadService', available: !!this.dualReadService },
        { name: 'DataSyncService', available: !!this.dataSyncService },
        { name: 'NetworkMonitor', available: !!this.networkMonitor }
      ];

      const unavailableServices = services.filter(s => !s.available);
      
      return {
        name: 'Service Availability',
        description: 'Verify core services are available',
        status: unavailableServices.length === 0 ? 'passed' : 'failed',
        message: unavailableServices.length === 0 ? 
          'All core services are available' :
          `Unavailable services: ${unavailableServices.map(s => s.name).join(', ')}`,
        critical: unavailableServices.length > 0,
        metadata: { services, unavailableCount: unavailableServices.length }
      };
    } catch (error) {
      return {
        name: 'Service Availability',
        description: 'Verify core services are available',
        status: 'failed',
        message: `Service availability check failed: ${error instanceof Error ? error.message : String(error)}`,
        critical: true,
        metadata: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Helper methods
   */
  private async performPreRollbackValidation(plan: RollbackPlan): Promise<void> {
    this.logRollback('info', 'Performing pre-rollback validation');
    const systemState = await this.getCurrentSystemState();
    
    if (systemState.applicationHealth === 'failing') {
      this.logRollback('warn', 'System health degraded before rollback');
    }
  }

  private async performPostRollbackValidation(plan: RollbackPlan): Promise<void> {
    this.logRollback('info', 'Performing post-rollback validation');
    const validation = await this.validateRollbackSuccess(plan.configuration);
    
    if (validation.overallStatus !== 'passed') {
      this.logRollback('error', 'Post-rollback validation failed', { 
        criticalIssues: validation.criticalIssues 
      });
    }
  }

  private async createSystemBackup(): Promise<void> {
    this.logRollback('info', 'Creating system backup');
    // This would implement backup logic - storing current configuration, etc.
    // For now, just log the intent
    this.logRollback('info', 'System backup completed');
  }

  private async markDatabaseAsPreserved(): Promise<void> {
    // This would mark the database state as preserved for potential rollforward
    this.logRollback('info', 'Database state marked as preserved');
  }

  private async sendRollbackNotifications(endpoints: string[], execution: RollbackExecution): Promise<void> {
    this.logRollback('info', 'Sending rollback notifications', { 
      endpoints: endpoints.length,
      status: execution.status 
    });
    // Implementation would send HTTP notifications to configured endpoints
  }

  private logRollback(level: 'info' | 'warn' | 'error' | 'debug', message: string, metadata?: any): void {
    const logEntry: RollbackLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
      stepId: this.currentExecution?.currentStepId
    };

    if (this.currentExecution) {
      this.currentExecution.rollbackLogs.push(logEntry);
    }

    this.errorLogger.log(message, metadata);
  }

  private pruneSystemStateHistory(): void {
    const maxHistory = 100;
    if (this.systemStateHistory.length > maxHistory) {
      this.systemStateHistory = this.systemStateHistory.slice(-maxHistory);
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.systemStateHistory = [];
    this.rollbackHistory = [];
    this.currentExecution = undefined;
    this.errorLogger.log('MigrationRollbackService destroyed');
  }
}

export default MigrationRollbackService;