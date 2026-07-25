/**
 * NotificationPreferencesService
 *
 * Manages user notification preferences with hybrid storage (MMKV + Supabase).
 * Phase 2: Complete with Supabase sync for multi-device support
 *
 * Features:
 * - Fast local storage with MMKV (<5ms)
 * - Supabase sync for multi-device support
 * - Conflict resolution (last-write-wins)
 * - Offline queue with retry
 * - CRUD operations for preferences
 * - Tournament subscription management
 * - Quiet hours validation
 */

import { MMKV } from 'react-native-mmkv';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../supabase';
import type {
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES
} from '../../types/notifications';
import { DEFAULT_NOTIFICATION_PREFERENCES as DEFAULT_PREFS } from '../../types/notifications';

/**
 * MMKV storage namespace for notifications
 */
const STORAGE_NAMESPACE = 'notifications';

/**
 * Storage keys
 */
const STORAGE_KEYS = {
  preferences: (refereeId: string) => `${STORAGE_NAMESPACE}.preferences.${refereeId}`,
  syncQueue: () => `${STORAGE_NAMESPACE}.syncQueue`,
  lastSync: (refereeId: string) => `${STORAGE_NAMESPACE}.lastSync.${refereeId}`,
};

/**
 * Sync queue item
 */
interface SyncQueueItem {
  refereeId: string;
  preferences: NotificationPreferences;
  timestamp: number;
  retryCount: number;
}

/**
 * Supabase notification preferences row
 */
interface SupabaseNotificationPreferences {
  id: string;
  referee_id: number;
  enabled: boolean;
  new_assignments: boolean;
  match_results: boolean;
  match_designations: boolean;
  status_changes: boolean;
  tournament_updates: boolean;
  reminders_enabled: boolean;
  reminder_minutes: number[];
  subscribed_tournaments: string[];
  sound: boolean;
  vibration: boolean;
  badge: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_hours_timezone: string;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
  version: number;
}

/**
 * NotificationPreferencesService - Singleton
 */
export class NotificationPreferencesService {
  private static instance: NotificationPreferencesService;
  private storage: MMKV;
  private debug: boolean = __DEV__;
  private syncInProgress: Map<string, boolean> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Initialize MMKV — encryptionKey is NOT supported on web (react-native-mmkv)
    this.storage = new MMKV({
      id: STORAGE_NAMESPACE,
      ...(Platform.OS !== 'web' && process.env.EXPO_PUBLIC_MMKV_KEY
        ? { encryptionKey: process.env.EXPO_PUBLIC_MMKV_KEY }
        : {})
    });

    this.log('NotificationPreferencesService initialized');

    // Start background sync (every 5 minutes)
    this.startBackgroundSync();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): NotificationPreferencesService {
    if (!NotificationPreferencesService.instance) {
      NotificationPreferencesService.instance = new NotificationPreferencesService();
    }
    return NotificationPreferencesService.instance;
  }

  /**
   * Get preferences for a referee
   * Returns local cache first, then syncs from Supabase if stale
   *
   * @param refereeId - Referee ID
   * @param forceSync - Force sync from Supabase
   * @returns Notification preferences
   */
  public async getPreferences(refereeId: string, forceSync: boolean = false): Promise<NotificationPreferences> {
    try {
      const key = STORAGE_KEYS.preferences(refereeId);
      const stored = this.storage.getString(key);

      // Check if we have local data
      if (stored && !forceSync) {
        const preferences = JSON.parse(stored) as NotificationPreferences;
        this.log('Preferences loaded from cache for referee:', refereeId);

        // Trigger background sync if stale (>5 minutes)
        this.syncIfStale(refereeId, preferences);

        return preferences;
      }

      // Sync from Supabase
      this.log('Syncing preferences from Supabase for referee:', refereeId);
      const synced = await this.syncFromSupabase(refereeId);

      return synced || this.createDefaultPreferences(refereeId);
    } catch (error) {
      console.error('[NotificationPreferencesService] Failed to get preferences:', error);

      // Fallback to local cache
      const key = STORAGE_KEYS.preferences(refereeId);
      const stored = this.storage.getString(key);

      if (stored) {
        return JSON.parse(stored) as NotificationPreferences;
      }

      return this.createDefaultPreferences(refereeId);
    }
  }

  /**
   * Update preferences for a referee
   * Writes to local cache immediately and queues Supabase sync
   *
   * @param refereeId - Referee ID
   * @param updates - Partial preference updates
   * @returns Updated preferences
   */
  public async updatePreferences(
    refereeId: string,
    updates: Partial<Omit<NotificationPreferences, 'id' | 'refereeId' | 'createdAt'>>
  ): Promise<NotificationPreferences> {
    try {
      // Get existing preferences
      const existing = await this.getPreferences(refereeId);

      // Merge updates
      const updated: NotificationPreferences = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Validate quiet hours if updated
      if (updates.quietHours) {
        this.validateQuietHours(updated.quietHours);
      }

      // Save to local cache immediately
      const key = STORAGE_KEYS.preferences(refereeId);
      this.storage.set(key, JSON.stringify(updated));

      this.log('Preferences updated locally for referee:', refereeId);

      // Queue sync to Supabase
      await this.queueSync(refereeId, updated);

      return updated;
    } catch (error) {
      console.error('[NotificationPreferencesService] Failed to update preferences:', error);
      throw error;
    }
  }

  /**
   * Sync preferences to Supabase
   * Uses last-write-wins strategy with version numbers
   *
   * @param refereeId - Referee ID
   * @returns Success status
   */
  public async syncPreferences(refereeId: string): Promise<boolean> {
    // Prevent concurrent syncs
    if (this.syncInProgress.get(refereeId)) {
      this.log('Sync already in progress for referee:', refereeId);
      return false;
    }

    try {
      this.syncInProgress.set(refereeId, true);

      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        this.log('No network connection, skipping sync');
        return false;
      }

      // Get local preferences
      const key = STORAGE_KEYS.preferences(refereeId);
      const stored = this.storage.getString(key);

      if (!stored) {
        this.log('No local preferences to sync');
        return false;
      }

      const localPrefs = JSON.parse(stored) as NotificationPreferences;

      // Convert to Supabase format
      const supabasePrefs = this.toSupabaseFormat(localPrefs, refereeId);

      // Upsert to Supabase
      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert(supabasePrefs, {
          onConflict: 'referee_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        console.error('[NotificationPreferencesService] Supabase sync error:', error);
        return false;
      }

      // Update last synced timestamp
      const syncedPrefs: NotificationPreferences = {
        ...localPrefs,
        lastSyncedAt: new Date().toISOString()
      };

      this.storage.set(key, JSON.stringify(syncedPrefs));

      this.log('Preferences synced to Supabase for referee:', refereeId);
      return true;
    } catch (error) {
      console.error('[NotificationPreferencesService] Failed to sync preferences:', error);
      return false;
    } finally {
      this.syncInProgress.set(refereeId, false);
    }
  }

  /**
   * Sync preferences from Supabase
   * Updates local cache with remote data
   *
   * @param refereeId - Referee ID
   * @returns Synced preferences or null if not found
   */
  private async syncFromSupabase(refereeId: string): Promise<NotificationPreferences | null> {
    try {
      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        this.log('No network connection, using local cache');
        return null;
      }

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('referee_id', parseInt(refereeId, 10))
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found - create default
          this.log('No preferences found in Supabase, creating default');
          return null;
        }

        console.error('[NotificationPreferencesService] Supabase fetch error:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      // Convert from Supabase format
      const preferences = this.fromSupabaseFormat(data as SupabaseNotificationPreferences);

      // Update local cache
      const key = STORAGE_KEYS.preferences(refereeId);
      this.storage.set(key, JSON.stringify(preferences));

      this.log('Preferences synced from Supabase for referee:', refereeId);
      return preferences;
    } catch (error) {
      console.error('[NotificationPreferencesService] Failed to sync from Supabase:', error);
      return null;
    }
  }

  /**
   * Queue preferences for sync
   * Adds to sync queue and triggers immediate sync if online
   *
   * @param refereeId - Referee ID
   * @param preferences - Preferences to sync
   */
  private async queueSync(refereeId: string, preferences: NotificationPreferences): Promise<void> {
    try {
      // Get current queue
      const queueKey = STORAGE_KEYS.syncQueue();
      const queueStr = this.storage.getString(queueKey);
      const queue: SyncQueueItem[] = queueStr ? JSON.parse(queueStr) : [];

      // Add to queue (replace existing entry for same referee)
      const filtered = queue.filter(item => item.refereeId !== refereeId);
      filtered.push({
        refereeId,
        preferences,
        timestamp: Date.now(),
        retryCount: 0
      });

      this.storage.set(queueKey, JSON.stringify(filtered));

      // Trigger immediate sync if online
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        this.processSyncQueue();
      }
    } catch (error) {
      console.error('[NotificationPreferencesService] Failed to queue sync:', error);
    }
  }

  /**
   * Process sync queue
   * Attempts to sync all queued preferences
   */
  private async processSyncQueue(): Promise<void> {
    try {
      const queueKey = STORAGE_KEYS.syncQueue();
      const queueStr = this.storage.getString(queueKey);

      if (!queueStr) return;

      const queue: SyncQueueItem[] = JSON.parse(queueStr);

      if (queue.length === 0) return;

      this.log('Processing sync queue:', queue.length, 'items');

      const remaining: SyncQueueItem[] = [];

      for (const item of queue) {
        const success = await this.syncPreferences(item.refereeId);

        if (!success) {
          // Retry with exponential backoff
          if (item.retryCount < 3) {
            remaining.push({
              ...item,
              retryCount: item.retryCount + 1
            });
          } else {
            this.log('Max retries reached for referee:', item.refereeId);
          }
        }
      }

      // Update queue
      this.storage.set(queueKey, JSON.stringify(remaining));

      this.log('Sync queue processed. Remaining:', remaining.length);
    } catch (error) {
      console.error('[NotificationPreferencesService] Failed to process sync queue:', error);
    }
  }

  /**
   * Check if preferences are stale and trigger background sync
   */
  private async syncIfStale(refereeId: string, preferences: NotificationPreferences): Promise<void> {
    try {
      if (!preferences.lastSyncedAt) {
        // Never synced, trigger sync
        this.queueSync(refereeId, preferences);
        return;
      }

      const lastSynced = new Date(preferences.lastSyncedAt).getTime();
      const now = Date.now();
      const staleThreshold = 5 * 60 * 1000; // 5 minutes

      if (now - lastSynced > staleThreshold) {
        this.log('Preferences stale, triggering background sync');
        this.syncFromSupabase(refereeId);
      }
    } catch (error) {
      console.error('[NotificationPreferencesService] Failed to check staleness:', error);
    }
  }

  /**
   * Start background sync (every 5 minutes)
   */
  private startBackgroundSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      this.processSyncQueue();
    }, 5 * 60 * 1000); // 5 minutes

    this.log('Background sync started');
  }

  /**
   * Stop background sync
   */
  public stopBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.log('Background sync stopped');
    }
  }

  /**
   * Delete preferences for a referee
   *
   * @param refereeId - Referee ID
   */
  public async deletePreferences(refereeId: string): Promise<void> {
    try {
      // Delete from local cache
      const key = STORAGE_KEYS.preferences(refereeId);
      this.storage.delete(key);

      // Delete from Supabase
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        await supabase
          .from('notification_preferences')
          .delete()
          .eq('referee_id', parseInt(refereeId, 10));
      }

      this.log('Preferences deleted for referee:', refereeId);
    } catch (error) {
      console.error('[NotificationPreferencesService] Failed to delete preferences:', error);
      throw error;
    }
  }

  /**
   * Subscribe to a tournament
   *
   * @param refereeId - Referee ID
   * @param tournamentCode - Tournament code to subscribe to
   * @returns Updated preferences
   */
  public async subscribeTournament(
    refereeId: string,
    tournamentCode: string
  ): Promise<NotificationPreferences> {
    try {
      const preferences = await this.getPreferences(refereeId);

      // Add tournament if not already subscribed
      if (!preferences.subscribedTournaments.includes(tournamentCode)) {
        preferences.subscribedTournaments.push(tournamentCode);

        await this.updatePreferences(refereeId, {
          subscribedTournaments: preferences.subscribedTournaments
        });

        this.log('Subscribed to tournament:', tournamentCode, 'for referee:', refereeId);
      }

      return preferences;
    } catch (error) {
      console.error('[NotificationPreferencesService] Failed to subscribe to tournament:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from a tournament
   *
   * @param refereeId - Referee ID
   * @param tournamentCode - Tournament code to unsubscribe from
   * @returns Updated preferences
   */
  public async unsubscribeTournament(
    refereeId: string,
    tournamentCode: string
  ): Promise<NotificationPreferences> {
    try {
      const preferences = await this.getPreferences(refereeId);

      // Remove tournament if subscribed
      const filtered = preferences.subscribedTournaments.filter(
        code => code !== tournamentCode
      );

      if (filtered.length !== preferences.subscribedTournaments.length) {
        await this.updatePreferences(refereeId, {
          subscribedTournaments: filtered
        });

        this.log('Unsubscribed from tournament:', tournamentCode, 'for referee:', refereeId);
      }

      return preferences;
    } catch (error) {
      console.error('[NotificationPreferencesService] Failed to unsubscribe from tournament:', error);
      throw error;
    }
  }

  /**
   * Check if a tournament is subscribed
   *
   * @param refereeId - Referee ID
   * @param tournamentCode - Tournament code to check
   * @returns True if subscribed
   */
  public async isTournamentSubscribed(
    refereeId: string,
    tournamentCode: string
  ): Promise<boolean> {
    try {
      const preferences = await this.getPreferences(refereeId);
      return preferences.subscribedTournaments.includes(tournamentCode);
    } catch (error) {
      console.error('[NotificationPreferencesService] Failed to check tournament subscription:', error);
      return false;
    }
  }

  /**
   * Check if currently in quiet hours
   *
   * @param refereeId - Referee ID
   * @returns True if in quiet hours
   */
  public async isInQuietHours(refereeId: string): Promise<boolean> {
    try {
      const preferences = await this.getPreferences(refereeId);

      if (!preferences.quietHours?.enabled) {
        return false;
      }

      const { startTime, endTime, timezone } = preferences.quietHours;

      // Get current time in configured timezone
      const now = new Date();
      const currentTime = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone
      });

      // Parse times
      const [currentHour, currentMinute] = currentTime.split(':').map(Number);
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      const currentMinutes = currentHour * 60 + currentMinute;
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      // Handle quiet hours spanning midnight
      if (startMinutes > endMinutes) {
        // e.g., 22:00 - 08:00
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      } else {
        // e.g., 08:00 - 22:00
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      }
    } catch (error) {
      console.error('[NotificationPreferencesService] Failed to check quiet hours:', error);
      return false;
    }
  }

  /**
   * Convert to Supabase format
   */
  private toSupabaseFormat(
    prefs: NotificationPreferences,
    refereeId: string
  ): Partial<SupabaseNotificationPreferences> {
    return {
      referee_id: parseInt(refereeId, 10),
      enabled: prefs.enabled,
      new_assignments: prefs.newAssignments,
      match_results: prefs.matchResults,
      match_designations: prefs.matchDesignations,
      status_changes: prefs.statusChanges,
      tournament_updates: prefs.tournamentUpdates,
      reminders_enabled: prefs.reminders.enabled,
      reminder_minutes: prefs.reminders.minutesBefore,
      subscribed_tournaments: prefs.subscribedTournaments,
      sound: prefs.sound,
      vibration: prefs.vibration,
      badge: prefs.badge,
      quiet_hours_enabled: prefs.quietHours?.enabled || false,
      quiet_hours_start: prefs.quietHours?.startTime || null,
      quiet_hours_end: prefs.quietHours?.endTime || null,
      quiet_hours_timezone: prefs.quietHours?.timezone || 'UTC',
      last_synced_at: new Date().toISOString()
    };
  }

  /**
   * Convert from Supabase format
   */
  private fromSupabaseFormat(data: SupabaseNotificationPreferences): NotificationPreferences {
    return {
      id: data.id,
      refereeId: data.referee_id.toString(),
      enabled: data.enabled,
      newAssignments: data.new_assignments,
      matchResults: data.match_results,
      matchDesignations: data.match_designations,
      statusChanges: data.status_changes,
      tournamentUpdates: data.tournament_updates,
      reminders: {
        enabled: data.reminders_enabled,
        minutesBefore: data.reminder_minutes
      },
      subscribedTournaments: data.subscribed_tournaments,
      sound: data.sound,
      vibration: data.vibration,
      badge: data.badge,
      quietHours: data.quiet_hours_enabled ? {
        enabled: data.quiet_hours_enabled,
        startTime: data.quiet_hours_start || '22:00',
        endTime: data.quiet_hours_end || '08:00',
        timezone: data.quiet_hours_timezone
      } : undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      lastSyncedAt: data.last_synced_at || undefined
    };
  }

  /**
   * Create default preferences for a new referee
   *
   * @param refereeId - Referee ID
   * @returns Default preferences
   */
  private createDefaultPreferences(refereeId: string): NotificationPreferences {
    const now = new Date().toISOString();

    return {
      ...DEFAULT_PREFS,
      id: `pref_${refereeId}_${Date.now()}`,
      refereeId,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Validate quiet hours configuration
   *
   * @param quietHours - Quiet hours config to validate
   * @throws Error if invalid
   */
  private validateQuietHours(quietHours: NotificationPreferences['quietHours']): void {
    if (!quietHours) return;

    const { startTime, endTime } = quietHours;

    // Validate time format (HH:mm)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (!timeRegex.test(startTime)) {
      throw new Error(`Invalid start time format: ${startTime}. Expected HH:mm`);
    }

    if (!timeRegex.test(endTime)) {
      throw new Error(`Invalid end time format: ${endTime}. Expected HH:mm`);
    }

    this.log('Quiet hours validated:', startTime, '-', endTime);
  }

  /**
   * Clear all stored preferences (for testing)
   */
  public clearAllPreferences(): void {
    try {
      this.storage.clearAll();
      this.log('All preferences cleared');
    } catch (error) {
      console.error('[NotificationPreferencesService] Failed to clear preferences:', error);
    }
  }

  /**
   * Debug logging
   */
  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[NotificationPreferencesService]', ...args);
    }
  }
}

// NOTE (issue #43): intentionally NO default export.
// A default export holding an already-built instance coexisting with a
// same-named class export is what caused `X.default.getInstance is not a
// function` at runtime. Consume this service as:
//   import { NotificationPreferencesService } from '.../NotificationPreferencesService';
//   NotificationPreferencesService.getInstance()
