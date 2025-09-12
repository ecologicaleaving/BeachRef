import NetworkStateManager, { ConnectionStrategy, NetworkState, ConnectionQuality } from '../NetworkStateManager';

// Mock NetInfo properly
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

// Mock fetch for latency measurement  
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('NetworkStateManager', () => {
  let manager: NetworkStateManager;
  const NetInfo = require('@react-native-community/netinfo');

  beforeEach(() => {
    jest.clearAllMocks();
    NetworkStateManager.resetInstance();
    
    // Setup default mocks
    NetInfo.fetch.mockResolvedValue({
      isConnected: true,
      type: 'wifi',
      isInternetReachable: true,
      details: {
        strength: 85,
        ssid: 'TestWiFi',
        bssid: '00:11:22:33:44:55',
      }
    });

    // Mock addEventListener to return unsubscribe function
    const mockUnsubscribe = jest.fn();
    NetInfo.addEventListener.mockReturnValue(mockUnsubscribe);

    // Mock fetch for latency measurement
    mockFetch.mockResolvedValue({ ok: true });

    manager = NetworkStateManager.getInstance();
  });

  afterEach(() => {
    if (manager) {
      manager.cleanup();
    }
    NetworkStateManager.resetInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = NetworkStateManager.getInstance();
      const instance2 = NetworkStateManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should reset instance properly', () => {
      const instance1 = NetworkStateManager.getInstance();
      NetworkStateManager.resetInstance();
      const instance2 = NetworkStateManager.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Network State Detection', () => {
    it('should initialize with network state from NetInfo', async () => {
      await manager.waitForInitialization(2000);
      
      const networkState = manager.getCurrentNetworkState();
      expect(networkState).toMatchObject({
        isConnected: true,
        type: 'wifi',
        isInternetReachable: true,
      });
    });

    it('should handle NetInfo initialization failure gracefully', async () => {
      NetworkStateManager.resetInstance();
      NetInfo.fetch.mockRejectedValue(new Error('Network error'));

      const failingManager = NetworkStateManager.getInstance();
      await failingManager.waitForInitialization(2000);

      const networkState = failingManager.getCurrentNetworkState();
      expect(networkState).toMatchObject({
        isConnected: false,
        type: 'unknown',
        isInternetReachable: false,
      });

      failingManager.cleanup();
    });

    it('should map different network types correctly', async () => {
      const testCases = [
        { netInfoType: 'cellular', expected: 'cellular' },
        { netInfoType: 'wifi', expected: 'wifi' },
        { netInfoType: 'ethernet', expected: 'ethernet' },
        { netInfoType: 'bluetooth', expected: 'unknown' },
        { netInfoType: null, expected: 'unknown' },
      ];

      for (const testCase of testCases) {
        NetworkStateManager.resetInstance();
        NetInfo.fetch.mockResolvedValue({
          isConnected: true,
          type: testCase.netInfoType,
          isInternetReachable: true,
          details: {}
        });

        const testManager = NetworkStateManager.getInstance();
        await testManager.waitForInitialization(1000);

        const networkState = testManager.getCurrentNetworkState();
        expect(networkState?.type).toBe(testCase.expected);

        testManager.cleanup();
      }
    });
  });

  describe('Connection Quality Assessment', () => {
    it('should assess connection quality correctly', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      
      await manager.waitForInitialization(1000);
      await manager.forceQualityReassessment();
      
      const quality = manager.getCurrentConnectionQuality();
      expect(quality).toBeTruthy();
      expect(quality?.score).toBeGreaterThan(0);
      expect(quality?.level).toBeTruthy();
      expect(quality?.recommendation).toBeTruthy();
    });

    it('should recommend different strategies based on quality', async () => {
      await manager.waitForInitialization(1000);
      
      const quality = manager.getCurrentConnectionQuality();
      expect(quality?.recommendation).toBeDefined();
      expect(Object.values(ConnectionStrategy)).toContain(quality?.recommendation);
    });

    it('should handle latency measurement failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'));

      await manager.waitForInitialization(1000);
      await manager.forceQualityReassessment();
      
      const quality = manager.getCurrentConnectionQuality();
      expect(quality?.level).toBe('poor');
      expect(quality?.recommendation).toBe(ConnectionStrategy.POLLING_ONLY);
    });
  });

  describe('Exponential Backoff', () => {
    it('should calculate exponential backoff with jitter', () => {
      const delay1 = manager.getExponentialBackoffDelay(0, 1000);
      const delay2 = manager.getExponentialBackoffDelay(1, 1000);
      const delay3 = manager.getExponentialBackoffDelay(2, 1000);

      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay2).toBeGreaterThanOrEqual(1000);
      expect(delay3).toBeGreaterThanOrEqual(1000);
      
      // Should have exponential growth trend (allowing for jitter)
      expect(delay2).toBeGreaterThan(delay1 * 0.8);
      expect(delay3).toBeGreaterThan(delay2 * 0.8);
    });

    it('should respect maximum delay', () => {
      const maxDelay = 5000;
      const delay = manager.getExponentialBackoffDelay(10, 1000, maxDelay);
      expect(delay).toBeLessThanOrEqual(maxDelay);
    });

    it('should have minimum delay of 1 second', () => {
      const delay = manager.getExponentialBackoffDelay(0, 100, 200);
      expect(delay).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('Network Change Listeners', () => {
    it('should notify listeners of network state changes', async () => {
      await manager.waitForInitialization(1000);
      
      const listener = jest.fn();
      const unsubscribe = manager.addNetworkChangeListener(listener);

      // Should be called immediately with current state
      expect(listener).toHaveBeenCalled();

      // Get the NetInfo change handler that was registered
      const netInfoChangeHandler = NetInfo.addEventListener.mock.calls[0][0];
      
      // Simulate network change
      netInfoChangeHandler({
        isConnected: true,
        type: 'cellular',
        isInternetReachable: true,
        details: { cellularGeneration: '4g' }
      });

      expect(listener).toHaveBeenCalledTimes(2);
      unsubscribe();
    });

    it('should handle listener errors gracefully', async () => {
      await manager.waitForInitialization(1000);
      
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });

      const unsubscribe = manager.addNetworkChangeListener(errorListener);

      // Get the NetInfo change handler  
      const netInfoChangeHandler = NetInfo.addEventListener.mock.calls[0][0];

      // Should not throw even when listener throws
      expect(() => {
        netInfoChangeHandler({
          isConnected: false,
          type: 'none',
          isInternetReachable: false,
          details: {}
        });
      }).not.toThrow();

      unsubscribe();
    });
  });

  describe('Connection Strategy Configuration', () => {
    it('should return appropriate config for different strategies', () => {
      const aggressiveConfig = manager.getAdaptiveConnectionConfig(ConnectionStrategy.AGGRESSIVE_WEBSOCKET);
      const conservativeConfig = manager.getAdaptiveConnectionConfig(ConnectionStrategy.CONSERVATIVE_WEBSOCKET);
      const pollingConfig = manager.getAdaptiveConnectionConfig(ConnectionStrategy.POLLING_ONLY);

      expect(aggressiveConfig.reconnectDelay).toBeLessThan(conservativeConfig.reconnectDelay);
      expect(aggressiveConfig.heartbeatInterval).toBeLessThan(conservativeConfig.heartbeatInterval);
      expect(pollingConfig.pollInterval).toBeTruthy();
    });

    it('should use recommended strategy when none provided', () => {
      const config = manager.getAdaptiveConnectionConfig();
      expect(config).toBeTruthy();
      expect(config.reconnectDelay).toBeGreaterThan(0);
    });
  });

  describe('Network Type Optimizations', () => {
    it('should identify when to use cellular optimizations', async () => {
      await manager.waitForInitialization(1000);
      // For Wi-Fi with good quality, should not use cellular optimizations
      expect(manager.shouldUseCellularOptimizations()).toBe(false);
    });

    it('should identify when network supports aggressive reconnection', async () => {
      await manager.waitForInitialization(1000);
      // Wi-Fi with good quality should support aggressive reconnection
      expect(manager.supportsAggressiveReconnection()).toBe(true);
    });

    it('should adjust recommendations for cellular networks', async () => {
      NetworkStateManager.resetInstance();
      NetInfo.fetch.mockResolvedValue({
        isConnected: true,
        type: 'cellular',
        isInternetReachable: true,
        details: { cellularGeneration: '3g' }
      });

      const cellularManager = NetworkStateManager.getInstance();
      await cellularManager.waitForInitialization(1000);

      expect(cellularManager.shouldUseCellularOptimizations()).toBe(true);
      expect(cellularManager.supportsAggressiveReconnection()).toBe(false);

      cellularManager.cleanup();
    });
  });

  describe('Connection Statistics', () => {
    it('should track connection statistics over time', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      
      await manager.waitForInitialization(1000);
      // Force multiple quality assessments
      await manager.forceQualityReassessment();
      await manager.forceQualityReassessment();

      const stats = manager.getConnectionStats();
      expect(stats.currentQuality).toBeGreaterThan(0);
      expect(stats.averageQuality).toBeGreaterThan(0);
      expect(stats.averageLatency).toBeGreaterThan(0);
      expect(['improving', 'stable', 'degrading']).toContain(stats.stabilityTrend);
    });

    it('should determine stability trends correctly', async () => {
      // Simulate fast, consistent responses for improved quality
      mockFetch.mockResolvedValue({ ok: true });

      await manager.waitForInitialization(1000);
      // Force multiple assessments to build trend data
      for (let i = 0; i < 3; i++) {
        await manager.forceQualityReassessment();
      }

      const stats = manager.getConnectionStats();
      expect(['improving', 'stable', 'degrading']).toContain(stats.stabilityTrend);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', () => {
      const unsubscribeListener = jest.fn();
      NetInfo.addEventListener.mockReturnValue(unsubscribeListener);

      const cleanupManager = NetworkStateManager.getInstance();
      cleanupManager.cleanup();

      expect(unsubscribeListener).toHaveBeenCalled();
    });
  });
});