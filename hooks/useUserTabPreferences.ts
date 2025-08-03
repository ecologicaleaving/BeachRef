/**
 * User Tab Preferences Hook
 * 
 * Manages user preferences for tournament tab selection with localStorage persistence.
 * Provides functionality to override smart defaults with user-defined preferences.
 * 
 * Features:
 * - localStorage persistence across browser sessions
 * - Smart defaults toggle (enable/disable intelligent tab selection)
 * - Manual default tab selection override
 * - Preference reset functionality
 * - Error handling for localStorage access
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { TabId, isValidTabId } from '@/utils/tournament-context-analysis'

export interface UserTabPreferences {
  defaultTab?: TabId | 'smart'
  enableSmartDefaults: boolean
  lastUpdated: number
  version: string // For future migration compatibility
}

const STORAGE_KEY = 'beachref-tab-preferences'
const PREFERENCES_VERSION = '1.0'

const DEFAULT_PREFERENCES: UserTabPreferences = {
  enableSmartDefaults: true,
  lastUpdated: Date.now(),
  version: PREFERENCES_VERSION
}

/**
 * Hook for managing user tab preferences with localStorage persistence
 */
export function useUserTabPreferences() {
  const [preferences, setPreferences] = useState<UserTabPreferences>(DEFAULT_PREFERENCES)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: UserTabPreferences = JSON.parse(stored)
        
        // Validate version compatibility
        if (parsed.version === PREFERENCES_VERSION) {
          setPreferences(parsed)
        } else {
          // Version mismatch - reset to defaults and migrate if needed
          console.info('Tab preferences version mismatch, resetting to defaults')
          setPreferences(DEFAULT_PREFERENCES)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES))
        }
      }
    } catch (error) {
      console.warn('Failed to load tab preferences:', error)
      // Reset to defaults on any parsing error
      setPreferences(DEFAULT_PREFERENCES)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Save preferences to localStorage
  const updatePreferences = useCallback((updates: Partial<UserTabPreferences>) => {
    const newPreferences: UserTabPreferences = {
      ...preferences,
      ...updates,
      lastUpdated: Date.now(),
      version: PREFERENCES_VERSION
    }
    
    setPreferences(newPreferences)
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences))
    } catch (error) {
      console.warn('Failed to save tab preferences:', error)
    }
  }, [preferences])

  // Set default tab preference
  const setDefaultTab = useCallback((tabId: TabId | 'smart') => {
    if (tabId !== 'smart' && !isValidTabId(tabId)) {
      console.warn(`Invalid tab ID: ${tabId}`)
      return
    }
    
    updatePreferences({ 
      defaultTab: tabId,
      enableSmartDefaults: tabId === 'smart'
    })
  }, [updatePreferences])

  // Toggle smart defaults
  const toggleSmartDefaults = useCallback((enabled: boolean) => {
    updatePreferences({ 
      enableSmartDefaults: enabled,
      defaultTab: enabled ? 'smart' : preferences.defaultTab
    })
  }, [updatePreferences, preferences.defaultTab])

  // Reset preferences to defaults
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to reset tab preferences:', error)
    }
  }, [])

  // Get the effective user preference for context analysis
  const getEffectivePreference = useCallback((): string | undefined => {
    if (!preferences.enableSmartDefaults && preferences.defaultTab && preferences.defaultTab !== 'smart') {
      return preferences.defaultTab
    }
    return undefined // Use smart defaults
  }, [preferences])

  // Check if a specific tab is set as the user's default
  const isTabSetAsDefault = useCallback((tabId: TabId): boolean => {
    return preferences.defaultTab === tabId && !preferences.enableSmartDefaults
  }, [preferences])

  return {
    preferences,
    isLoaded,
    updatePreferences,
    setDefaultTab,
    toggleSmartDefaults,
    resetPreferences,
    getEffectivePreference,
    isTabSetAsDefault,
    // Computed values for easier usage
    userPreference: getEffectivePreference(),
    isSmartDefaultsEnabled: preferences.enableSmartDefaults,
    currentDefaultTab: preferences.defaultTab || 'smart'
  }
}

/**
 * Utility function to check if tab preferences are available in the browser
 */
export function isTabPreferencesSupported(): boolean {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

/**
 * Utility function to get preference status for debugging
 */
export function getPreferenceDebugInfo(): {
  hasStoredPreferences: boolean
  storageSupported: boolean
  currentPreferences?: UserTabPreferences
} {
  const storageSupported = isTabPreferencesSupported()
  let hasStoredPreferences = false
  let currentPreferences: UserTabPreferences | undefined

  if (storageSupported) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      hasStoredPreferences = !!stored
      if (stored) {
        currentPreferences = JSON.parse(stored)
      }
    } catch {
      // Ignore errors for debug info
    }
  }

  return {
    hasStoredPreferences,
    storageSupported,
    currentPreferences
  }
}