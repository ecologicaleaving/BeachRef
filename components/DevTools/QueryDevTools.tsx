/**
 * @fileoverview TanStack Query DevTools for Development
 * Development-only component for debugging queries and cache
 */

import React from 'react';
import { Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

// Only import DevTools in development
let ReactQueryDevtools: any = null;
if (__DEV__ && Platform.OS === 'web') {
  try {
    // Try both import patterns for compatibility
    const devtoolsModule = require('@tanstack/react-query-devtools');
    ReactQueryDevtools = devtoolsModule.ReactQueryDevtools || devtoolsModule.default || devtoolsModule;
  } catch (error) {
    console.warn('ReactQueryDevtools not available:', error);
  }
}

/**
 * Query DevTools component that only renders in development and on web
 * Note: React Query DevTools are primarily designed for web environments
 * TEMPORARILY DISABLED due to QueryClient context issues during migration
 */
export function QueryDevTools() {
  // TEMPORARY FIX: Disable DevTools completely during migration
  // TODO: Re-enable once QueryClient initialization is stable
  // Note: Hooks must be called unconditionally, even if component returns null early

  // Call hooks unconditionally at the top (React Hooks rules)
  // This is required even though the component is currently disabled
  const queryClient = useQueryClient();

  // Early return - component is temporarily disabled
  if (true) {
    return null;
  }

  // Only render in development mode and on web platform
  if (!__DEV__ || Platform.OS !== 'web' || !ReactQueryDevtools) {
    return null;
  }

  // Check if we have a QueryClient available
  if (!queryClient) {
    console.warn('QueryDevTools: No QueryClient available');
    return null;
  }

  return <ReactQueryDevtools initialIsOpen={false} />;
}

/**
 * Alternative debugging utilities for React Native development
 * These can be used in development builds on mobile
 */
export const queryDebugUtils = {
  /**
   * Log current query cache state
   */
  logCacheState: (queryClient: any) => {
    if (__DEV__) {
      console.log('Query Cache State:', {
        queries: queryClient.getQueryCache().getAll().length,
        mutations: queryClient.getMutationCache().getAll().length,
      });
    }
  },

  /**
   * Log specific query state
   */
  logQueryState: (queryClient: any, queryKey: any) => {
    if (__DEV__) {
      const query = queryClient.getQueryCache().find(queryKey);
      console.log('Query State:', {
        data: query?.state.data,
        status: query?.state.status,
        fetchStatus: query?.state.fetchStatus,
        isStale: query?.isStale(),
        lastUpdated: query?.state.dataUpdatedAt,
      });
    }
  },

  /**
   * Force invalidate all queries (useful for debugging)
   */
  invalidateAll: (queryClient: any) => {
    if (__DEV__) {
      queryClient.invalidateQueries();
    }
  },

  /**
   * Clear all cached data (useful for debugging)
   */
  clearCache: (queryClient: any) => {
    if (__DEV__) {
      queryClient.clear();
    }
  },
};

/**
 * Development-only query debugging hook
 */
export function useQueryDebug(enabled: boolean = __DEV__) {
  if (!enabled) {
    return {
      logCacheState: () => {},
      logQueryState: () => {},
      invalidateAll: () => {},
      clearCache: () => {},
    };
  }

  return queryDebugUtils;
}