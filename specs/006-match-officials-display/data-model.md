# Data Model: Match Officials Display

**Date**: 2025-11-04
**Feature**: Match Officials Display
**Phase**: Phase 1 - Entity Design

## Overview

This document defines the data entities, relationships, and state transitions for the Match Officials Display feature. The model extends existing match data structures to include complete officiating team information while maintaining backward compatibility.

---

## Entity Definitions

### 1. Official (Extended from existing structure)

Represents any person serving in an officiating capacity for a match.

**Attributes:**

| Field | Type | Required | Description | Source |
|-------|------|----------|-------------|--------|
| `no` | `string` | Yes | VIS API identifier (NoReferee1, NoScorer, etc.) | VIS API |
| `name` | `string` | Yes | Full name (FirstName LastName) | VIS API |
| `federation` | `string` | No | 3-letter federation code (e.g., "USA", "ITA") | VIS API |
| `role` | `OfficialRole` | Yes | Official's role (Referee1, Scorer, LineJudge1, etc.) | Derived |

**Validation Rules:**
- `name` must not be empty or whitespace-only
- `no` must match pattern: numeric string or alphanumeric ID
- `federation` if present, must be 2-3 letter uppercase code
- `role` must be one of the defined `OfficialRole` enum values

**Relationships:**
- Belongs to exactly one `Match`
- May reference one `Referee` entity (if official is also a registered referee)

**Example:**
```typescript
{
  no: "12345",
  name: "John Smith",
  federation: "USA",
  role: OfficialRole.REFEREE_1
}
```

---

### 2. OfficialRole (Extended Enum)

Enumeration of all possible officiating roles in beach volleyball.

**Values:**

| Enum Value | String Value | Display Label | Abbreviation | Priority |
|------------|--------------|---------------|--------------|----------|
| `REFEREE_1` | `"Referee1"` | "Referee 1" | "R1" | 1 (Primary) |
| `REFEREE_2` | `"Referee2"` | "Referee 2" | "R2" | 2 (Primary) |
| `CHALLENGE_REFEREE` | `"ChallengeReferee"` | "Challenge Referee" | "CR" | 3 |
| `SCORER` | `"Scorer"` | "Scorer" | "SC" | 4 |
| `ASSISTANT_SCORER` | `"AssistantScorer"` | "Assistant Scorer" | "AS" | 5 |
| `LINE_JUDGE_1` | `"LineJudge1"` | "Line Judge 1" | "LJ1" | 6 |
| `LINE_JUDGE_2` | `"LineJudge2"` | "Line Judge 2" | "LJ2" | 7 |
| `LINE_JUDGE_3` | `"LineJudge3"` | "Line Judge 3" | "LJ3" | 8 |
| `LINE_JUDGE_4` | `"LineJudge4"` | "Line Judge 4" | "LJ4" | 9 |
| `TECHNICAL_OFFICIAL` | `"TechnicalOfficial"` | "Technical Official" | "TO" | 10 |
| `TOURNAMENT_DIRECTOR` | `"TournamentDirector"` | "Tournament Director" | "TD" | 11 |
| `MATCH_COMMISSIONER` | `"MatchCommissioner"` | "Match Commissioner" | "MC" | 12 |

**Notes:**
- Priority determines display order (1 = first, 12 = last)
- Primary roles (R1, R2) always displayed inline in compact views
- Supporting roles (CR, Scorer, LJ) shown in expanded/detail views
- Last 3 roles exist in codebase but not part of this feature scope

---

### 3. Match Officials Collection (Derived Structure)

Grouped representation of all officials assigned to a match, organized by role type.

**Structure:**

```typescript
interface MatchOfficials {
  primaryReferees: {
    first?: Official;   // Referee 1
    second?: Official;  // Referee 2
  };
  challengeReferee?: Official;
  scoringOfficials: {
    scorer?: Official;
    assistantScorer?: Official;
  };
  lineJudges: Official[];  // 0-4 line judges, ordered by position
}
```

**Derived From:** `BeachMatch` flat structure
**Transformation Logic:** Services/BeachMatchService.extractOfficials()

**Validation Rules:**
- `lineJudges` array length must be 0-4
- Line judges must be ordered by position (LineJudge1, LineJudge2, ...)
- At least one official must be present (typically R1)

**Example:**
```typescript
{
  primaryReferees: {
    first: { no: "101", name: "John Smith", federation: "USA", role: OfficialRole.REFEREE_1 },
    second: { no: "102", name: "Jane Doe", federation: "CAN", role: OfficialRole.REFEREE_2 }
  },
  challengeReferee: { no: "103", name: "Mike Johnson", federation: "GER", role: OfficialRole.CHALLENGE_REFEREE },
  scoringOfficials: {
    scorer: { no: "201", name: "Sarah Lee", federation: "KOR", role: OfficialRole.SCORER },
    assistantScorer: { no: "202", name: "Tom Wilson", federation: "AUS", role: OfficialRole.ASSISTANT_SCORER }
  },
  lineJudges: [
    { no: "301", name: "Lisa Brown", federation: "USA", role: OfficialRole.LINE_JUDGE_1 },
    { no: "302", name: "David Kim", federation: "KOR", role: OfficialRole.LINE_JUDGE_2 }
  ]
}
```

---

### 4. BeachMatch (Extended Interface)

The core match entity extended with additional official fields.

**New Attributes:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `NoScorer` | `string` | No | Scorer VIS ID |
| `ScorerName` | `string` | No | Scorer full name |
| `ScorerFederationCode` | `string` | No | Scorer federation code |
| `NoAssistantScorer` | `string` | No | Assistant Scorer VIS ID |
| `AssistantScorerName` | `string` | No | Assistant Scorer full name |
| `AssistantScorerFederationCode` | `string` | No | Assistant Scorer federation |
| `NoLineJudge1` | `string` | No | Line Judge 1 VIS ID |
| `LineJudge1Name` | `string` | No | Line Judge 1 full name |
| `LineJudge1FederationCode` | `string` | No | Line Judge 1 federation |
| `NoLineJudge2` | `string` | No | Line Judge 2 VIS ID |
| `LineJudge2Name` | `string` | No | Line Judge 2 full name |
| `LineJudge2FederationCode` | `string` | No | Line Judge 2 federation |
| `NoLineJudge3` | `string` | No | Line Judge 3 VIS ID |
| `LineJudge3Name` | `string` | No | Line Judge 3 full name |
| `LineJudge3FederationCode` | `string` | No | Line Judge 3 federation |
| `NoLineJudge4` | `string` | No | Line Judge 4 VIS ID |
| `LineJudge4Name` | `string` | No | Line Judge 4 full name |
| `LineJudge4FederationCode` | `string` | No | Line Judge 4 federation |

**Backward Compatibility:**
- All new fields are optional
- Existing `NoReferee1`, `Referee1Name`, etc. remain unchanged
- Existing code that doesn't access new fields continues to work
- No migration required for cached data

**Validation Rules:**
- All `No*` fields must be numeric strings if present
- All `*Name` fields must not be empty strings (prefer undefined)
- Federation codes must be 2-3 uppercase letters if present

---

## Relationships

```
┌─────────────────┐
│     Match       │
│  (BeachMatch)   │
└────────┬────────┘
         │
         │ has many
         ▼
┌─────────────────┐
│    Official     │
│  (derived)      │
└────────┬────────┘
         │
         │ has one
         ▼
┌─────────────────┐
│  OfficialRole   │
│   (enum)        │
└─────────────────┘
```

**Cardinality:**
- Match → Officials: 1 to 0..10 (typically 2-8)
- Official → Role: 1 to 1 (each official has exactly one role per match)
- Official → Referee: 0 to 1 (official may be registered referee)

---

## State Transitions

### Official Assignment States

Officials don't have explicit state in this read-only implementation, but implicit states exist:

```
[Not Assigned] → [Assigned] → [Serving] → [Completed]
     │              │            │            │
     │              │            │            │
     └──────────────┴────────────┴────────────┘
              (Future: real-time status tracking)
```

**Current Implementation**: Officials are either assigned (name present) or not assigned (name null/undefined). No intermediate states.

**Future Consideration**: If real-time official tracking is added (Out of Scope), states could include:
- `Not Assigned` - Position empty
- `Assigned` - Official designated but not on-site
- `En Route` - Official traveling to venue
- `On Site` - Official arrived at venue
- `Serving` - Currently officiating
- `Completed` - Match finished, official released

---

## Data Flow

### 1. VIS API → BeachMatch (Fetch & Parse)

```
VIS API (XML)
    │
    ├─ GetBeachMatchList (with field selection)
    │
    ▼
VisResponseParser.parseBeachMatch()
    │
    ├─ Extract flat official fields
    │  (NoScorer, ScorerName, LineJudge1Name, etc.)
    │
    ▼
BeachMatch interface (extended)
    │
    ├─ Flat structure with optional official fields
    │
    ▼
MMKV Cache (persisted)
```

### 2. BeachMatch → MatchOfficials (Transform)

```
BeachMatch (flat structure)
    │
    ▼
BeachMatchService.extractOfficials()
    │
    ├─ Check for official name presence
    ├─ Group by role type
    ├─ Build official objects
    │
    ▼
MatchOfficials (nested structure)
    │
    ├─ primaryReferees: { first, second }
    ├─ challengeReferee
    ├─ scoringOfficials: { scorer, assistantScorer }
    ├─ lineJudges: Official[]
    │
    ▼
UI Components (display)
```

### 3. Filtering Flow (P3 User Story)

```
User: Select official filter
    │
    ▼
MatchProcessingService.filterByOfficial()
    │
    ├─ Check match.NoReferee1 === officialNo
    ├─ Check match.NoReferee2 === officialNo
    ├─ Check match.NoScorer === officialNo
    ├─ Check match.NoAssistantScorer === officialNo
    ├─ Check match.NoLineJudge1-4 === officialNo
    │
    ▼
Filtered matches displayed
    │
    ├─ Highlight matching official's role
    │
    ▼
User sees matches where they serve in any capacity
```

---

## Cache Strategy

### Official Data Caching

**Cache Level 1 (Memory)**:
- Officials cached as part of match object
- LRU eviction when memory limit reached
- Immediate access (<1ms)

**Cache Level 2 (MMKV)**:
- Match data including officials persisted
- Survives app restarts
- Fast access (<5ms)
- 30x faster than AsyncStorage

**Cache Level 3 (VIS API)**:
- Officials fetched with match data via GetBeachMatchList
- No separate API call for officials
- Adaptive TTL based on match status:
  - Running match: 5s TTL (live updates)
  - Scheduled match: 15s TTL (frequent changes)
  - Finished match: 24h TTL (static data)

**Cache Invalidation**:
- Match status change triggers invalidation
- Officials updated automatically with match data
- No manual invalidation required

---

## Validation & Error Handling

### Data Validation

**Parse-time Validation** (services/parsing/VisResponseParser.ts):
```typescript
function validateOfficial(no?: string, name?: string, federation?: string): boolean {
  // Name is primary indicator - if no name, official not assigned
  if (!name || name.trim() === '') {
    return false; // Not assigned
  }

  // No should be numeric if present
  if (no && !/^\d+$/.test(no)) {
    console.warn(`Invalid official No: ${no}`);
    return false;
  }

  // Federation should be 2-3 uppercase letters if present
  if (federation && !/^[A-Z]{2,3}$/.test(federation)) {
    console.warn(`Invalid federation code: ${federation}`);
    // Don't reject - still display official with invalid/missing federation
  }

  return true;
}
```

**Runtime Validation** (UI layer):
```typescript
function shouldDisplayOfficial(official?: Official): boolean {
  return official !== undefined && official.name.trim() !== '';
}
```

### Error Scenarios

| Scenario | Handling | User Experience |
|----------|----------|-----------------|
| **No officials assigned** | Return empty MatchOfficials object | Display "Officials: Not yet assigned" |
| **Partial official data** | Create official with available fields | Display name only, omit missing federation |
| **Invalid federation code** | Log warning, display official anyway | Show name + "Unknown federation" or blank |
| **VIS API timeout** | Fall back to cached data | Display last known officials |
| **Parsing error** | Log error, return undefined for that official | Skip that official, show others |
| **All fields null** | Return undefined for MatchOfficials | Display primary referees only (existing behavior) |

---

## Performance Considerations

### Memory Impact

**Per Match** (additional memory):
- 10 new optional fields: ~20 bytes per field = 200 bytes
- Typical match with 4 officials: 4 * 60 bytes = 240 bytes
- **Total per match: ~440 bytes additional**

**For 100 cached matches**:
- Additional memory: ~44KB
- Total match cache (before): ~500KB
- Total match cache (after): ~544KB
- **Increase: 8.8%** (acceptable)

### Parse Performance

**Parsing Overhead** (per match):
- Existing referee extraction: ~0.5ms
- Additional official extraction: ~1.0ms (Scorer, Asst Scorer, 4x Line Judges)
- **Total parse time: ~1.5ms** (negligible)

**For 100 matches**:
- Existing parse time: ~50ms
- New parse time: ~150ms
- **Increase: 100ms** (within budget)

---

## Migration Path

### Phase 1: Type Extensions (No Data Migration)

All new fields are optional - **no migration required**.

**Approach:**
1. Extend BeachMatch interface with optional official fields
2. Existing cached matches work without officials (undefined)
3. New API requests return officials (if present)
4. Gradual data enrichment as cache refreshes

### Phase 2: UI Updates (Progressive Enhancement)

**Approach:**
1. P1 (Basic Display): Show officials when available, hide when not
2. P2 (Role Labels): Add role labels to official display
3. P3 (Filtering): Extend filters to include all officials

**Rollback Strategy:**
- All UI changes behind feature flag (if needed)
- Remove official display components → fall back to referee-only display
- No data cleanup required (optional fields ignored)

---

## Testing Strategy

### Data Validation Tests

```typescript
describe('Official Data Validation', () => {
  it('should accept valid official with all fields', () => {
    const official = { no: "12345", name: "John Smith", federation: "USA" };
    expect(validateOfficial(official.no, official.name, official.federation)).toBe(true);
  });

  it('should reject official with empty name', () => {
    const official = { no: "12345", name: "", federation: "USA" };
    expect(validateOfficial(official.no, official.name, official.federation)).toBe(false);
  });

  it('should accept official without federation', () => {
    const official = { no: "12345", name: "John Smith", federation: undefined };
    expect(validateOfficial(official.no, official.name, official.federation)).toBe(true);
  });

  it('should warn but accept official with invalid federation', () => {
    const official = { no: "12345", name: "John Smith", federation: "INVALID" };
    expect(validateOfficial(official.no, official.name, official.federation)).toBe(true);
    // Expect console.warn to be called
  });
});
```

### Transformation Tests

```typescript
describe('extractOfficials', () => {
  it('should extract all officials from complete match data', () => {
    const matchData = {
      Referee1Name: "John Smith", NoReferee1: "101", Referee1FederationCode: "USA",
      ScorerName: "Jane Doe", NoScorer: "201", ScorerFederationCode: "CAN",
      LineJudge1Name: "Mike Johnson", NoLineJudge1: "301"
    };

    const officials = extractOfficials(matchData);

    expect(officials.primaryReferees.first).toEqual({
      no: "101", name: "John Smith", federation: "USA"
    });
    expect(officials.scoringOfficials.scorer).toEqual({
      no: "201", name: "Jane Doe", federation: "CAN"
    });
    expect(officials.lineJudges).toHaveLength(1);
  });

  it('should handle match with only primary referees', () => {
    const matchData = {
      Referee1Name: "John Smith", NoReferee1: "101"
    };

    const officials = extractOfficials(matchData);

    expect(officials.primaryReferees.first).toBeDefined();
    expect(officials.challengeReferee).toBeUndefined();
    expect(officials.scoringOfficials.scorer).toBeUndefined();
    expect(officials.lineJudges).toHaveLength(0);
  });

  it('should return undefined for match with no officials', () => {
    const matchData = { No: "123", TeamAName: "Team A" };
    const officials = extractOfficials(matchData);
    expect(officials).toBeUndefined();
  });
});
```

---

## Summary

**Entities Added/Modified:**
- ✅ Extended `BeachMatch` interface with 15 optional official fields
- ✅ Extended `OfficialRole` enum with 6 new roles
- ✅ Created `MatchOfficials` derived structure
- ✅ Created `Official` interface for typed official data

**Key Design Decisions:**
- Flat structure in BeachMatch (matches VIS API, backward compatible)
- Nested structure in MatchOfficials (organized for UI display)
- Optional fields throughout (no migration required)
- Role-based grouping (primary, challenge, scoring, line judges)

**Performance Impact:**
- +440 bytes per match (~8.8% memory increase)
- +1ms parsing overhead per match (negligible)
- No additional API calls (officials in existing requests)

**Next Steps:**
- Generate TypeScript contracts (match-officials.ts, vis-api-fields.ts)
- Create VIS API test script (test-match-officials.js)
- Document implementation workflow (quickstart.md)
