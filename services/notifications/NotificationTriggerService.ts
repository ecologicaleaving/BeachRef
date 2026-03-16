/**
 * NotificationTriggerService
 *
 * Central service for triggering notifications based on app events.
 * Handles filtering, rate limiting, batching, and quiet hours.
 *
 * Features:
 * - Event-driven notification triggers
 * - Preference-based filtering
 * - Rate limiting (max 10/hour)
 * - Notification batching
 * - Quiet hours respect
 * - Tournament subscription filtering
 */

import { MMKV } from 'react-native-mmkv';
import { Platform } from 'react-native';
import NotificationService from './NotificationService';
import NotificationPreferencesService from './NotificationPreferencesService';
import type {
  NotificationType,
  NotificationPayload,
  NotificationTriggerContext
} from '../../types/notifications';

/**
 * Rate limit window (1 hour)
 */
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Maximum notifications per window
 */
const MAX_NOTIFICATIONS_PER_HOUR = 10;

/**
 * Batching window (5 seconds)
 */
const BATCHING_WINDOW = 5 * 1000; // 5 seconds

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  refereeId: string;
  count: number;
  windowStart: number;
}

/**
 * Batch entry
 */
interface BatchEntry {
  type: NotificationType;
  refereeId: string;
  items: any[];
  timer: NodeJS.Timeout;
}

/**
 * NotificationTriggerService - Singleton
 */
export class NotificationTriggerService {
  private static instance: NotificationTriggerService;
  private storage: MMKV;
  private debug: boolean = __DEV__;
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private batches: Map<string, BatchEntry> = new Map();

  private constructor() {
    this.storage = new MMKV({
      id: 'notification_triggers',
      ...(Platform.OS !== 'web' && process.env.EXPO_PUBLIC_MMKV_KEY
        ? { encryptionKey: process.env.EXPO_PUBLIC_MMKV_KEY }
        : {})
    });

    this.log('NotificationTriggerService initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): NotificationTriggerService {
    if (!NotificationTriggerService.instance) {
      NotificationTriggerService.instance = new NotificationTriggerService();
    }
    return NotificationTriggerService.instance;
  }

  /**
   * Trigger notification for new assignment
   *
   * @param context - Trigger context
   */
  public async triggerNewAssignment(context: {
    refereeId: string;
    assignment: {
      tournamentCode: string;
      tournamentName: string;
      matchNo?: string;
    };
  }): Promise<void> {
    try {
      const { refereeId, assignment } = context;

      // Check if should send notification
      const shouldSend = await this.shouldSendNotification(refereeId, 'newAssignments', assignment.tournamentCode);

      if (!shouldSend) {
        this.log('Skipping new assignment notification (filtered)');
        return;
      }

      // Check rate limit
      if (!this.checkRateLimit(refereeId)) {
        this.log('Rate limit exceeded for referee:', refereeId);
        return;
      }

      // Batch similar notifications
      const batchKey = `new_assignment_${refereeId}`;
      const existing = this.batches.get(batchKey);

      if (existing) {
        // Add to existing batch
        existing.items.push(assignment);
        clearTimeout(existing.timer);

        // Reset timer
        existing.timer = setTimeout(() => {
          this.sendBatchedNewAssignments(refereeId, existing.items);
          this.batches.delete(batchKey);
        }, BATCHING_WINDOW);
      } else {
        // Create new batch
        const timer = setTimeout(() => {
          this.sendBatchedNewAssignments(refereeId, [assignment]);
          this.batches.delete(batchKey);
        }, BATCHING_WINDOW);

        this.batches.set(batchKey, {
          type: 'new_assignment' as NotificationType,
          refereeId,
          items: [assignment],
          timer
        });
      }
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to trigger new assignment notification:', error);
    }
  }

  /**
   * Send batched new assignment notifications
   */
  private async sendBatchedNewAssignments(refereeId: string, assignments: any[]): Promise<void> {
    try {
      const count = assignments.length;
      const title = count === 1
        ? 'Nuova Assegnazione'
        : `${count} Nuove Assegnazioni`;

      const body = count === 1
        ? `Sei stato assegnato al torneo ${assignments[0].tournamentName}`
        : `Hai ricevuto ${count} nuove assegnazioni ai tornei`;

      const payload: NotificationPayload = {
        type: 'new_assignment' as NotificationType,
        title,
        body,
        data: {
          tournamentCode: assignments[0].tournamentCode,
          deepLink: `beachref://tournament-detail?code=${assignments[0].tournamentCode}`
        },
        priority: 'default'
      };

      await NotificationService.getInstance().sendNotification(payload, true);
      this.incrementRateLimit(refereeId);

      this.log('Sent batched new assignment notification:', count, 'assignments');
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to send batched new assignments:', error);
    }
  }

  /**
   * Trigger notification for match result
   *
   * @param context - Trigger context
   */
  public async triggerMatchResult(context: {
    refereeId: string;
    matchId: string;
    tournamentNo: string;
    status: string;
    teams?: string;
  }): Promise<void> {
    try {
      const { refereeId, matchId, tournamentNo, status, teams } = context;

      // Check if should send notification
      const shouldSend = await this.shouldSendNotification(refereeId, 'matchResults');

      if (!shouldSend) {
        this.log('Skipping match result notification (filtered)');
        return;
      }

      // Check rate limit
      if (!this.checkRateLimit(refereeId)) {
        this.log('Rate limit exceeded for referee:', refereeId);
        return;
      }

      const title = 'Match Terminato';
      const body = teams
        ? `Il match ${teams} è terminato`
        : 'Un match assegnato è terminato';

      const payload: NotificationPayload = {
        type: 'match_result' as NotificationType,
        title,
        body,
        data: {
          matchId,
          tournamentCode: tournamentNo,
          deepLink: `beachref://match-detail?matchId=${matchId}`
        },
        priority: 'default'
      };

      await NotificationService.getInstance().sendNotification(payload, true);
      this.incrementRateLimit(refereeId);

      this.log('Sent match result notification');
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to trigger match result notification:', error);
    }
  }

  /**
   * Trigger notification for status change
   *
   * @param context - Trigger context
   */
  public async triggerStatusChange(context: {
    refereeId: string;
    assignmentId: string;
    newStatus: string;
    urgency?: 'low' | 'normal' | 'high' | 'critical';
    courtNumber?: string;
    teams?: string;
  }): Promise<void> {
    try {
      const { refereeId, assignmentId, newStatus, urgency, courtNumber, teams } = context;

      // Check if should send notification
      const shouldSend = await this.shouldSendNotification(refereeId, 'statusChanges');

      if (!shouldSend) {
        this.log('Skipping status change notification (filtered)');
        return;
      }

      // Check rate limit
      if (!this.checkRateLimit(refereeId)) {
        this.log('Rate limit exceeded for referee:', refereeId);
        return;
      }

      const title = urgency === 'critical' || urgency === 'high'
        ? `${urgency === 'critical' ? '🚨' : '⚠️'} Cambio Status`
        : 'Cambio Status Assegnazione';

      let body = `Status cambiato: ${newStatus}`;
      if (courtNumber) {
        body += ` - Campo ${courtNumber}`;
      }
      if (teams) {
        body += ` - ${teams}`;
      }

      const payload: NotificationPayload = {
        type: 'status_change' as NotificationType,
        title,
        body,
        data: {
          assignmentId,
          deepLink: 'beachref://referee-dashboard'
        },
        priority: urgency === 'critical' || urgency === 'high' ? 'high' : 'default'
      };

      await NotificationService.getInstance().sendNotification(payload, true);
      this.incrementRateLimit(refereeId);

      this.log('Sent status change notification');
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to trigger status change notification:', error);
    }
  }

  /**
   * Trigger notification for match designation
   *
   * @param context - Trigger context
   */
  public async triggerMatchDesignation(context: {
    refereeId: string;
    matchId: string;
    tournamentCode: string;
    matchNo: string;
    teams: string;
    scheduledTime?: string;
  }): Promise<void> {
    try {
      const { refereeId, matchId, tournamentCode, matchNo, teams, scheduledTime } = context;

      // Check if should send notification
      const shouldSend = await this.shouldSendNotification(refereeId, 'matchDesignations', tournamentCode);

      if (!shouldSend) {
        this.log('Skipping match designation notification (filtered)');
        return;
      }

      // Check rate limit
      if (!this.checkRateLimit(refereeId)) {
        this.log('Rate limit exceeded for referee:', refereeId);
        return;
      }

      const title = 'Nuova Designazione';
      let body = `Sei stato designato per il match ${matchNo}: ${teams}`;
      if (scheduledTime) {
        body += ` (${scheduledTime})`;
      }

      const payload: NotificationPayload = {
        type: 'match_designation' as NotificationType,
        title,
        body,
        data: {
          matchId,
          tournamentCode,
          deepLink: `beachref://match-detail?matchId=${matchId}`
        },
        priority: 'high'
      };

      await NotificationService.getInstance().sendNotification(payload, true);
      this.incrementRateLimit(refereeId);

      this.log('Sent match designation notification');
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to trigger match designation notification:', error);
    }
  }

  /**
   * Trigger notification for match reminder
   *
   * @param context - Trigger context
   */
  public async triggerMatchReminder(context: {
    refereeId: string;
    assignmentId: string;
    matchNo: string;
    teams: string;
    minutesBefore: number;
  }): Promise<void> {
    try {
      const { refereeId, assignmentId, matchNo, teams, minutesBefore } = context;

      // Check if reminders are enabled
      const prefs = await NotificationPreferencesService.getInstance().getPreferences(refereeId);

      if (!prefs.enabled || !prefs.reminders.enabled) {
        this.log('Skipping match reminder (reminders disabled)');
        return;
      }

      // Check if this reminder timing is configured
      if (!prefs.reminders.minutesBefore.includes(minutesBefore)) {
        this.log('Skipping match reminder (timing not configured)');
        return;
      }

      // Check quiet hours
      const isQuietHours = await NotificationPreferencesService.getInstance().isInQuietHours(refereeId);
      if (isQuietHours) {
        this.log('Skipping match reminder (quiet hours)');
        return;
      }

      // Check rate limit
      if (!this.checkRateLimit(refereeId)) {
        this.log('Rate limit exceeded for referee:', refereeId);
        return;
      }

      const title = '⏰ Reminder Match';
      const body = `Il match ${matchNo} (${teams}) inizia tra ${minutesBefore} minuti`;

      const payload: NotificationPayload = {
        type: 'match_reminder' as NotificationType,
        title,
        body,
        data: {
          assignmentId,
          deepLink: 'beachref://referee-dashboard'
        },
        priority: 'high'
      };

      await NotificationService.getInstance().sendNotification(payload, true);
      this.incrementRateLimit(refereeId);

      this.log('Sent match reminder notification');
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to trigger match reminder:', error);
    }
  }

  /**
   * Trigger emergency notification
   *
   * @param context - Trigger context
   */
  public async triggerEmergency(context: {
    refereeId: string;
    title: string;
    message: string;
    assignmentId?: string;
  }): Promise<void> {
    try {
      const { refereeId, title, message, assignmentId } = context;

      // Emergency notifications bypass most filters (only check enabled)
      const prefs = await NotificationPreferencesService.getInstance().getPreferences(refereeId);

      if (!prefs.enabled) {
        this.log('Skipping emergency notification (notifications disabled)');
        return;
      }

      // Emergency notifications ignore rate limits and quiet hours

      const payload: NotificationPayload = {
        type: 'emergency' as NotificationType,
        title: `🚨 ${title}`,
        body: message,
        data: {
          assignmentId,
          deepLink: 'beachref://referee-dashboard'
        },
        priority: 'high'
      };

      await NotificationService.getInstance().sendNotification(payload, true);
      this.incrementRateLimit(refereeId);

      this.log('Sent emergency notification');
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to trigger emergency notification:', error);
    }
  }

  /**
   * Check if notification should be sent based on preferences
   *
   * @param refereeId - Referee ID
   * @param notificationType - Type of notification
   * @param tournamentCode - Optional tournament code for subscription check
   * @returns True if should send
   */
  private async shouldSendNotification(
    refereeId: string,
    notificationType: keyof Pick<any, 'newAssignments' | 'matchResults' | 'matchDesignations' | 'statusChanges' | 'tournamentUpdates'>,
    tournamentCode?: string
  ): Promise<boolean> {
    try {
      // Get preferences
      const prefs = await NotificationPreferencesService.getInstance().getPreferences(refereeId);

      // Check master switch
      if (!prefs.enabled) {
        return false;
      }

      // Check specific notification type
      if (!prefs[notificationType]) {
        return false;
      }

      // Check tournament subscription if applicable
      if (tournamentCode && prefs.subscribedTournaments.length > 0) {
        if (!prefs.subscribedTournaments.includes(tournamentCode)) {
          this.log('Tournament not subscribed, skipping notification');
          return false;
        }
      }

      // Check quiet hours
      const isQuietHours = await NotificationPreferencesService.getInstance().isInQuietHours(refereeId);
      if (isQuietHours) {
        this.log('Quiet hours active, skipping notification');
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to check notification filters:', error);
      return false;
    }
  }

  /**
   * Check rate limit for referee
   *
   * @param refereeId - Referee ID
   * @returns True if under limit
   */
  private checkRateLimit(refereeId: string): boolean {
    try {
      const now = Date.now();
      const entry = this.rateLimits.get(refereeId);

      if (!entry) {
        return true;
      }

      // Check if window has expired
      if (now - entry.windowStart > RATE_LIMIT_WINDOW) {
        // Reset window
        this.rateLimits.set(refereeId, {
          refereeId,
          count: 0,
          windowStart: now
        });
        return true;
      }

      // Check if under limit
      return entry.count < MAX_NOTIFICATIONS_PER_HOUR;
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to check rate limit:', error);
      return true; // Allow on error
    }
  }

  /**
   * Increment rate limit counter
   *
   * @param refereeId - Referee ID
   */
  private incrementRateLimit(refereeId: string): void {
    try {
      const now = Date.now();
      const entry = this.rateLimits.get(refereeId);

      if (!entry) {
        this.rateLimits.set(refereeId, {
          refereeId,
          count: 1,
          windowStart: now
        });
      } else {
        // Check if window has expired
        if (now - entry.windowStart > RATE_LIMIT_WINDOW) {
          // Reset window
          this.rateLimits.set(refereeId, {
            refereeId,
            count: 1,
            windowStart: now
          });
        } else {
          // Increment counter
          entry.count++;
        }
      }
    } catch (error) {
      console.error('[NotificationTriggerService] Failed to increment rate limit:', error);
    }
  }

  /**
   * Clear all rate limits (for testing)
   */
  public clearRateLimits(): void {
    this.rateLimits.clear();
    this.log('Rate limits cleared');
  }

  /**
   * Debug logging
   */
  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[NotificationTriggerService]', ...args);
    }
  }
}

// Export singleton instance
export default NotificationTriggerService.getInstance();
