/**
 * Consolidated Network State Hook
 * Part of State Management Hooks Consolidation Refactoring
 * Replaces multiple network-related hooks with a unified solution
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-async-storage/async-storage/lib/typescript/types';

// ================================
// Network State Types
// ================================

export type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'bluetooth' | 'other' | 'unknown' | 'none';

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

export interface NetworkCapabilities {
  canAccessInternet: boolean;
  hasInternetAccess: boolean;
  connectionStrength: number; // 0-1 scale
  estimatedBandwidth: number; // Mbps
  supportsRealtime: boolean;
  supportsBulkDownload: boolean;
}

export interface NetworkDetails {
  type: ConnectionType;
  subtype: string | null;
  ssid: string | null;
  bssid: string | null;
  strength: number; // Signal strength 0-1
  ipAddress: string | null;
  subnet: string | null;
  frequency: number | null;
}

export interface NetworkHistory {
  timestamp: string;
  type: ConnectionType;
  quality: ConnectionQuality;
  wasOnline: boolean;
  duration: number; // How long this state lasted
}

export interface NetworkState {
  // Basic state
  isOnline: boolean;
  isConnected: boolean;
  isInternetReachable: boolean;

  // Connection details
  type: ConnectionType;
  quality: ConnectionQuality;
  capabilities: NetworkCapabilities;
  details: NetworkDetails;

  // Performance metrics
  latency: number | null;
  downloadSpeed: number | null;
  uploadSpeed: number | null;
  packetLoss: number | null;

  // State tracking
  isStable: boolean;
  stateChangeCount: number;
  lastStateChange: string;
  connectionHistory: NetworkHistory[];

  // Configuration
  enableBackground: boolean;
  enableSpeedTest: boolean;
  enableLatencyCheck: boolean;
}

export interface NetworkStateOptions {
  // Monitoring configuration
  enableDetailedMonitoring?: boolean;
  enablePerformanceTesting?: boolean;
  enableBackground?: boolean;

  // Update intervals
  statusCheckInterval?: number;
  performanceTestInterval?: number;
  latencyCheckInterval?: number;

  // Thresholds
  qualityThresholds?: {
    excellent: { minSpeed: number; maxLatency: number };
    good: { minSpeed: number; maxLatency: number };
    fair: { minSpeed: number; maxLatency: number };
    poor: { maxLatency: number };
  };

  // Callbacks
  onNetworkChange?: (networkState: NetworkState) => void;
  onQualityChange?: (quality: ConnectionQuality) => void;
  onConnectionLost?: () => void;
  onConnectionRestored?: () => void;
}

// ================================
// Default Configuration
// ================================

const DEFAULT_OPTIONS: Required<NetworkStateOptions> = {
  enableDetailedMonitoring: false,
  enablePerformanceTesting: false,
  enableBackground: true,
  statusCheckInterval: 5000,      // 5 seconds
  performanceTestInterval: 30000,  // 30 seconds
  latencyCheckInterval: 10000,    // 10 seconds
  qualityThresholds: {
    excellent: { minSpeed: 25, maxLatency: 50 },   // >25 Mbps, <50ms
    good: { minSpeed: 10, maxLatency: 100 },       // >10 Mbps, <100ms
    fair: { minSpeed: 2, maxLatency: 300 },        // >2 Mbps, <300ms
    poor: { maxLatency: 1000 }                     // <1000ms
  },
  onNetworkChange: () => {},
  onQualityChange: () => {},
  onConnectionLost: () => {},
  onConnectionRestored: () => {}
};

const INITIAL_NETWORK_STATE: NetworkState = {
  isOnline: true,
  isConnected: false,
  isInternetReachable: false,
  type: 'unknown',
  quality: 'offline',
  capabilities: {
    canAccessInternet: false,
    hasInternetAccess: false,
    connectionStrength: 0,
    estimatedBandwidth: 0,
    supportsRealtime: false,
    supportsBulkDownload: false
  },
  details: {
    type: 'unknown',
    subtype: null,
    ssid: null,
    bssid: null,
    strength: 0,
    ipAddress: null,
    subnet: null,
    frequency: null
  },
  latency: null,
  downloadSpeed: null,
  uploadSpeed: null,
  packetLoss: null,
  isStable: false,
  stateChangeCount: 0,
  lastStateChange: new Date().toISOString(),
  connectionHistory: [],
  enableBackground: true,
  enableSpeedTest: false,
  enableLatencyCheck: false
};

// ================================
// Main Hook
// ================================

export function useNetworkState(options: NetworkStateOptions = {}): NetworkState {
  const config = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);

  const [networkState, setNetworkState] = useState<NetworkState>(INITIAL_NETWORK_STATE);
  const [performanceTestRunning, setPerformanceTestRunning] = useState(false);

  // Convert NetInfo state to our format
  const convertNetInfoState = useCallback((netInfoState: NetInfoState): Partial<NetworkState> => {
    const type = convertConnectionType(netInfoState.type);
    const isConnected = netInfoState.isConnected ?? false;
    const isInternetReachable = netInfoState.isInternetReachable ?? false;

    return {
      isOnline: isConnected && isInternetReachable,
      isConnected,
      isInternetReachable,
      type,
      details: {
        type,
        subtype: netInfoState.details?.subtype || null,
        ssid: (netInfoState.details as any)?.ssid || null,
        bssid: (netInfoState.details as any)?.bssid || null,
        strength: (netInfoState.details as any)?.strength || 0,
        ipAddress: (netInfoState.details as any)?.ipAddress || null,
        subnet: (netInfoState.details as any)?.subnet || null,
        frequency: (netInfoState.details as any)?.frequency || null
      }
    };
  }, []);

  // Calculate network quality based on type and performance metrics
  const calculateQuality = useCallback((
    type: ConnectionType,
    latency: number | null,
    downloadSpeed: number | null,
    isOnline: boolean
  ): ConnectionQuality => {
    if (!isOnline) return 'offline';

    const thresholds = config.qualityThresholds;

    // If we have performance data, use it
    if (latency !== null && downloadSpeed !== null) {
      if (downloadSpeed >= thresholds.excellent.minSpeed && latency <= thresholds.excellent.maxLatency) {
        return 'excellent';
      }
      if (downloadSpeed >= thresholds.good.minSpeed && latency <= thresholds.good.maxLatency) {
        return 'good';
      }
      if (downloadSpeed >= thresholds.fair.minSpeed && latency <= thresholds.fair.maxLatency) {
        return 'fair';
      }
      return 'poor';
    }

    // Fallback to connection type-based quality estimation
    switch (type) {
      case 'wifi':
      case 'ethernet':
        return 'good';
      case 'cellular':
        return 'fair';
      case 'other':
        return 'poor';
      default:
        return 'poor';
    }
  }, [config.qualityThresholds]);

  // Calculate network capabilities
  const calculateCapabilities = useCallback((
    type: ConnectionType,
    quality: ConnectionQuality,
    downloadSpeed: number | null
  ): NetworkCapabilities => {
    const hasInternet = quality !== 'offline';
    const estimatedBandwidth = downloadSpeed || getEstimatedBandwidth(type, quality);

    return {
      canAccessInternet: hasInternet,
      hasInternetAccess: hasInternet,
      connectionStrength: getConnectionStrength(type, quality),
      estimatedBandwidth,
      supportsRealtime: quality !== 'offline' && quality !== 'poor',
      supportsBulkDownload: estimatedBandwidth > 5 // >5 Mbps for bulk downloads
    };
  }, []);

  // Performance testing functions
  const testLatency = useCallback(async (): Promise<number | null> => {
    if (!networkState.isOnline) return null;

    try {
      const startTime = Date.now();
      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        cache: 'no-cache'
      });

      if (response.ok) {
        return Date.now() - startTime;
      }
    } catch (error) {
      console.warn('Latency test failed:', error);
    }

    return null;
  }, [networkState.isOnline]);

  const testDownloadSpeed = useCallback(async (): Promise<number | null> => {
    if (!networkState.isOnline || performanceTestRunning) return null;

    setPerformanceTestRunning(true);

    try {
      // Simple speed test using a small image
      const testUrl = 'https://via.placeholder.com/1000x1000.jpg';
      const startTime = Date.now();

      const response = await fetch(testUrl, { cache: 'no-cache' });
      const blob = await response.blob();

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // seconds
      const sizeBytes = blob.size;
      const sizeMb = sizeBytes / (1024 * 1024);

      return sizeMb / duration; // Mbps
    } catch (error) {
      console.warn('Speed test failed:', error);
      return null;
    } finally {
      setPerformanceTestRunning(false);
    }
  }, [networkState.isOnline, performanceTestRunning]);

  // Update network state
  const updateNetworkState = useCallback((updates: Partial<NetworkState>) => {
    setNetworkState(prevState => {
      const newState = { ...prevState, ...updates };

      // Update quality based on new data
      const quality = calculateQuality(
        newState.type,
        newState.latency,
        newState.downloadSpeed,
        newState.isOnline
      );

      // Update capabilities
      const capabilities = calculateCapabilities(
        newState.type,
        quality,
        newState.downloadSpeed
      );

      // Track state changes
      const stateChanged = (
        prevState.isOnline !== newState.isOnline ||
        prevState.type !== newState.type ||
        prevState.quality !== quality
      );

      let connectionHistory = newState.connectionHistory;
      let stateChangeCount = newState.stateChangeCount;

      if (stateChanged) {
        stateChangeCount++;

        // Add to history
        connectionHistory = [
          ...connectionHistory.slice(-19), // Keep last 20 entries
          {
            timestamp: new Date().toISOString(),
            type: prevState.type,
            quality: prevState.quality,
            wasOnline: prevState.isOnline,
            duration: Date.now() - new Date(prevState.lastStateChange).getTime()
          }
        ];

        // Call callbacks
        if (prevState.isOnline && !newState.isOnline) {
          config.onConnectionLost();
        } else if (!prevState.isOnline && newState.isOnline) {
          config.onConnectionRestored();
        }

        if (prevState.quality !== quality) {
          config.onQualityChange(quality);
        }
      }

      const finalState = {
        ...newState,
        quality,
        capabilities,
        stateChangeCount,
        lastStateChange: stateChanged ? new Date().toISOString() : newState.lastStateChange,
        connectionHistory,
        isStable: stateChangeCount < 3 // Stable if less than 3 changes recently
      };

      if (stateChanged) {
        config.onNetworkChange(finalState);
      }

      return finalState;
    });
  }, [calculateQuality, calculateCapabilities, config]);

  // NetInfo listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(netInfoState => {
      const stateUpdate = convertNetInfoState(netInfoState);
      updateNetworkState(stateUpdate);
    });

    // Initial state fetch
    NetInfo.fetch().then(netInfoState => {
      const stateUpdate = convertNetInfoState(netInfoState);
      updateNetworkState(stateUpdate);
    });

    return unsubscribe;
  }, [convertNetInfoState, updateNetworkState]);

  // Performance testing intervals
  useEffect(() => {
    if (!config.enablePerformanceTesting || !networkState.isOnline) return;

    let latencyInterval: NodeJS.Timeout | null = null;
    let speedInterval: NodeJS.Timeout | null = null;

    if (config.enableLatencyCheck) {
      latencyInterval = setInterval(async () => {
        const latency = await testLatency();
        if (latency !== null) {
          updateNetworkState({ latency });
        }
      }, config.latencyCheckInterval);
    }

    // Less frequent speed tests to avoid excessive data usage
    if (networkState.type === 'wifi' || networkState.type === 'ethernet') {
      speedInterval = setInterval(async () => {
        const downloadSpeed = await testDownloadSpeed();
        if (downloadSpeed !== null) {
          updateNetworkState({ downloadSpeed });
        }
      }, config.performanceTestInterval);
    }

    return () => {
      if (latencyInterval) clearInterval(latencyInterval);
      if (speedInterval) clearInterval(speedInterval);
    };
  }, [
    config.enablePerformanceTesting,
    config.enableLatencyCheck,
    config.latencyCheckInterval,
    config.performanceTestInterval,
    networkState.isOnline,
    networkState.type,
    testLatency,
    testDownloadSpeed,
    updateNetworkState
  ]);

  return networkState;
}

// ================================
// Convenience Hooks
// ================================

/**
 * Simple online/offline status hook
 */
export function useOnlineStatus(): boolean {
  const { isOnline } = useNetworkState();
  return isOnline;
}

/**
 * Network quality hook with quality-based callbacks
 */
export function useNetworkQuality(callbacks?: {
  onPoor?: () => void;
  onGood?: () => void;
}): { quality: ConnectionQuality; isGoodQuality: boolean } {
  const { quality } = useNetworkState({
    onQualityChange: (newQuality) => {
      if (newQuality === 'poor' && callbacks?.onPoor) {
        callbacks.onPoor();
      } else if ((newQuality === 'good' || newQuality === 'excellent') && callbacks?.onGood) {
        callbacks.onGood();
      }
    }
  });

  return {
    quality,
    isGoodQuality: quality === 'good' || quality === 'excellent'
  };
}

/**
 * Hook for offline-specific functionality
 */
export function useOfflineCapabilities(): {
  isOffline: boolean;
  canSync: boolean;
  lastOnline: string | null;
  offlineDuration: number;
} {
  const { isOnline, lastStateChange, connectionHistory } = useNetworkState();

  const lastOnlineEntry = connectionHistory
    .slice()
    .reverse()
    .find(entry => entry.wasOnline);

  const lastOnline = lastOnlineEntry?.timestamp || null;
  const offlineDuration = lastOnline
    ? Date.now() - new Date(lastOnline).getTime()
    : 0;

  return {
    isOffline: !isOnline,
    canSync: isOnline,
    lastOnline,
    offlineDuration
  };
}

// ================================
// Helper Functions
// ================================

function convertConnectionType(type: NetInfoStateType): ConnectionType {
  switch (type) {
    case 'wifi':
      return 'wifi';
    case 'cellular':
      return 'cellular';
    case 'ethernet':
      return 'ethernet';
    case 'bluetooth':
      return 'bluetooth';
    case 'other':
      return 'other';
    case 'unknown':
      return 'unknown';
    case 'none':
    default:
      return 'none';
  }
}

function getEstimatedBandwidth(type: ConnectionType, quality: ConnectionQuality): number {
  const estimates = {
    wifi: { excellent: 100, good: 50, fair: 25, poor: 10, offline: 0 },
    ethernet: { excellent: 1000, good: 100, fair: 50, poor: 25, offline: 0 },
    cellular: { excellent: 50, good: 25, fair: 10, poor: 2, offline: 0 },
    other: { excellent: 25, good: 10, fair: 5, poor: 1, offline: 0 },
    bluetooth: { excellent: 2, good: 1, fair: 0.5, poor: 0.1, offline: 0 },
    unknown: { excellent: 10, good: 5, fair: 2, poor: 1, offline: 0 },
    none: { excellent: 0, good: 0, fair: 0, poor: 0, offline: 0 }
  };

  return estimates[type]?.[quality] || 0;
}

function getConnectionStrength(type: ConnectionType, quality: ConnectionQuality): number {
  const strengthMap = {
    excellent: 1.0,
    good: 0.8,
    fair: 0.6,
    poor: 0.3,
    offline: 0.0
  };

  return strengthMap[quality];
}