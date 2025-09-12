import { IntegrationTestSuite } from '../IntegrationTestSuite';
import { MigrationOrchestrationService } from '../MigrationOrchestrationService';
import { DataSyncService } from '../DataSyncService';
import { DualReadService } from '../DualReadService';
import { DataConsistencyValidator } from '../DataConsistencyValidator';
import { MigrationRollbackService } from '../MigrationRollbackService';
import { MigrationMonitoringService } from '../MigrationMonitoringService';
import { ErrorLogger } from '../ErrorLogger';
import { NetworkMonitor } from '../NetworkStateManager';

// Mock all service dependencies
jest.mock('../MigrationOrchestrationService', () => ({
  MigrationOrchestrationService: {
    getInstance: jest.fn(() => ({
      createMigrationPlan: jest.fn(() => Promise.resolve({
        planId: 'test-plan',
        phases: []
      })),
      executeMigration: jest.fn(() => Promise.resolve()),
      triggerRollback: jest.fn(() => Promise.resolve()),
      isFeatureEnabled: jest.fn(() => Promise.resolve(false)),
      getCurrentState: jest.fn(() => ({
        currentPhase: 'preparation',
        phaseHistory: []
      })),
      getMigrationStatus: jest.fn(() => Promise.resolve({
        state: { phaseHistory: [] }
      })),
      configure: jest.fn(),
      destroy: jest.fn()
    }))
  }
}));

jest.mock('../DataSyncService', () => ({
  DataSyncService: {
    getInstance: jest.fn(() => ({
      configure: jest.fn()
    }))
  }
}));

jest.mock('../DualReadService', () => ({
  DualReadService: {
    getInstance: jest.fn(() => ({
      configure: jest.fn()
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
        applicationHealth: 'healthy'
      }))
    }))
  }
}));

jest.mock('../MigrationMonitoringService', () => ({
  MigrationMonitoringService: {
    getInstance: jest.fn(() => ({
      configure: jest.fn(),
      getCurrentHealthStatus: jest.fn(() => ({
        metrics: {
          performanceMetrics: {
            averageQueryTimeMs: 150,
            throughputPerSecond: 50
          }
        }
      }))
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

describe('IntegrationTestSuite', () => {
  let testSuite: IntegrationTestSuite;
  let mockOrchestrationService: jest.Mocked<MigrationOrchestrationService>;
  let mockDataSyncService: jest.Mocked<DataSyncService>;
  let mockDualReadService: jest.Mocked<DualReadService>;
  let mockConsistencyValidator: jest.Mocked<DataConsistencyValidator>;
  let mockRollbackService: jest.Mocked<MigrationRollbackService>;
  let mockMonitoringService: jest.Mocked<MigrationMonitoringService>;
  let mockErrorLogger: jest.Mocked<ErrorLogger>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton
    (IntegrationTestSuite as any).instance = null;
    
    // Setup mocks
    mockOrchestrationService = MigrationOrchestrationService.getInstance() as jest.Mocked<MigrationOrchestrationService>;
    mockDataSyncService = DataSyncService.getInstance() as jest.Mocked<DataSyncService>;
    mockDualReadService = DualReadService.getInstance() as jest.Mocked<DualReadService>;
    mockConsistencyValidator = DataConsistencyValidator.getInstance() as jest.Mocked<DataConsistencyValidator>;
    mockRollbackService = MigrationRollbackService.getInstance() as jest.Mocked<MigrationRollbackService>;
    mockMonitoringService = MigrationMonitoringService.getInstance() as jest.Mocked<MigrationMonitoringService>;
    mockErrorLogger = ErrorLogger.getInstance() as jest.Mocked<ErrorLogger>;

    testSuite = IntegrationTestSuite.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const suite1 = IntegrationTestSuite.getInstance();
      const suite2 = IntegrationTestSuite.getInstance();
      expect(suite1).toBe(suite2);
    });
  });

  describe('Test Suite Execution', () => {
    it('should execute comprehensive test suite successfully', async () => {
      const result = await testSuite.executeTestSuite();

      expect(result.suiteId).toMatch(/^integration_suite_\d+$/);
      expect(result.executionId).toMatch(/^execution_\d+$/);
      expect(result.totalScenarios).toBe(6);
      expect(result.scenarioResults).toHaveLength(6);
      expect(['passed', 'failed', 'partial']).toContain(result.overallStatus);
    });

    it('should prevent concurrent test suite execution', async () => {
      // Start first test suite (don't await)
      const suitePromise = testSuite.executeTestSuite();

      // Try to start second test suite
      await expect(testSuite.executeTestSuite())
        .rejects.toThrow('Test suite is already executing');

      // Wait for first suite to complete
      await suitePromise;
    });

    it('should handle test suite cancellation', async () => {
      // Start test suite (don't await)
      const suitePromise = testSuite.executeTestSuite();

      // Cancel after short delay
      setTimeout(() => {
        testSuite.cancelTestSuite();
      }, 100);

      const result = await suitePromise;
      
      // Some scenarios might be cancelled due to early termination
      expect(result.totalScenarios).toBeGreaterThan(0);
    });
  });

  describe('Individual Test Scenarios', () => {
    it('should execute basic migration scenario', async () => {
      const scenario = {
        scenarioId: 'basic_migration',
        name: 'Basic Migration Flow',
        description: 'Test complete migration from API-only to hybrid system',
        dataVolume: 'small' as const,
        duration: 15,
        concurrentUsers: 10,
        expectedOutcome: 'success' as const,
        validationCriteria: {
          maxResponseTimeMs: 2000,
          maxErrorRate: 1,
          minConsistencyScore: 95,
          maxDataDiscrepancies: 5,
          requiresZeroDowntime: true
        }
      };

      const result = await testSuite.executeTestScenario(scenario);

      expect(result.scenarioId).toBe('basic_migration');
      expect(result.status).toBe('passed');
      expect(result.metrics).toBeDefined();
      expect(result.validationResults).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should execute rollback validation scenario', async () => {
      const scenario = {
        scenarioId: 'rollback_validation',
        name: 'Rollback Procedure Validation',
        description: 'Test rollback procedures under various failure conditions',
        dataVolume: 'medium' as const,
        duration: 20,
        concurrentUsers: 25,
        expectedOutcome: 'controlled_failure' as const,
        validationCriteria: {
          maxResponseTimeMs: 2000,
          maxErrorRate: 5,
          minConsistencyScore: 85,
          maxDataDiscrepancies: 15,
          requiresZeroDowntime: false,
          rollbackTimeLimit: 600
        }
      };

      const result = await testSuite.executeTestScenario(scenario);

      expect(result.scenarioId).toBe('rollback_validation');
      expect(['passed', 'failed']).toContain(result.status);
      expect(result.metrics.migration.rollbacksTriggered).toBeGreaterThanOrEqual(0);
    });

    it('should execute high load migration scenario', async () => {
      const scenario = {
        scenarioId: 'high_load_migration',
        name: 'High Load Migration',
        description: 'Test migration under high concurrent user load',
        dataVolume: 'large' as const,
        duration: 30,
        concurrentUsers: 100,
        expectedOutcome: 'success' as const,
        validationCriteria: {
          maxResponseTimeMs: 3000,
          maxErrorRate: 2,
          minConsistencyScore: 90,
          maxDataDiscrepancies: 10,
          requiresZeroDowntime: true
        }
      };

      const result = await testSuite.executeTestScenario(scenario);

      expect(result.scenarioId).toBe('high_load_migration');
      expect(result.metrics.systemPerformance).toBeDefined();
      expect(result.metrics.systemPerformance.throughputPerSecond).toBeGreaterThan(0);
    });

    it('should execute consistency stress test scenario', async () => {
      const scenario = {
        scenarioId: 'consistency_stress_test',
        name: 'Data Consistency Stress Test',
        description: 'Test data consistency validation under high load',
        dataVolume: 'production' as const,
        duration: 45,
        concurrentUsers: 200,
        expectedOutcome: 'success' as const,
        validationCriteria: {
          maxResponseTimeMs: 4000,
          maxErrorRate: 3,
          minConsistencyScore: 92,
          maxDataDiscrepancies: 20,
          requiresZeroDowntime: true
        }
      };

      const result = await testSuite.executeTestScenario(scenario);

      expect(result.scenarioId).toBe('consistency_stress_test');
      expect(result.metrics.dataConsistency.validationAttempts).toBeGreaterThan(0);
      expect(result.metrics.dataConsistency.consistencyScore).toBeGreaterThanOrEqual(0);
    });

    it('should execute feature flag rollout scenario', async () => {
      const scenario = {
        scenarioId: 'feature_flag_rollout',
        name: 'Gradual Feature Flag Rollout',
        description: 'Test gradual rollout with feature flags and user cohorts',
        dataVolume: 'medium' as const,
        duration: 25,
        concurrentUsers: 50,
        expectedOutcome: 'success' as const,
        validationCriteria: {
          maxResponseTimeMs: 2500,
          maxErrorRate: 1.5,
          minConsistencyScore: 93,
          maxDataDiscrepancies: 8,
          requiresZeroDowntime: true
        }
      };

      const result = await testSuite.executeTestScenario(scenario);

      expect(result.scenarioId).toBe('feature_flag_rollout');
      expect(result.metrics.migration.featureFlagsToggled).toBeGreaterThan(0);
      expect(result.metrics.migration.userCohortChanges).toBeGreaterThanOrEqual(0);
    });

    it('should execute network failure recovery scenario', async () => {
      const scenario = {
        scenarioId: 'network_failure_recovery',
        name: 'Network Failure Recovery',
        description: 'Test system behavior during network interruptions',
        dataVolume: 'medium' as const,
        duration: 35,
        concurrentUsers: 30,
        expectedOutcome: 'controlled_failure' as const,
        validationCriteria: {
          maxResponseTimeMs: 5000,
          maxErrorRate: 10,
          minConsistencyScore: 80,
          maxDataDiscrepancies: 25,
          requiresZeroDowntime: false
        }
      };

      const result = await testSuite.executeTestScenario(scenario);

      expect(result.scenarioId).toBe('network_failure_recovery');
      expect(['passed', 'failed']).toContain(result.status);
      expect(result.metrics.systemPerformance.errorCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Test Validation', () => {
    it('should validate performance criteria correctly', async () => {
      const scenario = {
        scenarioId: 'performance_test',
        name: 'Performance Test',
        description: 'Test performance validation',
        dataVolume: 'small' as const,
        duration: 10,
        concurrentUsers: 5,
        expectedOutcome: 'success' as const,
        validationCriteria: {
          maxResponseTimeMs: 1000,
          maxErrorRate: 1,
          minConsistencyScore: 95,
          maxDataDiscrepancies: 5,
          requiresZeroDowntime: true
        }
      };

      const result = await testSuite.executeTestScenario(scenario);

      expect(result.validationResults).toBeInstanceOf(Array);
      expect(result.validationResults.length).toBeGreaterThan(0);
      
      const performanceValidation = result.validationResults.find(v => v.validationType === 'performance');
      expect(performanceValidation).toBeDefined();
    });

    it('should validate consistency criteria correctly', async () => {
      const scenario = {
        scenarioId: 'consistency_test',
        name: 'Consistency Test',
        description: 'Test consistency validation',
        dataVolume: 'small' as const,
        duration: 10,
        concurrentUsers: 5,
        expectedOutcome: 'success' as const,
        validationCriteria: {
          maxResponseTimeMs: 2000,
          maxErrorRate: 1,
          minConsistencyScore: 90,
          maxDataDiscrepancies: 5,
          requiresZeroDowntime: true
        }
      };

      const result = await testSuite.executeTestScenario(scenario);

      const consistencyValidation = result.validationResults.find(v => v.validationType === 'consistency');
      expect(consistencyValidation).toBeDefined();
    });
  });

  describe('Metrics Collection', () => {
    it('should collect comprehensive metrics during test execution', async () => {
      const scenario = {
        scenarioId: 'metrics_test',
        name: 'Metrics Collection Test',
        description: 'Test metrics collection',
        dataVolume: 'small' as const,
        duration: 10,
        concurrentUsers: 5,
        expectedOutcome: 'success' as const,
        validationCriteria: {
          maxResponseTimeMs: 2000,
          maxErrorRate: 1,
          minConsistencyScore: 95,
          maxDataDiscrepancies: 5,
          requiresZeroDowntime: true
        }
      };

      const result = await testSuite.executeTestScenario(scenario);

      // Verify all metric categories are collected
      expect(result.metrics.systemPerformance).toBeDefined();
      expect(result.metrics.dataConsistency).toBeDefined();
      expect(result.metrics.migration).toBeDefined();
      expect(result.metrics.resources).toBeDefined();

      // Verify specific metrics
      expect(typeof result.metrics.systemPerformance.averageResponseTimeMs).toBe('number');
      expect(typeof result.metrics.dataConsistency.consistencyScore).toBe('number');
      expect(typeof result.metrics.resources.peakMemoryUsageMB).toBe('number');
    });
  });

  describe('Environment Management', () => {
    it('should configure test environment correctly for different scenarios', async () => {
      const productionScenario = {
        scenarioId: 'production_test',
        name: 'Production Test',
        description: 'Test with production data volume',
        dataVolume: 'production' as const,
        duration: 10,
        concurrentUsers: 5,
        expectedOutcome: 'success' as const,
        validationCriteria: {
          maxResponseTimeMs: 2000,
          maxErrorRate: 1,
          minConsistencyScore: 95,
          maxDataDiscrepancies: 5,
          requiresZeroDowntime: true
        }
      };

      await testSuite.executeTestScenario(productionScenario);

      // Verify services were configured for production scenario
      expect(mockDataSyncService.configure).toHaveBeenCalledWith({
        syncIntervalMs: 15000,
        batchSize: 500,
        enableBatchSync: true
      });

      expect(mockMonitoringService.configure).toHaveBeenCalledWith({
        enabled: true,
        alertingEnabled: false,
        performanceMetricsIntervalMs: 5000
      });
    });

    it('should clean up test environment after execution', async () => {
      const scenario = {
        scenarioId: 'cleanup_test',
        name: 'Cleanup Test',
        description: 'Test environment cleanup',
        dataVolume: 'small' as const,
        duration: 5,
        concurrentUsers: 5,
        expectedOutcome: 'success' as const,
        validationCriteria: {
          maxResponseTimeMs: 2000,
          maxErrorRate: 1,
          minConsistencyScore: 95,
          maxDataDiscrepancies: 5,
          requiresZeroDowntime: true
        }
      };

      await testSuite.executeTestScenario(scenario);

      // Verify cleanup was performed
      expect(mockErrorLogger.log).toHaveBeenCalledWith('Test environment cleanup completed');
    });
  });

  describe('Error Handling', () => {
    it('should handle scenario execution errors gracefully', async () => {
      // Mock service to throw error
      mockOrchestrationService.createMigrationPlan.mockRejectedValue(new Error('Service failure'));

      const scenario = {
        scenarioId: 'error_test',
        name: 'Error Test',
        description: 'Test error handling',
        dataVolume: 'small' as const,
        duration: 10,
        concurrentUsers: 5,
        expectedOutcome: 'success' as const,
        validationCriteria: {
          maxResponseTimeMs: 2000,
          maxErrorRate: 1,
          minConsistencyScore: 95,
          maxDataDiscrepancies: 5,
          requiresZeroDowntime: true
        }
      };

      const result = await testSuite.executeTestScenario(scenario);

      expect(result.status).toBe('failed');
      expect(result.errors).toContain('Service failure');
      expect(result.recommendations).toContain('Review error logs and system state');
    });

    it('should handle unknown scenario types', async () => {
      const unknownScenario = {
        scenarioId: 'unknown_scenario',
        name: 'Unknown Scenario',
        description: 'Test unknown scenario handling',
        dataVolume: 'small' as const,
        duration: 10,
        concurrentUsers: 5,
        expectedOutcome: 'success' as const,
        validationCriteria: {
          maxResponseTimeMs: 2000,
          maxErrorRate: 1,
          minConsistencyScore: 95,
          maxDataDiscrepancies: 5,
          requiresZeroDowntime: true
        }
      };

      const result = await testSuite.executeTestScenario(unknownScenario);

      expect(result.status).toBe('failed');
      expect(result.errors.some(error => error.includes('Unknown scenario'))).toBe(true);
    });
  });

  describe('Test Suite Status', () => {
    it('should provide execution status', () => {
      const status = testSuite.getExecutionStatus();

      expect(status.isExecuting).toBe(false);
      expect(status.currentExecution).toBeUndefined();
    });

    it('should update execution status during test run', async () => {
      // Start test suite (don't await)
      const suitePromise = testSuite.executeTestSuite();

      // Check status while running
      setTimeout(() => {
        const status = testSuite.getExecutionStatus();
        expect(status.isExecuting).toBe(true);
        expect(status.currentExecution).toBeDefined();
      }, 100);

      await suitePromise;

      // Check final status
      const finalStatus = testSuite.getExecutionStatus();
      expect(finalStatus.isExecuting).toBe(false);
    });
  });

  describe('Resource Management', () => {
    it('should handle cancellation gracefully', () => {
      expect(() => testSuite.cancelTestSuite()).toThrow('No test suite is currently executing');
    });

    it('should cleanup resources on destroy', () => {
      testSuite.destroy();

      expect(mockErrorLogger.log).toHaveBeenCalledWith('IntegrationTestSuite destroyed');
    });
  });

  describe('Service Integration', () => {
    it('should integrate with all required services', () => {
      // Verify all service dependencies are accessed
      expect(MigrationOrchestrationService.getInstance).toHaveBeenCalled();
      expect(DataSyncService.getInstance).toHaveBeenCalled();
      expect(DualReadService.getInstance).toHaveBeenCalled();
      expect(DataConsistencyValidator.getInstance).toHaveBeenCalled();
      expect(MigrationRollbackService.getInstance).toHaveBeenCalled();
      expect(MigrationMonitoringService.getInstance).toHaveBeenCalled();
      expect(ErrorLogger.getInstance).toHaveBeenCalled();
    });

    it('should configure services appropriately for different test scenarios', async () => {
      const scenarios = [
        { dataVolume: 'small' as const, expectedBatchSize: 100 },
        { dataVolume: 'production' as const, expectedBatchSize: 500 }
      ];

      for (const scenarioConfig of scenarios) {
        const scenario = {
          scenarioId: 'config_test',
          name: 'Configuration Test',
          description: 'Test service configuration',
          dataVolume: scenarioConfig.dataVolume,
          duration: 5,
          concurrentUsers: 5,
          expectedOutcome: 'success' as const,
          validationCriteria: {
            maxResponseTimeMs: 2000,
            maxErrorRate: 1,
            minConsistencyScore: 95,
            maxDataDiscrepancies: 5,
            requiresZeroDowntime: true
          }
        };

        await testSuite.executeTestScenario(scenario);

        expect(mockDataSyncService.configure).toHaveBeenCalledWith(
          expect.objectContaining({
            batchSize: scenarioConfig.expectedBatchSize
          })
        );
      }
    });
  });
});