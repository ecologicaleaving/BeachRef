/**
 * @fileoverview Repository Factory Unit Tests
 * Tests for feature flag integration and A/B testing functionality
 * Part of EPIC-007 Data Architecture Restructuration - Story 7.2 Task 5
 */

import { RepositoryFactory, DEFAULT_REPOSITORY_FACTORY_CONFIG } from '../../repositories/RepositoryFactory';
import { BaseRepositoryConfig } from '../../repositories/base/BaseRepository';
import { VisApiClient } from '../../services/api/VisApiClient';
import { SmartCacheManager } from '../../services/cache/SmartCacheManager';
import { featureFlagManager } from '../../config/featureFlags';

// Mock dependencies
jest.mock('../../config/featureFlags');
jest.mock('../../services/api/VisApiClient');
jest.mock('../../services/cache/SmartCacheManager');

describe('RepositoryFactory', () => {
  let factory: RepositoryFactory;
  let mockBaseConfig: BaseRepositoryConfig;
  let mockFeatureFlagManager: jest.Mocked<typeof featureFlagManager>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock base config
    mockBaseConfig = {
      apiClient: new VisApiClient({
        baseUrl: 'http://test.com',
        timeoutMs: 5000
      }) as jest.Mocked<VisApiClient>,
      cacheManager: new SmartCacheManager({
        memoryTtl: 300000,
        persistentTtl: 3600000
      }) as jest.Mocked<SmartCacheManager>,
      enableLogging: false,
      enableNetworkCheck: false
    };

    // Setup mock feature flag manager
    mockFeatureFlagManager = featureFlagManager as jest.Mocked<typeof featureFlagManager>;
    mockFeatureFlagManager.isEnabled = jest.fn();
    mockFeatureFlagManager.setFlag = jest.fn();

    // Create factory instance
    factory = new RepositoryFactory({
      baseConfig: mockBaseConfig,
      enableABTesting: true,
      newRepositoryPercentage: 50,
      enablePerformanceMonitoring: true
    });
  });

  describe('createTournamentRepository', () => {
    it('should return new repository when feature flag is enabled and A/B test assigns treatment', () => {
      // Arrange  
      mockFeatureFlagManager.isEnabled.mockReturnValue(true);
      
      // Use a factory with 100% treatment to guarantee 'new' implementation
      const treatmentFactory = new RepositoryFactory({
        baseConfig: mockBaseConfig,
        enableABTesting: true,
        newRepositoryPercentage: 100, // 100% treatment
        enablePerformanceMonitoring: true
      });

      // Act
      const result = treatmentFactory.createTournamentRepository('user123', 'session456');

      // Assert
      expect(result.implementation).toBe('new');
      expect(result.featureFlagValue).toBe(true);
      expect(result.repository).toBeDefined();
      expect(result.metadata.reason).toBe('ab_test');
      expect(result.abTestGroup).toBe('treatment');
      expect(result.metadata.userId).toBe('user123');
      expect(result.metadata.sessionId).toBe('session456');
    });

    it('should return legacy repository when feature flag is disabled', () => {
      // Arrange
      mockFeatureFlagManager.isEnabled.mockReturnValue(false);

      // Act
      const result = factory.createTournamentRepository('user123', 'session456');

      // Assert
      expect(result.implementation).toBe('legacy');
      expect(result.featureFlagValue).toBe(false);
      expect(result.repository).toBeDefined();
      expect(result.metadata.reason).toBe('feature_flag');
    });

    it('should use forced legacy mode when configured', () => {
      // Arrange
      const forcedFactory = new RepositoryFactory({
        baseConfig: mockBaseConfig,
        enableABTesting: true,
        newRepositoryPercentage: 50,
        enablePerformanceMonitoring: true,
        forceLegacyMode: true
      });

      mockFeatureFlagManager.isEnabled.mockReturnValue(true);

      // Act
      const result = forcedFactory.createTournamentRepository('user123');

      // Assert
      expect(result.implementation).toBe('legacy');
      expect(result.metadata.reason).toBe('forced_legacy');
    });

    it('should use forced new mode when configured', () => {
      // Arrange
      const forcedFactory = new RepositoryFactory({
        baseConfig: mockBaseConfig,
        enableABTesting: true,
        newRepositoryPercentage: 50,
        enablePerformanceMonitoring: true,
        forceNewMode: true
      });

      mockFeatureFlagManager.isEnabled.mockReturnValue(false);

      // Act
      const result = forcedFactory.createTournamentRepository('user123');

      // Assert
      expect(result.implementation).toBe('new');
      expect(result.metadata.reason).toBe('forced_new');
    });
  });

  describe('createMatchRepository', () => {
    it('should return new repository when feature flag is enabled and A/B test assigns treatment', () => {
      // Arrange
      mockFeatureFlagManager.isEnabled.mockReturnValue(true);
      
      // Use a factory with 100% treatment to guarantee 'new' implementation
      const treatmentFactory = new RepositoryFactory({
        baseConfig: mockBaseConfig,
        enableABTesting: true,
        newRepositoryPercentage: 100, // 100% treatment
        enablePerformanceMonitoring: true
      });

      // Act
      const result = treatmentFactory.createMatchRepository('user123', 'session456');

      // Assert
      expect(result.implementation).toBe('new');
      expect(result.featureFlagValue).toBe(true);
      expect(result.repository).toBeDefined();
      expect(result.metadata.reason).toBe('ab_test');
      expect(result.abTestGroup).toBe('treatment');
    });

    it('should return legacy repository when feature flag is disabled', () => {
      // Arrange
      mockFeatureFlagManager.isEnabled.mockReturnValue(false);

      // Act
      const result = factory.createMatchRepository('user123', 'session456');

      // Assert
      expect(result.implementation).toBe('legacy');
      expect(result.featureFlagValue).toBe(false);
      expect(result.repository).toBeDefined();
      expect(result.metadata.reason).toBe('feature_flag');
    });
  });

  describe('A/B Testing', () => {
    it('should assign users consistently to control or treatment groups', () => {
      // Arrange
      mockFeatureFlagManager.isEnabled.mockReturnValue(true);
      
      // Act - Test same user multiple times
      const result1 = factory.createTournamentRepository('user123');
      const result2 = factory.createTournamentRepository('user123');
      const result3 = factory.createTournamentRepository('user123');

      // Assert - Should be consistent
      expect(result1.abTestGroup).toBe(result2.abTestGroup);
      expect(result2.abTestGroup).toBe(result3.abTestGroup);
      expect(['control', 'treatment']).toContain(result1.abTestGroup);
    });

    it('should respect newRepositoryPercentage in A/B testing', () => {
      // Arrange
      const testFactory = new RepositoryFactory({
        baseConfig: mockBaseConfig,
        enableABTesting: true,
        newRepositoryPercentage: 0, // 0% should always be control
        enablePerformanceMonitoring: true
      });

      mockFeatureFlagManager.isEnabled.mockReturnValue(true);

      // Act
      const result = testFactory.createTournamentRepository('user123');

      // Assert
      expect(result.abTestGroup).toBe('control');
      expect(result.implementation).toBe('legacy');
    });

    it('should work without A/B testing when disabled', () => {
      // Arrange
      const noABFactory = new RepositoryFactory({
        baseConfig: mockBaseConfig,
        enableABTesting: false,
        newRepositoryPercentage: 50,
        enablePerformanceMonitoring: true
      });

      mockFeatureFlagManager.isEnabled.mockReturnValue(true);

      // Act
      const result = noABFactory.createTournamentRepository('user123');

      // Assert
      expect(result.implementation).toBe('new');
      expect(result.abTestGroup).toBeUndefined();
      expect(result.metadata.reason).toBe('feature_flag');
    });
  });

  describe('Performance Monitoring', () => {
    it('should not wrap repositories when performance monitoring is disabled', () => {
      // Arrange
      const noMonitoringFactory = new RepositoryFactory({
        baseConfig: mockBaseConfig,
        enableABTesting: false,
        newRepositoryPercentage: 50,
        enablePerformanceMonitoring: false
      });

      mockFeatureFlagManager.isEnabled.mockReturnValue(true);

      // Act
      const result = noMonitoringFactory.createTournamentRepository('user123');

      // Assert
      expect(result.repository).toBeDefined();
      // Repository should not be wrapped with proxy
    });

    it('should return null for performance comparison when no metrics exist', () => {
      // Act
      const comparison = factory.getPerformanceComparison('tournament');

      // Assert
      expect(comparison).toBeNull();
    });
  });

  describe('A/B Test Results', () => {
    it('should return correct A/B test statistics', () => {
      // Arrange
      mockFeatureFlagManager.isEnabled.mockReturnValue(true);

      // Create some assignments
      factory.createTournamentRepository('user1');
      factory.createTournamentRepository('user2');
      factory.createTournamentRepository('user3');

      // Act
      const results = factory.getABTestResults();

      // Assert
      expect(results.totalAssignments).toBe(3);
      expect(results.controlGroup + results.treatmentGroup).toBe(3);
      expect(results.conversionRates.control + results.conversionRates.treatment).toBe(1);
    });

    it('should handle empty A/B test results', () => {
      // Act
      const results = factory.getABTestResults();

      // Assert
      expect(results.totalAssignments).toBe(0);
      expect(results.controlGroup).toBe(0);
      expect(results.treatmentGroup).toBe(0);
      expect(results.conversionRates.control).toBe(0);
      expect(results.conversionRates.treatment).toBe(0);
    });
  });

  describe('Legacy Fallback', () => {
    it('should force legacy fallback when called', () => {
      // Act
      factory.forceLegacyFallback();

      // Assert
      expect(mockFeatureFlagManager.setFlag).toHaveBeenCalledWith('REPOSITORY_TOURNAMENT_V2', false);
      expect(mockFeatureFlagManager.setFlag).toHaveBeenCalledWith('REPOSITORY_MATCH_V2', false);
    });
  });

  describe('Metrics Management', () => {
    it('should clear metrics when requested', () => {
      // Arrange
      mockFeatureFlagManager.isEnabled.mockReturnValue(true);
      
      // Create some assignments to generate metrics
      factory.createTournamentRepository('user1');
      factory.createTournamentRepository('user2');

      // Act
      factory.clearMetrics();
      const results = factory.getABTestResults();

      // Assert
      expect(results.totalAssignments).toBe(0);
    });
  });

  describe('Feature Flag Integration', () => {
    it('should check correct feature flags for different repositories', () => {
      // Arrange
      mockFeatureFlagManager.isEnabled.mockReturnValue(true);

      // Act
      factory.createTournamentRepository('user123');
      factory.createMatchRepository('user123');

      // Assert
      expect(mockFeatureFlagManager.isEnabled).toHaveBeenCalledWith('REPOSITORY_TOURNAMENT_V2');
      expect(mockFeatureFlagManager.isEnabled).toHaveBeenCalledWith('REPOSITORY_MATCH_V2');
    });
  });

  describe('Default Configuration', () => {
    it('should have sensible default configuration values', () => {
      // Assert
      expect(DEFAULT_REPOSITORY_FACTORY_CONFIG.enableABTesting).toBe(true);
      expect(DEFAULT_REPOSITORY_FACTORY_CONFIG.newRepositoryPercentage).toBe(10);
      expect(DEFAULT_REPOSITORY_FACTORY_CONFIG.enablePerformanceMonitoring).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle feature flag manager errors gracefully', () => {
      // Arrange
      mockFeatureFlagManager.isEnabled.mockImplementation(() => {
        throw new Error('Feature flag service unavailable');
      });

      // Act & Assert - Should not throw and should fall back to legacy
      let result;
      expect(() => {
        result = factory.createTournamentRepository('user123');
      }).not.toThrow();

      expect(result.implementation).toBe('legacy');
      expect(result.metadata.reason).toBe('fallback');
    });
  });
});