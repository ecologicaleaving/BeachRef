/**
 * Simplified real-time system tests that don't require React components
 */
import { RealtimeSubscriptionService, ConnectionState } from '../../services/RealtimeSubscriptionService';
import { RealtimeFallbackService } from '../../services/RealtimeFallbackService';
import { RealtimePerformanceMonitor } from '../../services/RealtimePerformanceMonitor';
import { ConnectionCircuitBreaker, CircuitState } from '../../services/ConnectionCircuitBreaker';

// Mock external dependencies
jest.mock('../../services/supabase', () => ({
  supabase: {
    channel: jest.fn(),
    removeChannel: jest.fn(),
  }
}));

jest.mock('../../hooks/compatibility/CacheServiceCompatibility', () => ({
  CacheServiceCompatibility: {
    invalidateMatchCache: jest.fn(() => Promise.resolve()),
  }
}));

jest.mock('../../services/visApi', () => ({
  VisApiService: {
    getBeachMatchList: jest.fn(() => Promise.resolve([])),
  }
}));

describe('Real-Time System Core Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    RealtimeSubscriptionService.cleanup();
    RealtimeFallbackService.cleanup();
    RealtimePerformanceMonitor.resetMetrics();
    ConnectionCircuitBreaker.cleanupAll();
  });

  afterEach(() => {
    RealtimeSubscriptionService.cleanup();
    RealtimeFallbackService.cleanup();
    RealtimePerformanceMonitor.cleanup();
    ConnectionCircuitBreaker.cleanupAll();
  });

  describe('RealtimeSubscriptionService Core Functions', () => {
    test('should initialize correctly', () => {
      RealtimeSubscriptionService.initialize();
      expect(RealtimeSubscriptionService.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
      expect(RealtimeSubscriptionService.getActiveSubscriptions()).toEqual([]);
    });

    test('should manage connection state listeners', () => {
      const listener = jest.fn();
      const unsubscribe = RealtimeSubscriptionService.addConnectionStateListener(listener);
      
      RealtimeSubscriptionService.initialize();
      expect(listener).toHaveBeenCalledWith(ConnectionState.DISCONNECTED);
      
      unsubscribe();
      // Listener should not be called after unsubscribe
      expect(listener).toHaveBeenCalledTimes(1);
    });

    test('should track subscription status correctly', () => {
      const tournamentNo = 'TEST_TOURNAMENT';
      const status = RealtimeSubscriptionService.getSubscriptionStatus(tournamentNo);
      
      expect(status.active).toBe(false);
      expect(status.retrying).toBe(false);
      expect(status.fallbackActive).toBe(false);
    });
  });

  describe('RealtimePerformanceMonitor', () => {
    test('should initialize and track basic metrics', () => {
      RealtimePerformanceMonitor.initialize();
      
      const initialMetrics = RealtimePerformanceMonitor.getPerformanceMetrics();
      expect(initialMetrics.totalMessagesReceived).toBe(0);
      expect(initialMetrics.connectionAttempts).toBe(0);
    });

    test('should track message metrics', () => {
      RealtimePerformanceMonitor.initialize();
      
      RealtimePerformanceMonitor.trackMessageReceived(1024, 'TEST_TOURNAMENT');
      RealtimePerformanceMonitor.trackMessageReceived(512, 'TEST_TOURNAMENT');
      
      const metrics = RealtimePerformanceMonitor.getPerformanceMetrics();
      expect(metrics.totalMessagesReceived).toBe(2);
      expect(metrics.totalBytesReceived).toBe(1536);
      expect(metrics.averageMessageSize).toBe(768);
    });

    test('should provide optimization recommendations', () => {
      RealtimePerformanceMonitor.initialize();
      
      const recommendations = RealtimePerformanceMonitor.getOptimizationRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    test('should reset metrics correctly', () => {
      RealtimePerformanceMonitor.initialize();
      RealtimePerformanceMonitor.trackMessageReceived(1000, 'TEST');
      
      RealtimePerformanceMonitor.resetMetrics();
      
      const metrics = RealtimePerformanceMonitor.getPerformanceMetrics();
      expect(metrics.totalMessagesReceived).toBe(0);
      expect(metrics.totalBytesReceived).toBe(0);
    });
  });

  describe('ConnectionCircuitBreaker', () => {
    test('should start in closed state', () => {
      const circuitBreaker = ConnectionCircuitBreaker.getInstance('test-service');
      
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(circuitBreaker.canExecute()).toBe(true);
    });

    test('should open circuit after threshold failures', () => {
      const circuitBreaker = ConnectionCircuitBreaker.getInstance('test-service-2');
      
      // Simulate failures to reach threshold
      for (let i = 0; i < 5; i++) {
        circuitBreaker.onFailure('Test failure');
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      expect(circuitBreaker.canExecute()).toBe(false);
    });

    test('should track statistics correctly', () => {
      const circuitBreaker = ConnectionCircuitBreaker.getInstance('test-service-3');
      
      circuitBreaker.onSuccess();
      circuitBreaker.onFailure('Test error');
      circuitBreaker.onSuccess();
      
      const stats = circuitBreaker.getStats();
      expect(stats.successes).toBe(2);
      expect(stats.failures).toBe(1);
    });

    test('should provide recommendations', () => {
      const circuitBreaker = ConnectionCircuitBreaker.getInstance('test-service-4');
      
      const recommendation = circuitBreaker.getRecommendation();
      expect(recommendation).toHaveProperty('shouldExecute');
      expect(recommendation).toHaveProperty('reason');
      expect(recommendation).toHaveProperty('fallbackSuggested');
    });
  });

  describe('RealtimeFallbackService', () => {
    test('should initialize correctly', () => {
      RealtimeFallbackService.initialize();
      
      const stats = RealtimeFallbackService.getFallbackStats();
      expect(stats.activePollingCount).toBe(0);
      expect(stats.totalErrors).toBe(0);
    });

    test('should track polling tournaments', () => {
      RealtimeFallbackService.initialize();
      
      expect(RealtimeFallbackService.isPolling('TEST_TOURNAMENT')).toBe(false);
      
      const activeTournaments = RealtimeFallbackService.getActivePollingTournaments();
      expect(activeTournaments).toEqual([]);
    });

    test('should provide fallback recommendations', () => {
      RealtimeFallbackService.initialize();
      
      const recommendations = RealtimeFallbackService.getFallbackRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    test('should check fallback health', () => {
      RealtimeFallbackService.initialize();
      
      const isHealthy = RealtimeFallbackService.isFallbackHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('Integration Between Services', () => {
    test('should work together for complete fallback scenario', () => {
      // Initialize all services
      RealtimeSubscriptionService.initialize();
      RealtimeFallbackService.initialize();
      RealtimePerformanceMonitor.initialize();
      
      // Get circuit breaker for tournament
      const circuitBreaker = ConnectionCircuitBreaker.getInstance('integration-test');
      
      // Simulate failures to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        circuitBreaker.onFailure('Integration test failure');
      }
      
      // Circuit should be open
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      expect(circuitBreaker.canExecute()).toBe(false);
      
      // Should recommend fallback
      const recommendation = circuitBreaker.getRecommendation();
      expect(recommendation.fallbackSuggested).toBe(true);
      
      // Performance monitor should be tracking
      const metrics = RealtimePerformanceMonitor.getPerformanceMetrics();
      expect(typeof metrics.connectionSuccessRate).toBe('number');
    });

    test('should handle cleanup properly', () => {
      // Initialize all services
      RealtimeSubscriptionService.initialize();
      RealtimeFallbackService.initialize();
      RealtimePerformanceMonitor.initialize();
      
      // Create some circuit breakers
      ConnectionCircuitBreaker.getInstance('cleanup-test-1');
      ConnectionCircuitBreaker.getInstance('cleanup-test-2');
      
      // Cleanup everything
      RealtimeSubscriptionService.cleanup();
      RealtimeFallbackService.cleanup();
      RealtimePerformanceMonitor.cleanup();
      ConnectionCircuitBreaker.cleanupAll();
      
      // Verify cleanup
      expect(RealtimeSubscriptionService.getActiveSubscriptions()).toEqual([]);
      expect(RealtimeFallbackService.getActivePollingTournaments()).toEqual([]);
      
      const metrics = RealtimePerformanceMonitor.getPerformanceMetrics();
      expect(metrics.activeRateLimiters).toBe(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid tournament numbers gracefully', () => {
      RealtimeSubscriptionService.initialize();
      
      const status1 = RealtimeSubscriptionService.getSubscriptionStatus('');
      expect(status1.active).toBe(false);
      
      const status2 = RealtimeSubscriptionService.getSubscriptionStatus(null as any);
      expect(status2.active).toBe(false);
    });

    test('should handle multiple initializations gracefully', () => {
      RealtimeSubscriptionService.initialize();
      RealtimeSubscriptionService.initialize(); // Second initialization
      RealtimeSubscriptionService.initialize(); // Third initialization
      
      // Should not cause errors
      expect(RealtimeSubscriptionService.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });

    test('should handle cleanup when not initialized', () => {
      // Should not throw errors
      expect(() => RealtimeSubscriptionService.cleanup()).not.toThrow();
      expect(() => RealtimeFallbackService.cleanup()).not.toThrow();
      expect(() => RealtimePerformanceMonitor.cleanup()).not.toThrow();
    });
  });

  describe('Performance and Memory Management', () => {
    test('should handle rapid operations without memory leaks', () => {
      RealtimeSubscriptionService.initialize();
      RealtimePerformanceMonitor.initialize();
      
      // Simulate rapid operations
      for (let i = 0; i < 100; i++) {
        const listener = jest.fn();
        const unsubscribe = RealtimeSubscriptionService.addConnectionStateListener(listener);
        unsubscribe(); // Immediately unsubscribe
        
        RealtimePerformanceMonitor.trackMessageReceived(100, `tournament-${i % 5}`);
      }
      
      const metrics = RealtimePerformanceMonitor.getPerformanceMetrics();
      expect(metrics.totalMessagesReceived).toBe(100);
      expect(metrics.activeRateLimiters).toBeLessThanOrEqual(5); // Should not grow indefinitely
    });

    test('should provide meaningful performance metrics', () => {
      RealtimePerformanceMonitor.initialize();
      
      // Add some sample data
      RealtimePerformanceMonitor.trackMessageReceived(1000, 'test1');
      RealtimePerformanceMonitor.trackMessageReceived(2000, 'test2');
      RealtimePerformanceMonitor.trackMessageReceived(500, 'test1');
      
      const metrics = RealtimePerformanceMonitor.getPerformanceMetrics();
      
      expect(metrics.totalMessagesReceived).toBe(3);
      expect(metrics.totalBytesReceived).toBe(3500);
      expect(metrics.averageMessageSize).toBeCloseTo(1166.67, 2);
      expect(metrics.activeRateLimiters).toBe(2);
    });
  });
});