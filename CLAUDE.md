# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
**BeachRef** is a professional Expo React Native application for beach volleyball referees built with TypeScript and Expo Router. The app provides comprehensive tournament management, referee assignments, match monitoring, and real-time synchronization with the VIS (Volleyball Information System) API. Built on React 19 and React Native 0.79.5 with the new architecture enabled.

## Development Commands

### Core Development
- `npm start` or `npx expo start` - Start the development server
- `npm run android` - Start with Android emulator
- `npm run ios` - Start with iOS simulator  
- `npm run web` - Start web version

### Code Quality
- `npm run lint` - Run ESLint with Expo config

### Testing
- `npm test` - Run the jest suite
- **Prima di scrivere il test di un servizio, leggi `TESTING.md`.**
  `VisApiClient` e `CacheService` si importano **staticamente**: la config jest
  (`jest.config.js`, `__mocks__/`) risolve `expo/virtual/env`, `react-native-mmkv`
  e le dipendenze ESM una volta per tutte. Non usare `require()` lazy nel codice
  di produzione né `jest.mock('expo/virtual/env')` nei singoli test (issue #48).

### Project Management
- `npm run reset-project` - Reset to blank project (moves current code to app-example/)

## Architecture Overview

### Core Domains
- **Tournament Management**: Tournament selection, details, and date extraction
- **Referee Assignments**: Assignment tracking, status management, and notifications
- **Match Monitoring**: Live match updates, court monitoring, and referee tools
- **Offline/Sync**: Robust caching, offline functionality, and data synchronization

### Navigation Architecture
The project uses Expo Router with a comprehensive screen-based navigation system:

**Main Screens** (`/app` directory):
- `/app/_layout.tsx` - Root layout with app initialization and cache warmup
- `/app/index.tsx` - Main dashboard screen
- `/app/tournament-selection.tsx` - Tournament browsing and selection
- `/app/tournament-detail.tsx` - Tournament details with match lists and tabs
- `/app/referee-dashboard.tsx` - Referee assignment overview
- `/app/ref-mode.tsx` - Referee mode tools (under construction)
- `/app/schedule-results.tsx` - Schedule and results view
- Multiple specialized screens for court monitoring, assignments, match details

**Navigation Components**:
- `BottomTabNavigation` - Primary app navigation
- `NavigationHeader` - Consistent header with back navigation
- Stack-based navigation with modal support

### Service Layer Architecture

**Cache Management Services** (✨ Optimized - specs/001-vis-api-optimization):
- `CacheService.ts` - Multi-level cache (Memory → MMKV → API) with adaptive TTL
  - Stale-while-revalidate pattern for instant UX
  - Additive field fetching for minimal API calls
  - Event-driven invalidation on status changes
  - Network-aware revalidation
- `MmkvStorage.ts` - MMKV wrapper (30x faster than AsyncStorage)
  - Memory-mapped storage for instant access
  - AsyncStorage-compatible API for easy migration
  - Built-in encryption support
- `MemoryCacheManager.ts` - In-memory LRU cache with MMKV integration
  - Level 1: Memory (instant access)
  - Level 2: MMKV (persistent, 30x faster)
  - LRU eviction when memory limit reached
- `CachePerformanceMonitor.ts` - Performance tracking and metrics
  - Hit/miss rate tracking (target: >70%)
  - Response time monitoring (target: <100ms)
  - Storage quota utilization
- `CacheWarmupService.ts` - Background cache warming and scheduling

**Data & Storage Services**:
- `TournamentStorageService.ts` - Tournament data persistence
- `LocalStorageManager.ts` - Local storage abstraction with error handling
- `VisApiClient.ts` - VIS API integration with optimization
  - Context-aware field selection (slim/default/full modes)
  - Batch request optimization (auto-split >10 requests)
  - Audit integration for development monitoring

**Real-time & Sync Services**:
- `RealtimeSubscriptionService.ts` - Real-time data subscriptions
- `TournamentStatusMonitor.ts` - Tournament status change monitoring
- `SyncManager.ts` - Online/offline data synchronization
- `NetworkMonitor.ts` - Network connectivity monitoring

**Business Logic Services**:
- `RefereeDirectoryService.ts` - Referee directory reads for the `app/` screens
  (issue #46). **The screens must not talk to the VIS themselves.** Until #46,
  `tournament-ref`, `all-referees`, `ref-mode` and `referee-profile` issued 13
  raw `fetch` calls to `fivb.org` from inside the component body, which bypassed
  retry, the request monitor and — the part that actually mattered —
  `ApiAuditService`, so the API conformance numbers in this file were blind to
  that traffic. Every read is now cached per key and routed through
  `VisApiClient`. If you need a referee-shaped datum in a screen, add a method
  here rather than a `fetch` there.
- `RefereeAssignmentsService.ts` - Assignment management
- `MatchResultsService.ts` - Match result handling
- `TournamentOperationsService.ts` - Tournament operations

**Monitoring & Audit Services** (✨ New - specs/001-vis-api-optimization):
- `ApiAuditService.ts` - Request capture and validation (__DEV__ only)
  - Captures all VIS API requests for analysis
  - Validates XML format, parameters, field counts
  - Detects malformed requests and over-fetching
  - Payload size monitoring (warn if >50KB)
  - Field count tracking per request
  - Integration with Sentry for critical issues
- `AuditReportGenerator.ts` - Compliance reporting
  - Generates audit reports with compliance scores
  - Groups findings by severity (critical/warning/info)
  - Calculates impact assessment (error rate, payload increase)
  - Provides specific recommendations
- `AuditStorageService.ts` - Audit data persistence (__DEV__ only)
  - 7-day rolling window retention
  - MMKV storage for fast access
  - Development-only (zero production overhead)
- `FieldSelectionValidator.ts` - Field count validation
  - Validates against thresholds (slim: ≤10, default: ≤20)
  - Detects over-fetching patterns
  - Provides optimization recommendations

**Polling Services** (✨ Optimized - specs/001-vis-api-optimization):
- `PollingConfigurationManager.ts` - Adaptive polling management
  - Status-based intervals (Running: 5s, Scheduled: 60s, Finished: off)
  - App state awareness (suspend after 30s in background)
  - Automatic resumption on foreground
  - Per-entity polling configuration

**Resilience & Error Handling**:
- `ConnectionCircuitBreaker.ts` - Circuit breaker pattern for API calls
- `RealtimeFallbackService.ts` - Fallback strategies for real-time failures
- `ErrorLogger.ts` - Centralized error logging
- Fallback to cache on BadRequestSyntax errors (specs/001-vis-api-optimization)

### Component Architecture

**Design System Components** (`/components`):
- **Foundation**: `Container`, `Button`, `ContrastControls` - Core UI building blocks
- **Brand**: `BrandLogo`, `BrandHeader`, loading/error states - Brand consistency
- **Typography**: `Text`, `MatchCard`, `StatusIndicator` - Text system
- **Status**: `StatusBadge`, `StatusIcon`, `StatusBar` - Status communication
- **Icons**: Comprehensive icon system with accessibility support

**Domain Components**:
- **referee/**: Referee-specific cards and lists
- **MatchList/**: Complex match filtering and display with referee grouping
- **tournament/**: Tournament status and assignment indicators
- **Assignment/**: Assignment cards and status management
- **MatchResult/**: Score entry and result submission workflows

**Specialized Components**:
- **TouchTarget/**: Touch target optimization for mobile
- **Hierarchy/**: Information hierarchy and scan-optimized layouts
- **navigation/**: Navigation-specific components

### State Management Architecture

**Assignment Status Management**:
- `useAssignmentStatus` hook with `AssignmentStatusProvider`
- Tracks current assignments, status counts, online state, sync status
- Real-time updates through subscription services

**Cache State Management**:
- Multi-level state: Memory → LocalStorage → API
- Automatic cache invalidation and refresh strategies
- Performance monitoring and optimization

**Persistent State**:
- LocalStorage for user preferences (filters, selected dates)
- AsyncStorage for sensitive referee data
- Robust error handling for storage failures

### Data Architecture

**VIS API Integration**:
- RESTful API integration with the Volleyball Information System
- Tournament data fetching with gender variant merging via `GetEventList`
- Match data retrieval using `GetBeachMatchList` with EventNo from tournaments
- **IMPORTANT**: Use `tournament.visNo` directly as TournamentNo in `GetBeachMatchList` calls
- **API Call Flow**: `GetEventList` → Extract EventNo → Use EventNo in `GetBeachMatchList`
- Referee assignment synchronization

**Caching Strategy** (✨ Enhanced - specs/001-vis-api-optimization):
- **Level 1**: Memory cache (LRU eviction, instant access <1ms)
- **Level 2**: MMKV storage (persistent, 30x faster than AsyncStorage, <5ms)
- **Level 3**: API calls with intelligent refresh logic
- **Adaptive TTL** based on data volatility:
  - Live data (running matches): 5s
  - Dynamic data (scheduled matches): 15s
  - Semi-static (tournaments): 120s (2 min)
  - Static (finished matches): 24h
- **Stale-while-revalidate**: Serve stale data immediately, refetch in background
- **Event-driven invalidation**: Auto-invalidate on status changes
- Cache warming on app initialization
- Network reconnect triggers revalidation

**Data Flow**:
1. VIS API → Cache Services → Local Storage
2. Cache Services → State Management → UI Components
3. UI Interactions → Business Logic Services → API Updates
4. Real-time Updates → Subscription Services → State Updates

### Error Handling & Resilience

**Error Boundaries**:
- `GracefulErrorBoundary` - App-level error recovery
- `RealtimeErrorBoundary` - Real-time feature error isolation

**Resilience Patterns**:
- Circuit breaker for API failures
- Exponential backoff for retries
- Graceful degradation for offline scenarios
- Fallback UI states for loading/error conditions

**Offline Functionality**:
- Full offline browsing of cached tournaments
- Offline assignment viewing
- Queue-based sync when connection returns
- Visual indicators for offline state

### Key Technical Patterns
- **Dependency Injection**: Service factory patterns for testability
- **Observer Pattern**: Real-time subscription management
- **Strategy Pattern**: Multiple cache and sync strategies
- **Circuit Breaker**: API failure resilience
- **Repository Pattern**: Data access abstraction
- **Facade Pattern**: Complex service orchestration

### Dependencies
- **Navigation**: Expo Router with React Navigation v7
- **UI**: Expo Vector Icons, Lucide React, Expo Blur effects
- **Data**: react-native-mmkv (30x faster storage), NetInfo for connectivity
- **Development**: TypeScript, ESLint with Expo config, Jest for testing
- **Monitoring** (✨ New):
  - `@sentry/react-native` - Production error tracking
  - `react-native-network-logger` - Development API monitoring
  - `fast-xml-parser` - XML validation for VIS API audit
- **Expo SDK**: Version ~53.0.20 with new architecture enabled

> **`react-native-reanimated` and `react-native-gesture-handler` are no longer
> imported by any application file** (issue #38). They are still declared in
> `package.json` because the native build expects them, but a single import of
> either pulls **300 modules / ~830 KB** into the web entry chunk: gesture-handler
> loads reanimated unconditionally through
> `handlers/gestures/reanimatedWrapper`. Animations use React Native's own
> `Animated` (`utils/statusAnimations.ts`) and gestures use `PanResponder`
> (`components/navigation/GmailStyleSideMenu.tsx`); both ship inside
> react-native-web and cost nothing extra. Do not reintroduce either import
> without measuring the entry chunk first — see "Web bundle weight" below.

### Web bundle weight (issue #38)

Two import shapes in this codebase are load-bearing and easy to undo by accident:

- **Icon sets.** Import them from `components/Icons/vectorIconSets`, never from
  `@expo/vector-icons` directly. The package index imports every icon set, and
  each set carries a glyph map — 345 KB of JSON for three sets ever used, none
  of which is even rendered on web (all three wrappers branch on
  `Platform.OS === 'web'` and draw a text glyph). `vectorIconSets.web.ts`
  exports inert components so the fonts never reach the web bundle.
- **Native-only Expo modules.** `expo-notifications` and `expo-device` are
  loaded with a memoised dynamic `import()` in `NotificationService`, because on
  web every public method already routes through `WebPushService`. A `require()`
  inside a function would NOT have worked — Metro resolves it statically
  (issue #45).

Before claiming any of this is lighter or heavier, measure it:

```bash
npx expo export --platform web --source-maps --output-dir dist-map
node scripts/analyze-bundle.js dist-map --top 20
```

`tests/curl-tests.sh` enforces a hard brotli ceiling on the served entry chunk
(`ENTRY_MAX_BROTLI_BYTES`), so a weight regression turns the smoke test red.

### Custom Hooks (✨ New)
- **`useFieldMode`** - Network-adaptive field selection hook
  - Automatically selects field mode based on network type
  - WiFi → default mode (10-15 fields)
  - Cellular → slim mode (6-8 fields)
  - Offline → slim mode (cached data only)
  - Manual override support with auto reset
  - Real-time network change detection via NetInfo

- **`useApiAudit`** - API audit data access (__DEV__ only)
  - Access captured requests and findings
  - Generate compliance reports
  - Export audit data as JSON
  - Real-time metrics tracking

---

## VIS API Optimization Feature

**Feature**: `specs/001-vis-api-optimization`
**Status**: ✅ Complete (95/95 tasks)
**Impact**: 75% payload reduction, 85% cache hit rate, 65% fewer API calls

### Overview

Comprehensive optimization of VIS API integration with three user stories:
1. **API Request Audit & Validation** - Capture and validate all API requests
2. **Cache System Optimization** - MMKV migration with adaptive TTL and polling
3. **Request Payload Optimization** - Network-aware field selection and additive fetching

### Key Features

#### 1. API Audit System (__DEV__ only - Zero Production Overhead)

**Services**:
- `ApiAuditService` - Captures all requests, validates XML/parameters/field counts
- `AuditReportGenerator` - Generates compliance reports with scores
- `AuditStorageService` - 7-day rolling window retention
- `FieldSelectionValidator` - Validates field counts against thresholds

**Usage**:
```typescript
import { useApiAudit } from './hooks/useApiAudit';

function DebugPanel() {
  const { generateReport, exportReportJson, metrics } = useApiAudit();

  const handleReport = () => {
    const report = generateReport();
    console.log('Compliance Score:', report.summary.complianceScore);
    const json = exportReportJson(report);
    // Share or save JSON
  };
}
```

**Validations**:
- XML format validation (well-formed, correct structure)
- Parameter validation (correct form parameter: "Request")
- `<Requests>` wrapper validation
- Field count thresholds (slim: ≤10, default: ≤20, full: unlimited)
- Payload size monitoring (warns if >50KB)

#### 2. Multi-Level Cache with MMKV

**Architecture**:
```
User Request
    ↓
Level 1: Memory Cache (<1ms)
    ↓ (miss)
Level 2: MMKV Storage (<5ms)
    ↓ (miss)
Level 3: VIS API Call (network-dependent)
```

**Adaptive TTL**:
```typescript
// Automatic TTL based on data volatility
const cache = CacheService.getInstance();

// Live match: 5s TTL
await cache.set('match:123', data, 'match', 'Running');

// Scheduled match: 15s TTL
await cache.set('match:124', data, 'match', 'Scheduled');

// Tournament: 120s TTL
await cache.set('tournament:456', data, 'tournament');

// Finished match: 24h TTL
await cache.set('match:125', data, 'match', 'Finished');
```

**Stale-While-Revalidate**:
```typescript
// Serve stale data immediately, refetch in background
const { data, isStale } = await cache.get('tournament:123', async () => {
  return await api.getTournament({ tournamentNo: '123' });
});

// Display immediately (may be stale)
renderTournament(data);

// Fresh data will update automatically when ready
```

**Performance Targets**:
- Cache hit rate: >70% (achieved: 85%)
- Cached load time: <100ms (achieved: 65ms)
- MMKV operations: <10ms (achieved: <5ms)

#### 3. Adaptive Polling

**Status-Based Intervals**:
```typescript
import { PollingConfigurationManager } from './services/polling/PollingConfigurationManager';

const pollingMgr = PollingConfigurationManager.getInstance();

// Running match: polls every 5s
pollingMgr.configure('match', '123', 'Running', async () => {
  await fetchMatchData();
});

// Scheduled match: polls every 60s
pollingMgr.configure('match', '124', 'Scheduled', async () => {
  await fetchMatchData();
});

// Finished match: polling disabled
pollingMgr.configure('match', '125', 'Finished', async () => {
  await fetchMatchData();
}); // No actual polling occurs
```

**App State Awareness**:
- App backgrounded: Polling suspends after 30 seconds
- App foregrounded: Polling resumes immediately
- Saves battery and bandwidth

#### 4. Network-Aware Field Selection

**Automatic Mode Selection**:
```typescript
import { useFieldMode } from './hooks/useFieldMode';

function TournamentList() {
  const { fieldMode, networkType, isOnline } = useFieldMode();

  // fieldMode automatically adapts:
  // WiFi → 'default' (10-15 fields)
  // Cellular → 'slim' (6-8 fields)
  // Offline → 'slim' (cached data only)

  const tournaments = await getTournaments({ mode: fieldMode });
}
```

**Field Modes**:
- **Slim** (6-8 fields): List views, cellular, offline, live polling
- **Default** (10-15 fields): Detail views on WiFi
- **Full** (all fields): Offline sync, complete data

**Payload Reduction**:
- GetEventList: 100KB → 35KB (65% reduction)
- GetBeachMatchList: 120KB → 40KB (67% reduction)
- Live polling: 200KB → 30KB (85% reduction)

#### 5. Additive Field Fetching

**Smart Navigation**:
```typescript
// 1. List view (slim mode: 8 fields)
const tournaments = await api.getTournamentList({
  fields: ['No', 'Name', 'City', 'StartDate', 'EndDate', 'Gender', 'Level', 'Status']
});

// Cache stores slim data
cache.set('tournament:123', tournaments[0], 'tournament');

// 2. Detail view - fetch only missing fields
const additionalFields = ['Location', 'NoOfMatches', 'Description'];
const fullData = await cache.fetchWithAdditiveFields(
  'tournament:123',
  [...slimFields, ...additionalFields],
  (missingFields) => api.getTournament({
    tournamentNo: '123',
    fields: missingFields // Only fetches: Location, NoOfMatches, Description
  }),
  'tournament'
);

// Result: Slim data + additional fields (no duplicate fetching)
```

#### 6. Batch Request Optimization

**Automatic Splitting**:
```typescript
// Large batch (25 requests)
const batchRequest = {
  requests: [...25 items...],
};

// Automatically splits into chunks of 10
// Chunk 1: 10 requests
// Chunk 2: 10 requests
// Chunk 3: 5 requests
// Executes sequentially, merges results

const response = await client.executeBatchRequest(batchRequest);
// All 25 results available, no timeouts
```

### Success Criteria (All Met ✅)

| ID | Criteria | Target | Achieved |
|----|----------|--------|----------|
| SC-001 | API Conformance | 100% | 100% ✅ |
| SC-002 | Payload Reduction | 40%+ | 75% ✅ |
| SC-003 | Cache Hit Rate | 70%+ | 85% ✅ |
| SC-004 | Polling Stops | <5s | <1s ✅ |
| SC-005 | Redundant Calls | 60%+ | 73% ✅ |
| SC-006 | Cached Load | <100ms | 65ms ✅ |
| SC-007 | Zero Errors | 0 | 0 ✅ |
| SC-008 | Adaptive Polling | 5s/off | 5s/off ✅ |
| SC-009 | Offline Mode | Works | Works ✅ |
| SC-010 | Call Volume | 50%+ | 65% ✅ |

### Migration Notes

**MMKV Storage Migration**:
- All cache operations migrated from AsyncStorage to MMKV
- AsyncStorage-compatible API for easy migration
- Existing code works without changes
- 30x performance improvement

**Breaking Changes**: None
- Fully backward compatible
- Audit services only run in __DEV__ mode
- Production builds unchanged

### Environment Variables

Add to `.env`:
```bash
# Sentry Configuration (Production Monitoring)
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn_here

# MMKV Cache Encryption Key
EXPO_PUBLIC_MMKV_KEY=your_encryption_key_here
```

### Monitoring & Debugging

**Development Mode**:
```bash
# Network Logger shows all API calls
npm start

# Check console for:
# - [API Audit - Payload Size] logs
# - [API Audit - Field Count] logs
# - [CacheService] logs
# - [PollingConfigurationManager] logs
```

**Production Mode**:
- Sentry captures critical issues
- No audit overhead (services disabled)
- Performance monitoring via CachePerformanceMonitor

### Documentation

- **Validation Guide**: `specs/001-vis-api-optimization/VALIDATION.md`
- **Success Criteria**: `specs/001-vis-api-optimization/SUCCESS_CRITERIA.md`
- **Specification**: `specs/001-vis-api-optimization/spec.md`
- **Implementation Plan**: `specs/001-vis-api-optimization/plan.md`
- **Task Tracking**: `specs/001-vis-api-optimization/tasks.md`

---

## Production Readiness Audit System

**Feature**: `specs/002-production-refactoring`, repaired by issue #42
**Impact**: Code quality validation with an outcome that can be trusted

> **Read this before trusting an audit result.** Until issue #42 the audit
> reported `PASS` / exit 0 while two of the three checkers it ran were crashing
> and six of the nine checkers were never instantiated at all. The section below
> describes the system as it actually behaves today. If you change the audit,
> keep this section true.

### Three outcomes, three exit codes

| Exit | Status | Meaning |
|---|---|---|
| `0` | `PASS` | Every **requested** checker ran and there are no blocking regressions |
| `1` | `FAIL` | Every requested checker ran; there are blocking findings beyond the frozen baseline |
| `2` | `ERROR` | At least one checker **could not run** — the result is not trustworthy |

`ERROR` is never reported as `PASS`, and it takes precedence over everything,
including `--fail-on`. Checkers do not catch their own failures: an exception in
a checker becomes `CheckerStatus.ERROR`, is printed as `DID NOT RUN`, and forces
exit 2.

### The 9 checkers — and when each one runs

| Checker id | What it inspects | Scope |
|---|---|---|
| `typescript` | `tsc` diagnostics | whole project (`tsconfig.json`) |
| `eslint` | ESLint errors/warnings via the project's `eslint.config.js` | `AUDIT_CONFIG.lintRoots` = `src`, `app`, `components` |
| `complexity` | Cyclomatic complexity (threshold 15) | `AUDIT_CONFIG.complexityRoots` (adds `services`, `hooks`, `utils`, `lib`, `theme`, `screens`, `repositories`, `config`) |
| `security` | Hardcoded credentials, `http://`, MMKV encryption, Sentry sanitisation | walks the project, honours `excludePaths` |
| `architecture` | DI patterns, Expo Router compliance, component separation | `services`, `app`, `components` |
| `error-handling` | try/catch around API calls, error boundaries, unhandled promises | `services`, `app` |
| `performance` | Cache config, polling config, resource usage | `services`, `app`, `components` |
| `data-flow` | Subscription cleanup, sync patterns, immutability | `hooks`, `services` |
| `build` | `app.json` / `tsconfig.json` validity, platform compatibility | config files |

| Command | Checkers | Blocks on |
|---|---|---|
| `npm run audit` | **all 9** | Critical + High regressions |
| `npm run audit:ci` | **all 9** | Critical + High regressions |
| `npm run audit:quality` | typescript, eslint, complexity | Critical + High regressions |
| `npm run audit:precommit` | typescript, eslint, complexity, **security** | Critical + High regressions |
| `npm run audit:baseline` | all 9 | nothing — rewrites `.audit-baseline.json` |
| `.husky/pre-commit` | typescript, eslint, complexity, security (`npm run audit:precommit`) | **Critical** regressions only (fast) |
| `.husky/pre-push` | **all 9** (`npm run audit:ci`) | Critical + High regressions |

Every run prints its roster — which checkers are running and which are **NOT**.
A reduced run is allowed; a *silent* reduced run is not. An unrecognised
`--checks` id exits 2 rather than quietly narrowing coverage.

Full run cost: ~62 s (TypeScript ~20 s, ESLint ~20 s, Complexity ~21 s, the
other six ~1 s combined). Before issue #44 it was ~187 s, because four of those
six walked `node_modules`.

**Verifying the ESLint checker**: its scope is deliberately identical to what
`expo lint` covers, so `npm run lint` and the `eslint` checker report the same
number of problems. If they diverge, one of the two is misconfigured.

### The gate: honest severities, frozen baseline

Findings are classified by what they are, not by what is convenient:
`typescript-error` is **High** (it was demoted to Medium before #42, which made
the gate structurally incapable of blocking anything).

The pre-existing backlog is instead absorbed by a **frozen baseline** committed
at `.audit-baseline.json`:

- it records a **count per `(file, finding type)`** — not per finding id, so it
  survives line shifts;
- the gate blocks only on findings **in excess** of that budget, i.e.
  regressions: a file that gets worse, or a new file with blocking findings;
- removing findings is always allowed — the backlog can only shrink;
- because the file is committed, any increase shows up in a PR diff.

```bash
npm run audit                 # gate on regressions vs the baseline (default)
npm run audit -- --no-baseline  # gate on the absolute count (shows the real total)
npm run audit:baseline        # re-freeze the backlog; commit the diff
```

`npm run audit:baseline` refuses to write from a partial or failed run, so a
baseline can never be narrowed by accident.

### CI/CD status — read this

**There is currently no audit job in CI.** `.github/workflows/` contains only
`web-build.yml`, which since issue #52 does not deploy — it only verifies that
`npx expo export --platform web` succeeds, as a gate on pull requests
(see "Web deployment" below). Earlier revisions of this file described a 4-stage
`audit.yml` pipeline and a GitLab template; neither exists in the repository.
Today the audit is enforced **only by the git hooks**, which means it can be
bypassed with `--no-verify` and is not enforced on PRs. Wiring `npm run audit:ci`
into CI is open work.

#### Reporting & Trending

**Report Formats**:
- **JSON** - Machine-readable for automation
- **Markdown** - Human-readable summaries
- **Console** - Colorized terminal output

**Trend Analysis**:
```typescript
// Automatic comparison to previous run
Compared to: run-2025-10-21-08-52-10
- Total Findings: 📉 -12
- Critical: 📉 -12
- Resolution Rate: 85%
- New Finding Rate: 2%
```

**Report Storage**:
```
specs/002-production-refactoring/reports/
├── latest.json           # Most recent run
├── latest.md            # Most recent markdown
├── run-YYYY-MM-DD-HH-MM-SS.json  # Historical runs
└── trends/              # Trend data
```

### Audit Configuration

**Config File** (`scripts/audit/config.ts`) — `AUDIT_CONFIG`:

| Key | Purpose |
|---|---|
| `projectRoot` | Repo root. Overridable via `AUDIT_PROJECT_ROOT` (used by tests to point the audit at a broken fixture). |
| `excludePaths` | Glob exclusions, matched against **POSIX-normalised** relative paths. Before #42 they were matched against raw `path.relative()` output, so on Windows none of them matched and the security scanner walked `node_modules`, `docs/` and build artifacts. #42 fixed this in the shared `shouldExcludePath()` but wired **only the security scanner** to it; the error-handling, performance, data-flow and build validators each kept a copy-pasted, non-normalised walker and went on scanning `node_modules` until issue #44. **Any checker that walks the tree must call `shouldExcludePath()` — never re-implement the matching.** Frozen by `__tests__/scripts/audit/checker-exclusions.test.ts`. |
| `lintRoots` | Dirs linted by the ESLint checker — kept equal to `expo lint`'s defaults for cross-checkability. |
| `complexityRoots` | Dirs analysed by the Complexity checker (wider than `lintRoots`). |
| `baselineFile` | `.audit-baseline.json` — the frozen backlog. |
| `severityMap` | Finding type → severity. `typescript-error` is **High**. |
| `complexity` | `cyclomatic: 15`, `cognitive: 20`. |
| `performance` | `checkerTimeoutMs: 5 min`, `maxDurationMs: 15 min`. |

### Tests

`__tests__/scripts/audit/` guards the properties above:

- `audit-gate.test.ts` — PASS / FAIL / ERROR are distinct; ERROR beats `--fail-on`
  and beats findings; baseline absorbs the backlog, catches regressions, and
  tolerates line shifts; the roster contains all 9 checkers.
- `audit-cli-exit-code.test.ts` — runs the real CLI against a deliberately
  broken project and asserts exit 2 for every invocation the hooks use.
- `security-scanner.test.ts` — the XML-namespace exemption (issue #56).
- `checker-exclusions.test.ts` — every tree-walking checker honours
  `excludePaths` on any platform, and none of them descends into
  `node_modules` (issue #44).

If you touch the audit, these must stay green.

### TypeScript Error Reduction

**Systematic Type Fixing Results**:

| Metric | Value |
|--------|-------|
| **Starting Errors** | 4,215 critical |
| **Current Errors** | 3,590 critical |
| **Errors Fixed** | **625 (14.8% reduction)** |
| **Rounds Completed** | 6 |

**Type Improvements Made**:

**Theme System** (`types/theme.ts`):
- ✅ Added spacing aliases (extraSmall, extraLarge)
- ✅ Added typography variants (h3, bodySmall, sizes)
- ✅ Added color properties (textDisabled, surfaceDisabled, shadows)
- ✅ Made statusColors required (eliminated 300+ "possibly undefined" checks)

**Domain Models**:
- ✅ `BeachMatchCore`: Added VIS API compatibility (roundName, Date, MatchDate, teams, officials, currentSet, points)
- ✅ `BeachMatchDTO`: Added referee aliases (Referee, Referee1, Referee2)
- ✅ `TournamentDTO`: Made code property optional
- ✅ `MatchResult`: Added sets property for detailed scores

**Component Interfaces**:
- ✅ `NavigationHeaderProps`: Added showBackButton, showRefreshButton properties
- ✅ `IVisApiClient`: Added method aliases for better API discoverability

### Best Practices

**Development Workflow**:
1. Make code changes
2. Run `npm run audit` to check quality
3. Fix Critical issues before committing
4. Git hooks will validate on commit/push
5. CI/CD validates again on PR

**Error Fixing Strategy**:
- **Target root definitions** - Not individual usages
- **Prioritize by error count** - Fix types used in hundreds of places
- **Maintain backward compatibility** - Add optional properties and aliases
- **Test after each round** - Run audit to verify impact

**When adding or changing a checker**:
- Never `catch` a failure and `return []`. Let it throw — the orchestrator turns
  it into `ERROR`. A checker that silently returns no findings is worse than no
  checker at all, because it produces false confidence.
- Register it in `CHECKER_REGISTRY` (`scripts/audit/run-audit.ts`); the `all`
  preset and the roster output derive from that object automatically.
- Add its expected finding count to the table above.

### Documentation

Guides in `specs/002-production-refactoring/` (`AUDIT_GUIDE.md`,
`INTEGRATION_GUIDE.md`, `INTEGRATION_COMPLETE.md`, `FINAL_DELIVERY.md`) predate
issue #42 and describe the system as originally intended, including the
never-created `audit.yml` CI pipeline. **This section of CLAUDE.md is the
authority on current behaviour**; treat those documents as historical.

### Monitoring & Metrics

**Audit Metrics Tracked**:
- Total findings by severity
- Resolution rate (existing findings fixed)
- New finding rate (new issues introduced)
- Checker execution time
- Trend analysis over time

**Current state (after issue #44, all 9 checkers, `--no-baseline`)** — these
numbers are now reproducible on a machine with `node_modules` installed, which
before #44 they were not (see `excludePaths` above):

| Checker | Findings |
|---|---|
| TypeScript | 2677 |
| ESLint | 922 (5 errors / 917 warnings — matches `npm run lint`) |
| Complexity | 176 |
| Security | **0** |
| Architecture | 15 |
| Error Handling | 39 |
| Performance | 2049 |
| Data Flow | 25 |
| Build | 4 |

2721 blocking findings are frozen in `.audit-baseline.json` (was 2780 before
issue #56). The gate therefore reports PASS today, and will report FAIL the
moment any of those counts grows. This number is the epic's real starting
point — not zero.

> Issue #44 did **not** regenerate the baseline, and the counts above did not
> move. Before #44 the same table was only reproducible on a checkout without
> `node_modules`: with dependencies installed, four validators walked them and
> Error Handling reported 150 instead of 39 — 111 phantom **High** findings that
> the gate counted as blocking regressions. `npm run audit:ci`, and therefore
> `.husky/pre-push`, failed on `master` for every developer. The full run also
> dropped from ~187 s to ~62 s once the walkers stopped reading the dependency
> tree.

### Secrets: the one finding class you must never baseline

Issue #56 found the production Postgres **superuser** password hardcoded in a
tracked root script, on a **public** repository, untouched since 2025-09-13.
The security scanner had existed the whole time — it had simply never been run,
because before #42 six of the nine checkers were never instantiated.

Two things changed so it cannot recur silently:

- **`security` runs at commit time**, not only at push. `.husky/pre-commit` uses
  the `precommit` preset (`quality` + `security`). The scanner costs <1s on the
  whole tree; there was no reason for the commit gate to be blind to the only
  finding class that is Critical by definition.
- **The scanner stopped crying wolf.** 13 of its 14 findings were
  `xmlns="http://..."` and `SOAPAction:` inside SOAP envelopes for the VIS API.
  Those URIs are opaque identifiers that nothing dereferences, and rewriting
  them to `https://` breaks the request. `SecurityScanner.isXmlNamespaceOnly`
  exempts them **per occurrence** — a line carrying both a namespace and a real
  `http://` endpoint is still reported.
  Frozen by `__tests__/scripts/audit/security-scanner.test.ts`.

If the gate reports `security-credential`, **do not** run `audit:baseline` and
**do not** `--no-verify` past it. Move the value to an environment variable and
document it with a placeholder in `.env.example`. A secret in a tracked file on
a public repo is compromised the moment it is pushed; removing it from the code
afterwards does not un-publish it — only rotation does.

> **Git worktrees caveat**: `core.hooksPath` is an *absolute* path to the main
> worktree's `.husky/_`. A commit made from a linked worktree therefore runs the
> **main worktree's** hook scripts, not its own. When changing a hook, verify it
> with `git -c core.hooksPath=.husky commit ...` or by running `.husky/pre-commit`
> directly — otherwise you are testing a stale script.

### Environment Setup

**No additional dependencies** - Uses existing tools:
- TypeScript compiler (already installed)
- ESLint (already configured)
- Node.js built-in modules
- Husky for git hooks (auto-installed)

**Optional**:
```bash
# Enable commit blocking (recommended for production)
# Already configured - hooks active after npm install
```

### Troubleshooting

**Hook Not Blocking Commits**:
```bash
# Verify hook is executable
chmod +x .husky/pre-commit .husky/pre-push

# Test hook manually
.husky/pre-commit
```

**Audit Running Slow**:
```bash
# Fast subset (~95s -> ~5s for the six cheap checkers is not the issue;
# TypeScript + ESLint + Complexity are where the time goes)
npm run audit:quality

# The six non-quality checkers cost ~2s combined
npm run audit -- --checks=security,architecture,error-handling,performance,data-flow,build
```

**Exit code 2 / "DID NOT RUN"**: a checker crashed. This is **not** a passing
audit — part of the codebase was never inspected. Read the `Error:` line printed
under the checker name and fix the configuration.

**"regressions (block the build): N"**: you introduced N blocking findings beyond
the frozen baseline. Either fix them, or — if they are genuinely expected —
run `npm run audit:baseline` and commit the `.audit-baseline.json` diff so the
increase is reviewable.

### Future Enhancements

Potential improvements for future versions:

- **Wire the audit into CI** - `npm run audit:ci` currently runs only in git hooks
- **Broaden the ESLint scope** - `lintRoots` mirrors `expo lint`, so `services/`,
  `hooks/` and `utils/` are covered by `tsc` and complexity but not by ESLint rules
- **Shrink the baseline** - `.audit-baseline.json` should trend to zero
- **Code Coverage Integration** - Track test coverage trends
- **Dependency Audits** - npm audit integration with trending

---

## Web deployment (issue #52)

**One system publishes the site: Netlify's git integration.** It checks out the
repository on every push to `master` and on every pull request, runs the
`[build]` block of `netlify.toml` (`npx expo export --platform web`, Node 18)
and publishes `dist/`. PR previews are Netlify's, at
`https://deploy-preview-<N>--beachrefs.netlify.app`.

`.github/workflows/web-build.yml` — renamed from `netlify-deploy.yml` — **does
not deploy**. Its single `build` job runs the same export command as a gate on
pull requests. Its `deploy` and `deploy-preview` jobs, which used
`nwtgck/actions-netlify`, were removed by #52.

Until #52 both systems published on every push. The Action normally won the
race, so what users saw came from the Action while Netlify's own build ran in
parallel and only its checks were visible on PRs.

**What this changes, and what it does not:**

| | Before #52 | After #52 |
|---|---|---|
| Publishes production | GitHub Action (Netlify also built, in parallel) | Netlify git integration only |
| Repo checked out at deploy | No | **Yes** |
| `netlify.toml` read | No — inert except as documentation | **Yes** |
| Header source of truth | `public/_headers` | `public/_headers` — **unchanged on purpose** |
| Build env vars | none passed by the Action | none configured on Netlify — same bundle |

Verified on the Netlify-native deploy of PR #59 before the switch: all 15
checks of `tests/curl-tests.sh` green (immutable `_expo` chunks, `no-store`
HTML, no `Clear-Site-Data`, per-route SSG), and the entry bundle within 0.02%
of the Action-built production one, with no Supabase URL or key inlined in
either.

**Do not** move header rules into `netlify.toml` now that it is read. See the
comment at the bottom of that file.

**Env vars**: the Netlify build does **not** inherit GitHub Actions secrets.
Anything the web bundle needs must be set in Netlify → Site settings →
Environment variables. Today nothing is required; `EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_EDGE_URL`, `EXPO_PUBLIC_MMKV_KEY`,
`EXPO_PUBLIC_SENTRY_DSN` and `EXPO_PUBLIC_VAPID_PUBLIC_KEY` are the ones the
code reads when those features are switched on.

**Node version** is declared in three places that must agree: `.nvmrc`,
`[build.environment].NODE_VERSION` in `netlify.toml`, and `env.NODE_VERSION` in
`web-build.yml`. All three are `18`. `.nvmrc` wins on Netlify if they diverge.

