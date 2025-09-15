/**
 * Consolidated Hooks Index
 * Part of State Management Hooks Consolidation Refactoring
 * Central export point for all standardized hooks
 */

// ================================
// Core Consolidated Hooks
// ================================

// Data query hooks (consolidates 6+ data fetching hooks)
export {
  useDataQuery,
  useTournamentsQuery,
  useMatchesQuery,
  useRefereesQuery,
  useQueryPerformanceStats,
  useQueryDebugger
} from './useDataQuery';

export type {
  DataSource,
  ReadStrategy,
  CacheStrategy,
  DataQueryConfig,
  QueryMetadata,
  DataQueryResult
} from './useDataQuery';

// Network state hooks (consolidates 4+ network hooks)
export {
  useNetworkState,
  useOnlineStatus,
  useNetworkQuality,
  useOfflineCapabilities
} from './useNetworkState';

export type {
  ConnectionType,
  ConnectionQuality,
  NetworkCapabilities,
  NetworkDetails,
  NetworkHistory,
  NetworkState,
  NetworkStateOptions
} from './useNetworkState';

// ================================
// Existing Hooks (Maintained for compatibility)
// ================================

// Assignment and referee hooks
export { default as useAssignmentStatus } from './useAssignmentStatus';
export { default as useCurrentAssignment } from './useCurrentAssignment';

// Cache and storage hooks
export { default as useCacheAwareData } from './useCacheAwareData';
export { default as useRepositoryData } from './useRepositoryData';
export { default as useStorageManager } from './useStorageManager';
export { default as useDataFreshness } from './useDataFreshness';

// Performance and monitoring hooks
export { default as useConnectionHealth } from './useConnectionHealth';
export { default as usePerformanceMonitor } from './usePerformanceMonitor';
export { default as useRealtimePerformance } from './useRealtimePerformance';

// UI and interaction hooks
export { default as useContrastControls } from './useContrastControls';
export { default as useStatusBarVisibility } from './useStatusBarVisibility';
export { default as useKeyboardVisibility } from './useKeyboardVisibility';

// Tournament-specific hooks (legacy - use useDataQuery variants)
export { default as useTournaments } from './useTournaments';
export { default as useTournamentsHybrid } from './useTournamentsHybrid';
export { default as useMatches } from './useMatches';
export { default as useMatchesHybrid } from './useMatchesHybrid';
export { default as useReferees } from './useReferees';

// Sync and offline hooks (legacy - use useNetworkState variants)
export { default as useOfflineSync } from './useOfflineSync';
export { default as useOfflineStatus } from './useOfflineStatus';
export { default as useNetworkStatus } from './useNetworkStatus';

// ================================
// Hook Migration Helpers
// ================================

/**
 * Migration helper to gradually transition from old hooks to new consolidated ones
 */
export const HookMigrationHelper = {
  /**
   * Check if using legacy data hook
   */
  isLegacyDataHook: (hookName: string): boolean => {
    const legacyHooks = [
      'useTournaments',
      'useTournamentsHybrid',
      'useMatches',
      'useMatchesHybrid',
      'useReferees'
    ];
    return legacyHooks.includes(hookName);
  },

  /**
   * Check if using legacy network hook
   */
  isLegacyNetworkHook: (hookName: string): boolean => {
    const legacyHooks = [
      'useNetworkStatus',
      'useOfflineStatus',
      'useOfflineSync'
    ];
    return legacyHooks.includes(hookName);
  },

  /**
   * Get recommended replacement hook
   */
  getReplacementHook: (legacyHook: string): string => {
    const replacements: Record<string, string> = {
      // Data hooks
      'useTournaments': 'useTournamentsQuery',
      'useTournamentsHybrid': 'useTournamentsQuery',
      'useMatches': 'useMatchesQuery',
      'useMatchesHybrid': 'useMatchesQuery',
      'useReferees': 'useRefereesQuery',

      // Network hooks
      'useNetworkStatus': 'useOnlineStatus',
      'useOfflineStatus': 'useOfflineCapabilities',
      'useOfflineSync': 'useNetworkState'
    };

    return replacements[legacyHook] || 'No replacement found';
  }
};

// ================================
// Hook Categories for Documentation
// ================================

export const HOOK_CATEGORIES = {
  // Consolidated hooks (recommended)
  CONSOLIDATED: {
    'Data Fetching': [
      'useDataQuery',
      'useTournamentsQuery',
      'useMatchesQuery',
      'useRefereesQuery'
    ],
    'Network State': [
      'useNetworkState',
      'useOnlineStatus',
      'useNetworkQuality',
      'useOfflineCapabilities'
    ]
  },

  // Specialized hooks (maintained)
  SPECIALIZED: {
    'Assignment Management': [
      'useAssignmentStatus',
      'useCurrentAssignment'
    ],
    'Cache & Storage': [
      'useCacheAwareData',
      'useRepositoryData',
      'useStorageManager',
      'useDataFreshness'
    ],
    'Performance Monitoring': [
      'useConnectionHealth',
      'usePerformanceMonitor',
      'useRealtimePerformance',
      'useQueryPerformanceStats'
    ],
    'UI & Interaction': [
      'useContrastControls',
      'useStatusBarVisibility',
      'useKeyboardVisibility'
    ]
  },

  // Legacy hooks (deprecated)
  LEGACY: {
    'Data Fetching (Deprecated)': [
      'useTournaments',
      'useTournamentsHybrid',
      'useMatches',
      'useMatchesHybrid',
      'useReferees'
    ],
    'Network State (Deprecated)': [
      'useNetworkStatus',
      'useOfflineStatus',
      'useOfflineSync'
    ]
  }
} as const;

// ================================
// Hook Performance Guidelines
// ================================

export const HOOK_PERFORMANCE_GUIDELINES = {
  /**
   * Best practices for hook usage
   */
  BEST_PRACTICES: [
    'Use consolidated hooks (useDataQuery, useNetworkState) for new code',
    'Migrate legacy hooks gradually to avoid breaking changes',
    'Configure cache strategies appropriately for data types',
    'Use performance monitoring hooks in development',
    'Implement proper error boundaries when using data hooks',
    'Use specific convenience hooks for simple use cases'
  ],

  /**
   * Performance optimization tips
   */
  OPTIMIZATION: [
    'Configure appropriate cache strategies (live, historical, static)',
    'Use read strategies that match your data patterns',
    'Enable performance tracking in development only',
    'Batch network quality checks to avoid excessive testing',
    'Use fallback strategies appropriate for your use case',
    'Monitor query performance stats for optimization opportunities'
  ],

  /**
   * Common pitfalls to avoid
   */
  PITFALLS: [
    'Avoid using multiple data hooks for the same data',
    'Don\'t enable performance testing on cellular connections',
    'Don\'t use fresh-only read strategy for frequently accessed data',
    'Avoid mixing legacy and consolidated hooks for same functionality',
    'Don\'t ignore error handling in custom query functions',
    'Don\'t use detailed network monitoring without user consent'
  ]
} as const;

// ================================
// Development Utilities
// ================================

/**
 * Development-only hook usage tracker
 */
export function trackHookUsage(hookName: string, component: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`Hook usage: ${hookName} in ${component}`);

    if (HookMigrationHelper.isLegacyDataHook(hookName) ||
        HookMigrationHelper.isLegacyNetworkHook(hookName)) {
      console.warn(
        `⚠️ Legacy hook detected: ${hookName}. ` +
        `Consider migrating to: ${HookMigrationHelper.getReplacementHook(hookName)}`
      );
    }
  }
}

/**
 * Hook dependency analyzer (development only)
 */
export function analyzeHookDependencies() {
  if (process.env.NODE_ENV === 'development') {
    return {
      consolidated: Object.values(HOOK_CATEGORIES.CONSOLIDATED).flat(),
      specialized: Object.values(HOOK_CATEGORIES.SPECIALIZED).flat(),
      legacy: Object.values(HOOK_CATEGORIES.LEGACY).flat()
    };
  }
  return null;
}