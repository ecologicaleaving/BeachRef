/**
 * Regression tests for issue #43.
 *
 * Bug: `services/notifications/*Service.ts` exported BOTH a named class and a
 * default that was an already-built instance (`export default X.getInstance()`).
 * Consumers imported the default and called the *static* `getInstance()` on it,
 * which blew up at every app start with:
 *   TypeError: w.default.getInstance is not a function
 * The error was swallowed by the init try/catch and degraded to a warning, so
 * the whole notification subsystem was dead in production without any signal.
 *
 * These tests fail if the default-instance export (or a default import of it)
 * is ever reintroduced.
 */

import * as fs from 'fs';
import * as path from 'path';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'token' })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notif-id')),
  dismissAllNotificationsAsync: jest.fn(() => Promise.resolve()),
  setBadgeCountAsync: jest.fn(() => Promise.resolve()),
  getBadgeCountAsync: jest.fn(() => Promise.resolve(0)),
  openSettingsAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidNotificationPriority: { HIGH: 'high', DEFAULT: 'default' },
}));

jest.mock('expo-device', () => ({
  isDevice: true,
  deviceName: 'jest',
  osVersion: '1.0',
}));

// babel-preset-expo rewrites `process.env.EXPO_PUBLIC_*` into an import from
// the ESM-only `expo/virtual/env`, which the project's jest transform cannot
// handle (issue #48). Stubbed here rather than fixing the global config.
jest.mock('expo/virtual/env', () => ({ env: process.env }));

// The project's jest config cannot transform the Expo/React Native ESM entry
// points (see issue #48), so react-native is stubbed down to what this service
// actually uses.
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));
const routerPush = require('expo-router').router.push as jest.Mock;

const ROOT = path.resolve(__dirname, '../../..');

const SERVICE_FILES = [
  'services/notifications/NotificationService.ts',
  'services/notifications/WebPushService.ts',
  'services/notifications/NotificationTriggerService.ts',
  'services/notifications/NotificationQueueService.ts',
  'services/notifications/NotificationPreferencesService.ts',
];

// Every file that consumes one of the notification singletons.
const CONSUMER_FILES = [
  'app/_layout.tsx',
  'app/notification-settings.tsx',
  'components/notifications/NotificationTestPanel.tsx',
  'hooks/useNotificationPermissions.ts',
  'hooks/useNotificationPreferences.ts',
  'services/AssignmentStatusService.ts',
  'services/RealtimeSubscriptionService.ts',
  'services/RefereeAssignmentsService.ts',
  'services/notifications/NotificationService.ts',
  'services/notifications/NotificationTriggerService.ts',
  'services/notifications/NotificationQueueService.ts',
];

const SERVICE_NAMES = [
  'NotificationService',
  'WebPushService',
  'NotificationTriggerService',
  'NotificationQueueService',
  'NotificationPreferencesService',
];

const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('issue #43 - notification singleton export contract', () => {
  it.each(SERVICE_FILES)(
    '%s does not export a pre-built instance as default',
    (rel) => {
      const source = read(rel);
      // `export default X.getInstance()` is the exact shape that caused the bug.
      expect(source).not.toMatch(/export default\s+\w+\.getInstance\(\)/);
      // ...and no default export at all, so `import X from` can never silently
      // resolve to an instance while looking like the class.
      expect(source).not.toMatch(/^export default /m);
    }
  );

  it.each(CONSUMER_FILES)(
    '%s imports notification services as named class exports',
    (rel) => {
      const source = read(rel);
      for (const name of SERVICE_NAMES) {
        // A default import of a notification service is forbidden: it is what
        // made `NotificationService.getInstance()` resolve to an instance.
        const defaultImport = new RegExp(
          `^import\\s+${name}\\s*(,|from)`,
          'm'
        );
        expect(source).not.toMatch(defaultImport);
      }
    }
  );
});

describe('issue #43 - NotificationService initialization', () => {
  // Loaded lazily so the jest.mock factories above are in place.
  const load = () =>
    require('../../../services/notifications/NotificationService');

  it('exposes no default export (nothing to accidentally call statically)', () => {
    const mod = load();
    expect(mod.default).toBeUndefined();
  });

  it('exposes the class as a named export with a static getInstance()', () => {
    const { NotificationService } = load();
    expect(typeof NotificationService).toBe('function');
    expect(typeof NotificationService.getInstance).toBe('function');
  });

  it('getInstance() returns an instance, not something with getInstance()', () => {
    const { NotificationService } = load();
    const instance = NotificationService.getInstance();
    expect(instance).toBeInstanceOf(NotificationService);
    // The bug in a nutshell: the default export was THIS object, and callers
    // did `default.getInstance()` on it.
    expect((instance as any).getInstance).toBeUndefined();
  });

  it('returns the same singleton on repeated calls', () => {
    const { NotificationService } = load();
    expect(NotificationService.getInstance()).toBe(
      NotificationService.getInstance()
    );
  });

  it('initialize() completes and reports isInitialized() === true', async () => {
    const Notifications = require('expo-notifications');
    const { NotificationService } = load();
    const service = NotificationService.getInstance();
    service.reset();

    expect(service.isInitialized()).toBe(false);
    await service.initialize();
    expect(service.isInitialized()).toBe(true);
    expect(Notifications.setNotificationHandler).toHaveBeenCalled();
  });

  it('reproduces the app/_layout.tsx consumption path end to end', async () => {
    const Notifications = require('expo-notifications');
    const { NotificationService } = load();

    // 1. init, exactly as app/_layout.tsx does it
    const notificationService = NotificationService.getInstance();
    notificationService.reset();
    await notificationService.initialize();
    expect(notificationService.isInitialized()).toBe(true);

    // 2. register the response listener, exactly as app/_layout.tsx does it
    routerPush.mockClear();
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response: any) => {
        NotificationService.getInstance().handleNotificationResponse(response);
      }
    );
    expect(subscription).toBeDefined();

    // 3. the registered handler must actually route a tapped notification
    const handler =
      Notifications.addNotificationResponseReceivedListener.mock.calls.at(-1)[0];
    handler({
      notification: {
        request: {
          content: {
            data: { type: 'status_change' },
          },
        },
      },
    });
    expect(routerPush).toHaveBeenCalledWith('/referee-dashboard');
  });
});
