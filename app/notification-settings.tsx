/**
 * Notification Settings Screen
 *
 * Allows users to configure their notification preferences.
 * Phase 1 (MVP): Basic enable/disable controls
 * Phase 2: Complete preferences with quiet hours and tournament subscriptions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { NotificationService, PermissionStatus } from '../services/notifications/NotificationService';
import { NotificationPreferencesService } from '../services/notifications/NotificationPreferencesService';
import type { NotificationPreferences } from '../types/notifications';
/**
 * Issue #65 — this import used to be `from '../theme/ThemeContext'`.
 *
 * There are two `useTheme` in this codebase:
 *
 * - `hooks/useTheme` — a plain function over `designTokens`. No provider, no
 *   context. Returns `{ colors, spacing, typography, ... }`.
 * - `theme/ThemeContext` — a real React context that throws
 *   `useTheme must be used within a ThemeProvider` when unmounted, and returns
 *   `{ tokens, isHighContrastMode, toggleHighContrast }`.
 *
 * This screen imported the second one and then read `theme.colors.*` — the
 * shape of the *first*. So even with a provider mounted the screen would have
 * died one line later on `undefined.background`. The wrong import is the bug;
 * the missing provider was only what made it fail loudly. `ThemeProvider` is
 * now mounted in `app/_layout.tsx` too, so the context is genuinely available
 * to anything that wants it (see the comment there).
 */
import { useTheme } from '../hooks/useTheme';
/**
 * Issue #65 — `Container` was a **default** import, and
 * `components/Foundation/Container.tsx` has no default export. The identifier
 * resolved to `undefined` and React threw
 * `Element type is invalid ... got: undefined` (minified #130) on render.
 *
 * This was a *second*, independent break on this same route, invisible until
 * now because `useTheme` threw on line 34 — before render was ever reached. It
 * is the reason AC3 asks for the screen to be *usable* and not merely
 * crash-free: fixing only the theme import would have swapped one blank page
 * for another. `tsc` had been reporting it (TS2613) the whole time.
 */
import { Container } from '../components/Foundation/Container';
import NavigationHeader from '../components/navigation/NavigationHeader';
import { QuietHoursConfig } from '../components/notifications/QuietHoursConfig';
import { ReminderConfig } from '../components/notifications/ReminderConfig';
import { NotificationTestPanel } from '../components/notifications/NotificationTestPanel';

export default function NotificationSettingsScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>(PermissionStatus.UNDETERMINED);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // Mock referee ID (TODO: Get from auth context)
  const refereeId = '1';

  useEffect(() => {
    loadSettings();
  }, []);

  /**
   * Load current notification settings
   */
  const loadSettings = async () => {
    try {
      setLoading(true);

      // Check permission status
      const status = await NotificationService.getInstance().getPermissionStatus();
      setPermissionStatus(status);

      // Load preferences
      const prefs = await NotificationPreferencesService.getInstance().getPreferences(refereeId);
      setPreferences(prefs);
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      Alert.alert('Error', 'Unable to load notification settings.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Request notification permissions
   */
  const handleRequestPermissions = async () => {
    try {
      const status = await NotificationService.getInstance().requestPermissions();
      setPermissionStatus(status);

      if (status === PermissionStatus.GRANTED) {
        // Register for push notifications
        await NotificationService.getInstance().registerForPushNotifications(refereeId);
        Alert.alert('Success', 'Notifications have been enabled!');
      }
    } catch (error) {
      console.error('Failed to request permissions:', error);
      Alert.alert('Error', 'Unable to request notification permissions.');
    }
  };

  /**
   * Toggle master notification switch
   */
  const handleToggleEnabled = async (value: boolean) => {
    try {
      const updated = await NotificationPreferencesService.getInstance().updatePreferences(refereeId, {
        enabled: value
      });
      setPreferences(updated);
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
      Alert.alert('Error', 'Unable to update preferences.');
    }
  };

  /**
   * Toggle notification type
   */
  const handleToggleNotificationType = async (
    key: keyof Pick<NotificationPreferences, 'newAssignments' | 'matchResults' | 'matchDesignations' | 'statusChanges' | 'tournamentUpdates'>,
    value: boolean
  ) => {
    try {
      const updated = await NotificationPreferencesService.getInstance().updatePreferences(refereeId, {
        [key]: value
      });
      setPreferences(updated);
    } catch (error) {
      console.error('Failed to toggle notification type:', error);
      Alert.alert('Error', 'Unable to update preferences.');
    }
  };


  if (loading) {
    return (
      <Container>
        <NavigationHeader
          title="Notification settings"
          showBackButton
          onBackPress={() => router.back()}
        />
        <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading settings...
          </Text>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      {/* `theme.dark` never existed on either theme object — it read as
          `undefined`, so this was always the 'dark' branch. Written out. */}
      <StatusBar style="dark" />
      <NavigationHeader
        title="Notification settings"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Permission Status Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Permissions
          </Text>

          <View style={styles.permissionStatus}>
            <View style={styles.permissionInfo}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Notification status
              </Text>
              <Text style={[styles.permissionStatusText, {
                color: permissionStatus === PermissionStatus.GRANTED
                  ? theme.colors.success
                  : theme.colors.warning
              }]}>
                {permissionStatus === PermissionStatus.GRANTED && '✅ Enabled'}
                {permissionStatus === PermissionStatus.DENIED && '❌ Disabled'}
                {permissionStatus === PermissionStatus.UNDETERMINED && '⚠️ Not requested'}
              </Text>
            </View>

            {permissionStatus !== PermissionStatus.GRANTED && (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.colors.primary }]}
                onPress={handleRequestPermissions}
              >
                <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
                  Request permissions
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {permissionStatus === PermissionStatus.DENIED && (
            <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
              To enable notifications, open your device settings and allow notifications for BeachRef.
            </Text>
          )}
        </View>

        {/* Master Toggle */}
        {preferences && (
          <>
            <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                    Enable notifications
                  </Text>
                  <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                    Receive push notifications for important updates
                  </Text>
                </View>
                <Switch
                  value={preferences.enabled}
                  onValueChange={handleToggleEnabled}
                  disabled={permissionStatus !== PermissionStatus.GRANTED}
                  trackColor={{
                    false: theme.colors.surfaceDisabled,
                    true: theme.colors.primary
                  }}
                  thumbColor={preferences.enabled ? theme.colors.onPrimary : theme.colors.textDisabled}
                />
              </View>
            </View>

            {/* Notification Types */}
            {preferences.enabled && permissionStatus === PermissionStatus.GRANTED && (
              <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Notification types
                </Text>

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                      New assignments
                    </Text>
                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                      Notify me when I am assigned to a new tournament
                    </Text>
                  </View>
                  <Switch
                    value={preferences.newAssignments}
                    onValueChange={(value) => handleToggleNotificationType('newAssignments', value)}
                    trackColor={{
                      false: theme.colors.surfaceDisabled,
                      true: theme.colors.primary
                    }}
                    thumbColor={preferences.newAssignments ? theme.colors.onPrimary : theme.colors.textDisabled}
                  />
                </View>

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                      Match results
                    </Text>
                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                      Notify me when an assigned match ends
                    </Text>
                  </View>
                  <Switch
                    value={preferences.matchResults}
                    onValueChange={(value) => handleToggleNotificationType('matchResults', value)}
                    trackColor={{
                      false: theme.colors.surfaceDisabled,
                      true: theme.colors.primary
                    }}
                    thumbColor={preferences.matchResults ? theme.colors.onPrimary : theme.colors.textDisabled}
                  />
                </View>

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                      Match designations
                    </Text>
                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                      Notify me when I am designated for a match
                    </Text>
                  </View>
                  <Switch
                    value={preferences.matchDesignations}
                    onValueChange={(value) => handleToggleNotificationType('matchDesignations', value)}
                    trackColor={{
                      false: theme.colors.surfaceDisabled,
                      true: theme.colors.primary
                    }}
                    thumbColor={preferences.matchDesignations ? theme.colors.onPrimary : theme.colors.textDisabled}
                  />
                </View>

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                      Status changes
                    </Text>
                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                      Notify me about assignment status changes
                    </Text>
                  </View>
                  <Switch
                    value={preferences.statusChanges}
                    onValueChange={(value) => handleToggleNotificationType('statusChanges', value)}
                    trackColor={{
                      false: theme.colors.surfaceDisabled,
                      true: theme.colors.primary
                    }}
                    thumbColor={preferences.statusChanges ? theme.colors.onPrimary : theme.colors.textDisabled}
                  />
                </View>

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                      Tournament updates
                    </Text>
                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                      Notify me about general tournament updates
                    </Text>
                  </View>
                  <Switch
                    value={preferences.tournamentUpdates}
                    onValueChange={(value) => handleToggleNotificationType('tournamentUpdates', value)}
                    trackColor={{
                      false: theme.colors.surfaceDisabled,
                      true: theme.colors.primary
                    }}
                    thumbColor={preferences.tournamentUpdates ? theme.colors.onPrimary : theme.colors.textDisabled}
                  />
                </View>
              </View>
            )}

            {/* Reminders Section */}
            {preferences.enabled && permissionStatus === PermissionStatus.GRANTED && (
              <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Reminders
                </Text>

                <ReminderConfig
                  reminders={preferences.reminders}
                  onUpdate={async (reminders) => {
                    await NotificationPreferencesService.getInstance().updatePreferences(refereeId, {
                      reminders
                    });
                    const updated = await NotificationPreferencesService.getInstance().getPreferences(refereeId);
                    setPreferences(updated);
                  }}
                />
              </View>
            )}

            {/* Quiet Hours Section */}
            {preferences.enabled && permissionStatus === PermissionStatus.GRANTED && (
              <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  Quiet hours
                </Text>

                <QuietHoursConfig
                  quietHours={preferences.quietHours}
                  onUpdate={async (quietHours) => {
                    await NotificationPreferencesService.getInstance().updatePreferences(refereeId, {
                      quietHours
                    });
                    const updated = await NotificationPreferencesService.getInstance().getPreferences(refereeId);
                    setPreferences(updated);
                  }}
                />
              </View>
            )}

            {/* Test Section */}
            {__DEV__ && permissionStatus === PermissionStatus.GRANTED && (
              <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                <NotificationTestPanel refereeId={refereeId} />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  permissionStatus: {
    gap: 12,
  },
  permissionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  permissionStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  button: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
