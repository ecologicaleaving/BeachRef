import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AnalyticsCustomization } from '../components/Analytics/AnalyticsDashboard';

/**
 * Analytics Settings Interface
 * Following Story 4.3 AC4 - Analytics settings and customization options
 */
export interface AnalyticsSettings {
  timeRange: { start: string; end: string };
  customizations: AnalyticsCustomization;
  enableRealTimeUpdates: boolean;
  refreshInterval: number;
  theme: 'light' | 'dark' | 'auto';
  exportFormat: 'csv' | 'json' | 'pdf';
  lastUpdated: string;
}

/**
 * Analytics Settings Hook Result Interface
 */
export interface AnalyticsSettingsHookResult {
  settings: AnalyticsSettings | null;
  isLoading: boolean;
  error: Error | null;
  updateSettings: (updates: Partial<AnalyticsSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  exportSettings: () => Promise<string>;
  importSettings: (settingsJson: string) => Promise<void>;
}

/**
 * useAnalyticsSettings Hook
 * Manages analytics dashboard settings persistence with LocalStorageManager patterns
 * Following Story 4.3 AC4 requirements
 */
export function useAnalyticsSettings(): AnalyticsSettingsHookResult {
  const [settings, setSettings] = useState<AnalyticsSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Analytics settings are a *user preference*, not cached API data, so they are
  // persisted the same way the rest of the app persists preferences: AsyncStorage
  // under an explicit namespaced key (see TournamentStorageService).
  //
  // This hook used to call `LocalStorageManager.getInstance()`. `LocalStorageManager`
  // is a TTL cache: it has no `getInstance()` static (so the call threw a TypeError
  // during render and both /analytics-dashboard and /analytics-settings rendered as
  // blank pages), and it has no `getItem`/`setItem` either — its API is
  // `get(key)` / `set(key, data, ttl)` / `delete(key)` over a `@VisCache:` prefix.
  // Fixing only the `getInstance()` call would have turned the red error into a
  // second, quieter failure (issue #71 / #65).
  const SETTINGS_KEY = '@BeachRef:analytics_settings';

  // Default settings following Story 4.3 specifications
  const defaultSettings: AnalyticsSettings = {
    timeRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
      end: new Date().toISOString().split('T')[0],
    },
    customizations: {
      timeRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      },
      showTournamentAnalytics: true,
      showRefereeAnalytics: true,
      showPerformanceMetrics: true,
      refreshInterval: 30000, // 30 seconds for real-time updates
      widgetLayout: 'grid',
    },
    enableRealTimeUpdates: true,
    refreshInterval: 30000,
    theme: 'auto',
    exportFormat: 'csv',
    lastUpdated: new Date().toISOString(),
  };

  // Load settings from storage on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const storedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
      
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings) as AnalyticsSettings;
        
        // Validate and merge with defaults to handle schema changes
        const validatedSettings: AnalyticsSettings = {
          ...defaultSettings,
          ...parsedSettings,
          customizations: {
            ...defaultSettings.customizations,
            ...parsedSettings.customizations,
          },
        };
        
        setSettings(validatedSettings);
      } else {
        // First time use - save default settings
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
        setSettings(defaultSettings);
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      // Fall back to default settings on error
      setSettings(defaultSettings);
      
      console.error('Failed to load analytics settings:', error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update settings with persistence
  const updateSettings = useCallback(async (updates: Partial<AnalyticsSettings>): Promise<void> => {
    if (!settings) return;

    setError(null);
    
    try {
      const updatedSettings: AnalyticsSettings = {
        ...settings,
        ...updates,
        customizations: {
          ...settings.customizations,
          ...updates.customizations,
        },
        lastUpdated: new Date().toISOString(),
      };

      // Update local state immediately for responsive UI
      setSettings(updatedSettings);

      // Persist to storage
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
    } catch (err) {
      const error = err as Error;
      setError(error);
      
      // Revert local state on persistence failure
      await loadSettings();
      
      console.error('Failed to update analytics settings:', error.message);
      throw error;
    }
  }, [settings, loadSettings]);

  // Reset settings to defaults
  const resetSettings = useCallback(async (): Promise<void> => {
    setError(null);
    
    try {
      const resetSettings = {
        ...defaultSettings,
        lastUpdated: new Date().toISOString(),
      };

      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(resetSettings));
      setSettings(resetSettings);
    } catch (err) {
      const error = err as Error;
      setError(error);
      
      console.error('Failed to reset analytics settings:', error.message);
      throw error;
    }
  }, []);

  // Export settings as JSON string
  const exportSettings = useCallback(async (): Promise<string> => {
    if (!settings) {
      throw new Error('No settings available to export');
    }

    try {
      return JSON.stringify(settings, null, 2);
    } catch (err) {
      const error = err as Error;
      setError(error);
      
      console.error('Failed to export analytics settings:', error.message);
      throw error;
    }
  }, [settings]);

  // Import settings from JSON string
  const importSettings = useCallback(async (settingsJson: string): Promise<void> => {
    setError(null);
    
    try {
      const importedSettings = JSON.parse(settingsJson) as Partial<AnalyticsSettings>;
      
      // Validate and merge with current settings
      const validatedSettings: AnalyticsSettings = {
        ...defaultSettings,
        ...settings,
        ...importedSettings,
        customizations: {
          ...defaultSettings.customizations,
          ...settings?.customizations,
          ...importedSettings.customizations,
        },
        lastUpdated: new Date().toISOString(),
      };

      await updateSettings(validatedSettings);
    } catch (err) {
      const error = err as Error;
      setError(error);
      
      console.error('Failed to import analytics settings:', error.message);
      throw new Error('Invalid settings format or import failed');
    }
  }, [settings, updateSettings]);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
  };
}

export default useAnalyticsSettings;