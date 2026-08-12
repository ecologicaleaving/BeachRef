// Set up environment variables for Jest tests
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://mock-supabase-url.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'mock-supabase-anon-key';

// Mock global objects that React Native provides
global.__DEV__ = true;

// NON definire `global.window` qui (issue #94).
//
// Sembra la correzione ovvia per `ReferenceError: window is not defined`, e il
// runtime di React Native in effetti definisce `window` come alias di `global`.
// Ma in QUESTO codebase almeno due moduli decidono di essere sul web proprio
// da quella assenza:
//
//   services/api/VisApiClient.ts:55   const isWebEnvironment = typeof window !== 'undefined'
//   services/supabase.ts:18           const isClient = typeof window !== 'undefined'
//
// piu' `app/_layout.tsx`, `utils/memoryProfiler.ts`, `MatchListV2` e altri.
// Definirlo fa credere a tutti loro di girare in un browser, cambia il
// comportamento sotto test di codice che nessuno stava testando, e — misurato —
// fa passare una suite da verde a rossa.
//
// Il posto giusto per `window` e' il singolo test che ne ha bisogno, e la
// risposta di solito e' che non ne ha bisogno: usa `global`.

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

// AsyncStorage e' mockato in `jest.setup.js`, non qui (issue #94).
//
// Qui ce n'era un secondo, cieco: `getItem` restituiva sempre `null` e
// `setItem` non memorizzava. Due `jest.mock` sullo stesso modulo, in due file
// diversi, con due comportamenti incompatibili — e quale vincesse dipendeva
// dall'ordine fra `setupFiles` e `setupFilesAfterEnv`, cioe' da un dettaglio
// di configurazione che nessuno stava guardando. Ne resta uno solo, quello con
// una memoria vera.

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

// Fetch mock — con un comportamento di default, e non e' un dettaglio.
//
// `jest.fn()` nudo restituisce `undefined`, e il client VIS fa `response.ok`.
// Il risultato non e' "nessuno ha mockato la fetch": e' un TypeError dentro una
// promessa che nessuno attende, che rimbalza fuori dal test e spesso fuori
// dall'intero file — e jest lo attribuisce al primo test del file che gira
// dopo, nello stesso worker. Cosi' `useOfflineSync` e `useAssignmentCountdown`
// morivano a run alterni lamentando `BeachMatchList`, che nessuna delle due
// interroga (issue #94).
//
// Il default e' quindi una risposta BEN FORMATA che fallisce: il percorso di
// errore del client viene esercitato per davvero e il rifiuto ha un padrone.
// I test che vogliono un'altra risposta continuano a impostarla come prima.
global.fetch = jest.fn(async () => ({
  ok: false,
  status: 503,
  statusText: 'Service Unavailable (fetch non mockata in questo test)',
  headers: { get: () => null },
  text: async () => '',
  json: async () => ({}),
}));

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};