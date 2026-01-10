import { useState } from 'react';
import { CacheResult, CacheTier } from '../types/cache';
import { useNetworkStatus } from './useNetworkStatus';

interface OfflineStatusHookResult {
  isDataOffline: boolean;
  dataSource: CacheTier | null;
  isNetworkOffline: boolean;
  getOfflineStatus: (cacheResult?: CacheResult<any>) => {
    isOfflineData: boolean;
    source: CacheTier | null;
    isStale: boolean;
  };
}

/**
 * Hook for managing offline status and data source information
 * Helps components understand when they're displaying cached/offline data
 */
export function useOfflineStatus(): OfflineStatusHookResult {
  const { isOffline } = useNetworkStatus();
  const [lastDataSource, setLastDataSource] = useState<CacheTier | null>(null);

  /**
   * Analyze cache result to determine offline status
   */
  const getOfflineStatus = (cacheResult?: CacheResult<any>) => {
    if (!cacheResult) {
      return {
        isOfflineData: false,
        source: null,
        isStale: false,
      };
    }

    const { source } = cacheResult;
    const isOfflineData = source === 'offline' || source === 'localStorage' || (isOffline && source !== 'api');
    const isStale = source === 'localStorage' || source === 'offline';
    
    // Update last known data source
    setLastDataSource(source);

    return {
      isOfflineData,
      source,
      isStale,
    };
  };

  /**
   * Check if current data is from offline sources
   */
  const isDataOffline = lastDataSource === 'offline' || 
                       lastDataSource === 'localStorage' || 
                       (isOffline && lastDataSource !== 'api');

  return {
    isDataOffline,
    dataSource: lastDataSource,
    isNetworkOffline: isOffline,
    getOfflineStatus,
  };
}

/**
 * Simple hook to determine if data should show offline indicators
 */
export function useIsOfflineData(cacheResult?: CacheResult<any>): boolean {
  const { isOffline } = useNetworkStatus();
  
  if (!cacheResult) return false;
  
  const isOfflineSource = cacheResult.source === 'offline' || cacheResult.source === 'localStorage';
  const isOfflineContext = isOffline && cacheResult.source !== 'api';
  
  return isOfflineSource || isOfflineContext;
}