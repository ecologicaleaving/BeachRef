# Tech Stack

This is the **DEFINITIVE** technology selection for BeachRef. These choices will guide all development decisions and must be referenced by all team members and AI agents.

**Critical Constraint:** VIS API calls limited to ~30 second intervals - architecture designed for cache-first operations.

## Cloud Infrastructure
- **Primary Provider:** Supabase (Database, Auth, API, Edge Functions)
- **Web Hosting:** Vercel 
- **Key Services:** Supabase PostgreSQL, Supabase Auth, Supabase Edge Functions
- **Deployment Regions:** Global CDN via Vercel, Database in closest Supabase region

## Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| **Language** | Dart | 3.2.0+ | Primary development language | Flutter's native language, cross-platform capability |
| **Framework** | Flutter | 3.16.0+ | Frontend framework | Cross-platform web/mobile, single codebase |
| **Backend Service** | Supabase | Latest | Database, Auth, API, Edge Functions | Rapid development, PostgreSQL, real-time capabilities |
| **Database** | PostgreSQL | 15+ (via Supabase) | Primary data storage | Relational data, FIVB integration requirements |
| **Local Cache** | sqflite | 2.3.0+ | Local SQLite caching | Essential for 30s API gaps, offline capability |
| **Key-Value Store** | hive | 2.2.3+ | Session & preference storage | Fast local storage, user settings |
| **Authentication** | Supabase Auth + Google OAuth | Latest | User authentication | Easy setup, secure, future FIVB integration path |
| **State Management** | flutter_bloc | 8.1.0+ | Application state management | Industry standard, testable, scalable |
| **HTTP Client** | supabase_flutter | 2.0.0+ | API communication | Official Supabase client, real-time subscriptions |
| **Background Tasks** | workmanager | 0.5.0+ | Scheduled sync operations | Critical for respecting 30s API limits |
| **Web Hosting** | Vercel | N/A | Flutter Web deployment | Optimized for static sites, GitHub integration |
| **Edge Functions** | Supabase Edge Functions | Latest | VIS API integration & rate limiting | Server-side logic, API proxying, data transformation |
| **Development Tools** | Flutter SDK + VS Code | Latest | Development environment | Official tooling, excellent debugging |
