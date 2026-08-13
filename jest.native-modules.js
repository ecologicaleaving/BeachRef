// Rende montabili i componenti React Native sotto jest (issue #101).
//
// ── Il problema ────────────────────────────────────────────────────────────
//
// Renderizzare una `<View>` non tocca solo React. La catena e':
//
//   View -> ViewNativeComponent -> NativeComponentRegistry
//        -> getNativeComponentAttributes -> processColor
//        -> Platform.ios -> NativePlatformConstantsIOS
//        -> TurboModuleRegistry.get -> NativeModules
//        -> Invariant Violation: __fbBatchedBridgeConfig is not set
//
// Mockare `Platform` e `StyleSheet` sull'export pubblico di `react-native`,
// come fa `jest.env.js`, non serve a niente qui: quella catena passa dagli
// import RELATIVI INTERNI di react-native, non dall'export pubblico.
//
// ── Perche' non il preset ufficiale ────────────────────────────────────────
//
// La strada ovvia sarebbe `react-native/jest/setup.js`. E' stata tentata nella
// #101 e ritirata: appende il runner (>9 minuti su due suite, nessun output)
// perche' collide con il `jest.mock('react-native')` di `jest.env.js`, che fa
// `requireActual`. E comunque non sarebbe adottabile cosi' com'e', perche' alla
// riga 58 definisce
//
//   window: { value: global }
//
// che e' esattamente cio' che `jest.env.js` vieta, con una misura a supporto
// (issue #94): in questo codebase almeno cinque moduli — `VisApiClient`,
// `services/supabase.ts`, `app/_layout.tsx`, `utils/memoryProfiler.ts`,
// `MatchListV2` — deducono di girare su web dall'ASSENZA di `window`.
// Definirlo li fa credere di essere in un browser e porta suite verdi al rosso.
//
// ── Cosa fa invece questo file ─────────────────────────────────────────────
//
// Taglia la catena nel punto in cui nasce, che non e' `TurboModuleRegistry` ma
// il modulo sotto di esso. `Libraries/BatchedBridge/NativeModules.js` (riga
// ~181) solleva l'invariant SOLO nel ramo `else`:
//
//   if (global.nativeModuleProxy) { NativeModules = global.nativeModuleProxy }
//   else { invariant(global.__fbBatchedBridgeConfig, '...') }
//
// Fornire `nativeModuleProxy` e' quindi il punto di innesto previsto dal
// runtime stesso: un modulo nativo finto viene creato su richiesta, con i
// metodi come `jest.fn()`. Nessuna patch a react-native, nessun mock da tenere
// allineato a un elenco di moduli.
//
// Il file gira in `setupFiles`, PRIMA di `jest.env.js`: deve essere in piedi
// quando il primo modulo di react-native viene importato.

/* eslint-env jest */

const nativeModuleMocks = {};

// I moduli per cui `getConstants() -> {}` non basta, perche' il chiamante
// dereferenzia subito il risultato. I valori vengono da
// `react-native/jest/setup.js`, cosi' un test che asserisce su una dimensione
// vede gli stessi numeri che vedrebbe con il preset ufficiale.
const MODULE_CONSTANTS = {
  // `Dimensions.js` fa `getConstants().Dimensions.screen` all'import, quindi
  // senza queste `PixelRatio` muore con "Cannot read properties of undefined".
  DeviceInfo: {
    Dimensions: {
      window: { fontScale: 2, height: 1334, scale: 2, width: 750 },
      screen: { fontScale: 2, height: 1334, scale: 2, width: 750 },
    },
  },
  // Letto da `Platform.ios.js`. La versione dichiarata e' quella reale del
  // progetto (RN 0.79.5) e non il `major: 1000` del preset ufficiale: un
  // controllo di versione sotto test deve vedere la versione vera.
  PlatformConstants: {
    forceTouchAvailable: false,
    interfaceIdiom: 'phone',
    isTesting: true,
    osVersion: '17.0',
    reactNativeVersion: { major: 0, minor: 79, patch: 5, prerelease: undefined },
    systemName: 'iOS',
  },
};

function makeNativeModule(name) {
  const constants = MODULE_CONSTANTS[name] || {};
  // Le costanti sono esposte sia da `getConstants()` sia come proprieta'
  // dirette: la Old Architecture le leggeva nel secondo modo e diversi moduli
  // di react-native lo fanno ancora.
  const mod = { getConstants: () => constants, ...constants };

  return new Proxy(mod, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop !== 'string') return undefined;
      // Metodo mai visto: diventa un `jest.fn()` e resta lo stesso a ogni
      // lettura, cosi' un test puo' asserire su di esso.
      target[prop] = jest.fn();
      return target[prop];
    },
  });
}

global.nativeModuleProxy = new Proxy(nativeModuleMocks, {
  get(target, name) {
    if (typeof name !== 'string') return undefined;
    if (!(name in target)) target[name] = makeNativeModule(name);
    return target[name];
  },
  has: () => true,
});

// `<Modal>` e' l'unico componente che il proxy non salva, e non per un modulo
// nativo: monta `AppContainer`, che con `__DEV__` vero sceglie il ramo
// `AppContainer-dev`. Quel ramo legge `window.__REACT_DEVTOOLS_GLOBAL_HOOK__`
// **a livello di modulo** (riga 31), e altrettanto fa
// `DebuggingOverlayRegistry` che importa (riga 39). Senza `window` e' un
// `ReferenceError` all'import, prima che qualsiasi componente sia costruito.
//
// react-native lo sa — il commento sopra quella riga dice "it is not mocked in
// some Jest tests. We should update Jest tests setup". Il preset ufficiale se
// la cava definendo `window`, che qui non e' un'opzione (vedi sopra).
//
// Il mock ufficiale `react-native/jest/mockModal.js` non aiuta: passa da
// `mockComponent`, che fa `requireActual` di `Modal.js` e quindi riesegue lo
// stesso import.
//
// La sostituzione e' quindi il ramo che react-native usa in produzione:
// `AppContainer-prod`, che non legge nessun globale e non importa nulla — e'
// il medesimo componente meno LogBox, l'inspector e gli overlay di debug,
// cioe' esattamente cio' che nessun test vuole montare. Cosi' non serve
// mockare separatamente la registry di debug: non viene mai caricata.
jest.mock('react-native/Libraries/ReactNative/AppContainer', () => ({
  __esModule: true,
  default: jest.requireActual(
    'react-native/Libraries/ReactNative/AppContainer-prod',
  ).default,
}));
