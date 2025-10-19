// VIS API Optimization: Monitoring Setup (Phase 1)
// Platform detection
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

import { Stack, usePathname } from "expo-router";
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Platform } from 'react-native';
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { preloadBrandAssets } from "../assets/brand";
import { colors } from "../theme/tokens";
import { queryClient } from "../lib/queryClient";
import { asyncStoragePersister, migrateAsyncStorageData, handlePersistenceError } from "../lib/queryPersistence";
import { enablePerformanceMonitoring } from "../lib/queryPerformance";
import { QueryDevTools } from "../components/DevTools/QueryDevTools";
import { AssignmentStatusProvider } from "../hooks/useAssignmentStatus";
import { TournamentCacheWarmingService } from "../services/cache/TournamentCacheWarmingService";
import { useAnalytics } from "../hooks/useAnalytics";
import { injectCSSVariables } from "../theme/css-variables";

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
        } catch {}
      };
      window.addEventListener('unhandledrejection', handler);
      return () => window.removeEventListener('unhandledrejection', handler);
    }
  }, []);

  useEffect(() => {
    // Inject CSS variables for web platform
    if (Platform.OS === 'web') {
      injectCSSVariables();
    }

    // Initialize cache warmup service and brand assets on app start
    const initializeApp = async () => {
      try {
        // Enable performance monitoring for TanStack Query
        enablePerformanceMonitoring(queryClient);

        // Migrate existing AsyncStorage data if needed
        await migrateAsyncStorageData();

        // Initialize brand assets
        await preloadBrandAssets();

        // Initialize tournament cache warming service
        TournamentCacheWarmingService.startBackgroundWarming();

        // Performance monitoring and data persistence handled by queryClient

      } catch (error) {
        // Handle initialization errors gracefully
        console.warn('App initialization warning:', error);
      }
    };

    initializeApp();
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
