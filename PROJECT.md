# PROJECT.md - Single Source of Truth

## Project Info
- **Name**: BeachRef
- **Version**: v1.0.3
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
- **Live URL**: N/A (mobile app)
- **Deploy Method**: expo-build
- **Deploy Host**: expo-build-service
- **CI Status**: passing
- **Last Deploy**: 2026-02-15T06:00:00Z
- **Environment Variables**: 
  - `SUPABASE_URL`: Expo environment injection
  - `SUPABASE_ANON_KEY`: Expo secure store
  - `TOURNAMENT_API_KEY`: External API integration

## Repository
- **Main Branch**: main
- **Development Branch**: feature/issue-20-fix-tournament-matches-empty
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
- **TODO**: Integrazione livestreaming matches con metadata arbitraggio

---
*Last Updated: 2026-03-05T10:57:59Z*

