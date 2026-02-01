# Feature Specification: Match Officials Display

**Feature Branch**: `006-match-officials-display`
**Created**: 2025-11-04
**Status**: Draft
**Input**: User description: "i want to add : challenge referee ( if present), Scorer, Assistent Scorer and Linejudges for the matches. here are the docs: https://www.fivb.org/VisSDK/VisWebService/#BeachTournament.html"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View All Match Officials (Priority: P1)

Referees and tournament coordinators viewing match details need to see the complete list of officials assigned to each match, including the primary referees, challenge referee (when assigned), scorer, assistant scorer, and line judges.

**Why this priority**: Essential information for match preparation and coordination. Referees need to know who their officiating team is before arriving at the court. This is the core functionality that delivers immediate value.

**Independent Test**: Can be fully tested by viewing any match detail screen and verifying that all assigned officials are displayed with their names, roles, and federation codes (when available). Delivers value by providing complete officiating team visibility.

**Acceptance Scenarios**:

1. **Given** a match with all officials assigned (Referee 1, Referee 2, Challenge Referee, Scorer, Assistant Scorer, Line Judges), **When** a user views the match details, **Then** all officials are displayed with their names, roles, and federation codes
2. **Given** a match with only primary referees assigned, **When** a user views the match details, **Then** only Referee 1 and Referee 2 are displayed, with no empty placeholders for unassigned positions
3. **Given** a match with a Challenge Referee assigned, **When** a user views the match details, **Then** the Challenge Referee is displayed distinctly from the primary referees with an appropriate role label
4. **Given** multiple matches in a tournament list view, **When** a user scrolls through matches, **Then** each match displays at least the primary referees (Referee 1 and Referee 2) inline without requiring navigation to details

---

### User Story 2 - Distinguish Official Roles (Priority: P2)

Users need to quickly identify which role each official is serving (Referee 1, Referee 2, Challenge Referee, Scorer, Assistant Scorer, Line Judge) to understand the officiating hierarchy and responsibilities.

**Why this priority**: Enhances understanding of match officiating structure. While not blocking core functionality, clear role distinction improves professional communication and workflow. Secondary to basic display but adds significant professional value.

**Independent Test**: Can be tested by viewing matches with different officiating configurations and verifying that each official's role is clearly labeled and visually distinguished. Delivers value through improved clarity and professionalism.

**Acceptance Scenarios**:

1. **Given** a match with multiple officials, **When** a user views the official list, **Then** each official has a clear, distinct role label (e.g., "Referee 1", "Challenge Referee", "Scorer")
2. **Given** two line judges assigned to a match, **When** a user views the officials, **Then** line judges are grouped together or labeled "Line Judge 1" and "Line Judge 2" to distinguish them
3. **Given** a match detail screen, **When** officials are displayed, **Then** primary referees (Referee 1 and Referee 2) are visually prominent compared to supporting officials
4. **Given** a compact match card view, **When** displaying officials inline, **Then** role abbreviations are used (e.g., "R1", "R2", "CR") to save space while maintaining clarity

---

### User Story 3 - Filter Matches by Official Assignment (Priority: P3)

Referees want to filter tournament match lists to show only matches where they are assigned in any official capacity (not just as primary referees), including as Challenge Referee, Scorer, or Line Judge.

**Why this priority**: Extends existing referee filtering functionality to cover all officiating roles. Nice to have for comprehensive assignment tracking but not critical for basic match viewing. Can be implemented after core display is working.

**Independent Test**: Can be tested by selecting a referee filter and verifying that matches where that person serves in any official role are displayed. Delivers value by providing complete assignment visibility for officials serving in multiple roles.

**Acceptance Scenarios**:

1. **Given** a referee filter is active, **When** viewing the match list, **Then** matches where the selected referee is assigned as Referee 1, Referee 2, Challenge Referee, Scorer, Assistant Scorer, or Line Judge are all shown
2. **Given** a referee serves as Challenge Referee in some matches and Referee 1 in others, **When** filtering by that referee's name, **Then** all their matches appear regardless of their specific role
3. **Given** a match list with active official filter, **When** viewing each match card, **Then** the filtered official's role is highlighted or emphasized to show why the match is included

---

### Edge Cases

- What happens when Personnel field is empty (no scorer/line judge assignments)?
  - Hide scorer and line judge sections entirely (silent graceful degradation)
  - Display only primary referees and Challenge Referee (if present)
  - No error message or placeholder shown to user

- What happens when EventNo is missing or AuxiliaryPersons fetch fails?
  - Fall back to displaying only officials with direct fields (referees, Challenge Referee)
  - Hide scorer/line judge sections that require Personnel → AuxiliaryPersons mapping
  - Log fetch failure for monitoring but do not display error to user

- How does the system handle partial official data (name present but no federation code)?
  - Display available information (name and role) without federation code
  - Do not show "Unknown" or placeholder text for missing federation codes

- What happens when Line Judge count varies (0, 2, or 4 line judges)?
  - Dynamically adjust display based on actual count
  - Show only assigned line judges (no empty slots)
  - Group line judges visually when 2+ are present

- How are officials displayed on small screens (compact match cards)?
  - Primary referees (R1, R2) shown inline with abbreviated labels
  - Additional officials (CR, Scorer, Line Judges) available in match detail screen with two-tier grouped layout
  - Match detail screen displays both tiers vertically stacked with visual divider
  - Use icon + abbreviated role for space efficiency in compact views

- What happens when Challenge Referee data is missing from API response?
  - Only display Challenge Referee when explicitly present in API data
  - Do not show empty Challenge Referee slot (already implemented in codebase)

- How should officials from different federations be visually distinguished?
  - Show federation codes with flag icons when available
  - Use consistent formatting matching existing referee display patterns

## Clarifications

### Session 2025-01-04

- Q: Data retrieval architecture for Scorer/Line Judge names (Personnel IDs require cross-reference) → A: Accept two-step retrieval with proactive AuxiliaryPersons fetching - Include AuxiliaryPersons field in initial GetEvent request during tournament load, cache at Event level for all subsequent match displays
- Q: Fallback strategy when Personnel field empty OR EventNo missing OR AuxiliaryPersons fetch fails → A: Silent graceful degradation - Show only available officials (referees), hide scorer/line judge sections entirely when Personnel empty or mapping fails
- Q: AuxiliaryPersons Functions codes validation (Functions="2" for Line Judges, Functions="4" for Scorers) → A: ID-only mapping - Ignore Functions codes, map purely by ID from Personnel to AuxiliaryPersons
- Q: Official display hierarchy and grouping on match detail screen → A: Two-tier grouped display - Primary officials group (R1, R2, CR) + Supporting officials group (Scorer, Asst Scorer, Line Judges) with visual divider
- Q: Cache warming blocking behavior for AuxiliaryPersons during tournament initialization → A: Non-blocking background fetch - Tournament displays immediately, AuxiliaryPersons loads in parallel, scorer/line judge sections populate when ready

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST retrieve match official data using two-step process: (1) GetBeachMatch returns Personnel field with IDs (Scorer, AssistantScorer, LineJudge1-4) and direct Challenge Referee fields (NoRefereeChallenge, RefereeChallengeName, RefereeChallengeFederationCode), (2) GetEvent AuxiliaryPersons maps Personnel IDs to names/federations using ID-only matching (ignore Functions codes). AuxiliaryPersons MUST be fetched non-blocking in background during tournament initialization (tournament displays immediately), cached at Event level (120s TTL) for reuse across all matches, with scorer/line judge sections populating when data becomes available.

- **FR-002**: System MUST display all assigned match officials on the match detail screen using two-tier grouped layout: (1) Primary officials group (Referee 1, Referee 2, Challenge Referee) at top, (2) Supporting officials group (Scorer, Assistant Scorer, Line Judges) below with visual divider separating the tiers

- **FR-003**: System MUST show official names, roles, and federation codes (when available) in a consistent format matching the existing referee display patterns

- **FR-004**: System MUST hide unassigned official positions rather than showing empty placeholders

- **FR-005**: Match card components MUST display at least the primary referees (Referee 1, Referee 2) inline, with additional officials available in expanded or detail views

- **FR-006**: System MUST support filtering match lists to include matches where a specific person is assigned in any official capacity (Referee 1, Referee 2, Challenge Referee, Scorer, Assistant Scorer, Line Judge)

- **FR-007**: System MUST use role labels or abbreviations that clearly distinguish each official's position (e.g., "Referee 1", "R1", "Challenge Referee", "CR", "Scorer", "Line Judge 1", "LJ1")

- **FR-008**: System MUST handle variable numbers of line judges (0-4) by dynamically adjusting the display based on actual assignments

- **FR-009**: System MUST integrate official data into existing data models (BeachMatch, BeachMatchCore, BeachMatchDTO) with backward compatibility for existing code

- **FR-010**: System MUST maintain performance standards when fetching additional official data (use existing cache, field selection, and polling optimizations)

- **FR-011**: System MUST implement silent graceful degradation when Personnel field is empty, EventNo is missing, or AuxiliaryPersons fetch fails by hiding scorer/line judge sections and displaying only available officials (primary referees, Challenge Referee) without error messages to user

### Key Entities *(include if feature involves data)*

- **Match Official**: Represents any person assigned to an officiating role for a match
  - Attributes: No (VIS identifier), Name, Federation Code, Role (Referee1, Referee2, ChallengeReferee, Scorer, AssistantScorer, LineJudge1-4)
  - Relationships: Belongs to one Match, references one Person/Referee

- **Match**: Extended with complete officiating team data
  - New attributes: Scorer, Assistant Scorer, Line Judges (in addition to existing Referee 1, Referee 2, Challenge Referee)
  - Structure mirrors VIS API BeachMatch response format

- **Official Role**: The specific position an official holds for a match
  - Values: Referee 1, Referee 2, Challenge Referee, Scorer, Assistant Scorer, Line Judge 1, Line Judge 2, Line Judge 3, Line Judge 4
  - Used for filtering, display labels, and visual hierarchy

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view complete officiating team information (all assigned officials with names and roles) on any match detail screen within 2 seconds of navigation

- **SC-002**: Match list views display primary referees (Referee 1 and Referee 2) inline without performance degradation compared to current implementation (maintain <100ms cached load times), independent of AuxiliaryPersons fetch status (non-blocking background load)

- **SC-003**: Referee filtering includes matches where the selected referee serves in any official capacity, achieving 100% coverage of all officiating roles (not just primary referees)

- **SC-004**: Official role labels are clear and unambiguous to 95% of users (validated through user testing or stakeholder feedback)

- **SC-005**: System handles varying official assignments (0-8+ officials per match) without UI layout issues or performance problems

- **SC-006**: Additional VIS API field fetching increases payload size by less than 20% compared to current match data requests

- **SC-007**: Existing match display functionality remains unchanged (zero regressions) for users who do not interact with new official details

- **SC-008**: Match cards with full officiating team data load in under 150ms when cached (allowing for additional field processing overhead)

## Assumptions *(optional)*

- VIS API provides AuxiliaryPersons with consistent structure (No, FirstName, LastName, NationalityCode, Functions, Gender attributes)
- Functions codes present in AuxiliaryPersons (2=Line Judge, 4=Scorer) but NOT used for mapping validation (ID-only matching)
- Personnel field uses tournament-local ID scope (IDs like 3, 10, 19, 26) that map to AuxiliaryPersons
- Line judge count varies by match type and tournament rules (typically 0, 2, or 4)
- Challenge Referee is optional and only present in higher-level tournaments
- Scorer and Assistant Scorer are standard positions present in most matches
- Federation codes follow existing patterns (3-letter country codes via NationalityCode)
- AuxiliaryPersons fetched non-blocking in background during tournament initialization (tournament displays immediately, scorer/line judge sections populate when ready)
- Existing MMKV cache and adaptive TTL system can accommodate Event-level AuxiliaryPersons caching with 120s TTL
- GetEvent latency does not block tournament display (primary referees from GetBeachMatchList show immediately)
- Match detail screens have sufficient space to display 4-8 officials without scrolling
- Users understand officiating roles through labels alone (no additional role explanations needed)
- Personnel field contains HTML-entity-encoded XML requiring decode (`&lt;` → `<`, `&gt;` → `>`, `&quot;` → `"`)

## Constraints *(optional)*

- Must maintain backward compatibility with existing match data structures
- Must not degrade performance of match list views (existing 85% cache hit rate, 65ms cached load times)
- Must follow existing design patterns for referee display (consistency with Referee 1/Referee 2 presentation)
- Must work within VIS API field selection system (slim/default/full modes)
- Must respect existing audit system field count thresholds (avoid over-fetching)
- UI must adapt to varying screen sizes (compact match cards to full detail views)

## Dependencies *(optional)*

- VIS API documentation for official field names and structure (BeachMatch response schema)
- Existing match data models (BeachMatch, BeachMatchCore, BeachMatchDTO)
- Current referee display components and filtering logic
- MMKV cache system and field selection optimization (specs/001-vis-api-optimization)
- Match card components (MatchCard, MatchListV2)
- Theme system for consistent official display styling

## Out of Scope *(optional)*

- Editing or assigning officials through the app (read-only display)
- Detailed official profiles or statistics
- Official availability scheduling
- Communication features between officials
- Historical official assignment analysis
- Official qualification or certification display
- Real-time official status tracking (e.g., "Official en route to court")
- Official contact information
- Official performance ratings or feedback
- Integration with official payment or compensation systems

