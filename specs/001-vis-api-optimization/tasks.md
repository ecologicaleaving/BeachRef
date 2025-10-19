# Tasks: VIS API Audit & Optimization

**Input**: Design documents from `/specs/001-vis-api-optimization/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Manual testing only (no automated test generation) - Test scenarios provided in quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Mobile + Web**: Expo project structure
- Paths: `services/`, `hooks/`, `types/`, `__tests__/`
- Adjust paths based on plan.md structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and configure monitoring tools

- [X] T001 Install react-native-network-logger dependency with `npm install react-native-network-logger`
- [X] T002 [P] Install @sentry/react-native dependency with `npm install @sentry/react-native`
- [X] T003 [P] Install react-native-mmkv dependency with `npm install react-native-mmkv`
- [X] T004 [P] Install superstruct dependency with `npm install superstruct`
- [X] T005 Add network logger initialization to app/_layout.tsx for development monitoring
- [X] T006 [P] Add Sentry initialization to app/_layout.tsx for production monitoring
- [X] T007 [P] Add EXPO_PUBLIC_SENTRY_DSN to .env file
- [X] T008 [P] Add EXPO_PUBLIC_MMKV_KEY to .env file for cache encryption

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core type definitions and shared utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T009 Create types/audit.ts with ApiRequest, AuditFinding, AuditReport, FieldSelectionStrategy, PollingConfiguration, CacheEntry interfaces
- [X] T010 [P] Create types/field-selection.ts with FieldMode, UseCase, NetworkType enums and FIELD_MODES constants
- [X] T011 [P] Update types/api-v2.ts to add audit-related fields to existing VisApiResponse interface
- [X] T012 Create services/monitoring/ directory for new audit services

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - API Request Audit & Validation (Priority: P1) 🎯 MVP

**Goal**: Capture all VIS API requests, validate against documentation, identify malformed requests and over-fetching, generate audit reports

**Independent Test**: Run app with network monitoring enabled, navigate through tournament selection/details/match views, verify all VIS API requests are captured. Check console for malformed request warnings. Generate audit report showing specific issues with recommended fixes. Verify no BadRequestSyntax errors.

### Implementation for User Story 1

**Audit Service Layer**

- [X] T013 [P] [US1] Create services/monitoring/ApiAuditService.ts with request capture and validation logic
- [X] T014 [P] [US1] Create services/monitoring/FieldSelectionValidator.ts with field count validation and over-fetching detection
- [X] T015 [P] [US1] Create services/monitoring/AuditReportGenerator.ts with report aggregation and compliance scoring
- [X] T016 [US1] Integrate ApiAuditService with services/api/VisApiClient.ts to capture requests in __DEV__ mode
- [X] T017 [US1] Add XML format validation to ApiAuditService using fast-xml-parser
- [X] T018 [US1] Add parameter validation to ApiAuditService checking for correct form parameter name ("Request" not "xmlRequest")
- [X] T019 [US1] Add <Requests> wrapper validation to ApiAuditService
- [X] T020 [US1] Implement field count thresholds in FieldSelectionValidator (>20 for list views, >30 for detail views)
- [X] T021 [US1] Implement compliance score calculation in AuditReportGenerator (100 - criticals*10 - warnings*3 - info*1)

**Audit Storage & Reporting**

- [X] T022 [US1] Create services/monitoring/AuditStorageService.ts using MMKV for audit data persistence (development only)
- [X] T023 [US1] Implement 7-day rolling window retention in AuditStorageService
- [X] T024 [US1] Add audit report generation to AuditReportGenerator with findings aggregation
- [X] T025 [US1] Add impact assessment calculation (error rate, payload increase, affected endpoints) to AuditFinding creation

**Developer Access**

- [X] T026 [P] [US1] Create hooks/useApiAudit.ts hook for accessing audit data in development mode
- [X] T027 [US1] Add audit report export function to AuditReportGenerator (JSON format for developer review)

**Error Handling & Logging**

- [X] T028 [US1] Add Sentry error capture for malformed requests in ApiAuditService
- [X] T029 [US1] Add console logging for audit findings in __DEV__ mode
- [X] T030 [US1] Implement fallback to cached data when BadRequestSyntax errors occur in VisApiClient

**Checkpoint**: At this point, API audit should capture all requests, validate against VIS documentation, identify issues, and generate reports. Test independently by navigating app and checking audit output.

---

## Phase 4: User Story 2 - Cache System Optimization (Priority: P2)

**Goal**: Implement adaptive cache expiration, stale-while-revalidate patterns, status-based polling, and migrate to MMKV for 30x performance improvement

**Independent Test**: Monitor cache hit/miss rates across user workflows. Navigate back to tournament list and verify instant load (cache hit). Open running match and verify 3-5s polling. Watch match finish and verify polling stops. Background app and verify polling pauses. Return after 2 hours and verify cache revalidation.

### Implementation for User Story 2

**MMKV Migration**

- [X] T031 [P] [US2] Create services/cache/MmkvStorage.ts wrapper for react-native-mmkv
- [X] T032 [US2] Migrate services/cache/CacheService.ts from AsyncStorage to MmkvStorage
- [X] T033 [US2] Add cache encryption using EXPO_PUBLIC_MMKV_KEY in MmkvStorage
- [X] T034 [US2] Update services/cache/MemoryCacheManager.ts to integrate with MMKV as Level 2 storage

**Adaptive TTL**

- [X] T035 [US2] Add DataVolatility determination logic to CacheService based on entity type and status
- [X] T036 [US2] Implement TTL mapping in CacheService (live: 5s, dynamic: 15s, semi-static: 120s, static: 24h)
- [X] T037 [US2] Update CacheEntry creation in CacheService with staleness and expiration timestamps
- [X] T038 [US2] Add stale-while-revalidate pattern to CacheService (serve stale data, refetch in background)

**Adaptive Polling**

- [X] T039 [P] [US2] Create services/polling/PollingConfigurationManager.ts for managing polling configurations
- [X] T040 [US2] Implement status-based interval logic in PollingConfigurationManager (Running: 3-5s, Scheduled: 30-60s, Finished: off)
- [X] T041 [US2] Add app state detection to PollingConfigurationManager using AppState (active/background/inactive)
- [X] T042 [US2] Integrate PollingConfigurationManager with services/polling/PollingPerformanceMonitor.ts
- [X] T043 [US2] Add polling suspension when app backgrounded for >30s in PollingConfigurationManager
- [X] T044 [US2] Add polling resumption when app returns to foreground in PollingConfigurationManager

**Cache Invalidation**

- [X] T045 [US2] Implement event-driven cache invalidation in CacheService for status changes (Scheduled → Running, Running → Finished)
- [X] T046 [US2] Add related query invalidation (when tournament status changes, invalidate match list)
- [X] T047 [US2] Implement cache revalidation on reconnect in CacheService using NetInfo

**Cache Performance Tracking**

- [X] T048 [P] [US2] Add hit/miss rate tracking to services/cache/CachePerformanceMonitor.ts
- [X] T049 [P] [US2] Add access count tracking to CacheEntry in CacheService
- [X] T050 [P] [US2] Add last accessed timestamp tracking to CacheEntry in CacheService
- [X] T051 [US2] Implement cache metrics reporting in CachePerformanceMonitor (hit rate, avg response time, storage quota)

**Checkpoint**: At this point, cache should use MMKV storage, adapt TTL by data volatility, poll adaptively by status, invalidate intelligently, and track performance. Test independently by monitoring cache behavior.

---

## Phase 5: User Story 3 - Request Payload Optimization (Priority: P3)

**Goal**: Implement context-aware field selection (slim/default/full modes), network-adaptive requests, and additive field fetching to reduce payload sizes by 40%

**Independent Test**: Measure payload sizes before/after optimization. On WiFi verify default mode (~10 fields). On cellular verify slim mode (~6-8 fields). For live match polling verify slim fields only (5 fields). Compare payload sizes in Network Logger. Verify additive fetching when navigating from list to detail view.

### Implementation for User Story 3

**Field Selection Configuration**

- [ ] T052 [P] [US3] Define FIELD_MODES constants in types/field-selection.ts with slim/default/full field arrays for each endpoint
- [ ] T053 [P] [US3] Add tournament slim mode fields (8 fields: No, Name, City, StartDate, EndDate, Gender, Level, Status)
- [ ] T054 [P] [US3] Add match slim mode fields (6 fields: No, TeamA, TeamB, Status, Court, StartDateTime)
- [ ] T055 [P] [US3] Add tournament default mode fields (10 fields: add Location, NoOfMatches)
- [ ] T056 [P] [US3] Add match default mode fields (10 fields: add ScoreA, ScoreB, Phase, Round)
- [ ] T057 [P] [US3] Add live match polling slim mode fields (5 fields: No, Status, SetScore, RallyScore, ServingTeam)

**Network-Aware Field Selection**

- [ ] T058 [US3] Create hooks/useFieldMode.ts hook for adaptive mode selection based on network type
- [ ] T059 [US3] Integrate NetworkMonitor with useFieldMode hook to detect WiFi/cellular/offline
- [ ] T060 [US3] Implement mode selection logic in useFieldMode (offline→slim, cellular→slim, WiFi→default)
- [ ] T061 [US3] Add field mode state management in useFieldMode with network type listener

**API Integration**

- [ ] T062 [US3] Update services/api/VisApiClient.ts to accept field selection mode parameter
- [ ] T063 [US3] Implement field projection in VisApiClient getOptimizedFields method
- [ ] T064 [US3] Add field count validation in VisApiClient (slim: <=10 list/<=5 polling, default: <=20 list/<=15 detail)
- [ ] T065 [US3] Update all API call sites to use field mode from useFieldMode hook

**Additive Fetching**

- [ ] T066 [US3] Implement additive field fetching in CacheService (merge slim cached + additional fields requested)
- [ ] T067 [US3] Add field diff calculation in CacheService to determine missing fields
- [ ] T068 [US3] Create partial update logic in CacheService to merge new fields with cached entity

**Payload Monitoring**

- [ ] T069 [P] [US3] Add payload size logging to ApiAuditService for optimization tracking
- [ ] T070 [P] [US3] Add field count logging per request in ApiAuditService
- [ ] T071 [US3] Implement payload size threshold alerts in ApiAuditService (warn if >50KB)

**Batch Request Optimization**

- [ ] T072 [US3] Add batch request size validation to VisApiClient (split if >recommended size)
- [ ] T073 [US3] Implement sequential fallback in VisApiClient for oversized batch requests

**Checkpoint**: All user stories should now be independently functional. Field selection adapts to network type, payloads are minimized, additive fetching works, batch requests are optimized.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation, documentation, and final optimizations

**Integration Testing**

- [ ] T074 [P] Validate P1 (Audit): Run manual test workflow from quickstart.md - verify audit capture, malformed request detection, report generation
- [ ] T075 [P] Validate P2 (Cache): Run manual test workflow from quickstart.md - verify cache hits, adaptive polling, MMKV performance
- [ ] T076 [P] Validate P3 (Payload): Run manual test workflow from quickstart.md - verify field modes, payload reduction, network adaptation

**Success Criteria Validation**

- [ ] T077 Verify SC-001: 100% API requests conform to VIS documentation (check audit report compliance score)
- [ ] T078 Verify SC-002: 40%+ payload size reduction (compare Network Logger before/after)
- [ ] T079 Verify SC-003: 70%+ cache hit rate (check CachePerformanceMonitor metrics)
- [ ] T080 Verify SC-004: Polling stops within 5s of match finish (test live match → finished transition)
- [ ] T081 Verify SC-005: 60%+ reduction in redundant calls (check API call volume metrics)
- [ ] T082 Verify SC-006: <100ms cached data load (test navigation back to tournament list)
- [ ] T083 Verify SC-007: Zero BadRequestSyntax errors (check Sentry/console for errors)
- [ ] T084 Verify SC-008: Adaptive polling intervals (Running: 3-5s, Finished: off) - test live match
- [ ] T085 Verify SC-009: Offline mode works with stale data indicators (disconnect network, test app)
- [ ] T086 Verify SC-010: 50%+ API call volume reduction during peak (compare metrics before/after)

**Documentation**

- [ ] T087 [P] Update CLAUDE.md with new monitoring services and MMKV migration notes
- [ ] T088 [P] Document audit findings in development logs
- [ ] T089 [P] Create Sentry dashboard for production monitoring alerts

**Performance Optimization**

- [ ] T090 Run performance profiling on MMKV cache operations
- [ ] T091 Optimize field selection strategies based on real usage data from audit
- [ ] T092 Fine-tune TTL values based on cache hit rate measurements

**Cleanup**

- [ ] T093 Remove react-native-network-logger from production builds (dev only)
- [ ] T094 Clean up console logging for audit findings (production guard)
- [ ] T095 Remove audit storage from production builds (MMKV audit namespace dev only)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories - FULLY INDEPENDENT
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies on US1 - FULLY INDEPENDENT (but enhances caching US1 uses)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - No dependencies on US1/US2 - FULLY INDEPENDENT (but optimizes requests US1 audits)

**Important**: While stories enhance each other, they are designed to be independently testable and deliverable. US1 can ship without US2/US3. US2 can ship without US3. Full value realized when all three complete.

### Within Each User Story

**User Story 1 (Audit)**:
- T013, T014, T015 (services) can run in parallel
- T016-T021 (validation logic) depend on T013-T015 completion
- T022-T025 (storage/reporting) depend on T013-T015 completion
- T026-T027 (developer access) can run in parallel
- T028-T030 (error handling) depend on T016 completion

**User Story 2 (Cache)**:
- T031 (MMKV wrapper) → T032-T034 (migration) sequentially
- T035-T038 (adaptive TTL) depend on T032 completion
- T039-T044 (polling) can run in parallel with TTL work
- T045-T047 (invalidation) depend on T032 completion
- T048-T051 (tracking) can run in parallel

**User Story 3 (Payload)**:
- T052-T057 (field modes) can all run in parallel
- T058-T061 (network-aware hook) depend on T052 completion
- T062-T065 (API integration) depend on T058 completion
- T066-T068 (additive fetching) depend on T062 completion
- T069-T071 (monitoring) can run in parallel
- T072-T073 (batch optimization) depend on T062 completion

### Parallel Opportunities

**Setup (Phase 1)**:
- T002, T003, T004 (dependencies) can install in parallel
- T006, T007, T008 (configuration) can run in parallel after T002-T004

**Foundational (Phase 2)**:
- T010, T011 (type definitions) can run in parallel after T009

**User Story 1**:
- T013, T014, T015 together
- T026, T027 together
- All can be worked on by different developers

**User Story 2**:
- T039-T044 (polling) parallel with T035-T038 (TTL)
- T048-T051 (tracking) in parallel

**User Story 3**:
- T052-T057 (all field mode definitions) together
- T069-T071 (monitoring) together

**Polish (Phase 6)**:
- T074, T075, T076 (validation) together
- T087, T088, T089 (documentation) together

---

## Parallel Example: User Story 1

```bash
# Launch all audit services together:
Task: "Create services/monitoring/ApiAuditService.ts"
Task: "Create services/monitoring/FieldSelectionValidator.ts"
Task: "Create services/monitoring/AuditReportGenerator.ts"

# Launch developer access hooks together:
Task: "Create hooks/useApiAudit.ts"
Task: "Add audit report export function to AuditReportGenerator"
```

## Parallel Example: User Story 3

```bash
# Launch all field mode definitions together:
Task: "Add tournament slim mode fields (8 fields)"
Task: "Add match slim mode fields (6 fields)"
Task: "Add tournament default mode fields (10 fields)"
Task: "Add match default mode fields (10 fields)"
Task: "Add live match polling slim mode fields (5 fields)"

# Launch monitoring tasks together:
Task: "Add payload size logging to ApiAuditService"
Task: "Add field count logging to ApiAuditService"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup → Dependencies installed, monitoring configured
2. Complete Phase 2: Foundational → Type definitions ready
3. Complete Phase 3: User Story 1 → API audit working
4. **STOP and VALIDATE**: Test US1 independently using quickstart.md workflow
5. Review audit report, fix identified issues, deploy if ready

**MVP Delivers**: Complete API audit with malformed request detection, over-fetching identification, and actionable reports. Immediate value for identifying and fixing API issues.

### Incremental Delivery

1. **Foundation** (Phases 1-2): Setup + Types → 8 tasks
2. **MVP** (Phase 3): Add API Audit → Test independently → 18 tasks → **Deploy/Demo P1 value!**
3. **Enhancement 1** (Phase 4): Add Cache Optimization → Test independently → 21 tasks → **Deploy/Demo P2 value!**
4. **Enhancement 2** (Phase 5): Add Payload Optimization → Test independently → 22 tasks → **Deploy/Demo P3 value!**
5. **Polish** (Phase 6): Validation, documentation → 22 tasks → **Full feature complete!**

**Total**: 91 tasks organized for incremental delivery

### Parallel Team Strategy

With 3 developers after Foundational phase completes:

- **Developer A**: User Story 1 (API Audit) - 18 tasks
- **Developer B**: User Story 2 (Cache Optimization) - 21 tasks
- **Developer C**: User Story 3 (Payload Optimization) - 22 tasks

All three stories can develop in parallel, then integrate for final validation.

---

## Task Summary

**Total Tasks**: 95
- **Phase 1 (Setup)**: 8 tasks
- **Phase 2 (Foundational)**: 4 tasks (BLOCKS all user stories)
- **Phase 3 (US1 - Audit)**: 18 tasks - MVP ready
- **Phase 4 (US2 - Cache)**: 21 tasks
- **Phase 5 (US3 - Payload)**: 22 tasks
- **Phase 6 (Polish)**: 22 tasks

**Parallel Opportunities Identified**: 45 tasks marked [P] can run in parallel

**Independent Test Criteria**:
- **US1**: Capture requests, validate against docs, generate audit report with findings
- **US2**: Monitor cache hits, verify adaptive polling, confirm MMKV performance
- **US3**: Measure payload sizes, verify network-aware modes, test additive fetching

**Suggested MVP Scope**: Phases 1-3 (30 tasks) delivers complete API audit capability

---

## Notes

- [P] tasks = different files, no dependencies on incomplete work
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Manual testing workflows provided in quickstart.md
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Success criteria validation in Phase 6 ensures all requirements met
