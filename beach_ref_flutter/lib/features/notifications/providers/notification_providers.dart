import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/notification_models.dart';

/// Notification preferences provider
final notificationPreferencesProvider =
    StateNotifierProvider<NotificationPreferencesNotifier, NotificationPreferences>(
  (ref) => NotificationPreferencesNotifier(),
);

class NotificationPreferencesNotifier extends StateNotifier<NotificationPreferences> {
  NotificationPreferencesNotifier() : super(const NotificationPreferences());

  /// Load preferences from Supabase for a referee
  Future<void> load(int refereeId) async {
    try {
      final supabase = Supabase.instance.client;
      final response = await supabase
          .from('notification_preferences')
          .select()
          .eq('referee_id', refereeId)
          .maybeSingle();

      if (response != null) {
        state = NotificationPreferences.fromJson(response);
      }
    } catch (_) {
      // Keep defaults on error
    }
  }

  /// Save preferences to Supabase
  Future<void> save(int refereeId) async {
    try {
      final supabase = Supabase.instance.client;
      final data = {
        'referee_id': refereeId,
        ...state.toJson(),
      };

      await supabase.from('notification_preferences').upsert(
        data,
        onConflict: 'referee_id',
      );
    } catch (_) {
      // Silently fail - preferences cached locally
    }
  }

  void setEnabled(bool value) => state = state.copyWith(enabled: value);
  void setNewAssignments(bool value) => state = state.copyWith(newAssignments: value);
  void setMatchResults(bool value) => state = state.copyWith(matchResults: value);
  void setMatchDesignations(bool value) => state = state.copyWith(matchDesignations: value);
  void setStatusChanges(bool value) => state = state.copyWith(statusChanges: value);
  void setTournamentUpdates(bool value) => state = state.copyWith(tournamentUpdates: value);
  void setRemindersEnabled(bool value) => state = state.copyWith(remindersEnabled: value);
  void setReminderMinutes(List<int> value) => state = state.copyWith(reminderMinutes: value);
  void setQuietHoursEnabled(bool value) => state = state.copyWith(quietHoursEnabled: value);
  void setQuietHoursStart(String? value) => state = state.copyWith(quietHoursStart: value);
  void setQuietHoursEnd(String? value) => state = state.copyWith(quietHoursEnd: value);
}
