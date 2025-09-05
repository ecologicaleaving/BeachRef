# VIS API Field Reference - Official Documentation

## Overview

This document serves as the authoritative reference for VIS (Volleyball Information System) API field names, data types, and structure based on the official VIS documentation and `BeachLive.xsd` schema.

## Beach Match Fields (BeachLive.xsd)

### Required Fields

| Field Name | Data Type | Required | Description |
|------------|-----------|----------|-------------|
| `No` | `xs:positiveInteger` | ✅ | Match number |
| `NoInTournament` | `xs:positiveInteger` | ✅ | Match number within tournament |
| `Format` | `BeachMatchFormat` | ✅ | Match format specification |

### Match Identification

| Field Name | Data Type | Description |
|------------|-----------|-------------|
| `No` | `xs:positiveInteger` | Unique match number |
| `NoInTournament` | `xs:positiveInteger` | Sequential match number in tournament |

### Date & Time Fields

| Field Name | Data Type | Description |
|------------|-----------|-------------|
| `LocalDate` | `xs:date` | Scheduled date in local time |
| `LocalTime` | `xs:time` | Scheduled time in local time |
| `UtcDate` | `xs:date` | Scheduled date in UTC |
| `UtcTime` | `xs:time` | Scheduled time in UTC |
| `BeginDateTimeUtc` | `xs:dateTime` | Actual match start time (UTC) |
| `EndDateTimeUtc` | `xs:dateTime` | Actual match end time (UTC) |

### Location & Venue

| Field Name | Data Type | Description |
|------------|-----------|-------------|
| `City` | `xs:string` | Tournament city |
| `Court` | `xs:string` | Court identifier/number |
| `Venue` | `xs:string` | Venue name |

### Team A Fields

| Field Name | Data Type | Description |
|------------|-----------|-------------|
| `TeamAName` | `xs:string` | Team A official name |
| `TeamAPlayer1` | `xs:string` | Team A Player 1 name |
| `TeamAPlayer2` | `xs:string` | Team A Player 2 name |
| `TeamAFederationCode` | `xs:string` | Team A country/federation code |
| `TeamARanking` | `xs:byte` | Team A starting tournament ranking |

### Team B Fields

| Field Name | Data Type | Description |
|------------|-----------|-------------|
| `TeamBName` | `xs:string` | Team B official name |
| `TeamBPlayer1` | `xs:string` | Team B Player 1 name |
| `TeamBPlayer2` | `xs:string` | Team B Player 2 name |
| `TeamBFederationCode` | `xs:string` | Team B country/federation code |
| `TeamBRanking` | `xs:byte` | Team B starting tournament ranking |

### Match Results

| Field Name | Data Type | Description |
|------------|-----------|-------------|
| `MatchPointsA` | `xs:nonNegativeInteger` | Sets won by Team A |
| `MatchPointsB` | `xs:nonNegativeInteger` | Sets won by Team B |
| `WinnerRank` | `xs:byte` | Final ranking for winning team |
| `LoserRank` | `xs:byte` | Final ranking for losing team |
| `ResultTypeText` | `xs:string` | Additional result information |

### Referee Fields

| Field Name | Data Type | Description |
|------------|-----------|-------------|
| `NoReferee1` | `xs:positiveInteger` | First referee number |
| `NoReferee2` | `xs:positiveInteger` | Second referee number |
| `NoRefereeChallenge` | `xs:positiveInteger` | Challenge referee number |
| `Referee1Name` | `xs:string` | First referee full name |
| `Referee2Name` | `xs:string` | Second referee full name |
| `Referee1FederationCode` | `xs:string` | First referee country code |
| `Referee2FederationCode` | `xs:string` | Second referee country code |

### Environmental Data

| Field Name | Data Type | Unit | Description |
|------------|-----------|------|-------------|
| `Temperature` | `xs:int` | 1/100 °C | Temperature at court |
| `Humidity` | `xs:nonNegativeInteger` | 1/10 % | Humidity percentage |
| `NbSpectators` | `xs:nonNegativeInteger` | count | Number of spectators |

### Performance Statistics

| Field Name | Data Type | Unit | Description |
|------------|-----------|------|-------------|
| `FastestServeTeamAPlayer1` | `xs:positiveInteger` | km/h | Fastest serve speed Team A Player 1 |
| `FastestServeTeamAPlayer2` | `xs:positiveInteger` | km/h | Fastest serve speed Team A Player 2 |
| `FastestServeTeamBPlayer1` | `xs:positiveInteger` | km/h | Fastest serve speed Team B Player 1 |
| `FastestServeTeamBPlayer2` | `xs:positiveInteger` | km/h | Fastest serve speed Team B Player 2 |

## Set-Level Fields (Available in GetBeachLive)

### Set Timing

| Field Name | Data Type | Unit | Description |
|------------|-----------|------|-------------|
| `Duration` | `xs:nonNegativeInteger` | seconds | Duration of the set |
| `BeginTimeOffset` | `TimeOffset` | time | Time offset from match start |

### Set Statistics

| Field Name | Data Type | Description |
|------------|-----------|-------------|
| `NbChallengeAcceptedTeamA` | `xs:nonNegativeInteger` | Successful challenges by Team A |
| `NbChallengeAcceptedTeamB` | `xs:nonNegativeInteger` | Successful challenges by Team B |

## API Endpoints & Field Availability

### GetBeachMatchList
**Returns**: Basic match information
**Available Fields**:
- All match identification fields
- Team information (names, rankings, federation codes)
- Basic scheduling (LocalDate, LocalTime)
- Match results (MatchPointsA, MatchPointsB)
- Referee assignments (names and federation codes)

**NOT Available**:
- Individual set scores
- Set durations
- Detailed statistics

### GetBeachLive  
**Returns**: Complete live match data
**Available Fields**:
- All GetBeachMatchList fields
- Set-by-set information
- Individual set durations
- Challenge statistics
- Real-time updates

## Data Type Specifications

### BeachMatchFormat
Enumerated values for match format:
- `BestOf3` - Best of 3 sets
- `BestOf5` - Best of 5 sets (rare in beach volleyball)
- `Timed` - Time-limited format

### TimeOffset
Time format: `HH:MM:SS` (e.g., "00:25:30")

### Federation Codes
3-letter country codes following IOC standards:
- `USA` - United States
- `BRA` - Brazil  
- `ITA` - Italy
- `NOR` - Norway
- etc.

## Field Validation Rules

### Required Field Validation
```xml
<!-- These fields MUST be present in valid responses -->
<xs:attribute name="No" type="xs:positiveInteger" use="required"/>
<xs:attribute name="NoInTournament" type="xs:positiveInteger" use="required"/>  
<xs:attribute name="Format" type="BeachMatchFormat" use="required"/>
```

### Optional Field Behavior
- Missing optional fields are **omitted** from XML (not empty tags)
- Numeric fields default to `0` when missing
- String fields are `null`/`undefined` when missing

## Common Field Patterns

### Team Data Pattern
All team-related fields follow `Team{A|B}{Field}` pattern:
- `TeamAName` / `TeamBName`
- `TeamAPlayer1` / `TeamBPlayer1` 
- `TeamARanking` / `TeamBRanking`

### Referee Data Pattern
Referee fields follow `{Role}{Number}` or `Referee{Number}{Field}` pattern:
- `NoReferee1` / `NoReferee2`
- `Referee1Name` / `Referee2Name`
- `Referee1FederationCode` / `Referee2FederationCode`

### Time Data Pattern
Multiple time representations for same event:
- `LocalDate` + `LocalTime` (venue timezone)
- `UtcDate` + `UtcTime` (UTC timezone)  
- `BeginDateTimeUtc` / `EndDateTimeUtc` (actual times)

## Important Implementation Notes

### Duration Calculation
- **Match Duration**: Calculate from `BeginDateTimeUtc` - `EndDateTimeUtc`
- **Set Duration**: Only available in `GetBeachLive` endpoint as `Duration` attribute in seconds

### Ranking Data
- `TeamARanking` / `TeamBRanking`: **Starting** tournament rankings
- `WinnerRank` / `LoserRank`: **Final** tournament rankings after match

### Missing Data Handling
- Fields may be completely absent if data not available
- Do NOT assume default values - check for field existence
- Temperature in 1/100 °C requires division by 100 for display
- Humidity in 1/10 % requires division by 10 for display

---

**Source**: VIS BeachLive.xsd Schema v2024  
**Document Version**: 1.0  
**Last Updated**: 2025-01-01  
**Status**: Authoritative Reference