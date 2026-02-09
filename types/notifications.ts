/**
 * Notification System Types
 *
 * Type definitions for the push notification system.
 * Supports assignment notifications, match updates, and user preferences.
 */

/**
 * Notification types supported by the system
 */
export enum NotificationType {
  NEW_ASSIGNMENT = 'new_assignment',
  MATCH_RESULT = 'match_result',
  MATCH_DESIGNATION = 'match_designation',
  MATCH_REMINDER = 'match_reminder',
  STATUS_CHANGE = 'status_change',
  TOURNAMENT_UPDATE = 'tournament_update',
  EMERGENCY = 'emergency'
}

/**
 * Notification priority levels
 */
export type NotificationPriority = 'default' | 'high';

/**
 * Notification delivery status
 */
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'failed';

/**
 * User preferences for notification settings
 */
export interface NotificationPreferences {
  /** Unique identifier */
  id: string;

  /** Referee ID this preference belongs to */
  refereeId: string;

  /** Master switch - enable/disable all notifications */
  enabled: boolean;

  // Per-type notification settings
  /** Notify when assigned to new tournaments */
  newAssignments: boolean;

  /** Notify when matches are completed */
  matchResults: boolean;

  /** Notify when designated to specific matches */
  matchDesignations: boolean;

  /** Notify on assignment status changes */
  statusChanges: boolean;

  /** Notify on tournament-wide updates */
  tournamentUpdates: boolean;

  /** Pre-match reminder settings */
  reminders: {
    /** Enable pre-match reminders */
    enabled: boolean;
    /** Minutes before match to send reminders (e.g., [60, 30, 15]) */
    minutesBefore: number[];
  };

  /** Tournament subscription filters */
  subscribedTournaments: string[];

  // Delivery preferences
  /** Enable notification sound */
  sound: boolean;

  /** Enable vibration */
  vibration: boolean;

  /** Update app badge count */
  badge: boolean;

  /** Quiet hours configuration */
  quietHours?: {
    /** Enable quiet hours */
    enabled: boolean;
    /** Start time in HH:mm format */
    startTime: string;
    /** End time in HH:mm format */
    endTime: string;
    /** Timezone identifier (e.g., 'Europe/Rome') */
    timezone: string;
  };

  /** Timestamps */
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
}

/**
 * Notification payload structure
 */
export interface NotificationPayload {
  /** Notification type */
  type: NotificationType;

  /** Notification title */
  title: string;

  /** Notification body text */
  body: string;

  /** Additional data for deep linking and context */
  data: {
    /** Associated match ID */
    matchId?: string;
    /** Associated tournament code */
    tournamentCode?: string;
    /** Associated assignment ID */
    assignmentId?: string;
    /** Deep link URL */
    deepLink?: string;
    /** Any additional metadata */
    [key: string]: any;
  };

  /** Notification priority */
  priority: NotificationPriority;

  /** Sound file name (optional) */
  sound?: string;

  /** Enable vibration */
  vibrate?: boolean;

  /** Badge count update */
  badge?: number;
}

/**
 * Push token storage
 */
export interface PushToken {
  /** Unique token ID */
  id: string;

  /** Referee ID */
  refereeId: string;

  /** Push notification token */
  token: string;

  /** Platform (ios/android/web) */
  platform: 'ios' | 'android' | 'web';

  /** Device identifier */
  deviceId: string;

  /** Token creation timestamp */
  createdAt: string;

  /** Token expiration timestamp */
  expiresAt?: string;

  /** Last time token was used */
  lastUsedAt?: string;
}

/**
 * Notification log entry
 */
export interface NotificationLog {
  /** Unique log ID */
  id: string;

  /** Referee ID */
  refereeId: string;

  /** Notification type */
  type: NotificationType;

  /** Notification title */
  title: string;

  /** Notification body */
  body: string;

  /** Notification data */
  data?: Record<string, any>;

  /** Delivery status */
  status: NotificationStatus;

  /** Error message if failed */
  error?: string;

  /** Timestamps */
  sentAt: string;
  deliveredAt?: string;
  openedAt?: string;
}

/**
 * Default notification preferences
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'id' | 'refereeId' | 'createdAt' | 'updatedAt'> = {
  enabled: true,
  newAssignments: true,
  matchResults: true,
  matchDesignations: true,
  statusChanges: true,
  tournamentUpdates: false,
  reminders: {
    enabled: true,
    minutesBefore: [60, 30, 15]
  },
  subscribedTournaments: [],
  sound: true,
  vibration: true,
  badge: true,
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
    timezone: 'UTC'
  }
};

/**
 * Notification trigger context
 */
export interface NotificationTriggerContext {
  /** Referee ID to notify */
  refereeId: string;

  /** Notification type */
  type: NotificationType;

  /** Associated entity IDs */
  entityIds?: {
    matchId?: string;
    tournamentCode?: string;
    assignmentId?: string;
  };

  /** Urgency level (for status changes) */
  urgency?: 'low' | 'normal' | 'high' | 'critical';

  /** Additional context data */
  context?: Record<string, any>;
}
