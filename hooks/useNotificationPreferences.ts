/**
 * useNotificationPreferences Hook
 *
 * React hook for managing notification preferences with real-time updates.
 * Provides optimistic UI updates and automatic syncing.
 */

import { useState, useEffect, useCallback } from 'react';
import NotificationPreferencesService from '../services/notifications/NotificationPreferencesService';
import type { NotificationPreferences } from '../types/notifications';

/**
 * Hook return type
 */
interface UseNotificationPreferencesReturn {
  /** Current preferences */
  preferences: NotificationPreferences | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Update preference (with optimistic UI) */
  updatePreference: <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => Promise<void>;
  /** Force refresh from Supabase */
  refresh: () => Promise<void>;
  /** Subscribe to tournament */
  subscribeTournament: (tournamentCode: string) => Promise<void>;
  /** Unsubscribe from tournament */
  unsubscribeTournament: (tournamentCode: string) => Promise<void>;
  /** Sync status */
  isSynced: boolean;
  lastSyncedAt: string | null;
}

/**
 * Hook for managing notification preferences
 *
 * @param refereeId - Referee ID
 * @param autoRefresh - Auto-refresh interval in ms (default: 5 minutes)
 *
 * @example
 * ```tsx
 * const { preferences, updatePreference, isLoading } = useNotificationPreferences('1');
 *
 * // Toggle notification type
 * await updatePreference('newAssignments', true);
 *
 * // Update quiet hours
 * await updatePreference('quietHours', {
 *   enabled: true,
 *   startTime: '22:00',
 *   endTime: '08:00',
 *   timezone: 'Europe/Rome'
 * });
 * ```
 */
export function useNotificationPreferences(
  refereeId: string,
  autoRefresh: number = 5 * 60 * 1000 // 5 minutes
): UseNotificationPreferencesReturn {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSynced, setIsSynced] = useState(false);

  const preferencesService = NotificationPreferencesService.getInstance();

  /**
   * Load preferences
   */
  const loadPreferences = useCallback(async (forceSync: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const prefs = await preferencesService.getPreferences(refereeId, forceSync);
      setPreferences(prefs);

      // Check sync status
      setIsSynced(!!prefs.lastSyncedAt);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load preferences');
      setError(error);
      console.error('[useNotificationPreferences] Failed to load preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, [refereeId]);

  /**
   * Update preference with optimistic UI
   */
  const updatePreference = useCallback(async <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    if (!preferences) {
      throw new Error('Preferences not loaded');
    }

    try {
      // Optimistic update
      const optimisticPrefs = {
        ...preferences,
        [key]: value,
        updatedAt: new Date().toISOString()
      };
      setPreferences(optimisticPrefs);

      // Actual update
      const updated = await preferencesService.updatePreferences(refereeId, {
        [key]: value
      } as any);

      setPreferences(updated);
      setIsSynced(!!updated.lastSyncedAt);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update preference');
      setError(error);

      // Revert optimistic update on error
      await loadPreferences();

      throw error;
    }
  }, [refereeId, preferences, loadPreferences]);

  /**
   * Force refresh from Supabase
   */
  const refresh = useCallback(async () => {
    await loadPreferences(true);
  }, [loadPreferences]);

  /**
   * Subscribe to tournament
   */
  const subscribeTournament = useCallback(async (tournamentCode: string) => {
    try {
      const updated = await preferencesService.subscribeTournament(refereeId, tournamentCode);
      setPreferences(updated);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to subscribe to tournament');
      setError(error);
      throw error;
    }
  }, [refereeId]);

  /**
   * Unsubscribe from tournament
   */
  const unsubscribeTournament = useCallback(async (tournamentCode: string) => {
    try {
      const updated = await preferencesService.unsubscribeTournament(refereeId, tournamentCode);
      setPreferences(updated);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to unsubscribe from tournament');
      setError(error);
      throw error;
    }
  }, [refereeId]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh <= 0) return;

    const interval = setInterval(() => {
      loadPreferences(true);
    }, autoRefresh);

    return () => clearInterval(interval);
  }, [autoRefresh, loadPreferences]);

  return {
    preferences,
    isLoading,
    error,
    updatePreference,
    refresh,
    subscribeTournament,
    unsubscribeTournament,
    isSynced,
    lastSyncedAt: preferences?.lastSyncedAt || null
  };
}
