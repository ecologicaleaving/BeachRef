/**
 * WebPushService
 *
 * Web Push notification service for browser-based notifications.
 * Uses Web Push API + Service Worker for background notifications.
 *
 * Features:
 * - Browser Notification API
 * - Service Worker registration
 * - VAPID authentication
 * - Fallback to in-app notifications
 */

import type { NotificationPayload } from '../../types/notifications';

/**
 * Browser notification permission status
 */
type WebNotificationPermission = 'default' | 'granted' | 'denied';

/**
 * WebPushService - Singleton for web notifications
 */
export class WebPushService {
  private static instance: WebPushService;
  private debug: boolean = __DEV__;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean = false;

  private constructor() {
    // Check browser support
    this.isSupported = this.checkSupport();
    this.log('WebPushService initialized. Supported:', this.isSupported);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): WebPushService {
    if (!WebPushService.instance) {
      WebPushService.instance = new WebPushService();
    }
    return WebPushService.instance;
  }

  /**
   * Check if browser supports web push notifications
   */
  private checkSupport(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return (
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
  }

  /**
   * Check if web push is supported
   */
  public isWebPushSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Get current notification permission
   */
  public async getPermissionStatus(): Promise<WebNotificationPermission> {
    if (!this.isSupported) {
      return 'denied';
    }

    try {
      return Notification.permission;
    } catch (error) {
      console.error('[WebPushService] Failed to get permission:', error);
      return 'denied';
    }
  }

  /**
   * Request notification permission
   */
  public async requestPermission(): Promise<WebNotificationPermission> {
    if (!this.isSupported) {
      this.log('Web push not supported in this browser');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.log('Permission requested:', permission);

      if (permission === 'granted') {
        // Register service worker if permission granted
        await this.registerServiceWorker();
      }

      return permission;
    } catch (error) {
      console.error('[WebPushService] Failed to request permission:', error);
      return 'denied';
    }
  }

  /**
   * Register service worker for background notifications
   */
  private async registerServiceWorker(): Promise<void> {
    if (!this.isSupported || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      // Check if already registered
      if (this.serviceWorkerRegistration) {
        this.log('Service Worker already registered');
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register(
        '/service-worker.js',
        { scope: '/' }
      );

      this.serviceWorkerRegistration = registration;
      this.log('Service Worker registered:', registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      this.log('Service Worker ready');
    } catch (error) {
      console.error('[WebPushService] Service Worker registration failed:', error);
    }
  }

  /**
   * Subscribe to push notifications
   * Returns push subscription for server storage
   */
  public async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.isSupported || !this.serviceWorkerRegistration) {
      this.log('Cannot subscribe: not supported or SW not registered');
      return null;
    }

    try {
      // Get VAPID public key from environment
      const vapidPublicKey = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        console.error('[WebPushService] VAPID public key not configured');
        return null;
      }

      // Subscribe to push
      const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });

      this.log('Push subscription created:', subscription.endpoint);
      return subscription;
    } catch (error) {
      console.error('[WebPushService] Failed to subscribe to push:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  public async unsubscribeFromPush(): Promise<boolean> {
    if (!this.serviceWorkerRegistration) {
      return false;
    }

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        this.log('Push subscription removed');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[WebPushService] Failed to unsubscribe:', error);
      return false;
    }
  }

  /**
   * Show local notification (foreground)
   */
  public async showNotification(payload: NotificationPayload): Promise<void> {
    if (!this.isSupported) {
      this.log('Cannot show notification: not supported');
      return;
    }

    const permission = await this.getPermissionStatus();

    if (permission !== 'granted') {
      this.log('Cannot show notification: permission not granted');
      return;
    }

    try {
      // If service worker is registered, use it
      if (this.serviceWorkerRegistration) {
        await this.serviceWorkerRegistration.showNotification(payload.title, {
          body: payload.body,
          icon: '/icon.png',
          badge: '/badge.png',
          tag: payload.type,
          data: payload.data,
          requireInteraction: payload.priority === 'high',
          vibrate: payload.vibrate ? [200, 100, 200] : undefined
        });
      } else {
        // Fallback to browser Notification API
        const notification = new Notification(payload.title, {
          body: payload.body,
          icon: '/icon.png',
          tag: payload.type,
          data: payload.data,
          requireInteraction: payload.priority === 'high'
        });

        // Handle click
        notification.onclick = () => {
          this.handleNotificationClick(payload.data);
        };
      }

      this.log('Notification shown:', payload.title);
    } catch (error) {
      console.error('[WebPushService] Failed to show notification:', error);
    }
  }

  /**
   * Handle notification click
   */
  private handleNotificationClick(data: any): void {
    try {
      // Focus or open app window
      if (window.parent !== window) {
        window.parent.focus();
      } else {
        window.focus();
      }

      // Handle deep link if present
      if (data.deepLink) {
        const url = new URL(data.deepLink);
        const path = url.pathname + url.search;

        // Use expo-router for navigation (if available)
        if (typeof window !== 'undefined' && (window as any).__expo_router__) {
          (window as any).__expo_router__.push(path);
        } else {
          // Fallback to window navigation
          window.location.href = path;
        }
      }

      this.log('Notification clicked:', data);
    } catch (error) {
      console.error('[WebPushService] Failed to handle notification click:', error);
    }
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  /**
   * Check if notification is active (displayed)
   */
  public async getActiveNotifications(): Promise<Notification[]> {
    if (!this.serviceWorkerRegistration) {
      return [];
    }

    try {
      return await this.serviceWorkerRegistration.getNotifications();
    } catch (error) {
      console.error('[WebPushService] Failed to get active notifications:', error);
      return [];
    }
  }

  /**
   * Clear all notifications
   */
  public async clearAllNotifications(): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      return;
    }

    try {
      const notifications = await this.serviceWorkerRegistration.getNotifications();

      for (const notification of notifications) {
        notification.close();
      }

      this.log('All notifications cleared');
    } catch (error) {
      console.error('[WebPushService] Failed to clear notifications:', error);
    }
  }

  /**
   * Get browser notification support info
   */
  public getSupportInfo(): {
    supported: boolean;
    permission: WebNotificationPermission;
    serviceWorker: boolean;
    pushManager: boolean;
  } {
    return {
      supported: this.isSupported,
      permission: Notification?.permission || 'denied',
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window
    };
  }

  /**
   * Debug logging
   */
  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[WebPushService]', ...args);
    }
  }
}

// Export singleton instance
export default WebPushService.getInstance();
