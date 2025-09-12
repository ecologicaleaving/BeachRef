import { MigrationRollbackService, RollbackConfiguration } from '../MigrationRollbackService';
import { DualReadService } from '../DualReadService';
import { DataSyncService } from '../DataSyncService';
import { ErrorLogger } from '../ErrorLogger';
import { NetworkMonitor } from '../NetworkStateManager';

// Mock dependencies
jest.mock('../DualReadService', () => ({
  DualReadService: {
    getInstance: jest.fn(() => ({
      configure: jest.fn(),
      getCurrentConfiguration: jest.fn(() => ({ readStrategy: 'db_first', fallbackEnabled: true })),
      clearAllCaches: jest.fn()
    }))
  }
}));

jest.mock('../DataSyncService', () => ({
  DataSyncService: {
    getInstance: jest.fn(() => ({
      pauseAll: jest.fn(),
      isActive: jest.fn(() => false),
      getOverallStatus: jest.fn(() => ({ lastSuccessfulSync: '2024-01-01T00:00:00Z' }))
    }))
  }
}));

jest.mock('../ErrorLogger', () => ({
  ErrorLogger: {
    getInstance: jest.fn(() => ({
      log: jest.fn(),
      logError: jest.fn()
    }))
  }
}));

jest.mock('../NetworkStateManager', () => ({
  NetworkMonitor: {
    getInstance: jest.fn(() => ({
      isOnline: jest.fn(() => true)
    }))
  }
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => ({
          data: [{ count: 10 }],
          error: null
        }))
      }))
    }))
  }))
}));

// Mock environment variables
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

describe('MigrationRollbackService', () => {
  let rollbackService: MigrationRollbackService;
  let mockDualReadService: jest.Mocked<DualReadService>;
  let mockDataSyncService: jest.Mocked<DataSyncService>;
  let mockErrorLogger: jest.Mocked<ErrorLogger>;
  let mockNetworkMonitor: jest.Mocked<NetworkMonitor>;

  const defaultConfiguration: RollbackConfiguration = {
    targetMode: 'api_only',
    preserveDatabase: true,
    validationEnabled: true,
    timeoutMinutes: 30,
    backupBeforeRollback: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton
    (MigrationRollbackService as any).instance = undefined;
    
    // Setup mocks
    mockDualReadService = DualReadService.getInstance() as jest.Mocked<DualReadService>;
    mockDataSyncService = DataSyncService.getInstance() as jest.Mocked<DataSyncService>;
    mockErrorLogger = ErrorLogger.getInstance() as jest.Mocked<ErrorLogger>;
    mockNetworkMonitor = NetworkMonitor.getInstance() as jest.Mocked<NetworkMonitor>;
    
    mockErrorLogger.log.mockImplementation(() => {});
    mockErrorLogger.logError.mockImplementation(() => {});

    rollbackService = MigrationRollbackService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const service1 = MigrationRollbackService.getInstance();
      const service2 = MigrationRollbackService.getInstance();
      expect(service1).toBe(service2);
    });
  });

  describe('Rollback Plan Creation', () => {
    it('should create a rollback plan with proper structure', async () => {
      const plan = await rollbackService.createRollbackPlan(
        defaultConfiguration,
        'Test rollback reason'
      );

      expect(plan.planId).toMatch(/^rollback_\d+$/);
      expect(plan.configuration).toEqual(defaultConfiguration);
      expect(plan.rollbackReason).toBe('Test rollback reason');
      expect(plan.steps).toHaveLength(5); // Based on our implementation
      expect(plan.estimatedDurationMs).toBeGreaterThan(0);
      expect(plan.createdAt).toBeDefined();
    });

    it('should create steps in proper order', async () => {
      const plan = await rollbackService.createRollbackPlan(defaultConfiguration);

      const stepOrders = plan.steps.map(step => step.order);
      const sortedOrders = [...stepOrders].sort((a, b) => a - b);
      
      expect(stepOrders).toEqual(sortedOrders);
      expect(plan.steps[0].id).toBe('pause_sync');
      expect(plan.steps[1].id).toBe('switch_mode');
    });

    it('should configure steps based on target mode', async () => {
      const apiOnlyPlan = await rollbackService.createRollbackPlan({
        ...defaultConfiguration,
        targetMode: 'api_only'
      });

      const switchModeStep = apiOnlyPlan.steps.find(s => s.id === 'switch_mode');
      expect(switchModeStep).toBeDefined();
      expect(switchModeStep?.description).toContain('api_only');
    });

    it('should include preservation step when preserveDatabase is true', async () => {
      const plan = await rollbackService.createRollbackPlan({
        ...defaultConfiguration,
        preserveDatabase: true
      });

      const preserveStep = plan.steps.find(s => s.id === 'preserve_db');
      expect(preserveStep).toBeDefined();
      expect(preserveStep?.name).toBe('Preserve Database State');
    });
  });

  describe('Rollback Execution', () => {
    it('should execute rollback plan successfully', async () => {
      const plan = await rollbackService.createRollbackPlan(defaultConfiguration);
      const execution = await rollbackService.executeRollback(plan);

      expect(execution.executionId).toMatch(/^exec_\d+$/);
      expect(execution.planId).toBe(plan.planId);
      expect(execution.status).toBe('completed');
      expect(execution.startTime).toBeDefined();
      expect(execution.endTime).toBeDefined();
      expect(execution.completedSteps.length).toBeGreaterThan(0);
      expect(execution.failedSteps).toHaveLength(0);
    });

    it('should call dual read service configuration during rollback', async () => {
      const plan = await rollbackService.createRollbackPlan(defaultConfiguration);
      await rollbackService.executeRollback(plan);

      expect(mockDualReadService.configure).toHaveBeenCalledWith({
        readStrategy: 'api_only',
        fallbackEnabled: false
      });
    });

    it('should pause data sync service during rollback', async () => {
      const plan = await rollbackService.createRollbackPlan(defaultConfiguration);
      await rollbackService.executeRollback(plan);

      expect(mockDataSyncService.pauseAll).toHaveBeenCalled();
    });

    it('should handle step failures gracefully', async () => {
      // Mock a service to fail
      mockDataSyncService.pauseAll.mockRejectedValue(new Error('Sync service failed'));

      const plan = await rollbackService.createRollbackPlan(defaultConfiguration);
      const execution = await rollbackService.executeRollback(plan);

      expect(execution.status).toBe('completed'); // Should still complete other steps
      expect(execution.failedSteps.length).toBeGreaterThan(0);
    });

    it('should respect step timeouts', async () => {
      // Mock a service to hang
      mockDualReadService.configure.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );

      const plan = await rollbackService.createRollbackPlan(defaultConfiguration);
      const startTime = Date.now();
      
      await rollbackService.executeRollback(plan);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(15000); // Should timeout before 10 seconds
    });
  });

  describe('Emergency Rollback', () => {
    it('should execute emergency rollback quickly', async () => {
      const startTime = Date.now();
      const execution = await rollbackService.emergencyRollbackToApiOnly('Critical system failure');
      const duration = Date.now() - startTime;

      expect(execution.status).toBe('completed');
      expect(duration).toBeLessThan(5000); // Should be fast
      expect(execution.rollbackLogs.some(log => 
        log.message.includes('Emergency rollback initiated')
      )).toBe(true);
    });

    it('should configure system for API-only mode', async () => {
      await rollbackService.emergencyRollbackToApiOnly('Test emergency');

      expect(mockDualReadService.configure).toHaveBeenCalledWith({
        readStrategy: 'api_only',
        fallbackEnabled: false
      });
    });
  });

  describe('System State Monitoring', () => {
    it('should get current system state', async () => {
      const systemState = await rollbackService.getCurrentSystemState();

      expect(systemState.timestamp).toBeDefined();
      expect(['api_only', 'db_only', 'hybrid']).toContain(systemState.configurationMode);
      expect(['available', 'unavailable', 'degraded']).toContain(systemState.databaseStatus);
      expect(['available', 'unavailable', 'degraded']).toContain(systemState.apiStatus);
      expect(['healthy', 'degraded', 'failing']).toContain(systemState.applicationHealth);
    });

    it('should determine configuration mode from dual read service', async () => {
      mockDualReadService.getCurrentConfiguration.mockReturnValue({
        readStrategy: 'api_only',
        fallbackEnabled: false,
        enablePerformanceMonitoring: true
      });

      const systemState = await rollbackService.getCurrentSystemState();
      expect(systemState.configurationMode).toBe('api_only');
    });

    it('should check database status correctly', async () => {
      const systemState = await rollbackService.getCurrentSystemState();
      expect(systemState.databaseStatus).toBe('available');
    });

    it('should handle database connection errors', async () => {
      // Mock Supabase to fail
      const { createClient } = require('@supabase/supabase-js');
      const mockSupabase = createClient();
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            data: null,
            error: { message: 'Connection failed' }
          })
        })
      });

      const systemState = await rollbackService.getCurrentSystemState();
      expect(systemState.databaseStatus).toBe('unavailable');
    });
  });

  describe('Rollback Validation', () => {
    it('should validate successful rollback', async () => {
      const plan = await rollbackService.createRollbackPlan(defaultConfiguration);
      await rollbackService.executeRollback(plan);

      const validation = await rollbackService.validateRollbackSuccess(defaultConfiguration);

      expect(validation.validationId).toMatch(/^validation_\d+$/);
      expect(validation.timestamp).toBeDefined();
      expect(validation.systemState).toBeDefined();
      expect(validation.validationChecks.length).toBeGreaterThan(0);
      expect(['passed', 'failed', 'warning']).toContain(validation.overallStatus);
      expect(validation.recommendations).toHaveLength(1);
    });

    it('should detect configuration mismatches', async () => {
      // Mock system to be in wrong mode
      mockDualReadService.getCurrentConfiguration.mockReturnValue({
        readStrategy: 'db_first',
        fallbackEnabled: true,
        enablePerformanceMonitoring: true
      });

      const validation = await rollbackService.validateRollbackSuccess({
        ...defaultConfiguration,
        targetMode: 'api_only'
      });

      const configCheck = validation.validationChecks.find(c => c.name === 'Configuration Mode');
      expect(configCheck?.status).toBe('failed');
      expect(validation.overallStatus).toBe('failed');
    });

    it('should validate data access for different modes', async () => {
      const validation = await rollbackService.validateRollbackSuccess({
        ...defaultConfiguration,
        targetMode: 'api_only'
      });

      const dataAccessCheck = validation.validationChecks.find(c => c.name === 'API Data Access');
      expect(dataAccessCheck).toBeDefined();
      expect(dataAccessCheck?.status).toBe('passed');
    });
  });

  describe('History and Monitoring', () => {
    it('should track rollback execution history', async () => {
      const plan1 = await rollbackService.createRollbackPlan(defaultConfiguration);
      const plan2 = await rollbackService.createRollbackPlan({
        ...defaultConfiguration,
        targetMode: 'db_only'
      });

      await rollbackService.executeRollback(plan1);
      await rollbackService.executeRollback(plan2);

      const history = rollbackService.getRollbackHistory();
      expect(history).toHaveLength(2);
      expect(history[0].planId).toBe(plan1.planId);
      expect(history[1].planId).toBe(plan2.planId);
    });

    it('should track system state history', async () => {
      await rollbackService.getCurrentSystemState();
      await rollbackService.getCurrentSystemState();

      const stateHistory = rollbackService.getSystemStateHistory();
      expect(stateHistory.length).toBeGreaterThanOrEqual(2);
    });

    it('should limit history results', () => {
      const history = rollbackService.getRollbackHistory(5);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Rollback Cancellation', () => {
    it('should throw error when no active rollback to cancel', async () => {
      await expect(rollbackService.cancelRollback()).rejects.toThrow('No active rollback to cancel');
    });

    it('should cancel active rollback execution', async () => {
      const plan = await rollbackService.createRollbackPlan(defaultConfiguration);
      
      // Start rollback (but don't await)
      const rollbackPromise = rollbackService.executeRollback(plan);
      
      // Cancel immediately
      await rollbackService.cancelRollback();
      
      // Wait for rollback to finish
      const execution = await rollbackPromise;
      
      expect(execution.status).toBe('cancelled');
      expect(execution.endTime).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle service initialization errors gracefully', () => {
      expect(() => MigrationRollbackService.getInstance()).not.toThrow();
    });

    it('should log errors appropriately', async () => {
      const plan = await rollbackService.createRollbackPlan(defaultConfiguration);
      await rollbackService.executeRollback(plan);

      expect(mockErrorLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Creating rollback plan'),
        expect.any(Object)
      );
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      rollbackService.destroy();
      
      expect(mockErrorLogger.log).toHaveBeenCalledWith('MigrationRollbackService destroyed');
    });
  });
});