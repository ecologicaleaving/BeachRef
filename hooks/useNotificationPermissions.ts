/**
 * useNotificationPermissions Hook
 *
 * React hook for managing notification permissions.
 * Provides permission status checks, request methods, and state management.
 */

import { useState, useEffect } from 'react';
import { NotificationService, PermissionStatus } from '../services/notifications/NotificationService';

/**
 * Hook return type
 */
interface UseNotificationPermissionsReturn {
  /** Current permission status */
  permissionStatus: PermissionStatus;
  /** Loading state */
  isLoading: boolean;
  /** Request notification permissions */
  requestPermissions: () => Promise<PermissionStatus>;
  /** Refresh permission status */
  refreshStatus: () => Promise<void>;
  /** Whether permissions are granted */
  isGranted: boolean;
  /** Whether permissions are denied */
  isDenied: boolean;
  /** Whether permissions are undetermined */
  isUndetermined: boolean;
}

/**
 * Hook for managing notification permissions
 *
 * @example
 * ```tsx
 * const { permissionStatus, requestPermissions, isGranted } = useNotificationPermissions();
 *
 * if (!isGranted) {
 *   return <Button onPress={requestPermissions}>Enable Notifications</Button>;
 * }
 * ```
 */
export function useNotificationPermissions(): UseNotificationPermissionsReturn {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>(
    PermissionStatus.UNDETERMINED
  );
  const [isLoading, setIsLoading] = useState(true);

  const notificationService = NotificationService.getInstance();

  /**
   * Load current permission status
   */
  const loadPermissionStatus = async () => {
    try {
      setIsLoading(true);
      const status = await notificationService.getPermissionStatus();
      setPermissionStatus(status);
    } catch (error) {
      console.error('[useNotificationPermissions] Failed to load permission status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Request notification permissions
   */
  const requestPermissions = async (): Promise<PermissionStatus> => {
    try {
      setIsLoading(true);
      const status = await notificationService.requestPermissions();
      setPermissionStatus(status);
      return status;
    } catch (error) {
      console.error('[useNotificationPermissions] Failed to request permissions:', error);
      return PermissionStatus.DENIED;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh permission status
   */
  const refreshStatus = async () => {
    await loadPermissionStatus();
  };

  // Load permission status on mount
  useEffect(() => {
    loadPermissionStatus();
  }, []);

  return {
    permissionStatus,
    isLoading,
    requestPermissions,
    refreshStatus,
    isGranted: permissionStatus === PermissionStatus.GRANTED,
    isDenied: permissionStatus === PermissionStatus.DENIED,
    isUndetermined: permissionStatus === PermissionStatus.UNDETERMINED
  };
}
