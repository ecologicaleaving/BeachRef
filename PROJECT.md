# PROJECT.md - Single Source of Truth

## Project Info
- **Name**: BeachRef
- **Version**: v1.0.5
- **Status**: production
- **Platforms**: apk, ios
- **Description**: Piattaforma gestione arbitraggi beach volleyball per tornei professionali

## Database
- **Provider**: supabase-cloud
- **Environment**: production
- **Database ID**: beachref-production
- **Schema**: sql-migrations
- **Migration Status**: current
- **Connection**: 
  - DEV: supabase local (localhost:54321)
  - PROD: auto-injected via Expo environment
- **Backup**: auto (supabase managed)
- **Seed Data**: tournament fixtures + referee data
- **Admin URL**: https://supabase.com/dashboard

## Deployment
- **Live URL (Web)**: https://beachrefs.netlify.app
- **Web Deploy**: Netlify **git-connected** su `master` — unico sistema che pubblica
  (issue #52). Netlify checkouta la repo, esegue `[build]` di `netlify.toml`
  (`npx expo export --platform web`, Node 18 da `.nvmrc`) e pubblica `dist/`.
  I deploy preview delle PR sono prodotti da Netlify
  (`https://deploy-preview-<N>--beachrefs.netlify.app`).
  `.github/workflows/web-build.yml` **non deploya**: verifica solo che il build
  compili, come gate sulle PR.
- **Live URL (Mobile)**: N/A (mobile app)
- **Deploy Method**: expo-build (mobile) / Netlify (web)
- **Deploy Host**: expo-build-service (mobile) / Netlify (web)
- **CI Status**: passing
- **Last Deploy**: 2026-07-25T10:52:00Z (web — issue #40/PR #41 OfficialsService; prima PR #39 fix permessi CI)
- **Environment Variables (build web)**: **nessuna, oggi.** Verificato su bundle
  (issue #52): né il bundle di produzione buildato dalla Action né quello
  buildato da Netlify contengono un URL Supabase o una chiave — le
  `EXPO_PUBLIC_*` non erano passate da nessuno dei due. Il build Netlify
  **non** eredita i secret di GitHub Actions: quando servirà Supabase lato web
  (issue di attivazione), le variabili vanno configurate in
  **Netlify → Site settings → Environment variables**, non nei secret GitHub.
  Elenco di quelle che il codice legge, per quando servirà:
  `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
  `EXPO_PUBLIC_EDGE_URL`, `EXPO_PUBLIC_MMKV_KEY`, `EXPO_PUBLIC_SENTRY_DSN`,
  `EXPO_PUBLIC_VAPID_PUBLIC_KEY`. `EXPO_PUBLIC_GA_ID` è già in `.env.production`
  (file tracciato).
  `NETLIFY_AUTH_TOKEN` / `NETLIFY_SITE_ID` nei secret GitHub **non servono più**
  dopo #52: erano usati solo dai job di deploy rimossi.

## Repository
- **Main Branch**: master
- **Development Branch**: feature/issue-27-cache-2013-bug
- **GitHub**: https://github.com/ecologicaleaving/BeachRef

## Tech Stack
- **Frontend**: React Native + Expo + TypeScript
- **Backend**: Supabase Edge Functions + PostgreSQL
- **Database**: PostgreSQL (via Supabase Cloud)
- **Auth**: Supabase Auth + role-based access
- **Navigation**: React Navigation v6
- **State**: React Context + Custom hooks

## Services
- **Mobile App**: Expo managed workflow
- **Backend API**: Supabase Edge Functions
- **Database**: Supabase PostgreSQL Cloud
- **Authentication**: Supabase managed auth
- **File Storage**: Supabase Storage (match documents)
- **Push Notifications**: Expo Notifications
- **OfficialsService** (`services/OfficialsService.ts`): nomi degli officials di un
  torneo (scorer, assistant scorer, line judge) e delegazione arbitrale, dalla VIS.
  Costo **2 chiamate per torneo**, indipendente dal numero di match — e dalla
  #67 anche **2 round trip**, non più 4: il client non manda più header custom.
  Vedi sezione "Officials di torneo" più sotto.
- **RefereeDirectoryService** (`services/RefereeDirectoryService.ts`): anagrafica
  arbitri per la UI — roster di evento, direttorio globale, singolo arbitro,
  officials di evento, ritratto e ID card. È l'unico punto da cui le schermate
  in `app/` leggono questi dati; tutto passa da `VisApiClient` ed è cachato per
  chiave (issue #46). Vedi sezione "Anagrafica arbitri" più sotto.

## Monitoring
- **Health Check**: App startup + API connectivity check
- **Database Health**: Supabase dashboard monitoring
- **Crash Reporting**: Expo error reporting
- **Alerts**: enabled (critical tournament functions)
- **Auto Deploy**: manual (expo publish)

## Development
- **Local Setup**: 
  1. `npm install` (dependencies)
  2. Copy `.env.example` to `.env` with Supabase credentials
  3. `npx expo start` (development server)
  4. Use Expo Go app or simulator for testing
- **Build Process**: 
  1. `eas build --platform android` (APK build)
  2. `eas build --platform ios` (iOS build)
  3. `eas submit` for app store deployment
  4. Manual testing on physical devices

## Troubleshooting
- **App Crashes**: Check Expo logs + device console
- **API Issues**: Verify Supabase connection + edge function status
- **Database**: Supabase dashboard query performance analysis
- **Build Failures**: Check EAS build logs + dependency conflicts

## Convenzione singleton dei servizi (issue #43)

Un servizio singleton espone **solo la classe come named export**. È vietato
aggiungere `export default X.getInstance()` (o qualunque default che sia
un'istanza già costruita) accanto alla classe omonima: il consumer scrive
`import X from '...'`, crede di avere la classe, chiama il metodo statico
`X.getInstance()` sull'istanza e ottiene a runtime
`X.default.getInstance is not a function`. Uso corretto:

```ts
import { NotificationService } from '../services/notifications/NotificationService';
const service = NotificationService.getInstance();
```

Il contratto è verificato dai test in
`__tests__/services/notifications/NotificationServiceInit.test.ts`.

## Membri che il modulo non espone (issue #71, #73) — la famiglia, non i singoli casi

La convenzione qui sopra copre **un solo caso**: `export default X.getInstance()`
accanto a una classe omonima. Le issue #71 e #73 hanno mostrato che è la punta di
una famiglia molto più ampia — *un modulo chiede a un altro un membro che non
c'è* — e che questa famiglia si è già manifestata **quattro volte** (#43, #71,
#73 ×2). Ogni volta `tsc` la segnalava alla lettera. Ogni volta la riga era
illeggibile in mezzo a migliaia di errori classificati tutti allo stesso modo.

**Non era invisibile: era illeggibile.** È per questo che la barriera è un test,
non una convenzione scritta.

### Due sotto-famiglie, ed entrambe si enumerano con `tsc`

| Sotto-famiglia | Codici `tsc` | Stato |
|---|---|---|
| Import di un nome che il modulo non esporta | `TS2305`, `TS2459`, `TS2613`, `TS2614`, `TS2724` | **0 casi** — tenuta a zero da `__tests__/no-phantom-imports.test.ts` |
| Membro statico chiamato su una classe che non lo espone | `TS2339` su `typeof X` | 3 corretti, **~17 residui documentati sotto** |

`__tests__/no-phantom-imports.test.ts` usa il compilatore TypeScript per
risolvere ogni import *relativo* di `app/ components/ hooks/ lib/ screens/
services/ utils/` e verificare che il binding — `default` incluso — sia
davvero esportato dal modulo di destinazione. Un modulo che fa
`export * from 'un-pacchetto'` è dichiarato opaco e non viene accusato.

### Perché `getInstance()` merita una regola a parte

Nessuna delle due sotto-famiglie è un errore di battitura: sono tutte
**dipendenze rimaste indietro rispetto a un refactoring**. `LocalStorageManager`
non ha mai avuto `getInstance()`; `VisApiService` è stato rimosso dalle #46/#47;
`useDateNavigation` è stato rimosso e ha lasciato 15 usi. Prima di scrivere
`X.getInstance()`, apri `X` e guarda se ce l'ha — metà delle classi di questo
codebase sono interamente statiche e non ne hanno bisogno
(`RealtimePerformanceMonitor`, `CacheServiceCompatibility`,
`RealtimeFallbackService`), e `VisApiClient` si costruisce con una config.

### Residui NON corretti (issue a sé) — membri statici fantasma

Trovati dalla ricerca della #73, deliberatamente fuori scope. Tutti visibili con:

```bash
npx tsc --noEmit --pretty false | grep "does not exist on type 'typeof "
```

- **`CacheServiceCompatibility.invalidateMatchCache`** — chiamata da
  `RealtimeSubscriptionService`, `RealtimeFallbackService`, `RealtimeOrchestrator`
  e `useRealtimeData`. **È il percorso caldo del realtime**: ogni invalidazione
  di cache dopo un aggiornamento live lancia `TypeError`. La classe espone
  `clearCache(keys?)`, non questo nome. 4 siti.
- **`CacheServiceCompatibility.getMatchesFromSupabase`** — `RefereeAssignmentsService`
  (assegnazioni arbitro, **rotta raggiungibile**) e `MatchResultsService`. La
  classe espone `getMatches(tournamentNo)`. 2 siti.
- **`CacheServiceCompatibility.{getStorageUsage, clearOfflineStorage, clearLocalStorage, enforceStorageQuota}`**
  — `useStorageManager`, 5 siti. Nessuno dei quattro esiste.
- **`RealtimePerformanceMonitor.getPerformanceReport`** — `RealtimeOrchestrator`.
  Il nome vero è `getPerformanceMetrics()`.
- **`ErrorLogger.logError`** — `TimezoneService`. `ErrorLogger` espone solo
  `getInstance()` come statico; `logError` è un metodo d'istanza.
- **`MatchStatus.{IN_PROGRESS, WARMUP, COMPLETED}`** — `MatchListV2`, 4 siti,
  **componente raggiungibile**: i confronti valgono `undefined`, quindi il filtro
  per stato è silenziosamente sbagliato.
- **`DataConsistencyValidator.getEvents({tournamentCode})`** — servizio orfano
  (solo il suo test lo importa) scritto contro un contratto `VisApiClient` che
  non è mai esistito. Va deciso se cancellarlo o riscriverlo, non rattoppato.
- **`hooks/useNetworkState.ts`** importa `NetInfoState`/`NetInfoStateType` da
  `@react-native-async-storage/async-storage`, che non è NetInfo; e chiama
  `addEventListener`/`fetch` su quel modulo. Import non relativo, quindi fuori
  dal raggio della barriera.

## Configurazione dei test (issue #48)

Un servizio si testa con **import statici**: `VisApiClient` e `CacheService` sono
importabili in jest senza toppe. È vietato reintrodurre `require()` lazy nel
codice di produzione per aggirare jest, e vietato aggiungere
`jest.mock('expo/virtual/env')` nei singoli file di test: la soluzione sta in
`jest.config.js` / `__mocks__/`.

Causa storica: `babel-preset-expo` riscrive ogni `process.env.EXPO_PUBLIC_*` in
un import da `expo/virtual/env` (ESM), che jest non parsava — quindi **qualunque
file che leggesse una variabile d'ambiente moriva all'import**.

Guida completa (DI, `fetch` finto, timer, formato del body VIS):
**`TESTING.md`**.

## Backlog
- **TODO**: Integrazione AI per analisi performance arbitri
- **TODO**: Offline mode per gestione tornei senza connessione
- **TODO**: Dashboard web per organizzatori tornei
- **TODO**: Sistema rating arbitri real-time
- **TODO**: Export reports automatici post-torneo
- **DONE**: Sistema sync dati tornei federazione beach volleyball
- **DONE**: App mobile cross-platform iOS/Android
- **DONE**: Issue #20 — Bug fix: tornei 2026 senza partite mostravano match di altri tornei/stagioni (reset stato stale, year-scoped cache keys, filter guard DB fallback, empty-array guard in cacheMatches)
- **DONE**: Issue #22 — Security hardening Supabase: RLS su 6 tabelle pubbliche, views ricreate come SECURITY INVOKER, search_path fisso su 30+ funzioni, policy restrittive su matches/sync_error_log/analytics_events, accesso materialized view ristretto
- **DONE**: Issue #23 - Fix tornei 2026: visNo numerico risolto in tournamentCode nel compatibility layer, filtro eventNo per query DB e prevenzione cross-contaminazione partite stale
- **DONE**: Issue #27 — Bug fix cache intermittente 2013: year aggiunto a queryKeys.matches.list() e byTournament(), guard anno nel DB fallback di useMatches e DualReadService.getMatchesFromDB(), year propagato alla API, 4 nuovi test di isolamento cache key per anno
- **TODO**: Integrazione livestreaming matches con metadata arbitraggio
- **DONE**: Issue #32 — Web perf: code-splitting per route (1→23 chunk), icone deep-import (bundle raw −37%), fix cache Netlify. LCP prod −34%. Diagnosi: il render delay è boot RN-Web, non il bundle
- **DONE**: Issue #34 (PR #35) — Web perf SSG: routing per-route + skeleton prerenderizzato (perceived performance). Certificato che il −80% sull'LCP NON è raggiungibile con SSG (LCP = contenuto data-driven non prerenderizzabile); richiede refactor architetturale (output `server` o runtime più leggero). Test: `npm run test:prerender`, `tests/curl-tests.sh`
- **DONE**: Issue #36 (PR #37) — Web perf cache/SW: rimosso `Clear-Site-Data: "cache"` (azzerava la cache HTTP a ogni risposta), **`public/_headers` unica fonte di verità** per header e redirect (`public/_redirects` eliminato col catch-all SPA `/* → /index.html` che rompeva il per-route SSG di #34; `netlify.toml` svuotato perché **inerte** — vedi sezione sotto), chunk `/_expo/*` ora davvero `immutable`, service worker senza handler `fetch` e senza `caches.delete()` indiscriminato, latency probe di `NetworkStateManager` spostata dal documento HTML a `HEAD /favicon.ico` fuori dal percorso critico. Misurato sul deploy: contenuto reale da ~9900 ms a ~2277 ms, TTFB da 2046 ms a 152 ms, prima chiamata VIS API da 8275 ms a 1322 ms. Test: `tests/curl-tests.sh <BASE_URL>` (15 check), `npm run test:prerender`
- **DONE**: Issue #38 (epic #51, wave 1, follow-up di #36) — Dimagrimento dell'entry chunk. Prima di tagliare è stato scritto `scripts/analyze-bundle.js`, che attribuisce ogni byte generato al sorgente da cui viene tramite la source map (AC1): senza quella misura tre dei quattro interventi non sarebbero stati trovati e uno sarebbe stato fatto sul candidato sbagliato. **La scoperta principale non era in lista**: `import { X } from '@expo/vector-icons'` tira dentro **tutti** i set di icone, e i loro glyph map sono **345 KB** del chunk (MaterialCommunityIcons 164 KB, FontAwesome5 49 KB, MaterialIcons 46 KB, Ionicons 30 KB, FA5-brands 28 KB, FontAwesome 27 KB) per **tre** set usati — e su web nessuno dei tre viene mai renderizzato, perché tutti e tre i wrapper hanno un ramo `Platform.OS === 'web'` che disegna un glifo di testo. Non comparivano nell'analisi perché il **JSON non ha mapping nella source map**: erano nella quota "non attribuita". Ora passano da `components/Icons/vectorIconSets.ts` + `.web.ts`. **Secondo per peso, anch'esso fuori lista**: `PanGestureHandler` in `GmailStyleSideMenu` era l'unico import di `react-native-gesture-handler` in tutto il codice, e gesture-handler tira `react-native-reanimated` via `handlers/gestures/reanimatedWrapper` → **300 moduli e ~830 KB** per una swipe di chiusura del menu, sostituita con `PanResponder` di React Native (già dentro react-native-web); i 5 hook che usavano reanimated in `utils/statusAnimations.ts` sono stati riscritti su `Animated` di RN, API pubblica invariata. Terzo: `expo-notifications` + `expo-device` (e con loro `@ide/backoff`→`assert`, `ua-parser-js`) resi lazy con `import()` in `NotificationService` e `app/_layout.tsx` — su web ogni metodo passa già da `WebPushService`, quindi il ramo native non serve al boot. Quarto: `minifierConfig` con `keep_fnames: false` e `ascii_only: false`, e `inlineRequires` attivo anche su web (era `!isWeb`) per differire l'*esecuzione* dei moduli. **Non toccato di proposito**: `@supabase/*` (~140 KB raw / ~29 KB br, oggi codice morto in produzione perché senza `EXPO_PUBLIC_SUPABASE_*` il client è `null`) — è materia della #54 che lo sta accendendo; e `luxon` (71 KB raw, duplicato funzionale di `dayjs` che è già nel bundle) perché riscrivere la logica timezone appena riparata dalla #29 per ~14 KB br non vale il rischio. Budget di peso ora verificato da `tests/curl-tests.sh` (`ENTRY_MAX_BROTLI_BYTES`), insieme all'AC3 (nessun simbolo dei servizi `__DEV__` nel chunk servito — era già vero). **Risultato sul deploy: entry brotli 866.641 → 511.623 B (−41,0%), raw 3.674.188 → 2.072.378 B (−43,6%) — AC2 raggiunto.** Test 3 suite in più verdi e 0 regressioni, `audit:ci` PASS. **Ma la premessa della issue non regge alla misura**: vedi la sezione "Il peso del bundle non è la leva dell'LCP" più sotto
- **DONE**: Issue #40 — `services/OfficialsService.ts`: nomi di scorer/assistant scorer/line judge per match e delegazione arbitrale, **2 chiamate VIS per torneo** indipendenti dal numero di match. Decoding XML-nell'XML isolato in `utils/visEmbeddedXml.ts`, tipi in `types/referee-v2.ts`, 26 test su fixture reali senza rete, script `scripts/show-tournament-officials.js`. Fix collaterale: `GetEventRefereeList` in `VisApiClient` era rotto (mancava l'envelope `<Requests>`). Limite documentato: referee coach e technical delegate non ottenibili dalla VIS pubblica
- **DONE**: Issue #43 — Notifiche: l'init falliva a **ogni** avvio in produzione (`TypeError: w.default.getInstance is not a function`, degradato a warning dal try/catch di init). Causa: i 5 servizi in `services/notifications/` esportavano sia la classe (named) sia un `export default X.getInstance()` — cioè un'**istanza già costruita** con lo stesso nome — e i consumer importavano il default chiamandoci sopra il metodo **statico** `getInstance()`. Convenzione adottata: **solo named export della classe, nessun default export**; 13 file allineati (5 servizi + 8 consumer, incluso `NotificationService` stesso che usava male `WebPushService`). Aggiunto `NotificationService.isInitialized()` come prova positiva di init e log dedicati in `app/_layout.tsx`; l'init error è ora `console.error` in `__DEV__` (il warn silenzioso è ciò che ha nascosto il bug). Test: `__tests__/services/notifications/NotificationServiceInit.test.ts` (22 test, 19 falliscono col bug presente)
- **TODO** (epic, se prioritizzato): Web perf −80% architetturale — Expo output `server` con data fetching lato server, o runtime più leggero di react-native-web. **È rimasta l'unica strada per gli AC11/AC12 di #36** (LCP < 1500 / < 1800 ms): la #38 ha dimezzato il bundle e l'LCP è sceso del 5% a cache fredda, misurato. Reanimated non è più un candidato: la #38 lo ha già tolto dal grafo
- **TODO** (emerso da #38): `@supabase/*` pesa ~140 KB raw / ~29 KB br nell'entry ed è **codice morto in produzione** finché `EXPO_PUBLIC_SUPABASE_*` non è configurata su Netlify (il client è `null`). Va reso lazy con `import()` **dentro la #54**, che lo sta accendendo: 4 servizi dell'entry lo importano e serve trasformare l'export sincrono `supabase` in un getter async
- **TODO** (emerso da #38): `luxon` (71 KB raw) è un duplicato funzionale di `dayjs`, già nel bundle con i plugin utc e timezone. Non consolidato nella #38 perché i 4 file che lo usano sono logica timezone appena riparata dalla #29 e `toFormat`/`fromISO` non hanno semantica identica a dayjs. Vale ~14 KB br: da fare solo se qualcuno tocca comunque quella logica
- **DONE**: Issue #42 (epic #51, wave 0) — Il gate di qualità torna a dire il vero. `npm run audit` usciva **PASS/0 mentre 2 dei 3 checker crashavano** (`catch → console.warn → return []`) e **6 checker su 9 non venivano mai istanziati** (default = preset `quality`; lo scanner di sicurezza non era mai stato eseguito). Ora: tre esiti distinti **PASS/FAIL/ERROR** (exit 0/1/2), i checker non catturano più i propri errori, `ERROR` ha precedenza su tutto incluso `--fail-on` (era la via con cui `audit:ci` aggirava il controllo), tutti e 9 i checker girano di default e il **roster viene stampato** (chi gira e chi no). Fix ESLint (scope = `expo lint`, 928 finding = identico a `npm run lint`) e Complexity (`overrideConfigFile: true` scartava il parser TS → tutti i `.ts` ignorati; ora 176 finding reali). `typescript-error` riportato a **High** (era Medium "per flessibilità": rendeva il gate incapace di bloccare); il backlog preesistente è congelato in **`.audit-baseline.json`** (2780 finding bloccanti, budget per `(file, tipo)` — insensibile agli shift di riga) e il gate blocca **solo le regressioni**. Esclusioni path normalizzate POSIX (su Windows non matchavano mai: lo scanner camminava `node_modules`, `docs/`, artefatti di build). 31 test nuovi in `__tests__/scripts/audit/`. Comandi: `npm run audit` / `audit:ci` (9 checker), `audit:quality` (3, pre-commit), `audit:baseline` (ri-congela)
- **DONE**: Issue #48 (epic #51, wave 3) — Config jest riparata alla radice. La diagnosi iniziale (`uuid` ESM + MMKV + NetInfo) era incompleta: la causa dominante era che **`babel-preset-expo` riscrive ogni `process.env.EXPO_PUBLIC_*` in un import da `expo/virtual/env`** (ESM), quindi qualunque file che leggesse una env var esplodeva all'import. Fix in `jest.config.js`: `moduleNameMapper` su `expo/virtual/env` e `react-native-mmkv` (mock in-memory vero, non `jest.fn()`), transform per i `.js` con `@react-native/babel-preset` (dichiarare `transform` **sostituisce** la mappa di default: i `.js` non venivano trasformati affatto), `transformIgnorePatterns` allargato a `uuid`/`expo*`/`react-native*`/`@sentry`/`@tanstack`. Rimossi dai test i **21 file Deno** delle Edge Function Supabase (girano con `deno test`, mai con jest) e tolti i **fake timer legacy globali** da `jest.setup.js`, che congelavano `setTimeout` per tutte le suite (128 timeout da 5s che non erano bug). Toppa di `OfficialsService` rimossa: `require` lazy → import statici, 26 test verdi. Corretto `services/MatchResultOfflineService.ts` che importava `@react-native-netinfo/netinfo`, pacchetto inesistente. **Suite rosse 118 → 88, verdi 36 → 43, test verdi 994 → 1283 (+289), zero regressioni.** Doc: `TESTING.md`
- **TODO**: Wiring dell'audit in CI — oggi `npm run audit:ci` gira **solo** negli hook git (bypassabile con `--no-verify`), non sulle PR. `.github/workflows/audit.yml` documentato in CLAUDE.md non è mai esistito
- **DONE**: Issue #56 (epic #51, priorità massima) — Credenziali di produzione hardcoded su repo **pubblica**. `apply_migrations_pg.js:15` conteneva in chiaro la **password del ruolo `postgres` (superuser)** del DB Supabase di produzione dal commit `edd5e4a` del 2025-09-13: **dieci mesi** di esposizione. Lo stesso valore era in un **17° file non elencato dalla issue**, `apply_migrations_cli.js`, che è anche il runner che scriveva `temp_migration_*.sql` nella root (fallendo prima dell'`unlink`, ce li ha lasciati). Degli altri 14 file dell'elenco **nessuno conteneva un segreto**: i match erano `process.env.SUPABASE_SERVICE_ROLE_KEY` e policy SQL `auth.role() = 'service_role'` — la lista era il risultato di una ricerca per pattern, non di una verifica. Eliminati comunque come script one-off di sessioni chiuse (legati al torneo 1552 / a un arbitro specifico), previa verifica che nessuno fosse referenziato da `package.json`, `.github/`, `.husky/` o dalla documentazione. `TRIGGER-SYNC-FUNCTION.sql` riscritto: non aveva un segreto ma istruiva a incollarne uno in un file tracciato, ora legge da Supabase Vault. `supabase/.temp/` tolto dal tracking. Scanner di sicurezza: **14 finding (1 Critical + 13 High) → 0**. I 13 `security-http` erano **falsi positivi**: `xmlns="http://..."` e `SOAPAction:` in buste SOAP VIS — URI opachi mai dereferenziati, che riscritti a `https://` romperebbero la richiesta; lo scanner ora li esenta per singola occorrenza (una riga con namespace **e** endpoint http:// vero resta segnalata). **Barriera anti-ricomparsa**: nuovo preset `precommit` = `quality` + `security`, usato da `.husky/pre-commit` — prima il security scanner girava **solo in pre-push**. Prova eseguita con segreto finto: col nuovo scope il commit è **bloccato** (Critical +1, exit 1), col vecchio scope `audit:quality` lo stesso file passava **PASS/0**. `.gitignore` copre `temp_migration_*.sql`, dump e file di credenziali; `.env.example` documenta con placeholder le variabili degli script rimasti (che escono già con exit 1 e messaggio esplicito — nessun fallback hardcoded). ⚠️ **La rotazione dei segreti e il controllo degli access log restano a carico di Davide: la rimozione dal codice non chiude l'esposizione.**
- **DONE**: Issue #44 (epic #51, wave 0) — Sedimento nella root: **2,6 MB e 148 file tracciati** che non erano codice del progetto. Rimossi 62 marker `tmpclaude-*-cwd` degli agent, 5 dump di output di `tsc`/`jest`, `tmp.patch`, `temp-test.ts`, `repro_duration_bug.ts` e il file da 0 byte con path Windows malformato (il `:` era **U+F03A**, per questo `git rm` col nome letterale falliva — serve `--pathspec-from-file`). **56 script `.js`** classificati uno per uno e eliminati con indicazione di dove vive ora la logica: officials → `services/OfficialsService.ts` (#40), richieste VIS → `VisApiClient`/`OptimizedApiClient`, parsing → `VisResponseParser`, cache → `services/cache/`, transizione ReadyToStart→LIVE → `types/match-v2.ts::canReadyToStartMatchGoLive`, sync → `services/sync/`, schema arbitri → migration 012/013. Restano in root i 7 `.js` che sono configurazione. **31 `.md` → 4** (README/CLAUDE/PROJECT/AGENTS): 5 spostati in `docs/`, 22 eliminati (fra cui **quattro report di deployment dello stesso giorno in disaccordo tra loro** su READY/NOT READY). `.sql` sciolti: erano **5, non 9** (la issue contava una fotografia pre-#56); 4 eliminati perché già coperti da `supabase/migrations/`, `TRIGGER-SYNC-FUNCTION.sql` spostato in `supabase/manual/`. `.gitignore` esteso contro il riformarsi del sedimento; tolto `docs/` dalle ignore (bloccava solo l'aggiunta di documenti **nuovi**, mentre ~60 file sotto `docs/` erano già tracciati). Verifica di non-regressione: build/`npm test`/`lint`/`tsc` **identici a master** (2677 errori TS, 922 problemi ESLint, 117 suite fallite / 186 test falliti — invariati), nessuno dei file eliminati referenziato da `package.json`, `.github/`, `.husky/`, `netlify.toml`, `eas.json`, `app.json`, docs o codice (due scansioni indipendenti; gli **unici** due file di root citati da qualcosa, `color-migration-report.json` e `TRIGGER-SYNC-FUNCTION.sql`, sono stati conservati)
- **DONE**: Fix collaterale emerso da #44 — **`npm run audit:ci` era rosso su `master`** per chiunque avesse `node_modules` installato. La #42 aveva corretto il matching di `excludePaths` (POSIX-normalizzato) nella funzione condivisa `shouldExcludePath()`, ma vi aveva collegato **solo il security scanner**: error-handling, performance, data-flow e build avevano ciascuno una copia incollata del walker con la riga sbagliata e continuavano a scendere in `node_modules`. Error Handling riportava **150 finding invece di 39, di cui esattamente 111 da codice di terze parti** — e sono di severità High, quindi il gate li contava come regressioni bloccanti oltre la baseline. Tutti e quattro usano ora `shouldExcludePath()`; i numeri tornano esattamente quelli documentati in CLAUDE.md, regressioni **0 → PASS**, e la run completa passa da ~187 s a ~62 s. **La baseline non è stata rigenerata** (l'avrebbe congelata coi 111 finding di `node_modules`). Congelato da `__tests__/scripts/audit/checker-exclusions.test.ts` (15 test; 9 falliscono senza il fix)
- **DONE**: Issue #52 (epic #51, decisione 1 di #50) — Un solo sistema pubblica il sito. Fino a oggi il web era deployato **due volte a ogni push**: dalla GitHub Action (`nwtgck/actions-netlify`, che vinceva la corsa — era il suo artifact quello che vedevano gli utenti) e in parallelo dall'integrazione git di Netlify, di cui sulle PR si vedevano solo i check. Rimossi i job `deploy` e `deploy-preview`; il job `build` **resta** come gate sulle PR (perdere la verifica "compila?" sarebbe stato un regresso) e il workflow è stato rinominato `netlify-deploy.yml` → **`web-build.yml`**, con il job id `build` invariato. Conseguenza non ovvia: Netlify **checkouta la repo**, quindi `netlify.toml` da inerte diventa **letto** — i commenti in `netlify.toml` e `public/_headers` che spiegavano perché era inerte sono stati riscritti, perché da oggi mentono. Gli header **restano in `public/_headers`**: spostarli in `netlify.toml` ora che verrebbe letto sarebbe una seconda migrazione senza beneficio e un secondo posto dove sbagliare l'ordinamento. `NODE_VERSION = "18"` dichiarato esplicitamente in `netlify.toml` (allineato a `.nvmrc` e al workflow). **Env var: nessuna necessaria** — verificato scaricando i due bundle `entry-*.js`, quello di produzione (buildato dalla Action) e quello del deploy Netlify-nativo della PR #59: **zero** occorrenze di URL Supabase o chiavi in entrambi, dimensioni entro lo 0,02% — la Action non passava alcuna `EXPO_PUBLIC_*` e Netlify non ne ha configurate, quindi il bundle pubblicato non cambia. Prova che l'integrazione Netlify regge: `tests/curl-tests.sh` sul permalink del deploy Netlify-nativo della PR #59 → **15/15 verdi** (chunk `_expo` `immutable`, HTML `no-store`, nessun `Clear-Site-Data`, SSG per-rotta). ⚠️ I secret GitHub `NETLIFY_AUTH_TOKEN` e `NETLIFY_SITE_ID` non sono più usati da nulla: **revocarli** è a carico di Davide. `docs/DEPLOYMENT_SETUP.md` riscritto (descriveva i secret della Action e attribuiva a `netlify.toml` redirect SPA e header di sicurezza mai esistiti)
- **DONE**: Issue #45 (epic #51, wave 1, propedeutica a #38) — Codice morto e codice dormiente sono due cose diverse, e la issue le trattava insieme. **Morto e rimosso**: `IntegrationTestSuite` + `MigrationOrchestrationService` + `MigrationMonitoringService` + `MigrationRollbackService` (127 KB di sorgente, 5933 righe) formavano un'**isola chiusa** — si importavano solo fra loro, la radice `IntegrationTestSuite` non era importata da nessuno tranne il proprio test, e nessun percorso da `app/` li raggiungeva. Verificati anche i riferimenti dinamici (nessun `require()` a runtime, nessun import per stringa, nessuna citazione in `package.json`/`.github/`/`.husky/`/`netlify.toml`/`app.json`/script; `scripts/enableMigration.js`, che il nome suggerirebbe, riguarda i feature flag degli hook). **Effetto sul bundle: zero, e misurato** — non essendo nel grafo di build non erano nel chunk `entry-*.js`: 0 occorrenze di ogni marker nel bundle prodotto *prima* della rimozione. I "170 KB nel grafo di build" della issue erano sorgente su disco, non peso spedito. **Dormiente e mantenuto**: `DualReadService` **non** è stato rimosso (AC3 opzione (b)) perché la #54 accende Supabase sul web e questo è il percorso DB-first che piloterà. È stato reso **davvero** lazy: l'accesso avveniva con un `require()` dentro un metodo, ma **Metro risolve `require()` staticamente esattamente come `import`** — differiva l'*esecuzione*, mai il *caricamento*, quindi il file stava nell'entry. Con `import()` dinamico memoizzato: entry raw 3.666.774 → 3.641.546 B (**−25.228 B, −0,69%**), br 711.719 → 707.711 B (**−4.008 B, −0,56%**), nuovo chunk `DualReadService-*.js` raw 25.704 / br 5.425 B (23 → 24 chunk). `@supabase/supabase-js` **non** si sposta: resta nell'entry perché lo importano altri 8 moduli raggiungibili da `app/`. **Scoperta collaterale importante per la #54**: il ramo DB non "fallisce e degrada", è il **costruttore** che esplode — senza `EXPO_PUBLIC_SUPABASE_URL` `createClient()` lancia `supabaseUrl is required.`, quindi ogni `getTournaments`/`getMatches`/`getReferees`/`clearCache` di `CacheServiceCompatibility` termina nel `catch` dei chiamanti sulla VIS API. Appena le variabili saranno su Netlify, `readStrategy: 'db_first'` si attiva **di colpo** su tutte e quattro le strade, senza altri interruttori. tsc 2675 → **2603** (−72), lint 922 (5 errori) invariato, 4 suite rosse in meno, `npm run audit:ci` PASS
- **TODO** (emerso da #45): `services/DataConsistencyValidator.ts` e `services/DataSyncService.ts` sono **rimasti orfani** dopo la rimozione della catena `Migration*` — erano importati solo da lì. Non eliminati di proposito: sono codice Supabase e vanno valutati insieme alla #54, non tagliati di nascosto
- **DONE**: Issue #46 (epic #51, wave 2, parte 1 di 2) — Le **13 `fetch` dirette al VIS** nelle 4 schermate di `app/` (`tournament-ref` 5, `all-referees` 3, `ref-mode` 3, `referee-profile` 2) sono state sostituite da `services/RefereeDirectoryService.ts`, modellato su `OfficialsService`. Non è solo estetica: bypassare `VisApiClient` significava bypassare retry, monitor e soprattutto `ApiAuditService` — le metriche di conformità API in CLAUDE.md **non vedevano questo traffico**, ed è questa la ragione vera della issue. Aggiunti al client 4 endpoint che prima esistevano solo come stringhe XML nei componenti (`GetRefereeList`, `GetReferee`, `GetImageList`, `GetRefereeIdCard`), ciascuno con l'envelope `<Requests>` che questi endpoint richiedono (senza, rispondono `<NotInNewFormat id="1008" />` — stessa trappola di `GetEventRefereeList` trovata nella #40). **Misura AC5**: `tournament-ref` chiedeva **tre volte** lo stesso `GetEventRefereeList` in un solo caricamento; ora aprire → tornare indietro → riaprire costa **2 chiamate invece di 8** (−75%), `all-referees` scarica il direttorio globale **una volta invece di due**, `ref-mode` passa da 4 chiamate a 3 e da 3 a 1 alla riapertura. 29 test nuovi su fixture **senza rete**. tsc 2603 → **2593**, lint 922 → **918** (5 errori invariati, tutti preesistenti in file non toccati), `audit:ci` PASS. **Due bug preesistenti trovati e NON corretti** (la issue è un refactoring): (1) `ref-mode` chiude il caricamento con una `GetEvent` che **sovrascrive** le liste appena ottenute con quello che riesce a estrarne — e non estrae nulla, perché `GetEvent` non risponde con `<EventOfficialList>`/`<EventRefereeList>`: è il motivo per cui la schermata mostra `Officials (0) / Referees (0)` ed è "under construction"; il comportamento è preservato alla lettera con un commento che lo marca. (2) `all-referees` fa fan-out con `Promise.all` **non limitato** di una richiesta statistiche per ogni arbitro attivo — vedi issue #65
- **DONE**: Issue #47 (epic #51, wave 2, parte 2 di 2) — Le **ultime 10 `fetch` dirette al VIS** fuori da `services/api/`. La tabella della issue attribuiva l'ultima a `hooks/useLiveScores.ts`: **non era lì** — quel file passa già da `VisApiClient`, ha circuit breaker e cache 5 s (`CacheService.setLiveScore`). La decima era in `screens/TournamentDetailScreen.tsx`, che la issue non elencava. Rimisurato: `RefereeStatsService` 6, `utils/auxiliaryPersonsSync` 1, `utils/challengeRefereeSync` 1, `components/referee/TournamentRefereeList` 1, `screens/TournamentDetailScreen` 1 = **10**. **AC2 — `auxiliaryPersonsSync` eliminato, non incapsulato**: rifaceva `GetEvent Fields="AuxiliaryPersons"` e il doppio decode XML che `OfficialsService` già possiede. Sopravvive solo la *forma* dell'entry MMKV `event:<eventNo>:auxiliaryPersons`, perché `getSupportingOfficialsSync` la legge **in modo sincrono dentro il render** e non può await: ora la scrive `OfficialsService.primeAuxiliaryPersonsCache()`. **Il client è stato esteso, non forzato**: `GetBeachMatchListRequest.fields` — il field set di default non porta `TournamentGender` (split uomini/donne delle statistiche), `LocalDateTime` (filtro stagione client-side) né `Code` — e `GetEventRefereeListRequest.firstName`/`lastName`. Effetto collaterale: `RefereeAssignmentsService` passava **già** `fields` a `getBeachMatchList`, era un errore di tipo e il valore veniva scartato in silenzio; ora viene onorato (la risposta di quella chiamata è comunque buttata da un fallback morto). **Misura AC6, contata nel browser** (evento 1734 BPT Challenge Shangluo, un match LIVE in corso, storage pulito, ~136 s): produzione **35** POST VIS (`GetEventRefereeList` 3, `GetEvent` 3, `GetBeachMatchList` 3, `GetBeachTournament` 2, `GetBeachLive` 24) → preview #68 **33** (`GetEventRefereeList` **1**, resto invariato). Il guadagno vero è sull'apertura della tab arbitri, dove tre componenti chiedevano lo stesso roster: **3 `GetEventRefereeList` → 0** (servita dall'entry già in cache). Il polling live è **invariato di proposito**: 24 `GetBeachLive` prima e dopo — quel percorso non aveva `fetch` dirette da togliere. **AC7**: la copertura al 100% dell'audit è ora una proprietà congelata da due test complementari — `__tests__/no-direct-vis-fetch.test.ts` (niente raggiunge la VIS se non via `VisApiClient`) e `__tests__/services/api/VisApiClient.audit-coverage.test.ts` (1 richiesta catturata per ogni POST uscita, errori compresi). 20 test nuovi su fixture **senza rete**. tsc 2593 → **2589** (−4: spariti i 4 errori dei file toccati, nessuno nuovo), lint 918 invariato (5 errori, tutti preesistenti altrove), suite jest **identiche a master**, `audit:ci` PASS con 0 regressioni. ⚠️ **Nota per la #67**: `OfficialsService` manda `X-FIVB-App-ID` e `auxiliaryPersonsSync` no, quindi finché la #67 non toglie quell'header il percorso auxiliary-persons paga una preflight CORS che prima non pagava. L'header non è richiesto dall'endpoint; toglierlo è lavoro della #67, non di questa issue.
- **DONE**: Issue #67 (epic #51) — L'header `X-FIVB-App-ID` raddoppiava i round trip verso la VIS. Rendeva la POST non-simple secondo CORS, quindi il browser anteponeva una `OPTIONS`; la VIS autorizza l'header ma risponde **senza `Access-Control-Max-Age`**, quindi il preflight **non e' cachabile** e viene rifatto prima di ogni singola richiesta. **AC1 — accertato prima di rimuovere**: dieci endpoint probati con e senza header (`GetEventList`, `GetEvent` fielded e full, `GetBeachTournamentList`, `GetBeachMatchList`, `GetBeachMatch`, `GetBeachLive`, `GetEventRefereeList`, `GetEventOfficialList`, `GetRefereeList`) → risposte **byte-identiche**, stesso status, stesso numero di record: l'header non gatea quota, dati ne' accesso. Rimosso dai **10 punti rimasti** su master (`OfficialsService`, `RefereeAssignmentsService`, `RefereeStatsService`, `SetScoreService`, `TournamentOperationsService`, `RealtimeFallbackService`, `useLiveScores`, `useCourtManagement`, `useRealtimeData`, `useRefereeManagement`); la issue ne elencava 13, ma #46 e #47 avevano gia' ripulito `app/`. **Lasciato di proposito** in `supabase/functions/contextual-vis-sync` e in alcuni `scripts/*.js`: girano su Deno/Node lato server, dove non c'e' browser e quindi non c'e' preflight. **Misure (AC3/AC4)** — le `OPTIONS` **non sono osservabili**: non compaiono nel Resource Timing (per spec il preflight non genera una entry propria) e nemmeno via CDP/`list_network_requests`, che e' esattamente il muro contro cui aveva sbattuto la #47. Misurato quindi il **tempo per richiesta**, che il round trip in piu' lo contiene: (a) **A/B controllato** sulla stessa pagina, stesso endpoint, 12 richieste sequenziali per ramo — mediana **212 ms con header vs 94 ms senza (2,26×)**, e il costo **non decade** dalla 1ª alla 12ª richiesta: e' la prova diretta che il preflight non viene mai cachato; (b) **polling live**, finestra di 120 s su un torneo con match LIVE (evento 1734), produzione contro preview back-to-back: mediana **198 → 103 ms (−48%)**, tempo totale in VIS **1764 → 989 ms (−44%)**; (c) `tournament-ref` (41 richieste, `RefereeStatsService`), due coppie: mediana **243/283 → 209/175 ms**, totale **9272/10390 → 8197/7093 ms** — guadagno piu' contenuto perche' le 41 richieste partono in parallelo su una sola connessione HTTP/2 e i preflight si sovrappongono; il numero di richieste verso la VIS si dimezza comunque (82 → 41). **AC5**: `OfficialsService` passa da 4 a 2 round trip; PROJECT.md e CLAUDE.md dichiaravano "2 chiamate per torneo" senza dire che erano 4 round trip — corretto in entrambi. **AC6 — barriera**: `__tests__/no-vis-custom-headers.test.ts`, non una regola ESLint: `AUDIT_CONFIG.lintRoots` copre solo `src`/`app`/`components`, mentre **tutti e 10** i siti stavano in `services/` e `hooks/` — una regola ESLint sarebbe stata una barriera davanti alla porta sbagliata. Verificato che il test fallisce reintroducendo un header. La prova sperimentale vive nel doc comment di `VisApiClientConfig.headers`. tsc 2589 invariato, lint 918 invariato, suite jest identiche a master (stesse 8 suite rosse sui file toccati, prima e dopo), `audit:ci` PASS 0 regressioni, `curl-tests.sh` 17/17 sul preview. ⚠️ **Scoperto per sbaglio**: caricare `/all-referees` (fan-out non limitato, issue #65) fa **112 richieste** e ci fa **rate-limitare dalla VIS** — dopo quel test una singola richiesta e' passata da ~100 ms a **125 s**, e ci sono voluti ~25 minuti per rientrare. Con l'header erano 224 richieste. La #65 non e' solo una questione di eleganza
- **DONE**: Issue #65 (epic #51) — Due rotte rotte in produzione, e la causa del rate-limiting VIS. **`/all-referees`**: il `Promise.all` non limitato su `getSeasonStats` (≥3 richieste VIS per arbitro) sparava **112 richieste con picco di 50 in volo**; il flag `loading` era agganciato all'intero `Promise.all`, che si risolve solo quando si risolve l'**ultima** richiesta, e su quel cammino non c'era timeout — una richiesta che non risponde mai teneva su lo spinner per sempre. Misurato in browser sui due bundle: master **112 richieste / picco 50 / 0 righe di contenuto dopo 25 s (spinner ancora attivo)** → branch **picco 4, primo contenuto a 7,1 s con 4 richieste, 65 richieste per il caricamento completo, 1775 righe renderizzate**. Tre interventi: `utils/concurrency.ts` (semaforo + `mapWithConcurrency` + `withTimeout`), `services/RefereeSeasonStatsLoader.ts` (fan-out limitato a **4**, timeout **15 s** per arbitro, risultati consegnati progressivamente, non rigetta mai), e un **tetto globale di 4 richieste VIS in volo dentro `VisApiClient.makeHttpRequest`** — globale e non per istanza, perché ogni servizio costruisce il proprio client e la VIS non distingue i nostri oggetti. Tolto anche il fan-out **secondario**, invisibile finché lo schermo non caricava: ogni `RefereeCard` chiedeva le proprie statistiche da un `useEffect` di mount, su una lista non virtualizzata di ~1775 righe; ora le riceve dal passaggio bulk e interroga la VIS solo se l'utente espande la card. **`/notification-settings`**: `useTheme must be used within a ThemeProvider` **non** era una schermata montata fuori dal provider — il `ThemeProvider` non era montato **da nessuna parte** in tutta l'app, e i 4 file che importavano la versione context (`theme/ThemeContext`) leggevano poi `theme.colors.*`, che è la forma dell'**altra** `useTheme` (`hooks/useTheme`, funzione pura senza provider). Quindi montare il provider da solo non avrebbe risolto: avrebbe spostato il crash di una riga, su `undefined.background`. Corretti gli import **e** montato il provider in `app/_layout.tsx` (unico layout del progetto) perché la trappola non resti armata. Dietro quel crash ce n'era un **secondo**, mai visto perché il primo arrivava prima del render: `import Container from ...` su un modulo **senza default export** → `Element type is invalid ... got: undefined`. Aggiunti a `theme/tokens.ts` i 4 token che la schermata usa e che non esistevano (`surface`, `onPrimary`, `surfaceDisabled`, `textDisabled`): senza, la pagina sarebbe stata sì viva ma senza sfondi. tsc **2589 → 2463** (−126, tutti `TS2339` sui `theme.colors.X` inesistenti; **zero errori nuovi**), lint 918 → **916** (5 errori invariati), suite jest **nessuna regressione** (le 4 suite che cambiano esito sono ordine-dipendenti e falliscono identicamente su master), `audit:ci` **PASS / 0 regressioni**. 33 test nuovi in 4 suite, verificati falsi col bug presente (9/10 e 3/4 rossi ripristinando il codice di master). **Trovate e NON corrette** (fuori scope, segnalate): `/analytics-dashboard` e `/analytics-settings` sono **pagine bianche** — `hooks/useAnalyticsSettings.ts:42` chiama `LocalStorageManager.getInstance()`, statico che non esiste (`services/LocalStorageManager.ts` esporta solo la classe); `services/RealtimeSubscriptionService.ts:9` ha lo stesso difetto di default-import di `notification-settings`; `/referee-profile` e `/match-detail` raggiunte per URL diretto senza parametri restano su "Loading…" indefinito. **`/referee-dashboard` redirige a `/tournament-selection`**: il redirect è **condizionale e voluto** (`screens/RefereeDashboardScreen.tsx:100`) — scatta solo quando non c'è un torneo selezionato, né nei parametri né in `TournamentStorageService`. Aprendo la rotta per URL diretto non c'è mai un torneo, quindi sembra un redirect incondizionato; non lo è. Decisione: **lasciato com'è** e documentato (vedi sezione dedicata)
- **DONE**: Issue #49 (epic #51, wave 3) — Riduzione errori TypeScript per **causa radice**, non per singolo uso. **2462 → 1757 (−705, −28,6%)**, baseline audit **2721 → 1795**. ⚠️ **Misurare con `.expo/types/` ed `expo-env.d.ts` assenti**: se hai lanciato `npx expo start`, Expo li genera (gitignored) e il conteggio sale di oltre 2000 righe da file estranei. Classificazione per causa radice, in ordine di resa: **424** = `supabase/functions/**` typecheckate dal tsconfig dell'app pur essendo Deno (hanno il proprio `deno.json`, importano da URL, usano il global `Deno`) → escluse: non e' un fix di tipi ed e' contabilizzato a parte; **91** = libreria icone incompleta (36 voci referenziate dai componenti e mai definite in `IconLibrary`/`CORE_ICON_MAP`) più `width`/`height`/`fill` passati da ~60 call site a un componente che ragiona per `size`/`colorKey` → voci aggiunte e override **onorati**, non solo dichiarati; **~45** = `BeachMatch` senza gli alias VIS di data/arbitro che i consumer leggono nelle catene di fallback; **39** = `NodeJS.Timeout` in 30 file, tipo del runtime Node mentre su RN/web `setTimeout` restituisce `number` → `TimerHandle = ReturnType<typeof setTimeout>` in `types/timers.d.ts`; **37** = `ColorToken` senza `statusColors`, che `theme/tokens.ts` espone davvero; **27** = import verso export inesistenti (`_Modal`, `_Severity`, ...), residuo di una rinomina in blocco che aveva prefissato con `_` anche il nome importato; **24** = `CachedApiResponse`/`InstrumentedApiResponse` dichiarate `interface ... extends ApiResponse<T>` dove `ApiResponse<T>` e' una **union** — un'interface che estende una union non ne eredita i membri, quindi avevano perso `success`/`data`/`error` → convertite a intersezione. **Target −30% (≤1723) non raggiunto per 34 errori, di proposito**: il residuo non e' "tipi troppo stretti" ma codice e tipi in disaccordo con il codice dalla parte del torto (`DatabaseMapper` scrive `{number,name}` dove `CourtInfo` vuole `{courtNumber,courtName}`; `Assignment` a cui la UI chiede campi che nessuno produce) — allargare quei tipi avrebbe fatto scendere il contatore nascondendo difetti reali. Ritirata anche la conversione a intersezione di `MatchesQueryResult`/`TournamentsQueryResult`/`RefereeAnalyticsQueryResult` (`UseQueryResult` e' anch'essa una union): corretta, ma fa emergere ~60 errori a valle per un guadagno netto di 2. **~220 errori residui vivono in file orfani** (`components/index.ts` non e' importato da nulla, e con esso `TournamentInfo/*`, `MatchResult/*`, `entities/Player/*`, `TournamentDetail.tsx`): cancellarli porterebbe il totale a ~1540 (−37%) — decisione di prodotto, issue a se'. Zero `any` nuovi, zero `@ts-ignore`. jest **279 falliti / 1420 passati vs 280/1419 su master** (parita', ±1 di flakiness), lint **901 (5 errori) vs 915 (5 errori)** — 14 warning in meno, nessun errore nuovo, `audit:ci` **PASS / 0 regressioni**, build web OK. **Bug reali trovati e NON corretti** — vedi sezione dedicata sotto
- **DONE**: Issue #71 + #73 (una sola PR) — Sei difetti che `tsc` segnalava da tempo, piu' la ricerca sistematica che entrambe le issue chiedevano (#71 AC4 / #73 AC6), fatta **una volta sola**. **tsc 1757 → 1708 (−49)**, `audit:ci` **PASS / 0 regressioni**, lint **901 (5 errori), invariato**, jest **272 falliti / 1440 passati vs 279/1420 su master** (−7 falliti, +20 passati, +13 test nuovi). I sei difetti: (1) `/analytics-dashboard` e `/analytics-settings` erano **pagine bianche** — `LocalStorageManager.getInstance()` non esiste, e sotto c'era un **secondo** difetto (`getItem`/`setItem` non esistono su quella classe, la sua API e' `get`/`set(key,data,ttl)`/`delete`): correggere solo il primo avrebbe scambiato l'errore rosso per una pagina bianca, esattamente il caso della #65 — le impostazioni sono passate su AsyncStorage, che e' dove il progetto tiene le preferenze; (2) `/referee-settings` — **la #73 la dava per `ReferenceError` garantito, verificato in produzione che non lo e'**: la rotta si apre e renderizza, ma ogni chiamata a `VisApiService` (servizio rimosso dalle #46/#47) sta dentro un `try/catch` che ingoia il `ReferenceError`, quindi "Court Monitor" dice "No matches found" e "Referee Monitor" non fa niente, console pulita — lo schema della #43, un catch che degrada un errore fatale in silenzio. **Rimossa dalla navigazione** (opzione prevista da AC1: duplica `/tournament-ref`, `/all-referees` e `/ref-mode`, ed era gia' `disabled: true` nel side menu); il file dello schermo e' **conservato** con in testa il perche' e cosa servirebbe per riviverlo, perche' cancellare una feature e' una decisione di prodotto; (3) i **sei metodi inesistenti su `VisApiClient`**: quattro **aggiunti al client** (`fetchMatchesForTournament` e `fetchBeachTournamentsThisYear`, che 10 chiamanti usavano con la stessa composizione `getBeachMatchList`/`getEventList` + `VisResponseParser`; `getBeachMatchStatus`, che era la causa del `TS2420` sulla classe; `getTournamentTeamList`, specificato da `specs/003-players-entry-list` ma mai scritto — endpoint, tipi e metodo — con `/tournament-teams` rotta di conseguenza), due **corretti nel chiamante** (`getTournaments` e `getMatches`: non sono endpoint VIS, i veri sono `GetEventList` e `GetBeachMatchList`). Rimossi da `IVisApiClient` i due alias **opzionali** che dichiaravano metodi che nessuno implementava: un membro opzionale non implementato non rende sicura la chiamata, nasconde solo il fatto che il metodo non c'e'; (4) il **punteggio del set in corso** non appariva mai su `/match-detail` — la chiave era sbagliata (`liveData.currentSet` invece di `score.currentSet`) **e** `score.currentSet`/`score.points` non erano popolati da nessun percorso, e `state.liveData` e' uno slot legacy sempre `null`: corretti tutti e tre i livelli, con `deriveCurrentSet()` che ricava il set in gioco da `status.state`; (5) tre chiavi di stile inesistenti in `MatchCard` (`setScoreText`, `currentSetScoreText`, `liveIndicatorText`) piu' due stili di testo applicati a una `View`; (6) `useRefereeManagement` leggeva i nomi VIS grezzi (`NoReferee1`, `Referee1Name`) su match ormai parsati, e rispondeva sempre "No Referees Found". **Ricerca sistematica (AC4/AC6)**: due famiglie distinte, entrambe interamente enumerabili da `tsc` — vedi la sezione dedicata sotto
- **TODO**: Rientro del baseline `.audit-baseline.json` verso zero (1795 finding bloccanti dopo #49: 1757 TS, 5 ESLint error, 33 error-handling; **0 Critical, 0 security**)

## Il peso del bundle non è la leva dell'LCP (issue #38)

**Misurato, non stimato.** La #38 ha tolto al chunk `entry-*.js` il **41% in
brotli e il 44% in raw** (866.641 → 511.623 B br; 3.674.188 → 2.072.378 B raw).
LCP misurato subito dopo, produzione contro deploy preview, back-to-back nella
stessa sessione di browser:

| scenario | prod | dopo #38 | Δ |
|---|---:|---:|---:|
| first view, cache fredda | 2268 ms | 2156 ms | −112 ms (−4,9%) |
| repeat view, no throttling (mediana di 3) | 956 ms | 1020 ms | dentro il rumore |
| repeat view, 4x CPU + Fast 4G | 1380 ms | 1236 ms | −104 ms (−7,6%) |
| repeat view, 4x CPU, trace DevTools | 2165 ms | 1915 ms | −250 ms (−11,5%) |
| **download del chunk, cache fredda** | **685 ms** | **440 ms** | **−245 ms** |

La issue #38 dava per assodato che *"oltre il 95% dell'LCP è parse + execute di
quel chunk"*. **Non è così.** Se lo fosse, un taglio del 44% sarebbe valso
~800 ms; ne vale 110-250. L'unico guadagno che si vede per intero è quello di
rete, sul download.

Il resto dell'LCP è **boot di React-Native-Web + round-trip verso la VIS API**,
che è ciò che produce davvero l'elemento LCP — contenuto data-driven, non
prerenderizzabile. È la stessa conclusione già misurata dalla #34 e la diagnosi
della #32 (*"il render delay è boot RN-Web, non il bundle"*), ora confermata una
terza volta e con l'esperimento più netto possibile: dimezzare il bundle.

**Conseguenza operativa: non aprire altre issue di dimagrimento del bundle
aspettandosi un guadagno di LCP.** I ~230 KB raw ancora identificati (Supabase
~140 KB, luxon ~71 KB) varrebbero forse 40-60 ms. Gli AC11/AC12 di #36
(LCP < 1500 / < 1800 ms) richiedono gli interventi architetturali già a backlog:
output Expo `server` con data fetching lato server, oppure un runtime più
leggero di react-native-web. Il dimagrimento resta comunque un guadagno reale e
permanente su rete, memoria e batteria — semplicemente non è la leva che si
credeva.

## Come si misura il peso dell'entry chunk (issue #38)

**Il peso su disco non dice nulla sul peso spedito, e la dimensione di un file
sorgente non dice nulla su quanto pesi nel bundle.** L'unico modo onesto di
sapere cosa occupa il chunk `entry-*.js` è attribuirne ogni byte generato al
sorgente da cui proviene, tramite la sua source map:

```bash
npx expo export --platform web --source-maps --output-dir dist-map
node scripts/analyze-bundle.js dist-map --top 20 --json analysis.json
```

Lo strumento stampa raw / brotli / gzip del chunk, i primi N contributori
aggregati per pacchetto npm o file applicativo, i primi N singoli file, e lo
split dipendenze / codice applicativo. `dist-map/` è in `.gitignore` ed escluso
dai checker dell'audit.

Due trappole che questo script ha già preso in trappola una volta:

1. **Il JSON non ha mapping.** I glyph map di `@expo/vector-icons` (345 KB) non
   comparivano tra i contributori perché nessun mapping li copre: si vedevano
   solo come "unattributed". Se la quota non attribuita è alta, guarda le righe
   più lunghe del bundle a mano — è lì che si nascondono i dati inline:
   ```bash
   node -e "const l=require('fs').readFileSync('dist/_expo/static/js/web/entry-<hash>.js','utf8').split('\n'); l.map((s,i)=>[i+1,s.length]).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([i,n])=>console.log(i,n,JSON.stringify(l[i-1].slice(0,80))))"
   ```
2. **Il brotli locale non è quello di Netlify.** In locale `zlib` a qualità 11
   comprime molto più di quanto faccia Netlify (~19% contro ~24% del raw sullo
   stesso contenuto). Confronta sempre locale-con-locale e deploy-con-deploy,
   mai i due fra loro. Sul deploy si misura così:
   ```bash
   curl -s -H 'Accept-Encoding: br' -o /dev/null -w '%{size_download}\n' <entry-url>
   ```

Il budget di peso dell'entry è verificato a ogni run di `tests/curl-tests.sh`
(`ENTRY_MAX_BROTLI_BYTES`): un aumento fa diventare rosso lo smoke test.

## Codice lazy e peso dell'entry chunk (issue #45)

**`require()` dentro una funzione NON alleggerisce il bundle.** Metro lo risolve
staticamente come un `import`: rimanda l'esecuzione, non il caricamento. L'unico
costrutto che sposta davvero del codice fuori dal chunk `entry-*.js` è
l'**`import()` dinamico**, che crea un chunk async separato.

Il caso reale è `hooks/compatibility/CacheServiceCompatibility.ts` →
`services/DualReadService.ts`: il `require()` c'era da tempo, con il commento
"get instance dynamically", e nessuno aveva verificato che il file finisse
comunque nell'entry. Prima di dichiarare lazy qualcosa, **cercalo nel bundle**:

```bash
npx expo export --platform web
grep -c "<una stringa unica del modulo>" dist/_expo/static/js/web/entry-*.js
```

Vale anche al contrario: prima di eliminare un file perché "importato da 0
file", verifica che fosse davvero spedito. Nella #45 i quattro file rimossi non
erano nel bundle affatto, quindi la rimozione ha guadagnato **0 byte** — un
esito legittimo, purché misurato e dichiarato invece che stimato dal peso su
disco.

## Web — configurazione cache e redirect (issue #36)

**Unica fonte di verità: `public/_headers`** (copiato in `dist/_headers` da
`expo export`). **NON** `netlify.toml`.

Origine storica, verificata sul deploy preview 37: fino alla #52 il sito non era
buildato da Netlify da git ma dal job di deploy della GitHub Action, che
scaricava **solo** l'artifact `dist/` senza mai checkoutare la repo — quindi
`netlify.toml` non era nemmeno presente al momento del deploy e i suoi blocchi
`[[headers]]`/`[[redirects]]` erano inerti (ogni risposta tornava col default
Netlify `public,max-age=0,must-revalidate`).

**Dopo la #52 questo non è più vero**: pubblica solo l'integrazione git di
Netlify, che checkouta la repo, quindi `netlify.toml` **viene letto**. La regola
resta comunque quella: gli header si dichiarano in `public/_headers` e basta.
Duplicarli in `netlify.toml` non porta alcun beneficio e crea un secondo posto
dove sbagliare l'ordinamento (vedi sotto) — con l'aggravante che solo uno dei
due finisce in `dist/`. Verificato sul deploy Netlify-nativo della PR #59:
15/15 check di `tests/curl-tests.sh` verdi con le regole solo in
`public/_headers`.

**Ordinamento**: Netlify applica tutte le regole che matchano e, a parità di
nome header, vince l'**ultima**. I glob sono greedy sui separatori di path
(`/*.js` matcha `/_expo/static/js/web/x.js`). Le regole specifiche vanno
quindi dichiarate **per ultime**, e regole generiche per estensione non devono
esistere: era esattamente questo il bug (`/_expo/*` dichiarato prima di
`/*.js`, che quindi vinceva con `max-age=0`).

Nessun `public/_redirects`: il per-route SSG di #34 funziona con i pretty URL
di Netlify senza alcuna regola di redirect, e un catch-all SPA lo romperebbe.

| Path | Cache-Control | Perché |
|---|---|---|
| `/*` (documenti HTML) | `no-cache, no-store, must-revalidate` | i deploy devono arrivare subito agli utenti |
| `/static/*`, `/bundles/*` | `public, max-age=31536000, immutable` | output alternativi hashati |
| `/_expo/*` | `public, max-age=31536000, immutable` | filename content-hashed dall'export Expo |
| `/assets/*` | `public, max-age=31536000, immutable` | font/immagini con hash nel filename |
| `/service-worker.js` | `no-cache, no-store, must-revalidate` | è il file da cui il browser scopre una nuova versione |

Verificare sempre l'effetto reale con `./tests/curl-tests.sh <deploy-preview-url>`
— le regole header di Netlify non sono verificabili in locale.

**Service worker**: serve solo per le web push. Non ha (e non deve avere) un
handler `fetch` — intercettare le navigazioni aggiungeva ~1.8 s di TTFB percepito
senza alcun beneficio di caching. `APP_VERSION` va bumpato a ogni modifica del file.

## Officials di torneo (issue #40)

`services/OfficialsService.ts` è **l'unico punto** da cui prendere i nomi degli
officials. Prima esistevano solo script sciolti in root; la logica di parsing è
ora consolidata e testata.

### Ricetta VIS (verificata su EventNo 1719 e 1525)

| # | Chiamata | Restituisce |
|---|---|---|
| 1 | `GetEvent No=<eventNo> Fields="No Name AuxiliaryPersons"` | anagrafica: `No`, `FirstName`, `LastName`, `NationalityCode`, `Functions` |
| 2 | `GetBeachMatchList` filtrata per `NoEvent`, campo `Personnel` | per ogni match gli **ID** di Scorer / AssistantScorer / LineJudge1 / LineJudge2 |
| 3 | `GetEventRefereeList` filtrata per `NoEvent` | delegazione arbitrale con nome e federazione |

`AuxiliaryPersons` e `Personnel` sono **XML escapato dentro XML**: decodifica e
re-parsing in `utils/visEmbeddedXml.ts` (entità nominate **e** numeriche
`&#xD;&#xA;`, decodifica in un passaggio solo). Gli ID del punto 2 si risolvono
**in locale** contro l'anagrafica del punto 1 — nessuna chiamata per match.

**Costo: 2 chiamate per torneo intero** (1 + 2), indipendente dal numero di
match. `OfficialsService.getTournamentOfficials()` riporta il conteggio reale su
`apiCallCount`; un test lo verifica contando le chiamate al client mockato.

> **Correzione (#67).** Fino alla #67 questa riga — e la stessa affermazione
> fatta a voce a Davide quando la #40 è stata consegnata — contava le chiamate
> *applicative* e taceva sui **round trip di rete**, che sul web erano il
> doppio: il client di questo servizio mandava `X-FIVB-App-ID`, la POST
> diventava non-simple, e il preflight `OPTIONS` non era cachabile perché la VIS
> risponde senza `Access-Control-Max-Age`. **2 chiamate = 4 round trip.** La #67
> ha tolto l'header: oggi 2 chiamate sono **2 round trip**. Il numero di
> chiamate era giusto; era la conclusione "quindi costa poco" a non esserlo.

### Codici `Functions`

`2` = line judge, `4` = scorer / assistant scorer. Nessun altro codice osservato.
Un codice sconosciuto **non** fa crashare nulla: diventa `AuxiliaryFunction.UNKNOWN`
e il codice grezzo resta su `functionCode`.

### Due dettagli VIS che costano ore se non si sanno

1. **`GetEventRefereeList` risponde solo dentro un envelope `<Requests>`.**
   Inviata nuda torna `<NotInNewFormat id="1008" />`. Il builder di
   `VisApiClient` è stato corretto di conseguenza (prima era rotto).
2. **La VIS ignora silenziosamente i campi invalidi** invece di dare errore: si
   possono sondare decine di nomi di campo in una chiamata sola, ma non esiste
   modo di farsi elencare lo schema.

### Limite noto — NON re-indagare

**I nomi di referee coach e technical delegate non sono ottenibili dalla VIS
pubblica.** Verificato a livello evento, torneo e match su due eventi, sondando
~60 nomi di campo candidati. `GetEventOfficialList` restituisce esattamente le 2
entità che quasi certamente sono quei ruoli, ma espone solo `No` e `Version`;
`GetEventOfficial` singolare risponde `NotInNewFormat`. I ruoli sono elencati in
`UNAVAILABLE_EVENT_OFFICIAL_ROLES` (`types/referee-v2.ts`) e riportati su ogni
risultato del servizio, così i consumer li mostrano come *non disponibili*.

### Verifica manuale

```bash
node scripts/show-tournament-officials.js 1719
```

Stampa roster, officials per match e il numero di chiamate VIS spese.

### Nota per il futuro (DB)

`match_referees` copre solo `referee1`/`referee2`, non ha posto per gli officials
ausiliari, e Supabase non è configurato sul web. Questa feature è quindi
API + cache, non DB. Per persistere servirebbero `event_officials` e
`match_officials` popolate dalle stesse 2 chiamate — ma il prerequisito è
valorizzare le credenziali nel deploy.

## Anagrafica arbitri (issue #46)

`services/RefereeDirectoryService.ts` è **l'unico** punto da cui le schermate in
`app/` leggono l'anagrafica arbitri. Prima della #46 le quattro schermate
parlavano con `fivb.org` da dentro il corpo del componente, con 13 `fetch`.

### Perché non era solo brutto

`ApiAuditService` misura **solo ciò che passa da `VisApiClient`**. Le percentuali
di payload reduction, cache hit rate e call volume riportate in CLAUDE.md erano
quindi **cieche** su tutto questo traffico. Tre schermate su quattro non avevano
cache e rifacevano ogni richiesta a ogni montaggio.

### Chi chiede cosa

| Metodo | Chiamata VIS | Chiave cache | TTL |
|---|---|---|---|
| `getEventReferees` | `GetEventRefereeList` | `referees:event:<eventNo>` | 120 s |
| `getEventOfficials` | `GetEventOfficialList` | `referees:event-officials:<eventNo>` | 120 s |
| `getEventMatches` | `GetBeachMatchList` | `referees:event-matches:<eventNo>` | 15 s |
| `getAllReferees` | `GetRefereeList` | `referees:all:<sport>` | 120 s |
| `getReferee` | `GetReferee` | `referees:one:<no>` | 120 s |
| `getBeachEvents` | `GetEventList` | `referees:events:beach` | 120 s |
| `getRefereePortraitUrl` | `GetImageList` | `referees:portrait:<id>` | 120 s |
| `getRefereeIdCardUrl` | `GetRefereeIdCard` | **non cachato** — il token è monouso |

### L'envelope `<Requests>`, di nuovo

`GetRefereeList`, `GetReferee`, `GetImageList` e `GetRefereeIdCard` si comportano
come `GetEventRefereeList` (#40): **senza** l'envelope `<Requests>` rispondono
`<NotInNewFormat id="1008" />`. I builder in `VisApiClient` lo mettono; non
riscriverli "per uniformità" con gli altri endpoint, che invece lo vogliono nudo.

### Il risparmio, misurato

`tournament-ref` chiedeva **tre volte** lo stesso `GetEventRefereeList` in un
singolo caricamento, più la match list: 4 richieste per montaggio, 8 per
aprire → indietro → riaprire. Ora sono **2 e 2**. Congelato da
`__tests__/services/RefereeDirectoryService.test.ts` (blocco "API call budget").

### Niente header custom, o ogni richiesta costa il doppio

**Vale per tutti i client VIS, non solo per questo servizio** — dalla #67 nessun
`VisApiClient` dell'app manda header custom. Una POST con il solo
`Content-Type: application/x-www-form-urlencoded` e' una CORS *simple request*;
basta aggiungere un header fuori dalla safelist (per esempio `X-FIVB-App-ID`)
per renderla non-simple, e il browser antepone una `OPTIONS` di preflight. La
VIS risponde **senza `Access-Control-Max-Age`**, quindi il preflight non viene
cachato: **ogni richiesta diventa due round trip**, per sempre, e su un ciclo di
polling e' un ×2 a ogni tick. Misurato sul deploy preview della #46: un
caricamento di `all-referees` con l'header ha prodotto **31 `OPTIONS` e zero
POST completate**. Congelato da `__tests__/no-vis-custom-headers.test.ts`.
Non rimetterlo "per uniformita'".

### Limite noto — NON re-indagare

`GetReferee` e `GetImageList` **non funzionano con questo app id, e non
funzionavano nemmeno prima**. Verificato con richieste dirette alla VIS
(issue #46): `GetReferee` risponde `<Responses><AccessDenied /></Responses>` sia
**con** sia **senza** header `X-FIVB-App-ID`; `GetImageList` risponde una pagina
ASP.NET `Runtime Error` in entrambi i casi. Conseguenza: il ritratto non si
risolve mai e `referee-profile` mostra il fallback "View ID Card" — che e'
esattamente cio' che faceva prima, quando le stesse due chiamate fallivano in
silenzio dentro il componente. Nessun percorso critico chiama `GetReferee`: il
roster di `GetEventRefereeList` porta gia' gli stessi campi, ed e' per questo che
`ref-mode` non fa piu' una `GetReferee` per arbitro.

### Due difetti preesistenti, deliberatamente non corretti

- **`ref-mode` si cancella i dati da sola.** Il caricamento finisce con una
  `GetEvent` che *sovrascrive* incondizionatamente le liste ottenute dagli
  endpoint dedicati, cercando `<EventOfficialList>` / `<EventRefereeList>` che
  `GetEvent` non restituisce. Risultato: `Officials (0) / Referees (0)`. È il
  motivo per cui la schermata è "under construction". Preservato alla lettera
  con un commento in `app/ref-mode.tsx` che lo marca; toglierlo è una modifica
  funzionale e vuole la sua issue.
- **`all-referees` fa fan-out illimitato.** `Promise.all` su una richiesta
  statistiche **per ogni arbitro attivo**, senza limite di concorrenza →
  issue #65.

---
## Anagrafica arbitri, parte 2 (issue #47)

Con la #47 **nessun file fuori da `services/api/` nomina `fivb.org` dentro una
`fetch`**. Congelato da `__tests__/no-direct-vis-fetch.test.ts`: se qualcuno
riapre la scorciatoia, il test diventa rosso.

### Chi legge il roster di un evento, e quante volte

Tre consumatori chiedevano lo **stesso** `GetEventRefereeList` mentre la
schermata torneo era aperta. Ora condividono l'entry
`referees:event:<eventNo>` di `RefereeDirectoryService` (TTL 120 s):

| Consumatore | Cosa ne fa |
|---|---|
| `screens/TournamentDetailScreen.tsx` | nomi + federazione per i filtri |
| `components/referee/TournamentRefereeList.tsx` | la lista della tab Officials |
| `utils/challengeRefereeSync.ts` | mappa **sincrona** id → nome per `MatchCard` |

`challengeRefereeSync` e `matchOfficialsSync` restano perché fanno una cosa che
un servizio async non può fare: si leggono **dentro il render**. Quello che
hanno perso è la rete e il parser XML propri.

### `RefereeStatsService`: cosa è cambiato e cosa no

Le 6 `fetch` sono diventate chiamate al client. Due non sono nemmeno diventate
chiamate: `resolveRefereeNameFromEvent` e il fallback per nome di
`resolveRefereeIdFromTournament` leggono il roster già cachato da
`RefereeDirectoryService`.

**Non corretti di proposito** (la issue è un refactoring): il filtro per nome
primario si fida del **primo** `NoReferee` che compare nella risposta, senza
verificare che sia quello chiesto; e `careerStartDate`/`careerEndDate` sono
calcolate e mai usate. Entrambi preesistenti alla #47.

### Il fan-out delle statistiche non è stato toccato

Aprire la tab arbitri costa **34 `GetBeachMatchList`** in 20 s, prima e dopo:
è il `Promise.all` non limitato di una richiesta statistiche per arbitro. È la
issue **#65**, non questa.

---

## Concorrenza verso la VIS (issue #65)

**Non esiste un `Promise.all` accettabile su una lista di richieste VIS.** La
VIS è un servizio condiviso della federazione e throttla: un caricamento di
`/all-referees` con fan-out non limitato ha prodotto **112 richieste con picco
di 50 in volo** e ha portato una `curl` verso la VIS da ~100 ms a **125 s**, con
~25 minuti per rientrare (misura di #67). Il problema non è il totale, è la
raffica.

Esistono ora due limiti, e servono entrambi:

| Dove | Limite | Cosa protegge |
|---|---|---|
| `VisApiClient.makeHttpRequest` (`VIS_MAX_CONCURRENT_REQUESTS`) | **4 richieste HTTP in volo, di processo** | la rete: è il tetto che nessun chiamante può superare |
| `RefereeSeasonStatsLoader` (`REFEREE_STATS_CONCURRENCY`) | **4 arbitri alla volta**, `REFEREE_STATS_TIMEOUT_MS` 15 s ciascuno | la coda: evita di accumulare centinaia di richieste dietro il tetto |

**Perché il tetto è globale e non per istanza.** Ogni servizio costruisce il
proprio `VisApiClient` (`RefereeStatsService`, `RefereeDirectoryService`,
`OfficialsService`, …). Un limite per istanza non sarebbe un limite: una
schermata che tocca quattro servizi metterebbe comunque quattro volte il tetto
sul filo. La VIS non distingue i nostri oggetti. Congelato da
`__tests__/services/api/VisApiClient.concurrency.test.ts`, che verifica il
limite anche **fra istanze diverse**.

**Perché 4 e non 6 o 10.** Il browser apre al massimo **6** connessioni per host
su HTTP/1.1, che è quello che la VIS parla: sopra 6 le richieste non vanno più
veloci, si accodano nel socket pool dove non le vediamo e non le possiamo
annullare. Lasciarne 2 libere delle 6 significa che una raffica VIS non affama
il resto della pagina — ed era proprio quella fame a far sembrare
`/all-referees` congelata anche quando i dati stavano arrivando. Misurato:
picco 50 → **4**, primo contenuto utile da **mai** a **7,1 s** con 4 richieste.

**Il tetto è una rete, non una scusa.** Chi fa fan-out deve continuare a
limitarsi da solo (`mapWithConcurrency` in `utils/concurrency.ts`): il semaforo
del client serve a far sì che il prossimo `Promise.all` scritto senza pensarci
sia lento, non distruttivo.

### `loading` non deve mai dipendere da un `Promise.all` senza timeout

È la forma esatta del bug di `/all-referees`. `Promise.all` si risolve quando si
risolve la **sua ultima** promise: basta una richiesta che non risponde mai — e
sotto throttling è la norma, non l'eccezione — perché lo spinner resti su per
sempre. Regola: se un flag di caricamento sta a valle di un fan-out, quel
fan-out ha bisogno di un timeout per elemento **e** il flag va sganciato dai
dati opzionali. In `/all-referees` la lista arbitri è completa **prima** del
fan-out: mancava solo la chiave di ordinamento, e la si può riempire dopo aver
disegnato.

## `/referee-dashboard` redirige, ed è voluto (issue #65)

`screens/RefereeDashboardScreen.tsx:100` fa `router.replace('/tournament-selection')`
quando non trova un torneo — né nel parametro `tournamentData`, né in
`TournamentStorageService.getSelectedTournament()`. Il dashboard di un arbitro
senza un torneo selezionato non ha contenuto da mostrare, quindi il redirect è
corretto.

Aperta **per URL diretto** la rotta redirige sempre, perché per definizione non
c'è né parametro né torneo in storage: è questo che la fa sembrare un redirect
incondizionato. **Non è stata cambiata.** Se un giorno si vorrà renderla
linkabile, la strada è far scegliere il torneo *dentro* la schermata, non
togliere il redirect.

## Rotte verificate (issue #65, AC6)

Sweep sul bundle esportato del branch, ogni rotta caricata davvero in un
browser. Esito:

| Rotta | Esito |
|---|---|
| `/` | ✅ redirige a `/tournament-selection`, contenuto reale |
| `/tournament-selection` | ✅ lista tornei |
| `/tournament-detail` | ✅ stato vuoto esplicito senza parametri |
| `/referee-dashboard` | ✅ redirect voluto (sopra) |
| `/my-assignments` | ✅ |
| `/assignment-detail` | ✅ placeholder TBD senza parametri |
| `/match-results` | ✅ stato vuoto esplicito |
| `/switch-tournament` | ✅ "coming soon" |
| `/all-referees` | ✅ **corretta da questa issue** |
| `/notification-settings` | ✅ **corretta da questa issue** |
| `/db-stats` | ✅ errore esplicito (Supabase non configurato) |
| `/ref-mode` | ✅ (mostra `Officials (0) / Referees (0)` — limite noto di #46) |
| `/referee-settings` | ✅ |
| `/tools-selection` | ✅ |
| `/tournament-ref` | ✅ stato vuoto esplicito |
| `/tournament-teams` | ✅ stato vuoto esplicito |
| `/does-not-exist` | ✅ 404 |
| `/analytics-dashboard` | ❌ **pagina bianca** — vedi sotto |
| `/analytics-settings` | ❌ **pagina bianca** — vedi sotto |
| `/referee-profile` | ⚠️ "Loading referee profile…" indefinito per URL diretto |
| `/match-detail` | ⚠️ "Loading match details…" indefinito per URL diretto |

**`/analytics-dashboard` e `/analytics-settings`** muoiono con
`Uncaught TypeError: LocalStorageManager.getInstance is not a function`.
`hooks/useAnalyticsSettings.ts:42` chiama un metodo **statico** che non esiste:
`services/LocalStorageManager.ts` esporta solo la classe, da istanziare con
`new`. È **esattamente la famiglia di difetto della #43** (import/export
disallineato che il `tsc` segnalava e nessuno leggeva). Non corretto qui: è un
terzo bug su rotte che questa issue non copre, e merita la sua.

Stessa famiglia, sempre non corretta:
`services/RealtimeSubscriptionService.ts:9` importa `RefereeAssignmentsService`
come default da un modulo che non ha default export (TS2613).

Le due rotte ⚠️ sono schermate di dettaglio che vivono di parametri: raggiunte
dalla lista funzionano. Aperte per URL diretto restano su "Loading" invece di
dire "manca il parametro" — stessa classe dell'AC1 di questa issue, su una
superficie molto più piccola.

---

*Last Updated: 2026-07-26T12:00:00Z*

