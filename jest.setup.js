// Jest setup for testing
// Skip react-native-gesture-handler for service tests

// Mock AsyncStorage with proper implementation
jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = {};
  return {
    default: {
      getItem: jest.fn((key) => Promise.resolve(storage[key] || null)),
      setItem: jest.fn((key, value) => {
        storage[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key) => {
        delete storage[key];
        return Promise.resolve();
      }),
      multiRemove: jest.fn((keys) => {
        keys.forEach(key => delete storage[key]);
        return Promise.resolve();
      }),
      getAllKeys: jest.fn(() => Promise.resolve(Object.keys(storage))),
      clear: jest.fn(() => {
        Object.keys(storage).forEach(key => delete storage[key]);
        return Promise.resolve();
      }),
    }
  };
});

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Stack: ({ children }) => children,
  Tabs: ({ children }) => children,
}));

// Mock expo modules
jest.mock('expo-constants', () => ({
  default: {
    appVersion: '1.0.0',
    platform: {
      ios: {},
    },
  },
}));

// Mock NetInfo for network tests
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    type: 'wifi',
    isInternetReachable: true,
  })),
  refresh: jest.fn(() => Promise.resolve({
    isConnected: true,
    type: 'wifi', 
    isInternetReachable: true,
  })),
}));

// Mock Supabase
jest.mock('./services/supabase', () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(() => Promise.resolve({ status: 'SUBSCRIBED' })),
      unsubscribe: jest.fn(() => Promise.resolve({ status: 'CLOSED' })),
    })),
    removeChannel: jest.fn(() => Promise.resolve()),
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
    })),
  },
  testSupabaseConnection: jest.fn(() => Promise.resolve(true)),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: jest.fn(),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// Silence console warnings during tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// NOTE: timers are deliberately NOT faked globally.
//
// A global `jest.useFakeTimers({ legacyFakeTimers: true })` froze `setTimeout`
// for every suite, so any code path with a retry/backoff delay (VisApiClient's
// retry logic, polling services, circuit breakers) hung until the 5s jest
// timeout — 128 test timeouts across the repo, none of them real bugs.
//
// Suites that need to control time must opt in themselves, in their own
// `beforeEach`:
//
//     jest.useFakeTimers();
//     // ... jest.advanceTimersByTime(1000) ...
//     afterEach(() => jest.useRealTimers());

// Custom Jest matchers
expect.extend({
  toBeOneOf(received, validValues) {
    const pass = validValues.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of [${validValues.join(', ')}]`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of [${validValues.join(', ')}]`,
        pass: false,
      };
    }
  },
});