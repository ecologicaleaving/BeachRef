import { useState, useEffect, useCallback } from 'react';
import { SyncManager } from '../services/SyncManager';
import { FilterOptions } from '../types/cache';
import { useNetworkStatus } from './useNetworkStatus';

interface SyncStatus {
  queueLength: number;
  isProcessing: boolean;
  lastSyncAttempt: number;
  networkConnected: boolean;
}

interface UseSyncManagerResult {
  syncStatus: SyncStatus;
  addTournamentSync: (filters?: FilterOptions) => void;
  addMatchSync: (tournamentNo: string) => void;
  forceSyncAll: (filters?: FilterOptions) => Promise<void>;
  clearQueue: () => void;
  isSyncing: boolean;
  lastSyncTime: Date | null;
}

/**
 * React hook for managing automatic sync operations
 * Provides easy access to sync functionality and status
 */
export function useSyncManager(): UseSyncManagerResult {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    queueLength: 0,
    isProcessing: false,
    lastSyncAttempt: 0,
    networkConnected: false,
  });
  const [lastSyncCallback, setLastSyncCallback] = useState<Date | null>(null);
  
  const { isConnected } = useNetworkStatus();
  const syncManager = SyncManager.getInstance();

  // Update sync status periodically
  useEffect(() => {
    const updateStatus = () => {
      const status = syncManager.getSyncStatus();
      setSyncStatus(status);
    };

    // Update immediately
    updateStatus();

    // Set up interval for regular updates
    const interval = setInterval(updateStatus, 1000); // Update every second

    return () => clearInterval(interval);
  }, [syncManager]);

  // Setup sync callback to track successful syncs
  useEffect(() => {
    const unsubscribe = syncManager.addSyncCallback((taskType: string) => {
      // console.log(`Sync completed for ${taskType}`);
      setLastSyncCallback(new Date());
    });

    return unsubscribe;
  }, [syncManager]);

  // Resume sync when component mounts
  useEffect(() => {
    syncManager.resumeSync();
    
    return () => {
      // Note: Don't destroy sync manager on unmount as other components might be using it
      // syncManager.destroy();
    };
  }, [syncManager]);

  const addTournamentSync = useCallback((filters?: FilterOptions) => {
    syncManager.addSyncTask('tournaments', filters);
  }, [syncManager]);

  const addMatchSync = useCallback((tournamentNo: string) => {
    syncManager.addSyncTask('matches', undefined, tournamentNo);
  }, [syncManager]);

  const forceSyncAll = useCallback(async (filters?: FilterOptions) => {
    try {
      await syncManager.forceSyncAll(filters);
      // console.log('Force sync completed successfully');
    } catch (error) {
      // console.error('Force sync failed:', error);
      throw error;
    }
  }, [syncManager]);

  const clearQueue = useCallback(() => {
    syncManager.clearSyncQueue();
  }, [syncManager]);

  return {
    syncStatus: {
      ...syncStatus,
      networkConnected: isConnected,
    },
    addTournamentSync,
    addMatchSync,
    forceSyncAll,
    clearQueue,
    isSyncing: syncStatus.isProcessing || syncStatus.queueLength > 0,
    lastSyncTime: lastSyncCallback,
  };
}

/**
 * Hook for automatically syncing data when network returns
 */
export function useAutoSync(
  filters?: FilterOptions,
  syncMatches: string[] = []
): {
  isSyncing: boolean;
  lastSync: Date | null;
  forceSyncNow: () => Promise<void>;
} {
  const { syncStatus, addTournamentSync, addMatchSync, forceSyncAll } = useSyncManager();
  const { isConnected } = useNetworkStatus();
  const [lastAutoSync, setLastAutoSync] = useState<Date | null>(null);

  // Auto-sync tournaments when network comes online
  useEffect(() => {
    if (isConnected && !syncStatus.isProcessing) {
      // Add tournament sync to queue
      addTournamentSync(filters);
      
      // Add match syncs for specified tournaments
      syncMatches.forEach(tournamentNo => {
        addMatchSync(tournamentNo);
      });
      
      setLastAutoSync(new Date());
      // console.log('Auto-sync triggered due to network connectivity');
    }
  }, [isConnected, addTournamentSync, addMatchSync, filters, syncMatches, syncStatus.isProcessing]);

  const forceSyncNow = useCallback(async () => {
    try {
      await forceSyncAll(filters);
      
      // Sync matches for specified tournaments
      for (const tournamentNo of syncMatches) {
        addMatchSync(tournamentNo);
      }
      
      setLastAutoSync(new Date());
    } catch (error) {
      // console.error('Manual sync failed:', error);
      throw error;
    }
  }, [forceSyncAll, addMatchSync, filters, syncMatches]);

  return {
    isSyncing: syncStatus.isProcessing,
    lastSync: lastAutoSync,
    forceSyncNow,
  };
}