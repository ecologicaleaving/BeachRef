# Feature Specification: Fix Match Duration Display

**Feature Branch**: `007-fix-match-duration`
**Created**: 2025-01-25
**Status**: Draft
**Input**: User description: "we need to fix the match duration in the tournament details page is always wrong"

## Clarifications

### Session 2025-01-25

- Q: What maximum duration cap should be applied to malformed data? → A: No cap - trust VIS API data as-is

## Problem Statement

Match duration displayed in the tournament details page is consistently incorrect. Investigation reveals the root cause: the application incorrectly interprets the VIS API `DurationSet1/2/3` fields as "mm:ss" string format, when the VIS API actually returns these values as **seconds (positive 32-bit integers)**.

### Evidence

1. **VIS API Documentation** (https://www.fivb.org/VisSDK/VisWebService/Duration.html):
   - Duration data type: "A positive 32-bit integer representing a number of seconds"
   - Format: Integer (e.g., `1530` for 25 minutes and 30 seconds)
   - NOT a string format like "25:30"

2. **Current Implementation Issues**:
   - `MatchDurationFormatter.ts:parseTimeString()` expects "mm:ss" string format
   - `MatchListV2.tsx:getMatchDuration()` has complex fallback logic that may misinterpret data
   - The format detection logic (`isStringFormat`) checks for colon in string, but VIS API returns integers as strings (e.g., "1530" not "25:30")

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Correct Match Duration on Tournament Page (Priority: P1)

As a referee, I want to see the accurate duration of completed matches in the tournament details page so I can understand how long matches actually took.

**Why this priority**: Core functionality - users rely on duration information to estimate scheduling and understand match patterns. Wrong duration values undermine trust in the app.

**Independent Test**: Can be fully tested by viewing any completed match and verifying the displayed duration matches the actual match length.

**Acceptance Scenarios**:

1. **Given** a completed 2-set match with DurationSet1=1530 (25:30) and DurationSet2=1725 (28:45), **When** viewing the match in tournament details, **Then** duration displays as "54m" (total 3255 seconds = 54.25 minutes, rounded down)

2. **Given** a completed 3-set match with DurationSet1=1935 (32:15), DurationSet2=2140 (35:40), DurationSet3=1350 (22:30), **When** viewing the match, **Then** duration displays as "1h 30m" (total 5425 seconds = 90.4 minutes)

3. **Given** a match with no duration data available, **When** viewing the match, **Then** no duration is displayed (graceful fallback)

---

### User Story 2 - Live Match Duration Updates (Priority: P2)

As a referee, I want to see the elapsed time for live matches update correctly during polling so I can track how long a match has been running.

**Why this priority**: Supports real-time match monitoring which is a key feature for referees at tournaments.

**Independent Test**: Can be tested by viewing a live match and verifying the duration increases appropriately with polling updates.

**Acceptance Scenarios**:

1. **Given** a live match that started 15 minutes ago, **When** viewing the match, **Then** duration displays approximately "15m" and updates with each polling cycle

2. **Given** a live match in set 2 with DurationSet1=1530 (25:30) completed, **When** viewing the match, **Then** total duration includes set 1 plus elapsed time in current set

---

### User Story 3 - Match Duration in Match Detail Screen (Priority: P3)

As a referee, I want to see per-set durations when viewing match details so I can understand the pace of each set.

**Why this priority**: Provides more granular information for detailed match analysis.

**Independent Test**: Can be tested by navigating to match detail and verifying individual set durations are displayed correctly.

**Acceptance Scenarios**:

1. **Given** a completed match with set durations 1530, 1725, 1350 seconds, **When** viewing match details, **Then** I see "Set 1: 25m", "Set 2: 28m", "Set 3: 22m"

---

### Edge Cases

- What happens when DurationSet values are empty strings or null? → Display no duration (graceful fallback)
- What happens when DurationSet values contain unexpected formats (legacy cached data)? → Attempt to parse as both seconds and "mm:ss" format
- How does the system handle partial duration data (only some sets have durations)? → Sum only available set durations
- What happens when Duration values are 0 (match not yet started)? → Do not display "0m", show nothing instead
- What happens when DurationSet values are very large (malformed data)? → No cap applied; trust VIS API data as authoritative source

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST interpret VIS API DurationSet1/2/3 fields as seconds (positive integers) per VIS API specification
- **FR-002**: System MUST correctly sum set durations to calculate total match duration
- **FR-003**: System MUST format total duration in human-readable format (e.g., "54m", "1h 30m")
- **FR-004**: System MUST handle missing or null duration values gracefully (display nothing rather than incorrect values)
- **FR-005**: System MUST handle the legacy "mm:ss" string format as a fallback for backward compatibility with any cached data
- **FR-006**: System MUST update live match durations in sync with the 5-second polling interval
- **FR-007**: System MUST display individual set durations in match detail views
- **FR-008**: System MUST handle zero-value durations (match not started) without displaying "0m"

### Key Entities

- **Match Duration**: Total elapsed time for a match, calculated from sum of set durations (in seconds, displayed in minutes/hours)
- **Set Duration**: Time in seconds for each individual set (1, 2, or 3) as returned by VIS API
- **VIS API Response**: Raw data from GetBeachMatchList containing DurationSet1/2/3 as integer seconds

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of completed matches display duration within 1 minute accuracy of actual match length
- **SC-002**: Match duration calculation correctly handles VIS API integer-seconds format for all matches
- **SC-003**: No duration display errors (e.g., "0m", "NaN", incorrect values) for matches with valid duration data
- **SC-004**: Live match durations update correctly during polling cycles
- **SC-005**: Backward compatibility maintained - existing cached data in "mm:ss" format still works correctly

## Assumptions

- VIS API will continue returning Duration fields as positive 32-bit integers representing seconds
- The primary data source is the VIS API GetBeachMatchList endpoint
- Polling interval for live matches remains at 5 seconds
- No changes to the VIS API schema are expected
- Cached data may contain legacy "mm:ss" format strings from previous incorrect parsing
