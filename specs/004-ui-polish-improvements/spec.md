# Feature Specification: UI Polish & User Experience Improvements

**Feature Branch**: `004-ui-polish-improvements`
**Created**: 2025-10-27
**Status**: Draft
**Input**: User description: "voglio implementare queste mdifiche: 1 la schermata nessun torneo trovato quando carica 2 i minuti (la durata della partita LIVE) ,si devono aggiornare con il live score ; 3 Eliminare tutti i tornei mockup , 4 - sostituire con \"The VIS API is currently not available, please retry in few minutes\" ; 5 Mettere il reset button dei filter dentro al panel  dei filters , di fianco a \" save and close\" che si apre e aggiungere al suo posto il tasto refresh ( che ricarica la pagina)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Loading State for Tournament List (Priority: P1)

When users navigate to the tournament selection screen, they should see an appropriate visual indicator while tournament data is being loaded from the VIS API, rather than seeing the "no tournaments found" message prematurely. This provides a clear distinction between "loading" and "no results" states.

**Why this priority**: This is the first impression users get when launching the app. A proper loading state prevents confusion and sets appropriate expectations, which is critical for user confidence in the app.

**Independent Test**: Can be fully tested by launching the app and observing the tournament selection screen during initial load. Success means users see a loading indicator (spinner/skeleton) for the expected duration, followed by either tournament results or an appropriate empty state.

**Acceptance Scenarios**:

1. **Given** the app is launched for the first time, **When** the tournament selection screen loads, **Then** a loading indicator should be displayed (not "no tournaments found" message)
2. **Given** tournament data is being fetched, **When** the API responds with tournaments, **Then** the loading indicator disappears and tournaments are displayed
3. **Given** tournament data is being fetched, **When** the API responds with no tournaments, **Then** the loading indicator disappears and "no tournaments found" message is displayed
4. **Given** user navigates away during loading, **When** they return to the screen, **Then** the current loading/loaded state is accurately reflected

---

### User Story 2 - Real-Time Match Duration Updates (Priority: P1)

When referees are monitoring live matches, the match duration (minutes played) should automatically update in real-time along with the live score updates. This ensures referees have accurate timing information without manual page refreshes.

**Why this priority**: Accurate match timing is critical for referees to make decisions and track match progress. Stale duration data can lead to confusion about actual match status.

**Independent Test**: Can be fully tested by viewing a live match and observing the duration field update every time the live score polling occurs (every 5 seconds). Success means the duration increments correctly without page refresh.

**Acceptance Scenarios**:

1. **Given** a match is in "Running" status, **When** live score data is polled, **Then** the match duration (minutes) is updated to reflect current time
2. **Given** a match has been running for 15 minutes, **When** the next polling cycle occurs, **Then** the duration shows the updated time (e.g., 15 → 16 minutes if 1 minute passed)
3. **Given** multiple live matches are displayed, **When** live scores update, **Then** each match's duration updates independently and accurately
4. **Given** a match transitions from "Running" to "Finished", **When** the final update occurs, **Then** the duration shows the total match time and stops updating

---

### User Story 3 - API Error Message Improvement (Priority: P2)

When the VIS API is unavailable or returns errors, users should see a clear, actionable error message explaining the situation and suggesting they retry in a few minutes. This replaces generic error messages with user-friendly guidance.

**Why this priority**: Clear error communication reduces user frustration and support requests. Users understand the issue is temporary and know what action to take.

**Independent Test**: Can be fully tested by simulating an API failure scenario and verifying the error message displays correctly. Success means users see "The VIS API is currently not available, please retry in few minutes" instead of technical error messages.

**Acceptance Scenarios**:

1. **Given** the VIS API is unavailable, **When** the app attempts to fetch tournament data, **Then** the message "The VIS API is currently not available, please retry in few minutes" is displayed
2. **Given** the VIS API returns an error response, **When** any API call fails, **Then** the user-friendly error message is shown (not technical error codes)
3. **Given** the error message is displayed, **When** the user waits and retries, **Then** the app attempts to reconnect and fetch data again
4. **Given** the API becomes available again, **When** the retry succeeds, **Then** the error message disappears and data is displayed normally

---

### User Story 4 - Mock Tournament Data Cleanup (Priority: P2)

The application should only display real tournament data from the VIS API, with all mock/test tournament data removed from production builds. This ensures data integrity and prevents confusion between test and real data.

**Why this priority**: Mock data in production creates confusion and undermines trust in the app. Clean data presentation is essential for professional use.

**Independent Test**: Can be fully tested by inspecting the tournament list and verifying no mock tournaments appear. Success means only VIS API data is displayed, with no hardcoded test tournaments visible.

**Acceptance Scenarios**:

1. **Given** the app is running in production mode, **When** the tournament list loads, **Then** only real tournaments from VIS API are displayed (no mock data)
2. **Given** mock tournaments exist in the codebase, **When** the app is built for production, **Then** mock data is excluded from the build or ignored at runtime
3. **Given** development mode is active, **When** testing locally, **Then** mock data can optionally be enabled for testing purposes (controlled by environment flag)
4. **Given** no VIS API data is available, **When** the list is empty, **Then** the appropriate empty state is shown (not mock tournaments as fallback)

---

### User Story 5 - Enhanced Filter Panel with Reorganized Actions (Priority: P3)

Users should have convenient access to filter reset functionality within the filter panel itself, alongside the "Save and Close" action. The main screen should feature a refresh button in place of the previous reset button, allowing users to manually reload tournament data.

**Why this priority**: Improved filter UX reduces friction in common workflows. Having related actions grouped together (reset + save in panel) is more intuitive than scattered controls.

**Independent Test**: Can be fully tested by opening the filter panel, verifying the reset button appears next to "Save and Close", and checking that the main screen now has a refresh button. Success means filters can be reset without closing the panel, and the page can be refreshed from the main screen.

**Acceptance Scenarios**:

1. **Given** the filter panel is open, **When** user views the panel actions, **Then** both "Reset" and "Save and Close" buttons are visible side by side
2. **Given** filters are applied, **When** user clicks "Reset" in the panel, **Then** all filters are cleared and the panel remains open for further adjustments
3. **Given** the filter panel is closed, **When** user views the main screen, **Then** a refresh button is visible (where reset button used to be)
4. **Given** user clicks the refresh button on main screen, **When** the action completes, **Then** the tournament list reloads with fresh data from the API
5. **Given** filters are applied, **When** user clicks refresh on main screen, **Then** data reloads while preserving current filter settings

---

### Edge Cases

- **Rapid filter changes**: What happens when user clicks reset multiple times quickly in the filter panel?
- **Refresh during loading**: How does system handle refresh button click while a data fetch is already in progress?
- **API timeout scenarios**: What happens when API is slow but not completely unavailable (partial timeout)?
- **Network interruption during live match**: How does match duration behave when network drops during a running match?
- **Empty state transitions**: How does UI transition between loading → empty → loaded states without jarring visual shifts?
- **Concurrent live updates**: What happens when multiple matches transition between states simultaneously?
- **Stale duration after pause**: How does system handle match duration if polling is paused then resumed?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a loading indicator (spinner or skeleton UI) while tournament data is being fetched from the VIS API
- **FR-002**: System MUST display "no tournaments found" message ONLY after data fetch completes and returns zero results (not during loading)
- **FR-003**: System MUST update match duration (minutes played) in real-time for all matches with "Running" status during live score polling cycles
- **FR-004**: System MUST calculate match duration based on current time minus match start time, updating every polling cycle (default: 5 seconds)
- **FR-005**: System MUST display user-friendly error message "The VIS API is currently not available, please retry in few minutes" when API calls fail
- **FR-006**: System MUST replace all technical error messages (HTTP status codes, stack traces) with the user-friendly API error message
- **FR-007**: System MUST exclude all mock tournament data from production builds
- **FR-008**: System MUST only display tournament data retrieved from the VIS API in production mode
- **FR-009**: System MUST include a "Reset" button within the filter panel, positioned next to the "Save and Close" button
- **FR-010**: Filter reset action MUST clear all applied filters while keeping the filter panel open for further interaction
- **FR-011**: System MUST replace the reset button on the main screen with a refresh button
- **FR-012**: Refresh button MUST trigger a data reload from the VIS API while preserving current filter settings
- **FR-013**: System MUST prevent duplicate API calls when refresh is clicked during an active data fetch
- **FR-014**: Match duration updates MUST stop when match status changes from "Running" to any other status
- **FR-015**: System MUST handle API timeout scenarios with the same user-friendly error message (treat timeouts as unavailable API)

### Key Entities

- **Tournament Loading State**: Represents the current state of tournament data fetching (Loading, Loaded, Error, Empty)
- **Match Duration**: Calculated field representing elapsed time since match start, updated in real-time for running matches
- **Filter State**: User's currently applied filters that persist across data refreshes
- **API Error State**: User-facing error information when VIS API is unavailable or returns errors

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users see loading indicator within 100ms of navigating to tournament selection screen
- **SC-002**: "No tournaments found" message appears ONLY when data fetch completes with empty results (0% false positives during loading)
- **SC-003**: Match duration for running matches updates within 6 seconds of each live score polling cycle (accounting for 5s interval + 1s processing)
- **SC-004**: Match duration accuracy is within ±1 minute of actual elapsed time for all running matches
- **SC-005**: Users see the user-friendly API error message for 100% of VIS API failures (no technical errors leak to UI)
- **SC-006**: Zero mock tournaments appear in production builds (verified through production data audit)
- **SC-007**: Filter reset action completes within 500ms and keeps filter panel open in 100% of cases
- **SC-008**: Refresh button reloads data within 3 seconds (typical API response time) while preserving all filter settings
- **SC-009**: Duplicate API calls are prevented when refresh is clicked repeatedly (max 1 concurrent request per entity)
- **SC-010**: User satisfaction increases as measured by reduction in confusion-related support tickets (target: 30% reduction for loading/error states)

## Assumptions

- Existing live score polling mechanism is already implemented and functional (5-second interval for running matches)
- Match start time is available in the match data returned by VIS API
- The filter panel component is already implemented with "Save and Close" functionality
- Mock tournament data exists as hardcoded arrays or test fixtures in the codebase
- Production and development environments can be distinguished via environment variables or build flags
- Current implementation may show "no tournaments found" immediately on screen load before data is fetched
- VIS API errors return HTTP status codes or error objects that can be intercepted and transformed

## Out of Scope

- Changes to live score polling intervals or polling logic (maintaining existing 5-second cycle)
- Offline caching improvements or offline mode enhancements
- Advanced error retry strategies with exponential backoff (simple manual retry is sufficient)
- Internationalization of error messages (English only)
- Analytics tracking of loading times or error occurrences
- Skeleton UI design for loading states (simple spinner is acceptable)
- Migration of existing filter panel architecture or complete redesign

