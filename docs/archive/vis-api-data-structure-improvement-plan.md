# VIS API Data Structure Improvement Plan

## Executive Summary

Analysis of the current BeachRef data structures against the official VIS API Field Reference reveals critical type inconsistencies, missing required fields, and architectural fragmentation that impacts type safety and VIS compliance.

## Critical Issues Identified

### 1. Type Inconsistency: String vs Number
**Problem**: Current `BeachMatch` interface uses `string` for all VIS fields, but official schema specifies numeric types.

**Current (Problematic)**:
```typescript
No: string;              // Should be number (xs:positiveInteger)
NoInTournament?: string; // Should be number (xs:positiveInteger)
MatchPointsA?: string;   // Should be number (xs:nonNegativeInteger)
MatchPointsB?: string;   // Should be number (xs:nonNegativeInteger)
```

**VIS Schema Requirements**:
```xml
<xs:attribute name="No" type="xs:positiveInteger" use="required"/>
<xs:attribute name="NoInTournament" type="xs:positiveInteger" use="required"/>
<xs:attribute name="MatchPointsA" type="xs:nonNegativeInteger"/>
```

### 2. Missing Required Fields
- `Format` (BeachMatchFormat) - **Required per schema**
- Environmental data (`Temperature`, `Humidity`, `NbSpectators`)
- Performance statistics (fastest serves for all players)
- Challenge referee assignments (`NoRefereeChallenge`)

### 3. Field Naming Misalignment

| Current Field | VIS Schema Field | Status |
|---------------|------------------|--------|
| `TeamACountryCode` | `TeamAFederationCode` | ❌ Inconsistent |
| `TeamBCountryCode` | `TeamBFederationCode` | ❌ Inconsistent |
| `Court` | `Court` | ✅ Correct |

### 4. Duration Handling Gap
- Current: Expects `DurationSet1/2/3` in "mm:ss" format
- VIS Schema: Set durations in **seconds** (xs:nonNegativeInteger)
- VIS Schema: Match durations from `BeginDateTimeUtc` - `EndDateTimeUtc`

### 5. Data Model Fragmentation
**4 Different Match Interfaces**:
- `BeachMatch` (types/match.ts)
- `BeachLiveMatch` (types/beach-live.ts)  
- `BeachMatchCore` (types/match-v2.ts)
- API types (types/api-v2.ts)

**Issues**:
- Type confusion across services
- Duplicate field definitions
- Conversion overhead between types

## Recommended Solution Architecture

### Phase 1: Type Safety & VIS Compliance 🎯

**Create unified VIS-compliant interface**:

```typescript
// New: VIS-compliant unified match interface
export interface VisCompliantMatch {
  // REQUIRED fields (per schema)
  readonly No: number;                    // xs:positiveInteger (required)
  readonly NoInTournament: number;        // xs:positiveInteger (required)
  readonly Format: BeachMatchFormat;      // BeachMatchFormat (required)
  
  // Core match data
  readonly LocalDate?: string;            // xs:date
  readonly LocalTime?: string;            // xs:time
  readonly UtcDate?: string;              // xs:date
  readonly UtcTime?: string;              // xs:time
  readonly BeginDateTimeUtc?: string;     // xs:dateTime
  readonly EndDateTimeUtc?: string;       // xs:dateTime
  
  // Team information (VIS-compliant naming)
  readonly TeamAName?: string;
  readonly TeamBName?: string;
  readonly TeamAPlayer1?: string;
  readonly TeamAPlayer2?: string;
  readonly TeamBPlayer1?: string;
  readonly TeamBPlayer2?: string;
  readonly TeamAFederationCode?: string; // Not TeamACountryCode
  readonly TeamBFederationCode?: string; // Not TeamBCountryCode
  readonly TeamARanking?: number;         // xs:byte
  readonly TeamBRanking?: number;         // xs:byte
  
  // Results (proper numeric types)
  readonly MatchPointsA?: number;         // xs:nonNegativeInteger
  readonly MatchPointsB?: number;         // xs:nonNegativeInteger
  readonly WinnerRank?: number;           // xs:byte
  readonly LoserRank?: number;            // xs:byte
  
  // Location
  readonly Court?: string;
  readonly City?: string;
  readonly Venue?: string;
  
  // Officials (proper numeric types)
  readonly NoReferee1?: number;           // xs:positiveInteger
  readonly NoReferee2?: number;           // xs:positiveInteger  
  readonly NoRefereeChallenge?: number;   // xs:positiveInteger (NEW)
  readonly Referee1Name?: string;
  readonly Referee2Name?: string;
  readonly Referee1FederationCode?: string;
  readonly Referee2FederationCode?: string;
  
  // Environmental data (NEW)
  readonly Temperature?: number;          // 1/100 °C
  readonly Humidity?: number;             // 1/10 %
  readonly NbSpectators?: number;
  
  // Performance stats (NEW)
  readonly FastestServeTeamAPlayer1?: number; // km/h
  readonly FastestServeTeamAPlayer2?: number; // km/h
  readonly FastestServeTeamBPlayer1?: number; // km/h
  readonly FastestServeTeamBPlayer2?: number; // km/h
  
  // Additional result context
  readonly ResultTypeText?: string;
}

// Match format enum (required field)
export enum BeachMatchFormat {
  BEST_OF_3 = 'BestOf3',
  BEST_OF_5 = 'BestOf5',
  TIMED = 'Timed'
}
```

### Phase 2: Duration System Overhaul ⏱️

**Replace string-based duration parsing**:

```typescript
export interface MatchDuration {
  readonly totalSeconds: number;
  readonly setDurations: readonly number[]; // seconds per set
  readonly actualStartTime?: string;        // ISO timestamp
  readonly actualEndTime?: string;          // ISO timestamp
  readonly isCalculatedFromActual: boolean; // vs estimated from sets
}

export function parseVisDuration(
  beginDateTimeUtc?: string,
  endDateTimeUtc?: string,
  setDurationSeconds?: readonly number[]
): MatchDuration {
  // Priority 1: Calculate from actual VIS timestamps
  if (beginDateTimeUtc && endDateTimeUtc) {
    const start = new Date(beginDateTimeUtc).getTime();
    const end = new Date(endDateTimeUtc).getTime();
    const totalSeconds = Math.floor((end - start) / 1000);
    
    return {
      totalSeconds,
      setDurations: setDurationSeconds || [],
      actualStartTime: beginDateTimeUtc,
      actualEndTime: endDateTimeUtc,
      isCalculatedFromActual: true
    };
  }
  
  // Priority 2: Sum set durations (VIS provides in seconds)
  if (setDurationSeconds?.length) {
    return {
      totalSeconds: setDurationSeconds.reduce((sum, dur) => sum + dur, 0),
      setDurations: setDurationSeconds,
      isCalculatedFromActual: false
    };
  }
  
  return {
    totalSeconds: 0,
    setDurations: [],
    isCalculatedFromActual: false
  };
}
```

### Phase 3: Unified Architecture 🏗️

**Layered approach to replace 4 fragmented interfaces**:

```typescript
// Base VIS data layer (raw API response)
export interface VisMatchRaw extends VisCompliantMatch {
  // Raw XML attributes exactly as received from VIS
}

// Application domain layer (with computed fields)
export interface MatchDomain extends VisCompliantMatch {
  // Computed/derived fields
  readonly id: string;                    // Generated stable ID
  readonly duration: MatchDuration;       // Computed duration
  readonly status: MatchStatus;           // Mapped status
  readonly importance: MatchImportance;   // Calculated importance
  readonly displayTemperature?: string;   // "23.5°C" (from raw /100)
  readonly displayHumidity?: string;      // "65%" (from raw /10)
}

// UI presentation layer (optimized for components)
export interface MatchPresentation extends MatchDomain {
  // UI-specific fields
  readonly displayName: string;           // "Court 1 - Pool A"
  readonly timeDisplay: string;           // "14:30 - 16:15 (1h 45m)"
  readonly teamDisplayA: string;          // "BRA Smith/Jones"
  readonly teamDisplayB: string;          // "USA Miller/Davis"
  readonly statusBadge: StatusBadgeProps; // Pre-computed UI props
}
```

### Phase 4: Enhanced Environmental Features 🌡️

**Leverage VIS environmental data for UX**:

```typescript
export interface MatchEnvironment {
  readonly temperature: {
    readonly celsius: number;              // Converted from /100
    readonly display: string;              // "24.5°C"
    readonly category: 'COLD' | 'MODERATE' | 'HOT';
  };
  readonly humidity: {
    readonly percentage: number;           // Converted from /10
    readonly display: string;              // "68%"
    readonly category: 'LOW' | 'MODERATE' | 'HIGH';
  };
  readonly spectators?: {
    readonly count: number;
    readonly category: 'SMALL' | 'MEDIUM' | 'LARGE' | 'PACKED';
  };
  readonly performance?: {
    readonly fastestServe: number;         // km/h across all players
    readonly averageServe: number;         // km/h
    readonly topPerformer: string;         // Player name
  };
  readonly conditions?: {
    readonly summary: string;              // "Hot, humid conditions"
    readonly warnings?: readonly string[]; // ["High temperature", "Consider hydration"]
  };
}
```

## Implementation Priority Matrix

| Issue | Impact | Effort | Priority |
|-------|---------|---------|----------|
| Type consistency (string→number) | **HIGH** | Medium | 🔥 **CRITICAL** |
| Required Format field | **HIGH** | Low | 🔥 **CRITICAL** |
| Duration system overhaul | Medium | Medium | ⚡ **HIGH** |
| Interface consolidation | Medium | High | ⚡ **HIGH** |
| Environmental data features | Low | Low | 💡 **MEDIUM** |

## Migration Strategy

### Step 1: Foundation (Backward Compatible)
- [ ] Create `VisCompliantMatch` interface in new file
- [ ] Add `BeachMatchFormat` enum
- [ ] Update VIS response parser to handle numeric types
- [ ] Keep existing interfaces for compatibility

### Step 2: Core Services Migration
- [ ] Update `VisResponseParser` to map to new types
- [ ] Migrate `MatchDurationFormatter` to VIS seconds-based system
- [ ] Update cache services to store compliant data
- [ ] Add environmental data parsing

### Step 3: Service Layer Updates
- [ ] Update `MatchProcessingService` to use new types
- [ ] Migrate `MatchRepository` to unified interface
- [ ] Update API integration services
- [ ] Add performance statistics handling

### Step 4: Component Layer
- [ ] Update match display components to use `MatchPresentation`
- [ ] Add environmental data displays (temperature, humidity)
- [ ] Enhance match cards with performance stats
- [ ] Update duration displays to use actual VIS timings

### Step 5: Legacy Cleanup
- [ ] Deprecate old `BeachMatch` interface
- [ ] Remove duplicate match type definitions
- [ ] Update all imports to use unified types
- [ ] Remove string-based duration parsing

## File Structure Changes

```
types/
├── match-vis-compliant.ts      (NEW - Phase 1)
├── match-environment.ts        (NEW - Phase 4)
├── match-presentation.ts       (NEW - Phase 3)
└── [legacy files marked deprecated]

utils/
├── VisDurationParser.ts        (NEW - Replace MatchDurationFormatter)
├── EnvironmentalDataParser.ts  (NEW - Phase 4)
└── MatchDurationFormatter.ts   (DEPRECATE)

services/parsing/
└── VisResponseParser.ts        (UPDATE - Handle numeric types)
```

## Risk Mitigation

### Breaking Changes
- Implement gradual migration with compatibility layer
- Use TypeScript discriminated unions for transition period
- Maintain both old/new parsers during migration

### Data Quality
- Add runtime validation for numeric fields
- Implement fallback parsing for malformed VIS responses
- Add logging for data transformation issues

### Performance Impact
- New environmental features are opt-in
- Use lazy loading for presentation layer transformations
- Cache computed fields appropriately

## Success Metrics

- [ ] All match interfaces use proper VIS numeric types
- [ ] Zero type conversion errors in production
- [ ] Environmental data displayed in match cards
- [ ] Duration calculations use actual VIS timestamps
- [ ] Single source of truth for match data structure

## Timeline Estimate

- **Phase 1**: 1-2 weeks (foundation)
- **Phase 2**: 1 week (duration system)
- **Phase 3**: 2-3 weeks (architecture consolidation)
- **Phase 4**: 1 week (environmental features)
- **Total**: 5-7 weeks

---

**Document Version**: 1.0  
**Created**: 2025-01-01  
**Status**: Planning Phase  
**Owner**: Architecture Team