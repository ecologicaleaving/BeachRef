/**
 * @fileoverview Feature Flags Configuration v2
 * Feature flag system for safe gradual rollout of new architecture
 * Part of EPIC-007 Data Architecture Restructuration
 */

/**
 * Feature flag configuration interface
 */
export interface FeatureFlagConfig {
  /** Flag identifier */
  readonly key: string;
  /** Human-readable flag name */
  readonly name: string;
  /** Flag description */
  readonly description: string;
  /** Default flag value */
  readonly defaultValue: boolean;
  /** Current flag value */
  value: boolean;
  /** Flag category for organization */
  readonly category: FeatureFlagCategory;
  /** Environment restrictions */
  readonly environments?: readonly string[];
  /** Required dependencies (other flags that must be enabled) */
  readonly dependencies?: readonly string[];
  /** Rollout percentage (0-100) */
  rolloutPercentage: number;
  /** Flag metadata */
  readonly metadata?: Record<string, any>;
}

/**
 * Feature flag categories for organization
 */
export enum FeatureFlagCategory {
  /** Data architecture and API changes */
  DATA_ARCHITECTURE = 'DATA_ARCHITECTURE',
  /** UI/UX improvements */
  UI_UX = 'UI_UX',
  /** Performance optimizations */
  PERFORMANCE = 'PERFORMANCE',
  /** New features */
  FEATURES = 'FEATURES',
  /** Development tools */
  DEVELOPMENT = 'DEVELOPMENT',
  /** Experimental features */
  EXPERIMENTAL = 'EXPERIMENTAL'
}

/**
 * Feature flag evaluation context
 */
export interface FeatureFlagContext {
  /** User identifier for consistent evaluation */
  readonly userId?: string;
  /** Device identifier */
  readonly deviceId?: string;
  /** App version */
  readonly appVersion?: string;
  /** Platform (ios, android, web) */
  readonly platform?: string;
  /** Environment (development, staging, production) */
  readonly environment?: string;
  /** Custom attributes */
  readonly attributes?: Record<string, any>;
}

/**
 * Feature flag evaluation result
 */
export interface FeatureFlagEvaluation {
  /** Flag key */
  readonly key: string;
  /** Evaluated value */
  readonly value: boolean;
  /** Evaluation reason */
  readonly reason: string;
  /** Evaluation timestamp */
  readonly timestamp: string;
  /** Context used for evaluation */
  readonly context?: FeatureFlagContext;
}

/**
 * Main feature flag configuration for BeachRef v2 architecture
 */
export const FEATURE_FLAGS: Record<string, FeatureFlagConfig> = {
  // Data Architecture Flags
  NEW_TOURNAMENT_ARCHITECTURE: {
    key: 'NEW_TOURNAMENT_ARCHITECTURE',
    name: 'New Tournament Architecture',
    description: 'Enable stable tournament domain model and type-safe interfaces',
    defaultValue: false,
    value: false,
    category: FeatureFlagCategory.DATA_ARCHITECTURE,
    environments: ['development', 'staging'],
    rolloutPercentage: 0,
    metadata: {
      epicId: 'EPIC-007',
      storyId: '7.1',
      impact: 'HIGH',
      rollbackTime: '< 5 minutes'
    }
  },

  NEW_CACHE_STRATEGY: {
    key: 'NEW_CACHE_STRATEGY',
    name: 'Smart Cache Manager',
    description: 'Enable 2-tier smart caching system with semantic keys',
    defaultValue: false,
    value: false,
    category: FeatureFlagCategory.PERFORMANCE,
    environments: ['development', 'staging'],
    dependencies: ['NEW_TOURNAMENT_ARCHITECTURE'],
    rolloutPercentage: 0,
    metadata: {
      epicId: 'EPIC-007',
      storyId: '7.1',
      expectedPerformanceGain: '10x faster loading',
      targetHitRate: '95%'
    }
  },

  API_V2_ENDPOINTS: {
    key: 'API_V2_ENDPOINTS',
    name: 'Unified VIS API Client',
    description: 'Use new unified VIS API client with optimized endpoints',
    defaultValue: false,
    value: false,
    category: FeatureFlagCategory.DATA_ARCHITECTURE,
    environments: ['development', 'staging'],
    dependencies: ['NEW_TOURNAMENT_ARCHITECTURE'],
    rolloutPercentage: 0,
    metadata: {
      epicId: 'EPIC-007',
      storyId: '7.1',
      apiCallReduction: '50%',
      complexityReduction: '60%'
    }
  },

  // Performance Monitoring
  PERFORMANCE_MONITORING: {
    key: 'PERFORMANCE_MONITORING',
    name: 'Performance Monitoring',
    description: 'Enable detailed performance monitoring for new components',
    defaultValue: true,
    value: true,
    category: FeatureFlagCategory.DEVELOPMENT,
    rolloutPercentage: 100,
    metadata: {
      alwaysEnabled: true,
      critical: true
    }
  },

  // Development Tools
  CACHE_DEBUG_TOOLS: {
    key: 'CACHE_DEBUG_TOOLS',
    name: 'Cache Debug Tools',
    description: 'Enable cache debugging and monitoring interfaces',
    defaultValue: false,
    value: false,
    category: FeatureFlagCategory.DEVELOPMENT,
    environments: ['development'],
    dependencies: ['NEW_CACHE_STRATEGY'],
    rolloutPercentage: 100,
    metadata: {
      developmentOnly: true
    }
  },

  // A/B Testing Support
  AB_TEST_NEW_ARCHITECTURE: {
    key: 'AB_TEST_NEW_ARCHITECTURE',
    name: 'A/B Test New Architecture',
    description: 'Enable A/B testing between old and new data architecture',
    defaultValue: false,
    value: false,
    category: FeatureFlagCategory.EXPERIMENTAL,
    environments: ['staging'],
    rolloutPercentage: 50,
    metadata: {
      testDuration: '2 weeks',
      successMetrics: ['hitRate', 'responseTime', 'errorRate']
    }
  }
} as const;

/**
 * Feature Flag Manager class
 * Handles feature flag evaluation and management
 */
export class FeatureFlagManager {
  private readonly flags: Map<string, FeatureFlagConfig>;
  private readonly context: FeatureFlagContext;

  constructor(context: FeatureFlagContext = {}) {
    this.flags = new Map();
    this.context = context;
    
    // Initialize flags
    Object.values(FEATURE_FLAGS).forEach(flag => {
      this.flags.set(flag.key, { ...flag });
    });
  }

  /**
   * Check if a feature flag is enabled
   * @param flagKey - Feature flag key
   * @param context - Optional context override
   * @returns True if flag is enabled
   */
  isEnabled(flagKey: string, context?: FeatureFlagContext): boolean {
    const evaluation = this.evaluate(flagKey, context);
    return evaluation.value;
  }

  /**
   * Evaluate feature flag with full context
   * @param flagKey - Feature flag key
   * @param context - Optional context override
   * @returns Feature flag evaluation result
   */
  evaluate(flagKey: string, context?: FeatureFlagContext): FeatureFlagEvaluation {
    const flag = this.flags.get(flagKey);
    const evalContext = context || this.context;
    
    if (!flag) {
      return {
        key: flagKey,
        value: false,
        reason: 'Flag not found',
        timestamp: new Date().toISOString(),
        context: evalContext
      };
    }

    // Check environment restrictions
    if (flag.environments && evalContext.environment) {
      if (!flag.environments.includes(evalContext.environment)) {
        return {
          key: flagKey,
          value: false,
          reason: `Environment ${evalContext.environment} not allowed`,
          timestamp: new Date().toISOString(),
          context: evalContext
        };
      }
    }

    // Check dependencies
    if (flag.dependencies) {
      for (const dependency of flag.dependencies) {
        if (!this.isEnabled(dependency, evalContext)) {
          return {
            key: flagKey,
            value: false,
            reason: `Dependency ${dependency} not enabled`,
            timestamp: new Date().toISOString(),
            context: evalContext
          };
        }
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const userHash = this.hashUser(evalContext.userId || evalContext.deviceId || 'anonymous');
      const userPercentage = userHash % 100;
      
      if (userPercentage >= flag.rolloutPercentage) {
        return {
          key: flagKey,
          value: false,
          reason: `User not in rollout (${userPercentage}% >= ${flag.rolloutPercentage}%)`,
          timestamp: new Date().toISOString(),
          context: evalContext
        };
      }
    }

    return {
      key: flagKey,
      value: flag.value,
      reason: flag.value ? 'Flag enabled' : 'Flag disabled',
      timestamp: new Date().toISOString(),
      context: evalContext
    };
  }

  /**
   * Enable a feature flag
   * @param flagKey - Feature flag key
   * @param rolloutPercentage - Optional rollout percentage
   */
  enable(flagKey: string, rolloutPercentage: number = 100): void {
    const flag = this.flags.get(flagKey);
    if (flag) {
      flag.value = true;
      flag.rolloutPercentage = rolloutPercentage;
    }
  }

  /**
   * Disable a feature flag
   * @param flagKey - Feature flag key
   */
  disable(flagKey: string): void {
    const flag = this.flags.get(flagKey);
    if (flag) {
      flag.value = false;
      flag.rolloutPercentage = 0;
    }
  }

  /**
   * Get all feature flags
   * @returns Array of all feature flag configurations
   */
  getAllFlags(): FeatureFlagConfig[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get flags by category
   * @param category - Feature flag category
   * @returns Array of feature flags in the category
   */
  getFlagsByCategory(category: FeatureFlagCategory): FeatureFlagConfig[] {
    return this.getAllFlags().filter(flag => flag.category === category);
  }

  /**
   * Update context for flag evaluation
   * @param context - New context
   */
  updateContext(context: FeatureFlagContext): void {
    Object.assign(this.context, context);
  }

  /**
   * Get current context
   * @returns Current feature flag context
   */
  getContext(): FeatureFlagContext {
    return { ...this.context };
  }

  /**
   * Emergency rollback - disable all experimental flags
   * @returns Array of disabled flag keys
   */
  emergencyRollback(): string[] {
    const disabledFlags: string[] = [];
    
    for (const flag of this.flags.values()) {
      if (flag.category === FeatureFlagCategory.EXPERIMENTAL || 
          flag.category === FeatureFlagCategory.DATA_ARCHITECTURE) {
        flag.value = false;
        flag.rolloutPercentage = 0;
        disabledFlags.push(flag.key);
      }
    }
    
    return disabledFlags;
  }

  /**
   * Hash user identifier for consistent rollout
   * @param userId - User identifier
   * @returns Hash value
   */
  private hashUser(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

/**
 * Global feature flag manager instance
 * Initialize with current context
 */
export const featureFlagManager = new FeatureFlagManager({
  environment: process.env.NODE_ENV || 'development',
  platform: 'react-native' // Will be set dynamically in app
});

/**
 * Convenience functions for common flag checks
 */
export const isNewArchitectureEnabled = (): boolean => {
  return featureFlagManager.isEnabled('NEW_TOURNAMENT_ARCHITECTURE');
};

export const isNewCacheEnabled = (): boolean => {
  return featureFlagManager.isEnabled('NEW_CACHE_STRATEGY');
};

export const isApiV2Enabled = (): boolean => {
  return featureFlagManager.isEnabled('API_V2_ENDPOINTS');
};

export const isPerformanceMonitoringEnabled = (): boolean => {
  return featureFlagManager.isEnabled('PERFORMANCE_MONITORING');
};

/**
 * Development toggle interface for testing
 * Only available in development environment
 */
export interface DevelopmentToggle {
  flagKey: string;
  enabled: boolean;
  rolloutPercentage: number;
}

export const createDevelopmentToggle = (flagKey: string): DevelopmentToggle | null => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  const flag = featureFlagManager.getAllFlags().find(f => f.key === flagKey);
  if (!flag) return null;
  
  return {
    flagKey,
    enabled: flag.value,
    rolloutPercentage: flag.rolloutPercentage
  };
};

export const updateDevelopmentToggle = (toggle: DevelopmentToggle): boolean => {
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }
  
  const flag = featureFlagManager.getAllFlags().find(f => f.key === toggle.flagKey);
  if (!flag) return false;
  
  flag.value = toggle.enabled;
  flag.rolloutPercentage = toggle.rolloutPercentage;
  
  return true;
};