/**
 * ReminderConfig Component
 *
 * Allows users to configure match reminders.
 * Supports multiple reminder timings (60, 30, 15 minutes before match).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import type { NotificationPreferences } from '../../types/notifications';

interface ReminderConfigProps {
  reminders: NotificationPreferences['reminders'];
  onUpdate: (reminders: NotificationPreferences['reminders']) => Promise<void>;
}

/**
 * Available reminder timings (in minutes)
 */
const REMINDER_OPTIONS = [60, 30, 15];

export function ReminderConfig({ reminders, onUpdate }: ReminderConfigProps) {
  const theme = useTheme();

  /**
   * Toggle reminders enabled
   */
  const handleToggleEnabled = async (enabled: boolean) => {
    try {
      await onUpdate({
        ...reminders,
        enabled
      });
    } catch (error) {
      console.error('Failed to toggle reminders:', error);
    }
  };

  /**
   * Toggle specific reminder timing
   */
  const handleToggleTiming = async (minutes: number) => {
    try {
      const currentTimings = reminders.minutesBefore;
      const isEnabled = currentTimings.includes(minutes);

      const updated = isEnabled
        ? currentTimings.filter(m => m !== minutes)
        : [...currentTimings, minutes].sort((a, b) => b - a); // Sort descending

      await onUpdate({
        ...reminders,
        minutesBefore: updated
      });
    } catch (error) {
      console.error('Failed to toggle reminder timing:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Reminder Match
          </Text>
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            Ricevi promemoria prima dei match assegnati
          </Text>
        </View>
        <Switch
          value={reminders.enabled}
          onValueChange={handleToggleEnabled}
          trackColor={{
            false: theme.colors.surfaceDisabled,
            true: theme.colors.primary
          }}
          thumbColor={reminders.enabled ? theme.colors.onPrimary : theme.colors.textDisabled}
        />
      </View>

      {reminders.enabled && (
        <View style={styles.timingsContainer}>
          <Text style={[styles.timingsLabel, { color: theme.colors.textSecondary }]}>
            Invia promemoria:
          </Text>

          {REMINDER_OPTIONS.map(minutes => {
            const isEnabled = reminders.minutesBefore.includes(minutes);

            return (
              <TouchableOpacity
                key={minutes}
                style={[styles.timingOption, {
                  backgroundColor: isEnabled ? theme.colors.primary : theme.colors.surface,
                  borderColor: isEnabled ? theme.colors.primary : theme.colors.border
                }]}
                onPress={() => handleToggleTiming(minutes)}
                activeOpacity={0.7}
              >
                <Text style={[styles.timingText, {
                  color: isEnabled ? theme.colors.onPrimary : theme.colors.text
                }]}>
                  {minutes} minuti prima
                </Text>
                {isEnabled && (
                  <Text style={[styles.checkmark, { color: theme.colors.onPrimary }]}>
                    ✓
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 18,
  },
  timingsContainer: {
    gap: 12,
    paddingHorizontal: 16,
  },
  timingsLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  timingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  timingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
  },
});
