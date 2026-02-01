# Implementation Tasks: Players Entry List

**Feature**: 003-players-entry-list
**Branch**: `003-players-entry-list`
**Generated**: 2025-10-21

## Overview

This document provides a complete, dependency-ordered task breakdown for implementing the Players Entry List feature. Tasks are organized by user story to enable independent implementation and testing.

**Total Tasks**: 47
**MVP Scope**: User Story 1 (28 tasks)
**Parallel Opportunities**: 15 tasks can run in parallel

---

## Implementation Strategy

### MVP-First Approach

**Minimum Viable Product** = **User Story 1 Only** (P1)
- Delivers core value: View main draw teams with basic filtering
- 28 tasks, estimated 2-3 days
- Independently testable and deployable
- Provides foundation for P2 and P3 enhancements

**Incremental Delivery**:
1. **Sprint 1**: User Story 1 (P1) - Main draw team list → Deploy to production
2. **Sprint 2**: User Story 2 (P2) - Qualification filtering + Modal details → Deploy
3. **Sprint 3**: User Story 3 (P3) - Gender filtering + Polish → Deploy

### Parallel Execution Opportunities

Tasks marked with `[P]` can be executed in parallel with other `[P]` tasks in the same phase (different files, no dependencies).

---

## Phase 1: Setup & Foundation

**Goal**: Establish type safety, API integration, and caching infrastructure

**Dependencies**: None (blocking prerequis for all user stories)

### Tasks

- [ ] T001 [P] Create TypeScript interface file for TournamentTeam entity in types/tournament-team.ts
- [ ] T002 [P] Create TypeScript interface file for TeamPlayer entity in types/tournament-team.ts
- [ ] T003 [P] Create TeamPhase and TeamStatus enum types in types/tournament-team.ts
- [ ] T004 [P] Add GetTournamentTeamListRequest interface to types/api-v2.ts
- [ ] T005 [P] Add GetTournamentTeamListResponse and VISTeamDTO interfaces to types/api-v2.ts
- [ ] T006 Add getTournamentTeamList method to services/api/VisApiClient.ts with field selection support
- [ ] T007 Add buildGetTournamentTeamListXML helper method to services/api/VisApiClient.ts
- [ ] T008 [P] Create REQUIRED_TEAM_FIELDS constant array in services/api/VisApiClient.ts
- [ ] T009 [P] Create TournamentTeamService class in services/TournamentTeamService.ts
- [ ] T010 Implement calculateTeamListTTL method with adaptive logic (7d → 24h → static) in services/TournamentTeamService.ts
- [ ] T011 Implement parseVISTeam normalization function in services/TournamentTeamService.ts
- [ ] T012 Implement normalizePhaseCode helper function in services/TournamentTeamService.ts
- [ ] T013 Implement normalizeTeamStatus helper function in services/TournamentTeamService.ts
- [ ] T014 Implement getTeamList method with cache integration in services/TournamentTeamService.ts
- [ ] T015 [P] Create type guard isValidTeam in types/tournament-team.ts
- [ ] T016 [P] Create type guard isValidTeamPlayer in types/tournament-team.ts

**Checkpoint**: All type definitions and service layer infrastructure complete. TypeScript compiler passes with no errors.

---

## Phase 2: User Story 1 - View Main Draw Teams (P1)

**Goal**: Display main draw team list with basic UI, caching, and pull-to-refresh

**Independent Test**: Navigate to tournament detail, tap Players tab, see main draw teams with player names, seeds, and countries. Pull-to-refresh updates the list.

**Why MVP**: Delivers 80% of user value - referees can view complete team rosters instantly.

**Dependencies**: Phase 1 complete

### Tasks

- [ ] T017 [P] [US1] Create useTournamentTeams hook in hooks/useTournamentTeams.ts with state management
- [ ] T018 [US1] Implement loadTeams function with error handling in hooks/useTournamentTeams.ts
- [ ] T019 [US1] Implement client-side filtering logic with useMemo in hooks/useTournamentTeams.ts
- [ ] T020 [US1] Add refresh function to useTournamentTeams hook in hooks/useTournamentTeams.ts
- [ ] T021 [P] [US1] Create TeamListItem component in components/tournament/TeamListItem.tsx
- [ ] T022 [US1] Implement team card layout with seed, player names, country in components/tournament/TeamListItem.tsx
- [ ] T023 [US1] Add touch target optimization (minimum 44pt) in components/tournament/TeamListItem.tsx
- [ ] T024 [P] [US1] Create EmptyTeamListState component in components/tournament/EmptyTeamListState.tsx
- [ ] T025 [US1] Add empty state messaging and icon in components/tournament/EmptyTeamListState.tsx
- [ ] T026 [P] [US1] Create TournamentTeamsScreen in screens/TournamentTeamsScreen.tsx
- [ ] T027 [US1] Implement FlatList with virtualization optimizations (getItemLayout, initialNumToRender, windowSize) in screens/TournamentTeamsScreen.tsx
- [ ] T028 [US1] Add pull-to-refresh control with RefreshControl component in screens/TournamentTeamsScreen.tsx
- [ ] T029 [US1] Add loading and error state handling in screens/TournamentTeamsScreen.tsx
- [ ] T030 [US1] Configure FlatList performance props (removeClippedSubviews, maxToRenderPerBatch) in screens/TournamentTeamsScreen.tsx
- [ ] T031 [P] [US1] Create app/tournament-teams.tsx route file with screen export
- [ ] T032 [US1] Add Players tab icon (Users from lucide-react-native) to components/navigation/TournamentBottomMenu.tsx
- [ ] T033 [US1] Position Players tab between Schedule and Officials in menuItems array in components/navigation/TournamentBottomMenu.tsx
- [ ] T034 [US1] Add tournament-teams route mapping in components/navigation/TournamentBottomMenu.tsx
- [ ] T035 [P] [US1] Define TEAM_CARD_HEIGHT constant (80px) in types/tournament-team.ts
- [ ] T036 [P] [US1] Create PHASE_LABELS display constant mapping in types/tournament-team.ts
- [ ] T037 [US1] Implement team sorting by seed number in TournamentTeamService.ts
- [ ] T038 [US1] Add offline indicator when showing cached data in screens/TournamentTeamsScreen.tsx
- [ ] T039 [US1] Handle API error gracefully with cache fallback in services/TournamentTeamService.ts
- [ ] T040 [US1] Verify TypeScript compilation with npx tsc --noEmit
- [ ] T041 [US1] Test manual: Navigate to tournament, tap Players tab, verify teams load
- [ ] T042 [US1] Test manual: Pull-to-refresh, verify API call and list update
- [ ] T043 [US1] Test manual: Scroll through 50+ teams, verify 60 FPS performance
- [ ] T044 [US1] Test manual: Disable network, verify cached data displays with offline indicator

**Deliverable**: Fully functional main draw team list with offline support and pull-to-refresh. User Story 1 acceptance criteria met. **Can ship to production.**

---

## Phase 3: User Story 2 - Qualification Filtering & Team Details (P2)

**Goal**: Add phase filtering (Main Draw/Qualification) and modal overlay for team details

**Independent Test**: Navigate to tournament with qualifications, select Qualification filter, see only qualification teams. Tap team, modal opens with detailed info.

**Why P2**: Extends core functionality for tournaments with qualification rounds. Independent of gender filtering.

**Dependencies**: User Story 1 complete

### Tasks

- [ ] T045 [P] [US2] Add phaseFilter state to useTournamentTeams hook in hooks/useTournamentTeams.ts
- [ ] T046 [US2] Update filtering logic to include phase filter in hooks/useTournamentTeams.ts
- [ ] T047 [P] [US2] Create FilterControls component in components/tournament/FilterControls.tsx
- [ ] T048 [US2] Implement phase toggle buttons (Main Draw / Qualification) in components/tournament/FilterControls.tsx
- [ ] T049 [US2] Add disabled state for Qualification when tournament has no quals in components/tournament/FilterControls.tsx
- [ ] T050 [US2] Show "No Qualification Tournament" message when disabled in components/tournament/FilterControls.tsx
- [ ] T051 [P] [US2] Create TeamDetailModal component in components/tournament/TeamDetailModal.tsx
- [ ] T052 [US2] Implement Modal wrapper with presentationStyle="pageSheet" in components/tournament/TeamDetailModal.tsx
- [ ] T053 [US2] Add close button with accessibility label in components/tournament/TeamDetailModal.tsx
- [ ] T054 [US2] Display team quick info (players, country, seed, status) in components/tournament/TeamDetailModal.tsx
- [ ] T055 [US2] Add swipe-to-dismiss gesture support in components/tournament/TeamDetailModal.tsx
- [ ] T056 [US2] Implement lazy loading for match history data in components/tournament/TeamDetailModal.tsx
- [ ] T057 [US2] Add loading indicator for async modal content in components/tournament/TeamDetailModal.tsx
- [ ] T058 [US2] Add modal state management (selectedTeam, modalVisible) to useTournamentTeams hook in hooks/useTournamentTeams.ts
- [ ] T059 [US2] Wire team press handler to open modal in screens/TournamentTeamsScreen.tsx
- [ ] T060 [US2] Add FilterControls as ListHeaderComponent in screens/TournamentTeamsScreen.tsx
- [ ] T061 [US2] Test manual: Select Qualification filter, verify only qual teams shown
- [ ] T062 [US2] Test manual: Tournament with no quals, verify filter disabled with message
- [ ] T063 [US2] Test manual: Tap team, modal opens instantly with quick info
- [ ] T064 [US2] Test manual: Swipe modal to dismiss, verify smooth gesture

**Deliverable**: Phase filtering and team detail modals working. User Story 2 acceptance criteria met. **Can ship to production.**

---

## Phase 4: User Story 3 - Gender Filtering (P3)

**Goal**: Add gender filter (All/Men/Women) for mixed-gender tournaments

**Independent Test**: Toggle gender filter between Men and Women, verify only selected gender's teams display.

**Why P3**: Usability enhancement for mixed-gender tournaments. Feature fully functional without it.

**Dependencies**: User Story 1 complete (independent of User Story 2)

### Tasks

- [ ] T065 [P] [US3] Add genderFilter state to useTournamentTeams hook in hooks/useTournamentTeams.ts
- [ ] T066 [US3] Update filtering logic to include gender filter in hooks/useTournamentTeams.ts
- [ ] T067 [P] [US3] Add gender segmented control to FilterControls component in components/tournament/FilterControls.tsx
- [ ] T068 [US3] Implement gender filter buttons (All / Men / Women) in components/tournament/FilterControls.tsx
- [ ] T069 [US3] Add auto-detection for single-gender tournaments in components/tournament/FilterControls.tsx
- [ ] T070 [US3] Disable gender toggle when tournament has only one gender in components/tournament/FilterControls.tsx
- [ ] T071 [US3] Test manual: Toggle to Men filter, verify only men's teams shown
- [ ] T072 [US3] Test manual: Toggle to Women filter, verify only women's teams shown
- [ ] T073 [US3] Test manual: Single-gender tournament, verify filter auto-set and disabled
- [ ] T074 [US3] Test manual: Combined filters (Men + Qualification), verify AND logic works

**Deliverable**: Gender filtering working for all tournament types. User Story 3 acceptance criteria met. **Can ship to production.**

---

## Phase 5: Polish & Cross-Cutting Concerns

**Goal**: Add status badges, empty states, and final UX polish

**Dependencies**: All user stories complete

### Tasks

- [ ] T075 [P] Create TeamStatusBadge component in components/tournament/TeamStatusBadge.tsx
- [ ] T076 Add wild card badge (WC) styling in components/tournament/TeamStatusBadge.tsx
- [ ] T077 Add reserve badge (Reserve) styling in components/tournament/TeamStatusBadge.tsx
- [ ] T078 Add withdrawn badge (Withdrawn) styling with strikethrough in components/tournament/TeamStatusBadge.tsx
- [ ] T079 Define STATUS_COLORS constant mapping in types/tournament-team.ts
- [ ] T080 Integrate TeamStatusBadge into TeamListItem component in components/tournament/TeamListItem.tsx
- [ ] T081 Add reserve teams section separator logic in screens/TournamentTeamsScreen.tsx
- [ ] T082 Implement team placeholder for missing player data "Team #X - Details pending" in components/tournament/TeamListItem.tsx
- [ ] T083 Add accessibility labels to all interactive elements (tab button, team cards, modal) across components
- [ ] T084 Verify touch targets meet 44x44pt minimum across all components
- [ ] T085 Run TypeScript compiler check: npx tsc --noEmit
- [ ] T086 Run ESLint: npm run lint
- [ ] T087 Run production audit: npm run audit -- --checks=typescript,eslint
- [ ] T088 Test manual: All acceptance scenarios from spec.md
- [ ] T089 Test manual: Verify SC-001 through SC-009 success criteria met
- [ ] T090 Update CLAUDE.md if new patterns introduced

**Deliverable**: Feature complete with all polish, accessibility, and status indicators. Ready for final QA and deployment.

---

## Dependency Graph

### Story Completion Order

```
Phase 1 (Setup)
    ↓
┌───┴───┐
│       │
US1     US2 (depends on US1)
│       │
US3     │
│       │
└───┬───┘
    ↓
  Polish
```

**Independent Stories**:
- US1 can be implemented and shipped alone (MVP)
- US3 depends only on US1 (can skip US2)

**Dependent Stories**:
- US2 depends on US1 (uses same hook, components)

### Parallel Execution Examples

**Phase 1 (Setup)** - Can run 8 tasks in parallel:
```
Parallel Group 1:
- T001, T002, T003 (type definitions - different sections of same file)
- T004, T005 (API types - different sections of same file)
- T008 (constants)
- T015, T016 (type guards)
```

**Phase 2 (US1)** - Can run 7 tasks in parallel:
```
Parallel Group 1:
- T017 (hook)
- T021 (TeamListItem)
- T024 (EmptyState)
- T026 (Screen)
- T031 (route)
- T035, T036 (constants)
```

---

## Validation Checklist

Before marking feature complete, verify:

- [ ] All 90 tasks completed
- [ ] TypeScript compilation passes (npx tsc --noEmit)
- [ ] ESLint passes (npm run lint)
- [ ] All acceptance scenarios from spec.md tested manually
- [ ] All 9 success criteria (SC-001 through SC-009) met
- [ ] Feature works offline with cached data
- [ ] 60 FPS scrolling with 64+ teams verified
- [ ] Modal opens instantly without jank
- [ ] Pull-to-refresh triggers API call correctly
- [ ] All filters combine correctly (AND logic)
- [ ] Status badges display for WC, Reserve, Withdrawn teams
- [ ] Empty states show appropriate messages
- [ ] Touch targets meet 44x44pt minimum
- [ ] Accessibility labels present on all interactive elements

---

## Task Metrics

| Phase | Task Count | Parallel Tasks | User Story | Estimated Time |
|-------|------------|----------------|------------|----------------|
| Phase 1: Setup | 16 | 8 | N/A | 4-6 hours |
| Phase 2: US1 (P1) | 28 | 7 | View Main Draw | 1.5-2 days |
| Phase 3: US2 (P2) | 20 | 3 | Qualification & Modals | 1-1.5 days |
| Phase 4: US3 (P3) | 10 | 2 | Gender Filtering | 0.5 days |
| Phase 5: Polish | 16 | 1 | N/A | 0.5-1 day |
| **Total** | **90** | **21** | **3** | **4-6 days** |

**MVP (US1 only)**: 44 tasks, 2-3 days

---

## Notes

- All tasks follow strict checklist format: `- [ ] [TaskID] [P] [Story] Description with file path`
- Tasks marked `[P]` can execute in parallel (different files, no dependencies)
- Tasks marked `[US1]`, `[US2]`, `[US3]` map to user stories from spec.md
- Each user story phase is independently testable and deployable
- MVP = User Story 1 only (P1 priority)
- Feature follows mobile-first, offline-first architectural principles
- No tests generated (not explicitly requested in specification)
