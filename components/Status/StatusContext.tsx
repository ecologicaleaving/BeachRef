/**
 * StatusContext Component
 * Story 2.4: Professional Status Indicator System
 * 
 * React context for status management and real-time updates
 */

import React from 'react';
import { StatusType, StatusUpdate, StatusIndicatorContext } from '../../types/status';
import { StatusUpdateService, getGlobalStatusUpdateService, createStatusIndicatorContext } from '../../services/StatusUpdateService';

// Status context value
export interface StatusContextValue extends StatusIndicatorContext {
  isConnected: boolean;
  connectionInfo: {
    connected: boolean;
    reconnectAttempts: number;
    subscriberCount: number;
    cachedStatusCount: number;
  };
  subscribeToGlobalEvents: (callback: (event: any) => void) => () => void;
  clearStatus: (statusId: string) => void;
  clearAllStatuses: () => void;
  getAllStatuses: () => Map<string, StatusType>;
}

// Create status context
const StatusContext = React.createContext<StatusContextValue | null>(null);

// Status provider props
export interface StatusProviderProps {
  children: React.ReactNode;
  websocketUrl?: string;
  autoConnect?: boolean;
  enableOfflineSupport?: boolean;
  debugMode?: boolean;
}

// Status provider component
export const StatusProvider = React.memo<StatusProviderProps>(({
  children,
  websocketUrl,
  autoConnect = true,
  enableOfflineSupport = true,
  debugMode = false,
}) => {
  const statusService = React.useMemo(() => {
    return autoConnect ? getGlobalStatusUpdateService(websocketUrl) : new StatusUpdateService();
  }, [autoConnect, websocketUrl]);
  
  const [connectionInfo, setConnectionInfo] = React.useState(() => 
    statusService.getConnectionInfo()
  );
  
  // Update connection info periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      setConnectionInfo(statusService.getConnectionInfo());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [statusService]);
  
  // Debug logging
  React.useEffect(() => {
    if (!debugMode) return;
    
    const unsubscribe = statusService.subscribeToGlobalEvents((event) => {
      // console.log('StatusProvider: Global event', event);
    });
    
    return unsubscribe;
  }, [statusService, debugMode]);
  
  // Offline support (if enabled)
  React.useEffect(() => {
    if (!enableOfflineSupport) return;
    
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background') {
        // App going to background - maintain connection
        // if (debugMode) console.log('StatusProvider: App backgrounded, maintaining connection');
      } else if (nextAppState === 'active') {
        // App coming to foreground - ensure connection
        // if (debugMode) console.log('StatusProvider: App foregrounded, checking connection');
      }
    };
    
    // Note: In a real React Native app, you would use AppState
    // For this example, we'll just set up the structure
    
    return () => {
      // Cleanup app state listener
    };
  }, [enableOfflineSupport, debugMode]);
  
  const contextValue: StatusContextValue = React.useMemo(() => ({
    subscribeToUpdates: (statusId: string, callback: (update: StatusUpdate) => void) =>
      statusService.subscribeToUpdates(statusId, callback),
    updateStatus: (statusId: string, newStatus: StatusType, metadata?: Record<string, any>) =>
      statusService.updateStatus(statusId, newStatus, metadata),
    getStatus: (statusId: string) =>
      statusService.getStatus(statusId),
    isConnected: connectionInfo.connected,
    connectionInfo,
    subscribeToGlobalEvents: (callback: (event: any) => void) =>
      statusService.subscribeToGlobalEvents(callback),
    clearStatus: (statusId: string) =>
      statusService.clearStatus(statusId),
    clearAllStatuses: () =>
      statusService.clearAllStatuses(),
    getAllStatuses: () =>
      statusService.getAllStatuses(),
  }), [statusService, connectionInfo]);
  
  return (
    <StatusContext.Provider value={contextValue}>
      {children}
    </StatusContext.Provider>
  );
});

// Hook to use status context
export const useStatusContext = (): StatusContextValue => {
  const context = React.useContext(StatusContext);
  
  if (!context) {
    throw new Error('useStatusContext must be used within a StatusProvider');
  }
  
  return context;
};

// Hook for specific status management
export const useStatus = (
  statusId: string,
  initialStatus?: StatusType,
  autoSubscribe = true
) => {
  const context = useStatusContext();
  const [status, setStatus] = React.useState<StatusType>(
    initialStatus || context.getStatus(statusId) || 'upcoming'
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  // Subscribe to status updates
  React.useEffect(() => {
    if (!autoSubscribe) return;
    
    const unsubscribe = context.subscribeToUpdates(statusId, (update) => {
      setStatus(update.type);
      setError(null);
    });
    
    return unsubscribe;
  }, [statusId, autoSubscribe, context]);
  
  // Update status function
  const updateStatus = React.useCallback(
    async (newStatus: StatusType, metadata?: Record<string, any>) => {
      setIsLoading(true);
      setError(null);
      
      try {
        context.updateStatus(statusId, newStatus, metadata);
        setStatus(newStatus);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    },
    [statusId, context]
  );
  
  // Refresh status from cache
  const refreshStatus = React.useCallback(() => {
    const cachedStatus = context.getStatus(statusId);
    if (cachedStatus) {
      setStatus(cachedStatus);
    }
  }, [statusId, context]);
  
  return {
    status,
    updateStatus,
    refreshStatus,
    isLoading,
    error,
    isConnected: context.isConnected,
  };
};

// Hook for batch status operations
export const useBatchStatus = () => {
  const context = useStatusContext();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const updateMultipleStatuses = React.useCallback(
    async (updates: { id: string; status: StatusType; metadata?: Record<string, any> }[]) => {
      setIsLoading(true);
      setError(null);
      
      try {
        updates.forEach(({ id, status, metadata }) => {
          context.updateStatus(id, status, metadata);
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    },
    [context]
  );
  
  const getAllStatuses = React.useCallback(() => {
    return Array.from(context.getAllStatuses().entries()).map(([id, status]) => ({
      id,
      status,
    }));
  }, [context]);
  
  const clearAllStatuses = React.useCallback(() => {
    context.clearAllStatuses();
  }, [context]);
  
  return {
    updateMultipleStatuses,
    getAllStatuses,
    clearAllStatuses,
    isLoading,
    error,
    isConnected: context.isConnected,
    connectionInfo: context.connectionInfo,
  };
};

// Hook for connection monitoring
export const useConnectionStatus = () => {
  const context = useStatusContext();
  const [events, setEvents] = React.useState<any[]>([]);
  
  React.useEffect(() => {
    const unsubscribe = context.subscribeToGlobalEvents((event) => {
      if (event.type === 'connection_changed' || event.type === 'error') {
        setEvents(prev => [...prev.slice(-9), event]); // Keep last 10 events
      }
    });
    
    return unsubscribe;
  }, [context]);
  
  return {
    isConnected: context.isConnected,
    connectionInfo: context.connectionInfo,
    events,
    clearEvents: () => setEvents([]),
  };
};

StatusProvider.displayName = 'StatusProvider';

export default {
  StatusProvider,
  useStatusContext,
  useStatus,
  useBatchStatus,
  useConnectionStatus,
};