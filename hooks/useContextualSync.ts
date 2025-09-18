import { useEffect, useCallback, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAppState } from 'react-native';

/**
 * Hook for contextual data synchronization
 * Automatically syncs data based on what the user is currently viewing
 */
export interface ContextualSyncOptions {
  tournamentCode?: string;
  refereeId?: string;
  matchId?: string;
  syncInterval?: number; // minutes
  enableAutoSync?: boolean;
}

export interface SyncStatus {
  isLoading: boolean;
  lastSync: Date | null;
  nextSync: Date | null;
  error: string | null;
}

export function useContextualSync(options: ContextualSyncOptions) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isLoading: false,
    lastSync: null,
    nextSync: null,
    error: null
  });

  const appState = useAppState();
  const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (syncStatus.isLoading) return;

    setSyncStatus(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const syncPayload = {
        context: 'user_focused',
        tournament_code: options.tournamentCode,
        referee_id: options.refereeId,
        match_id: options.matchId,
        timestamp: new Date().toISOString()
      };


      // Call the contextual-vis-sync Edge Function with user context
      const { data, error } = await supabase.functions.invoke('contextual-vis-sync', {
        body: {
          action: 'contextual_sync',
          ...syncPayload
        }
      });

      if (error) {
        throw new Error(`Sync failed: ${error.message}`);
      }

      const now = new Date();
      const nextSyncTime = options.syncInterval ? 
        new Date(now.getTime() + (options.syncInterval * 60 * 1000)) : null;

      setSyncStatus({
        isLoading: false,
        lastSync: now,
        nextSync: nextSyncTime,
        error: null
      });

      return data;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      setSyncStatus(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      console.error('❌ Contextual sync failed:', errorMessage);
      throw error;
    }
  }, [options, syncStatus.isLoading, supabase]);

  // Auto-sync when context changes or on interval
  useEffect(() => {
    if (!options.enableAutoSync) return;

    // Trigger initial sync when context changes
    if (options.tournamentCode || options.refereeId || options.matchId) {
      triggerSync().catch(console.error);
    }
  }, [options.tournamentCode, options.refereeId, options.matchId, options.enableAutoSync, triggerSync]);

  // Auto-sync on app focus (when user returns to app)
  useEffect(() => {
    if (!options.enableAutoSync) return;
    if (appState === 'active' && syncStatus.lastSync) {
      const timeSinceLastSync = Date.now() - syncStatus.lastSync.getTime();
      const syncIntervalMs = (options.syncInterval || 10) * 60 * 1000; // Default 10 minutes
      
      if (timeSinceLastSync > syncIntervalMs) {
        triggerSync().catch(console.error);
      }
    }
  }, [appState, options.enableAutoSync, options.syncInterval, syncStatus.lastSync, triggerSync]);

  return {
    syncStatus,
    triggerSync,
    isLoading: syncStatus.isLoading,
    lastSync: syncStatus.lastSync,
    error: syncStatus.error
  };
}