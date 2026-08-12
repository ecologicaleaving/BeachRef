import { RealtimePerformanceMonitor } from '../RealtimePerformanceMonitor';
import { AppState } from 'react-native';

// Mock React Native AppState
// Nessun `jest.mock('react-native')` qui: vedi TESTING.md regola 2, e la nota
// identica in RealtimeSubscriptionService.test.ts. Sostituire l'intero modulo
// per avere il solo `AppState` cancellava `Platform` e impediva alla suite di
// caricare (issue #94).

// Mock global timers
jest.useFakeTimers();

describe('RealtimePerformanceMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    RealtimePerformanceMonitor.resetMetrics();
  });

  afterEach(() => {
    RealtimePerformanceMonitor.cleanup();
  });

  describe('Initialization', () => {
    test('should initialize correctly', () => {
      RealtimePerformanceMonitor.initialize();
      expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    test('should not initialize twice', () => {
      RealtimePerformanceMonitor.initialize();
      RealtimePerformanceMonitor.initialize();
      
      expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Message Tracking', () => {
    beforeEach(() => {
      RealtimePerformanceMonitor.initialize();
    });

    test('should track messages correctly', () => {
      const messageSize = 1024;
      const tournamentNo = 'TEST_TOURNAMENT';

      RealtimePerformanceMonitor.trackMessageReceived(messageSize, tournamentNo);
      RealtimePerformanceMonitor.trackMessageReceived(messageSize * 2, tournamentNo);

      const metrics = RealtimePerformanceMonitor.getPerformanceMetrics();
      expect(metrics.totalMessagesReceived).toBe(2);
      expect(metrics.totalBytesReceived).toBe(messageSize + messageSize * 2);
      expect(metrics.averageMessageSize).toBe((messageSize + messageSize * 2) / 2);
    });

    test('should enforce rate limiting', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const tournamentNo = 'RATE_LIMITED_TOURNAMENT';

      // Send 6 messages rapidly (exceeds limit of 5 per second)
      for (let i = 0; i < 6; i++) {
        RealtimePerformanceMonitor.trackMessageReceived(100, tournamentNo);
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        `Message rate limit exceeded for tournament ${tournamentNo}`
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Battery Optimization', () => {
    test('should detect battery optimization needs', () => {
      RealtimePerformanceMonitor.initialize();

      // Simulate poor connection performance
      const metrics = RealtimePerformanceMonitor.getPerformanceMetrics();
      
      // Track many failed connections
      for (let i = 0; i < 10; i++) {
        RealtimePerformanceMonitor['handleConnectionStateChange']('ERROR' as any, 'Connection failed');
      }

      expect(RealtimePerformanceMonitor.shouldOptimizeForBattery()).toBe(true);
    });

    test('should provide optimization recommendations', () => {
      RealtimePerformanceMonitor.initialize();

      // Simulate conditions that trigger recommendations
      for (let i = 0; i < 10; i++) {
        RealtimePerformanceMonitor['handleConnectionStateChange']('ERROR' as any);
      }

      const recommendations = RealtimePerformanceMonitor.getOptimizationRecommendations();
      expect(recommendations).toContain('Consider reducing reconnection frequency');
    });
  });

  describe('App State Changes', () => {
    test('should handle background state correctly', () => {
      RealtimePerformanceMonitor.initialize();
      
      const appStateCallback = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
      appStateCallback('background');

      const metrics = RealtimePerformanceMonitor.getPerformanceMetrics();
      expect(metrics.batteryOptimizationEvents).toBe(1);
      expect(metrics.isBackgroundOptimized).toBe(true);
    });

    test('should handle foreground state correctly', () => {
      RealtimePerformanceMonitor.initialize();
      
      const appStateCallback = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
      
      // Go to background first
      appStateCallback('background');
      
      // Then return to foreground
      appStateCallback('active');

      const metrics = RealtimePerformanceMonitor.getPerformanceMetrics();
      expect(metrics.foregroundReconnections).toBe(1);
      expect(metrics.isBackgroundOptimized).toBe(false);
    });

    test('should enable aggressive optimization after threshold', () => {
      RealtimePerformanceMonitor.initialize();
      
      const appStateCallback = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
      appStateCallback('background');

      // Fast-forward time past the battery optimization threshold
      jest.advanceTimersByTime(31000); // 31 seconds

      const metrics = RealtimePerformanceMonitor.getPerformanceMetrics();
      expect(metrics.backgroundDisconnections).toBe(1);
    });
  });

  describe('Memory Management', () => {
    test('should clean up old rate limiter data', () => {
      RealtimePerformanceMonitor.initialize();

      // Add some rate limiter data
      RealtimePerformanceMonitor.trackMessageReceived(100, 'TOURNAMENT_1');
      RealtimePerformanceMonitor.trackMessageReceived(100, 'TOURNAMENT_2');

      // La pulizia tiene UN MINUTO di dati (`now - time < 60000`). Il test
      // avanzava di cinque minuti e poi pretendeva che i limitatori fossero
      // "ancora recenti": erano stati buttati, correttamente. Si avanza quindi
      // meno della soglia.
      jest.advanceTimersByTime(30000); // 30 secondi: dentro la finestra

      // Rate limiters should still exist as they're recent
      const metrics = RealtimePerformanceMonitor.getPerformanceMetrics();
      expect(metrics.activeRateLimiters).toBe(2);

      // Fast-forward much more time
      jest.advanceTimersByTime(3600000); // 1 hour

      // Old rate limiters should be cleaned up
      //
      // La seconda meta' del test non verificava NIENTE: leggeva le metriche
      // in una variabile inutilizzata e lasciava una nota che ammetteva di non
      // controllare. La pulizia periodica gira davvero con i timer finti, e
      // dopo un'ora nessun limitatore puo' essere sopravvissuto.
      const metricsAfterCleanup = RealtimePerformanceMonitor.getPerformanceMetrics();
      expect(metricsAfterCleanup.activeRateLimiters).toBe(0);
    });
  });

  describe('Performance Reporting', () => {
    test('should calculate connection success rate correctly', () => {
      RealtimePerformanceMonitor.initialize();

      // Simulate mixed connection results
      for (let i = 0; i < 7; i++) {
        RealtimePerformanceMonitor['handleConnectionStateChange']('CONNECTED' as any);
      }
      for (let i = 0; i < 3; i++) {
        RealtimePerformanceMonitor['handleConnectionStateChange']('ERROR' as any);
      }

      const metrics = RealtimePerformanceMonitor.getPerformanceMetrics();
      expect(metrics.connectionSuccessRate).toBe(70); // 7/10 * 100
    });

    test('should generate performance reports', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      RealtimePerformanceMonitor.initialize();

      // Fast-forward to trigger performance report
      jest.advanceTimersByTime(600000); // 10 minutes

      expect(consoleSpy).toHaveBeenCalledWith(
        'Performance Monitor Report:',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup all resources', () => {
      RealtimePerformanceMonitor.initialize();
      
      // Add some data
      RealtimePerformanceMonitor.trackMessageReceived(100, 'TEST');
      
      // Cleanup
      RealtimePerformanceMonitor.cleanup();
      
      // Verify cleanup
      const metrics = RealtimePerformanceMonitor.getPerformanceMetrics();
      expect(metrics.activeRateLimiters).toBe(0);
    });
  });

  describe('Metrics Reset', () => {
    test('should reset metrics correctly', () => {
      RealtimePerformanceMonitor.initialize();
      
      // Add some data
      RealtimePerformanceMonitor.trackMessageReceived(1000, 'TEST');
      RealtimePerformanceMonitor['handleConnectionStateChange']('CONNECTED' as any);
      
      // Reset metrics
      RealtimePerformanceMonitor.resetMetrics();
      
      const metrics = RealtimePerformanceMonitor.getPerformanceMetrics();
      expect(metrics.totalMessagesReceived).toBe(0);
      expect(metrics.totalBytesReceived).toBe(0);
      expect(metrics.connectionAttempts).toBe(0);
    });
  });
});