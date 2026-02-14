/**
 * NotificationTestPanel Component
 *
 * Development-only panel for testing notification functionality.
 * Allows sending test notifications of different types and viewing queue stats.
 *
 * __DEV__ only - Not included in production builds.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import NotificationService from '../../services/notifications/NotificationService';
import NotificationTriggerService from '../../services/notifications/NotificationTriggerService';
import NotificationQueueService from '../../services/notifications/NotificationQueueService';
import type { NotificationType } from '../../types/notifications';

interface NotificationTestPanelProps {
  refereeId: string;
}

export function NotificationTestPanel({ refereeId }: NotificationTestPanelProps) {
  const theme = useTheme();
  const [queueStats, setQueueStats] = useState<any>(null);

  useEffect(() => {
    loadQueueStats();

    // Refresh stats every 5 seconds
    const interval = setInterval(loadQueueStats, 5000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Load queue statistics
   */
  const loadQueueStats = () => {
    try {
      const stats = NotificationQueueService.getInstance().getStatistics();
      setQueueStats(stats);
    } catch (error) {
      console.error('Failed to load queue stats:', error);
    }
  };

  /**
   * Send test notification
   */
  const sendTestNotification = async (type: NotificationType, title: string, body: string) => {
    try {
      await NotificationService.getInstance().sendNotification(
        {
          type,
          title,
          body,
          data: {},
          priority: 'default'
        },
        true
      );

      Alert.alert('Inviato', `Notifica di test inviata: ${title}`);
    } catch (error) {
      console.error('Failed to send test notification:', error);
      Alert.alert('Errore', 'Impossibile inviare la notifica di test.');
    }
  };

  /**
   * Test new assignment notification
   */
  const testNewAssignment = async () => {
    try {
      await NotificationTriggerService.getInstance().triggerNewAssignment({
        refereeId,
        assignment: {
          tournamentCode: 'TEST123',
          tournamentName: 'Test Tournament',
          matchNo: '42'
        }
      });

      Alert.alert('Inviato', 'Test Nuova Assegnazione inviato');
    } catch (error) {
      console.error('Failed to test new assignment:', error);
      Alert.alert('Errore', 'Test fallito');
    }
  };

  /**
   * Test match result notification
   */
  const testMatchResult = async () => {
    try {
      await NotificationTriggerService.getInstance().triggerMatchResult({
        refereeId,
        matchId: 'test-match-id',
        tournamentNo: 'TEST123',
        status: 'Finished',
        teams: 'Team A vs Team B'
      });

      Alert.alert('Inviato', 'Test Risultato Match inviato');
    } catch (error) {
      console.error('Failed to test match result:', error);
      Alert.alert('Errore', 'Test fallito');
    }
  };

  /**
   * Test status change notification
   */
  const testStatusChange = async () => {
    try {
      await NotificationTriggerService.getInstance().triggerStatusChange({
        refereeId,
        assignmentId: 'test-assignment-id',
        newStatus: 'Running',
        urgency: 'high',
        courtNumber: '5',
        teams: 'Team C vs Team D'
      });

      Alert.alert('Inviato', 'Test Cambio Status inviato');
    } catch (error) {
      console.error('Failed to test status change:', error);
      Alert.alert('Errore', 'Test fallito');
    }
  };

  /**
   * Test match reminder notification
   */
  const testMatchReminder = async () => {
    try {
      await NotificationTriggerService.getInstance().triggerMatchReminder({
        refereeId,
        assignmentId: 'test-assignment-id',
        matchNo: '42',
        teams: 'Team E vs Team F',
        minutesBefore: 30
      });

      Alert.alert('Inviato', 'Test Reminder inviato');
    } catch (error) {
      console.error('Failed to test match reminder:', error);
      Alert.alert('Errore', 'Test fallito');
    }
  };

  /**
   * Test emergency notification
   */
  const testEmergency = async () => {
    try {
      await NotificationTriggerService.getInstance().triggerEmergency({
        refereeId,
        title: 'EMERGENZA TEST',
        message: 'Questa è una notifica di emergenza di test',
        assignmentId: 'test-assignment-id'
      });

      Alert.alert('Inviato', 'Test Emergenza inviato');
    } catch (error) {
      console.error('Failed to test emergency:', error);
      Alert.alert('Errore', 'Test fallito');
    }
  };

  /**
   * Clear rate limits
   */
  const clearRateLimits = () => {
    try {
      NotificationTriggerService.getInstance().clearRateLimits();
      Alert.alert('Fatto', 'Rate limits azzerati');
    } catch (error) {
      console.error('Failed to clear rate limits:', error);
      Alert.alert('Errore', 'Operazione fallita');
    }
  };

  /**
   * Clear notification queue
   */
  const clearQueue = () => {
    try {
      NotificationQueueService.getInstance().clearQueue();
      loadQueueStats();
      Alert.alert('Fatto', 'Coda notifiche svuotata');
    } catch (error) {
      console.error('Failed to clear queue:', error);
      Alert.alert('Errore', 'Operazione fallita');
    }
  };

  if (!__DEV__) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        🛠️ Notification Test Panel
      </Text>

      {/* Queue Statistics */}
      {queueStats && (
        <View style={[styles.statsCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.statsTitle, { color: theme.colors.text }]}>
            Queue Statistics
          </Text>

          <View style={styles.statsRow}>
            <Text style={[styles.statsLabel, { color: theme.colors.textSecondary }]}>
              Total Items:
            </Text>
            <Text style={[styles.statsValue, { color: theme.colors.text }]}>
              {queueStats.totalItems}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <Text style={[styles.statsLabel, { color: theme.colors.textSecondary }]}>
              Emergency:
            </Text>
            <Text style={[styles.statsValue, { color: theme.colors.error }]}>
              {queueStats.byPriority.emergency}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <Text style={[styles.statsLabel, { color: theme.colors.textSecondary }]}>
              High:
            </Text>
            <Text style={[styles.statsValue, { color: theme.colors.warning }]}>
              {queueStats.byPriority.high}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <Text style={[styles.statsLabel, { color: theme.colors.textSecondary }]}>
              Normal:
            </Text>
            <Text style={[styles.statsValue, { color: theme.colors.text }]}>
              {queueStats.byPriority.normal}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <Text style={[styles.statsLabel, { color: theme.colors.textSecondary }]}>
              Low:
            </Text>
            <Text style={[styles.statsValue, { color: theme.colors.textSecondary }]}>
              {queueStats.byPriority.low}
            </Text>
          </View>
        </View>
      )}

      {/* Test Buttons */}
      <View style={styles.buttonGrid}>
        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: theme.colors.primary }]}
          onPress={testNewAssignment}
        >
          <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
            Test New Assignment
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: theme.colors.primary }]}
          onPress={testMatchResult}
        >
          <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
            Test Match Result
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: theme.colors.primary }]}
          onPress={testStatusChange}
        >
          <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
            Test Status Change
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: theme.colors.primary }]}
          onPress={testMatchReminder}
        >
          <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
            Test Reminder
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: theme.colors.error }]}
          onPress={testEmergency}
        >
          <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
            Test Emergency
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: theme.colors.warning }]}
          onPress={() => sendTestNotification('status_change' as any, 'Test Generico', 'Notifica di test generica')}
        >
          <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
            Test Generic
          </Text>
        </TouchableOpacity>
      </View>

      {/* Utility Buttons */}
      <View style={styles.utilityButtons}>
        <TouchableOpacity
          style={[styles.utilityButton, { backgroundColor: theme.colors.warning }]}
          onPress={clearRateLimits}
        >
          <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
            Clear Rate Limits
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.utilityButton, { backgroundColor: theme.colors.error }]}
          onPress={clearQueue}
        >
          <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
            Clear Queue
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statsLabel: {
    fontSize: 14,
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonGrid: {
    gap: 12,
    marginBottom: 20,
  },
  testButton: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  utilityButtons: {
    gap: 12,
    marginBottom: 20,
  },
  utilityButton: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
