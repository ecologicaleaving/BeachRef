# Implementation Plan: Match Officials Display

**Branch**: `006-match-officials-display` | **Date**: 2025-01-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-match-officials-display/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Extend match detail displays to show complete officiating teams including Challenge Referee, Scorer, Assistant Scorer, and Line Judges (1-4). Integrate with VIS API using a two-step data retrieval process: (1) GetBeachMatch for Personnel IDs and Challenge Referee fields, (2) GetEvent for AuxiliaryPersons name resolution. Maintain existing performance standards (85% cache hit rate, <100ms cached loads) while displaying 4-8 officials per match with clear role distinctions and federation codes.

## Technical Context

**Language/Version**: TypeScript 5.x with Expo SDK ~53.0.20, React 19, React Native 0.79.5
**Primary Dependencies**: Expo Router, MMKV (storage), fast-xml-parser (VIS API XML parsing), React Navigation
**Storage**: Multi-level cache (Memory → MMKV → VIS API) with adaptive TTL (5s-24h based on data volatility)
**Testing**: Manual testing with VIS API integration (automated testing framework not yet implemented)
**Target Platform**: Mobile-first (iOS/Android) via Expo, web platform support via conditional imports
**Project Type**: Mobile application with cross-platform support (native + web)
**Performance Goals**: <100ms cached match loads, 85% cache hit rate, <20% payload increase, <150ms with additional official data
**Constraints**: Must maintain offline-first architecture, backward compatibility with existing match data structures, no performance degradation in match list views
**Scale/Scope**: ~50 screens, tournament data for international beach volleyball (FIVB), supports 1000s of matches per tournament

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Mobile-First Architecture ✅ PASS
- Feature designed for on-court referee use with touch-optimized official display
- Role labels abbreviated for compact match cards (R1, R2, CR, LJ)
- Single-handed operation maintained (view officials without complex gestures)

### Principle II: Offline-First Data Architecture ✅ PASS
- Official data integrated into existing multi-level cache (Memory → MMKV → API)
- Personnel field and AuxiliaryPersons cached alongside match data
- Cache warming includes AuxiliaryPersons for tournament officials
- Graceful degradation when EventNo unavailable (show IDs only as fallback)

### Principle III: Service Layer Abstraction ✅ PASS
- No direct API calls from UI components
- Official data retrieval handled by MatchService and VisApiClient
- New OfficialMappingService for Personnel → AuxiliaryPersons resolution
- Existing service patterns followed (dependency injection, single responsibility)

### Principle IV: Resilience & Error Boundaries ✅ PASS
- Two-step retrieval process with fallback strategies:
  - Step 1 fails → Show primary referees only (existing behavior)
  - Step 2 fails → Show Personnel IDs without names
- Circuit breaker pattern applies to GetEvent calls
- Error boundaries isolate official display failures from match card rendering

### Principle V: Design System Consistency ✅ PASS
- Official display follows existing referee display patterns
- Uses design tokens for colors, spacing, typography
- Role badges consistent with existing StatusBadge components
- Federation codes display matches current Referee1FederationCode styling

### Principle VI: Type Safety & API Contracts ✅ PASS
- TypeScript interfaces for Personnel XML structure (validated via test scripts)
- AuxiliaryPerson interface defined (No, FirstName, LastName, NationalityCode, Functions, Gender)
- BeachMatch extended with Challenge Referee fields (NoRefereeChallenge, RefereeChallengeName, etc.)
- DTOs validated at API boundary with typed parsers

### Principle VII: Real-time State Synchronization ✅ PASS
- Official assignments propagate via existing subscription services
- Personnel field changes trigger cache invalidation
- Observer pattern maintained for match updates
- Online/offline status handled by existing state providers

**Overall Assessment**: ✅ **ALL PRINCIPLES PASS** - No constitution violations

## Project Structure

### Documentation (this feature)

```
specs/006-match-officials-display/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (complete)
├── INVESTIGATION_REPORT.md  # VIS API investigation findings (complete)
├── TEST_RESULTS.md      # Field validation test results (complete)
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── quickstart.md        # Phase 1 output (to be generated)
├── contracts/           # Phase 1 output (partially complete - test scripts exist)
│   ├── vis-api-fields.ts         # VIS API field contracts (validated)
│   ├── match-officials.ts        # TypeScript interfaces for officials
│   ├── test-*.js                 # VIS API test scripts (10+ validation scripts)
│   ├── verify-personnel-mapping.js  # Complete solution verification
│   └── [additional API contracts to be added]
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
# Mobile application structure (Expo Router file-based routing)
app/
├── _layout.tsx                   # Root layout (will integrate official cache warming)
├── tournament-detail.tsx         # Tournament detail screen (displays match officials)
├── match-detail.tsx              # Match detail screen (full official team display)
├── ref-mode.tsx                  # Referee mode (official-centric views)
└── [other screens unchanged]

components/
├── MatchList/                    # Match card components (inline referee display)
│   ├── MatchCard.tsx            # Extend with official display
│   ├── MatchListV2.tsx          # Extend filtering to include all official roles
│   └── [existing components]
├── referee/                      # Referee-specific components
│   └── [add OfficialBadge, OfficialList components]
├── StatusBadge.tsx              # Reuse for role badges
└── [design system components unchanged]

services/
├── api/
│   ├── VisApiClient.ts          # Extend with GetEvent + AuxiliaryPersons parsing
│   └── OptimizedApiClient.ts   # Add official field selection logic
├── cache/
│   └── MmkvStorage.ts           # Cache AuxiliaryPersons with adaptive TTL
├── OfficialMappingService.ts    # NEW: Personnel → AuxiliaryPersons mapping
├── MatchService.ts              # Extend with official data retrieval
├── BeachMatchService.ts         # Extend with Personnel parsing
└── [existing services unchanged]

types/
├── match.ts                      # Extend BeachMatch with Challenge Referee + Personnel
├── official.ts                   # NEW: AuxiliaryPerson, PersonnelData, OfficialRole enums
└── referee-v2.ts                 # Extend OfficialRole enum with new roles

hooks/
├── useMatchOfficials.ts          # NEW: Hook for official data + mapping
└── [existing hooks unchanged]

tests/
└── [to be added when testing framework implemented]
```

**Structure Decision**: Mobile application with Expo Router file-based routing. Official display integrated into existing match detail and card components. New OfficialMappingService handles two-step VIS API retrieval (GetBeachMatch → GetEvent). All official data flows through service layer with no direct component-to-API coupling.

## Complexity Tracking

*No constitution violations - this section intentionally left empty*

All seven constitution principles pass without exceptions. The feature integrates seamlessly into existing architecture patterns.
