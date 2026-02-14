/**
 * QuietHoursConfig Component
 *
 * Allows users to configure quiet hours for notifications.
 * Uses simple text input for time (HH:mm format) for cross-platform compatibility.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import type { NotificationPreferences } from '../../types/notifications';

interface QuietHoursConfigProps {
  quietHours?: NotificationPreferences['quietHours'];
  onUpdate: (quietHours: NotificationPreferences['quietHours']) => Promise<void>;
}

export function QuietHoursConfig({ quietHours, onUpdate }: QuietHoursConfigProps) {
  const theme = useTheme();
  const [localQuietHours, setLocalQuietHours] = useState(quietHours);

  /**
   * Validate time format (HH:mm)
   */
  const validateTime = (time: string): boolean => {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(time);
  };

  /**
   * Toggle quiet hours enabled
   */
  const handleToggleEnabled = async (enabled: boolean) => {
    try {
      const updated = {
        ...localQuietHours,
        enabled,
        startTime: localQuietHours?.startTime || '22:00',
        endTime: localQuietHours?.endTime || '08:00',
        timezone: localQuietHours?.timezone || 'UTC'
      };

      setLocalQuietHours(updated);
      await onUpdate(updated);
    } catch (error) {
      console.error('Failed to toggle quiet hours:', error);
      Alert.alert('Errore', 'Impossibile aggiornare le ore silenziose.');
    }
  };

  /**
   * Update start time
   */
  const handleStartTimeChange = async (time: string) => {
    try {
      if (!validateTime(time)) {
        Alert.alert('Formato Non Valido', 'Inserisci il tempo in formato HH:mm (es. 22:00)');
        return;
      }

      const updated = {
        ...localQuietHours,
        enabled: localQuietHours?.enabled || false,
        startTime: time,
        endTime: localQuietHours?.endTime || '08:00',
        timezone: localQuietHours?.timezone || 'UTC'
      };

      setLocalQuietHours(updated);
      await onUpdate(updated);
    } catch (error) {
      console.error('Failed to update start time:', error);
      Alert.alert('Errore', 'Impossibile aggiornare l\'orario di inizio.');
    }
  };

  /**
   * Update end time
   */
  const handleEndTimeChange = async (time: string) => {
    try {
      if (!validateTime(time)) {
        Alert.alert('Formato Non Valido', 'Inserisci il tempo in formato HH:mm (es. 08:00)');
        return;
      }

      const updated = {
        ...localQuietHours,
        enabled: localQuietHours?.enabled || false,
        startTime: localQuietHours?.startTime || '22:00',
        endTime: time,
        timezone: localQuietHours?.timezone || 'UTC'
      };

      setLocalQuietHours(updated);
      await onUpdate(updated);
    } catch (error) {
      console.error('Failed to update end time:', error);
      Alert.alert('Errore', 'Impossibile aggiornare l\'orario di fine.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Ore Silenziose
          </Text>
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            Non ricevere notifiche durante queste ore
          </Text>
        </View>
        <Switch
          value={localQuietHours?.enabled || false}
          onValueChange={handleToggleEnabled}
          trackColor={{
            false: theme.colors.surfaceDisabled,
            true: theme.colors.primary
          }}
          thumbColor={localQuietHours?.enabled ? theme.colors.onPrimary : theme.colors.textDisabled}
        />
      </View>

      {localQuietHours?.enabled && (
        <View style={styles.timeInputs}>
          <View style={styles.timeInputGroup}>
            <Text style={[styles.timeLabel, { color: theme.colors.text }]}>
              Inizio
            </Text>
            <TextInput
              style={[styles.timeInput, {
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border
              }]}
              value={localQuietHours.startTime}
              onChangeText={handleStartTimeChange}
              placeholder="22:00"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>

          <Text style={[styles.separator, { color: theme.colors.text }]}>-</Text>

          <View style={styles.timeInputGroup}>
            <Text style={[styles.timeLabel, { color: theme.colors.text }]}>
              Fine
            </Text>
            <TextInput
              style={[styles.timeInput, {
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border
              }]}
              value={localQuietHours.endTime}
              onChangeText={handleEndTimeChange}
              placeholder="08:00"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
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
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  timeInputGroup: {
    flex: 1,
    gap: 8,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  separator: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
});
