import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/notification_providers.dart';

/// Notification settings screen with toggle controls
class NotificationSettingsScreen extends ConsumerWidget {
  const NotificationSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final prefs = ref.watch(notificationPreferencesProvider);
    final notifier = ref.read(notificationPreferencesProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: ListView(
        children: [
          // Master switch
          SwitchListTile(
            title: const Text('Enable Notifications'),
            subtitle: const Text('Receive push notifications'),
            value: prefs.enabled,
            activeTrackColor: AppColors.accent,
            onChanged: (value) => notifier.setEnabled(value),
          ),

          const Divider(),

          // Notification types header
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              'NOTIFICATION TYPES',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.textTertiary,
                letterSpacing: 0.5,
              ),
            ),
          ),

          SwitchListTile(
            title: const Text('New Assignments'),
            subtitle: const Text('When you receive a new match assignment'),
            value: prefs.newAssignments,
            activeTrackColor: AppColors.accent,
            onChanged: prefs.enabled ? (v) => notifier.setNewAssignments(v) : null,
          ),
          SwitchListTile(
            title: const Text('Match Results'),
            subtitle: const Text('When a match you officiated finishes'),
            value: prefs.matchResults,
            activeTrackColor: AppColors.accent,
            onChanged: prefs.enabled ? (v) => notifier.setMatchResults(v) : null,
          ),
          SwitchListTile(
            title: const Text('Status Changes'),
            subtitle: const Text('When a match status changes'),
            value: prefs.statusChanges,
            activeTrackColor: AppColors.accent,
            onChanged: prefs.enabled ? (v) => notifier.setStatusChanges(v) : null,
          ),
          SwitchListTile(
            title: const Text('Tournament Updates'),
            subtitle: const Text('Schedule changes and announcements'),
            value: prefs.tournamentUpdates,
            activeTrackColor: AppColors.accent,
            onChanged: prefs.enabled ? (v) => notifier.setTournamentUpdates(v) : null,
          ),

          const Divider(),

          // Reminders
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              'REMINDERS',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.textTertiary,
                letterSpacing: 0.5,
              ),
            ),
          ),

          SwitchListTile(
            title: const Text('Match Reminders'),
            subtitle: const Text('Remind me before my matches'),
            value: prefs.remindersEnabled,
            activeTrackColor: AppColors.accent,
            onChanged: prefs.enabled ? (v) => notifier.setRemindersEnabled(v) : null,
          ),

          if (prefs.remindersEnabled && prefs.enabled) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Wrap(
                spacing: 8,
                children: [60, 30, 15].map((minutes) {
                  final selected = prefs.reminderMinutes.contains(minutes);
                  return FilterChip(
                    label: Text('${minutes}min'),
                    selected: selected,
                    onSelected: (value) {
                      final newList = List<int>.from(prefs.reminderMinutes);
                      if (value) {
                        newList.add(minutes);
                      } else {
                        newList.remove(minutes);
                      }
                      notifier.setReminderMinutes(newList);
                    },
                  );
                }).toList(),
              ),
            ),
          ],

          const Divider(),

          // Quiet hours
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              'QUIET HOURS',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.textTertiary,
                letterSpacing: 0.5,
              ),
            ),
          ),

          SwitchListTile(
            title: const Text('Quiet Hours'),
            subtitle: Text(
              prefs.quietHoursEnabled
                  ? '${prefs.quietHoursStart ?? '22:00'} - ${prefs.quietHoursEnd ?? '07:00'}'
                  : 'No notifications during set hours',
            ),
            value: prefs.quietHoursEnabled,
            activeTrackColor: AppColors.accent,
            onChanged: prefs.enabled ? (v) => notifier.setQuietHoursEnabled(v) : null,
          ),

          if (prefs.quietHoursEnabled && prefs.enabled) ...[
            ListTile(
              title: const Text('Start Time'),
              trailing: Text(
                prefs.quietHoursStart ?? '22:00',
                style: const TextStyle(
                  color: AppColors.accent,
                  fontWeight: FontWeight.w600,
                ),
              ),
              onTap: () async {
                final time = await showTimePicker(
                  context: context,
                  initialTime: const TimeOfDay(hour: 22, minute: 0),
                );
                if (time != null) {
                  notifier.setQuietHoursStart(
                    '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}',
                  );
                }
              },
            ),
            ListTile(
              title: const Text('End Time'),
              trailing: Text(
                prefs.quietHoursEnd ?? '07:00',
                style: const TextStyle(
                  color: AppColors.accent,
                  fontWeight: FontWeight.w600,
                ),
              ),
              onTap: () async {
                final time = await showTimePicker(
                  context: context,
                  initialTime: const TimeOfDay(hour: 7, minute: 0),
                );
                if (time != null) {
                  notifier.setQuietHoursEnd(
                    '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}',
                  );
                }
              },
            ),
          ],

          const SizedBox(height: AppSpacing.xxl),
        ],
      ),
    );
  }
}
