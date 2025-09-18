/**
 * Timezone Toggle Component for Sidebar Navigation
 * Allows referees to switch between "My Time" and "Local Time" display modes
 * Following Foundation component patterns with accessibility support
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Icon } from '../Icons/MaterialCommunityIcons';
import { colors, spacing } from '../../theme/tokens';
import { TournamentStorageService } from '../../services/TournamentStorageService';

interface TimezoneToggleProps {
  tournamentTimezone?: string;
  visible?: boolean;
  onTimezonePreferenceChange?: (useLocalTime: boolean) => void;
}

interface TimezoneDetectionResult {
  userTimezone: string;
  tournamentTimezone: string;
  timezoneDifference: boolean;
}

/**
 * TimezoneToggle Component
 *
 * Features:
 * - Smart conditional rendering (only shows when timezones differ)
 * - Toggle between "My Time" (user's device timezone) and "Local Time" (tournament timezone)
 * - Persistent preference storage using TournamentStorageService patterns
 * - Accessibility support with proper ARIA labels
 * - Performance optimized with minimal re-renders
 */
export const TimezoneToggle: React.FC<TimezoneToggleProps> = ({
  tournamentTimezone,
  visible = true,
  onTimezonePreferenceChange,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [useLocalTime, setUseLocalTime] = useState(false); // false = "My Time", true = "Local Time"
  const [timezoneInfo, setTimezoneInfo] = useState<TimezoneDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load timezone preferences and detect timezone differences
  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounts

    const initializeTimezoneToggle = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get user's device timezone
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        // Use provided tournament timezone or detect from current context
        const detectedTournamentTimezone = tournamentTimezone || 'UTC';

        // Check if timezones are different
        const timezoneDifference = userTimezone !== detectedTournamentTimezone;

        const timezoneResult: TimezoneDetectionResult = {
          userTimezone,
          tournamentTimezone: detectedTournamentTimezone,
          timezoneDifference,
        };

        if (!isMounted) return;
        setTimezoneInfo(timezoneResult);

        // Load existing preference from storage
        try {
          const preferences = await TournamentStorageService.getUserPreferences();
          // Default to "My Time" (false) if no preference exists
          const savedPreference = preferences?.timezoneDisplayMode === 'local';
          if (isMounted) {
            setUseLocalTime(savedPreference);
          }
        } catch (storageError) {
          console.warn('Failed to load timezone preference:', storageError);
          // Default to "My Time" if storage fails
          if (isMounted) {
            setUseLocalTime(false);
          }
        }

      } catch (err) {
        console.error('Error initializing timezone toggle:', err);
        if (isMounted) {
          setError('Failed to detect timezone settings');
          setTimezoneInfo(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeTimezoneToggle();

    // Cleanup function to prevent memory leaks
    return () => {
      isMounted = false;
    };
  }, [tournamentTimezone]);

  // Handle toggle change
  const handleToggleChange = async (value: boolean) => {
    try {
      setUseLocalTime(value);

      // Save preference to storage following TournamentStorageService patterns
      const currentPreferences = await TournamentStorageService.getUserPreferences();
      const updatedPreferences = {
        ...currentPreferences,
        timezoneDisplayMode: value ? 'local' : 'user',
      };

      await TournamentStorageService.saveUserPreferences(updatedPreferences);

      // Invalidate cache to ensure immediate UI updates across the app
      // This ensures other components using timezone formatters get updated immediately
      try {
        const dateFormattersModule = await import('../../utils/dateFormatters');
        if (dateFormattersModule.invalidateTimezonePreferenceCache) {
          dateFormattersModule.invalidateTimezonePreferenceCache();
        }
      } catch (importError) {
        console.warn('Failed to invalidate timezone preference cache:', importError);
      }

      // Notify parent component of preference change
      onTimezonePreferenceChange?.(value);

    } catch (error) {
      console.error('Error saving timezone preference:', error);
      // Revert the toggle state if save fails
      setUseLocalTime(!value);
      setError('Failed to save timezone preference');
    }
  };

  // Don't render if not visible or loading failed with error
  if (!visible || (!isLoading && error && !timezoneInfo)) {
    return null;
  }

  // Don't render if timezones are the same (smart conditional rendering)
  if (!isLoading && timezoneInfo && !timezoneInfo.timezoneDifference) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
          <Text style={styles.loadingText}>Detecting timezone...</Text>
        </View>
      </View>
    );
  }

  // Error state (show briefly then hide)
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={16} color={colors.error} />
          <Text style={styles.errorText}>Timezone detection failed</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="timezone-toggle-container">
      <TouchableOpacity
        style={styles.toggleContainer}
        onPress={() => handleToggleChange(!useLocalTime)}
        activeOpacity={0.7}
        accessible
        accessibilityRole="switch"
        accessibilityState={{ checked: useLocalTime }}
        accessibilityLabel={`Timezone display mode. Currently showing ${useLocalTime ? 'tournament local time' : 'your local time'}`}
        accessibilityHint="Tap to switch between your timezone and tournament timezone"
        testID="timezone-toggle-button"
      >
        <View style={styles.leftSection}>
          <Icon name="clock-outline" size={18} color={colors.textPrimary} style={styles.clockIcon} />
          <View style={styles.textContainer}>
            <Text style={styles.toggleLabel}>
              {useLocalTime ? 'Local Time' : 'My Time'}
            </Text>
            <Text style={styles.toggleHint}>
              {useLocalTime
                ? `Tournament timezone (${timezoneInfo?.tournamentTimezone || 'Unknown'})`
                : `Your timezone (${timezoneInfo?.userTimezone || 'Unknown'})`
              }
            </Text>
          </View>
        </View>

        <Switch
          value={useLocalTime}
          onValueChange={handleToggleChange}
          trackColor={{
            false: colors.secondary + '40', // Add transparency
            true: colors.primary + '60'   // Add transparency
          }}
          thumbColor={useLocalTime ? colors.primary : colors.textSecondary}
          style={styles.switch}
          accessibilityLabel="Timezone toggle switch"
        />
      </TouchableOpacity>

      {/* Timezone indicator */}
      <View style={styles.indicatorContainer}>
        <Text style={styles.indicatorText}>
          Times shown in {useLocalTime ? 'tournament' : 'your'} timezone
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 52, // Minimum touch target
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clockIcon: {
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  toggleHint: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  switch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
    marginLeft: spacing.sm,
  },
  indicatorContainer: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  indicatorText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginLeft: spacing.xs,
  },
});

export default TimezoneToggle;