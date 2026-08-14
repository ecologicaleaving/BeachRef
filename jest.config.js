// I test `.tsx` ancora da riparare (issue #111). Vedi il commento accanto a
// `...TSX_IN_QUARANTENA` in `testPathIgnorePatterns`: questa lista si accorcia,
// non si allunga. Ogni voce porta la famiglia di fallimento che la tiene qui,
// cosi' chi la prende in mano sa cosa aspettarsi prima di aprirla.
const TSX_IN_QUARANTENA = [
  '__tests__/accessibility\\.test\\.tsx$', //                           text, role
  '__tests__/components/Hierarchy/InformationArchitecture\\.test\\.tsx$', // text
  '__tests__/components/MatchCard\\.test\\.tsx$', //                    text
  '__tests__/components/TournamentDetail\\.test\\.tsx$', //             text
  '__tests__/components/navigation/GlobalStatusBar\\.test\\.tsx$', //   text
  '__tests__/components/navigation/TimezoneToggle\\.test\\.tsx$', //    text
  '__tests__/integration/RealtimeIntegration\\.test\\.tsx$', //         Cannot find module
  '__tests__/screens/MyAssignmentsScreen\\.enhanced\\.test\\.tsx$', //  text
  '__tests__/screens/RefereeDashboardHierarchy\\.test\\.tsx$', //       text
  '__tests__/screens/RefereeDashboardScreen\\.test\\.tsx$', //          text
  'components/RefereeAnalytics/__tests__/RefereeAnalyticsDashboard\\.test\\.tsx$', // text
  'components/__tests__/TournamentDetail\\.matches\\.integration\\.test\\.tsx$', //   text
  'components/__tests__/live-score/LiveScoreCard\\.test\\.tsx$', //     toHaveBeenCalledTimes
  'components/__tests__/live-score/MatchStatusIndicators\\.test\\.tsx$', // text
  'components/entities/Referee/__tests__/RefereeCard\\.analytics\\.test\\.tsx$', //   text
  'components/referee/__tests__/AssignmentCards\\.test\\.tsx$', //      text
  'components/referee/__tests__/CompletedMatchCard\\.test\\.tsx$', //   text
  'components/referee/__tests__/LiveMatchCard\\.test\\.tsx$', //        text
  'screens/__tests__/MatchResultsScreen\\.test\\.tsx$', //              text
  'screens/__tests__/MyAssignmentsScreen\\.test\\.tsx$', //             text
];

// Shared configuration for both projects below.
const base = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // L'ORDINE CONTA (issue #101): `jest.native-modules.js` deve girare per
  // primo, perche' fornisce `global.nativeModuleProxy` — il ramo che
  // `NativeModules.js` prende PRIMA di sollevare `Invariant Violation:
  // __fbBatchedBridgeConfig is not set`. Deve essere in piedi quando il
  // `jest.mock('react-native')` di `jest.env.js` fa `requireActual` e con esso
  // carica il primo modulo nativo. Invertirli riporta l'invariant.
  setupFiles: ['<rootDir>/jest.native-modules.js', '<rootDir>/jest.env.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // `babel-preset-expo` rewrites every `process.env.EXPO_PUBLIC_*` read into an
    // import from `expo/virtual/env`, which is pure ESM and unparseable by the
    // jest transform. Mapping it here fixes the problem once, at the root, for
    // every file in the project instead of per-test `jest.mock` calls.
    '^expo/virtual/env$': '<rootDir>/__mocks__/expo-virtual-env.js',
    // Native (JSI) module with no JS fallback — replaced by an in-memory store.
    '^react-native-mmkv$': '<rootDir>/__mocks__/react-native-mmkv.js',
    // Ogni set di `@expo/vector-icons` passa da `expo-modules-core`, che sotto
    // jest non ha runtime nativo: il primo import solleva
    // `Cannot read properties of undefined (reading 'NativeModule')` e fa
    // morire l'intera suite. Colpisce chiunque importi
    // `components/Icons/vectorIconSets`, cioe' quasi ogni componente che
    // disegna un'icona (issue #94). Il pattern copre sia il barrel sia i
    // sottopercorsi `@expo/vector-icons/Feather`.
    '^@expo/vector-icons(/.*)?$': '<rootDir>/__mocks__/expo-vector-icons.js',
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
  // React Native distribuisce i moduli in varianti per piattaforma
  // (`Platform.ios.js`, `Platform.android.js`) e nessun `Platform.js`. Senza
  // questa configurazione jest non risolve gli import RELATIVI INTERNI di
  // react-native: `node_modules/react-native/Libraries/StyleSheet/processColor.js`
  // richiede `../Utilities/Platform` e fallisce con `Cannot find module`,
  // quindi qualunque test che renderizzi un componente vero muore (issue #94).
  //
  // E' cio' che il preset `react-native` imposta di suo; questo progetto non lo
  // usa (compone i transform a mano, vedi TESTING.md) e quindi deve dichiararlo.
  // `ios` come default e' coerente con `Platform.OS: 'ios'` in `jest.env.js`.
  haste: {
    defaultPlatform: 'ios',
    platforms: ['android', 'ios', 'native'],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  // The companion of the `/\.claude/` entry in `testPathIgnorePatterns` below.
  // That one stops jest *running* the worktree copies; this one stops it
  // *indexing* them. Without it the module map still crawls all 13 checkouts
  // and emits ~104 "haste module naming collision" warnings for the duplicated
  // `__mocks__/expo-virtual-env.js` and `__mocks__/react-native-mmkv.js` —
  // noise that buries real failures, on top of the crawl cost.
  modulePathIgnorePatterns: ['/\\.claude/'],
  transformIgnorePatterns: [
    // Everything listed here IS transformed. These packages ship ESM (or Flow,
    // for react-native itself) and would otherwise blow up on `export`/`import`.
    // `uuid` >= 9 is ESM-only and is imported statically by VisApiClient.
    'node_modules/(?!(@supabase|@testing-library|@sentry|@tanstack|@react-native|@react-native-community|@react-navigation|@expo|expo|expo-[^/]+|react-native|react-native-[^/]+|uuid)/)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    // Agent worktrees (issue #89). `.claude/worktrees/` holds one full checkout
    // per past agent session — 13 of them at the time of writing, each a
    // complete copy of this repository on an old feature branch. Without this
    // line jest discovers the suite 14 times over: the run takes many minutes
    // and reports failures from branches nobody is working on, attributed to
    // files whose path merely *looks* like the project's. The directory is
    // gitignored (.gitignore:98) and `scripts/audit/config.ts` already excludes
    // `.claude/**`; jest was the last tool still reading it.
    '/\\.claude/',
    // I test `.tsx` NON sono piu' esclusi in blocco (issue #111).
    //
    // Lo sono stati da sempre, con la motivazione "React Native setup
    // complexity". Dalla #101 non e' piu' vera: l'ambiente monta react-native
    // (`jest.native-modules.js`, barriera in
    // `__tests__/jest-native-modules.test.ts`). Misurato togliendo
    // l'esclusione, i 28 file si montavano tutti — **zero**
    // `__fbBatchedBridgeConfig`, **zero** `ReferenceError: window` — e
    // fallivano su asserzioni proprie, invecchiate in un anno in cui nessuno
    // le eseguiva.
    //
    // Un'esclusione a tappeto e una riabilitazione a tappeto sono entrambe
    // sbagliate: la prima nasconde 28 file, la seconda aggiunge ~148 rossi a
    // una suite che la #94 ha portato a zero. Al loro posto c'e' una
    // QUARANTENA NOMINALE: i file ancora da riparare sono elencati uno per
    // uno qui sotto, e ogni riparazione ne toglie una riga. Quando la lista e'
    // vuota, spariscono lista e commento.
    //
    // Regola: si esce da questa lista riparando il test, MAI allargando
    // l'assert. Dove il test dice il vero e il codice no, il rosso e' il
    // risultato utile e diventa una issue.
    ...TSX_IN_QUARANTENA,
    // Supabase Edge Functions are Deno programs: their tests import
    // `https://deno.land/...` and use the `Deno` global. They are executed by
    // `deno test`, never by jest — running them here only produced noise.
    '/supabase/functions/',
    '/supabase/tests/functions/',
    // Two stray Deno test files living outside supabase/ (same reason).
    '__tests__/performance/sync-performance\\.test\\.ts$',
    '__tests__/error-scenarios/sync-error-handling\\.test\\.ts$',
    // Same reason: it imports `supabase/functions/vis-adapter/index.ts`, whose
    // own first import is `std/http/server.ts` — a Deno URL specifier jest
    // cannot resolve. It is a `deno test`, filed under __tests__/integration/.
    '__tests__/integration/timezone-vis-api\\.test\\.ts$',
  ],
};

// Two projects, because `__tests__/integration/` needs one extra setup file.
//
// Those suites use `global.testUtils.addCleanup()` and the custom matchers
// (`toHaveValidDTOStructure`, `toBeWithinPerformanceRange`) defined in
// `__tests__/integration/setup/jest.integration.setup.js`. That file is only
// wired into `npm run test:integration`, but `testMatch` above also picks the
// same suites up under plain `npm test` — where the globals do not exist, so
// every one of them died on `Cannot read properties of undefined (reading
// 'addCleanup')`. Declaring them as a separate project gives them their setup
// in the default run too, instead of excluding them from it.
module.exports = {
  projects: [
    {
      ...base,
      displayName: 'unit',
      testPathIgnorePatterns: [...base.testPathIgnorePatterns, '/__tests__/integration/'],
    },
    {
      ...base,
      displayName: 'integration',
      setupFilesAfterEnv: [
        ...base.setupFilesAfterEnv,
        '<rootDir>/__tests__/integration/setup/jest.integration.setup.js',
      ],
      testMatch: ['**/__tests__/integration/**/*.test.{js,jsx,ts,tsx}'],
    },
  ],
};