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
  Costo **2 chiamate per torneo**, indipendente dal numero di match. Vedi sezione
  "Officials di torneo" più sotto.

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
- **TODO**: Issue #38 (follow-up di #36) — dimagrimento del bundle `entry-*.js` (868 KB br / 3.7 MB raw): dopo #36 è il **95% dell'LCP residuo** (2115 ms di render delay su 2187 ms di LCP, con TTFB a 72 ms). Chiude i due target LCP lasciati aperti da #36
- **DONE**: Issue #40 — `services/OfficialsService.ts`: nomi di scorer/assistant scorer/line judge per match e delegazione arbitrale, **2 chiamate VIS per torneo** indipendenti dal numero di match. Decoding XML-nell'XML isolato in `utils/visEmbeddedXml.ts`, tipi in `types/referee-v2.ts`, 26 test su fixture reali senza rete, script `scripts/show-tournament-officials.js`. Fix collaterale: `GetEventRefereeList` in `VisApiClient` era rotto (mancava l'envelope `<Requests>`). Limite documentato: referee coach e technical delegate non ottenibili dalla VIS pubblica
- **DONE**: Issue #43 — Notifiche: l'init falliva a **ogni** avvio in produzione (`TypeError: w.default.getInstance is not a function`, degradato a warning dal try/catch di init). Causa: i 5 servizi in `services/notifications/` esportavano sia la classe (named) sia un `export default X.getInstance()` — cioè un'**istanza già costruita** con lo stesso nome — e i consumer importavano il default chiamandoci sopra il metodo **statico** `getInstance()`. Convenzione adottata: **solo named export della classe, nessun default export**; 13 file allineati (5 servizi + 8 consumer, incluso `NotificationService` stesso che usava male `WebPushService`). Aggiunto `NotificationService.isInitialized()` come prova positiva di init e log dedicati in `app/_layout.tsx`; l'init error è ora `console.error` in `__DEV__` (il warn silenzioso è ciò che ha nascosto il bug). Test: `__tests__/services/notifications/NotificationServiceInit.test.ts` (22 test, 19 falliscono col bug presente)
- **TODO** (epic, se prioritizzato): Web perf −80% architetturale — Expo output `server` con data fetching, o rimozione runtime pesante (reanimated)
- **DONE**: Issue #42 (epic #51, wave 0) — Il gate di qualità torna a dire il vero. `npm run audit` usciva **PASS/0 mentre 2 dei 3 checker crashavano** (`catch → console.warn → return []`) e **6 checker su 9 non venivano mai istanziati** (default = preset `quality`; lo scanner di sicurezza non era mai stato eseguito). Ora: tre esiti distinti **PASS/FAIL/ERROR** (exit 0/1/2), i checker non catturano più i propri errori, `ERROR` ha precedenza su tutto incluso `--fail-on` (era la via con cui `audit:ci` aggirava il controllo), tutti e 9 i checker girano di default e il **roster viene stampato** (chi gira e chi no). Fix ESLint (scope = `expo lint`, 928 finding = identico a `npm run lint`) e Complexity (`overrideConfigFile: true` scartava il parser TS → tutti i `.ts` ignorati; ora 176 finding reali). `typescript-error` riportato a **High** (era Medium "per flessibilità": rendeva il gate incapace di bloccare); il backlog preesistente è congelato in **`.audit-baseline.json`** (2780 finding bloccanti, budget per `(file, tipo)` — insensibile agli shift di riga) e il gate blocca **solo le regressioni**. Esclusioni path normalizzate POSIX (su Windows non matchavano mai: lo scanner camminava `node_modules`, `docs/`, artefatti di build). 31 test nuovi in `__tests__/scripts/audit/`. Comandi: `npm run audit` / `audit:ci` (9 checker), `audit:quality` (3, pre-commit), `audit:baseline` (ri-congela)
- **DONE**: Issue #48 (epic #51, wave 3) — Config jest riparata alla radice. La diagnosi iniziale (`uuid` ESM + MMKV + NetInfo) era incompleta: la causa dominante era che **`babel-preset-expo` riscrive ogni `process.env.EXPO_PUBLIC_*` in un import da `expo/virtual/env`** (ESM), quindi qualunque file che leggesse una env var esplodeva all'import. Fix in `jest.config.js`: `moduleNameMapper` su `expo/virtual/env` e `react-native-mmkv` (mock in-memory vero, non `jest.fn()`), transform per i `.js` con `@react-native/babel-preset` (dichiarare `transform` **sostituisce** la mappa di default: i `.js` non venivano trasformati affatto), `transformIgnorePatterns` allargato a `uuid`/`expo*`/`react-native*`/`@sentry`/`@tanstack`. Rimossi dai test i **21 file Deno** delle Edge Function Supabase (girano con `deno test`, mai con jest) e tolti i **fake timer legacy globali** da `jest.setup.js`, che congelavano `setTimeout` per tutte le suite (128 timeout da 5s che non erano bug). Toppa di `OfficialsService` rimossa: `require` lazy → import statici, 26 test verdi. Corretto `services/MatchResultOfflineService.ts` che importava `@react-native-netinfo/netinfo`, pacchetto inesistente. **Suite rosse 118 → 88, verdi 36 → 43, test verdi 994 → 1283 (+289), zero regressioni.** Doc: `TESTING.md`
- **TODO**: Wiring dell'audit in CI — oggi `npm run audit:ci` gira **solo** negli hook git (bypassabile con `--no-verify`), non sulle PR. `.github/workflows/audit.yml` documentato in CLAUDE.md non è mai esistito
- **DONE**: Issue #56 (epic #51, priorità massima) — Credenziali di produzione hardcoded su repo **pubblica**. `apply_migrations_pg.js:15` conteneva in chiaro la **password del ruolo `postgres` (superuser)** del DB Supabase di produzione dal commit `edd5e4a` del 2025-09-13: **dieci mesi** di esposizione. Lo stesso valore era in un **17° file non elencato dalla issue**, `apply_migrations_cli.js`, che è anche il runner che scriveva `temp_migration_*.sql` nella root (fallendo prima dell'`unlink`, ce li ha lasciati). Degli altri 14 file dell'elenco **nessuno conteneva un segreto**: i match erano `process.env.SUPABASE_SERVICE_ROLE_KEY` e policy SQL `auth.role() = 'service_role'` — la lista era il risultato di una ricerca per pattern, non di una verifica. Eliminati comunque come script one-off di sessioni chiuse (legati al torneo 1552 / a un arbitro specifico), previa verifica che nessuno fosse referenziato da `package.json`, `.github/`, `.husky/` o dalla documentazione. `TRIGGER-SYNC-FUNCTION.sql` riscritto: non aveva un segreto ma istruiva a incollarne uno in un file tracciato, ora legge da Supabase Vault. `supabase/.temp/` tolto dal tracking. Scanner di sicurezza: **14 finding (1 Critical + 13 High) → 0**. I 13 `security-http` erano **falsi positivi**: `xmlns="http://..."` e `SOAPAction:` in buste SOAP VIS — URI opachi mai dereferenziati, che riscritti a `https://` romperebbero la richiesta; lo scanner ora li esenta per singola occorrenza (una riga con namespace **e** endpoint http:// vero resta segnalata). **Barriera anti-ricomparsa**: nuovo preset `precommit` = `quality` + `security`, usato da `.husky/pre-commit` — prima il security scanner girava **solo in pre-push**. Prova eseguita con segreto finto: col nuovo scope il commit è **bloccato** (Critical +1, exit 1), col vecchio scope `audit:quality` lo stesso file passava **PASS/0**. `.gitignore` copre `temp_migration_*.sql`, dump e file di credenziali; `.env.example` documenta con placeholder le variabili degli script rimasti (che escono già con exit 1 e messaggio esplicito — nessun fallback hardcoded). ⚠️ **La rotazione dei segreti e il controllo degli access log restano a carico di Davide: la rimozione dal codice non chiude l'esposizione.**
- **DONE**: Issue #44 (epic #51, wave 0) — Sedimento nella root: **2,6 MB e 148 file tracciati** che non erano codice del progetto. Rimossi 62 marker `tmpclaude-*-cwd` degli agent, 5 dump di output di `tsc`/`jest`, `tmp.patch`, `temp-test.ts`, `repro_duration_bug.ts` e il file da 0 byte con path Windows malformato (il `:` era **U+F03A**, per questo `git rm` col nome letterale falliva — serve `--pathspec-from-file`). **56 script `.js`** classificati uno per uno e eliminati con indicazione di dove vive ora la logica: officials → `services/OfficialsService.ts` (#40), richieste VIS → `VisApiClient`/`OptimizedApiClient`, parsing → `VisResponseParser`, cache → `services/cache/`, transizione ReadyToStart→LIVE → `types/match-v2.ts::canReadyToStartMatchGoLive`, sync → `services/sync/`, schema arbitri → migration 012/013. Restano in root i 7 `.js` che sono configurazione. **31 `.md` → 4** (README/CLAUDE/PROJECT/AGENTS): 5 spostati in `docs/`, 22 eliminati (fra cui **quattro report di deployment dello stesso giorno in disaccordo tra loro** su READY/NOT READY). `.sql` sciolti: erano **5, non 9** (la issue contava una fotografia pre-#56); 4 eliminati perché già coperti da `supabase/migrations/`, `TRIGGER-SYNC-FUNCTION.sql` spostato in `supabase/manual/`. `.gitignore` esteso contro il riformarsi del sedimento; tolto `docs/` dalle ignore (bloccava solo l'aggiunta di documenti **nuovi**, mentre ~60 file sotto `docs/` erano già tracciati). Verifica di non-regressione: build/`npm test`/`lint`/`tsc` **identici a master** (2677 errori TS, 922 problemi ESLint, 117 suite fallite / 186 test falliti — invariati), nessuno dei file eliminati referenziato da `package.json`, `.github/`, `.husky/`, `netlify.toml`, `eas.json`, `app.json`, docs o codice (due scansioni indipendenti; gli **unici** due file di root citati da qualcosa, `color-migration-report.json` e `TRIGGER-SYNC-FUNCTION.sql`, sono stati conservati)
- **DONE**: Fix collaterale emerso da #44 — **`npm run audit:ci` era rosso su `master`** per chiunque avesse `node_modules` installato. La #42 aveva corretto il matching di `excludePaths` (POSIX-normalizzato) nella funzione condivisa `shouldExcludePath()`, ma vi aveva collegato **solo il security scanner**: error-handling, performance, data-flow e build avevano ciascuno una copia incollata del walker con la riga sbagliata e continuavano a scendere in `node_modules`. Error Handling riportava **150 finding invece di 39, di cui esattamente 111 da codice di terze parti** — e sono di severità High, quindi il gate li contava come regressioni bloccanti oltre la baseline. Tutti e quattro usano ora `shouldExcludePath()`; i numeri tornano esattamente quelli documentati in CLAUDE.md, regressioni **0 → PASS**, e la run completa passa da ~187 s a ~62 s. **La baseline non è stata rigenerata** (l'avrebbe congelata coi 111 finding di `node_modules`). Congelato da `__tests__/scripts/audit/checker-exclusions.test.ts` (15 test; 9 falliscono senza il fix)
- **DONE**: Issue #52 (epic #51, decisione 1 di #50) — Un solo sistema pubblica il sito. Fino a oggi il web era deployato **due volte a ogni push**: dalla GitHub Action (`nwtgck/actions-netlify`, che vinceva la corsa — era il suo artifact quello che vedevano gli utenti) e in parallelo dall'integrazione git di Netlify, di cui sulle PR si vedevano solo i check. Rimossi i job `deploy` e `deploy-preview`; il job `build` **resta** come gate sulle PR (perdere la verifica "compila?" sarebbe stato un regresso) e il workflow è stato rinominato `netlify-deploy.yml` → **`web-build.yml`**, con il job id `build` invariato. Conseguenza non ovvia: Netlify **checkouta la repo**, quindi `netlify.toml` da inerte diventa **letto** — i commenti in `netlify.toml` e `public/_headers` che spiegavano perché era inerte sono stati riscritti, perché da oggi mentono. Gli header **restano in `public/_headers`**: spostarli in `netlify.toml` ora che verrebbe letto sarebbe una seconda migrazione senza beneficio e un secondo posto dove sbagliare l'ordinamento. `NODE_VERSION = "18"` dichiarato esplicitamente in `netlify.toml` (allineato a `.nvmrc` e al workflow). **Env var: nessuna necessaria** — verificato scaricando i due bundle `entry-*.js`, quello di produzione (buildato dalla Action) e quello del deploy Netlify-nativo della PR #59: **zero** occorrenze di URL Supabase o chiavi in entrambi, dimensioni entro lo 0,02% — la Action non passava alcuna `EXPO_PUBLIC_*` e Netlify non ne ha configurate, quindi il bundle pubblicato non cambia. Prova che l'integrazione Netlify regge: `tests/curl-tests.sh` sul permalink del deploy Netlify-nativo della PR #59 → **15/15 verdi** (chunk `_expo` `immutable`, HTML `no-store`, nessun `Clear-Site-Data`, SSG per-rotta). ⚠️ I secret GitHub `NETLIFY_AUTH_TOKEN` e `NETLIFY_SITE_ID` non sono più usati da nulla: **revocarli** è a carico di Davide. `docs/DEPLOYMENT_SETUP.md` riscritto (descriveva i secret della Action e attribuiva a `netlify.toml` redirect SPA e header di sicurezza mai esistiti)
- **TODO**: Rientro del baseline `.audit-baseline.json` verso zero (2721 finding bloccanti: 2677 TS, 5 ESLint error, 39 error-handling; **0 Critical, 0 security**)

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

---
*Last Updated: 2026-07-25T12:00:00Z*

