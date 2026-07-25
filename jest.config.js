module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  setupFiles: ['<rootDir>/jest.env.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // `babel-preset-expo` rewrites every `process.env.EXPO_PUBLIC_*` read into an
    // import from `expo/virtual/env`, which is pure ESM and unparseable by the
    // jest transform. Mapping it here fixes the problem once, at the root, for
    // every file in the project instead of per-test `jest.mock` calls.
    '^expo/virtual/env$': '<rootDir>/__mocks__/expo-virtual-env.js',
    // Native (JSI) module with no JS fallback — replaced by an in-memory store.
    '^react-native-mmkv$': '<rootDir>/__mocks__/react-native-mmkv.js',
  },
  testMatch: [
    '**/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '**/?(*.)+(spec|test).{js,jsx,ts,tsx}',
  ],
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'screens/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    '!**/__tests__/**',
    '!**/*.d.ts',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript'
      ]
    }],
    // Without this entry jest applies NO transform to `.js`/`.jsx`/`.mjs`
    // (declaring `transform` replaces the default map), so any ESM-only
    // dependency escaping `transformIgnorePatterns` still exploded on `export`.
    // `@react-native/babel-preset` is used here (and not `preset-env` alone)
    // because react-native itself ships untranspiled Flow + JSX sources, which
    // `jest.env.js` loads via `requireActual('react-native')`.
    '^.+\\.(js|jsx|mjs)$': ['babel-jest', {
      presets: ['@react-native/babel-preset'],
      // node_modules ship their own babel configs; ignore them.
      babelrc: false,
      configFile: false,
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transformIgnorePatterns: [
    // Everything listed here IS transformed. These packages ship ESM (or Flow,
    // for react-native itself) and would otherwise blow up on `export`/`import`.
    // `uuid` >= 9 is ESM-only and is imported statically by VisApiClient.
    'node_modules/(?!(@supabase|@testing-library|@sentry|@tanstack|@react-native|@react-native-community|@react-navigation|@expo|expo|expo-[^/]+|react-native|react-native-[^/]+|uuid)/)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/.*\\.tsx$', // Skip tsx test files for now due to React Native setup complexity
    // Supabase Edge Functions are Deno programs: their tests import
    // `https://deno.land/...` and use the `Deno` global. They are executed by
    // `deno test`, never by jest — running them here only produced noise.
    '/supabase/functions/',
    '/supabase/tests/functions/',
    // Two stray Deno test files living outside supabase/ (same reason).
    '__tests__/performance/sync-performance\\.test\\.ts$',
    '__tests__/error-scenarios/sync-error-handling\\.test\\.ts$',
  ],
};