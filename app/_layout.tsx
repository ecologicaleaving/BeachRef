// Must run before anything else touches NetInfo (issue #36): repoints the web
// reachability probe away from the site's HTML document.
import "../lib/netinfoConfig";
// VIS API Optimization: Monitoring Setup (Phase 1)
// Platform detection
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { Platform } from 'react-native';
import { preloadBrandAssets } from "../assets/brand";
import { QueryDevTools } from "../components/DevTools/QueryDevTools";
import { useAnalytics } from "../hooks/useAnalytics";
import { AssignmentStatusProvider } from "../hooks/useAssignmentStatus";
import { queryClient } from "../lib/queryClient";
import { enablePerformanceMonitoring } from "../lib/queryPerformance";
import { asyncStoragePersister, handlePersistenceError, migrateAsyncStorageData } from "../lib/queryPersistence";
import { TournamentCacheWarmingService } from "../services/cache/TournamentCacheWarmingService";
import { CacheMigrationService } from "../services/cache/CacheMigrationService";
import { NotificationService } from "../services/notifications/NotificationService";
import { injectCSSVariables } from "../theme/css-variables";
import { colors } from "../theme/tokens";

// Import cache debug utilities in development
if (__DEV__) {
  require("../utils/cacheDebug");
}

const isWeb = typeof window !== 'undefined' && typeof window.document !== 'undefined';

// Initialize Sentry for production monitoring (T006) - only on native platforms
if (!__DEV__ && !isWeb && process.env.EXPO_PUBLIC_SENTRY_DSN) {
  try {
    const Sentry = require('@sentry/react-native');
    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1.0,
      integrations: [
        new Sentry.ReactNativeTracing({
          tracingOrigins: ['localhost', /^\//],
        }),
      ],
    });
  } catch (e) {
    console.warn('[App] Sentry not available:', e);
  }
}

// Initialize Network Logger for development (T005) - only on native platforms
if (__DEV__ && !isWeb) {
  try {
    const { startNetworkLogging } = require('react-native-network-logger');
    startNetworkLogging({
      maxRequests: 500,
      // Only capture VIS API calls (filter out other requests)
      ignoredPatterns: [/^(?!.*vis-adapter)/, /analytics/, /fonts/, /assets/],
    });
  } catch (e) {
    console.warn('[App] Network logger not available:', e);
  }
}

export default function RootLayout() {
  const pathname = usePathname();

  // Track page views with Google Analytics
  useAnalytics(pathname);

  useEffect(() => {
    // Swallow benign web-only promise rejections to keep dev UX smooth
    if (Platform.OS === 'web') {
      const handler = (ev: PromiseRejectionEvent) => {
        try {
          const reason: any = ev.reason;
          const msg = (reason && (reason.message || reason.toString?.())) || '';
          if (
            typeof msg === 'string' && (
              msg.includes('6000ms timeout exceeded') || // Expo web font timeout
              msg.includes('/api/analytics/events')      // Local analytics endpoint in dev
            )
          ) {
            ev.preventDefault();
          }
        } catch { }
      };
      window.addEventListener('unhandledrejection', handler);
      return () => window.removeEventListener('unhandledrejection', handler);
    }
  }, []);

  useEffect(() => {
    // Inject CSS variables for web platform
    if (Platform.OS === 'web') {
      injectCSSVariables();

      // Register service worker for cache-busting and push notifications
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' })
          .then((reg) => {
            console.log('[SW] Registered, checking for updates...');
            // Force update check on every page load
            reg.update();
          })
          .catch((err) => console.warn('[SW] Registration failed:', err));
      }
    }

    // Initialize cache warmup service and brand assets on app start
    const initializeApp = async () => {
      console.log('App initialization starting...');
      try {
        // Enable performance monitoring for TanStack Query
        enablePerformanceMonitoring(queryClient);
        console.log('Performance monitoring enabled');

        // Migrate existing AsyncStorage data if needed
        await migrateAsyncStorageData();
        console.log('AsyncStorage migration completed');

        // Migrate cache to fix João Pessoa/Nayarit bug (old cache without year keys)
        await CacheMigrationService.checkAndMigrate();
        console.log('Cache migration completed');

        // Initialize brand assets
        await preloadBrandAssets();
        console.log('Brand assets preloaded');

        // Initialize tournament cache warming service
        TournamentCacheWarmingService.startBackgroundWarming();
        console.log('Cache warming started');

        // Initialize notification service
        const notificationService = NotificationService.getInstance();
        await notificationService.initialize();
        // Positive proof the subsystem is actually live (issue #43, AC2):
        // before the fix this line was never reached — getInstance() threw.
        console.log(
          '[App] Notification service initialized:',
          notificationService.isInitialized()
        );

        // Performance monitoring and data persistence handled by queryClient

      } catch (error) {
        // Handle initialization errors gracefully at runtime, but make them
        // loud in development: a silent console.warn here is what hid issue #43
        // (broken notification init) for months.
        if (__DEV__) {
          console.error('App initialization FAILED:', error);
        } else {
          console.warn('App initialization warning:', error);
        }
      }
      console.log('App initialization completed');
    };

    initializeApp();

    // Notification handler + response listener.
    //
    // `expo-notifications` is loaded with a dynamic `import()` (issue #38) so it
    // does not sit on the boot path of the web bundle: `NotificationService`
    // already routes web through `WebPushService`, and the handler and listener
    // below only matter on native. The import resolves after first paint, and
    // `initialize()` inside `initializeApp()` above is what actually arms the
    // subsystem (issue #43) — that is unchanged.
    let subscription: { remove: () => void } | undefined;
    let cancelled = false;

    const registerNotificationHandlers = async () => {
      try {
        const Notifications = await import('expo-notifications');
        if (cancelled) return;

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });

        subscription = Notifications.addNotificationResponseReceivedListener(response => {
          NotificationService.getInstance().handleNotificationResponse(response);
        });
        console.log('[App] Notification response listener registered');
      } catch (error) {
        console.warn('[App] Notification handlers not registered:', error);
      }
    };

    registerNotificationHandlers();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        hydrateOptions: {},
        dehydrateOptions: {
          shouldDehydrateQuery: (query: any) => {
            // Only persist successful queries
            return query.state.status === 'success';
          },
        },
      }}
      onError={handlePersistenceError}
    >
      <AssignmentStatusProvider>
        <StatusBar
          style="light"
          backgroundColor={colors.primary}
        />
        <Stack screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background }
        }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="tournament-selection" />
          <Stack.Screen name="tournament-detail" />
          <Stack.Screen name="referee-dashboard" />
          <Stack.Screen name="referee-profile" />
          <Stack.Screen name="my-assignments" />
          <Stack.Screen name="assignment-detail" />
          <Stack.Screen name="match-results" />
          <Stack.Screen name="match-detail" />
          <Stack.Screen name="switch-tournament" />
        </Stack>
        <QueryDevTools />
      </AssignmentStatusProvider>
    </PersistQueryClientProvider>
  );
}
