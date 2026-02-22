# PROJECT.md - Single Source of Truth

## Project Info
- **Name**: BeachRef Flutter
- **Version**: v1.0.0
- **Status**: development
- **Platforms**: apk, ios
- **Description**: App Flutter nativa per arbitri beach volleyball con performance ottimizzate

## Database
- **Provider**: supabase-cloud
- **Environment**: development
- **Database ID**: beachref-flutter-dev
- **Schema**: sql-migrations
- **Migration Status**: current
- **Connection**: 
  - DEV: shared with BeachRef main (localhost:54321)
  - PROD: same Supabase Cloud instance as main app
- **Backup**: inherited from main BeachRef project
- **Seed Data**: shared tournament + referee data
- **Admin URL**: https://supabase.com/dashboard

## Deployment
- **Live URL**: N/A (mobile app in development)
- **Deploy Method**: flutter-build
- **Deploy Host**: github-actions
- **CI Status**: development
- **Last Deploy**: 2026-02-15T06:00:00Z
- **Environment Variables**: 
  - `SUPABASE_URL`: Flutter environment configuration
  - `SUPABASE_ANON_KEY`: Secure Flutter storage

## Repository
- **Main Branch**: main (parent: BeachRef)
- **Development Branch**: flutter-rewrite
- **GitHub**: https://github.com/ecologicaleaving/BeachRef (subfolder: beach_ref_flutter)

## Tech Stack
- **Frontend**: Flutter 3.10+ + Dart 3.2+
- **Backend**: Supabase Edge Functions (shared)
- **Database**: PostgreSQL (via Supabase Cloud, shared)
- **State Management**: Riverpod + Riverpod Annotations
- **Navigation**: GoRouter v14
- **HTTP Client**: Dio v5
- **Local Storage**: Hive v2

## Services
- **Mobile App**: Flutter native compilation
- **Backend API**: Shared Supabase Edge Functions
- **Database**: Shared PostgreSQL with main BeachRef
- **Authentication**: Supabase Auth (shared user base)
- **Offline Storage**: Hive local database
- **Network**: Dio + Connectivity Plus

## Monitoring
- **Health Check**: App startup connectivity + API health
- **Database Health**: Shared monitoring with main app
- **Performance**: Flutter DevTools + custom metrics
- **Alerts**: development stage (basic logging)
- **Auto Deploy**: manual (flutter build + manual testing)

## Development
- **Local Setup**: 
  1. `flutter pub get` (dependencies)
  2. Setup shared Supabase credentials from parent project
  3. `flutter run` (development mode)
  4. Shared database with main BeachRef app
- **Build Process**: 
  1. `flutter build apk --release` (Android APK)
  2. `flutter build ios --release` (iOS build)
  3. Copy artifacts to parent releases/ directory
  4. Manual testing and quality assurance

## Troubleshooting
- **Flutter Issues**: `flutter doctor` + dependency conflicts
- **Build Problems**: Clean + rebuild (`flutter clean && flutter pub get`)
- **API Issues**: Shared troubleshooting with main BeachRef project
- **Performance**: Flutter DevTools profiling + memory analysis

## Backlog
- **TODO**: Migration completa da React Native a Flutter nativo
- **TODO**: Performance optimization per large tournaments data
- **TODO**: Offline-first architecture con sync intelligente
- **TODO**: Custom widgets per UI arbitri professionale
- **TODO**: Integrazione deep linking per quick match access
- **IN PROGRESS**: Core features parity con versione React Native
- **DONE**: Setup progetto Flutter + Supabase integration
- **TODO**: Automated testing suite + CI/CD pipeline
- **TODO**: Flutter-specific optimizations per battery life

---
*Last Updated: 2026-02-22T06:05:00Z*
*Auto-generated from: https://app.8020solutions.org/status.html*