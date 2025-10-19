/**
 * useFieldMode Hook
 *
 * Adaptive field selection based on network type and user preferences.
 *
 * Feature: specs/001-vis-api-optimization
 * Tasks: T058-T061
 */

import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { FieldMode, NetworkType } from '../types/audit';
import { getFieldModeForNetwork } from '../types/field-selection';

/**
 * useFieldMode
 *
 * React hook for adaptive field mode selection based on network conditions.
 *
 * **Behavior:**
 * - WiFi: default mode (10-15 fields)
 * - Cellular: slim mode (6-8 fields)
 * - Offline: slim mode (cached data only)
 * - Manual override supported via setFieldMode
 *
 * **Tasks:**
 * - T058: Create hooks/useFieldMode.ts hook
 * - T059: Integrate NetworkMonitor with useFieldMode
 * - T060: Implement mode selection logic
 * - T061: Add field mode state management with network listener
 *
 * @example
 * ```typescript
 * function TournamentList() {
 *   const { fieldMode, networkType, isOnline, setFieldMode } = useFieldMode();
 *
 *   // Use fieldMode in API calls
 *   const tournaments = await getTournaments({ mode: fieldMode });
 *
 *   // Manual override
 *   <Button onPress={() => setFieldMode('full')}>Load All Fields</Button>
 * }
 * ```
 */
export function useFieldMode(): {
  /** Current field mode (slim/default/full) */
  fieldMode: FieldMode;
  /** Current network type (wifi/cellular/offline) */
  networkType: NetworkType;
  /** Whether device is online */
  isOnline: boolean;
  /** Manually override field mode */
  setFieldMode: (mode: FieldMode) => void;
  /** Reset to auto mode based on network */
  resetToAuto: () => void;
  /** Whether in manual override mode */
  isManualOverride: boolean;
} {
  // T061: Field mode state management
  const [fieldMode, setFieldModeState] = useState<FieldMode>('default');
  const [networkType, setNetworkType] = useState<NetworkType>('wifi');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [manualOverride, setManualOverride] = useState<FieldMode | null>(null);

  /**
   * T059: Map NetInfo state to NetworkType
   */
  const mapNetInfoToNetworkType = useCallback((state: NetInfoState): NetworkType => {
    // Offline check
    if (!state.isConnected || !state.isInternetReachable) {
      return 'offline';
    }

    // Network type mapping
    const type = state.type as NetInfoStateType;

    if (type === 'wifi' || type === 'ethernet') {
      return 'wifi';
    }

    if (type === 'cellular') {
      return 'cellular';
    }

    // Unknown types default to WiFi (optimistic)
    return 'wifi';
  }, []);

  /**
   * T060: Implement mode selection logic
   */
  const determineFieldMode = useCallback((netType: NetworkType, override: FieldMode | null): FieldMode => {
    // Manual override takes precedence
    if (override !== null) {
      return override;
    }

    // Auto mode based on network
    return getFieldModeForNetwork(netType);
  }, []);

  /**
   * T061: Network state change handler
   */
  const handleNetworkChange = useCallback((state: NetInfoState) => {
    const netType = mapNetInfoToNetworkType(state);
    const online = state.isConnected === true && state.isInternetReachable === true;

    setNetworkType(netType);
    setIsOnline(online);

    // Update field mode based on new network type (if not manually overridden)
    const newMode = determineFieldMode(netType, manualOverride);
    setFieldModeState(newMode);

    console.log(`[useFieldMode] Network changed: ${netType} (online: ${online}) → mode: ${newMode}`);
  }, [mapNetInfoToNetworkType, determineFieldMode, manualOverride]);

  /**
   * T061: Set up network listener on mount
   */
  useEffect(() => {
    // Get initial network state
    NetInfo.fetch().then(handleNetworkChange);

    // Subscribe to network changes
    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [handleNetworkChange]);

  /**
   * Manual field mode override
   */
  const setFieldMode = useCallback((mode: FieldMode) => {
    setManualOverride(mode);
    setFieldModeState(mode);
    console.log(`[useFieldMode] Manual override: ${mode}`);
  }, []);

  /**
   * Reset to auto mode (network-based)
   */
  const resetToAuto = useCallback(() => {
    setManualOverride(null);
    const autoMode = getFieldModeForNetwork(networkType);
    setFieldModeState(autoMode);
    console.log(`[useFieldMode] Reset to auto mode: ${autoMode} (network: ${networkType})`);
  }, [networkType]);

  return {
    fieldMode,
    networkType,
    isOnline,
    setFieldMode,
    resetToAuto,
    isManualOverride: manualOverride !== null,
  };
}

/**
 * useFieldModeWithOverride
 *
 * Variant that starts with manual override instead of auto mode.
 *
 * @param initialMode - Initial field mode override
 */
export function useFieldModeWithOverride(initialMode: FieldMode): ReturnType<typeof useFieldMode> {
  const hook = useFieldMode();

  useEffect(() => {
    hook.setFieldMode(initialMode);
  }, []); // Only on mount

  return hook;
}
