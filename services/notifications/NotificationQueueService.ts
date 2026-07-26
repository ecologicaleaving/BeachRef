/**
 * NotificationQueueService
 *
 * Handles failed notifications with retry logic and exponential backoff.
 * Ensures notifications are eventually delivered when network is restored.
 *
 * Features:
 * - Failed notification queue
 * - Exponential backoff retry
 * - Network awareness (suspend/resume)
 * - Priority queue support
 * - Max retry limit
 */

import { MMKV } from 'react-native-mmkv';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { NotificationService } from './NotificationService';
import type { NotificationPayload } from '../../types/notifications';

/**
 * Queue item priority
 */
export type QueuePriority = 'low' | 'normal' | 'high' | 'emergency';

/**
 * Queued notification item
 */
interface QueuedNotification {
  id: string;
  payload: NotificationPayload;
  priority: QueuePriority;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: number;
  createdAt: number;
  error?: string;
}

/**
 * Retry delays in milliseconds (exponential backoff)
 */
const RETRY_DELAYS = [
  1000,    // 1 second
  2000,    // 2 seconds
  4000,    // 4 seconds
  8000,    // 8 seconds
  16000,   // 16 seconds
  32000,   // 32 seconds
  60000,   // 1 minute
  120000,  // 2 minutes
  300000,  // 5 minutes
];

/**
 * Storage key
 */
const QUEUE_STORAGE_KEY = 'notification_queue';

/**
 * NotificationQueueService - Singleton
 */
export class NotificationQueueService {
  private static instance: NotificationQueueService;
  private storage: MMKV;
  private debug: boolean = __DEV__;
  private processingInterval: TimerHandle | null = null;
  private isProcessing: boolean = false;

  private constructor() {
    this.storage = new MMKV({
      id: 'notification_queue',
      ...(Platform.OS !== 'web' && process.env.EXPO_PUBLIC_MMKV_KEY
        ? { encryptionKey: process.env.EXPO_PUBLIC_MMKV_KEY }
        : {})
    });

    this.log('NotificationQueueService initialized');

    // Start processing queue
    this.startProcessing();

    // Listen to network changes
    this.setupNetworkListener();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): NotificationQueueService {
    if (!NotificationQueueService.instance) {
      NotificationQueueService.instance = new NotificationQueueService();
    }
    return NotificationQueueService.instance;
  }

  /**
   * Add notification to queue
   *
   * @param payload - Notification payload
   * @param priority - Queue priority
   * @param maxRetries - Maximum retry attempts (default: 5)
   */
  public async enqueue(
    payload: NotificationPayload,
    priority: QueuePriority = 'normal',
    maxRetries: number = 5
  ): Promise<void> {
    try {
      const queue = this.getQueue();

      const item: QueuedNotification = {
        id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
        payload,
        priority,
        retryCount: 0,
        maxRetries,
        nextRetryAt: Date.now(),
        createdAt: Date.now()
      };

      queue.push(item);

      // Sort by priority and next retry time
      this.sortQueue(queue);

      this.saveQueue(queue);

      this.log('Notification enqueued:', item.id, 'Priority:', priority);

      // Trigger immediate processing
      this.processQueue();
    } catch (error) {
      console.error('[NotificationQueueService] Failed to enqueue notification:', error);
    }
  }

  /**
   * Process notification queue
   * Attempts to send failed notifications with retry logic
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    try {
      this.isProcessing = true;

      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        this.log('No network connection, skipping queue processing');
        return;
      }

      const queue = this.getQueue();
      const now = Date.now();

      // Process items that are ready for retry
      const ready = queue.filter(item => item.nextRetryAt <= now);

      if (ready.length === 0) {
        return;
      }

      this.log('Processing', ready.length, 'queued notifications');

      const remaining: QueuedNotification[] = [];
      const processed: string[] = [];

      for (const item of queue) {
        // Skip items not ready for retry yet
        if (item.nextRetryAt > now) {
          remaining.push(item);
          continue;
        }

        // Attempt to send
        try {
          const notificationId = await NotificationService.getInstance().sendNotification(
            item.payload,
            false // Don't fallback to Alert
          );

          if (notificationId) {
            // Success - remove from queue
            this.log('Notification sent successfully:', item.id);
            processed.push(item.id);
          } else {
            // Failed - retry or discard
            this.handleRetry(item, remaining, 'Notification send returned null');
          }
        } catch (error) {
          // Failed - retry or discard
          this.handleRetry(item, remaining, error instanceof Error ? error.message : 'Unknown error');
        }
      }

      // Save updated queue
      this.saveQueue(remaining);

      this.log('Queue processing complete. Remaining:', remaining.length);
    } catch (error) {
      console.error('[NotificationQueueService] Failed to process queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Handle retry logic for failed notification
   */
  private handleRetry(
    item: QueuedNotification,
    remaining: QueuedNotification[],
    error: string
  ): void {
    if (item.retryCount >= item.maxRetries) {
      // Max retries reached - discard
      this.log('Max retries reached for notification:', item.id);
      return;
    }

    // Calculate next retry delay with exponential backoff
    const delayIndex = Math.min(item.retryCount, RETRY_DELAYS.length - 1);
    const delay = RETRY_DELAYS[delayIndex];

    // Update item
    item.retryCount++;
    item.nextRetryAt = Date.now() + delay;
    item.error = error;

    remaining.push(item);

    this.log(
      'Notification retry scheduled:',
      item.id,
      'Attempt:',
      item.retryCount,
      'Delay:',
      delay,
      'ms'
    );
  }

  /**
   * Get notification queue from storage
   */
  private getQueue(): QueuedNotification[] {
    try {
      const stored = this.storage.getString(QUEUE_STORAGE_KEY);
      if (!stored) {
        return [];
      }
      return JSON.parse(stored) as QueuedNotification[];
    } catch (error) {
      console.error('[NotificationQueueService] Failed to get queue:', error);
      return [];
    }
  }

  /**
   * Save notification queue to storage
   */
  private saveQueue(queue: QueuedNotification[]): void {
    try {
      this.storage.set(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('[NotificationQueueService] Failed to save queue:', error);
    }
  }

  /**
   * Sort queue by priority and next retry time
   */
  private sortQueue(queue: QueuedNotification[]): void {
    const priorityOrder: Record<QueuePriority, number> = {
      emergency: 0,
      high: 1,
      normal: 2,
      low: 3
    };

    queue.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // Then by next retry time
      return a.nextRetryAt - b.nextRetryAt;
    });
  }

  /**
   * Start background queue processing
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      return;
    }

    // Process queue every 10 seconds
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 10000);

    this.log('Queue processing started');
  }

  /**
   * Stop background queue processing
   */
  public stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      this.log('Queue processing stopped');
    }
  }

  /**
   * Setup network state listener
   */
  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        this.log('Network connected, processing queue');
        this.processQueue();
      } else {
        this.log('Network disconnected, queue suspended');
      }
    });
  }

  /**
   * Get queue statistics
   */
  public getStatistics(): {
    totalItems: number;
    byPriority: Record<QueuePriority, number>;
    oldestItem: number | null;
  } {
    const queue = this.getQueue();

    const byPriority: Record<QueuePriority, number> = {
      emergency: 0,
      high: 0,
      normal: 0,
      low: 0
    };

    queue.forEach(item => {
      byPriority[item.priority]++;
    });

    const oldestItem = queue.length > 0
      ? Math.min(...queue.map(item => item.createdAt))
      : null;

    return {
      totalItems: queue.length,
      byPriority,
      oldestItem
    };
  }

  /**
   * Clear entire queue (for testing)
   */
  public clearQueue(): void {
    this.saveQueue([]);
    this.log('Queue cleared');
  }

  /**
   * Debug logging
   */
  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[NotificationQueueService]', ...args);
    }
  }
}

// NOTE (issue #43): intentionally NO default export.
// A default export holding an already-built instance coexisting with a
// same-named class export is what caused `X.default.getInstance is not a
// function` at runtime. Consume this service as:
//   import { NotificationQueueService } from '.../NotificationQueueService';
//   NotificationQueueService.getInstance()
