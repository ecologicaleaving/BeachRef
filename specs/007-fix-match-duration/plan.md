# Implementation Plan: Fix Match Duration Display

**Branch**: `007-fix-match-duration` | **Date**: 2025-01-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-fix-match-duration/spec.md`

## Summary

Fix incorrect match duration display by correcting the parsing logic to interpret VIS API `DurationSet1/2/3` fields as **seconds (positive 32-bit integers)** rather than "mm:ss" format strings. The current implementation incorrectly assumes string format, leading to wrong duration calculations.

**Root Cause**: VIS API returns Duration as seconds (e.g., `1530` for 25 minutes 30 seconds), but `parseTimeString()` expects "mm:ss" format strings.

**Technical Approach**: Update `MatchDurationFormatter.ts` and `MatchDurationService.ts` to correctly parse integer seconds while maintaining backward compatibility for any cached "mm:ss" format data.

## Technical Context

**Language/Version**: TypeScript 5.x with React Native 0.79.5, Expo SDK ~53.0.20
**Primary Dependencies**: React Native, Expo Router, react-native-mmkv (caching)
**Storage**: MMKV (multi-level cache), Memory cache
**Testing**: Jest (existing test suite in `utils/__tests__/MatchDurationFormatter.test.ts`)
**Target Platform**: iOS, Android, Web (Expo cross-platform)
**Project Type**: Mobile (React Native/Expo)
**Performance Goals**: Match detail rendering <200ms (cached data)
**Constraints**: Offline-capable, backward compatible with cached data
**Scale/Scope**: Affects all match displays across tournament detail screens

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Mobile-First Architecture | ✅ PASS | Changes are in utility/service layer, no UI modifications required |
| II. Offline-First Data | ✅ PASS | Backward compatibility with cached data explicitly required (FR-005) |
| III. Service Layer Abstraction | ✅ PASS | Changes isolated to `MatchDurationService` and `MatchDurationFormatter` |
| IV. Resilience & Error Boundaries | ✅ PASS | Graceful fallback for null/invalid data (FR-004, FR-008) |
| V. Design System Consistency | ✅ PASS | No UI component changes, only data formatting |
| VI. Type Safety & API Contracts | ✅ PASS | TypeScript types already defined for Duration fields |
| VII. Real-time State Sync | ✅ PASS | Live duration updates sync with 5-second polling (FR-006) |
| VIS API Optimization | ✅ PASS | No new API calls, fixing existing data interpretation |

**Gate Status**: ✅ PASSED - No constitution violations

## Project Structure

### Documentation (this feature)

```
specs/007-fix-match-duration/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no API changes)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (affected files)

```
utils/
├── MatchDurationFormatter.ts        # PRIMARY: Fix parseTimeString() and calculateTotalDuration()
└── __tests__/
    └── MatchDurationFormatter.test.ts  # Update tests for seconds-based input

services/
└── MatchDurationService.ts          # SECONDARY: Fix parseSetDuration() method

components/MatchList/
└── MatchListV2.tsx                  # VERIFY: getMatchDuration() fallback logic

hooks/
└── useMatchDuration.ts              # VERIFY: Ensure correct service usage
```

**Structure Decision**: Existing mobile project structure maintained. Changes isolated to utility and service layers per constitution Principle III.

## Complexity Tracking

*No constitution violations - section not applicable*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
