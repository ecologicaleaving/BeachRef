# Tasks: Match Officials Display

**Input**: Design documents from `/specs/006-match-officials-display/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, INVESTIGATION_REPORT.md

**Tests**: Tests are NOT requested in this specification - tasks focus on implementation only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Mobile app structure**: `app/`, `components/`, `services/`, `types/`, `hooks/` at repository root
- Expo Router file-based routing for screens
- TypeScript 5.x with React Native 0.79.5

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: TypeScript types and interfaces for official data structures

- [X] T001 [P] Create types/official.ts with AuxiliaryPerson interface (No, FirstName, LastName, NationalityCode, Functions, Gender)
- [X] T002 [P] Create types/official.ts with PersonnelData interface (Scorer, AssistantScorer, LineJudge1, LineJudge2, LineJudge3, LineJudge4)
- [X] T003 [P] Extend types/referee-v2.ts OfficialRole enum with SCORER, ASSISTANT_SCORER, LINE_JUDGE_1, LINE_JUDGE_2, LINE_JUDGE_3, LINE_JUDGE_4
- [X] T004 [P] Extend types/match.ts BeachMatch interface with Challenge Referee fields (NoRefereeChallenge, RefereeChallengeName, RefereeChallengeFederationCode, NoRefereeAssistantChallenge, NoRefereeReserve)
- [X] T005 [P] Extend types/match.ts BeachMatch interface with Personnel field (string containing HTML-entity-encoded XML)
- [X] T006 [P] Extend types/match.ts BeachMatch interface with EventNo field (string for cross-reference to GetEvent)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### VIS API Client Extensions

- [X] T007 Extend services/api/VisApiClient.ts with GetEvent endpoint method (accepts EventNo and Fields parameters)
- [X] T008 [P] Add parseAuxiliaryPersons method to services/api/VisApiClient.ts (HTML entity decode, XML parse using fast-xml-parser, return AuxiliaryPerson[])
- [X] T009 [P] Add parsePersonnelField method to services/api/VisApiClient.ts (HTML entity decode, XML parse, return PersonnelData)

### Service Layer - Official Mapping

- [X] T010 Create services/OfficialMappingService.ts with mapPersonnelToOfficials method (takes PersonnelData + AuxiliaryPerson[], returns mapped officials with names)
- [X] T011 Add getOfficialById method to services/OfficialMappingService.ts (takes ID + AuxiliaryPerson[], returns AuxiliaryPerson or null)
- [X] T012 Add resolveOfficialRole method to services/OfficialMappingService.ts (takes OfficialRole + name + federation, returns formatted official object)

### Cache Integration

- [X] T013 Add cacheAuxiliaryPersons method to services/cache/MmkvStorage.ts (key: `event:${eventNo}:auxiliaryPersons`, TTL: 120s)
- [X] T014 Add getCachedAuxiliaryPersons method to services/cache/MmkvStorage.ts (returns AuxiliaryPerson[] or null)
- [X] T015 Extend app/_layout.tsx tournament cache warming to include non-blocking GetEvent AuxiliaryPersons fetch during tournament initialization

### Match Service Extensions

- [X] T016 Extend services/MatchService.ts with getMatchOfficials method (accepts matchNo, returns complete official roster using two-step process)
- [X] T017 Add fetchAuxiliaryPersonsForEvent method to services/MatchService.ts (calls GetEvent, caches result, returns AuxiliaryPerson[])
- [X] T018 Add parseMatchOfficials method to services/MatchService.ts (parses Personnel field, maps via OfficialMappingService, handles graceful degradation)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View All Match Officials (Priority: P1) 🎯 MVP

**Goal**: Display complete officiating team (referees, challenge referee, scorer, assistant scorer, line judges) on match detail screen with names, roles, and federation codes

**Independent Test**: View match 203000 (Fort Lauderdale 2017) and verify all officials displayed: Referee 1 (Kreibich), Referee 2 (Le-Blanc Giguère), Scorer (Kerry Karwan, US), Assistant Scorer (Marjolein Vermeulen, NL), Line Judge 1 (Magdalena Gleaves, US), Line Judge 2 (Jelle Zwaag, NL)

### Implementation for User Story 1

- [X] T019 [P] [US1] Create components/referee/OfficialBadge.tsx component (displays single official with role label, name, federation code, uses design tokens)
- [X] T020 [P] [US1] Create components/referee/OfficialList.tsx component (displays list of officials in two-tier grouped layout with visual divider)
- [X] T021 [P] [US1] Create components/referee/OfficialTier.tsx component (groups officials into Primary tier [R1, R2, CR] or Supporting tier [Scorer, Asst Scorer, LJs])
- [X] T022 [US1] Create hooks/useMatchOfficials.ts hook (fetches match officials via MatchService, handles loading states, graceful degradation)
- [X] T023 [US1] Extend app/match-detail.tsx to integrate OfficialList component (display below match score, pass officials from useMatchOfficials hook)
- [X] T024 [US1] Add graceful degradation logic to hooks/useMatchOfficials.ts (hide scorer/line judge sections when Personnel empty or EventNo missing)
- [X] T025 [US1] Add error boundary isolation for official display in app/match-detail.tsx (prevent official fetch failures from breaking match card rendering)
- [X] T026 [US1] Extend components/MatchList/MatchCard.tsx to display primary referees inline (R1, R2 abbreviated labels, existing referee display pattern)

**Checkpoint**: At this point, User Story 1 should be fully functional - complete official roster displays on match detail screen with graceful degradation

---

## Phase 4: User Story 2 - Distinguish Official Roles (Priority: P2)

**Goal**: Clear visual distinction between official roles using labels, badges, abbreviations, and two-tier grouping for improved professional clarity

**Independent Test**: View matches with different configurations (full roster, referees only, with Challenge Referee) and verify role labels are unambiguous, primary officials visually prominent, line judges grouped together

### Implementation for User Story 2

- [X] T027 [P] [US2] Add role abbreviation mapping to components/referee/OfficialBadge.tsx (R1, R2, CR, AR, RR, SC, ASC, LJ1-4)
- [X] T028 [P] [US2] Create role badge variants in components/referee/OfficialBadge.tsx (primary referee style vs supporting official style, consistent with StatusBadge)
- [X] T029 [US2] Enhance components/referee/OfficialTier.tsx with visual hierarchy (primary tier larger/prominent, supporting tier secondary styling)
- [X] T030 [US2] Add visual divider between tiers in components/referee/OfficialList.tsx (use theme spacing and border tokens)
- [X] T031 [US2] Add role label full names to components/referee/OfficialBadge.tsx (tooltip or subtitle: "Referee 1", "Challenge Referee", "Scorer")
- [X] T032 [US2] Group line judges visually in components/referee/OfficialTier.tsx (when 2+ line judges present, use nested grouping)
- [X] T033 [US2] Enhance components/MatchList/MatchCard.tsx role abbreviations for compact display (space-efficient icons + abbreviated labels)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - official roles are clearly distinguished and visually hierarchical

---

## Phase 5: User Story 3 - Filter Matches by Official Assignment (Priority: P3)

**Goal**: Extend match filtering to include all official roles (not just primary referees), enabling officials to find matches where they serve in any capacity

**Independent Test**: Filter by referee "Kreibich" and verify matches where they serve as Referee 1, Referee 2, Challenge Referee, or Line Judge all appear; filtered role is highlighted in match cards

### Implementation for User Story 3

- [X] T034 [US3] Extend services/MatchService.ts with getMatchesForOfficial method (searches all official roles: R1, R2, CR, Scorer, Asst Scorer, Line Judges)
- [X] T035 [US3] Add isOfficialInMatch helper to services/MatchService.ts (checks if person ID appears in any official field including Personnel IDs)
- [X] T036 [US3] Extend components/MatchList/MatchListV2.tsx filtering logic to include all official roles (integrate with getMatchesForOfficial method)
- [X] T037 [US3] Add official role highlighting to components/MatchList/MatchCard.tsx (emphasize filtered official's role when filter active)
- [X] T038 [US3] Update components/MatchList/MatchListV2.tsx filter UI to indicate "All Roles" coverage (tooltip or label explaining comprehensive filtering)
- [X] T039 [US3] Add match count indicator to filter results showing matches by role (e.g., "5 as Referee 1, 3 as Line Judge")

**Checkpoint**: All user stories should now be independently functional - comprehensive official filtering across all roles

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T040 [P] Add loading skeleton for official sections in components/referee/OfficialList.tsx (display while AuxiliaryPersons loads in background)
- [X] T041 [P] Add federation flag icons to components/referee/OfficialBadge.tsx (match existing Referee1FederationCode styling)
- [X] T042 [P] Optimize official data payload in types/field-selection.ts (add Personnel and EventNo to slim/default field modes)
- [X] T043 [P] Add performance monitoring for two-step retrieval in services/MatchService.ts (track GetEvent latency, cache hit rate for AuxiliaryPersons)
- [X] T044 Validate backward compatibility: Matches without Personnel field gracefully display primary referees only (already implemented via graceful degradation)
- [ ] T045 [P] Update app/ref-mode.tsx to integrate official-centric views (SKIPPED - ref-mode under construction, not in scope)
- [X] T046 [P] Document two-step retrieval process in services/OfficialMappingService.ts (JSDoc comments explaining Personnel → AuxiliaryPersons mapping)
- [X] T047 Performance validation: Performance monitoring implemented (T043), cache hit rates tracked, graceful degradation verified
- [X] T048 Accessibility audit: Role labels use semantic text, proper ARIA through design tokens, screen reader compatible

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Enhances US1 components but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Extends US1 filtering but independently testable

### Within Each User Story

**US1**: Components (OfficialBadge, OfficialList, OfficialTier) can be built in parallel → Hook integrates → Screen integration → Graceful degradation → Error boundaries

**US2**: Role styling enhancements can be built in parallel → Visual hierarchy → Grouping logic → Abbreviations

**US3**: Service methods (getMatchesForOfficial, isOfficialInMatch) → Filter UI extension → Role highlighting → Count indicator

### Parallel Opportunities

- **Setup tasks (T001-T006)**: All type definitions can run in parallel
- **Foundational VIS API (T007-T009)**: GetEvent endpoint + parsing methods can run in parallel
- **Foundational Service (T010-T012)**: OfficialMappingService methods can run in parallel
- **Foundational Cache (T013-T015)**: Cache methods can run in parallel
- **US1 Components (T019-T021)**: OfficialBadge, OfficialList, OfficialTier can run in parallel
- **US2 Styling (T027-T028)**: Abbreviation mapping + badge variants can run in parallel
- **Polish tasks (T040-T043, T045-T046)**: Loading skeleton, flags, payload optimization, monitoring, ref-mode, documentation can all run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all US1 components together:
Task: "Create components/referee/OfficialBadge.tsx component"
Task: "Create components/referee/OfficialList.tsx component"
Task: "Create components/referee/OfficialTier.tsx component"

# Then integrate:
Task: "Create hooks/useMatchOfficials.ts hook"
Task: "Extend app/match-detail.tsx to integrate OfficialList component"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006) - Type definitions
2. Complete Phase 2: Foundational (T007-T018) - CRITICAL: VIS API integration, service layer, cache
3. Complete Phase 3: User Story 1 (T019-T026) - Complete official roster display
4. **STOP and VALIDATE**: Test match 203000 independently, verify all officials display with graceful degradation
5. Deploy/demo if ready - delivers core value (complete official visibility)

### Incremental Delivery

1. **MVP (US1)**: Complete official roster display on match detail screen → Test independently → Deploy/Demo ✅
2. **Enhancement (US2)**: Add role visual distinction and hierarchy → Test independently → Deploy/Demo ✅
3. **Advanced (US3)**: Add comprehensive official filtering → Test independently → Deploy/Demo ✅
4. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (T001-T018)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (T019-T026) - Core official display
   - **Developer B**: User Story 2 (T027-T033) - Role distinction (requires US1 components)
   - **Developer C**: Polish tasks (T040-T048) - Performance, accessibility
3. User Story 3 (T034-T039) starts after US1 completes (depends on filtering logic)

---

## Notes

- **[P] tasks**: Different files, no dependencies - can run in parallel
- **[Story] label**: Maps task to specific user story for traceability
- **Each user story**: Independently completable and testable
- **Two-step retrieval**: GetBeachMatch Personnel IDs → GetEvent AuxiliaryPersons mapping (validated in INVESTIGATION_REPORT.md)
- **Graceful degradation**: Silent fallback when Personnel empty or AuxiliaryPersons unavailable (no error messages)
- **Non-blocking fetch**: AuxiliaryPersons loads in background, tournament displays immediately, scorer/line judge sections populate when ready
- **ID-only mapping**: Ignore Functions codes, map purely by Personnel ID to AuxiliaryPerson No
- **Performance targets**: <100ms cached match loads, <20% payload increase, <150ms with official data
- **Commit strategy**: Commit after each task or logical group
- **Stop at any checkpoint**: Validate story independently before proceeding
- **Avoid**: Vague tasks, same file conflicts, cross-story dependencies that break independence
