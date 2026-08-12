import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeploymentFeatureFlags } from '../DeploymentFeatureFlags';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock ErrorLogger
jest.mock('../ErrorLogger', () => ({
  ErrorLogger: {
    getInstance: jest.fn(() => ({
      logError: jest.fn().mockResolvedValue(undefined)
    }))
  }
}));

describe('DeploymentFeatureFlags', () => {
  let featureFlags: DeploymentFeatureFlags;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset singleton
    (DeploymentFeatureFlags as any).instance = null;
    
    // Mock AsyncStorage to return null by default
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
    
    // Clear environment variables
    delete process.env.USE_NEW_ANALYTICS_ENDPOINTS;
    delete process.env.ENABLE_ANALYTICS_MONITORING;
    delete process.env.ANALYTICS_CACHE_ENABLED;
    delete process.env.ANALYTICS_PERFORMANCE_LOGGING;
  });

  afterEach(() => {
    // Clean up singleton
    (DeploymentFeatureFlags as any).instance = null;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = DeploymentFeatureFlags.getInstance();
      const instance2 = DeploymentFeatureFlags.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Default Configuration', () => {
    it('should have correct default values', () => {
      featureFlags = DeploymentFeatureFlags.getInstance();

      // SPENTO di partenza (issue #102). Era acceso, e finche' nessuno
      // consultava il flag non faceva danni. Ora che `useRefereeAnalytics` lo
      // consulta, un default acceso significherebbe spostare le statistiche di
      // TUTTI gli utenti su una sorgente che nessuno ha ancora verificato, con
      // un rientro che richiede un commit e un deploy. Si accende un browser
      // alla volta con `?nuoveAnalytics=on`.
      expect(featureFlags.isNewAnalyticsEndpointsEnabled()).toBe(false);
      expect(featureFlags.isAnalyticsMonitoringEnabled()).toBe(true);
      expect(featureFlags.isAnalyticsCacheEnabled()).toBe(true);
      expect(featureFlags.isAnalyticsPerformanceLoggingEnabled()).toBe(false);
    });
  });

  describe('Environment Variable Overrides', () => {
    it('should respect USE_NEW_ANALYTICS_ENDPOINTS environment variable', () => {
      process.env.USE_NEW_ANALYTICS_ENDPOINTS = 'false';
      
      featureFlags = DeploymentFeatureFlags.getInstance();
      
      expect(featureFlags.isNewAnalyticsEndpointsEnabled()).toBe(false);
    });

    it('should respect ENABLE_ANALYTICS_MONITORING environment variable', () => {
      process.env.ENABLE_ANALYTICS_MONITORING = 'false';
      
      featureFlags = DeploymentFeatureFlags.getInstance();
      
      expect(featureFlags.isAnalyticsMonitoringEnabled()).toBe(false);
    });

    it('should respect ANALYTICS_CACHE_ENABLED environment variable', () => {
      process.env.ANALYTICS_CACHE_ENABLED = 'false';
      
      featureFlags = DeploymentFeatureFlags.getInstance();
      
      expect(featureFlags.isAnalyticsCacheEnabled()).toBe(false);
    });

    it('should respect ANALYTICS_PERFORMANCE_LOGGING environment variable', () => {
      process.env.ANALYTICS_PERFORMANCE_LOGGING = 'true';
      
      featureFlags = DeploymentFeatureFlags.getInstance();
      
      expect(featureFlags.isAnalyticsPerformanceLoggingEnabled()).toBe(true);
    });

    it('should handle case insensitive environment variables', () => {
      process.env.USE_NEW_ANALYTICS_ENDPOINTS = 'TRUE';
      process.env.ENABLE_ANALYTICS_MONITORING = 'False';
      
      featureFlags = DeploymentFeatureFlags.getInstance();
      
      expect(featureFlags.isNewAnalyticsEndpointsEnabled()).toBe(true);
      expect(featureFlags.isAnalyticsMonitoringEnabled()).toBe(false);
    });
  });

  describe('Flag Overrides', () => {
    beforeEach(() => {
      featureFlags = DeploymentFeatureFlags.getInstance();
    });

    it('should set and get flag overrides', async () => {
      await featureFlags.setOverride('USE_NEW_ANALYTICS_ENDPOINTS', false);
      
      expect(featureFlags.isNewAnalyticsEndpointsEnabled()).toBe(false);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'feature_flag_overrides',
        JSON.stringify({ USE_NEW_ANALYTICS_ENDPOINTS: false })
      );
    });

    it('should clear specific flag override', async () => {
      // Si accende con l'override e si torna al default togliendolo. Dal #102
      // il default e' SPENTO, quindi l'andata e ritorno si prova in questo
      // verso: altrimenti si verificherebbe che togliere un override lascia le
      // cose come stavano, che e' vero anche se `clearOverride` non fa niente.
      await featureFlags.setOverride('USE_NEW_ANALYTICS_ENDPOINTS', true);
      await featureFlags.clearOverride('USE_NEW_ANALYTICS_ENDPOINTS');

      expect(featureFlags.isNewAnalyticsEndpointsEnabled()).toBe(false); // Back to default
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'feature_flag_overrides',
        JSON.stringify({})
      );
    });

    it('should clear all overrides', async () => {
      await featureFlags.setOverride('USE_NEW_ANALYTICS_ENDPOINTS', true);
      await featureFlags.setOverride('ANALYTICS_CACHE_ENABLED', false);
      await featureFlags.clearAllOverrides();

      // Ognuno torna al PROPRIO default: spento il primo (#102), acceso il
      // secondo. Prima entrambi venivano spenti e ci si aspettava che
      // tornassero accesi, il che nascondeva la differenza fra i due.
      expect(featureFlags.isNewAnalyticsEndpointsEnabled()).toBe(false);
      expect(featureFlags.isAnalyticsCacheEnabled()).toBe(true);
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('feature_flag_overrides');
    });
  });

  describe('Emergency Rollback', () => {
    beforeEach(() => {
      featureFlags = DeploymentFeatureFlags.getInstance();
    });

    it('should disable new analytics endpoints during emergency rollback', async () => {
      // Il rientro d'emergenza si prova partendo da ACCESO. Dal #102 il default
      // e' spento: senza questa riga il test verificherebbe che spegnere
      // qualcosa di gia' spento lo lascia spento — vero anche se
      // `emergencyRollback()` non facesse assolutamente nulla.
      await featureFlags.setOverride('USE_NEW_ANALYTICS_ENDPOINTS', true);
      expect(featureFlags.isNewAnalyticsEndpointsEnabled()).toBe(true);

      await featureFlags.emergencyRollback();
      
      expect(featureFlags.isNewAnalyticsEndpointsEnabled()).toBe(false);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'feature_flag_overrides',
        JSON.stringify({ USE_NEW_ANALYTICS_ENDPOINTS: false })
      );
    });

    it('should handle emergency rollback errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage error'));
      
      // Should not throw error
      await expect(featureFlags.emergencyRollback()).resolves.toBeUndefined();
    });
  });

  describe('Flag Retrieval', () => {
    beforeEach(() => {
      featureFlags = DeploymentFeatureFlags.getInstance();
    });

    it('should return all current flags', () => {
      const allFlags = featureFlags.getAllFlags();
      
      expect(allFlags).toHaveProperty('flags');
      expect(allFlags).toHaveProperty('overrides');
      expect(allFlags.flags).toHaveProperty('USE_NEW_ANALYTICS_ENDPOINTS');
      expect(allFlags.flags).toHaveProperty('ENABLE_ANALYTICS_MONITORING');
      expect(allFlags.flags).toHaveProperty('ANALYTICS_CACHE_ENABLED');
      expect(allFlags.flags).toHaveProperty('ANALYTICS_PERFORMANCE_LOGGING');
    });

    it('should get specific flag values', () => {
      expect(featureFlags.getFlag('USE_NEW_ANALYTICS_ENDPOINTS')).toBe(false); // spento dalla #102
      expect(featureFlags.getFlag('ENABLE_ANALYTICS_MONITORING')).toBe(true);
      expect(featureFlags.getFlag('ANALYTICS_CACHE_ENABLED')).toBe(true);
      expect(featureFlags.getFlag('ANALYTICS_PERFORMANCE_LOGGING')).toBe(false);
    });
  });

  describe('Health Check', () => {
    beforeEach(() => {
      featureFlags = DeploymentFeatureFlags.getInstance();
    });

    it('should return healthy status when storage is accessible', async () => {
      const healthStatus = await featureFlags.healthCheck();
      
      expect(healthStatus.status).toBe('healthy');
      expect(healthStatus).toHaveProperty('flags');
      expect(healthStatus).toHaveProperty('overrides');
      expect(healthStatus).toHaveProperty('environment_overrides');
      expect(Array.isArray(healthStatus.environment_overrides)).toBe(true);
    });

    it('should return failed status when storage fails', async () => {
      mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));
      
      const healthStatus = await featureFlags.healthCheck();
      
      expect(healthStatus.status).toBe('failed');
      expect(healthStatus).toHaveProperty('flags');
      expect(healthStatus).toHaveProperty('overrides');
    });

    it('should detect environment overrides in health check', async () => {
      process.env.USE_NEW_ANALYTICS_ENDPOINTS = 'false';
      process.env.ANALYTICS_CACHE_ENABLED = 'true';
      
      const healthStatus = await featureFlags.healthCheck();
      
      expect(healthStatus.environment_overrides).toContain('USE_NEW_ANALYTICS_ENDPOINTS');
      expect(healthStatus.environment_overrides).toContain('ANALYTICS_CACHE_ENABLED');
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(() => {
      featureFlags = DeploymentFeatureFlags.getInstance();
    });

    it('should update flag configuration', async () => {
      await featureFlags.updateFlags({
        USE_NEW_ANALYTICS_ENDPOINTS: false,
        ANALYTICS_PERFORMANCE_LOGGING: true
      });
      
      expect(featureFlags.isNewAnalyticsEndpointsEnabled()).toBe(false);
      expect(featureFlags.isAnalyticsPerformanceLoggingEnabled()).toBe(true);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'deployment_feature_flags',
        expect.stringContaining('USE_NEW_ANALYTICS_ENDPOINTS')
      );
    });
  });

  describe('Storage Integration', () => {
    it('should use AsyncStorage for overrides', async () => {
      featureFlags = DeploymentFeatureFlags.getInstance();
      
      await featureFlags.setOverride('USE_NEW_ANALYTICS_ENDPOINTS', false);
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'feature_flag_overrides',
        JSON.stringify({ USE_NEW_ANALYTICS_ENDPOINTS: false })
      );
    });

    it('should use AsyncStorage for flag configuration', async () => {
      featureFlags = DeploymentFeatureFlags.getInstance();
      
      await featureFlags.updateFlags({
        USE_NEW_ANALYTICS_ENDPOINTS: false,
        ANALYTICS_PERFORMANCE_LOGGING: true
      });
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'deployment_feature_flags',
        expect.stringContaining('USE_NEW_ANALYTICS_ENDPOINTS')
      );
    });

    it('should handle storage errors gracefully during initialization', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      // Should not throw error during construction
      expect(() => {
        featureFlags = DeploymentFeatureFlags.getInstance();
      }).not.toThrow();
    });
  });
});