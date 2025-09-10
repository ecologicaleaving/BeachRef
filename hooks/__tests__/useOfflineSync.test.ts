import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOfflineSync, OfflineSyncConfig } from '../useOfflineSync';
import { NetworkMonitor } from '../../services/NetworkMonitor';
import { SyncManager } from '../../services/SyncManager';
import { supabase } from '../../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';

// Mock dependencies
jest.mock('../../services/NetworkMonitor');
jest.mock('../../services/SyncManager');
jest.mock('../../services/supabase');
jest.mock('@react-native-async-storage/async-storage');

// Mock timers
jest.useFakeTimers();

const mockNetworkMonitor = {
  getInstance: jest.fn(() => mockNetworkMonitor),
  isConnected: true,
  addListener: jest.fn(() => jest.fn()),
  getNetworkState: jest.fn(),
  getConnectionQuality: jest.fn(() => 'good'),
  checkReachability: jest.fn(() => Promise.resolve(true)),
};

const mockSyncManager = {
  getInstance: jest.fn(() => mockSyncManager),
  addSyncTask: jest.fn(),
  clearSyncQueue: jest.fn(),
  forceSyncAll: jest.fn(),
  resumeSync: jest.fn(),
  getSyncStatus: jest.fn(() => ({
    isProcessing: false,
    queueLength: 0,
    lastSyncAttempt: Date.now(),
    networkConnected: true
  })),
  addSyncCallback: jest.fn(() => jest.fn()),
};

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: [],
        error: null
      })),
      in: jest.fn(() => ({
        data: [],
        error: null
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: null,
        error: null
      }))
    }))
  }))
};

const mockAsyncStorage = {
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
};

// Setup mocks
(NetworkMonitor as jest.Mocked<typeof NetworkMonitor>).getInstance = mockNetworkMonitor.getInstance;
(SyncManager as jest.Mocked<typeof SyncManager>).getInstance = mockSyncManager.getInstance;
(supabase as any) = mockSupabase;
(AsyncStorage as jest.Mocked<typeof AsyncStorage>).setItem = mockAsyncStorage.setItem;
(AsyncStorage as jest.Mocked<typeof AsyncStorage>).getItem = mockAsyncStorage.getItem;
(AsyncStorage as jest.Mocked<typeof AsyncStorage>).removeItem = mockAsyncStorage.removeItem;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useOfflineSync Hook - Enhanced Queue Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetworkMonitor.getNetworkState.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with default configuration', () => {
      const { result } = renderHook(
        () => useOfflineSync(),
        { wrapper: createWrapper() }
      );

      expect(result.current.config.enableAutoSync).toBe(true);
      expect(result.current.config.syncIntervalMs).toBe(5 * 60 * 1000);
      expect(result.current.config.persistOfflineActions).toBe(true);
      expect(result.current.syncStatus.isOnline).toBe(true);
      expect(result.current.syncStatus.conflictCount).toBe(0);
    });

    it('should merge custom configuration', () => {
      const config: OfflineSyncConfig = {
        enableAutoSync: false,
        syncIntervalMs: 10000,
        maxRetries: 5,
        enableVisualIndicators: false
      };

      const { result } = renderHook(
        () => useOfflineSync(config),
        { wrapper: createWrapper() }
      );

      expect(result.current.config.enableAutoSync).toBe(false);
      expect(result.current.config.syncIntervalMs).toBe(10000);
      expect(result.current.config.maxRetries).toBe(5);
      expect(result.current.config.enableVisualIndicators).toBe(false);
    });

    it('should load offline queue on initialization', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({
        queueLength: 3,
        timestamp: Date.now(),
        isProcessing: false
      }));

      const { result } = renderHook(
        () => useOfflineSync({ persistOfflineActions: true }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('offline_sync_queue');
      });
    });
  });

  describe('Network Status Management', () => {
    it('should handle network state changes', async () => {
      let networkCallback: (isOnline: boolean) => void = () => {};
      mockNetworkMonitor.addListener.mockImplementation((callback) => {
        networkCallback = callback;
        return jest.fn();
      });

      const { result } = renderHook(
        () => useOfflineSync({ enableVisualIndicators: true }),
        { wrapper: createWrapper() }
      );

      // Simulate going offline
      act(() => {
        networkCallback(false);
      });

      expect(result.current.showOfflineIndicator).toBe(true);
      expect(result.current.syncMessage).toBe('Working offline');

      // Simulate coming back online
      act(() => {
        networkCallback(true);
      });

      await waitFor(() => {
        expect(result.current.syncMessage).toBe('Connection restored - syncing data...');
      });
    });

    it('should refresh network status', async () => {
      const { result } = renderHook(
        () => useOfflineSync(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.actions.refreshNetworkStatus();
      });

      expect(mockNetworkMonitor.checkReachability).toHaveBeenCalled();
      expect(mockNetworkMonitor.getConnectionQuality).toHaveBeenCalled();
    });
  });

  describe('Sync Queue Management', () => {
    it('should queue sync tasks', async () => {
      const { result } = renderHook(
        () => useOfflineSync({ persistOfflineActions: true }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.actions.queueSync('tournaments', { season: 2024 });
      });

      expect(mockSyncManager.addSyncTask).toHaveBeenCalledWith(
        'tournaments',
        { season: 2024 },
        undefined,
        3 // default maxRetries
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should clear sync queue', () => {
      const { result } = renderHook(
        () => useOfflineSync({ enableVisualIndicators: true }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.actions.clearSyncQueue();
      });

      expect(mockSyncManager.clearSyncQueue).toHaveBeenCalled();
      expect(result.current.syncMessage).toBe('Sync queue cleared');
    });

    it('should handle force sync', async () => {
      mockSyncManager.forceSyncAll.mockResolvedValue({ success: true });

      const { result } = renderHook(
        () => useOfflineSync({ enableVisualIndicators: true }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.actions.forceSync();
      });

      expect(mockSyncManager.forceSyncAll).toHaveBeenCalled();
      expect(result.current.syncMessage).toBe('Sync completed successfully');
    });

    it('should handle force sync errors', async () => {
      const error = new Error('Sync failed');
      mockSyncManager.forceSyncAll.mockRejectedValue(error);

      const { result } = renderHook(
        () => useOfflineSync({ enableVisualIndicators: true }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        try {
          await result.current.actions.forceSync();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.syncStatus.syncErrors).toContain('Sync failed');
      expect(result.current.syncMessage).toBe('Sync failed: Sync failed');
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve sync conflicts', async () => {
      const mockConflicts = [
        { id: 1, table_name: 'tournaments', has_conflicts: true },
        { id: 2, table_name: 'matches', has_conflicts: true }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: mockConflicts,
            error: null
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: null,
            error: null
          }))
        }))
      });

      const { result } = renderHook(
        () => useOfflineSync({ enableVisualIndicators: true }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.actions.resolveConflicts();
      });

      expect(result.current.syncStatus.conflictCount).toBe(0);
      expect(result.current.syncMessage).toBe('Resolved 2 sync conflicts');
    });

    it('should handle conflict resolution errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: null,
            error: { message: 'Database error' }
          }))
        }))
      });

      const { result } = renderHook(
        () => useOfflineSync(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        try {
          await result.current.actions.resolveConflicts();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.syncStatus.syncErrors).toContain('Database error');
    });
  });

  describe('Data Freshness Monitoring', () => {
    it('should check data freshness', async () => {
      const mockSyncStatuses = [
        { table_name: 'tournaments', last_sync_at: '2024-01-01T10:00:00Z' },
        { table_name: 'matches', last_sync_at: '2024-01-01T11:00:00Z' },
        { table_name: 'referees', last_sync_at: '2024-01-01T12:00:00Z' }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          in: jest.fn(() => ({
            data: mockSyncStatuses,
            error: null
          }))
        }))
      });

      const { result } = renderHook(
        () => useOfflineSync(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.actions.checkDataFreshness();
      });

      expect(result.current.syncStatus.dataFreshness).toEqual({
        tournaments: '2024-01-01T10:00:00Z',
        matches: '2024-01-01T11:00:00Z',
        referees: '2024-01-01T12:00:00Z'
      });
    });

    it('should handle data freshness check errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          in: jest.fn(() => ({
            data: null,
            error: { message: 'Network error' }
          }))
        }))
      });

      const { result } = renderHook(
        () => useOfflineSync(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.actions.checkDataFreshness();
      });

      // Should not throw error, but log it
      expect(result.current.syncStatus.dataFreshness).toBeDefined();
    });
  });

  describe('Offline Queue Persistence', () => {
    it('should persist offline queue', async () => {
      mockSyncManager.getSyncStatus.mockReturnValue({
        isProcessing: true,
        queueLength: 5,
        lastSyncAttempt: Date.now(),
        networkConnected: false
      });

      const { result } = renderHook(
        () => useOfflineSync({ persistOfflineActions: true }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.actions.persistOfflineQueue();
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_sync_queue',
        expect.stringContaining('"queueLength":5')
      );
    });

    it('should load offline queue from storage', async () => {
      const mockQueueData = {
        queueLength: 3,
        timestamp: Date.now(),
        isProcessing: false
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueueData));

      const { result } = renderHook(
        () => useOfflineSync({ persistOfflineActions: true }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.actions.loadOfflineQueue();
      });

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('offline_sync_queue');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('offline_sync_queue');
      expect(result.current.syncStatus.pendingTasks).toBe(3);
    });

    it('should handle storage errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(
        () => useOfflineSync({ persistOfflineActions: true }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.actions.persistOfflineQueue();
      });

      // Should not throw error, but log it
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Visual Indicators', () => {
    it('should show sync indicators when enabled', async () => {
      mockSyncManager.getSyncStatus.mockReturnValue({
        isProcessing: true,
        queueLength: 2,
        lastSyncAttempt: Date.now(),
        networkConnected: true
      });

      const { result } = renderHook(
        () => useOfflineSync({ enableVisualIndicators: true }),
        { wrapper: createWrapper() }
      );

      // Trigger status update
      act(() => {
        jest.advanceTimersByTime(30000); // 30 seconds
      });

      await waitFor(() => {
        expect(result.current.showSyncIndicator).toBe(true);
      });
    });

    it('should not show indicators when disabled', () => {
      const { result } = renderHook(
        () => useOfflineSync({ enableVisualIndicators: false }),
        { wrapper: createWrapper() }
      );

      expect(result.current.showOfflineIndicator).toBe(false);
      expect(result.current.showSyncIndicator).toBe(false);
      expect(result.current.syncMessage).toBeNull();
    });
  });

  describe('Auto-sync Management', () => {
    it('should enable auto-sync', () => {
      const { result } = renderHook(
        () => useOfflineSync(),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.actions.enableAutoSync();
      });

      expect(mockSyncManager.resumeSync).toHaveBeenCalled();
    });

    it('should disable auto-sync', () => {
      const { result } = renderHook(
        () => useOfflineSync(),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.actions.disableAutoSync();
      });

      expect(mockSyncManager.clearSyncQueue).toHaveBeenCalled();
    });
  });

  describe('Periodic Updates', () => {
    it('should perform periodic status updates', async () => {
      const { result } = renderHook(
        () => useOfflineSync(),
        { wrapper: createWrapper() }
      );

      // Fast forward 30 seconds to trigger periodic update
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockSyncManager.getSyncStatus).toHaveBeenCalled();
    });
  });
});