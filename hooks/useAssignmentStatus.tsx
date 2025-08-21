/**
 * Assignment Status Context Hook
 * Global assignment status state management for cross-screen status sharing
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AssignmentStatusManager, { AssignmentStatusState, StatusUpdateEvent, AssignmentStatus } from '../services/AssignmentStatusService';
import NetInfo from '@react-native-community/netinfo';

interface AssignmentStatusContextType {
  // Current status states
  currentAssignmentStatus: AssignmentStatusState | null;
  allStatuses: AssignmentStatusState[];
  
  // Status counters for navigation badges
  statusCounts: {
    current: number;
    upcoming: number;
    completed: number;
    cancelled: number;
    emergency: number;
  };
  
  // Network and sync status
  isOnline: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline';
  pendingSyncCount: number;
  
  // Status management methods
  updateAssignmentStatus: (assignmentId: string, status: AssignmentStatus, urgency?: 'normal' | 'warning' | 'critical') => Promise<void>;
  getAssignmentStatus: (assignmentId: string) => AssignmentStatusState | undefined;
  getAssignmentsByStatus: (status: AssignmentStatus) => AssignmentStatusState[];
  
  // Real-time update subscription
  lastStatusUpdate: StatusUpdateEvent | null;
  
  // Force refresh
  refreshStatuses: () => void;
}

const AssignmentStatusContext = createContext<AssignmentStatusContextType | undefined>(undefined);

export const useAssignmentStatus = (): AssignmentStatusContextType => {
  const context = useContext(AssignmentStatusContext);
  if (!context) {
    throw new Error('useAssignmentStatus must be used within AssignmentStatusProvider');
  }
  return context;
};

export const AssignmentStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Core state management
  const [statusManager] = useState(() => AssignmentStatusManager.getInstance());
  const [allStatuses, setAllStatuses] = useState<AssignmentStatusState[]>([]);
  const [lastStatusUpdate, setLastStatusUpdate] = useState<StatusUpdateEvent | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Derived state - current assignment (highest priority status)
  const currentAssignmentStatus = allStatuses.find(status => 
    status.status === 'current' || status.status === 'emergency'
  ) || null;

  // Status counters for navigation badges
  const statusCounts = {
    current: allStatuses.filter(s => s.status === 'current').length,
    upcoming: allStatuses.filter(s => s.status === 'upcoming').length,
    completed: allStatuses.filter(s => s.status === 'completed').length,
    cancelled: allStatuses.filter(s => s.status === 'cancelled').length,
    emergency: allStatuses.filter(s => s.status === 'emergency').length,
  };

  // Initialize network monitoring
  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected ?? false;
      setIsOnline(isConnected);
      statusManager.setNetworkStatus(isConnected);
      setSyncStatus(isConnected ? 'synced' : 'offline');
    });

    // Get initial network state
    NetInfo.fetch().then(state => {
      const isConnected = state.isConnected ?? false;
      setIsOnline(isConnected);
      statusManager.setNetworkStatus(isConnected);
    });

    return unsubscribeNetInfo;
  }, [statusManager]);

  // Subscribe to status updates
  useEffect(() => {
    const unsubscribeStatusUpdates = statusManager.subscribeToUpdates((event: StatusUpdateEvent) => {
      setLastStatusUpdate(event);
      refreshStatuses();
      
      // console.log('AssignmentStatusContext: Received status update', event);
    });

    const unsubscribeNetworkChanges = statusManager.subscribeToNetworkChanges(({ isOnline: online }) => {
      setIsOnline(online);
      setSyncStatus(online ? 'synced' : 'offline');
    });

    const unsubscribeSyncCompleted = statusManager.subscribeToSyncEvents(({ syncedCount }) => {
      // console.log(`AssignmentStatusContext: Sync completed for ${syncedCount} items`);
      setSyncStatus('synced');
      setPendingSyncCount(0);
      refreshStatuses();
    });

    return () => {
      unsubscribeStatusUpdates();
      unsubscribeNetworkChanges();
      unsubscribeSyncCompleted();
    };
  }, [statusManager]);

  // Load initial statuses
  useEffect(() => {
    refreshStatuses();
  }, []);

  // Status management methods
  const updateAssignmentStatus = useCallback(async (
    assignmentId: string, 
    status: AssignmentStatus, 
    urgency: 'normal' | 'warning' | 'critical' = 'normal'
  ) => {
    if (!isOnline) {
      setSyncStatus('offline');
      setPendingSyncCount(prev => prev + 1);
    } else {
      setSyncStatus('syncing');
    }

    await statusManager.updateStatus(assignmentId, status, urgency);

    if (isOnline) {
      setSyncStatus('synced');
    }
  }, [statusManager, isOnline]);

  const getAssignmentStatus = useCallback((assignmentId: string): AssignmentStatusState | undefined => {
    return statusManager.getStatus(assignmentId);
  }, [statusManager]);

  const getAssignmentsByStatus = useCallback((status: AssignmentStatus): AssignmentStatusState[] => {
    return statusManager.getAssignmentsByStatus(status);
  }, [statusManager]);

  const refreshStatuses = useCallback(() => {
    const statuses = statusManager.getAllStatuses();
    setAllStatuses(statuses);
    
    // Calculate pending sync count
    const pendingCount = statuses.filter(s => s.syncStatus === 'pending').length;
    setPendingSyncCount(pendingCount);
  }, [statusManager]);

  const contextValue: AssignmentStatusContextType = {
    // Current status states
    currentAssignmentStatus,
    allStatuses,
    statusCounts,
    
    // Network and sync status
    isOnline,
    syncStatus,
    pendingSyncCount,
    
    // Status management methods
    updateAssignmentStatus,
    getAssignmentStatus,
    getAssignmentsByStatus,
    
    // Real-time updates
    lastStatusUpdate,
    
    // Force refresh
    refreshStatuses,
  };

  return (
    <AssignmentStatusContext.Provider value={contextValue}>
      {children}
    </AssignmentStatusContext.Provider>
  );
};

export default useAssignmentStatus;