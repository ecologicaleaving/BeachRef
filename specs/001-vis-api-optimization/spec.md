# Feature Specification: VIS API Audit & Optimization

**Feature Branch**: `001-vis-api-optimization`
**Created**: 2025-01-19
**Status**: Draft
**Input**: User description: "now i want at of the API implementation, use the docs as benchmark and reference and use chromedev mcp to check from the frontend which calls ( to the vis api) are not formatted well . we need to optimize the cache system, the VIS requests. we had a probem with a call badly formatted asking for too many data"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - API Request Audit & Validation (Priority: P1)

Referees and tournament users need reliable, fast data loading without excessive network usage or errors. System administrators need to identify and fix API requests that are malformed or requesting unnecessary data volumes.

**Why this priority**: This is the foundation - identifying and fixing broken/inefficient API calls directly impacts user experience and prevents API overload errors. Without this, subsequent optimizations cannot be properly validated.

**Independent Test**: Can be fully tested by running the frontend application with network monitoring tools, capturing all VIS API requests, and comparing them against the VIS API documentation to identify malformed requests or over-fetching issues. Delivers immediate value by producing a comprehensive audit report of API health.

**Acceptance Scenarios**:

1. **Given** the application is running with network monitoring enabled, **When** a user navigates through tournament selection, tournament details, and match views, **Then** all VIS API requests are captured with their full request/response payloads
2. **Given** captured API requests from the frontend, **When** each request is compared against VIS API documentation (GetEventList, GetBeachTournamentList, GetBeachMatchList, etc.), **Then** any requests with incorrect XML format, wrong parameter names, or excessive field selections are identified and documented
3. **Given** a list of identified API issues, **When** the audit report is generated, **Then** it includes specific request examples, the correct format per documentation, impact assessment (error rate, payload size), and recommended fixes
4. **Given** an API request requesting more than 20 fields, **When** compared against the minimum required fields for the UI component, **Then** unnecessary fields are flagged with the recommendation to use slim field selection mode

---

### User Story 2 - Cache System Optimization (Priority: P2)

Users need instant access to recently viewed tournament and match data, even with poor network connectivity. The system should minimize redundant API calls while keeping live data fresh.

**Why this priority**: After fixing API request formatting (P1), optimizing cache behavior ensures users get fast load times and the application doesn't make unnecessary API calls, reducing both bandwidth and server load.

**Independent Test**: Can be tested by monitoring cache hit/miss rates and API call frequency across different user workflows (viewing tournaments, switching between matches, returning to previously viewed screens). Success is measured by increased cache hit rates and reduced API call volume while maintaining data freshness requirements.

**Acceptance Scenarios**:

1. **Given** tournament list data was loaded 30 seconds ago, **When** a user navigates back to tournament selection screen, **Then** cached data is displayed instantly without making a new API request
2. **Given** a user is viewing a running match with live score updates, **When** the match status changes from "Running" to "Finished", **Then** polling stops automatically and the final state is cached for 10+ minutes
3. **Given** tournament data is cached with default field selection, **When** a user navigates to tournament details requiring additional fields, **Then** only the missing fields are requested (not a full re-fetch)
4. **Given** a user backgrounds the app while viewing live matches, **When** the app is backgrounded for more than 30 seconds, **Then** polling intervals are paused to conserve battery and bandwidth
5. **Given** cached tournament data is 2 hours old, **When** user returns to the app, **Then** data is revalidated with the API and updated if changes are detected

---

### User Story 3 - Request Payload Optimization (Priority: P3)

Users on mobile networks or slow connections need minimal data transfer for fast app performance. The system should only request necessary fields based on the UI context.

**Why this priority**: After fixing requests (P1) and optimizing cache (P2), payload optimization provides the final layer of efficiency - reducing bandwidth usage and improving load times, especially for users on slow connections.

**Independent Test**: Can be tested by measuring payload sizes before and after optimization, comparing field counts in requests against actual UI usage, and validating that different contexts (list view vs. detail view, initial load vs. polling update) use appropriate field selection strategies.

**Acceptance Scenarios**:

1. **Given** a match list view showing 20 matches, **When** the initial request is made, **Then** only display fields are requested (No, Court, StartDateTime, Status, TeamA, TeamB, ScoreA, ScoreB) - not full match details
2. **Given** a live match is being polled for score updates, **When** the polling request is made after initial load, **Then** only slim fields are requested (No, Status, SetScore, RallyScore, ServingTeam) to minimize payload
3. **Given** tournament list view needs to display basic tournament cards, **When** GetBeachTournamentList is called, **Then** only card display fields are requested (No, Name, City, StartDate, EndDate, Gender, Level, Status) - maximum 10 fields
4. **Given** a batch request combining tournament details and match list, **When** the request payload exceeds recommended size, **Then** the request is split into appropriate chunks or sequential calls with proper caching
5. **Given** a user opens a tournament details page, **When** full tournament data is needed, **Then** the system uses the cached slim version and only requests additional fields if needed (additive fetching)

---

### Edge Cases

- What happens when a malformed API request returns a BadRequestSyntax error? System should log the error with full request details, fall back to cached data if available, and alert developers
- How does the system handle partial cache invalidation when only some fields need to be refreshed? Should use additive fetching strategy or full re-fetch based on staleness threshold
- What happens when network connectivity is lost mid-polling? System should detect offline state, stop polling, display last cached data with timestamp, and resume when connectivity returns
- How does the system handle rapid navigation between screens? Should use request deduplication to prevent multiple identical in-flight requests
- What happens when a batch request partially fails? System should process successful responses and handle failed sub-requests individually with appropriate retries
- How does the system handle timezone-sensitive date ranges in tournament list requests? Should validate date parameters before sending to prevent over-fetching tournaments outside the intended range

## Requirements *(mandatory)*

### Functional Requirements

**API Request Audit & Validation**

- **FR-001**: System MUST capture all VIS API requests made from the frontend including request URL, XML payload, headers, and response status
- **FR-002**: System MUST compare each captured request against VIS API documentation to validate XML structure, parameter names, and field selections
- **FR-003**: System MUST identify requests with excessive field counts (>20 fields for list views, >30 for detail views) and flag them for optimization
- **FR-004**: System MUST generate an audit report listing all malformed requests with specific issues (wrong parameter name, incorrect XML format, missing required fields, over-fetching)
- **FR-005**: System MUST validate that the form parameter name is "Request" (not "xmlRequest") for all VIS API calls
- **FR-006**: System MUST verify that all requests are properly wrapped in `<Requests>` root element
- **FR-007**: System MUST identify batch requests that combine incompatible request types or exceed payload size recommendations

**Cache System Optimization**

- **FR-008**: System MUST implement adaptive cache expiration based on data volatility (tournament list: 60-120s, match list: 15s, live match: 2-5s)
- **FR-009**: System MUST implement adaptive polling intervals based on match status (Running: 3-5s, Scheduled: 30-60s, Finished: off)
- **FR-010**: System MUST suspend polling when app is backgrounded or screen is not focused
- **FR-011**: System MUST resume polling when app returns to foreground with appropriate refresh strategy
- **FR-012**: System MUST invalidate related cached data when entity state changes (e.g., tournament status changes from Scheduled to Running)
- **FR-013**: System MUST implement stale-while-revalidate pattern for non-critical data to show cached content while fetching updates
- **FR-014**: System MUST track cache hit/miss rates and API call frequency for monitoring and optimization
- **FR-015**: System MUST detect offline state and prevent API requests when network is unavailable

**Request Payload Optimization**

- **FR-016**: System MUST implement context-aware field selection (slim mode for lists/polling, default mode for initial detail views, full mode only when explicitly needed)
- **FR-017**: System MUST limit tournament list requests to maximum 10 essential display fields
- **FR-018**: System MUST limit match list requests to maximum 8 core display fields
- **FR-019**: System MUST use slim field selection for live match polling (5 fields: No, Status, SetScore, RallyScore, ServingTeam)
- **FR-020**: System MUST implement request deduplication to prevent multiple identical in-flight requests
- **FR-021**: System MUST validate and optimize batch request sizes before sending to API
- **FR-022**: System MUST implement additive field fetching when additional data is needed for cached entities
- **FR-023**: System MUST log payload sizes for monitoring and identify requests exceeding 50KB for optimization

### Key Entities

- **API Request**: Represents a captured VIS API call with request XML, endpoint, timestamp, field count, payload size, response status, and response time
- **Cache Entry**: Represents cached API response data with key, value, staleness timestamp, expiration time, access count, and last access timestamp
- **Field Selection Strategy**: Defines which fields to request based on context (mode: slim/default/full, endpoint type, use case: list/detail/polling)
- **Polling Configuration**: Defines polling behavior based on entity state (interval by status, enable/disable triggers, background behavior)
- **Audit Finding**: Represents an identified issue with request format, field selection, cache behavior, or polling configuration, including severity, impact, recommendation, and affected endpoints

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of VIS API requests conform to documented XML format with correct parameter names and structure
- **SC-002**: Average API request payload size reduces by at least 40% through optimized field selection
- **SC-003**: Cache hit rate for frequently accessed data (tournament lists, match lists) exceeds 70%
- **SC-004**: Polling for finished matches is automatically disabled within 5 seconds of status change
- **SC-005**: Number of redundant API calls (requesting same data within cache validity period) reduces by at least 60%
- **SC-006**: Users see previously viewed tournament data within 100ms when navigating back (from cache)
- **SC-007**: Zero BadRequestSyntax errors in production from malformed XML or incorrect parameter names
- **SC-008**: Live match polling adapts correctly with 3-5 second intervals during "Running" status and stops when "Finished"
- **SC-009**: App successfully operates in offline mode showing last cached data with appropriate staleness indicators
- **SC-010**: API call volume during peak usage (tournament day) reduces by at least 50% through effective caching and deduplication

## Assumptions

- VIS API documentation in `docs/Guidelines/VISImplementationGuide.md` and `docs/Guidelines/VISCacheGuidelines.md` is accurate and represents current API requirements
- Chrome DevTools or similar network monitoring tools can be used to capture all frontend API requests for audit
- The existing caching implementation uses React Query or similar with configurable staleTime, gcTime, and refetchInterval
- The application has access to network state detection (NetInfo) and app state management (AppState)
- The VIS API has undocumented rate limits that can be exceeded by over-polling or excessive requests
- Current implementation already has some field selection logic but may not be consistently applied
- Batch request support is already implemented but may need validation for size and composition
- The "badly formatted call asking for too many data" referenced by the user is likely a field over-fetching issue or batch request problem

## Out of Scope

- Changes to VIS API server-side implementation or documentation
- Implementing new VIS API endpoints not currently in use
- UI/UX changes to how data is displayed (focus is on data fetching optimization)
- Migration to a different caching library or state management system
- Implementing server-side caching proxy or CDN layer
- Adding new data entities or business logic features
- Performance optimization of data parsing or rendering (focus is on network/cache layer)
