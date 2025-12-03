# Data Model & Type Definitions

**Feature**: UI Polish & User Experience Improvements
**Phase**: Phase 1 - Design
**Date**: 2025-10-27

## Overview

This document defines TypeScript interfaces for UI state entities introduced in this feature. All types are client-side only (no API contracts) and integrate with existing domain models (`Tournament`, `BeachMatch`, `FilterCriteria`).

---

## Core State Entities

### 1. Tournament Loading State

**Purpose**: Track the asynchronous loading status of tournament data with clear state transitions.

**File Location**: `types/loading-state.ts` (new file)

```typescript
/**
 * Represents the loading state of tournament data fetching.
 * Prevents ambiguous combinations like "loading" + "empty" simultaneously.
 */
export type TournamentLoadingState =
  | 'idle'      // Initial state, no fetch attempted
  | 'loading'   // Data fetch in progress
  | 'loaded'    // Data successfully fetched (>0 tournaments)
  | 'empty'     // Data fetch complete, no tournaments found
  | 'error';    // Data fetch failed (API error, timeout, network failure)

/**
 * Container for tournament loading state with error details.
 * Used by useTournamentLoading hook and TournamentService.
 */
export interface TournamentLoadingContext {
  state: TournamentLoadingState;
  error: APIErrorState | null;
  lastFetchTime: number | null;  // Timestamp of last successful fetch
  tournamentCount: number;        // Number of tournaments loaded
}

/**
 * Helper type guards for type-safe state checks.
 */
export const LoadingStateChecks = {
  isLoading: (state: TournamentLoadingState) => state === 'loading',
  isEmpty: (state: TournamentLoadingState) => state === 'empty',
  hasError: (state: TournamentLoadingState) => state === 'error',
  hasData: (state: TournamentLoadingState) => state === 'loaded'
} as const;
```

**State Transitions**:
```
idle → loading → loaded (when data.length > 0)
              ↘ empty  (when data.length === 0)
              ↘ error  (on API failure/timeout)

error → loading (on retry)
empty → loading (on refresh)
loaded → loading (on refresh)
```

**Validation Rules**:
- `state === 'error'` → `error` field MUST be non-null
- `state === 'loaded'` → `tournamentCount` MUST be > 0
- `state === 'empty'` → `tournamentCount` MUST be 0
- `state === 'loading'` → `error` field MUST be null

---

### 2. Match Duration

**Purpose**: Represent calculated match duration for real-time updates during live matches.

**File Location**: `types/match.ts` (extend existing file)

```typescript
/**
 * Calculated match duration in minutes.
 * Updated every 5 seconds during live score polling for running matches.
 */
export interface MatchDuration {
  readonly matchId: string;           // Unique match identifier
  readonly durationMinutes: number;   // Elapsed time in minutes (integer)
  readonly status: MatchStatus;       // Current match status (Running, Finished, etc.)
  readonly startTime: string | null;  // ISO 8601 start time from VIS API
  readonly isLive: boolean;           // True if status === 'Running'
  readonly lastUpdate: number;        // Timestamp of last calculation
}

/**
 * Helper to format duration for display.
 */
export const formatMatchDuration = (duration: MatchDuration): string => {
  if (duration.durationMinutes === 0) return '0 min';
  return `${duration.durationMinutes} min`;
};

/**
 * Check if duration should be actively updating.
 */
export const shouldUpdateDuration = (duration: MatchDuration): boolean => {
  return duration.isLive && duration.status === 'Running';
};
```

**Calculation Formula**:
```typescript
durationMinutes = Math.floor((now - startTime) / 60000);
// Where:
//   now = Date.now()
//   startTime = new Date(match.startTime).getTime()
```

**Business Rules**:
- `status === 'Running'` → duration recalculated every 5 seconds
- `status !== 'Running'` → duration frozen at final value
- `startTime === null` → duration = 0
- Duration displayed with 1-minute precision (no seconds shown)

---

### 3. API Error State

**Purpose**: User-facing error information when VIS API is unavailable or returns errors.

**File Location**: `types/api-error.ts` (new file)

```typescript
/**
 * User-friendly API error state.
 * All technical errors (HTTP codes, stack traces) transformed into this format.
 */
export interface APIErrorState {
  readonly message: string;           // User-facing error message (always user-friendly)
  readonly isApiError: boolean;       // True if error originated from VIS API
  readonly canRetry: boolean;         // True if retry might succeed
  readonly timestamp: number;         // When error occurred (milliseconds)
  readonly retryAfter?: number;       // Optional: Suggested retry delay (milliseconds)
}

/**
 * Predefined user-friendly error messages.
 */
export const API_ERROR_MESSAGES = {
  VIS_UNAVAILABLE: "The VIS API is currently not available, please retry in few minutes",
  NETWORK_OFFLINE: "You appear to be offline. Please check your connection and try again.",
  REQUEST_TIMEOUT: "The request took too long. Please try again.",
  UNKNOWN: "An error occurred. Please try again later."
} as const;

/**
 * Factory for creating API error states.
 */
export const createApiError = (
  message: string = API_ERROR_MESSAGES.VIS_UNAVAILABLE,
  retryAfter?: number
): APIErrorState => ({
  message,
  isApiError: true,
  canRetry: true,
  timestamp: Date.now(),
  retryAfter
});

/**
 * Check if error is recent (within last 30 seconds).
 */
export const isRecentError = (error: APIErrorState): boolean => {
  return (Date.now() - error.timestamp) < 30000;
};
```

**Transformation Rules**:
- **ALL** Axios errors → `VIS_UNAVAILABLE` message
- Network errors (`TypeError`) → `NETWORK_OFFLINE` message
- Timeout errors (`ECONNABORTED`) → `REQUEST_TIMEOUT` message
- Unknown errors → `UNKNOWN` message

**Security**: Original error details (stack traces, HTTP codes) NEVER exposed in this type.

---

### 4. Filter State

**Purpose**: Persistent filter selections that survive app restarts and screen navigation.

**File Location**: `types/filter-state.ts` (new file)

```typescript
/**
 * Tournament filter state managed by FilterPanel component.
 * Persisted to LocalStorage across app sessions.
 */
export interface FilterState {
  gender: 'all' | 'men' | 'women' | null;
  level: string | null;           // Tournament level filter
  dateRange: {
    start: string | null;         // ISO 8601 date
    end: string | null;           // ISO 8601 date
  };
  country: string | null;         // Country code (ISO 3166-1 alpha-2)
  searchQuery: string | null;     // Free-text search
  lastModified: number;           // Timestamp of last filter change
}

/**
 * Default empty filter state (show all tournaments).
 */
export const DEFAULT_FILTER_STATE: FilterState = {
  gender: 'all',
  level: null,
  dateRange: { start: null, end: null },
  country: null,
  searchQuery: null,
  lastModified: Date.now()
};

/**
 * Check if any filters are active (non-default).
 */
export const hasActiveFilters = (state: FilterState): boolean => {
  return (
    state.gender !== 'all' ||
    state.level !== null ||
    state.dateRange.start !== null ||
    state.dateRange.end !== null ||
    state.country !== null ||
    (state.searchQuery !== null && state.searchQuery.trim().length > 0)
  );
};

/**
 * Reset filter state to defaults (used by Reset button).
 */
export const resetFilterState = (): FilterState => ({
  ...DEFAULT_FILTER_STATE,
  lastModified: Date.now()
});
```

**Persistence**:
- Storage key: `@beachref:tournament-filters:v1`
- Storage type: LocalStorage (React Native AsyncStorage)
- Serialization: JSON.stringify/parse
- Expiration: None (persists indefinitely until manually reset)

**Validation**:
- `dateRange.start` MUST be ≤ `dateRange.end` (if both non-null)
- `country` MUST be valid ISO 3166-1 alpha-2 code (if non-null)
- `searchQuery` trimmed automatically (leading/trailing whitespace removed)

---

## Integration with Existing Types

### Extended BeachMatch Interface

**File Location**: `types/match.ts`

```typescript
// Existing BeachMatch interface extended with duration display
export interface BeachMatchWithDuration extends BeachMatch {
  duration: MatchDuration;  // Computed field, not from API
}
```

**Usage**: Components displaying match cards use `BeachMatchWithDuration` to access pre-calculated duration.

### TournamentService State Integration

**File Location**: `services/TournamentService.ts` (existing file, add state management)

```typescript
class TournamentService {
  private loadingContext: TournamentLoadingContext = {
    state: 'idle',
    error: null,
    lastFetchTime: null,
    tournamentCount: 0
  };

  // Existing methods...

  getLoadingState(): TournamentLoadingContext {
    return { ...this.loadingContext };
  }

  private setLoadingState(newState: TournamentLoadingState, error?: APIErrorState) {
    this.loadingContext = {
      state: newState,
      error: error || null,
      lastFetchTime: newState === 'loaded' ? Date.now() : this.loadingContext.lastFetchTime,
      tournamentCount: this.loadingContext.tournamentCount
    };
  }
}
```

---

## Type Safety Guidelines

### Readonly Properties

All state entities use `readonly` properties to prevent accidental mutations. State updates MUST create new objects:

```typescript
// ❌ BAD: Direct mutation
loadingContext.state = 'loaded';

// ✅ GOOD: Immutable update
loadingContext = { ...loadingContext, state: 'loaded', lastFetchTime: Date.now() };
```

### Type Guards

Use provided type guards instead of direct comparisons:

```typescript
// ❌ BAD: String comparison
if (state === 'loading') { ... }

// ✅ GOOD: Type guard
if (LoadingStateChecks.isLoading(state)) { ... }
```

### Null Safety

All nullable fields MUST be checked before use:

```typescript
// ❌ BAD: Assumes non-null
const minutes = duration.startTime.substring(0, 2);

// ✅ GOOD: Null check
const minutes = duration.startTime?.substring(0, 2) ?? 0;
```

---

## Validation Schema Summary

| Entity | Required Fields | Nullable Fields | Constraints |
|--------|----------------|-----------------|-------------|
| `TournamentLoadingContext` | `state`, `tournamentCount` | `error`, `lastFetchTime` | error non-null when state='error' |
| `MatchDuration` | All except `startTime` | `startTime` | durationMinutes ≥ 0 |
| `APIErrorState` | All except `retryAfter` | `retryAfter` | timestamp ≤ Date.now() |
| `FilterState` | `gender`, `lastModified` | All others | dateRange.start ≤ dateRange.end |

---

## Type Exports

**Barrel Export** (`types/index.ts`):

```typescript
// New exports for this feature
export * from './loading-state';
export * from './api-error';
export * from './filter-state';

// Extended existing exports
export * from './match'; // Now includes MatchDuration
```

---

## Next Steps

1. Implement TypeScript interfaces in respective files
2. Add JSDoc comments for IDE autocomplete
3. Generate service implementations using these types
4. Update existing components to consume new state types
5. Add type validation tests (when test infrastructure ready)
