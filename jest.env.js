// Set up environment variables for Jest tests
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://mock-supabase-url.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'mock-supabase-anon-key';

// Mock global objects that React Native provides
global.__DEV__ = true;

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  return Object.setPrototypeOf({
    AppState: {
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      currentState: 'active',
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
      addEventListener: jest.fn(),
    },
    Platform: {
      OS: 'ios',
      select: jest.fn((obj) => obj.ios || obj.default),
    },
    // `StyleSheet.create` vero passa dal bridge nativo: qualunque modulo che
    // crei stili a livello di modulo (cioe' quasi ogni componente) moriva
    // all'import con `Invariant Violation: __fbBatchedBridgeConfig is not set,
    // cannot invoke native modules`, e con esso l'intera suite che lo importava
    // (issue #94).
    //
    // La sostituzione e' fedele al contratto reale: dalla RN 0.56 `create`
    // restituisce l'oggetto stili cosi' com'e' (niente piu' ID numerici
    // opachi), quindi un test puo' asserire su `styles.foo.borderRadius`
    // esattamente come fa in produzione. `flatten` unisce array e valori
    // falsy come l'originale.
    StyleSheet: {
      create: (styles) => styles,
      flatten: function flatten(style) {
        if (!style) return {};
        if (!Array.isArray(style)) return style;
        return style.reduce((acc, s) => Object.assign(acc, s ? flatten(s) : null), {});
      },
      absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
      absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
      hairlineWidth: 1,
      compose: (a, b) => (a && b ? [a, b] : a || b),
    },
  }, RN);
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock Expo modules
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        eas: {
          projectId: 'mock-project-id',
        },
      },
    },
  },
}));

// Set up fetch mock
global.fetch = jest.fn();

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};