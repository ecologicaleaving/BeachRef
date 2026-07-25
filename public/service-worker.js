/**
 * Service Worker for Web Push Notifications
 *
 * Handles push notifications when app is in background or closed.
 * Integrates with BeachRef notification system.
 */

/* eslint-env serviceworker */
/* global self, clients */

const CACHE_PREFIX = 'beachref-';
const CACHE_NAME = 'beachref-notifications-v2';
const APP_VERSION = '2026.07.25.1'; // Bump on every deploy that changes this file

/**
 * Service Worker installation
 *
 * `skipWaiting()` makes the new worker take over without waiting for all tabs
 * to close. Combined with `clients.claim()` in `activate` this guarantees that
 * users still running the OLD worker (issue #36 — the one that intercepted
 * every navigation and wiped all caches) are migrated to this one on the very
 * next page load, instead of staying stuck on the old version indefinitely.
 */
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing version', APP_VERSION);

  // Skip waiting to activate immediately
  self.skipWaiting();
});

/**
 * Service Worker activation
 *
 * NOTE (issue #36): this used to `caches.delete()` EVERY cache of the origin on
 * every activation, throwing away caches this worker does not own. It now only
 * prunes its own stale caches (`beachref-*` other than the current one) and
 * claims existing clients so the fetch-intercepting old worker is replaced.
 */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating version', APP_VERSION);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map((name) => {
              console.log('[ServiceWorker] Removing stale cache:', name);
              return caches.delete(name);
            })
        )
      )
      // Take control of pages already controlled by the previous worker so the
      // old navigation-intercepting fetch handler stops being used right away.
      .then(() => self.clients.claim())
  );
});

/**
 * NOTE (issue #36): there is deliberately NO `fetch` handler.
 *
 * This service worker exists only for web push notifications. A `fetch`
 * handler that intercepted navigations added the service worker boot time to
 * the TTFB of every page load (measured: 2046 ms in the browser against 220 ms
 * with curl on the same document) while providing no caching benefit, since it
 * was a pure network passthrough. Without a `fetch` handler the browser skips
 * the worker entirely for navigations and asset requests.
 *
 * Do not re-add a `fetch` handler unless real offline caching is implemented,
 * and measure the navigation TTFB impact if you do.
 */

/**
 * Push event handler
 * Receives push notifications from server
 */
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');

  if (!event.data) {
    console.log('[ServiceWorker] No data in push event');
    return;
  }

  try {
    // Parse notification data
    const data = event.data.json();

    const title = data.title || 'BeachRef Notification';
    const options = {
      body: data.body || '',
      icon: data.icon || '/icon.png',
      badge: data.badge || '/badge.png',
      tag: data.tag || data.type || 'beachref-notification',
      data: data.data || {},
      requireInteraction: data.priority === 'high',
      vibrate: data.vibrate ? [200, 100, 200] : undefined,
      actions: [
        {
          action: 'open',
          title: 'Apri',
          icon: '/open-icon.png'
        },
        {
          action: 'dismiss',
          title: 'Ignora',
          icon: '/dismiss-icon.png'
        }
      ]
    };

    // Show notification
    event.waitUntil(
      self.registration.showNotification(title, options)
    );

    console.log('[ServiceWorker] Notification shown:', title);
  } catch (error) {
    console.error('[ServiceWorker] Failed to parse push data:', error);

    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('BeachRef', {
        body: 'Hai una nuova notifica',
        icon: '/icon.png',
        badge: '/badge.png'
      })
    );
  }
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked:', event.notification.tag);

  event.notification.close();

  // Handle action buttons
  if (event.action === 'dismiss') {
    return;
  }

  // Get notification data
  const data = event.notification.data || {};
  const deepLink = data.deepLink;

  // Open or focus app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Navigate to deep link if present
            if (deepLink) {
              const url = new URL(deepLink);
              const path = url.pathname + url.search;

              // Send message to client to navigate
              client.postMessage({
                type: 'NOTIFICATION_CLICK',
                path: path,
                data: data
              });
            }

            return client.focus();
          }
        }

        // If no window is open, open a new one
        const urlToOpen = deepLink
          ? new URL(deepLink).pathname + new URL(deepLink).search
          : '/';

        return clients.openWindow(self.location.origin + urlToOpen);
      })
  );
});

/**
 * Notification close handler (optional)
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[ServiceWorker] Notification closed:', event.notification.tag);

  // Optional: Send analytics event
  // You can track which notifications are dismissed
});

/**
 * Message handler
 * Receives messages from app
 */
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_NOTIFICATIONS') {
    // Clear all notifications
    self.registration.getNotifications().then((notifications) => {
      notifications.forEach((notification) => notification.close());
    });
  }
});

/**
 * Background sync (optional - for offline queue)
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    console.log('[ServiceWorker] Background sync triggered');

    // Could sync failed notifications here
    event.waitUntil(
      Promise.resolve()
    );
  }
});

console.log('[ServiceWorker] Service Worker loaded');
