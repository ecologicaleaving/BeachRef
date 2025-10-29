# Implementation Quickstart Guide

**Feature**: UI Polish & User Experience Improvements
**Phase**: Phase 1 - Implementation Readiness
**Date**: 2025-10-27

## Overview

This guide provides step-by-step implementation instructions for delivering all 5 user stories. Follow the dependency order to avoid rework. Estimated total implementation time: 8-12 hours across 3-4 sessions.

---

## Prerequisites Checklist

Before starting implementation:

- [ ] Read `spec.md` - Understand functional requirements and success criteria
- [ ] Read `research.md` - Understand architectural decisions and rationale
- [ ] Read `data-model.md` - Understand type definitions and validation rules
- [ ] Verify branch: `004-ui-polish-improvements` is checked out
- [ ] Run `npm install` - Ensure all dependencies up to date
- [ ] Run `npx expo start --web` - Verify app builds successfully

---

## Implementation Order & Dependencies

```
Foundation Layer (Types + Services)
    ↓
Hook Layer (State Management)
    ↓
Component Layer (UI)
    ↓
Screen Integration
    ↓
Validation & Testing
```

---

## Phase A: Foundation Layer (2-3 hours)

### Step A1: Create Type Definitions

**Priority**: P1 (Blocking - all other work depends on types)

**Files to Create**:
1. `types/loading-state.ts` - `TournamentLoadingState` + helpers
2. `types/api-error.ts` - `APIErrorState` + factory functions
3. `types/filter-state.ts` - `FilterState` + validation helpers

**Files to Modify**:
1. `types/match.ts` - Add `MatchDuration` interface
2. `types/index.ts` - Add barrel exports for new types

**Validation**:
```bash
npx tsc --noEmit
# Should complete with no errors related to new types
```

**Reference**: See `data-model.md` for complete type definitions

---

### Step A2: Implement Error Transform Service

**Priority**: P1 (Blocking - API calls depend on this)

**File to Create**: `services/ErrorTransformService.ts`

**Key Implementation**:
```typescript
import { APIErrorState, API_ERROR_MESSAGES, createApiError } from '@/types/api-error';
import axios from 'axios';

export class ErrorTransformService {
  transformError(error: unknown): APIErrorState {
    // Network offline
    if (error instanceof TypeError) {
      return createApiError(API_ERROR_MESSAGES.NETWORK_OFFLINE);
    }

    // Timeout
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      return createApiError(API_ERROR_MESSAGES.REQUEST_TIMEOUT);
    }

    // All other API errors
    if (axios.isAxiosError(error)) {
      return createApiError(API_ERROR_MESSAGES.VIS_UNAVAILABLE);
    }

    // Unknown errors
    return createApiError(API_ERROR_MESSAGES.UNKNOWN);
  }

  shouldTransform(error: unknown): boolean {
    return (
      axios.isAxiosError(error) ||
      error instanceof TypeError ||
      (error as any)?.code === 'ECONNABORTED'
    );
  }
}

export const errorTransformService = new ErrorTransformService();
```

**Integration Point**: Add to `VisApiClient.ts` interceptor:

```typescript
// In VisApiClient.ts
import { errorTransformService } from './ErrorTransformService';

axiosInstance.interceptors.response.use(
  response => response,
  error => {
    if (errorTransformService.shouldTransform(error)) {
      const apiError = errorTransformService.transformError(error);
      // Log original error to Sentry (with sanitization)
      console.error('[VisApiClient] Error transformed:', error);
      throw apiError; // Throw user-friendly error
    }
    throw error;
  }
);
```

**Validation**:
- Simulate API failure (disconnect network)
- Verify user-friendly message appears (not HTTP 500)
- Check console for original error logging

---

### Step A3: Implement Match Duration Service

**Priority**: P1 (Blocking - duration hooks depend on this)

**File to Create**: `services/MatchDurationService.ts`

**Key Implementation**:
```typescript
import { MatchDuration } from '@/types/match';
import { BeachMatch } from '@/types';

export class MatchDurationService {
  calculateDuration(match: BeachMatch, now: Date = new Date()): MatchDuration {
    const durationMinutes = this.computeMinutes(match, now);

    return {
      matchId: match.id,
      durationMinutes,
      status: match.status,
      startTime: match.startTime || null,
      isLive: match.status === 'Running',
      lastUpdate: Date.now()
    };
  }

  private computeMinutes(match: BeachMatch, now: Date): number {
    if (!match.startTime) return 0;
    if (match.status !== 'Running') {
      return match.finalDuration || 0; // Use stored duration if available
    }

    const startMs = new Date(match.startTime).getTime();
    const elapsedMs = now.getTime() - startMs;
    return Math.max(0, Math.floor(elapsedMs / 60000)); // Ensure non-negative
  }

  shouldUpdate(match: BeachMatch): boolean {
    return match.status === 'Running';
  }
}

export const matchDurationService = new MatchDurationService();
```

**Validation**:
- Create test match with `startTime` 15 minutes ago
- Call `calculateDuration()` - should return ~15 minutes
- Set `status = 'Finished'` - duration should freeze

---

## Phase B: Hook Layer (2-3 hours)

### Step B1: Create useTournamentLoading Hook

**Priority**: P1 (User Story 1)

**File to Create**: `hooks/useTournamentLoading.ts`

**Key Implementation**:
```typescript
import { useState, useEffect } from 'react';
import { TournamentLoadingState, TournamentLoadingContext } from '@/types/loading-state';
import { Tournament } from '@/types';

export function useTournamentLoading(
  fetchFunction: () => Promise<Tournament[]>
): TournamentLoadingContext & { refetch: () => void } {
  const [context, setContext] = useState<TournamentLoadingContext>({
    state: 'idle',
    error: null,
    lastFetchTime: null,
    tournamentCount: 0
  });

  const fetchData = async () => {
    setContext(prev => ({ ...prev, state: 'loading', error: null }));

    try {
      const tournaments = await fetchFunction();

      setContext({
        state: tournaments.length > 0 ? 'loaded' : 'empty',
        error: null,
        lastFetchTime: Date.now(),
        tournamentCount: tournaments.length
      });
    } catch (error) {
      setContext({
        state: 'error',
        error: error as APIErrorState, // Already transformed by interceptor
        lastFetchTime: null,
        tournamentCount: 0
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    ...context,
    refetch: fetchData
  };
}
```

**Validation**:
- Use in TournamentSelectionScreen temporarily
- Verify `state === 'loading'` on mount
- Verify transition to `loaded` or `empty` after fetch

---

### Step B2: Create useMatchDuration Hook

**Priority**: P1 (User Story 2)

**File to Create**: `hooks/useMatchDuration.ts`

**Key Implementation**:
```typescript
import { useState, useEffect } from 'react';
import { MatchDuration } from '@/types/match';
import { BeachMatch } from '@/types';
import { matchDurationService } from '@/services/MatchDurationService';

export function useMatchDuration(match: BeachMatch): MatchDuration {
  const [duration, setDuration] = useState<MatchDuration>(() =>
    matchDurationService.calculateDuration(match)
  );

  useEffect(() => {
    // Initial calculation
    setDuration(matchDurationService.calculateDuration(match));

    // Only poll if match is running
    if (!matchDurationService.shouldUpdate(match)) {
      return;
    }

    // Sync with live score polling interval (5 seconds)
    const intervalId = setInterval(() => {
      setDuration(matchDurationService.calculateDuration(match, new Date()));
    }, 5000);

    return () => clearInterval(intervalId);
  }, [match.id, match.status, match.startTime]);

  return duration;
}
```

**Validation**:
- Use in MatchCard component
- Verify duration updates every 5 seconds for running matches
- Verify duration freezes when match finishes

---

### Step B3: Create useApiError Hook

**Priority**: P2 (User Story 3)

**File to Create**: `hooks/useApiError.ts`

**Key Implementation**:
```typescript
import { useState } from 'react';
import { APIErrorState } from '@/types/api-error';

export function useApiError() {
  const [error, setError] = useState<APIErrorState | null>(null);

  const clearError = () => setError(null);

  const handleError = (err: unknown) => {
    // Error already transformed by ErrorTransformService interceptor
    setError(err as APIErrorState);
  };

  return {
    error,
    hasError: error !== null,
    clearError,
    handleError
  };
}
```

**Usage**: Pair with `useTournamentLoading` to display error messages

---

## Phase C: Component Layer (3-4 hours)

### Step C1: Create LoadingIndicator Component

**Priority**: P1 (User Story 1)

**File to Create**: `components/LoadingIndicator.tsx`

**Key Implementation**:
```tsx
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

interface LoadingIndicatorProps {
  message?: string;
  size?: 'small' | 'large';
}

export function LoadingIndicator({ message = 'Loading...', size = 'large' }: LoadingIndicatorProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={theme.colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.large
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.medium
  }
});
```

**Validation**: Render in isolation, verify spinner animates

---

### Step C2: Create ErrorMessage Component

**Priority**: P2 (User Story 3)

**File to Create**: `components/ErrorMessage.tsx`

**Key Implementation**:
```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { APIErrorState } from '@/types/api-error';

interface ErrorMessageProps {
  error: APIErrorState;
  onRetry?: () => void;
}

export function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  return (
    <View style={styles.container}>
      <AlertCircle size={48} color={theme.colors.error} />
      <Text style={styles.message}>{error.message}</Text>
      {onRetry && error.canRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.large
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: theme.spacing.medium,
    marginBottom: theme.spacing.large
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.large,
    paddingVertical: theme.spacing.medium,
    borderRadius: theme.borderRadius.medium,
    minHeight: 44, // Touch target
    minWidth: 100
  },
  retryText: {
    ...theme.typography.button,
    color: theme.colors.background
  }
});
```

**Validation**: Render with mock error, verify retry button works

---

### Step C3: Update FilterPanel Component

**Priority**: P3 (User Story 5)

**File to Modify**: `components/tournament/FilterPanel.tsx`

**Changes Required**:
1. Add "Reset" button next to "Save and Close"
2. Reset button calls `resetFilterState()` from `types/filter-state.ts`
3. Panel stays open after reset (don't close modal)
4. Button group uses horizontal layout with proper spacing

**Key Code Addition**:
```tsx
import { resetFilterState } from '@/types/filter-state';

// Inside FilterPanel component
const handleReset = () => {
  const newState = resetFilterState();
  onFilterChange(newState); // Update parent state
  // Don't close panel (remove onClose() call)
};

return (
  <View style={styles.actionRow}>
    <Button variant="secondary" onPress={handleReset} style={styles.resetButton}>
      Reset Filters
    </Button>
    <Button variant="primary" onPress={handleSaveAndClose} style={styles.saveButton}>
      Save and Close
    </Button>
  </View>
);

// Styles
const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.medium,
    marginTop: theme.spacing.large
  },
  resetButton: {
    flex: 1
  },
  saveButton: {
    flex: 1
  }
});
```

**Validation**:
- Apply filters → Click Reset → Filters cleared, panel still open
- Verify buttons are same width (flex: 1)
- Verify touch targets ≥44pt

---

### Step C4: Add Refresh Button to Main Screen

**Priority**: P3 (User Story 5)

**File to Modify**: `app/tournament-selection.tsx` (or relevant tournament list screen)

**Changes Required**:
1. Remove old reset button (if exists)
2. Add refresh icon button (lucide-react-native `RefreshCw`)
3. Button triggers `refetch()` from `useTournamentLoading` hook
4. Debounce clicks (prevent duplicate API calls)

**Key Code Addition**:
```tsx
import { RefreshCw } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { useState } from 'react';

// Inside TournamentSelectionScreen
const [isRefreshing, setIsRefreshing] = useState(false);
const { refetch, state } = useTournamentLoading(getTournaments);

const handleRefresh = async () => {
  if (isRefreshing || state === 'loading') return; // Deduplication

  setIsRefreshing(true);
  await refetch();
  setIsRefreshing(false);
};

// In render (e.g., NavigationHeader)
<TouchableOpacity
  onPress={handleRefresh}
  disabled={isRefreshing}
  style={styles.refreshButton}
  accessibilityLabel="Refresh tournament list"
  accessibilityRole="button"
>
  <RefreshCw
    size={24}
    color={isRefreshing ? theme.colors.textDisabled : theme.colors.primary}
  />
</TouchableOpacity>
```

**Validation**:
- Click refresh → Loading indicator appears → Data reloads
- Click refresh while loading → Button disabled (no duplicate call)
- Verify icon color changes when disabled

---

### Step C5: Update Match Duration Display

**Priority**: P1 (User Story 2)

**Files to Modify**:
1. `components/MatchList/MatchCard.tsx`
2. `components/MatchList/MatchListItem.tsx`
3. Any other components displaying match timing

**Changes Required**:
1. Import `useMatchDuration` hook
2. Replace static duration display with live-updating duration
3. Format using `formatMatchDuration()` helper

**Example**:
```tsx
// In MatchCard.tsx
import { useMatchDuration } from '@/hooks/useMatchDuration';
import { formatMatchDuration } from '@/types/match';

export function MatchCard({ match }: MatchCardProps) {
  const duration = useMatchDuration(match);

  return (
    <View>
      {/* Other match info */}
      <Text style={styles.duration}>
        {formatMatchDuration(duration)}
      </Text>
    </View>
  );
}
```

**Validation**:
- View running match → Duration updates every 5 seconds
- View finished match → Duration static (frozen at final value)
- View scheduled match → Duration shows "0 min"

---

## Phase D: Screen Integration (2-3 hours)

### Step D1: Integrate Loading States in TournamentSelectionScreen

**Priority**: P1 (User Story 1)

**File to Modify**: `app/tournament-selection.tsx`

**Changes Required**:
1. Replace direct API calls with `useTournamentLoading` hook
2. Conditionally render `<LoadingIndicator />`, `<ErrorMessage />`, empty state, or tournament list
3. Pass `refetch()` to refresh button (from Step C4)

**Implementation**:
```tsx
import { useTournamentLoading } from '@/hooks/useTournamentLoading';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { ErrorMessage } from '@/components/ErrorMessage';
import { LoadingStateChecks } from '@/types/loading-state';

export default function TournamentSelectionScreen() {
  const { state, error, refetch, tournamentCount } = useTournamentLoading(
    () => tournamentService.getTournaments()
  );

  if (LoadingStateChecks.isLoading(state)) {
    return <LoadingIndicator message="Loading tournaments..." />;
  }

  if (LoadingStateChecks.hasError(state) && error) {
    return <ErrorMessage error={error} onRetry={refetch} />;
  }

  if (LoadingStateChecks.isEmpty(state)) {
    return (
      <View style={styles.emptyContainer}>
        <Text>No tournaments found</Text>
        {/* Refresh button still available */}
      </View>
    );
  }

  // Loaded state - render tournament list
  return (
    <FlatList
      data={tournaments}
      renderItem={renderTournamentItem}
      // ...
    />
  );
}
```

**Validation**:
- Launch app → See loading spinner → See tournament list
- Disconnect network → See error message → Click retry → Reconnect → See tournaments
- Apply filters with no matches → See "no tournaments found" (not loading spinner)

---

### Step D2: Remove Mock Data from Production

**Priority**: P2 (User Story 4)

**Files to Modify**:
1. `constants/mockData.ts` - Guard with `__DEV__`
2. `services/TournamentService.ts` - Remove mock data merging
3. Any other files importing mock tournaments

**Implementation**:
```typescript
// constants/mockData.ts
export const MOCK_TOURNAMENTS: Tournament[] = __DEV__ ? [
  // Keep existing mock data
] : [];

export const getMockTournaments = (): Tournament[] => {
  if (!__DEV__) {
    console.warn('[MockData] Accessed in production - returning empty array');
    return [];
  }
  return MOCK_TOURNAMENTS;
};

// services/TournamentService.ts
async getTournaments(): Promise<Tournament[]> {
  const apiTournaments = await this.fetchFromApi();

  // Only merge mocks in development if explicitly enabled
  if (__DEV__ && process.env.EXPO_PUBLIC_ENABLE_MOCKS === 'true') {
    return [...apiTournaments, ...getMockTournaments()];
  }

  return apiTournaments;
}
```

**Validation**:
- Build production: `npx expo export --platform web`
- Inspect bundle - mock tournament objects should not appear
- Run audit: `npm run audit -- --checks=security`
- Verify SC-006: Zero mock tournaments in production

---

## Phase E: Validation & Testing (1-2 hours)

### Step E1: Manual Testing Checklist

**User Story 1: Loading States**
- [ ] Launch app → Loading indicator appears within 100ms (SC-001)
- [ ] Data loads → Loading indicator disappears, tournaments appear
- [ ] Empty results → "No tournaments found" appears (not loading) (SC-002)
- [ ] Navigate away during load → Return → Correct state shown

**User Story 2: Match Duration Updates**
- [ ] View running match → Duration updates every 5-6 seconds (SC-003)
- [ ] Duration accuracy within ±1 minute of actual elapsed time (SC-004)
- [ ] Multiple running matches → Durations update independently
- [ ] Match finishes → Duration freezes at final value

**User Story 3: API Error Messages**
- [ ] Disconnect network → User-friendly error appears (SC-005)
- [ ] Error message: "The VIS API is currently not available, please retry in few minutes"
- [ ] No HTTP codes, stack traces, or technical errors visible (SC-005: 100%)
- [ ] Click retry → Reconnect → Data loads successfully

**User Story 4: Mock Data Removal**
- [ ] Production build contains zero mock tournaments (SC-006)
- [ ] Development mode (with `ENABLE_MOCKS=true`) shows mocks
- [ ] Production mode ignores `ENABLE_MOCKS` flag

**User Story 5: Filter Panel**
- [ ] Open filter panel → Reset + Save buttons visible side-by-side
- [ ] Click Reset → Filters cleared, panel stays open
- [ ] Click Save → Panel closes, filters applied
- [ ] Reset completes within 500ms (SC-007)
- [ ] Refresh button on main screen reloads data within 3 seconds (SC-008)
- [ ] Click refresh repeatedly → Only 1 API call active (SC-009)
- [ ] Refresh preserves current filters

---

### Step E2: TypeScript Validation

```bash
# Verify no type errors
npx tsc --noEmit

# Should output: "Found 0 errors"
```

---

### Step E3: Constitution Compliance Check

**Verify Principles**:
- [ ] **Mobile-First**: Touch targets ≥44pt (buttons, refresh icon)
- [ ] **Offline-First**: Loading states handle offline gracefully
- [ ] **Service Layer**: No API calls in components (all in services)
- [ ] **Resilience**: Error boundaries handle API failures
- [ ] **Design System**: Uses theme constants (no hardcoded colors/spacing)
- [ ] **Type Safety**: All new code has TypeScript types, no `any` types

---

## Troubleshooting Common Issues

### Issue: Loading state stuck at "loading"

**Cause**: `useTournamentLoading` not handling API errors
**Fix**: Ensure ErrorTransformService interceptor is active in VisApiClient

### Issue: Duration not updating

**Cause**: `match.status !== 'Running'` or interval not set
**Fix**: Verify `match.status` value, check `useEffect` dependency array

### Issue: Mock data appears in production

**Cause**: `__DEV__` not properly stripped in production build
**Fix**: Verify Expo production build command, check Metro bundler config

### Issue: Type errors after adding new types

**Cause**: Missing barrel export in `types/index.ts`
**Fix**: Add `export * from './loading-state'` etc. to barrel file

---

## Performance Benchmarks

**Expected Metrics** (measured after implementation):
- Loading indicator display: <100ms (SC-001) ✓
- Duration update cycle: 5-6s (SC-003) ✓
- Filter reset: <500ms (SC-007) ✓
- Refresh with cache: <3s (SC-008) ✓
- Match duration accuracy: ±1min (SC-004) ✓

**Measurement Tools**:
- React DevTools Profiler (component render times)
- Chrome DevTools Network tab (API call timing)
- Manual stopwatch (user-facing timing)

---

## Next Steps After Implementation

1. **Run `/speckit.tasks`** - Generate detailed task breakdown for implementation tracking
2. **Create PR** - Follow git workflow in constitution (feature branch → development → master)
3. **Request Code Review** - Verify constitution compliance (see `constitution.md` § Code Review Requirements)
4. **Run Production Audit** - `npm run audit:ci` (specs/002 audit system)
5. **Update CLAUDE.md** - Document new patterns (state hooks, error transformation) if needed

---

## Quick Reference

**Key Files**:
- Types: `types/loading-state.ts`, `types/api-error.ts`, `types/filter-state.ts`, `types/match.ts`
- Services: `services/ErrorTransformService.ts`, `services/MatchDurationService.ts`
- Hooks: `hooks/useTournamentLoading.ts`, `hooks/useMatchDuration.ts`, `hooks/useApiError.ts`
- Components: `components/LoadingIndicator.tsx`, `components/ErrorMessage.tsx`

**Success Criteria Reference**:
- SC-001: Loading <100ms
- SC-002: 0% false "no tournaments" during loading
- SC-003: Duration updates <6s
- SC-004: Duration accuracy ±1min
- SC-005: 100% user-friendly errors
- SC-006: 0 mock tournaments production
- SC-007: Filter reset <500ms
- SC-008: Refresh <3s
- SC-009: Max 1 concurrent request
- SC-010: 30% fewer support tickets (long-term metric)
