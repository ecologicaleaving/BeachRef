import { useState, useEffect, useCallback } from 'react';
import { AppStateManager, AppLifecycleState, AppStateEvent, ConnectionSuspensionConfig } from '../services/AppStateManager';

/**
 * App state hook return type
 */
export interface UseAppStateReturn {
  // Current state
  currentState: AppLifecycleState;
  previousState: AppLifecycleState | null;
  
  // State categories
  isForeground: boolean;
  isBackground: boolean;
  isActive: boolean;
  isSuspended: boolean;
  
  // Lifecycle statistics
  lifecycleStats: {
    currentState: AppLifecycleState;
    backgroundTime: number | null;
    stateChanges: number;
    averageBackgroundDuration: number;
    suspendedConnections: number;
    criticalConnections: number;
  };
  
  // State history
  stateHistory: AppStateEvent[];
  
  // Connection management
  connectionManagement: {
    canSuspendConnections: boolean;
    canResumeConnections: boolean;
    suspensionConfig: ConnectionSuspensionConfig;
    activeCriticalConnections: string[];
  };
  
  // Timing information
  timingInfo: {
    lastStateChange: number | null;
    timeInCurrentState: number;
    timeInBackground: number | null;
    estimatedSuspensionTime: number | null;
  };
  
  // Actions
  addCriticalConnection: (connectionId: string) => void;
  removeCriticalConnection: (connectionId: string) => void;
  updateSuspensionConfig: (config: Partial<ConnectionSuspensionConfig>) => void;
  forceSuspendConnections: () => Promise<void>;
  forceResumeConnections: () => Promise<void>;
}

/**
 * Hook for comprehensive app lifecycle state management
 * Provides real-time app state monitoring and connection management
 */
export function useAppState(): UseAppStateReturn {
  const [currentState, setCurrentState] = useState<AppLifecycleState>(AppLifecycleState.FOREGROUND_ACTIVE);
  const [previousState, setPreviousState] = useState<AppLifecycleState | null>(null);
  const [lifecycleStats, setLifecycleStats] = useState({
    currentState: AppLifecycleState.FOREGROUND_ACTIVE,
    backgroundTime: null as number | null,
    stateChanges: 0,
    averageBackgroundDuration: 0,
    suspendedConnections: 0,
    criticalConnections: 0,
  });
  const [stateHistory, setStateHistory] = useState<AppStateEvent[]>([]);
  const [lastStateChange, setLastStateChange] = useState<number | null>(null);
  const [suspensionConfig, setSuspensionConfig] = useState<ConnectionSuspensionConfig>({
    suspendAfterSeconds: 30,
    keepCriticalConnections: true,
    enableBackgroundSync: true,
    cleanupAfterMinutes: 10,
  });

  useEffect(() => {
    const appStateManager = AppStateManager.getInstance();

    // Get initial state
    const initialState = appStateManager.getCurrentState();
    const initialStats = appStateManager.getLifecycleStats();
    const initialHistory = appStateManager.getStateHistory();

    setCurrentState(initialState);
    setLifecycleStats(initialStats);
    setStateHistory(initialHistory);
    setLastStateChange(Date.now());

    // console.log('useAppState initialized with state:', initialState);

    // Set up state change listener
    const unsubscribe = appStateManager.addStateChangeListener((event: AppStateEvent) => {
      setPreviousState(event.previousState);
      setCurrentState(event.currentState);
      setLastStateChange(event.timestamp);
      
      // Update stats
      const updatedStats = appStateManager.getLifecycleStats();
      setLifecycleStats(updatedStats);
      
      // Update history
      const updatedHistory = appStateManager.getStateHistory();
      setStateHistory(updatedHistory);

      // console.log('App state changed in hook:', {
        from: event.previousState,
        to: event.currentState,
        activeConnections: event.activeConnections,
      });
    });

    // Set up periodic stats update (every 10 seconds when in background)
    const statsInterval = setInterval(() => {
      const currentStats = appStateManager.getLifecycleStats();
      setLifecycleStats(currentStats);
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(statsInterval);
    };
  }, []);

  // Derived state
  const isForeground = currentState === AppLifecycleState.FOREGROUND_ACTIVE || 
                      currentState === AppLifecycleState.FOREGROUND_INACTIVE;
  
  const isBackground = currentState === AppLifecycleState.BACKGROUND_ACTIVE || 
                      currentState === AppLifecycleState.BACKGROUND_SUSPENDED ||
                      currentState === AppLifecycleState.BACKGROUND_TERMINATED;
  
  const isActive = currentState === AppLifecycleState.FOREGROUND_ACTIVE ||
                   currentState === AppLifecycleState.BACKGROUND_ACTIVE;
  
  const isSuspended = currentState === AppLifecycleState.BACKGROUND_SUSPENDED ||
                     currentState === AppLifecycleState.BACKGROUND_TERMINATED;

  // Timing calculations
  const timeInCurrentState = lastStateChange ? Date.now() - lastStateChange : 0;
  const timeInBackground = lifecycleStats.backgroundTime;
  
  const estimatedSuspensionTime = isBackground && !isSuspended && timeInBackground
    ? Math.max(0, (suspensionConfig.suspendAfterSeconds * 1000) - timeInBackground)
    : null;

  // Connection management state
  const connectionManagement = {
    canSuspendConnections: isBackground && !isSuspended,
    canResumeConnections: isSuspended || (isBackground && lifecycleStats.suspendedConnections > 0),
    suspensionConfig,
    activeCriticalConnections: [], // Would track actual critical connections
  };

  // Action functions
  const appStateManager = AppStateManager.getInstance();

  const addCriticalConnection = useCallback((connectionId: string) => {
    appStateManager.addCriticalConnection(connectionId);
    
    // Update local state
    setLifecycleStats(prev => ({
      ...prev,
      criticalConnections: prev.criticalConnections + 1
    }));

    // console.log('Added critical connection:', connectionId);
  }, []);

  const removeCriticalConnection = useCallback((connectionId: string) => {
    appStateManager.removeCriticalConnection(connectionId);
    
    // Update local state  
    setLifecycleStats(prev => ({
      ...prev,
      criticalConnections: Math.max(0, prev.criticalConnections - 1)
    }));

    // console.log('Removed critical connection:', connectionId);
  }, []);

  const updateSuspensionConfig = useCallback((config: Partial<ConnectionSuspensionConfig>) => {
    appStateManager.updateSuspensionConfig(config);
    setSuspensionConfig(prev => ({ ...prev, ...config }));
    
    // console.log('Updated suspension config:', config);
  }, []);

  const forceSuspendConnections = useCallback(async () => {
    try {
      await appStateManager.forceSuspendConnections();
      
      // Update stats after suspension
      const updatedStats = appStateManager.getLifecycleStats();
      setLifecycleStats(updatedStats);

      // console.log('Forced connection suspension completed');
    } catch (error) {
      // console.error('Failed to force suspend connections:', error);
      throw error;
    }
  }, []);

  const forceResumeConnections = useCallback(async () => {
    try {
      await appStateManager.forceResumeConnections();
      
      // Update stats after resume
      const updatedStats = appStateManager.getLifecycleStats();
      setLifecycleStats(updatedStats);

      // console.log('Forced connection resume completed');
    } catch (error) {
      // console.error('Failed to force resume connections:', error);
      throw error;
    }
  }, []);

  return {
    // Current state
    currentState,
    previousState,
    
    // State categories
    isForeground,
    isBackground,
    isActive,
    isSuspended,
    
    // Lifecycle statistics
    lifecycleStats,
    
    // State history
    stateHistory,
    
    // Connection management
    connectionManagement,
    
    // Timing information
    timingInfo: {
      lastStateChange,
      timeInCurrentState,
      timeInBackground,
      estimatedSuspensionTime,
    },
    
    // Actions
    addCriticalConnection,
    removeCriticalConnection,
    updateSuspensionConfig,
    forceSuspendConnections,
    forceResumeConnections,
  };
}

/**
 * Simplified hook for basic app state monitoring
 * Use this when you only need basic foreground/background status
 */
export function useAppLifecycle(): {
  isForeground: boolean;
  isBackground: boolean;
  isActive: boolean;
  currentState: AppLifecycleState;
  timeInState: number;
} {
  const { 
    isForeground, 
    isBackground, 
    isActive, 
    currentState, 
    timingInfo 
  } = useAppState();
  
  return {
    isForeground,
    isBackground,
    isActive,
    currentState,
    timeInState: timingInfo.timeInCurrentState,
  };
}

/**
 * Hook for connection suspension management
 * Use this when you need to manage connection suspension based on app state
 */
export function useConnectionSuspension(): {
  canSuspend: boolean;
  canResume: boolean;
  isSuspended: boolean;
  suspendedCount: number;
  criticalCount: number;
  config: ConnectionSuspensionConfig;
  timeUntilSuspension: number | null;
  actions: {
    suspend: () => Promise<void>;
    resume: () => Promise<void>;
    addCritical: (id: string) => void;
    removeCritical: (id: string) => void;
    updateConfig: (config: Partial<ConnectionSuspensionConfig>) => void;
  };
} {
  const {
    isSuspended,
    lifecycleStats,
    connectionManagement,
    timingInfo,
    addCriticalConnection,
    removeCriticalConnection,
    updateSuspensionConfig,
    forceSuspendConnections,
    forceResumeConnections,
  } = useAppState();
  
  return {
    canSuspend: connectionManagement.canSuspendConnections,
    canResume: connectionManagement.canResumeConnections,
    isSuspended,
    suspendedCount: lifecycleStats.suspendedConnections,
    criticalCount: lifecycleStats.criticalConnections,
    config: connectionManagement.suspensionConfig,
    timeUntilSuspension: timingInfo.estimatedSuspensionTime,
    actions: {
      suspend: forceSuspendConnections,
      resume: forceResumeConnections,
      addCritical: addCriticalConnection,
      removeCritical: removeCriticalConnection,
      updateConfig: updateSuspensionConfig,
    },
  };
}

/**
 * Hook for app state history and analytics
 * Use this for debugging and understanding app usage patterns
 */
export function useAppStateAnalytics(): {
  history: AppStateEvent[];
  stats: {
    totalStateChanges: number;
    averageBackgroundTime: number;
    foregroundToBackgroundRatio: number;
    frequentTransitions: { from: AppLifecycleState; to: AppLifecycleState; count: number }[];
  };
  currentSession: {
    duration: number;
    stateChanges: number;
    backgroundTime: number | null;
  };
} {
  const { stateHistory, lifecycleStats, timingInfo } = useAppState();
  
  // Calculate transition frequencies
  const transitionCounts = new Map<string, number>();
  for (let i = 1; i < stateHistory.length; i++) {
    const prev = stateHistory[i - 1];
    const current = stateHistory[i];
    const key = `${prev.currentState}->${current.currentState}`;
    transitionCounts.set(key, (transitionCounts.get(key) || 0) + 1);
  }
  
  const frequentTransitions = Array.from(transitionCounts.entries())
    .map(([transition, count]) => {
      const [from, to] = transition.split('->');
      return { from: from as AppLifecycleState, to: to as AppLifecycleState, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 most frequent transitions

  // Calculate foreground to background ratio
  const foregroundTime = stateHistory
    .filter(event => 
      event.currentState === AppLifecycleState.FOREGROUND_ACTIVE ||
      event.currentState === AppLifecycleState.FOREGROUND_INACTIVE
    )
    .reduce((total, event, index, array) => {
      if (index < array.length - 1) {
        return total + (array[index + 1].timestamp - event.timestamp);
      }
      return total;
    }, 0);

  const backgroundTime = lifecycleStats.averageBackgroundDuration * lifecycleStats.stateChanges;
  const foregroundToBackgroundRatio = backgroundTime > 0 ? foregroundTime / backgroundTime : 0;

  return {
    history: stateHistory,
    stats: {
      totalStateChanges: lifecycleStats.stateChanges,
      averageBackgroundTime: lifecycleStats.averageBackgroundDuration,
      foregroundToBackgroundRatio,
      frequentTransitions,
    },
    currentSession: {
      duration: timingInfo.timeInCurrentState,
      stateChanges: lifecycleStats.stateChanges,
      backgroundTime: timingInfo.timeInBackground,
    },
  };
}

export default useAppState;