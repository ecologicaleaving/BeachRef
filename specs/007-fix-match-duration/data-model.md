# Data Model: Fix Match Duration Display

**Feature**: 007-fix-match-duration
**Date**: 2025-01-25

## Entities

### VIS API Duration Field (External)

The VIS API returns duration as a 32-bit positive integer representing seconds.

```typescript
// VIS API Response - DurationSet fields
// Type: positive 32-bit integer (seconds)
// Range: 0 to 2,147,483,647 (practical max ~180 for a set, ~10800 for match)
// Examples:
//   - 1530 = 25 minutes, 30 seconds
//   - 1725 = 28 minutes, 45 seconds
//   - 0 = not started or not available
//   - null/undefined = field not present

type VisDurationField = string | undefined; // Transmitted as string in XML/JSON
// Actual value: integer representing seconds
```

### BeachMatch (Existing - No Changes)

From `types/match.ts`:

```typescript
export interface BeachMatch {
  No: string;
  // ... other fields ...
  DurationSet1?: string;  // VIS API: integer seconds as string
  DurationSet2?: string;  // VIS API: integer seconds as string
  DurationSet3?: string;  // VIS API: integer seconds as string
  // ... other fields ...
}
```

**Note**: The `string` type is correct because VIS API transmits integers as strings in the response. The parsing logic must convert to `number`.

### MatchDuration (Existing - No Changes)

From `types/match.ts`:

```typescript
export interface MatchDuration {
  matchNo: string;                    // Match identifier
  totalMinutes: number;               // Total duration in minutes (calculated)
  currentSetMinutes: number | null;   // Current set duration (null if finished)
  set1Duration: number | null;        // Set 1 duration in minutes
  set2Duration: number | null;        // Set 2 duration in minutes
  set3Duration: number | null;        // Set 3 duration in minutes
  isLive: boolean;                    // True if match is currently running
  lastUpdated: number;                // Timestamp of last update (milliseconds)
}
```

**Note**: `set1Duration`, `set2Duration`, `set3Duration` are stored in minutes (converted from VIS API seconds).

## Data Transformations

### Parsing Flow

```
VIS API Response (seconds as string)
        │
        ▼
┌─────────────────────────────┐
│ parseDurationSeconds()      │ ← NEW: Primary parser
│ Input: "1530" (string)      │
│ Output: 1530 (number)       │
└─────────────────────────────┘
        │
        ▼ (if primary fails)
┌─────────────────────────────┐
│ parseDurationLegacy()       │ ← NEW: Fallback for cached "mm:ss"
│ Input: "25:30" (string)     │
│ Output: 1530 (number)       │
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ formatDuration()            │ ← UNCHANGED
│ Input: 3255 (total seconds) │
│ Output: "54m" or "1h 30m"   │
└─────────────────────────────┘
```

### Conversion Rules

| Input Type | Example Input | Parsing Method | Output (seconds) |
|------------|---------------|----------------|------------------|
| Integer as string | "1530" | `parseDurationSeconds()` | 1530 |
| Integer (number) | 1530 | Direct use | 1530 |
| Legacy mm:ss | "25:30" | `parseDurationLegacy()` | 1530 |
| Empty string | "" | Return null | null |
| Null/undefined | null | Return null | null |
| Zero | "0" or 0 | Return 0 | 0 (suppress display) |

### Display Format Rules

| Total Seconds | Total Minutes | Display |
|---------------|---------------|---------|
| 0 | 0 | (nothing shown) |
| 2700 | 45 | "45m" |
| 3255 | 54 | "54m" |
| 3600 | 60 | "1h" |
| 5400 | 90 | "1h 30m" |

## Validation Rules

1. **DurationSet fields**: Must be parseable as positive integer or valid "mm:ss" format
2. **Seconds range**: 0 to 10800 (practical maximum of 3 hours per match, no cap per clarification)
3. **Minutes/Seconds in legacy format**: Minutes 0-999, Seconds 0-59
4. **Display threshold**: Zero duration → show nothing (not "0m")

## State Transitions

Duration data is stateless - calculated on each poll/render from VIS API response.

```
┌──────────────┐      VIS API Poll      ┌──────────────┐
│   No Data    │ ───────────────────────▶│   Duration   │
│ (null/empty) │                         │   Displayed  │
└──────────────┘                         └──────────────┘
       ▲                                        │
       │             Match Ends                 │
       └────────────────────────────────────────┘
             (Duration frozen at final value)
```

## No Database/Storage Changes

This feature does not modify:
- MMKV cache structure
- AsyncStorage keys
- Any persistent storage schemas

Duration is always calculated fresh from VIS API response data.
