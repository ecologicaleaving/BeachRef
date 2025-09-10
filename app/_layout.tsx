import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { preloadBrandAssets } from "../assets/brand";
import { colors } from "../theme/tokens";
import { queryClient } from "../lib/queryClient";
import { asyncStoragePersister, migrateAsyncStorageData, handlePersistenceError } from "../lib/queryPersistence";
import { enablePerformanceMonitoring } from "../lib/queryPerformance";
import { QueryDevTools } from "../components/DevTools/QueryDevTools";

export default function RootLayout() {
  useEffect(() => {
    // Initialize cache warmup service and brand assets on app start
    const initializeApp = async () => {
      try {
        // Enable performance monitoring for TanStack Query
        enablePerformanceMonitoring(queryClient);
        
        // Migrate existing AsyncStorage data if needed
        await migrateAsyncStorageData();
        
        // Initialize brand assets
        await preloadBrandAssets();
        
        // Cache warmup replaced by database-first strategy with TanStack Query
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
        <Stack.Screen name="my-assignments" />
        <Stack.Screen name="assignment-detail" />
        <Stack.Screen name="match-results" />
        <Stack.Screen name="match-detail" />
        <Stack.Screen name="switch-tournament" />
      </Stack>
      <QueryDevTools />
    </PersistQueryClientProvider>
  );
}
