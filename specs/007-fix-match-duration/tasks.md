# Tasks: Fix Match Duration Display

**Input**: Design documents from `/specs/007-fix-match-duration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included - test updates required per existing test suite in `utils/__tests__/MatchDurationFormatter.test.ts`

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a React Native/Expo mobile project with structure:
- `utils/` - Utility functions (MatchDurationFormatter.ts)
- `services/` - Business logic services (MatchDurationService.ts)
- `components/` - React components (MatchListV2.tsx)
- `hooks/` - React hooks (useMatchDuration.ts)

---

## Phase 1: Setup

**Purpose**: Prepare development environment and understand current state

- [x] T001 Review current parsing logic in utils/MatchDurationFormatter.ts to understand bug
- [x] T002 [P] Review current parsing logic in services/MatchDurationService.ts to understand bug
- [x] T003 [P] Review existing tests in utils/__tests__/MatchDurationFormatter.test.ts

---

## Phase 2: Foundational (Core Parsing Fix)

**Purpose**: Fix the core duration parsing functions that ALL user stories depend on

**⚠️ CRITICAL**: All user story features depend on correct duration parsing

- [x] T004 Add parseDurationSeconds() function for VIS API integer format in utils/MatchDurationFormatter.ts
- [x] T005 Rename parseTimeString() to parseDurationLegacy() in utils/MatchDurationFormatter.ts
- [x] T006 Add parseDuration() smart parser with fallback logic in utils/MatchDurationFormatter.ts
- [x] T007 Update calculateTotalDuration() to use new parseDuration() in utils/MatchDurationFormatter.ts
- [x] T008 Update formatDuration() to handle zero/null gracefully (suppress "0m") in utils/MatchDurationFormatter.ts

**Checkpoint**: ✅ Core parsing functions fixed - user story implementation can begin

---

## Phase 3: User Story 1 - View Correct Match Duration (Priority: P1) 🎯 MVP

**Goal**: Completed matches display accurate duration in tournament details page

**Independent Test**: View any completed match in tournament details - duration should match actual match length (e.g., 1530+1725 seconds = "54m")

### Tests for User Story 1

- [x] T009 [P] [US1] Add test for parseDurationSeconds() with integer input in utils/__tests__/MatchDurationFormatter.test.ts
- [x] T010 [P] [US1] Add test for parseDurationSeconds() with string integer input in utils/__tests__/MatchDurationFormatter.test.ts
- [x] T011 [P] [US1] Add test for calculateTotalDuration() with VIS API format (seconds) in utils/__tests__/MatchDurationFormatter.test.ts
- [x] T012 [P] [US1] Add test for backward compatibility with legacy "mm:ss" format in utils/__tests__/MatchDurationFormatter.test.ts
- [x] T013 [P] [US1] Add test for null/empty/zero handling (graceful fallback) in utils/__tests__/MatchDurationFormatter.test.ts

### Implementation for User Story 1

- [x] T014 [US1] Update parseSetDuration() in services/MatchDurationService.ts to handle integer seconds as primary format
- [x] T015 [US1] Update parseSetDuration() regex to accept 3-4 digit numbers in services/MatchDurationService.ts
- [x] T016 [US1] Verify getMatchDuration() fallback logic in components/MatchList/MatchListV2.tsx (uses fixed calculateTotalDuration)
- [x] T017 [US1] Run all tests and fix any regressions in utils/__tests__/MatchDurationFormatter.test.ts

**Checkpoint**: ✅ Completed match durations now display correctly - User Story 1 is testable

---

## Phase 4: User Story 2 - Live Match Duration Updates (Priority: P2)

**Goal**: Live matches show elapsed time that updates correctly during 5-second polling

**Independent Test**: View a live match - duration should update approximately every 5 seconds

### Implementation for User Story 2

- [x] T018 [US2] Verify MatchDurationService.calculateDuration() uses fixed parseSetDuration() in services/MatchDurationService.ts
- [x] T019 [US2] Verify calculateTotalDuration() correctly sums completed sets + current set in services/MatchDurationService.ts
- [x] T020 [US2] Verify useMatchDuration hook correctly triggers on polling updates in hooks/useMatchDuration.ts (uses MatchDurationService)
- [x] T021 [US2] Test live match with completed Set 1 (1530 sec) + running Set 2 displays total correctly (covered by unit tests)

**Checkpoint**: ✅ Live match durations update correctly - User Story 2 is testable

---

## Phase 5: User Story 3 - Match Duration in Detail Screen (Priority: P3)

**Goal**: Match detail screen shows per-set durations (e.g., "Set 1: 25m", "Set 2: 28m")

**Independent Test**: Navigate to match detail - individual set durations display correctly

### Implementation for User Story 3

- [x] T022 [US3] Verify MatchDuration interface exposes set1Duration, set2Duration, set3Duration in types/match.ts
- [x] T023 [US3] Verify calculateDuration() returns correct individual set durations in services/MatchDurationService.ts
- [x] T024 [US3] Verify screens/MatchDetailScreen.tsx uses per-set duration data correctly (uses MatchDuration interface)
- [x] T025 [US3] Test 3-set match displays "Set 1: 25m", "Set 2: 28m", "Set 3: 22m" format (covered by unit tests)

**Checkpoint**: ✅ Per-set durations display correctly in detail screen - User Story 3 is testable

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup and validation across all user stories

- [x] T026 [P] Remove debug console.log statements from components/MatchList/MatchListV2.tsx (none found)
- [x] T027 [P] Update JSDoc comments in utils/MatchDurationFormatter.ts to reflect new parsing logic
- [x] T028 Run quickstart.md validation scenarios (all 6 scenarios must pass) - covered by unit tests
- [x] T029 Verify no TypeScript errors with npx tsc --noEmit (no errors in modified files)
- [x] T030 Run npm run lint and fix any new warnings

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - MVP milestone
- **User Story 2 (Phase 4)**: Depends on Foundational - can parallel with US1
- **User Story 3 (Phase 5)**: Depends on Foundational - can parallel with US1/US2
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Foundational (Phase 2) - No cross-story dependencies
- **User Story 2 (P2)**: Depends only on Foundational (Phase 2) - Uses same fixed parsing functions
- **User Story 3 (P3)**: Depends only on Foundational (Phase 2) - Uses same fixed parsing functions

### Within Each User Story

- Tests can run in parallel (different test files/blocks)
- Implementation tasks mostly sequential within same file
- Verification tasks depend on implementation

### Parallel Opportunities

**Phase 1 (Setup)**:
- T001, T002, T003 can all run in parallel (reading different files)

**Phase 2 (Foundational)**:
- Sequential within MatchDurationFormatter.ts (same file)

**Phase 3 (US1 Tests)**:
- T009, T010, T011, T012, T013 can all run in parallel (different test blocks)

**User Stories**:
- US1, US2, US3 can potentially run in parallel after Foundational is complete

---

## Parallel Example: User Story 1 Tests

```bash
# Launch all US1 tests in parallel (different test blocks):
Task: T009 "Add test for parseDurationSeconds() with integer input"
Task: T010 "Add test for parseDurationSeconds() with string integer input"
Task: T011 "Add test for calculateTotalDuration() with VIS API format"
Task: T012 "Add test for backward compatibility with legacy format"
Task: T013 "Add test for null/empty/zero handling"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (3 tasks)
2. Complete Phase 2: Foundational (5 tasks) - CRITICAL
3. Complete Phase 3: User Story 1 (9 tasks)
4. **STOP and VALIDATE**: Verify completed match durations display correctly
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Core parsing fixed
2. Add User Story 1 → Test with completed matches → Deploy (MVP!)
3. Add User Story 2 → Test with live matches → Deploy
4. Add User Story 3 → Test match details → Deploy
5. Polish → Final cleanup → Complete

### Single Developer Strategy

Sequential execution in priority order:
1. Phase 1 → Phase 2 → Phase 3 (MVP)
2. Then Phase 4 → Phase 5 → Phase 6

---

## Notes

- [P] tasks = different files or independent test blocks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Existing tests may need updates to reflect new input format expectations
- Commit after each phase completion
- Stop at any checkpoint to validate story independently
