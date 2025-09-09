/**
 * Jest setup for integration tests
 * Story 3.5: Integration Testing & Performance Validation
 */

// Extend default timeout for integration tests
jest.setTimeout(30000);

// Mock React Query DevTools for integration tests
jest.mock('../../../components/DevTools/QueryDevTools', () => ({
  QueryDevTools: () => null,
  queryDebugUtils: {
    logCacheState: jest.fn(),
    logQueryState: jest.fn(),
    invalidateAll: jest.fn(),
    clearCache: jest.fn(),
  },
  useQueryDebug: () => ({
    logCacheState: jest.fn(),
    logQueryState: jest.fn(),
    invalidateAll: jest.fn(),
    clearCache: jest.fn(),
  }),
}));

// Mock feature flags for integration tests
jest.mock('../../../hooks/compatibility/FeatureFlags', () => ({
  featureFlags: {
    shouldUseNewHook: jest.fn().mockReturnValue(true),
    recordError: jest.fn(),
    getPerformanceMetrics: jest.fn().mockReturnValue({
      errorCount: 0,
      successRate: 100,
      averageResponseTime: 150,
    }),
  },
  FeatureFlagManager: {
    getInstance: jest.fn().mockReturnValue({
      isEnabled: jest.fn().mockReturnValue(true),
      recordMetric: jest.fn(),
      getMetrics: jest.fn().mockReturnValue({}),
    }),
  },
}));

// Mock TanStack Query DevTools for integration tests
jest.mock('@tanstack/react-query-devtools', () => ({
  ReactQueryDevtools: () => null,
}));

// Performance measurement utilities
global.performanceUtils = {
  measurements: new Map(),
  start: (label) => {
    global.performanceUtils.measurements.set(`${label}_start`, performance.now());
  },
  end: (label) => {
    const startTime = global.performanceUtils.measurements.get(`${label}_start`);
    if (startTime) {
      const duration = performance.now() - startTime;
      global.performanceUtils.measurements.set(`${label}_duration`, duration);
      return duration;
    }
    return 0;
  },
  get: (label) => {
    return global.performanceUtils.measurements.get(`${label}_duration`) || 0;
  },
  clear: () => {
    global.performanceUtils.measurements.clear();
  },
};

// Network condition simulation utilities
global.networkUtils = {
  simulateOffline: () => {
    // Mock NetInfo to return offline state
    const NetInfo = require('@react-native-community/netinfo');
    NetInfo.fetch.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
    });
    
    // Mock fetch to reject with network error
    global.fetch = jest.fn().mockRejectedValue(new Error('Network request failed'));
  },
  simulateOnline: () => {
    // Mock NetInfo to return online state
    const NetInfo = require('@react-native-community/netinfo');
    NetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });
    
    // Restore normal fetch behavior (will be handled by VisAdapterMock)
    if (global.fetch && global.fetch.mockRestore) {
      global.fetch.mockRestore();
    }
  },
  simulateSlowNetwork: (delayMs = 3000) => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockImplementation(async (...args) => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      if (originalFetch && originalFetch.mockImplementation) {
        return originalFetch(...args);
      }
      throw new Error('Slow network simulation: original fetch not available');
    });
  },
};

// Database test utilities
global.databaseUtils = {
  waitForSync: async (timeout = 10000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      // In a real implementation, this would check actual sync status
      await new Promise(resolve => setTimeout(resolve, 100));
      // For now, just simulate completion after a short delay
      if (Date.now() - startTime > 1000) {
        return true;
      }
    }
    throw new Error(`Sync timeout after ${timeout}ms`);
  },
  verifyDataConsistency: async (visData, dbData) => {
    // Mock data consistency verification
    // In real implementation, this would compare actual data structures
    return Array.isArray(visData) && Array.isArray(dbData) && visData.length === dbData.length;
  },
};

// Test isolation utilities
let testCleanupFunctions = [];

global.testUtils = {
  addCleanup: (cleanupFn) => {
    testCleanupFunctions.push(cleanupFn);
  },
  cleanup: async () => {
    for (const cleanup of testCleanupFunctions.reverse()) {
      try {
        await cleanup();
      } catch (error) {
        console.warn('Cleanup warning:', error);
      }
    }
    testCleanupFunctions = [];
  },
};

// Clean up after each test
afterEach(async () => {
  await global.testUtils.cleanup();
  global.performanceUtils.clear();
  
  // Reset all mocks
  jest.clearAllMocks();
});

// Enhanced expect matchers for integration tests
expect.extend({
  toBeWithinPerformanceRange(received, expectedMin, expectedMax) {
    const pass = received >= expectedMin && received <= expectedMax;
    if (pass) {
      return {
        message: () => `expected ${received}ms not to be within ${expectedMin}-${expectedMax}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received}ms to be within ${expectedMin}-${expectedMax}ms`,
        pass: false,
      };
    }
  },
  
  toHaveValidDTOStructure(received, dtoType) {
    let isValid = false;
    
    switch (dtoType) {
      case 'TournamentDTO':
        isValid = received && 
          typeof received.id === 'string' &&
          typeof received.visNo === 'string' &&
          typeof received.tournamentCode === 'string' &&
          typeof received.name === 'string';
        break;
      case 'MatchDTO':
        isValid = received &&
          typeof received.id === 'string' &&
          typeof received.visNo === 'string' &&
          typeof received.tournamentCode === 'string' &&
          received.team1 && received.team2;
        break;
      case 'RefereeDTO':
        isValid = received &&
          typeof received.id === 'string' &&
          typeof received.visRefereeNo === 'string';
        break;
    }
    
    if (isValid) {
      return {
        message: () => `expected object not to be a valid ${dtoType}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected object to be a valid ${dtoType}`,
        pass: false,
      };
    }
  },
});

// Log integration test environment info
console.log('Integration test environment initialized');
console.log('- Extended timeout: 30 seconds');
console.log('- Performance utilities available');
console.log('- Network simulation utilities available');
console.log('- Database test utilities available');
console.log('- Enhanced expect matchers loaded');