# Testare un servizio che usa `VisApiClient` / `CacheService`

> Riferimento: issue #48. Prima di questo lavoro un servizio che importasse
> staticamente `VisApiClient` o `CacheService` faceva esplodere jest all'import,
> e l'unico modo di aggirarlo era il `require` lazy — una toppa che è stata
> rimossa da `services/OfficialsService.ts` e **non va reintrodotta**.

## TL;DR

```ts
import { VisApiClient } from '../api/VisApiClient';   // ✅ import statico, funziona
import { CacheService } from '../cache/CacheService'; // ✅ idem
```

Non serve nessun `jest.mock('expo/virtual/env')`, nessun `jest.mock('react-native-mmkv')`,
nessun `require()` lazy nel codice di produzione. La configurazione se ne occupa
una volta per tutte.

---

## Che cosa risolve la configurazione, e dove

Tutto sta in `jest.config.js`, `jest.env.js`, `jest.setup.js` e `__mocks__/`.

### 1. `expo/virtual/env` — la causa dominante

`babel-preset-expo` riscrive **ogni** lettura di `process.env.EXPO_PUBLIC_*` in
un import dal modulo virtuale `expo/virtual/env`, che è ESM puro. Il transform di
jest non lo digerisce: qualunque file che legga una variabile d'ambiente moriva
all'import, a prescindere da MMKV, NetInfo o uuid.

**Fix (root):** `moduleNameMapper` in `jest.config.js` mappa `expo/virtual/env`
su `__mocks__/expo-virtual-env.js`, uno stub CJS che riespone `process.env`
(popolato da `jest.env.js`).

### 2. `react-native-mmkv` — modulo nativo JSI

Non ha fallback JS: si rompe appena viene costruito sotto jest.

**Fix (root):** `moduleNameMapper` → `__mocks__/react-native-mmkv.js`, una
implementazione in memoria con la stessa superficie (`set`, `getString`,
`getAllKeys`, `clearAll`, …). Non è un `jest.fn()` cieco: quello che scrivi lo
rileggi, quindi i test su `MmkvStorage`/`CacheService` verificano comportamento
vero.

### 3. `uuid` e le altre dipendenze ESM

`uuid` >= 9 è ESM-only ed è importato staticamente da `VisApiClient`. Le
dipendenze ESM/Flow sono ora **transpilate** invece che ignorate: vedi la
whitelist in `transformIgnorePatterns` (`uuid`, `expo*`, `@expo*`,
`react-native*`, `@react-native*`, `@supabase`, `@sentry`, `@tanstack`,
`@testing-library`, `@react-navigation`).

### 4. Transform dei file `.js`

Dichiarare `transform` in jest **sostituisce** la mappa di default: prima i file
`.js` non venivano trasformati affatto, quindi qualunque ESM sfuggito a
`transformIgnorePatterns` esplodeva comunque su `export`. Ora c'è una entry
`^.+\.(js|jsx|mjs)$` che usa `@react-native/babel-preset` (necessario perché
react-native distribuisce sorgenti Flow + JSX non transpilati, che `jest.env.js`
carica con `requireActual('react-native')`).

### 5. Timer finti: **non** più globali

`jest.setup.js` faceva `jest.useFakeTimers({ legacyFakeTimers: true })` per
tutte le suite. Risultato: ogni percorso con un delay (retry/backoff di
`VisApiClient`, polling, circuit breaker) restava appeso fino al timeout di 5s —
128 test rossi che non erano bug.

Se la tua suite ha bisogno di controllare il tempo, **attivali tu**:

```ts
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
```

### 6. Test Deno esclusi

Le Edge Function Supabase (`supabase/functions/**`, `supabase/tests/functions/**`)
sono programmi Deno: importano `https://deno.land/...` e usano il globale `Deno`.
Girano con `deno test`, mai con jest. Sono in `testPathIgnorePatterns`.

---

## Come si scrive il test di un servizio

### Preferito — dependency injection

Se il servizio espone un seam (come `OfficialsService.setDependencies`), inietta
degli stub. È il modo più veloce e rende esplicito quali chiamate fa il servizio.

```ts
import { OfficialsService } from '../OfficialsService';

const client = { getEvent: jest.fn(), getBeachMatchList: jest.fn() };
const cache  = { get: jest.fn(), set: jest.fn(), invalidate: jest.fn() };

beforeEach(() => OfficialsService.setDependencies({ client, cache }));
afterEach(()  => OfficialsService.setDependencies(null));
```

Quando entrambe le dipendenze sono iniettate il servizio **non costruisce** i
collaboratori reali: nessuna rete, nessun client vero.

### In alternativa — client vero, `fetch` finto

`jest.env.js` imposta `global.fetch = jest.fn()`: nessun test può fare rete per
sbaglio. Se vuoi esercitare il client davvero, programma il mock:

```ts
(global.fetch as jest.Mock).mockResolvedValue({
  ok: true,
  status: 200,
  text: () => Promise.resolve('<Responses>…</Responses>'),
  headers: new Map(),
});
```

Nota sul formato: il client invia il body come **form param URL-encoded**
(`Request=%3CRequest%20Type%3D%22…`). Se asserisci sul body, decodificalo
(`decodeURIComponent`) invece di cercare `Type="…"` in chiaro.

---

---

# Montare componenti React Native (issue #101)

```ts
import { render } from '@testing-library/react-native';
render(React.createElement(TournamentList));   // ✅ funziona
```

Fino alla #101 non funzionava: qualunque `render()` di un componente vero moriva
con `Invariant Violation: __fbBatchedBridgeConfig is not set`.

## Dove nasceva, e dove è stato tagliato

La catena è `View → ViewNativeComponent → NativeComponentRegistry →
getNativeComponentAttributes → processColor → Platform.ios →
NativePlatformConstantsIOS → TurboModuleRegistry → NativeModules`. Il
`jest.mock('react-native')` di `jest.env.js` **non la intercetta**, perché
sostituisce l'export pubblico mentre quella catena passa dagli import *relativi
interni* di react-native.

Il punto d'innesto è `Libraries/BatchedBridge/NativeModules.js`, che solleva
l'invariant **solo nel ramo `else`**:

```js
if (global.nativeModuleProxy) { NativeModules = global.nativeModuleProxy }
else { invariant(global.__fbBatchedBridgeConfig, '...') }
```

`jest.native-modules.js` (in `setupFiles`, **prima** di `jest.env.js`) fornisce
quel proxy: crea un modulo nativo finto su richiesta, con i metodi come
`jest.fn()`. Nessuna patch a react-native e nessun elenco di moduli da tenere
allineato.

## Perché non il preset ufficiale

`react-native/jest/setup.js` è la strada ovvia ed è stata tentata **due volte**,
nella #94 e nella #101. Appende il runner, perché collide con il
`jest.mock('react-native')` di `jest.env.js` (che fa `requireActual`). E
comunque non sarebbe adottabile così com'è: alla riga 58 definisce
`window: { value: global }`, che è esattamente ciò che `jest.env.js` **vieta**,
con una misura a supporto (#94) — in questo codebase almeno cinque moduli
deducono di girare su web dall'*assenza* di `window`.

Se ti trovi a riprovarci, il vincolo da rispettare è quello, non il preset.

## Due mock chirurgici, e perché

| Mock | Ragione |
|---|---|
| `global.nativeModuleProxy` | Il taglio alla radice descritto sopra |
| `Libraries/ReactNative/AppContainer` → ramo `-prod` | `<Modal>` monta `AppContainer`, che con `__DEV__` vero sceglie `AppContainer-dev`; quel ramo legge `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` **a livello di modulo**. Il ramo `-prod` non legge nessun globale: è lo stesso componente meno LogBox, inspector e overlay di debug |

Il mock ufficiale `react-native/jest/mockModal.js` non serve: passa da
`mockComponent`, che fa `requireActual` di `Modal.js` e riesegue lo stesso
import.

## Cosa è verificato che si monti

`__tests__/jest-native-modules.test.ts` monta `View`, `Text`, `ScrollView`,
`ActivityIndicator`, `TextInput`, `Image`, `Pressable`, `TouchableOpacity`,
`FlatList`, `Switch`, `Modal`, `Animated.View` e `RefreshControl`. **È la
barriera**: se qualcuno tocca il setup, è lì che il danno diventa visibile,
invece che in una suite a caso fra 140.

## I test `.tsx` restano esclusi — e non per questo motivo

`testPathIgnorePatterns` esclude ancora `/__tests__/.*\.tsx$`. Il commento
storico diceva "React Native setup complexity", e **non è più vero**: misurati
dopo la #101, quei 28 file si montano. Falliscono su asserzioni proprie —
`getByRole('image')` che RNTL v13 non risolve più allo stesso modo, conteggi di
render, testo cambiato. Vedi la nota in `jest.config.js` per i numeri e la
issue che li riprende.

---

## Regole

1. **Mai** `require()` lazy nel codice di produzione per aggirare jest.
2. **Mai** `jest.mock('expo/virtual/env')` in un singolo file di test: se serve,
   il posto giusto è `jest.config.js`.
3. Un nuovo modulo nativo o ESM-only fra le dipendenze → si aggiunge alla
   whitelist di `transformIgnorePatterns` o si mappa in `__mocks__/`, e si
   aggiorna questo documento.
4. I test non fanno rete. Se ne hai bisogno, è un test di integrazione e va sotto
   `__tests__/integration/` con la sua config.
