/**
 * Shared date and time formatting utilities for referee interface components
 * Provides consistent formatting across all card components
 * Enhanced with timezone awareness for Phase 3 UI implementation
 */

import { DateTime } from 'luxon';
import { TournamentStorageService } from '../services/TournamentStorageService';

// Legacy formatters (preserved for backward compatibility)
export const formatTime = (date: Date, time?: string): string => {
  if (time) return time;
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateLong = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Enhanced timezone-aware formatters

interface TimezoneAwareFormatOptions {
  tournamentTimezone?: string;
  showTimezoneIndicator?: boolean;
  useUserPreference?: boolean;
}

// Cache for timezone preference to avoid repeated AsyncStorage calls
let cachedTimezonePreference: 'user' | 'local' | null = null;
let preferenceLoadTime: number = 0;
const PREFERENCE_CACHE_TTL = 30000; // 30 seconds cache

/**
 * Format time with timezone awareness
 * Shows either user's local time or tournament time based on preferences
 * Includes timezone indicator for clarity
 */
export const formatTimeWithTimezone = async (
  utcDate: Date | string,
  options: TimezoneAwareFormatOptions = {}
): Promise<string> => {
  try {
    const {
      tournamentTimezone = 'UTC',
      showTimezoneIndicator = true,
      useUserPreference = true
    } = options;

    // Parse UTC date
    const utcDateTime = typeof utcDate === 'string'
      ? DateTime.fromISO(utcDate, { zone: 'utc' })
      : DateTime.fromJSDate(utcDate, { zone: 'utc' });

    if (!utcDateTime.isValid) {
      console.warn('Invalid date provided to formatTimeWithTimezone:', utcDate);
      return formatTime(new Date(utcDate));
    }

    // Get user preference if enabled
    let useLocalTime = false;
    if (useUserPreference) {
      try {
        const preferences = await TournamentStorageService.getUserPreferences();
        useLocalTime = preferences?.timezoneDisplayMode === 'local';
      } catch (error) {
        console.warn('Failed to load timezone preference:', error);
        useLocalTime = false; // Default to user time
      }
    }

    // Get user's timezone for comparison
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Determine target timezone
    const targetTimezone = useLocalTime ? tournamentTimezone : userTimezone;

    // Convert to target timezone
    const localDateTime = utcDateTime.setZone(targetTimezone);

    // Format time
    const timeString = localDateTime.toFormat('HH:mm');

    if (!showTimezoneIndicator) {
      return timeString;
    }

    // Don't show indicator if user timezone matches tournament timezone
    if (userTimezone === tournamentTimezone) {
      return timeString;
    }

    // Add timezone indicator only when timezones differ
    const indicator = useLocalTime ? 'Local Time' : 'My Time';
    return `${timeString} (${indicator})`;

  } catch (error) {
    console.error('Error in formatTimeWithTimezone:', error);
    // Fallback to legacy formatter
    return formatTime(new Date(utcDate));
  }
};

/**
 * Format date with timezone awareness
 * Ensures date consistency across timezone conversions
 */
export const formatDateWithTimezone = async (
  utcDate: Date | string,
  options: TimezoneAwareFormatOptions = {}
): Promise<string> => {
  try {
    const {
      tournamentTimezone = 'UTC',
      useUserPreference = true
    } = options;

    // Parse UTC date
    const utcDateTime = typeof utcDate === 'string'
      ? DateTime.fromISO(utcDate, { zone: 'utc' })
      : DateTime.fromJSDate(utcDate, { zone: 'utc' });

    if (!utcDateTime.isValid) {
      console.warn('Invalid date provided to formatDateWithTimezone:', utcDate);
      return formatDate(new Date(utcDate));
    }

    // Get user preference if enabled
    let useLocalTime = false;
    if (useUserPreference) {
      try {
        const preferences = await TournamentStorageService.getUserPreferences();
        useLocalTime = preferences?.timezoneDisplayMode === 'local';
      } catch (error) {
        console.warn('Failed to load timezone preference:', error);
        useLocalTime = false;
      }
    }

    // Determine target timezone
    const targetTimezone = useLocalTime ? tournamentTimezone : Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Convert to target timezone
    const localDateTime = utcDateTime.setZone(targetTimezone);

    // Format date
    return localDateTime.toFormat('ccc, MMM d'); // "Mon, Jan 15"

  } catch (error) {
    console.error('Error in formatDateWithTimezone:', error);
    // Fallback to legacy formatter
    return formatDate(new Date(utcDate));
  }
};

/**
 * Format full date and time with timezone awareness
 * Combines date and time with timezone indicators
 */
export const formatDateTimeWithTimezone = async (
  utcDate: Date | string,
  options: TimezoneAwareFormatOptions = {}
): Promise<string> => {
  try {
    const date = await formatDateWithTimezone(utcDate, { ...options, showTimezoneIndicator: false });
    const time = await formatTimeWithTimezone(utcDate, options);

    return `${date} • ${time}`;
  } catch (error) {
    console.error('Error in formatDateTimeWithTimezone:', error);
    // Fallback to legacy formatters
    const fallbackDate = formatDate(new Date(utcDate));
    const fallbackTime = formatTime(new Date(utcDate));
    return `${fallbackDate} • ${fallbackTime}`;
  }
};

/**
 * Synchronous timezone-aware formatter for immediate use
 * Uses cached preference from previous async load
 */
export const formatTimeWithTimezoneSync = (
  utcDate: Date | string,
  options: TimezoneAwareFormatOptions & { cachedPreference?: 'user' | 'local' } = {}
): string => {
  try {
    const {
      tournamentTimezone = 'UTC',
      showTimezoneIndicator = true,
      cachedPreference = 'user'
    } = options;

    // Parse UTC date
    const utcDateTime = typeof utcDate === 'string'
      ? DateTime.fromISO(utcDate, { zone: 'utc' })
      : DateTime.fromJSDate(utcDate, { zone: 'utc' });

    if (!utcDateTime.isValid) {
      return formatTime(new Date(utcDate));
    }

    // Use cached preference
    const useLocalTime = cachedPreference === 'local';

    // Get user's timezone for comparison
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Determine target timezone
    const targetTimezone = useLocalTime ? tournamentTimezone : userTimezone;

    // Convert to target timezone
    const localDateTime = utcDateTime.setZone(targetTimezone);

    // Format time
    const timeString = localDateTime.toFormat('HH:mm');

    if (!showTimezoneIndicator) {
      return timeString;
    }

    // Don't show indicator if user timezone matches tournament timezone
    if (userTimezone === tournamentTimezone) {
      return timeString;
    }

    // Add timezone indicator only when timezones differ
    const indicator = useLocalTime ? 'Local Time' : 'My Time';
    return `${timeString} (${indicator})`;

  } catch (error) {
    console.error('Error in formatTimeWithTimezoneSync:', error);
    return formatTime(new Date(utcDate));
  }
};

/**
 * Get current timezone preference from storage
 * Helper function for components that need to know the current preference
 */
export const getCurrentTimezonePreference = async (): Promise<'user' | 'local'> => {
  try {
    // Return cached preference if still valid
    const now = Date.now();
    if (cachedTimezonePreference && (now - preferenceLoadTime) < PREFERENCE_CACHE_TTL) {
      return cachedTimezonePreference;
    }

    // Load fresh preference from storage
    const preferences = await TournamentStorageService.getUserPreferences();
    const preference = preferences?.timezoneDisplayMode === 'local' ? 'local' : 'user';

    // Update cache
    cachedTimezonePreference = preference;
    preferenceLoadTime = now;

    return preference;
  } catch (error) {
    console.warn('Failed to load timezone preference:', error);
    return 'user'; // Default to user timezone
  }
};

// Simple event emitter for timezone preference changes
type TimezonePreferenceListener = (preference: 'user' | 'local') => void;
const timezonePreferenceListeners = new Set<TimezonePreferenceListener>();

/**
 * Subscribe to timezone preference changes
 */
export const subscribeToTimezonePreferenceChanges = (listener: TimezonePreferenceListener): (() => void) => {
  timezonePreferenceListeners.add(listener);

  // Return unsubscribe function
  return () => {
    timezonePreferenceListeners.delete(listener);
  };
};

/**
 * Notify all listeners of timezone preference change
 */
const notifyTimezonePreferenceChange = (preference: 'user' | 'local'): void => {
  timezonePreferenceListeners.forEach(listener => {
    try {
      listener(preference);
    } catch (error) {
      console.warn('Error in timezone preference listener:', error);
    }
  });
};

/**
 * Invalidate timezone preference cache and notify listeners
 * Call this when timezone preference is updated to ensure immediate UI updates
 */
export const invalidateTimezonePreferenceCache = (): void => {
  cachedTimezonePreference = null;
  preferenceLoadTime = 0;

  // Refresh the preference and notify listeners
  getCurrentTimezonePreference().then(preference => {
    notifyTimezonePreferenceChange(preference);
  }).catch(error => {
    console.warn('Failed to refresh timezone preference after invalidation:', error);
  });
};