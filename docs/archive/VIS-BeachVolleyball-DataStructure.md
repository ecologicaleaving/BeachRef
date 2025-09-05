# VIS Beach Volleyball Data Structure Architecture

## Overview

This document describes the comprehensive data architecture for the VIS (Volleyball Information System) Beach Volleyball data structures used in the BeachRef application. It covers the complete data flow from the VIS XML API through to the application's immutable domain models.

## Data Flow Architecture

```
VIS XML API → VisResponseParser → BeachMatchCore → UI Components
     ↓              ↓                    ↓            ↓
BeachLive.xsd   XML Parsing      Type-Safe       React Native
              & Transformation   Domain Model      Components
```

## VIS XML Schema Structure

### Root Structure (BeachLive.xsd)

The VIS API returns beach volleyball data in XML format following the `BeachLive.xsd` schema:

```xml
<BeachLive>
  <Match>
    <BeachMatch>
      <!-- Match attributes -->
    </BeachMatch>
    <Events>
      <Comment />
    </Events>
    <PlayerStatistics />
    <TeamStatistics />
  </Match>
</BeachLive>
```

### Core BeachMatch Attributes

#### Required Fields
- `No` (xs:positiveInteger) - Match number
- `NoInTournament` (xs:positiveInteger) - Match number within tournament
- `Format` (BeachMatchFormat) - Match format specification

#### Scheduling & Timing
- `LocalDate` (xs:date) - Scheduled date in local time
- `LocalTime` (xs:time) - Scheduled time in local time  
- `UtcDate` (xs:date) - UTC date
- `UtcTime` (xs:time) - UTC time
- `BeginDateTimeUtc` (xs:dateTime) - Actual match start time
- `EndDateTimeUtc` (xs:dateTime) - Actual match end time

#### Location & Environment
- `City` (xs:string) - Tournament city
- `Court` (xs:string) - Court identifier
- `Venue` (xs:string) - Venue name
- `Temperature` (xs:int) - Temperature in 1/100 °C
- `Humidity` (xs:nonNegativeInteger) - Humidity in 1/10 %
- `NbSpectators` (xs:nonNegativeInteger) - Number of spectators

#### Team Information
- `TeamAName` / `TeamBName` (xs:string) - Team names
- `TeamAPlayer1` / `TeamAPlayer2` (xs:string) - Player names for Team A
- `TeamBPlayer1` / `TeamBPlayer2` (xs:string) - Player names for Team B
- `TeamAFederationCode` / `TeamBFederationCode` (xs:string) - Country codes
- `TeamARanking` / `TeamBRanking` (xs:byte) - Team starting rankings

#### Match Results
- `MatchPointsA` / `MatchPointsB` (xs:nonNegativeInteger) - Sets won by each team
- `WinnerRank` / `LoserRank` (xs:byte) - Final rankings
- `ResultTypeText` (xs:string) - Additional result information

#### Officials
- `NoReferee1` / `NoReferee2` (xs:positiveInteger) - Referee numbers
- `NoRefereeChallenge` (xs:positiveInteger) - Challenge referee number
- `Referee1Name` / `Referee2Name` (xs:string) - Referee names
- `Referee1FederationCode` / `Referee2FederationCode` (xs:string) - Referee countries

#### Performance Statistics
- `FastestServeTeamAPlayer1` / `FastestServeTeamAPlayer2` (xs:positiveInteger) - Serve speeds in km/h
- `FastestServeTeamBPlayer1` / `FastestServeTeamBPlayer2` (xs:positiveInteger) - Serve speeds in km/h

### Set-Level Data Structure

Individual sets contain detailed timing and statistical information:

```xml
<Set>
  <!-- Set attributes -->
  <Duration type="xs:nonNegativeInteger">1420</Duration> <!-- Duration in seconds -->
  <BeginTimeOffset type="TimeOffset">00:03:45</BeginTimeOffset>
  <NbChallengeAcceptedTeamA type="xs:nonNegativeInteger">2</NbChallengeAcceptedTeamA>
  <NbChallengeAcceptedTeamB type="xs:nonNegativeInteger">1</NbChallengeAcceptedTeamB>
</Set>
```

**Important**: Individual set data including duration is only available through the `GetBeachLive` API endpoint, not through `GetBeachMatchList`.

## TypeScript Domain Model

### Core Data Types

#### BeachMatchCore Interface

```typescript
export interface BeachMatchCore extends VisEntity {
  // Identity
  readonly tournamentId: string;
  readonly matchCode: string;
  readonly round: string;
  readonly phaseCode?: string;
  
  // Status & Scheduling
  readonly status: MatchStatus;
  readonly scheduledDateTime: string;
  readonly actualStartTime?: string;
  readonly actualEndTime?: string;
  
  // Location
  readonly court: CourtInfo;
  
  // Teams
  readonly team1: MatchTeam;
  readonly team2: MatchTeam;
  
  // Result & Officials
  readonly result?: MatchResult;
  readonly refereeAssignments: readonly RefereeAssignment[];
  
  // Metadata
  readonly notes?: string;
  readonly weather?: string;
  readonly importance?: 'LOW' | 'MEDIUM' | 'HIGH' | 'FINAL';
}
```

#### Match Status Enumeration

```typescript
export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',    // Match scheduled but not started
  RUNNING = 'RUNNING',        // Match in progress
  FINISHED = 'FINISHED',      // Match completed normally
  INTERRUPTED = 'INTERRUPTED', // Match suspended/interrupted
  CANCELLED = 'CANCELLED',    // Match cancelled
  POSTPONED = 'POSTPONED',    // Match postponed
  TBD = 'TBD'                // Time/date to be determined
}
```

#### Team Data Structure

```typescript
export interface MatchTeam {
  readonly teamNumber: 1 | 2;
  readonly teamName: string;
  readonly player1Name: string;
  readonly player2Name: string;
  readonly countryCode?: string;
  readonly ranking?: number;        // Starting tournament ranking
}
```

#### Match Result Structure

```typescript
export interface MatchResult {
  readonly team1Sets: number;        // Sets won by team 1
  readonly team2Sets: number;        // Sets won by team 2
  readonly setScores: readonly number[]; // Individual set scores
  readonly duration?: number;        // Match duration in minutes
  readonly winner?: 1 | 2;          // Winning team number
  readonly forfeit?: boolean;       // True if forfeit/walkover
}
```

#### Court Information

```typescript
export interface CourtInfo {
  readonly courtNumber: string;     // Court identifier (e.g., "1", "CC")
  readonly courtName?: string;      // Human-readable court name
  readonly surface?: string;        // Court surface type
  readonly location?: string;       // Court location description
}
```

## Data Transformation Pipeline

### VIS XML to TypeScript Mapping

The `VisResponseParser` class handles the transformation from VIS XML to TypeScript domain objects:

#### Match Parsing Flow

```typescript
parseMatchFromXml(matchXml: string, tournamentId: string): BeachMatchCore | null
  ↓
1. Extract basic match information (No, NoInTournament, etc.)
2. Parse scheduling data (LocalDate, LocalTime → scheduledDateTime)
3. Parse teams (parseMatchTeam for Team A & B)
4. Parse referees (parseMatchReferees)
5. Parse results (parseMatchResult)
6. Generate stable match ID
7. Return immutable BeachMatchCore object
```

#### Key Transformations

| VIS XML Field | TypeScript Field | Transformation |
|---------------|------------------|----------------|
| `No` | `visNo` | Direct string mapping |
| `LocalDate` + `LocalTime` | `scheduledDateTime` | ISO datetime string |
| `TeamAName` | `team1.teamName` | Direct mapping |
| `TeamARanking` | `team1.ranking` | parseInt with undefined fallback |
| `MatchPointsA` | `result.team1Sets` | parseInt with 0 fallback |
| `StartTime` + `EndTime` | `result.duration` | Calculate minutes difference |
| `Court` | `court.courtNumber` | Direct string mapping |

### Duration Calculation Logic

Duration is calculated at the match level from start and end times:

```typescript
// In VisResponseParser.parseMatchResult()
const startTime = this.extractXmlAttribute(matchXml, 'StartTime');
const endTime = this.extractXmlAttribute(matchXml, 'EndTime');

let duration: number | undefined;
if (startTime && endTime) {
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  const durationResult = calculateMatchDuration(startDate, endDate);
  duration = durationResult.totalMinutes; // Stored as number (minutes)
}
```

**Note**: Individual set durations require separate `GetBeachLive` API calls and are not available in the standard match list.

## Data Validation & Type Safety

### Type Guards

```typescript
export function isBeachMatchCore(obj: any): obj is BeachMatchCore {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.visNo === 'string' &&
    typeof obj.tournamentId === 'string' &&
    Object.values(MatchStatus).includes(obj.status) &&
    // ... additional validation
  );
}
```

### Status Mapping

VIS status strings are mapped to strongly-typed enums:

```typescript
export function mapVisMatchStatus(visStatus?: string): MatchStatus {
  const status = visStatus?.toLowerCase().trim();
  switch (status) {
    case 'running': case 'live': return MatchStatus.RUNNING;
    case 'finished': case 'completed': return MatchStatus.FINISHED;
    case 'cancelled': case 'canceled': return MatchStatus.CANCELLED;
    // ... additional mappings
    default: return MatchStatus.SCHEDULED;
  }
}
```

## Performance Considerations

### Immutability & Memory

- All domain objects are `readonly` for immutability
- No circular references to prevent memory leaks
- Efficient JSON serialization for caching

### Caching Strategy

```typescript
// In CacheService.ts
DurationSet1: item.DurationSet1 || item.duration_set1,
DurationSet2: item.DurationSet2 || item.duration_set2,
DurationSet3: item.DurationSet3 || item.duration_set3,
```

Legacy duration fields are preserved in cache for backward compatibility.

## API Endpoint Coverage

### GetBeachMatchList
- **Purpose**: Retrieve match listings for tournaments
- **Returns**: Basic match data with team info, scheduling, and results
- **Limitations**: No individual set scores or detailed statistics

### GetBeachLive  
- **Purpose**: Retrieve detailed live match data
- **Returns**: Complete match data including set-by-set information
- **Use Case**: Required for individual set durations and detailed statistics

## Data Model Evolution

### Version 2 Architecture (Current)

- Immutable domain objects
- Strongly typed enums
- Comprehensive validation
- Performance-optimized caching
- Clean separation of VIS API concerns

### Legacy Support

The system maintains compatibility with legacy data formats while providing modern TypeScript interfaces for new development.

## Integration Points

### UI Component Integration

```typescript
// In MatchListV2.tsx
const getMatchDuration = (match: ExtendedBeachMatch): string | null => {
  // Try match-level duration first (from start/end times)
  if (match.result?.duration && typeof match.result.duration === 'number') {
    const totalMinutes = match.result.duration;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }
  
  // Fallback to individual set durations (if available)
  return calculateTotalDuration(
    matchWithDuration.DurationSet1,
    matchWithDuration.DurationSet2,
    matchWithDuration.DurationSet3
  );
};
```

### State Management Integration

The immutable domain models integrate seamlessly with React's state management and enable efficient change detection and re-rendering optimization.

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-01  
**Maintainer**: Architecture Team  
**Status**: Living Document - Updates with API changes**