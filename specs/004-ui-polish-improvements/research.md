# Research & Architectural Decisions

**Feature**: UI Polish & User Experience Improvements
**Phase**: Phase 0 - Research
**Date**: 2025-10-27

## Overview

This document captures architectural decisions and research findings for implementing 5 UX improvements: loading states, real-time match duration updates, API error messages, mock data removal, and filter panel reorganization. All decisions align with the BeachRef constitution principles and leverage existing infrastructure from specs/001-vis-api-optimization.

---

## Decision 1: Loading State Management Pattern

### Context
**Requirement**: FR-001, FR-002 - Display loading indicator during tournament data fetch, show "no tournaments found" ONLY after fetch completes.

**Challenge**: Need to distinguish between three states (Loading, Empty, Loaded) without adding complexity or violating service layer abstraction.

### Decision: State Machine with React Hook

**Chosen Approach**: Implement `useTournamentLoading` custom hook managing a finite state machine (Loading → Loaded/Empty/Error).

```typescript
type LoadingState = 'idle' | 'loading' | 'loaded' | 'empty' | 'error';

interface UseTournamentLoadingResult {
  state: LoadingState;
  isLoading: boolean;
  isEmpty: boolean;
  hasError: boolean;
  error: string | null;
}
```

**Rationale**:
- **Type-safe**: Explicit states prevent invalid combinations (e.g., loading + empty simultaneously)
- **Reusable**: Hook pattern allows use across multiple screens (tournament-selection, tournament-detail)
- **Service-isolated**: Business logic stays in `TournamentService`, hook only manages UI state
- **Testable**: State transitions can be unit tested independently

**Alternatives Considered**:
1. **Boolean flags** (`isLoading`, `isEmpty`, `hasError`) - Rejected: Prone to invalid state combinations (e.g., `isLoading=true` && `isEmpty=true`)
2. **Redux/Zustand store** - Rejected: Overkill for component-local state, increases complexity
3. **Direct component state** - Rejected: Violates reusability, duplicates logic across screens

**Implementation Notes**:
- Hook wraps existing `TournamentService.getTournaments()` calls
- Automatically transitions Loading → Loaded when data.length > 0
- Automatically transitions Loading → Empty when data.length === 0
- Integrates with existing MMKV cache (no new cache layer needed)

---

## Decision 2: Match Duration Calculation Architecture

### Context
**Requirement**: FR-003, FR-004, FR-014 - Update match duration in real-time during live score polling (5s interval), stop updates when match finishes.

**Challenge**: Duration must recalculate every polling cycle without causing unnecessary re-renders or API calls.

### Decision: Service-Based Duration Calculator with Memoization

**Chosen Approach**: `MatchDurationService` with client-side calculation + `useMatchDuration` hook for UI binding.

```typescript
// Service
class MatchDurationService {
  calculateDuration(match: BeachMatch, now: Date = new Date()): number {
    if (!match.startTime) return 0;
    if (match.status !== 'Running') return match.finalDuration || 0;

    const elapsed = now.getTime() - new Date(match.startTime).getTime();
    return Math.floor(elapsed / 60000); // minutes
  }

  shouldUpdate(match: BeachMatch): boolean {
    return match.status === 'Running';
  }
}

// Hook
function useMatchDuration(match: BeachMatch): number {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!service.shouldUpdate(match)) {
      setDuration(service.calculateDuration(match));
      return;
    }

    // Update every polling cycle
    const interval = setInterval(() => {
      setDuration(service.calculateDuration(match, new Date()));
    }, 5000); // Sync with live score polling

    return () => clearInterval(interval);
  }, [match.id, match.status]);

  return duration;
}
```

**Rationale**:
- **Client-side calculation**: No API calls needed, instant updates, works offline
- **Polling-synced**: 5s interval matches live score polling (SC-003: <6s update window)
- **Status-aware**: Auto-stops when match.status !== 'Running' (FR-014)
- **Accuracy**: ±1min precision sufficient for referee use (SC-004)
- **Performance**: Memo optimization prevents cascading re-renders in match lists

**Alternatives Considered**:
1. **Server-provided duration** - Rejected: Requires API changes, adds latency, not available in VIS API
2. **Single global interval** - Rejected: Complex state management, hard to synchronize with per-match status
3. **Web Worker calculation** - Rejected: Overcomplicated for simple arithmetic, React Native Web Worker support limited

**Implementation Notes**:
- `match.startTime` must be ISO 8601 string (already available in VIS API response)
- Hook subscribes to existing live score polling events (no new polling mechanism)
- Duration displayed as `"X min"` or `"X' Y\""` format (design system decision)

---

## Decision 3: API Error Message Transformation Strategy

### Context
**Requirement**: FR-005, FR-006, FR-015 - Replace all technical errors with "The VIS API is currently not available, please retry in few minutes".

**Challenge**: Must intercept errors at multiple points (VisApiClient, cache misses, network failures) without duplicating logic.

### Decision: Centralized Error Transform Service with Axios Interceptor

**Chosen Approach**: `ErrorTransformService` + Axios response interceptor in `VisApiClient`.

```typescript
// Service
class ErrorTransformService {
  private readonly USER_MESSAGE =
    "The VIS API is currently not available, please retry in few minutes";

  transformError(error: unknown): APIErrorState {
    // Intercept ALL API errors and return user-friendly message
    return {
      message: this.USER_MESSAGE,
      isApiError: true,
      canRetry: true,
      timestamp: Date.now()
    };
  }

  shouldTransform(error: unknown): boolean {
    // Transform network errors, HTTP errors, timeouts
    return (
      axios.isAxiosError(error) ||
      error instanceof TypeError || // Network errors
      (error as any)?.code === 'ECONNABORTED' // Timeouts
    );
  }
}

// VisApiClient integration
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    if (errorTransformService.shouldTransform(error)) {
      throw errorTransformService.transformError(error);
    }
    throw error; // Re-throw non-API errors
  }
);
```

**Rationale**:
- **Single source of truth**: One message constant, easy to update (e.g., internationalization later)
- **Zero leakage**: HTTP status codes, stack traces, error objects never reach UI (SC-005: 100% coverage)
- **Axios interceptor**: Catches errors at API boundary before service layer processes them
- **Testable**: Can mock interceptor to verify transformation behavior

**Alternatives Considered**:
1. **Try-catch in every service method** - Rejected: Code duplication, easy to miss edge cases
2. **React Error Boundary only** - Rejected: Too late, errors already leaked to console/Sentry
3. **Custom Axios adapter** - Rejected: Overcomplicated, harder to maintain than interceptor

**Implementation Notes**:
- Interceptor runs BEFORE circuit breaker logic (specs/001 `ConnectionCircuitBreaker`)
- Error message stored in `APIErrorState` type (Phase 1 data model)
- `useApiError` hook provides UI components access to transformed errors
- Original errors still logged to Sentry for debugging (with sanitization)

---

## Decision 4: Mock Data Removal Strategy

### Context
**Requirement**: FR-007, FR-008 - Exclude mock tournament data from production, optionally enable in development.

**Challenge**: Mock data may be imported in multiple files; need clean removal without breaking development workflows.

### Decision: Environment-Gated Mock Data + Constants Refactoring

**Chosen Approach**: Guard mock imports with `__DEV__` constant, provide empty arrays in production.

```typescript
// constants/mockData.ts
const MOCK_TOURNAMENTS: Tournament[] = __DEV__ ? [
  // Mock tournament objects (dev only)
] : [];

export const getMockTournaments = (): Tournament[] => {
  if (!__DEV__) {
    console.warn('Mock data accessed in production - returning empty array');
    return [];
  }
  return MOCK_TOURNAMENTS;
};

// Usage in services
const tournaments = __DEV__ && ENABLE_MOCKS
  ? [...realData, ...getMockTournaments()]
  : realData;
```

**Rationale**:
- **Zero production impact**: `__DEV__ === false` in production builds, dead code elimination removes mock data
- **Developer-friendly**: Mocks still available locally via `ENABLE_MOCKS` environment variable
- **TypeScript-safe**: Same `Tournament[]` type signature, no conditional logic needed
- **Audit-compliant**: Production audit (specs/002) will verify zero mock tournaments (SC-006)

**Alternatives Considered**:
1. **Delete mock files entirely** - Rejected: Breaks local development, harder to test error states
2. **Separate mock package** - Rejected: Overcomplicated for small mock dataset
3. **Runtime environment check** - Rejected: Adds latency, can fail if env vars misconfigured

**Implementation Notes**:
- Expo provides `__DEV__` constant automatically (React Native standard)
- Add `EXPO_PUBLIC_ENABLE_MOCKS=true` to `.env.local` for dev mode
- Update `.gitignore` to exclude `.env.local` (prevent accidental commits)
- Document in `CLAUDE.md` under "Development Workflow"

---

## Decision 5: Filter Panel Button Reorganization

### Context
**Requirement**: FR-009, FR-010, FR-011, FR-012 - Move "Reset" button into filter panel next to "Save and Close", replace main screen reset with "Refresh" button.

**Challenge**: Filter panel may have limited space; buttons must maintain touch target standards (44x44pt).

### Decision: Horizontal Button Group with Icon-Only Refresh

**Chosen Approach**: Filter panel uses full-width button group, main screen uses icon-only refresh button.

```tsx
// FilterPanel.tsx
<View style={styles.actionRow}>
  <Button variant="secondary" onPress={handleReset}>
    Reset Filters
  </Button>
  <Button variant="primary" onPress={handleSaveAndClose}>
    Save and Close
  </Button>
</View>

// TournamentSelectionScreen.tsx
<TouchableOpacity
  onPress={handleRefresh}
  style={styles.refreshButton}
  accessibilityLabel="Refresh tournament list"
>
  <RefreshIcon size={24} color={theme.colors.primary} />
</TouchableOpacity>
```

**Rationale**:
- **Grouped actions**: Reset + Save logically grouped, reduces cognitive load
- **Touch-friendly**: Both buttons meet 44x44pt minimum, adequate spacing between them
- **Visual hierarchy**: Primary button (Save) more prominent than secondary (Reset)
- **Icon affordance**: Refresh icon universally recognized (pull-to-refresh pattern)
- **Accessibility**: Both buttons have clear labels/accessibility hints

**Alternatives Considered**:
1. **Vertical button stack** - Rejected: Takes up more vertical space, harder to reach on large screens
2. **Dropdown menu for reset** - Rejected: Extra tap required, less discoverable
3. **Text-based refresh button** - Rejected: Takes more space, less visually clean

**Implementation Notes**:
- Use existing `Button` component from design system (Foundation layer)
- Refresh icon from `lucide-react-native` package (already in dependencies)
- Debounce refresh action (300ms) to prevent double-taps (FR-013 deduplication)
- Filter panel state persists in `FilterState` entity (Phase 1 data model)

---

## Decision 6: State Persistence Strategy

### Context
**Cross-cutting concern**: Loading states, errors, and filter states must survive navigation and app state changes.

### Decision: Hybrid Persistence (Memory + LocalStorage)

**Chosen Approach**:
- **Loading State**: Memory only (ephemeral, resets on screen mount)
- **API Error State**: Memory only (ephemeral, cleared on retry)
- **Filter State**: LocalStorage (persistent, survives app restarts)
- **Match Duration**: Calculated on-demand (no persistence)

**Rationale**:
- **Performance**: Memory-only for transient states (loading, errors) avoids I/O overhead
- **UX**: Filter persistence prevents re-selection annoyance
- **Offline**: LocalStorage survives offline periods, filters available immediately
- **Simplicity**: No synchronization logic needed between storage layers

**Implementation Notes**:
- Reuse existing `LocalStorageManager` service (specs/001 infrastructure)
- Filter state key: `@beachref:tournament-filters:v1`
- No MMKV needed (LocalStorage sufficient for small JSON objects)

---

## Summary of Decisions

| Decision | Approach | Key Benefit |
|----------|----------|-------------|
| **Loading State** | Custom hook + state machine | Type-safe, reusable across screens |
| **Match Duration** | Service calculator + 5s polling hook | Client-side, no API calls, synced with live scores |
| **Error Messages** | Axios interceptor + transform service | Zero technical error leakage, single source of truth |
| **Mock Data** | `__DEV__` guards + environment flags | Production-safe, developer-friendly |
| **Filter Panel** | Horizontal button group + icon refresh | Touch-friendly, improved discoverability |
| **State Persistence** | Hybrid (memory + LocalStorage) | Performance + UX balance |

---

## Performance Impact Analysis

**Expected Performance Improvements**:
- Loading indicator: Prevents perceived lag (users see progress immediately)
- Duration updates: No API calls (100% client-side calculation)
- Error handling: Faster failure recovery (user knows to retry vs. debug)
- Mock data removal: Slightly faster tournament list rendering (fewer items)
- Filter panel: No performance change (UI-only reorganization)

**Performance Risks**: None identified. All changes leverage existing infrastructure.

---

## Testing Strategy

**Unit Tests** (when test infrastructure added):
- `MatchDurationService.calculateDuration()` - Verify ±1min accuracy
- `ErrorTransformService.transformError()` - Verify 100% technical error suppression
- `useTournamentLoading` state transitions - Verify Loading → Loaded/Empty/Error
- Mock data guards - Verify `__DEV__ === false` returns empty arrays

**Integration Tests**:
- Loading state during real API calls
- Duration updates during live score polling
- Error interceptor with mocked Axios failures
- Filter persistence across app restarts

**E2E Tests** (critical paths):
- Tournament selection screen loading flow
- Match detail screen with live duration updates
- Error state display and retry flow
- Filter panel reset + save behavior

---

## Next Steps (Phase 1)

1. Generate `data-model.md` with TypeScript interfaces for:
   - `TournamentLoadingState`
   - `MatchDuration`
   - `APIErrorState`
   - `FilterState`

2. Document service contracts (no external API contracts needed - UI-only feature)

3. Generate `quickstart.md` with implementation order and file modification checklist

4. Update agent context with new patterns (state hooks, error transformation)
