import { useState, useEffect, useCallback } from 'react';
import { CacheService } from '../services/CacheService';

interface StorageUsage {
  totalSize: number;
  offlineSize: number;
  cacheSize: number;
  isNearLimit: boolean;
}

interface StorageManagerResult {
  usage: StorageUsage | null;
  isLoading: boolean;
  error: string | null;
  refreshUsage: () => Promise<void>;
  clearOfflineStorage: () => Promise<boolean>;
  clearAllStorage: () => Promise<boolean>;
  optimizeStorage: () => Promise<number>;
  getUsagePercentage: () => number;
  getUsageWarning: () => string | null;
}

/**
 * Hook for managing storage usage and cleanup operations
 * Provides easy access to storage information and management functions
 */
export function useStorageManager(): StorageManagerResult {
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUsage = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const storageUsage = await CacheService.getStorageUsage();
      setUsage(storageUsage);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get storage usage';
      setError(errorMessage);
      // console.error('Storage usage fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearOfflineStorage = useCallback(async (): Promise<boolean> => {
    try {
      await CacheService.clearOfflineStorage();
      await refreshUsage();
      return true;
    } catch (err) {
      // console.error('Failed to clear offline storage:', err);
      return false;
    }
  }, [refreshUsage]);

  const clearAllStorage = useCallback(async (): Promise<boolean> => {
    try {
      await CacheService.clearLocalStorage();
      await CacheService.clearOfflineStorage();
      await refreshUsage();
      return true;
    } catch (err) {
      // console.error('Failed to clear all storage:', err);
      return false;
    }
  }, [refreshUsage]);

  const optimizeStorage = useCallback(async (): Promise<number> => {
    try {
      const removedCount = await CacheService.enforceStorageQuota();
      await refreshUsage();
      return removedCount;
    } catch (err) {
      // console.error('Failed to optimize storage:', err);
      return 0;
    }
  }, [refreshUsage]);

  const getUsagePercentage = useCallback((): number => {
    if (!usage) return 0;
    const maxStorage = 6 * 1024 * 1024; // 6MB typical AsyncStorage limit
    return Math.min((usage.totalSize / maxStorage) * 100, 100);
  }, [usage]);

  const getUsageWarning = useCallback((): string | null => {
    if (!usage) return null;

    const percentage = getUsagePercentage();
    
    if (percentage > 90) {
      return 'Storage almost full - immediate cleanup recommended';
    } else if (percentage > 80) {
      return 'Storage usage high - consider clearing old data';
    } else if (percentage > 70) {
      return 'Storage usage moderate - monitor regularly';
    }
    
    return null;
  }, [usage, getUsagePercentage]);

  // Load initial storage usage
  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  return {
    usage,
    isLoading,
    error,
    refreshUsage,
    clearOfflineStorage,
    clearAllStorage,
    optimizeStorage,
    getUsagePercentage,
    getUsageWarning,
  };
}

/**
 * Hook for automatic storage monitoring and alerts
 */
export function useStorageMonitoring(
  checkInterval: number = 60000, // Check every minute
  alertThreshold: number = 0.85 // Alert at 85% usage
): {
  shouldShowAlert: boolean;
  alertMessage: string | null;
  dismissAlert: () => void;
  currentUsage: number;
} {
  const { usage, getUsagePercentage } = useStorageManager();
  const [shouldShowAlert, setShouldShowAlert] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);

  useEffect(() => {
    if (!usage) return;

    const percentage = getUsagePercentage() / 100;
    
    if (percentage > alertThreshold && !alertDismissed) {
      setShouldShowAlert(true);
    } else if (percentage <= alertThreshold) {
      setShouldShowAlert(false);
      setAlertDismissed(false); // Reset dismissal if usage goes down
    }
  }, [usage, getUsagePercentage, alertThreshold, alertDismissed]);

  const dismissAlert = useCallback(() => {
    setShouldShowAlert(false);
    setAlertDismissed(true);
  }, []);

  const getAlertMessage = (): string | null => {
    if (!shouldShowAlert || !usage) return null;

    const percentage = getUsagePercentage();
    
    if (percentage > 95) {
      return 'Storage almost full! Clear some cached data to avoid issues.';
    } else if (percentage > 90) {
      return 'Storage running low. Consider clearing old tournament data.';
    } else if (percentage > 85) {
      return 'Storage usage is high. You may want to clean up cached data.';
    }
    
    return null;
  };

  return {
    shouldShowAlert,
    alertMessage: getAlertMessage(),
    dismissAlert,
    currentUsage: getUsagePercentage(),
  };
}

/**
 * Hook for formatting storage sizes consistently
 */
export function useStorageFormatting() {
  const formatBytes = useCallback((bytes: number, decimals: number = 1): string => {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }, []);

  const formatStoragePercentage = useCallback((current: number, max: number): string => {
    const percentage = (current / max) * 100;
    return `${percentage.toFixed(1)}%`;
  }, []);

  const getStorageColor = useCallback((percentage: number): string => {
    if (percentage < 50) return '#4CAF50'; // Green
    if (percentage < 75) return '#FF9800'; // Orange  
    if (percentage < 90) return '#F44336'; // Red
    return '#D32F2F'; // Dark red
  }, []);

  return {
    formatBytes,
    formatStoragePercentage,
    getStorageColor,
  };
}