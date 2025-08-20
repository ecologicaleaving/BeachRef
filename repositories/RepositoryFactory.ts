/**
 * @fileoverview Repository Factory with Feature Flag Integration
 * Provides runtime switching between legacy and new repository implementations
 * Part of EPIC-007 Data Architecture Restructuration - Story 7.2 Task 5
 */

import { TournamentRepository, ITournamentRepository } from './TournamentRepository';
import { MatchRepository, IMatchRepository } from './MatchRepository';
import { BaseRepositoryConfig } from './base/BaseRepository';
import { DataTransformationService } from '../services/DataTransformationService';
import { featureFlagManager } from '../config/featureFlags';

/**
 * Repository factory configuration
 */
export interface RepositoryFactoryConfig {
  /** Base repository configuration for all repositories */
  readonly baseConfig: BaseRepositoryConfig;
  /** Enable A/B testing for repository selection */
  readonly enableABTesting: boolean;
  /** A/B testing percentage (0-100) for new repository */
  readonly newRepositoryPercentage: number;
  /** Enable performance monitoring */
  readonly enablePerformanceMonitoring: boolean;
  /** Force legacy mode (overrides feature flags) */
  readonly forceLegacyMode?: boolean;
  /** Force new mode (overrides feature flags) */
  readonly forceNewMode?: boolean;
}

/**
 * Repository selection result with metadata
 */
export interface RepositorySelection<T> {
  /** The selected repository instance */
  readonly repository: T;
  /** Whether this is a legacy or new implementation */
  readonly implementation: 'legacy' | 'new';
  /** The feature flag value used for selection */
  readonly featureFlagValue: boolean;
  /** A/B test assignment if applicable */
  readonly abTestGroup?: 'control' | 'treatment';
  /** Selection metadata for monitoring */
  readonly metadata: {
    readonly timestamp: string;
    readonly userId?: string;
    readonly sessionId?: string;
    readonly reason: 'feature_flag' | 'ab_test' | 'forced_legacy' | 'forced_new' | 'fallback';
  };
}

/**
 * Performance comparison result
 */
export interface PerformanceComparison {
  /** Legacy implementation metrics */
  readonly legacy: {
    readonly averageResponseTime: number;
    readonly cacheHitRate: number;
    readonly errorRate: number;
    readonly throughput: number;
  };
  /** New implementation metrics */
  readonly new: {
    readonly averageResponseTime: number;
    readonly cacheHitRate: number;
    readonly errorRate: number;
    readonly throughput: number;
  };
  /** Performance improvement percentage */
  readonly improvement: {
    readonly responseTime: number;
    readonly cacheHitRate: number;
    readonly errorRate: number;
    readonly throughput: number;
  };
  /** Statistical significance */
  readonly significance: {
    readonly isSignificant: boolean;
    readonly confidence: number;
    readonly sampleSize: number;
  };
}

/**
 * Repository factory with feature flag integration and A/B testing
 * Enables gradual migration from legacy to new repository implementations
 */
export class RepositoryFactory {
  private readonly config: RepositoryFactoryConfig;
  private readonly transformationService: DataTransformationService;
  private readonly performanceMetrics: Map<string, any[]> = new Map();
  private readonly abTestAssignments: Map<string, 'control' | 'treatment'> = new Map();

  constructor(config: RepositoryFactoryConfig) {
    this.config = config;
    this.transformationService = new DataTransformationService();
  }

  /**
   * Create tournament repository with feature flag selection
   */
  createTournamentRepository(userId?: string, sessionId?: string): RepositorySelection<ITournamentRepository> {
    const selection = this.selectImplementation('REPOSITORY_TOURNAMENT_V2', userId, sessionId);
    
    let repository: ITournamentRepository;
    
    if (selection.implementation === 'new') {
      repository = new TournamentRepository(
        this.config.baseConfig,
        this.transformationService
      );
    } else {
      // For now, we'll use the new repository as legacy adapter
      // In production, this would be the actual legacy implementation
      repository = new TournamentRepository(
        this.config.baseConfig,
        this.transformationService
      );
    }

    // Wrap with performance monitoring if enabled
    if (this.config.enablePerformanceMonitoring) {
      repository = this.wrapWithPerformanceMonitoring(repository, 'tournament', selection.implementation);
    }

    return {
      repository,
      implementation: selection.implementation,
      featureFlagValue: selection.featureFlagValue,
      abTestGroup: selection.abTestGroup,
      metadata: selection.metadata
    };
  }

  /**
   * Create match repository with feature flag selection
   */
  createMatchRepository(userId?: string, sessionId?: string): RepositorySelection<IMatchRepository> {
    const selection = this.selectImplementation('REPOSITORY_MATCH_V2', userId, sessionId);
    
    let repository: IMatchRepository;
    
    if (selection.implementation === 'new') {
      repository = new MatchRepository(this.config.baseConfig);
    } else {
      // For now, we'll use the new repository as legacy adapter
      // In production, this would be the actual legacy implementation  
      repository = new MatchRepository(this.config.baseConfig);
    }

    // Wrap with performance monitoring if enabled
    if (this.config.enablePerformanceMonitoring) {
      repository = this.wrapWithPerformanceMonitoring(repository, 'match', selection.implementation);
    }

    return {
      repository,
      implementation: selection.implementation,
      featureFlagValue: selection.featureFlagValue,
      abTestGroup: selection.abTestGroup,
      metadata: selection.metadata
    };
  }

  /**
   * Get performance comparison between implementations
   */
  getPerformanceComparison(repositoryType: 'tournament' | 'match'): PerformanceComparison | null {
    const legacyMetrics = this.performanceMetrics.get(`${repositoryType}_legacy`) || [];
    const newMetrics = this.performanceMetrics.get(`${repositoryType}_new`) || [];

    if (legacyMetrics.length === 0 || newMetrics.length === 0) {
      return null;
    }

    // Calculate averages
    const legacyStats = this.calculateMetricsStats(legacyMetrics);
    const newStats = this.calculateMetricsStats(newMetrics);

    // Calculate improvements
    const responseTimeImprovement = ((legacyStats.averageResponseTime - newStats.averageResponseTime) / legacyStats.averageResponseTime) * 100;
    const cacheHitRateImprovement = ((newStats.cacheHitRate - legacyStats.cacheHitRate) / legacyStats.cacheHitRate) * 100;
    const errorRateImprovement = ((legacyStats.errorRate - newStats.errorRate) / legacyStats.errorRate) * 100;
    const throughputImprovement = ((newStats.throughput - legacyStats.throughput) / legacyStats.throughput) * 100;

    // Calculate statistical significance (simplified)
    const sampleSize = Math.min(legacyMetrics.length, newMetrics.length);
    const isSignificant = sampleSize >= 30 && Math.abs(responseTimeImprovement) > 5;
    const confidence = isSignificant ? 0.95 : 0.80;

    return {
      legacy: legacyStats,
      new: newStats,
      improvement: {
        responseTime: responseTimeImprovement,
        cacheHitRate: cacheHitRateImprovement,
        errorRate: errorRateImprovement,
        throughput: throughputImprovement
      },
      significance: {
        isSignificant,
        confidence,
        sampleSize
      }
    };
  }

  /**
   * Get A/B test results and statistics
   */
  getABTestResults(): {
    totalAssignments: number;
    controlGroup: number;
    treatmentGroup: number;
    conversionRates: {
      control: number;
      treatment: number;
    };
  } {
    const assignments = Array.from(this.abTestAssignments.values());
    const totalAssignments = assignments.length;
    const controlGroup = assignments.filter(group => group === 'control').length;
    const treatmentGroup = assignments.filter(group => group === 'treatment').length;

    return {
      totalAssignments,
      controlGroup,
      treatmentGroup,
      conversionRates: {
        control: totalAssignments > 0 ? controlGroup / totalAssignments : 0,
        treatment: totalAssignments > 0 ? treatmentGroup / totalAssignments : 0
      }
    };
  }

  /**
   * Force fallback to legacy implementation
   */
  forceLegacyFallback(): void {
    // Update feature flags to force legacy mode
    featureFlagManager.setFlag('REPOSITORY_TOURNAMENT_V2', false);
    featureFlagManager.setFlag('REPOSITORY_MATCH_V2', false);
    
    console.warn('Repository factory: Forced fallback to legacy implementation activated');
  }

  /**
   * Clear performance metrics (for testing or reset)
   */
  clearMetrics(): void {
    this.performanceMetrics.clear();
    this.abTestAssignments.clear();
  }

  /**
   * Select implementation based on feature flags and A/B testing
   */
  private selectImplementation(
    featureFlagKey: string, 
    userId?: string, 
    sessionId?: string
  ): {
    implementation: 'legacy' | 'new';
    featureFlagValue: boolean;
    abTestGroup?: 'control' | 'treatment';
    metadata: RepositorySelection<any>['metadata'];
  } {
    const timestamp = new Date().toISOString();

    // Check for forced modes
    if (this.config.forceLegacyMode) {
      return {
        implementation: 'legacy',
        featureFlagValue: false,
        metadata: {
          timestamp,
          userId,
          sessionId,
          reason: 'forced_legacy'
        }
      };
    }

    if (this.config.forceNewMode) {
      return {
        implementation: 'new',
        featureFlagValue: true,
        metadata: {
          timestamp,
          userId,
          sessionId,
          reason: 'forced_new'
        }
      };
    }

    // Check feature flag with error handling
    let featureFlagValue: boolean;
    try {
      featureFlagValue = featureFlagManager.isEnabled(featureFlagKey);
    } catch (error) {
      console.warn(`Feature flag service error, falling back to legacy: ${error.message}`);
      return {
        implementation: 'legacy',
        featureFlagValue: false,
        metadata: {
          timestamp,
          userId,
          sessionId,
          reason: 'fallback'
        }
      };
    }
    
    if (!featureFlagValue) {
      return {
        implementation: 'legacy',
        featureFlagValue,
        metadata: {
          timestamp,
          userId,
          sessionId,
          reason: 'feature_flag'
        }
      };
    }

    // A/B testing logic
    if (this.config.enableABTesting && userId) {
      const abTestGroup = this.getABTestAssignment(userId);
      
      // Store assignment
      this.abTestAssignments.set(userId, abTestGroup);
      
      const implementation = abTestGroup === 'treatment' ? 'new' : 'legacy';
      
      return {
        implementation,
        featureFlagValue,
        abTestGroup,
        metadata: {
          timestamp,
          userId,
          sessionId,
          reason: 'ab_test'
        }
      };
    }

    // Default to new implementation when feature flag is enabled
    return {
      implementation: 'new',
      featureFlagValue,
      metadata: {
        timestamp,
        userId,
        sessionId,
        reason: 'feature_flag'
      }
    };
  }

  /**
   * Get A/B test assignment for user
   */
  private getABTestAssignment(userId: string): 'control' | 'treatment' {
    // Use consistent hash-based assignment
    const hash = this.hashString(userId);
    const percentage = hash % 100;
    
    return percentage < this.config.newRepositoryPercentage ? 'treatment' : 'control';
  }

  /**
   * Simple hash function for consistent user assignment
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Wrap repository with performance monitoring
   */
  private wrapWithPerformanceMonitoring<T>(
    repository: T, 
    repositoryType: string, 
    implementation: 'legacy' | 'new'
  ): T {
    const metricsKey = `${repositoryType}_${implementation}`;
    
    // Create proxy to intercept method calls
    return new Proxy(repository, {
      get: (target, prop) => {
        const originalMethod = (target as any)[prop];
        
        if (typeof originalMethod === 'function' && prop.toString().includes('Async')) {
          return async (...args: any[]) => {
            const startTime = Date.now();
            
            try {
              const result = await originalMethod.apply(target, args);
              const duration = Date.now() - startTime;
              
              // Record successful operation metrics
              this.recordMetrics(metricsKey, {
                duration,
                success: true,
                timestamp: new Date().toISOString(),
                method: prop.toString(),
                cacheHit: result.source === 'cache'
              });
              
              return result;
              
            } catch (error) {
              const duration = Date.now() - startTime;
              
              // Record failed operation metrics
              this.recordMetrics(metricsKey, {
                duration,
                success: false,
                timestamp: new Date().toISOString(),
                method: prop.toString(),
                error: error.message
              });
              
              throw error;
            }
          };
        }
        
        return originalMethod;
      }
    }) as T;
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(key: string, metrics: any): void {
    if (!this.performanceMetrics.has(key)) {
      this.performanceMetrics.set(key, []);
    }
    
    const metricsList = this.performanceMetrics.get(key)!;
    metricsList.push(metrics);
    
    // Keep only last 1000 metrics to prevent memory issues
    if (metricsList.length > 1000) {
      metricsList.splice(0, metricsList.length - 1000);
    }
  }

  /**
   * Calculate statistics from metrics array
   */
  private calculateMetricsStats(metrics: any[]): {
    averageResponseTime: number;
    cacheHitRate: number;
    errorRate: number;
    throughput: number;
  } {
    if (metrics.length === 0) {
      return {
        averageResponseTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        throughput: 0
      };
    }

    const totalRequests = metrics.length;
    const successfulRequests = metrics.filter(m => m.success).length;
    const cacheHits = metrics.filter(m => m.cacheHit).length;
    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);

    return {
      averageResponseTime: totalDuration / totalRequests,
      cacheHitRate: cacheHits / totalRequests,
      errorRate: (totalRequests - successfulRequests) / totalRequests,
      throughput: totalRequests / (totalDuration / 1000) // requests per second
    };
  }
}

/**
 * Default repository factory configuration
 */
export const DEFAULT_REPOSITORY_FACTORY_CONFIG: Partial<RepositoryFactoryConfig> = {
  enableABTesting: true,
  newRepositoryPercentage: 10, // 10% treatment group
  enablePerformanceMonitoring: true
};