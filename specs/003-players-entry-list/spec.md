# Feature Specification: Players Entry List

**Feature Branch**: `003-players-entry-list`
**Created**: 2025-10-21
**Status**: Draft
**Input**: User description: "can you help me implement, in the tournament page, the players entry list ? i want to know the list of players for man and womans, both for qualifications and main draw. find a place to put the button to open it, may be in the bottom tab, close to schedule and officials"

## Clarifications

### Session 2025-10-21

- Q: When a referee taps on a team in the entry list, what should happen? → A: Open a modal overlay showing expanded team details (stays on same screen)
- Q: What cache duration is appropriate for team entry lists? → A: 7 days normally, then 24 hours in the week before tournament starts, static once tournament begins
- Q: What rendering approach should be used for large tournaments (64+ teams)? → A: Virtualized list rendering

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Players Entry List for Main Draw (Priority: P1)

Referees and tournament officials need to quickly access the complete list of players (teams) registered in the main draw for both men's and women's tournaments to verify participant information before and during matches.

**Why this priority**: This is the primary use case and delivers immediate value for referees who need to know who is playing in the tournament. The main draw is where most matches occur and represents the core tournament activity.

**Independent Test**: Can be fully tested by navigating to any tournament detail page, clicking the players/teams tab, selecting "Main Draw" filter, and seeing the list of all registered teams for that tournament. Delivers value by providing instant access to participant information.

**Acceptance Scenarios**:

1. **Given** a referee is viewing a tournament detail page, **When** they tap the players/teams icon in the bottom navigation, **Then** they see a full list of teams registered in the main draw with player names, countries, and seed information
2. **Given** a referee is viewing the players entry list for a men's tournament, **When** they switch to view a women's tournament, **Then** the list updates to show only women's teams
3. **Given** a referee is viewing the main draw players list, **When** they pull to refresh, **Then** the list updates with the latest registration data from the VIS API

---

### User Story 2 - View Players Entry List for Qualifications (Priority: P2)

Referees need to access the list of players (teams) registered in the qualification tournament to manage and oversee qualification matches that determine which teams advance to the main draw.

**Why this priority**: Qualification tournaments occur before the main draw and are important but less frequently accessed than main draw information. This is a complete feature that can be tested independently.

**Independent Test**: Can be fully tested by navigating to a tournament with qualifications, clicking the players/teams tab, selecting "Qualification" filter, and seeing only the teams registered in the qualification round.

**Acceptance Scenarios**:

1. **Given** a tournament has a qualification round, **When** a referee views the players entry list and selects "Qualification" filter, **Then** they see only teams registered in the qualification tournament
2. **Given** a tournament has no qualification round, **When** a referee views the players entry list, **Then** the qualification filter is disabled or hidden with a message "No Qualification Tournament"
3. **Given** teams are displayed for qualifications, **When** a referee taps on a team, **Then** a modal overlay opens showing detailed team information including both player names, federation details, ranking, and match history while maintaining the list view context in the background

---

### User Story 3 - Filter Players by Gender (Priority: P3)

Referees working tournaments with both men's and women's events need to filter the players entry list by gender to focus on one event at a time and reduce visual clutter.

**Why this priority**: This is an enhancement that improves usability but the feature is functional without it. Can be independently tested and delivers value for mixed-gender tournaments.

**Independent Test**: Can be fully tested by viewing any tournament, accessing the players list, toggling the gender filter between "Men" and "Women", and verifying the list shows only the selected gender's teams.

**Acceptance Scenarios**:

1. **Given** a referee is viewing the players entry list, **When** they select the "Men" gender filter, **Then** only men's teams are displayed
2. **Given** a referee is viewing the players entry list, **When** they select the "Women" gender filter, **Then** only women's teams are displayed
3. **Given** a tournament has only one gender category, **When** a referee views the players list, **Then** the gender filter is set to that gender by default and cannot be changed

---

### Edge Cases

- What happens when a tournament has no registered teams yet? → Display empty state with message "No teams registered yet"
- How does the system handle teams with missing player names or data? → Display team number with placeholder "Team #X - Details pending"
- What happens when the VIS API call fails to retrieve team data? → Show cached data with "Offline - showing cached data" indicator, or error state if no cache available
- How are wild card teams or special entries displayed? → Show with special indicator badge (e.g., "WC" for wild card)
- What happens when a team withdraws after registration? → Team appears with "Withdrawn" status indicator
- How are reserve teams displayed in the list? → Shown separately in a "Reserve Teams" section at the bottom of the list

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST retrieve the complete list of teams registered in a tournament using the VIS API `GetTournamentTeamList` endpoint
- **FR-002**: System MUST display teams separately for main draw and qualification tournaments
- **FR-003**: System MUST show both player names for each team (Player 1 and Player 2)
- **FR-004**: System MUST display team metadata including country/federation, seed number, and entry status
- **FR-005**: System MUST allow users to filter the entry list by tournament phase (Main Draw vs Qualification)
- **FR-006**: System MUST allow users to filter the entry list by gender (Men vs Women)
- **FR-007**: System MUST add a new tab/button in the tournament bottom navigation menu for accessing the players entry list
- **FR-008**: System MUST position the players/teams navigation button between the schedule and officials tabs
- **FR-009**: System MUST cache the players entry list data for offline viewing with adaptive TTL: 7 days for tournaments more than 7 days away, 24 hours during the week before tournament start, and no expiration once tournament begins (static data)
- **FR-010**: System MUST refresh the players entry list when user manually triggers refresh
- **FR-011**: System MUST display an empty state when no teams are registered for the selected filter criteria
- **FR-012**: System MUST handle API errors gracefully by showing cached data or appropriate error message
- **FR-013**: System MUST display special team statuses (wild card, reserve, withdrawn) with visual indicators
- **FR-014**: System MUST sort teams by seed number (lowest to highest) within each gender category
- **FR-015**: System MUST open a modal overlay when a team is tapped, showing expanded details (both player names, federation, ranking, match history) without navigating away from the list view
- **FR-016**: System MUST use virtualized list rendering to ensure smooth scrolling performance for tournaments with large numbers of teams (64+ teams)

### Key Entities *(include if feature involves data)*

- **Tournament Team Entry**: Represents a team's registration in a tournament, including team number, player information (names, player IDs, countries), seed number, phase (main draw/qualification), entry status (confirmed/withdrawn/reserve), and wild card designation
- **Player**: Individual player information within a team, including full name, player ID, federation/country code, and ranking
- **Tournament Phase**: Classification of tournament rounds distinguishing between qualification tournament and main draw, with separate team lists for each phase

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Referees can access the complete players entry list within 2 taps from the tournament detail page
- **SC-002**: Players entry list loads in under 2 seconds on WiFi connection
- **SC-003**: System correctly displays teams for both main draw (95%+ accuracy) and qualifications (when applicable)
- **SC-004**: Referees can identify team composition (both players) without navigating away from the list view
- **SC-005**: Gender filtering reduces displayed entries by 50% in mixed-gender tournaments
- **SC-006**: Entry list remains accessible offline using cached data for previously viewed tournaments
- **SC-007**: 90% of referees successfully find and access the players entry list on first attempt without assistance
- **SC-008**: Special team statuses (wild card, withdrawn, reserve) are immediately visible through clear visual indicators
- **SC-009**: List scrolling maintains 60 FPS performance even with tournaments containing 64+ teams
