/// Notification preferences stored on Supabase
class NotificationPreferences {
  final bool enabled;
  final bool newAssignments;
  final bool matchResults;
  final bool matchDesignations;
  final bool statusChanges;
  final bool tournamentUpdates;
  final bool remindersEnabled;
  final List<int> reminderMinutes;
  final bool soundEnabled;
  final bool vibrationEnabled;
  final bool badgeEnabled;
  final bool quietHoursEnabled;
  final String? quietHoursStart; // "22:00"
  final String? quietHoursEnd; // "07:00"

  const NotificationPreferences({
    this.enabled = true,
    this.newAssignments = true,
    this.matchResults = true,
    this.matchDesignations = true,
    this.statusChanges = true,
    this.tournamentUpdates = false,
    this.remindersEnabled = true,
    this.reminderMinutes = const [60, 30, 15],
    this.soundEnabled = true,
    this.vibrationEnabled = true,
    this.badgeEnabled = true,
    this.quietHoursEnabled = false,
    this.quietHoursStart,
    this.quietHoursEnd,
  });

  NotificationPreferences copyWith({
    bool? enabled,
    bool? newAssignments,
    bool? matchResults,
    bool? matchDesignations,
    bool? statusChanges,
    bool? tournamentUpdates,
    bool? remindersEnabled,
    List<int>? reminderMinutes,
    bool? soundEnabled,
    bool? vibrationEnabled,
    bool? badgeEnabled,
    bool? quietHoursEnabled,
    String? quietHoursStart,
    String? quietHoursEnd,
  }) {
    return NotificationPreferences(
      enabled: enabled ?? this.enabled,
      newAssignments: newAssignments ?? this.newAssignments,
      matchResults: matchResults ?? this.matchResults,
      matchDesignations: matchDesignations ?? this.matchDesignations,
      statusChanges: statusChanges ?? this.statusChanges,
      tournamentUpdates: tournamentUpdates ?? this.tournamentUpdates,
      remindersEnabled: remindersEnabled ?? this.remindersEnabled,
      reminderMinutes: reminderMinutes ?? this.reminderMinutes,
      soundEnabled: soundEnabled ?? this.soundEnabled,
      vibrationEnabled: vibrationEnabled ?? this.vibrationEnabled,
      badgeEnabled: badgeEnabled ?? this.badgeEnabled,
      quietHoursEnabled: quietHoursEnabled ?? this.quietHoursEnabled,
      quietHoursStart: quietHoursStart ?? this.quietHoursStart,
      quietHoursEnd: quietHoursEnd ?? this.quietHoursEnd,
    );
  }

  Map<String, dynamic> toJson() => {
    'enabled': enabled,
    'new_assignments': newAssignments,
    'match_results': matchResults,
    'match_designations': matchDesignations,
    'status_changes': statusChanges,
    'tournament_updates': tournamentUpdates,
    'reminders_enabled': remindersEnabled,
    'reminder_minutes': reminderMinutes,
    'sound': soundEnabled,
    'vibration': vibrationEnabled,
    'badge': badgeEnabled,
    'quiet_hours_enabled': quietHoursEnabled,
    'quiet_hours_start': quietHoursStart,
    'quiet_hours_end': quietHoursEnd,
  };

  factory NotificationPreferences.fromJson(Map<String, dynamic> json) {
    return NotificationPreferences(
      enabled: json['enabled'] as bool? ?? true,
      newAssignments: json['new_assignments'] as bool? ?? true,
      matchResults: json['match_results'] as bool? ?? true,
      matchDesignations: json['match_designations'] as bool? ?? true,
      statusChanges: json['status_changes'] as bool? ?? true,
      tournamentUpdates: json['tournament_updates'] as bool? ?? false,
      remindersEnabled: json['reminders_enabled'] as bool? ?? true,
      reminderMinutes: (json['reminder_minutes'] as List?)
              ?.map((e) => e as int)
              .toList() ??
          const [60, 30, 15],
      soundEnabled: json['sound'] as bool? ?? true,
      vibrationEnabled: json['vibration'] as bool? ?? true,
      badgeEnabled: json['badge'] as bool? ?? true,
      quietHoursEnabled: json['quiet_hours_enabled'] as bool? ?? false,
      quietHoursStart: json['quiet_hours_start'] as String?,
      quietHoursEnd: json['quiet_hours_end'] as String?,
    );
  }
}
