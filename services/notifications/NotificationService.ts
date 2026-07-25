/**
 * NotificationService
 *
 * Core notification service handling push notification setup, permissions,
 * token registration, and notification delivery.
 *
 * Features:
 * - Permission management (iOS/Android)
 * - Push token registration
 * - Notification scheduling and delivery
 * - Deep linking support
 * - Badge management
 * - Fallback to Alert.alert when permissions denied
 */

import type * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { WebPushService } from './WebPushService';
import type {
  NotificationPayload,
  NotificationType,
  PushToken
} from '../../types/notifications';

const isWeb = Platform.OS === 'web';

// `expo-notifications` and `expo-device` are only ever reached from the native
// branches below — on web every public method routes through `WebPushService`.
// They are therefore loaded with a dynamic `import()`, which Metro turns into a
// separate async chunk, instead of being pulled into the entry chunk that every
// web visitor downloads and parses (issue #38: the two packages plus what they
// drag in — `@ide/backoff` -> `assert`, `expo-device` -> `ua-parser-js` — were
// ~100 KB / 55 modules of it).
//
// Note that a `require()` inside a function would NOT achieve this: Metro
// resolves it statically and the module stays in the chunk (issue #45). Only
// `import()` produces an async chunk. Each loader memoises its promise, so the
// module is fetched and evaluated at most once.
type NotificationsModule = typeof import('expo-notifications');
type DeviceModule = typeof import('expo-device');

let notificationsModulePromise: Promise<NotificationsModule> | null = null;
let deviceModulePromise: Promise<DeviceModule> | null = null;

const loadNotifications = (): Promise<NotificationsModule> => {
  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications');
  }
  return notificationsModulePromise;
};

const loadDevice = (): Promise<DeviceModule> => {
  if (!deviceModulePromise) {
    deviceModulePromise = import('expo-device');
  }
  return deviceModulePromise;
};

/**
 * Permission status enum
 */
export enum PermissionStatus {
  UNDETERMINED = 'undetermined',
  GRANTED = 'granted',
  DENIED = 'denied'
}

/**
 * Notification service configuration
 */
interface NotificationServiceConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Fallback to Alert.alert when permissions denied */
  enableFallback?: boolean;
}

/**
 * NotificationService - Singleton
 *
 * Manages push notifications across the app lifecycle.
 */
export class NotificationService {
  private static instance: NotificationService;
  private initialized = false;
  private pushToken: string | null = null;
  private config: NotificationServiceConfig;

  private constructor(config: NotificationServiceConfig = {}) {
    this.config = {
      debug: __DEV__,
      enableFallback: true,
      ...config
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: NotificationServiceConfig): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService(config);
    }
    return NotificationService.instance;
  }

  /**
   * Initialize notification service
   * Call this early in app lifecycle (_layout.tsx)
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      this.log('Service already initialized');
      return;
    }

    try {
      // Setup notification handler for foreground notifications.
      // On web this is a no-op in expo-notifications and WebPushService owns the
      // presentation, so the module is not loaded there at all.
      if (!isWeb) {
        const Notifications = await loadNotifications();
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });
      }

      this.initialized = true;
      this.log('Notification service initialized');
    } catch (error) {
      console.error('[NotificationService] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check current permission status
   */
  public async getPermissionStatus(): Promise<PermissionStatus> {
    try {
      // WEB: Use WebPushService
      if (isWeb) {
        const webPushService = WebPushService.getInstance();
        const permission = await webPushService.getPermissionStatus();

        if (permission === 'granted') {
          return PermissionStatus.GRANTED;
        } else if (permission === 'denied') {
          return PermissionStatus.DENIED;
        }

        return PermissionStatus.UNDETERMINED;
      }

      // MOBILE: Use expo-notifications
      const { status } = await (await loadNotifications()).getPermissionsAsync();

      if (status === 'granted') {
        return PermissionStatus.GRANTED;
      } else if (status === 'denied') {
        return PermissionStatus.DENIED;
      }

      return PermissionStatus.UNDETERMINED;
    } catch (error) {
      console.error('[NotificationService] Failed to get permission status:', error);
      return PermissionStatus.UNDETERMINED;
    }
  }

  /**
   * Request notification permissions
   * Handles iOS/Android/Web differences
   */
  public async requestPermissions(): Promise<PermissionStatus> {
    try {
      // WEB: Use WebPushService
      if (isWeb) {
        const webPushService = WebPushService.getInstance();

        if (!webPushService.isWebPushSupported()) {
          this.log('Web push not supported in this browser');
          Alert.alert(
            'Browser Non Supportato',
            'Il tuo browser non supporta le notifiche push. Prova Chrome, Firefox o Edge.'
          );
          return PermissionStatus.DENIED;
        }

        const permission = await webPushService.requestPermission();

        if (permission === 'granted') {
          this.log('Web notification permissions granted');
          return PermissionStatus.GRANTED;
        } else if (permission === 'denied') {
          this.log('Web notification permissions denied');
          return PermissionStatus.DENIED;
        }

        return PermissionStatus.UNDETERMINED;
      }

      // MOBILE: Check if running on physical device
      const Notifications = await loadNotifications();
      const Device = await loadDevice();
      if (!Device.isDevice) {
        this.log('Must use physical device for push notifications');
        Alert.alert(
          'Physical Device Required',
          'Push notifications require a physical device. They will not work on simulators/emulators.'
        );
        return PermissionStatus.DENIED;
      }

      // Check existing permissions
      const currentStatus = await this.getPermissionStatus();
      if (currentStatus === PermissionStatus.GRANTED) {
        return PermissionStatus.GRANTED;
      }

      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();

      if (status !== 'granted') {
        this.log('Notification permissions denied');

        // Show guidance to enable in settings
        Alert.alert(
          'Notifiche Disabilitate',
          'Per ricevere notifiche push, abilita le notifiche nelle impostazioni del dispositivo.',
          [
            { text: 'Annulla', style: 'cancel' },
            {
              text: 'Apri Impostazioni',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Notifications.openSettingsAsync();
                } else {
                  // Android requires linking to settings
                  Alert.alert(
                    'Impostazioni',
                    'Vai in Impostazioni > App > BeachRef > Notifiche per abilitare.'
                  );
                }
              }
            }
          ]
        );

        return PermissionStatus.DENIED;
      }

      this.log('Notification permissions granted');
      return PermissionStatus.GRANTED;
    } catch (error) {
      console.error('[NotificationService] Failed to request permissions:', error);
      return PermissionStatus.DENIED;
    }
  }

  /**
   * Register device for push notifications and get token
   * @param refereeId - Referee ID to associate token with
   */
  public async registerForPushNotifications(refereeId: string): Promise<PushToken | null> {
    try {
      // Check permissions
      const permissionStatus = await this.getPermissionStatus();
      if (permissionStatus !== PermissionStatus.GRANTED) {
        this.log('Cannot register - permissions not granted');
        return null;
      }

      // WEB: Use WebPushService
      if (isWeb) {
        const webPushService = WebPushService.getInstance();
        const subscription = await webPushService.subscribeToPush();

        if (!subscription) {
          this.log('Failed to subscribe to web push');
          return null;
        }

        this.pushToken = subscription.endpoint;
        this.log('Web push subscription obtained:', this.pushToken);

        // Get device info
        const deviceId = await this.getDeviceId();

        // Create push token record
        const pushToken: PushToken = {
          id: `${refereeId}_${deviceId}`,
          refereeId,
          token: this.pushToken,
          platform: 'web',
          deviceId,
          createdAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString()
        };

        return pushToken;
      }

      // MOBILE: Get Expo push token
      const tokenData = await (await loadNotifications()).getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID || undefined
      });

      this.pushToken = tokenData.data;
      this.log('Push token obtained:', this.pushToken);

      // Get device info
      const deviceId = await this.getDeviceId();
      const platform = Platform.OS as 'ios' | 'android' | 'web';

      // Create push token record
      const pushToken: PushToken = {
        id: `${refereeId}_${deviceId}`,
        refereeId,
        token: this.pushToken,
        platform,
        deviceId,
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString()
      };

      return pushToken;
    } catch (error) {
      console.error('[NotificationService] Failed to register for push notifications:', error);
      return null;
    }
  }

  /**
   * Send local notification
   * @param payload - Notification payload
   * @param fallbackToAlert - Use Alert.alert if push notifications unavailable
   */
  public async sendNotification(
    payload: NotificationPayload,
    fallbackToAlert: boolean = true
  ): Promise<string | null> {
    try {
      // WEB: Use WebPushService
      if (isWeb) {
        const webPushService = WebPushService.getInstance();

        if (!webPushService.isWebPushSupported()) {
          this.log('Web push not supported, using fallback');

          if (fallbackToAlert && this.config.enableFallback) {
            Alert.alert(payload.title, payload.body);
          }

          return null;
        }

        const permission = await webPushService.getPermissionStatus();

        if (permission !== 'granted') {
          this.log('Web permissions not granted, considering fallback');

          if (fallbackToAlert && this.config.enableFallback) {
            Alert.alert(payload.title, payload.body);
          }

          return null;
        }

        // Show web notification
        await webPushService.showNotification(payload);
        this.log('Web notification sent:', payload.title);
        return `web-${Date.now()}`;
      }

      // MOBILE: Check permissions
      const permissionStatus = await this.getPermissionStatus();

      if (permissionStatus !== PermissionStatus.GRANTED) {
        this.log('Permissions not granted, considering fallback');

        // Fallback to Alert.alert if enabled
        if (fallbackToAlert && this.config.enableFallback) {
          Alert.alert(payload.title, payload.body);
          return null;
        }

        return null;
      }

      // Schedule notification
      const Notifications = await loadNotifications();
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: payload.title,
          body: payload.body,
          data: payload.data,
          sound: payload.sound || 'default',
          badge: payload.badge,
          priority: payload.priority === 'high'
            ? Notifications.AndroidNotificationPriority.HIGH
            : Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null, // Send immediately
      });

      this.log('Notification sent:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('[NotificationService] Failed to send notification:', error);

      // Fallback on error
      if (fallbackToAlert && this.config.enableFallback) {
        Alert.alert(payload.title, payload.body);
      }

      return null;
    }
  }

  /**
   * Handle notification response (user tap)
   * @param response - Notification response from expo-notifications
   */
  public handleNotificationResponse(response: Notifications.NotificationResponse): void {
    try {
      const { notification } = response;
      const data = notification.request.content.data;

      this.log('Notification tapped:', data);

      // Handle deep linking
      if (data.deepLink) {
        this.handleDeepLink(data.deepLink as string);
        return;
      }

      // Fallback navigation based on type
      const type = data.type as NotificationType;
      switch (type) {
        case 'new_assignment':
        case 'tournament_update':
          if (data.tournamentCode) {
            router.push({
              pathname: '/tournament-detail',
              params: { code: data.tournamentCode }
            });
          }
          break;

        case 'match_result':
        case 'match_designation':
        case 'match_reminder':
          if (data.matchId) {
            router.push({
              pathname: '/match-detail',
              params: { matchId: data.matchId }
            });
          }
          break;

        case 'status_change':
          router.push('/referee-dashboard');
          break;

        case 'emergency':
          router.push('/referee-dashboard');
          break;

        default:
          this.log('Unknown notification type:', type);
      }
    } catch (error) {
      console.error('[NotificationService] Failed to handle notification response:', error);
    }
  }

  /**
   * Handle deep link navigation
   * @param deepLink - Deep link URL (e.g., beachref://notification?type=TYPE&id=ID)
   */
  private handleDeepLink(deepLink: string): void {
    try {
      const url = new URL(deepLink);
      const path = url.pathname;
      const params = Object.fromEntries(url.searchParams.entries());

      this.log('Handling deep link:', path, params);

      // Navigate to appropriate screen
      router.push({
        pathname: path as any,
        params
      });
    } catch (error) {
      console.error('[NotificationService] Failed to parse deep link:', error);
    }
  }

  /**
   * Update app badge count
   * @param count - Badge count (0 to clear)
   */
  public async setBadgeCount(count: number): Promise<void> {
    try {
      if (isWeb) return;
      await (await loadNotifications()).setBadgeCountAsync(count);
      this.log('Badge count updated:', count);
    } catch (error) {
      console.error('[NotificationService] Failed to set badge count:', error);
    }
  }

  /**
   * Get current badge count
   */
  public async getBadgeCount(): Promise<number> {
    try {
      if (isWeb) return 0;
      return await (await loadNotifications()).getBadgeCountAsync();
    } catch (error) {
      console.error('[NotificationService] Failed to get badge count:', error);
      return 0;
    }
  }

  /**
   * Clear all delivered notifications
   */
  public async clearAllNotifications(): Promise<void> {
    try {
      // WEB: Use WebPushService
      if (isWeb) {
        const webPushService = WebPushService.getInstance();
        await webPushService.clearAllNotifications();
        this.log('All web notifications cleared');
        return;
      }

      // MOBILE: Use expo-notifications
      await (await loadNotifications()).dismissAllNotificationsAsync();
      await this.setBadgeCount(0);
      this.log('All notifications cleared');
    } catch (error) {
      console.error('[NotificationService] Failed to clear notifications:', error);
    }
  }

  /**
   * Get unique device identifier
   */
  private async getDeviceId(): Promise<string> {
    try {
      // Use device name + OS version as unique ID
      const Device = isWeb ? null : await loadDevice();
      const deviceName = Device?.deviceName || 'unknown';
      const osVersion = Device?.osVersion || '0';
      return `${deviceName}_${osVersion}_${Date.now()}`;
    } catch (error) {
      console.error('[NotificationService] Failed to get device ID:', error);
      return `unknown_${Date.now()}`;
    }
  }

  /**
   * Debug logging
   */
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[NotificationService]', ...args);
    }
  }

  /**
   * Whether initialize() has completed successfully.
   * Positive proof that the notification subsystem is live (issue #43, AC2).
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset service (for testing)
   */
  public reset(): void {
    this.initialized = false;
    this.pushToken = null;
    this.log('Service reset');
  }
}

// NOTE (issue #43): intentionally NO default export.
// A default export holding an already-built instance coexisting with a
// same-named class export is what caused `w.default.getInstance is not a
// function` at every app start. Consume this service as:
//   import { NotificationService } from '.../NotificationService';
//   NotificationService.getInstance()
