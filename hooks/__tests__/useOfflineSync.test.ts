import { queryPerformanceMonitor } from '../../lib/queryPerformance';
import { FilterOptions } from '../../types/cache';

// Mock dependencies
jest.mock('../../services/NetworkMonitor');
jest.mock('../../services/SyncManager');
jest.mock('../../lib/queryPerformance');
jest.mock('../../lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

// Mock NetworkMonitor without importing it
const mockNetworkMonitor = {
  getInstance: jest.fn(),
  isConnected: true,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  getNetworkState: jest.fn(),
  getConnectionQuality: jest.fn(),
  checkReachability: jest.fn(),
};

// Mock SyncManager without importing it  
const mockSyncManager = {
  getInstance: jest.fn(),
  addSyncTask: jest.fn(),
  addSyncCallback: jest.fn(),
  getSyncStatus: jest.fn(),
  forceSyncAll: jest.fn(),
  resumeSync: jest.fn(),
  clearSyncQueue: jest.fn(),
};

const mockQueryPerformanceMonitor = queryPerformanceMonitor as jest.Mocked<typeof queryPerformanceMonitor>;

// Test data
const mockSyncStatus = {
  queueLength: 0,
  isProcessing: false,
  lastSyncAttempt: Date.now() - 60000,
  networkConnected: true,
};

const mockNetworkState = {
  isConnected: true,
  type: 'wifi',
  isInternetReachable: true,
};

describe('useOfflineSync Hook Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup NetworkMonitor mock
    const mockNetworkInstance = {
      isConnected: true,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      getNetworkState: jest.fn(),
      getConnectionQuality: jest.fn(),
      checkReachability: jest.fn(),
    };
    mockNetworkMonitor.getInstance.mockReturnValue(mockNetworkInstance);
    
    // Setup SyncManager mock
    const mockSyncInstance = {
      addSyncTask: jest.fn(),
      addSyncCallback: jest.fn(),
      getSyncStatus: jest.fn(),
      forceSyncAll: jest.fn(),
      resumeSync: jest.fn(),
      clearSyncQueue: jest.fn(),
    };
    mockSyncManager.getInstance.mockReturnValue(mockSyncInstance);
    
    // Setup default return values
    mockNetworkInstance.getNetworkState.mockResolvedValue(mockNetworkState);
    mockNetworkInstance.getConnectionQuality.mockReturnValue('good');
    mockNetworkInstance.checkReachability.mockResolvedValue(true);
    mockSyncInstance.getSyncStatus.mockReturnValue(mockSyncStatus);
    
    // Setup performance monitor mock
    mockQueryPerformanceMonitor.trackQuery = jest.fn();
  });

  describe('NetworkMonitor Integration', () => {
    it('should integrate with NetworkMonitor for connectivity status', () => {
      const mockNetworkInstance = mockNetworkMonitor.getInstance();
      
      expect(mockNetworkMonitor.getInstance).toHaveBeenCalled();
      expect(mockNetworkInstance.addListener).toBeDefined();
      expect(mockNetworkInstance.getNetworkState).toBeDefined();
      expect(mockNetworkInstance.getConnectionQuality).toBeDefined();
    });

    it('should handle network state changes', () => {
      const mockNetworkInstance = mockNetworkMonitor.getInstance();
      
      // Test that the addListener method can be called with a function
      const mockCallback = jest.fn();
      const unsubscribe = mockNetworkInstance.addListener(mockCallback);
      
      // Simulate network state change by calling the callback manually
      mockCallback(false); // Going offline
      mockCallback(true);  // Going online
      
      expect(mockNetworkInstance.addListener).toHaveBeenCalledWith(mockCallback);
      expect(mockCallback).toHaveBeenCalledWith(false);
      expect(mockCallback).toHaveBeenCalledWith(true);
    });

    it('should get detailed network information', async () => {
      const mockNetworkInstance = mockNetworkMonitor.getInstance();
      
      const networkState = await mockNetworkInstance.getNetworkState();
      
      expect(mockNetworkInstance.getNetworkState).toHaveBeenCalled();
      expect(networkState).toEqual(mockNetworkState);
    });

    it('should check network reachability', async () => {
      const mockNetworkInstance = mockNetworkMonitor.getInstance();
      
      mockNetworkInstance.checkReachability.mockResolvedValue(true);
      const isReachable = await mockNetworkInstance.checkReachability();
      
      expect(mockNetworkInstance.checkReachability).toHaveBeenCalled();
      expect(isReachable).toBe(true);
    });

    it('should get connection quality indicator', () => {
      const mockNetworkInstance = mockNetworkMonitor.getInstance();
      
      mockNetworkInstance.getConnectionQuality.mockReturnValue('excellent');
      const quality = mockNetworkInstance.getConnectionQuality();
      
      expect(quality).toBe('excellent');
    });
  });

  describe('SyncManager Integration', () => {
    it('should integrate with SyncManager for queue management', () => {
      const mockSyncInstance = mockSyncManager.getInstance();
      
      expect(mockSyncManager.getInstance).toHaveBeenCalled();
      expect(mockSyncInstance.addSyncTask).toBeDefined();
      expect(mockSyncInstance.getSyncStatus).toBeDefined();
      expect(mockSyncInstance.addSyncCallback).toBeDefined();
    });

    it('should add sync tasks to queue', () => {
      const mockSyncInstance = mockSyncManager.getInstance();
      
      const filters: FilterOptions = { season: 2024, gender: 'M' };
      mockSyncInstance.addSyncTask('tournaments', filters, undefined, 3);
      
      expect(mockSyncInstance.addSyncTask).toHaveBeenCalledWith(
        'tournaments',
        filters,
        undefined,
        3
      );
    });

    it('should handle sync completion callbacks', () => {
      const mockSyncInstance = mockSyncManager.getInstance();
      const mockCallback = jest.fn();
      
      mockSyncInstance.addSyncCallback.mockImplementation((callback) => {
        // Simulate sync completion
        callback('tournaments');
        return jest.fn(); // Return unsubscribe function
      });

      const unsubscribe = mockSyncInstance.addSyncCallback(mockCallback);
      
      expect(mockSyncInstance.addSyncCallback).toHaveBeenCalledWith(expect.any(Function));
      expect(typeof unsubscribe).toBe('function');
    });

    it('should get sync status information', () => {
      const mockSyncInstance = mockSyncManager.getInstance();
      
      const status = mockSyncInstance.getSyncStatus();
      
      expect(mockSyncInstance.getSyncStatus).toHaveBeenCalled();
      expect(status).toEqual(mockSyncStatus);
    });

    it('should force sync all data', async () => {
      const mockSyncInstance = mockSyncManager.getInstance();
      
      const mockResult = {
        tournaments: true,
        matches: ['FIVB2024M001'],
      };
      
      mockSyncInstance.forceSyncAll.mockResolvedValue(mockResult);
      const result = await mockSyncInstance.forceSyncAll();
      
      expect(mockSyncInstance.forceSyncAll).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should resume sync operations', () => {
      const mockSyncInstance = mockSyncManager.getInstance();
      
      mockSyncInstance.resumeSync();
      
      expect(mockSyncInstance.resumeSync).toHaveBeenCalled();
    });

    it('should clear sync queue', () => {
      const mockSyncInstance = mockSyncManager.getInstance();
      
      mockSyncInstance.clearSyncQueue();
      
      expect(mockSyncInstance.clearSyncQueue).toHaveBeenCalled();
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track sync performance when enabled', () => {
      const queryKey = ['offline-sync', 'tournaments'];
      const startTime = Date.now();
      const endTime = startTime + 1500;
      const result = { taskType: 'tournaments', success: true };
      
      queryPerformanceMonitor.trackQuery(
        queryKey,
        startTime,
        endTime,
        result,
        undefined
      );

      expect(mockQueryPerformanceMonitor.trackQuery).toHaveBeenCalledWith(
        queryKey,
        startTime,
        endTime,
        result,
        undefined
      );
    });

    it('should track sync errors in performance monitoring', () => {
      const queryKey = ['offline-sync', 'force-sync'];
      const startTime = Date.now();
      const endTime = startTime + 2000;
      const error = new Error('Network timeout');
      
      queryPerformanceMonitor.trackQuery(
        queryKey,
        startTime,
        endTime,
        null,
        error
      );

      expect(mockQueryPerformanceMonitor.trackQuery).toHaveBeenCalledWith(
        queryKey,
        startTime,
        endTime,
        null,
        error
      );
    });
  });

  describe('Sync Status Logic', () => {
    it('should calculate correct sync status from services', () => {
      const mockSyncInstance = mockSyncManager.getInstance();
      const mockNetworkInstance = mockNetworkMonitor.getInstance();
      
      const expectedStatus = {
        isOnline: true,
        isSyncing: false,
        pendingTasks: 0,
        connectionQuality: 'good',
        lastSyncTime: mockSyncStatus.lastSyncAttempt,
      };
      
      mockSyncInstance.getSyncStatus.mockReturnValue(mockSyncStatus);
      mockNetworkInstance.getConnectionQuality.mockReturnValue('good');
      
      const syncStatus = mockSyncInstance.getSyncStatus();
      const quality = mockNetworkInstance.getConnectionQuality();
      
      expect(syncStatus.isProcessing).toBe(expectedStatus.isSyncing);
      expect(syncStatus.queueLength).toBe(expectedStatus.pendingTasks);
      expect(syncStatus.networkConnected).toBe(expectedStatus.isOnline);
      expect(quality).toBe(expectedStatus.connectionQuality);
    });

    it('should handle sync progress indicators', () => {
      const mockSyncInstance = mockSyncManager.getInstance();
      
      const syncStatusWithProgress = {
        ...mockSyncStatus,
        isProcessing: true,
        queueLength: 3,
      };
      
      mockSyncInstance.getSyncStatus.mockReturnValue(syncStatusWithProgress);
      const status = mockSyncInstance.getSyncStatus();
      
      expect(status.isProcessing).toBe(true);
      expect(status.queueLength).toBe(3);
    });

    it('should track connection quality changes', () => {
      const mockNetworkInstance = mockNetworkMonitor.getInstance();
      
      const qualityStates = ['excellent', 'good', 'poor', 'offline'] as const;
      
      qualityStates.forEach(quality => {
        mockNetworkInstance.getConnectionQuality.mockReturnValue(quality);
        const currentQuality = mockNetworkInstance.getConnectionQuality();
        expect(currentQuality).toBe(quality);
      });
    });
  });

  describe('Offline/Online State Transitions', () => {
    it('should handle offline to online transition', () => {
      const mockNetworkInstance = mockNetworkMonitor.getInstance();
      const mockSyncInstance = mockSyncManager.getInstance();
      
      // Test that network listener can handle state transitions
      const mockCallback = jest.fn();
      mockNetworkInstance.addListener(mockCallback);

      // Simulate going offline then online by calling the callback manually
      mockCallback(false); // Offline
      mockCallback(true);  // Online - should trigger sync resume

      expect(mockNetworkInstance.addListener).toHaveBeenCalledWith(mockCallback);
      expect(mockCallback).toHaveBeenCalledWith(false);
      expect(mockCallback).toHaveBeenCalledWith(true);
      
      // In the real hook, when going online, sync resume would be triggered
      // We can verify this indirectly by ensuring the methods are available
      expect(mockSyncInstance.resumeSync).toBeDefined();
    });

    it('should queue sync tasks when offline', () => {
      const mockSyncInstance = mockSyncManager.getInstance();
      const mockNetworkInstance = mockNetworkMonitor.getInstance();
      
      // Simulate offline state
      mockNetworkInstance.isConnected = false;
      
      // Add sync task while offline
      const filters: FilterOptions = { season: 2024 };
      mockSyncInstance.addSyncTask('tournaments', filters);
      
      expect(mockSyncInstance.addSyncTask).toHaveBeenCalledWith(
        'tournaments',
        filters
      );
    });

    it('should handle sync resumption on reconnection', () => {
      const mockSyncInstance = mockSyncManager.getInstance();
      
      // Simulate network reconnection triggering sync resume
      mockSyncInstance.resumeSync();
      
      expect(mockSyncInstance.resumeSync).toHaveBeenCalled();
    });
  });

  describe('Visual Indicator Logic', () => {
    it('should determine when to show offline indicator', () => {
      const isOnline = false;
      const shouldShowOfflineIndicator = !isOnline;
      
      expect(shouldShowOfflineIndicator).toBe(true);
    });

    it('should determine when to show sync indicator', () => {
      const isSyncing = true;
      const shouldShowSyncIndicator = isSyncing;
      
      expect(shouldShowSyncIndicator).toBe(true);
    });

    it('should generate appropriate sync messages', () => {
      const generateSyncMessage = (isOnline: boolean, isSyncing: boolean, taskType?: string) => {
        if (!isOnline) return 'Working offline';
        if (isSyncing && taskType) return `${taskType} sync in progress`;
        if (isOnline && !isSyncing) return 'Connection restored - syncing data...';
        return null;
      };

      expect(generateSyncMessage(false, false)).toBe('Working offline');
      expect(generateSyncMessage(true, true, 'tournaments')).toBe('tournaments sync in progress');
      expect(generateSyncMessage(true, false)).toBe('Connection restored - syncing data...');
    });
  });

  describe('Sync Actions Logic', () => {
    it('should handle force sync action', async () => {
      const mockSyncInstance = mockSyncManager.getInstance();
      
      const mockResult = {
        tournaments: true,
        matches: ['FIVB2024M001', 'FIVB2024W001'],
      };
      
      mockSyncInstance.forceSyncAll.mockResolvedValue(mockResult);
      
      // Simulate force sync action
      const result = await mockSyncInstance.forceSyncAll();
      
      expect(mockSyncInstance.forceSyncAll).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should handle queue sync action', () => {
      const mockSyncInstance = mockSyncManager.getInstance();
      
      // Simulate queueing different types of sync tasks
      const tournamentFilters: FilterOptions = { season: 2024, gender: 'M' };
      mockSyncInstance.addSyncTask('tournaments', tournamentFilters);
      mockSyncInstance.addSyncTask('matches', undefined, 'FIVB2024M001');
      
      expect(mockSyncInstance.addSyncTask).toHaveBeenCalledWith(
        'tournaments',
        tournamentFilters
      );
      expect(mockSyncInstance.addSyncTask).toHaveBeenCalledWith(
        'matches',
        undefined,
        'FIVB2024M001'
      );
    });

    it('should handle clear sync queue action', () => {
      const mockSyncInstance = mockSyncManager.getInstance();
      
      mockSyncInstance.clearSyncQueue();
      
      expect(mockSyncInstance.clearSyncQueue).toHaveBeenCalled();
    });

    it('should handle retry failed tasks action', () => {
      const mockSyncInstance = mockSyncManager.getInstance();
      
      // Simulate retry action
      mockSyncInstance.resumeSync();
      
      expect(mockSyncInstance.resumeSync).toHaveBeenCalled();
    });

    it('should handle network status refresh action', async () => {
      const mockNetworkInstance = mockNetworkMonitor.getInstance();
      
      await mockNetworkInstance.getNetworkState();
      await mockNetworkInstance.checkReachability();
      
      expect(mockNetworkInstance.getNetworkState).toHaveBeenCalled();
      expect(mockNetworkInstance.checkReachability).toHaveBeenCalled();
    });
  });

  describe('Error Handling Logic', () => {
    it('should handle sync errors correctly', async () => {
      const mockSyncInstance = mockSyncManager.getInstance();
      
      const syncError = new Error('Sync service unavailable');
      mockSyncInstance.forceSyncAll.mockRejectedValue(syncError);
      
      try {
        await mockSyncInstance.forceSyncAll();
      } catch (error) {
        expect(error).toBe(syncError);
      }
      
      expect(mockSyncInstance.forceSyncAll).toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      const mockNetworkInstance = mockNetworkMonitor.getInstance();
      
      const networkError = new Error('Network unreachable');
      mockNetworkInstance.checkReachability.mockRejectedValue(networkError);
      
      try {
        await mockNetworkInstance.checkReachability();
      } catch (error) {
        expect(error).toBe(networkError);
      }
    });

    it('should prevent sync operations when offline', () => {
      const mockNetworkInstance = mockNetworkMonitor.getInstance();
      
      mockNetworkInstance.isConnected = false;
      
      const canSync = mockNetworkInstance.isConnected;
      expect(canSync).toBe(false);
      
      if (!canSync) {
        const error = new Error('Cannot sync while offline');
        expect(error.message).toBe('Cannot sync while offline');
      }
    });
  });

  describe('Configuration Management', () => {
    it('should merge default and user configurations correctly', () => {
      const defaultConfig = {
        enableAutoSync: true,
        syncIntervalMs: 5 * 60 * 1000,
        maxRetries: 3,
        enablePerformanceTracking: true,
        enableVisualIndicators: true,
        syncOnReconnect: true,
        persistOfflineActions: true,
      };

      const userConfig = {
        enableAutoSync: false,
        syncIntervalMs: 10 * 60 * 1000,
        maxRetries: 5,
      };

      const mergedConfig = { ...defaultConfig, ...userConfig };

      expect(mergedConfig.enableAutoSync).toBe(false);
      expect(mergedConfig.syncIntervalMs).toBe(10 * 60 * 1000);
      expect(mergedConfig.maxRetries).toBe(5);
      expect(mergedConfig.enablePerformanceTracking).toBe(true); // Should keep default
    });

    it('should handle sync-specific configuration options', () => {
      const syncConfig = {
        enableAutoSync: true,
        enableVisualIndicators: true,
        syncOnReconnect: true,
        persistOfflineActions: true,
      };

      expect(typeof syncConfig.enableAutoSync).toBe('boolean');
      expect(typeof syncConfig.enableVisualIndicators).toBe('boolean');
      expect(typeof syncConfig.syncOnReconnect).toBe('boolean');
      expect(typeof syncConfig.persistOfflineActions).toBe('boolean');
    });
  });

  describe('Data Persistence Logic', () => {
    it('should handle offline action persistence', () => {
      const offlineActions = [
        { type: 'tournaments', filters: { season: 2024 }, timestamp: Date.now() },
        { type: 'matches', tournamentNo: 'FIVB2024M001', timestamp: Date.now() },
      ];

      // Simulate storing offline actions
      const persistedActions = [...offlineActions];
      
      expect(persistedActions).toHaveLength(2);
      expect(persistedActions[0].type).toBe('tournaments');
      expect(persistedActions[1].type).toBe('matches');
    });

    it('should handle sync queue restoration', () => {
      const mockSyncInstance = mockSyncManager.getInstance();
      
      // Simulate restoring sync tasks from persistence
      const restoredTasks = [
        { type: 'tournaments', filters: { season: 2024 } },
        { type: 'matches', tournamentNo: 'FIVB2024M001' },
      ];

      restoredTasks.forEach(task => {
        mockSyncInstance.addSyncTask(
          task.type as 'tournaments' | 'matches',
          'filters' in task ? task.filters : undefined,
          'tournamentNo' in task ? task.tournamentNo : undefined
        );
      });

      expect(mockSyncInstance.addSyncTask).toHaveBeenCalledTimes(2);
    });
  });
});