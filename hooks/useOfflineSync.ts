import { useState, useCallback, useEffect, useRef } from 'react';
import { NetworkMonitor } from '../services/NetworkMonitor';
import { SyncManager } from '../services/SyncManager';
import { queryClient } from '../lib/queryClient';
import { queryPerformanceMonitor } from '../lib/queryPerformance';
import { FilterOptions } from '../types/cache';

export interface OfflineSyncConfig {
  enableAutoSync?: boolean;
  syncIntervalMs?: number;
  maxRetries?: number;
  enablePerformanceTracking?: boolean;
  enableVisualIndicators?: boolean;
  syncOnReconnect?: boolean;
  persistOfflineActions?: boolean;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  syncProgress?: {
    current: number;
    total: number;
    currentTask?: string;
  };
  lastSyncTime?: number;
  pendingTasks: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  syncErrors: string[];
}

export interface OfflineSyncActions {
  forceSync: () => Promise<void>;
  queueSync: (type: 'tournaments' | 'matches', filters?: FilterOptions, tournamentNo?: string) => void;
  clearSyncQueue: () => void;
  retryFailedTasks: () => Promise<void>;
  enableAutoSync: () => void;
  disableAutoSync: () => void;
  refreshNetworkStatus: () => Promise<void>;
}

export interface OfflineSyncResult {
  syncStatus: SyncStatus;
  config: OfflineSyncConfig;
  actions: OfflineSyncActions;
  // Visual indicator states
  showOfflineIndicator: boolean;
  showSyncIndicator: boolean;
  syncMessage: string | null;
}

/**
 * Comprehensive offline sync management hook
 * Integrates with NetworkMonitor and SyncManager for seamless offline/online data synchronization
 * Provides visual indicators and performance tracking for sync operations
 */
export function useOfflineSync(config: OfflineSyncConfig = {}): OfflineSyncResult {
  const [currentConfig] = useState<OfflineSyncConfig>({
    enableAutoSync: true,
    syncIntervalMs: 5 * 60 * 1000, // 5 minutes
    maxRetries: 3,
    enablePerformanceTracking: true,
    enableVisualIndicators: true,
    syncOnReconnect: true,
    persistOfflineActions: true,
    ...config
  });

  // Core sync status state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    pendingTasks: 0,
    connectionQuality: 'good',
    syncErrors: []
  });

  // Visual indicator state
  const [showOfflineIndicator, setShowOfflineIndicator] = useState(false);
  const [showSyncIndicator, setShowSyncIndicator] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Service instances
  const networkMonitor = useRef(NetworkMonitor.getInstance());
  const syncManager = useRef(SyncManager.getInstance());
  
  // Cleanup and callback refs
  const networkUnsubscribe = useRef<(() => void) | null>(null);
  const syncUnsubscribe = useRef<(() => void) | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize services and set up listeners
  useEffect(() => {
    const setupNetworkMonitoring = () => {
      // Initial network state
      updateNetworkStatus();

      // Subscribe to network changes
      networkUnsubscribe.current = networkMonitor.current.addListener((isOnline) => {
        setSyncStatus(prev => ({
          ...prev,
          isOnline,
          connectionQuality: networkMonitor.current.getConnectionQuality()
        }));

        // Update visual indicators
        if (currentConfig.enableVisualIndicators) {
          setShowOfflineIndicator(!isOnline);
          
          if (isOnline && currentConfig.syncOnReconnect) {
            setSyncMessage('Connection restored - syncing data...');
            // Clear message after 3 seconds
            setTimeout(() => setSyncMessage(null), 3000);
          } else if (!isOnline) {
            setSyncMessage('Working offline');
            setTimeout(() => setSyncMessage(null), 2000);
          }
        }

        // Auto-sync on reconnection
        if (isOnline && currentConfig.syncOnReconnect && currentConfig.enableAutoSync) {
          setTimeout(() => {
            syncManager.current.resumeSync();
          }, 1000); // Wait 1 second for connection to stabilize
        }
      });
    };

    const setupSyncMonitoring = () => {
      // Subscribe to sync completion events
      syncUnsubscribe.current = syncManager.current.addSyncCallback((taskType) => {
        if (currentConfig.enablePerformanceTracking) {
          // Track successful sync operations
          const endTime = Date.now();
          const startTime = syncStatus.lastSyncTime || endTime;
          
          queryPerformanceMonitor.trackQuery(
            ['offline-sync', taskType],
            startTime,
            endTime,
            { taskType, success: true },
            undefined
          );
        }

        // Update sync status and visual indicators
        updateSyncStatus();
        
        if (currentConfig.enableVisualIndicators) {
          setSyncMessage(`${taskType} synced successfully`);
          setTimeout(() => setSyncMessage(null), 2000);
        }
      });

      // Start auto-sync if enabled
      if (currentConfig.enableAutoSync) {
        syncManager.current.resumeSync();
      }
    };

    setupNetworkMonitoring();
    setupSyncMonitoring();

    // Set up periodic status updates
    const statusInterval = setInterval(updateSyncStatus, 10000); // Every 10 seconds

    return () => {
      // Cleanup
      if (networkUnsubscribe.current) {
        networkUnsubscribe.current();
      }
      if (syncUnsubscribe.current) {
        syncUnsubscribe.current();
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      clearInterval(statusInterval);
    };
  }, [currentConfig]);

  // Update network status from NetworkMonitor
  const updateNetworkStatus = useCallback(async () => {
    try {
      const networkState = await networkMonitor.current.getNetworkState();
      setSyncStatus(prev => ({
        ...prev,
        isOnline: networkState.isConnected,
        connectionQuality: networkMonitor.current.getConnectionQuality()
      }));
    } catch (error) {
      // Fallback to basic connection status
      setSyncStatus(prev => ({
        ...prev,
        isOnline: networkMonitor.current.isConnected,
        connectionQuality: 'poor'
      }));
    }
  }, []);

  // Update sync status from SyncManager
  const updateSyncStatus = useCallback(() => {
    const syncManagerStatus = syncManager.current.getSyncStatus();
    
    setSyncStatus(prev => ({
      ...prev,
      isSyncing: syncManagerStatus.isProcessing,
      pendingTasks: syncManagerStatus.queueLength,
      lastSyncTime: syncManagerStatus.lastSyncAttempt || prev.lastSyncTime,
      isOnline: syncManagerStatus.networkConnected
    }));

    // Update visual indicators
    if (currentConfig.enableVisualIndicators) {
      setShowSyncIndicator(syncManagerStatus.isProcessing);
    }
  }, [currentConfig.enableVisualIndicators]);

  // Force sync all data
  const forceSync = useCallback(async () => {
    if (!syncStatus.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true, syncErrors: [] }));
    
    if (currentConfig.enableVisualIndicators) {
      setShowSyncIndicator(true);
      setSyncMessage('Syncing all data...');
    }

    const startTime = Date.now();

    try {
      const result = await syncManager.current.forceSyncAll();
      
      // Invalidate TanStack Query cache to force fresh data
      await queryClient.invalidateQueries();
      
      // Update sync status
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: Date.now(),
        syncErrors: []
      }));

      // Performance tracking
      if (currentConfig.enablePerformanceTracking) {
        queryPerformanceMonitor.trackQuery(
          ['offline-sync', 'force-sync'],
          startTime,
          Date.now(),
          result,
          undefined
        );
      }

      if (currentConfig.enableVisualIndicators) {
        setSyncMessage('Sync completed successfully');
        setTimeout(() => {
          setSyncMessage(null);
          setShowSyncIndicator(false);
        }, 2000);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        syncErrors: [...prev.syncErrors, errorMessage]
      }));

      // Performance tracking for errors
      if (currentConfig.enablePerformanceTracking) {
        queryPerformanceMonitor.trackQuery(
          ['offline-sync', 'force-sync'],
          startTime,
          Date.now(),
          null,
          error as Error
        );
      }

      if (currentConfig.enableVisualIndicators) {
        setSyncMessage(`Sync failed: ${errorMessage}`);
        setTimeout(() => {
          setSyncMessage(null);
          setShowSyncIndicator(false);
        }, 5000);
      }

      throw error;
    }
  }, [syncStatus.isOnline, currentConfig]);

  // Queue sync task
  const queueSync = useCallback((
    type: 'tournaments' | 'matches',
    filters?: FilterOptions,
    tournamentNo?: string
  ) => {
    syncManager.current.addSyncTask(
      type,
      filters,
      tournamentNo,
      currentConfig.maxRetries
    );

    // Update pending tasks count
    updateSyncStatus();

    if (currentConfig.enableVisualIndicators && !syncStatus.isOnline) {
      setSyncMessage(`${type} sync queued for when online`);
      setTimeout(() => setSyncMessage(null), 3000);
    }
  }, [currentConfig.maxRetries, currentConfig.enableVisualIndicators, syncStatus.isOnline]);

  // Clear sync queue
  const clearSyncQueue = useCallback(() => {
    syncManager.current.clearSyncQueue();
    updateSyncStatus();
    
    if (currentConfig.enableVisualIndicators) {
      setSyncMessage('Sync queue cleared');
      setTimeout(() => setSyncMessage(null), 2000);
    }
  }, [currentConfig.enableVisualIndicators]);

  // Retry failed tasks
  const retryFailedTasks = useCallback(async () => {
    if (!syncStatus.isOnline) {
      throw new Error('Cannot retry tasks while offline');
    }

    setSyncStatus(prev => ({ ...prev, syncErrors: [] }));
    syncManager.current.resumeSync();
    
    if (currentConfig.enableVisualIndicators) {
      setSyncMessage('Retrying failed sync tasks...');
      setTimeout(() => setSyncMessage(null), 3000);
    }
  }, [syncStatus.isOnline, currentConfig.enableVisualIndicators]);

  // Enable auto sync
  const enableAutoSync = useCallback(() => {
    syncManager.current.resumeSync();
    updateSyncStatus();
  }, []);

  // Disable auto sync
  const disableAutoSync = useCallback(() => {
    // Note: SyncManager doesn't have a direct disable method,
    // but we can pause it and clear the queue if needed
    syncManager.current.clearSyncQueue();
  }, []);

  // Refresh network status
  const refreshNetworkStatus = useCallback(async () => {
    await updateNetworkStatus();
    
    // Force a network connectivity check
    const isReachable = await networkMonitor.current.checkReachability();
    setSyncStatus(prev => ({
      ...prev,
      connectionQuality: isReachable ? 
        networkMonitor.current.getConnectionQuality() : 'poor'
    }));
  }, [updateNetworkStatus]);

  // Actions object
  const actions: OfflineSyncActions = {
    forceSync,
    queueSync,
    clearSyncQueue,
    retryFailedTasks,
    enableAutoSync,
    disableAutoSync,
    refreshNetworkStatus
  };

  return {
    syncStatus,
    config: currentConfig,
    actions,
    showOfflineIndicator,
    showSyncIndicator,
    syncMessage
  };
}

export default useOfflineSync;