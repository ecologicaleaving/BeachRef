# Tasks: UI Polish & User Experience Improvements

**Input**: Design documents from `/specs/004-ui-polish-improvements/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: NOT REQUESTED - Test tasks omitted per feature specification

**Organization**: Tasks grouped by user story to enable independent implementation and testing

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story this task belongs to (US1=Loading, US2=Duration, US3=Error, US4=Mock, US5=Filter)
- Include exact file paths in descriptions

## Path Conventions
Mobile cross-platform React Native application structure:
- **Types**: `types/` at repository root
- **Services**: `services/` at repository root
- **Hooks**: `hooks/` at repository root
- **Components**: `components/` at repository root
- **Screens**: `app/` at repository root (Expo Router)
- **Constants**: `constants/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Type definitions and foundational infrastructure

**Estimated Time**: 30-45 minutes

- [ ] T001 [P] Create TournamentLoadingState type in types/loading-state.ts per data-model.md
- [ ] T002 [P] Create APIErrorState type and factory functions in types/api-error.ts per data-model.md
- [ ] T003 [P] Create FilterState type and helpers in types/filter-state.ts per data-model.md
- [ ] T004 [P] Add MatchDuration interface to types/match.ts per data-model.md
- [ ] T005 Add barrel exports for new types in types/index.ts

**Checkpoint**: All type definitions complete, TypeScript compilation succeeds with no errors

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core services that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Estimated Time**: 1.5-2 hours

- [ ] T006 [P] Implement ErrorTransformService in services/ErrorTransformService.ts per research.md Decision 3
- [ ] T007 [P] Implement MatchDurationService in services/MatchDurationService.ts per research.md Decision 2
- [ ] T008 Add Axios response interceptor to services/VisApiClient.ts to transform errors using ErrorTransformService
- [ ] T009 Verify error transformation by testing API failure scenarios (disconnect network, check console)

**Checkpoint**: Foundation ready - services tested, error transformation verified, user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Loading State for Tournament List (Priority: P1) 🎯 MVP

**Goal**: Display proper loading indicator during tournament data fetch, show "no tournaments found" ONLY after fetch completes

**Independent Test**: Launch app → See loading spinner (not "no tournaments") → Data loads → See tournaments OR "no tournaments found"

**Success Criteria**: SC-001 (indicator <100ms), SC-002 (0% false "no tournaments" during loading)

**Estimated Time**: 2-2.5 hours

### Implementation for User Story 1

- [ ] T010 [P] [US1] Create useTournamentLoading hook in hooks/useTournamentLoading.ts per quickstart.md Step B1
- [ ] T011 [P] [US1] Create LoadingIndicator component in components/LoadingIndicator.tsx per quickstart.md Step C1
- [ ] T012 [US1] Add loading state management to services/TournamentService.ts (getLoadingState, setLoadingState methods)
- [ ] T013 [US1] Integrate useTournamentLoading hook in app/tournament-selection.tsx per quickstart.md Step D1
- [ ] T014 [US1] Update app/tournament-selection.tsx to conditionally render LoadingIndicator, ErrorMessage, empty state, or tournament list
- [ ] T015 [US1] Verify loading indicator displays within 100ms of screen load (measure with React DevTools Profiler)
- [ ] T016 [US1] Verify "no tournaments found" ONLY appears after data fetch completes with empty results

**Checkpoint**: User Story 1 complete - Loading states work correctly, no false empty states during loading

---

## Phase 4: User Story 2 - Real-Time Match Duration Updates (Priority: P1)

**Goal**: Match duration (minutes played) automatically updates in real-time during live score polling (5s interval)

**Independent Test**: View running match → Duration updates every 5-6 seconds → Match finishes → Duration freezes at final value

**Success Criteria**: SC-003 (updates <6s), SC-004 (accuracy ±1min)

**Estimated Time**: 2-2.5 hours

### Implementation for User Story 2

- [ ] T017 [P] [US2] Create useMatchDuration hook in hooks/useMatchDuration.ts per quickstart.md Step B2
- [ ] T018 [P] [US2] Update components/MatchList/MatchCard.tsx to use useMatchDuration hook and display live duration
- [ ] T019 [P] [US2] Update components/MatchList/MatchListItem.tsx to use useMatchDuration hook and display live duration
- [ ] T020 [US2] Update app/match-detail.tsx to use useMatchDuration hook and display live duration
- [ ] T021 [US2] Add formatMatchDuration helper function to types/match.ts for consistent display formatting
- [ ] T022 [US2] Verify duration updates every 5-6 seconds for running matches (observe timer in match card)
- [ ] T023 [US2] Verify duration accuracy within ±1 minute of actual elapsed time (compare to real clock)
- [ ] T024 [US2] Verify duration freezes when match status changes from "Running" to "Finished"

**Checkpoint**: User Story 2 complete - Match durations update in real-time for running matches, freeze when finished

---

## Phase 5: User Story 3 - API Error Message Improvement (Priority: P2)

**Goal**: Replace all technical error messages with user-friendly "The VIS API is currently not available, please retry in few minutes"

**Independent Test**: Disconnect network → See user-friendly error message (not HTTP 500) → Click retry → Reconnect → Data loads

**Success Criteria**: SC-005 (100% user-friendly errors, no technical leakage)

**Estimated Time**: 1.5-2 hours

### Implementation for User Story 3

- [ ] T025 [P] [US3] Create useApiError hook in hooks/useApiError.ts per quickstart.md Step B3
- [ ] T026 [P] [US3] Create ErrorMessage component in components/ErrorMessage.tsx per quickstart.md Step C2
- [ ] T027 [US3] Integrate ErrorMessage component in app/tournament-selection.tsx (already done in T014 but verify error prop wiring)
- [ ] T028 [US3] Integrate ErrorMessage component in app/tournament-detail.tsx for match data errors
- [ ] T029 [US3] Integrate ErrorMessage component in app/match-detail.tsx for single match errors
- [ ] T030 [US3] Test network offline scenario → Verify user-friendly message appears (not technical error)
- [ ] T031 [US3] Test API timeout scenario → Verify "retry in few minutes" message appears
- [ ] T032 [US3] Verify NO HTTP status codes, stack traces, or technical errors visible in UI (100% coverage check)
- [ ] T033 [US3] Verify retry button triggers refetch and clears error on success

**Checkpoint**: User Story 3 complete - All API errors transformed to user-friendly messages, retry works

---

## Phase 6: User Story 4 - Mock Tournament Data Cleanup (Priority: P2)

**Goal**: Remove all mock tournament data from production builds, optionally enable in development

**Independent Test**: Production build inspection → Zero mock tournaments → Development mode with ENABLE_MOCKS=true → Mocks appear

**Success Criteria**: SC-006 (0 mock tournaments in production)

**Estimated Time**: 45 minutes - 1 hour

### Implementation for User Story 4

- [ ] T034 [US4] Add `__DEV__` guards to constants/mockData.ts per research.md Decision 4
- [ ] T035 [US4] Create getMockTournaments() function in constants/mockData.ts that returns empty array in production
- [ ] T036 [US4] Update services/TournamentService.ts to conditionally merge mock data only in dev mode with EXPO_PUBLIC_ENABLE_MOCKS=true
- [ ] T037 [US4] Add EXPO_PUBLIC_ENABLE_MOCKS environment variable to .env.local (for local development)
- [ ] T038 [US4] Update .gitignore to exclude .env.local (prevent accidental commits)
- [ ] T039 [US4] Build production bundle with `npx expo export --platform web` and verify mock data excluded
- [ ] T040 [US4] Run production audit `npm run audit -- --checks=security` and verify zero mock tournaments (SC-006)

**Checkpoint**: User Story 4 complete - Mock data removed from production, available in dev mode only

---

## Phase 7: User Story 5 - Enhanced Filter Panel with Reorganized Actions (Priority: P3)

**Goal**: Move "Reset" button into filter panel next to "Save and Close", add refresh button to main screen

**Independent Test**: Open filter panel → See Reset + Save buttons side-by-side → Click Reset → Filters cleared, panel stays open → Click refresh on main screen → Data reloads

**Success Criteria**: SC-007 (reset <500ms), SC-008 (refresh <3s), SC-009 (max 1 concurrent request)

**Estimated Time**: 1.5-2 hours

### Implementation for User Story 5

- [ ] T041 [P] [US5] Add resetFilterState() function to types/filter-state.ts (already in data-model.md, verify implementation)
- [ ] T042 [US5] Update components/tournament/FilterPanel.tsx to add "Reset" button next to "Save and Close" per quickstart.md Step C3
- [ ] T043 [US5] Implement handleReset in FilterPanel that calls resetFilterState() and keeps panel open (doesn't close)
- [ ] T044 [US5] Add horizontal button group styling to FilterPanel with proper spacing and flex layout
- [ ] T045 [US5] Verify Reset and Save buttons meet 44x44pt touch target standards
- [ ] T046 [US5] Add refresh button (RefreshCw icon from lucide-react-native) to app/tournament-selection.tsx per quickstart.md Step C4
- [ ] T047 [US5] Implement handleRefresh with debouncing to prevent duplicate API calls (FR-013)
- [ ] T048 [US5] Add isRefreshing state to disable refresh button during active fetch
- [ ] T049 [US5] Verify refresh button reloads data while preserving current filter settings
- [ ] T050 [US5] Test filter reset completes within 500ms and panel stays open (SC-007)
- [ ] T051 [US5] Test refresh button reloads data within 3 seconds (SC-008)
- [ ] T052 [US5] Test clicking refresh multiple times → Verify only 1 API call active (SC-009 deduplication)

**Checkpoint**: User Story 5 complete - Filter panel has reset button, main screen has refresh button, all working correctly

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories and final validation

**Estimated Time**: 1 hour

- [ ] T053 [P] Run TypeScript validation `npx tsc --noEmit` and fix any new type errors
- [ ] T054 [P] Run ESLint `npm run lint` and fix any violations
- [ ] T055 Verify all success criteria from spec.md are met (SC-001 through SC-010)
- [ ] T056 Run production audit system `npm run audit:ci` and address any Critical/High issues
- [ ] T057 Update CLAUDE.md with new patterns (state hooks, error transformation, duration calculation) if needed
- [ ] T058 Run full manual testing checklist from quickstart.md Step E1
- [ ] T059 Verify constitution compliance (mobile-first, offline-first, service layer, etc.) per plan.md
- [ ] T060 Take performance benchmarks (loading indicator timing, duration update cycle, filter reset timing)

**Checkpoint**: Feature complete - All user stories working, all success criteria met, ready for PR

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001-T005) completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational (T006-T009) completion
  - US1 (Loading): Independent, can start immediately after Foundation
  - US2 (Duration): Independent, can start immediately after Foundation
  - US3 (Error): Requires ErrorTransformService (T006-T008) from Foundation
  - US4 (Mock): Independent, can start immediately after Foundation
  - US5 (Filter): Requires useTournamentLoading hook from US1 (T010) for refresh button integration
- **Polish (Phase 8)**: Depends on completion of desired user stories

### User Story Dependencies

- **User Story 1 (US1 - Loading)**: No dependencies on other stories - Can start after Foundation
- **User Story 2 (US2 - Duration)**: No dependencies on other stories - Can start after Foundation
- **User Story 3 (US3 - Error)**: No dependencies on other stories - Can start after Foundation
- **User Story 4 (US4 - Mock)**: No dependencies on other stories - Can start after Foundation
- **User Story 5 (US5 - Filter)**: Depends on US1 (T010 useTournamentLoading hook) for refresh button functionality

### Within Each User Story

**User Story 1** (Loading):
1. T010 (hook) and T011 (component) in parallel
2. T012 (service update)
3. T013-T014 (screen integration) sequential
4. T015-T016 (validation) in any order

**User Story 2** (Duration):
1. T017 (hook) first
2. T018-T020 (component updates) all in parallel
3. T021 (helper function)
4. T022-T024 (validation) in any order

**User Story 3** (Error):
1. T025 (hook) and T026 (component) in parallel
2. T027-T029 (integration) in parallel
3. T030-T033 (validation) in any order

**User Story 4** (Mock):
1. T034-T036 (guards and function) sequential
2. T037-T038 (env config) in parallel
3. T039-T040 (validation) sequential

**User Story 5** (Filter):
1. T041 (helper function)
2. T042-T045 (filter panel) sequential
3. T046-T048 (refresh button) sequential
4. T049-T052 (validation) in any order

### Parallel Opportunities

**Setup Phase** (ALL parallel):
- T001, T002, T003, T004 can all run in parallel (different files)
- T005 runs after T001-T004

**Foundation Phase**:
- T006 and T007 can run in parallel (different services)
- T008 depends on T006
- T009 is validation (after T008)

**User Stories** (After Foundation complete):
- US1, US2, US3, US4 can ALL start in parallel (independent stories)
- US5 requires T010 from US1 but can proceed in parallel after that

**Within User Stories**:
- US1: T010 and T011 parallel
- US2: T018, T019, T020 parallel (different files)
- US3: T025 and T026 parallel, then T027-T029 parallel
- US4: T037 and T038 parallel

---

## Parallel Example: After Foundation Complete

```bash
# All independent user stories can start immediately:

# Developer A (or parallel Task execution):
Task: "Create useTournamentLoading hook in hooks/useTournamentLoading.ts" [US1]
Task: "Create LoadingIndicator component in components/LoadingIndicator.tsx" [US1]

# Developer B (or parallel Task execution):
Task: "Create useMatchDuration hook in hooks/useMatchDuration.ts" [US2]

# Developer C (or parallel Task execution):
Task: "Create useApiError hook in hooks/useApiError.ts" [US3]
Task: "Create ErrorMessage component in components/ErrorMessage.tsx" [US3]

# Developer D (or parallel Task execution):
Task: "Add __DEV__ guards to constants/mockData.ts" [US4]
```

---

## Parallel Example: User Story 2 (Duration)

```bash
# After T017 (hook) completes, all component updates run in parallel:
Task: "Update components/MatchList/MatchCard.tsx to use useMatchDuration hook"
Task: "Update components/MatchList/MatchListItem.tsx to use useMatchDuration hook"
Task: "Update app/match-detail.tsx to use useMatchDuration hook"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) - RECOMMENDED

**Goal**: Get loading states working ASAP for immediate UX improvement

1. Complete Phase 1: Setup (T001-T005) - 30-45 min
2. Complete Phase 2: Foundation (T006-T009) - 1.5-2 hours
3. Complete Phase 3: User Story 1 (T010-T016) - 2-2.5 hours
4. **STOP and VALIDATE**: Test US1 independently → Should see proper loading states
5. **OPTIONAL**: Deploy/demo loading states improvement

**Total MVP Time**: ~4.5-5.5 hours
**Value Delivered**: Eliminates confusion around "no tournaments found" appearing during loading

### Incremental Delivery (Priority Order)

**Recommended for maximum value delivery:**

1. Setup + Foundation → ~2-2.5 hours
2. Add US1 (Loading) → Test independently → **Deploy** (MVP) → ~2-2.5 hours
3. Add US2 (Duration) → Test independently → **Deploy** → ~2-2.5 hours
4. Add US3 (Error) → Test independently → **Deploy** → ~1.5-2 hours
5. Add US4 (Mock) → Test independently → **Deploy** → ~45min-1hr
6. Add US5 (Filter) → Test independently → **Deploy** → ~1.5-2 hours
7. Polish (Phase 8) → Final validation → ~1 hour

**Total Time**: ~12-14 hours across 3-4 sessions
**Value**: Each story adds UX improvement without breaking previous functionality

### Parallel Team Strategy

With multiple developers (2-3 people):

1. **Together** (Session 1: ~2-2.5 hours):
   - Complete Setup (T001-T005)
   - Complete Foundation (T006-T009)

2. **Parallel** (Session 2: ~2-3 hours):
   - Developer A: User Story 1 (Loading) - T010-T016
   - Developer B: User Story 2 (Duration) - T017-T024
   - Developer C: User Story 4 (Mock) - T034-T040

3. **Parallel** (Session 3: ~1.5-2 hours):
   - Developer A: User Story 3 (Error) - T025-T033
   - Developer B: User Story 5 (Filter) - T041-T052 (requires T010 from A)

4. **Together** (Session 4: ~1 hour):
   - Polish & validation (T053-T060)

**Total Time**: ~7-8.5 hours with 3 developers (vs 12-14 hours solo)

---

## Success Criteria Validation Checklist

After completing all user stories, verify ALL success criteria from spec.md:

- [ ] **SC-001**: Users see loading indicator within 100ms of navigating to tournament selection screen
- [ ] **SC-002**: "No tournaments found" appears ONLY when data fetch completes with empty results (0% false positives)
- [ ] **SC-003**: Match duration updates within 6 seconds of each live score polling cycle
- [ ] **SC-004**: Match duration accuracy within ±1 minute of actual elapsed time
- [ ] **SC-005**: Users see user-friendly API error message for 100% of VIS API failures (no technical errors)
- [ ] **SC-006**: Zero mock tournaments appear in production builds
- [ ] **SC-007**: Filter reset action completes within 500ms and keeps panel open
- [ ] **SC-008**: Refresh button reloads data within 3 seconds while preserving filters
- [ ] **SC-009**: Duplicate API calls prevented (max 1 concurrent request)
- [ ] **SC-010**: Long-term metric - track support ticket reduction (30% target)

---

## Task Count Summary

| Phase | Task Count | Estimated Time |
|-------|-----------|----------------|
| Phase 1: Setup | 5 tasks | 30-45 min |
| Phase 2: Foundation | 4 tasks | 1.5-2 hours |
| Phase 3: US1 (Loading) | 7 tasks | 2-2.5 hours |
| Phase 4: US2 (Duration) | 8 tasks | 2-2.5 hours |
| Phase 5: US3 (Error) | 9 tasks | 1.5-2 hours |
| Phase 6: US4 (Mock) | 7 tasks | 45min-1hr |
| Phase 7: US5 (Filter) | 12 tasks | 1.5-2 hours |
| Phase 8: Polish | 8 tasks | 1 hour |
| **TOTAL** | **60 tasks** | **10.5-13.5 hours** |

---

## Parallel Opportunities Summary

**Maximum Parallelization** (with sufficient team capacity):

- **Phase 1 Setup**: 4 tasks parallel (T001-T004), then T005
- **Phase 2 Foundation**: 2 tasks parallel (T006-T007), then T008-T009 sequential
- **User Stories After Foundation**:
  - US1, US2, US3, US4 can ALL start in parallel (20+ tasks parallelizable)
  - US5 requires T010 from US1 but then proceeds independently
- **Within Stories**: 10+ additional parallel opportunities (components, integrations)

**Estimated Speedup with 3 Developers**: ~40-50% time reduction (12-14 hours → 7-8.5 hours)

---

## Notes

- **[P] marker**: Different files, no dependencies, can run in parallel
- **[Story] label**: Maps task to specific user story for traceability (US1-US5)
- **File paths**: All paths are absolute from repository root
- **Validation tasks**: Each user story has validation tasks (T015-T016, T022-T024, etc.)
- **Constitution compliance**: All tasks designed to follow mobile-first, service layer, offline-first principles
- **Zero breaking changes**: All modifications are additive or non-breaking refactors
- **TypeScript strict mode**: All new code maintains type safety
- **Performance targets**: Measured and validated in T060

**Recommended Approach**: Start with MVP (US1 only) to validate foundation, then proceed incrementally by priority
