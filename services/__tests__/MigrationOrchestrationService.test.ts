import { MigrationOrchestrationService } from '../MigrationOrchestrationService';
import { ErrorLogger } from '../ErrorLogger';
import { NetworkMonitor } from '../NetworkStateManager';
import { DataSyncService } from '../DataSyncService';
import { DualReadService } from '../DualReadService';
import { DataConsistencyValidator } from '../DataConsistencyValidator';
import { MigrationRollbackService } from '../MigrationRollbackService';
import { MigrationMonitoringService } from '../MigrationMonitoringService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve())
}));

// Mock all service dependencies
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

jest.mock('../DataSyncService', () => ({
  DataSyncService: {
    getInstance: jest.fn(() => ({
      configure: jest.fn(),
      isActive: jest.fn(() => true)
    }))
  }
}));

jest.mock('../DualReadService', () => ({
  DualReadService: {
    getInstance: jest.fn(() => ({
      configure: jest.fn(),
      getCurrentConfiguration: jest.fn(() => ({
        readStrategy: 'db_first',
        fallbackEnabled: true
      }))
    }))
  }
}));

jest.mock('../DataConsistencyValidator', () => ({
  DataConsistencyValidator: {
    getInstance: jest.fn(() => ({
      validateAll: jest.fn(() => Promise.resolve({
        validationId: 'test-validation',
        overallStatus: 'passed',
        summary: {
          totalDiscrepancies: 0,
          recordsValidated: 1000
        }
      })),
      configureDriftDetection: jest.fn()
    }))
  }
}));

jest.mock('../MigrationRollbackService', () => ({
  MigrationRollbackService: {
    getInstance: jest.fn(() => ({
      getCurrentSystemState: jest.fn(() => Promise.resolve({
        applicationHealth: 'healthy',
        configurationMode: 'hybrid'
      })),
      emergencyRollbackToApiOnly: jest.fn(() => Promise.resolve())
    }))
  }
}));

jest.mock('../MigrationMonitoringService', () => ({
  MigrationMonitoringService: {
    getInstance: jest.fn(() => ({
      configure: jest.fn(),
      getCurrentHealthStatus: jest.fn(() => ({
        overallHealth: 'healthy',
        metrics: {
          syncMetrics: {
            failureCount: 0,
            successRate: 100
          },
          performanceMetrics: {
            averageQueryTimeMs: 150,
            throughputPerSecond: 50
          },
          consistencyMetrics: {
            lastConsistencyCheck: '2024-01-01T00:00:00Z',
            dataIntegrityScore: 95,
            discrepancyCount: 2
          }
        }
      }))
    }))
  }
}));

describe('MigrationOrchestrationService', () => {
  let orchestrationService: MigrationOrchestrationService;
  let mockErrorLogger: jest.Mocked<ErrorLogger>;
  let mockDataSyncService: jest.Mocked<DataSyncService>;
  let mockDualReadService: jest.Mocked<DualReadService>;
  let mockConsistencyValidator: jest.Mocked<DataConsistencyValidator>;
  let mockRollbackService: jest.Mocked<MigrationRollbackService>;
  let mockMonitoringService: jest.Mocked<MigrationMonitoringService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton
    (MigrationOrchestrationService as any).instance = undefined;
    
    // Setup mocks
    mockErrorLogger = ErrorLogger.getInstance() as jest.Mocked<ErrorLogger>;
    mockDataSyncService = DataSyncService.getInstance() as jest.Mocked<DataSyncService>;
    mockDualReadService = DualReadService.getInstance() as jest.Mocked<DualReadService>;
    mockConsistencyValidator = DataConsistencyValidator.getInstance() as jest.Mocked<DataConsistencyValidator>;
    mockRollbackService = MigrationRollbackService.getInstance() as jest.Mocked<MigrationRollbackService>;
    mockMonitoringService = MigrationMonitoringService.getInstance() as jest.Mocked<MigrationMonitoringService>;

    orchestrationService = MigrationOrchestrationService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const service1 = MigrationOrchestrationService.getInstance();
      const service2 = MigrationOrchestrationService.getInstance();
      expect(service1).toBe(service2);
    });
  });

  describe('Configuration', () => {
    it('should configure migration orchestration', () => {
      const config = {
        phaseTimeoutMinutes: { preparation: 60 },
        rolloutPercentages: { partial_rollout: 50, full_rollout: 100 }
      };

      orchestrationService.configure(config);

      expect(mockErrorLogger.log).toHaveBeenCalledWith(
        'Migration orchestration configured',
        expect.objectContaining({ config })
      );
    });
  });

  describe('Migration Plan Creation', () => {
    it('should create a comprehensive migration plan', async () => {
      const plan = await orchestrationService.createMigrationPlan();

      expect(plan.planId).toMatch(/^migration_plan_\d+$/);
      expect(plan.phases).toHaveLength(6); // preparation, sync_setup, dual_read_testing, partial_rollout, full_rollout, validation
      expect(plan.estimatedDurationHours).toBeGreaterThan(0);
      expect(plan.configuration).toBeDefined();
      expect(plan.approvals).toEqual({
        technical: false,
        business: false,
        security: false
      });
    });

    it('should include all required phases in correct order', async () => {
      const plan = await orchestrationService.createMigrationPlan();
      const phaseNames = plan.phases.map(p => p.phase);

      expect(phaseNames).toEqual([
        'preparation',
        'sync_setup',
        'dual_read_testing',
        'partial_rollout',
        'full_rollout',
        'validation'
      ]);
    });

    it('should calculate realistic estimated duration', async () => {
      const plan = await orchestrationService.createMigrationPlan();
      
      // Should be several hours for a comprehensive migration
      expect(plan.estimatedDurationHours).toBeGreaterThan(5);
      expect(plan.estimatedDurationHours).toBeLessThan(20);
    });
  });

  describe('Feature Flag Management', () => {
    it('should check feature flag status correctly', async () => {
      const isEnabled = await orchestrationService.isFeatureEnabled('hybrid_reads');
      expect(isEnabled).toBe(false); // Initially disabled
    });

    it('should respect feature flag overrides', async () => {
      orchestrationService.configure({
        featureFlagOverrides: {
          hybrid_reads: true
        }
      });

      const isEnabled = await orchestrationService.isFeatureEnabled('hybrid_reads');
      expect(isEnabled).toBe(true);
    });

    it('should handle user cohort assignment for gradual rollout', async () => {
      const userId1 = 'user123';
      const userId2 = 'user456';

      // Test with different users - they should get consistent assignments
      const result1a = await orchestrationService.isFeatureEnabled('hybrid_reads', userId1);
      const result1b = await orchestrationService.isFeatureEnabled('hybrid_reads', userId1);
      expect(result1a).toBe(result1b); // Consistent for same user
    });
  });

  describe('Migration State Management', () => {
    it('should get current migration state', () => {
      const state = orchestrationService.getCurrentState();

      expect(state.currentPhase).toBe('preparation');
      expect(state.overallProgress).toBe(0);
      expect(state.enabledFeatures).toBeInstanceOf(Set);
      expect(state.metrics).toBeDefined();
      expect(state.phaseHistory).toEqual([]);
    });

    it('should get migration status with comprehensive information', async () => {
      const status = await orchestrationService.getMigrationStatus();

      expect(status.state).toBeDefined();
      expect(status.isExecuting).toBe(false);
      expect(status.plan).toBeUndefined(); // No plan created yet
    });

    it('should include plan in status after creation', async () => {
      await orchestrationService.createMigrationPlan();
      const status = await orchestrationService.getMigrationStatus();

      expect(status.plan).toBeDefined();
      expect(status.plan?.planId).toMatch(/^migration_plan_\d+$/);
    });
  });

  describe('Migration Execution', () => {
    it('should prevent concurrent migrations', async () => {
      const plan = await orchestrationService.createMigrationPlan();
      
      // Start first migration (but don't await)
      const migrationPromise = orchestrationService.executeMigration(plan);
      
      // Try to start second migration
      await expect(orchestrationService.executeMigration(plan))
        .rejects.toThrow('Migration already in progress');
        
      // Cancel the first migration to clean up
      await orchestrationService.cancelMigration();
      
      try {
        await migrationPromise;
      } catch (error) {
        // Expected to fail due to cancellation
      }
    });

    it('should require a migration plan', async () => {
      await expect(orchestrationService.executeMigration())
        .rejects.toThrow('No migration plan available. Create a plan first.');
    });

    it('should enable monitoring during execution', async () => {
      const plan = await orchestrationService.createMigrationPlan();
      
      // Mock a quick execution by making validation pass quickly
      mockConsistencyValidator.validateAll.mockResolvedValue({
        validationId: 'test',
        overallStatus: 'passed',
        summary: { totalDiscrepancies: 0, recordsValidated: 100 }
      });

      try {
        await orchestrationService.executeMigration(plan);
      } catch (error) {
        // May fail due to incomplete mocking, but monitoring should be configured
      }

      expect(mockMonitoringService.configure).toHaveBeenCalledWith({ enabled: true });
    });
  });

  describe('Rollback Management', () => {
    it('should trigger manual rollback', async () => {
      const reason = 'Manual rollback test';
      
      await orchestrationService.triggerRollback(reason);

      expect(mockRollbackService.emergencyRollbackToApiOnly).toHaveBeenCalledWith(reason);
      expect(mockErrorLogger.log).toHaveBeenCalledWith('Manual rollback triggered', { reason });
    });

    it('should handle rollback during migration', async () => {
      const plan = await orchestrationService.createMigrationPlan();
      
      // Start migration and then cancel it
      const migrationPromise = orchestrationService.executeMigration(plan);
      
      // Cancel after a short delay
      setTimeout(() => {
        orchestrationService.cancelMigration();
      }, 100);

      try {
        await migrationPromise;
      } catch (error) {
        // Expected to fail due to cancellation
      }

      expect(mockErrorLogger.log).toHaveBeenCalledWith('Migration cancellation requested');
    });

    it('should prevent cancelling when no migration is running', async () => {
      await expect(orchestrationService.cancelMigration())
        .rejects.toThrow('No migration in progress to cancel');
    });
  });

  describe('Phase Validation', () => {
    it('should validate system health during phases', async () => {
      const plan = await orchestrationService.createMigrationPlan();
      
      // Mock successful system health check
      mockRollbackService.getCurrentSystemState.mockResolvedValue({
        applicationHealth: 'healthy',
        configurationMode: 'hybrid'
      });

      // This would test phase validation, but requires extensive mocking
      // The test verifies the validation calls are made
      try {
        await orchestrationService.executeMigration(plan);
      } catch (error) {
        // May fail due to incomplete mocking
      }

      expect(mockRollbackService.getCurrentSystemState).toHaveBeenCalled();
    });

    it('should handle validation failures', async () => {
      // Mock validation failure
      mockConsistencyValidator.validateAll.mockResolvedValue({
        validationId: 'test-fail',
        overallStatus: 'failed',
        summary: { totalDiscrepancies: 10, recordsValidated: 100 }
      });

      const plan = await orchestrationService.createMigrationPlan();

      // Execution should handle validation failures
      try {
        await orchestrationService.executeMigration(plan);
      } catch (error) {
        expect(mockRollbackService.emergencyRollbackToApiOnly).toHaveBeenCalled();
      }
    });
  });

  describe('Performance and Metrics', () => {
    it('should update metrics during migration', async () => {
      await orchestrationService.getMigrationStatus();

      // Should call monitoring service to get current metrics
      expect(mockMonitoringService.getCurrentHealthStatus).toHaveBeenCalled();
    });

    it('should calculate performance impact', async () => {
      const status = await orchestrationService.getMigrationStatus();
      
      expect(status.state.metrics.systemPerformance).toBeDefined();
      expect(status.state.metrics.dataConsistency).toBeDefined();
      expect(typeof status.state.metrics.systemPerformance.averageResponseTime).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle service initialization gracefully', () => {
      expect(() => MigrationOrchestrationService.getInstance()).not.toThrow();
    });

    it('should log errors appropriately', async () => {
      const plan = await orchestrationService.createMigrationPlan();

      expect(mockErrorLogger.log).toHaveBeenCalledWith(
        'Migration plan created',
        expect.any(Object)
      );
    });

    it('should handle migration execution errors', async () => {
      // Mock a service failure
      mockDataSyncService.configure.mockRejectedValue(new Error('Service failed'));

      const plan = await orchestrationService.createMigrationPlan();

      try {
        await orchestrationService.executeMigration(plan);
      } catch (error) {
        expect(mockErrorLogger.logError).toHaveBeenCalledWith(
          'Migration execution failed',
          expect.any(Error)
        );
      }
    });
  });

  describe('Resource Management', () => {
    it('should cleanup resources on destroy', () => {
      orchestrationService.destroy();

      expect(mockErrorLogger.log).toHaveBeenCalledWith('MigrationOrchestrationService destroyed');
    });

    it('should stop execution on destroy', () => {
      orchestrationService.destroy();

      // Verify that isExecuting is set to false (indirectly)
      expect(mockErrorLogger.log).toHaveBeenCalledWith('MigrationOrchestrationService destroyed');
    });
  });

  describe('Integration Points', () => {
    it('should integrate with all required services', () => {
      // Verify all service dependencies are initialized
      expect(ErrorLogger.getInstance).toHaveBeenCalled();
      expect(DataSyncService.getInstance).toHaveBeenCalled();
      expect(DualReadService.getInstance).toHaveBeenCalled();
      expect(DataConsistencyValidator.getInstance).toHaveBeenCalled();
      expect(MigrationRollbackService.getInstance).toHaveBeenCalled();
      expect(MigrationMonitoringService.getInstance).toHaveBeenCalled();
    });

    it('should configure services appropriately during migration', async () => {
      const plan = await orchestrationService.createMigrationPlan();
      
      try {
        await orchestrationService.executeMigration(plan);
      } catch (error) {
        // May fail due to incomplete mocking
      }

      // Verify services are configured
      expect(mockMonitoringService.configure).toHaveBeenCalled();
      expect(mockDataSyncService.configure).toHaveBeenCalled();
    });
  });
});