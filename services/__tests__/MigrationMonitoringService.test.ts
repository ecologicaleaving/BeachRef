import { MigrationMonitoringService, MonitoringConfiguration, AlertType, AlertSeverity } from '../MigrationMonitoringService';
import { DataSyncService } from '../DataSyncService';
import { DualReadService } from '../DualReadService';
import { DataConsistencyValidator } from '../DataConsistencyValidator';
import { MigrationRollbackService } from '../MigrationRollbackService';
import { ErrorLogger } from '../ErrorLogger';
import { NetworkMonitor } from '../NetworkStateManager';

// Mock dependencies
jest.mock('../DataSyncService', () => ({
  DataSyncService: {
    getInstance: jest.fn(() => ({
      getOverallStatus: jest.fn(() => ({
        hasErrors: false,
        isRunning: true,
        completedTasks: 100,
        failedTasks: 2,
        queueSize: 5,
        lastSuccessfulSync: '2024-01-01T00:00:00Z'
      }))
    }))
  }
}));

jest.mock('../DualReadService', () => ({
  DualReadService: {
    getInstance: jest.fn(() => ({
      getCurrentConfiguration: jest.fn(() => ({
        readStrategy: 'db_first',
        fallbackEnabled: true,
        enablePerformanceMonitoring: true
      }))
    }))
  }
}));

jest.mock('../DataConsistencyValidator', () => ({
  DataConsistencyValidator: {
    getInstance: jest.fn(() => ({
      validateAll: jest.fn(() => Promise.resolve({
        validationId: 'test-validation',
        timestamp: '2024-01-01T00:00:00Z',
        overallStatus: 'passed',
        summary: {
          totalDiscrepancies: 0,
          recordsValidated: 1000
        }
      })),
      getValidationHistory: jest.fn(() => [])
    }))
  }
}));

jest.mock('../MigrationRollbackService', () => ({
  MigrationRollbackService: {
    getInstance: jest.fn(() => ({
      getCurrentSystemState: jest.fn(() => Promise.resolve({
        timestamp: '2024-01-01T00:00:00Z',
        configurationMode: 'hybrid',
        databaseStatus: 'available',
        apiStatus: 'available',
        applicationHealth: 'healthy',
        syncStatus: 'active'
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

describe('MigrationMonitoringService', () => {
  let monitoringService: MigrationMonitoringService;
  let mockDataSyncService: jest.Mocked<DataSyncService>;
  let mockDualReadService: jest.Mocked<DualReadService>;
  let mockConsistencyValidator: jest.Mocked<DataConsistencyValidator>;
  let mockRollbackService: jest.Mocked<MigrationRollbackService>;
  let mockErrorLogger: jest.Mocked<ErrorLogger>;
  let mockNetworkMonitor: jest.Mocked<NetworkMonitor>;

  const defaultConfig: Partial<MonitoringConfiguration> = {
    enabled: true,
    syncHealthCheckIntervalMs: 100,
    performanceMetricsIntervalMs: 100,
    consistencyCheckIntervalMs: 1000,
    dashboardUpdateIntervalMs: 50,
    alertingEnabled: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    // Reset singleton
    (MigrationMonitoringService as any).instance = undefined;
    
    // Setup mocks
    mockDataSyncService = DataSyncService.getInstance() as jest.Mocked<DataSyncService>;
    mockDualReadService = DualReadService.getInstance() as jest.Mocked<DualReadService>;
    mockConsistencyValidator = DataConsistencyValidator.getInstance() as jest.Mocked<DataConsistencyValidator>;
    mockRollbackService = MigrationRollbackService.getInstance() as jest.Mocked<MigrationRollbackService>;
    mockErrorLogger = ErrorLogger.getInstance() as jest.Mocked<ErrorLogger>;
    mockNetworkMonitor = NetworkMonitor.getInstance() as jest.Mocked<NetworkMonitor>;
    
    mockErrorLogger.log.mockImplementation(() => {});
    mockErrorLogger.logError.mockImplementation(() => {});

    monitoringService = MigrationMonitoringService.getInstance();
  });

  afterEach(() => {
    monitoringService.destroy();
    jest.useRealTimers();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const service1 = MigrationMonitoringService.getInstance();
      const service2 = MigrationMonitoringService.getInstance();
      expect(service1).toBe(service2);
    });
  });

  describe('Configuration', () => {
    it('should configure monitoring service', () => {
      monitoringService.configure(defaultConfig);
      
      expect(mockErrorLogger.log).toHaveBeenCalledWith(
        'Migration monitoring configured',
        expect.objectContaining({ enabled: true })
      );
    });

    it('should start monitoring when enabled', () => {
      monitoringService.configure(defaultConfig);
      
      expect(mockErrorLogger.log).toHaveBeenCalledWith('Starting migration monitoring');
    });

    it('should stop monitoring when disabled', () => {
      monitoringService.configure({ enabled: false });
      
      expect(mockErrorLogger.log).toHaveBeenCalledWith('Stopping migration monitoring');
    });
  });

  describe('Health Status Monitoring', () => {
    it('should get current health status', () => {
      const healthStatus = monitoringService.getCurrentHealthStatus();
      
      expect(healthStatus.timestamp).toBeDefined();
      expect(healthStatus.overallHealth).toBeDefined();
      expect(healthStatus.components).toBeDefined();
      expect(healthStatus.metrics).toBeDefined();
      expect(healthStatus.activeAlerts).toBeDefined();
      expect(healthStatus.recommendations).toBeDefined();
    });

    it('should perform health checks when monitoring is active', async () => {
      monitoringService.configure(defaultConfig);
      
      // Fast forward time to trigger health checks
      jest.advanceTimersByTime(200);
      await Promise.resolve(); // Allow async operations to complete
      
      expect(mockDataSyncService.getOverallStatus).toHaveBeenCalled();
      expect(mockDualReadService.getCurrentConfiguration).toHaveBeenCalled();
    });

    it('should force health check', async () => {
      const healthStatus = await monitoringService.forceHealthCheck();
      
      expect(healthStatus.overallHealth).toBeDefined();
      expect(healthStatus.components.length).toBeGreaterThan(0);
    });
  });

  describe('Alert Management', () => {
    it('should trigger alerts', async () => {
      await monitoringService.triggerAlert(
        'sync_failure',
        'error',
        'Test Alert',
        'This is a test alert',
        'TestSource'
      );

      const healthStatus = monitoringService.getCurrentHealthStatus();
      expect(healthStatus.activeAlerts.length).toBe(1);
      expect(healthStatus.activeAlerts[0].title).toBe('Test Alert');
      expect(healthStatus.activeAlerts[0].type).toBe('sync_failure');
      expect(healthStatus.activeAlerts[0].severity).toBe('error');
    });

    it('should acknowledge alerts', async () => {
      await monitoringService.triggerAlert(
        'sync_failure',
        'warning',
        'Test Alert',
        'Test message',
        'TestSource'
      );

      const healthStatus = monitoringService.getCurrentHealthStatus();
      const alertId = healthStatus.activeAlerts[0].id;
      
      const result = monitoringService.acknowledgeAlert(alertId, 'TestUser');
      expect(result).toBe(true);
      
      const updatedHealthStatus = monitoringService.getCurrentHealthStatus();
      const acknowledgedAlert = updatedHealthStatus.activeAlerts.find(a => a.id === alertId);
      expect(acknowledgedAlert?.acknowledged).toBe(true);
      expect(acknowledgedAlert?.acknowledgmentBy).toBe('TestUser');
    });

    it('should resolve alerts', async () => {
      await monitoringService.triggerAlert(
        'data_inconsistency',
        'warning',
        'Test Alert',
        'Test message',
        'TestSource'
      );

      const healthStatus = monitoringService.getCurrentHealthStatus();
      const alertId = healthStatus.activeAlerts[0].id;
      
      const result = monitoringService.resolveAlert(alertId);
      expect(result).toBe(true);
      
      const updatedHealthStatus = monitoringService.getCurrentHealthStatus();
      const resolvedAlert = updatedHealthStatus.activeAlerts.find(a => a.id === alertId);
      expect(resolvedAlert).toBeUndefined();
    });

    it('should handle non-existent alert operations', () => {
      const result1 = monitoringService.acknowledgeAlert('non-existent');
      const result2 = monitoringService.resolveAlert('non-existent');
      
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });
  });

  describe('Performance Metrics', () => {
    it('should collect performance metrics when monitoring is active', () => {
      monitoringService.configure(defaultConfig);
      
      // Fast forward time to trigger metrics collection
      jest.advanceTimersByTime(150);
      
      // Verify collection was attempted (would need to mock the actual measurement methods)
      expect(mockErrorLogger.log).toHaveBeenCalledWith('Starting migration monitoring');
    });

    it('should retrieve performance metrics for time range', () => {
      const from = new Date('2024-01-01T00:00:00Z');
      const to = new Date('2024-01-01T01:00:00Z');
      
      const metrics = monitoringService.getPerformanceMetrics(from, to);
      expect(Array.isArray(metrics)).toBe(true);
    });

    it('should filter performance metrics by type', () => {
      const from = new Date('2024-01-01T00:00:00Z');
      const to = new Date('2024-01-01T01:00:00Z');
      
      const metrics = monitoringService.getPerformanceMetrics(from, to, 'sync_latency');
      expect(Array.isArray(metrics)).toBe(true);
    });
  });

  describe('Consistency Monitoring', () => {
    it('should perform consistency checks when monitoring is active', () => {
      monitoringService.configure(defaultConfig);
      
      // Fast forward time to trigger consistency check
      jest.advanceTimersByTime(1100);
      
      expect(mockConsistencyValidator.validateAll).toHaveBeenCalled();
    });

    it('should force consistency check', async () => {
      await monitoringService.forceConsistencyCheck();
      
      expect(mockConsistencyValidator.validateAll).toHaveBeenCalled();
    });

    it('should trigger alert on consistency failures', async () => {
      mockConsistencyValidator.validateAll.mockResolvedValue({
        validationId: 'test-validation',
        timestamp: '2024-01-01T00:00:00Z',
        overallStatus: 'failed',
        summary: {
          totalDiscrepancies: 5,
          recordsValidated: 1000,
          criticalIssues: 2,
          validationDuration: 1000
        },
        results: {},
        recommendations: ['Fix data issues']
      });

      await monitoringService.forceConsistencyCheck();
      
      const healthStatus = monitoringService.getCurrentHealthStatus();
      const consistencyAlert = healthStatus.activeAlerts.find(a => a.type === 'data_inconsistency');
      expect(consistencyAlert).toBeDefined();
      expect(consistencyAlert?.severity).toBe('error');
    });
  });

  describe('Dashboard Data', () => {
    it('should get comprehensive dashboard data', async () => {
      const dashboardData = await monitoringService.getDashboardData();
      
      expect(dashboardData.timestamp).toBeDefined();
      expect(dashboardData.healthStatus).toBeDefined();
      expect(dashboardData.progressReport).toBeDefined();
      expect(dashboardData.recentAlerts).toBeDefined();
      expect(dashboardData.performanceTrends).toBeDefined();
      expect(dashboardData.systemState).toBeDefined();
      expect(dashboardData.migrationTimeline).toBeDefined();
    });

    it('should subscribe to dashboard updates', (done) => {
      let updateCount = 0;
      const unsubscribe = monitoringService.subscribeToDashboard((data) => {
        expect(data.timestamp).toBeDefined();
        updateCount++;
        if (updateCount === 2) {
          unsubscribe();
          done();
        }
      });

      monitoringService.configure(defaultConfig);
      
      // Fast forward time to trigger dashboard updates
      jest.advanceTimersByTime(100);
      setTimeout(() => jest.advanceTimersByTime(100), 10);
    });
  });

  describe('Timeline Events', () => {
    it('should add timeline events', () => {
      monitoringService.addTimelineEvent({
        type: 'migration_start',
        title: 'Test Event',
        description: 'Test event description',
        severity: 'info'
      });

      const timeline = monitoringService.getTimelineEvents();
      expect(timeline.length).toBeGreaterThan(0);
      expect(timeline[timeline.length - 1].title).toBe('Test Event');
    });

    it('should limit timeline events', () => {
      const timeline = monitoringService.getTimelineEvents(5);
      expect(timeline.length).toBeLessThanOrEqual(5);
    });

    it('should automatically add timeline events for alerts', async () => {
      await monitoringService.triggerAlert(
        'system_failure',
        'critical',
        'Critical System Failure',
        'System has failed critically',
        'TestSource'
      );

      const timeline = monitoringService.getTimelineEvents();
      const alertEvent = timeline.find(event => 
        event.title.includes('Critical System Failure')
      );
      expect(alertEvent).toBeDefined();
      expect(alertEvent?.type).toBe('alert');
    });
  });

  describe('Component Health Checks', () => {
    it('should check data sync service health', async () => {
      const healthStatus = await monitoringService.forceHealthCheck();
      
      const syncComponent = healthStatus.components.find(c => c.name === 'Data Sync Service');
      expect(syncComponent).toBeDefined();
      expect(syncComponent?.status).toBe('healthy');
    });

    it('should detect sync service failures', async () => {
      mockDataSyncService.getOverallStatus.mockReturnValue({
        hasErrors: true,
        isRunning: false,
        completedTasks: 50,
        failedTasks: 20,
        queueSize: 15,
        lastSuccessfulSync: '2024-01-01T00:00:00Z'
      });

      const healthStatus = await monitoringService.forceHealthCheck();
      
      const syncComponent = healthStatus.components.find(c => c.name === 'Data Sync Service');
      expect(syncComponent?.status).toBe('failing');
    });

    it('should check network connectivity', async () => {
      const healthStatus = await monitoringService.forceHealthCheck();
      
      const networkComponent = healthStatus.components.find(c => c.name === 'Network Connectivity');
      expect(networkComponent).toBeDefined();
      expect(networkComponent?.status).toBe('healthy');
    });

    it('should detect network failures', async () => {
      mockNetworkMonitor.isOnline.mockReturnValue(false);

      const healthStatus = await monitoringService.forceHealthCheck();
      
      const networkComponent = healthStatus.components.find(c => c.name === 'Network Connectivity');
      expect(networkComponent?.status).toBe('failing');
    });
  });

  describe('Threshold Monitoring', () => {
    it('should trigger alerts when sync failures exceed threshold', () => {
      monitoringService.configure({
        ...defaultConfig,
        alertThresholds: {
          syncFailureCount: 1,
          syncFailureRatePercent: 10,
          performanceDegradationPercent: 50,
          dataInconsistencyPercent: 1,
          systemDowntimeMinutes: 5,
          diskUsagePercent: 85,
          memoryUsagePercent: 90,
          responseTimeMs: 5000
        }
      });

      // Mock high failure count
      mockDataSyncService.getOverallStatus.mockReturnValue({
        hasErrors: false,
        isRunning: true,
        completedTasks: 100,
        failedTasks: 5, // Exceeds threshold of 1
        queueSize: 5,
        lastSuccessfulSync: '2024-01-01T00:00:00Z'
      });

      // Trigger health check which should check thresholds
      monitoringService.forceHealthCheck();
      jest.advanceTimersByTime(100);

      const healthStatus = monitoringService.getCurrentHealthStatus();
      const syncFailureAlert = healthStatus.activeAlerts.find(a => a.type === 'sync_failure');
      expect(syncFailureAlert).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle health check errors gracefully', async () => {
      mockDataSyncService.getOverallStatus.mockImplementation(() => {
        throw new Error('Sync service unavailable');
      });

      await expect(monitoringService.forceHealthCheck()).resolves.toBeDefined();
      expect(mockErrorLogger.logError).toHaveBeenCalledWith(
        'Health check failed',
        expect.any(Error)
      );
    });

    it('should handle consistency check errors gracefully', async () => {
      mockConsistencyValidator.validateAll.mockRejectedValue(
        new Error('Validation service failed')
      );

      await monitoringService.forceConsistencyCheck();
      
      expect(mockErrorLogger.logError).toHaveBeenCalledWith(
        'Consistency check failed',
        expect.any(Error)
      );
    });

    it('should handle dashboard callback errors gracefully', () => {
      const faultyCallback = jest.fn(() => {
        throw new Error('Callback failed');
      });

      const unsubscribe = monitoringService.subscribeToDashboard(faultyCallback);
      
      monitoringService.configure(defaultConfig);
      jest.advanceTimersByTime(100);
      
      expect(mockErrorLogger.logError).toHaveBeenCalledWith(
        'Dashboard callback failed',
        expect.any(Error)
      );
      
      unsubscribe();
    });
  });

  describe('Resource Management', () => {
    it('should cleanup resources on destroy', () => {
      monitoringService.configure(defaultConfig);
      monitoringService.destroy();
      
      expect(mockErrorLogger.log).toHaveBeenCalledWith('MigrationMonitoringService destroyed');
    });

    it('should stop all monitoring on destroy', () => {
      monitoringService.configure(defaultConfig);
      
      const startLogCount = (mockErrorLogger.log as jest.Mock).mock.calls.length;
      
      monitoringService.destroy();
      
      // Fast forward time - no more monitoring should occur
      jest.advanceTimersByTime(1000);
      
      const endLogCount = (mockErrorLogger.log as jest.Mock).mock.calls.length;
      expect(endLogCount).toBe(startLogCount + 2); // Only stop monitoring + destroy logs
    });
  });
});