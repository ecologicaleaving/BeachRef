# EPIC: VIS API Guide Compliance - Brownfield Enhancement

**Epic ID:** EPIC-VIS-001  
**Created:** 2025-09-04  
**Status:** Draft  
**Priority:** High  
**Estimated Story Points:** 13  

## Epic Goal

Align the existing VIS API client implementation with the official VIS Implementation Guide to improve performance, reduce API calls, and follow VIS best practices while maintaining full backward compatibility.

## Epic Description

### Existing System Context

- **Current functionality:** Sophisticated VisApiClient.ts with GetEventList, GetBeachMatchList, retry logic, monitoring
- **Technology stack:** TypeScript, React Query, fast-xml-parser, circuit breaker patterns  
- **Integration points:** Services layer, caching system, real-time subscriptions, UI components

### Enhancement Details

- **What's being added/changed:** Add missing VIS endpoints, implement batch requests, optimize polling intervals per VIS guide
- **How it integrates:** Extends existing VisApiClient.ts interface, maintains backward compatibility through optional parameters
- **Success criteria:** Reduced API calls by 30%, improved response times for tournament data, VIS guide compliance verification

## Business Value

- **Performance:** 30% reduction in API calls through batch requests and optimized polling
- **Reliability:** Better alignment with VIS API specifications reduces integration risks
- **User Experience:** Faster tournament data loading, more responsive live score updates
- **Maintenance:** Cleaner API patterns following official VIS guidelines

## Stories

### Story 1: Add Missing VIS Endpoints
**Story Points:** 5  
**Description:** Add GetBeachTournamentList and GetBeachRoundList endpoints to VisApiClient

**Acceptance Criteria:**
- Implement GetBeachTournamentList with proper field selection (No,Name,CountryCode,City,StartDate,EndDate,Gender,Level,Status)
- Implement GetBeachRoundList with tournament filtering
- Add corresponding TypeScript interfaces and request builders
- Maintain backward compatibility with existing GetEventList usage
- Add unit tests for new endpoint methods

### Story 2: Implement Batch Request Support  
**Story Points:** 5  
**Description:** Add XML batch request capability for multiple API calls in single request

**Acceptance Criteria:**
- Create batch request XML builder supporting multiple Request elements
- Update VisApiClient interface with executeBatchRequest method
- Implement tournament detail batch (GetBeachTournament + GetBeachMatchList + GetBeachRoundList)
- Add error handling for partial batch failures
- Add integration tests for batch request scenarios

### Story 3: Optimize Polling and Field Selection
**Story Points:** 3  
**Description:** Implement adaptive polling intervals and slim field sets per VIS guide

**Acceptance Criteria:**
- Add status-based polling intervals (Running: 3s, Scheduled: 30s, Finished: stop)
- Implement slim field sets for live score polling after initial fetch
- Add field selection optimization for tournament lists vs detail views  
- Update React Query configurations with new intervals
- Verify performance improvements through monitoring

## Technical Requirements

### API Changes
- **New endpoints:** GetBeachTournamentList, GetBeachRoundList, executeBatchRequest
- **Enhanced endpoints:** Optimized field selection for existing methods
- **Backward compatibility:** All existing API methods continue working unchanged

### Performance Targets
- **API call reduction:** 30% fewer requests for tournament browsing workflows
- **Response time improvement:** 20% faster tournament detail page loading
- **Polling optimization:** Status-appropriate intervals per VIS guide recommendations

### Integration Points
- **VisApiClient.ts:** Core API client extension
- **React Query hooks:** Updated caching and polling strategies  
- **Tournament services:** Enhanced with batch request capabilities
- **Match monitoring:** Optimized live score polling intervals

## Compatibility Requirements

- [x] Existing APIs remain unchanged (new methods added, existing preserved)
- [x] Database schema changes are backward compatible (no DB changes required)
- [x] UI changes follow existing patterns (service layer changes only)
- [x] Performance impact is positive (improvements expected)

## Risk Assessment & Mitigation

### Primary Risks
1. **Breaking existing API integrations** during VisApiClient modifications
2. **VIS API rate limiting** with new endpoint usage patterns  
3. **Performance regression** if batch requests fail

### Mitigation Strategies
1. **Feature flags** for new endpoints, extensive integration testing
2. **Gradual rollout** with monitoring, respect existing rate limits
3. **Fallback mechanisms** to individual requests if batch fails

### Rollback Plan
- Revert VisApiClient.ts to current implementation
- Disable new endpoints via configuration flags
- Restore previous polling intervals through React Query config

## Testing Strategy

### Unit Tests
- New endpoint request builders and XML generation
- Batch request XML construction and parsing
- Field selection optimization logic

### Integration Tests  
- End-to-end VIS API calls for new endpoints
- Batch request scenarios with VIS API sandbox
- Performance benchmarking for API call reduction

### Regression Tests
- Existing tournament browsing workflows
- Match monitoring and live score updates
- Referee assignment data retrieval

## Definition of Done

- [ ] All stories completed with acceptance criteria met
- [ ] Existing functionality verified through integration tests  
- [ ] New endpoints tested against VIS API sandbox
- [ ] Performance benchmarks show 30% reduction in API calls
- [ ] No regression in tournament/match data display
- [ ] Code review completed and approved
- [ ] Documentation updated with new API patterns

## Dependencies

- **Technical:** VIS API sandbox access for testing new endpoints
- **Process:** Performance monitoring tools to validate improvements
- **Team:** Coordination with frontend team for any React Query hook updates

## Success Metrics

- **API Efficiency:** 30% reduction in total VIS API calls for tournament workflows
- **Performance:** 20% improvement in tournament detail page load times  
- **Compliance:** 100% alignment with VIS Implementation Guide specifications
- **Reliability:** No increase in API error rates after implementation

---

**Story Manager Handoff:**

"Please develop detailed user stories for this brownfield epic. Key considerations:

- This is an enhancement to an existing system running TypeScript/React Native with sophisticated VIS API integration
- Integration points: VisApiClient.ts, caching services, React Query hooks, tournament/match services  
- Existing patterns to follow: Retry logic, monitoring, error handling, type safety, field selection optimization
- Critical compatibility requirements: All existing API methods must continue working, no breaking changes to service interfaces
- Each story must include verification that existing tournament browsing, match monitoring, and referee assignment functionality remains intact

The epic should maintain system integrity while delivering VIS guide-compliant API usage and improved performance."

---

**Epic Owner:** Sarah (Product Owner)  
**Development Team:** Backend/API Team  
**Stakeholders:** Mobile App Team, Performance Engineering  
**Review Date:** Weekly until completion