# Implementation Plan: VIS API Audit & Optimization

**Branch**: `001-vis-api-optimization` | **Date**: 2025-01-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-vis-api-optimization/spec.md`

## Summary

Audit and optimize VIS API integration to eliminate malformed requests, reduce payload sizes by 40%, achieve 70%+ cache hit rates, and reduce API call volume by 50% during peak usage. The feature uses Chrome DevTools for frontend API monitoring, compares captured requests against VIS API documentation to identify issues, and implements intelligent caching with adaptive polling based on match status. Three-phase approach: (P1) audit and fix malformed requests, (P2) optimize cache behavior with stale-while-revalidate patterns, (P3) implement context-aware field selection to minimize payloads.

## Technical Context

**Language/Version**: TypeScript with React Native 0.79.5, React 19, Expo SDK ~53.0.20
**Primary Dependencies**: Expo Router, React Query (TanStack Query) for cache management, fast-xml-parser for VIS XML parsing, NetInfo for connectivity detection
**Storage**: AsyncStorage for sensitive data, LocalStorage for caching (6-hour expiration), Memory cache (session lifetime)
**Testing**: Jest for unit/integration tests, Chrome DevTools for network monitoring and API auditing
**Target Platform**: iOS/Android/Web (Expo cross-platform), mobile-first with offline capability
**Project Type**: Mobile + Web hybrid (Expo universal app)
**Performance Goals**:
- <500ms tournament list load (cached), <2s (API with warming)
- <200ms match detail render (cached)
- <100ms cache retrieval for navigation
- 3-5s polling for live matches, adaptive by status
**Constraints**:
- Offline-first architecture required
- <200ms p95 for cached data access
- VIS API has undocumented rate limits
- Mobile network bandwidth optimization critical
- Touch target minimum 44x44pt
**Scale/Scope**:
- 50+ screens in app
- 100s of tournaments annually
- 1000s of matches per tournament
- 10s of concurrent referee users during peak events
- Multiple VIS API endpoints (GetEventList, GetBeachTournamentList, GetBeachMatchList, GetBeachMatch, GetBeachRoundList, GetEventRefereeList)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Aligned Principles

**I. Mobile-First Architecture**
- Feature optimizes for mobile network constraints (payload reduction, bandwidth efficiency)
- Audit focuses on mobile performance metrics (cache hit rates, load times)
- No UI changes required - maintains existing mobile-native patterns

**II. Offline-First Data Architecture**
- Enhances existing multi-level cache (Memory → LocalStorage → API) with better invalidation
- Implements stale-while-revalidate for graceful offline degradation
- Improves cache warming strategy for critical journeys

**III. Service Layer Abstraction**
- Work confined to existing service layer (`services/api/`, `services/cache/`)
- No business logic in components
- Maintains dependency injection patterns

**IV. Resilience & Error Boundaries**
- Adds monitoring for BadRequestSyntax errors with fallback to cache
- Enhances circuit breaker usage for malformed requests
- Improves error logging for audit findings

**V. Design System Consistency**
- No UI component changes
- Feature is backend/service layer only

**VI. Type Safety & API Contracts**
- Validates VIS API request/response types against documentation
- Adds audit types (AuditFinding, FieldSelectionStrategy, etc.)
- Maintains strict TypeScript mode

**VII. Real-time State Synchronization**
- Optimizes polling behavior (adaptive intervals by match status)
- Improves subscription service efficiency (stop polling when Finished)

### ✅ Performance Standards Compliance

**Response Time Requirements**
- All existing targets maintained or improved (cache optimization)
- Adds monitoring to validate <500ms tournament list, <200ms match detail

**Caching Policy**
- Enhances Level 1/2/3 strategy with better expiration and invalidation
- Aligns with constitution's 6-hour expiration for tournaments
- Adds adaptive expiration (tournament list: 60-120s, match list: 15s, live: 2-5s)

**Mobile Constraints**
- No UI changes - maintains all touch target/animation/bundle requirements
- Reduces network usage and memory footprint through payload optimization

### ✅ External API Integration

**VIS API Compliance**
- Uses official documentation (https://www.fivb.org/VisSDK/VisWebService/) as audit benchmark
- Implements constitution mandates: minimize calls through caching, batch requests, selective fields
- Validates field extraction optimization (slim/default/full modes)
- Maintains circuit breaker pattern for all calls
- Enhances caching per policy

### 🔍 No Violations - No Complexity Tracking Needed

All work aligns with existing constitution principles and enhances compliance. No new patterns or deviations required.

### Post-Phase 1 Re-check

**Status**: ✅ PASSED - All constitution principles maintained

**Design Artifacts Generated:**
- ✅ `research.md` - Technology decisions documented with rationale
- ✅ `data-model.md` - Six entities defined (ApiRequest, AuditFinding, CacheEntry, FieldSelectionStrategy, PollingConfiguration, AuditReport)
- ✅ `contracts/` - Three JSON schemas (audit-report, field-selection-strategy, polling-configuration)
- ✅ `quickstart.md` - Developer implementation guide with testing workflows

**Constitution Compliance Verification:**

1. **Service Layer Abstraction** - Maintained
   - New services: `ApiAuditService`, `AuditReportGenerator`, `FieldSelectionValidator`
   - Enhanced services: `VisApiClient`, `CacheService`, `MemoryCacheManager`, `PollingPerformanceMonitor`
   - All business logic isolated in service layer

2. **Type Safety** - Enhanced
   - New type definitions in `types/audit.ts`
   - JSON schemas for runtime validation
   - Strict TypeScript interfaces for all entities

3. **Technology Stack** - Compliant
   - Uses existing React Query/TanStack Query
   - Adds MMKV (30x faster than AsyncStorage, constitution-aligned for performance)
   - Adds react-native-network-logger (development only)
   - Adds Sentry (production monitoring, constitution-aligned for error tracking)
   - All additions enhance existing patterns

4. **Offline-First** - Enhanced
   - Multi-level cache architecture improved (Memory → MMKV → API)
   - Stale-while-revalidate pattern implemented
   - Offline queue for sync operations
   - Event-driven cache invalidation

**No New Violations Introduced** - Implementation plan fully aligns with BeachRef Constitution v1.0.1

## Project Structure

### Documentation (this feature)

```
specs/001-vis-api-optimization/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - API audit methodology research
├── data-model.md        # Phase 1 output - Audit/cache entity models
├── quickstart.md        # Phase 1 output - Developer guide for audit/optimization
├── contracts/           # Phase 1 output - Audit report schema, field selection configs
│   ├── audit-report.schema.json
│   ├── field-selection-strategy.schema.json
│   └── polling-configuration.schema.json
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
# Expo Mobile + API Structure (existing)
services/
├── api/
│   ├── VisApiClient.ts              # [ENHANCE] Add audit capture, field validation
│   ├── VisApiIntegrationService.ts  # [ENHANCE] Add request monitoring
│   ├── visApi.ts                    # [ENHANCE] Add parameter validation
│   └── __tests__/                   # [ADD] Audit validation tests
├── cache/
│   ├── CacheService.ts              # [ENHANCE] Add adaptive expiration
│   ├── CacheWarmupService.ts        # [ENHANCE] Optimize warming strategy
│   ├── MemoryCacheManager.ts        # [ENHANCE] Add hit/miss tracking
│   └── CachePerformanceMonitor.ts   # [ENHANCE] Add audit metrics
├── monitoring/                      # [NEW] Audit and monitoring services
│   ├── ApiAuditService.ts           # [NEW] Capture/analyze requests
│   ├── AuditReportGenerator.ts      # [NEW] Generate audit reports
│   └── FieldSelectionValidator.ts   # [NEW] Validate field counts
└── polling/
    └── PollingPerformanceMonitor.ts # [ENHANCE] Add status-based adaptation

hooks/
└── useApiAudit.ts                   # [NEW] Hook for audit data access

types/
└── audit.ts                         # [NEW] Audit entity types

__tests__/
├── integration/
│   └── vis-api-audit.test.ts        # [NEW] End-to-end audit tests
└── services/
    └── monitoring/                   # [NEW] Audit service tests

docs/
└── Guidelines/
    ├── VISImplementationGuide.md    # [REFERENCE] Existing audit benchmark
    └── VISCacheGuidelines.md        # [REFERENCE] Existing cache standards
```

**Structure Decision**: Enhance existing Expo mobile structure with new monitoring services under `services/monitoring/`. No structural changes needed - work is confined to service layer enhancements and new audit tooling. Maintains existing separation of API clients, cache services, and polling monitors.

## Complexity Tracking

*Not applicable - no constitution violations*
