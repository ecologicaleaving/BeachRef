import { useState, useEffect } from 'react';
import { NetworkStateManager, NetworkState, ConnectionQuality, ConnectionStrategy } from '../services/NetworkStateManager';

/**
 * Network state hook return type
 */
export interface UseNetworkStateReturn {
  // Current network state
  networkState: NetworkState | null;
  connectionQuality: ConnectionQuality | null;
  
  // Convenience properties
  isConnected: boolean;
  isOnline: boolean;
  isOffline: boolean;
  networkType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  qualityLevel: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  qualityScore: number;
  recommendedStrategy: ConnectionStrategy;
  
  // Connection details
  connectionDetails: {
    ssid?: string;
    carrier?: string;
    cellularGeneration?: '2g' | '3g' | '4g' | '5g';
    strength?: number;
    isInternetReachable: boolean | null;
  };
  
  // Performance metrics
  connectionStats: {
    currentQuality: number;
    averageQuality: number;
    averageLatency: number;
    stabilityTrend: 'improving' | 'stable' | 'degrading';
  };
  
  // Network capabilities
  capabilities: {
    supportsAggressiveReconnection: boolean;
    shouldUseCellularOptimizations: boolean;
    adaptiveConfig: {
      reconnectDelay: number;
      maxReconnectAttempts: number;
      heartbeatInterval: number;
      timeoutMs: number;
    } | null;
  };
  
  // State management
  isInitialized: boolean;
  lastUpdated: number | null;
  
  // Actions
  forceReassessment: () => Promise<void>;
  getExponentialBackoffDelay: (attempt: number, baseDelay?: number, maxDelay?: number) => number;
}

/**
 * Hook for comprehensive network state management
 * Provides real-time network status, quality assessment, and connection optimization
 */
export function useNetworkState(): UseNetworkStateReturn {
  const [networkState, setNetworkState] = useState<NetworkState | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality | null>(null);
  const [connectionStats, setConnectionStats] = useState({
    currentQuality: 0,
    averageQuality: 0,
    averageLatency: 0,
    stabilityTrend: 'stable' as 'improving' | 'stable' | 'degrading',
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    const networkStateManager = NetworkStateManager.getInstance();

    // Initialize network state manager and get current state
    const initializeNetworkState = async () => {
      try {
        // Wait for initialization
        await networkStateManager.waitForInitialization();
        
        // Get initial state
        const initialNetworkState = networkStateManager.getCurrentNetworkState();
        const initialConnectionQuality = networkStateManager.getCurrentConnectionQuality();
        const initialStats = networkStateManager.getConnectionStats();
        
        setNetworkState(initialNetworkState);
        setConnectionQuality(initialConnectionQuality);
        setConnectionStats(initialStats);
        setLastUpdated(Date.now());
        setIsInitialized(true);
        
        // console.log('useNetworkState initialized with:', {
          networkType: initialNetworkState?.type,
          isConnected: initialNetworkState?.isConnected,
          qualityScore: initialConnectionQuality?.score,
        });

      } catch (error) {
        // console.error('Failed to initialize network state in hook:', error);
        setIsInitialized(true); // Still mark as initialized even on error
      }
    };

    // Set up network change listener
    const unsubscribe = networkStateManager.addNetworkChangeListener((newNetworkState, newConnectionQuality) => {
      setNetworkState(newNetworkState);
      setConnectionQuality(newConnectionQuality);
      setLastUpdated(Date.now());
      
      // Update stats periodically (not on every change to avoid excessive updates)
      const stats = networkStateManager.getConnectionStats();
      setConnectionStats(stats);

      // console.log('Network state updated in hook:', {
        networkType: newNetworkState.type,
        isConnected: newNetworkState.isConnected,
        qualityLevel: newConnectionQuality.level,
        qualityScore: newConnectionQuality.score,
      });
    });

    // Initialize
    initializeNetworkState();

    // Set up periodic stats update (every 30 seconds)
    const statsInterval = setInterval(() => {
      if (networkStateManager.isReady()) {
        const currentStats = networkStateManager.getConnectionStats();
        setConnectionStats(currentStats);
      }
    }, 30000);

    // Cleanup
    return () => {
      unsubscribe();
      clearInterval(statsInterval);
    };
  }, []);

  // Derived state
  const isConnected = networkState?.isConnected ?? false;
  const isOnline = isConnected;
  const isOffline = !isConnected;
  const networkType = networkState?.type ?? 'unknown';
  const qualityLevel = connectionQuality?.level ?? 'offline';
  const qualityScore = connectionQuality?.score ?? 0;
  const recommendedStrategy = connectionQuality?.recommendation ?? ConnectionStrategy.OFFLINE_MODE;

  const connectionDetails = {
    ssid: networkState?.details?.ssid,
    carrier: networkState?.details?.carrier,
    cellularGeneration: networkState?.details?.cellularGeneration,
    strength: networkState?.details?.strength,
    isInternetReachable: networkState?.isInternetReachable ?? null,
  };

  // Get network capabilities
  const networkStateManager = NetworkStateManager.getInstance();
  const capabilities = {
    supportsAggressiveReconnection: networkStateManager.supportsAggressiveReconnection(),
    shouldUseCellularOptimizations: networkStateManager.shouldUseCellularOptimizations(),
    adaptiveConfig: networkStateManager.getAdaptiveConnectionConfig(recommendedStrategy),
  };

  // Action functions
  const forceReassessment = async (): Promise<void> => {
    try {
      await networkStateManager.forceQualityReassessment();
      
      // Update local state after reassessment
      const updatedNetworkState = networkStateManager.getCurrentNetworkState();
      const updatedConnectionQuality = networkStateManager.getCurrentConnectionQuality();
      const updatedStats = networkStateManager.getConnectionStats();
      
      setNetworkState(updatedNetworkState);
      setConnectionQuality(updatedConnectionQuality);
      setConnectionStats(updatedStats);
      setLastUpdated(Date.now());

      // console.log('Network state reassessment completed');
    } catch (error) {
      // console.error('Failed to force network reassessment:', error);
      throw error;
    }
  };

  const getExponentialBackoffDelay = (attempt: number, baseDelay?: number, maxDelay?: number): number => {
    return networkStateManager.getExponentialBackoffDelay(attempt, baseDelay, maxDelay);
  };

  return {
    // Current network state
    networkState,
    connectionQuality,
    
    // Convenience properties
    isConnected,
    isOnline,
    isOffline,
    networkType,
    qualityLevel,
    qualityScore,
    recommendedStrategy,
    
    // Connection details
    connectionDetails,
    
    // Performance metrics
    connectionStats,
    
    // Network capabilities
    capabilities,
    
    // State management
    isInitialized,
    lastUpdated,
    
    // Actions
    forceReassessment,
    getExponentialBackoffDelay,
  };
}

/**
 * Simplified hook for basic network connectivity
 * Use this when you only need basic online/offline status
 */
export function useNetworkConnectivity(): {
  isConnected: boolean;
  isOnline: boolean;
  isOffline: boolean;
  networkType: string;
} {
  const { isConnected, isOnline, isOffline, networkType } = useNetworkState();
  
  return {
    isConnected,
    isOnline,
    isOffline,
    networkType,
  };
}

/**
 * Hook for connection quality monitoring
 * Use this when you need detailed quality metrics
 */
export function useConnectionQuality(): {
  quality: ConnectionQuality | null;
  level: string;
  score: number;
  recommendation: ConnectionStrategy;
  metrics: {
    latency: number;
    stability: number;
    throughput: number;
  };
  trend: 'improving' | 'stable' | 'degrading';
} {
  const { connectionQuality, connectionStats } = useNetworkState();
  
  return {
    quality: connectionQuality,
    level: connectionQuality?.level ?? 'offline',
    score: connectionQuality?.score ?? 0,
    recommendation: connectionQuality?.recommendation ?? ConnectionStrategy.OFFLINE_MODE,
    metrics: {
      latency: connectionQuality?.latency ?? 0,
      stability: connectionQuality?.stability ?? 0,
      throughput: connectionQuality?.throughput ?? 0,
    },
    trend: connectionStats.stabilityTrend,
  };
}

/**
 * Hook for adaptive connection configuration
 * Use this to get optimized connection parameters based on current network state
 */
export function useAdaptiveConnection(): {
  strategy: ConnectionStrategy;
  config: {
    reconnectDelay: number;
    maxReconnectAttempts: number;
    heartbeatInterval: number;
    timeoutMs: number;
  } | null;
  supportsAggressive: boolean;
  shouldOptimizeForCellular: boolean;
  getBackoffDelay: (attempt: number) => number;
} {
  const { 
    recommendedStrategy, 
    capabilities,
    getExponentialBackoffDelay
  } = useNetworkState();
  
  return {
    strategy: recommendedStrategy,
    config: capabilities.adaptiveConfig,
    supportsAggressive: capabilities.supportsAggressiveReconnection,
    shouldOptimizeForCellular: capabilities.shouldUseCellularOptimizations,
    getBackoffDelay: getExponentialBackoffDelay,
  };
}

export default useNetworkState;