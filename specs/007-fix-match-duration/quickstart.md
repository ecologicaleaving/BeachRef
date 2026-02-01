# Quickstart: Fix Match Duration Display

**Feature**: 007-fix-match-duration
**Date**: 2025-01-25

## Overview

This feature fixes incorrect match duration display by correcting the parsing logic to interpret VIS API `DurationSet1/2/3` fields as **seconds (integers)** rather than "mm:ss" format strings.

## Files to Modify

### Primary Changes

1. **`utils/MatchDurationFormatter.ts`** - Core parsing logic
   - Add `parseDurationSeconds()` - Primary parser for integer seconds
   - Update `parseTimeString()` → rename to `parseDurationLegacy()` for fallback
   - Update `calculateTotalDuration()` to use new parsing order

2. **`services/MatchDurationService.ts`** - Service layer parsing
   - Update `parseSetDuration()` to handle integer seconds
   - Fix regex pattern to accept 3-4 digit numbers

### Secondary Changes

3. **`utils/__tests__/MatchDurationFormatter.test.ts`** - Test updates
   - Add tests for integer-seconds input (primary format)
   - Keep "mm:ss" tests as legacy compatibility

### Verification Only

4. **`components/MatchList/MatchListV2.tsx`** - Verify fallback logic works
5. **`hooks/useMatchDuration.ts`** - Verify service integration

## Implementation Steps

### Step 1: Update MatchDurationFormatter.ts

```typescript
// NEW: Primary parser for VIS API seconds format
export function parseDurationSeconds(duration: string | number | undefined): number {
  if (duration === undefined || duration === null || duration === '') {
    return 0;
  }

  const value = typeof duration === 'number' ? duration : parseInt(String(duration), 10);

  if (isNaN(value) || value < 0) {
    return 0;
  }

  return value; // Already in seconds
}

// RENAMED: Legacy parser for cached "mm:ss" format
export function parseDurationLegacy(duration: string): number {
  // Existing parseTimeString logic...
}

// UPDATED: Use new parsing order
export function calculateTotalDuration(
  durationSet1?: string | number,
  durationSet2?: string | number,
  durationSet3?: string | number
): string | null {
  const durations = [durationSet1, durationSet2, durationSet3]
    .map(d => parseDuration(d)) // Uses new smart parser
    .filter(seconds => seconds > 0);
  // ... rest unchanged
}

// NEW: Smart parser with fallback
export function parseDuration(duration: string | number | undefined): number {
  // 1. Try integer seconds (primary)
  const seconds = parseDurationSeconds(duration);
  if (seconds > 0) return seconds;

  // 2. Try legacy "mm:ss" format (fallback for cached data)
  if (typeof duration === 'string' && duration.includes(':')) {
    return parseDurationLegacy(duration);
  }

  return 0;
}
```

### Step 2: Update MatchDurationService.ts

```typescript
// UPDATED: Fix parseSetDuration to handle integer seconds
private parseSetDuration(duration: string | undefined): number | null {
  if (!duration || duration.trim() === '') {
    return null;
  }

  // Primary: Try parsing as integer seconds
  const seconds = parseInt(duration, 10);
  if (!isNaN(seconds) && seconds >= 0) {
    return Math.floor(seconds / 60); // Convert to minutes
  }

  // Fallback: Try "mm:ss" format for cached data
  const matchResult = duration.match(/^(\d{1,3}):(\d{2})$/);
  if (matchResult) {
    const minutes = parseInt(matchResult[1], 10);
    const secs = parseInt(matchResult[2], 10);
    return minutes + Math.round(secs / 60);
  }

  return null;
}
```

### Step 3: Update Tests

```typescript
describe('parseDurationSeconds', () => {
  test('should parse integer seconds correctly', () => {
    expect(parseDurationSeconds('1530')).toBe(1530); // 25:30
    expect(parseDurationSeconds('1725')).toBe(1725); // 28:45
    expect(parseDurationSeconds('0')).toBe(0);
    expect(parseDurationSeconds(1530)).toBe(1530);
  });
});

describe('calculateTotalDuration with VIS API format', () => {
  test('should calculate from integer seconds', () => {
    // 2-set match: 1530 + 1725 = 3255 seconds = 54.25 min = "54m"
    expect(calculateTotalDuration('1530', '1725')).toBe('54m');

    // 3-set match: 1935 + 2140 + 1350 = 5425 seconds = 90.4 min = "1h 30m"
    expect(calculateTotalDuration('1935', '2140', '1350')).toBe('1h 30m');
  });
});
```

## Testing Checklist

- [ ] Unit tests pass for integer-seconds input
- [ ] Unit tests pass for legacy "mm:ss" input
- [ ] View completed match - duration displays correctly
- [ ] View live match - duration updates with polling
- [ ] View match with no duration data - nothing displayed
- [ ] View match details - per-set durations display correctly

## Validation

After implementation, verify these scenarios:

| Scenario | VIS API Value | Expected Display |
|----------|---------------|------------------|
| 2-set match | 1530, 1725 | "54m" |
| 3-set match | 1935, 2140, 1350 | "1h 30m" |
| Quick match | 1100, 1185 | "38m" |
| No duration | null, null | (nothing) |
| Zero duration | 0, 0 | (nothing) |
| Cached legacy | "25:30", "28:45" | "54m" (backward compatible) |
