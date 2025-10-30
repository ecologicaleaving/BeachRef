# Implementation Plan: UI Polish & User Experience Improvements

**Branch**: `004-ui-polish-improvements` | **Date**: 2025-10-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-ui-polish-improvements/spec.md`

## Summary

This feature implements 5 critical UX improvements for the BeachRef mobile app: proper loading states for tournament lists, real-time match duration updates synced with live score polling, user-friendly API error messages, removal of mock tournament data from production, and reorganized filter panel actions with a new refresh button. These changes enhance referee confidence, data accuracy, and workflow efficiency through refined state management and visual feedback patterns.

## Technical Context

**Language/Version**: TypeScript 5.x with React 19 and React Native 0.79.5
**Primary Dependencies**: Expo SDK ~53.0.20, Expo Router, React Native Reanimated, react-native-mmkv
**Storage**: MMKV (multi-level caching), AsyncStorage (sensitive data)
**Testing**: Jest with React Native Testing Library (when tests are added)
**Target Platform**: iOS 15+, Android 10+, Web (React Native Web)
**Project Type**: Mobile-first cross-platform application
**Performance Goals**: Loading indicator <100ms, duration updates <6s, cached loads <200ms, 60fps animations
**Constraints**: Offline-capable, <500ms UI operations, match duration accuracy ±1min, 0% error message leakage
**Scale/Scope**: 5 user stories, 15 functional requirements, affects 8-10 screens/components, ~30 modified files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Evaluation

✅ **Mobile-First Architecture** (Principle I)
- Loading states and duration updates prioritize mobile UX patterns
- Filter panel reorganization optimizes for single-handed operation
- Touch targets maintained per 44x44pt / 48x48dp standards
- **Status**: COMPLIANT

✅ **Offline-First Data Architecture** (Principle II)
- Leverages existing multi-level cache (Memory → MMKV → API)
- Error messages handle offline scenarios gracefully
- Mock data removal enforces cache-first production behavior
- **Status**: COMPLIANT

✅ **Service Layer Abstraction** (Principle III)
- State management (loading, error) will be handled through services
- No business logic in UI components
- Duration calculation logic will be service-based
- **Status**: COMPLIANT (design pending Phase 1)

✅ **Resilience & Error Boundaries** (Principle IV)
- User-friendly error messages replace technical errors
- Refresh button provides explicit retry mechanism
- API timeout handling specified in requirements
- **Status**: COMPLIANT

✅ **Design System Consistency** (Principle V)
- Loading indicators use existing design system components
- Error messages follow established patterns
- Filter panel maintains consistent spacing/typography
- **Status**: COMPLIANT

✅ **Type Safety & API Contracts** (Principle VI)
- New state types: `TournamentLoadingState`, `MatchDuration`, `APIErrorState`
- Strict TypeScript enforcement continues
- **Status**: COMPLIANT (types defined in Phase 1)

✅ **Real-time State Synchronization** (Principle VII)
- Match duration updates integrate with existing 5s live score polling
- State changes propagate via existing subscription patterns
- **Status**: COMPLIANT

### Performance Standards Validation

✅ **Response Time Requirements**
- Loading indicator: <100ms (spec: SC-001)
- Duration updates: <6s per cycle (spec: SC-003) ✓ within 200ms cached render target
- Filter reset: <500ms (spec: SC-007)
- Refresh: <3s (spec: SC-008) ✓ within 2s API with cache warming target
- **Status**: COMPLIANT

✅ **Caching Policy**
- Reuses existing MMKV Level 2 cache from specs/001-vis-api-optimization
- No new cache layers required
- **Status**: COMPLIANT

✅ **Mobile Constraints**
- Touch targets preserved (filter buttons, refresh icon)
- Animation performance: Loading spinner uses React Native Reanimated
- No bundle size impact (UI-only changes)
- **Status**: COMPLIANT

### Development Workflow Compliance

✅ **Code Organization**
- Screens (`/app`): tournament-selection.tsx, match screens (minimal logic)
- Components (`/components`): Loading indicators, error states, filter panel
- Services (`/services`): Duration calculation, error transformation
- Hooks (`/hooks`): State management for loading/error states
- Types (`/types`): New state entity interfaces
- **Status**: COMPLIANT

✅ **Technology Constraints**
- No forbidden patterns detected in design
- Service layer enforced for API error interception
- Design tokens used for loading/error UI
- **Status**: COMPLIANT

✅ **VIS API Integration**
- Minimizes API calls (refresh button with deduplication FR-013)
- Error handling improves user experience during API failures
- No changes to existing optimization patterns (specs/001)
- **Status**: COMPLIANT

**GATE RESULT**: ✅ **PASS** - All constitution principles satisfied. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```
specs/004-ui-polish-improvements/
├── plan.md              # This file
├── research.md          # Phase 0: Architectural decisions
├── data-model.md        # Phase 1: State entity definitions
├── quickstart.md        # Phase 1: Implementation guide
├── checklists/
│   └── requirements.md  # Spec validation results
└── tasks.md             # Phase 2: Generated by /speckit.tasks
```

### Source Code (repository root)

```
app/
├── tournament-selection.tsx        # Loading state integration
├── tournament-detail.tsx          # Match duration displays
├── match-detail.tsx              # Duration + error states
└── [other match screens]         # Duration propagation

components/
├── LoadingIndicator.tsx          # NEW: Loading spinner component
├── ErrorMessage.tsx              # NEW: User-friendly error display
├── MatchList/
│   ├── MatchListItem.tsx        # Duration display updates
│   └── MatchCard.tsx            # Duration + live status
└── tournament/
    └── FilterPanel.tsx          # Reset button relocation

services/
├── MatchDurationService.ts       # NEW: Duration calculation logic
├── ErrorTransformService.ts      # NEW: API error → user message
├── TournamentService.ts         # Loading state management
└── VisApiClient.ts              # Error interception point

hooks/
├── useTournamentLoading.ts       # NEW: Loading state hook
├── useMatchDuration.ts          # NEW: Real-time duration hook
└── useApiError.ts               # NEW: Error state hook

types/
├── tournament.ts                # TournamentLoadingState
├── match.ts                     # MatchDuration type
└── api-error.ts                 # NEW: APIErrorState

constants/
└── mockData.ts                  # REMOVE or guard with __DEV__
```

**Structure Decision**: Mobile cross-platform architecture using Expo Router file-based routing. This feature modifies existing screens/components and adds 3 new service modules + 3 hooks. No new screens required. Mock data will be conditionally excluded via environment checks or removed entirely based on Phase 0 research decision.

## Complexity Tracking

*No violations detected. This feature aligns with all constitution principles and does not require complexity justification.*

