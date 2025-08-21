/**
 * @fileoverview Repository Selection Hook for Feature Flag Management
 * Manages repository selection based on feature flags and A/B testing
 * Part of EPIC-007 Data Architecture Restructuration - Story 7.3 Task 1
 */

import { useState, useEffect, useCallback } from 'react';
import { RepositoryFactory, RepositoryFactoryConfig, RepositorySelection } from '../repositories/RepositoryFactory';
import { ITournamentRepository } from '../repositories/TournamentRepository';
import { IMatchRepository } from '../repositories/MatchRepository';
import { BaseRepositoryConfig } from '../repositories/base/BaseRepository';

/**
 * Repository selection options
 */
export interface UseRepositorySelectionOptions {
  /** Enable A/B testing for repository selection */
  enableABTesting?: boolean;
  /** User ID for consistent A/B test assignment */
  userId?: string;
  /** Session ID for tracking */
  sessionId?: string;
  /** Repository type to create */
  repositoryType: 'tournament' | 'match';
  /** Enable performance monitoring */
  enablePerformanceMonitoring?: boolean;
  /** Force specific implementation (overrides feature flags) */
  forceImplementation?: 'legacy' | 'new';
}

/**
 * Repository selection result
 */
export interface UseRepositorySelectionResult<T> {
  /** Selected repository instance */
  repository: T | null;
  /** Current implementation type */
  implementation: 'legacy' | 'new';
  /** A/B test group assignment */
  abTestGroup?: 'control' | 'treatment';
  /** Feature flag value */
  featureFlagValue: boolean;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Repository selection metadata */
  metadata?: {
    timestamp: string;
    reason: string;
  };
  /** Refresh repository selection */
  refresh: () => void;
  /** Force fallback to legacy implementation */
  forceLegacyFallback: () => void;
}

/**
 * Default repository factory configuration
 */
const getDefaultRepositoryConfig = (): RepositoryFactoryConfig => ({
  baseConfig: {
    apiClient: null as any, // Will be injected by factory
    cacheManager: null as any, // Will be injected by factory
    enablePerformanceMonitoring: true,
    retryAttempts: 3,
    requestTimeout: 30000
  },
  enableABTesting: true,
  newRepositoryPercentage: 50, // 50% for A/B testing
  enablePerformanceMonitoring: true
});

/**
 * Repository selection hook for feature flag management
 * Manages repository selection based on feature flags and A/B testing
 * 
 * @param options - Repository selection configuration
 * @returns Repository selection result with metadata and controls
 */
export const useRepositorySelection = <T>(
  options: UseRepositorySelectionOptions
): UseRepositorySelectionResult<T> => {
  const {
    enableABTesting = true,
    userId,
    sessionId,
    repositoryType,
    enablePerformanceMonitoring = true,
    forceImplementation
  } = options;

  const [repository, setRepository] = useState<T | null>(null);
  const [implementation, setImplementation] = useState<'legacy' | 'new'>('new');
  const [abTestGroup, setAbTestGroup] = useState<'control' | 'treatment' | undefined>(undefined);
  const [featureFlagValue, setFeatureFlagValue] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [metadata, setMetadata] = useState<{ timestamp: string; reason: string } | undefined>(undefined);
  const [repositoryFactory, setRepositoryFactory] = useState<RepositoryFactory | null>(null);

  // Initialize repository factory
  useEffect(() => {
    try {
      setLoading(true);
      setError(null);

      const config = getDefaultRepositoryConfig();
      
      // Apply forced implementation if specified
      if (forceImplementation === 'legacy') {
        config.forceLegacyMode = true;
      } else if (forceImplementation === 'new') {
        config.forceNewMode = true;
      }

      config.enableABTesting = enableABTesting;
      config.enablePerformanceMonitoring = enablePerformanceMonitoring;

      const factory = new RepositoryFactory(config);
      setRepositoryFactory(factory);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize repository factory'));
      setLoading(false);
    }
  }, [enableABTesting, enablePerformanceMonitoring, forceImplementation]);

  // Create repository when factory is ready
  useEffect(() => {
    if (!repositoryFactory) return;

    try {
      let selection: RepositorySelection<any>;

      if (repositoryType === 'tournament') {
        selection = repositoryFactory.createTournamentRepository(userId, sessionId);
      } else if (repositoryType === 'match') {
        selection = repositoryFactory.createMatchRepository(userId, sessionId);
      } else {
        throw new Error(`Unsupported repository type: ${repositoryType}`);
      }

      setRepository(selection.repository as T);
      setImplementation(selection.implementation);
      setAbTestGroup(selection.abTestGroup);
      setFeatureFlagValue(selection.featureFlagValue);
      setMetadata(selection.metadata);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create repository'));
      setLoading(false);
    }
  }, [repositoryFactory, repositoryType, userId, sessionId]);

  // Refresh repository selection
  const refresh = useCallback(() => {
    if (!repositoryFactory) return;

    try {
      setLoading(true);
      setError(null);

      let selection: RepositorySelection<any>;

      if (repositoryType === 'tournament') {
        selection = repositoryFactory.createTournamentRepository(userId, sessionId);
      } else {
        selection = repositoryFactory.createMatchRepository(userId, sessionId);
      }

      setRepository(selection.repository as T);
      setImplementation(selection.implementation);
      setAbTestGroup(selection.abTestGroup);
      setFeatureFlagValue(selection.featureFlagValue);
      setMetadata(selection.metadata);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh repository'));
      setLoading(false);
    }
  }, [repositoryFactory, repositoryType, userId, sessionId]);

  // Force fallback to legacy implementation
  const forceLegacyFallback = useCallback(() => {
    if (!repositoryFactory) return;

    try {
      repositoryFactory.forceLegacyFallback();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to force legacy fallback'));
    }
  }, [repositoryFactory, refresh]);

  return {
    repository,
    implementation,
    abTestGroup,
    featureFlagValue,
    loading,
    error,
    metadata,
    refresh,
    forceLegacyFallback
  };
};

/**
 * Tournament repository selection hook
 */
export const useTournamentRepository = (
  options: Omit<UseRepositorySelectionOptions, 'repositoryType'> = {}
): UseRepositorySelectionResult<ITournamentRepository> => {
  return useRepositorySelection<ITournamentRepository>({
    ...options,
    repositoryType: 'tournament'
  });
};

/**
 * Match repository selection hook
 */
export const useMatchRepository = (
  options: Omit<UseRepositorySelectionOptions, 'repositoryType'> = {}
): UseRepositorySelectionResult<IMatchRepository> => {
  return useRepositorySelection<IMatchRepository>({
    ...options,
    repositoryType: 'match'
  });
};

/**
 * Repository performance comparison hook
 */
export const useRepositoryPerformanceComparison = (repositoryType: 'tournament' | 'match') => {
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const factory = new RepositoryFactory(getDefaultRepositoryConfig());
    
    try {
      const performanceComparison = factory.getPerformanceComparison(repositoryType);
      setComparison(performanceComparison);
    } catch (err) {
      console.warn('Failed to get performance comparison:', err);
    } finally {
      setLoading(false);
    }
  }, [repositoryType]);

  return { comparison, loading };
};

export default useRepositorySelection;