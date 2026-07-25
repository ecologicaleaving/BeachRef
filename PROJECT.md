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
- **Last Deploy**: 2026-07-08T09:53:18Z (web — issue #34/PR #35 per-route SSG + skeleton)
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
- **DONE**: Issue #36 — Web perf cache/SW: rimosso `Clear-Site-Data: "cache"` (azzerava la cache HTTP a ogni risposta), `netlify.toml` unica fonte di verità per header e redirect (`public/_headers` e `public/_redirects` eliminati, incluso il catch-all SPA `/* → /index.html` che rompeva il per-route SSG di #34), chunk `/_expo/*` e `/assets/*` ora davvero `immutable`, service worker senza handler `fetch` e senza `caches.delete()` indiscriminato, latency probe di `NetworkStateManager` spostata dal documento HTML a `HEAD /favicon.ico` fuori dal percorso critico. Test: `tests/curl-tests.sh <BASE_URL>`, `npm run test:prerender`
- **TODO** (follow-up di #36, fuori scope): dimagrimento del bundle `entry-*.js` (868 KB br / 3.7 MB raw, ~3.2 s di download+parse) — richiede bundle analysis a sé
- **TODO** (epic, se prioritizzato): Web perf −80% architetturale — Expo output `server` con data fetching, o rimozione runtime pesante (reanimated)

## Web — configurazione cache e redirect (issue #36)

**Unica fonte di verità: `netlify.toml`.** Non reintrodurre `public/_headers` né
`public/_redirects`: la duplicazione ha già prodotto in produzione regole
contraddittorie (la regola generica `/*.js` sovrascriveva silenziosamente
l'`immutable` dei chunk hashati, e un catch-all SPA annullava il per-route SSG).

| Path | Cache-Control | Perché |
|---|---|---|
| `/*` (documenti HTML) | `no-cache, no-store, must-revalidate` | i deploy devono arrivare subito agli utenti |
| `/_expo/*` | `public, max-age=31536000, immutable` | filename content-hashed dall'export Expo |
| `/assets/*` | `public, max-age=31536000, immutable` | font/immagini con hash nel filename |
| `/static/*`, `/bundles/*` | `public, max-age=31536000, immutable` | output alternativi hashati |
| `/service-worker.js` | `no-cache, no-store, must-revalidate` | è il file da cui il browser scopre una nuova versione |

Le regole specifiche sono dichiarate **dopo** il default `/*`: così vincono sia
con la semantica "ultima regola che matcha" sia con "regola più specifica".
Verificare sempre l'effetto reale con `./tests/curl-tests.sh <deploy-preview-url>`.

**Service worker**: serve solo per le web push. Non ha (e non deve avere) un
handler `fetch` — intercettare le navigazioni aggiungeva ~1.8 s di TTFB percepito
senza alcun beneficio di caching. `APP_VERSION` va bumpato a ogni modifica del file.

---
*Last Updated: 2026-07-25T00:00:00Z*

