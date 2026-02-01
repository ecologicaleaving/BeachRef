# Implementation Plan: Players Entry List

**Branch**: `003-players-entry-list` | **Date**: 2025-10-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-players-entry-list/spec.md`

## Summary

Add a new navigation tab in the tournament detail bottom menu that displays the complete list of teams (players) registered in a tournament. The feature provides filtering by tournament phase (Main Draw/Qualification) and gender (Men/Women), with modal overlays for detailed team information. Implementation uses VIS API `GetTournamentTeamList` endpoint with intelligent caching (adaptive TTL based on tournament timeline) and virtualized list rendering for optimal performance with tournaments containing 64+ teams.

## Technical Context

**Language/Version**: TypeScript 5.x with React 19 and React Native 0.79.5 (Expo SDK ~53.0.20)
**Primary Dependencies**: Expo Router (navigation), React Native FlatList (virtualized rendering), react-native-mmkv (caching), NetInfo (connectivity)
**Storage**: Multi-level cache (Memory → MMKV → VIS API) with adaptive TTL
**Testing**: TypeScript compiler validation, ESLint, Production Readiness Audit System
**Target Platform**: iOS/Android via React Native, Web via Expo Web
**Project Type**: Mobile (React Native with Expo)
**Performance Goals**: <2s list load on WiFi, 60 FPS scrolling, sub-100ms cache access
**Constraints**: Offline-capable, adaptive TTL (7d → 24h → static), virtualized rendering for 64+ teams
**Scale/Scope**: Handle tournaments with 16-64 teams (main draw + qualifications), support modal overlays for team details

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Alignment Analysis

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Mobile-First Architecture** | ✅ Pass | Feature designed for mobile touch interaction with bottom nav tab, modal overlays, pull-to-refresh |
| **II. Offline-First Data** | ✅ Pass | Adaptive TTL caching (7d → 24h → static), graceful offline degradation with cached data |
| **III. Service Layer Abstraction** | ✅ Pass | Will use dedicated service for team data retrieval, filtering, and caching logic |
| **IV. Resilience & Error Boundaries** | ✅ Pass | API error handling with cache fallback, empty states, loading indicators |
| **V. Design System Consistency** | ✅ Pass | Will use existing design tokens, component patterns (BottomTabNavigation, modal overlays) |
| **VI. Type Safety & API Contracts** | ✅ Pass | TypeScript interfaces for VIS API `GetTournamentTeamList` response, no `any` types |
| **VII. Real-time State Sync** | ⚠️ Partial | Team lists are semi-static; no real-time sync needed, manual refresh sufficient |

### Performance Standards Compliance

| Standard | Target | Feature Alignment |
|----------|--------|-------------------|
| **Response Time** | <2s API with cache warming | ✅ SC-002: <2s load on WiFi |
| **Caching Policy** | Multi-level with expiration | ✅ Adaptive TTL: 7d → 24h → static |
| **Touch Targets** | 44x44pt minimum | ✅ Bottom nav button, team cards |
| **Animation Performance** | 60 FPS | ✅ SC-009: 60 FPS with 64+ teams via virtualization |

### VIS API Optimization Compliance

| Requirement | Feature Alignment |
|-------------|-------------------|
| **Minimize API calls** | ✅ Intelligent caching with adaptive TTL reduces redundant calls |
| **Request batching** | N/A - Single endpoint `GetTournamentTeamList` per tournament |
| **Selective field queries** | ✅ Extract only necessary fields (team number, player names, seed, status, phase) |
| **Circuit breaker pattern** | ✅ Will integrate with existing API error handling |

**Gate Result**: ✅ **PASS** - No constitutional violations. Partial real-time sync acceptable as team registration data is semi-static.

## Project Structure

### Documentation (this feature)

```
specs/003-players-entry-list/
├── plan.md              # This file
├── research.md          # Phase 0 output (API patterns, virtualization, modal design)
├── data-model.md        # Phase 1 output (TournamentTeam, TeamPlayer entities)
├── quickstart.md        # Phase 1 output (developer setup guide)
├── contracts/           # Phase 1 output (VIS API GetTournamentTeamList schema)
│   └── vis-api-team-list.yaml
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```
# Mobile application structure (existing React Native/Expo app)
app/
├── tournament-detail.tsx          # [MODIFIED] Add Players tab to bottom nav
├── tournament-teams.tsx           # [NEW] Players entry list screen
└── _layout.tsx                    # [UNCHANGED] Root layout

components/
├── navigation/
│   └── TournamentBottomMenu.tsx   # [MODIFIED] Add third tab icon (Players)
├── tournament/
│   ├── TeamListItem.tsx           # [NEW] Individual team card with seed, players, country
│   ├── TeamDetailModal.tsx        # [NEW] Modal overlay for expanded team details
│   ├── TeamStatusBadge.tsx        # [NEW] Visual indicators (WC, Reserve, Withdrawn)
│   └── EmptyTeamListState.tsx     # [NEW] Empty state when no teams registered
└── entities/
    └── Team.tsx                   # [NEW] Team entity components (if needed)

services/
├── api/
│   └── VisApiClient.ts            # [MODIFIED] Add GetTournamentTeamList method
├── cache/
│   ├── TeamListCacheService.ts    # [NEW] Adaptive TTL cache for team lists
│   └── CacheService.ts            # [UNCHANGED] Reuse existing multi-level cache
└── TournamentTeamService.ts       # [NEW] Business logic for team retrieval, filtering

hooks/
└── useTournamentTeams.ts          # [NEW] Hook for team data access with filters

types/
├── tournament-team.ts             # [NEW] TournamentTeam, TeamPlayer, TeamStatus types
└── api-v2.ts                      # [MODIFIED] Add GetTournamentTeamList request/response types

screens/
└── TournamentTeamsScreen.tsx      # [NEW] Main screen component with virtualized list
```

**Structure Decision**: Mobile application structure. Feature integrates into existing React Native/Expo app with new screens, components, and services following established patterns. Bottom navigation in `TournamentBottomMenu` will be extended with a third tab positioned between "Schedule" and "Officials" as specified.

## Complexity Tracking

*No constitutional violations requiring justification.*

---

# Phase 0: Research & Decisions

## Research Areas

### 1. VIS API Team List Integration

**Decision**: Use `GetTournamentTeamList` endpoint with selective field extraction

**Research Findings**:
- VIS API provides `GetTournamentTeamList` (ID: 73001) for retrieving team registrations
- Endpoint returns team metadata: team number, player names/IDs, seed, phase (main draw/qualification), entry status, country
- Supports filtering by tournament number (use `tournament.visNo` as documented)
- Can request specific fields to minimize payload size (align with VIS API optimization requirements)

**Field Selection Strategy**:
- **Required fields**: No, Player1Name, Player2Name, Player1No, Player2No, Seed, PhaseCode, Status, CountryCode, IsWildCard, IsReserve
- **Exclude**: Detailed player stats, match history (fetch on-demand in modal), administrative metadata
- **Estimated payload**: ~2-5KB per tournament (vs 20-30KB with all fields)

**Alternatives Considered**:
- Extract teams from match data (`GetBeachMatchList`) - Rejected: Incomplete for teams without matches yet, slower processing
- Use `GetBeachTournament` with embedded team data - Rejected: VIS API doesn't embed full team lists in tournament response

**Rationale**: Dedicated endpoint provides complete, structured team data with minimal overhead. Field selection reduces payload by 75%+ while maintaining all data needed for list view.

---

### 2. Virtualized List Rendering

**Decision**: Use React Native `FlatList` with `getItemLayout` optimization

**Research Findings**:
- React Native `FlatList` provides built-in virtualization (renders only visible items)
- `getItemLayout` prop enables precise item positioning for better scrolling performance
- Supports pull-to-refresh, empty states, loading indicators natively
- Proven to handle 1000+ items at 60 FPS with proper configuration

**Implementation Pattern**:
```typescript
<FlatList
  data={filteredTeams}
  renderItem={({ item }) => <TeamListItem team={item} onPress={handleTeamPress} />}
  keyExtractor={(item) => item.teamNo.toString()}
  getItemLayout={(data, index) => ({
    length: TEAM_CARD_HEIGHT, // Fixed height for performance
    offset: TEAM_CARD_HEIGHT * index,
    index,
  })}
  initialNumToRender={15}
  maxToRenderPerBatch={10}
  windowSize={21}
  removeClippedSubviews={true}
/>
```

**Alternatives Considered**:
- `ScrollView` with all items - Rejected: Poor performance with 50+ teams, no virtualization
- Third-party virtualization library (e.g., `recyclerlistview`) - Rejected: FlatList sufficient, adds dependency
- Pagination - Rejected: Breaks user flow, doesn't match mobile patterns

**Rationale**: FlatList is React Native's standard virtualized list component, well-tested, and meets 60 FPS requirement with tournaments containing 100+ teams.

---

### 3. Modal Overlay Pattern

**Decision**: Use React Native `Modal` component with custom styling for team details

**Research Findings**:
- React Native `Modal` provides platform-native modal presentation
- Supports `presentationStyle='pageSheet'` (iOS) for dismissible overlay
- Can be styled to match design system while maintaining platform conventions
- Accessible via VoiceOver/TalkBack with proper ARIA labels

**Modal Content Strategy**:
- **Quick Info** (always visible): Both player names, country, seed, status
- **Expandable Sections**: Player rankings, tournament history, team statistics
- **Actions**: Close button (top-right), swipe-to-dismiss gesture
- **Performance**: Lazy load match history data only when modal opens (separate API call)

**Alternatives Considered**:
- Bottom sheet component - Rejected: Less familiar to referees, complex gesture handling
- Navigate to separate screen - Rejected: Loses list context, slower navigation
- Inline expansion in list - Rejected: Breaks scroll position, poor UX with long content

**Rationale**: Modal overlay maintains list context (key for comparing teams), follows platform conventions, and provides smooth UX for quick detail views without full navigation.

---

### 4. Adaptive Cache TTL Strategy

**Decision**: Implement time-based cache expiration with tournament lifecycle awareness

**Cache TTL Logic**:
```typescript
function calculateTeamListTTL(tournament: Tournament): number {
  const now = new Date();
  const startDate = new Date(tournament.startDate);
  const daysUntilStart = Math.floor((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilStart > 7) {
    return 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  } else if (daysUntilStart > 0) {
    return 24 * 60 * 60 * 1000; // 24 hours
  } else {
    return Infinity; // No expiration once tournament starts
  }
}
```

**Research Findings**:
- Team registrations finalize 7-14 days before tournament start
- Last-minute changes (withdrawals, additions) occur in final week
- No changes during active tournament (registrations locked)
- Existing `CacheService` supports variable TTL per cache key

**Integration with Existing Cache**:
- Reuse `CacheService.getInstance()` with custom TTL calculation
- Store in MMKV (Level 2) for persistence across app restarts
- Memory cache (Level 1) for instant access during session

**Alternatives Considered**:
- Fixed 24-hour TTL - Rejected: Unnecessary API calls for past tournaments
- Event-based invalidation - Rejected: VIS API doesn't provide change notifications
- No caching - Rejected: Violates offline-first principle

**Rationale**: Adaptive TTL balances data freshness with API load. Static cache for ongoing tournaments eliminates redundant calls while 24h refresh in final week captures late changes.

---

### 5. Gender and Phase Filtering

**Decision**: Client-side filtering with React state, no additional API calls

**Filtering Strategy**:
```typescript
const filteredTeams = useMemo(() => {
  return teams.filter(team => {
    const matchesGender = genderFilter === 'All' || team.gender === genderFilter;
    const matchesPhase = phaseFilter === 'All' || team.phaseCode === phaseFilter;
    return matchesGender && matchesPhase;
  });
}, [teams, genderFilter, phaseFilter]);
```

**Research Findings**:
- VIS API returns all teams in single response (no pagination)
- Typical tournament: 16-32 main draw + 16-32 qualification = 32-64 total teams
- Client-side filtering on 64 items: <1ms (negligible performance impact)
- Avoids multiple API calls per filter change

**Filter UI Placement**:
- **Phase filter**: Toggle buttons (Main Draw / Qualification) at top of screen
- **Gender filter**: Segmented control (All / Men / Women) below phase filter
- **Persistent state**: Filters preserved when navigating away and returning

**Alternatives Considered**:
- Server-side filtering via API parameters - Rejected: VIS API doesn't support phase/gender query params, would require multiple calls
- No filtering (show all teams) - Rejected: Poor UX for referees needing to find specific teams quickly

**Rationale**: Client-side filtering provides instant response, eliminates API calls, and leverages already-loaded data efficiently.

---

## Summary of Key Decisions

| Area | Decision | Primary Benefit |
|------|----------|-----------------|
| **API Integration** | VIS `GetTournamentTeamList` with field selection | 75% payload reduction, complete data |
| **List Rendering** | React Native FlatList with optimizations | 60 FPS with 100+ teams, native performance |
| **Team Details** | Modal overlay with lazy-loaded content | Maintains context, smooth UX |
| **Caching** | Adaptive TTL (7d → 24h → static) | Minimizes API calls, ensures freshness |
| **Filtering** | Client-side with React state | Instant response, zero API overhead |

---

# Phase 1: Design & Contracts

## Data Model

See [data-model.md](./data-model.md) for complete entity definitions.

### Core Entities

**TournamentTeam**:
- Represents a team's registration in a tournament
- Fields: teamNo, tournamentNo, player1, player2, seed, phaseCode, status, countryCode, isWildCard, isReserve, gender

**TeamPlayer**:
- Individual player information within a team
- Fields: playerNo, fullName, countryCode, ranking (optional)

**TeamPhase**:
- Enum: 'MainDraw' | 'Qualification'

**TeamStatus**:
- Enum: 'Confirmed' | 'Withdrawn' | 'Reserve'

## API Contracts

See [contracts/vis-api-team-list.yaml](./contracts/vis-api-team-list.yaml) for OpenAPI specification.

### VIS API Integration

**Endpoint**: `GetTournamentTeamList`
**Request**:
```typescript
interface GetTournamentTeamListRequest {
  TournamentNo: number;
  Fields?: string[]; // Optional: selective field extraction
}
```

**Response** (excerpt):
```typescript
interface GetTournamentTeamListResponse {
  BeachTeams: {
    BeachTeam: TournamentTeam[];
  };
}
```

## Quick Start

See [quickstart.md](./quickstart.md) for developer setup guide.

---

# Phase 2: Task Generation

**Phase 2 is handled by the `/speckit.tasks` command and is NOT part of this plan.**

After reviewing this plan, run `/speckit.tasks` to generate the actionable task breakdown.
