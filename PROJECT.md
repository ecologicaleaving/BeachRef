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
- **Web Deploy**: Netlify (Git-connected su master, build `expo export --platform web`)
- **Live URL (Mobile)**: N/A (mobile app)
- **Deploy Method**: expo-build (mobile) / Netlify (web)
- **Deploy Host**: expo-build-service (mobile) / Netlify (web)
- **CI Status**: passing
- **Last Deploy**: 2026-07-25T10:52:00Z (web — issue #40/PR #41 OfficialsService; prima PR #39 fix permessi CI)
- **Environment Variables**: 
  - `SUPABASE_URL`: Expo environment injection
  - `SUPABASE_ANON_KEY`: Expo secure store
  - `TOURNAMENT_API_KEY`: External API integration

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
- **TODO** (epic, se prioritizzato): Web perf −80% architetturale — Expo output `server` con data fetching, o rimozione runtime pesante (reanimated)

## Web — configurazione cache e redirect (issue #36)

**Unica fonte di verità: `public/_headers`** (copiato in `dist/_headers` da
`expo export`). **NON** `netlify.toml`.

Motivo, verificato sul deploy preview 37: il sito non è buildato da Netlify da
git. Lo deploya `.github/workflows/netlify-deploy.yml`, il cui job di deploy
scarica **solo** l'artifact `dist/` e lo passa a `nwtgck/actions-netlify` —
la repo non viene mai checkoutata in quel job, quindi `netlify.toml` non è
nemmeno presente e i suoi blocchi `[[headers]]`/`[[redirects]]` sono inerti.
Con le regole dichiarate solo in `netlify.toml` ogni risposta tornava con il
default Netlify `public,max-age=0,must-revalidate`.

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
*Last Updated: 2026-07-25T00:00:00Z*

